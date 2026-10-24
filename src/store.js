<<<<<<< HEAD
import React, { createContext, useContext, useMemo, useState, useCallback, useRef } from 'react';
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
=======
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

const TABS = ['Home', 'Profile', 'Jobs', 'Grow', 'More'];

const demoUser = {
  name: 'Thabo Mokoena',
  email: 'thabo@email.com',
  phone: '071 000 0000',
  username: 'thabo_m',
  location: 'Soweto, Gauteng',
  age: 21,
};

const startProfile = () => ({
  education: [
    { id: 'e1', qualification: 'Diploma', title: 'Diploma in IT', school: 'Tshwane University of Technology', field: 'Information Technology', start: '2024', end: 'Still studying', certificate: null },
    { id: 'e2', qualification: 'Matric (Grade 12)', title: 'Matric (Grade 12)', school: '', field: '', start: '2018', end: '2022', certificate: null },
  ],
  skills: [
    { name: 'Excel', level: 'Intermediate', verified: true },
    { name: 'Customer service', level: 'Intermediate', verified: true },
    { name: 'Phone repair', level: 'Advanced', verified: false },
    { name: 'Social media', level: 'Beginner', verified: false },
  ],
  testResults: { customer: 85, excel: 78 },
  experience: [{ title: 'Phone repairs (self-employed)', period: '2023 to now' }],
});

const emptyProfile = () => ({ education: [], skills: [], testResults: {}, experience: [] });
>>>>>>> origin/main

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // mode: 'none' | 'guest' | 'user'
  const [mode, setMode] = useState('none');
<<<<<<< HEAD
  const [uid, setUid] = useState(null);
  const [data, setData] = useState(emptyBundle());
  const uidRef = useRef(null);

  // ---------- navigation (simple stack) ----------
=======
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(emptyProfile());
  const [savedJobs, setSavedJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [interview, setInterview] = useState({ left: 2, limit: 3, past: [{ label: 'Call centre · 12 Oct', rating: 'Good' }] });
  const [bookings, setBookings] = useState([]);
  const [newMatches, setNewMatches] = useState(0);

  // simple stack navigation
>>>>>>> origin/main
  const [stack, setStack] = useState([{ name: 'Splash', params: {} }]);
  const navigate = useCallback((name, params = {}) => {
    if (TABS.includes(name)) setStack([{ name, params }]);
    else setStack((s) => [...s, { name, params }]);
  }, []);
<<<<<<< HEAD
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
    startUserSession, continueAsGuest, logout, clearSession, reload,
    updateProfile, saveRow, deleteRow,
  }), [mode, isGuest, uid, data, stack, navigate, goBack, reset, replace, startUserSession, continueAsGuest, logout, clearSession, reload, updateProfile, saveRow, deleteRow]);
=======
  const goBack = useCallback(() => {
    let handled = false;
    setStack((s) => {
      if (s.length > 1) { handled = true; return s.slice(0, -1); }
      return s;
    });
    return handled;
  }, []);
  const reset = useCallback((name, params = {}) => setStack([{ name, params }]), []);
  const replace = useCallback((name, params = {}) => setStack((s) => [...s.slice(0, -1), { name, params }]), []);

  const isGuest = mode === 'guest';

  const value = useMemo(() => ({
    mode, isGuest, user, profile, savedJobs, appliedJobs, interview, bookings, newMatches,
    stack, current: stack[stack.length - 1], navigate, goBack, reset, replace, TABS,

    register: (data) => {
      setUser({ ...demoUser, ...data, location: 'Soweto, Gauteng', age: 21 });
      setProfile(startProfile());
      setMode('user');
    },
    login: (username) => {
      setUser({ ...demoUser, username: username || demoUser.username });
      setProfile(startProfile());
      setMode('user');
    },
    continueAsGuest: () => {
      setUser({ name: 'Guest', location: '', username: 'guest' });
      setProfile(emptyProfile());
      setMode('guest');
    },
    logout: () => {
      setMode('none'); setUser(null); setProfile(emptyProfile());
      setSavedJobs([]); setAppliedJobs([]); setBookings([]); setNewMatches(0);
      setInterview({ left: 3, limit: 3, past: [] });
    },
    updateUser: (data) => setUser((u) => ({ ...u, ...data })),

    addEducation: (edu) => setProfile((p) => ({ ...p, education: [...p.education, { id: String(Date.now()), ...edu }] })),
    setSkills: (skills) => setProfile((p) => ({ ...p, skills })),

    recordTest: (test, score, passed) => {
      setProfile((p) => {
        const testResults = { ...p.testResults };
        if (passed) testResults[test.id] = score;
        let skills = p.skills;
        if (passed && mode === 'user') {
          const exists = skills.find((s) => s.name === test.skill);
          skills = exists
            ? skills.map((s) => (s.name === test.skill ? { ...s, verified: true } : s))
            : [...skills, { name: test.skill, level: 'Intermediate', verified: true }];
        }
        return { ...p, testResults: mode === 'user' ? testResults : p.testResults, skills };
      });
      if (passed && mode === 'user') setNewMatches(3);
    },

    toggleSave: (id) => setSavedJobs((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    apply: (id) => setAppliedJobs((s) => (s.includes(id) ? s : [...s, id])),
    book: (id) => setBookings((b) => (b.includes(id) ? b : [...b, id])),

    finishInterview: (jobType, rating) => setInterview((iv) => {
      const d = new Date();
      const month = d.toLocaleString('en-GB', { month: 'short' });
      return { ...iv, left: Math.max(0, iv.left - 1), past: [{ label: `${jobType.split(' ')[0]} · ${d.getDate()} ${month}`, rating }, ...iv.past] };
    }),
  }), [mode, isGuest, user, profile, savedJobs, appliedJobs, interview, bookings, newMatches, stack, navigate, goBack, reset, replace]);
>>>>>>> origin/main

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('') || 'G';
<<<<<<< HEAD

export const ageFrom = (birthYear) => (birthYear ? new Date().getFullYear() - birthYear : null);
=======
>>>>>>> origin/main
