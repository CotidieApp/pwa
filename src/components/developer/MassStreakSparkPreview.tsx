'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek, format, getDay, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import * as Icon from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = { onClose: () => void; year?: number };
type EventDay = {
  key: string;
  date: Date;
  streak: number;
  segmentLength: number;
  segmentId: number;
  segmentIndex: number;
  isSegmentStart: boolean;
  isSegmentEnd: boolean;
  nextGapDays: number;
  barrierKey: string | null;
};
type Simulation = { seed: number; year: number; events: EventDay[]; monthTotals: number[]; bestStreak: number };

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MIN_STEP_MS = 180;
const MAX_STEP_MS = 680;
const SINGLE_DAY_MS = 1100;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');
const fromDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function getMonthSundays(monthStart: Date) {
  return eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) }).filter((day) => getDay(day) === 0);
}

function generateSimulation(year: number, seed: number): Simulation {
  const rand = mulberry32(seed);
  const selected = new Set<string>();

  for (let month = 0; month < 12; month += 1) {
    const monthStart = new Date(year, month, 1);
    const sundays = getMonthSundays(monthStart);
    const target = month === 11 ? 2 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 2);
    const pool = [...sundays];
    for (let count = 0; count < Math.min(target, pool.length); count += 1) {
      const index = Math.floor(rand() * pool.length);
      selected.add(toDateKey(pool.splice(index, 1)[0]));
    }
  }

  const extraStreaks = 7 + Math.floor(rand() * 4);
  for (let index = 0; index < extraStreaks; index += 1) {
    const month = Math.floor(rand() * 12);
    const monthEnd = endOfMonth(new Date(year, month, 1));
    const startDay = 1 + Math.floor(rand() * Math.max(1, monthEnd.getDate() - 7));
    const length = 1 + Math.floor(rand() * 5) + (index % 3 === 0 ? 2 : 0);
    const start = new Date(year, month, startDay);
    for (let offset = 0; offset < length; offset += 1) {
      const date = addDays(start, offset);
      if (date.getFullYear() === year) selected.add(toDateKey(date));
    }
  }

  for (let month = 0; month < 12; month += 1) {
    const hasMonth = Array.from(selected).some((key) => fromDateKey(key).getMonth() === month);
    if (hasMonth) continue;
    const sundays = getMonthSundays(new Date(year, month, 1));
    const fallback = sundays[0] ?? new Date(year, month, 1);
    selected.add(toDateKey(fallback));
  }

  const orderedDates = Array.from(selected).sort().map(fromDateKey);
  const segments: Date[][] = [];
  for (const date of orderedDates) {
    const segment = segments[segments.length - 1];
    const previous = segment?.[segment.length - 1];
    if (segment && previous && differenceInCalendarDays(date, previous) === 1) {
      segment.push(date);
    } else {
      segments.push([date]);
    }
  }

  let bestStreak = 0;
  const events = segments.flatMap((segment, segmentId) =>
    segment.map((date, segmentIndex) => {
      const streak = segmentIndex + 1;
      bestStreak = Math.max(bestStreak, streak);
      const isSegmentEnd = segmentIndex === segment.length - 1;
      const nextSegment = segments[segmentId + 1];
      const nextGapDays = isSegmentEnd && nextSegment ? differenceInCalendarDays(nextSegment[0], date) - 1 : 0;
      return {
        key: toDateKey(date),
        date,
        streak,
        segmentLength: segment.length,
        segmentId,
        segmentIndex,
        isSegmentStart: segmentIndex === 0,
        isSegmentEnd,
        nextGapDays,
        barrierKey: nextGapDays > 0 ? toDateKey(addDays(date, 1)) : null,
      };
    }),
  );

  return {
    seed,
    year,
    events,
    monthTotals: Array.from({ length: 12 }, (_, month) => events.filter((event) => event.date.getMonth() === month).length),
    bestStreak,
  };
}

function getStepDelay(nextEvent: EventDay, previousEvent: EventDay | null) {
  let delay =
    nextEvent.segmentLength === 1
      ? SINGLE_DAY_MS
      : clamp(MAX_STEP_MS - nextEvent.segmentIndex * 110 - (nextEvent.streak - 1) * 20, MIN_STEP_MS, MAX_STEP_MS);

  if (previousEvent && previousEvent.segmentId !== nextEvent.segmentId) delay += 480;
  if (previousEvent && previousEvent.date.getMonth() !== nextEvent.date.getMonth()) delay += 620;
  return delay;
}

function FireFx({ slow, igniting }: { slow: boolean; igniting?: boolean }) {
  const duration = slow ? 1.35 : 0.8;
  return (
    <>
      {igniting && (
        <motion.span
          className="absolute inset-[2%] rounded-[22px] bg-orange-400/20 blur-xl"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.9, 0.18], scale: [0.8, 1.08, 1] }}
          transition={{ duration: slow ? 1.2 : 0.8, ease: 'easeOut' }}
        />
      )}
      <motion.span
        className="absolute inset-[10%] rounded-full bg-amber-200/40 blur-2xl"
        animate={{ opacity: [0.3, 0.95, 0.36], scale: [0.85, 1.16, 0.94] }}
        transition={{ duration: duration * 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute left-1/2 top-[18%] h-[56%] w-[34%] -translate-x-1/2 rounded-[55%_55%_40%_40%/72%_72%_22%_22%] bg-gradient-to-t from-orange-700 via-orange-400 to-yellow-100"
        animate={{ scaleY: [0.9, 1.13, 0.95], y: [0, -4, -1], scaleX: [0.95, 1.04, 0.96] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute left-[43%] top-[28%] h-[42%] w-[20%] rounded-[60%_60%_40%_40%/80%_80%_26%_26%] bg-gradient-to-t from-amber-400 via-yellow-100 to-white"
        animate={{ scaleY: [0.84, 1.08, 0.92], x: [-1, 1, -1], y: [0, -3, -1] }}
        transition={{ duration: duration * 0.85, repeat: Infinity, ease: 'easeInOut' }}
      />
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="absolute bottom-[28%] left-1/2 size-1.5 rounded-full bg-amber-100"
          animate={{ x: [0, index === 1 ? -12 : 10, index === 1 ? -18 : 16], y: [0, -12, -24], opacity: [0, 1, 0] }}
          transition={{ duration: slow ? 1.45 : 1, repeat: Infinity, delay: index * 0.18, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

function BarrierFx() {
  return (
    <>
      <div className="absolute inset-[14%] rounded-[18px] border border-stone-500/65 bg-[linear-gradient(180deg,rgba(120,113,108,0.96),rgba(68,64,60,0.96))]" />
      <div className="absolute inset-x-[22%] top-[30%] h-[6%] bg-stone-300/28" />
      <div className="absolute inset-x-[16%] top-[46%] h-[6%] bg-stone-300/24" />
      <div className="absolute inset-x-[24%] top-[62%] h-[6%] bg-stone-300/20" />
      <motion.div
        className="absolute inset-[8%] rounded-[20px] border border-orange-300/35 bg-orange-400/10 blur-[2px]"
        animate={{ opacity: [0.18, 0.85, 0.2], scale: [0.95, 1.04, 0.97] }}
        transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}
      />
    </>
  );
}

export default function MassStreakSparkPreview({ onClose, year = new Date().getFullYear() }: Props) {
  const [seed, setSeed] = useState(() => Date.now());
  const [revealedCount, setRevealedCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const simulation = useMemo(() => generateSimulation(year, seed), [seed, year]);
  const revealedEvents = useMemo(() => simulation.events.slice(0, revealedCount), [simulation.events, revealedCount]);
  const revealedKeys = useMemo(() => new Set(revealedEvents.map((event) => event.key)), [revealedEvents]);
  const activeEvent =
    simulation.events[Math.max(0, Math.min(revealedCount - 1, simulation.events.length - 1))] ?? simulation.events[0] ?? null;
  const currentMonthDate = activeEvent?.date ?? simulation.events[0]?.date ?? new Date(simulation.year, 0, 1);
  const currentMonth = currentMonthDate.getMonth();
  const monthGrid = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonthDate), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentMonthDate), { weekStartsOn: 1 }),
      }),
    [currentMonthDate],
  );
  const cellIndexByKey = useMemo(() => new Map(monthGrid.map((day, index) => [toDateKey(day), index])), [monthGrid]);
  const currentLabel = titleCase(format(currentMonthDate, 'LLLL yyyy', { locale: es }));
  const completion = simulation.events.length === 0 ? 0 : Math.round((revealedCount / simulation.events.length) * 100);
  const isComplete = revealedCount >= simulation.events.length;
  const currentDelay = activeEvent ? getStepDelay(activeEvent, revealedCount > 1 ? simulation.events[revealedCount - 2] : null) : 0;
  const currentMood =
    activeEvent?.segmentLength === 1
      ? 'Fue solo un día: el fuego avanza más lento.'
      : activeEvent?.isSegmentEnd && activeEvent.nextGapDays > 0
        ? `La racha choca con un muro de ${activeEvent.nextGapDays} día${activeEvent.nextGapDays === 1 ? '' : 's'} sin Misa.`
        : activeEvent?.isSegmentStart && activeEvent.segmentId > 0
          ? 'La llama vuelve a encenderse al comenzar una nueva racha.'
          : 'El fuego corre por la racha y acelera.';

  useEffect(() => {
    setRevealedCount(0);
    setIsPlaying(true);
  }, [simulation]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!isPlaying || isComplete || simulation.events.length === 0) return;
    const nextEvent = simulation.events[revealedCount];
    const previousEvent = revealedCount > 0 ? simulation.events[revealedCount - 1] : null;
    const timeoutId = window.setTimeout(
      () => setRevealedCount((value) => Math.min(value + 1, simulation.events.length)),
      getStepDelay(nextEvent, previousEvent),
    );
    return () => window.clearTimeout(timeoutId);
  }, [isComplete, isPlaying, revealedCount, simulation.events]);

  const activeBarrierKey =
    activeEvent?.isSegmentEnd && activeEvent.barrierKey && cellIndexByKey.has(activeEvent.barrierKey) ? activeEvent.barrierKey : null;

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-slate-950 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_34%),radial-gradient(circle_at_18%_80%,rgba(249,115,22,0.16),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_42%,#020617_100%)]" />

      <div className="relative flex h-full flex-col">
        <header className="border-b border-white/10 px-4 py-4 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/20 bg-orange-200/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-orange-100/90">
                <Icon.FlaskConical className="size-3.5" />
                Vista previa de desarrollador
              </div>
              <h1 className="mt-3 font-headline text-2xl font-semibold text-white md:text-3xl">Annuum: fuego de rachas de Misa</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-300">Fuego por rachas, pausa en huecos y cambio de mes como página.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setSeed((value) => value + 1)} className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white">
                <Icon.Shuffle className="mr-2 size-4" />
                Regenerar
              </Button>
              <Button variant="outline" onClick={() => { setRevealedCount(0); setIsPlaying(true); }} className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white">
                <Icon.RotateCcw className="mr-2 size-4" />
                Reiniciar
              </Button>
              <Button variant="outline" onClick={() => setIsPlaying((value) => !value)} className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white">
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
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.42fr)_360px]">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_28px_120px_rgba(2,6,23,0.45)] backdrop-blur md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Calendario en combustión</div>
                  <h2 className="mt-2 text-3xl font-semibold text-white">{currentLabel}</h2>
                  <p className="mt-1 text-sm text-slate-300">{currentMood}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricPill label="Días" value={`${revealedCount}`} icon={Icon.CalendarCheck2} />
                  <MetricPill label="Racha" value={`${activeEvent?.streak ?? 0}`} icon={Icon.Flame} />
                  <MetricPill label="Paso" value={`${currentDelay} ms`} icon={Icon.TimerReset} />
                  <MetricPill label="Avance" value={`${completion}%`} icon={Icon.Activity} />
                </div>
              </div>

              <div className="mt-6" style={{ perspective: 2200 }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={format(currentMonthDate, 'yyyy-MM')}
                    initial={{ opacity: 0.16, rotateY: -82, x: 72, scale: 0.98 }}
                    animate={{ opacity: 1, rotateY: 0, x: 0, scale: 1 }}
                    exit={{ opacity: 0.12, rotateY: 74, x: -64, scale: 0.985 }}
                    transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transformStyle: 'preserve-3d', transformOrigin: 'left center' }}
                    className="rounded-[30px] border border-stone-300/40 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,247,237,0.92)_22%,rgba(254,243,199,0.88)_100%)] p-4 shadow-[0_36px_80px_rgba(15,23,42,0.34)] md:p-5"
                  >
                    <div className="mb-4 flex items-center justify-between rounded-2xl border border-stone-300/60 bg-white/45 px-4 py-3 text-stone-800">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Mes</div>
                        <div className="text-2xl font-semibold">{currentLabel}</div>
                      </div>
                      <div className="rounded-full border border-stone-300/70 bg-stone-100/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-stone-600">
                        {activeEvent ? format(activeEvent.date, "d 'de' LLLL", { locale: es }) : 'Preparando'}
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 pb-2">
                      {WEEKDAY_LABELS.map((label) => (
                        <div key={label} className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                          {label}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {monthGrid.map((day, index) => {
                        const key = toDateKey(day);
                        const outside = day.getMonth() !== currentMonth;
                        const visited = revealedKeys.has(key);
                        const active = activeEvent?.key === key && revealedCount > 0 && !isComplete;
                        const barrier = activeBarrierKey === key;
                        const prevKey = toDateKey(addDays(day, -1));
                        const prevIndex = cellIndexByKey.get(prevKey);
                        const row = Math.floor(index / 7);
                        const prevDirection = prevIndex != null && revealedKeys.has(prevKey) ? (Math.floor(prevIndex / 7) === row ? 'left' : 'top') : null;

                        return (
                          <div key={key} className="relative aspect-square">
                            {prevDirection && <Connector direction={prevDirection} />}

                            <div
                              className={cn(
                                'absolute inset-0 rounded-[18px] border transition-all',
                                outside && 'border-transparent bg-transparent text-stone-300/60',
                                !outside && 'border-stone-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(245,245,244,0.7))] text-stone-700',
                                visited && 'border-orange-950/55 bg-[linear-gradient(180deg,rgba(23,10,6,0.96),rgba(58,23,12,0.96)_55%,rgba(108,34,14,0.96))] text-amber-50 shadow-[0_12px_30px_rgba(124,45,18,0.24)]',
                                active && 'border-amber-200/90 bg-[linear-gradient(180deg,rgba(35,12,6,0.96),rgba(79,27,13,0.98)_56%,rgba(139,45,12,0.98))] text-white shadow-[0_0_44px_rgba(249,115,22,0.34)]',
                              )}
                            >
                              {!outside && (
                                <>
                                  {visited && !active && <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(251,191,36,0.42),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%,rgba(0,0,0,0.24))]" />}
                                  {active && <FireFx slow={activeEvent?.segmentLength === 1} igniting={activeEvent?.isSegmentStart} />}
                                  {barrier && <BarrierFx />}
                                  <span className={cn('absolute left-2 top-2 z-10 text-sm font-semibold', visited || active ? 'text-white' : 'text-stone-700')}>
                                    {format(day, 'd')}
                                  </span>
                                  {visited && !active && (
                                    <motion.span
                                      className="absolute bottom-2 right-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200/35 bg-emerald-400/18 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.24)]"
                                      initial={{ scale: 0.7, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ duration: 0.24, ease: 'easeOut' }}
                                    >
                                      <Icon.Check className="size-3.5" />
                                    </motion.span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </section>

            <aside className="space-y-4">
              <Panel title="Lectura del fuego">
                <StatRow label="Fecha simulada" value={activeEvent ? format(activeEvent.date, "d 'de' LLLL", { locale: es }) : 'Preparando'} icon={Icon.CalendarDays} />
                <StatRow label="Mejor racha" value={`${simulation.bestStreak} días`} icon={Icon.Trophy} />
                <StatRow label="Misas simuladas" value={`${simulation.events.length}`} icon={Icon.Church} />
                <div className="mt-4 rounded-2xl border border-orange-200/15 bg-orange-200/[0.06] p-4 text-sm text-orange-50/90">
                  {isComplete ? 'La animación ya recorrió los doce meses del año simulado.' : currentMood}
                </div>
              </Panel>

              <Panel title="Paso por meses">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Array.from({ length: 12 }, (_, month) => {
                    const total = simulation.monthTotals[month];
                    const completed = revealedEvents.filter((event) => event.date.getMonth() === month).length;
                    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
                    const label = titleCase(format(new Date(simulation.year, month, 1), 'LLL', { locale: es }));
                    return (
                      <div key={label} className={cn('rounded-2xl border px-3 py-3', month === currentMonth ? 'border-orange-300/60 bg-orange-200/10' : 'border-white/10 bg-white/[0.03]')}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-100">{label}</span>
                          <span className="text-[11px] text-slate-400">{completed}/{total}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                          <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-100 via-orange-400 to-red-500" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function Connector({ direction, emphasized }: { direction: 'left' | 'top' | 'right' | 'bottom'; emphasized?: boolean }) {
  const classes: Record<string, string> = {
    left: 'left-[-18%] top-1/2 h-2.5 w-[36%] -translate-y-1/2 bg-gradient-to-r from-transparent via-orange-500/70 to-amber-200/80',
    right: 'right-[-18%] top-1/2 h-2.5 w-[36%] -translate-y-1/2 bg-gradient-to-l from-transparent via-orange-500/70 to-amber-200/80',
    top: 'left-1/2 top-[-18%] h-[36%] w-2.5 -translate-x-1/2 bg-gradient-to-b from-transparent via-orange-500/70 to-amber-200/80',
    bottom: 'left-1/2 bottom-[-18%] h-[36%] w-2.5 -translate-x-1/2 bg-gradient-to-t from-transparent via-orange-500/70 to-amber-200/80',
  };
  return (
    <motion.div
      className={cn('pointer-events-none absolute rounded-full blur-[3px]', classes[direction], emphasized && 'blur-[4px]')}
      animate={{ opacity: emphasized ? [0.45, 1, 0.4] : [0.26, 0.7, 0.24], scale: emphasized ? [0.95, 1.08, 0.98] : [0.94, 1.02, 0.95] }}
      transition={{ duration: emphasized ? 0.75 : 1.1, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function MetricPill({ label, value, icon: IconComponent }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{title}</div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function StatRow({ label, value, icon: IconComponent }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-slate-950/45 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
          <IconComponent className="size-4 text-orange-200" />
        </div>
        <span className="min-w-0 text-sm text-slate-300">{label}</span>
      </div>
      <span className="shrink-0 text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
