'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings, UserStats } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type WrappedStoryProps = {
  onClose: () => void;
  originRect?: { top: number; left: number; width: number; height: number };
};

const SLIDE_DURATION = 8000; // 8 seconds per slide

export default function WrappedStory({ onClose, originRect }: WrappedStoryProps) {
  const { userStats, allPrayers, showZeroStats } = useSettings();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const lastTimeRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

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

        const increment = (delta / SLIDE_DURATION) * 100;
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
  }, [currentSlide, isPaused, handleNext]);

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
                   <Image src="/icons/icon-192x192.png" alt="Logo" fill className="object-cover" />
               </div>
               <div className="flex flex-col">
                   <span className="font-headline font-bold text-sm leading-none">Cotidie Annuum</span>
                   <span className="text-[10px] opacity-70 leading-none mt-0.5">Resumen {new Date().getFullYear()}</span>
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

function useMemoSlides(userStats: UserStats, allPrayers: any[], showZeroStats: boolean) {
    return React.useMemo(() => {
        const slides = [
            { id: 'intro', component: IntroSlide },
            { id: 'days', component: DaysActiveSlide },
            { id: 'top-prayer', component: TopPrayerSlide },
            { id: 'total-prayers', component: TotalPrayersSlide },
            
            // Conditional Slides
            ...(showZeroStats || userStats.morningDaysCount > 0 ? [{ id: 'morning', component: MorningPrayersSlide }] : []),
            ...(showZeroStats || userStats.nightDaysCount > 0 ? [{ id: 'night', component: NightPrayersSlide }] : []),
            ...(showZeroStats || userStats.angelusCount > 0 ? [{ id: 'angelus', component: AngelusSlide }] : []),
            ...(showZeroStats || userStats.rosaryCount > 0 ? [{ id: 'rosary', component: RosarySlide }] : []),
            ...(showZeroStats || userStats.examinationCount > 0 ? [{ id: 'examination', component: ExaminationSlide }] : []),
            
            // Top Devotions (requires at least one devotion with >0 days)
            ...(showZeroStats || Object.keys(userStats.prayerDaysCount || {}).length > 0 ? [{ id: 'top-devotion', component: TopDevotionSlide }] : []),
            
            ...(showZeroStats || userStats.massStreak > 1 ? [{ id: 'mass-streak', component: MassStreakSlide }] : []),
            ...(showZeroStats || userStats.saintQuotesOpened > 0 ? [{ id: 'saint-quotes', component: SaintQuotesSlide }] : []),
            
            ...(showZeroStats || (userStats.lettersWritten + userStats.devotionsCreated + userStats.prayersCreated) > 0 ? [{ id: 'creation', component: CreationSlide }] : []),
            
            { id: 'prospero-ano', component: ProsperoAnoSlide },
            { id: 'outro', component: OutroSlide },
        ];
        return slides;
    }, [userStats, allPrayers, showZeroStats]);
}

// --- Slides Components ---

function IntroSlide() {
  return (
    <div className="text-center space-y-8 max-w-md">
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.2 }}
        className="text-6xl"
      >
        ✨
      </motion.div>
      <motion.h1 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.4 }}
        className="text-4xl font-headline font-bold leading-tight"
      >
        ¡Alabado sea Jesucristo!
      </motion.h1>
      <motion.p 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.6 }}
        className="text-xl opacity-90"
      >
        Tu año espiritual ha sido un camino lleno de gracia.
      </motion.p>
      <motion.p 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.8 }}
        className="text-lg font-serif italic"
      >
        "El que permanece en mí y yo en él, ése da mucho fruto."
      </motion.p>
    </div>
  );
}

function DaysActiveSlide({ userStats }: { userStats: UserStats }) {
  let irony = "";
  if (userStats.daysActive > 360) irony = "¡Prácticamente vives aquí! (No es queja, nos encanta).";
  else if (userStats.daysActive > 300) irony = "Una constancia digna de un monje de clausura.";
  else if (userStats.daysActive > 200) irony = "¡Más de la mitad del año! Eso es compromiso.";
  else if (userStats.daysActive > 100) irony = "La perseverancia es la clave del éxito espiritual.";
  else if (userStats.daysActive > 50) irony = "Buen ritmo, ¡sigue así el próximo año!";
  else if (userStats.daysActive > 0) irony = "Cada día cuenta. ¡Ánimo!";
  else irony = "¿Seguro que instalaste la app este año?";

  return (
    <div className="text-center space-y-6 bg-gradient-to-br from-blue-900/40 to-purple-900/40 p-8 rounded-3xl border border-white/10 backdrop-blur-sm w-full max-w-sm relative overflow-hidden">
       {/* Ambient Elements */}
       <motion.div 
         className="absolute top-2 left-2 text-white/10 text-6xl"
         animate={{ rotate: 360 }}
         transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
       >
         ✝
       </motion.div>

      <motion.h2 
        initial={{ x: -50, opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }}
        className="text-2xl font-bold"
      >
        Tu constancia es luz
      </motion.h2>
      
      <div className="py-8">
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          transition={{ type: 'spring', delay: 0.3 }}
          className="text-8xl font-black font-headline text-yellow-400"
        >
          {userStats.daysActive}
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl uppercase tracking-widest mt-2"
        >
          Días orando
        </motion.div>
      </div>

      <motion.p 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="opacity-90 text-sm italic"
      >
        "{irony}"
      </motion.p>
    </div>
  );
}

function TopPrayerSlide({ userStats, allPrayers }: { userStats: UserStats, allPrayers: any[] }) {
  // Filter out prayers that are actually sections (have sub-prayers)
  // or are just containers/categories if identified as such.
  // We want the "leaf" prayer with the most opens.
  const validPrayers = Object.entries(userStats.prayersOpenedHistory)
    .filter(([id]) => {
        const p = allPrayers.find(prayer => prayer.id === id);
        // Exclude if not found or if it has sub-prayers (is a section)
        if (!p) return false;
        if (p.prayers && p.prayers.length > 0) return false;
        return true;
    })
    .sort((a, b) => b[1] - a[1]);

  const topPrayerId = validPrayers[0]?.[0];
  const topPrayer = allPrayers.find(p => p.id === topPrayerId);
  const count = topPrayerId ? (userStats.prayersOpenedHistory[topPrayerId] || 0) : 0;

  let irony = "Es una excelente elección para el alma.";
  if (count > 200) irony = "¿Acaso la escribiste tú?";
  if (count > 100) irony = "¡Pareciera que ya te la sabes de memoria!";
  if (count > 50) irony = "Una favorita indiscutible.";
  if (topPrayerId?.includes('rosario')) irony = "La Virgen debe estar sonriendo contigo.";
  if (topPrayerId?.includes('misa')) irony = "La fuente y culmen de tu vida cristiana.";

  if (!topPrayer) {
    // Fallback if absolutely no prayers have been opened (and not sections)
    return (
      <div className="text-center relative space-y-6">
        <h2 className="text-3xl font-bold">Tu viaje comienza hoy</h2>
         <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          transition={{ type: 'spring', delay: 0.3 }}
          className="text-8xl"
        >
          🙏
        </motion.div>
        <p className="mt-4 text-xl">Cada oración cuenta, empieza ahora.</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6 w-full max-w-sm relative">
      <motion.h2 
        initial={{ y: -20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        className="text-2xl font-bold opacity-80"
      >
        Tu refugio favorito fue...
      </motion.h2>

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white text-black p-8 rounded-2xl shadow-2xl rotate-1 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-amber-500" />
        <h3 className="text-3xl font-headline font-bold text-primary mb-2 line-clamp-2">{topPrayer.title}</h3>
        <div className="w-16 h-1 bg-primary/20 mx-auto my-4" />
        <p className="text-4xl font-black">{count}</p>
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Veces rezada</p>
      </motion.div>

      <motion.p 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-lg italic"
      >
        "{irony}"
      </motion.p>
    </div>
  );
}

function TotalPrayersSlide({ userStats }: { userStats: UserStats }) {
  return (
    <div className="text-center space-y-8 relative">
      <motion.h2 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="text-3xl font-bold"
      >
        Has elevado tu corazón al cielo
      </motion.h2>

      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50"
      >
        {userStats.totalPrayersOpened}
      </motion.div>

      <motion.h3 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-light uppercase tracking-[0.2em]"
      >
        Oraciones totales
      </motion.h3>
      
      <motion.p
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.8 }}
         className="text-sm opacity-70 max-w-xs mx-auto"
      >
          (Esto es la suma de todas las veces que abriste cualquier oración, lectura o devoción).
      </motion.p>
    </div>
  );
}

function TopDevotionSlide({ userStats, allPrayers }: { userStats: UserStats, allPrayers: any[] }) {
    const devotionStats = allPrayers
        .filter(p => p.categoryId === 'devociones')
        .map(d => ({
            id: d.id,
            title: d.title,
            days: userStats.prayerDaysCount?.[d.id] || 0
        }))
        .filter(d => d.days > 0)
        .sort((a, b) => b.days - a.days);

    const topDevotion = devotionStats[0];

    if (!topDevotion) return (
        <div className="text-center">
            <h2 className="text-2xl font-bold">Aún no tienes devociones registradas.</h2>
            <p className="opacity-70">¡Explora la sección de devociones!</p>
        </div>
    );

    const getIrony = (title: string, days: number) => {
        const t = title.toLowerCase();
        if (t.includes('agustín')) return "¿Seguro que no eres de la orden agustina?";
        if (t.includes('tomás') || t.includes('aquino')) return "La Suma Teológica te queda corta.";
        if (t.includes('francisco') && t.includes('sales')) return "La dulzura es tu camino.";
        if (t.includes('francisco') && !t.includes('sales')) return "Paz y Bien, hermano.";
        if (t.includes('maría') || t.includes('rosario') || t.includes('virgen')) return "Totus Tuus.";
        if (t.includes('josé')) return "Ite ad Ioseph.";
        if (t.includes('alberto') || t.includes('hurtado')) return "¿Contento, Señor, contento?";
        if (t.includes('benjamín')) return "El pequeño de la familia.";
        if (t.includes('carlo') || t.includes('acutis')) return "La Eucaristía es tu autopista.";
        if (t.includes('juan pablo')) return "¡No tengáis miedo!";
        if (t.includes('juan bautista')) return "Conviene que Él crezca.";
        if (t.includes('teresita') || t.includes('teresa')) return "Una lluvia de rosas ha caído sobre ti.";
        
        if (days > 300) return "¡Casi vives en el cielo!";
        if (days > 100) return "Una constancia admirable.";
        return "Una verdadera amistad espiritual.";
    };

    const irony = getIrony(topDevotion.title, topDevotion.days);

    return (
        <div className="text-center space-y-6 max-w-md w-full relative z-10">
            <motion.h2 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold"
            >
                Tu devoción inquebrantable
            </motion.h2>

            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white/10 p-6 rounded-2xl border border-white/20 backdrop-blur-md"
            >
                <h3 className="text-3xl font-headline font-bold text-yellow-400 mb-2 leading-tight">
                    {topDevotion.title}
                </h3>
                <p className="text-xl">
                    Pediste su intercesión <span className="font-bold text-5xl block my-4 text-white">{topDevotion.days}</span> días del año.
                </p>
                <div className="h-px w-full bg-white/20 my-4" />
                <p className="italic opacity-90 text-lg font-serif">"{irony}"</p>
            </motion.div>
            
            {/* Top 5 list */}
            {devotionStats.length > 1 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="w-full text-left space-y-2 mt-4"
                >
                    <p className="text-xs uppercase tracking-widest opacity-60 mb-2 text-center">Top 5 Devociones</p>
                    <div className="space-y-1">
                        {devotionStats.slice(1, 5).map((d, i) => (
                            <div key={d.id} className="flex justify-between items-center bg-black/20 p-2 px-4 rounded-lg text-sm">
                                <span className="truncate flex-1 mr-4">{i + 2}. {d.title}</span>
                                <span className="font-bold whitespace-nowrap opacity-80">{d.days} días</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

function MorningPrayersSlide({ userStats }: { userStats: UserStats }) {
    return (
        <div className="text-center space-y-6">
            <motion.div className="text-6xl">🌅</motion.div>
            <h2 className="text-3xl font-bold">Madrugador de Dios</h2>
            <div className="text-8xl font-black text-orange-300">{userStats.morningDaysCount}</div>
            <p className="text-xl">Días orando en la mañana</p>
            <p className="italic opacity-80">"A quien madruga, Dios le ayuda." (Literalmente).</p>
        </div>
    )
}

function NightPrayersSlide({ userStats }: { userStats: UserStats }) {
    return (
        <div className="text-center space-y-6">
             <motion.div className="text-6xl">🌙</motion.div>
            <h2 className="text-3xl font-bold">Vigilante nocturno</h2>
            <div className="text-8xl font-black text-blue-300">{userStats.nightDaysCount}</div>
            <p className="text-xl">Días orando en la noche</p>
            <p className="italic opacity-80">¿Insomnio o devoción? Esperemos que lo segundo.</p>
        </div>
    )
}

function AngelusSlide({ userStats }: { userStats: UserStats }) {
    return (
        <div className="text-center space-y-6">
             <motion.div className="text-6xl">🔔</motion.div>
            <h2 className="text-3xl font-bold">La hora del Ángel</h2>
            <div className="text-8xl font-black text-yellow-200">{userStats.angelusCount}</div>
            <p className="text-xl">Angelus / Regina Caeli</p>
            <p className="italic opacity-80">¡Puntualidad mariana!</p>
        </div>
    )
}

function RosarySlide({ userStats }: { userStats: UserStats }) {
    return (
        <div className="text-center space-y-6">
             <motion.div className="text-6xl">📿</motion.div>
            <h2 className="text-3xl font-bold">Amante del Rosario</h2>
            <div className="text-8xl font-black text-pink-300">{userStats.rosaryCount}</div>
            <p className="text-xl">Rosarios rezados</p>
            <p className="italic opacity-80">Un ramo de rosas inmenso para María.</p>
        </div>
    )
}

function ExaminationSlide({ userStats }: { userStats: UserStats }) {
    return (
        <div className="text-center space-y-6">
             <motion.div className="text-6xl">🕯️</motion.div>
            <h2 className="text-3xl font-bold">Conciencia limpia</h2>
            <div className="text-8xl font-black text-purple-300">{userStats.examinationCount}</div>
            <p className="text-xl">Exámenes de conciencia</p>
            <p className="italic opacity-80">El autoconocimiento es el principio de la sabiduría.</p>
        </div>
    )
}

function MassStreakSlide({ userStats }: { userStats: UserStats }) {
    return (
        <div className="text-center space-y-6 relative z-10 w-full max-w-sm">
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-6xl mb-4"
            >
                ⛪
            </motion.div>

            <motion.h2 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-bold font-headline"
            >
                Fiel al Encuentro
            </motion.h2>

            <div className="py-6 relative">
                 <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                    className="text-9xl font-black text-white relative z-10"
                 >
                    {userStats.massStreak}
                 </motion.div>
                 <motion.div 
                    className="absolute inset-0 border-4 border-white/10 rounded-full rotate-45"
                    animate={{ rotate: 405 }}
                    transition={{ duration: 20, ease: "linear", repeat: Infinity }}
                 />
            </div>

            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xl uppercase tracking-widest font-light"
            >
                Días seguidos en Misa
            </motion.p>

            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-sm opacity-80 italic max-w-xs mx-auto mt-4"
            >
                "La Eucaristía es mi autopista al Cielo."
                <br/><span className="text-xs not-italic opacity-60">- Beato Carlo Acutis</span>
            </motion.p>
        </div>
    );
}

function SaintQuotesSlide({ userStats }: { userStats: UserStats }) {
    let message = "Buscando sabiduría...";
    if (userStats.saintQuotesOpened > 50) message = "¡Sediento de santidad!";
    if (userStats.saintQuotesOpened > 200) message = "¡Un verdadero discípulo!";

    return (
        <div className="text-center space-y-6 relative z-10">
            <motion.h2 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-2xl font-bold"
            >
                Escuchando a los Santos
            </motion.h2>
             <div className="text-8xl font-black font-headline text-amber-200">
                {userStats.saintQuotesOpened}
            </div>
             <p className="text-xl uppercase tracking-widest">Frases consultadas</p>
             <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white/10 p-4 rounded-xl backdrop-blur-sm mt-4 border border-white/20"
            >
                 <p className="font-serif italic text-lg">"{message}"</p>
             </motion.div>
        </div>
    )
}

function CreationSlide({ userStats }: { userStats: UserStats }) {
  const totalCreated = userStats.lettersWritten + userStats.devotionsCreated + userStats.prayersCreated;

  // If we are here, it's either because we have creations OR showZeroStats is true.
  // We render regardless to avoid blank slide.

  return (
    <div className="grid gap-6 w-full max-w-sm">
      <motion.h2 
        initial={{ x: -20, opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }}
        className="text-3xl font-bold text-center mb-4"
      >
        {totalCreated > 0 ? "Tu alma creativa ha dejado huella" : "Tu alma creativa está despertando"}
      </motion.h2>

      <div className="space-y-4">
        {(userStats.lettersWritten > 0 || totalCreated === 0) && <StatRow label="Cartas escritas" count={userStats.lettersWritten} delay={0.2} icon="✉️" />}
        {(userStats.devotionsCreated > 0 || totalCreated === 0) && <StatRow label="Devociones creadas" count={userStats.devotionsCreated} delay={0.4} icon="🙏" />}
        {(userStats.prayersCreated > 0 || totalCreated === 0) && <StatRow label="Oraciones propias" count={userStats.prayersCreated} delay={0.6} icon="✍️" />}
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-center bg-white/10 p-4 rounded-xl backdrop-blur-md"
      >
        <p className="text-lg">Total de creaciones: <span className="font-bold">{totalCreated}</span></p>
      </motion.div>
    </div>
  );
}

function StatRow({ label, count, delay, icon }: { label: string, count: number, delay: number, icon: string }) {
  return (
    <motion.div 
      initial={{ x: 50, opacity: 0 }} 
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay }}
      className="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/5"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold">{count}</span>
    </motion.div>
  );
}

function ProsperoAnoSlide() {
    const year = new Date().getFullYear();
    const nextYear = year + 1;

    return (
        <div className="text-center space-y-8 relative z-10 max-w-md">
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 1.5 }}
                className="text-8xl"
            >
                🎉
            </motion.div>
            
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-bold font-headline leading-relaxed"
            >
                Cotidie te desea un próspero <span className="text-yellow-400 text-4xl block mt-2">{nextYear}</span> lleno de oración.
            </motion.h2>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-lg opacity-80"
            >
                Que cada día sea un nuevo encuentro con el Señor.
            </motion.p>
        </div>
    );
}

function OutroSlide() {
  return (
    <div className="text-center space-y-10 max-w-md relative z-20">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-yellow-500 blur-[100px] opacity-20 rounded-full" />
        <h1 className="relative text-5xl font-headline font-bold leading-tight">
          ¡El cielo es el límite!
        </h1>
      </motion.div>

      <motion.p 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.5 }}
        className="text-xl opacity-90"
      >
        Sigue caminando hacia la santidad.
        <br />
        Sirve al Señor, y sabrás reconocer sus recompensas.
      </motion.p>

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
           <Image src="/icons/icon-192x192.png" alt="Cotidie" fill className="object-cover" />
        </div>
        <div className="inline-block px-6 py-2 border border-white/30 rounded-full bg-white/10 backdrop-blur-md text-sm uppercase tracking-widest">
          Cotidie
        </div>
      </motion.div>
    </div>
  );
}
