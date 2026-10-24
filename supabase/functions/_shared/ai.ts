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

export function parseJSON<T>(text: string): T {
  const clean = text.replace(/```json|```/g, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < 0) throw new HttpError(502, "The AI gave an answer we could not read. Please try again.");
  return JSON.parse(clean.slice(start, end + 1)) as T;
}

// Speech to text uses the OpenAI transcription API
export async function transcribe(audio: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", Deno.env.get("OPENAI_TRANSCRIBE_MODEL") ?? "whisper-1");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("OPENAI_API_KEY")}` },
    body: form,
  });
  if (!res.ok) {
    console.error("Transcription error", res.status, await res.text());
    throw new HttpError(502, "We could not turn your recording into text. Please try again.");
  }
  const data = await res.json();
  return (data.text ?? "").trim();
}
