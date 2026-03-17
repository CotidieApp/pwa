'use client';

import { useEffect, useState } from 'react';
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

function StartupBackdrop() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'var(--home-bg-image)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/55" />
    </div>
  );
}

export default function Page() {
  const [initialWelcomePreference] = useState(readWelcomeScreenPreference);
  const [showSplashScreen, setShowSplashScreen] = useState(initialWelcomePreference);
  const settings = useSettings();
  const isSettingsLoaded = settings?.isLoaded ?? false;
  const effectiveWelcomeScreenEnabled = isSettingsLoaded
    ? settings.welcomeScreenEnabled
    : initialWelcomePreference;

  useEffect(() => {
    if (!isSettingsLoaded) {
      setShowSplashScreen(initialWelcomePreference);
      return;
    }

    if (!effectiveWelcomeScreenEnabled) {
      setShowSplashScreen(false);
      return;
    }

    setShowSplashScreen(true);
    const timer = setTimeout(() => setShowSplashScreen(false), 2500);
    return () => clearTimeout(timer);
  }, [effectiveWelcomeScreenEnabled, initialWelcomePreference, isSettingsLoaded]);

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

  if (!isSettingsLoaded) {
    return effectiveWelcomeScreenEnabled ? <SplashScreen /> : <StartupBackdrop />;
  }

  if (effectiveWelcomeScreenEnabled && showSplashScreen) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
