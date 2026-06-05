'use client';

import { useEffect } from 'react';

export function useScreenWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    let wakeLock: any = null;
    let cancelled = false;

    const requestWakeLock = async () => {
      if (cancelled || typeof document === 'undefined' || document.visibilityState !== 'visible') {
        return;
      }

      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch {
        wakeLock = null;
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      } else if (wakeLock) {
        void wakeLock.release().catch(() => undefined);
        wakeLock = null;
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        void wakeLock.release().catch(() => undefined);
      }
    };
  }, [enabled]);
}
