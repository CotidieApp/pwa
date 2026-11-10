'use client';

import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';

export default function LettersLocked() {
  const { unlockLettersSecurity, lettersDeviceUnlockEnabled } = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unlock = async (ownPassword = false) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await unlockLettersSecurity(ownPassword); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo desbloquear.'); }
    finally { setBusy(false); }
  };
  return <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-6">
    <LockKeyhole className="size-10 text-muted-foreground" aria-hidden />
    <h2 className="text-xl font-semibold">Cartas protegidas</h2>
    <p className="text-sm text-muted-foreground max-w-sm">Desbloquea para leer, escribir o editar tus cartas.</p>
    <Button disabled={busy} onClick={() => { void unlock(); }}>{busy ? 'Desbloqueando…' : lettersDeviceUnlockEnabled ? 'Desbloquear con el celular' : 'Introducir clave de Cartas'}</Button>
    {lettersDeviceUnlockEnabled && <Button variant="outline" disabled={busy} onClick={() => { void unlock(true); }}>Usar mi clave de Cartas</Button>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
