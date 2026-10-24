// The user's job list: searches Adzuna and JSearch (Google for Jobs) live for their profile, adds company board jobs,
// then Gemini scores how likely they are to get each job.
import { serve, json, adminClient, requireUser, HttpError } from "../_shared/common.ts";
import { askGemini, parseJSON } from "../_shared/ai.ts";
import { adzunaConfigured, fetchAdzuna, jsearchConfigured, fetchJSearch, saveJobs, dedupeKey } from "../_shared/jobs.ts";

const REFRESH_EVERY_MS = 3 * 60 * 60 * 1000; // live search at most every 3 hours, or when the user pulls to refresh
const MIN_REFRESH_GAP_MS = 5 * 60 * 1000;    // and never more than once per 5 minutes
const MAX_NEW_SCORES = 45;                   // AI scoring per request, to keep it quick and cheap
const BATCH = 15;
const MAX_AGE_DAYS = 30;
// Which copy to keep when the same job is posted on several sites (lower is better)
const rankSource = (j: any) =>
  j.source === "greenhouse" || j.source === "smartrecruiters" ? 0 : j.apply_direct ? 1 : j.source === "adzuna" ? 2 : j.source === "demo" ? 4 : 3;
const STOP = new Set(["and", "the", "for", "with", "work", "worker", "assistant", "junior", "senior", "general", "basic", "skills", "office"]);

type Match = { job_id: string; score: number; summary: string; reasons: string[]; missing: string[] };

async function sha(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length >= 3 && !STOP.has(w));
const chanceOf = (score: number) => (score >= 70 ? "High" : score >= 45 ? "Medium" : "Low");

serve(async (req) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const body = await req.json().catch(() => ({}));
  const wantRefresh = Boolean(body.refresh);

  const [p, sk, edu, exp, langs] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).single(),
    admin.from("user_skills").select("name, level, verified, verified_score").eq("user_id", user.id),
    admin.from("education").select("qualification, title, school, field, end_year").eq("user_id", user.id),
    admin.from("experience").select("title, organisation, kind, start_text, end_text, description").eq("user_id", user.id),
    admin.from("languages").select("name, level").eq("user_id", user.id),
  ]);
  const prof: any = p.data;
  if (!prof) throw new HttpError(404, "Profile not found.");
  const skills = sk.data ?? [], education = edu.data ?? [], experience = exp.data ?? [], languages = langs.data ?? [];

  // ---------- 1. Live Adzuna search for this person ----------
  const last = prof.jobs_refreshed_at ? new Date(prof.jobs_refreshed_at).getTime() : 0;
  const age = Date.now() - last;
  let searched = false;
  const freshIds = new Set<string>();
  const liveOn = adzunaConfigured() || jsearchConfigured();
  if (liveOn && (age > REFRESH_EVERY_MS || (wantRefresh && age > MIN_REFRESH_GAP_MS))) {
    const queries = [...new Set([
      ...(prof.job_types ?? []),
      ...skills.filter((s: any) => s.verified).map((s: any) => s.name),
      ...skills.map((s: any) => s.name),
    ].map((q: string) => q.trim()).filter(Boolean))].slice(0, 4);
    if (!queries.length) queries.push("entry level");
    const parts = String(prof.location ?? "").split(",").map((x: string) => x.trim()).filter(Boolean);
    const where = parts.length >= 2 ? parts[1] : parts[0] ?? "";
    const km = prof.max_travel_km || 30;
    // JSearch charges per request, so it searches fewer terms (JSEARCH_MAX_QUERIES, default 2)
    const jsearchQueries = queries.slice(0, Math.max(0, Number(Deno.env.get("JSEARCH_MAX_QUERIES") ?? 2)));
    const results = (await Promise.all([
      ...(adzunaConfigured() ? queries.map((q) => fetchAdzuna(q, where, km)) : []),
      ...(jsearchConfigured() ? jsearchQueries.map((q) => fetchJSearch(q, where, km)) : []),
    ])).flat();
    const unique = [...new Map(results.map((j) => [`${j.source}:${j.external_id}`, j])).values()];
    const saved = await saveJobs(admin, unique);
    saved.forEach((s) => freshIds.add(s.id));
    await admin.from("profiles").update({ jobs_refreshed_at: new Date().toISOString() }).eq("id", user.id);
    searched = true;
  }

  // ---------- 2. Candidate jobs, roughly filtered before the AI looks at them ----------
  const { data: pool } = await admin.from("jobs").select("*").eq("active", true).neq("source", "demo")
    .order("posted_at", { ascending: false, nullsFirst: false }).limit(400);
  // Only recent posts, and one copy of each job
  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  const recent = (pool ?? []).filter((j: any) => !j.posted_at || new Date(j.posted_at).getTime() >= cutoff);
  const best = new Map<string, any>();
  for (const j of recent) {
    const key = j.dedupe_key || dedupeKey(j.title, j.company);
    const have = best.get(key);
    if (!have || rankSource(j) < rankSource(have) || (rankSource(j) === rankSource(have) && (j.description?.length ?? 0) > (have.description?.length ?? 0))) {
      best.set(key, j);
    }
  }
  let jobs: any[] = [...best.values()];
  const usingDemo = jobs.length < 5;
  if (usingDemo) {
    const { data: demo } = await admin.from("jobs").select("*").eq("active", true).eq("source", "demo");
    jobs = [...jobs, ...(demo ?? [])];
  }

  const terms = new Set(words([
    ...(prof.job_types ?? []), ...skills.map((s: any) => s.name), ...experience.map((e: any) => e.title),
    ...education.map((e: any) => `${e.title} ${e.field ?? ""}`), prof.headline ?? "",
  ].join(" ")));
  const place = words(String(prof.location ?? ""));
  const { data: existing } = await admin.from("job_matches").select("*").eq("user_id", user.id);
  const matchByJob = new Map((existing ?? []).map((m: any) => [m.job_id, m]));

  const ranked = jobs.map((j) => {
    const title = words(j.title), desc = words(`${j.description ?? ""} ${(j.needs ?? []).join(" ")}`);
    let rough = 0;
    title.forEach((w) => { if (terms.has(w)) rough += 3; });
    new Set(desc).forEach((w) => { if (terms.has(w)) rough += 1; });
    if (place.some((w) => `${j.area} ${j.full_area ?? ""}`.toLowerCase().includes(w))) rough += 2;
    if (j.remote) rough += 1;
    if (freshIds.has(j.id)) rough += 3; // Adzuna already matched it to this person's search
    return { j, rough };
  }).filter((x) => x.rough > 0 || matchByJob.has(x.j.id) || usingDemo)
    .sort((a, b) => b.rough - a.rough)
    .slice(0, 60)
    .map((x) => x.j);

  // ---------- 3. Gemini scores the jobs it has not scored for this version of the profile ----------
  const profileForAI = {
    lives_in: prof.location, headline: prof.headline, about: prof.about,
    wants: prof.job_types, availability: prof.availability, start: prof.start_date,
    max_travel_km: prof.max_travel_km, drivers_licence: prof.drivers_licence,
    skills: skills.map((s: any) => `${s.name} (${s.level}${s.verified ? `, verified by test ${s.verified_score ?? ""}%` : ", not tested"})`),
    education: education.map((e: any) => `${e.title}${e.school ? `, ${e.school}` : ""}${e.end_year ? ` (${e.end_year})` : ""}`),
    experience: experience.map((e: any) => `${e.title}${e.organisation ? ` at ${e.organisation}` : ""} (${e.kind}${e.start_text ? `, ${e.start_text} to ${e.end_text || "now"}` : ""})`),
    languages: languages.map((l: any) => `${l.name} (${l.level})`),
  };
  const hash = await sha(JSON.stringify(profileForAI));
  const toScore = ranked.filter((j) => matchByJob.get(j.id)?.profile_hash !== hash).slice(0, MAX_NEW_SCORES);

  const system = `You are a careful South African recruiter. You judge how likely a young job seeker is to be hired for each job, based only on the facts given.
Be realistic, not kind. Scores must be honest so people can trust them.
Scoring guide (0 to 100):
- Start from what the job clearly requires: qualifications, years of experience, specific skills, licences, languages, location.
- A hard requirement they clearly do not meet (for example a degree, 3+ years experience, or a licence they lack) keeps the score under 35.
- Skills verified by a test count more than skills they only listed. Informal work and volunteering count as some experience.
- Being far from the job with no remote option lowers the score. Remote jobs are fine anywhere.
- 80+ only when they meet almost everything. 50 to 79 when they meet the main needs but have gaps. Under 50 when key needs are missing.
- If the job description is too short to judge, stay between 30 and 60 and say so in the summary.
Write in plain, simple English. Reply with a JSON array only.`;

  const scoreBatch = async (batch: any[]): Promise<Match[]> => {
    const prompt = `The job seeker:\n${JSON.stringify(profileForAI)}\n\nThe jobs:\n` +
      batch.map((j) => JSON.stringify({
        job_id: j.id, title: j.title, company: j.company, location: j.full_area || j.area, remote: j.remote,
        type: j.job_type, level: j.level, pay: j.pay, needs: j.needs, description: (j.description ?? "").slice(0, 1200),
      })).join("\n") +
      `\n\nFor every job return: {"job_id": same id, "score": 0-100, "summary": one sentence on their chances, ` +
      `"reasons": up to 3 short strengths for this job, "missing": up to 3 short things they lack or should prove}. Return all ${batch.length} jobs.`;
    try {
      const out = parseJSON<Match[]>(await askGemini(system, prompt, { json: true }));
      const ids = new Set(batch.map((j) => j.id));
      return (Array.isArray(out) ? out : []).filter((m) => m && ids.has(m.job_id) && Number.isFinite(Number(m.score)));
    } catch (e) {
      console.error("Scoring batch failed", e);
      return [];
    }
  };

  const batches: any[][] = [];
  for (let i = 0; i < toScore.length; i += BATCH) batches.push(toScore.slice(i, i + BATCH));
  const scored = (await Promise.all(batches.map(scoreBatch))).flat();
  if (scored.length) {
    const rows = scored.map((m) => {
      const score = Math.max(0, Math.min(100, Math.round(Number(m.score))));
      return {
        user_id: user.id, job_id: m.job_id, score, chance: chanceOf(score),
        summary: String(m.summary ?? "").slice(0, 400),
        reasons: (m.reasons ?? []).map(String).slice(0, 3),
        missing: (m.missing ?? []).map(String).slice(0, 3),
        profile_hash: hash, created_at: new Date().toISOString(),
      };
    });
    const { error } = await admin.from("job_matches").upsert(rows, { onConflict: "user_id,job_id" });
    if (error) throw error;
    rows.forEach((r) => matchByJob.set(r.job_id, r));
  }

  // ---------- 4. Relevant jobs, best chance first ----------
  const list = ranked
    .map((j) => ({ ...j, match: matchByJob.get(j.id) ?? null }))
    .filter((j) => j.match && j.match.score >= 20)
    .sort((a, b) => b.match.score - a.match.score || String(b.posted_at).localeCompare(String(a.posted_at)));

  return json({
    jobs: list,
    pending: Math.max(0, ranked.filter((j) => !matchByJob.has(j.id) || matchByJob.get(j.id).profile_hash !== hash).length),
    searched,
    refreshed_at: searched ? new Date().toISOString() : prof.jobs_refreshed_at,
    live_search: liveOn,
    sources: { adzuna: adzunaConfigured(), jsearch: jsearchConfigured() },
    demo: usingDemo,
  });
});
