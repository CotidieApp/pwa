'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, Cross, Sparkles, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { viaCrucis } from '@/lib/prayers/plan-de-vida/via-crucis';

// Standard Prayers Text
const PRAYERS_TEXT = {
  te_adoramos: `Te adoramos Cristo y te bendecimos. Que por tu Santa Cruz redimiste al mundo.`,
  padre_nuestro: `Padre nuestro, que estás en el cielo, santificado sea tu Nombre; venga a nosotros tu reino; hágase tu voluntad en la tierra como en el cielo. Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal. Amén.`,
  ave_maria: `Dios te salve, María, llena eres de gracia; el Señor es contigo; bendita Tú eres entre todas las mujeres, y bendito es el fruto de tu vientre, Jesús. Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte. Amén.`,
  gloria: `Gloria al Padre, y al Hijo, y al Espíritu Santo. Como era en el principio, ahora y siempre, por los siglos de los siglos. Amén.`,
  peque: `Pequé, Señor, Pequé. Ten Piedad y misericordia de mí.`,
};

// Station Steps Sequence
const STATION_SEQUENCE = [
  { type: 'adoracion', label: 'Adoración' },
  { type: 'meditacion', label: 'Meditación' },
  { type: 'padre_nuestro', label: 'Padre Nuestro' },
  { type: 'ave_maria', label: 'Ave María' },
  { type: 'gloria', label: 'Gloria' },
  { type: 'peque', label: 'Acto de Contrición' },
];

const VIA_CRUCIS_BACKGROUND_IMAGES = [
  '/images/immaculate-heart.jpeg',
];

type ImmersiveViaCrucisProps = {
  onClose: () => void;
};

export default function ViaCrucisImmersive({ onClose }: ImmersiveViaCrucisProps) {
  const { isDistractionFree, theme, arrowBubbleSize, navMode } = useSettings();
  const touchNavEnabled = navMode === 'touch';

  const navBubbleClass = {
    sm: "gap-1 p-1 pl-2 rounded-xl",
    md: "gap-2 p-2 pl-3 rounded-2xl",
    lg: "gap-2.5 p-2.5 pl-4 rounded-2xl",
  }[arrowBubbleSize];

  const navButtonClass = {
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-14 w-14",
  }[arrowBubbleSize];

  const navIconClass = {
    sm: "size-5",
    md: "size-6",
    lg: "size-7",
  }[arrowBubbleSize];
  
  // State
  const [currentStationIndex, setCurrentStationIndex] = useState(0); // 0-13 for stations
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Phases: Intro -> Stations -> Outro
  // We can manage this with a single "phase" state or flags.
  // Intro: id="via-crucis-introduccion"
  // Stations: id="via-crucis-01" to "14"
  // Outro: id="via-crucis-oremos" + others
  
  const [phase, setPhase] = useState<'intro' | 'stations' | 'outro'>('intro');
  const [outroStepIndex, setOutroStepIndex] = useState(0);

  const [showBackground, setShowBackground] = useState(true);
  const [navPos, setNavPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingNav, setIsDraggingNav] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const navDragStart = useRef<{ x: number; y: number; startX: number; startY: number }>({ x: 0, y: 0, startX: 0, startY: 0 });

  // Data helpers
  const introData = viaCrucis.prayers?.find(p => p.id === 'via-crucis-introduccion');
  const stationsData = viaCrucis.prayers?.filter(p => p.id?.startsWith('via-crucis-') && !isNaN(Number(p.id?.split('-')[2]))) || [];
  const outroData = viaCrucis.prayers?.filter(p => p.id && ['via-crucis-oremos', 'via-crucis-oracion-buena-muerte', 'via-crucis-oracion-momento-muerte'].includes(p.id)) || [];

  // Load Nav Position
  useEffect(() => {
    try {
      const raw = localStorage.getItem('viacrucis_nav_position');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          setNavPos({ x: parsed.x, y: parsed.y });
        }
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (!navPos) return;
    try {
      localStorage.setItem('viacrucis_nav_position', JSON.stringify(navPos));
    } catch (e) { console.error(e); }
  }, [navPos]);

  // Dragging Logic
  useEffect(() => {
    if (!isDraggingNav) return;
    const handleMove = (event: PointerEvent) => {
      const el = navRef.current;
      if (!el) return;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      const padding = 8;
      const maxX = window.innerWidth - width - padding;
      const maxY = window.innerHeight - height - padding;
      const minX = padding;
      const minY = padding + (Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0);
      const nextX = Math.min(maxX, Math.max(minX, navDragStart.current.startX + (event.clientX - navDragStart.current.x)));
      const nextY = Math.min(maxY, Math.max(minY, navDragStart.current.startY + (event.clientY - navDragStart.current.y)));
      setNavPos({ x: nextX, y: nextY });
    };
    const handleUp = () => {
      setIsDraggingNav(false);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [isDraggingNav]);

  // Helper to extract meditation text
  const getMeditationContent = (fullContent: string) => {
    // Remove header and footer standard text to isolate meditation
    let text = fullContent;
    
    // Common start phrases to remove
    const starts = [
      "Te adoramos Cristo y te bendecimos.\nQue por tu Santa Cruz redimiste al mundo.",
      "Te adoramos Cristo y te bendecimos.\nQue por tu Santa Cruz redimiste al mundo"
    ];
    
    // Common end phrases to remove
    const ends = [
      "Padre nuestro…\nDios te salve…\n\nPequé, Señor, Pequé\nTen Piedad y misericordia de mí.",
      "Padre nuestro…\nDios te salve…\n\nPequé, Señor, Pequé\nTen Piedad y misericordia de mí",
      "Padre nuestro...\nDios te salve...\n\nPequé, Señor, Pequé\nTen Piedad y misericordia de mí."
    ];

    for (const s of starts) {
      if (text.includes(s)) {
        text = text.replace(s, "");
      }
    }
    
    for (const e of ends) {
      if (text.includes(e)) {
        text = text.replace(e, "");
      }
    }

    return text.trim();
  };

  // Derived State
  const currentStation = stationsData[currentStationIndex];
  const currentStep = STATION_SEQUENCE[currentStepIndex];
  const currentBackgroundUrl = useMemo(() => {
    if (phase === 'stations') {
      return VIA_CRUCIS_BACKGROUND_IMAGES[currentStationIndex] || VIA_CRUCIS_BACKGROUND_IMAGES[0];
    }
    if (phase === 'outro') {
      return VIA_CRUCIS_BACKGROUND_IMAGES[VIA_CRUCIS_BACKGROUND_IMAGES.length - 1];
    }
    return VIA_CRUCIS_BACKGROUND_IMAGES[0];
  }, [phase, currentStationIndex]);
  
  const isDark = theme === 'dark' || isDistractionFree;
  
  // Progress Calculation
  const totalSteps = 1 + (stationsData.length * STATION_SEQUENCE.length) + outroData.length;
  let currentGlobalStep = 0;
  
  if (phase === 'intro') currentGlobalStep = 0;
  else if (phase === 'stations') currentGlobalStep = 1 + (currentStationIndex * STATION_SEQUENCE.length) + currentStepIndex;
  else if (phase === 'outro') currentGlobalStep = 1 + (stationsData.length * STATION_SEQUENCE.length) + outroStepIndex;
  
  const progressPercent = (currentGlobalStep / totalSteps) * 100;

  // Navigation Handlers
  const handleNext = () => {
    if (phase === 'intro') {
      setPhase('stations');
      setCurrentStationIndex(0);
      setCurrentStepIndex(0);
    } else if (phase === 'stations') {
      if (currentStepIndex < STATION_SEQUENCE.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
      } else {
        // End of station
        if (currentStationIndex < stationsData.length - 1) {
          setCurrentStationIndex(prev => prev + 1);
          setCurrentStepIndex(0);
        } else {
          // End of all stations
          setPhase('outro');
          setOutroStepIndex(0);
        }
      }
    } else if (phase === 'outro') {
      if (outroStepIndex < outroData.length - 1) {
        setOutroStepIndex(prev => prev + 1);
      } else {
        onClose();
      }
    }
  };

  const handlePrev = () => {
    if (phase === 'intro') {
      // Can't go back
    } else if (phase === 'stations') {
      if (currentStepIndex > 0) {
        setCurrentStepIndex(prev => prev - 1);
      } else {
        if (currentStationIndex > 0) {
          setCurrentStationIndex(prev => prev - 1);
          setCurrentStepIndex(STATION_SEQUENCE.length - 1);
        } else {
          setPhase('intro');
        }
      }
    } else if (phase === 'outro') {
      if (outroStepIndex > 0) {
        setOutroStepIndex(prev => prev - 1);
      } else {
        setPhase('stations');
        setCurrentStationIndex(stationsData.length - 1);
        setCurrentStepIndex(STATION_SEQUENCE.length - 1);
      }
    }
  };

  // Render Content
  const renderContent = () => {
    if (phase === 'intro') {
      return (
        <div className="text-center max-w-md mx-auto">
          <div className="text-8xl mb-6 flex justify-center"><Cross className="h-16 w-16" /></div>
          <h2 className="text-3xl font-bold mb-6">{introData?.title}</h2>
          <div className="text-lg opacity-90 leading-relaxed whitespace-pre-wrap">
            {typeof introData?.content === 'string' ? introData.content : ''}
          </div>
        </div>
      );
    }

    if (phase === 'outro') {
      const data = outroData[outroStepIndex];
      return (
        <div className="text-center max-w-md mx-auto">
          <div className="text-8xl mb-6 flex justify-center"><Heart className="h-16 w-16" /></div>
          <h2 className="text-2xl font-bold mb-6">{data?.title}</h2>
          <div className="text-lg opacity-90 leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto px-2 scrollbar-hide overscroll-contain">
            {typeof data?.content === 'string' ? data.content : ''}
          </div>
        </div>
      );
    }

    // Stations Phase
    const stationNumber = currentStationIndex + 1;
    const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"][currentStationIndex];
    
    let mainIcon: React.ReactNode = roman;
    let mainText = "";
    
    switch (currentStep.type) {
      case 'adoracion':
        mainIcon = <Cross className="h-16 w-16" />;
        mainText = PRAYERS_TEXT.te_adoramos;
        break;
      case 'meditacion':
        mainIcon = roman;
        const rawContent = currentStation?.content || "";
        mainText = getMeditationContent(typeof rawContent === 'string' ? rawContent : "");
        break;
      case 'padre_nuestro':
        mainIcon = <Cross className="h-16 w-16" />;
        mainText = PRAYERS_TEXT.padre_nuestro;
        break;
      case 'ave_maria':
        mainIcon = <Sparkles className="h-16 w-16" />;
        mainText = PRAYERS_TEXT.ave_maria;
        break;
      case 'gloria':
        mainIcon = <Sparkles className="h-16 w-16" />;
        mainText = PRAYERS_TEXT.gloria;
        break;
      case 'peque':
        mainIcon = <Heart className="h-16 w-16" />;
        mainText = PRAYERS_TEXT.peque;
        break;
    }

    return (
      <div className="flex flex-col items-center max-w-xl mx-auto text-center">
        {/* Station Title */}
        <h3 className="text-sm uppercase tracking-widest opacity-70 mb-2">Estación {roman}</h3>
        <h2 className="text-2xl font-bold mb-8 px-4">{currentStation?.title.split('. ')[1] || currentStation?.title}</h2>
        
        {/* Icon/Number */}
        <div className={cn(
          "text-8xl sm:text-9xl font-black mb-8 select-none transition-colors duration-500 font-serif",
          currentStep.type === 'meditacion' ? "text-primary" : "text-foreground/20"
        )}>
          {mainIcon}
        </div>

        {/* Step Label */}
        <h3 className="text-xl font-bold mb-4">{currentStep.label}</h3>

        {/* Content Text */}
        <div className="text-lg sm:text-xl opacity-90 leading-relaxed px-4 max-h-[30vh] overflow-y-auto scrollbar-hide overscroll-contain">
          {mainText}
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col items-center justify-between pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] overflow-hidden",
      isDark ? "bg-black text-white" : "bg-zinc-50 text-zinc-900"
    )}>
       {/* Background */}
       {showBackground && (
        <>
          <div
            className="absolute inset-0 z-0 transition-opacity duration-700 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentBackgroundUrl})` }}
          />
          <div
            className={cn(
           "absolute inset-0 z-0 transition-all duration-700",
            isDark 
            ? "bg-black/65"          // negro medio-fuerte en dark
           : "bg-white/55"          // blanco medio en light
           )}
          />
        </>
       )}

       {/* Top Bar */}
       <div className="w-full flex justify-between items-start p-4 relative z-20">
          <div className="w-10" /> {/* Spacer */}
          <div className="text-center">
            <h1 className="font-bold text-lg">Vía Crucis</h1>
          </div>
          <div className="flex gap-1">
             <Button variant="ghost" size="icon" onClick={() => setShowBackground(!showBackground)}>
                <ImageIcon className={cn("size-5", !showBackground && "opacity-30")} />
             </Button>
             <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="size-6" />
             </Button>
          </div>
       </div>

       {/* Main Content */}
       <div className="flex-1 flex flex-col items-center justify-center w-full px-6 relative z-10 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
                key={`${phase}-${currentStationIndex}-${currentStepIndex}-${outroStepIndex}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="w-full"
            >
                {renderContent()}
            </motion.div>
          </AnimatePresence>
       </div>

              {/* Navigation Control */}
       {touchNavEnabled && (
         <div className="pointer-events-none absolute inset-0 z-20">
           <div
             className="pointer-events-auto absolute left-0 w-full flex"
             style={{
               top: 'calc(4rem + env(safe-area-inset-top))',
               height: 'calc(100% - (4rem + env(safe-area-inset-top)))',
             }}
           >
             <button
               type="button"
               aria-label="Anterior"
               className="h-full"
               style={{ width: '25%' }}
               onClick={handlePrev}
             />
             <div className="h-full pointer-events-none" style={{ width: '37.5%' }} />
             <button
               type="button"
               aria-label="Siguiente"
               className="h-full"
               style={{ width: '37.5%' }}
               onClick={handleNext}
             />
           </div>
         </div>
       )}

       {!touchNavEnabled && (
         <div
           ref={navRef}
           className={cn(
             "fixed z-50 flex items-center bg-background/80 shadow-lg border border-border/20 backdrop-blur-md",
             navBubbleClass,
             navPos ? "" : "bottom-[calc(2rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2"
           )}
           style={navPos ? { left: navPos.x, top: navPos.y } : undefined}
         >
           {/* Drag Handle */}
           <div
             className="flex items-center px-1.5 select-none opacity-30 cursor-grab active:cursor-grabbing"
             onPointerDown={(event) => {
               event.preventDefault();
               const rect = navRef.current?.getBoundingClientRect();
               navDragStart.current = {
                 x: event.clientX,
                 y: event.clientY,
                 startX: rect?.left ?? 0,
                 startY: rect?.top ?? 0,
               };
               setIsDraggingNav(true);
             }}
             style={{ touchAction: 'none' }}
           >
             <div className="grid grid-cols-2 gap-0.5">
               {Array.from({ length: 6 }).map((_, i) => (
                 <span key={i} className="h-1 w-1 rounded-full bg-foreground" />
               ))}
             </div>
           </div>

           <Button
             variant="ghost"
             size="icon"
             className={cn("hover:bg-foreground/5", navButtonClass)}
             onClick={handlePrev}
             disabled={phase === 'intro'}
           >
             <ChevronLeft className={navIconClass} />
           </Button>

           <div className="w-px h-6 bg-border mx-1" />

           <Button
             variant="ghost"
             size="icon"
             className={cn("hover:bg-foreground/5", navButtonClass)}
             onClick={handleNext}
           >
             <ChevronRight className={navIconClass} />
           </Button>
         </div>
       )}

       {/* Progress Bar */}
       <div className="absolute bottom-0 left-0 w-full h-1 bg-muted/20">
            <div 
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
            />
       </div>
    </div>
  );
}



