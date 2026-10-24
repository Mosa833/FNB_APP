import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import * as api from '../lib/api';
import { Screen, BackHeader, Button, Card, Note, ErrorNote, Loading, SectionTitle, text } from '../ui';

const MAX_BYTES = 8 * 1024 * 1024;
const DOC_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/*'];

// Personal details the CV can fill in. Email is left out on purpose: it is the login email.
const FIELDS = [
  ['full_name', 'Full name'], ['headline', 'Headline'], ['about', 'About me'], ['phone', 'Phone'],
  ['location', 'Where you live'], ['birth_year', 'Year of birth'], ['drivers_licence', "Driver's licence"],
  ['linkedin_url', 'LinkedIn'], ['portfolio_url', 'Portfolio or website'],
];
const SECTIONS = [
  { key: 'education', table: 'education', title: 'Education', go: 'EducationForm', label: (e) => e.title, sub: (e) => [e.school, e.end_year === 'Still studying' ? 'In progress' : e.end_year].filter(Boolean).join(' · ') },
  { key: 'experience', table: 'experience', title: 'Work experience', go: 'ExperienceForm', label: (x) => x.title, sub: (x) => [x.organisation, x.kind, [x.start_text, x.end_text].filter(Boolean).join(' to ')].filter(Boolean).join(' · ') },
  { key: 'skills', table: 'user_skills', title: 'Skills', go: 'Skills', label: (s) => s.name, sub: (s) => s.level },
  { key: 'languages', table: 'languages', title: 'Languages', go: 'Languages', label: (l) => l.name, sub: (l) => l.level },
];

const norm = (v) => String(v ?? '').trim().toLowerCase();
const sameItem = {
  education: (a, b) => norm(a.title) === norm(b.title) && (!a.school || !b.school || norm(a.school) === norm(b.school)),
  experience: (a, b) => norm(a.title) === norm(b.title) && (!a.organisation || !b.organisation || norm(a.organisation) === norm(b.organisation)),
  skills: (a, b) => norm(a.name) === norm(b.name),
  languages: (a, b) => norm(a.name) === norm(b.name),
};

// Compares the CV with the profile: what is new, what is different, what is already there
export function buildChoices(cv, data) {
  const p = data.profile || {};
  const fields = FIELDS.filter(([k]) => cv.personal[k]).map(([key, label]) => {
    const now = p[key] == null ? '' : String(p[key]);
    const status = !now.trim() ? 'new' : norm(now) === norm(cv.personal[key]) ? 'same' : 'different';
    return { key, label, value: cv.personal[key], now, status, selected: status === 'new' };
  });
  const lists = {};
  SECTIONS.forEach(({ key }) => {
    const have = key === 'skills' ? data.skills : data[key];
    lists[key] = (cv[key] || []).map((item) => {
      const dup = (have || []).some((h) => sameItem[key](item, h));
      return { item, dup, selected: !dup };
    });
  });
  // Things neither the CV nor the profile has: the user adds these themselves
  const missing = [];
  [['phone', 'Phone number'], ['location', 'Where you live'], ['about', 'About me']].forEach(([k, label]) => {
    if (!cv.personal[k] && !p[k]) missing.push({ label, go: 'EditProfile' });
  });
  SECTIONS.forEach(({ key, title, go }) => {
    const have = key === 'skills' ? data.skills : data[key];
    if (!(cv[key] || []).length && !(have || []).length) missing.push({ label: title, go });
  });
  return { fields, lists, missing };
}

function Check({ on, disabled, onPress, children }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[st.row, disabled && { opacity: 0.55 }]} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled }}>
      <Ionicons name={disabled ? 'checkmark-circle' : on ? 'checkbox' : 'square-outline'} size={22} color={disabled ? colors.muted : colors.teal} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, marginLeft: 10 }}>{children}</View>
    </Pressable>
  );
}

// Upload a CV and fill the profile from it
export function CVImport() {
  const { uid, data, updateProfile, saveRow, reload, navigate } = useApp();
  const [phase, setPhase] = useState('pick'); // pick | working | review | saving | done
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [choices, setChoices] = useState(null);
  const [summary, setSummary] = useState(null);

  const process = async (file) => {
    try {
      setError('');
      if (file.size && file.size > MAX_BYTES) { setError('This file is too big. Please use a CV under 8 MB.'); return; }
      const ext = ((file.name || '').split('.').pop() || '').toLowerCase() || (file.mimeType?.includes('pdf') ? 'pdf' : 'jpg');
      if (ext === 'doc') { setError("Old Word files (.doc) can't be read. Save your CV as a PDF or .docx and try again."); return; }
      setPhase('working'); setLabel('Uploading your CV...');
      const path = `${uid}/${Date.now()}.${ext}`;
      await api.uploadFile('cv-uploads', path, file.uri, file.mimeType || 'application/octet-stream');
      setLabel('Reading your CV. This can take up to a minute...');
      const cv = await api.importCv(path);
      setChoices(buildChoices(cv, data));
      setPhase('review');
    } catch (e) {
      setError(api.friendlyError(e));
      setPhase('pick');
    }
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, copyToCacheDirectory: true });
    if (!res.canceled && res.assets?.[0]) process(res.assets[0]);
  };
  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) { const a = res.assets[0]; process({ uri: a.uri, name: a.fileName || 'cv.jpg', mimeType: a.mimeType || 'image/jpeg', size: a.fileSize }); }
  };
  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Camera needed', 'Allow the camera in your phone settings to take a photo of your CV.'); return; }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) { const a = res.assets[0]; process({ uri: a.uri, name: 'cv.jpg', mimeType: a.mimeType || 'image/jpeg', size: a.fileSize }); }
  };

  const toggleField = (i) => setChoices((c) => ({ ...c, fields: c.fields.map((f, n) => (n === i ? { ...f, selected: !f.selected } : f)) }));
  const toggleItem = (key, i) => setChoices((c) => ({ ...c, lists: { ...c.lists, [key]: c.lists[key].map((x, n) => (n === i ? { ...x, selected: !x.selected } : x)) } }));

  const count = choices ? choices.fields.filter((f) => f.selected).length + Object.values(choices.lists).flat().filter((x) => x.selected).length : 0;

  const save = async () => {
    setPhase('saving');
    let added = 0;
    const failed = [];
    try {
      const fields = {};
      choices.fields.filter((f) => f.selected).forEach((f) => {
        fields[f.key] = f.key === 'birth_year' ? Number(f.value) : f.value;
        if (f.key === 'location') fields.place_id = null;
      });
      if (Object.keys(fields).length) { await updateProfile(fields); added += choices.fields.filter((f) => f.selected).length; }
    } catch (e) {
      failed.push(`Personal details: ${api.friendlyError(e)}`);
    }
    for (const sec of SECTIONS) {
      for (const x of choices.lists[sec.key].filter((y) => y.selected)) {
        try { await saveRow(sec.table, { ...x.item }); added += 1; }
        catch (e) { failed.push(`${sec.label(x.item)}: ${api.friendlyError(e)}`); }
      }
    }
    await reload().catch(() => {});
    setSummary({ added, failed });
    setPhase('done');
  };

  if (phase === 'working' || phase === 'saving') {
    return <Screen><BackHeader title="Upload my CV" /><Loading label={phase === 'saving' ? 'Adding to your profile...' : label} /></Screen>;
  }

  if (phase === 'done') {
    return (
      <Screen>
        <BackHeader title="Upload my CV" />
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <View style={st.doneIcon}><Ionicons name="checkmark" size={34} color={colors.white} /></View>
          <Text style={[text.h1, { textAlign: 'center', marginTop: 14 }]}>{summary.added ? 'Profile updated' : 'Nothing was added'}</Text>
          <Text style={[text.muted, { textAlign: 'center' }]}>{summary.added} thing{summary.added === 1 ? '' : 's'} added from your CV.</Text>
        </View>
        {summary.failed.length > 0 && <Note tone="amber" style={{ marginTop: 14 }}>{`These could not be added:\n${summary.failed.join('\n')}`}</Note>}
        {choices.missing.length > 0 && (
          <Card style={{ marginTop: 14 }}>
            <Text style={text.h3}>Not in your CV</Text>
            <Text style={[text.muted, { marginTop: 4 }]}>Add these yourself to complete your profile.</Text>
            {choices.missing.map((m) => (
              <Pressable key={m.label} onPress={() => navigate(m.go)} style={st.todo}>
                <Ionicons name="add-circle-outline" size={18} color={colors.teal} />
                <Text style={[text.body, { flex: 1, marginLeft: 8 }]}>{m.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </Card>
        )}
        <Button title="See my profile" onPress={() => navigate('Profile')} style={{ marginTop: 10 }} />
        <Button title="Edit my details" variant="outline" onPress={() => navigate('EditProfile')} />
      </Screen>
    );
  }

  if (phase === 'review') {
    const { fields, lists } = choices;
    const anyFound = fields.length || Object.values(lists).some((l) => l.length);
    return (
      <Screen
        footer={
          <View style={st.footer}>
            <Button title={count ? `Add ${count} to my profile` : 'Nothing selected'} disabled={!count} onPress={save} />
            <Button title="Cancel" variant="link" onPress={() => { setChoices(null); setPhase('pick'); }} />
          </View>
        }
      >
        <BackHeader title="Check what we found" />
        <Text style={[text.muted, { marginBottom: 6 }]}>Tick what you want on your profile. Nothing is saved until you tap Add.</Text>
        {!anyFound && <Note tone="amber">We couldn't find details we could use. Try another file, or fill in your profile yourself.</Note>}

        {fields.length > 0 && <SectionTitle title="Personal details" />}
        {fields.map((f, i) => (
          <Card key={f.key} style={{ paddingVertical: 10 }}>
            <Check on={f.selected} disabled={f.status === 'same'} onPress={() => toggleField(i)}>
              <Text style={text.small}>{f.label}{f.status === 'different' ? ' · replaces what you have' : ''}</Text>
              <Text style={text.body} numberOfLines={f.key === 'about' ? 4 : 2}>{f.value}</Text>
              {f.status === 'different' ? <Text style={[text.small, { marginTop: 2 }]}>Now: {f.now}</Text> : null}
              {f.status === 'same' ? <Text style={[text.small, { marginTop: 2 }]}>Already on your profile</Text> : null}
            </Check>
          </Card>
        ))}

        {SECTIONS.map((sec) => (lists[sec.key].length ? (
          <View key={sec.key}>
            <SectionTitle title={sec.title} />
            {lists[sec.key].map((x, i) => (
              <Card key={`${sec.key}${i}`} style={{ paddingVertical: 10 }}>
                <Check on={x.selected} disabled={x.dup} onPress={() => toggleItem(sec.key, i)}>
                  <Text style={text.h3}>{sec.label(x.item)}</Text>
                  {sec.sub(x.item) ? <Text style={text.small}>{sec.sub(x.item)}</Text> : null}
                  {x.dup ? <Text style={[text.small, { marginTop: 2 }]}>Already on your profile</Text> : null}
                </Check>
              </Card>
            ))}
          </View>
        ) : null))}

        <Note style={{ marginTop: 10 }}>Check everything is right. You can change any detail afterwards in your profile. Skills from a CV are not verified: take a skills test to get a badge.</Note>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title="Upload my CV" />
      <View style={st.hero}><Ionicons name="document-text" size={40} color={colors.teal} /></View>
      <Text style={[text.h1, { textAlign: 'center' }]}>Fill your profile from your CV</Text>
      <Text style={[text.muted, { textAlign: 'center', marginBottom: 16 }]}>
        We read your CV and show you what we found. You choose what to add, and you can edit anything afterwards.
      </Text>
      <ErrorNote message={error} />
      <Button title="Choose a PDF or Word file" icon={<Ionicons name="folder-open-outline" size={18} color={colors.white} style={{ marginRight: 8 }} />} onPress={pickFile} />
      <Button title="Choose a photo of my CV" variant="outline" onPress={pickPhoto} />
      <Button title="Take a photo of my CV" variant="outline" onPress={takePhoto} />
      <Text style={[text.small, { textAlign: 'center', marginTop: 8 }]}>PDF, Word (.docx) or a clear photo, up to 8 MB. Your CV file is deleted as soon as it has been read.</Text>
      <Button title="Fill in my profile myself" variant="link" onPress={() => navigate('EditProfile')} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  footer: { paddingHorizontal: 20, paddingTop: 8, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  doneIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  todo: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bg },
});
