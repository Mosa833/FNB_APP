// Career coach chat. Keeps the conversation in coach_messages and knows the user's profile and jobs.
import { serve, json, adminClient, requireUser, HttpError } from "../_shared/common.ts";
import { chatGroq } from "../_shared/ai.ts";
import { profileSummary } from "../_shared/profile.ts";

const DAILY_LIMIT = 40; // messages per user per day, to keep AI costs under control
const HISTORY = 20;

serve(async (req) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const body = await req.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  if (!message) throw new HttpError(400, "Type a question first.");
  if (message.length > 1500) throw new HttpError(400, "Please keep your message shorter.");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin.from("coach_messages").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("role", "user").gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) throw new HttpError(429, "You've reached today's limit for the coach. Try again tomorrow.");

  const { data: past } = await admin.from("coach_messages").select("role, content")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(HISTORY);
  const history = (past ?? []).reverse();
  // The API needs the conversation to start with the user
  while (history.length && history[0].role !== "user") history.shift();

  const summary = await profileSummary(admin, user.id);
  const system = `You are the SkillBridge career coach for young people in South Africa looking for their first or next job.
Speak like a kind, practical mentor. Use short sentences and plain English. No jargon.
Keep answers short (under 150 words) unless the user asks for more. Use short lists only when they help.
Give advice that fits this person and the South African job market (for example taxis, CVs with ID copies, learnerships, SETAs, UIF, Matric certificates).
If they ask about a job they applied for or saved, use the details below.
Never invent facts about a company. If you are not sure, say so and suggest how they can find out.
Do not give legal, medical or financial advice. For those, suggest a qualified person or an official office.
If someone seems in danger or in crisis, tell them to contact SADAG on 0800 567 567 or emergency services on 10111.

About this user:
${summary || "No profile details yet."}`;

  const reply = await chatGroq(system, [...history, { role: "user", content: message }]);
  if (!reply) throw new HttpError(502, "The coach did not answer. Please try again.");

  await admin.from("coach_messages").insert([
    { user_id: user.id, role: "user", content: message },
    { user_id: user.id, role: "assistant", content: reply.slice(0, 4000) },
  ]);
  return json({ reply });
});
