"use client";

'use client';

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

  if (!settings || showSplashScreen) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
