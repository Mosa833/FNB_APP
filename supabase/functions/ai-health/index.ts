// Health check: tests every key, AI model, job source and database update, and says what to fix.
// Run it with the header  x-cron-secret: <CRON_SECRET>  (see SETUP.md, "Health check").
import { serve, json, adminClient, env, HttpError } from "../_shared/common.ts";
import { GROQ_MODELS, GROQ_CHAT_MODELS, probeGroq, probeGemini, probeGeminiAudio, listModels, AIError } from "../_shared/ai.ts";
import { adzunaConfigured, fetchAdzuna, jsearchConfigured, fetchJSearch } from "../_shared/jobs.ts";

type Check = { check: string; ok: boolean; detail: string; fix?: string };

serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== env("CRON_SECRET")) throw new HttpError(401, "Not allowed.");
  const body = await req.json().catch(() => ({}));
  const admin = adminClient();
  const results: Check[] = [];
  const has = (n: string) => Boolean(Deno.env.get(n));
  const reason = (e: unknown) => (e instanceof AIError ? e.detail : e instanceof Error ? e.message : String(e)).slice(0, 300);

  const run = async (check: string, fn: () => Promise<string>, fix: string) => {
    try { results.push({ check, ok: true, detail: await fn() }); }
    catch (e) { results.push({ check, ok: false, detail: reason(e), fix }); }
  };

  // 1. Keys saved in Supabase
  for (const [name, used] of [
    ["GROQ_API_KEY", "coach, grading, interview questions, test feedback"],
    ["GEMINI_API_KEY", "transcription, job chances, skills tests, guides"],
    ["GOOGLE_MAPS_API_KEY", "address search"],
    ["ADZUNA_APP_ID", "live jobs"], ["ADZUNA_APP_KEY", "live jobs"],
    ["JSEARCH_API_KEY", "live jobs"],
  ]) {
    results.push({ check: `Key ${name}`, ok: has(name), detail: has(name) ? `saved (${used})` : `missing (needed for ${used})`,
      fix: has(name) ? undefined : `npx supabase secrets set ${name}=... --project-ref YOUR_REF` });
  }

  // 2. AI models, one per feature group
  if (has("GROQ_API_KEY")) {
    await run("Groq: grading, interview questions, test feedback", async () => `works with ${await probeGroq(GROQ_MODELS())}`,
      "Check GROQ_API_KEY at console.groq.com/keys. A 429 means you hit the free plan's rate limit, so wait a minute. If it says no model worked, set GROQ_MODEL to a name from the model list below.");
    await run("Groq: career coach (full reply)", async () => `works with ${await probeGroq(GROQ_CHAT_MODELS(), true)}`,
      "Set GROQ_CHAT_MODEL to a name from the model list below.");
  }
  if (has("GEMINI_API_KEY")) {
    await run("Gemini: job chances, skills tests, guides", async () => `works with ${await probeGemini()}`,
      "Check GEMINI_API_KEY. If it says no model worked, set GEMINI_TEXT_MODEL to a name from the model list below.");
    await run("Gemini: interview transcription (audio)", async () => `works with ${await probeGeminiAudio()}`,
      "Set GEMINI_MODEL to a Gemini model from the list below that accepts audio.");
  }

  // 3. Address search
  if (has("GOOGLE_MAPS_API_KEY")) {
    await run("Google Places: address search", async () => {
      const r = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": env("GOOGLE_MAPS_API_KEY"), "X-Goog-FieldMask": "suggestions.placePrediction.text.text" },
        body: JSON.stringify({ input: "Soweto", includedRegionCodes: ["za"] }),
      });
      const t = await r.text();
      if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 250)}`);
      return `works (${(JSON.parse(t).suggestions ?? []).length} suggestions for "Soweto")`;
    }, "Enable Places API (New), turn on billing, and set the key's Application restrictions to None.");
  }

  // 4. Job sources (JSearch only when asked, because each search uses a credit)
  if (adzunaConfigured()) {
    await run("Adzuna: live jobs", async () => {
      const jobs = await fetchAdzuna("cashier", "Johannesburg", 30);
      if (!jobs.length) throw new Error("no jobs came back (see the Adzuna error in the logs)");
      return `works (${jobs.length} jobs)`;
    }, "Check ADZUNA_APP_ID and ADZUNA_APP_KEY on your Adzuna dashboard.");
  }
  if (jsearchConfigured() && body.jsearch) {
    await run("JSearch: live jobs (used 1 credit)", async () => {
      const jobs = await fetchJSearch("cashier", "Johannesburg", 30);
      if (!jobs.length) throw new Error("no jobs came back (see the JSearch error in the logs)");
      return `works (${jobs.length} jobs)`;
    }, "Check JSEARCH_API_KEY and that your plan has credits left.");
  }

  // 5. Database updates
  for (const [check, table, cols, file] of [
    ["Database: coach and guides", "coach_messages", "id", "20261024000003_coach_and_guides.sql"],
    ["Database: live jobs and match scores", "job_matches", "score", "20261024000004_live_jobs.sql"],
    ["Database: test feedback", "test_attempts", "feedback", "20261024000004_live_jobs.sql"],
    ["Database: JSearch columns", "jobs", "publisher, apply_direct, dedupe_key", "20261024000005_jsearch.sql"],
  ]) {
    const { error } = await admin.from(table).select(cols).limit(1);
    results.push({ check, ok: !error, detail: error ? error.message : "in place", fix: error ? `Run supabase/migrations/${file} in the SQL Editor` : undefined });
  }

  const failed = results.filter((r) => !r.ok);
  return json({
    summary: failed.length ? `${failed.length} problem(s) found` : "Everything works",
    results,
    models_your_keys_can_use: failed.some((r) => /Groq|Gemini/.test(r.check)) || body.models ? await listModels() : undefined,
  });
});
