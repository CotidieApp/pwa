'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { parseImportText, MAX_IMPORT_BYTES } from '@/lib/import-safety';
import { parseBackupArchive } from '@/lib/backup-archive';

export default function StorageRecovery({ message, resetting, retry, restore }: {
  message: string; resetting: boolean; retry: () => void;
  restore: (value: unknown) => Promise<{ status: string; description?: string }>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background text-foreground">
    <h1 className="text-xl font-semibold">{resetting ? 'Completar restauración de la aplicación' : 'No se pudieron abrir tus datos'}</h1>
    <p role="alert" className="max-w-md text-center">{message}</p>
    <p className="max-w-md text-center text-sm">{resetting
      ? 'El borrado solicitado quedó pendiente. Continúa para completar todos sus pasos.'
      : 'Tus datos guardados se conservan. Puedes reintentar o restaurar un respaldo válido.'}</p>
    <Button disabled={busy} onClick={retry}>{resetting ? 'Continuar restauración' : 'Reintentar'}</Button>
    {!resetting && <label className="max-w-md text-sm">Restaurar desde un respaldo (reemplaza los datos de la copia)
      <input className="block mt-2" type="file" accept=".ctd,.ctdb,.json" disabled={busy} onChange={async event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setBusy(true); setError('');
        try {
          const complete = file.name.toLowerCase().endsWith('.ctdb');
          if (!complete && file.size > MAX_IMPORT_BYTES) throw new Error('El respaldo supera los 15 MB.');
          const result = await restore(complete ? await parseBackupArchive(file) : parseImportText(await file.text()));
          if (result.status === 'invalid') setError(result.description || 'No se pudo restaurar.');
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo leer el archivo.'); }
        finally { setBusy(false); }
      }} />
    </label>}
    {error && <p role="alert">{error}</p>}
  </main>;
}
