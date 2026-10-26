import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, TextInput, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import * as api from '../lib/api';
import { Screen, BackHeader, Button, Card, Chip, Note, ErrorNote, Loading, text } from '../ui';

const FILTERS = ['All', 'Near me', 'Part-time', 'Internships', 'Remote', 'Saved'];
const SOURCE = { adzuna: 'via Adzuna', greenhouse: 'Company careers site', smartrecruiters: 'Company careers site', demo: 'Sample job' };
// Where the job post comes from. JSearch jobs name the site the link opens.
export const sourceLabel = (j) => (j.source === 'jsearch' ? (j.publisher ? `via ${j.publisher}` : 'via Google for Jobs') : SOURCE[j.source]);

export function postedAgo(iso) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${Math.floor(days / 30)} month${days >= 60 ? 's' : ''} ago`;
}

// How well a profile fits a job. Worded as fit, never as a chance of being hired.
export const FIT = { High: 'Strong fit', Medium: 'Fair fit', Low: 'Weak fit' };
export function ChanceChip({ match, small }) {
  if (!match) return null;
  const tone = match.chance === 'High' ? 'verified' : match.chance === 'Medium' ? 'amber' : 'red';
  return <Chip small={small} label={`${FIT[match.chance] || match.chance} · ${match.score}%`} tone={tone} />;
}

const nearMe = (j, location) => {
  const words = String(location || '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && w !== 'south' && w !== 'africa');
  return words.some((w) => `${j.area} ${j.full_area || ''}`.toLowerCase().includes(w));
};

// 13. Opportunities: live jobs, ranked by how well the user fits them
export function Jobs() {
  const { navigate, data, isGuest } = useApp();
  const [res, setRes] = useState(null);
  const [saved, setSaved] = useState([]);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [what, setWhat] = useState('');
  const [where, setWhere] = useState('');
  const [active, setActive] = useState(null); // the search being shown, or null for the usual list

  const load = async (refresh = false, q = null) => {
    try {
      setError(''); setBusy(true);
      if (isGuest) {
        const jobs = await api.latestJobs();
        const real = jobs.filter((j) => j.source !== 'demo');
        let list = real.length >= 5 ? real : jobs;
        if (q) {
          // Guests search the jobs we already have
          const terms = q.query.toLowerCase().split(/\s+/).filter(Boolean);
          const place = q.where.toLowerCase();
          list = list.filter((j) => {
            const hay = `${j.title} ${j.company} ${j.description || ''}`.toLowerCase();
            return terms.every((t) => hay.includes(t)) && (!place || `${j.area} ${j.full_area || ''}`.toLowerCase().includes(place) || j.remote);
          });
        }
        setRes({ jobs: list, search: q ? { ...q, live: false } : null });
      } else {
        const [r, s] = await Promise.all([api.myJobs(q ? { query: q.query, where: q.where } : { refresh }), api.fetchSavedAndApplied()]);
        setRes(r);
        setSaved(s.saved);
      }
    } catch (e) {
      setRes((r) => r || { jobs: [] });
      setError(api.friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { load(); }, []);

  const runSearch = () => {
    const query = what.trim();
    if (!query) return;
    Keyboard.dismiss();
    const q = { query, where: where.trim() };
    setActive(q);
    setFilter('All');
    load(false, q);
  };
  const clearSearch = () => { setWhat(''); setWhere(''); setActive(null); load(); };

  const jobs = (res?.jobs || []).filter((j) => {
    if (filter === 'All') return true;
    if (filter === 'Saved') return saved.includes(j.id);
    if (filter === 'Near me') return nearMe(j, data.profile.location);
    if (filter === 'Part-time') return /part/i.test(j.job_type);
    if (filter === 'Internships') return /intern|learnership|graduate|trainee/i.test(`${j.title} ${j.job_type}`);
    if (filter === 'Remote') return j.remote;
    return true;
  });
  const hasAdzuna = (res?.jobs || []).some((j) => j.source === 'adzuna');

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[text.h1, { flex: 1 }]}>Opportunities</Text>
        {!isGuest && !active && (
          <Pressable onPress={() => load(true)} disabled={busy} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', opacity: busy ? 0.4 : 1 }} accessibilityLabel="Find new jobs">
            <Ionicons name="refresh" size={18} color={colors.teal} />
            <Text style={[text.link, { marginLeft: 4 }]}>Refresh</Text>
          </Pressable>
        )}
      </View>
      <Text style={[text.muted, { marginBottom: 12 }]}>
        {isGuest ? 'Latest jobs in South Africa.' : 'Real jobs picked for your profile, best fit first.'}
      </Text>

      <View style={st.searchBox}>
        <View style={st.searchRow}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={st.searchInput}
            value={what}
            onChangeText={setWhat}
            placeholder="Search jobs, e.g. cashier or data capturer"
            placeholderTextColor="#9AA6A4"
            returnKeyType="search"
            onSubmitEditing={runSearch}
            maxLength={60}
            accessibilityLabel="What job are you looking for"
          />
          {what ? <Pressable onPress={() => setWhat('')} hitSlop={10} accessibilityLabel="Clear search words"><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
        </View>
        <View style={[st.searchRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <Ionicons name="location-outline" size={18} color={colors.muted} />
          <TextInput
            style={st.searchInput}
            value={where}
            onChangeText={setWhere}
            placeholder={isGuest ? 'Where? (optional)' : 'Where? Leave empty for near you'}
            placeholderTextColor="#9AA6A4"
            returnKeyType="search"
            onSubmitEditing={runSearch}
            maxLength={60}
            accessibilityLabel="Where"
          />
        </View>
      </View>
      <Button title={busy && active ? 'Searching...' : 'Search'} onPress={runSearch} disabled={!what.trim() || busy} style={{ minHeight: 44, marginBottom: 10 }} />

      {active ? (
        <View style={st.resultsBar}>
          <Text style={[text.body, { flex: 1 }]}>
            Results for <Text style={{ fontWeight: '800' }}>"{active.query}"</Text>{(res?.search?.where || active.where) ? ` in ${res?.search?.where || active.where}` : ''}
          </Text>
          <Pressable onPress={clearSearch} hitSlop={10}><Text style={text.link}>Clear</Text></Pressable>
        </View>
      ) : null}
      {active && res?.search?.too_soon ? <Note>You searched a moment ago, so these are jobs we already have. Search again in a few seconds for new ones.</Note> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {FILTERS.filter((f) => !(isGuest && (f === 'Saved' || f === 'Near me'))).map((f) => <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />)}
      </ScrollView>

      {isGuest && <Note tone="amber">Create a free account to see how well you fit each job, save jobs and apply.</Note>}
      {!isGuest && res?.demo && res?.live_search === false && <Note tone="amber">Live job search isn't switched on yet, so these are sample jobs.</Note>}
      {!isGuest && res?.demo && res?.live_search && <Note tone="amber">We found only a few live jobs for your profile, so some sample jobs are shown too. Add more skills or job types to find more.</Note>}
      {!isGuest && res?.ai_error && <Note tone="amber">We couldn't work out how well you fit right now, so these jobs are shown without it. Tap Refresh to try again.</Note>}
      {!isGuest && res?.pending > 0 && !res?.ai_error && <Note>We're still checking {res.pending} more job{res.pending === 1 ? '' : 's'} against your profile. Tap Refresh in a minute to see them.</Note>}
      <ErrorNote message={error} onRetry={() => load()} />

      {res === null || (busy && (!res.jobs?.length || (active ? res.search?.query !== active.query : Boolean(res.search)))) ? (
        <Loading label={active ? `Searching live jobs for "${active.query}"...` : isGuest ? 'Loading jobs...' : 'Finding jobs that fit your profile...'} />
      ) : jobs.map((j) => (
        <Card key={j.id} onPress={() => navigate('JobDetail', { job: j })}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={[text.h3, { flex: 1, marginRight: 8 }]}>{j.title}</Text>
            {saved.includes(j.id) && <Ionicons name="heart" size={16} color={colors.amber} style={{ marginRight: 6, marginTop: 2 }} />}
          </View>
          <Text style={text.small}>{j.company} · {j.area}{j.remote ? ' · Remote' : ''}</Text>
          {j.match ? <View style={{ marginTop: 8 }}><ChanceChip match={j.match} small /></View> : null}
          {j.match?.summary ? <Text style={[text.body, { marginTop: 6, fontSize: 14 }]}>{j.match.summary}</Text> : null}
          <Text style={[text.small, { marginTop: 6 }]}>{[j.pay, j.job_type !== 'Full-time' ? j.job_type : null, postedAgo(j.posted_at), sourceLabel(j)].filter(Boolean).join(' · ')}</Text>
        </Card>
      ))}
      {res !== null && !busy && jobs.length === 0 && !error && (
        <Card>
          <Text style={text.h3}>{filter === 'Saved' ? 'No saved jobs yet' : active ? `No jobs found for "${active.query}"` : 'No matching jobs right now'}</Text>
          <Text style={[text.muted, { marginTop: 4 }]}>
            {filter === 'Saved' ? 'Tap the heart on a job to save it.'
              : active ? 'Try a shorter or different word, for example "admin" instead of "admin clerk", or another place.'
              : 'Add more skills and the work you are looking for to your profile, then tap Refresh.'}
          </Text>
          {filter !== 'Saved' && !isGuest && !active ? <Button title="Update my profile" variant="outline" onPress={() => navigate('Profile')} style={{ marginTop: 10 }} /> : null}
          {active ? <Button title="Back to my jobs" variant="outline" onPress={clearSearch} style={{ marginTop: 10 }} /> : null}
        </Card>
      )}
      {hasAdzuna ? <Text style={[text.small, { textAlign: 'center', marginTop: 10 }]}>Jobs by Adzuna</Text> : null}
      {!isGuest && res?.jobs?.length ? (
        <Pressable onPress={() => navigate('HowScores')} hitSlop={6}>
          <Text style={[text.small, { textAlign: 'center', marginTop: 4 }]}>Fit is an AI estimate from your profile and the job post, not a promise of a job. <Text style={text.link}>How match scores work</Text></Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

// 14. Job details
export function JobDetail() {
  const { current, isGuest, navigate } = useApp();
  const j = current.params.job;
  const m = j.match;
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [reported, setReported] = useState(false);

  const report = () => {
    if (isGuest) return navigate('Locked', { feature: 'Reporting jobs' });
    const send = async (reason) => {
      try { await api.reportJob(j.id, reason); setReported(true); Alert.alert('Thank you', 'We hide this job for you, and check it. Jobs reported by several people are removed for everyone.'); }
      catch (e) { Alert.alert('Could not send the report', api.friendlyError(e)); }
    };
    Alert.alert('Report this job', 'What is wrong with it?', [
      { text: 'The job is closed', onPress: () => send('closed') },
      { text: 'The link does not work', onPress: () => send('broken_link') },
      { text: 'It looks like a scam', onPress: () => send('scam') },
      { text: 'The details are wrong', onPress: () => send('wrong_details') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  useEffect(() => {
    if (isGuest) return;
    api.fetchSavedAndApplied().then((r) => { setSaved(r.saved.includes(j.id)); setApplied(r.applied.includes(j.id)); }).catch(() => {});
  }, []);

  const onSave = async () => {
    if (isGuest) return navigate('Locked', { feature: 'Saving jobs' });
    const next = !saved;
    setSaved(next);
    try { await api.setSaved(j.id, next); } catch (e) { setSaved(!next); Alert.alert('Could not save', api.friendlyError(e)); }
  };

  const onApply = async () => {
    if (isGuest) return navigate('Locked', { feature: 'Applying for jobs' });
    try {
      setBusy(true);
      if (j.url) {
        // Live jobs are applied for on the employer's site
        await WebBrowser.openBrowserAsync(j.url);
        if (!applied) {
          await api.applyToJob(j.id);
          setApplied(true);
        }
      } else {
        await api.applyToJob(j.id);
        setApplied(true);
        Alert.alert('Application sent', `Your profile was sent to ${j.company}.`);
      }
    } catch (e) {
      Alert.alert('Could not open the job', api.friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const desc = j.description || '';
  const longDesc = desc.length > 700;

  return (
    <Screen
      footer={
        <View style={st.footer}>
          <Button
            title={j.url ? (applied ? 'Open the job post again' : j.apply_direct ? 'Apply on the company site' : 'Apply on the job site') : applied ? 'Applied ✓' : 'Apply with my profile'}
            onPress={onApply}
            disabled={!j.url && applied}
            loading={busy}
          />
          {j.url && applied ? <Text style={[text.small, { textAlign: 'center' }]}>Saved to your applications</Text> : null}
        </View>
      }
    >
      <BackHeader
        right={
          <Pressable onPress={onSave} style={{ flexDirection: 'row', alignItems: 'center' }} hitSlop={10}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? colors.amber : colors.teal} />
            <Text style={[text.link, { marginLeft: 4 }]}>{saved ? 'Saved' : 'Save'}</Text>
          </Pressable>
        }
      />
      <Text style={text.h1}>{j.title}</Text>
      <Text style={text.muted}>{j.company} · {j.full_area || j.area}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
        {[j.pay, j.job_type, j.level !== 'Not stated' ? j.level : null, j.remote ? 'Remote' : null].filter(Boolean).map((t) => <Chip key={t} label={t} />)}
      </View>
      <Text style={text.small}>{[postedAgo(j.posted_at), sourceLabel(j)].filter(Boolean).join(' · ')}</Text>

      {m ? (
        <Card style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={[st.ring, { borderColor: m.chance === 'High' ? colors.teal : m.chance === 'Medium' ? colors.amber : colors.red }]}>
              <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text }}>{m.score}%</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={text.h3}>{FIT[m.chance] || m.chance}</Text>
              {m.summary ? <Text style={text.muted}>{m.summary}</Text> : null}
            </View>
          </View>
          {(m.reasons || []).map((r) => (
            <View key={r} style={st.row}><Ionicons name="checkmark" size={18} color={colors.teal} /><Text style={[text.body, { marginLeft: 8, flex: 1 }]}>{r}</Text></View>
          ))}
          {(m.missing || []).map((r) => (
            <View key={r} style={st.row}><Ionicons name="close" size={18} color={colors.red} /><Text style={[text.body, { marginLeft: 8, flex: 1 }]}>{r}</Text></View>
          ))}
          {!isGuest ? (
            <Pressable onPress={() => navigate('Guide', { jobId: j.id, jobTitle: j.title })} hitSlop={6}>
              <Text style={[text.link, { marginTop: 8 }]}>Get a guide to improve my chances</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => navigate('HowScores')} hitSlop={6}>
            <Text style={[text.small, { marginTop: 8 }]}>This is an estimate, not a promise. <Text style={text.link}>How match scores work</Text></Text>
          </Pressable>
        </Card>
      ) : isGuest ? (
        <Note tone="amber" style={{ marginTop: 14 }}>Create a free account to see how well you fit this job.</Note>
      ) : null}

      {desc ? (
        <Card>
          <Text style={text.h3}>About the job</Text>
          <Text style={[text.body, { marginTop: 6 }]}>{showAll || !longDesc ? desc : `${desc.slice(0, 700)}...`}</Text>
          {longDesc ? <Pressable onPress={() => setShowAll(!showAll)} hitSlop={6}><Text style={[text.link, { marginTop: 6 }]}>{showAll ? 'Show less' : 'Read more'}</Text></Pressable> : null}
          {j.source === 'adzuna' ? <Text style={[text.small, { marginTop: 8 }]}>This is a short version. The full post is on the employer's site.</Text> : null}
        </Card>
      ) : null}

      {j.gap_course ? (
        <Pressable onPress={() => navigate('Course', { topic: j.gap_course })} hitSlop={6}>
          <Text style={[text.link, { marginTop: 6 }]}>Close the gap: free 1 hour course</Text>
        </Pressable>
      ) : null}
      {j.source === 'adzuna' ? <Text style={[text.small, { marginTop: 10 }]}>Jobs by Adzuna</Text> : null}
      <Pressable onPress={report} disabled={reported} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }} accessibilityLabel="Report this job">
        <Ionicons name="flag-outline" size={16} color={reported ? colors.muted : colors.red} />
        <Text style={[text.small, { marginLeft: 6, color: reported ? colors.muted : colors.red, fontWeight: '700' }]}>{reported ? 'Reported. Thank you.' : 'Report this job'}</Text>
      </Pressable>
    </Screen>
  );
}

// Short course placeholder used by "close the gap" links on sample jobs
// How match scores work, in plain words, with the latest fairness test
export function HowScores() {
  const [report, setReport] = useState(undefined);
  useEffect(() => { api.latestBiasReport().then(setReport).catch(() => setReport(null)); }, []);
  const rows = [
    ['What we look at', 'Your skills and how you proved them, education, experience (informal work counts), languages the job needs, your licence, and how far the job is from you.'],
    ['What we never use', 'Your name, photo, age, gender, race, religion, home language or the area you grew up in. Where you live only counts as travel distance.'],
    ['Proof counts', 'A skill confirmed by someone who saw your work counts most, then a practical task, then a passed test, then a skill you only listed.'],
    ['What the score means', 'How well your profile fits what the job asks for. It is an estimate by AI (Google Gemini), not a promise of an interview or a job.'],
    ['Why a score is low', 'Usually a hard requirement you do not meet yet, like a qualification or years of experience. Each job shows what is missing and how to close the gap.'],
  ];
  return (
    <Screen>
      <BackHeader title="How match scores work" />
      <Text style={text.h1}>How match scores work</Text>
      {rows.map(([t, b]) => (
        <Card key={t}>
          <Text style={text.h3}>{t}</Text>
          <Text style={[text.body, { marginTop: 4 }]}>{b}</Text>
        </Card>
      ))}
      <Text style={[text.h3, { marginTop: 10, marginBottom: 6 }]}>Fairness test</Text>
      {report === undefined ? <Loading /> : report === null ? (
        <Note tone="amber">No fairness test has been run yet.</Note>
      ) : (
        <Card style={{ borderColor: report.passed ? colors.teal : colors.amber }}>
          <Text style={[text.h3, { color: report.passed ? colors.teal : '#9A5B00' }]}>{report.passed ? 'Passed' : 'Needs work'}</Text>
          <Text style={[text.body, { marginTop: 4 }]}>{report.summary}</Text>
          <Text style={[text.small, { marginTop: 8 }]}>
            How it works: we score the same practice profile against the same real jobs, changing only details that must not matter (gender, name, background), and check the scores stay the same. Last run {new Date(report.created_at).toLocaleDateString('en-ZA')}.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

export function Course() {
  const { current } = useApp();
  const topic = current.params.topic;
  return (
    <Screen>
      <BackHeader title="Free short course" />
      <Text style={text.h1}>{topic}</Text>
      <Text style={[text.muted, { marginBottom: 14 }]}>About 1 hour · works on low data</Text>
      {['What it is and why employers want it', 'Simple examples from real jobs', 'Practice task', 'Quick check'].map((l, i) => (
        <Card key={l} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={st.lessonNo}><Text style={{ color: colors.teal, fontWeight: '800' }}>{i + 1}</Text></View>
          <Text style={[text.body, { flex: 1 }]}>{l}</Text>
        </Card>
      ))}
      <Note>Course content will come from a learning partner. This screen shows where it will live.</Note>
    </Screen>
  );
}

const st = StyleSheet.create({
  footer: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  lessonNo: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  ring: { width: 72, height: 72, borderRadius: 36, borderWidth: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  searchBox: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 46 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: colors.text, paddingVertical: 10 },
  resultsBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.tealLight, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
});
