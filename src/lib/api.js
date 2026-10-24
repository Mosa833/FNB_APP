import { File as FSFile } from 'expo-file-system';
import { supabase } from './supabase';

// Turn Supabase errors into plain messages people can act on
export function friendlyError(err) {
  const msg = err?.message || String(err || '');
  if (/Invalid login credentials/i.test(msg)) return 'Your username, email or password is not right.';
  if (/Email not confirmed/i.test(msg)) return 'Please confirm your email first. Check your inbox for the link.';
  if (/User already registered/i.test(msg)) return 'An account with this email already exists. Try logging in.';
  if (/Network request failed|Failed to fetch/i.test(msg)) return 'No internet connection. Check your data or Wi-Fi and try again.';
  if (/rate limit/i.test(msg)) return 'Too many tries. Please wait a minute and try again.';
  if (/Token has expired|otp/i.test(msg)) return 'That code is wrong or has expired. Ask for a new one.';
  return msg || 'Something went wrong. Please try again.';
}

function check({ data, error }) {
  if (error) throw error;
  return data;
}

// Call an edge function and surface its error message
export async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try {
      const j = await error.context.json();
      if (j?.error) message = j.error;
    } catch {}
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

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
export async function fetchQuestions(testId) {
  return check(await supabase.from('test_questions_public').select('*').eq('test_id', testId).order('position'));
}
export async function submitTest(testId, answers) {
  return check(await supabase.rpc('submit_test', { p_test_id: testId, p_answers: answers }));
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
