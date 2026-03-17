'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import MainApp from '@/components/main/MainApp';
import SplashScreen from '@/components/main/SplashScreen';
import ErrorBoundary from '@/components/ErrorBoundary';

const readWelcomeScreenPreference = () => {
  if (typeof window === 'undefined' || !window.localStorage) return true;

  try {
    const raw = window.localStorage.getItem('cotidie_app_state');
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return parsed?.welcomeScreenEnabled !== false;
  } catch {
    return true;
  }
};

export default function Page() {
  const [showSplashScreen, setShowSplashScreen] = useState(readWelcomeScreenPreference);
  const settings = useSettings();
  const welcomeScreenEnabled = settings?.welcomeScreenEnabled ?? true;

  useEffect(() => {
    if (!welcomeScreenEnabled) {
      setShowSplashScreen(false);
      return;
    }

    const timer = setTimeout(() => setShowSplashScreen(false), 2500);
    return () => clearTimeout(timer);
  }, [welcomeScreenEnabled]);

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled rejection capturada:', event.reason);
    };
    const onWindowError = (event: ErrorEvent) => {
      const message = event?.message ?? '';
      const isResizeObserverNoise =
        message.includes('ResizeObserver loop completed with undelivered notifications') ||
        message.includes('ResizeObserver loop limit exceeded');
      if (isResizeObserverNoise && process.env.NODE_ENV !== 'production') {
        event.preventDefault();
        return;
      }
      console.error('Error global capturado:', event.error || event.message);
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onWindowError);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onWindowError);
    };
  }, []);

  if (welcomeScreenEnabled && showSplashScreen) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
