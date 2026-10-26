// "Download my data" (POPIA): everything SkillBridge stores about the user, as one JSON file.
import { serve, json, adminClient, requireUser } from "../_shared/common.ts";

const OWN_TABLES = [
  "education", "user_skills", "experience", "languages", "saved_jobs", "applications", "mentor_bookings",
  "test_attempts", "interview_sessions", "interview_answers", "coach_messages", "guides", "job_matches",
  "skill_evidence", "endorsements", "job_reports",
];

serve(async (req) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), account: { id: user.id, email: user.email ?? null, phone: user.phone ?? null } };
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
  out.profile = profile;
  for (const t of OWN_TABLES) {
    const { data, error } = await admin.from(t).select("*").eq("user_id", user.id);
    out[t] = error ? `could not read: ${error.message}` : data;
  }
  // Endorsement links are private keys: not included in the copy
  if (Array.isArray(out.endorsements)) out.endorsements = (out.endorsements as any[]).map(({ token: _t, ...rest }) => rest);
  out.files_note = "Photos, certificates, interview recordings and practical task files are listed by path. Ask the SkillBridge team for copies of the files.";
  return json(out);
});
