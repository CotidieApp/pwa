'use client';

import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

export default function CartasIntro() {
  const {
    cartasReminderEnabled,
    setCartasReminderEnabled,
    notificationsEnabled,
  } = useSettings();

  return (
    <Card className="mb-4 bg-card/80 shadow-md backdrop-blur-sm border-border/50">
      <CardContent className="p-6 text-sm text-foreground/90 space-y-3">
        <p>
          Escribe una carta al Señor. Agradece lo vivido, pide claridad por lo que se viene,
          ruega ante una necesidad..., pero, sobre todo, háblale; no como un servidor a su señor,
          sino como un hijo a su Padre. Amor de Padre es el Suyo, no lo olvides.
        </p>
        <blockquote className="italic text-foreground/80 pl-4 border-l-2 border-border">
          "Cuando te pongas delante de Dios, ten el descaro santo de un hijo que habla con su Padre."
        </blockquote>
        <div className="text-right text-foreground/80">- San Josemaría Escrivá</div>
        <div className="rounded-md border border-border/60 bg-background/40 p-4 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="font-medium text-foreground">Recordatorio de Cartas</div>
              <p className="text-xs text-foreground/75">
                Si pasan 30 días sin escribir una carta nueva, Cotidie te enviará una notificación
                y al tocarla abrirá directamente esta sección.
              </p>
              <p className="text-xs text-foreground/70">
                El contador se reinicia solo cuando creas una carta nueva.
              </p>
              {!notificationsEnabled && (
                <p className="text-xs text-foreground/70">
                  Además necesitas tener activadas las notificaciones generales en Ajustes.
                </p>
              )}
            </div>
            <Switch
              aria-label="Activar recordatorio de Cartas"
              checked={cartasReminderEnabled}
              onCheckedChange={setCartasReminderEnabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
