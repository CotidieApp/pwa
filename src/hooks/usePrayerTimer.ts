'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import BackgroundActions from '@/plugins/BackgroundActions';
import { normalizeTimerMinutes, remainingTimerSeconds } from '@/lib/prayer-timer';

export function usePrayerTimer(onFinished: () => void, onNotificationError: () => void, ready = true) {
  const [timerEnabled, setEnabled] = useState(false);
  const [timerDuration, setDuration] = useState(15);
  const [timerTime, setTimerTime] = useState(900);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [nativeInitialized, setNativeInitialized] = useState(false);
  const actionsRevision = useRef(0);
  const finishedRef = useRef(onFinished);
  const notificationErrorRef = useRef(onNotificationError);
  useEffect(() => {
    finishedRef.current = onFinished;
    notificationErrorRef.current = onNotificationError;
  }, [onFinished, onNotificationError]);
  useEffect(() => {
    if (!ready || nativeInitialized) return;
    let disposed = false;
    const revision = actionsRevision.current;
    if (Capacitor.getPlatform() !== 'android') return;
    void BackgroundActions.getTimerNotification().then(({ remainingMs, hasSession }) => {
      if (disposed) return;
      if (hasSession && actionsRevision.current === revision) {
        // Recover only a previously explicit countdown; reopening always leaves it paused.
        setTimerTime(Math.ceil(remainingMs / 1000));
        setEnabled(true);
        if (remainingMs <= 0) finishedRef.current();
      }
      setNativeInitialized(true);
    }).catch(() => { if (!disposed) { setNativeInitialized(true); notificationErrorRef.current(); } });
    return () => { disposed = true; };
  }, [ready, nativeInitialized]);
  const timerActive = deadline !== null;

  const resetTimer = useCallback(() => {
    ++actionsRevision.current;
    setDeadline(null);
    setTimerTime(timerDuration * 60);
  }, [timerDuration]);

  const setTimerEnabled = useCallback((enabled: boolean) => {
    ++actionsRevision.current;
    setEnabled(enabled);
    if (!enabled) resetTimer();
  }, [resetTimer]);

  const setTimerDuration = useCallback((minutes: number) => {
    ++actionsRevision.current;
    const duration = normalizeTimerMinutes(minutes);
    setDuration(duration);
    setDeadline(null);
    setTimerTime(duration * 60);
  }, []);

  // Opening the timer never starts or restarts a countdown.
  const startTimer = useCallback(() => setEnabled(true), []);
  const toggleTimer = useCallback(() => {
    ++actionsRevision.current;
    if (deadline !== null) {
      setTimerTime(remainingTimerSeconds(deadline, performance.now()));
      setDeadline(null);
      return;
    }
    const seconds = timerTime > 0 ? timerTime : timerDuration * 60;
    setEnabled(true);
    setTimerTime(seconds);
    setDeadline(performance.now() + seconds * 1000);
    if (Capacitor.getPlatform() === 'android') {
      void LocalNotifications.checkPermissions().then(async (permission) => {
        if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
          permission = await LocalNotifications.requestPermissions();
        }
        if (permission.display !== 'granted') notificationErrorRef.current();
      }).catch(() => notificationErrorRef.current());
    }
  }, [deadline, timerDuration, timerTime]);

  useEffect(() => {
    if (deadline === null) return;
    let finished = false;
    const tick = () => {
      if (finished) return;
      const seconds = remainingTimerSeconds(deadline, performance.now());
      setTimerTime(seconds);
      if (seconds === 0) {
        finished = true;
        setDeadline(null);
        finishedRef.current();
      }
    };
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    let disposed = false;
    const nativeListener = Capacitor.isNativePlatform()
      ? App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) return;
        if (Capacitor.getPlatform() !== 'android') { tick(); return; }
        // Android's elapsedRealtime includes deep sleep; browser performance
        // clocks are not guaranteed to include it on every platform.
        void BackgroundActions.getTimerNotification().then(({ remainingMs }) => {
          if (disposed || finished) return;
          if (remainingMs <= 0) {
            finished = true;
            setTimerTime(0);
            setDeadline(null);
            finishedRef.current();
          } else {
            setTimerTime(Math.ceil(remainingMs / 1000));
            setDeadline(performance.now() + remainingMs);
          }
        }).catch(() => { if (!disposed) tick(); });
      })
      : null;
    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      void nativeListener?.then((handle) => handle.remove());
    };
  }, [deadline]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android' || !nativeInitialized) return;
    void BackgroundActions.setTimerNotification({
      remainingMs: deadline === null ? 0 : Math.max(0, deadline - performance.now()),
      active: timerEnabled && deadline !== null,
    }).catch(() => notificationErrorRef.current());
  }, [deadline, timerEnabled, nativeInitialized]);

  useEffect(() => () => {
    if (Capacitor.getPlatform() === 'android' && nativeInitialized) {
      void BackgroundActions.setTimerNotification({ remainingMs: 0, active: false }).catch(() => {});
    }
  }, [nativeInitialized]);

  return { timerEnabled, setTimerEnabled, timerDuration, setTimerDuration, timerTime,
    setTimerTime, timerActive, toggleTimer, resetTimer, startTimer };
}
