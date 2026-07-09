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
import { Trash2, BookOpen, Pencil } from 'lucide-react';

type StoredPersonalEpubMeta = {
  id: string;
  name: string;
  sizeBytes: number;
  updatedAt: number;
};

const INDEX_STORAGE_KEY = 'cotidie_personal_epubs_index';
const FILE_KEY_PREFIX = 'cotidie_personal_epub_file_';
const MAX_EPUB_SIZE_BYTES = 25 * 1024 * 1024;

const toFileKey = (id: string) => `${FILE_KEY_PREFIX}${id}`;

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

export default function PersonalEpubLibrary() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const [epubs, setEpubs] = useState<StoredPersonalEpubMeta[]>(() => loadStoredEpubs());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

  const onUpload = (file: File) => {
    setErrorMessage(null);
    if (file.size > MAX_EPUB_SIZE_BYTES) {
      setErrorMessage('El EPUB supera el límite recomendado de 25MB. Usa un archivo más ligero para evitar reinicios.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      if (!raw) return;
      const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
      const entry: StoredPersonalEpubMeta = {
        id: `epub-${Date.now()}`,
        name: file.name.trim() || `EPUB ${epubs.length + 1}`,
        sizeBytes: file.size,
        updatedAt: Date.now(),
      };
      const next = [entry, ...epubs];
      window.localStorage.setItem(toFileKey(entry.id), base64);
      setEpubs(next);
      saveStoredEpubs(next);
      setSelectedId(entry.id);
      setSelectedSource(base64);
    };
    reader.readAsDataURL(file);
  };

  const onDelete = (id: string) => {
    const next = epubs.filter((item) => item.id !== id);
    window.localStorage.removeItem(toFileKey(id));
    setEpubs(next);
    saveStoredEpubs(next);
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedSource(null);
    }
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

  const submitRename = () => {
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
    setEpubs(next);
    saveStoredEpubs(next);
    closeRename();
  };

  const onOpen = (id: string) => {
    setErrorMessage(null);
    const raw = window.localStorage.getItem(toFileKey(id));
    if (!raw || raw.trim().length === 0) {
      setErrorMessage('No se pudo abrir el EPUB guardado. Vuelve a subir el archivo.');
      return;
    }
    setSelectedId(id);
    setSelectedSource(raw);
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
      <div className="flex h-full min-h-0 flex-col gap-3 p-4">
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedId(null);
              setSelectedSource(null);
            }}
          >
            Volver a Personales
          </Button>
          <span className="text-xs text-muted-foreground truncate">{selected.name}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Editar nombre visible"
            onClick={() => openRename(selected.id)}
          >
            <Pencil className="size-4" />
          </Button>
        </div>
        <EpubReader
          fileName={`personal-${selected.id}.epub`}
          sourceBase64={selectedSource}
          context="general"
        />
        {renameDialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollable">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            Subir EPUB
          </Button>
          <span className="text-xs text-muted-foreground">Se guardan localmente en este dispositivo (máx. 25MB por archivo).</span>
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
            <p className="text-sm text-muted-foreground">Aún no has agregado EPUBs personales.</p>
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
