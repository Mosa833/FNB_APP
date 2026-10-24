import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

// A short plain-text summary of the user, so the AI can give advice that fits them.
export async function profileSummary(admin: SupabaseClient, uid: string): Promise<string> {
  const [p, edu, skills, exp, langs, apps, saved] = await Promise.all([
    admin.from("profiles").select("full_name, location, about, headline, job_types, availability, drivers_licence").eq("id", uid).single(),
    admin.from("education").select("title, school, end_year").eq("user_id", uid),
    admin.from("user_skills").select("name, level, verified").eq("user_id", uid),
    admin.from("experience").select("title, organisation, kind").eq("user_id", uid),
    admin.from("languages").select("name, level").eq("user_id", uid),
    admin.from("applications").select("status, jobs(title, company, area, needs)").eq("user_id", uid),
    admin.from("saved_jobs").select("jobs(title, company, area, needs)").eq("user_id", uid),
  ]);
  const prof: any = p.data ?? {};
  const line = (label: string, v: string) => (v ? `${label}: ${v}` : "");
  const jobLine = (j: any) => (j ? `${j.title} at ${j.company} (${j.area}), needs ${(j.needs ?? []).join(", ")}` : "");
  return [
    line("First name", (prof.full_name ?? "").split(" ")[0]),
    line("Lives in", prof.location ?? ""),
    line("About", prof.about ?? ""),
    line("Wants work as", (prof.job_types ?? []).join(", ")),
    line("Available for", (prof.availability ?? []).join(", ")),
    line("Driver's licence", prof.drivers_licence ?? ""),
    line("Education", (edu.data ?? []).map((e: any) => `${e.title}${e.school ? ` at ${e.school}` : ""}${e.end_year ? ` (${e.end_year})` : ""}`).join("; ")),
    line("Skills", (skills.data ?? []).map((s: any) => `${s.name} (${s.level}${s.verified ? ", verified by test" : ""})`).join("; ")),
    line("Experience", (exp.data ?? []).map((e: any) => `${e.title}${e.organisation ? ` at ${e.organisation}` : ""} (${e.kind})`).join("; ")),
    line("Languages", (langs.data ?? []).map((l: any) => `${l.name} (${l.level})`).join("; ")),
    line("Applied for", (apps.data ?? []).map((a: any) => jobLine(a.jobs)).filter(Boolean).join("; ")),
    line("Saved jobs", (saved.data ?? []).map((s: any) => jobLine(s.jobs)).filter(Boolean).join("; ")),
  ].filter(Boolean).join("\n");
}
