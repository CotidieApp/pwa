import { BookOpen, Crown, Cross, Sparkles } from 'lucide-react';
import type { MysteryType } from './types';

export const renderRosaryText = (text: string) => {
  const lines = text.split('\n');
  return (
    <div className="text-center space-y-1">
      {lines.map((line, i) => {
        if (line.trim().length === 0) {
          return <div key={`blank-${i}`} className="h-3" />;
        }
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_)/g);
        return (
          <div key={`line-${i}`} className="min-h-[1.2rem]">
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <span key={`bold-${i}-${j}`} className="font-bold text-foreground">
                    {part.slice(2, -2)}
                  </span>
                );
              }
              if (part.startsWith('*') && part.endsWith('*')) {
                return (
                  <span key={`soft-${i}-${j}`} className="font-semibold text-muted-foreground">
                    {part.slice(1, -1)}
                  </span>
                );
              }
              if (part.startsWith('_') && part.endsWith('_')) {
                return (
                  <span key={`italic-${i}-${j}`} className="italic">
                    {part.slice(1, -1)}
                  </span>
                );
              }
              return <span key={`text-${i}-${j}`}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
};

export const renderCenterIcon = (
  isPreRosaryActive: boolean,
  isPostRosaryActive: boolean,
  currentPreStep: { type: string } | undefined,
  currentPostStep: { type: string } | undefined,
  currentStep: { type: string; index?: number } | undefined
) => {
  if (isPreRosaryActive) {
    switch (currentPreStep?.type) {
      case 'adoracion':
        return <Crown className="h-20 w-20" />;
      case 'senal_cruz':
        return <Cross className="h-20 w-20" />;
      case 'comunion':
      case 'acto_contricion':
      default:
        return <Crown className="h-20 w-20" />;
    }
  }

  if (isPostRosaryActive) {
    switch (currentPostStep?.type) {
      case 'letanias':
        return <BookOpen className="h-20 w-20" />;
      case 'salve':
        return <Crown className="h-20 w-20" />;
      case 'jaculatorias':
      default:
        return <Sparkles className="h-20 w-20" />;
    }
  }

  switch (currentStep?.type) {
    case 'ave_maria':
      return <span>{`#${currentStep.index ?? ''}`}</span>;
    case 'gloria':
      return <span>†</span>;
    case 'intro':
      return <Crown className="h-20 w-20" />;
    case 'reading':
      return <BookOpen className="h-20 w-20" />;
    case 'jaculatoria':
      return <Sparkles className="h-20 w-20" />;
    case 'padre_nuestro':
      return <Cross className="h-20 w-20" />;
    default:
      return <span />;
  }
};

export const getMysteryByDay = (): MysteryType => {
  const day = new Date().getDay();
  switch (day) {
    case 1: return 'gozosos'; // Lunes
    case 2: return 'dolorosos'; // Martes
    case 3: return 'gloriosos'; // Miércoles
    case 4: return 'luminosos'; // Jueves
    case 5: return 'dolorosos'; // Viernes
    case 6: return 'gozosos'; // Sábado
    case 0: return 'gloriosos'; // Domingo
    default: return 'gozosos';
  }
};
