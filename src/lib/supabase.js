import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Keys come from the .env file (see .env.example)
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const isConfigured = Boolean(url && key && url.startsWith('https://') && !url.includes('YOUR_'));

export const supabase = createClient(
  isConfigured ? url : 'https://not-configured.supabase.co',
  isConfigured ? key : 'not-configured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);

// Keep the login fresh only while the app is open
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
