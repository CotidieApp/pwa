export type FixedDateKind = 'daily' | 'monthly' | 'yearly' | 'once' | 'relative-monthly';

export type RelativeMonthlySpec = {
  weekday: number;
  ordinal: '1' | '2' | '3' | '4' | 'u';
  hours: number;
  minutes: number;
};

export type ParsedFixedDate = {
  kind: FixedDateKind;
  date: Date;
  relative?: RelativeMonthlySpec;
};

const daysInMonth = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0).getDate();

const addMonthsClamped = (date: Date, months: number) => {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const maxDay = daysInMonth(targetYear, targetMonth);
  const day = Math.min(date.getDate(), maxDay);
  return new Date(
    targetYear,
    targetMonth,
    day,
    date.getHours(),
    date.getMinutes(),
    0,
    0
  );
};

const addYearsClamped = (date: Date, years: number) => {
  const targetYear = date.getFullYear() + years;
  const maxDay = daysInMonth(targetYear, date.getMonth());
  const day = Math.min(date.getDate(), maxDay);
  return new Date(
    targetYear,
    date.getMonth(),
    day,
    date.getHours(),
    date.getMinutes(),
    0,
    0
  );
};

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const weekdayByLetter: Record<string, number> = {
  d: 0,
  l: 1,
  m: 2,
  w: 3,
  j: 4,
  v: 5,
  s: 6,
};

const getNthWeekdayOfMonth = (year: number, monthIndex: number, weekday: number, nth: number) => {
  const first = new Date(year, monthIndex, 1);
  const firstDow = first.getDay();
  const delta = (weekday - firstDow + 7) % 7;
  const day = 1 + delta + (nth - 1) * 7;
  return new Date(year, monthIndex, day);
};

const getLastWeekdayOfMonth = (year: number, monthIndex: number, weekday: number) => {
  const lastDay = new Date(year, monthIndex + 1, 0);
  const lastDow = lastDay.getDay();
  const delta = (lastDow - weekday + 7) % 7;
  const day = lastDay.getDate() - delta;
  return new Date(year, monthIndex, day);
};

const buildRelativeMonthlyDate = (
  year: number,
  monthIndex: number,
  spec: RelativeMonthlySpec
) => {
  const candidate =
    spec.ordinal === 'u'
      ? getLastWeekdayOfMonth(year, monthIndex, spec.weekday)
      : getNthWeekdayOfMonth(year, monthIndex, spec.weekday, Number(spec.ordinal));
  candidate.setHours(spec.hours, spec.minutes, 0, 0);
  return candidate;
};

export const parseFixedNotificationDate = (value: string, now: Date): ParsedFixedDate | null => {
  const full = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (full) {
    const [, dd, mm, yyyy, hh, min] = full;
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);
    const hours = Number(hh);
    const minutes = Number(min);
    if (![day, month, year, hours, minutes].every(Number.isFinite)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    const maxDay = daysInMonth(year, month - 1);
    if (day > maxDay) return null;
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return Number.isNaN(date.getTime()) ? null : { kind: 'once', date };
  }

  const dayMonth = value.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (dayMonth) {
    const [, dd, mm, hh, min] = dayMonth;
    const day = Number(dd);
    const month = Number(mm);
    const hours = Number(hh);
    const minutes = Number(min);
    if (![day, month, hours, minutes].every(Number.isFinite)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    const year = now.getFullYear();
    const maxDay = daysInMonth(year, month - 1);
    const clampedDay = Math.min(day, maxDay);
    const date = new Date(year, month - 1, clampedDay, hours, minutes, 0, 0);
    return Number.isNaN(date.getTime()) ? null : { kind: 'yearly', date };
  }

  const dayOnly = value.match(/^(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (dayOnly) {
    const [, dd, hh, min] = dayOnly;
    const day = Number(dd);
    const hours = Number(hh);
    const minutes = Number(min);
    if (![day, hours, minutes].every(Number.isFinite)) return null;
    if (day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const maxDay = daysInMonth(year, monthIndex);
    const clampedDay = Math.min(day, maxDay);
    const date = new Date(year, monthIndex, clampedDay, hours, minutes, 0, 0);
    return Number.isNaN(date.getTime()) ? null : { kind: 'monthly', date };
  }

  const relative = value.match(/^([lmwjvsd])([1234u])\s+(\d{1,2}):(\d{2})$/i);
  if (relative) {
    const [, letter, ordinal, hh, min] = relative;
    const weekday = weekdayByLetter[String(letter).toLowerCase()];
    const hours = Number(hh);
    const minutes = Number(min);
    if (typeof weekday !== 'number') return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    const spec: RelativeMonthlySpec = {
      weekday,
      ordinal: ordinal.toLowerCase() as RelativeMonthlySpec['ordinal'],
      hours,
      minutes,
    };
    const date = buildRelativeMonthlyDate(now.getFullYear(), now.getMonth(), spec);
    return Number.isNaN(date.getTime())
      ? null
      : { kind: 'relative-monthly', date, relative: spec };
  }

  const timeOnly = value.match(/^(\d{1,2}):(\d{2})$/);
  if (timeOnly) {
    const [, hh, min] = timeOnly;
    const hours = Number(hh);
    const minutes = Number(min);
    if (![hours, minutes].every(Number.isFinite)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    return Number.isNaN(date.getTime()) ? null : { kind: 'daily', date };
  }

  return null;
};

export const addByKind = (date: Date, kind: FixedDateKind, relative?: RelativeMonthlySpec) => {
  switch (kind) {
    case 'daily':
      return addDays(date, 1);
    case 'monthly':
      return addMonthsClamped(date, 1);
    case 'yearly':
      return addYearsClamped(date, 1);
    case 'relative-monthly': {
      if (!relative) return addMonthsClamped(date, 1);
      const baseMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const nextMonth = addMonthsClamped(baseMonth, 1);
      return buildRelativeMonthlyDate(nextMonth.getFullYear(), nextMonth.getMonth(), relative);
    }
    case 'once':
    default:
      return date;
  }
};

export const getNextOccurrence = (
  base: Date,
  kind: FixedDateKind,
  now: Date,
  relative?: RelativeMonthlySpec
) => {
  if (kind === 'relative-monthly' && relative) {
    let next = buildRelativeMonthlyDate(now.getFullYear(), now.getMonth(), relative);
    if (next.getTime() < now.getTime()) {
      const nextMonth = addMonthsClamped(new Date(now.getFullYear(), now.getMonth(), 1), 1);
      next = buildRelativeMonthlyDate(nextMonth.getFullYear(), nextMonth.getMonth(), relative);
    }
    return next;
  }
  let next = new Date(base);
  if (kind === 'once') return next;
  while (next.getTime() < now.getTime()) {
    next = addByKind(next, kind, relative);
  }
  return next;
};

const weekdayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const weekdayShort = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
const monthNames = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];
const monthShort = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];

export const formatTemplate = (template: string, date: Date) => {
  const pad2 = (n: number) => String(n).padStart(2, '0');

  const buildReplacements = (base: Date): Record<string, string> => {
    const year = base.getFullYear();
    const month = base.getMonth() + 1;
    const day = base.getDate();
    const hours = base.getHours();
    const minutes = base.getMinutes();
    const isoDate = `${year}-${pad2(month)}-${pad2(day)}`;
    const dateEs = `${pad2(day)}/${pad2(month)}/${year}`;
    const time = `${pad2(hours)}:${pad2(minutes)}`;
    const isoDateTime = `${isoDate} ${time}`;

    return {
      year: String(year),
      month: pad2(month),
      day: pad2(day),
      hour: pad2(hours),
      minute: pad2(minutes),
      weekday: weekdayNames[base.getDay()],
      weekday_short: weekdayShort[base.getDay()],
      month_name: monthNames[base.getMonth()],
      month_short: monthShort[base.getMonth()],
      date: dateEs,
      date_iso: isoDate,
      time,
      datetime: `${dateEs} ${time}`,
      datetime_iso: isoDateTime,
    };
  };

  const applyOffset = (base: Date, key: string, offset: number) => {
    if (!Number.isFinite(offset) || offset === 0) return new Date(base);
    switch (key) {
      case 'year':
        return addYearsClamped(base, offset);
      case 'month':
      case 'month_name':
      case 'month_short':
        return addMonthsClamped(base, offset);
      case 'day':
      case 'date':
      case 'date_iso':
      case 'weekday':
      case 'weekday_short':
      case 'datetime':
      case 'datetime_iso':
        return addDays(base, offset);
      case 'hour': {
        const next = new Date(base);
        next.setHours(next.getHours() + offset);
        return next;
      }
      case 'minute': {
        const next = new Date(base);
        next.setMinutes(next.getMinutes() + offset);
        return next;
      }
      default:
        return new Date(base);
    }
  };

  return template.replace(/\{([a-z_]+)([+-]\d+)?\}/gi, (match, key, delta) => {
    const k = String(key).toLowerCase();
    const offset = delta ? Number(delta) : 0;
    if (k === 'year' && Number.isFinite(offset) && Math.abs(offset) >= 1000) {
      return String(date.getFullYear() + offset);
    }
    const base = Number.isFinite(offset) && offset !== 0 ? applyOffset(date, k, offset) : date;
    const replacements = buildReplacements(base);
    return Object.prototype.hasOwnProperty.call(replacements, k) ? replacements[k] : match;
  });
};
