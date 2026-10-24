// Reads an uploaded CV and returns profile details for the user to review. Nothing is saved to the profile here:
// the app shows what was found and the user chooses what to add.
// Word (.docx) and text files are read directly; PDFs and photos are read by Gemini; Groq turns the text into profile details.
import { serve, json, adminClient, requireUser, HttpError } from "../_shared/common.ts";
import { askGroq, parseJSON, readDocument } from "../_shared/ai.ts";
import { docxToText, cleanProfile, DOC_TYPES, QUALIFICATIONS, EXPERIENCE_KINDS, LICENCES } from "../_shared/cv.ts";

const MAX_BYTES = 8 * 1024 * 1024;

serve(async (req) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const { path } = await req.json().catch(() => ({}));
  if (typeof path !== "string" || !path.startsWith(`${user.id}/`)) throw new HttpError(400, "No CV was sent.");

  const { data: file, error } = await admin.storage.from("cv-uploads").download(path);
  if (error || !file) throw new HttpError(404, "Your CV upload could not be found. Please try again.");

  try {
    if (file.size > MAX_BYTES) throw new HttpError(400, "This file is too big. Please use a CV under 8 MB.");
    const ext = (path.split(".").pop() ?? "").toLowerCase();
    const bytes = new Uint8Array(await file.arrayBuffer());

    // 1. Get the text out of the file
    let text = "";
    if (ext === "docx") text = docxToText(bytes);
    else if (ext === "txt") text = new TextDecoder().decode(bytes);
    else if (DOC_TYPES[ext]) text = await readDocument(bytes, DOC_TYPES[ext]);
    else if (ext === "doc") throw new HttpError(400, "Old Word files (.doc) can't be read. Save your CV as a PDF or .docx and try again.");
    else throw new HttpError(400, "Please upload your CV as a PDF, a Word file (.docx) or a photo.");

    text = text.replace(/\u0000/g, "").trim();
    if (text.length < 80) throw new HttpError(400, "We couldn't read enough text in this file. Try a PDF, or a clearer photo taken in good light.");

    // 2. Groq turns the text into profile details
    const system = `You read CVs (resumes) for SkillBridge, a South African job app for young people.
Extract ONLY facts that are written in the CV. Never guess, never invent, never fill gaps. If something is not in the CV, leave it empty ("" or []).
Reply with JSON only.`;
    const prompt = `CV text:
"""
${text.slice(0, 15000)}
"""

Reply in exactly this JSON shape:
{"personal": {"full_name": "", "phone": "", "email": "", "location": "town or suburb, city", "headline": "short professional title from the CV, under 80 characters",
  "about": "the CV's own summary or profile section, shortened to under 500 characters, in first person", "linkedin_url": "", "portfolio_url": "",
  "drivers_licence": "one of ${JSON.stringify(LICENCES)} only if the CV mentions a licence, else empty", "birth_year": "only if a date of birth is written"},
 "education": [{"qualification": "one of ${JSON.stringify(QUALIFICATIONS)}", "title": "e.g. Diploma in Information Technology", "school": "", "field": "", "start_year": "", "end_year": "year, or 'present' if still studying"}],
 "experience": [{"title": "", "organisation": "", "kind": "one of ${JSON.stringify(EXPERIENCE_KINDS)}", "start_text": "e.g. Jan 2023", "end_text": "e.g. Mar 2024, or 'present'", "description": "1 or 2 sentences of what they did, from the CV"}],
 "skills": [{"name": "short skill name, e.g. Excel or Customer service", "level": "Beginner, Intermediate or Advanced only if the CV states a level, else empty"}],
 "languages": [{"name": "", "level": "Basic, Good, Fluent, or 'home language' if the CV says so"}]}
Rules: Matric or Grade 12 is "Matric (Grade 12)". Informal work, piece jobs or helping in a family business is "Informal work". Keep skills short, and do not list a language as a skill.`;

    const extracted = cleanProfile(parseJSON<any>(await askGroq(system, prompt, 3000)));
    const found = Object.values(extracted.personal).filter(Boolean).length + extracted.education.length + extracted.experience.length + extracted.skills.length + extracted.languages.length;
    if (!found) throw new HttpError(400, "We couldn't find profile details in this file. Is it your CV?");
    return json({ profile: extracted });
  } finally {
    // The CV file is not kept
    await admin.storage.from("cv-uploads").remove([path]).catch(() => {});
  }
});
