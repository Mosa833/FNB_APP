// Job match score from the user's profile.
// Verified skill = full points, unverified skill = 60%, missing = 0.
export function hasNeed(data, need) {
  if (need.toLowerCase() === 'matric') {
    return data.education.some((e) => /matric|grade 12/i.test(`${e.qualification} ${e.title}`)) ? { verified: true } : null;
  }
  return data.skills.find((s) => s.name.toLowerCase() === need.toLowerCase()) || null;
}

export function matchScore(job, data) {
  if (!job.needs?.length) return 50;
  const total = job.needs.reduce((sum, need) => {
    const s = hasNeed(data, need);
    return sum + (s ? (s.verified ? 1 : 0.6) : 0);
  }, 0);
  return Math.round((total / job.needs.length) * 100);
}

export function rankJobs(jobs, data) {
  return jobs.map((j) => ({ ...j, match: matchScore(j, data) })).sort((a, b) => b.match - a.match);
}
