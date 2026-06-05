import officialCalendar2026Raw from './liturgical-colors-chile-2026.json';
import officialCalendar2027Raw from './liturgical-colors-chile-2027.json';
import {
  LITURGICAL_COLOR_HEX,
  type LiturgicalColorName,
} from './liturgical-color-shared';

type DateInput = Date | string | null | undefined;

export type YearlyLiturgicalDayEntry = {
  appColor?: LiturgicalColorName | null;
  title?: string;
  misa?: string;
  sourceId?: string;
  officialPrimaryColor?: LiturgicalColorName | null;
  officialColorOptions?: LiturgicalColorName[];
};

type YearlyLiturgicalCalendar = {
  year: number;
  locale: string;
  source: string;
  sourcePage: string;
  coverage?: 'full' | 'partial' | 'snapshot';
  days: Record<string, YearlyLiturgicalDayEntry>;
};

const yearlyCalendars = [
  officialCalendar2026Raw as YearlyLiturgicalCalendar,
  officialCalendar2027Raw as YearlyLiturgicalCalendar,
];

const calendarsByYear = new Map<number, YearlyLiturgicalCalendar>(
  yearlyCalendars.map((calendar) => [calendar.year, calendar])
);

const normalizeDate = (input: DateInput): Date | null => {
  if (!input) return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateKey = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getYearlyChileLiturgicalCalendar = (
  dateInput?: DateInput
): YearlyLiturgicalCalendar | null => {
  const date = normalizeDate(dateInput ?? new Date());
  if (!date) return null;
  return calendarsByYear.get(date.getFullYear()) ?? null;
};

export const getYearlyChileLiturgicalDay = (
  dateInput?: DateInput
): YearlyLiturgicalDayEntry | null => {
  const date = normalizeDate(dateInput ?? new Date());
  if (!date) return null;
  const calendar = getYearlyChileLiturgicalCalendar(date);
  if (!calendar) return null;
  return calendar.days[toDateKey(date)] ?? null;
};

export const getYearlyChileLiturgicalColorName = (
  dateInput?: DateInput
): LiturgicalColorName | null => {
  const day = getYearlyChileLiturgicalDay(dateInput);
  return day?.appColor ?? null;
};

export const getYearlyChileLiturgicalColor = (
  dateInput?: DateInput
): string | null => {
  const colorName = getYearlyChileLiturgicalColorName(dateInput);
  if (!colorName) return null;
  return LITURGICAL_COLOR_HEX[colorName] ?? null;
};
