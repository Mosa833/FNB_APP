import { env, HttpError } from "./common.ts";

// Gemini and Groq. Every AI feature tries a short list of models in order. If a model name does not exist for your
// account, the next one is tried, so one wrong name never breaks a feature. Busy errors are retried once.

const uniq = (list: (string | undefined)[]) => [...new Set(list.map((m) => (m ?? "").trim()).filter(Boolean))];

// Groq (fast open models). The strongest model first for grading; a fast one first for the coach.
export const GROQ_MODELS = () => uniq([Deno.env.get("GROQ_MODEL"), "openai/gpt-oss-120b", "llama-3.3-70b-versatile", "qwen/qwen3.6-27b"]);
export const GROQ_CHAT_MODELS = () => uniq([Deno.env.get("GROQ_CHAT_MODEL"), "llama-3.3-70b-versatile", "openai/gpt-oss-20b", "llama-3.1-8b-instant", Deno.env.get("GROQ_MODEL")]);
export const GEMINI_TEXT_MODELS = () => uniq([Deno.env.get("GEMINI_TEXT_MODEL"), Deno.env.get("GEMINI_MODEL"), "gemini-3.5-flash", "gemini-3.1-flash-lite"]);
export const GEMINI_AUDIO_MODELS = () => uniq([Deno.env.get("GEMINI_MODEL"), "gemini-3.5-flash", "gemini-3.1-flash-lite"]);

export class AIError extends HttpError {
  constructor(public provider: string, public detail: string, status = 502, userMessage?: string) {
    super(status, userMessage ?? "The AI service is not available right now. Please try again.");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isModelMissing = (status: number, text: string) =>
  status === 404 || (status === 400 && /model|not found|not supported|invalid.*model/i.test(text));
const isBusy = (status: number) => status === 429 || status === 500 || status === 503 || status === 529;

// Tries each model; returns the parsed JSON body and the model that worked
async function tryModels(provider: string, models: string[], send: (model: string) => Promise<Response>) {
  const problems: string[] = [];
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      try {
        res = await send(model);
      } catch (e) {
        problems.push(`${model}: network error ${e instanceof Error ? e.message : e}`);
        break;
      }
      if (res.ok) return { data: await res.json(), model };
      const text = (await res.text()).slice(0, 400);
      if (res.status === 401 || res.status === 403) {
        console.error(`${provider} key rejected`, res.status, text);
        throw new AIError(provider, `key rejected (${res.status}): ${text}`, 502, "The AI service is not set up correctly. Please tell the app team.");
      }
      if (isBusy(res.status) && attempt === 0) { await sleep(1500); continue; }
      problems.push(`${model}: ${res.status} ${text}`);
      // Try the next model when this one does not exist, the request is too large for it (413),
      // or its quota is used up (429). Free plan limits are counted per model.
      if (isModelMissing(res.status, text) || res.status === 413 || res.status === 429) break;
      console.error(`${provider} error`, problems.join(" | "));
      throw new AIError(provider, problems.join(" | "));
    }
  }
  console.error(`${provider}: no model worked`, problems.join(" | "));
  throw new AIError(provider, `no model worked: ${problems.join(" | ")}`);
}

// ---------- Groq (OpenAI-compatible chat completions) ----------
type ChatMessage = { role: "user" | "assistant"; content: string };

// Models that think before answering. They are asked to think briefly so the answer is not cut off.
const thinks = (m: string) => /gpt-oss|qwen3/i.test(m);

async function groq(models: string[], system: string, messages: ChatMessage[], maxTokens: number) {
  const key = env("GROQ_API_KEY");
  const problems: string[] = [];
  // One model at a time: an empty or cut-off answer moves on to the next model
  for (const m of models) {
    try {
      const { data, model } = await tryModels("Groq", [m], (id) => fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: id,
          max_tokens: thinks(id) ? maxTokens + 1500 : maxTokens, // room for the thinking as well as the answer
          temperature: 0.3,
          ...(thinks(id) ? { reasoning_effort: "low" } : {}),
          messages: [{ role: "system", content: system }, ...messages],
        }),
      }));
      const choice = data.choices?.[0];
      const text = String(choice?.message?.content ?? "").trim();
      if (text) return { text, model };
      problems.push(`${model}: empty answer (${choice?.finish_reason ?? "no reason given"})`);
    } catch (e) {
      // A wrong key fails the same way on every model, so stop straight away
      if (e instanceof AIError && /key rejected/.test(e.detail)) throw e;
      problems.push(e instanceof AIError ? e.detail : String(e));
    }
  }
  console.error("Groq: no model gave an answer", problems.join(" | "));
  throw new AIError("Groq", `no model gave an answer: ${problems.join(" | ")}`);
}

// Interview questions, interview grading, skills test feedback.
// GPT-OSS thinks before it answers, so it gets extra room.
export async function askGroq(system: string, prompt: string, maxTokens = 2000): Promise<string> {
  // Kept modest: Groq's free plan rejects requests that reserve too many tokens per minute
  return (await groq(GROQ_MODELS(), system, [{ role: "user", content: prompt }], Math.min(5000, Math.max(Math.round(maxTokens * 1.25), 3000)))).text;
}

// Career coach chat
export async function chatGroq(system: string, messages: ChatMessage[], maxTokens = 1200): Promise<string> {
  return (await groq(GROQ_CHAT_MODELS(), system, messages, maxTokens)).text;
}

// ---------- Google Gemini ----------
async function gemini(models: string[], body: Record<string, unknown>) {
  const key = env("GEMINI_API_KEY");
  const { data, model } = await tryModels("Gemini", models, (m) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts ?? [])
    .filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  return { text, model, finish: cand?.finishReason ?? data.promptFeedback?.blockReason ?? "" };
}

// Job matching, skills tests, guides
export async function askGemini(system: string, prompt: string, opts: { json?: boolean; maxTokens?: number } = {}): Promise<string> {
  const { text, model, finish } = await gemini(GEMINI_TEXT_MODELS(), {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: opts.maxTokens ?? 8192, ...(opts.json ? { responseMimeType: "application/json" } : {}) },
  });
  if (!text) throw new AIError("Gemini", `empty answer from ${model} (${finish || "no reason given"})`, 502, "The AI gave an empty answer. Please try again.");
  return text;
}

// Gemini's documented audio formats are wav, mp3, aiff, aac, ogg and flac.
// The app records .wav on iPhone and .aac on Android, both on that list.
const AUDIO_TYPES: Record<string, string> = {
  wav: "audio/wav", mp3: "audio/mp3", aiff: "audio/aiff", aac: "audio/aac", ogg: "audio/ogg", flac: "audio/flac",
};

// Interview recordings to text
export async function transcribe(audio: Blob, filename: string): Promise<string> {
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  const mimeType = AUDIO_TYPES[ext];
  if (!mimeType) throw new HttpError(400, `Recordings in .${ext} format can't be checked. Please update the app and record again.`);
  if (audio.size === 0) return "";
  if (audio.size > 15 * 1024 * 1024) throw new HttpError(400, "One recording is too big. Please keep answers under 3 minutes.");
  const { text } = await gemini(GEMINI_AUDIO_MODELS(), {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: encodeBase64(new Uint8Array(await audio.arrayBuffer())) } },
        {
          text: "Transcribe exactly what the speaker says in this job interview answer. " +
            "Keep their own words, including mistakes and filler words. Write it in the language they speak. " +
            "Reply with the transcript only, no labels, timestamps or comments. If nobody speaks, reply with nothing.",
        },
      ],
    }],
    generationConfig: { temperature: 0 },
  });
  return text; // empty is fine: it means nothing could be heard
}

// Reads a PDF or a photo of a document and returns its text (used for CV import)
export async function readDocument(bytes: Uint8Array, mimeType: string): Promise<string> {
  const { text } = await gemini(GEMINI_TEXT_MODELS(), {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: encodeBase64(bytes) } },
        { text: "This is a CV (resume). Copy out all of its text exactly as written, keeping headings and line breaks. " +
            "Read tables and columns in a sensible order. Do not add comments, labels or anything that is not in the document. " +
            "If there is no readable text, reply with nothing." },
      ],
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 8192 },
  });
  return text;
}

// Base64 without extra libraries, in chunks so long recordings don't overflow the stack
export function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export function parseJSON<T>(text: string): T {
  const clean = text.replace(/```json|```/g, "");
  const obj = clean.indexOf("{");
  const arr = clean.indexOf("[");
  const isArray = arr >= 0 && (obj < 0 || arr < obj);
  const start = isArray ? arr : obj;
  const end = isArray ? clean.lastIndexOf("]") : clean.lastIndexOf("}");
  if (start < 0 || end < 0) throw new HttpError(502, "The AI gave an answer we could not read. Please try again.");
  try {
    return JSON.parse(clean.slice(start, end + 1)) as T;
  } catch {
    console.error("Could not read AI JSON", clean.slice(0, 300));
    throw new HttpError(502, "The AI gave an answer we could not read. Please try again.");
  }
}

// ---------- Used by the ai-health check ----------
export async function probeGroq(models: string[], realistic = false) {
  if (!realistic) return (await groq(models, "Reply with the single word OK.", [{ role: "user", content: "Say OK" }], 400)).model;
  // A real coach-sized question, so a cut-off answer shows up here too
  const { text, model } = await groq(models, "You are a friendly career coach for young South Africans. Answer in under 120 words.",
    [{ role: "user", content: "I have Matric and no work experience. How do I write my first CV?" }], 1200);
  return `${model} (${text.split(/\s+/).length} words)`;
}
export async function probeGemini() {
  const { model } = await gemini(GEMINI_TEXT_MODELS(), { contents: [{ role: "user", parts: [{ text: "Say OK" }] }], generationConfig: { maxOutputTokens: 20 } });
  return model;
}
export async function probeGeminiAudio() {
  // Half a second of silence as a 16 kHz mono WAV
  const samples = 8000, bytes = new Uint8Array(44 + samples * 2), v = new DataView(bytes.buffer);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + samples * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true); v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, samples * 2, true);
  const { model } = await gemini(GEMINI_AUDIO_MODELS(), {
    contents: [{ parts: [{ inline_data: { mime_type: "audio/wav", data: encodeBase64(bytes) } }, { text: "Transcribe this audio. If silent, reply with nothing." }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 20 },
  });
  return model;
}
// Model names your keys can use, to help pick the right ones
export async function listModels() {
  const out: { groq: string[]; gemini: string[] } = { groq: [], gemini: [] };
  try {
    const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${env("GROQ_API_KEY")}` } });
    if (r.ok) out.groq = ((await r.json()).data ?? []).map((m: { id: string }) => m.id).filter((id: string) => !/whisper|tts|playai|guard/.test(id));
  } catch { /* shown as empty */ }
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100", { headers: { "x-goog-api-key": env("GEMINI_API_KEY") } });
    if (r.ok) {
      out.gemini = ((await r.json()).models ?? [])
        .filter((m: { supportedGenerationMethods?: string[] }) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m: { name: string }) => m.name.replace(/^models\//, ""))
        .filter((n: string) => /gemini/.test(n));
    }
  } catch { /* shown as empty */ }
  return out;
}
