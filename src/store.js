import React, { createContext, useContext, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './lib/supabase';
import * as api from './lib/api';

const TABS = ['Home', 'Profile', 'Jobs', 'Grow', 'More'];
const TABLE_KEY = { education: 'education', user_skills: 'skills', experience: 'experience', languages: 'languages' };

const guestBundle = () => ({
  profile: { full_name: 'Guest', username: 'guest', job_types: [], availability: [] },
  education: [],
  skills: [],
  experience: [],
  languages: [],
});

const emptyBundle = () => ({ ...guestBundle(), profile: { full_name: '', job_types: [], availability: [] } });

const localId = () => `local-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // mode: 'none' | 'guest' | 'user'
  const [mode, setMode] = useState('none');
  const [uid, setUid] = useState(null);
  const [data, setData] = useState(emptyBundle());
  const uidRef = useRef(null);
  const linkNoticeRef = useRef(null);

  // Data saver (kept on this phone): no camera preview, no photos, typed interview answers
  const [dataSaver, setDataSaverState] = useState(false);
  useEffect(() => { AsyncStorage.getItem('skillbridge.dataSaver').then((v) => setDataSaverState(v === '1')).catch(() => {}); }, []);
  const setDataSaver = useCallback((on) => {
    setDataSaverState(on);
    AsyncStorage.setItem('skillbridge.dataSaver', on ? '1' : '0').catch(() => {});
  }, []);
  const setLinkNotice = useCallback((n) => { linkNoticeRef.current = n; }, []);
  const takeLinkNotice = useCallback(() => { const n = linkNoticeRef.current; linkNoticeRef.current = null; return n; }, []);

  // ---------- navigation (simple stack) ----------
  const [stack, setStack] = useState([{ name: 'Splash', params: {} }]);
  const navigate = useCallback((name, params = {}) => {
    if (TABS.includes(name)) setStack([{ name, params }]);
    else setStack((s) => [...s, { name, params }]);
  }, []);
  const goBack = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const reset = useCallback((name, params = {}) => setStack([{ name, params }]), []);
  const replace = useCallback((name, params = {}) => setStack((s) => [...s.slice(0, -1), { name, params }]), []);

  const reload = useCallback(async () => {
    const id = uidRef.current;
    if (!id) return;
    setData(await api.fetchBundle(id));
  }, []);

  // Called after login, sign up or when the app opens with a saved session
  const startUserSession = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    const id = s.session?.user?.id;
    if (!id) throw new Error('Not logged in.');
    uidRef.current = id;
    setUid(id);
    setData(await api.fetchBundle(id));
    setMode('user');
  }, []);

  const continueAsGuest = useCallback(() => {
    uidRef.current = null;
    setUid(null);
    setData(guestBundle());
    setMode('guest');
  }, []);

  const clearSession = useCallback(() => {
    uidRef.current = null;
    setUid(null);
    setData(emptyBundle());
    setMode('none');
  }, []);

  const logout = useCallback(async () => {
    if (uidRef.current) {
      try { await supabase.auth.signOut(); } catch {}
    }
    clearSession();
  }, [clearSession]);

  const isGuest = mode === 'guest';

  // ---------- data changes (saved to Supabase, or kept on the phone for guests) ----------
  const updateProfile = useCallback(async (fields) => {
    if (!uidRef.current) {
      setData((d) => ({ ...d, profile: { ...d.profile, ...fields } }));
      return;
    }
    const profile = await api.updateProfile(uidRef.current, fields);
    setData((d) => ({ ...d, profile }));
  }, []);

  const saveRow = useCallback(async (table, row) => {
    const key = TABLE_KEY[table];
    if (!uidRef.current) {
      // Guests: keep the change on the phone only
      const id = row.id || localId();
      setData((d) => {
        const list = d[key];
        if (row.id) return { ...d, [key]: list.map((r) => (r.id === id ? { ...r, ...row } : r)) };
        return { ...d, [key]: [...list, { verified: false, ...row, id }] };
      });
      return { ...row, id };
    }
    const saved = await api.saveRow(table, row);
    setData((d) => {
      const list = d[key];
      const exists = list.some((r) => r.id === saved.id);
      return { ...d, [key]: exists ? list.map((r) => (r.id === saved.id ? saved : r)) : [...list, saved] };
    });
    return saved;
  }, []);

  const deleteRow = useCallback(async (table, id) => {
    const key = TABLE_KEY[table];
    if (uidRef.current) await api.deleteRow(table, id);
    setData((d) => ({ ...d, [key]: d[key].filter((r) => r.id !== id) }));
  }, []);

  const value = useMemo(() => ({
    mode, isGuest, uid, data, TABS,
    stack, current: stack[stack.length - 1], navigate, goBack, reset, replace,
    startUserSession, continueAsGuest, logout, clearSession, reload, setLinkNotice, takeLinkNotice,
    updateProfile, saveRow, deleteRow,
    dataSaver, setDataSaver,
  }), [mode, isGuest, uid, data, stack, navigate, goBack, reset, replace, startUserSession, continueAsGuest, logout, clearSession, reload, setLinkNotice, takeLinkNotice, updateProfile, saveRow, deleteRow, dataSaver, setDataSaver]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('') || 'G';

export const ageFrom = (birthYear) => (birthYear ? new Date().getFullYear() - birthYear : null);
