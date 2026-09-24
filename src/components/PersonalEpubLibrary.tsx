'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EpubReader from '@/components/EpubReader';
import { useSettings } from '@/context/SettingsContext';
import { listPersonalEpubs, openPersonalEpub, savePersonalEpub, renamePersonalEpub, deletePersonalEpub } from '@/lib/personal-epubs';
import { Trash2, BookOpen, Pencil } from 'lucide-react';

type StoredPersonalEpubMeta = {
  id: string;
  name: string;
  sizeBytes: number;
  updatedAt: number;
};

const INDEX_STORAGE_KEY = 'cotidie_personal_epubs_index';
const MAX_EPUB_SIZE_BYTES = 25 * 1024 * 1024;


const loadStoredEpubs = (): StoredPersonalEpubMeta[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(INDEX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredPersonalEpubMeta =>
        item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.sizeBytes === 'number' &&
        typeof item.updatedAt === 'number'
    );
  } catch {
    return [];
  }
};

const saveStoredEpubs = (items: StoredPersonalEpubMeta[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(items));
};

type PersonalEpubLibraryProps = {
  registerBackHandler?: (handler: (() => boolean) | null) => void;
};

export default function PersonalEpubLibrary({ registerBackHandler }: PersonalEpubLibraryProps) {
  const { incrementStat, pushDevLiveTrace } = useSettings();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const [epubs, setEpubs] = useState<StoredPersonalEpubMeta[]>(() => loadStoredEpubs());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<ArrayBuffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const trace = (message: string, data: string, error = false) => pushDevLiveTrace({
    level: error ? 'warn' : 'info', source: 'personal-epubs', message, data,
  });
  useEffect(() => {
    let cancelled = false;
    void listPersonalEpubs().then(items => {
      if (cancelled) return;
      setEpubs(current => {
        const merged = new Map(current.map(item => [item.id, item]));
        items.forEach(item => { if ((merged.get(item.id)?.updatedAt ?? 0) <= item.updatedAt) merged.set(item.id, item); });
        return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
      });
    }).catch(error => { if (!cancelled) trace('library read', String(error), true); });
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(() => epubs.find((item) => item.id === selectedId) ?? null, [epubs, selectedId]);
  const renameTarget = useMemo(
    () => epubs.find((item) => item.id === renameTargetId) ?? null,
    [epubs, renameTargetId]
  );

  useEffect(() => {
    if (!renameTargetId) return;
    const timeout = window.setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [renameTargetId]);

  // Let the system back button close an open book first (same as the reader's
  // own back button), instead of navigating away from the library. Returns
  // true only when a book is actually open, so backing out of the list itself
  // still falls through to the normal navigation.
  useEffect(() => {
    if (!registerBackHandler) return;
    registerBackHandler(() => {
      if (!selectedId || !selectedSource) return false;
      setSelectedId(null);
      setSelectedSource(null);
      return true;
    });
    return () => registerBackHandler(null);
  }, [registerBackHandler, selectedId, selectedSource]);

  const onUpload = async (file: File) => {
    setErrorMessage(null);
    if (file.size > MAX_EPUB_SIZE_BYTES) {
      setErrorMessage('El EPUB supera el límite de 25MB.');
      return;
    }
    try {
      const entry = { id: `epub-${crypto.randomUUID()}`, name: file.name.trim() || 'EPUB', sizeBytes: file.size, updatedAt: Date.now() };
      await savePersonalEpub(entry, file);
      const buffer = await file.arrayBuffer();
      setEpubs(current => [entry, ...current]);
      setSelectedId(entry.id);
      setSelectedSource(buffer);
      incrementStat('prayersOpenedHistory', 'lectura-espiritual-personales');
    } catch (error) {
      trace('upload', String(error), true);
      setErrorMessage('No se pudo guardar el EPUB. Comprueba el espacio disponible.');
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deletePersonalEpub(id);
      const next = epubs.filter(item => item.id !== id);
      saveStoredEpubs(next);
      setEpubs(next);
      if (selectedId === id) { setSelectedId(null); setSelectedSource(null); }
    } catch (error) { trace('delete', String(error), true); setErrorMessage('No se pudo eliminar el libro.'); }
  };

  const openRename = (id: string) => {
    const item = epubs.find((epub) => epub.id === id);
    if (!item) return;
    setRenameTargetId(item.id);
    setRenameValue(item.name);
  };

  const closeRename = () => {
    setRenameTargetId(null);
    setRenameValue('');
  };

  const submitRename = async () => {
    if (!renameTarget) return;
    const nextName = renameValue.trim();
    if (!nextName) return;
    if (nextName === renameTarget.name) {
      closeRename();
      return;
    }
    const next = epubs.map((epub) =>
      epub.id === renameTarget.id ? { ...epub, name: nextName, updatedAt: Date.now() } : epub
    );
    try {
      await renamePersonalEpub(next.find(item => item.id === renameTarget.id)!);
      saveStoredEpubs(next);
      setEpubs(next);
      closeRename();
    } catch (error) { trace('rename', String(error), true); setErrorMessage('No se pudo guardar el nombre.'); }
  };

  const onOpen = async (id: string) => {
    setErrorMessage(null);
    const item = epubs.find(epub => epub.id === id);
    if (!item) return;
    try {
      const buffer = await openPersonalEpub(item, trace);
      setSelectedId(id);
      setSelectedSource(buffer);
      incrementStat('prayersOpenedHistory', 'lectura-espiritual-personales');
    } catch (error) { trace('open', String(error), true); setErrorMessage('No se pudo abrir el EPUB guardado.'); }
  };

  const renameDialog = (
    <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => {
      if (!open) closeRename();
    }}>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar nombre visible</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submitRename();
          }}
        >
          <Input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Nombre visible"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeRename}>
              Cancelar
            </Button>
            <Button type="submit" disabled={renameValue.trim().length === 0}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (selected && selectedSource) {
    return (
      <>
        <EpubReader
          fileName={`personal-${selected.id}.epub`}
          displayName={selected.name}
          sourceBuffer={selectedSource}
          context="general"
          onClose={() => {
            setSelectedId(null);
            setSelectedSource(null);
          }}
        />
        {renameDialog}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollable">
        <div className="rounded-lg border bg-card/95 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="size-4 text-muted-foreground" />
                Biblioteca personal
              </div>
              <p className="mt-1 text-xs text-muted-foreground">EPUB guardados en este dispositivo.</p>
            </div>
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Subir EPUB
          </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Máximo 25MB por archivo.</p>
        </div>
        {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
          <input
            ref={inputRef}
            id="personal-epub-upload"
            name="personal-epub-upload"
            type="file"
            accept=".epub,application/epub+zip"
            className="hidden"
            aria-label="Subir EPUB personal"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.currentTarget.value = '';
            }}
          />
        <div className="space-y-2">
          {epubs.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card/40 p-6 text-center text-sm text-muted-foreground">
              Aún no has agregado EPUBs personales.
            </div>
          ) : (
            epubs.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-border p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onOpen(item.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    <BookOpen className="size-3 text-muted-foreground shrink-0" />
                    {item.name}
                  </div>
                  <div className="text-xs text-muted-foreground ml-5">
                    {new Date(item.updatedAt).toLocaleString()} · {Math.max(1, Math.round(item.sizeBytes / 1024 / 1024))}MB
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    aria-label="Editar nombre visible"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRename(item.id);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('¿Estás seguro de que deseas eliminar este libro?')) {
                        onDelete(item.id);
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {renameDialog}
    </div>
  );
}
