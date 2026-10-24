<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { colors, radius } from '../theme';
import { useApp, initials, ageFrom } from '../store';
import * as api from '../lib/api';
import { rankJobs } from '../lib/match';
import { profileProgress } from '../lib/progress';
import { QUALIFICATIONS, EXPERIENCE_KINDS, LANGUAGE_OPTIONS, JOB_TYPES, AVAILABILITY, START_OPTIONS, TRAVEL_OPTIONS, LICENCES } from '../data';
import { AutocompleteField, LocationField } from '../components/Autocomplete';
import { Screen, BackHeader, Button, Field, Select, Card, Chip, Progress, Avatar, Note, SectionTitle, ErrorNote, Loading, text } from '../ui';

const YEARS = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - i));
const BIRTH_YEARS = Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - 15 - i));

// 6. Home
export function Home() {
  const { data, isGuest, navigate } = useApp();
  const { pct, hint } = profileProgress(data);
  const [jobs, setJobs] = useState(null);
  useEffect(() => { api.fetchJobs().then((j) => setJobs(rankJobs(j, data))).catch(() => setJobs([])); }, [data]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = isGuest ? 'there' : (data.profile.full_name || '').split(' ')[0] || 'there';
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD
        <Pressable onPress={() => navigate('Profile')}>
          <Avatar text={isGuest ? 'G' : initials(data.profile.full_name)} uri={data.profile.avatar_url} size={44} />
        </Pressable>
=======
        <Pressable onPress={() => navigate('Profile')}><Avatar text={isGuest ? 'G' : initials(user?.name)} size={44} /></Pressable>
>>>>>>> origin/main
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
<<<<<<< HEAD
      {jobs === null ? <Loading /> : jobs.slice(0, 2).map((j) => (
        <Card key={j.id} onPress={() => navigate('JobDetail', { job: j })} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={text.h3}>{j.title}</Text>
            <Text style={text.small}>{j.area} · {j.distance_text}</Text>
=======
      {JOBS.slice(0, 2).map((j) => (
        <Card key={j.id} onPress={() => navigate('JobDetail', { id: j.id })} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={text.h3}>{j.title}</Text>
            <Text style={text.small}>{j.area} · {j.distance}</Text>
>>>>>>> origin/main
          </View>
          <Chip label={`${j.match}%`} tone="verified" small />
        </Card>
      ))}
    </Screen>
  );
}

// 7. Personal profile
export function Profile() {
<<<<<<< HEAD
  const { data, isGuest, navigate } = useApp();
  const p = data.profile;
  const { pct, items } = profileProgress(data);
  const missing = items.filter((i) => !i.done);
  const age = ageFrom(p.birth_year);

=======
  const { user, isGuest, profile, navigate } = useApp();
>>>>>>> origin/main
  return (
    <Screen padded={false} style={{ paddingTop: 0 }}>
      <View style={st.profileHead}>
        <Text style={{ color: colors.white, fontWeight: '700', fontSize: 17 }}>My profile</Text>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <View style={st.profileCard}>
<<<<<<< HEAD
          <Pressable onPress={() => navigate('EditProfile')} style={st.avatarRing} accessibilityLabel="Change profile photo">
            <Avatar text={isGuest ? 'G' : initials(p.full_name)} uri={p.avatar_url} size={72} />
            <View style={st.camBadge}><Ionicons name="camera" size={13} color={colors.white} /></View>
          </Pressable>
          <Text style={[text.h2, { marginTop: 8, textAlign: 'center' }]}>{p.full_name || 'Your name'}</Text>
          {p.headline ? <Text style={[text.muted, { textAlign: 'center' }]}>{p.headline}</Text> : null}
          <Text style={[text.small, { marginTop: 2 }]}>{[p.location, age ? `Age ${age}` : null].filter(Boolean).join(' · ') || 'Add where you live'}</Text>
          {(p.phone || p.email) && !isGuest ? <Text style={[text.small, { marginTop: 2 }]}>{[p.phone, p.email].filter(Boolean).join(' · ')}</Text> : null}
=======
          <View style={{ marginTop: -40, borderWidth: 4, borderColor: colors.white, borderRadius: 40 }}>
            <Avatar text={isGuest ? 'G' : initials(user?.name)} size={68} />
          </View>
          <Text style={[text.h2, { marginTop: 8 }]}>{isGuest ? 'Guest' : user?.name}</Text>
          <Text style={text.small}>{isGuest ? 'Not saved' : `${user?.location} · Age ${user?.age}`}</Text>
>>>>>>> origin/main
          <Button
            title={isGuest ? 'Create account to save' : 'Edit profile'}
            variant="outline"
            onPress={() => navigate(isGuest ? 'Register' : 'EditProfile')}
            style={{ minHeight: 40, marginTop: 12, paddingHorizontal: 24 }}
          />
        </View>

<<<<<<< HEAD
        {missing.length > 0 && (
          <Card style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={text.h3}>Finish your profile</Text>
              <Text style={{ color: colors.teal, fontWeight: '800' }}>{pct}%</Text>
            </View>
            <Progress value={pct} track={colors.border} />
            <View style={{ marginTop: 8 }}>
              {missing.slice(0, 4).map((m) => (
                <Pressable key={m.key} onPress={() => navigate(m.go)} style={st.todo}>
                  <Ionicons name="ellipse-outline" size={16} color={colors.amber} />
                  <Text style={[text.body, { flex: 1, marginLeft: 8, fontSize: 14 }]}>{m.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        <SectionTitle title="About me" action="Edit" onAction={() => navigate('EditProfile')} />
        <Text style={text.muted}>{p.about || 'Write two or three sentences about who you are and what work you want.'}</Text>

        <SectionTitle title="Education" action="+ Add" onAction={() => navigate('EducationForm')} />
        {data.education.length === 0 && <Text style={text.muted}>No education added yet.</Text>}
        {data.education.map((e) => (
          <Card key={e.id} onPress={() => navigate('EducationDetail', { id: e.id })} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={text.h3}>{e.title}</Text>
              <Text style={text.small}>
                {e.school ? `${e.school} · ` : ''}{e.end_year === 'Still studying' ? 'In progress' : `Completed ${e.end_year || ''}`}
              </Text>
              {e.certificate_path ? <Text style={[text.small, { color: colors.teal, marginTop: 4 }]}>Certificate added · tap to view</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        ))}

        <SectionTitle title="Work experience" action="+ Add" onAction={() => navigate('ExperienceForm')} />
        {data.experience.length === 0 && <Text style={text.muted}>Add jobs, informal work, volunteering or internships.</Text>}
        {data.experience.map((x) => (
          <Card key={x.id} onPress={() => navigate('ExperienceForm', { id: x.id })}>
            <Text style={text.h3}>{x.title}</Text>
            <Text style={text.small}>{[x.organisation, x.kind, [x.start_text, x.end_text].filter(Boolean).join(' to ')].filter(Boolean).join(' · ')}</Text>
            {x.description ? <Text style={[text.muted, { marginTop: 4 }]} numberOfLines={2}>{x.description}</Text> : null}
=======
        <SectionTitle title="Education" action="+ Add" onAction={() => navigate('AddEducation')} />
        {profile.education.length === 0 && <Text style={text.muted}>No education added yet. Tap Add to start.</Text>}
        {profile.education.map((e) => (
          <Card key={e.id}>
            <Text style={text.h3}>{e.title}</Text>
            <Text style={text.small}>
              {e.school ? `${e.school} · ` : ''}{e.end === 'Still studying' ? 'In progress' : `Completed ${e.end}`}
              {e.certificate ? ' · Certificate added' : ''}
            </Text>
>>>>>>> origin/main
          </Card>
        ))}

        <SectionTitle title="My skills" action="Edit" onAction={() => navigate('Skills')} />
<<<<<<< HEAD
        {data.skills.length === 0 && <Text style={text.muted}>No skills added yet.</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {data.skills.map((sk) => (
            <Chip key={sk.id} label={sk.verified ? `${sk.name} ✓` : sk.name} tone={sk.verified ? 'verified' : 'default'} />
          ))}
        </View>
        {data.skills.length > 0 && <Text style={text.small}>✓ = verified by a skills test</Text>}

        <SectionTitle title="Languages" action="Edit" onAction={() => navigate('Languages')} />
        {data.languages.length === 0 ? <Text style={text.muted}>Add the languages you can speak at work.</Text> : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {data.languages.map((l) => <Chip key={l.id} label={`${l.name} · ${l.level}`} />)}
          </View>
        )}

        <SectionTitle title="Work I'm looking for" action="Edit" onAction={() => navigate('Preferences')} />
        {(p.job_types || []).length === 0 ? <Text style={text.muted}>Tell employers what jobs you want and when you can start.</Text> : (
          <Card>
            <Text style={text.body}>{p.job_types.join(', ')}</Text>
            <Text style={[text.small, { marginTop: 4 }]}>
              {[(p.availability || []).join(', '), p.start_date ? `Can start: ${p.start_date}` : null, p.max_travel_km ? `Up to ${p.max_travel_km} km away` : null, p.drivers_licence && p.drivers_licence !== 'None' ? `Licence: ${p.drivers_licence}` : null].filter(Boolean).join(' · ')}
            </Text>
          </Card>
        )}

        {(p.linkedin_url || p.portfolio_url) ? (
          <>
            <SectionTitle title="Links" />
            {p.linkedin_url ? <Text style={[text.link, { marginBottom: 6 }]} onPress={() => WebBrowser.openBrowserAsync(p.linkedin_url)}>LinkedIn</Text> : null}
            {p.portfolio_url ? <Text style={text.link} onPress={() => WebBrowser.openBrowserAsync(p.portfolio_url)}>Portfolio or website</Text> : null}
          </>
        ) : null}
=======
        {profile.skills.length === 0 && <Text style={text.muted}>No skills added yet. Tap Edit to add some.</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {profile.skills.map((sk) => (
            <Chip key={sk.name} label={sk.verified ? `${sk.name} ✓` : sk.name} tone={sk.verified ? 'verified' : 'default'} />
          ))}
        </View>
        <Text style={text.small}>✓ = verified by a skills test</Text>
>>>>>>> origin/main
      </View>
    </Screen>
  );
}

<<<<<<< HEAD
// Edit profile: photo, name, headline, about, contact, location, links
export function EditProfile() {
  const { data, uid, isGuest, updateProfile, goBack } = useApp();
  const p = data.profile;
  const [f, setF] = useState({
    full_name: p.full_name || '', headline: p.headline || '', about: p.about || '', phone: p.phone || '',
    birth_year: p.birth_year ? String(p.birth_year) : '', linkedin_url: p.linkedin_url || '', portfolio_url: p.portfolio_url || '',
  });
  const [place, setPlace] = useState({ location: p.location || '', place_id: p.place_id || null });
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) setPhoto(res.assets[0]);
  };

  const fixUrl = (u) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u);

  const save = async () => {
    if (f.full_name.trim().split(/\s+/).length < 2) { setError('Please enter your first name and surname.'); return; }
    const phone = f.phone.replace(/\s/g, '');
    if (phone && !/^(0\d{9}|\+27\d{9})$/.test(phone)) { setError('Use a 10 digit phone number like 071 000 0000.'); return; }
    try {
      setBusy(true); setError('');
      let avatar_url = p.avatar_url || null;
      if (photo) {
        if (isGuest) avatar_url = photo.uri;
        else {
          const path = `${uid}/avatar-${Date.now()}.jpg`;
          await api.uploadFile('avatars', path, photo.uri, photo.mimeType || 'image/jpeg');
          avatar_url = api.publicUrl('avatars', path);
        }
      }
      await updateProfile({
        full_name: f.full_name.trim(), headline: f.headline.trim() || null, about: f.about.trim() || null, phone: phone || null,
        birth_year: f.birth_year ? Number(f.birth_year) : null, location: place.location.trim() || null, place_id: place.place_id,
        linkedin_url: fixUrl(f.linkedin_url.trim()) || null, portfolio_url: fixUrl(f.portfolio_url.trim()) || null, avatar_url,
      });
      goBack();
    } catch (e) {
      setError(api.friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackHeader title="Edit profile" />
      <Pressable onPress={pickPhoto} style={{ alignItems: 'center', marginBottom: 16 }}>
        <Avatar text={initials(f.full_name)} uri={photo?.uri || p.avatar_url} size={90} />
        <Text style={[text.link, { marginTop: 8 }]}>{p.avatar_url || photo ? 'Change photo' : 'Add a photo'}</Text>
        <Text style={text.small}>A clear photo of your face, with a plain background</Text>
      </Pressable>
      <Field label="Full name" value={f.full_name} onChangeText={set('full_name')} autoCapitalize="words" />
      <Field label="Headline" value={f.headline} onChangeText={set('headline')} placeholder="e.g. IT student · Customer service · Phone repairs" autoCapitalize="sentences" maxLength={80} />
      <Field label="About me" value={f.about} onChangeText={set('about')} placeholder="Two or three sentences about you and the work you want." autoCapitalize="sentences" multiline maxLength={400} hint={`${f.about.length}/400`} />
      <Field label="Phone number" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="071 000 0000" />
      <LocationField value={place} onChange={setPlace} />
      <Select label="Year of birth" value={f.birth_year} options={BIRTH_YEARS} onChange={set('birth_year')} placeholder="Choose a year" />
      <Field label="LinkedIn (optional)" value={f.linkedin_url} onChangeText={set('linkedin_url')} placeholder="linkedin.com/in/your-name" keyboardType="url" />
      <Field label="Portfolio or website (optional)" value={f.portfolio_url} onChangeText={set('portfolio_url')} placeholder="Link to your work" keyboardType="url" />
      <ErrorNote message={error} />
      <Button title="Save" onPress={save} loading={busy} />
=======
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
>>>>>>> origin/main
    </Screen>
  );
}

<<<<<<< HEAD
// 8. Add or edit education
export function EducationForm() {
  const { data, uid, isGuest, saveRow, deleteRow, goBack, current } = useApp();
  const existing = data.education.find((e) => e.id === current.params.id);
  const [f, setF] = useState({
    qualification: existing?.qualification || 'Matric (Grade 12)', school: existing?.school || '', field: existing?.field || '',
    start_year: existing?.start_year || YEARS[2], end_year: existing?.end_year || 'Still studying',
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
=======
// 8. Add education
const QUALS = ['Matric (Grade 12)', 'Certificate', 'Diploma', 'Degree', 'Short course', 'Learnership'];
const YEARS = Array.from({ length: 15 }, (_, i) => String(new Date().getFullYear() - i));

export function AddEducation() {
  const { addEducation, goBack } = useApp();
  const [f, setF] = useState({ qualification: 'Diploma', school: '', field: '', start: YEARS[2], end: 'Still studying', certificate: null });
>>>>>>> origin/main
  const [error, setError] = useState('');
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
<<<<<<< HEAD
      if (!res.canceled && res.assets?.length) {
        const a = res.assets[0];
        if (a.size && a.size > 10 * 1024 * 1024) { setError('That file is bigger than 10 MB. Please choose a smaller one.'); return; }
        setFile(a);
      }
    } catch {
      setError('We could not open your files. Please try again.');
    }
  };

  const save = async () => {
    if (!f.school.trim()) { setError('Please enter where you studied.'); return; }
    if (f.end_year !== 'Still studying' && Number(f.end_year) < Number(f.start_year)) { setError('The end year is before the start year.'); return; }
    const title = f.field.trim() && !/matric/i.test(f.qualification) ? `${f.qualification} in ${f.field.trim()}` : f.qualification;
    try {
      setBusy(true); setError('');
      const row = await saveRow('education', { ...(existing ? { id: existing.id } : {}), ...f, school: f.school.trim(), field: f.field.trim() || null, title });
      if (file) {
        const type = file.mimeType || (file.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
        if (isGuest) {
          await saveRow('education', { id: row.id, certificate_path: file.uri, certificate_name: file.name, certificate_type: type });
        } else {
          const ext = type === 'application/pdf' ? 'pdf' : (file.name?.split('.').pop() || 'jpg');
          const path = `${uid}/${row.id}-${Date.now()}.${ext}`;
          await api.uploadFile('certificates', path, file.uri, type);
          await saveRow('education', { id: row.id, certificate_path: path, certificate_name: file.name, certificate_type: type });
        }
      }
      goBack();
    } catch (e) {
      setError(api.friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => Alert.alert('Delete this education?', 'This also removes its certificate.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRow('education', existing.id); goBack(); } },
  ]);

  return (
    <Screen>
      <BackHeader title={existing ? 'Edit education' : 'Add education'} />
      <Select label="Qualification" value={f.qualification} options={QUALIFICATIONS} onChange={set('qualification')} />
      <Field label="School, college or university" value={f.school} onChangeText={set('school')} placeholder="e.g. Tshwane University of Technology" autoCapitalize="words" />
      <Field label="Field of study (optional)" value={f.field} onChangeText={set('field')} placeholder="e.g. Information Technology" autoCapitalize="words" />
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1, marginRight: 8 }}><Select label="Start year" value={f.start_year} options={YEARS} onChange={set('start_year')} /></View>
        <View style={{ flex: 1, marginLeft: 8 }}><Select label="End year" value={f.end_year} options={['Still studying', ...YEARS]} onChange={set('end_year')} /></View>
      </View>
      <Text style={st.label}>Certificate (optional)</Text>
      <Pressable style={st.upload} onPress={pick}>
        <Text style={text.link}>
          {file ? `✓ ${file.name}` : existing?.certificate_name ? `Replace ${existing.certificate_name}` : '+ Upload photo or PDF'}
        </Text>
      </Pressable>
      <Note>Tip: Short courses and online certificates count too. Add them!</Note>
      <ErrorNote message={error} />
      <Button title="Save" onPress={save} loading={busy} />
      {existing ? <Button title="Delete" variant="link" onPress={remove} /> : null}
=======
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
>>>>>>> origin/main
    </Screen>
  );
}

<<<<<<< HEAD
// Tapping an education opens this screen, with the certificate if there is one
export function EducationDetail() {
  const { data, isGuest, navigate, current } = useApp();
  const e = data.education.find((x) => x.id === current.params.id);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!e?.certificate_path) return;
    if (isGuest || e.certificate_path.startsWith('file:')) { setUrl(e.certificate_path); return; }
    api.signedUrl('certificates', e.certificate_path).then(setUrl).catch((err) => setError(api.friendlyError(err)));
  }, [e?.certificate_path]);

  if (!e) return <Screen><BackHeader title="Education" /><Text style={text.muted}>This item was removed.</Text></Screen>;

  const isPdf = (e.certificate_type || '').includes('pdf');
  const isLocal = url?.startsWith('file:');
  // Android's WebView can't show PDFs, so online PDFs open in Google's viewer there
  const pdfUri = url && Platform.OS === 'android' && !isLocal ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}` : url;

  const openFull = () => (isLocal ? Sharing.shareAsync(url) : WebBrowser.openBrowserAsync(url));

  return (
    <Screen>
      <BackHeader title="Education" right={<Text style={text.link} onPress={() => navigate('EducationForm', { id: e.id })}>Edit</Text>} />
      <Text style={text.h1}>{e.title}</Text>
      <Text style={text.muted}>{e.school}</Text>
      <Text style={[text.small, { marginTop: 4 }]}>
        {e.start_year} to {e.end_year === 'Still studying' ? 'now (still studying)' : e.end_year}
      </Text>

      <SectionTitle title="Certificate" />
      {!e.certificate_path ? (
        <>
          <Text style={text.muted}>No certificate uploaded yet.</Text>
          <Button title="Upload certificate" variant="outline" onPress={() => navigate('EducationForm', { id: e.id })} style={{ marginTop: 10 }} />
        </>
      ) : error ? (
        <ErrorNote message={error} />
      ) : !url ? (
        <Loading label="Opening certificate..." />
      ) : (
        <>
          <View style={st.certBox}>
            {isPdf ? (
              Platform.OS === 'android' && isLocal ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <Ionicons name="document-text-outline" size={40} color={colors.teal} />
                  <Text style={[text.muted, { textAlign: 'center', marginTop: 8 }]}>Tap the button below to open the PDF.</Text>
                </View>
              ) : (
                <WebView source={{ uri: pdfUri }} style={{ flex: 1 }} originWhitelist={['*']} startInLoadingState />
              )
            ) : (
              <Image source={{ uri: url }} style={{ flex: 1 }} resizeMode="contain" />
            )}
          </View>
          <Text style={[text.small, { marginTop: 6 }]}>{e.certificate_name}</Text>
          <Button title="Open full screen" variant="outline" onPress={openFull} style={{ marginTop: 10 }} />
        </>
      )}
    </Screen>
  );
}

// 9. Skills: search box with a dropdown of matching skills
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export function Skills() {
  const { data, saveRow, deleteRow, navigate } = useApp();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const add = async (name) => {
    const n = name.trim();
    if (!n) return;
    if (data.skills.some((s) => s.name.toLowerCase() === n.toLowerCase())) { setError(`${n} is already on your list.`); return; }
    try { setError(''); await saveRow('user_skills', { name: n, level: 'Beginner' }); } catch (e) { setError(api.friendlyError(e)); }
  };
  const setLevel = async (sk, level) => { try { await saveRow('user_skills', { id: sk.id, level }); } catch (e) { setError(api.friendlyError(e)); } };
  const remove = async (sk) => { try { await deleteRow('user_skills', sk.id); } catch (e) { setError(api.friendlyError(e)); } };
=======
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
>>>>>>> origin/main

  return (
    <Screen>
      <BackHeader title="My skills" />
<<<<<<< HEAD
      <AutocompleteField
        placeholder="Search or add a skill"
        value={query}
        onChangeText={setQuery}
        clearOnSelect
        allowCustom
        customLabel={(t) => `Add "${t}" as a new skill`}
        fetchSuggestions={async (q) => {
          const res = await api.searchSkills(q);
          return res
            .filter((r) => !data.skills.some((s) => s.name.toLowerCase() === r.name.toLowerCase()))
            .map((r) => ({ key: r.name, label: r.name, sub: r.category }));
        }}
        onSelect={(item) => add(item.label)}
      />
      <ErrorNote message={error} />

      <SectionTitle title={`Added (${data.skills.length})`} />
      {data.skills.length === 0 && <Text style={text.muted}>Type a skill above, for example "Excel" or "Cooking", and pick it from the list.</Text>}
      {data.skills.map((sk) => (
        <Card key={sk.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[text.h3, { flex: 1 }]}>{sk.name}</Text>
            <Chip small label={sk.verified ? 'Verified ✓' : 'Not tested'} tone={sk.verified ? 'verified' : 'amber'} />
            <Pressable onPress={() => remove(sk)} hitSlop={10} accessibilityLabel={`Remove ${sk.name}`}>
=======
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
>>>>>>> origin/main
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
<<<<<<< HEAD
            {LEVELS.map((l) => <Chip key={l} label={l} active={sk.level === l} onPress={() => setLevel(sk, l)} small />)}
          </View>
          {!sk.verified && (
            <Pressable onPress={() => navigate('Assessments')} hitSlop={6}>
=======
            {LEVELS.map((l) => <Chip key={l} label={l} active={sk.level === l} onPress={() => setLevel(sk.name, l)} small />)}
          </View>
          {!sk.verified && TEST_FOR_SKILL[sk.name] && (
            <Pressable onPress={() => { setSkills(list); navigate('Assessments'); }} hitSlop={6}>
>>>>>>> origin/main
              <Text style={text.link}>Prove it: take the test</Text>
            </Pressable>
          )}
        </Card>
      ))}
<<<<<<< HEAD
    </Screen>
  );
}

// Work experience, including informal work and volunteering
export function ExperienceForm() {
  const { data, saveRow, deleteRow, goBack, current } = useApp();
  const existing = data.experience.find((x) => x.id === current.params.id);
  const [f, setF] = useState({
    title: existing?.title || '', organisation: existing?.organisation || '', kind: existing?.kind || 'Job',
    start_text: existing?.start_text || '', end_text: existing?.end_text || '', description: existing?.description || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const save = async () => {
    if (!f.title.trim()) { setError('Say what you did, for example "Phone repairs" or "Shop assistant".'); return; }
    try {
      setBusy(true); setError('');
      await saveRow('experience', { ...(existing ? { id: existing.id } : {}), ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim ? v.trim() : v])) });
      goBack();
    } catch (e) {
      setError(api.friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => Alert.alert('Delete this experience?', '', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRow('experience', existing.id); goBack(); } },
  ]);

  return (
    <Screen>
      <BackHeader title={existing ? 'Edit experience' : 'Add experience'} />
      <Text style={st.label}>Type of work</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
        {EXPERIENCE_KINDS.map((k) => <Chip key={k} label={k} active={f.kind === k} onPress={() => set('kind')(k)} />)}
      </View>
      <Field label="What did you do?" value={f.title} onChangeText={set('title')} placeholder="e.g. Phone repairs" autoCapitalize="sentences" />
      <Field label="Where or for who? (optional)" value={f.organisation} onChangeText={set('organisation')} placeholder="e.g. Self-employed, Soweto" autoCapitalize="words" />
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1, marginRight: 8 }}><Field label="From" value={f.start_text} onChangeText={set('start_text')} placeholder="e.g. 2023" autoCapitalize="words" /></View>
        <View style={{ flex: 1, marginLeft: 8 }}><Field label="To" value={f.end_text} onChangeText={set('end_text')} placeholder="e.g. now" autoCapitalize="words" /></View>
      </View>
      <Field label="What you did and achieved (optional)" value={f.description} onChangeText={set('description')} placeholder='e.g. "Repaired about 40 phones for customers in my area."' autoCapitalize="sentences" multiline maxLength={300} />
      <ErrorNote message={error} />
      <Button title="Save" onPress={save} loading={busy} />
      {existing ? <Button title="Delete" variant="link" onPress={remove} /> : null}
    </Screen>
  );
}

// Languages
export function Languages() {
  const { data, saveRow, deleteRow } = useApp();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const add = async (name) => {
    if (data.languages.some((l) => l.name.toLowerCase() === name.toLowerCase())) { setError(`${name} is already added.`); return; }
    try { setError(''); await saveRow('languages', { name, level: 'Good' }); } catch (e) { setError(api.friendlyError(e)); }
  };

  return (
    <Screen>
      <BackHeader title="Languages" />
      <AutocompleteField
        placeholder="Search for a language"
        value={query}
        onChangeText={setQuery}
        clearOnSelect
        allowCustom
        fetchSuggestions={async (q) => LANGUAGE_OPTIONS
          .filter((l) => l.toLowerCase().includes(q.toLowerCase()) && !data.languages.some((x) => x.name === l))
          .slice(0, 8).map((l) => ({ key: l, label: l }))}
        onSelect={(item) => add(item.label)}
      />
      <ErrorNote message={error} />
      {data.languages.length === 0 && <Text style={text.muted}>Employers in South Africa value people who speak more than one language. Add every language you can use at work.</Text>}
      {data.languages.map((l) => (
        <Card key={l.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[text.h3, { flex: 1 }]}>{l.name}</Text>
            <Pressable onPress={() => deleteRow('languages', l.id)} hitSlop={10} accessibilityLabel={`Remove ${l.name}`}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {['Basic', 'Good', 'Fluent'].map((lv) => <Chip key={lv} small label={lv} active={l.level === lv} onPress={() => saveRow('languages', { id: l.id, level: lv })} />)}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

// Work preferences
export function Preferences() {
  const { data, updateProfile, goBack } = useApp();
  const p = data.profile;
  const [jobTypes, setJobTypes] = useState(p.job_types || []);
  const [availability, setAvailability] = useState(p.availability || []);
  const [start, setStart] = useState(p.start_date || '');
  const [travel, setTravel] = useState(p.max_travel_km || null);
  const [licence, setLicence] = useState(p.drivers_licence || 'None');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = async () => {
    if (!jobTypes.length) { setError('Add at least one type of job you want.'); return; }
    try {
      setBusy(true); setError('');
      await updateProfile({ job_types: jobTypes, availability, start_date: start || null, max_travel_km: travel, drivers_licence: licence });
      goBack();
    } catch (e) {
      setError(api.friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackHeader title="Work I'm looking for" />
      <AutocompleteField
        label="Jobs I want"
        placeholder="Search job types, e.g. cashier"
        value={query}
        onChangeText={setQuery}
        clearOnSelect
        allowCustom
        fetchSuggestions={async (q) => JOB_TYPES.filter((j) => j.toLowerCase().includes(q.toLowerCase()) && !jobTypes.includes(j)).slice(0, 8).map((j) => ({ key: j, label: j }))}
        onSelect={(item) => !jobTypes.includes(item.label) && jobTypes.length < 5 && setJobTypes([...jobTypes, item.label])}
        hint="Up to 5"
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {jobTypes.map((j) => <Chip key={j} label={`${j}  ✕`} active onPress={() => toggle(jobTypes, setJobTypes, j)} />)}
      </View>

      <Text style={[st.label, { marginTop: 10 }]}>When can you work?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {AVAILABILITY.map((a) => <Chip key={a} label={a} active={availability.includes(a)} onPress={() => toggle(availability, setAvailability, a)} />)}
      </View>

      <Text style={[st.label, { marginTop: 10 }]}>When can you start?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {START_OPTIONS.map((o) => <Chip key={o} label={o} active={start === o} onPress={() => setStart(o)} />)}
      </View>

      <Text style={[st.label, { marginTop: 10 }]}>How far can you travel?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {TRAVEL_OPTIONS.map((km) => <Chip key={km} label={`${km} km`} active={travel === km} onPress={() => setTravel(km)} />)}
        <Chip label="Any distance" active={travel === null} onPress={() => setTravel(null)} />
      </View>

      <View style={{ marginTop: 10 }}>
        <Select label="Driver's licence" value={licence} options={LICENCES} onChange={setLicence} />
      </View>
      <ErrorNote message={error} />
      <Button title="Save" onPress={save} loading={busy} />
=======

      {suggestions.length > 0 && <SectionTitle title="Suggested for you" />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {suggestions.map((s) => <Chip key={s} label={`+ ${s}`} onPress={() => add(s)} />)}
      </View>
      <Button title="Save skills" onPress={() => { setSkills(list); goBack(); }} style={{ marginTop: 12 }} />
>>>>>>> origin/main
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
<<<<<<< HEAD
  avatarRing: { marginTop: -46, borderWidth: 4, borderColor: colors.white, borderRadius: 44 },
  camBadge: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  todo: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.bg },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  upload: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white, minHeight: 70, alignItems: 'center', justifyContent: 'center', padding: 10 },
  certBox: { height: 420, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
=======
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  upload: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white, height: 70, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, minHeight: 48 },
>>>>>>> origin/main
});
