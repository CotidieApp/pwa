'use client';

import type { Prayer } from '@/lib/types';
import { Card, CardTitle } from '@/components/ui/card';
import { ChevronRight, Trash2, PlusCircle, Edit } from 'lucide-react';
import { useMemo } from 'react';
import SaintOfTheDayCard from '@/components/saints/SaintOfTheDayCard';
import { useSettings } from '@/context/SettingsContext';
import { Button } from './ui/button';
import Image from 'next/image';
import { cn } from '@/lib/utils';
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
import { Checkbox } from './ui/checkbox';

type PrayerListProps = {
  prayers: Prayer[];
  onSelectPrayer: (prayer: Prayer) => void;
  onOpenPrayerById?: (id: string) => void;
  onRemovePrayer?: (id: string) => void;
  onEditPrayer?: (prayer: Prayer) => void;
  showAddButton?: boolean;
  onAddButtonClick?: () => void;
  addButtonLabel?: string;
  categoryId?: string | null;
  prayerPathLength?: number;
  isUserPrayerList?: boolean;
};

// === LISTA DE ORACIONES ===
export default function PrayerList({
  prayers,
  onSelectPrayer,
  onOpenPrayerById,
  onRemovePrayer,
  onEditPrayer,
  showAddButton = false,
  onAddButtonClick,
  addButtonLabel = 'Agregar',
  categoryId,
  prayerPathLength = 0,
  isUserPrayerList = false,
}: PrayerListProps) {
  const {
    alwaysShowPrayers,
    isDeveloperMode,
    isEditModeEnabled,
    planDeVidaTrackerEnabled,
    planDeVidaProgress,
    togglePlanDeVidaItem,
  } = useSettings();

  // Filtrar oraciones según categoría (Plan de Vida, etc.)
  const filteredPrayers = useMemo(() => {
    if (!prayers) return [];
    if (categoryId !== 'plan-de-vida') return prayers as Prayer[];

    const now = new Date();
    const today = now.getDay(); // Domingo = 0
    const isMesDeMaria =
      (now.getMonth() === 10 && now.getDate() >= 8) ||
      (now.getMonth() === 11 && now.getDate() <= 8);
    return (prayers as Prayer[]).filter((prayer) => {
      if (!prayer || !prayer.id) return false;
      if (alwaysShowPrayers.includes(prayer.id)) return true;

      if (prayer.id === 'mes-de-maria') return isMesDeMaria;

      // Manejo de oraciones generales
      if (prayer.isDaySpecific && prayer.showOnDay === undefined) return false;

      const isToday = prayer.showOnDay === today;
      const isGeneralPrayer = prayer.showOnDay === undefined && !prayer.isDaySpecific;
      return isGeneralPrayer || isToday;
    });
  }, [prayers, alwaysShowPrayers, categoryId]);

  const showEmptyState = filteredPrayers.length === 0 && !isUserPrayerList;

  const canPerformAction = (prayer: Prayer) => {
    if (isDeveloperMode && isEditModeEnabled) return true;
    return prayer.isUserDefined === true;
  };

  const isEditable = (prayer: Prayer) => {
    if (!onEditPrayer) return false;
    if (isDeveloperMode && isEditModeEnabled) return true;
    return !prayer.prayers || prayer.prayers.length === 0;
  };

  const isPlanDeVidaCategory = categoryId === 'plan-de-vida';
  const showTracker = isPlanDeVidaCategory && planDeVidaTrackerEnabled && prayerPathLength === 0;

  // Lógica específica para "Oraciones" (Subcategorías)
  const isOracionesRoot = categoryId === 'oraciones' && prayerPathLength === 0;

  const { subcategories, otherPrayers } = useMemo(() => {
    if (!isOracionesRoot) return { subcategories: [], otherPrayers: filteredPrayers };

    const sub = filteredPrayers.filter(p => p.id?.startsWith('subcat-'));
    const other = filteredPrayers.filter(p => !p.id?.startsWith('subcat-'));
    return { subcategories: sub, otherPrayers: other };
  }, [isOracionesRoot, filteredPrayers]);

  return (
    <div className="space-y-3 pb-4 touch-pan-y overscroll-contain">
      {/* Santo del día arriba solo en devociones */}
      {categoryId === 'devociones' && prayerPathLength === 0 && (
        <SaintOfTheDayCard onOpenPrayerById={onOpenPrayerById} />
      )}

      {/* Grid de Subcategorías para Oraciones */}
      {isOracionesRoot && subcategories.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {subcategories.map((sub, idx) => (
            <Card
              key={sub.id || idx}
              className="relative aspect-square overflow-hidden flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 transition-opacity bg-black border-0 shadow-lg"
              onClick={() => onSelectPrayer(sub)}
            >
              {sub.imageUrl && (
                <div className="absolute inset-0 opacity-40">
                  <Image
                    src={sub.imageUrl}
                    alt={sub.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <CardTitle className="relative z-10 px-2 font-headline text-lg text-white leading-tight">
                {sub.title}
              </CardTitle>
            </Card>
          ))}
        </div>
      )}

      {/* Lista de oraciones (normal o después del grid) */}
      {otherPrayers.length > 0 ? (
        otherPrayers.map((prayer, index) => (
          <Card
            key={prayer.id || index}
            className={cn(
              "bg-card/80 shadow-md backdrop-blur-sm border-border/50 p-4 flex flex-col gap-2 cursor-pointer hover:bg-accent/20 transition-colors",
              isOracionesRoot && index === 0 && subcategories.length > 0 && "mt-4"
            )}
            onClick={() => onSelectPrayer(prayer)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                {showTracker && prayer.id && (
                  <Checkbox
                    id={`tracker-${prayer.id}`}
                    checked={planDeVidaProgress.includes(prayer.id)}
                    onCheckedChange={() => togglePlanDeVidaItem(prayer.id!)}
                    onClick={(e) => e.stopPropagation()}
                    className="size-5"
                  />
                )}
                <CardTitle className="font-headline text-base font-normal truncate">
                  {prayer.title}
                </CardTitle>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center shrink-0">
                {canPerformAction(prayer) && isEditable(prayer) && onEditPrayer && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditPrayer?.(prayer);
                    }}
                  >
                    <Edit className="size-4" />
                  </Button>
                )}
                {canPerformAction(prayer) && onRemovePrayer && prayer.id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Esto eliminará permanentemente esta{' '}
                          {prayer.categoryId === 'devociones' ? 'devoción' : 'oración'}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onRemovePrayer!(prayer.id!)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <ChevronRight className="size-5 text-muted-foreground" />
              </div>
            </div>
          </Card>
        ))
      ) : (showEmptyState && !isOracionesRoot) ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/80 bg-card/50 h-96 text-center p-4">
          <h3 className="text-lg font-semibold text-foreground/80">No se encontraron oraciones</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Aún no hay nada en esta categoría.
          </p>
        </div>
      ) : null}

      {/* Botón Agregar */}
      {showAddButton && onAddButtonClick && (
        <div className="mt-4">
          <Button onClick={onAddButtonClick} className="w-full">
            <PlusCircle className="mr-2" />
            {addButtonLabel}
          </Button>
        </div>
      )}
    </div>
  );
}













