import React, { useEffect } from 'react';
import { View, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/store';
import { TabBar } from './src/ui';
import { colors } from './src/theme';
import { Splash, Landing, Register, Login, Forgot } from './src/screens/auth';
import { Home, Profile, EditProfile, AddEducation, Skills } from './src/screens/profile';
import { Assessments, TestQuestion, TestResult } from './src/screens/tests';
import { Jobs, JobDetail, Course } from './src/screens/jobs';
import { Grow, Mentorship, Guide, Locked, CVBuilder, InterviewSetup, VideoAnswer } from './src/screens/grow';
import { More, AccountDetails, Notifications, Privacy, Help } from './src/screens/more';

const SCREENS = {
  Splash, Landing, Register, Login, Forgot,
  Home, Profile, EditProfile, AddEducation, Skills,
  Assessments, TestQuestion, TestResult,
  Jobs, JobDetail, Course,
  Grow, Mentorship, Guide, Locked, CVBuilder, InterviewSetup, VideoAnswer,
  More, AccountDetails, Notifications, Privacy, Help,
};

const DARK_SCREENS = ['Splash', 'VideoAnswer'];

function Navigator() {
  const { current, stack, goBack, TABS } = useApp();

  // Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) { goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack.length]);

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
