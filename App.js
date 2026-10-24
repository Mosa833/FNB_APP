import React, { useEffect } from 'react';
import { View, BackHandler } from 'react-native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/store';
import { TabBar } from './src/ui';
import { colors } from './src/theme';
import { Splash, Setup, Landing, Register, Login, Forgot } from './src/screens/auth';
import { Home, Profile, EditProfile, EducationForm, EducationDetail, Skills, ExperienceForm, Languages, Preferences } from './src/screens/profile';
import { Assessments, TestQuestion, TestResult } from './src/screens/tests';
import { Jobs, JobDetail, Course } from './src/screens/jobs';
import { Grow, Mentorship, Guide, CoachChat, Locked, InterviewSetup, InterviewSession, InterviewResult } from './src/screens/grow';
import { CVBuilder } from './src/screens/cv';
import { CVImport } from './src/screens/cvimport';
import { More, AccountDetails, Notifications, Privacy, Help } from './src/screens/more';

const SCREENS = {
  Splash, Setup, Landing, Register, Login, Forgot,
  Home, Profile, EditProfile, EducationForm, EducationDetail, Skills, ExperienceForm, Languages, Preferences,
  Assessments, TestQuestion, TestResult,
  Jobs, JobDetail, Course,
  Grow, Mentorship, Guide, CoachChat, Locked, CVBuilder, CVImport, InterviewSetup, InterviewSession, InterviewResult,
  More, AccountDetails, Notifications, Privacy, Help,
};

const DARK_SCREENS = ['Splash', 'InterviewSession'];

// Reads the link from the confirmation email. Supabase adds error details after ? or # when the link has expired.
export function noticeFromLink(url) {
  if (!url || !url.includes('email-confirmed')) return null;
  const params = {};
  const extra = [url.split('?')[1], url.split('#')[1]].filter(Boolean).join('&').split('#')[0];
  extra.split('&').forEach((pair) => {
    const [k, v] = pair.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
  });
  if (params.error || params.error_code) {
    return { ok: false, text: params.error_code === 'otp_expired'
      ? 'That confirmation link has expired or was already used. Try logging in. If it says your email is not confirmed, sign up again to get a new link.'
      : `We couldn't confirm your email: ${params.error_description || 'please try again'}.` };
  }
  return { ok: true, text: 'Your email is confirmed. Log in to start using SkillBridge.' };
}

function Navigator() {
  const { current, stack, goBack, TABS, reset, mode, setLinkNotice } = useApp();
  const currentRef = React.useRef(current.name);
  currentRef.current = current.name;

  // Confirmation email link: open the log in page
  useEffect(() => {
    const handle = (url) => {
      const notice = noticeFromLink(url);
      if (!notice) return;
      if (currentRef.current === 'Splash') setLinkNotice(notice); // the splash screen picks it up
      else if (mode !== 'user') reset('Login', { notice });
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, [mode]);

  // Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (current.name === 'InterviewSession') return true; // use the close button so recordings are not lost by accident
      if (stack.length > 1) { goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, current.name]);

  const ScreenComp = SCREENS[current.name] || Home;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={DARK_SCREENS.includes(current.name) ? 'light' : 'dark'} />
      <ScreenComp key={`${current.name}-${stack.length}`} />
      {TABS.includes(current.name) && <TabBar />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Navigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
