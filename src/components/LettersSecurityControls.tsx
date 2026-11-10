'use client';

import { useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function LettersSecurityControls({ closeInfo }: { closeInfo: () => void }) {
  const { lettersSecurityEnabled, lettersDeviceUnlockEnabled, enableLettersSecurity, disableLettersSecurity, lockLettersSecurity } = useSettings();
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const change = async (enabled: boolean) => {
    if (busy) return;
    setBusy(true);
    closeInfo();
    // Close the information modal before opening the password dialog.
    await new Promise(resolve => setTimeout(resolve, 0));
    try { await (enabled ? enableLettersSecurity() : disableLettersSecurity()); }
    catch (error) { toast({ variant: 'destructive', title: 'Seguridad de Cartas', description: error instanceof Error ? error.message : 'No se pudo cambiar la seguridad.' }); }
    finally { setBusy(false); }
  };
  return <div className="rounded-md border border-border/60 bg-muted/30 p-4 space-y-3">
    <div className="flex items-start justify-between gap-4"><div className="space-y-1 flex-1">
      <div className="font-medium text-foreground">Proteger Cartas</div>
      <p className="text-xs text-foreground/75 leading-relaxed">Pide desbloqueo para acceder a tus cartas y antes de exportar datos. Los respaldos se cifran con tu clave de Cartas.</p>
    </div><Switch aria-label="Activar seguridad de Cartas" checked={lettersSecurityEnabled} disabled={busy} onCheckedChange={enabled => { void change(enabled); }} /></div>
    <p className="text-xs text-muted-foreground">{lettersSecurityEnabled
      ? lettersDeviceUnlockEnabled ? 'Puedes usar la seguridad del celular o tu clave de Cartas.' : 'Usa tu clave de Cartas para desbloquear.'
      : 'Al activarla crearás una clave propia. Si el celular es compatible, también podrás desbloquear con su seguridad.'}</p>
    <p className="text-xs text-muted-foreground"><strong>La clave no es recuperable.</strong> Anótala y guárdala en un lugar seguro. Los respaldos anteriores conservan la clave con que se crearon.</p>
    {lettersSecurityEnabled && <Button variant="outline" size="sm" onClick={() => { closeInfo(); void lockLettersSecurity().catch(error => toast({ variant: 'destructive', title: 'No se pudo guardar Cartas', description: String(error) })); }}>Bloquear ahora</Button>}
  </div>;
}
