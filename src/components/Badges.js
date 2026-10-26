import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

// The three levels of proof for a skill, weakest to strongest
export const LEVELS = [
  { key: 'verified', label: 'Tested', means: 'Passed a knowledge test' },
  { key: 'practical', label: 'Practical', means: 'Did a real task, checked against a checklist' },
  { key: 'endorsed', label: 'Endorsed', means: 'Confirmed by someone who saw the work' },
];

export const levelsDone = (skill) => LEVELS.filter((l) => skill?.[l.key]).length;

// For CVs and summaries, e.g. "tested, practical task, endorsed"
export function badgeWords(skill) {
  return [skill?.verified && 'tested', skill?.practical && 'practical task', skill?.endorsed && 'endorsed'].filter(Boolean).join(', ');
}

export function BadgeRow({ skill, style }) {
  return (
    <View style={[st.row, style]} accessibilityLabel={`${skill?.name || 'Skill'}: ${badgeWords(skill) || 'no proof yet'}`}>
      {LEVELS.map((l) => {
        const on = Boolean(skill?.[l.key]);
        return (
          <View key={l.key} style={[st.pill, on ? st.on : st.off]}>
            <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={12} color={on ? colors.white : colors.muted} />
            <Text style={[st.text, { color: on ? colors.white : colors.muted }]}>{l.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 8, marginRight: 6, marginTop: 4, borderWidth: 1 },
  on: { backgroundColor: colors.teal, borderColor: colors.teal },
  off: { backgroundColor: colors.white, borderColor: colors.border },
  text: { fontSize: 11, fontWeight: '700', marginLeft: 4 },
});
