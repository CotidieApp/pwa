'use client';

import React, { useMemo, useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import * as Icon from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function NotificationSettings() {
  const {
    timerEnabled,
    setTimerEnabled,
    timerDuration,
    setTimerDuration,
    notificationsEnabled,
    setNotificationsEnabled,
    dailyReminders,
    addDailyReminder,
    updateDailyReminder,
    removeDailyReminder,
    allPrayers,
    categories,
  } = useSettings();

  const { toast } = useToast();
  const [localTimerDuration, setLocalTimerDuration] = useState(timerDuration);

  const handleTimerDurationSave = () => {
    setTimerDuration(localTimerDuration);
    toast({ title: 'Duración del temporizador guardada.' });
  };

  const reminderTargetOptions = useMemo(() => {
    const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
    const prayers = allPrayers
      .filter((p) => !!p.id && (p.categoryId === 'plan-de-vida' || p.categoryId === 'oraciones'))
      .map((p) => ({
        value: `prayer:${p.id!}`,
        label: `${p.title}${p.categoryId ? ` (${categoryNames.get(p.categoryId) ?? p.categoryId})` : ''}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));

    return [{ value: 'category:devociones', label: 'Devociones (general)' }, ...prayers];
  }, [allPrayers, categories]);

  const getDefaultReminderMessageForTarget = (targetValue: string) => {
    const [type, id] = targetValue.split(':');
    if (type === 'category') return 'Recuerda tus devociones.';
    const prayer = allPrayers.find((p) => p.id === id);
    const title = prayer?.title ?? 'tu oración';
    if (id === 'santa-misa') return `Recuerda tu hora de ${title}.`;
    return `Recuerda rezar ${title}.`;
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">Temporizador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="timer-switch" className="text-sm">
              Activar Temporizador
            </Label>
            <Switch
              id="timer-switch"
              checked={timerEnabled}
              onCheckedChange={setTimerEnabled}
            />
          </div>
          {timerEnabled && (
            <div className="space-y-2">
              <Label htmlFor="timer-duration" className="text-sm">
                Duración (minutos)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="timer-duration"
                  type="number"
                  value={localTimerDuration}
                  onChange={(e) => setLocalTimerDuration(Number(e.target.value))}
                  min="1"
                  className="w-24"
                />
                <Button onClick={handleTimerDurationSave}>Guardar</Button>
              </div>
            </div>
          )}
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">
            Muestra un temporizador en la parte superior izquierda para controlar los tiempos de oración.
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">Notificaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications-switch" className="text-sm">
              Activar Notificaciones
            </Label>
            <Switch
              id="notifications-switch"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>

          <div className={cn("space-y-3", !notificationsEnabled && "opacity-50 pointer-events-none")}>
            {dailyReminders.map((r) => {
              const targetValue = `${r.target.type}:${r.target.id}`;
              const timeValue = `${String(r.time.hours).padStart(2, '0')}:${String(r.time.minutes).padStart(2, '0')}`;
              return (
                <div key={r.id} className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-sm">Activo</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={r.enabled}
                        onCheckedChange={(enabled) => updateDailyReminder(r.id, { enabled })}
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removeDailyReminder(r.id)}
                        aria-label="Eliminar recordatorio"
                      >
                        <Icon.Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Oración / Sección</Label>
                      <Combobox
                        items={reminderTargetOptions}
                        value={targetValue}
                        onSelect={(value) => {
                          if (!value) return;
                          const [type, id] = value.split(':');
                          if (type !== 'prayer' && type !== 'category') return;
                          const targetType = type as 'prayer' | 'category';
                          updateDailyReminder(r.id, { target: { type: targetType, id } });
                          if (!r.message || r.message.trim().length === 0) {
                            updateDailyReminder(r.id, { message: getDefaultReminderMessageForTarget(value) });
                          }
                        }}
                        placeholder="Selecciona una opción"
                        searchPlaceholder="Buscar..."
                        noResultsText="Sin resultados"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Hora</Label>
                      <Input
                        type="time"
                        value={timeValue}
                        onChange={(e) => {
                          const [hh, mm] = e.target.value.split(':').map((x) => Number(x));
                          if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
                          updateDailyReminder(r.id, { time: { hours: hh, minutes: mm } });
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Mensaje</Label>
                    <Input
                      value={r.message}
                      onChange={(e) => updateDailyReminder(r.id, { message: e.target.value })}
                      placeholder={getDefaultReminderMessageForTarget(targetValue)}
                    />
                  </div>
                </div>
              );
            })}

            <Button variant="outline" onClick={addDailyReminder} className="w-full">
              <Icon.Plus className="mr-2 size-4" />
              Agregar Recordatorio
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Programa recordatorios diarios que abren la oración o sección al tocar.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
