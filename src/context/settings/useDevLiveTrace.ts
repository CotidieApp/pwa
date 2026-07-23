import { useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DevTraceEvent, DevTraceLevel } from './types';

const DEV_TRACE_MAX_EVENTS = 400;

export const useDevLiveTrace = (
  devLiveTraceEnabled: boolean,
  isDeveloperMode: boolean,
  setDevLiveTraceEvents: Dispatch<SetStateAction<DevTraceEvent[]>>,
) => {
  const pushDevLiveTrace = useCallback((event: Omit<DevTraceEvent, 'id' | 'ts'>) => {
    if (!isDeveloperMode || !devLiveTraceEnabled) return;
    const normalizedLevel: DevTraceLevel =
      event.level === 'error' || event.level === 'warn' ? event.level : 'info';
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextEvent: DevTraceEvent = {
      id,
      ts: Date.now(),
      level: normalizedLevel,
      source: String(event.source || 'app'),
      message: String(event.message || ''),
      data: typeof event.data === 'string' && event.data.trim().length > 0 ? event.data : undefined,
    };
    setDevLiveTraceEvents((prev) => {
      const next = [...prev, nextEvent];
      return next.length > DEV_TRACE_MAX_EVENTS ? next.slice(next.length - DEV_TRACE_MAX_EVENTS) : next;
    });
    // There is currently no in-app screen that shows devLiveTraceEvents, so
    // this is the only way to actually see these traces live (browser
    // devtools console, or `adb logcat` on the installed Android app).
    const consoleMethod = normalizedLevel === 'error' ? console.error : normalizedLevel === 'warn' ? console.warn : console.info;
    consoleMethod(`[COTIDIE-TRACE][${nextEvent.source}] ${nextEvent.message}${nextEvent.data ? ` — ${nextEvent.data}` : ''}`);
  }, [devLiveTraceEnabled, isDeveloperMode]);

  const clearDevLiveTraceEvents = useCallback(() => {
    setDevLiveTraceEvents([]);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isDeveloperMode || !devLiveTraceEnabled) return;

    const onError = (event: ErrorEvent) => {
      pushDevLiveTrace({
        level: 'error',
        source: 'window.error',
        message: event.message || 'Error no controlado.',
        data:
          typeof event.filename === 'string' && event.filename
            ? `${event.filename}:${event.lineno}:${event.colno}`
            : undefined,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        typeof event.reason === 'string'
          ? event.reason
          : event.reason instanceof Error
            ? event.reason.message
            : 'Promise rechazada sin detalle';
      pushDevLiveTrace({
        level: 'error',
        source: 'window.unhandledrejection',
        message: reason,
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, [devLiveTraceEnabled, isDeveloperMode, pushDevLiveTrace]);

  return { pushDevLiveTrace, clearDevLiveTraceEvents };
};
