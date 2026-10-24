import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, Linking, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAudioRecorder, RecordingPresets, IOSOutputFormat, AudioQuality, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import * as api from '../lib/api';
import { GUIDES, TIPS, JOB_TYPES } from '../data';
import { AutocompleteField } from '../components/Autocomplete';
import { Screen, BackHeader, Button, Card, Chip, Field, Progress, Avatar, Note, SectionTitle, ErrorNote, Loading, text } from '../ui';

const MONTHLY_LIMIT = 3;

// 15. Career development hub
export function Grow() {
  const { navigate, isGuest } = useApp();
  const [left, setLeft] = useState(null);
  useEffect(() => { if (!isGuest) api.sessionsLeft().then(setLeft).catch(() => {}); }, []);
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const items = [
    { icon: 'happy-outline', title: 'Mentorship and guidance', body: 'Chat with mentors and read career tips', go: 'Mentorship' },
    { icon: 'document-text-outline', title: 'CV builder', body: 'Create a CV from your profile in minutes', go: isGuest ? 'Locked' : 'CVBuilder', locked: isGuest },
    { icon: 'play', title: 'Interview practice', body: 'Answer real questions and get feedback', go: isGuest ? 'Locked' : 'InterviewSetup', locked: isGuest,
      extra: !isGuest && left !== null ? `${left} of ${MONTHLY_LIMIT} sessions left this month` : null },
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
            {it.extra ? <Text style={{ color: '#9A5B00', fontWeight: '700', marginTop: 4, fontSize: 13 }}>{it.extra}</Text> : null}
          </View>
          <Ionicons name={it.locked ? 'lock-closed' : 'chevron-forward'} size={18} color={colors.muted} />
        </Card>
      ))}
      <Note>Tip of the day: {tip}</Note>
    </Screen>
  );
}

// 16. Mentorship: real mentors, the AI coach and guides
export function Mentorship() {
  const { isGuest, navigate } = useApp();
  const [mentors, setMentors] = useState(null);
  const [booked, setBooked] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [guides, setGuides] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      setMentors(await api.fetchMentors());
      if (!isGuest) {
        const [b, mine, myGuides] = await Promise.all([api.fetchBookings(), api.fetchSavedAndApplied(), api.myGuides()]);
        setBooked(b);
        // Jobs they applied for first, then saved ones
        const ids = [...mine.applied, ...mine.saved.filter((id) => !mine.applied.includes(id))];
        const all = await api.jobsByIds(ids);
        setJobs(ids.map((id) => ({ job: all.find((j) => j.id === id), applied: mine.applied.includes(id) })).filter((x) => x.job));
        setGuides(myGuides);
      }
    } catch (e) {
      setMentors((m) => m || []);
      setError(api.friendlyError(e));
    }
  };
  useEffect(() => { load(); }, []);

  const onBook = async (m) => {
    if (isGuest) return navigate('Locked', { feature: 'Booking a mentor' });
    try {
      await api.bookMentor(m.id);
      setBooked([...booked, m.id]);
      Alert.alert('Chat requested', `${m.name} will confirm a time with you by SMS or email.`);
    } catch (e) {
      Alert.alert('Could not book', api.friendlyError(e));
    }
  };

  const guideFor = (jobId) => guides.find((g) => g.job_id === jobId);

  return (
    <Screen>
      <BackHeader title="Mentorship" />
      {isGuest && <Note tone="amber">You're browsing as a guest. You can read the free guides, but sign up to chat with the coach or book a mentor.</Note>}
      <ErrorNote message={error} onRetry={load} />

      <Pressable style={st.coachCard} onPress={() => navigate(isGuest ? 'Locked' : 'CoachChat', { feature: 'The career coach' })}>
        <View style={st.coachIcon}><Ionicons name="chatbubbles" size={22} color={colors.tealDark} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.white, fontWeight: '800', fontSize: 16 }}>Ask the career coach</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>Get answers any time about CVs, interviews and the jobs you applied for.</Text>
        </View>
        <Ionicons name={isGuest ? 'lock-closed' : 'chevron-forward'} size={18} color={colors.white} />
      </Pressable>

      <SectionTitle title="Mentors" />
      {mentors === null ? <Loading /> : mentors.map((m) => (
        <Card key={m.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar text={m.initials} size={42} bg={colors.teal} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={text.h3}>{m.name}</Text>
              <Text style={text.small}>{m.role}</Text>
            </View>
            <Text style={{ fontWeight: '700', color: colors.text }}>{Number(m.rating).toFixed(1)} <Text style={{ color: colors.amber }}>★</Text></Text>
          </View>
          <Text style={[text.muted, { marginVertical: 8 }]}>{m.about}</Text>
          <Button
            title={booked.includes(m.id) ? 'Chat requested ✓' : 'Book a chat'}
            variant={isGuest ? 'plain' : 'primary'}
            icon={isGuest ? <Ionicons name="lock-closed" size={14} color={colors.muted} style={{ marginRight: 6 }} /> : null}
            disabled={booked.includes(m.id)}
            onPress={() => onBook(m)}
            style={{ minHeight: 42 }}
          />
        </Card>
      ))}

      {!isGuest && (
        <>
          <SectionTitle title="Guides for you" />
          {jobs.length === 0 && guides.length === 0 && (
            <Text style={[text.muted, { marginBottom: 8 }]}>Save or apply for a job and we'll make a guide to help you get it. You can also ask for a guide on any problem.</Text>
          )}
          {jobs.map(({ job, applied }) => {
            const g = guideFor(job.id);
            return (
              <Card key={job.id} onPress={() => navigate('Guide', g ? { guide: g } : { jobId: job.id, jobTitle: job.title })} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={text.h3}>Get ready for {job.title}</Text>
                  <Text style={text.small}>{job.company} · {applied ? 'Applied' : 'Saved'}{g ? ' · Guide ready' : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Card>
            );
          })}
          {guides.filter((g) => !g.job_id).map((g) => (
            <Card key={g.id} onPress={() => navigate('Guide', { guide: g })} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={text.h3}>{g.title}</Text>
                <Text style={text.small}>You asked: {g.topic}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Card>
          ))}
          <Button title="+ Ask for a guide on a problem" variant="outline" onPress={() => navigate('Guide', { ask: true })} />
        </>
      )}

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

// One guide: a free one, a saved personal one, or a new one being written
export function Guide() {
  const { current, replace } = useApp();
  const { index, guide, jobId, jobTitle, ask } = current.params;
  const [g, setG] = useState(guide || (index !== undefined ? GUIDES[index] : null));
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const make = async (params) => {
    try {
      setBusy(true); setError('');
      setG(await api.makeGuide(params));
    } catch (e) {
      setError(api.friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { if (jobId && !g) make({ jobId }); }, []);

  if (busy) return <Screen><BackHeader title="Guide" /><Loading label={jobTitle ? `Writing your guide for ${jobTitle}...` : 'Writing your guide...'} /></Screen>;

  if (!g) {
    return (
      <Screen>
        <BackHeader title="Guide" />
        {ask ? (
          <>
            <Text style={text.h1}>What do you need help with?</Text>
            <Text style={[text.muted, { marginBottom: 14 }]}>Describe your problem in a sentence or two. We'll write a short guide that fits your profile.</Text>
            <Field value={topic} onChangeText={setTopic} placeholder="e.g. I have no work experience and keep getting rejected" autoCapitalize="sentences" multiline maxLength={300} />
            <ErrorNote message={error} />
            <Button title="Write my guide" disabled={topic.trim().length < 5} onPress={() => make({ topic: topic.trim() })} />
          </>
        ) : (
          <>
            <ErrorNote message={error || 'This guide could not be loaded.'} />
            {jobId ? <Button title="Try again" onPress={() => make({ jobId })} /> : null}
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title="Guide" />
      <Text style={text.h1}>{g.title}</Text>
      {g.topic ? <Text style={[text.small, { marginBottom: 6 }]}>{g.job_id ? 'Made for a job you saved or applied for' : `You asked: ${g.topic}`}</Text> : null}
      <Text style={[text.body, { marginTop: 8, lineHeight: 23 }]}>{g.body}</Text>
      {g.id ? <Note style={{ marginTop: 16 }}>This guide was written by AI for your profile. Check important details, like dates and documents, with the employer.</Note> : null}
      {g.id ? <Button title="Ask the coach about this" variant="outline" onPress={() => replace('CoachChat', { prefill: `About my guide "${g.title}": ` })} /> : null}
    </Screen>
  );
}

// AI career coach chat
const STARTERS = [
  'How do I write a CV with no experience?',
  'How do I prepare for my interview?',
  'What should I say when they ask about salary?',
  'Which jobs fit my skills?',
];

export function CoachChat() {
  const { current, data } = useApp();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState(null);
  const [input, setInput] = useState(current.params.prefill || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scroll = useRef(null);

  useEffect(() => {
    api.coachHistory().then(setMessages).catch((e) => { setMessages([]); setError(api.friendlyError(e)); });
  }, []);

  const send = async (textToSend) => {
    const msg = (textToSend ?? input).trim();
    if (!msg || sending) return;
    setInput(''); setError(''); setSending(true);
    setMessages((m) => [...(m || []), { id: `u${Date.now()}`, role: 'user', content: msg }]);
    try {
      const reply = await api.askCoach(msg);
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: reply }]);
    } catch (e) {
      setError(api.friendlyError(e));
      setMessages((m) => m.slice(0, -1));
      setInput(msg);
    } finally {
      setSending(false);
    }
  };

  const clear = () => Alert.alert('Clear this chat?', 'Your messages with the coach will be deleted.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear', style: 'destructive', onPress: async () => { try { await api.clearCoach(); setMessages([]); } catch (e) { setError(api.friendlyError(e)); } } },
  ]);

  const first = (data.profile.full_name || '').split(' ')[0];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <BackHeader title="Career coach" right={messages?.length ? <Pressable onPress={clear} hitSlop={10}><Text style={text.link}>Clear</Text></Pressable> : null} />
      </View>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages === null ? <Loading /> : messages.length === 0 ? (
          <>
            <View style={[st.bubble, st.bubbleCoach]}>
              <Text style={text.body}>Hi{first ? ` ${first}` : ''}. I'm your SkillBridge coach. I can see your profile and the jobs you saved or applied for, so ask me anything about getting work.</Text>
            </View>
            <Text style={[text.small, { marginTop: 10, marginBottom: 6 }]}>Try asking:</Text>
            {STARTERS.map((q) => (
              <Pressable key={q} style={st.starter} onPress={() => send(q)}>
                <Text style={{ color: colors.tealDark, fontWeight: '600' }}>{q}</Text>
              </Pressable>
            ))}
          </>
        ) : messages.map((m) => (
          <View key={m.id} style={[st.bubble, m.role === 'user' ? st.bubbleUser : st.bubbleCoach]}>
            <Text style={[text.body, m.role === 'user' && { color: colors.white }]}>{m.content}</Text>
          </View>
        ))}
        {sending && <View style={[st.bubble, st.bubbleCoach]}><ActivityIndicator color={colors.teal} /></View>}
        {error ? <Text style={{ color: colors.red, marginTop: 8 }}>{error}</Text> : null}
      </ScrollView>
      <Text style={[text.small, { textAlign: 'center', paddingHorizontal: 20 }]}>The coach is AI and can make mistakes. Check important details.</Text>
      <View style={[st.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          style={st.chatInput}
          value={input}
          onChangeText={setInput}
          placeholder="Ask the coach..."
          placeholderTextColor="#9AA6A4"
          multiline
          maxLength={1500}
        />
        <Pressable onPress={() => send()} disabled={!input.trim() || sending} style={[st.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]} accessibilityLabel="Send">
          <Ionicons name="send" size={18} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// 18. Locked feature (guests)
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
        {['Build and download your CV', '3 interview practices a month with feedback', 'Book mentors and save jobs', 'Keep your verified skill badges'].map((t) => (
          <Text key={t} style={[text.body, { marginBottom: 8 }]}><Text style={{ color: colors.teal }}>✓ </Text>{t}</Text>
        ))}
      </Card>
      <Button title="Create free account" onPress={() => navigate('Register')} />
      <Button title="Maybe later" variant="link" onPress={goBack} />
    </Screen>
  );
}

// 19. Interview practice setup
const nextMonthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
};

export function InterviewSetup() {
  const { data, navigate } = useApp();
  const [left, setLeft] = useState(null);
  const [past, setPast] = useState([]);
  const [query, setQuery] = useState('');
  const [jobType, setJobType] = useState((data.profile.job_types || [])[0] || '');
  const [qType, setQType] = useState('General');
  const [minutes, setMinutes] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.sessionsLeft().then(setLeft).catch(() => setLeft(MONTHLY_LIMIT));
    api.pastSessions().then(setPast).catch(() => {});
  };
  useEffect(load, []);

  const start = async () => {
    if (!jobType) { setError('Choose or type the job you are practising for.'); return; }
    try {
      setBusy(true); setError('');
      const res = await api.startInterview(jobType, qType, minutes * 60);
      navigate('InterviewSession', { sessionId: res.session_id, questions: res.questions, answerSeconds: res.answer_seconds, jobType });
    } catch (e) {
      setError(api.friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackHeader title="Interview practice" />
      <View style={st.tracker}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: colors.white, fontWeight: '700' }}>This month</Text>
          <Text style={{ color: colors.amber, fontWeight: '800' }}>{left === null ? '...' : `${left} of ${MONTHLY_LIMIT} left`}</Text>
        </View>
        <Progress value={((left ?? MONTHLY_LIMIT) / MONTHLY_LIMIT) * 100} />
        <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8, fontSize: 12 }}>Resets on {nextMonthStart()}</Text>
      </View>

      <AutocompleteField
        label="What job are you practising for?"
        placeholder="Search or type any job, e.g. cashier"
        value={query}
        onChangeText={setQuery}
        clearOnSelect
        allowCustom
        customLabel={(t) => `Practise for "${t}"`}
        fetchSuggestions={async (q) => JOB_TYPES.filter((j) => j.toLowerCase().includes(q.toLowerCase())).slice(0, 8).map((j) => ({ key: j, label: j }))}
        onSelect={(item) => { setJobType(item.label); setError(''); }}
      />
      {jobType ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -6, marginBottom: 10 }}>
          <Chip label={jobType} active />
          <Text style={[text.small, { marginBottom: 8 }]}>Questions will be about this job</Text>
        </View>
      ) : null}

      <Text style={st.label}>Question type</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['General', 'Skills', 'Problem solving'].map((q) => <Chip key={q} label={q} active={qType === q} onPress={() => setQType(q)} />)}
      </View>
      <Text style={[st.label, { marginTop: 6 }]}>Answer time per question</Text>
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3].map((m) => <Chip key={m} label={`${m} min`} active={minutes === m} onPress={() => setMinutes(m)} />)}
      </View>

      <Note>You'll see each question first. Tap record when you're ready, answer out loud, and we'll grade your answers at the end with tips to say things better.</Note>
      {left === 0 && <Note tone="amber">You've used all {MONTHLY_LIMIT} sessions this month. New sessions open on {nextMonthStart()}.</Note>}
      <ErrorNote message={error} />
      <Button title={busy ? 'Getting your questions...' : 'Start practice (5 questions)'} loading={busy} disabled={left === 0} onPress={start} style={{ marginTop: 6 }} />

      <SectionTitle title="Past sessions" />
      {past.length === 0 && <Text style={text.muted}>No sessions yet.</Text>}
      {past.map((p) => (
        <Pressable key={p.id} style={st.pastRow} onPress={() => navigate('InterviewResult', { sessionId: p.id })}>
          <View style={{ flex: 1 }}>
            <Text style={text.body}>{p.job_type}</Text>
            <Text style={text.small}>{p.question_type} · {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
          </View>
          <Chip small label={`${p.overall_score}%`} tone={p.overall_score >= 70 ? 'verified' : 'amber'} />
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      ))}
    </Screen>
  );
}

// 20. Recording screen: question on top, camera in the middle, controls at the bottom
// Gemini transcribes wav and aac (not m4a), so iPhone records 16 kHz mono WAV and Android records AAC.
// Speech at 16 kHz mono is clear enough for transcription and keeps uploads small.
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: Platform.OS === 'ios' ? '.wav' : '.aac',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  android: { extension: '.aac', outputFormat: 'aac_adts', audioEncoder: 'aac', sampleRate: 16000 },
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    sampleRate: 16000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};
const AUDIO_EXT = Platform.OS === 'ios' ? 'wav' : 'aac';
const AUDIO_TYPE = Platform.OS === 'ios' ? 'audio/wav' : 'audio/aac';
const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

export function InterviewSession() {
  const { current, goBack, replace, uid } = useApp();
  const { sessionId, questions, answerSeconds, jobType } = current.params;
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micOk, setMicOk] = useState(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('ready'); // ready | recording | recorded | saving | grading | error
  const [elapsed, setElapsed] = useState(0);
  const [uri, setUri] = useState(null);
  const [error, setError] = useState('');
  const answers = useRef([]);
  const timer = useRef(null);

  useEffect(() => {
    (async () => {
      const mic = await requestRecordingPermissionsAsync();
      setMicOk(mic.granted);
      if (mic.granted) await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      if (!camPerm?.granted) await requestCam();
    })();
    return () => {
      clearInterval(timer.current);
      try { if (recorder.isRecording) recorder.stop(); } catch {}
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };
  }, []);

  const stop = async () => {
    clearInterval(timer.current);
    try { await recorder.stop(); } catch {}
    setUri(recorder.uri);
    setPhase('recorded');
  };

  useEffect(() => { if (phase === 'recording' && elapsed >= answerSeconds) stop(); }, [elapsed]);

  const record = async () => {
    try {
      setError('');
      await recorder.prepareToRecordAsync();
      recorder.record();
      setElapsed(0);
      setPhase('recording');
      timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (e) {
      setError('The microphone could not start. Close other apps that use it and try again.');
    }
  };

  const retry = () => { setUri(null); setElapsed(0); setPhase('ready'); };

  const grade = async () => {
    try {
      setPhase('grading'); setError('');
      await api.gradeInterview(sessionId, answers.current);
      replace('InterviewResult', { sessionId });
    } catch (e) {
      setError(api.friendlyError(e));
      setPhase('error');
    }
  };

  const next = async () => {
    if (!uri) return;
    try {
      setPhase('saving');
      const position = index + 1;
      const path = `${uid}/${sessionId}/${position}.${AUDIO_EXT}`;
      await api.uploadFile('interview-audio', path, uri, AUDIO_TYPE);
      answers.current = [...answers.current.filter((a) => a.position !== position), { position, audio_path: path, duration_seconds: elapsed }];
      if (index < questions.length - 1) {
        setIndex(index + 1);
        setUri(null);
        setElapsed(0);
        setPhase('ready');
      } else {
        await grade();
      }
    } catch (e) {
      setError(`Your answer could not be uploaded. ${api.friendlyError(e)}`);
      setPhase('recorded');
    }
  };

  const quit = () => Alert.alert('End practice?', 'This session will not count towards your monthly limit.', [
    { text: 'Stay', style: 'cancel' },
    { text: 'End', style: 'destructive', onPress: goBack },
  ]);

  if (phase === 'grading' || phase === 'error') {
    return (
      <View style={[st.dark, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20, paddingHorizontal: 24, justifyContent: 'center' }]}>
        {phase === 'grading' ? (
          <>
            <ActivityIndicator size="large" color={colors.amber} />
            <Text style={[st.whiteTitle, { textAlign: 'center', marginTop: 20 }]}>Checking your answers</Text>
            <Text style={[st.whiteMuted, { textAlign: 'center', marginTop: 6 }]}>We're listening to your recordings and writing your feedback. This can take up to a minute.</Text>
          </>
        ) : (
          <>
            <Text style={[st.whiteTitle, { textAlign: 'center' }]}>We couldn't grade this session</Text>
            <Text style={[st.whiteMuted, { textAlign: 'center', marginVertical: 10 }]}>{error}</Text>
            <Button title="Try grading again" onPress={grade} />
            <Button title="Leave" variant="plain" onPress={goBack} />
          </>
        )}
      </View>
    );
  }

  const total = questions.length;
  const recording = phase === 'recording';

  return (
    <View style={[st.dark, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      {/* Top bar */}
      <View style={st.topBar}>
        <Pressable onPress={quit} hitSlop={12} accessibilityLabel="End practice"><Ionicons name="close" size={26} color={colors.white} /></Pressable>
        <Text style={st.whiteMuted}>{jobType}</Text>
        <View style={[st.recPill, { opacity: recording ? 1 : 0 }]}>
          <View style={st.recDot} />
          <Text style={{ color: colors.white, fontWeight: '700', fontSize: 12 }}>REC</Text>
        </View>
      </View>

      {/* Question progress */}
      <View style={st.steps}>
        {questions.map((_, i) => <View key={i} style={[st.step, { backgroundColor: i < index ? colors.teal : i === index ? colors.amber : 'rgba(255,255,255,0.2)' }]} />)}
      </View>

      {/* Question, always visible */}
      <View style={st.qBox}>
        <Text style={st.whiteMuted}>Question {index + 1} of {total}</Text>
        <Text style={st.question}>{questions[index]}</Text>
      </View>

      {/* Camera */}
      <View style={st.camBox}>
        {camPerm?.granted ? (
          <CameraView style={StyleSheet.absoluteFill} facing="front" mute mode="picture" />
        ) : (
          <View style={st.camPlaceholder}>
            <Ionicons name="person-circle-outline" size={90} color="#5E7A75" />
            <Text style={[st.whiteMuted, { textAlign: 'center', marginTop: 6 }]}>Allow the camera to see yourself while you practise. Only your voice is recorded.</Text>
          </View>
        )}
        {phase === 'ready' && (
          <View style={st.camHint}><Text style={st.camHintText}>Read the question. Tap the red button when you're ready to answer.</Text></View>
        )}
        {phase === 'recorded' && (
          <View style={st.camHint}><Text style={st.camHintText}>Answer recorded ({fmt(elapsed)}). Tap Next to save it, or Retry.</Text></View>
        )}
      </View>

      {micOk === false && (
        <View style={{ marginHorizontal: 20, marginBottom: 8 }}>
          <Text style={[st.whiteMuted, { textAlign: 'center' }]}>SkillBridge needs the microphone to record your answers.</Text>
          <Text onPress={() => Linking.openSettings()} style={{ color: colors.amber, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>Open settings</Text>
        </View>
      )}
      {error ? <Text style={{ color: '#FF8A80', textAlign: 'center', marginHorizontal: 20, marginBottom: 6 }}>{error}</Text> : null}

      {/* Timer */}
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={st.timer}>{fmt(elapsed)}<Text style={st.timerMax}>  / {fmt(answerSeconds)}</Text></Text>
        <Progress value={(elapsed / answerSeconds) * 100} track="rgba(255,255,255,0.2)" />
      </View>

      {/* Controls */}
      <View style={st.controls}>
        <Pressable onPress={retry} disabled={phase !== 'recorded'} style={[st.sideBtn, phase !== 'recorded' && { opacity: 0.35 }]} hitSlop={10}>
          <Ionicons name="refresh" size={22} color={colors.white} />
          <Text style={st.sideText}>Retry</Text>
        </Pressable>

        <Pressable
          onPress={recording ? stop : record}
          disabled={!micOk || phase === 'recorded' || phase === 'saving'}
          style={[st.recOuter, (!micOk || phase === 'recorded') && { opacity: 0.35 }]}
          accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
        >
          {phase === 'saving' ? <ActivityIndicator color={colors.white} /> : <View style={recording ? st.recStop : st.recStart} />}
        </Pressable>

        <Pressable onPress={next} disabled={phase !== 'recorded'} style={[st.sideBtn, phase !== 'recorded' && { opacity: 0.35 }]} hitSlop={10}>
          <Ionicons name={index === total - 1 ? 'checkmark-done' : 'arrow-forward'} size={22} color={colors.white} />
          <Text style={st.sideText}>{index === total - 1 ? 'Finish' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Feedback after a session
export function InterviewResult() {
  const { current, replace, goBack } = useApp();
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState({});

  useEffect(() => { api.fetchSessionResult(current.params.sessionId).then(setRes).catch((e) => setError(api.friendlyError(e))); }, []);

  if (error) return <Screen><BackHeader title="Your feedback" /><ErrorNote message={error} /></Screen>;
  if (!res) return <Screen><BackHeader title="Your feedback" /><Loading /></Screen>;
  const { session, answers } = res;
  const score = session.overall_score ?? 0;

  return (
    <Screen>
      <BackHeader title="Your feedback" />
      <View style={{ alignItems: 'center', marginBottom: 10 }}>
        <View style={[st.ring, { borderColor: score >= 70 ? colors.teal : colors.amber }]}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>{score}%</Text>
        </View>
        <Text style={[text.h2, { marginTop: 12 }]}>{session.job_type}</Text>
        <Text style={text.small}>{session.question_type} questions</Text>
      </View>
      {session.summary ? <Note>{session.summary}</Note> : null}

      {answers.map((a) => (
        <Card key={a.id}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={[text.h3, { flex: 1, marginRight: 8 }]}>{a.position}. {a.question}</Text>
            <Chip small label={`${a.score}%`} tone={a.score >= 70 ? 'verified' : a.score >= 40 ? 'amber' : 'red'} />
          </View>

          <Pressable onPress={() => setOpen({ ...open, [a.id]: !open[a.id] })} hitSlop={6}>
            <Text style={[text.link, { marginTop: 8 }]}>{open[a.id] ? 'Hide what you said' : 'Show what you said'}</Text>
          </Pressable>
          {open[a.id] ? <Text style={[text.muted, { marginTop: 4, fontStyle: 'italic' }]}>{a.transcript || 'Nothing could be heard in this recording.'}</Text> : null}

          {a.went_well ? (<><Text style={st.fbLabel}>What went well</Text><Text style={text.body}>{a.went_well}</Text></>) : null}
          {a.improve ? (<><Text style={st.fbLabel}>What to improve</Text><Text style={text.body}>{a.improve}</Text></>) : null}
          {a.better_answer ? (
            <View style={st.better}>
              <Text style={[st.fbLabel, { marginTop: 0 }]}>A better way to say it</Text>
              <Text style={text.body}>{a.better_answer}</Text>
            </View>
          ) : null}
        </Card>
      ))}

      <Button title="Practise again" onPress={() => replace('InterviewSetup')} />
      <Button title="Done" variant="outline" onPress={goBack} />
    </Screen>
  );
}

const st = StyleSheet.create({
  coachCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.tealDark, borderRadius: radius.md, padding: 16, marginTop: 4 },
  coachIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  bubble: { maxWidth: '85%', borderRadius: radius.md, padding: 12, marginTop: 8 },
  bubbleCoach: { alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.teal },
  starter: { backgroundColor: colors.tealLight, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8, alignSelf: 'flex-start' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  chatInput: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15, color: colors.text, backgroundColor: colors.bg },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  hubIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  lockIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  cvPaper: { backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 18 },
  tracker: { backgroundColor: colors.tealDark, borderRadius: radius.md, padding: 16, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 8 },
  pastRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  ring: { width: 120, height: 120, borderRadius: 60, borderWidth: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  fbLabel: { fontSize: 13, fontWeight: '800', color: colors.tealDark, marginTop: 12, marginBottom: 2 },
  better: { backgroundColor: colors.tealLight, borderRadius: radius.sm, padding: 12, marginTop: 12 },

  // recording screen
  dark: { flex: 1, backgroundColor: '#14201E' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, minHeight: 36 },
  recPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,82,82,0.25)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5252', marginRight: 6 },
  steps: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 10 },
  step: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 2 },
  qBox: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, padding: 16, marginHorizontal: 20, marginTop: 12 },
  question: { color: colors.white, fontSize: 19, fontWeight: '700', marginTop: 4, lineHeight: 26 },
  camBox: { flex: 1, marginHorizontal: 20, marginVertical: 12, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#22302D', minHeight: 160 },
  camPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  camHint: { position: 'absolute', left: 10, right: 10, bottom: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.sm, padding: 10 },
  camHintText: { color: colors.white, fontSize: 13, textAlign: 'center' },
  whiteTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
  whiteMuted: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  timer: { color: colors.white, textAlign: 'center', fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'], marginBottom: 8 },
  timerMax: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, marginTop: 14 },
  sideBtn: { alignItems: 'center', width: 64 },
  sideText: { color: colors.white, fontSize: 13, marginTop: 4 },
  recOuter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  recStart: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#FF5252' },
  recStop: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#FF5252' },
});
