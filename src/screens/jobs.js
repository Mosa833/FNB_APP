import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import { JOBS } from '../data';
import { Screen, BackHeader, Button, Card, Chip, Note, text } from '../ui';

const FILTERS = ['All', 'Near me', 'Part-time', 'Internships'];

function hasSkill(profile, need) {
  if (need === 'Matric') return profile.education.some((e) => e.title.toLowerCase().includes('matric'));
  return profile.skills.find((s) => s.name.toLowerCase() === need.toLowerCase());
}

// 13. Opportunity mapping
export function Jobs() {
  const { navigate, profile, savedJobs, isGuest } = useApp();
  const [filter, setFilter] = useState('All');
  const list = JOBS.filter((j) => filter === 'All' || j.filters.includes(filter)).sort((a, b) => b.match - a.match);
  return (
    <Screen>
      <Text style={text.h1}>Opportunities</Text>
      <Text style={[text.muted, { marginBottom: 12 }]}>Matched to your skills and location.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {FILTERS.map((f) => <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />)}
      </ScrollView>
      {isGuest && <Note tone="amber">Guests can view jobs. Create an account to save and apply.</Note>}
      {list.map((j) => {
        const why = j.needs.filter((n) => { const s = hasSkill(profile, n); return s && s.verified; });
        return (
          <Card key={j.id} onPress={() => navigate('JobDetail', { id: j.id })}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={[text.h3, { flex: 1, marginRight: 8 }]}>{j.title}</Text>
              {savedJobs.includes(j.id) && <Ionicons name="heart" size={16} color={colors.amber} style={{ marginRight: 6, marginTop: 2 }} />}
              <Chip small label={`${j.match}% match`} tone="verified" />
            </View>
            <Text style={text.small}>{j.company} · {j.area}</Text>
            <Text style={[text.body, { marginTop: 6, fontSize: 14 }]}>{j.pay} · {j.distance === 'Remote' ? '' : `${j.distance} · `}{j.travel}</Text>
            {why.length > 0 && <Text style={[text.small, { marginTop: 6, color: colors.tealDark }]}>Why you match: {why.map((w) => `${w} ✓`).join(', ')}</Text>}
            {j.type !== 'Full-time' && <View style={{ marginTop: 8 }}><Chip small label={j.type} tone="amber" /></View>}
          </Card>
        );
      })}
      {list.length === 0 && <Text style={text.muted}>No jobs for this filter yet. Try All.</Text>}
    </Screen>
  );
}

// 14. Job details
export function JobDetail() {
  const { current, profile, savedJobs, appliedJobs, toggleSave, apply, isGuest, navigate } = useApp();
  const j = JOBS.find((x) => x.id === current.params.id);
  const saved = savedJobs.includes(j.id);
  const applied = appliedJobs.includes(j.id);

  const onSave = () => (isGuest ? navigate('Locked', { feature: 'Saving jobs' }) : toggleSave(j.id));
  const onApply = () => {
    if (isGuest) return navigate('Locked', { feature: 'Applying for jobs' });
    apply(j.id);
    Alert.alert('Application sent', `Your profile was sent to ${j.company}. We'll let you know when they reply.`);
  };

  return (
    <Screen
      footer={
        <View style={st.footer}>
          <Button title={applied ? 'Applied ✓' : 'Apply with my profile'} onPress={onApply} disabled={applied} />
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
      <Text style={text.muted}>{j.company} · {j.fullArea}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
        {[j.pay, j.type, j.level].map((t) => <Chip key={t} label={t} />)}
      </View>

      <Card style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={text.h3}>Your match</Text>
          <Text style={{ color: colors.teal, fontWeight: '800', fontSize: 18 }}>{j.match}%</Text>
        </View>
        {j.needs.map((n) => {
          const s = hasSkill(profile, n);
          const label = s && s.verified ? `${n} (verified)` : n;
          return (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name={s ? 'checkmark' : 'close'} size={18} color={s ? colors.teal : colors.red} />
              <Text style={[text.body, { marginLeft: 8 }]}>{label}</Text>
            </View>
          );
        })}
        <Pressable onPress={() => navigate('Course', { topic: j.gapCourse })} hitSlop={6}>
          <Text style={[text.link, { marginTop: 6 }]}>Close the gap: free 1 hour course</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={text.h3}>Getting there</Text>
        <Text style={[text.muted, { marginTop: 4 }]}>{j.travelLong}</Text>
      </Card>
    </Screen>
  );
}

// Short course placeholder used by "close the gap" links
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
});
