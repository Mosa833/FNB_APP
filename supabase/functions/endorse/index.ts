// Endorsements. Called by the confirm page (web/endorse.html) that the endorser opens from their link.
// {token} shows the request; {token, answer: "confirm" | "decline"} records the answer. Opening the link alone confirms nothing.
import { serve, json, adminClient, HttpError } from "../_shared/common.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const admin = adminClient();
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  if (!UUID.test(token)) throw new HttpError(404, "This link is not valid.");

  const { data: e } = await admin.from("endorsements").select("*, user_skills(name), profiles(full_name)").eq("token", token).maybeSingle();
  if (!e) throw new HttpError(404, "This link is not valid or was cancelled.");
  const first = String(e.profiles?.full_name ?? "Someone").split(" ")[0];
  const view = { person: first, skill: e.user_skills?.name ?? "a skill", relationship: e.relationship, endorser_name: e.endorser_name, status: e.status };

  const answer = body.answer;
  if (!answer) return json(view);
  if (answer !== "confirm" && answer !== "decline") throw new HttpError(400, "Choose confirm or decline.");
  if (e.status !== "pending") return json({ ...view, already: true });

  const status = answer === "confirm" ? "confirmed" : "declined";
  await admin.from("endorsements").update({ status, answered_at: new Date().toISOString() }).eq("id", e.id).eq("status", "pending");
  if (status === "confirmed") await admin.from("user_skills").update({ endorsed: true }).eq("id", e.skill_id);
  return json({ ...view, status });
});
