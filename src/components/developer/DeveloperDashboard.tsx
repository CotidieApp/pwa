'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { useSettings, type UserStats } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import * as Icon from 'lucide-react';
import { cn } from '@/lib/utils';
import { appVersion } from '@/lib/version';
import AnnuumStory from '@/components/AnnuumStory';
import MassStreakSparkPreview from '@/components/developer/MassStreakSparkPreview';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ImagePlaceholder } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getImageObjectPosition } from '@/lib/image-display';

interface DeveloperDashboardProps {
  onBack: () => void;
}

const metricFields: { key: keyof UserStats; label: string }[] = [
  { key: 'massStreak', label: 'Misa (Racha)' },
  { key: 'massDaysCount', label: 'Misa (Días)' },
  { key: 'morningDaysCount', label: 'Mañana' },
  { key: 'nightDaysCount', label: 'Noche' },
  { key: 'rosaryCount', label: 'Rosarios' },
  { key: 'angelusCount', label: 'Ángelus' },
  { key: 'examinationCount', label: 'Exámenes' },
  { key: 'lettersWritten', label: 'Cartas' },
  { key: 'saintQuotesOpened', label: 'Citas Santos' },
  { key: 'totalPrayersOpened', label: 'Oraciones' },
  { key: 'daysActive', label: 'Días Activo' },
  { key: 'planDeVidaCompletedTotal', label: 'Plan completo' },
];

export default function DeveloperDashboard({ onBack }: DeveloperDashboardProps) {
  const {
    forceAnnuumSeason,
    setForceAnnuumSeason,
    showZeroStats,
    setShowZeroStats,
    realUserStats,
    simulatedStats,
    setSimulatedStats,
    globalUserStats,
    logoutDeveloper,
    simulatedDate,
    setSimulatedDate,
    movableFeastsEnabled,
    setMovableFeastsEnabled,
    devTestNotificationEnabled,
    setDevTestNotificationEnabled,
    allPrayers,
    userHomeBackgrounds,
  } = useSettings();

  const [showAnnuumPreview, setShowAnnuumPreview] = useState(false);
  const [showMassStreakPreview, setShowMassStreakPreview] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImagePlaceholder | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const displayStats = simulatedStats ?? realUserStats;

  const imageItems = useMemo(() => {
    const fromPrayers = allPrayers
      .filter((prayer) => prayer.id && prayer.imageUrl)
      .map((prayer) => ({
        id: prayer.id!,
        imageUrl: prayer.imageUrl!,
        description: prayer.title,
        imageHint: prayer.imageHint,
      }));
    const allImages = [...PlaceHolderImages, ...userHomeBackgrounds, ...fromPrayers];
    const seen = new Set<string>();
    return allImages.filter((image) => {
      const key = `${image.id}:${image.imageUrl}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allPrayers, userHomeBackgrounds]);

  const updateMetric = (key: keyof UserStats, value: number) => {
    setSimulatedStats({
      ...displayStats,
      [key]: value,
    });
  };

  const handleLogout = () => {
    logoutDeveloper();
    onBack();
  };

  const handleSimulatedDateChange = (value: string) => {
    if (!value) {
      setSimulatedDate(null);
      return;
    }
    setSimulatedDate(new Date(`${value}T12:00:00`).toISOString());
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950 text-sm text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-md border border-green-500/20 bg-green-500/10 p-2">
            <Icon.Terminal className="size-5 text-green-500" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">Panel de desarrollador</h1>
            <p className="text-xs text-slate-400">v{appVersion}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:bg-slate-800 hover:text-white">
          <Icon.X className="size-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard title="Modo" value={simulatedStats ? 'Simulado' : 'Real'} icon={Icon.Zap} color={simulatedStats ? 'text-yellow-400' : 'text-green-400'} />
            <StatCard title="Oraciones Hoy" value={realUserStats.totalPrayersOpened} icon={Icon.CheckCircle2} />
            <StatCard title="Días Activos" value={globalUserStats.daysActive} icon={Icon.CalendarDays} />
          </div>

          <Card className="border-slate-800 bg-slate-900 text-slate-200">
            <CardHeader>
              <CardTitle>Controles</CardTitle>
              <CardDescription className="text-slate-400">Simulación y pruebas internas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                <Label htmlFor="simulated-date" className="text-sm">Fecha simulada</Label>
                <Input
                  id="simulated-date"
                  type="date"
                  value={simulatedDate ? simulatedDate.slice(0, 10) : ''}
                  onChange={(event) => handleSimulatedDateChange(event.target.value)}
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
              <SwitchRow title="Forzar temporada Annuum" checked={forceAnnuumSeason} onCheckedChange={setForceAnnuumSeason} />
              <SwitchRow title="Mostrar estadísticas en cero" checked={showZeroStats} onCheckedChange={setShowZeroStats} />
              <SwitchRow title="Fiestas móviles" checked={movableFeastsEnabled} onCheckedChange={setMovableFeastsEnabled} />
              <SwitchRow title="Notificación de prueba" checked={devTestNotificationEnabled} onCheckedChange={setDevTestNotificationEnabled} />
              <Button variant="outline" className="w-full border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" onClick={handleLogout}>
                <Icon.LogOut className="mr-2 size-4" />
                Cerrar modo desarrollador
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-200">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Métricas</CardTitle>
                <CardDescription className="text-slate-400">Valores reales o simulados para revisar la experiencia anual.</CardDescription>
              </div>
              {simulatedStats ? (
                <Button variant="ghost" size="sm" className="text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300" onClick={() => setSimulatedStats(null)}>
                  Limpiar
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {metricFields.map((field) => (
                <MetricInput
                  key={String(field.key)}
                  label={field.label}
                  value={typeof displayStats[field.key] === 'number' ? (displayStats[field.key] as number) : 0}
                  onChange={(value) => updateMetric(field.key, value)}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-200">
            <CardHeader>
              <CardTitle>Previsualizaciones</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Button variant="outline" className="border-indigo-900/50 bg-indigo-950/20 text-indigo-300 hover:bg-indigo-950/40" onClick={() => setShowAnnuumPreview(true)}>
                <Icon.Play className="mr-2 size-4" />
                Cotidie Annuum
              </Button>
              <Button variant="outline" className="border-amber-900/50 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40" onClick={() => setShowMassStreakPreview(true)}>
                <Icon.Flame className="mr-2 size-4" />
                Racha de Misa
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-slate-200">
            <CardHeader>
              <CardTitle>Imágenes</CardTitle>
              <CardDescription className="text-slate-400">Fondos e imágenes internas disponibles.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {imageItems.map((image) => (
                  <button
                    key={`${image.id}-${image.imageUrl}`}
                    type="button"
                    className="group relative aspect-video overflow-hidden rounded border border-slate-800"
                    onClick={() => {
                      setSelectedImage(image);
                      setIsImageViewerOpen(true);
                    }}
                  >
                    <Image src={image.imageUrl} alt={image.description || image.id} fill className="object-cover transition-transform group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-left text-[10px] text-white">
                      {image.description || image.id}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showAnnuumPreview ? (
        <div className="fixed inset-0 z-[100] bg-black">
          <Button className="absolute right-4 top-4 z-[110] bg-white text-black hover:bg-gray-200" onClick={() => setShowAnnuumPreview(false)}>
            Salir
          </Button>
          <AnnuumStory onClose={() => setShowAnnuumPreview(false)} />
        </div>
      ) : null}

      {showMassStreakPreview ? <MassStreakSparkPreview onClose={() => setShowMassStreakPreview(false)} /> : null}

      {selectedImage ? (
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="h-screen w-screen max-w-none border-none bg-transparent p-0">
            <DialogTitle className="sr-only">Visor de imagen</DialogTitle>
            <div className="relative h-screen w-screen">
              <Image
                src={selectedImage.imageUrl}
                alt={selectedImage.description || 'Imagen seleccionada'}
                fill
                className="bg-black object-contain"
                style={{ objectPosition: getImageObjectPosition(selectedImage.id) }}
                sizes="100vw"
                priority
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function SwitchRow({
  title,
  checked,
  onCheckedChange,
}: {
  title: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950 px-3 py-3">
      <Label className="text-sm text-slate-200">{title}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('rounded-full border border-slate-800 bg-slate-950 p-2', color || 'text-slate-400')}>
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</div>
          <div className="text-xl font-black text-slate-200">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase text-slate-500">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10);
          onChange(Number.isNaN(next) ? 0 : next);
        }}
        className="h-8 border-slate-800 bg-slate-950 text-sm text-slate-100"
      />
    </div>
  );
}
