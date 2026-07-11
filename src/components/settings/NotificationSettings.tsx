'use client';

import React, { useMemo, useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import type { Prayer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import * as Icon from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function flattenPrayers(prayers: Prayer[], prefix: string[] = []): { value: string; label: string }[] {
  const items: { value: string; label: string }[] = [];
  for (const prayer of prayers) {
    if (!prayer.id) continue;
    const nextPrefix = [...prefix, prayer.title || 'Sin título'];
    items.push({ value: `prayer:${prayer.id}`, label: nextPrefix.join(' / ') });
    if (prayer.prayers?.length) {
      items.push(...flattenPrayers(prayer.prayers, nextPrefix));
    }
  }
  return items;
}

function findPrayerTitleById(prayers: Prayer[], id: string): string | null {
  for (const prayer of prayers) {
    if (prayer.id === id) return prayer.title;
    if (prayer.prayers?.length) {
      const found = findPrayerTitleById(prayer.prayers, id);
      if (found) return found;
    }
  }
  return null;
}

function SettingsSwitchRow({
  id,
  title,
  subtitle,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  title: string;
  subtitle?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-card/60 px-3 py-3">
      <Label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-sm font-medium leading-tight">{title}</span>
        {subtitle ? <span className="mt-0.5 block text-xs font-normal leading-tight text-muted-foreground">{subtitle}</span> : null}
      </Label>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function NotificationSettings() {
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    dailyReminders,
    addDailyReminder,
    updateDailyReminder,
    removeDailyReminder,
    allPrayers,
    skipNotificationIfChecked,
    setSkipNotificationIfChecked,
  } = useSettings();

  const [customNotificationsOpen, setCustomNotificationsOpen] = useState(false);

  const reminderTargetOptions = useMemo(
    () => [{ value: 'category:devociones', label: 'Devociones (general)' }, ...flattenPrayers(allPrayers)],
    [allPrayers]
  );

  const getDefaultReminderMessageForTarget = (targetValue: string) => {
    const [type, id] = targetValue.split(':');
    if (type === 'category') return 'Recuerda tus devociones.';
    return `Recuerda rezar ${findPrayerTitleById(allPrayers, id) ?? 'tu oración'}.`;
  };

  const handleAddReminder = () => {
    addDailyReminder();
    setCustomNotificationsOpen(true);
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-2 pt-6">
          <SettingsSwitchRow
            id="notifications-enabled"
            title="Notificaciones"
            subtitle="Recibe diversas a lo largo del día/mes"
            checked={notificationsEnabled}
            onCheckedChange={setNotificationsEnabled}
          />
          <SettingsSwitchRow
            id="skip-notification-if-checked"
            title="Omisión"
            subtitle="No se notifica si está marcada como rezada"
            checked={skipNotificationIfChecked}
            disabled={!notificationsEnabled}
            onCheckedChange={setSkipNotificationIfChecked}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setCustomNotificationsOpen((prev) => !prev)}
          >
            <CardTitle className="font-headline text-base">Personalizadas</CardTitle>
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              {dailyReminders.length}
              <Icon.ChevronDown className={`size-4 transition-transform ${customNotificationsOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
        </CardHeader>

        {customNotificationsOpen ? (
          <CardContent className="space-y-3">
            <div className={!notificationsEnabled ? 'pointer-events-none opacity-50' : ''}>
              <div className="space-y-3">
                {dailyReminders.map((reminder, index) => {
                  const targetValue = `${reminder.target.type}:${reminder.target.id}`;
                  const previousDefaultMessage = getDefaultReminderMessageForTarget(targetValue);
                  const timeValue = `${String(reminder.time.hours).padStart(2, '0')}:${String(reminder.time.minutes).padStart(2, '0')}`;

                  return (
                    <div key={reminder.id} className="space-y-3 rounded-md border bg-card/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm font-medium">Notificación {index + 1}</Label>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={reminder.enabled}
                            onCheckedChange={(enabled) => updateDailyReminder(reminder.id, { enabled })}
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label="Eliminar notificación">
                                <Icon.Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar notificación?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeDailyReminder(reminder.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Oración</Label>
                        <Combobox
                          items={reminderTargetOptions}
                          value={targetValue}
                          onSelect={(value) => {
                            if (!value) return;
                            const [type, id] = value.split(':');
                            if (type !== 'prayer' && type !== 'category') return;
                            const nextDefaultMessage = getDefaultReminderMessageForTarget(value);
                            updateDailyReminder(reminder.id, {
                              target: { type: type as 'prayer' | 'category', id },
                              message:
                                !reminder.message ||
                                reminder.message.trim().length === 0 ||
                                reminder.message === previousDefaultMessage
                                  ? nextDefaultMessage
                                  : reminder.message,
                            });
                          }}
                          placeholder="Selecciona una oración"
                          searchPlaceholder="Buscar..."
                          noResultsText="Sin resultados"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Hora</Label>
                        <Input
                          type="time"
                          value={timeValue}
                          onChange={(event) => {
                            const [hours, minutes] = event.target.value.split(':').map((part) => Number(part));
                            if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return;
                            updateDailyReminder(reminder.id, { time: { hours, minutes } });
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Mensaje</Label>
                        <Input
                          value={reminder.message}
                          onChange={(event) => updateDailyReminder(reminder.id, { message: event.target.value })}
                          placeholder={getDefaultReminderMessageForTarget(targetValue)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleAddReminder}>
              <Icon.Plus className="mr-2 size-4" />
              Agregar notificación
            </Button>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
