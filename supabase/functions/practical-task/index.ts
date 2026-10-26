// Practical badge. "brief": the task for a skill (written once per skill and shared).
// "submit": the user's photo or PDF of the finished task is checked against the brief and checklist.
import { serve, json, adminClient, requireUser, HttpError } from "../_shared/common.ts";
import { askGemini, askGeminiWithFile, parseJSON } from "../_shared/ai.ts";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif", pdf: "application/pdf" };
const DAILY_LIMIT = 5;

serve(async (req) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const body = await req.json().catch(() => ({}));
  const { data: skill } = await admin.from("user_skills").select("*").eq("id", String(body.skill_id ?? "")).maybeSingle();
  if (!skill || skill.user_id !== user.id) throw new HttpError(404, "That skill is not on your profile.");

  // The task for this skill
  let { data: task } = await admin.from("practical_tasks").select("*").ilike("skill", skill.name).maybeSingle();
  if (!task) {
    const out = parseJSON<{ brief: string; checklist: string[]; evidence_hint: string }>(await askGemini(
      "You design short practical tasks that prove a young South African job seeker can really use a skill at work. " +
      "The task must take under one hour, cost nothing, use things most people have (a phone, paper, free apps), and produce something a photo, screenshot or PDF can show. " +
      "Never ask for personal documents, money or other people's private information. Plain, simple English. Reply with JSON only.",
      `Skill: ${skill.name}\nReply as {"brief": "2 to 4 sentences: what to do, step by step", "checklist": ["3 to 5 things a reviewer checks in the evidence"], "evidence_hint": "one sentence: what to photograph or upload"}`,
      { json: true },
    ));
    if (!out.brief || !Array.isArray(out.checklist) || out.checklist.length < 2) throw new HttpError(502, "The task could not be written. Please try again.");
    const { data: saved, error } = await admin.from("practical_tasks").insert({
      skill: skill.name, brief: String(out.brief).slice(0, 800), checklist: out.checklist.slice(0, 5).map((c) => String(c).slice(0, 160)),
      evidence_hint: String(out.evidence_hint ?? "").slice(0, 200),
    }).select().single();
    if (error) {
      // Another user created it at the same moment
      ({ data: task } = await admin.from("practical_tasks").select("*").ilike("skill", skill.name).single());
    } else task = saved;
  }

  if (body.action !== "submit") {
    const { data: tries } = await admin.from("skill_evidence").select("passed, feedback, created_at").eq("skill_id", skill.id).order("created_at", { ascending: false }).limit(1);
    return json({ task: { brief: task.brief, checklist: task.checklist, evidence_hint: task.evidence_hint }, practical: skill.practical, last: tries?.[0] ?? null });
  }

  // ---------- Check the evidence ----------
  const path = String(body.path ?? "");
  if (!path.startsWith(`${user.id}/`)) throw new HttpError(400, "No evidence was sent.");
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await admin.from("skill_evidence").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) throw new HttpError(429, "You've sent a lot of tasks today. Try again tomorrow.");

  const ext = (path.split(".").pop() ?? "").toLowerCase();
  if (!TYPES[ext]) throw new HttpError(400, "Please send a photo or a PDF.");
  const { data: file, error } = await admin.storage.from("skill-evidence").download(path);
  if (error || !file) throw new HttpError(404, "Your file could not be found. Please upload it again.");
  if (file.size > 8 * 1024 * 1024) throw new HttpError(400, "This file is too big. Please use one under 8 MB.");
  const description = String(body.description ?? "").slice(0, 600);

  const review = parseJSON<{ passed: boolean; feedback: string; checked: { item: string; met: boolean }[] }>(await askGeminiWithFile(
    "You check practical task evidence for SkillBridge, fairly and strictly. Pass only when the file clearly shows this person's own finished work for THIS task and meets most of the checklist. " +
    "Fail it when the file is unrelated, blank, unreadable, looks copied from the internet, or shows a different task. Judge the work, never the person (not their name, looks, handwriting style or background). " +
    "Feedback is kind, specific and in plain English: what was good, and exactly what to fix if it did not pass. Reply with JSON only.",
    `Skill: ${skill.name}\nTask: ${task.brief}\nChecklist: ${JSON.stringify(task.checklist)}\nWhat the person says they did: ${description || "(nothing written)"}\n\n` +
    `Reply as {"passed": true or false, "feedback": "2 to 4 sentences", "checked": [{"item": "each checklist item", "met": true or false}]}`,
    new Uint8Array(await file.arrayBuffer()), TYPES[ext], { json: true },
  ));
  const met = (review.checked ?? []).filter((c) => c?.met).length;
  const total = Math.max(1, (review.checked ?? []).length || task.checklist.length);
  // Both the reviewer's decision and most of the checklist must agree
  const passed = Boolean(review.passed) && met / total >= 0.6;

  await admin.from("skill_evidence").insert({
    user_id: user.id, skill_id: skill.id, file_path: path, description, passed, feedback: String(review.feedback ?? "").slice(0, 1000),
  });
  if (passed) await admin.from("user_skills").update({ practical: true }).eq("id", skill.id);
  return json({ passed, feedback: review.feedback, checked: review.checked ?? [] });
});
