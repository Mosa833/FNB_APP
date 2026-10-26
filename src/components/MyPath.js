import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import * as api from '../lib/api';
import { profileProgress } from '../lib/progress';
import { Progress, text } from '../ui';

// The journey from a skills test to an application, in the order that helps most
export function pathSteps(data, counts) {
  const skills = data.skills || [];
  const proved = skills.find((s) => s.verified && !(s.practical || s.endorsed));
  return [
    { key: 'profile', label: 'Finish your profile', why: 'Better matches need your skills, education and the work you want.', done: profileProgress(data).pct >= 70, go: 'Profile' },
    { key: 'test', label: 'Pass a skills test', why: 'Earn your first badge.', done: skills.some((s) => s.verified), go: 'Assessments' },
    { key: 'proof', label: 'Add stronger proof', why: 'A practical task or an endorsement shows you can do the work.', done: skills.some((s) => s.practical || s.endorsed), go: proved ? 'SkillBadges' : 'Assessments', params: proved ? { skillId: proved.id } : {} },
    { key: 'jobs', label: 'See jobs that fit you', why: 'Real jobs, with how well you fit each one.', done: counts.matches > 0, go: 'Jobs' },
    { key: 'guide', label: 'Get ready for one job', why: 'Open a job and tap "Get a guide to improve my chances".', done: counts.guides > 0, go: 'Jobs' },
    { key: 'cv', label: 'Build your CV', why: 'Made from your profile, with your badges.', done: Boolean(data.profile?.cv_built_at), go: 'CVBuilder' },
    { key: 'interview', label: 'Practise the interview', why: 'Answer real questions and get feedback.', done: counts.interviews > 0, go: 'InterviewSetup' },
    { key: 'apply', label: 'Apply', why: 'Apply on the employer\'s site from the job page.', done: counts.applications > 0, go: 'Jobs' },
  ];
}

export function MyPathCard() {
  const { data, navigate } = useApp();
  const [counts, setCounts] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { api.pathStatus().then(setCounts).catch(() => setCounts({ matches: 0, guides: 0, interviews: 0, applications: 0 })); }, [data]);
  if (!counts) return null;

  const steps = pathSteps(data, counts);
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const shown = open ? steps : next ? [next] : [];

  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={[text.h3, { flex: 1 }]}>Your path to a job</Text>
        <Text style={[text.small, { fontWeight: '700' }]}>{doneCount} of {steps.length} done</Text>
      </View>
      <Progress value={(doneCount / steps.length) * 100} color={colors.teal} track={colors.border} />
      {!next && <Text style={[text.body, { marginTop: 10 }]}>You've done every step. Keep applying and practising, and check Jobs for new matches.</Text>}
      {shown.map((s) => {
        const n = steps.indexOf(s) + 1;
        return (
          <Pressable key={s.key} style={[st.step, s === next && st.next]} onPress={() => navigate(s.go, s.params)} accessibilityRole="button">
            <View style={[st.dot, s.done && { backgroundColor: colors.teal, borderColor: colors.teal }]}>
              {s.done ? <Ionicons name="checkmark" size={14} color={colors.white} /> : <Text style={{ fontSize: 12, fontWeight: '800', color: colors.muted }}>{n}</Text>}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[text.body, { fontWeight: '700' }, s.done && { color: colors.muted }]}>{s === next ? `Next: ${s.label}` : s.label}</Text>
              {!s.done ? <Text style={text.small}>{s.why}</Text> : null}
            </View>
            {!s.done ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
          </Pressable>
        );
      })}
      <Pressable onPress={() => setOpen(!open)} hitSlop={8} style={{ marginTop: 8 }}>
        <Text style={text.link}>{open ? 'Show less' : 'Show all steps'}</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 10 },
  step: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.bg, marginTop: 6 },
  next: { backgroundColor: colors.tealLight, borderRadius: radius.sm, paddingHorizontal: 8, borderTopWidth: 0 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
});
