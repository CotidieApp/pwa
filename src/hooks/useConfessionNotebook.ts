'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { CONFESSION_EXPIRY_KEY, CONFESSION_LIFETIME_MS, CONFESSION_NOTE_KEY,
  readConfessionNote, type ConfessionNote } from '@/lib/confession-notebook';
import { migratePrivate, privateOperation, readPrivate, removePrivate, writePrivate } from '@/lib/private-storage';

export function useConfessionNotebook() {
  const [confessionNote, setNote] = useState<ConfessionNote | null>(null);
  const [confessionAutoDelete, setAutoDelete] = useState(false);
  const [confessionStorageError, setError] = useState(false);
  const [confessionLoaded, setLoaded] = useState(false);
  const noteRef = useRef<ConfessionNote | null>(null);
  const autoRef = useRef(false);
  const revision = useRef(0);

  const refresh = useCallback(async () => {
    const version = revision.current;
    try {
      const result = await privateOperation(CONFESSION_NOTE_KEY, async () => {
        const enabled = await migratePrivate<boolean>(CONFESSION_EXPIRY_KEY) === true;
        const raw = await migratePrivate<ConfessionNote>(CONFESSION_NOTE_KEY);
        let deleted = false;
        const note = readConfessionNote({
          getItem: key => key === CONFESSION_NOTE_KEY ? (raw ? JSON.stringify(raw) : null) : String(enabled),
          setItem: () => undefined, removeItem: () => { deleted = true; },
        }, Date.now());
        if (deleted) await removePrivate(CONFESSION_NOTE_KEY);
        else if (note) await writePrivate(CONFESSION_NOTE_KEY, note, enabled ? note.createdAt + CONFESSION_LIFETIME_MS : 0);
        return { note, enabled };
      });
      if (version === revision.current) {
        noteRef.current = result.note; autoRef.current = result.enabled;
        setNote(result.note); setAutoDelete(result.enabled); setError(false);
      }
    } catch { setError(true); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const changed = () => { void refresh(); };
    window.addEventListener('storage', changed);
    document.addEventListener('visibilitychange', visible);
    const listener = Capacitor.isNativePlatform()
      ? App.addListener('appStateChange', ({ isActive }) => { if (isActive) void refresh(); }) : null;
    return () => {
      window.removeEventListener('storage', changed);
      document.removeEventListener('visibilitychange', visible);
      void listener?.then(handle => handle.remove());
    };
  }, [refresh]);

  useEffect(() => {
    if (!confessionAutoDelete || !confessionNote) return;
    const timer = window.setTimeout(() => { void refresh(); },
      Math.max(0, confessionNote.createdAt + CONFESSION_LIFETIME_MS - Date.now()));
    return () => window.clearTimeout(timer);
  }, [confessionAutoDelete, confessionNote, refresh]);

  const setConfessionText = useCallback((text: string) => {
    const version = ++revision.current;
    const now = Date.now();
    const previous = noteRef.current;
    const note = text ? { text: text.slice(0, 20000), createdAt: previous &&
      (!autoRef.current || now < previous.createdAt + CONFESSION_LIFETIME_MS) ? previous.createdAt : now } : null;
    const enabled = autoRef.current;
    if (note) { noteRef.current = note; setNote(note); }
    void privateOperation(CONFESSION_NOTE_KEY, async () => {
      if (note) await writePrivate(CONFESSION_NOTE_KEY, note, enabled ? note.createdAt + CONFESSION_LIFETIME_MS : 0);
      else await removePrivate(CONFESSION_NOTE_KEY);
    }).then(() => {
      if (version !== revision.current) return;
      noteRef.current = note; setNote(note); setError(false);
    }).catch(() => setError(true));
  }, []);

  const setConfessionAutoDelete = useCallback((enabled: boolean) => {
    ++revision.current;
    autoRef.current = enabled; setAutoDelete(enabled);
    void privateOperation(CONFESSION_NOTE_KEY, async () => {
      const note = await readPrivate<ConfessionNote>(CONFESSION_NOTE_KEY);
      // Update the note's deadline first: enabling expiry never leaves a note without a deadline.
      if (note && enabled && Date.now() >= note.createdAt + CONFESSION_LIFETIME_MS) await removePrivate(CONFESSION_NOTE_KEY);
      else if (note) await writePrivate(CONFESSION_NOTE_KEY, note, enabled ? note.createdAt + CONFESSION_LIFETIME_MS : 0);
      await writePrivate(CONFESSION_EXPIRY_KEY, enabled);
    }).then(refresh).catch(() => setError(true));
  }, [refresh]);
  return { confessionNote, confessionAutoDelete, confessionLoaded, confessionStorageError,
    setConfessionText, setConfessionAutoDelete };
}
