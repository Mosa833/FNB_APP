import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Switch, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import { Screen, BackHeader, Button, Field, Card, text } from '../ui';

// 21. More: logout and delete account
export function More() {
  const { navigate, logout, reset, isGuest } = useApp();
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState('');
  const insets = useSafeAreaInsets();

  const rows = [
    ['Account details', 'AccountDetails'],
    ['Notifications', 'Notifications'],
    ['Privacy and data', 'Privacy'],
    ['Help and support', 'Help'],
  ];

  const doLogout = () => { logout(); reset('Landing'); };
  const doDelete = () => {
    setSheet(false);
    logout();
    reset('Landing');
    Alert.alert('Account deleted', 'Your profile, badges, CVs and interview videos have been removed.');
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
            <Text style={[text.muted, { marginVertical: 8 }]}>This removes your profile, skill badges, CVs and interview videos. You can't undo this.</Text>
            <Field label="Type DELETE to confirm" value={confirm} onChangeText={setConfirm} placeholder="DELETE" autoCapitalize="characters" />
            <Button title="Delete my account" variant="danger" disabled={confirm.trim() !== 'DELETE'} onPress={doDelete} />
            <Button title="Cancel" variant="plain" onPress={() => setSheet(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

export function AccountDetails() {
  const { user, isGuest, navigate } = useApp();
  if (isGuest) {
    return (
      <Screen>
        <BackHeader title="Account details" />
        <Text style={text.muted}>You're using SkillBridge as a guest, so there is no account yet.</Text>
        <Button title="Create free account" onPress={() => navigate('Register')} style={{ marginTop: 16 }} />
      </Screen>
    );
  }
  const rows = [['Full name', user.name], ['Username', user.username], ['Email', user.email || 'Not added'], ['Phone', user.phone || 'Not added'], ['Area', user.location]];
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

export function Privacy() {
  const [lowData, setLowData] = useState(true);
  const [visible, setVisible] = useState(true);
  return (
    <Screen>
      <BackHeader title="Privacy and data" />
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Text style={text.body}>Show my profile to employers</Text>
          <Text style={text.small}>Only your name, skills and badges are shown.</Text>
        </View>
        <Switch value={visible} onValueChange={setVisible} trackColor={{ true: colors.teal, false: colors.border }} thumbColor={colors.white} />
      </View>
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Text style={text.body}>Low data mode</Text>
          <Text style={text.small}>Videos upload only on Wi-Fi.</Text>
        </View>
        <Switch value={lowData} onValueChange={setLowData} trackColor={{ true: colors.teal, false: colors.border }} thumbColor={colors.white} />
      </View>
      <Text style={[text.muted, { marginTop: 16 }]}>We follow the Protection of Personal Information Act (POPIA). We never sell your data. You can delete your account at any time from the More tab.</Text>
    </Screen>
  );
}

export function Help() {
  const faqs = [
    ['How do I get a verified badge?', 'Go to Home, tap Take a skills test and pass with 70% or more.'],
    ['Why can\'t I use the CV builder?', 'The CV builder and interview practice are for registered users. Creating an account is free.'],
    ['How many interview practices do I get?', 'Three sessions each month. They reset on the 1st.'],
    ['How is the travel cost worked out?', 'It is an estimate based on distance and normal taxi fares in your area.'],
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
