import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import { supabase, isConfigured } from '../lib/supabase';
import * as api from '../lib/api';
import { LocationField } from '../components/Autocomplete';
import { Screen, BackHeader, Button, GoogleButton, Field, Divider, Note, Avatar, ErrorNote, text } from '../ui';

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

WebBrowser.maybeCompleteAuthSession();

// Google sign in through Supabase. Needs the Google provider turned on in Supabase (see SETUP.md).
async function signInWithGoogle() {
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  const url = new URL(result.url);
  const errText = url.searchParams.get('error_description');
  if (errText) throw new Error(errText);
  const code = url.searchParams.get('code');
  if (!code) throw new Error('Google sign in did not finish. Please try again.');
  const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exErr) throw exErr;
  return true;
}

function useGoogle() {
  const { startUserSession, reset } = useApp();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    try {
      setBusy(true);
      const ok = await signInWithGoogle();
      if (ok) { await startUserSession(); reset('Home'); }
    } catch (e) {
      Alert.alert('Google sign in', api.friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  return [run, busy];
}

// 1. Splash: opens the saved session if there is one
export function Splash() {
  const { reset, startUserSession, takeLinkNotice } = useApp();
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const d = setInterval(() => setDot((x) => (x + 1) % 3), 450);
    let cancelled = false;
    (async () => {
      const wait = new Promise((r) => setTimeout(r, 2000));
      let next = 'Landing';
      if (!isConfigured) next = 'Setup';
      else {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) { await startUserSession(); next = 'Home'; }
        } catch {
          next = 'Landing';
        }
      }
      await wait;
      if (cancelled) return;
      const notice = takeLinkNotice();
      if (notice && next !== 'Home') reset('Login', { notice });
      else reset(next);
    })();
    return () => { cancelled = true; clearInterval(d); };
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

// Shown only when the .env keys are missing
export function Setup() {
  return (
    <Screen>
      <Text style={[text.h1, { marginTop: 30 }]}>Connect Supabase</Text>
      <Text style={text.muted}>The app can't find your Supabase keys.</Text>
      <Note>
        1. Copy .env.example to a new file called .env{'\n'}
        2. Paste your Supabase project URL and publishable (anon) key{'\n'}
        3. Stop Expo and run: npx expo start --clear
      </Note>
      <Text style={text.small}>SETUP.md in the project folder has every step.</Text>
    </Screen>
  );
}

// 2. Landing
const SLIDES = [
  { title: 'Turn your skills into income', body: 'SkillBridge helps young people show what they can do and connect to real work.' },
  { title: 'Prove what you can do', body: 'Take short free tests. Every test you pass adds a verified badge employers can trust.' },
  { title: 'Find work close to home', body: 'See jobs that match your skills before you apply.' },
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
  const { startUserSession, reset, replace } = useApp();
  const [f, setF] = useState({ name: '', email: '', phone: '', username: '', password: '' });
  const [place, setPlace] = useState({ location: '', place_id: null });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);
  const [google, googleBusy] = useGoogle();
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const submit = async () => {
    const e = {};
    if (f.name.trim().split(/\s+/).length < 2) e.name = 'Please enter your first name and surname.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
    const phone = f.phone.replace(/\s/g, '');
    if (phone && !/^(0\d{9}|\+27\d{9})$/.test(phone)) e.phone = 'Use a 10 digit number like 071 000 0000.';
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(f.username.trim())) e.username = 'Use 3 to 20 letters, numbers, dots or underscores.';
    if (!place.location.trim()) e.location = 'Tell us where you live so we can find jobs near you.';
    if (f.password.length < 8) e.password = 'Password needs at least 8 characters.';
    if (!agree) e.agree = 'Please agree to the Terms and Privacy Policy.';
    setErrors(e);
    setServerError('');
    if (Object.keys(e).length) return;

    try {
      setBusy(true);
      const free = await api.usernameAvailable(f.username.trim());
      if (!free) { setErrors({ username: 'That username is taken. Try another one.' }); return; }
      const { data, error } = await supabase.auth.signUp({
        email: f.email.trim(),
        password: f.password,
        options: {
          // The confirmation link opens the app on the login screen (see handleIncomingLink in App.js)
          emailRedirectTo: Linking.createURL('email-confirmed'),
          data: { full_name: f.name.trim(), username: f.username.trim(), phone, location: place.location.trim(), place_id: place.place_id },
        },
      });
      if (error) throw error;
      if (!data.session) { setConfirmSent(true); return; } // email confirmation is switched on in Supabase
      await startUserSession();
      reset('Home');
    } catch (err) {
      setServerError(api.friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <Screen>
        <BackHeader />
        <Text style={text.h1}>Check your email</Text>
        <Text style={text.muted}>We sent a link to {f.email.trim()}. Open the email on this phone and tap the link. SkillBridge will open on the log in page.</Text>
        <Note style={{ marginTop: 14 }}>Opened the email on a computer instead? Your account is still confirmed. Come back to the app and log in.</Note>
        <Button title="Go to log in" onPress={() => replace('Login')} style={{ marginTop: 10 }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader />
      <Text style={text.h1}>Create your account</Text>
      <Text style={[text.muted, { marginBottom: 18 }]}>It's free and takes 1 minute.</Text>
      <Field label="Full name" value={f.name} onChangeText={set('name')} placeholder="e.g. Thabo Mokoena" autoCapitalize="words" error={errors.name} />
      <Field label="Email" value={f.email} onChangeText={set('email')} placeholder="you@email.com" keyboardType="email-address" error={errors.email} />
      <Field label="Phone number (optional)" value={f.phone} onChangeText={set('phone')} placeholder="071 000 0000" keyboardType="phone-pad" error={errors.phone} />
      <Field label="Username" value={f.username} onChangeText={set('username')} placeholder="Choose a username" error={errors.username} />
      <LocationField value={place} onChange={setPlace} error={errors.location} />
      <Field label="Password" value={f.password} onChangeText={set('password')} placeholder="At least 8 characters" secure error={errors.password} />
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }} onPress={() => setAgree(!agree)}>
        <View style={[st.check, agree && { backgroundColor: colors.teal, borderColor: colors.teal }]}>
          {agree && <Ionicons name="checkmark" size={14} color={colors.white} />}
        </View>
        <Text style={text.body}>I agree to the Terms and Privacy Policy</Text>
      </Pressable>
      {errors.agree ? <Text style={{ color: colors.red, fontSize: 12, marginBottom: 6 }}>{errors.agree}</Text> : null}
      <ErrorNote message={serverError} />
      <Button title="Sign up" onPress={submit} loading={busy} style={{ marginTop: 10 }} />
      <Divider />
      <GoogleButton title={googleBusy ? 'Opening Google...' : 'Sign up with Google'} onPress={google} />
      <Text style={[text.body, { textAlign: 'center', marginTop: 12 }]}>
        Already have an account? <Text style={text.link} onPress={() => replace('Login')}>Log in</Text>
      </Text>
    </Screen>
  );
}

// 4. Login
export function Login() {
  const { navigate, startUserSession, continueAsGuest, reset, replace, current } = useApp();
  const notice = current.params?.notice;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [google, googleBusy] = useGoogle();

  const submit = async () => {
    if (!identifier.trim() || !password) { setError('Enter your username or email and your password.'); return; }
    try {
      setBusy(true);
      setError('');
      const email = await api.emailForLogin(identifier);
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      await startUserSession();
      reset('Home');
    } catch (err) {
      setError(api.friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackHeader />
      <Text style={text.h1}>Welcome back</Text>
      <Text style={[text.muted, { marginBottom: 18 }]}>Log in to see your matches and progress.</Text>
      {notice ? <Note tone={notice.ok ? 'teal' : 'amber'}>{notice.text}</Note> : null}
      <Field label="Username or email" value={identifier} onChangeText={setIdentifier} placeholder="thabo_m" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secure />
      <ErrorNote message={error} />
      <Pressable onPress={() => navigate('Forgot')} style={{ alignSelf: 'flex-end', marginBottom: 12 }} hitSlop={8}>
        <Text style={text.link}>Forgot username or password?</Text>
      </Pressable>
      <Button title="Log in" onPress={submit} loading={busy} />
      <Divider />
      <GoogleButton title={googleBusy ? 'Opening Google...' : 'Continue with Google'} onPress={google} />
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
  const { startUserSession, reset } = useApp();
  const [tab, setTab] = useState('Password');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter the email on your account.'); return; }
    try {
      setBusy(true); setError('');
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (err) throw err;
      setStep('code');
    } catch (err) {
      setError(api.friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const setNewPassword = async () => {
    if (!/^\d{6,10}$/.test(code.trim())) { setError('Enter the code from the email.'); return; }
    if (password.length < 8) { setError('Your new password needs at least 8 characters.'); return; }
    try {
      setBusy(true); setError('');
      const { error: e1 } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
      if (e1) throw e1;
      const { error: e2 } = await supabase.auth.updateUser({ password });
      if (e2) throw e2;
      await startUserSession();
      Alert.alert('Password changed', 'You are now logged in with your new password.');
      reset('Home');
    } catch (err) {
      setError(api.friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackHeader />
      <View style={st.qIcon}><Text style={{ fontSize: 28, color: colors.teal }}>?</Text></View>
      <Text style={text.h1}>Forgot your details?</Text>
      <Text style={[text.muted, { marginBottom: 18 }]}>No stress. Tell us what you forgot and we'll help you get back in.</Text>
      <View style={st.segment}>
        {['Password', 'Username'].map((t) => (
          <Pressable key={t} onPress={() => { setTab(t); setError(''); }} style={[st.segItem, tab === t && st.segActive]}>
            <Text style={{ fontWeight: '700', color: tab === t ? colors.text : colors.muted }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'Username' ? (
        <>
          <Note>You can log in with your email address instead of your username. After you log in, your username is under More, then Account details.</Note>
          <Note>If you also forgot your password, use the Password tab first.</Note>
        </>
      ) : step === 'email' ? (
        <>
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="thabo@email.com" keyboardType="email-address" />
          <ErrorNote message={error} />
          <Button title="Send reset code" onPress={sendCode} loading={busy} />
          <Note>We'll email you a code. Check your spam folder if you don't see it.</Note>
        </>
      ) : (
        <>
          <Note>We sent a code to {email.trim()}. Enter it below with your new password.</Note>
          <Field label="Code from the email" value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" />
          <Field label="New password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secure />
          <ErrorNote message={error} />
          <Button title="Save new password" onPress={setNewPassword} loading={busy} />
          <Button title="Send a new code" variant="link" onPress={() => { setStep('email'); setCode(''); }} />
        </>
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
