'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { Prayer } from '@/lib/types';
import { useSettings } from '@/context/SettingsContext';
import { useCaminoProgress } from '@/hooks/useCaminoProgress';

// Call from the component that owns the scroll element, after its ref attaches.
export function usePrayerScrollPosition(prayer: Prayer, containerRef: RefObject<HTMLDivElement>) {
  const { isLoaded, scrollPositions, setScrollPosition, prayerTextZoom, fontFamily, pushDevLiveTrace } = useSettings();
  const latest = useRef({ scrollPositions, setScrollPosition });
  useLayoutEffect(() => {
    latest.current = { scrollPositions, setScrollPosition };
  }, [scrollPositions, setScrollPosition]);
  const prayerId = prayer.id;
  const isLongText = Boolean(prayer.isLongText);
  const isCamino = prayerId === 'camino-libro';

  useCaminoProgress(isCamino && isLoaded, containerRef, scrollPositions['camino-libro'], prayerTextZoom, fontFamily,
    (message, data, error) => pushDevLiveTrace({ level: error ? 'warn' : 'info', source: 'camino-reader', message, data }));

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !isLoaded || !prayerId || isCamino) return;
    const saved = latest.current.scrollPositions[prayerId];
    container.scrollTo({ top: isLongText && typeof saved === 'number' ? saved : 0, behavior: 'instant' });
    if (!isLongText) return;

    let lastTop = container.scrollTop;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      clearTimeout(timer);
      latest.current.setScrollPosition(prayerId, lastTop);
    };
    const handleScroll = () => {
      lastTop = container.scrollTop;
      clearTimeout(timer);
      timer = setTimeout(flush, 200);
    };
    const handlePageHide = () => { lastTop = container.scrollTop; flush(); };
    const handleVisibility = () => { if (document.visibilityState === 'hidden') handlePageHide(); };
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      // Capture before another prayer restores its position on the same node.
      lastTop = container.scrollTop;
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibility);
      flush();
    };
  }, [containerRef, isLoaded, prayerId, isLongText, isCamino]);
}
