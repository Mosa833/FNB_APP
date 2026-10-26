// Creates a skills test for a skill that has no test yet, then saves it so everyone can use it.
import { serve, json, adminClient, requireUser, HttpError } from "../_shared/common.ts";
import { askGemini, parseJSON } from "../_shared/ai.ts";

type Generated = { name: string; minutes: number; questions: { question: string; options: string[]; answer_index: number }[] };

serve(async (req) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const { skill } = await req.json().catch(() => ({}));
  const name = String(skill ?? "").trim();
  const pattern = name.replace(/[%_\\]/g, (c) => "\\" + c);
  if (!name || name.length > 60) throw new HttpError(400, "Please choose a skill first.");

  // Only for skills the user has on their profile
  const { data: owned } = await admin.from("user_skills").select("name").eq("user_id", user.id).ilike("name", pattern).maybeSingle();
  if (!owned) throw new HttpError(400, "Add this skill to your profile first.");

  const { data: existing } = await admin.from("tests").select("id").ilike("skill", pattern).maybeSingle();
  if (existing) return json({ test_id: existing.id });

  const system =
    "You write fair, practical skills tests for young people in South Africa looking for entry-level work. " +
    "Every question must test the named skill itself, the way it is used on the job. Do not ask general knowledge, " +
    "history or trivia about the skill, and do not ask about other skills. " +
    "Use plain English, real workplace situations and South African context (rand, local places, local laws such as POPIA) where it helps. " +
    "Every fact must be correct and every question must have exactly one clearly correct answer. No trick questions. Reply with JSON only.";
  const prompt =
    `Create a skills test for the skill "${name}".\n` +
    `If this is not a real work skill, or it is offensive, reply {"error":"not a skill"}.\n` +
    `Otherwise reply in this exact JSON shape:\n` +
    `{"name":"short test name","minutes":8,"questions":[{"question":"...","options":["...","...","...","..."],"answer_index":0}]}\n` +
    `Rules: exactly 16 different questions (each attempt draws 8 at random, so no two may test the same fact), exactly 4 options each, one correct answer, vary the position of the correct answer, ` +
    `each question under 30 words, test practical knowledge someone would use on the job.\n` +
    `Mix: about 6 "what does this mean / which tool" questions and 10 "what would you do in this work situation" questions, easy to medium level.`;

  const raw = parseJSON<Generated & { error?: string }>(await askGemini(system, prompt, { json: true, maxTokens: 12000 }));
  if (raw.error) throw new HttpError(400, "We could not create a test for this skill.");

  const questions = (raw.questions ?? []).filter(
    (q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 &&
      Number.isInteger(q.answer_index) && q.answer_index >= 0 && q.answer_index < 4,
  );
  const seenQ = new Set<string>();
  const unique = questions.filter((q) => { const k = q.question.trim().toLowerCase(); if (seenQ.has(k)) return false; seenQ.add(k); return true; });
  if (unique.length < 10) throw new HttpError(502, "The test did not come out right. Please try again.");
  questions.length = 0; questions.push(...unique);

  const { data: test, error } = await admin
    .from("tests")
    .insert({
      skill: owned.name,
      name: String(raw.name || owned.name).slice(0, 60),
      minutes: Math.min(15, Math.max(4, Number(raw.minutes) || 8)),
      question_count: questions.length,
      ai_generated: true,
    })
    .select("id")
    .single();

  if (error) {
    // Someone else created it at the same moment
    const { data: again } = await admin.from("tests").select("id").ilike("skill", pattern).maybeSingle();
    if (again) return json({ test_id: again.id });
    throw error;
  }

  const { error: qErr } = await admin.from("test_questions").insert(
    questions.map((q, i) => ({
      test_id: test.id,
      position: i + 1,
      question: q.question,
      options: q.options.map(String),
      answer_index: q.answer_index,
    })),
  );
  if (qErr) {
    await admin.from("tests").delete().eq("id", test.id);
    throw qErr;
  }
  return json({ test_id: test.id });
});
