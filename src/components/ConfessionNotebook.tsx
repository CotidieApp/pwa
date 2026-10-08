'use client';

import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Check } from 'lucide-react';

export default function ConfessionNotebook() {
  const { confessionNote, confessionAutoDelete, confessionLoaded, confessionStorageError,
    setConfessionText, setConfessionAutoDelete } = useSettings();
  if (!confessionLoaded) return null;
  return (
    <section className="space-y-3 rounded-lg border bg-card p-4" aria-label="Examen personal de confesión">
      <Label htmlFor="confession-notebook" className="text-base font-semibold">Mi examen de conciencia</Label>
      <p className="text-sm text-muted-foreground">Un espacio para preparar tu confesión. Al marcarlo como listo se borra la nota; no se incluye en las copias de seguridad de Cotidie.</p>
      <Textarea id="confession-notebook" value={confessionNote?.text ?? ''}
        onChange={(event) => setConfessionText(event.target.value)} maxLength={20000}
        className="min-h-40" placeholder="Escribe aquí tu examen…" autoComplete="off" spellCheck={false}
        disabled={confessionStorageError} />
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="confession-auto-delete" className="text-sm">Borrar automáticamente tras 24 horas</Label>
        <Switch id="confession-auto-delete" checked={confessionAutoDelete}
          onCheckedChange={setConfessionAutoDelete} disabled={confessionStorageError} />
      </div>
      {confessionAutoDelete ? <p className="text-xs text-muted-foreground">Las 24 horas cuentan desde que comenzaste esta nota. Si la aplicación está cerrada, se elimina al abrirla, antes de mostrarla.</p> : null}
      {confessionStorageError ? <p role="alert" className="text-sm text-destructive">No se pudo acceder al almacenamiento. La última operación no está confirmada. Vuelve a abrir la aplicación para reintentarlo.</p> : null}
      <Button type="button" onClick={() => setConfessionText('')} disabled={!confessionNote || confessionStorageError}>
        <Check className="mr-2 size-4" />Listo — borrar mi examen
      </Button>
    </section>
  );
}
