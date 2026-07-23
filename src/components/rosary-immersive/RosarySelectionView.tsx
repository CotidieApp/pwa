import { BookOpen, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MYSTERY_NAMES } from '@/lib/rosary-immersive/content';
import { getMysteryByDay } from '@/lib/rosary-immersive/helpers';
import type { MysteryType } from '@/lib/rosary-immersive/types';

type RosarySelectionViewProps = {
  isDark: boolean;
  onClose: (targetId?: string) => void;
  onSwitchToMeditated?: () => void;
  selectedMysteryType: MysteryType;
  startMystery: (type: MysteryType) => void;
  handleJumpToLitanies: () => void;
};

export function RosarySelectionView({
  isDark,
  onClose,
  onSwitchToMeditated,
  selectedMysteryType,
  startMystery,
  handleJumpToLitanies,
}: RosarySelectionViewProps) {
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col items-center justify-center p-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] bg-background/95 backdrop-blur-sm",
      isDark ? "text-white" : "text-zinc-900"
    )}>
      <Button variant="ghost" size="icon" className="absolute top-4 left-4 mt-[env(safe-area-inset-top)]" onClick={() => onClose()}>
        <X />
      </Button>

      <div className="absolute top-4 right-4 mt-[env(safe-area-inset-top)] flex gap-2">
        {onSwitchToMeditated && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onSwitchToMeditated}
          >
            <BookOpen className="size-4" />
            Leer
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => startMystery(getMysteryByDay())}
        >
          <Calendar className="size-4" />
          Día: {MYSTERY_NAMES[getMysteryByDay()].replace('Misterios ', '')}
        </Button>
      </div>

      <h2 className="text-2xl font-bold mb-8">Selecciona los Misterios</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
        {(['gozosos', 'luminosos', 'dolorosos', 'gloriosos'] as const).map((type) => (
          <div key={type} className="flex flex-col gap-2">
            <Button
              variant={selectedMysteryType === type ? 'default' : 'outline'}
              className={cn(
                "h-24 text-lg font-serif flex flex-col gap-1",
                selectedMysteryType === type && "ring-2 ring-offset-2"
              )}
              onClick={() => startMystery(type)}
            >
              <span>{MYSTERY_NAMES[type]}</span>
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 items-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={handleJumpToLitanies}
        >
          Ir directamente a Letanías
        </Button>
      </div>
    </div>
  );
}
