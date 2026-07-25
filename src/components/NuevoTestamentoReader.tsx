'use client';

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, BookOpen, Download } from 'lucide-react';
import EpubReader from '@/components/EpubReader';
import { Button } from '@/components/ui/button';
import { getOfflineEpub, saveOfflineEpub, downloadEpubAsBase64 } from '@/lib/offline-epub';

// Keep this identical to the historical value EpubReader defaulted to, so the
// saved reading position / bookmarks / highlights keys match whether the book
// is read online (by URL) or offline (from the stored copy).
const NT_FILE = 'nuevo-testamento.epub';
const NT_URL = '/epub/nuevo-testamento.epub';
const NT_SIZE_LABEL = '2,4 MB';

type Props = { onClose: () => void };

// Wrapper around the shared EpubReader for the built-in New Testament.
//
// On native (APK) this is a pure passthrough — identical behavior to before,
// since the EPUB ships in the bundle and already works offline. The optional
// "download for offline" flow exists ONLY in the web/PWA build, where reading
// by URL fails without a connection.
export default function NuevoTestamentoReader({ onClose }: Props) {
  if (Capacitor.isNativePlatform()) {
    return <EpubReader onClose={onClose} />;
  }
  return <PwaNuevoTestamentoReader onClose={onClose} />;
}

function PwaNuevoTestamentoReader({ onClose }: Props) {
  const skippedRef = useRef(false);
  const [phase, setPhase] = useState<'checking' | 'gate' | 'reader'>('checking');
  const [offlineSource, setOfflineSource] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getOfflineEpub(NT_FILE);
      if (cancelled) return;
      if (stored) {
        setOfflineSource(stored);
        setPhase('reader');
      } else {
        setPhase(skippedRef.current ? 'reader' : 'gate');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const base64 = await downloadEpubAsBase64(NT_URL);
      await saveOfflineEpub(NT_FILE, base64);
      setOfflineSource(base64);
      setPhase('reader');
    } catch {
      setError('No se pudo descargar. Necesitas conexión; inténtalo de nuevo.');
    } finally {
      setDownloading(false);
    }
  };

  const handleReadWithoutDownload = () => {
    skippedRef.current = true;
    setPhase('reader');
  };

  if (phase === 'reader') {
    return (
      <EpubReader
        onClose={onClose}
        fileName={NT_FILE}
        sourceBase64={offlineSource ?? undefined}
        context="nt"
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="p-3">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Volver">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        {phase === 'checking' ? (
          <p className="text-sm text-muted-foreground">Preparando lectura…</p>
        ) : (
          <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card/95 p-6 text-center shadow-sm">
            <div className="mx-auto w-fit rounded-md bg-primary/10 p-3 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Nuevo Testamento</h2>
              <p className="text-sm text-muted-foreground">
                Puedes descargarlo (≈ {NT_SIZE_LABEL}) para leerlo sin conexión. Es opcional.
              </p>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="space-y-2">
              <Button className="w-full" onClick={handleDownload} disabled={downloading}>
                <Download className="mr-2 h-4 w-4" />
                {downloading ? 'Descargando…' : 'Descargar y leer sin conexión'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleReadWithoutDownload}
                disabled={downloading}
              >
                Leer sin descargar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
