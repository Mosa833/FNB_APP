import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import * as api from '../lib/api';
import { Screen, BackHeader, Button, Card, Chip, Progress, Note, ErrorNote, Loading, text } from '../ui';
import { BadgeRow } from '../components/Badges';

const PASS_MARK = 70;
const findTest = (tests, skill) => tests.find((t) => t.skill.toLowerCase() === skill.toLowerCase());

// 10. Skills assessment: only tests for the skills on the user's profile
export function Assessments() {
  const { data, isGuest, navigate } = useApp();
  const [tests, setTests] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(null);

  const load = () => {
    setError('');
    api.fetchTests().then(setTests).catch((e) => { setTests([]); setError(api.friendlyError(e)); });
  };
  useEffect(load, []);

  const create = async (skill) => {
    try {
      setCreating(skill.name);
      const testId = await api.generateTest(skill.name);
      const all = await api.fetchTests();
      setTests(all);
      const t = all.find((x) => x.id === testId);
      navigate('TestQuestion', { test: t });
    } catch (e) {
      Alert.alert('Could not create the test', api.friendlyError(e));
    } finally {
      setCreating(null);
    }
  };

  return (
    <Screen>
      <BackHeader />
      <Text style={text.h1}>Skills assessment</Text>
      <Text style={[text.muted, { marginBottom: 8 }]}>Tests for the skills on your profile. Pass with {PASS_MARK}% or more to earn the Tested badge.</Text>
      <Note style={{ marginTop: 0 }}>A test checks what you know, not whether you can do the work. After passing, add a practical task or an endorsement for stronger proof.</Note>
      {isGuest && <Note tone="amber">As a guest you can take tests, but badges are only saved when you have an account.</Note>}
      <ErrorNote message={error} onRetry={load} />

      {data.skills.length === 0 ? (
        <Card>
          <Text style={text.h3}>Add your skills first</Text>
          <Text style={[text.muted, { marginVertical: 6 }]}>We show tests that match the skills you add to your profile.</Text>
          <Button title="Add skills" onPress={() => navigate('Skills')} />
        </Card>
      ) : tests === null ? <Loading /> : (
        data.skills.map((sk) => {
          const t = findTest(tests, sk.name);
          return (
            <Card key={sk.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[text.h3, { flex: 1 }]}>{t?.name || sk.name}</Text>
                <Chip small label={sk.verified ? `Passed ${sk.verified_score ?? ''}%` : t ? 'New' : 'No test yet'} tone={sk.verified ? 'verified' : 'new'} />
              </View>
              {sk.verified ? (
                <>
                  <BadgeRow skill={sk} />
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    {!isGuest ? <Pressable onPress={() => navigate('SkillBadges', { skillId: sk.id })} hitSlop={6} style={{ marginRight: 18 }}><Text style={text.link}>Add stronger proof</Text></Pressable> : null}
                    {t ? <Pressable onPress={() => navigate('TestQuestion', { test: t })} hitSlop={6}><Text style={text.link}>Retake test</Text></Pressable> : null}
                  </View>
                </>
              ) : t ? (
                <>
                  <Text style={[text.small, { marginTop: 4 }]}>{t.extra ? `${t.extra} · ` : ''}{Math.min(8, t.question_count)} random questions · about {t.minutes} min</Text>
                  <Button title="Start test" onPress={() => navigate('TestQuestion', { test: t })} style={{ minHeight: 42, marginTop: 10 }} />
                </>
              ) : isGuest ? (
                <Text style={[text.small, { marginTop: 4 }]}>Create a free account and we'll make a test for this skill.</Text>
              ) : (
                <>
                  <Text style={[text.small, { marginTop: 4 }]}>We can make a test for this skill. Each attempt gets 8 random questions. It takes about 30 seconds to make.</Text>
                  <Button title={creating === sk.name ? 'Creating your test...' : 'Create my test'} variant="outline" loading={creating === sk.name} disabled={Boolean(creating)} onPress={() => create(sk)} style={{ minHeight: 42, marginTop: 10 }} />
                </>
              )}
            </Card>
          );
        })
      )}
      {data.skills.length > 0 && <Button title="Add more skills" variant="link" onPress={() => navigate('Skills')} />}
    </Screen>
  );
}

// 11. Test question
export function TestQuestion() {
  const { current, goBack, replace, reload, isGuest } = useApp();
  const test = current.params.test;
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(test.minutes * 60);
  const attempt = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    api.startTest(test.id)
      .then((r) => { attempt.current = r.attempt_id; setSecondsLeft((r.minutes || test.minutes) * 60); setQuestions(r.questions || []); })
      .catch((e) => setError(api.friendlyError(e)));
  }, []);

  const finish = async (finalAnswers) => {
    if (done.current || !questions) return;
    done.current = true;
    setSubmitting(true);
    try {
      const result = await api.submitAttempt(attempt.current, questions.map((q) => q.id), questions.map((_, i) => (finalAnswers[i] ?? -1)));
      if (!isGuest) await reload();
      replace('TestResult', { test, result });
    } catch (e) {
      done.current = false;
      setSubmitting(false);
      Alert.alert('Could not send your answers', api.friendlyError(e));
    }
  };

  useEffect(() => {
    if (!questions) return undefined;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [questions]);
  useEffect(() => { if (secondsLeft <= 0) finish(answers); }, [secondsLeft]);

  if (error) return <Screen><BackHeader title={test.name} /><ErrorNote message={error} /></Screen>;
  if (!questions) return <Screen><BackHeader title={test.name} /><Loading label="Loading questions..." /></Screen>;
  if (submitting) return <Screen><Loading label="Marking your test..." /></Screen>;

  const q = questions[index];
  const total = questions.length;
  const pct = Math.round(((index + 1) / total) * 100);
  const mm = String(Math.max(0, Math.floor(secondsLeft / 60))).padStart(2, '0');
  const ss = String(Math.max(0, secondsLeft % 60)).padStart(2, '0');

  const quit = () => Alert.alert('Leave the test?', 'Your answers will not be saved.', [
    { text: 'Stay', style: 'cancel' },
    { text: 'Leave', style: 'destructive', onPress: goBack },
  ]);

  const next = () => {
    if (answers[index] === undefined) return;
    if (index < total - 1) setIndex(index + 1);
    else finish(answers);
  };

  return (
    <Screen
      footer={
        <View style={st.footer}>
          <Button title="Back" variant="plain" onPress={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} style={{ flex: 1, marginRight: 8 }} />
          <Button title={index === total - 1 ? 'Finish' : 'Next'} onPress={next} disabled={answers[index] === undefined} style={{ flex: 1, marginLeft: 8 }} />
        </View>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Pressable onPress={quit} hitSlop={12} accessibilityLabel="Quit test"><Ionicons name="close" size={24} color={colors.text} /></Pressable>
        <Text style={[text.h3, { flex: 1, marginLeft: 10 }]}>{test.name}</Text>
        <Text style={{ fontWeight: '800', color: secondsLeft < 60 ? colors.red : colors.teal, fontVariant: ['tabular-nums'] }}>{mm}:{ss}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={text.small}>Question {index + 1} of {total}</Text>
        <Text style={text.small}>{pct}%</Text>
      </View>
      <Progress value={pct} track={colors.border} />
      <Text style={[text.h2, { marginVertical: 22, lineHeight: 28 }]}>{q.question}</Text>
      {q.options.map((o, i) => {
        const selected = answers[index] === i;
        return (
          <Pressable key={`${index}-${i}`} onPress={() => setAnswers({ ...answers, [index]: i })} style={[st.option, selected && st.optionOn]}>
            <View style={[st.radio, selected && { borderColor: colors.teal }]}>{selected && <View style={st.radioDot} />}</View>
            <Text style={[text.body, { flex: 1 }, selected && { fontWeight: '700' }]}>{o}</Text>
          </Pressable>
        );
      })}
    </Screen>
  );
}

// 12. Test result
export function TestResult() {
  const { current, reset, navigate, replace, isGuest } = useApp();
  const { test, result } = current.params;
  const [feedback, setFeedback] = useState(null);
  const [fbState, setFbState] = useState(result.attempt_id && !isGuest ? 'loading' : 'none');

  // Written feedback from Groq. The score above is marked exactly, not by AI.
  const loadFeedback = () => {
    setFbState('loading');
    api.testFeedback(result.attempt_id).then((f) => { setFeedback(f); setFbState('done'); }).catch(() => setFbState('error'));
  };
  useEffect(() => { if (result.attempt_id && !isGuest) loadFeedback(); }, []);
  const { data } = useApp();
  const skillId = data.skills.find((s) => s.name.toLowerCase() === String(test.skill || '').toLowerCase())?.id;
  const whyFor = (q) => feedback?.questions?.find((x) => x.question?.trim().toLowerCase() === q.trim().toLowerCase())?.why;

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <View style={[st.ring, { borderColor: result.passed ? colors.teal : colors.amber }]}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>{result.score}%</Text>
        </View>
        <Text style={[text.h1, { marginTop: 18, textAlign: 'center' }]}>{result.passed ? 'Well done, you passed!' : 'Not this time'}</Text>
        <Text style={text.muted}>{test.name} · {result.correct} out of {result.total} correct</Text>
      </View>

      {result.passed && result.saved && (
        <Card style={{ marginTop: 20 }}>
          <Text style={[text.h3, { color: colors.teal }]}>✓ Verified badge added</Text>
          <Text style={[text.muted, { marginTop: 4 }]}>
            Employers can now see that you passed this test. Your job matches update the next time you open Jobs.
          </Text>
          <Text style={[text.small, { marginTop: 8 }]}>A test shows what you know. A practical task or an endorsement shows you can do the work, and counts more with employers.</Text>
        </Card>
      )}
      {result.passed && !result.saved && (
        <Note tone="amber" style={{ marginTop: 20 }}>You passed, but guests can't keep badges. Create a free account and retake the test to save it.</Note>
      )}
      {!result.passed && (
        <Card style={{ marginTop: 20 }}>
          <Text style={text.h3}>You need {PASS_MARK}% to pass</Text>
          <Text style={[text.muted, { marginTop: 4 }]}>
            Look at the answers below.{result.saved && result.retry_hours ? ` You can try again in ${result.retry_hours} hours, with different questions.` : ' Then try again when you are ready.'}
          </Text>
        </Card>
      )}

      {fbState === 'loading' && <Card><Loading label="Writing your feedback..." /></Card>}
      {fbState === 'error' && (
        <Card>
          <Text style={text.muted}>Your feedback could not be written right now.</Text>
          <Pressable onPress={loadFeedback} hitSlop={6}><Text style={[text.link, { marginTop: 6 }]}>Try again</Text></Pressable>
        </Card>
      )}
      {feedback && (
        <Card>
          <Text style={text.h3}>Your feedback</Text>
          <Text style={[text.body, { marginTop: 6 }]}>{feedback.summary}</Text>
          {feedback.tips?.length > 0 && (
            <>
              <Text style={[text.small, { marginTop: 10, fontWeight: '700' }]}>What to practise next</Text>
              {feedback.tips.map((t) => <Text key={t} style={[text.body, { marginTop: 4 }]}>• {t}</Text>)}
            </>
          )}
        </Card>
      )}

      {result.missed?.length > 0 && (
        <Card>
          <Text style={text.h3}>Questions to review</Text>
          {result.missed.map((m, i) => (
            <View key={i} style={{ marginTop: 12 }}>
              <Text style={text.body}>{m.question}</Text>
              {m.chosen ? <Text style={[text.small, { color: colors.red, marginTop: 2 }]}>Your answer: {m.chosen}</Text> : null}
              <Text style={[text.small, { color: colors.teal, marginTop: 2 }]}>Right answer: {m.correct}</Text>
              {whyFor(m.question) ? <Text style={[text.muted, { marginTop: 4 }]}>{whyFor(m.question)}</Text> : null}
            </View>
          ))}
        </Card>
      )}

      {result.passed && result.saved && skillId ? <Button title="Add stronger proof" onPress={() => replace('SkillBadges', { skillId })} /> : null}
      {result.passed && result.saved && <Button title="See my jobs" variant={skillId ? 'outline' : 'primary'} onPress={() => reset('Jobs')} />}
      {result.passed && !result.saved && <Button title="Create free account" onPress={() => navigate('Register')} />}
      {!result.passed && !(result.saved && result.retry_hours) && <Button title="Try again" onPress={() => replace('TestQuestion', { test })} />}
      <Button title="Back to tests" variant="outline" onPress={() => replace('Assessments')} />
    </Screen>
  );
}

const st = StyleSheet.create({
  footer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 16, marginBottom: 10, minHeight: 60 },
  optionOn: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.teal },
  ring: { width: 130, height: 130, borderRadius: 65, borderWidth: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
});
