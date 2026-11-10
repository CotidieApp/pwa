'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { finishSecretPrompt, getSecretPrompt, getServerSecretPrompt, subscribeSecretPrompt } from '@/lib/security-prompt';
import { setLettersPrivacySource } from '@/lib/letters-security';

export default function SecretPromptDialog() {
  const prompt = useSyncExternalStore(subscribeSecretPrompt, getSecretPrompt, getServerSecretPrompt);
  useEffect(() => {
    setLettersPrivacySource('password', Boolean(prompt));
    return () => setLettersPrivacySource('password', false);
  }, [prompt]);
  return prompt ? <PromptForm key={prompt.title} prompt={prompt} /> : null;
}

function PromptForm({ prompt }: { prompt: NonNullable<ReturnType<typeof getSecretPrompt>> }) {
  const [secret, setSecret] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [noted, setNoted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cancel = () => { if (!busy) { setSecret(''); setConfirmation(''); finishSecretPrompt(null); } };
  return <Dialog open onOpenChange={open => { if (!open) cancel(); }}>
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto" onInteractOutside={event => event.preventDefault()}>
      <DialogHeader><DialogTitle>{prompt.title}</DialogTitle><DialogDescription>{prompt.description}</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        if (prompt.confirm && secret !== confirmation) { setError('Las claves no coinciden.'); return; }
        if (prompt.warning && !noted) { setError('Confirma que has anotado tu clave.'); return; }
        setBusy(true); setError('');
        try {
          await prompt.verify?.(secret);
          if (getSecretPrompt() === prompt) finishSecretPrompt(secret);
          setSecret(''); setConfirmation('');
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo verificar la clave.'); }
        finally { setBusy(false); }
      }}>
        <div className="space-y-2"><Label htmlFor="security-secret">Clave de {prompt.confirm ? 'Cartas' : 'acceso'}</Label>
          <Input id="security-secret" type="password" autoComplete={prompt.confirm ? 'new-password' : 'current-password'} maxLength={256} required autoFocus disabled={busy} value={secret} onChange={event => setSecret(event.target.value)} /></div>
        {prompt.confirm && <div className="space-y-2"><Label htmlFor="security-secret-confirm">Repite la clave</Label><Input id="security-secret-confirm" type="password" autoComplete="new-password" maxLength={256} required disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></div>}
        {prompt.warning && <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 space-y-3 text-sm">
          <p><strong>La clave no es recuperable.</strong> Anótala y guárdala en un lugar seguro. Si la olvidas, Cotidie no podrá abrir tus respaldos cifrados. La huella de este celular no abre el respaldo en otro dispositivo.</p>
          <label className="flex gap-2 items-start"><input type="checkbox" checked={noted} onChange={event => { setNoted(event.target.checked); setError(''); }} disabled={busy} /><span>He anotado mi clave y entiendo que no se puede recuperar.</span></label>
        </div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={cancel} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Verificando…' : prompt.confirm ? 'Activar seguridad' : 'Continuar'}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
