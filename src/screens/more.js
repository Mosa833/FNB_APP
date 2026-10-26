import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Switch, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import * as api from '../lib/api';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Screen, BackHeader, Button, Field, Card, ErrorNote, text } from '../ui';

// 21. More: logout and delete account
export function More() {
  const { navigate, logout, clearSession, reset, isGuest } = useApp();
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();

  const rows = [
    ['Account details', 'AccountDetails'],
    ['Notifications', 'Notifications'],
    ['Privacy and data', 'Privacy'],
    ['Help and support', 'Help'],
  ];

  const doLogout = async () => { await logout(); reset('Landing'); };
  const doDelete = async () => {
    try {
      setBusy(true); setError('');
      await api.deleteAccount();
      await logout();
      setSheet(false);
      clearSession();
      reset('Landing');
      Alert.alert('Account deleted', 'Your profile, badges, certificates and interview recordings have been removed.');
    } catch (e) {
      setError(api.friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={text.h1}>More</Text>
      {rows.map(([label, go]) => (
        <Pressable key={label} style={st.row} onPress={() => navigate(go)}>
          <Text style={[text.body, { flex: 1 }]}>{label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ))}
      {isGuest ? (
        <>
          <Pressable style={st.row} onPress={() => navigate('Register')}><Text style={[text.body, { color: colors.teal, fontWeight: '700' }]}>Create free account</Text></Pressable>
          <Pressable style={st.row} onPress={doLogout}><Text style={[text.body, { color: colors.tealDark, fontWeight: '700' }]}>Leave guest mode</Text></Pressable>
        </>
      ) : (
        <>
          <Pressable style={st.row} onPress={doLogout}><Text style={[text.body, { color: colors.tealDark, fontWeight: '700' }]}>Log out</Text></Pressable>
          <Pressable style={st.row} onPress={() => { setConfirm(''); setSheet(true); }}><Text style={[text.body, { color: colors.red, fontWeight: '700' }]}>Delete account</Text></Pressable>
        </>
      )}

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={st.backdrop} onPress={() => setSheet(false)} />
          <View style={[st.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={st.handle} />
            <Text style={text.h2}>Delete your account?</Text>
            <Text style={[text.muted, { marginVertical: 8 }]}>This removes your profile, skill badges, certificates and interview recordings. You can't undo this.</Text>
            <Field label="Type DELETE to confirm" value={confirm} onChangeText={setConfirm} placeholder="DELETE" autoCapitalize="characters" />
            <ErrorNote message={error} />
            <Button title="Delete my account" variant="danger" disabled={confirm.trim() !== 'DELETE'} loading={busy} onPress={doDelete} />
            <Button title="Cancel" variant="plain" onPress={() => setSheet(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

export function AccountDetails() {
  const { data, isGuest, navigate } = useApp();
  if (isGuest) {
    return (
      <Screen>
        <BackHeader title="Account details" />
        <Text style={text.muted}>You're using SkillBridge as a guest, so there is no account yet.</Text>
        <Button title="Create free account" onPress={() => navigate('Register')} style={{ marginTop: 16 }} />
      </Screen>
    );
  }
  const p = data.profile;
  const rows = [['Full name', p.full_name], ['Username', p.username || 'Not set'], ['Email', p.email || 'Not added'], ['Phone', p.phone || 'Not added'], ['Area', p.location || 'Not added']];
  return (
    <Screen>
      <BackHeader title="Account details" />
      <Card>
        {rows.map(([k, v]) => (
          <View key={k} style={{ paddingVertical: 8 }}>
            <Text style={text.small}>{k}</Text>
            <Text style={text.body}>{v}</Text>
          </View>
        ))}
      </Card>
      <Button title="Edit details" variant="outline" onPress={() => navigate('EditProfile')} />
    </Screen>
  );
}

export function Notifications() {
  const [n, setN] = useState({ jobs: true, mentors: true, tips: false, sms: true });
  const items = [['jobs', 'New job matches'], ['mentors', 'Mentor replies'], ['tips', 'Weekly career tips'], ['sms', 'Send important alerts by SMS']];
  return (
    <Screen>
      <BackHeader title="Notifications" />
      {items.map(([k, label]) => (
        <View key={k} style={st.row}>
          <Text style={[text.body, { flex: 1 }]}>{label}</Text>
          <Switch value={n[k]} onValueChange={(v) => setN({ ...n, [k]: v })} trackColor={{ true: colors.teal, false: colors.border }} thumbColor={colors.white} />
        </View>
      ))}
    </Screen>
  );
}

// Roughly how much mobile data each feature uses, so people can plan
const DATA_USE = [
  ['Opening the app and Jobs', 'Under 1 MB'],
  // iPhone records 16 kHz mono WAV (32 KB a second); Android records 32 kbps AAC (4 KB a second)
  ['Interview practice, recorded on iPhone', 'About 2 MB per minute of answers'],
  ['Interview practice, recorded on Android', 'About 0.25 MB per minute of answers'],
  ['Interview practice, typed (data saver)', 'Under 0.5 MB per session'],
  ['Practical task photo', 'About 1 MB per photo'],
  ['Career coach message', 'Almost nothing'],
];

// What SkillBridge keeps and why, in plain words (POPIA)
const NOTICE = [
  ['What we keep', 'Your account details, your profile (skills, education, experience, languages, the work you want), test results, interview practice answers and feedback, coach messages, and jobs you save or apply for.'],
  ['Why', 'To show you jobs that fit, give you feedback, and build your CV. We never sell your information or show you adverts.'],
  ['Who sees it', 'Only you. Employers only see your profile if "Show my profile to employers" is on. AI services (Google Gemini and Groq) process your answers and CV to give feedback; they get no name or ID number.'],
  ['CVs and recordings', 'An uploaded CV is deleted as soon as it has been read. Interview recordings are only used to give you feedback.'],
  ['Your rights', 'You can see and download your information below, change it in your profile, and delete your account and everything in it from the More tab.'],
  ['Questions or complaints', 'Contact the SkillBridge information officer (the team lead) through Help and support. You can also complain to the Information Regulator (inforegulator.org.za).'],
];

export function Privacy() {
  const { data, isGuest, updateProfile, dataSaver, setDataSaver } = useApp();
  const [visible, setVisible] = useState(data.profile.visible_to_employers !== false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const toggle = async (v) => {
    setVisible(v);
    if (isGuest) return;
    try { await updateProfile({ visible_to_employers: v }); } catch (e) { setVisible(!v); setError(api.friendlyError(e)); }
  };

  const download = async () => {
    try {
      setExporting(true);
      const all = await api.exportMyData();
      const f = new File(Paths.cache, 'skillbridge-my-data.json');
      try { f.create({ overwrite: true }); } catch {}
      await f.write(JSON.stringify(all, null, 2));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'Save your SkillBridge data' });
      else Alert.alert('Your data is ready', f.uri);
    } catch (e) {
      Alert.alert('Could not download your data', api.friendlyError(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen>
      <BackHeader title="Privacy and data" />

      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Text style={text.body}>Data saver</Text>
          <Text style={text.small}>No camera preview or photos, and interview answers are typed instead of recorded.</Text>
        </View>
        <Switch value={dataSaver} onValueChange={setDataSaver} trackColor={{ true: colors.teal, false: colors.border }} thumbColor={colors.white} accessibilityLabel="Data saver" />
      </View>

      {!isGuest && (
        <View style={st.row}>
          <View style={{ flex: 1 }}>
            <Text style={text.body}>Show my profile to employers</Text>
            <Text style={text.small}>Your name, skills, badges and experience. Never your ID number.</Text>
          </View>
          <Switch value={visible} onValueChange={toggle} trackColor={{ true: colors.teal, false: colors.border }} thumbColor={colors.white} accessibilityLabel="Show my profile to employers" />
        </View>
      )}
      <ErrorNote message={error} />

      <Text style={[text.h3, { marginTop: 16, marginBottom: 6 }]}>How much data each feature uses</Text>
      <Card>
        {DATA_USE.map(([what, how]) => (
          <View key={what} style={{ flexDirection: 'row', paddingVertical: 6 }}>
            <Text style={[text.body, { flex: 1 }]}>{what}</Text>
            <Text style={[text.body, { fontWeight: '700' }]}>{how}</Text>
          </View>
        ))}
        <Text style={[text.small, { marginTop: 4 }]}>Rough amounts. Wi-Fi uses none of your mobile data.</Text>
      </Card>

      <Text style={[text.h3, { marginTop: 10, marginBottom: 6 }]}>How we use your information</Text>
      {NOTICE.map(([t, b]) => (
        <View key={t} style={{ marginBottom: 10 }}>
          <Text style={[text.body, { fontWeight: '700' }]}>{t}</Text>
          <Text style={text.muted}>{b}</Text>
        </View>
      ))}
      <Text style={text.small}>SkillBridge follows the Protection of Personal Information Act (POPIA).</Text>

      {!isGuest && <Button title={exporting ? 'Preparing your data...' : 'Download my data'} variant="outline" onPress={download} disabled={exporting} style={{ marginTop: 14 }} />}
    </Screen>
  );
}

export function Help() {
  const faqs = [
    ['How do I get a verified badge?', 'Go to Home, tap Take a skills test and pass with 70% or more.'],
    ['Why can\'t I use the CV builder?', 'The CV builder and interview practice are for registered users. Creating an account is free.'],
    ['How many interview practices do I get?', 'Three graded sessions each month. They reset on the 1st. Sessions you leave early do not count.'],
    ['Which skills tests can I take?', 'You get a test for each skill on your profile. If a skill has no test yet, tap Create my test.'],
    ['How is the travel cost worked out?', 'For now it is an estimate based on distance and normal taxi fares.'],
  ];
  return (
    <Screen>
      <BackHeader title="Help and support" />
      {faqs.map(([q, a]) => (
        <Card key={q}>
          <Text style={text.h3}>{q}</Text>
          <Text style={[text.muted, { marginTop: 4 }]}>{a}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 52 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
});
