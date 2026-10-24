import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { searchPlaces } from '../lib/api';

// A text box that shows a dropdown of matches as the person types.
// fetchSuggestions(text) returns [{ key, label, sub? }]
export function AutocompleteField({
  label, placeholder, value, onChangeText, fetchSuggestions, onSelect,
  allowCustom = false, customLabel = (t) => `Add "${t}"`, minChars = 1, error, hint, icon = 'search',
  autoCapitalize = 'sentences', clearOnSelect = false,
}) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef(null);
  const lastQuery = useRef('');

  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (text) => {
    onChangeText(text);
    clearTimeout(timer.current);
    const q = text.trim();
    if (q.length < minChars) { setItems([]); setOpen(false); return; }
    setOpen(true);
    timer.current = setTimeout(async () => {
      lastQuery.current = q;
      setBusy(true);
      try {
        const res = await fetchSuggestions(q);
        if (lastQuery.current === q) { setItems(res); setFailed(false); }
      } catch {
        if (lastQuery.current === q) { setItems([]); setFailed(true); }
      } finally {
        if (lastQuery.current === q) setBusy(false);
      }
    }, 300);
  };

  const pick = (item) => {
    onSelect(item);
    setOpen(false);
    setItems([]);
    if (clearOnSelect) onChangeText('');
  };

  const q = value.trim();
  const exact = items.some((i) => i.label.toLowerCase() === q.toLowerCase());
  const showCustom = allowCustom && q.length >= minChars && !exact && !busy;

  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={st.label}>{label}</Text> : null}
      <View style={[st.input, error && { borderColor: colors.red }, open && { borderColor: colors.teal }]}>
        <Ionicons name={icon} size={16} color={colors.muted} />
        <TextInput
          style={st.text}
          value={value}
          onChangeText={change}
          placeholder={placeholder}
          placeholderTextColor="#9AA6A4"
          autoCorrect={false}
          autoCapitalize={autoCapitalize}
          onFocus={() => q.length >= minChars && setOpen(true)}
          onSubmitEditing={() => { if (items[0]) pick(items[0]); else if (showCustom) pick({ key: 'custom', label: q, custom: true }); }}
          returnKeyType="done"
        />
        {busy ? <ActivityIndicator size="small" color={colors.teal} /> : null}
        {!busy && value ? (
          <Pressable onPress={() => { onChangeText(''); setItems([]); setOpen(false); }} hitSlop={10} accessibilityLabel="Clear">
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {open && (items.length > 0 || showCustom || failed) ? (
        <View style={st.dropdown}>
          {items.map((item) => (
            <Pressable key={item.key} style={({ pressed }) => [st.row, pressed && { backgroundColor: colors.tealLight }]} onPress={() => pick(item)}>
              <Text style={st.rowText}>{item.label}</Text>
              {item.sub ? <Text style={st.rowSub}>{item.sub}</Text> : null}
            </Pressable>
          ))}
          {showCustom ? (
            <Pressable style={({ pressed }) => [st.row, pressed && { backgroundColor: colors.tealLight }]} onPress={() => pick({ key: 'custom', label: q, custom: true })}>
              <Text style={[st.rowText, { color: colors.teal, fontWeight: '700' }]}>{customLabel(q)}</Text>
            </Pressable>
          ) : null}
          {failed && !items.length ? <Text style={[st.rowSub, { padding: 12 }]}>Search is not available right now.</Text> : null}
        </View>
      ) : null}
      {error ? <Text style={st.error}>{error}</Text> : hint ? <Text style={st.hint}>{hint}</Text> : null}
    </View>
  );
}

const newToken = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
});

// Address search using Google Places (through the places-autocomplete edge function)
export function LocationField({ label = 'Where do you live?', value, onChange, error }) {
  const token = useRef(newToken());
  const [text, setText] = useState(value?.location || '');
  const [chosen, setChosen] = useState(Boolean(value?.place_id));

  useEffect(() => { setText(value?.location || ''); setChosen(Boolean(value?.place_id)); }, [value?.location, value?.place_id]);

  return (
    <AutocompleteField
      label={label}
      placeholder="Start typing your area, e.g. Soweto"
      icon="location-outline"
      value={text}
      minChars={2}
      autoCapitalize="words"
      error={error}
      hint={chosen ? 'Address selected' : 'Pick your area from the list'}
      onChangeText={(t) => {
        setText(t);
        setChosen(false);
        onChange({ location: t, place_id: null });
      }}
      fetchSuggestions={async (q) => {
        const res = await searchPlaces(q, token.current);
        return res.map((p) => ({ key: p.placeId, label: p.text, place: p }));
      }}
      onSelect={(item) => {
        setText(item.label);
        setChosen(true);
        onChange({ location: item.label, place_id: item.place?.placeId || null });
        token.current = newToken(); // a new billing session after each pick
      }}
    />
  );
}

const st = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, fontSize: 15, color: colors.text, marginLeft: 8, paddingVertical: 0 },
  dropdown: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, marginTop: 4, overflow: 'hidden' },
  row: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.bg },
  rowText: { fontSize: 15, color: colors.text },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  error: { color: colors.red, fontSize: 12, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
