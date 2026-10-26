import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from './theme';
import { useApp } from './store';

export function Screen({ children, scroll = true, padded = true, bg = colors.bg, footer = null, style }) {
  const insets = useSafeAreaInsets();
  const { current, TABS } = useApp();
  const hasTabs = TABS.includes(current.name);
  const content = (
    <View style={[!scroll && { flex: 1 }, padded && { paddingHorizontal: 20 }, { paddingTop: 12, paddingBottom: 24 }, style]}>{children}</View>
  );
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>{content}</ScrollView>
      ) : (
        content
      )}
      {footer}
      {!hasTabs && <View style={{ height: insets.bottom }} />}
    </KeyboardAvoidingView>
  );
}

export function BackHeader({ title, right }) {
  const { goBack } = useApp();
  return (
    <View style={s.backRow}>
      <Pressable onPress={goBack} hitSlop={12} accessibilityLabel="Go back" style={{ paddingRight: 10 }}>
        <Ionicons name="arrow-back" size={24} color={colors.teal} />
      </Pressable>
      {title ? <Text style={s.backTitle}>{title}</Text> : null}
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', icon, disabled, style, loading }) {
  const v = {
    primary: { bg: colors.teal, fg: colors.white, border: colors.teal },
    outline: { bg: colors.white, fg: colors.teal, border: colors.teal },
    plain: { bg: colors.white, fg: colors.text, border: colors.border },
    danger: { bg: colors.red, fg: colors.white, border: colors.red },
    link: { bg: 'transparent', fg: colors.teal, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'link' && { minHeight: 36 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} style={{ marginRight: 8 }} /> : icon}
      <Text style={[s.btnText, { color: v.fg }]}>{title}</Text>
    </Pressable>
  );
}

export function GoogleButton({ title, onPress }) {
  return (
    <Button
      variant="plain"
      title={title}
      onPress={onPress}
      icon={<Text style={{ color: '#4285F4', fontWeight: '800', fontSize: 17, marginRight: 8 }}>G</Text>}
    />
  );
}

export function Field({ label, value, onChangeText, placeholder, secure, keyboardType, autoCapitalize = 'none', error, multiline, maxLength, hint }) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.input, multiline && { minHeight: 100, alignItems: 'flex-start', paddingVertical: 12 }, error && { borderColor: colors.red }]}>
        <TextInput
          style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0, minHeight: multiline ? 76 : undefined }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA6A4"
          secureTextEntry={secure && !show}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          maxLength={maxLength}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {secure ? (
          <Pressable onPress={() => setShow(!show)} hitSlop={10}>
            <Text style={{ color: colors.muted }}>{show ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

// Simple dropdown that opens a list below the field
export function Select({ label, value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <Pressable style={s.input} onPress={() => setOpen(!open)}>
        <Text style={{ flex: 1, fontSize: 15, color: value ? colors.text : '#9AA6A4' }}>{value || placeholder}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
      </Pressable>
      {open && (
        <ScrollView style={s.dropdown} nestedScrollEnabled>
          {options.map((o) => (
            <Pressable key={o} onPress={() => { onChange(o); setOpen(false); }} style={s.dropItem}>
              <Text style={{ color: o === value ? colors.teal : colors.text, fontWeight: o === value ? '700' : '400' }}>{o}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export function Card({ children, style, onPress }) {
  const Comp = onPress ? Pressable : View;
  return <Comp onPress={onPress} style={[s.card, style]}>{children}</Comp>;
}

export function Chip({ label, active, onPress, tone = 'default', small }) {
  const tones = {
    default: active ? { bg: colors.teal, fg: colors.white, bd: colors.teal } : { bg: colors.white, fg: colors.muted, bd: colors.border },
    verified: { bg: colors.tealLight, fg: colors.tealDark, bd: colors.tealLight },
    amber: { bg: colors.amberLight, fg: '#9A5B00', bd: colors.amberLight },
    new: { bg: colors.amberLight, fg: '#9A5B00', bd: colors.amberLight },
    red: { bg: colors.redLight, fg: colors.red, bd: colors.redLight },
  };
  const t = tones[tone];
  const Comp = onPress ? Pressable : View;
  return (
    <Comp onPress={onPress} style={[s.chip, { backgroundColor: t.bg, borderColor: t.bd }, small && { paddingVertical: 3, paddingHorizontal: 8 }]}>
      <Text style={{ color: t.fg, fontWeight: '700', fontSize: small ? 11 : 13 }}>{label}</Text>
    </Comp>
  );
}

export function Progress({ value, color = colors.amber, track = 'rgba(255,255,255,0.25)', height = 7 }) {
  return (
    <View style={{ height, backgroundColor: track, borderRadius: radius.pill, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(100, Math.max(0, value))}%`, height, backgroundColor: color, borderRadius: radius.pill }} />
    </View>
  );
}

export function Avatar({ text, size = 40, bg = colors.amber, uri }) {
  const { dataSaver } = useApp();
  // Data saver: initials instead of downloading the photo
  if (uri && !dataSaver) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.border }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.white, fontWeight: '800', fontSize: size * 0.36 }}>{text}</Text>
    </View>
  );
}

export function Note({ children, tone = 'teal', style }) {
  const bg = tone === 'amber' ? colors.amberLight : tone === 'red' ? colors.redLight : colors.tealLight;
  return <View style={[s.note, { backgroundColor: bg }, style]}><Text style={s.noteText}>{children}</Text></View>;
}

export function ErrorNote({ message, onRetry }) {
  if (!message) return null;
  return (
    <View style={[s.note, { backgroundColor: colors.redLight }]}>
      <Text style={{ color: colors.red, fontSize: 14, lineHeight: 20 }}>{message}</Text>
      {onRetry ? <Text onPress={onRetry} style={{ color: colors.red, fontWeight: '700', marginTop: 6 }}>Try again</Text> : null}
    </View>
  );
}

export function Loading({ label }) {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
      <ActivityIndicator color={colors.teal} size="large" />
      {label ? <Text style={{ color: colors.muted, marginTop: 12, textAlign: 'center' }}>{label}</Text> : null}
    </View>
  );
}

export function SectionTitle({ title, action, onAction }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.section}>{title}</Text>
      {action ? <Pressable onPress={onAction} hitSlop={10}><Text style={s.sectionAction}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function Divider({ text = 'or' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 14 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text style={{ marginHorizontal: 10, color: colors.muted }}>{text}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}

const TAB_ICONS = { Home: 'home', Profile: 'person', Jobs: 'briefcase', Grow: 'trending-up', More: 'ellipsis-horizontal' };

export function TabBar() {
  const { current, navigate, TABS } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((t) => {
        const active = current.name === t;
        return (
          <Pressable key={t} style={s.tab} onPress={() => navigate(t)} accessibilityRole="tab" accessibilityState={{ selected: active }}>
            <Ionicons name={active ? TAB_ICONS[t] : `${TAB_ICONS[t]}-outline`} size={22} color={active ? colors.teal : colors.muted} />
            <Text style={[s.tabText, active && { color: colors.teal, fontWeight: '700' }]}>{t}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const text = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 6 },
  h2: { fontSize: 20, fontWeight: '800', color: colors.text },
  h3: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted },
  link: { color: colors.teal, fontWeight: '700' },
});

const s = StyleSheet.create({
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, minHeight: 32 },
  backTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  btn: { minHeight: 52, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 16, marginVertical: 5 },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  error: { color: colors.red, fontSize: 12, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  dropdown: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, marginTop: 4, maxHeight: 240 },
  dropItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.bg },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, alignSelf: 'flex-start' },
  note: { borderRadius: radius.md, padding: 14, marginVertical: 8 },
  noteText: { color: colors.tealDark, fontSize: 14, lineHeight: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  section: { fontSize: 17, fontWeight: '800', color: colors.text },
  sectionAction: { color: colors.teal, fontWeight: '700' },
  tabBar: { flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  tabText: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
