'use client';

import React, { useMemo, useState } from 'react';
import { useSettings, type PrayerLanguageMode } from '@/context/SettingsContext';
import { initialPrayers } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const alwaysVisiblePrayerRows = [
  { id: 'mes-de-maria', title: 'Mes de María', subtitle: '8 de Noviembre al 8 de Diciembre' },
  { id: 'sagrado-corazon', title: 'Mes del Sagrado Corazón', subtitle: 'Junio' },
  { id: 'cartas', title: 'Cartas' },
  { id: 'simbolo-quicumque', title: 'Símbolo Quicumque', subtitle: 'Domingo' },
  { id: 'salmo-ii', title: 'Salmo II', subtitle: 'Martes' },
  { id: 'adoro-te-devote', title: 'Adoro Te Devote', subtitle: 'Jueves' },
  { id: 'salve-regina', title: 'Salve Regina', subtitle: 'Sábado' },
  { id: 'preces', title: 'Preces' },
  { id: 'via-crucis', title: 'Vía Crucis' },
];

const alwaysVisiblePrayerIds = new Set(alwaysVisiblePrayerRows.map((row) => row.id));
const languageProfiles: Array<{ value: PrayerLanguageMode; label: string }> = [
  { value: 'espanol', label: 'Español' },
  { value: 'latin', label: 'Latín' },
  { value: 'ambos', label: 'Ambos' },
];

function SwitchRow({
  id,
  title,
  subtitle,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  subtitle?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-card/60 px-3 py-3">
      <Label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-sm font-medium leading-tight">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-xs font-normal leading-tight text-muted-foreground">{subtitle}</span>
        ) : null}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function ContentSettings() {
  const {
    alwaysShowPrayers,
    toggleAlwaysShowPrayer,
    hiddenPrayerIds,
    removePredefinedPrayer,
    restorePredefinedPrayer,
    timerEnabled,
    setTimerEnabled,
    timerDuration,
    setTimerDuration,
    prayerLanguageProfile,
    setPrayerLanguageProfile,
    isDeveloperMode,
    isEditModeEnabled,
    setIsEditModeEnabled,
    restoreAllPredefinedPrayers,
  } = useSettings();

  const [showHideList, setShowHideList] = useState(false);

  const hideablePlanPrayers = useMemo(
    () =>
      initialPrayers.filter(
        (prayer) =>
          prayer.categoryId === 'plan-de-vida' &&
          Boolean(prayer.id) &&
          !alwaysVisiblePrayerIds.has(prayer.id!)
      ),
    []
  );

  const updateTimerDuration = (value: string) => {
    const next = Math.max(1, Math.floor(Number(value) || 1));
    setTimerDuration(next);
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">
            Visibilidad de Oraciones
            <span className="mt-1 block text-xs font-normal text-muted-foreground">Para ver todos los días</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alwaysVisiblePrayerRows.map((row) => (
            <SwitchRow
              key={row.id}
              id={`always-show-${row.id}`}
              title={row.title}
              subtitle={row.subtitle}
              checked={alwaysShowPrayers.includes(row.id)}
              onCheckedChange={() => toggleAlwaysShowPrayer(row.id)}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="font-headline text-base">Ocultar oraciones</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowHideList((prev) => !prev)}>
              {showHideList ? 'Ocultar lista' : 'Abrir lista'}
              <Icon.ChevronDown className={`ml-2 size-4 transition-transform ${showHideList ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        {showHideList ? (
          <CardContent className="space-y-2">
            {hideablePlanPrayers.map((prayer) => {
              const id = prayer.id!;
              const isVisible = !hiddenPrayerIds.includes(id);
              return (
                <SwitchRow
                  key={id}
                  id={`hide-prayer-${id}`}
                  title={prayer.title}
                  checked={isVisible}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      restorePredefinedPrayer(id);
                    } else {
                      removePredefinedPrayer(id);
                    }
                  }}
                />
              );
            })}
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between gap-3 rounded-md border bg-card/60 px-3 py-3">
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-medium leading-tight">Idioma predeterminado</span>
              <span className="mt-0.5 block text-xs leading-tight text-muted-foreground">
                Conserva preferencias distintas por perfil
              </span>
            </div>
            <div className="flex shrink-0 overflow-hidden rounded-md border" role="group" aria-label="Idioma predeterminado">
              {languageProfiles.map((profile) => (
                <Button
                  key={profile.value}
                  type="button"
                  variant={prayerLanguageProfile === profile.value ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none px-2 text-xs"
                  aria-pressed={prayerLanguageProfile === profile.value}
                  onClick={() => setPrayerLanguageProfile(profile.value)}
                >
                  {profile.label}
                </Button>
              ))}
            </div>
          </div>
          <SwitchRow
            id="timer-enabled"
            title="Temporizador"
            subtitle="Flotante en pantalla"
            checked={timerEnabled}
            onCheckedChange={setTimerEnabled}
          />
          {timerEnabled ? (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-3">
              <Label htmlFor="timer-duration" className="text-sm font-medium">
                Minutos
              </Label>
              <Input
                id="timer-duration"
                type="number"
                min={1}
                value={timerDuration}
                onChange={(event) => updateTimerDuration(event.target.value)}
                className="w-24"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isDeveloperMode ? (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-base text-red-600 dark:text-red-400">Control de Contenido (Avanzado)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="edit-mode-switch" className="flex flex-col gap-1 cursor-pointer">
                <span>Habilitar Edición y Eliminación</span>
                <span className="text-xs font-normal text-muted-foreground">Permite editar y borrar oraciones predeterminadas.</span>
              </Label>
              <Switch id="edit-mode-switch" checked={isEditModeEnabled} onCheckedChange={setIsEditModeEnabled} />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/20">
                  <Icon.RotateCcw className="mr-2 size-4" />
                  Restaurar oraciones predeterminadas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Restaurar todo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se perderán las ediciones hechas sobre oraciones predeterminadas y volverán a mostrarse las ocultas. Las oraciones creadas por ti no se verán afectadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={restoreAllPredefinedPrayers}>Restaurar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
