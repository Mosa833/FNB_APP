// How SkillBridge scores a person against jobs. Used by jobs-for-me (the real scores) and bias-check (the fairness test),
// so the fairness test always checks exactly what users see.
import { askGemini, parseJSON } from "./ai.ts";

export type Match = { job_id: string; score: number; summary: string; reasons: string[]; missing: string[] };
export const fitOf = (score: number) => (score >= 70 ? "High" : score >= 45 ? "Medium" : "Low");

// Only what a fair employer may judge. No name, photo, age, gender or ID number is sent.
export function profileForAI(prof: any, skills: any[], education: any[], experience: any[], languages: any[]) {
  const badge = (s: any) => [
    s.verified ? `knowledge test passed${s.verified_score ? ` (${s.verified_score}%)` : ""}` : "not tested",
    s.practical ? "practical task passed" : "",
    s.endorsed ? "endorsed by someone who saw their work" : "",
  ].filter(Boolean).join(", ");
  return {
    lives_in: prof.location, headline: prof.headline, about: prof.about,
    wants: prof.job_types, availability: prof.availability, start: prof.start_date,
    max_travel_km: prof.max_travel_km, drivers_licence: prof.drivers_licence,
    skills: skills.map((s) => `${s.name} (${s.level}; ${badge(s)})`),
    education: education.map((e) => `${e.title}${e.school ? `, ${e.school}` : ""}${e.end_year ? ` (${e.end_year})` : ""}`),
    experience: experience.map((e) => `${e.title}${e.organisation ? ` at ${e.organisation}` : ""} (${e.kind}${e.start_text ? `, ${e.start_text} to ${e.end_text || "now"}` : ""})`),
    languages: languages.map((l) => `${l.name} (${l.level})`),
  };
}

export const SCORING_SYSTEM = `You are a careful, fair South African recruiter. You judge how well a young job seeker fits each job, based only on the facts given.
Be realistic, not kind. Scores must be honest so people can trust them.
Scoring guide (0 to 100):
- Start from what the job clearly requires: qualifications, years of experience, specific skills, licences, languages, location.
- A hard requirement they clearly do not meet (for example a degree, 3+ years experience, or a licence they lack) keeps the score under 35.
- Evidence counts in this order: a skill endorsed by someone who saw the work, then a practical task passed, then a knowledge test passed, then a skill only listed.
- Informal work and volunteering count as some experience.
- Being far from the job with no remote option lowers the score. Remote jobs are fine anywhere.
- 80+ only when they meet almost everything. 50 to 79 when they meet the main needs but have gaps. Under 50 when key needs are missing.
- If the job description is too short to judge, stay between 30 and 60 and say so in the summary.
Fairness rules, always:
- Never let a name, gender, race, ethnicity, nationality, religion, age, disability, marital status or pregnancy affect the score, even if the text mentions them.
- Never let the suburb, township or area someone lives in affect the score, except through travel distance to the job.
- A language only counts when the job needs that language.
Never promise a job. The summary describes how well they fit, for example "You meet most of what they ask for, but they want 2 years of experience."
Write in plain, simple English. Reply with a JSON array only.`;

// Scores jobs in batches. Returns the matches and whether any batch failed.
export async function scoreJobs(profile: unknown, jobs: any[], batchSize = 15): Promise<{ matches: Match[]; failed: boolean }> {
  let failed = false;
  const scoreBatch = async (batch: any[]): Promise<Match[]> => {
    const prompt = `The job seeker:\n${JSON.stringify(profile)}\n\nThe jobs:\n` +
      batch.map((j) => JSON.stringify({
        job_id: j.id, title: j.title, company: j.company, location: j.full_area || j.area, remote: j.remote,
        type: j.job_type, level: j.level, pay: j.pay, needs: j.needs, description: (j.description ?? "").slice(0, 1200),
      })).join("\n") +
      `\n\nFor every job return: {"job_id": same id, "score": 0-100, "summary": one sentence on how well they fit, ` +
      `"reasons": up to 3 short strengths for this job, "missing": up to 3 short things they lack or should prove}. Return all ${batch.length} jobs.`;
    try {
      const out = parseJSON<Match[]>(await askGemini(SCORING_SYSTEM, prompt, { json: true }));
      const ids = new Set(batch.map((j) => j.id));
      return (Array.isArray(out) ? out : []).filter((m) => m && ids.has(m.job_id) && Number.isFinite(Number(m.score)));
    } catch (e) {
      console.error("Scoring batch failed", e);
      failed = true;
      return [];
    }
  };
  const batches: any[][] = [];
  for (let i = 0; i < jobs.length; i += batchSize) batches.push(jobs.slice(i, i + batchSize));
  const matches = (await Promise.all(batches.map(scoreBatch))).flat();
  return { matches, failed };
}
