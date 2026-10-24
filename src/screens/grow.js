import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import { MENTORS, GUIDES, TIPS, INTERVIEW_QUESTIONS } from '../data';
import { Screen, BackHeader, Button, Card, Chip, Field, Select, Progress, Avatar, Note, SectionTitle, text } from '../ui';

// 15. Career development hub
export function Grow() {
  const { navigate, isGuest, interview } = useApp();
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const items = [
    { icon: 'happy-outline', title: 'Mentorship and guidance', body: 'Chat with mentors and read career tips', go: 'Mentorship' },
    { icon: 'document-text-outline', title: 'CV builder', body: 'Create a CV from your profile in minutes', go: isGuest ? 'Locked' : 'CVBuilder', locked: isGuest },
    { icon: 'play', title: 'Interview practice', body: 'Answer real questions on video', go: isGuest ? 'Locked' : 'InterviewSetup', locked: isGuest,
      extra: isGuest ? null : `${interview.left} of ${interview.limit} sessions left this month` },
  ];
  return (
    <Screen>
      <Text style={text.h1}>Career development</Text>
      <Text style={[text.muted, { marginBottom: 16 }]}>Get ready for work, one step at a time.</Text>
      {items.map((it) => (
        <Card key={it.title} onPress={() => navigate(it.go, { feature: it.title })} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18 }}>
          <View style={st.hubIcon}><Ionicons name={it.icon} size={20} color={colors.teal} /></View>
          <View style={{ flex: 1 }}>
            <Text style={text.h3}>{it.title}</Text>
            <Text style={text.muted}>{it.body}</Text>
            {it.extra && <Text style={{ color: '#9A5B00', fontWeight: '700', marginTop: 4, fontSize: 13 }}>{it.extra}</Text>}
          </View>
          <Ionicons name={it.locked ? 'lock-closed' : 'chevron-forward'} size={18} color={colors.muted} />
        </Card>
      ))}
      <Note>Tip of the day: {tip}</Note>
    </Screen>
  );
}

// 16. Mentorship
export function Mentorship() {
  const { isGuest, navigate, bookings, book } = useApp();
  const onBook = (m) => {
    if (isGuest) return navigate('Locked', { feature: 'Booking a mentor' });
    book(m.id);
    Alert.alert('Chat requested', `${m.name} will confirm a time with you by SMS or email.`);
  };
  return (
    <Screen>
      <BackHeader title="Mentorship" />
      {isGuest && <Note tone="amber">You're browsing as a guest. You can read tips, but sign up to book a mentor.</Note>}
      {MENTORS.map((m) => (
        <Card key={m.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar text={m.initials} size={42} bg={colors.teal} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={text.h3}>{m.name}</Text>
              <Text style={text.small}>{m.role}</Text>
            </View>
            <Text style={{ fontWeight: '700', color: colors.text }}>{m.rating} <Text style={{ color: colors.amber }}>★</Text></Text>
          </View>
          <Text style={[text.muted, { marginVertical: 8 }]}>{m.about}</Text>
          <Button
            title={bookings.includes(m.id) ? 'Chat requested ✓' : 'Book a chat'}
            variant={isGuest ? 'plain' : 'primary'}
            icon={isGuest ? <Ionicons name="lock-closed" size={14} color={colors.muted} style={{ marginRight: 6 }} /> : null}
            disabled={bookings.includes(m.id)}
            onPress={() => onBook(m)}
            style={{ minHeight: 42 }}
          />
        </Card>
      ))}
      <SectionTitle title="Free guides" />
      {GUIDES.map((g, i) => (
        <Card key={g.title} onPress={() => navigate('Guide', { index: i })} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[text.body, { flex: 1 }]}>{g.title}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Card>
      ))}
    </Screen>
  );
}

export function Guide() {
  const { current } = useApp();
  const g = GUIDES[current.params.index];
  return (
    <Screen>
      <BackHeader title="Guide" />
      <Text style={text.h1}>{g.title}</Text>
      <Text style={[text.body, { marginTop: 8, lineHeight: 23 }]}>{g.body}</Text>
    </Screen>
  );
}

// 18. Locked feature
export function Locked() {
  const { navigate, goBack, current } = useApp();
  const feature = current.params.feature || 'This feature';
  return (
    <Screen>
      <BackHeader title={feature} />
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <View style={st.lockIcon}><Ionicons name="lock-closed" size={30} color={colors.teal} /></View>
        <Text style={[text.h1, { textAlign: 'center', marginTop: 16 }]}>Create a free account to unlock this</Text>
        <Text style={[text.muted, { textAlign: 'center' }]}>{feature} is only for registered users.</Text>
      </View>
      <Card style={{ marginTop: 20 }}>
        {['Build and download your CV', '3 video interview practices a month', 'Book mentors and save jobs', 'Keep your verified skill badges'].map((t) => (
          <Text key={t} style={[text.body, { marginBottom: 8 }]}><Text style={{ color: colors.teal }}>✓ </Text>{t}</Text>
        ))}
      </Card>
      <Button title="Create free account" onPress={() => navigate('Register')} />
      <Button title="Maybe later" variant="link" onPress={goBack} />
    </Screen>
  );
}

// 17. CV builder
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function cvHtml(cv, style) {
  const accent = style === 'Classic' ? colors.teal : '#222222';
  const section = (title, body) => `<h2 style="color:${accent};font-size:13px;letter-spacing:1px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:22px">${title}</h2>${body}`;
  return `<html><body style="font-family:'Times New Roman',serif;font-size:12pt;color:#222;padding:36px">
    <h1 style="margin:0;font-size:24px;color:${accent}">${esc(cv.name)}</h1>
    <p style="margin:4px 0 0;color:#555">${esc([cv.location, cv.phone, cv.email].filter(Boolean).join(' · '))}</p>
    ${section('PROFILE', `<p>${esc(cv.summary)}</p>`)}
    ${section('SKILLS', `<p>${esc(cv.skills)}</p>`)}
    ${section('EDUCATION', `<p>${esc(cv.education)}</p>`)}
    ${section('EXPERIENCE', cv.experience.map((e) => `<p><b>${esc(e.title)}</b>, ${esc(e.period)}</p>`).join(''))}
  </body></html>`;
}

export function CVBuilder() {
  const { user, profile } = useApp();
  const [step, setStep] = useState(1);
  const [style, setStyle] = useState('Classic');
  const [busy, setBusy] = useState(false);
  const blank = { name: '', location: '', phone: '', email: '', summary: '', skills: '', education: '', experience: [] };
  const [cv, setCv] = useState(blank);
  const [exp, setExp] = useState({ title: '', period: '' });
  const set = (k) => (v) => setCv({ ...cv, [k]: v });

  const fillFromProfile = () => {
    const verified = profile.skills.filter((s) => s.verified).map((s) => s.name.toLowerCase());
    setCv({
      name: user.name,
      location: user.location?.split(',')[0] || '',
      phone: user.phone || '',
      email: user.email || '',
      summary: `Hardworking ${profile.education.some((e) => e.end === 'Still studying') ? 'student' : 'young professional'}${verified.length ? ` with verified ${verified.join(' and ')} skills` : ''}.`,
      skills: profile.skills.map((s) => (s.verified ? `${s.name} (verified)` : s.name)).join(' · '),
      education: profile.education.map((e) => `${e.title}${e.end === 'Still studying' ? ' (in progress)' : ` ${e.end}`}`).join(' · '),
      experience: profile.experience,
    });
  };

  const download = async () => {
    try {
      setBusy(true);
      const { uri } = await Print.printToFileAsync({ html: cvHtml(cv, style) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save or share your CV', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('PDF ready', `Saved to ${uri}`);
      }
    } catch (e) {
      Alert.alert('Could not create PDF', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const titles = ['Your details', 'About you', 'Experience', 'Preview'];
  return (
    <Screen>
      <BackHeader title="CV builder" />
      <Text style={text.small}>Step {step} of 4: {titles[step - 1]}</Text>
      <Progress value={step * 25} track={colors.border} />
      <View style={{ height: 14 }} />

      {step === 1 && (
        <>
          <Button title="Fill in from my profile" variant="outline" onPress={fillFromProfile} />
          <View style={{ height: 10 }} />
          <Field label="Full name" value={cv.name} onChangeText={set('name')} autoCapitalize="words" />
          <Field label="Area" value={cv.location} onChangeText={set('location')} autoCapitalize="words" />
          <Field label="Phone" value={cv.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
          <Field label="Email" value={cv.email} onChangeText={set('email')} keyboardType="email-address" />
        </>
      )}
      {step === 2 && (
        <>
          <Field label="Short profile (one or two sentences)" value={cv.summary} onChangeText={set('summary')} autoCapitalize="sentences" />
          <Field label="Skills" value={cv.skills} onChangeText={set('skills')} autoCapitalize="sentences" />
          <Field label="Education" value={cv.education} onChangeText={set('education')} autoCapitalize="sentences" />
        </>
      )}
      {step === 3 && (
        <>
          <Note>Informal work counts. Fixing phones, selling, tutoring or volunteering all show employers what you can do.</Note>
          {cv.experience.map((e, i) => (
            <Card key={`${e.title}${i}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}><Text style={text.h3}>{e.title}</Text><Text style={text.small}>{e.period}</Text></View>
              <Pressable onPress={() => setCv({ ...cv, experience: cv.experience.filter((_, x) => x !== i) })} hitSlop={10}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </Card>
          ))}
          <Field label="What you did" value={exp.title} onChangeText={(v) => setExp({ ...exp, title: v })} placeholder="e.g. Phone repairs (self-employed)" autoCapitalize="sentences" />
          <Field label="When" value={exp.period} onChangeText={(v) => setExp({ ...exp, period: v })} placeholder="e.g. 2023 to now" autoCapitalize="sentences" />
          <Button title="+ Add experience" variant="outline" disabled={!exp.title.trim()} onPress={() => { setCv({ ...cv, experience: [...cv.experience, exp] }); setExp({ title: '', period: '' }); }} />
        </>
      )}
      {step === 4 && (
        <>
          <View style={st.cvPaper}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: style === 'Classic' ? colors.teal : colors.text }}>{cv.name || 'Your name'}</Text>
            <Text style={text.small}>{[cv.location, cv.phone, cv.email].filter(Boolean).join(' · ')}</Text>
            {[['PROFILE', cv.summary], ['SKILLS', cv.skills], ['EDUCATION', cv.education], ['EXPERIENCE', cv.experience.map((e) => `${e.title}, ${e.period}`).join('\n')]].map(([h, b]) => (
              <View key={h} style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: style === 'Classic' ? colors.teal : colors.text, letterSpacing: 1 }}>{h}</Text>
                <Text style={[text.body, { fontSize: 13 }]}>{b || 'Not added yet'}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Button title="Change style" variant="outline" onPress={() => setStyle(style === 'Classic' ? 'Simple' : 'Classic')} style={{ flex: 1, marginRight: 6 }} />
            <Button title={busy ? 'Creating...' : 'Download PDF'} onPress={download} disabled={busy || !cv.name} style={{ flex: 1, marginLeft: 6 }} />
          </View>
        </>
      )}

      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        {step > 1 && <Button title="Back" variant="plain" onPress={() => setStep(step - 1)} style={{ flex: 1, marginRight: 6 }} />}
        {step < 4 && <Button title="Next" onPress={() => setStep(step + 1)} style={{ flex: 1, marginLeft: step > 1 ? 6 : 0 }} />}
      </View>
    </Screen>
  );
}

// 19. Interview practice setup
const nextMonthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
};

export function InterviewSetup() {
  const { interview, navigate } = useApp();
  const [jobType, setJobType] = useState('Admin and office work');
  const [qType, setQType] = useState('General');
  const [minutes, setMinutes] = useState(2);
  const used = interview.limit - interview.left;
  return (
    <Screen>
      <BackHeader title="Interview practice" />
      <View style={st.tracker}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: colors.white, fontWeight: '700' }}>This month</Text>
          <Text style={{ color: colors.amber, fontWeight: '800' }}>{interview.left} of {interview.limit} left</Text>
        </View>
        <Progress value={(interview.left / interview.limit) * 100} />
        <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8, fontSize: 12 }}>Resets on {nextMonthStart()}</Text>
      </View>
      <Select label="Job type" value={jobType} options={Object.keys(INTERVIEW_QUESTIONS)} onChange={setJobType} />
      <Text style={st.label}>Question type</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['General', 'Skills', 'Problem solving'].map((q) => <Chip key={q} label={q} active={qType === q} onPress={() => setQType(q)} />)}
      </View>
      <Text style={[st.label, { marginTop: 6 }]}>Answer time per question</Text>
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3].map((m) => <Chip key={m} label={`${m} min`} active={minutes === m} onPress={() => setMinutes(m)} />)}
      </View>
      {interview.left === 0 && <Note tone="amber">You've used all {interview.limit} sessions this month ({used} used). New sessions open on {nextMonthStart()}.</Note>}
      <Button
        title="▶  Start practice (5 questions)"
        disabled={interview.left === 0}
        onPress={() => navigate('VideoAnswer', { jobType, qType, seconds: minutes * 60 })}
        style={{ marginTop: 10 }}
      />
      <SectionTitle title="Past sessions" />
      {interview.past.length === 0 && <Text style={text.muted}>No sessions yet.</Text>}
      {interview.past.map((p, i) => (
        <View key={`${p.label}${i}`} style={st.pastRow}>
          <Text style={[text.body, { flex: 1 }]}>{p.label}</Text>
          <Chip small label={p.rating} tone={p.rating === 'Good' ? 'verified' : 'amber'} />
        </View>
      ))}
    </Screen>
  );
}

// 20. Video answer
export function VideoAnswer() {
  const { current, replace, finishInterview, goBack } = useApp();
  const { jobType, qType, seconds } = current.params;
  const questions = INTERVIEW_QUESTIONS[jobType][qType];
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  const [answered, setAnswered] = useState([]);
  const timer = useRef(null);

  useEffect(() => {
    if (recording) {
      timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(timer.current);
  }, [recording]);

  useEffect(() => { if (elapsed >= seconds) setRecording(false); }, [elapsed]);

  const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  const retry = () => { setRecording(false); setElapsed(0); };
  const next = () => {
    setRecording(false);
    const list = [...answered, elapsed];
    setAnswered(list);
    if (index < questions.length - 1) { setIndex(index + 1); setElapsed(0); }
    else {
      const good = list.filter((t) => t >= 20).length;
      const rating = good >= 4 ? 'Good' : 'Keep practising';
      finishInterview(jobType, rating);
      Alert.alert('Session complete', good >= 4
        ? 'Nice work. You gave full answers to most questions.'
        : 'Try to speak for at least 20 seconds on each question next time.', [{ text: 'Done', onPress: goBack }]);
    }
  };
  const quit = () => Alert.alert('End session?', 'This session will not count towards your monthly limit.', [
    { text: 'Stay', style: 'cancel' }, { text: 'End', style: 'destructive', onPress: goBack },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: '#1E2A28' }}>
      <Screen bg="#1E2A28" scroll={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Pressable onPress={quit} hitSlop={12} accessibilityLabel="End session"><Ionicons name="close" size={24} color={colors.white} /></Pressable>
        </View>
        <View style={st.qBox}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Question {index + 1} of {questions.length}</Text>
          <Text style={{ color: colors.white, fontSize: 17, fontWeight: '700', marginTop: 4, lineHeight: 24 }}>{questions[index]}</Text>
        </View>
        {recording && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF5252', marginRight: 8 }} />
            <Text style={{ color: colors.white }}>REC</Text>
          </View>
        )}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#5E7A75' }} />
          <View style={{ width: 160, height: 70, borderTopLeftRadius: 80, borderTopRightRadius: 80, backgroundColor: '#5E7A75', marginTop: 14 }} />
          <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 14, fontSize: 12 }}>Camera preview</Text>
        </View>
        <Text style={{ color: colors.white, textAlign: 'center', fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {fmt(elapsed)} <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>/ {fmt(seconds)}</Text>
        </Text>
        <View style={{ marginVertical: 12, paddingHorizontal: 20 }}>
          <Progress value={(elapsed / seconds) * 100} track="#DDE5E3" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 10 }}>
          <Pressable onPress={retry} hitSlop={12}><Text style={{ color: colors.white, fontSize: 15 }}>Retry</Text></Pressable>
          <Pressable
            onPress={() => elapsed < seconds && setRecording(!recording)}
            style={st.recOuter}
            accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
          >
            <View style={recording ? st.recStop : st.recStart} />
          </Pressable>
          <Pressable onPress={next} hitSlop={12}><Text style={{ color: colors.white, fontSize: 15 }}>{index === questions.length - 1 ? 'Finish' : 'Next'}</Text></Pressable>
        </View>
      </Screen>
    </View>
  );
}

const st = StyleSheet.create({
  hubIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  lockIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  cvPaper: { backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 18 },
  tracker: { backgroundColor: colors.tealDark, borderRadius: radius.md, padding: 16, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 8 },
  pastRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  qBox: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: radius.md, padding: 14 },
  recOuter: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  recStart: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF5252' },
  recStop: { width: 26, height: 26, borderRadius: 5, backgroundColor: '#FF5252' },
});
