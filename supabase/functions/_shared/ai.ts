import { env, HttpError } from "./common.ts";

// Text tasks (questions, grading) use the Anthropic Messages API
export async function askClaude(system: string, prompt: string, maxTokens = 2000): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    console.error("Anthropic error", res.status, await res.text());
    throw new HttpError(502, "The AI service is not available right now. Please try again.");
  }
  const data = await res.json();
  return (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
}

type ChatMessage = { role: "user" | "assistant"; content: string };

// Multi-turn chat (career coach). Uses a smaller, faster model by default.
export async function chatClaude(system: string, messages: ChatMessage[], maxTokens = 800): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_CHAT_MODEL") ?? Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-5-5",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  if (!res.ok) {
    console.error("Anthropic error", res.status, await res.text());
    throw new HttpError(502, "The coach is not available right now. Please try again.");
  }
  const data = await res.json();
  return (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("")
    .trim();
}

// Text and JSON tasks on Google Gemini (job matching, skills tests, guides).
export async function askGemini(system: string, prompt: string, opts: { json?: boolean; maxTokens?: number } = {}): Promise<string> {
  const model = Deno.env.get("GEMINI_TEXT_MODEL") ?? Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": env("GEMINI_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: opts.maxTokens ?? 8192,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });
  if (!res.ok) {
    console.error("Gemini error", res.status, await res.text());
    throw new HttpError(502, "The AI service is not available right now. Please try again.");
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  if (!text) {
    console.error("Gemini empty answer", JSON.stringify(data).slice(0, 500));
    throw new HttpError(502, "The AI gave an empty answer. Please try again.");
  }
  return text;
}

export function parseJSON<T>(text: string): T {
  const clean = text.replace(/```json|```/g, "");
  const obj = clean.indexOf("{");
  const arr = clean.indexOf("[");
  const isArray = arr >= 0 && (obj < 0 || arr < obj);
  const start = isArray ? arr : obj;
  const end = isArray ? clean.lastIndexOf("]") : clean.lastIndexOf("}");
  if (start < 0 || end < 0) throw new HttpError(502, "The AI gave an answer we could not read. Please try again.");
  return JSON.parse(clean.slice(start, end + 1)) as T;
}

// Speech to text uses the Google Gemini API.
// Gemini's documented audio formats are wav, mp3, aiff, aac, ogg and flac.
// The app records .wav on iPhone and .aac on Android, both on that list.
const AUDIO_TYPES: Record<string, string> = {
  wav: "audio/wav", mp3: "audio/mp3", aiff: "audio/aiff", aac: "audio/aac", ogg: "audio/ogg", flac: "audio/flac",
};

export async function transcribe(audio: Blob, filename: string): Promise<string> {
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  const mimeType = AUDIO_TYPES[ext];
  if (!mimeType) throw new HttpError(400, `Recordings in .${ext} format can't be checked. Please update the app and record again.`);
  if (audio.size === 0) return "";
  if (audio.size > 15 * 1024 * 1024) throw new HttpError(400, "One recording is too big. Please keep answers under 3 minutes.");

  const bytes = new Uint8Array(await audio.arrayBuffer());
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": env("GEMINI_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: encodeBase64(bytes) } },
          {
            text: "Transcribe exactly what the speaker says in this job interview answer. " +
              "Keep their own words, including mistakes and filler words. Write it in the language they speak. " +
              "Reply with the transcript only, no labels, timestamps or comments. If nobody speaks, reply with nothing.",
          },
        ],
      }],
      generationConfig: { temperature: 0 },
    }),
  });
  if (!res.ok) {
    console.error("Gemini transcription error", res.status, await res.text());
    throw new HttpError(502, "We could not turn your recording into text. Please try again.");
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  return text;
}

// Base64 without extra libraries, in chunks so long recordings don't overflow the stack
function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
