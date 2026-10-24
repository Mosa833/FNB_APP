import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import { TESTS } from '../data';
import { Screen, Button, Card, Chip, Progress, Note, text } from '../ui';

const PASS_MARK = 70;

// 10. Skills assessment list
export function Assessments() {
  const { profile, navigate, isGuest, current, TABS } = useApp();
  return (
    <Screen>
      {!TABS.includes(current.name) && <BackRow />}
      <Text style={text.h1}>Skills assessment</Text>
      <Text style={[text.muted, { marginBottom: 16 }]}>Take short tests to prove your skills. Passed tests add a verified badge to your profile.</Text>
      {isGuest && <Note tone="amber">As a guest you can take tests, but badges are only saved when you have an account.</Note>}
      {TESTS.map((t) => {
        const score = profile.testResults[t.id];
        const passed = score !== undefined;
        return (
          <Card key={t.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[text.h3, { flex: 1 }]}>{t.name}</Text>
              <Chip small label={passed ? `Passed ${score}%` : 'New'} tone={passed ? 'verified' : 'new'} />
            </View>
            {passed ? (
              <>
                <Text style={[text.small, { marginTop: 4 }]}>Verified badge added ✓</Text>
                <Pressable onPress={() => navigate('TestQuestion', { testId: t.id })} hitSlop={6}><Text style={[text.link, { marginTop: 6 }]}>Retake test</Text></Pressable>
              </>
            ) : (
              <>
                <Text style={[text.small, { marginTop: 4 }]}>
                  {t.extra ? `${t.extra} + ` : ''}{t.questions.length} questions · about {t.minutes} min
                </Text>
                <Button title="Start test" onPress={() => navigate('TestQuestion', { testId: t.id })} style={{ minHeight: 42, marginTop: 10 }} />
              </>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

function BackRow() {
  const { goBack } = useApp();
  return (
    <Pressable onPress={goBack} hitSlop={12} style={{ marginBottom: 10 }} accessibilityLabel="Go back">
      <Ionicons name="arrow-back" size={24} color={colors.teal} />
    </Pressable>
  );
}

// 11. Test question
export function TestQuestion() {
  const { current, goBack, replace, recordTest } = useApp();
  const test = TESTS.find((t) => t.id === current.params.testId);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(test.minutes * 60);
  const done = useRef(false);

  const finish = (finalAnswers) => {
    if (done.current) return;
    done.current = true;
    const correct = test.questions.filter((q, i) => finalAnswers[i] === q.answer).length;
    const score = Math.round((correct / test.questions.length) * 100);
    const passed = score >= PASS_MARK;
    recordTest(test, score, passed);
    replace('TestResult', { testId: test.id, correct, score, passed });
  };

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (secondsLeft <= 0) finish(answers); }, [secondsLeft]);

  const q = test.questions[index];
  const total = test.questions.length;
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
      <Text style={[text.h2, { marginVertical: 22, lineHeight: 28 }]}>{q.q}</Text>
      {q.options.map((o, i) => {
        const selected = answers[index] === i;
        return (
          <Pressable key={o} onPress={() => setAnswers({ ...answers, [index]: i })} style={[st.option, selected && st.optionOn]}>
            <View style={[st.radio, selected && { borderColor: colors.teal }]}>{selected && <View style={st.radioDot} />}</View>
            <Text style={[text.body, { flex: 1 }, selected && { fontWeight: '700' }]}>{o}</Text>
          </Pressable>
        );
      })}
    </Screen>
  );
}

// 12. Test result
const IMPROVE = {
  digital: 'Spreadsheets and online safety. Try the free short course.',
  customer: 'Handling complaints calmly. Try the free short course.',
  excel: 'Formulas and filters. Try the free short course.',
  phone: 'Safe battery handling and testing. Try the free short course.',
};

export function TestResult() {
  const { current, reset, navigate, replace, isGuest } = useApp();
  const { testId, correct, score, passed } = current.params;
  const test = TESTS.find((t) => t.id === testId);
  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <View style={[st.ring, { borderColor: passed ? colors.teal : colors.amber }]}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>{score}%</Text>
        </View>
        <Text style={[text.h1, { marginTop: 18, textAlign: 'center' }]}>{passed ? 'Well done, you passed!' : 'Not this time'}</Text>
        <Text style={text.muted}>{test.name} · {correct} out of {test.questions.length} correct</Text>
      </View>

      {passed && !isGuest && (
        <Card style={{ marginTop: 20 }}>
          <Text style={[text.h3, { color: colors.teal }]}>✓ Verified badge added</Text>
          <Text style={[text.muted, { marginTop: 4 }]}>Employers can now see that you passed this test. You have 3 new job matches.</Text>
        </Card>
      )}
      {passed && isGuest && (
        <Note tone="amber" style={{ marginTop: 20 }}>You passed, but guests can't keep badges. Create a free account and retake the test to save it.</Note>
      )}
      {!passed && (
        <Card style={{ marginTop: 20 }}>
          <Text style={text.h3}>You need {PASS_MARK}% to pass</Text>
          <Text style={[text.muted, { marginTop: 4 }]}>You can try again whenever you are ready.</Text>
        </Card>
      )}

      <Card>
        <Text style={text.h3}>To improve</Text>
        <Text style={[text.muted, { marginTop: 4 }]}>{IMPROVE[testId]}</Text>
        <Pressable onPress={() => navigate('Course', { topic: test.name })} hitSlop={6}><Text style={[text.link, { marginTop: 6 }]}>Open the course</Text></Pressable>
      </Card>

      {passed && !isGuest && <Button title="See my new matches" onPress={() => reset('Jobs')} />}
      {passed && isGuest && <Button title="Create free account" onPress={() => navigate('Register')} />}
      {!passed && <Button title="Try again" onPress={() => replace('TestQuestion', { testId })} />}
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
