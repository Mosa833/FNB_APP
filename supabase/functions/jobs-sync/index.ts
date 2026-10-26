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

  // Dead link check: reported jobs first, then the ones checked longest ago. Gone (404 or 410) = closed.
  const { data: reported } = await admin.from("job_reports").select("job_id").in("reason", ["broken_link", "closed"]).limit(200);
  const reportedIds = [...new Set((reported ?? []).map((r) => r.job_id))].slice(0, 20);
  const { data: firstCheck } = reportedIds.length
    ? await admin.from("jobs").select("id, url").in("id", reportedIds).eq("active", true).not("url", "is", null)
    : { data: [] as { id: string; url: string }[] };
  const { data: oldest } = await admin.from("jobs").select("id, url").eq("active", true).neq("source", "demo").not("url", "is", null)
    .order("link_checked_at", { ascending: true, nullsFirst: true }).limit(40);
  const toCheck = [...new Map([...(firstCheck ?? []), ...(oldest ?? [])].map((j) => [j.id, j])).values()].slice(0, 40);
  let closed = 0;
  const check = async (j: { id: string; url: string }) => {
    let gone = false;
    try {
      const r = await fetch(j.url, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "SkillBridge link check" } });
      gone = r.status === 404 || r.status === 410;
      await r.body?.cancel();
    } catch { /* timeouts and network errors don't close a job */ }
    await admin.from("jobs").update(gone ? { active: false, link_checked_at: new Date().toISOString() } : { link_checked_at: new Date().toISOString() }).eq("id", j.id);
    if (gone) closed++;
  };
  for (let i = 0; i < toCheck.length; i += 8) await Promise.all(toCheck.slice(i, i + 8).map(check));

  return json({ ok: true, sources: report, links_checked: toCheck.length, closed_because_link_gone: closed });
});
