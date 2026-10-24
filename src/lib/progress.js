// What makes a profile "ready". Each item has a weight; they add up to 100.
export function profileChecklist(data) {
  const p = data.profile || {};
  const n = data.skills.length;
  return [
    { key: 'photo', label: 'Add a profile photo', done: Boolean(p.avatar_url), weight: 10, go: 'EditProfile' },
    { key: 'about', label: 'Write a headline and a short "about me"', done: Boolean(p.headline && p.about), weight: 10, go: 'EditProfile' },
    { key: 'contact', label: 'Add your phone number and area', done: Boolean(p.phone && p.location), weight: 10, go: 'EditProfile' },
    { key: 'education', label: 'Add your education', done: data.education.length > 0, weight: 15, go: 'EducationForm' },
    { key: 'skills', label: n >= 5 ? 'Add at least 5 skills' : `Add ${5 - n} more skill${5 - n === 1 ? '' : 's'} to get better job matches`, done: n >= 5, weight: 15, partial: Math.min(n, 5) / 5, go: 'Skills' },
    { key: 'verified', label: 'Pass a skills test to get a verified badge', done: data.skills.some((s) => s.verified), weight: 10, go: 'Assessments' },
    { key: 'experience', label: 'Add work experience (informal work counts)', done: data.experience.length > 0, weight: 10, go: 'ExperienceForm' },
    { key: 'languages', label: 'Add the languages you speak', done: data.languages.length > 0, weight: 10, go: 'Languages' },
    { key: 'prefs', label: 'Choose the work you are looking for', done: (p.job_types || []).length > 0 && (p.availability || []).length > 0, weight: 10, go: 'Preferences' },
  ];
}

export function profileProgress(data) {
  const items = profileChecklist(data);
  const pct = Math.round(items.reduce((sum, i) => sum + (i.done ? i.weight : i.partial ? i.weight * i.partial : 0), 0));
  const next = items.find((i) => !i.done);
  return { pct, items, hint: next ? `${next.label}.` : 'Your profile is complete. Nice work.' };
}
