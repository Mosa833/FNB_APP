import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import * as api from '../lib/api';
import { Screen, BackHeader, Button, Card, Chip, Field, Select, Note, ErrorNote, Loading, text } from '../ui';
import { BadgeRow } from '../components/Badges';

// Page the endorser opens (web/endorse.html on your Netlify site). Set EXPO_PUBLIC_ENDORSE_URL in .env.
const endorseUrl = () => process.env.EXPO_PUBLIC_ENDORSE_URL || '';
const RELATIONSHIPS = ['Former manager', 'Customer', 'Co-worker', 'Teacher or lecturer', 'Mentor', 'Community leader'];
const STATUS = { pending: ['Waiting', 'amber'], confirmed: ['Confirmed ✓', 'verified'], declined: ['Not confirmed', 'red'] };

function Level({ n, title, done, means, children }) {
  return (
    <Card style={done && { borderColor: colors.teal }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[st.num, done && { backgroundColor: colors.teal }]}>
          {done ? <Ionicons name="checkmark" size={16} color={colors.white} /> : <Text style={{ fontWeight: '800', color: colors.muted }}>{n}</Text>}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={text.h3}>{title}</Text>
          <Text style={text.small}>{means}</Text>
        </View>
      </View>
      <View style={{ marginTop: 10 }}>{children}</View>
    </Card>
  );
}

// One skill: the three levels of proof and how to earn each
export function SkillBadges() {
  const { current, data, uid, isGuest, navigate, reload } = useApp();
  const skill = data.skills.find((s) => s.id === current.params.skillId);
  const ENDORSE_URL = endorseUrl();

  // Practical task
  const [task, setTask] = useState(null);
  const [taskError, setTaskError] = useState('');
  const [loadingTask, setLoadingTask] = useState(false);
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  // Endorsements
  const [ends, setEnds] = useState(null);
  const [form, setForm] = useState({ name: '', relationship: RELATIONSHIPS[0], contact: '' });
  const [asking, setAsking] = useState(false);
  const [endError, setEndError] = useState('');

  useEffect(() => { if (skill && !isGuest) api.endorsementsFor(skill.id).then(setEnds).catch(() => setEnds([])); }, [skill?.id]);

  if (isGuest) {
    return <Screen><BackHeader title="Skill proof" /><Note tone="amber">Create a free account to earn and keep skill badges.</Note><Button title="Create free account" onPress={() => navigate('Register')} /></Screen>;
  }
  if (!skill) return <Screen><BackHeader title="Skill proof" /><ErrorNote message="This skill is no longer on your profile." /></Screen>;

  const loadTask = async () => {
    try { setLoadingTask(true); setTaskError(''); setTask(await api.practicalTask(skill.id)); }
    catch (e) { setTaskError(api.friendlyError(e)); }
    finally { setLoadingTask(false); }
  };

  const pickPhoto = async (camera) => {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Camera needed', 'Allow the camera in your phone settings to take a photo of your work.'); return; }
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) { const a = res.assets[0]; setFile({ uri: a.uri, name: a.fileName || 'work.jpg', mimeType: a.mimeType || 'image/jpeg' }); }
  };
  const pickPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true });
    if (!res.canceled && res.assets?.[0]) setFile(res.assets[0]);
  };

  const submit = async () => {
    try {
      setChecking(true); setResult(null);
      const ext = ((file.name || '').split('.').pop() || 'jpg').toLowerCase();
      const path = `${uid}/${skill.id}/${Date.now()}.${ext}`;
      await api.uploadFile('skill-evidence', path, file.uri, file.mimeType || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg'));
      const r = await api.submitPractical(skill.id, path, description.trim());
      setResult(r);
      if (r.passed) { setFile(null); setDescription(''); await reload(); }
    } catch (e) {
      Alert.alert('Could not check your task', api.friendlyError(e));
    } finally {
      setChecking(false);
    }
  };

  const shareLink = async (e) => {
    const link = `${ENDORSE_URL}?t=${e.token}`;
    await Share.share({ message: `Hi ${e.endorser_name}, I'm building my SkillBridge profile. Could you confirm that I can do ${skill.name}? It takes one minute: ${link}` });
  };

  const ask = async () => {
    const name = form.name.trim(), contact = form.contact.trim();
    if (name.length < 2) { setEndError("Enter the person's name."); return; }
    if (contact.length < 5) { setEndError('Add their phone number or email, so employers can check.'); return; }
    try {
      setAsking(true); setEndError('');
      const e = await api.requestEndorsement(skill.id, { name, relationship: form.relationship, contact });
      setEnds((list) => [e, ...(list || [])]);
      setForm({ name: '', relationship: RELATIONSHIPS[0], contact: '' });
      await shareLink(e);
    } catch (err) {
      setEndError(api.friendlyError(err));
    } finally {
      setAsking(false);
    }
  };

  const cancel = (e) => Alert.alert('Cancel this request?', `${e.endorser_name}'s link will stop working.`, [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Cancel request', style: 'destructive', onPress: async () => { try { await api.cancelEndorsement(e.id); setEnds((l) => l.filter((x) => x.id !== e.id)); } catch (err) { Alert.alert('Could not cancel', api.friendlyError(err)); } } },
  ]);

  return (
    <Screen>
      <BackHeader title={skill.name} />
      <Text style={text.h1}>Prove your {skill.name}</Text>
      <Text style={[text.muted, { marginBottom: 6 }]}>Employers trust a skill more when there is proof. Each level adds stronger proof, and your job matches use it.</Text>
      <BadgeRow skill={skill} style={{ marginBottom: 10 }} />

      <Level n={1} title="Tested" done={skill.verified} means="Pass a knowledge test with 70% or more">
        {skill.verified
          ? <Text style={text.body}>Passed{skill.verified_score ? ` with ${skill.verified_score}%` : ''}.</Text>
          : <Button title="Take the test" onPress={() => navigate('Assessments')} style={{ minHeight: 44 }} />}
        <Text style={[text.small, { marginTop: 6 }]}>A test shows what you know. It does not prove you can do the work, so the next two levels matter.</Text>
      </Level>

      <Level n={2} title="Practical" done={skill.practical} means="Do a short real task and send a photo or PDF of it">
        {skill.practical ? (
          <Text style={text.body}>Your practical task passed the checklist.</Text>
        ) : !task ? (
          <>
            <ErrorNote message={taskError} />
            <Button title={loadingTask ? 'Getting your task...' : 'See the task'} variant="outline" onPress={loadTask} disabled={loadingTask} style={{ minHeight: 44 }} />
          </>
        ) : (
          <>
            <Text style={[text.body, { marginBottom: 8 }]}>{task.task.brief}</Text>
            <Text style={[text.small, { fontWeight: '700' }]}>What we check</Text>
            {task.task.checklist.map((c) => <Text key={c} style={[text.body, { marginTop: 4 }]}>• {c}</Text>)}
            {task.task.evidence_hint ? <Note style={{ marginTop: 10 }}>{task.task.evidence_hint}</Note> : null}
            {task.last && !task.last.passed && !result ? <Note tone="amber">Last try: {task.last.feedback}</Note> : null}
            <Field label="What did you do? (optional)" value={description} onChangeText={setDescription} placeholder="e.g. I fixed my cousin's cracked screen" autoCapitalize="sentences" multiline maxLength={600} />
            {file ? (
              <View style={st.fileRow}>
                <Ionicons name={/pdf/.test(file.mimeType || file.name) ? 'document-text-outline' : 'image-outline'} size={18} color={colors.teal} />
                <Text style={[text.body, { flex: 1, marginLeft: 8 }]} numberOfLines={1}>{file.name}</Text>
                <Pressable onPress={() => setFile(null)} hitSlop={10} accessibilityLabel="Remove file"><Ionicons name="close" size={18} color={colors.muted} /></Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Chip label="Take a photo" onPress={() => pickPhoto(true)} />
                <Chip label="Choose a photo" onPress={() => pickPhoto(false)} />
                <Chip label="Choose a PDF" onPress={pickPdf} />
              </View>
            )}
            <Button title={checking ? 'Checking your work...' : 'Send for checking'} onPress={submit} disabled={!file || checking} style={{ marginTop: 6 }} />
            <Text style={text.small}>Checked by AI against the checklist. Your file is kept private so you can show it to employers.</Text>
          </>
        )}
        {result ? (
          <Note tone={result.passed ? 'teal' : 'amber'} style={{ marginTop: 10 }}>
            {`${result.passed ? 'Passed. ' : 'Not yet. '}${result.feedback || ''}`}
          </Note>
        ) : null}
      </Level>

      <Level n={3} title="Endorsed" done={skill.endorsed} means="Someone who saw your work confirms it">
        {!ENDORSE_URL ? (
          <Note tone="amber">Endorsements are not switched on yet. The app team needs to add the confirm page (see SETUP.md).</Note>
        ) : (
          <>
            <Text style={[text.body, { marginBottom: 8 }]}>Ask a past boss, customer, teacher or mentor. They get a link and confirm in one minute. Employers can contact them to check, so ask someone real.</Text>
            <Field label="Their name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} autoCapitalize="words" placeholder="e.g. Nomsa Khumalo" />
            <Select label="How they know your work" value={form.relationship} options={RELATIONSHIPS} onChange={(v) => setForm({ ...form, relationship: v })} />
            <Field label="Their phone number or email" value={form.contact} onChangeText={(v) => setForm({ ...form, contact: v })} keyboardType="email-address" placeholder="071 000 0000" />
            <ErrorNote message={endError} />
            <Button title={asking ? 'Making the link...' : 'Send them a request'} onPress={ask} disabled={asking} style={{ minHeight: 44 }} />
          </>
        )}
        {ends === null ? <Loading /> : ends.map((e) => (
          <View key={e.id} style={st.endRow}>
            <View style={{ flex: 1 }}>
              <Text style={text.h3}>{e.endorser_name}</Text>
              <Text style={text.small}>{e.relationship} · {e.contact}</Text>
            </View>
            <Chip small label={STATUS[e.status][0]} tone={STATUS[e.status][1]} />
            {e.status === 'pending' ? (
              <View style={{ flexDirection: 'row' }}>
                {ENDORSE_URL ? <Pressable onPress={() => shareLink(e)} hitSlop={8} style={{ marginLeft: 6 }} accessibilityLabel={`Send ${e.endorser_name} the link again`}><Ionicons name="share-outline" size={20} color={colors.teal} /></Pressable> : null}
                <Pressable onPress={() => cancel(e)} hitSlop={8} style={{ marginLeft: 10 }} accessibilityLabel={`Cancel ${e.endorser_name}'s request`}><Ionicons name="trash-outline" size={20} color={colors.muted} /></Pressable>
              </View>
            ) : null}
          </View>
        ))}
      </Level>
    </Screen>
  );
}

const st = StyleSheet.create({
  num: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  fileRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.tealLight, borderRadius: radius.sm, padding: 10, marginBottom: 6 },
  endRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.bg, marginTop: 6 },
});
