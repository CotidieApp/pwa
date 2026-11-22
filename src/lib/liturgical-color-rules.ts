import {
  getAdventDates,
  getBaptismOfTheLordDate,
  getEasterDate,
  getEpiphanyDate,
  getHolyFamilyDate,
  getMovableFeast,
  getObservedAnnunciationDate,
  getObservedNativityOfJohnDate,
  getObservedPeterAndPaulDate,
  getObservedSaintJosephDate,
} from './movable-feasts';
import { parseCalendarDate } from './calendar-date';
import { LITURGICAL_COLOR_HEX, type LiturgicalColorName } from './liturgical-color-shared';

import fixedCalendar from './liturgical-fixed-days-chile.json';

type DateInput = Date | string | null | undefined;

export type LiturgicalSaintLike = {
  title?: string;
  type?: string;
  name?: string;
} | null | undefined;

// Ranks 3 through 7 follow the Roman calendar: obligatory memorial, feast,
// feast of the Lord, solemnity, and celebration that outranks solemnities.
const fixedDays = fixedCalendar.days as Record<string, { rank: number; color: LiturgicalColorName }>;

export const normalizeDate = (input: DateInput): Date | null => {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  return parseCalendarDate(input);
};

export const normalizeLiturgicalText = (value?: string) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
};

const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

const isWithinInclusive = (date: Date, start: Date, end: Date) => {
  const current = startOfDay(date).getTime();
  return current >= startOfDay(start).getTime() && current <= startOfDay(end).getTime();
};

const toMonthDayKey = (date: Date) =>
  `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const isSunday = (date: Date) => startOfDay(date).getDay() === 0;

export { getAdventDates };

const getPalmSunday = (year: number) => addDays(getEasterDate(year), -7);
const getHolyThursday = (year: number) => addDays(getEasterDate(year), -3);
const getGoodFriday = (year: number) => addDays(getEasterDate(year), -2);
const getHolySaturday = (year: number) => addDays(getEasterDate(year), -1);
const getAshWednesday = (year: number) => addDays(getEasterDate(year), -46);
const getAscensionSundayChile = (year: number) => addDays(getEasterDate(year), 42);
const getPentecost = (year: number) => addDays(getEasterDate(year), 49);
const getTrinitySunday = (year: number) => addDays(getEasterDate(year), 56);
const getCorpusChristiSundayChile = (year: number) => addDays(getEasterDate(year), 63);
const getSacredHeart = (year: number) => addDays(getEasterDate(year), 68);
const getImmaculateHeart = (year: number) => addDays(getEasterDate(year), 69);
const getMotherOfTheChurch = (year: number) => addDays(getEasterDate(year), 50);

export const isAdventSeason = (date: Date) => {
  const year = date.getFullYear();
  const adventStart = getAdventDates(year).advent1;
  const adventEnd = new Date(year, 11, 24);
  return isWithinInclusive(date, adventStart, adventEnd);
};

export const isPrivilegedAdventWeekday = (date: Date) => {
  if (!isAdventSeason(date)) return false;
  const year = date.getFullYear();
  const start = new Date(year, 11, 17);
  const end = new Date(year, 11, 24);
  return !isSunday(date) && isWithinInclusive(date, start, end);
};

const isChristmasSeason = (date: Date) => {
  const year = date.getFullYear();
  const baptism = getBaptismOfTheLordDate(year);
  if (date.getMonth() === 11 && date.getDate() >= 25) {
    return true;
  }
  return date.getMonth() === 0 && isWithinInclusive(date, new Date(year, 0, 1), baptism);
};

export const isLentSeason = (date: Date) => {
  const year = date.getFullYear();
  return isWithinInclusive(date, getAshWednesday(year), getHolySaturday(year));
};

const isEasterSeason = (date: Date) => {
  const easter = getEasterDate(date.getFullYear());
  return isWithinInclusive(date, easter, getPentecost(date.getFullYear()));
};

// IGMR 355: a commemoration restricted to the collect keeps the feria's color.
const restrictsMemorialToCollect = (date: Date) =>
  isLentSeason(date) || isPrivilegedAdventWeekday(date) ||
  (date.getMonth() === 11 && date.getDate() >= 26);

export const isPenitentialSeason = (date: Date) => isLentSeason(date);

const getSeasonDefaultColorName = (date: Date): LiturgicalColorName => {
  if (isChristmasSeason(date) || isEasterSeason(date)) return 'Blanco';
  if (isAdventSeason(date) || isLentSeason(date)) return 'Morado';
  return 'Verde';
};

const isSpecialFixedDateObservedElsewhere = (date: Date) => {
  const year = date.getFullYear();
  const key = toMonthDayKey(date);
  if (key === '03-19' && !isSameDay(date, getObservedSaintJosephDate(year))) return true;
  if (key === '03-25' && !isSameDay(date, getObservedAnnunciationDate(year))) return true;
  if (key === '06-24' && !isSameDay(date, getObservedNativityOfJohnDate(year))) return true;
  if (key === '06-29' && !isSameDay(date, getObservedPeterAndPaulDate(year))) return true;
  return false;
};

export const getSpecialDateLiturgicalColorName = (
  dateInput?: DateInput
): LiturgicalColorName | null => {
  const date = normalizeDate(dateInput ?? new Date());
  if (!date) return null;

  const year = date.getFullYear();
  const easter = getEasterDate(year);
  const dateKey = toMonthDayKey(date);
  const holyFamily = getHolyFamilyDate(year);
  const baptism = getBaptismOfTheLordDate(year);
  const saintJoseph = getObservedSaintJosephDate(year);
  const annunciation = getObservedAnnunciationDate(year);

  if (isSameDay(date, saintJoseph) || isSameDay(date, annunciation) ||
      isSameDay(date, getObservedNativityOfJohnDate(year, easter)) || dateKey === '12-08') {
    return 'Blanco';
  }

  if (isSameDay(date, holyFamily) || isSameDay(date, baptism) || isSameDay(date, getEpiphanyDate(year))) return 'Blanco';
  if (isSameDay(date, getObservedPeterAndPaulDate(year))) return 'Rojo';
  if (isSameDay(date, getAshWednesday(year))) return 'Morado';

  if (isSameDay(date, getPalmSunday(year))) return 'Rojo';
  if (isWithinInclusive(date, addDays(easter, -6), addDays(easter, -4))) return 'Morado';
  if (isSameDay(date, getHolyThursday(year))) return 'Blanco';
  if (isSameDay(date, getGoodFriday(year))) return 'Rojo';
  if (isSameDay(date, getHolySaturday(year))) return 'Blanco';
  if (isWithinInclusive(date, easter, addDays(easter, 7))) return 'Blanco';

  if (isSameDay(date, getAscensionSundayChile(year))) return 'Blanco';
  if (isSameDay(date, getPentecost(year))) return 'Rojo';
  if (isSameDay(date, getTrinitySunday(year))) return 'Blanco';
  if (isSameDay(date, getCorpusChristiSundayChile(year))) return 'Blanco';
  if (isSameDay(date, getSacredHeart(year))) return 'Blanco';
  if (isSameDay(date, getImmaculateHeart(year)) || isSameDay(date, getMotherOfTheChurch(year))) {
    const movable = getMovableFeast(date, easter);
    // When the two obligatory memorials coincide, either may be celebrated.
    if (movable) return movable.title === 'Memoria libre' ? null : 'Blanco';
  }
  if (isSameDay(date, addDays(easter, 53))) return 'Blanco';

  if (isSameDay(date, getAdventDates(year).christTheKing)) return 'Blanco';
  if (isWithinInclusive(date, getAdventDates(year).advent1, getAdventDates(year).advent4) && isSunday(date)) {
    return 'Morado';
  }

  if (isSunday(date) && isChristmasSeason(date)) return 'Blanco';
  if (isSunday(date) && isLentSeason(date)) return 'Morado';
  if (isSunday(date) && isEasterSeason(date)) return 'Blanco';

  const fixed = fixedDays[dateKey];
  if (!fixed || isSpecialFixedDateObservedElsewhere(date)) return null;
  if (isSunday(date) && fixed.rank < 5) return null;
  if (fixed.rank === 3 && restrictsMemorialToCollect(date)) return null;
  return fixed.color;
};

const getSaintCelebrationColorName = (saint: LiturgicalSaintLike): LiturgicalColorName | null => {
  if (!saint?.name) return null;
  const type = normalizeLiturgicalText(saint.type?.split('/')[0]);
  const name = normalizeLiturgicalText(saint.name.split(' / ')[0]);
  if (name.includes('fieles difuntos')) return 'Morado';
  if (name.includes('exaltacion de la santa cruz')) return 'Rojo';
  const isWhiteApostolicException =
    name.includes('juan apostol y evangelista') ||
    name.includes('catedra de san pedro') ||
    name.includes('conversion de san pablo') ||
    name.includes('natividad de san juan bautista');
  const isRed = /martir|martyr/.test(type + ' ' + name) ||
    (/(apostol|apostle|evangelist)/.test(type + ' ' + name) && !isWhiteApostolicException);
  return isRed ? 'Rojo' : 'Blanco';
};

export const getGeneralLiturgicalColorName = (
  saint: LiturgicalSaintLike,
  dateInput?: DateInput,
  ignoreSpecialDate?: boolean
): LiturgicalColorName => {
  const date = normalizeDate(dateInput ?? new Date());
  if (!date) return 'Verde';

  const seasonColor = getSeasonDefaultColorName(date);
  if (ignoreSpecialDate) return getSaintCelebrationColorName(saint) ?? seasonColor;

  const prescribed = getSpecialDateLiturgicalColorName(date);
  if (prescribed) return prescribed;
  if (isSunday(date) || restrictsMemorialToCollect(date)) return seasonColor;
  // Blesseds without a memorial in Chile are devotional entries only.
  if (saint?.title === 'Santoral' && /^Beat[oa]s? /.test(saint.name ?? '')) return seasonColor;

  return getSaintCelebrationColorName(saint) ?? seasonColor;
};

export const getGeneralLiturgicalColor = (
  saint: LiturgicalSaintLike,
  dateInput?: DateInput,
  ignoreSpecialDate?: boolean
) => LITURGICAL_COLOR_HEX[getGeneralLiturgicalColorName(saint, dateInput, ignoreSpecialDate)];
