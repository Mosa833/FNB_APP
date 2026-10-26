import { File as FSFile } from 'expo-file-system';
import { supabase } from './supabase';
import { makeInvoke } from './invoke';

// Turn Supabase errors into plain messages people can act on
export function friendlyError(err) {
  const msg = err?.message || String(err || '');
  // A failed skills test can be retried after a wait (see start_test in the database)
  const retry = msg.match(/RETRY_LATER:(.+)$/);
  if (retry) return `You can take this test again after ${retry[1].trim()}. Use the time to practise the questions you missed.`;
  if (/Invalid login credentials/i.test(msg)) return 'Your username, email or password is not right.';
  if (/Email not confirmed/i.test(msg)) return 'Please confirm your email first. Check your inbox for the link.';
  if (/User already registered/i.test(msg)) return 'An account with this email already exists. Try logging in.';
  if (/non-2xx status code/i.test(msg)) return 'Something went wrong on the server. Please try again.';
  if (/Network request failed|Failed to fetch/i.test(msg)) return 'No internet connection. Check your data or Wi-Fi and try again.';
  if (/rate limit/i.test(msg)) return 'Too many tries. Please wait a minute and try again.';
  if (/Token has expired|otp/i.test(msg)) return 'That PIN is wrong or has expired. Ask for a new one.';
  return msg || 'Something went wrong. Please try again.';
}

function check({ data, error }) {
  if (error) throw error;
  return data;
}

// Call an edge function and show the real reason when it fails (see invoke.js)
export const invoke = makeInvoke(supabase, { dev: typeof __DEV__ !== 'undefined' && __DEV__ });

export async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id || null;
}

// ---------- Profile bundle ----------
export async function fetchBundle(uid) {
  const [profile, education, skills, experience, languages] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).single(),
    supabase.from('education').select('*').order('created_at'),
    supabase.from('user_skills').select('*').order('created_at'),
    supabase.from('experience').select('*').order('created_at'),
    supabase.from('languages').select('*').order('created_at'),
  ]);
  return {
    profile: check(profile),
    education: check(education),
    skills: check(skills),
    experience: check(experience),
    languages: check(languages),
  };
}

export async function updateProfile(uid, fields) {
  return check(await supabase.from('profiles').update(fields).eq('id', uid).select().single());
}

const STRIP = ['id', 'user_id', 'created_at', 'verified', 'verified_score', 'local'];
const clean = (row) => Object.fromEntries(Object.entries(row).filter(([k, v]) => !STRIP.includes(k) && v !== undefined));

export async function saveRow(table, row) {
  if (row.id) return check(await supabase.from(table).update(clean(row)).eq('id', row.id).select().single());
  return check(await supabase.from(table).insert(clean(row)).select().single());
}

export async function deleteRow(table, id) {
  check(await supabase.from(table).delete().eq('id', id));
}

// ---------- Files ----------
export async function uploadFile(bucket, path, uri, contentType) {
  const buffer = await new FSFile(uri).arrayBuffer();
  check(await supabase.storage.from(bucket).upload(path, buffer, { contentType, upsert: true }));
  return path;
}

export async function signedUrl(bucket, path) {
  const data = check(await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60));
  return data.signedUrl;
}

export function publicUrl(bucket, path) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// ---------- Auth ----------
export async function usernameAvailable(username) {
  return check(await supabase.rpc('username_available', { p_username: username }));
}

export async function emailForLogin(identifier) {
  const id = identifier.trim();
  if (id.includes('@')) return id;
  const email = check(await supabase.rpc('email_for_username', { p_username: id }));
  if (!email) throw new Error('No account uses that username. Try your email instead.');
  return email;
}

// ---------- Lookups ----------
export async function searchSkills(q) {
  const term = q.trim().replace(/[%_]/g, '');
  if (!term) return [];
  const data = check(await supabase.from('skills_catalog').select('name, category').ilike('name', `%${term}%`).order('name').limit(20));
  // Names starting with what they typed come first
  const lower = term.toLowerCase();
  return data.sort((a, b) => (b.name.toLowerCase().startsWith(lower) ? 1 : 0) - (a.name.toLowerCase().startsWith(lower) ? 1 : 0)).slice(0, 8);
}

export async function searchPlaces(input, sessionToken) {
  const data = await invoke('places-autocomplete', { input, sessionToken });
  return data.suggestions || [];
}

// ---------- Tests ----------
export async function fetchTests() {
  return check(await supabase.from('tests').select('id, skill, name, minutes, extra, question_count'));
}
// Starts a test: up to 8 random questions from the pool (never the answers), and an attempt for logged-in users
export async function startTest(testId) {
  return check(await supabase.rpc('start_test', { p_test_id: testId }));
}
export async function submitAttempt(attemptId, questionIds, answers) {
  return check(await supabase.rpc('submit_attempt', { p_attempt_id: attemptId, p_question_ids: questionIds, p_answers: answers }));
}
export async function generateTest(skill) {
  return (await invoke('generate-test', { skill })).test_id;
}

// ---------- Jobs and mentors ----------
export async function fetchJobs() {
  return check(await supabase.from('jobs').select('*').eq('active', true));
}
export async function fetchSavedAndApplied() {
  const [saved, applied] = await Promise.all([
    supabase.from('saved_jobs').select('job_id'),
    supabase.from('applications').select('job_id, status'),
  ]);
  return { saved: check(saved).map((r) => r.job_id), applied: check(applied).map((r) => r.job_id) };
}
export async function setSaved(jobId, saved) {
  if (saved) check(await supabase.from('saved_jobs').insert({ job_id: jobId }));
  else check(await supabase.from('saved_jobs').delete().eq('job_id', jobId));
}
export async function applyToJob(jobId) {
  check(await supabase.from('applications').upsert({ job_id: jobId }, { onConflict: 'user_id,job_id', ignoreDuplicates: true }));
}
export async function fetchMentors() {
  return check(await supabase.from('mentors').select('*').eq('active', true).order('rating', { ascending: false }));
}
export async function fetchBookings() {
  return check(await supabase.from('mentor_bookings').select('mentor_id')).map((r) => r.mentor_id);
}
export async function bookMentor(mentorId) {
  check(await supabase.from('mentor_bookings').upsert({ mentor_id: mentorId }, { onConflict: 'user_id,mentor_id', ignoreDuplicates: true }));
}

// ---------- Interview practice ----------
export async function sessionsLeft() {
  return check(await supabase.rpc('interview_sessions_left'));
}
export async function pastSessions() {
  return check(
    await supabase.from('interview_sessions').select('id, job_type, question_type, overall_score, created_at')
      .eq('status', 'graded').order('created_at', { ascending: false }).limit(10)
  );
}
export async function startInterview(job_type, question_type, answer_seconds) {
  return invoke('interview-start', { job_type, question_type, answer_seconds });
}
export async function gradeInterview(session_id, answers) {
  return invoke('interview-grade', { session_id, answers });
}
export async function fetchSessionResult(sessionId) {
  const [s, a] = await Promise.all([
    supabase.from('interview_sessions').select('*').eq('id', sessionId).single(),
    supabase.from('interview_answers').select('*').eq('session_id', sessionId).order('position'),
  ]);
  return { session: check(s), answers: check(a) };
}

export async function deleteAccount() {
  return invoke('delete-account', {});
}

// ---------- Career coach and guides ----------
export async function coachHistory() {
  return check(await supabase.from('coach_messages').select('id, role, content, created_at').order('created_at').limit(100));
}
export async function askCoach(message) {
  return (await invoke('career-coach', { message })).reply;
}
export async function clearCoach() {
  const uid = await currentUserId();
  check(await supabase.from('coach_messages').delete().eq('user_id', uid));
}
export async function myGuides() {
  return check(await supabase.from('guides').select('*').order('created_at', { ascending: false }).limit(30));
}
export async function makeGuide({ topic, jobId }) {
  return (await invoke('career-guide', { topic, job_id: jobId })).guide;
}

// ---------- Live jobs and AI match scores ----------
// Searches Adzuna for this person, adds company board jobs and returns them with Gemini's match score
export async function myJobs({ refresh = false, query = '', where = '' } = {}) {
  return invoke('jobs-for-me', query ? { query, where } : { refresh });
}
// Already-scored jobs, fast, no AI call (used on Home)
export async function cachedMatches(limit = 3) {
  const rows = check(await supabase.from('job_matches').select('score, chance, summary, reasons, missing, jobs(*)').order('score', { ascending: false }).limit(20));
  return rows.filter((r) => r.jobs?.active).slice(0, limit).map((r) => ({ ...r.jobs, match: { score: r.score, chance: r.chance, summary: r.summary, reasons: r.reasons, missing: r.missing } }));
}
// Jobs for guests (no scores)
export async function latestJobs() {
  return check(await supabase.from('jobs').select('*').eq('active', true).order('posted_at', { ascending: false, nullsFirst: false }).limit(60));
}

// ---------- Skills test feedback (Groq) ----------
export async function testFeedback(attemptId) {
  return (await invoke('test-feedback', { attempt_id: attemptId })).feedback;
}
export async function jobsByIds(ids) {
  if (!ids.length) return [];
  return check(await supabase.from('jobs').select('*').in('id', ids));
}

// ---------- CV import ----------
// The CV must already be uploaded to the cv-uploads folder. Returns profile details for review; saves nothing.
export async function importCv(path) {
  return (await invoke('cv-import', { path })).profile;
}


// ---------- Badge levels: practical task and endorsements ----------
export async function practicalTask(skillId) {
  return invoke('practical-task', { skill_id: skillId });
}
export async function submitPractical(skillId, path, description) {
  return invoke('practical-task', { action: 'submit', skill_id: skillId, path, description });
}
export async function endorsementsFor(skillId) {
  return check(await supabase.from('endorsements').select('id, endorser_name, relationship, contact, status, token, created_at').eq('skill_id', skillId).order('created_at', { ascending: false }));
}
export async function requestEndorsement(skillId, { name, relationship, contact }) {
  return check(await supabase.from('endorsements').insert({ skill_id: skillId, endorser_name: name, relationship, contact }).select('id, endorser_name, relationship, contact, status, token, created_at').single());
}
export async function cancelEndorsement(id) {
  check(await supabase.from('endorsements').delete().eq('id', id));
}

// ---------- Job reports, fairness report, my data, my path ----------
export async function reportJob(jobId, reason) {
  const { error } = await supabase.from('job_reports').insert({ job_id: jobId, reason });
  if (error && !/duplicate|unique/i.test(error.message)) throw error; // already reported = fine
}
export async function latestBiasReport() {
  const rows = check(await supabase.from('bias_reports').select('created_at, passed, summary, details').order('created_at', { ascending: false }).limit(1));
  return rows[0] || null;
}
export async function exportMyData() {
  return invoke('export-data', {});
}
// What is done on the path from a skills test to an application
export async function pathStatus() {
  const count = async (q) => { const { count: c } = await q; return c || 0; };
  const [matches, guides, interviews, applications] = await Promise.all([
    count(supabase.from('job_matches').select('job_id', { count: 'exact', head: true })),
    count(supabase.from('guides').select('id', { count: 'exact', head: true }).not('job_id', 'is', null)),
    count(supabase.from('interview_sessions').select('id', { count: 'exact', head: true }).eq('status', 'graded')),
    count(supabase.from('applications').select('id', { count: 'exact', head: true })),
  ]);
  return { matches, guides, interviews, applications };
}
