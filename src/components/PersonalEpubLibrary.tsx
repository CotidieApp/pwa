'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import EpubReader from '@/components/EpubReader';

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
  const [epubs, setEpubs] = useState<StoredPersonalEpubMeta[]>(() => loadStoredEpubs());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selected = useMemo(() => epubs.find((item) => item.id === selectedId) ?? null, [epubs, selectedId]);

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

  if (selected && selectedSource) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
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
        </div>
        <EpubReader
          fileName={`personal-${selected.id}.epub`}
          sourceBase64={selectedSource}
          context="general"
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
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
            <div key={item.id} className="rounded-md border border-border p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(item.updatedAt).toLocaleString()} · {Math.max(1, Math.round(item.sizeBytes / 1024 / 1024))}MB
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onOpen(item.id)}>
                  Abrir
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
