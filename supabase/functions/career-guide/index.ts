// Gemini writes a short personal guide for a problem the user has, or for a job they applied for or saved.
import { serve, json, adminClient, requireUser, HttpError } from "../_shared/common.ts";
import { askGemini, parseJSON } from "../_shared/ai.ts";
import { profileSummary } from "../_shared/profile.ts";

const DAILY_LIMIT = 10;

serve(async (req) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const body = await req.json().catch(() => ({}));
  const topic = String(body.topic ?? "").trim().slice(0, 300);
  const jobId = body.job_id ? String(body.job_id) : null;
  if (!topic && !jobId) throw new HttpError(400, "Tell us what you need help with.");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin.from("guides").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) throw new HttpError(429, "You've made a lot of guides today. Try again tomorrow.");

  let job: any = null;
  if (jobId) {
    const { data } = await admin.from("jobs").select("id, title, company, area, pay, job_type, needs, description").eq("id", jobId).single();
    job = data;
    if (!job) throw new HttpError(404, "That job could not be found.");
  }

  const summary = await profileSummary(admin, user.id);
  const system = `You write short, practical career guides for young South Africans. Plain English, short sentences, no jargon, no hype.
Respond with JSON only, no other text: {"title": string, "body": string}.
The title is under 60 characters. The body is 200 to 350 words, split into short paragraphs with a blank line between them.
Use simple numbered steps where the reader has to do things in order. Do not use markdown symbols like # or **.
Never invent facts about a company. Base advice on the job details and the person's profile.`;
  const prompt = job
    ? `Write a guide to help this person get ready for and apply to this job.
Job: ${job.title} at ${job.company}, ${job.area}. Pay: ${job.pay ?? "not given"}. Type: ${job.job_type}. Needs: ${(job.needs ?? []).join(", ")}.
${job.description ? `Description: ${job.description}` : ""}
Cover: which of their skills to highlight, how to close any gaps, likely interview questions, and what to bring.
${topic ? `They also asked: ${topic}` : ""}

The person:
${summary}`
    : `Write a guide for this problem: ${topic}

The person:
${summary}`;

  const out = parseJSON<{ title: string; body: string }>(await askGemini(system, prompt, { json: true }));
  if (!out.title || !out.body) throw new HttpError(502, "The guide could not be written. Please try again.");

  const { data: saved, error } = await admin.from("guides").insert({
    user_id: user.id, job_id: job?.id ?? null, topic: topic || `Job: ${job.title}`,
    title: out.title.slice(0, 120), body: out.body.slice(0, 6000),
  }).select().single();
  if (error) throw error;
  return json({ guide: saved });
});
