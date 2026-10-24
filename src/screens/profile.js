import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors, radius } from '../theme';
import { useApp, initials } from '../store';
import { JOBS, SUGGESTED_SKILLS } from '../data';
import { Screen, BackHeader, Button, Field, Select, Card, Chip, Progress, Avatar, Note, SectionTitle, text } from '../ui';

export function profileProgress(profile) {
  const n = profile.skills.length;
  const hasEdu = profile.education.length > 0;
  const hasVerified = profile.skills.some((s) => s.verified);
  const hasCert = profile.education.some((e) => e.certificate);
  const pct = Math.round(10 + (hasEdu ? 20 : 0) + Math.min(n, 6) * 7.5 + (hasVerified ? 10 : 0) + (hasCert ? 15 : 0));
  let hint = 'Your profile is complete. Nice work.';
  if (!hasEdu) hint = 'Add your education so employers know your level.';
  else if (n < 6) hint = `Add ${6 - n} more skill${6 - n === 1 ? '' : 's'} to get better job matches.`;
  else if (!hasVerified) hint = 'Pass a skills test to get your first verified badge.';
  else if (!hasCert) hint = 'Upload a certificate to prove your education.';
  return { pct: Math.min(100, pct), hint };
}

// 6. Home
export function Home() {
  const { user, isGuest, profile, navigate } = useApp();
  const { pct, hint } = profileProgress(profile);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = isGuest ? 'there' : user?.name?.split(' ')[0];
  const quick = [
    { label: 'Take a skills test', icon: 'checkmark', go: 'Assessments' },
    { label: 'Find jobs', icon: 'search', go: 'Jobs' },
    { label: 'Build my CV', icon: 'document-text-outline', go: isGuest ? 'Locked' : 'CVBuilder', params: { feature: 'CV builder' } },
    { label: 'Practise interview', icon: 'play', go: isGuest ? 'Locked' : 'InterviewSetup', params: { feature: 'Interview practice' } },
  ];
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={text.muted}>{greet}</Text>
          <Text style={text.h2}>Hi {first}</Text>
        </View>
        <Pressable onPress={() => navigate('Profile')}><Avatar text={isGuest ? 'G' : initials(user?.name)} size={44} /></Pressable>
      </View>

      {isGuest && (
        <Note tone="amber">You're browsing as a guest. Your profile and badges won't be saved. <Text style={text.link} onPress={() => navigate('Register')}>Create a free account</Text></Note>
      )}

      <Pressable style={st.progressCard} onPress={() => navigate('Profile')}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: colors.white, fontWeight: '700', fontSize: 16 }}>Profile {pct}% complete</Text>
          <Text style={{ color: colors.amber, fontWeight: '800', fontSize: 16 }}>{pct}%</Text>
        </View>
        <Progress value={pct} />
        <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 10, fontSize: 13 }}>{hint}</Text>
      </Pressable>

      <View style={st.grid}>
        {quick.map((q) => (
          <Pressable key={q.label} style={st.quick} onPress={() => navigate(q.go, q.params)}>
            <View style={st.quickIcon}><Ionicons name={q.icon} size={18} color={colors.text} /></View>
            <Text style={text.h3}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Top matches for you" action="See all" onAction={() => navigate('Jobs')} />
      {JOBS.slice(0, 2).map((j) => (
        <Card key={j.id} onPress={() => navigate('JobDetail', { id: j.id })} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={text.h3}>{j.title}</Text>
            <Text style={text.small}>{j.area} · {j.distance}</Text>
          </View>
          <Chip label={`${j.match}%`} tone="verified" small />
        </Card>
      ))}
    </Screen>
  );
}

// 7. Personal profile
export function Profile() {
  const { user, isGuest, profile, navigate } = useApp();
  return (
    <Screen padded={false} style={{ paddingTop: 0 }}>
      <View style={st.profileHead}>
        <Text style={{ color: colors.white, fontWeight: '700', fontSize: 17 }}>My profile</Text>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <View style={st.profileCard}>
          <View style={{ marginTop: -40, borderWidth: 4, borderColor: colors.white, borderRadius: 40 }}>
            <Avatar text={isGuest ? 'G' : initials(user?.name)} size={68} />
          </View>
          <Text style={[text.h2, { marginTop: 8 }]}>{isGuest ? 'Guest' : user?.name}</Text>
          <Text style={text.small}>{isGuest ? 'Not saved' : `${user?.location} · Age ${user?.age}`}</Text>
          <Button
            title={isGuest ? 'Create account to save' : 'Edit profile'}
            variant="outline"
            onPress={() => navigate(isGuest ? 'Register' : 'EditProfile')}
            style={{ minHeight: 40, marginTop: 12, paddingHorizontal: 24 }}
          />
        </View>

        <SectionTitle title="Education" action="+ Add" onAction={() => navigate('AddEducation')} />
        {profile.education.length === 0 && <Text style={text.muted}>No education added yet. Tap Add to start.</Text>}
        {profile.education.map((e) => (
          <Card key={e.id}>
            <Text style={text.h3}>{e.title}</Text>
            <Text style={text.small}>
              {e.school ? `${e.school} · ` : ''}{e.end === 'Still studying' ? 'In progress' : `Completed ${e.end}`}
              {e.certificate ? ' · Certificate added' : ''}
            </Text>
          </Card>
        ))}

        <SectionTitle title="My skills" action="Edit" onAction={() => navigate('Skills')} />
        {profile.skills.length === 0 && <Text style={text.muted}>No skills added yet. Tap Edit to add some.</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {profile.skills.map((sk) => (
            <Chip key={sk.name} label={sk.verified ? `${sk.name} ✓` : sk.name} tone={sk.verified ? 'verified' : 'default'} />
          ))}
        </View>
        <Text style={text.small}>✓ = verified by a skills test</Text>
      </View>
    </Screen>
  );
}

export function EditProfile() {
  const { user, updateUser, goBack } = useApp();
  const [f, setF] = useState({ name: user.name, location: user.location, phone: user.phone || '', email: user.email || '' });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  return (
    <Screen>
      <BackHeader title="Edit profile" />
      <Field label="Full name" value={f.name} onChangeText={set('name')} autoCapitalize="words" />
      <Field label="Where you live" value={f.location} onChangeText={set('location')} autoCapitalize="words" placeholder="e.g. Soweto, Gauteng" />
      <Field label="Phone number" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" />
      <Button title="Save" onPress={() => { updateUser(f); goBack(); }} />
    </Screen>
  );
}

// 8. Add education
const QUALS = ['Matric (Grade 12)', 'Certificate', 'Diploma', 'Degree', 'Short course', 'Learnership'];
const YEARS = Array.from({ length: 15 }, (_, i) => String(new Date().getFullYear() - i));

export function AddEducation() {
  const { addEducation, goBack } = useApp();
  const [f, setF] = useState({ qualification: 'Diploma', school: '', field: '', start: YEARS[2], end: 'Still studying', certificate: null });
  const [error, setError] = useState('');
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (!res.canceled && res.assets?.length) set('certificate')(res.assets[0].name);
    } catch (e) {
      Alert.alert('Upload failed', 'We could not open your files. Please try again.');
    }
  };

  const save = () => {
    if (!f.school.trim()) { setError('Please enter where you studied.'); return; }
    const title = f.field ? `${f.qualification} in ${f.field}` : f.qualification;
    addEducation({ ...f, title, school: f.school.trim() });
    goBack();
  };

  return (
    <Screen>
      <BackHeader title="Add education" />
      <Select label="Highest qualification" value={f.qualification} options={QUALS} onChange={set('qualification')} />
      <Field label="School, college or university" value={f.school} onChangeText={(v) => { set('school')(v); setError(''); }} placeholder="e.g. Tshwane University of Technology" autoCapitalize="words" error={error} />
      <Field label="Field of study" value={f.field} onChangeText={set('field')} placeholder="e.g. Information Technology" autoCapitalize="words" />
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1, marginRight: 8 }}><Select label="Start year" value={f.start} options={YEARS} onChange={set('start')} /></View>
        <View style={{ flex: 1, marginLeft: 8 }}><Select label="End year" value={f.end} options={['Still studying', ...YEARS]} onChange={set('end')} /></View>
      </View>
      <Text style={st.label}>Upload certificate (optional)</Text>
      <Pressable style={st.upload} onPress={pick}>
        <Text style={text.link}>{f.certificate ? `✓ ${f.certificate}` : '+ Upload photo or PDF'}</Text>
      </Pressable>
      <Note>Tip: Short courses and online certificates count too. Add them!</Note>
      <Button title="Save" onPress={save} />
    </Screen>
  );
}

// 9. Skills
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const TEST_FOR_SKILL = { Excel: 'excel', 'Customer service': 'customer', 'Phone repair': 'phone', 'Digital literacy': 'digital' };

export function Skills() {
  const { profile, setSkills, goBack, navigate } = useApp();
  const [list, setList] = useState(profile.skills);
  const [query, setQuery] = useState('');

  const add = (name) => {
    const n = name.trim();
    if (!n || list.some((s) => s.name.toLowerCase() === n.toLowerCase())) { setQuery(''); return; }
    setList([...list, { name: n, level: 'Beginner', verified: false }]);
    setQuery('');
  };
  const setLevel = (name, level) => setList(list.map((s) => (s.name === name ? { ...s, level } : s)));
  const remove = (name) => setList(list.filter((s) => s.name !== name));
  const suggestions = SUGGESTED_SKILLS.filter((s) => !list.some((x) => x.name === s));

  return (
    <Screen>
      <BackHeader title="My skills" />
      <View style={st.search}>
        <Ionicons name="search" size={16} color={colors.muted} />
        <TextInput
          style={{ flex: 1, marginLeft: 8, fontSize: 15, color: colors.text }}
          placeholder="Search or add a skill"
          placeholderTextColor="#9AA6A4"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => add(query)}
          returnKeyType="done"
        />
        {query ? <Pressable onPress={() => add(query)} hitSlop={8}><Text style={text.link}>Add</Text></Pressable> : null}
      </View>

      <SectionTitle title={`Added (${list.length})`} />
      {list.map((sk) => (
        <Card key={sk.name}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[text.h3, { flex: 1 }]}>{sk.name}</Text>
            <Chip small label={sk.verified ? 'Verified ✓' : 'Not tested'} tone={sk.verified ? 'verified' : 'amber'} />
            <Pressable onPress={() => remove(sk.name)} hitSlop={10} accessibilityLabel={`Remove ${sk.name}`}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {LEVELS.map((l) => <Chip key={l} label={l} active={sk.level === l} onPress={() => setLevel(sk.name, l)} small />)}
          </View>
          {!sk.verified && TEST_FOR_SKILL[sk.name] && (
            <Pressable onPress={() => { setSkills(list); navigate('Assessments'); }} hitSlop={6}>
              <Text style={text.link}>Prove it: take the test</Text>
            </Pressable>
          )}
        </Card>
      ))}

      {suggestions.length > 0 && <SectionTitle title="Suggested for you" />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {suggestions.map((s) => <Chip key={s} label={`+ ${s}`} onPress={() => add(s)} />)}
      </View>
      <Button title="Save skills" onPress={() => { setSkills(list); goBack(); }} style={{ marginTop: 12 }} />
    </Screen>
  );
}

const st = StyleSheet.create({
  progressCard: { backgroundColor: colors.tealDark, borderRadius: radius.md, padding: 16, marginVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  quick: { width: '48.5%', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10, minHeight: 100, justifyContent: 'space-between' },
  quickIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  profileHead: { backgroundColor: colors.teal, height: 120, alignItems: 'center', paddingTop: 14 },
  profileCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', padding: 16, marginTop: -50 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  upload: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white, height: 70, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, minHeight: 48 },
});
