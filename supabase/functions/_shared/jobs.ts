// Fetches job posts from Adzuna, Greenhouse and SmartRecruiters and turns them into one shape for the jobs table.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type NormJob = {
  source: "adzuna" | "greenhouse" | "smartrecruiters" | "jsearch";
  external_id: string;
  title: string;
  company: string;
  area: string;
  full_area: string | null;
  url: string | null;
  description?: string | null; // undefined = keep what is stored
  posted_at: string | null;
  salary_min: number | null;
  salary_max: number | null;
  pay: string | null;
  lat: number | null;
  lng: number | null;
  job_type: string;
  level: string;
  remote: boolean;
  publisher?: string | null;    // the site the post came from, for JSearch
  apply_direct?: boolean | null; // true when the link goes straight to the employer
};

// Same job on several sites: compare title and company with spacing, case and punctuation removed
export function dedupeKey(title: string, company: string): string {
  const norm = (x: string) => x.toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(pty|ltd|limited|inc|group|holdings|sa|south africa)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
  return `${norm(title)}|${norm(company)}`;
}

const UA = { "User-Agent": "SkillBridge job matching (hackathon project)", Accept: "application/json" };

// ---------- Text helpers ----------
export function htmlToText(html: string | null | undefined, max = 4000): string | null {
  if (!html) return null;
  const decoded = html
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");
  const text = decoded
    .replace(/<\s*(br|\/p|\/li|\/h\d|\/div)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
  return text ? text.slice(0, max) : null;
}

// Adzuna salaries are yearly. Young people think in monthly pay, so show both ends per month.
export function monthlyPay(min: number | null, max: number | null, estimate: boolean): string | null {
  const m = (v: number) => `R${(Math.round(v / 12 / 100) * 100).toLocaleString("en-ZA").replace(/,/g, " ")}`;
  if (!min && !max) return null;
  const range = min && max && Math.abs(max - min) > 1200 ? `${m(min)} to ${m(max)}` : m((min || max)!);
  return `About ${range} a month${estimate ? " (estimate)" : ""}`;
}

const SA_PLACES = [
  "south africa", "johannesburg", "joburg", "cape town", "durban", "pretoria", "tshwane", "gauteng", "western cape",
  "kwazulu", "eastern cape", "gqeberha", "port elizabeth", "east london", "bloemfontein", "polokwane", "limpopo",
  "mpumalanga", "mbombela", "north west", "rustenburg", "northern cape", "kimberley", "free state", "sandton",
  "midrand", "centurion", "stellenbosch", "randburg", "soweto", "umhlanga", "pietermaritzburg", "rosebank",
];
export function inSouthAfrica(location: string): boolean {
  const l = location.toLowerCase();
  if (SA_PLACES.some((p) => l.includes(p))) return true;
  // Remote roles that are open to people in Africa or anywhere
  return /remote|anywhere/.test(l) && /africa|emea|worldwide|anywhere|global/.test(l);
}

// ---------- Adzuna (needs ADZUNA_APP_ID and ADZUNA_APP_KEY) ----------
export function adzunaConfigured(): boolean {
  return Boolean(Deno.env.get("ADZUNA_APP_ID") && Deno.env.get("ADZUNA_APP_KEY"));
}

export async function fetchAdzuna(what: string, where: string, distanceKm: number): Promise<NormJob[]> {
  const params = new URLSearchParams({
    app_id: Deno.env.get("ADZUNA_APP_ID")!,
    app_key: Deno.env.get("ADZUNA_APP_KEY")!,
    results_per_page: "20",
    what,
    max_days_old: "30",
    sort_by: "relevance",
  });
  if (where) { params.set("where", where); params.set("distance", String(Math.min(100, Math.max(5, distanceKm)))); }
  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/za/search/1?${params}`, { headers: UA });
  if (!res.ok) {
    console.error("Adzuna error", res.status, (await res.text()).slice(0, 300));
    return [];
  }
  const data = await res.json();
  return (data.results ?? []).map((r: any): NormJob => {
    const loc = r.location?.display_name ?? "South Africa";
    const estimate = String(r.salary_is_predicted) === "1";
    return {
      source: "adzuna",
      external_id: String(r.id),
      title: String(r.title ?? "").replace(/<[^>]+>/g, "").slice(0, 200),
      company: r.company?.display_name ?? "Company not named",
      area: loc.split(",")[0].trim() || "South Africa",
      full_area: loc,
      url: r.redirect_url ?? null, // Adzuna's terms: send people through redirect_url
      description: htmlToText(r.description, 1500),
      posted_at: r.created ?? null,
      salary_min: r.salary_min ?? null,
      salary_max: r.salary_max ?? null,
      pay: monthlyPay(r.salary_min ?? null, r.salary_max ?? null, estimate),
      lat: typeof r.latitude === "number" ? r.latitude : null,
      lng: typeof r.longitude === "number" ? r.longitude : null,
      job_type: r.contract_time === "part_time" ? "Part-time" : r.contract_type === "contract" ? "Contract" : "Full-time",
      level: "Not stated",
      remote: /remote/i.test(`${r.title} ${loc}`),
      publisher: "Adzuna",
      apply_direct: false,
    };
  }).filter((j: NormJob) => j.title && j.url);
}

// ---------- JSearch by OpenWeb Ninja (Google for Jobs). Needs JSEARCH_API_KEY ----------
export function jsearchConfigured(): boolean {
  return Boolean(Deno.env.get("JSEARCH_API_KEY"));
}

const PER_MONTH: Record<string, number> = { YEAR: 1 / 12, MONTH: 1, WEEK: 52 / 12, DAY: 21.7, HOUR: 173 };

export async function fetchJSearch(what: string, where: string, distanceKm: number): Promise<NormJob[]> {
  const params = new URLSearchParams({
    query: where ? `${what} jobs in ${where}` : `${what} jobs in South Africa`,
    country: "za",
    date_posted: "month",
    num_pages: "1", // 10 jobs, 1 request credit
  });
  if (where) params.set("radius", String(Math.min(100, Math.max(5, distanceKm))));
  const exclude = Deno.env.get("JSEARCH_EXCLUDE_PUBLISHERS") ?? "BeBee";
  if (exclude) params.set("exclude_job_publishers", exclude);

  const res = await fetch(`https://api.openwebninja.com/jsearch/search-v2?${params}`, {
    headers: { ...UA, "x-api-key": Deno.env.get("JSEARCH_API_KEY")! },
  });
  if (!res.ok) {
    console.error("JSearch error", res.status, (await res.text()).slice(0, 300));
    return [];
  }
  const body = await res.json();
  // search-v2 returns the jobs with a pagination cursor; older responses return a plain list
  const list: any[] = Array.isArray(body.data) ? body.data : body.data?.jobs ?? body.data?.data ?? [];

  return list.map((r): NormJob | null => {
    const country = String(r.job_country ?? "").toUpperCase();
    if (country && country !== "ZA" && !r.job_is_remote) return null; // only South African jobs, or remote ones
    const options: any[] = r.apply_options ?? [];
    const directOption = r.job_apply_is_direct ? null : options.find((o) => o?.is_direct);
    const direct = r.job_apply_is_direct ? r.job_apply_link : directOption?.apply_link;
    const url = direct ?? r.job_apply_link ?? options[0]?.apply_link ?? null;
    // Name the site the link actually opens
    const publisher = directOption ? (directOption.publisher || "Company careers site") : (r.job_publisher ?? null);
    const place = [r.job_city, r.job_state].filter(Boolean).join(", ") || r.job_location || (r.job_is_remote ? "Remote" : "South Africa");
    // Pay only when the employer stated it, in rand, shown per month
    let pay: string | null = null, min: number | null = null, max: number | null = null;
    const factor = PER_MONTH[String(r.job_salary_period ?? "").toUpperCase()];
    if (country === "ZA" && factor && (r.job_min_salary || r.job_max_salary)) {
      min = r.job_min_salary ?? null; max = r.job_max_salary ?? null;
      pay = monthlyPay(min ? min * factor * 12 : null, max ? max * factor * 12 : null, false);
    }
    const type = String(r.job_employment_type ?? (r.job_employment_types ?? [])[0] ?? "").toUpperCase();
    return {
      source: "jsearch",
      external_id: String(r.job_id ?? r.job_uid ?? ""),
      title: String(r.job_title ?? "").slice(0, 200),
      company: r.employer_name ?? "Company not named",
      area: (r.job_city || place.split(",")[0] || "South Africa").trim(),
      full_area: place,
      url,
      description: htmlToText(r.job_description, 4000),
      posted_at: r.job_posted_at_datetime_utc ?? null,
      salary_min: min, salary_max: max, pay,
      lat: typeof r.job_latitude === "number" ? r.job_latitude : null,
      lng: typeof r.job_longitude === "number" ? r.job_longitude : null,
      job_type: /PART/.test(type) ? "Part-time" : /INTERN/.test(type) ? "Internship" : /CONTRACT/.test(type) ? "Contract" : "Full-time",
      level: "Not stated",
      remote: Boolean(r.job_is_remote),
      publisher,
      apply_direct: Boolean(direct),
    };
  }).filter((j): j is NormJob => Boolean(j && j.external_id && j.title && j.url));
}

// ---------- Greenhouse (public, no key) ----------
export async function fetchGreenhouse(token: string, companyName: string | null): Promise<NormJob[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`, { headers: UA });
  if (!res.ok) throw new Error(`Greenhouse board "${token}" returned ${res.status}`);
  const data = await res.json();
  return (data.jobs ?? [])
    .filter((j: any) => inSouthAfrica(`${j.location?.name ?? ""} ${(j.offices ?? []).map((o: any) => o.name).join(" ")}`))
    .map((j: any): NormJob => {
      const loc = j.location?.name ?? "South Africa";
      return {
        source: "greenhouse",
        external_id: `${token}:${j.id}`,
        title: String(j.title ?? "").slice(0, 200),
        company: j.company_name ?? companyName ?? token,
        area: loc.split(",")[0].trim() || "South Africa",
        full_area: loc,
        url: j.absolute_url ?? null,
        description: htmlToText(j.content),
        posted_at: j.first_published ?? j.updated_at ?? null,
        salary_min: null, salary_max: null, pay: null, lat: null, lng: null,
        job_type: "Full-time",
        level: "Not stated",
        remote: /remote/i.test(loc),
        publisher: "Company careers site",
        apply_direct: true,
      };
    });
}

// ---------- SmartRecruiters (public, no key) ----------
export async function fetchSmartRecruiters(token: string, companyName: string | null, knownIds: Set<string>): Promise<NormJob[]> {
  const items: any[] = [];
  for (let offset = 0; offset < 300; offset += 100) {
    const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings?country=za&limit=100&offset=${offset}`, { headers: UA });
    if (!res.ok) throw new Error(`SmartRecruiters company "${token}" returned ${res.status}`);
    const data = await res.json();
    items.push(...(data.content ?? []));
    if (items.length >= (data.totalFound ?? 0) || (data.content ?? []).length === 0) break;
  }

  // The list has no description, so fetch details only for posts we have not stored yet (max 40 per run)
  let detailsLeft = 40;
  const out: NormJob[] = [];
  for (const p of items) {
    const externalId = `${token}:${p.id}`;
    let description: string | null | undefined = null;
    let url: string | null = `https://jobs.smartrecruiters.com/${encodeURIComponent(token)}/${p.id}`;
    if (!knownIds.has(externalId) && detailsLeft > 0) {
      detailsLeft--;
      try {
        const d = await fetch(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings/${p.id}`, { headers: UA });
        if (d.ok) {
          const det = await d.json();
          const s = det.jobAd?.sections ?? {};
          description = htmlToText([s.jobDescription?.text, s.qualifications?.text, s.additionalInformation?.text].filter(Boolean).join("<br/>"));
          url = det.postingUrl ?? det.applyUrl ?? url;
        }
      } catch { /* keep the post without a description */ }
    } else if (knownIds.has(externalId)) {
      description = undefined; // keeps the stored description
    }
    const loc = [p.location?.city, p.location?.region, "South Africa"].filter(Boolean).join(", ");
    out.push({
      source: "smartrecruiters",
      external_id: externalId,
      title: String(p.name ?? "").slice(0, 200),
      company: p.company?.name ?? companyName ?? token,
      area: p.location?.city ?? "South Africa",
      full_area: loc,
      url,
      description,
      posted_at: p.releasedDate ?? null,
      salary_min: null, salary_max: null, pay: null, lat: null, lng: null,
      job_type: p.typeOfEmployment?.label ?? "Full-time",
      level: p.experienceLevel?.label ?? "Not stated",
      remote: Boolean(p.location?.remote),
      publisher: "Company careers site",
      apply_direct: true,
    });
  }
  return out;
}

// ---------- Save ----------
export async function saveJobs(admin: SupabaseClient, jobs: NormJob[]): Promise<{ id: string; external_id: string }[]> {
  if (!jobs.length) return [];
  const now = new Date().toISOString();
  const rows = jobs.map((j) => {
    const row: Record<string, unknown> = {
      source: j.source, external_id: j.external_id, title: j.title, company: j.company, area: j.area,
      full_area: j.full_area, url: j.url, posted_at: j.posted_at, salary_min: j.salary_min, salary_max: j.salary_max,
      pay: j.pay, lat: j.lat, lng: j.lng, job_type: j.job_type, level: j.level, remote: j.remote,
      publisher: j.publisher ?? null, apply_direct: j.apply_direct ?? null, dedupe_key: dedupeKey(j.title, j.company),
      active: true, last_seen_at: now,
    };
    if (j.description !== undefined) row.description = j.description;
    return row;
  });
  // Rows with and without a description are saved separately, so a missing description never wipes a stored one
  const groups = [rows.filter((r) => "description" in r), rows.filter((r) => !("description" in r))];
  const saved: { id: string; external_id: string }[] = [];
  for (const group of groups) {
    for (let i = 0; i < group.length; i += 200) {
      const { data, error } = await admin.from("jobs").upsert(group.slice(i, i + 200), { onConflict: "source,external_id" }).select("id, external_id");
      if (error) throw error;
      saved.push(...(data ?? []));
    }
  }
  return saved;
}
