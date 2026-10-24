// Starts an interview practice session: checks the monthly limit and writes questions for the job type.
import { serve, json, adminClient, requireUser, HttpError } from "../_shared/common.ts";
import { askClaude, parseJSON } from "../_shared/ai.ts";

const MONTHLY_LIMIT = 3;
const TYPES = ["General", "Skills", "Problem solving"];

const FALLBACK: Record<string, string[]> = {
  General: [
    "Tell us about yourself.",
    "Why do you want to work as a {job}?",
    "What are your biggest strengths?",
    "Where do you see yourself in two years?",
    "Why should we hire you?",
  ],
  Skills: [
    "Which skills make you a good fit to work as a {job}?",
    "Tell us about a time you learned something new quickly.",
    "How do you make sure your work has no mistakes?",
    "Which tools or equipment can you already use for this job?",
    "How do you plan your day when you have a lot to do?",
  ],
  "Problem solving": [
    "Tell us about a time you helped a difficult customer or person.",
    "You have three urgent tasks at once. How do you decide what to do first?",
    "You made a mistake at work. What do you do?",
    "A teammate is not doing their share. How do you handle it?",
    "Your manager is away and something goes wrong. What do you do?",
  ],
};

serve(async (req) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const body = await req.json().catch(() => ({}));
  const jobType = String(body.job_type ?? "").trim().slice(0, 60);
  const questionType = TYPES.includes(body.question_type) ? body.question_type : "General";
  const answerSeconds = [60, 120, 180].includes(Number(body.answer_seconds)) ? Number(body.answer_seconds) : 120;
  if (!jobType) throw new HttpError(400, "Please choose a job type.");

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from("interview_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["grading", "graded"])
    .gte("created_at", monthStart.toISOString());
  if ((count ?? 0) >= MONTHLY_LIMIT) {
    throw new HttpError(403, "You have used all 3 practice sessions this month. New sessions open on the 1st.");
  }

  let questions: string[] = [];
  try {
    const system =
      "You are an experienced South African recruiter who interviews young people for entry-level jobs. Reply with JSON only.";
    const prompt =
      `Write 5 interview questions for an entry-level "${jobType}" job in South Africa.\n` +
      `Question type: ${questionType}. ` +
      `General means about the person, motivation and fit. Skills means the practical skills this job needs. ` +
      `Problem solving means real situations they could face in this job.\n` +
      `Use short, plain sentences a first-time job seeker understands. Make them specific to the job.\n` +
      `If "${jobType}" is not a real job, write general entry-level questions instead.\n` +
      `Reply as {"questions":["...","...","...","...","..."]}`;
    const out = parseJSON<{ questions: string[] }>(await askClaude(system, prompt, 800));
    questions = (out.questions ?? []).map(String).filter((q) => q.length > 5).slice(0, 5);
  } catch (err) {
    console.error("Using fallback questions", err);
  }
  if (questions.length < 5) {
    questions = FALLBACK[questionType].map((q) => q.replace("{job}", jobType.toLowerCase()));
  }

  const { data: session, error } = await admin
    .from("interview_sessions")
    .insert({ user_id: user.id, job_type: jobType, question_type: questionType, answer_seconds: answerSeconds, questions })
    .select("id")
    .single();
  if (error) throw error;

  return json({ session_id: session.id, questions, answer_seconds: answerSeconds });
});
