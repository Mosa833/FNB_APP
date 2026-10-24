// Helpers for reading CVs (used by cv-import)
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";
import { HttpError } from "./common.ts";

export const QUALIFICATIONS = ["Matric (Grade 12)", "Grade 11 or lower", "N certificate (N1 to N6)", "Certificate", "Diploma", "Degree", "Short course", "Learnership", "Online course"];
export const EXPERIENCE_KINDS = ["Job", "Self-employed", "Informal work", "Volunteer", "Internship", "Learnership"];
export const LICENCES = ["None", "Learner's licence", "Code 8 (B)", "Code 10 (C1)", "Code 14 (EC)"];
const LANGUAGE_LEVELS = ["Basic", "Good", "Fluent"];
export const DOC_TYPES: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", heic: "image/heic", heif: "image/heif" };

// Text inside a Word file is in word/document.xml
export function docxToText(bytes: Uint8Array): string {
  const files = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  const xml = files["word/document.xml"];
  if (!xml) throw new HttpError(400, "This Word file could not be read. Save it as a PDF and try again.");
  return strFromU8(xml)
    .replace(/<w:tab\/>/g, "\t").replace(/<w:br[^>]*\/>/g, "\n").replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const pick = (v: unknown, list: string[], fallback: string | null) => {
  const s = str(v).toLowerCase();
  return list.find((x) => x.toLowerCase() === s) ?? fallback;
};
const year = (v: unknown) => {
  const m = String(v ?? "").match(/(19[5-9]\d|20[0-4]\d)/);
  return m ? m[1] : "";
};
const url = (v: unknown) => {
  const s = str(v, 300);
  if (!s || !/[a-z0-9-]+\.[a-z]{2,}/i.test(s)) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

// When the AI's qualification is not one of ours, work it out from the words used
function guessQualification(text: string): string {
  const t = text.toLowerCase();
  if (/matric|grade 12|nsc\b|senior certificate/.test(t)) return "Matric (Grade 12)";
  if (/grade (8|9|10|11)/.test(t)) return "Grade 11 or lower";
  if (/\bn[1-6]\b|n certificate|nated/.test(t)) return "N certificate (N1 to N6)";
  if (/learnership/.test(t)) return "Learnership";
  if (/degree|bachelor|b\.?sc|b\.?com|b\.?a\b|honours|master/.test(t)) return "Degree";
  if (/diploma/.test(t)) return "Diploma";
  if (/short course|workshop/.test(t)) return "Short course";
  if (/online|coursera|udemy|google certificate|alison/.test(t)) return "Online course";
  return "Certificate";
}

function skillLevel(v: unknown): string {
  const t = String(v ?? "").toLowerCase();
  if (/advanced|expert|excellent|proficient|strong|senior/.test(t)) return "Advanced";
  if (/intermediate|good|moderate|working knowledge|competent/.test(t)) return "Intermediate";
  return "Beginner";
}

// Keeps only values that fit the profile, so nothing odd ends up in the database
export function cleanProfile(raw: any) {
  const p = raw?.personal ?? {};
  const birth = Number(year(p.birth_year));
  const now = new Date().getFullYear();
  const personal = {
    full_name: str(p.full_name, 80),
    phone: str(p.phone, 20).replace(/[^\d+ ]/g, "").trim(),
    email: /^\S+@\S+\.\S+$/.test(str(p.email)) ? str(p.email, 120) : "",
    location: str(p.location, 120),
    headline: str(p.headline, 80),
    about: str(p.about, 500),
    linkedin_url: url(p.linkedin_url),
    portfolio_url: url(p.portfolio_url),
    drivers_licence: pick(p.drivers_licence, LICENCES, "") ?? "",
    birth_year: birth >= 1940 && birth <= now - 14 ? String(birth) : "",
  };

  const education = (raw?.education ?? []).map((e: any) => {
    // The title is what is written in the CV, so it decides first
    const fromTitle = guessQualification(str(e.title));
    const qualification = fromTitle !== "Certificate" ? fromTitle
      : pick(e.qualification, QUALIFICATIONS, null) ?? guessQualification(str(e.qualification));
    const field = str(e.field, 100);
    const ongoing = /present|current|now|still|studying/i.test(String(e.end_year ?? ""));
    return {
      qualification,
      title: str(e.title, 120) || (field ? `${qualification} in ${field}` : qualification),
      school: str(e.school, 120),
      field,
      start_year: year(e.start_year),
      end_year: ongoing ? "Still studying" : year(e.end_year),
    };
  }).filter((e: any) => e.title).slice(0, 10);

  const experience = (raw?.experience ?? []).map((x: any) => ({
    title: str(x.title, 100),
    organisation: str(x.organisation, 100),
    kind: pick(x.kind, EXPERIENCE_KINDS, "Job")!,
    start_text: str(x.start_text, 30),
    end_text: /present|current|now/i.test(String(x.end_text ?? "")) ? "now" : str(x.end_text, 30),
    description: str(x.description, 400),
  })).filter((x: any) => x.title).slice(0, 15);

  const seen = new Set<string>();
  const skills = (raw?.skills ?? []).map((s: any) => ({
    name: str(typeof s === "string" ? s : s?.name, 50),
    level: skillLevel(typeof s === "string" ? "" : s?.level),
  })).filter((s: any) => s.name && !seen.has(s.name.toLowerCase()) && seen.add(s.name.toLowerCase())).slice(0, 25);

  const seenLang = new Set<string>();
  const languages = (raw?.languages ?? []).map((l: any) => {
    const name = str(typeof l === "string" ? l : l?.name, 40);
    const level = /native|mother|home|first|fluent/i.test(String(l?.level ?? "")) ? "Fluent" : pick(l?.level, LANGUAGE_LEVELS, "Good")!;
    return { name, level };
  }).filter((l: any) => l.name && !seenLang.has(l.name.toLowerCase()) && seenLang.add(l.name.toLowerCase())).slice(0, 10);

  return { personal, education, experience, skills, languages };
}

