'use client';

import type { Prayer } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import PrayerList from './PrayerList';
import { Card } from './ui/card';
import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';
import { renderText } from '@/lib/textFormatter';

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

  const noEntradas = entradas.length === 0;

  return (
    <Card className="bg-card shadow-md border-border/50 animate-in fade-in-0 duration-500 overflow-hidden">
      <Accordion
        type="multiple"
        defaultValue={['predeterminadas', 'entradas']}
        className="w-full"
      >
        {/* ORACIONES PREDETERMINADAS */}
        <AccordionItem
          value="predeterminadas"
          className="border-b px-4 md:px-6"
        >
          <AccordionTrigger className="text-base font-headline text-left font-bold hover:no-underline">
            Predeterminadas
          </AccordionTrigger>
          <AccordionContent className="px-1 pt-4">
            <PrayerList
              prayers={predeterminadas}
              onSelectPrayer={onSelectPrayer}
              onRemovePrayer={
                isDeveloperMode && isEditModeEnabled ? onRemoveEntrada : undefined
              }
              onEditPrayer={isDeveloperMode ? onEditEntrada : undefined}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ORACIONES DEL USUARIO */}
        <AccordionItem
          value="entradas"
          className="border-b-0 px-4 md:px-6"
        >
          <AccordionTrigger className="text-base font-headline text-left font-bold hover:no-underline">
            Mis Oraciones
          </AccordionTrigger>

          <AccordionContent className="px-1 pt-4 space-y-4">
            <PrayerList
              prayers={entradas}
              onSelectPrayer={onSelectPrayer}
              onRemovePrayer={onRemoveEntrada}
              onEditPrayer={onEditEntrada}
            />

            {/* Mensaje limpio si no hay oraciones del usuario */}
            {noEntradas && (
              <div className="text-center text-muted-foreground text-sm italic">
                Aún no has agregado ninguna oración personal.
              </div>
            )}

            {/* Botón consistente con el resto de la UI */}
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
