'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek, format, getDay, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import * as Icon from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MassStreakSparkPreviewProps = {
  onClose: () => void;
  year?: number;
};

type SimulatedMassEvent = {
  key: string;
  date: Date;
  streak: number;
  acceleration: number;
};

type Simulation = {
  seed: number;
  year: number;
  events: SimulatedMassEvent[];
  monthTotals: number[];
  bestStreak: number;
};

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MIN_STEP_MS = 120;
const MAX_STEP_MS = 480;

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function pickRandomValues<T>(values: T[], count: number, rand: () => number) {
  const pool = [...values];
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    const index = Math.floor(rand() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

function getMonthSundays(monthStart: Date) {
  return eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) }).filter((day) => getDay(day) === 0);
}

function addDatesToSelection(target: Set<string>, dates: Date[], year: number) {
  for (const date of dates) {
    if (date.getFullYear() === year) {
      target.add(toDateKey(date));
    }
  }
}

function generateMassSimulation(year: number, seed: number): Simulation {
  const rand = mulberry32(seed);
  const selectedKeys = new Set<string>();

  for (let month = 0; month < 12; month += 1) {
    const monthStart = new Date(year, month, 1);
    const sundays = getMonthSundays(monthStart);
    const sundayTarget = month === 11 ? 2 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 2);
    addDatesToSelection(selectedKeys, pickRandomValues(sundays, Math.min(sundayTarget, sundays.length), rand), year);
  }

  const streakWindows = 6 + Math.floor(rand() * 4);
  for (let index = 0; index < streakWindows; index += 1) {
    const month = Math.floor(rand() * 12);
    const monthEnd = endOfMonth(new Date(year, month, 1));
    const safeWindow = Math.max(1, monthEnd.getDate() - 6);
    const startDay = 1 + Math.floor(rand() * safeWindow);
    const streakLength = 2 + Math.floor(rand() * 4) + (index % 3 === 0 ? 2 : 0);
    const streakStart = new Date(year, month, startDay);
    addDatesToSelection(
      selectedKeys,
      Array.from({ length: streakLength }, (_, offset) => addDays(streakStart, offset)),
      year,
    );
  }

  for (let month = 0; month < 12; month += 1) {
    const hasMonthEvent = Array.from(selectedKeys).some((key) => fromDateKey(key).getMonth() === month);
    if (hasMonthEvent) continue;

    const monthStart = new Date(year, month, 1);
    const sundays = getMonthSundays(monthStart);
    const fallbackSunday = sundays[Math.floor(rand() * Math.max(1, sundays.length))];
    selectedKeys.add(toDateKey(fallbackSunday ?? new Date(year, month, 1 + Math.floor(rand() * endOfMonth(monthStart).getDate()))));
  }

  const orderedDates = Array.from(selectedKeys).sort().map(fromDateKey);
  let bestStreak = 0;
  let currentStreak = 0;
  let previousDate: Date | null = null;

  const events = orderedDates.map((date) => {
    currentStreak = previousDate && differenceInCalendarDays(date, previousDate) === 1 ? currentStreak + 1 : 1;
    bestStreak = Math.max(bestStreak, currentStreak);
    previousDate = date;

    return {
      key: toDateKey(date),
      date,
      streak: currentStreak,
      acceleration: clamp(1 + (currentStreak - 1) * 0.17, 1, 2.85),
    };
  });

  const monthTotals = Array.from({ length: 12 }, (_, month) => events.filter((event) => event.date.getMonth() === month).length);

  return {
    seed,
    year,
    events,
    monthTotals,
    bestStreak,
  };
}

function buildMonthGrid(monthDate: Date) {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 }),
  });
}

function MonthProgressRail({
  simulation,
  revealedCount,
  activeMonth,
}: {
  simulation: Simulation;
  revealedCount: number;
  activeMonth: number;
}) {
  const revealedEvents = simulation.events.slice(0, revealedCount);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Array.from({ length: 12 }, (_, month) => {
        const total = simulation.monthTotals[month];
        const completed = revealedEvents.filter((event) => event.date.getMonth() === month).length;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
        const label = titleCase(format(new Date(simulation.year, month, 1), 'LLL', { locale: es }));
        const isActive = activeMonth === month;

        return (
          <div
            key={label}
            className={cn(
              'rounded-2xl border px-3 py-3 transition-colors',
              isActive
                ? 'border-amber-300/60 bg-amber-200/10 shadow-[0_0_30px_rgba(245,158,11,0.14)]'
                : 'border-white/8 bg-white/[0.04]',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-100">{label}</span>
              <span className="text-[11px] text-slate-400">{completed}/{total}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-200 via-orange-400 to-orange-600"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MassStreakSparkPreview({ onClose, year = new Date().getFullYear() }: MassStreakSparkPreviewProps) {
  const [seed, setSeed] = useState(() => Date.now());
  const [revealedCount, setRevealedCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const simulation = useMemo(() => generateMassSimulation(year, seed), [seed, year]);
  const revealedEvents = useMemo(() => simulation.events.slice(0, revealedCount), [simulation.events, revealedCount]);
  const revealedKeys = useMemo(() => new Set(revealedEvents.map((event) => event.key)), [revealedEvents]);
  const allEventKeys = useMemo(() => new Set(simulation.events.map((event) => event.key)), [simulation.events]);

  const activeEvent =
    simulation.events[Math.max(0, Math.min(revealedCount - 1, simulation.events.length - 1))] ?? simulation.events[0] ?? null;
  const currentMonthDate = activeEvent?.date ?? new Date(simulation.year, 0, 1);
  const currentMonth = currentMonthDate.getMonth();
  const monthGrid = useMemo(() => buildMonthGrid(currentMonthDate), [currentMonthDate]);
  const currentMonthLabel = titleCase(format(currentMonthDate, 'LLLL yyyy', { locale: es }));
  const currentSpeed = activeEvent?.acceleration ?? 1;
  const currentStreak = activeEvent?.streak ?? 0;
  const completion = simulation.events.length === 0 ? 0 : Math.round((revealedCount / simulation.events.length) * 100);
  const isComplete = revealedCount >= simulation.events.length;
  const currentStepDelay = activeEvent ? clamp(MAX_STEP_MS - (activeEvent.streak - 1) * 38, MIN_STEP_MS, MAX_STEP_MS) : MAX_STEP_MS;

  useEffect(() => {
    setRevealedCount(0);
    setIsPlaying(true);
  }, [simulation]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!isPlaying || isComplete || simulation.events.length === 0) return;

    const nextEvent = simulation.events[revealedCount];
    const previousEvent = revealedCount > 0 ? simulation.events[revealedCount - 1] : null;
    const monthChangeDelay = previousEvent && previousEvent.date.getMonth() !== nextEvent.date.getMonth() ? 240 : 0;
    const delay = clamp(MAX_STEP_MS - (nextEvent.streak - 1) * 38, MIN_STEP_MS, MAX_STEP_MS) + monthChangeDelay;

    const timeoutId = window.setTimeout(() => {
      setRevealedCount((value) => Math.min(value + 1, simulation.events.length));
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [isComplete, isPlaying, revealedCount, simulation.events]);

  const handleReplay = () => {
    setRevealedCount(0);
    setIsPlaying(true);
  };

  const handleRegenerate = () => {
    setSeed(Date.now());
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-slate-950 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_38%),radial-gradient(circle_at_20%_80%,rgba(249,115,22,0.16),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_45%,#020617_100%)]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-amber-300/10 to-transparent blur-3xl" />

      <div className="relative flex h-full flex-col">
        <header className="border-b border-white/10 px-4 py-4 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-amber-100/90">
                <Icon.FlaskConical className="size-3.5" />
                Vista previa de desarrollador
              </div>
              <div>
                <h1 className="font-headline text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  Annuum: racha de Misa con chispa
                </h1>
                <p className="mt-1 max-w-3xl text-sm text-slate-300">
                  Simulación anual aleatoria para revisar la animación antes de integrarla al flujo final. No altera
                  estadísticas, fechas ni datos reales.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={handleRegenerate}
                className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
              >
                <Icon.Shuffle className="mr-2 size-4" />
                Regenerar
              </Button>
              <Button
                variant="outline"
                onClick={handleReplay}
                className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
              >
                <Icon.RotateCcw className="mr-2 size-4" />
                Reiniciar
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsPlaying((value) => !value)}
                className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
              >
                {isPlaying ? <Icon.Pause className="mr-2 size-4" /> : <Icon.Play className="mr-2 size-4" />}
                {isPlaying ? 'Pausar' : 'Continuar'}
              </Button>
              <Button onClick={onClose} className="bg-white text-slate-950 hover:bg-slate-200">
                <Icon.X className="mr-2 size-4" />
                Cerrar
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-4 py-6 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.4fr)_360px]">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_28px_120px_rgba(2,6,23,0.45)] backdrop-blur md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Recorrido anual</div>
                  <h2 className="mt-2 text-3xl font-semibold text-white">{currentMonthLabel}</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    La chispa avanza por las asistencias simuladas y acelera cuando la racha se sostiene.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricPill label="Días quemados" value={`${revealedCount}`} icon={Icon.CalendarCheck2} />
                  <MetricPill label="Racha actual" value={`${currentStreak}`} icon={Icon.Flame} />
                  <MetricPill label="Velocidad" value={`${currentSpeed.toFixed(2)}x`} icon={Icon.Gauge} />
                  <MetricPill label="Avance" value={`${completion}%`} icon={Icon.Activity} />
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/55 p-4 md:p-5">
                <div className="grid grid-cols-7 gap-2">
                  {WEEKDAY_LABELS.map((label) => (
                    <div key={label} className="pb-2 text-center text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                      {label}
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={format(currentMonthDate, 'yyyy-MM')}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -24 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="grid grid-cols-7 gap-2"
                  >
                    {monthGrid.map((day) => {
                      const key = toDateKey(day);
                      const isOutsideMonth = day.getMonth() !== currentMonth;
                      const isVisited = revealedKeys.has(key);
                      const isMassDay = allEventKeys.has(key);
                      const isActive = activeEvent?.key === key && revealedCount > 0 && !isComplete;
                      const isFutureMassDay = isMassDay && !isVisited;

                      return (
                        <div
                          key={key}
                          className={cn(
                            'relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border text-sm font-semibold transition-all',
                            isOutsideMonth && 'border-transparent bg-transparent text-slate-700',
                            !isOutsideMonth && !isMassDay && 'border-white/6 bg-white/[0.03] text-slate-300',
                            isFutureMassDay && 'border-amber-200/20 bg-amber-200/[0.06] text-amber-100',
                            isVisited && 'border-orange-300/25 bg-gradient-to-br from-amber-100 via-amber-400 to-orange-700 text-slate-950 shadow-[0_0_30px_rgba(251,146,60,0.22)]',
                            isActive && 'border-amber-100/60 text-white shadow-[0_0_42px_rgba(251,191,36,0.52)]',
                          )}
                        >
                          {!isOutsideMonth && (
                            <>
                              {isFutureMassDay && !isActive && (
                                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-200/70" />
                              )}

                              {isVisited && !isActive && (
                                <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_38%,rgba(124,45,18,0.26))]" />
                              )}

                              {isActive && (
                                <>
                                  <motion.span
                                    className="absolute inset-[-16%] rounded-full bg-amber-100/40 blur-2xl"
                                    animate={{ scale: [0.85, 1.15, 0.92], opacity: [0.3, 0.9, 0.45] }}
                                    transition={{ duration: 1.15, repeat: Infinity, ease: 'easeInOut' }}
                                  />
                                  <motion.span
                                    className="absolute inset-[18%] rounded-full bg-gradient-to-br from-yellow-100 via-amber-300 to-orange-500"
                                    animate={{ scale: [0.96, 1.05, 0.98], rotate: [-4, 4, -2] }}
                                    transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
                                  />
                                  <motion.span
                                    className="absolute -right-1 top-1/2 h-10 w-6 -translate-y-1/2 rounded-full bg-orange-500/45 blur-md"
                                    animate={{ x: [0, 6, 0], opacity: [0.35, 0.8, 0.32], scaleY: [0.75, 1.3, 0.78] }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                                  />
                                </>
                              )}

                              <span className={cn('relative z-10', isActive && 'drop-shadow-[0_1px_8px_rgba(255,255,255,0.45)]')}>
                                {format(day, 'd')}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Lectura de la simulación</div>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      {isComplete ? 'Recorrido completado' : 'Chispa en movimiento'}
                    </h3>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                    Semilla {simulation.seed}
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <StatRow
                    label="Fecha simulada"
                    value={activeEvent ? format(activeEvent.date, "d 'de' LLLL", { locale: es }) : 'Preparando'}
                    icon={Icon.CalendarDays}
                  />
                  <StatRow label="Mejor racha del recorrido" value={`${simulation.bestStreak} días`} icon={Icon.Trophy} />
                  <StatRow label="Total de Misas simuladas" value={`${simulation.events.length}`} icon={Icon.Church} />
                  <StatRow
                    label="Ritmo actual"
                    value={`${currentStepDelay} ms por salto`}
                    icon={Icon.TimerReset}
                  />
                </div>

                <div className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-200/[0.05] p-4 text-sm text-amber-50/90">
                  {isComplete
                    ? 'La animación ya recorrió los doce meses con un patrón aleatorio de asistencia y sus rachas.'
                    : 'El motor acelera en los tramos consecutivos y desacelera al cambiar de mes para que el paso siga siendo legible.'}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Paso por meses</div>
                    <h3 className="mt-2 text-xl font-semibold text-white">Vista de fin de año</h3>
                  </div>
                  <Icon.Sparkles className="size-5 text-amber-300" />
                </div>
                <div className="mt-4">
                  <MonthProgressRail simulation={simulation} revealedCount={revealedCount} activeMonth={currentMonth} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  icon: IconComponent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">
        <IconComponent className="size-3.5" />
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function StatRow({
  label,
  value,
  icon: IconComponent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-slate-950/45 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
          <IconComponent className="size-4 text-amber-200" />
        </div>
        <span className="min-w-0 text-sm text-slate-300">{label}</span>
      </div>
      <span className="shrink-0 text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
