import { getEasterDate } from './movable-feasts';

type DateInput = Date | string | null | undefined;

export const normalizeDate = (input: DateInput): Date | null => {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizeLiturgicalText = (value?: string) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getAdventStart = (year: number) => {
  const start = new Date(year, 10, 27);
  while (start.getDay() !== 0) {
    start.setDate(start.getDate() + 1);
  }
  return startOfDay(start);
};

const isWithinInclusive = (date: Date, start: Date, end: Date) => {
  const d = startOfDay(date).getTime();
  return d >= startOfDay(start).getTime() && d <= startOfDay(end).getTime();
};

export const isPenitentialSeason = (date: Date) => {
  const year = date.getFullYear();
  const adventStart = getAdventStart(year);
  const adventEnd = new Date(year, 11, 24);
  if (isWithinInclusive(date, adventStart, adventEnd)) return true;

  const easter = getEasterDate(year);
  const ashWednesday = addDays(easter, -46);
  const holySaturday = addDays(easter, -1);
  return isWithinInclusive(date, ashWednesday, holySaturday);
};

export const isMarianCelebration = (type: string, name: string) => {
  if (type.includes('marian')) return true;
  return (
    name.includes('nuestra señora') ||
    name.includes('santa maría') ||
    name.includes('virgen maría') ||
    name.includes('madre de dios') ||
    name.includes('inmaculada') ||
    name.includes('asunción de la virgen') ||
    name.includes('presentación de la virgen') ||
    name.includes('natividad de la virgen') ||
    name.includes('visitación de la virgen') ||
    name.includes('virgen del ') ||
    name.includes('virgen de ')
  );
};

export const keepsOwnColorInPenitentialSeason = (title: string, name: string) => {
  const normalizedTitle = normalizeLiturgicalText(title);
  const normalizedName = normalizeLiturgicalText(name);
  return (
    normalizedTitle.includes('solemnidad') ||
    normalizedTitle.includes('fiesta del senor') ||
    normalizedName.includes('viernes santo') ||
    normalizedName.includes('pasion del senor') ||
    normalizedName.includes('pentecostes') ||
    normalizedName.includes('domingo de ramos')
  );
};
