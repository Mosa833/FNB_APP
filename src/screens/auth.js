import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import { Screen, BackHeader, Button, GoogleButton, Field, Divider, Note, Avatar, text } from '../ui';

export function Logo({ size = 96 }) {
  const w = size * 0.6;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: w, alignItems: 'center' }}>
        <View style={{ width: w, height: w / 2, borderTopLeftRadius: w / 2, borderTopRightRadius: w / 2, borderWidth: size * 0.07, borderBottomWidth: 0, borderColor: colors.teal }} />
        <View style={{ position: 'absolute', bottom: 0, left: w * 0.3, width: size * 0.06, height: w * 0.28, backgroundColor: colors.teal }} />
        <View style={{ position: 'absolute', bottom: 0, right: w * 0.3, width: size * 0.06, height: w * 0.28, backgroundColor: colors.teal }} />
        <View style={{ width: w * 1.05, height: size * 0.07, backgroundColor: colors.amber, borderRadius: 3 }} />
      </View>
    </View>
  );
}

const googleNotice = () =>
  Alert.alert('Google sign in', 'Google sign in needs a Google client ID before it can work. For now, please use the form.');

// 1. Splash
export function Splash() {
  const { reset } = useApp();
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => reset('Landing'), 2000);
    const d = setInterval(() => setDot((x) => (x + 1) % 3), 450);
    return () => { clearTimeout(t); clearInterval(d); };
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.tealDark, alignItems: 'center', justifyContent: 'center' }}>
      <Logo />
      <Text style={{ color: colors.white, fontSize: 32, fontWeight: '800', marginTop: 18 }}>SkillBridge</Text>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 4 }}>Your skills. Your income.</Text>
      <View style={{ flexDirection: 'row', position: 'absolute', bottom: 90 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 8, height: 8, borderRadius: 4, marginHorizontal: 4, backgroundColor: i === dot ? colors.white : 'rgba(255,255,255,0.4)' }} />
        ))}
      </View>
    </View>
  );
}

// 2. Landing
const SLIDES = [
  { title: 'Turn your skills into income', body: 'SkillBridge helps young people show what they can do and connect to real work.' },
  { title: 'Prove what you can do', body: 'Take short free tests. Every test you pass adds a verified badge employers can trust.' },
  { title: 'Find work close to home', body: 'See jobs that match your skills, with the travel cost shown before you apply.' },
];

export function Landing() {
  const { navigate, continueAsGuest, reset } = useApp();
  const [slide, setSlide] = useState(0);
  const sl = SLIDES[slide];
  return (
    <Screen>
      <Pressable onPress={() => setSlide((slide + 1) % SLIDES.length)} style={st.hero}>
        <View style={st.circleAmber} />
        <View style={st.circleTeal} />
        <View style={st.matchCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar text="TM" size={36} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={text.h3}>Thabo M.</Text>
              <Text style={text.small}>Excel ✓  Customer service ✓</Text>
            </View>
          </View>
          <View style={st.matchPill}><Text style={{ color: colors.tealDark, fontWeight: '800', fontSize: 12 }}>92% job match</Text></View>
        </View>
      </Pressable>
      <Text style={[text.h1, { marginTop: 20 }]}>{sl.title}</Text>
      <Text style={text.muted}>{sl.body}</Text>
      <View style={{ marginVertical: 14 }}>
        {['Build a profile that proves your skills', 'Get matched to jobs near you', 'Grow with mentors, CV and interview tools'].map((t) => (
          <Text key={t} style={[text.body, { marginBottom: 6 }]}><Text style={{ color: colors.teal }}>✓ </Text>{t}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 14 }}>
        {SLIDES.map((_, i) => (
          <Pressable key={i} onPress={() => setSlide(i)} hitSlop={8}>
            <View style={{ width: i === slide ? 20 : 8, height: 8, borderRadius: 4, marginHorizontal: 3, backgroundColor: i === slide ? colors.teal : colors.border }} />
          </Pressable>
        ))}
      </View>
      <Button title="Create account" onPress={() => navigate('Register')} />
      <Button title="Log in" variant="outline" onPress={() => navigate('Login')} />
      <Button title="Continue as guest" variant="link" onPress={() => { continueAsGuest(); reset('Home'); }} />
    </Screen>
  );
}

// 3. Register
export function Register() {
  const { navigate, register, reset, replace } = useApp();
  const [f, setF] = useState({ name: '', contact: '', username: '', password: '' });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const submit = () => {
    const e = {};
    if (f.name.trim().split(' ').length < 2) e.name = 'Please enter your first name and surname.';
    const isEmail = /^\S+@\S+\.\S+$/.test(f.contact.trim());
    const isPhone = /^0\d{9}$/.test(f.contact.replace(/\s/g, ''));
    if (!isEmail && !isPhone) e.contact = 'Enter a valid email or a 10 digit phone number.';
    if (f.username.trim().length < 3) e.username = 'Username needs at least 3 characters.';
    if (f.password.length < 8) e.password = 'Password needs at least 8 characters.';
    if (!agree) e.agree = 'Please agree to the Terms and Privacy Policy.';
    setErrors(e);
    if (Object.keys(e).length) return;
    register({
      name: f.name.trim(),
      username: f.username.trim(),
      email: isEmail ? f.contact.trim() : '',
      phone: isPhone ? f.contact.trim() : '',
    });
    reset('Home');
  };

  return (
    <Screen>
      <BackHeader />
      <Text style={text.h1}>Create your account</Text>
      <Text style={[text.muted, { marginBottom: 18 }]}>It's free and takes 1 minute.</Text>
      <Field label="Full name" value={f.name} onChangeText={set('name')} placeholder="e.g. Thabo Mokoena" autoCapitalize="words" error={errors.name} />
      <Field label="Email or phone number" value={f.contact} onChangeText={set('contact')} placeholder="you@email.com" keyboardType="email-address" error={errors.contact} />
      <Field label="Username" value={f.username} onChangeText={set('username')} placeholder="Choose a username" error={errors.username} />
      <Field label="Password" value={f.password} onChangeText={set('password')} placeholder="At least 8 characters" secure error={errors.password} />
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }} onPress={() => setAgree(!agree)}>
        <View style={[st.check, agree && { backgroundColor: colors.teal, borderColor: colors.teal }]}>
          {agree && <Ionicons name="checkmark" size={14} color={colors.white} />}
        </View>
        <Text style={text.body}>I agree to the Terms and Privacy Policy</Text>
      </Pressable>
      {errors.agree ? <Text style={{ color: colors.red, fontSize: 12, marginBottom: 6 }}>{errors.agree}</Text> : null}
      <Button title="Sign up" onPress={submit} style={{ marginTop: 10 }} />
      <Divider />
      <GoogleButton title="Sign up with Google" onPress={googleNotice} />
      <Text style={[text.body, { textAlign: 'center', marginTop: 12 }]}>
        Already have an account? <Text style={text.link} onPress={() => replace('Login')}>Log in</Text>
      </Text>
    </Screen>
  );
}

// 4. Login
export function Login() {
  const { navigate, login, continueAsGuest, reset, replace } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (!username.trim() || password.length < 8) {
      setError('Check your username and password. Passwords have at least 8 characters.');
      return;
    }
    login(username.trim());
    reset('Home');
  };
  return (
    <Screen>
      <BackHeader />
      <Text style={text.h1}>Welcome back</Text>
      <Text style={[text.muted, { marginBottom: 18 }]}>Log in to see your matches and progress.</Text>
      <Field label="Username or email" value={username} onChangeText={setUsername} placeholder="thabo_m" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secure error={error} />
      <Pressable onPress={() => navigate('Forgot')} style={{ alignSelf: 'flex-end', marginBottom: 12 }} hitSlop={8}>
        <Text style={text.link}>Forgot username or password?</Text>
      </Pressable>
      <Button title="Log in" onPress={submit} />
      <Divider />
      <GoogleButton title="Continue with Google" onPress={googleNotice} />
      <Pressable style={st.guestBox} onPress={() => { continueAsGuest(); reset('Home'); }}>
        <Text style={[text.link, { fontSize: 16 }]}>Continue as guest</Text>
        <Text style={[text.small, { textAlign: 'center', marginTop: 4 }]}>Look around first. Some features are limited for guests.</Text>
      </Pressable>
      <Text style={[text.body, { textAlign: 'center', marginTop: 12 }]}>
        New here? <Text style={text.link} onPress={() => replace('Register')}>Create account</Text>
      </Text>
    </Screen>
  );
}

// 5. Forgot username or password
export function Forgot() {
  const [tab, setTab] = useState('Password');
  const [contact, setContact] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const send = () => {
    const ok = /^\S+@\S+\.\S+$/.test(contact.trim()) || /^0\d{9}$/.test(contact.replace(/\s/g, ''));
    if (!ok) { setError('Enter the email or phone number on your account.'); return; }
    setError(''); setSent(true);
  };
  return (
    <Screen>
      <BackHeader />
      <View style={st.qIcon}><Text style={{ fontSize: 28, color: colors.teal }}>?</Text></View>
      <Text style={text.h1}>Forgot your details?</Text>
      <Text style={[text.muted, { marginBottom: 18 }]}>No stress. Tell us what you forgot and we'll help you get back in.</Text>
      <View style={st.segment}>
        {['Password', 'Username'].map((t) => (
          <Pressable key={t} onPress={() => { setTab(t); setSent(false); }} style={[st.segItem, tab === t && st.segActive]}>
            <Text style={{ fontWeight: '700', color: tab === t ? colors.text : colors.muted }}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Email or phone number" value={contact} onChangeText={(v) => { setContact(v); setSent(false); }} placeholder="thabo@email.com" keyboardType="email-address" error={error} />
      <Button title={tab === 'Password' ? 'Send reset link' : 'Send my username'} onPress={send} />
      {sent ? (
        <Note>{tab === 'Password' ? 'Reset link sent.' : 'Username sent.'} Check your email or SMS. It can take a few minutes.</Note>
      ) : (
        <Note>We'll send a link to your email or an SMS code to your phone. Check your spam folder if you don't see it.</Note>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { height: 210, borderRadius: radius.lg, backgroundColor: colors.tealLight, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  circleAmber: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#FBDDA0', top: 14, right: 20 },
  circleTeal: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: '#B3DEDA', bottom: -60, left: -40 },
  matchCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, width: '72%', borderWidth: 1, borderColor: colors.border },
  matchPill: { backgroundColor: colors.tealLight, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  guestBox: { backgroundColor: colors.tealLight, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 14 },
  qIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  segment: { flexDirection: 'row', backgroundColor: '#E4E9E8', borderRadius: radius.sm, padding: 4, marginBottom: 16 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  segActive: { backgroundColor: colors.white },
});
