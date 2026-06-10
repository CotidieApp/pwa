'use client';

import type { Prayer } from '@/lib/types';
import PrayerList from './PrayerList';
import { Card } from './ui/card';
import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';

type PrayerAccordionProps = {
  predeterminadas: Prayer[];
  entradas: Prayer[];
  onAddEntrada: () => void;
  onSelectPrayer: (prayer: Prayer) => void;
  onRemoveEntrada: (id: string) => void;
  onEditEntrada: (prayer: Prayer) => void;
};

export default function PrayerAccordion({
  predeterminadas,
  entradas,
  onAddEntrada,
  onSelectPrayer,
  onRemoveEntrada,
  onEditEntrada,
}: PrayerAccordionProps) {
  const { isDeveloperMode, isEditModeEnabled } = useSettings();

  return (
    <div className="space-y-4">
      <Card className="bg-card shadow-md border-border/50 p-4 md:p-6">
        <div className="space-y-4">
          <h2 className="text-base font-headline font-bold">Predeterminadas</h2>
          <PrayerList
            prayers={predeterminadas}
            onSelectPrayer={onSelectPrayer}
            onRemovePrayer={
              isDeveloperMode && isEditModeEnabled ? onRemoveEntrada : undefined
            }
            onEditPrayer={isDeveloperMode ? onEditEntrada : undefined}
          />
        </div>
      </Card>

      <Card className="bg-card shadow-md border-border/50 p-4 md:p-6">
        <div className="space-y-4">
          <h2 className="text-base font-headline font-bold">Mis Oraciones</h2>

          <PrayerList
            prayers={entradas}
            onSelectPrayer={onSelectPrayer}
            onRemovePrayer={onRemoveEntrada}
            onEditPrayer={onEditEntrada}
          />

          {entradas.length === 0 && (
            <div className="text-center text-muted-foreground text-sm italic">
              Aún no has agregado ninguna oración personal.
            </div>
          )}

          <div className="mt-2">
            <button
              onClick={onAddEntrada}
              className={cn(
                'w-full bg-primary text-primary-foreground p-2 rounded-md font-medium',
                'hover:bg-primary/90 transition-colors'
              )}
            >
              Agregar Oración
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
