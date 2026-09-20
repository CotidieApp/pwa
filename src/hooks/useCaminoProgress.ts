'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { captureCaminoAnchor, loadCaminoProgress, restoreCaminoAnchor, saveCaminoProgress,
  type CaminoAnchor } from '@/lib/camino-progress';
import type { ReadingTrace } from '@/lib/reading-store';

export function useCaminoProgress(enabled: boolean, containerRef: RefObject<HTMLDivElement> | undefined,
  legacyTop: number | undefined, zoom: number, family: string, trace: ReadingTrace) {
  const latest = useRef({ legacyTop, trace });
  latest.current = { legacyTop, trace };
  const requestLayout = useRef<() => void>(() => undefined);

  useLayoutEffect(() => {
    const container = containerRef?.current;
    if (!enabled || !container) return;
    let disposed = false;
    let restoring = true;
    let loaded = false;
    let stable: CaminoAnchor | null = null;
    let sequence = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let nativeHandle: { remove: () => Promise<void> } | undefined;
    const report: ReadingTrace = (...args) => latest.current.trace(...args);
    const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const save = (operation: string) => {
      clearTimeout(timer); timer = undefined;
      if (stable) saveCaminoProgress(stable, operation, report);
    };
    const restore = async () => {
      if (!loaded || disposed) return;
      const token = ++sequence;
      restoring = true;
      try {
        const content = container.querySelector<HTMLElement>('[data-camino-content]');
        if (content && document.fonts) {
          const style = getComputedStyle(content);
          await document.fonts.load(`400 ${style.fontSize} ${style.fontFamily}`);
          await document.fonts.load(`700 ${style.fontSize} ${style.fontFamily}`);
          await document.fonts.ready;
        }
        let previous = '';
        while (!disposed && token === sequence) {
          await frame();
          const signature = `${container.clientWidth}:${container.clientHeight}:${container.scrollHeight}:${document.fonts?.status}`;
          if (previous === signature) break;
          previous = signature;
        }
        if (disposed || token !== sequence) return;
        if (stable) {
          if (!restoreCaminoAnchor(container, stable)) throw new Error(`Punto Camino ausente: ${stable.point}`);
        } else {
          // The old Settings pixel is used once, after fonts/layout, to produce a semantic record.
          container.scrollTo({ top: latest.current.legacyTop ?? 0, behavior: 'instant' });
          stable = captureCaminoAnchor(container);
          save('Camino migration');
        }
        await frame(); // consume scroll events caused by restoration before enabling capture
        if (!disposed && token === sequence) restoring = false;
      } catch (error) { report('Camino restore', String(error), true); }
    };
    requestLayout.current = () => { void restore(); };
    const onScroll = () => {
      if (restoring || !loaded) return;
      stable = captureCaminoAnchor(container) ?? stable;
      // Leading memory capture, trailing write; continuous scrolling still writes every 250ms.
      if (!timer) timer = setTimeout(() => save('Camino scroll'), 250);
    };
    const hide = () => { if (document.visibilityState === 'hidden') save('Camino hidden'); };
    const pagehide = () => save('Camino pagehide');
    const resize = () => { void restore(); };
    container.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('resize', resize);
    document.fonts?.addEventListener('loadingdone', resize);
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    const content = container.querySelector('[data-camino-content]');
    if (content) observer.observe(content);
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', state => {
        if (!state.isActive) save('Camino background');
      }).then(handle => { if (disposed) void handle.remove(); else nativeHandle = handle; })
        .catch(error => report('Camino appStateChange', String(error), true));
    }
    void loadCaminoProgress(report).then(record => {
      if (disposed) return;
      stable = record;
      loaded = true;
      return restore();
    }).catch(error => report('Camino load', String(error), true));
    return () => {
      save('Camino close');
      disposed = true; ++sequence;
      requestLayout.current = () => undefined;
      observer.disconnect();
      container.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('resize', resize);
      document.fonts?.removeEventListener('loadingdone', resize);
      void nativeHandle?.remove();
    };
  }, [enabled, containerRef]);

  useLayoutEffect(() => { requestLayout.current(); }, [zoom, family]);
}
