'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings, UserStats } from '@/context/SettingsContext';
import type { Prayer } from '@/lib/types';
import Image from 'next/image';

type AnnuumStoryProps = {
  onClose: () => void;
  originRect?: { top: number; left: number; width: number; height: number };
};

const SLOW_READING_WORDS_PER_MINUTE = 80;
const SLIDE_READING_BASE_MS = 2500;
const MIN_SLIDE_DURATION_MS = 8000;
const MAX_SLIDE_DURATION_MS = 90000;

const calculateSlideDuration = (text: string) => {
  const words = text
    .trim()
    .split(/\s+/u)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  const readingTime = (words / SLOW_READING_WORDS_PER_MINUTE) * 60_000;
  return Math.min(
    MAX_SLIDE_DURATION_MS,
    Math.max(MIN_SLIDE_DURATION_MS, Math.round(SLIDE_READING_BASE_MS + readingTime))
  );
};

export default function AnnuumStory({ onClose, originRect }: AnnuumStoryProps) {
  const { userStats, allPrayers, showZeroStats } = useSettings();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [slideDuration, setSlideDuration] = useState(MIN_SLIDE_DURATION_MS);
  
  const lastTimeRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);


  const handleSlideContentRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    setSlideDuration(calculateSlideDuration(node.innerText));
    setProgress(0);
    progressRef.current = 0;
    lastTimeRef.current = null;
  }, []);
  const slides = useMemoSlides(userStats, allPrayers, showZeroStats);

  const handleNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onClose();
    }
  }, [currentSlide, slides.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  // Reset progress when slide changes
  useEffect(() => {
      setProgress(0);
      progressRef.current = 0;
      lastTimeRef.current = null;
  }, [currentSlide]);

  // Timer Logic
  useEffect(() => {
    const animate = (time: number) => {
        if (isPaused) {
            lastTimeRef.current = null;
            animationFrameRef.current = requestAnimationFrame(animate);
            return;
        }

        if (lastTimeRef.current === null) {
            lastTimeRef.current = time;
            animationFrameRef.current = requestAnimationFrame(animate);
            return;
        }

        const delta = time - lastTimeRef.current;
        lastTimeRef.current = time;

        const increment = (delta / slideDuration) * 100;
        const newProgress = progressRef.current + increment;
        
        progressRef.current = Math.min(newProgress, 100);
        setProgress(progressRef.current);

        if (progressRef.current >= 100) {
            handleNext();
        } else {
            animationFrameRef.current = requestAnimationFrame(animate);
        }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };
  }, [currentSlide, isPaused, handleNext, slideDuration]);

  const CurrentComponent = slides[currentSlide]?.component || IntroSlide;

  // Wake Lock
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await (navigator as any).wakeLock.request('screen');
            }
        } catch (err) {
            console.error(err);
        }
    };
    requestWakeLock();
    return () => {
        if (wakeLock) wakeLock.release();
    };
  }, []);

  return (
    <motion.div 
      initial={originRect ? { 
          top: originRect.top, 
          left: originRect.left, 
          width: originRect.width, 
          height: originRect.height,
          borderRadius: 9999, // circle
          opacity: 0
      } : { opacity: 0 }}
      animate={{ 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh',
          borderRadius: 0,
          opacity: 1
      }}
      exit={originRect ? {
          top: originRect.top, 
          left: originRect.left, 
          width: originRect.width, 
          height: originRect.height,
          borderRadius: 9999,
          opacity: 0,
          transition: { duration: 0.5, ease: "easeInOut" }
      } : { opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed z-[100] bg-black text-white flex flex-col overflow-hidden"
    >
      {/* Background Layer */}
       <div className="absolute inset-0 z-0 bg-gradient-to-b from-black via-gray-900 to-black pointer-events-none" />

      {/* Safe Area Container */}
      <div className="relative z-10 flex flex-col h-full safe-area-inset-top safe-area-inset-bottom">
        
          {/* Progress Bar */}
          <div className="flex gap-1 px-2 pt-12 md:pt-4 z-20">
            {slides.map((_, index) => (
              <div key={index} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-0 ease-linear"
                  style={{ 
                      width: index < currentSlide ? '100%' : index === currentSlide ? `${progress}%` : '0%' 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header Controls */}
          <div className="flex justify-between items-center px-4 py-4 z-20">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full overflow-hidden relative border border-white/20">
                   <Image src="/icons/icon.png" alt="Logo" fill className="object-cover" />
               </div>
               <div className="flex flex-col">
                   <span className="font-headline font-bold text-sm leading-none">Cotidie Annuum</span>
                   <span className="text-[10px] opacity-70 leading-none mt-0.5">Recorrido {new Date().getFullYear()}</span>
               </div>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20 rounded-full w-8 h-8" 
                onClick={onClose}
            >
              <X className="size-5" />
            </Button>
          </div>

          {/* Main Content Area */}
          <div 
            className="flex-1 relative flex items-center justify-center"
            onPointerDown={() => setIsPaused(true)}
            onPointerUp={() => setIsPaused(false)}
            onPointerLeave={() => setIsPaused(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Navigation Tap Zones */}
            <div className="absolute inset-0 flex z-30">
                <div className="w-1/3 h-full" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
                <div className="w-1/3 h-full cursor-pointer" /> {/* Center for pause only */}
                <div className="w-1/3 h-full" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                ref={handleSlideContentRef}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full flex items-center justify-center p-6 pointer-events-none"
              >
                <CurrentComponent userStats={userStats} allPrayers={allPrayers} />
              </motion.div>
            </AnimatePresence>
          </div>
      </div>
    </motion.div>
  );
}

// --- Slides Logic ---

type AnnualSlideProps = {
  userStats: UserStats;
  allPrayers: Prayer[];
};

type SlideFrameProps = {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

type MetricBlockProps = {
  value: number;
  label: string;
  accentClass?: string;
  helper?: string;
};

const formatNumber = (value: number) => new Intl.NumberFormat('es-CL').format(value);

const findPrayerById = (id: string, prayers: Prayer[]): Prayer | null => {
  for (const prayer of prayers) {
    if (prayer.id === id) return prayer;
    if (prayer.prayers?.length) {
      const found = findPrayerById(id, prayer.prayers);
      if (found) return found;
    }
  }
  return null;
};

const buildDaysReflection = (days: number) => {
  if (days >= 300) {
    return 'Aquí hubo una fidelidad concreta. No perfecta, pero sí real. Volviste una y otra vez, y el Señor sabe lo que cuesta esa perseverancia escondida.';
  }
  if (days >= 150) {
    return 'La perseverancia cristiana casi nunca hace ruido. Se parece más bien a esto: volver, recomenzar y ponerse otra vez delante de Dios.';
  }
  if (days > 0) {
    return 'Aunque haya habido interrupciones, no mires en menos estos pasos. El Señor también edifica en lo pequeño y no desprecia ningún recomienzo.';
  }
  return 'Si este año quedó más vacío de lo que quisieras, míralo con paz. La gracia no te humilla: te vuelve a llamar y abre de nuevo el camino.';
};

const buildTopPrayerReflection = (prayerId: string | undefined, count: number) => {
  if (!prayerId || count === 0) {
    return 'Tal vez aquí todavía no hay una preferencia marcada. No importa. La vida espiritual también madura poco a poco, y siempre se puede comenzar de nuevo.';
  }
  if (prayerId.includes('rosario')) {
    return 'Cuando el corazón vuelve una y otra vez al Rosario, María lo va llevando con paciencia hacia su Hijo.';
  }
  if (prayerId.includes('misa')) {
    return 'Volver a la Misa, o a su preparación, es volver a la fuente. Allí el Señor ordena de nuevo el corazón.';
  }
  if (prayerId.includes('examen')) {
    return 'Detenerse a revisar la propia vida delante de Dios ya es una forma humilde de abrirse a su verdad y a su misericordia.';
  }
  return 'El alma suele regresar a aquel texto donde el Señor le habla con más claridad, o donde encuentra más consuelo para seguir caminando.';
};

function useMemoSlides(userStats: UserStats, allPrayers: Prayer[], showZeroStats: boolean) {
  return React.useMemo(() => {
    const slides = [
      { id: 'intro', component: IntroSlide },
      { id: 'grace', component: GraceSlide },
      { id: 'days', component: DaysActiveSlide },
      { id: 'top-prayer', component: TopPrayerSlide },
      { id: 'total-prayers', component: TotalPrayersSlide },
      ...(showZeroStats || userStats.morningDaysCount > 0 ? [{ id: 'morning', component: MorningPrayersSlide }] : []),
      ...(showZeroStats || userStats.nightDaysCount > 0 ? [{ id: 'night', component: NightPrayersSlide }] : []),
      ...(showZeroStats || userStats.angelusCount > 0 ? [{ id: 'angelus', component: AngelusSlide }] : []),
      ...(showZeroStats || userStats.rosaryCount > 0 ? [{ id: 'rosary', component: RosarySlide }] : []),
      ...(showZeroStats || userStats.examinationCount > 0 ? [{ id: 'examination', component: ExaminationSlide }] : []),
      ...(showZeroStats || Object.keys(userStats.prayerDaysCount || {}).length > 0 ? [{ id: 'top-devotion', component: TopDevotionSlide }] : []),
      ...(showZeroStats || userStats.massStreak > 1 ? [{ id: 'mass-streak', component: MassStreakSlide }] : []),
      ...(showZeroStats || userStats.saintQuotesOpened > 0 ? [{ id: 'saint-quotes', component: SaintQuotesSlide }] : []),
      ...(showZeroStats || (userStats.lettersWritten + userStats.devotionsCreated + userStats.prayersCreated) > 0 ? [{ id: 'creation', component: CreationSlide }] : []),
      { id: 'next-year', component: ProsperoAnoSlide },
      { id: 'outro', component: OutroSlide },
    ];
    return slides;
  }, [allPrayers, showZeroStats, userStats]);
}

// --- Slides Components ---

function SlideFrame({ eyebrow, title, children, footer }: SlideFrameProps) {
  return (
    <div className="w-full max-w-2xl px-2">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 px-8 py-10 text-center shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <div className="space-y-6">
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/55">{eyebrow}</p>
          <h2 className="text-3xl font-headline font-bold leading-tight sm:text-4xl">{title}</h2>
          <div className="space-y-4 text-base leading-relaxed text-white/88 sm:text-lg">
            {children}
          </div>
          {footer ? <div className="pt-2">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

function MetricBlock({ value, label, accentClass = 'text-amber-200', helper }: MetricBlockProps) {
  return (
    <div className="space-y-3 py-2">
      <div className={`text-7xl font-black font-headline leading-none sm:text-8xl ${accentClass}`}>
        {formatNumber(value)}
      </div>
      <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">{label}</p>
      {helper ? <p className="text-sm leading-relaxed text-white/70">{helper}</p> : null}
    </div>
  );
}

function IntroSlide() {
  return (
    <SlideFrame eyebrow="Cotidie Annuum" title="Miremos el año con verdad">
      <p>
        No venimos a ponernos nota. Venimos a reconocer por dónde el Señor te sostuvo, te esperó y te volvió a llamar a la oración.
      </p>
      <p>
        A veces con fervor; otras veces con cansancio; otras, simplemente con el deseo humilde de no perder el hilo de su gracia.
      </p>
      <blockquote className="font-serif italic text-white/78">
        “Hasta aquí nos ha ayudado el Señor”.
      </blockquote>
    </SlideFrame>
  );
}

function GraceSlide() {
  return (
    <SlideFrame eyebrow="Clave De Lectura" title="Como hijo, no como quien rinde cuentas">
      <p>
        Estas cifras no miden santidad ni intensidad interior. Sólo dejan huella de una búsqueda real: veces en que volviste a ponerte delante de Dios.
      </p>
      <p>
        Míralas con paz. Lo central no es el número, sino la fidelidad del Señor, que siguió trabajando en ti incluso en los días más pobres.
      </p>
      <p className="text-sm text-white/72">Es una lectura serena del año, no una libreta espiritual.</p>
    </SlideFrame>
  );
}

function DaysActiveSlide({ userStats }: AnnualSlideProps) {
  return (
    <SlideFrame eyebrow="Fidelidad Concreta" title="El Señor te esperó muchas veces">
      <MetricBlock
        value={userStats.daysActive}
        label="Días con oración registrada"
        helper="No todo día fue igual, pero en todos hubo al menos un gesto de búsqueda."
      />
      <p>{buildDaysReflection(userStats.daysActive)}</p>
    </SlideFrame>
  );
}

function TopPrayerSlide({ userStats, allPrayers }: AnnualSlideProps) {
  const validPrayers = Object.entries(userStats.prayersOpenedHistory)
    .map(([id, total]) => ({
      id,
      total,
      prayer: findPrayerById(id, allPrayers),
    }))
    .filter((entry): entry is { id: string; total: number; prayer: Prayer } => {
      return Boolean(entry.prayer && (!entry.prayer.prayers || entry.prayer.prayers.length === 0));
    })
    .sort((a, b) => b.total - a.total);

  const topEntry = validPrayers[0];

  if (!topEntry) {
    return (
      <SlideFrame eyebrow="Oración" title="Siempre se puede comenzar otra vez">
        <p>
          Tal vez aquí todavía no aparece una oración claramente dominante. No importa. La vida espiritual también madura de a poco, y el Señor nunca se cansa de abrir un nuevo comienzo.
        </p>
      </SlideFrame>
    );
  }

  return (
    <SlideFrame eyebrow="Oración" title="Hubo un texto que te acompañó especialmente">
      <div className="rounded-[1.5rem] border border-white/12 bg-black/25 px-6 py-7">
        <p className="text-2xl font-headline font-bold leading-tight text-white sm:text-3xl">{topEntry.prayer.title}</p>
        <div className="mt-5">
          <MetricBlock
            value={topEntry.total}
            label="Aperturas registradas"
            accentClass="text-sky-200"
            helper="Este dato cuenta veces abiertas, no la hondura de cada rato de oración."
          />
        </div>
      </div>
      <p>{buildTopPrayerReflection(topEntry.id, topEntry.total)}</p>
    </SlideFrame>
  );
}

function TotalPrayersSlide({ userStats }: AnnualSlideProps) {
  return (
    <SlideFrame eyebrow="Pan Diario" title="Muchas veces levantaste la mirada">
      <MetricBlock
        value={userStats.totalPrayersOpened}
        label="Aperturas de oración, lectura o devoción"
        accentClass="text-white"
        helper="Es una suma de accesos registrados dentro de la app."
      />
      <p>
        Esto no pretende medir tu vida interior. Sólo deja memoria de cuántas veces buscaste un texto, una devoción o una lectura para volver a Dios en medio de lo cotidiano.
      </p>
    </SlideFrame>
  );
}

const normalizeForMatch = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const buildTopDevotionReflection = (title: string | null, days: number) => {
  if (!title || days === 0) {
    return 'Puede ser que este año no haya quedado una devoción especialmente marcada. No por eso faltó la gracia: muchas veces Dios trabaja en silencio, sin dejar enseguida una preferencia clara.';
  }

  const normalized = normalizeForMatch(title);

  if (normalized.includes('maria') || normalized.includes('virgen') || normalized.includes('rosario')) {
    return 'Cuando una devoción mariana acompaña tanto, muchas veces es porque la Virgen fue ordenando el corazón, en silencio, hacia su Hijo.';
  }

  if (normalized.includes('jose')) {
    return 'San José suele enseñar sin discursos: presencia serena, trabajo escondido y fidelidad concreta. También eso forma el alma cristiana.';
  }

  if (days >= 120) {
    return 'No es sólo costumbre. Aquí se alcanza a ver una amistad espiritual real, de esas que sostienen la fe cuando el ánimo sube y también cuando baja.';
  }

  return 'El corazón vuelve con frecuencia a aquellos amigos de Dios que lo ayudan a mirar a Cristo con más sencillez. También por ahí pasa la gracia.';
};

const buildRhythmReflection = (count: number, moment: 'morning' | 'night') => {
  if (moment === 'morning') {
    if (count >= 120) {
      return 'Empezar así tantas mañanas habla de algo muy concreto: antes de salir al ruido del mundo, varias veces elegiste ponerte delante de Dios.';
    }
    if (count > 0) {
      return 'No todas las mañanas fueron iguales, pero hubo varias en que el día comenzó mejor orientado, con el corazón vuelto hacia el Señor.';
    }
    return 'Si aquí casi no hubo registro, no te reproches de más. El día de mañana también puede empezar distinto, con una oración breve y un corazón disponible.';
  }

  if (count >= 120) {
    return 'Terminar así tantas jornadas habla de una vida que aprendió a volver a Dios aun con cansancio. Esa pobreza ofrecida también es oración verdadera.';
  }
  if (count > 0) {
    return 'Al caer la tarde también buscaste al Señor. A veces bastan unos minutos sinceros para entregar el peso del día y descansar de otra manera.';
  }
  return 'Si la noche pasó muchas veces sin oración, míralo con humildad y paz. La gracia también sabe esperar hasta que uno se atreve a hacer silencio.';
};

const buildAngelusReflection = (count: number) => {
  if (count >= 90) {
    return 'Detener el día tantas veces para volver a la Encarnación no es menor. En medio del trabajo y del apuro, dejaste entrar el misterio de Cristo en lo cotidiano.';
  }
  if (count > 0) {
    return 'Hubo pausas concretas para mirar al Señor en medio del día. Eso ya dice mucho: no todo quedó absorbido por la prisa.';
  }
  return 'Si este año el Ángelus casi no apareció, no pasa nada. Basta un pequeño alto al mediodía para que el corazón recuerde de nuevo Quién habita nuestra historia.';
};

const buildRosaryReflection = (count: number) => {
  if (count >= 100) {
    return 'Aquí hubo una constancia mariana muy honda. El Rosario, rezado así, deja de ser repetición y se vuelve escuela de contemplación junto a María.';
  }
  if (count > 0) {
    return 'La Virgen también te fue llevando por los misterios de la vida de Cristo. En eso hay una pedagogía mansa, muy propia de una madre.';
  }
  return 'Si el Rosario quedó pendiente, no lo tomes como deuda. Tómalo más bien como una invitación abierta a contemplar a Cristo acompañado por su Madre.';
};

const buildExaminationReflection = (count: number) => {
  if (count >= 80) {
    return 'Detenerse así a revisar el corazón es signo de madurez espiritual. No para girar sobre uno mismo, sino para dejar que Dios haga verdad, luz y misericordia.';
  }
  if (count > 0) {
    return 'También hubo momentos de examen. Eso siempre hace bien: ordena el interior, afina la conciencia y ayuda a recomenzar con humildad.';
  }
  return 'Si casi no hubo examen de conciencia, no te asustes. El Señor no te llama a vivir tensionado, sino a dejarte iluminar por Él con sencillez y verdad.';
};

const buildMassReflection = (streak: number) => {
  if (streak >= 30) {
    return 'Una racha así no es un detalle. Muestra que hubo un tramo del año en que la Eucaristía marcó de verdad el paso de tus días.';
  }
  if (streak > 1) {
    return 'Aquí se ve una fidelidad concreta. Tal vez breve, pero real. Y muchas veces la vida cristiana crece justamente así: por tramos pequeños, sostenidos con amor.';
  }
  return 'Aunque no aparezca una racha grande, la Misa sigue siendo el centro al que siempre se puede volver. El Señor nunca cierra la puerta de su altar.';
};

const buildQuotesReflection = (count: number) => {
  if (count >= 150) {
    return 'Abriste muchas veces la voz de los santos. Eso habla bien del alma: quien sabe escuchar a los amigos de Dios suele encontrar palabras limpias para seguir caminando.';
  }
  if (count > 0) {
    return 'También dejaste que otros, antes que tú, te recordaran el Evangelio. A veces una frase oportuna basta para enderezar el día.';
  }
  return 'Si aquí casi no hubo movimiento, no importa. Siempre está abierta la posibilidad de dejarse acompañar por quienes ya recorrieron el camino de la santidad.';
};

const buildCreationReflection = (totalCreated: number) => {
  if (totalCreated >= 20) {
    return 'La oración no quedó sólo en palabras recibidas. También fue tomando tu propia voz, tus preguntas, tu gratitud y tu manera concreta de hablar con Dios.';
  }
  if (totalCreated > 0) {
    return 'Aquí asoma algo muy valioso: no sólo repetiste fórmulas, también buscaste poner delante del Señor palabras nacidas de tu propia vida.';
  }
  return 'Tal vez este año fue más de recibir que de escribir. También eso tiene su lugar. Primero se aprende a escuchar; después, poco a poco, brota una respuesta más personal.';
};

function TopDevotionSlide({ userStats, allPrayers }: AnnualSlideProps) {
  const devotionStats = allPrayers
    .filter((prayer): prayer is Prayer & { id: string } => {
      return prayer.categoryId === 'devociones' && typeof prayer.id === 'string';
    })
    .map((devotion) => ({
      id: devotion.id,
      title: devotion.title,
      days: userStats.prayerDaysCount?.[devotion.id] || 0,
    }))
    .filter((devotion) => devotion.days > 0)
    .sort((a, b) => b.days - a.days);

  const topDevotion = devotionStats[0];

  if (!topDevotion) {
    return (
      <SlideFrame eyebrow="Intercesión" title="La amistad espiritual también madura despacio">
        <MetricBlock
          value={0}
          label="Días con una devoción predominante"
          accentClass="text-amber-100"
          helper="Aquí sólo contamos los días registrados por la app."
        />
        <p>{buildTopDevotionReflection(null, 0)}</p>
      </SlideFrame>
    );
  }

  return (
    <SlideFrame
      eyebrow="Intercesión"
      title="Hubo una devoción que te acompañó con especial constancia"
      footer={
        devotionStats.length > 1 ? (
          <div className="space-y-3 text-left">
            <p className="text-center text-[11px] uppercase tracking-[0.35em] text-white/55">
              Otras devociones presentes
            </p>
            <div className="space-y-2">
              {devotionStats.slice(1, 4).map((devotion) => (
                <div
                  key={devotion.id}
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/82"
                >
                  <span className="mr-4 flex-1 truncate">{devotion.title}</span>
                  <span className="shrink-0 font-semibold text-white/70">
                    {formatNumber(devotion.days)} días
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null
      }
    >
      <div className="rounded-[1.5rem] border border-white/12 bg-black/25 px-6 py-7">
        <p className="text-2xl font-headline font-bold leading-tight text-white sm:text-3xl">{topDevotion.title}</p>
        <div className="mt-5">
          <MetricBlock
            value={topDevotion.days}
            label="Días con intercesión registrada"
            accentClass="text-amber-100"
            helper="No mide fervor interior; sólo registra presencia y constancia."
          />
        </div>
      </div>
      <p>{buildTopDevotionReflection(topDevotion.title, topDevotion.days)}</p>
    </SlideFrame>
  );
}

function MorningPrayersSlide({ userStats }: AnnualSlideProps) {
  const count = userStats.morningDaysCount ?? 0;

  return (
    <SlideFrame eyebrow="Ritmo Diario" title="También hubo mañanas ofrecidas a Dios">
      <MetricBlock
        value={count}
        label="Mañanas con oración registrada"
        accentClass="text-orange-200"
        helper="Se cuentan los días en que la app registró oración en la mañana."
      />
      <p>{buildRhythmReflection(count, 'morning')}</p>
    </SlideFrame>
  );
}

function NightPrayersSlide({ userStats }: AnnualSlideProps) {
  const count = userStats.nightDaysCount ?? 0;

  return (
    <SlideFrame eyebrow="Ritmo Diario" title="Al caer la tarde también buscaste su presencia">
      <MetricBlock
        value={count}
        label="Noches con oración registrada"
        accentClass="text-sky-200"
        helper="Es un registro simple del horario, no de la profundidad del momento."
      />
      <p>{buildRhythmReflection(count, 'night')}</p>
    </SlideFrame>
  );
}

function AngelusSlide({ userStats }: AnnualSlideProps) {
  const count = userStats.angelusCount ?? 0;

  return (
    <SlideFrame eyebrow="Encarnación" title="En medio del día también hiciste un alto">
      <MetricBlock
        value={count}
        label="Ángelus o Regina Caeli"
        accentClass="text-yellow-100"
        helper="Estos registros muestran pausas de oración mariana en mitad de la jornada."
      />
      <p>{buildAngelusReflection(count)}</p>
    </SlideFrame>
  );
}

function RosarySlide({ userStats }: AnnualSlideProps) {
  const count = userStats.rosaryCount ?? 0;

  return (
    <SlideFrame eyebrow="María" title="María también estuvo presente en tu oración">
      <MetricBlock
        value={count}
        label="Rosarios registrados"
        accentClass="text-rose-200"
        helper="Es un conteo de rosarios abiertos o rezados desde el flujo de la app."
      />
      <p>{buildRosaryReflection(count)}</p>
    </SlideFrame>
  );
}

function ExaminationSlide({ userStats }: AnnualSlideProps) {
  const count = userStats.examinationCount ?? 0;

  return (
    <SlideFrame eyebrow="Verdad Interior" title="También te detuviste a revisar el corazón">
      <MetricBlock
        value={count}
        label="Exámenes de conciencia"
        accentClass="text-violet-200"
        helper="Este dato deja memoria de esos momentos de revisión delante de Dios."
      />
      <p>{buildExaminationReflection(count)}</p>
    </SlideFrame>
  );
}

function MassStreakSlide({ userStats }: AnnualSlideProps) {
  const streak = userStats.massStreak ?? 0;

  return (
    <SlideFrame eyebrow="Eucaristía" title="Hubo un tramo concreto de fidelidad a la Misa">
      <MetricBlock
        value={streak}
        label="Mejor racha de días seguidos"
        accentClass="text-white"
        helper="Una racha no resume toda tu vida sacramental, pero sí deja ver un trecho real de constancia."
      />
      <p>{buildMassReflection(streak)}</p>
    </SlideFrame>
  );
}

function SaintQuotesSlide({ userStats }: AnnualSlideProps) {
  const count = userStats.saintQuotesOpened ?? 0;

  return (
    <SlideFrame eyebrow="Compañía De Los Santos" title="También dejaste que otros te recordaran el Evangelio">
      <MetricBlock
        value={count}
        label="Frases de santos abiertas"
        accentClass="text-amber-200"
        helper="Son accesos a frases, meditaciones o textos breves dentro de la app."
      />
      <p>{buildQuotesReflection(count)}</p>
    </SlideFrame>
  );
}

function CreationSlide({ userStats }: AnnualSlideProps) {
  const totalCreated = userStats.lettersWritten + userStats.devotionsCreated + userStats.prayersCreated;

  return (
    <SlideFrame eyebrow="Respuesta Personal" title="La oración también fue tomando tu propia voz">
      <div className="space-y-3 rounded-[1.5rem] border border-white/12 bg-black/25 px-5 py-5 text-left">
        <CreationStatRow label="Cartas escritas" count={userStats.lettersWritten} delay={0.1} />
        <CreationStatRow label="Devociones creadas" count={userStats.devotionsCreated} delay={0.2} />
        <CreationStatRow label="Oraciones propias" count={userStats.prayersCreated} delay={0.3} />
      </div>
      <div className="rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.35em] text-white/55">Total de creaciones</p>
        <p className="mt-2 text-4xl font-headline font-bold text-white">{formatNumber(totalCreated)}</p>
      </div>
      <p>{buildCreationReflection(totalCreated)}</p>
    </SlideFrame>
  );
}

function CreationStatRow({ label, count, delay }: { label: string; count: number; delay: number }) {
  return (
    <motion.div
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay }}
      className="flex items-center justify-between border-b border-white/8 pb-3 last:border-b-0 last:pb-0"
    >
      <span className="text-sm font-medium text-white/82">{label}</span>
      <span className="text-xl font-headline font-bold text-white">{formatNumber(count)}</span>
    </motion.div>
  );
}

function ProsperoAnoSlide() {
  const year = new Date().getFullYear();
  const nextYear = year + 1;

  return (
    <SlideFrame eyebrow={`Camino ${nextYear}`} title={`Entra en ${nextYear} con paz y decisión`}>
      <div className="rounded-[1.5rem] border border-white/10 bg-black/25 px-6 py-6">
        <p className="text-5xl font-headline font-black text-amber-100 sm:text-6xl">{nextYear}</p>
        <p className="mt-3 text-sm uppercase tracking-[0.35em] text-white/55">Lo que viene</p>
      </div>
      <p>
        Dale gracias a Dios por el {year} que termina, pero no entres al año nuevo como quien parte de cero. En la vida espiritual, el Señor siempre recoge algo de lo sembrado.
      </p>
      <p>
        Pídele constancia antes que espectáculo, hondura antes que cantidad y un corazón disponible antes que una lista impecable.
      </p>
    </SlideFrame>
  );
}

function OutroSlide() {
  return (
    <SlideFrame eyebrow="Cierre" title="Quédate con lo esencial">
      <p>
        Da gracias por lo bueno, pide perdón por lo flojo y vuelve a empezar con serenidad. La obra no depende sólo de ti: el Señor ya viene trabajando hace tiempo en tu alma.
      </p>
      <p>
        Si algo deja este Annuum, ojalá sea esto: hubo gracia, hubo combate y hubo también una verdadera búsqueda de Dios en medio de la vida de todos los días.
      </p>
      <div className="flex flex-col items-center gap-4 pt-2">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/20">
          <Image src="/icons/icon.png" alt="Cotidie" fill className="object-cover" />
        </div>
        <div className="inline-block rounded-full border border-white/20 bg-white/8 px-6 py-2 text-[11px] uppercase tracking-[0.35em] text-white/72">
          Cotidie
        </div>
      </div>
    </SlideFrame>
  );
}
