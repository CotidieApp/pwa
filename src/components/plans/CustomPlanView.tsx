"use client";

import { useEffect, useMemo, useState } from 'react';
import type { Prayer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowDown, ArrowUp, Edit, Trash2, Download, Upload } from 'lucide-react';
import { useSettings, type CustomPlan } from '@/context/SettingsContext';

const ORACION_DEL_DIA_ID = '__oracion_del_dia__';

const resolveOracionDelDiaPrayerId = () => {
  const day = new Date().getDay();
  if (day === 2) return 'salmo-ii';
  if (day === 4) return 'adoro-te-devote';
  if (day === 6) return 'salve-regina';
  if (day === 0) return 'simbolo-quicumque';
  return null;
};

const resolveCustomPlanPrayerId = (id: string) => {
  if (id === ORACION_DEL_DIA_ID) return resolveOracionDelDiaPrayerId();

  const legacyIdMap: Record<string, string> = {
    acordaos: 'acordaos-oracion',
    salmoII: 'salmo-ii',
    adoroTeDevote: 'adoro-te-devote',
    salveRegina: 'salve-regina',
    simboloQuicumque: 'simbolo-quicumque',
  };

  return legacyIdMap[id] ?? id;
};

type CustomPlanViewProps = {
  slot: 1 | 2 | 3 | 4;
  onOpenPrayerId: (id: string) => void;
  onOpenPlanPrayerAt?: (index: number) => void;
  onDone?: () => void;
  startInEditMode?: boolean;
};

function flattenPrayers(prayers: Prayer[], prefix: string[] = []): { value: string; label: string }[] {
  const items: { value: string; label: string }[] = [];
  for (const prayer of prayers) {
    if (!prayer.id) continue;
    const title = prayer.title || 'Sin título';
    const nextPrefix = [...prefix, title];
    items.push({ value: prayer.id, label: nextPrefix.join(' / ') });
    if (prayer.prayers && prayer.prayers.length > 0) {
      items.push(...flattenPrayers(prayer.prayers, nextPrefix));
    }
  }
  return items;
}

function findPrayerById(prayers: Prayer[], id: string): Prayer | null {
  for (const prayer of prayers) {
    if (prayer.id === id) return prayer;
    if (prayer.prayers && prayer.prayers.length > 0) {
      const found = findPrayerById(prayer.prayers, id);
      if (found) return found;
    }
  }
  return null;
}

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export default function CustomPlanView({ slot, onOpenPrayerId, onOpenPlanPrayerAt, onDone, startInEditMode }: CustomPlanViewProps) {
  const {
    allPrayers,
    customPlans,
    setCustomPlanName,
    addCustomPlanPrayer,
    removeCustomPlanPrayerAt,
    moveCustomPlanPrayer,
    isEditModeEnabled,
    deleteCustomPlan,
    createCustomPlan,
    importUserData,
  } = useSettings();
  const { toast } = useToast();

  const plan = customPlans[slot - 1];

  const handleExport = async () => {
    if (!plan) return;
    const data = JSON.stringify(plan, null, 2);
    const fileName = `${plan.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ctd`;

    try {
        if (!Capacitor.isNativePlatform()) {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({ title: 'Plan exportado correctamente.' });
            return;
        }

        // Android Native Export
            // Use Cache directory to avoid permission issues with Documents on newer Android versions
            // and ensure we can share the file URI immediately.
            await Filesystem.writeFile({
                path: fileName,
                data: data,
                directory: Directory.Cache,
                encoding: Encoding.UTF8
            });
            
            const fileResult = await Filesystem.getUri({
                path: fileName,
                directory: Directory.Cache
            });

            await Share.share({
                title: `Plan: ${plan.name}`,
                url: fileResult.uri,
                dialogTitle: 'Guardar plan'
            });
            
            toast({ title: 'Plan listo', description: 'Se ha abierto el menú compartir.' });

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error al exportar', description: 'No se pudo exportar el plan.' });
        }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = JSON.parse(text) as CustomPlan;
        
        // Basic validation
        if (typeof imported.name !== 'string' || !Array.isArray(imported.prayerIds)) {
            throw new Error('Formato inválido');
        }

        imported.slot = slot;
        imported.id = `custom-plan-${slot}-${Date.now()}`;

        // Construct a full settings object to update ONLY customPlans
        // But importUserData might expect other fields or merge them.
        // Reading SettingsContext earlier showed importUserData handles partials.
        // BUT, importUserData usually merges global state.
        // It updates `customPlans` array entirely if provided.
        // Let's check logic:
        // if (data.customPlans) { setCustomPlans(prev => ...) }
        // Yes.
        
        // We need to preserve OTHER plans.
        const newPlans = [...customPlans];
        newPlans[slot - 1] = imported;
        
        importUserData({ customPlans: newPlans });
        toast({ title: 'Plan importado correctamente.' });
      } catch (err) {
        console.error(err);
        toast({ variant: 'destructive', title: 'Error al importar', description: 'Archivo inválido o corrupto.' });
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const prayerItems = useMemo(() => {
    return [{ value: ORACION_DEL_DIA_ID, label: 'Oración del día' }, ...flattenPrayers(allPrayers)];
  }, [allPrayers]);
  const prayerById = useMemo(() => {
    const map = new Map<string, Prayer>();
    const walk = (list: Prayer[]) => {
      for (const p of list) {
        if (p.id) map.set(p.id, p);
        if (p.prayers && p.prayers.length > 0) walk(p.prayers);
      }
    };
    walk(allPrayers);
    return map;
  }, [allPrayers]);

  const [addPrayerId, setAddPrayerId] = useState<string | null>(null);
  const [isLocalEditMode, setIsLocalEditMode] = useState(Boolean(startInEditMode));

  useEffect(() => {
    setIsLocalEditMode(Boolean(startInEditMode));
  }, [slot, startInEditMode]);

  const canEdit = isEditModeEnabled || isLocalEditMode;

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Este plan aún no existe.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={plan.name}
                onChange={(e) => setCustomPlanName(slot, e.target.value)}
                placeholder="Nombre del plan"
              />
              <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={handleExport} className="flex-1">
                    <Download className="mr-2 h-4 w-4" /> Exportar
                 </Button>
                 <div className="flex-1 relative">
                    <Input
                        type="file"
                        accept=".ctd"
                        onChange={handleImport}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <Button variant="outline" size="sm" className="w-full">
                        <Upload className="mr-2 h-4 w-4" /> Importar
                    </Button>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Añadir oración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Combobox
                items={prayerItems}
                value={addPrayerId}
                onSelect={(value) => {
                  if (!value) {
                    setAddPrayerId(null);
                    return;
                  }
                  addCustomPlanPrayer(slot, value);
                  setAddPrayerId(null);
                }}
                placeholder="Selecciona una oración"
                searchPlaceholder="Buscar oración..."
                noResultsText="Sin resultados"
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="font-medium">{plan.name}</div>
            <div className="text-muted-foreground">Activa el modo edición para modificarlo.</div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setIsLocalEditMode(true)}>
                <Edit className="mr-2 size-4" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex-1">
                    <Trash2 className="mr-2 size-4" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar este plan?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deleteCustomPlan(slot);
                        onDone?.();
                      }}
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Oraciones del plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {plan.prayerIds.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aún no has añadido oraciones.
            </div>
          ) : (
            plan.prayerIds.map((id, index) => {
              const isOracionDelDia = id === ORACION_DEL_DIA_ID;
              const resolvedId = resolveCustomPlanPrayerId(id);
              const prayer = resolvedId ? prayerById.get(resolvedId) || findPrayerById(allPrayers, resolvedId) : null;
              const title = isOracionDelDia ? 'Oración del día' : prayer?.title || 'Oración';
              return (
                <div
                  key={`${id}-${index}`}
                  className="grid grid-cols-[auto,1fr,auto] items-center gap-2 rounded-md border border-border/50 bg-card/60 px-3 py-2"
                >
                  <div className="w-8 text-left tabular-nums text-muted-foreground">
                    {index + 1}
                  </div>
                  <Button
                    variant="ghost"
                    className="min-w-0 justify-start px-2"
                    onClick={() => {
                      if (onOpenPlanPrayerAt) {
                        onOpenPlanPrayerAt(index);
                        return;
                      }
                      if (!resolvedId) return;
                      onOpenPrayerId(resolvedId);
                    }}
                  >
                    <span className="truncate">{title}</span>
                  </Button>

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === 0}
                        onClick={() => moveCustomPlanPrayer(slot, index, index - 1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === plan.prayerIds.length - 1}
                        onClick={() => moveCustomPlanPrayer(slot, index, index + 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomPlanPrayerAt(slot, index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Button
          className="w-full"
          onClick={() => {
            setIsLocalEditMode(false);
            toast({ title: 'Guardado.' });
            onDone?.();
          }}
        >
          Guardar
        </Button>
      )}
    </div>
  );
}
