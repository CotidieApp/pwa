"use client";

import { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import MainApp from '@/components/main/MainApp';
import SplashScreen from '@/components/main/SplashScreen';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Page() {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const settings = useSettings();

  useEffect(() => {
    const timer = setTimeout(() => setShowSplashScreen(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!settings || showSplashScreen) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
