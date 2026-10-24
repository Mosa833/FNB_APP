// Pulls jobs from the Greenhouse and SmartRecruiters companies in job_sources, and retires old posts.
// Runs on a schedule (see SETUP.md). Call it with the header  x-cron-secret: <CRON_SECRET>.
import { serve, json, adminClient, env, HttpError } from "../_shared/common.ts";
import { fetchGreenhouse, fetchSmartRecruiters, saveJobs } from "../_shared/jobs.ts";

serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== env("CRON_SECRET")) throw new HttpError(401, "Not allowed.");
  const admin = adminClient();
  const started = new Date().toISOString();
  const report: Record<string, string> = {};

  const { data: sources, error } = await admin.from("job_sources").select("*").eq("active", true);
  if (error) throw error;

  for (const src of sources ?? []) {
    const key = `${src.provider}:${src.token}`;
    try {
      let jobs;
      if (src.provider === "greenhouse") {
        jobs = await fetchGreenhouse(src.token, src.company_name);
      } else {
        const { data: known } = await admin.from("jobs").select("external_id")
          .eq("source", "smartrecruiters").like("external_id", `${src.token}:%`).not("description", "is", null);
        jobs = await fetchSmartRecruiters(src.token, src.company_name, new Set((known ?? []).map((k) => k.external_id)));
      }
      await saveJobs(admin, jobs);
      // Posts that disappeared from the company's board are closed
      await admin.from("jobs").update({ active: false })
        .eq("source", src.provider).like("external_id", `${src.token}:%`).lt("last_seen_at", started);
      await admin.from("job_sources").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("id", src.id);
      report[key] = `${jobs.length} jobs in South Africa`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.from("job_sources").update({ last_error: msg.slice(0, 500) }).eq("id", src.id);
      report[key] = `failed: ${msg}`;
    }
  }

  // Adzuna and JSearch posts are searched live per user; retire ones not seen for 14 days or older than 45 days
  const twoWeeks = new Date(Date.now() - 14 * 864e5).toISOString();
  const old = new Date(Date.now() - 45 * 864e5).toISOString();
  await admin.from("jobs").update({ active: false }).in("source", ["adzuna", "jsearch"]).lt("last_seen_at", twoWeeks);
  await admin.from("jobs").update({ active: false }).neq("source", "demo").lt("posted_at", old);

  return json({ ok: true, sources: report });
});
