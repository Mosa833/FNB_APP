// Written feedback on a skills test, by Groq. The score itself is marked exactly by the database.
import { serve, json, adminClient, requireUser, HttpError } from "../_shared/common.ts";
import { askGroq, parseJSON } from "../_shared/ai.ts";

type Feedback = { summary: string; questions: { question: string; why: string }[]; tips: string[] };

serve(async (req) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const { attempt_id } = await req.json().catch(() => ({}));
  if (!attempt_id) throw new HttpError(400, "No test attempt was sent.");

  const { data: attempt } = await admin.from("test_attempts").select("*, tests(skill, name)").eq("id", attempt_id).maybeSingle();
  if (!attempt || attempt.user_id !== user.id) throw new HttpError(404, "Test attempt not found.");
  if (attempt.feedback) return json({ feedback: attempt.feedback });

  const { data: qs } = await admin.from("test_questions").select("position, question, options, answer_index")
    .eq("test_id", attempt.test_id).order("position");
  const answers: number[] = attempt.answers ?? [];
  const lines = (qs ?? []).map((q: any, i: number) => {
    const chosen = answers[i];
    const right = chosen === q.answer_index;
    return `${q.position}. ${q.question}\n   Their answer: ${q.options[chosen] ?? "(no answer)"}\n   Correct answer: ${q.options[q.answer_index]}\n   ${right ? "RIGHT" : "WRONG"}`;
  }).join("\n");

  const system = "You are a patient tutor for young South Africans preparing for entry-level work. Use plain, simple English and short sentences. Reply with JSON only.";
  const prompt = `Skills test: ${attempt.tests?.name} (skill: ${attempt.tests?.skill}). Score: ${attempt.score}% (${attempt.passed ? "passed" : "did not pass, 70% needed"}).

${lines}

Reply in this JSON shape:
{"summary": "2 sentences on how they did and what this means for work",
 "questions": [{"question": "the question text, for each WRONG answer only", "why": "1 or 2 sentences explaining why the correct answer is right, with a simple work example"}],
 "tips": ["2 or 3 short, practical things to practise next"]}`;

  const fb = parseJSON<Feedback>(await askGroq(system, prompt, 1500));
  const clean = {
    summary: String(fb.summary ?? "").slice(0, 600),
    questions: (fb.questions ?? []).slice(0, 15).map((q) => ({ question: String(q.question).slice(0, 300), why: String(q.why).slice(0, 600) })),
    tips: (fb.tips ?? []).slice(0, 3).map((t) => String(t).slice(0, 200)),
  };
  await admin.from("test_attempts").update({ feedback: clean }).eq("id", attempt_id);
  return json({ feedback: clean });
});
