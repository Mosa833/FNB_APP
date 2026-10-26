// Turns each recorded answer into text (typed answers are used as they are), then grades the whole session with feedback and better wording.
import { serve, json, adminClient, requireUser, HttpError } from "../_shared/common.ts";
import { askGroq, parseJSON, transcribe } from "../_shared/ai.ts";

type AnswerIn = { position: number; audio_path?: string; text?: string; duration_seconds: number };
type Graded = {
  overall_score: number;
  summary: string;
  answers: { position: number; score: number; went_well: string; improve: string; better_answer: string }[];
};

serve(async (req) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const { session_id, answers } = (await req.json().catch(() => ({}))) as { session_id?: string; answers?: AnswerIn[] };
  if (!session_id || !Array.isArray(answers) || answers.length === 0) throw new HttpError(400, "No answers were sent.");

  const { data: session } = await admin.from("interview_sessions").select("*").eq("id", session_id).maybeSingle();
  if (!session || session.user_id !== user.id) throw new HttpError(404, "Session not found.");
  if (session.status === "graded") return json({ session_id, already: true });
  if (session.status === "grading") throw new HttpError(409, "This session is already being graded.");

  await admin.from("interview_sessions").update({ status: "grading" }).eq("id", session_id);

  try {
    const questions: string[] = session.questions ?? [];

    // 1. Speech to text, all answers at the same time
    const transcripts = await Promise.all(
      answers.map(async (a) => {
        // Data saver: typed answers need no recording or transcription
        if (typeof a.text === "string") return a.text.slice(0, 3000);
        if (!a.audio_path?.startsWith(`${user.id}/${session_id}/`)) return "";
        const { data: file, error } = await admin.storage.from("interview-audio").download(a.audio_path);
        if (error || !file) return "";
        return await transcribe(file, a.audio_path.split("/").pop() ?? "answer.wav");
      }),
    );

    const items = answers.map((a, i) => ({
      position: a.position,
      question: questions[a.position - 1] ?? "",
      seconds: Math.round(a.duration_seconds || 0),
      transcript: transcripts[i],
      typed: typeof a.text === "string",
    }));

    // 2. Grade everything in one request
    const system =
      "You are a kind, honest interview coach for young South Africans, many applying for their first job. " +
      "English may be their second or third language: judge what they say and how clearly they say it, not their accent or small grammar mistakes. " +
      "Be specific and encouraging. Use simple words. Reply with JSON only.";
    const prompt =
      `Job: ${session.job_type}. Question type: ${session.question_type}. Answer time allowed: ${session.answer_seconds} seconds.\n\n` +
      items
        .map((it) => it.typed
          ? `Question ${it.position}: ${it.question}\nTyped their answer (data saver mode, so judge the content, not speaking).\nWhat they wrote: ${it.transcript || "(no answer)"}`
          : `Question ${it.position}: ${it.question}\nSpoke for ${it.seconds} seconds.\nWhat they said: ${it.transcript || "(nothing could be heard)"}`)
        .join("\n\n") +
      `\n\nFor each answer give:\n` +
      `- score from 0 to 100 (relevance, clear example, structure like situation, action and result, confidence, length)\n` +
      `- went_well: one or two sentences\n` +
      `- improve: one or two specific sentences on what to change\n` +
      `- better_answer: a stronger version in first person, 3 to 5 sentences, built from what they actually said. ` +
      `Do not invent facts about them; use a placeholder in square brackets like [name of shop] where a detail is needed.\n` +
      `If nothing could be heard or the answer is off topic, give a low score and explain kindly.\n` +
      `Then give overall_score (0 to 100) and summary (two or three sentences ending with the single most useful tip).\n` +
      `Reply as {"overall_score":0,"summary":"","answers":[{"position":1,"score":0,"went_well":"","improve":"","better_answer":""}]}`;

    const graded = parseJSON<Graded>(await askGroq(system, prompt, 4000));
    const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

    const rows = items.map((it) => {
      const g = graded.answers?.find((x) => Number(x.position) === it.position);
      return {
        session_id,
        user_id: user.id,
        position: it.position,
        question: it.question,
        audio_path: answers.find((a) => a.position === it.position)?.audio_path ?? null,
        duration_seconds: it.seconds,
        transcript: it.transcript,
        score: clamp(g?.score),
        went_well: g?.went_well ?? "",
        improve: g?.improve ?? "",
        better_answer: g?.better_answer ?? "",
      };
    });

    const { error: insErr } = await admin.from("interview_answers").upsert(rows, { onConflict: "session_id,position" });
    if (insErr) throw insErr;

    const overall = graded.overall_score != null
      ? clamp(graded.overall_score)
      : Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length);

    await admin
      .from("interview_sessions")
      .update({ status: "graded", overall_score: overall, summary: graded.summary ?? "", graded_at: new Date().toISOString() })
      .eq("id", session_id);

    return json({ session_id, overall_score: overall });
  } catch (err) {
    // A failed session does not count towards the monthly limit
    await admin.from("interview_sessions").update({ status: "failed" }).eq("id", session_id);
    throw err;
  }
});
