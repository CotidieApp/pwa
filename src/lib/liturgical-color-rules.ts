import { getEasterDate } from './movable-feasts';
import { LITURGICAL_COLOR_HEX, type LiturgicalColorName } from './liturgical-color-shared';

type DateInput = Date | string | null | undefined;

export type LiturgicalSaintLike = {
  title?: string;
  type?: string;
  name?: string;
} | null | undefined;

type CelebrationRank =
  | 'solemnity'
  | 'feast'
  | 'memorial'
  | 'optional_memorial'
  | 'commemoration'
  | 'feria';

const SPECIAL_FIXED_DATE_COLORS: Record<string, LiturgicalColorName> = {
  '01-01': 'Blanco',
  '01-03': 'Blanco',
  '01-06': 'Blanco',
  '01-25': 'Blanco',
  '02-02': 'Blanco',
  '02-22': 'Blanco',
  '03-19': 'Blanco',
  '03-25': 'Blanco',
  '06-24': 'Blanco',
  '06-29': 'Rojo',
  '07-16': 'Blanco',
  '08-06': 'Blanco',
  '08-15': 'Blanco',
  '09-14': 'Rojo',
  '09-29': 'Blanco',
  '10-02': 'Blanco',
  '11-01': 'Blanco',
  '11-02': 'Blanco',
  '11-09': 'Blanco',
  '11-21': 'Blanco',
  '12-08': 'Blanco',
  '12-25': 'Blanco',
  '12-26': 'Rojo',
  '12-27': 'Blanco',
  '12-28': 'Rojo',
};

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

const getAdventStart = (year: number) => {
  const start = new Date(year, 10, 27);
  while (start.getDay() !== 0) {
    start.setDate(start.getDate() + 1);
  }
  return startOfDay(start);
};

export const getAdventDates = (year: number) => {
  const advent1 = getAdventStart(year);
  return {
    advent1,
    advent2: addDays(advent1, 7),
    advent3: addDays(advent1, 14),
    advent4: addDays(advent1, 21),
    christTheKing: addDays(advent1, -7),
  };
};

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

const getHolyFamilyDate = (year: number) => {
  for (let day = 26; day <= 31; day += 1) {
    const candidate = new Date(year, 11, day);
    if (candidate.getDay() === 0) return startOfDay(candidate);
  }
  return new Date(year, 11, 30);
};

const getBaptismOfTheLordDate = (year: number) => {
  const candidate = new Date(year, 0, 7);
  while (candidate.getDay() !== 0) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return startOfDay(candidate);
};

const getObservedSaintJosephDate = (year: number) => {
  const original = new Date(year, 2, 19);
  const palmSunday = getPalmSunday(year);
  if (isWithinInclusive(original, palmSunday, getHolySaturday(year))) {
    return addDays(palmSunday, -1);
  }
  if (isSunday(original) && isLentSeason(original)) {
    return addDays(original, 1);
  }
  return startOfDay(original);
};

const getObservedAnnunciationDate = (year: number) => {
  const original = new Date(year, 2, 25);
  const easter = getEasterDate(year);
  if (isWithinInclusive(original, getPalmSunday(year), addDays(easter, 7))) {
    return addDays(easter, 8);
  }
  if (isSunday(original) && isLentSeason(original)) {
    return addDays(original, 1);
  }
  return startOfDay(original);
};

const getObservedImmaculateConceptionDate = (year: number) => {
  const original = new Date(year, 11, 8);
  if (isSunday(original) && isAdventSeason(original)) {
    return addDays(original, 1);
  }
  return startOfDay(original);
};

export const isAdventSeason = (date: Date) => {
  const year = date.getFullYear();
  const adventStart = getAdventStart(year);
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
  const christmasStart = new Date(year, 11, 25);
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

export const isPenitentialSeason = (date: Date) => isLentSeason(date);

const getSeasonDefaultColorName = (date: Date): LiturgicalColorName => {
  if (isChristmasSeason(date) || isEasterSeason(date)) return 'Blanco';
  if (isAdventSeason(date) || isLentSeason(date)) return 'Morado';
  return 'Verde';
};

export const isMarianCelebration = (type: string, name: string) => {
  if (type.includes('marian')) return true;
  return (
    name.includes('nuestra senora') ||
    name.includes('santa maria') ||
    name.includes('virgen maria') ||
    name.includes('madre de dios') ||
    name.includes('inmaculada') ||
    name.includes('asuncion de la virgen') ||
    name.includes('presentacion de la virgen') ||
    name.includes('natividad de la virgen') ||
    name.includes('visitacion de la virgen') ||
    name.includes('virgen del ') ||
    name.includes('virgen de ')
  );
};

export const keepsOwnColorInPenitentialSeason = (title: string, name: string) => {
  const normalizedTitle = normalizeLiturgicalText(title);
  const normalizedName = normalizeLiturgicalText(name);
  return (
    normalizedTitle.includes('solemnidad') ||
    normalizedTitle.includes('fiesta') ||
    normalizedTitle.includes('fiesta del senor') ||
    normalizedName.includes('jueves santo') ||
    normalizedName.includes('viernes santo') ||
    normalizedName.includes('pasion del senor') ||
    normalizedName.includes('pentecostes') ||
    normalizedName.includes('domingo de ramos')
  );
};

const parseCelebrationRank = (title: string): CelebrationRank => {
  const normalizedTitle = normalizeLiturgicalText(title);
  if (normalizedTitle.includes('solemnidad')) return 'solemnity';
  if (normalizedTitle.includes('fiesta')) return 'feast';
  if (/\bmemoria\b(?!\s+libre)/.test(normalizedTitle)) return 'memorial';
  if (normalizedTitle.includes('memoria libre')) return 'optional_memorial';
  if (normalizedTitle.includes('conmemoracion')) return 'commemoration';
  return 'feria';
};

const isSpecialFixedDateObservedElsewhere = (date: Date) => {
  const year = date.getFullYear();
  const key = toMonthDayKey(date);
  if (key === '03-19' && !isSameDay(date, getObservedSaintJosephDate(year))) return true;
  if (key === '03-25' && !isSameDay(date, getObservedAnnunciationDate(year))) return true;
  if (key === '12-08' && !isSameDay(date, getObservedImmaculateConceptionDate(year))) return true;
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
  const immaculateConception = getObservedImmaculateConceptionDate(year);

  if (isSameDay(date, saintJoseph) || isSameDay(date, annunciation) || isSameDay(date, immaculateConception)) {
    return 'Blanco';
  }

  if (!isSpecialFixedDateObservedElsewhere(date)) {
    const fixedColor = SPECIAL_FIXED_DATE_COLORS[dateKey];
    if (fixedColor) return fixedColor;
  }

  if (isSameDay(date, holyFamily) || isSameDay(date, baptism)) return 'Blanco';
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
  if (isSameDay(date, getImmaculateHeart(year))) return 'Blanco';
  if (isSameDay(date, getMotherOfTheChurch(year))) return 'Blanco';

  if (isSameDay(date, getAdventDates(year).christTheKing)) return 'Blanco';
  if (isWithinInclusive(date, getAdventDates(year).advent1, getAdventDates(year).advent4) && isSunday(date)) {
    return 'Morado';
  }

  if (isSunday(date) && isChristmasSeason(date)) return 'Blanco';
  if (isSunday(date) && isLentSeason(date)) return 'Morado';
  if (isSunday(date) && isEasterSeason(date)) return 'Blanco';

  return null;
};

const getSaintCelebrationColorName = (
  saint: LiturgicalSaintLike,
  date: Date
): LiturgicalColorName | null => {
  if (!saint) return null;

  const title = normalizeLiturgicalText(saint.title);
  const type = normalizeLiturgicalText(saint.type);
  const name = normalizeLiturgicalText(saint.name);
  const rank = parseCelebrationRank(saint.title ?? '');

  if (rank === 'feria' || rank === 'optional_memorial') return null;
  if (rank !== 'solemnity' && rank !== 'feast' && rank !== 'memorial' && rank !== 'commemoration') {
    return null;
  }

  const shouldSuppressInPenitentialSeason =
    (rank === 'memorial' || rank === 'commemoration') &&
    (isLentSeason(date) || isPrivilegedAdventWeekday(date)) &&
    !keepsOwnColorInPenitentialSeason(title, name);

  if (shouldSuppressInPenitentialSeason) {
    return getSeasonDefaultColorName(date);
  }

  if (
    name.includes('conmemoracion de los fieles difuntos') ||
    name.includes('fieles difuntos')
  ) {
    return 'Blanco';
  }

  const isMartyr = type.includes('martyr') || type.includes('martir') || name.includes('martir');
  const isWhiteApostolicException =
    (name.includes('juan') && name.includes('evangelista')) ||
    name.includes('catedra de san pedro') ||
    name.includes('conversion de san pablo');

  const isApostleOrEvangelist =
    (type.includes('apostle') ||
      type.includes('apostol') ||
      type.includes('evangelist') ||
      type.includes('evangelista')) &&
    !isWhiteApostolicException;

  if (isMartyr || isApostleOrEvangelist) return 'Rojo';
  if (isMarianCelebration(type, name)) return 'Blanco';

  return 'Blanco';
};

export const getGeneralLiturgicalColorName = (
  saint: LiturgicalSaintLike,
  dateInput?: DateInput
): LiturgicalColorName => {
  const date = normalizeDate(dateInput ?? new Date());
  if (!date) return 'Verde';

  const specialDateColor = getSpecialDateLiturgicalColorName(date);
  if (specialDateColor) return specialDateColor;

  const saintColor = getSaintCelebrationColorName(saint, date);
  if (saintColor) return saintColor;

  if (isAdventSeason(date) || isLentSeason(date) || isChristmasSeason(date) || isEasterSeason(date)) {
    return getSeasonDefaultColorName(date);
  }

  if (isSunday(date)) return 'Verde';
  return 'Verde';
};

export const getGeneralLiturgicalColor = (
  saint: LiturgicalSaintLike,
  dateInput?: DateInput
) => LITURGICAL_COLOR_HEX[getGeneralLiturgicalColorName(saint, dateInput)];
