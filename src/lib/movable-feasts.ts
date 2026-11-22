import type { SaintOfTheDay } from './types';
import saintsData from './saints-data.json';
import { addDays, isSameDay, startOfDay } from 'date-fns';

export const CHRIST_THE_KING = {
  name: 'Nuestro Señor Jesucristo, Rey del Universo',
  bio: 'En el último domingo del año litúrgico celebramos el reinado de Cristo. Jesús manifiesta su realeza al entregar la vida en la cruz y vencer a la muerte. Su reino de verdad, justicia, amor y paz nos llama a reconocerlo en los más pequeños y a servirlos.',
  title: 'Solemnidad',
  type: 'celebration',
} satisfies Omit<SaintOfTheDay, 'day' | 'month'>;

type MovableFeastDefinition = Omit<SaintOfTheDay, 'day' | 'month'> & {
  offset: number; // Days from Easter Sunday
};

/**
 * Calculates the date of Easter Sunday for a given year using the Gauss algorithm.
 * @param year The year for which to calculate Easter.
 * @returns The date of Easter Sunday for that year.
 */
export const getEasterDate = (year: number): Date => {
  const a = year % 19;
  const b = year % 4;
  const c = year % 7;
  const k = Math.floor(year / 100);
  const p = Math.floor((13 + 8 * k) / 25);
  const q = Math.floor(k / 4);
  const M = (15 - p + k - q) % 30;
  const N = (4 + k - q) % 7;
  const d = (19 * a + M) % 30;
  const e = (2 * b + 4 * c + 6 * d + N) % 7;
  
  const day = d + e < 10 
    ? 22 + d + e 
    : d + e - 9;
    
  const month = d + e < 10 
    ? 2 // March
    : 3; // April

  // Adjust for special cases
  if (day === 26 && month === 3) {
    return new Date(year, month, 19);
  }
  if (day === 25 && month === 3 && d === 28 && a > 10) {
    return new Date(year, month, 18);
  }

  return new Date(year, month, day);
};


const movableFeastsDefinitions: Record<string, MovableFeastDefinition> = {
  ashWednesday: {
    offset: -46,
    name: "Miércoles de Ceniza",
    bio: "Inicio de la Cuaresma, un tiempo de penitencia y conversión de cuarenta días en preparación para la Pascua. Se caracteriza por la imposición de la ceniza en la frente.",
    title: "Conmemoración",
    type: "celebration",
  },
  palmSunday: {
    offset: -7,
    name: "Domingo de Ramos",
    bio: "Inicio de la Semana Santa. Se conmemora la entrada triunfal de Jesús en Jerusalén, aclamado por la multitud con ramos de olivo y palma.",
    title: "Celebración del Día",
    type: "celebration",
  },
  holyMonday: {
    offset: -6,
    name: "Lunes Santo",
    bio: "En Betania, María unge los pies de Jesús. Su gesto de amor anticipa la sepultura del Señor.",
    title: "Celebración del Día",
    type: "celebration",
  },
  holyTuesday: {
    offset: -5,
    name: "Martes Santo",
    bio: "En la Última Cena, Jesús anuncia que uno de los discípulos lo entregará y que Pedro lo negará. La Iglesia se prepara para celebrar su Pasión.",
    title: "Celebración del Día",
    type: "celebration",
  },
  holyWednesday: {
    offset: -4,
    name: "Miércoles Santo",
    bio: "El Evangelio recuerda el acuerdo de Judas para entregar a Jesús. La Iglesia se dispone a celebrar el Triduo Pascual.",
    title: "Celebración del Día",
    type: "celebration",
  },
  holyThursday: {
    offset: -3,
    name: "Jueves Santo",
    bio: "Se conmemora la Última Cena de Jesús con sus apóstoles, la institución de la Eucaristía y del sacerdocio, y el lavatorio de los pies.",
    title: "Celebración del Día",
    type: "celebration",
  },
  goodFriday: {
    offset: -2,
    name: "Viernes Santo",
    bio: "La crucifixión del Señor. Día de luto y penitencia en el que se recuerda la Pasión y Muerte de Jesucristo en la Cruz para la salvación del mundo.",
    title: "Conmemoración",
    type: "celebration",
  },
  holySaturday: {
    offset: -1,
    name: "Sábado Santo",
    bio: "Día de silencio y espera. La Iglesia medita junto al sepulcro del Señor, aguardando su Resurrección. Por la noche, se celebra la Vigilia Pascual.",
    title: "Conmemoración",
    type: "celebration",
  },
  easterSunday: {
    offset: 0,
    name: "Domingo de Resurrección",
    bio: "¡Cristo ha resucitado! Es la fiesta central del cristianismo, la celebración de la victoria de Jesús sobre la muerte, que nos abre las puertas a la vida eterna.",
    title: "Solemnidad",
    type: "celebration",
  },
  ascension: {
    offset: 42, // En Chile se traslada al domingo siguiente.
    name: "Ascensión del Señor",
    bio: "Jesús resucitado vuelve al Padre y promete a sus discípulos el Espíritu Santo. Los Hechos de los Apóstoles recuerdan los cuarenta días en que se les apareció. En Chile celebramos la Ascensión el séptimo domingo de Pascua.",
    title: "Solemnidad",
    type: "celebration",
  },
  pentecost: {
    offset: 49, // 50th day
    name: "Pentecostés",
    bio: "En el quincuagésimo día de Pascua, el Espíritu Santo desciende sobre los discípulos reunidos y los impulsa a anunciar el Evangelio.",
    title: "Solemnidad",
    type: "celebration",
  },
  divineMercy: {
    offset: 7,
    name: "Domingo de la Divina Misericordia",
    bio: "Jornada para confiar en la misericordia de Dios y en la obra redentora de Cristo, que nos llama a la conversión y al perdón.",
    title: "II Domingo de Pascua",
    type: "celebration",
  },
  maryMotherOfChurch: {
    offset: 50, // Lunes siguiente a Pentecostés
    name: "María, Madre de la Iglesia",
    bio: "Celebración en honor a María como Madre de la Iglesia, que acompaña a los fieles en su misión evangelizadora. Memoria instituida por el Papa Francisco.",
    title: "Memoria",
    type: "marian",
  },
  christHighPriest: {
    offset: 53, // Jueves posterior a Pentecostés
    name: "Jesucristo, Sumo y Eterno Sacerdote",
    bio: "Fiesta que celebra a Jesucristo, mediador entre Dios y la humanidad, que se ofreció a sí mismo y vive para interceder por nosotros.",
    title: "Fiesta",
    type: "celebration",
  },
  trinity: {
    offset: 56, // Domingo siguiente a Pentecostés
    name: "Santísima Trinidad",
    bio: "Solemnidad en honor al misterio central de la fe y de la vida cristiana: el misterio de Dios en sí mismo.",
    title: "Solemnidad",
    type: "celebration",
    isHighImportance: true,
  },
  corpusChristi: {
    offset: 63, // Domingo siguiente a la Trinidad (en Chile)
    name: "Corpus Christi",
    bio: "Solemnidad del Cuerpo y la Sangre de Cristo. Celebramos la presencia real de Jesús en la Eucaristía.",
    title: "Solemnidad",
    type: "celebration",
    isHighImportance: true,
  },
  sacredHeart: {
    offset: 68, // Viernes posterior al segundo domingo después de Pentecostés
    name: "Sagrado Corazón de Jesús",
    bio: "Solemnidad que nos invita a meditar sobre el amor infinito de Dios manifestado en el Corazón de su Hijo.",
    title: "Solemnidad",
    type: "celebration",
    isHighImportance: true,
  },
  immaculateHeart: {
    offset: 69, // Sábado posterior al Sagrado Corazón
    name: "Inmaculado Corazón de María",
    bio: "Memoria del Corazón de María, que guardaba todas las cosas meditándolas en su interior, ejemplo de entrega y pureza.",
    title: "Memoria",
    type: "marian",
    isHighImportance: true,
  },
  christTheKing: {
    offset: 0, // Placeholder, calculated separately
    ...CHRIST_THE_KING,
  },
  advent1: {
    offset: 0, // Placeholder
    name: "I Domingo de Adviento",
    bio: "Inicio del Año Litúrgico. La Iglesia comienza el tiempo de espera y preparación para la venida de Cristo.",
    title: "Domingo de Adviento",
    type: "celebration",
  },
  advent2: {
    offset: 0, // Placeholder
    name: "II Domingo de Adviento",
    bio: "La voz del Bautista resuena en el desierto: «Preparad el camino del Señor».",
    title: "Domingo de Adviento",
    type: "celebration",
  },
  advent3: {
    offset: 0, // Placeholder
    name: "III Domingo de Adviento (Gaudete)",
    bio: "Domingo de la alegría. «Estad siempre alegres en el Señor; os lo repito, estad alegres» (Fil 4, 4).",
    title: "Domingo de Adviento",
    type: "celebration",
  },
  advent4: {
    offset: 0, // Placeholder
    name: "IV Domingo de Adviento",
    bio: "María, la Virgen de la espera. El Señor está cerca.",
    title: "Domingo de Adviento",
    type: "celebration",
  },
};

const sundayOnOrAfter = (date: Date) => addDays(date, (7 - date.getDay()) % 7);

export const getPrayerForChileDate = (year: number) => sundayOnOrAfter(new Date(year, 8, 24));

export const getEpiphanyDate = (year: number) => sundayOnOrAfter(new Date(year, 0, 2));

export const getBaptismOfTheLordDate = (year: number) => {
  const epiphany = getEpiphanyDate(year);
  return addDays(epiphany, epiphany.getDate() > 6 ? 1 : 7);
};

export const getHolyFamilyDate = (year: number) => {
  const sunday = sundayOnOrAfter(new Date(year, 11, 26));
  return sunday.getFullYear() === year ? sunday : new Date(year, 11, 30);
};

export const getObservedSaintJosephDate = (year: number, easter = getEasterDate(year)) => {
  const date = new Date(year, 2, 19);
  const palms = addDays(easter, -7);
  if (date >= palms && date < easter) return addDays(palms, -1);
  return date.getDay() === 0 ? addDays(date, 1) : date;
};

export const getObservedAnnunciationDate = (year: number, easter = getEasterDate(year)) => {
  const date = new Date(year, 2, 25);
  if (date >= addDays(easter, -7) && date <= addDays(easter, 7)) return addDays(easter, 8);
  return date.getDay() === 0 && date < easter ? addDays(date, 1) : date;
};

export const getObservedNativityOfJohnDate = (year: number, easter = getEasterDate(year)) => {
  const date = new Date(year, 5, 24);
  if (isSameDay(date, addDays(easter, 68))) return addDays(date, -1);
  return isSameDay(date, addDays(easter, 63)) ? addDays(date, 1) : date;
};

export const getObservedPeterAndPaulDate = (year: number, easter = getEasterDate(year)) => {
  const date = new Date(year, 5, 29);
  return isSameDay(date, addDays(easter, 68)) ? addDays(date, 1) : date;
};

const otherMovableFeasts = {
  epiphany: {
    name: 'Epifanía del Señor',
    bio: 'Los Magos llegan a Belén y adoran a Jesús. La Iglesia celebra la manifestación del Hijo de Dios a todos los pueblos.',
    title: 'Solemnidad',
    type: 'celebration',
  },
  baptism: {
    name: 'Bautismo del Señor',
    bio: 'Jesús recibe de Juan el bautismo en el Jordán. El Espíritu Santo desciende sobre él y el Padre lo revela como su Hijo amado.',
    title: 'Fiesta',
    type: 'celebration',
  },
  holyFamily: {
    name: 'Sagrada Familia de Jesús, María y José',
    bio: 'La Iglesia contempla a Jesús, María y José en su vida familiar y pide que los hogares crezcan en el amor y la fidelidad a Dios.',
    title: 'Fiesta',
    type: 'celebration',
  },
  prayerForChile: {
    name: 'Día de Oración por Chile',
    bio: 'El último domingo de septiembre, la Iglesia en Chile reza por el país y encomienda a sus familias y comunidades a la intercesión de la Virgen del Carmen.',
    title: 'Jornada pastoral',
    type: 'celebration',
  },
} satisfies Record<string, Omit<SaintOfTheDay, 'day' | 'month'>>;

export const getFixedSaint = (month: number, day: number, year?: number): SaintOfTheDay | null => {
  const saint = saintsData.saints.find((entry) => entry.month === month && entry.day === day) ?? null;
  if (year !== undefined && year <= 2025 && month === 10 && day === 9 && saint) {
    return {
      ...saint,
      name: 'San Dionisio y compañeros, mártires',
      bio: 'Dionisio, obispo de París, es venerado como mártir junto con el presbítero Rústico y el diácono Eleuterio.',
      type: 'martyr',
    };
  }
  return saint;
};

const getTransferredFixedDates = (year: number, easter: Date) => [
  { month: 3, day: 19, observed: getObservedSaintJosephDate(year, easter) },
  { month: 3, day: 25, observed: getObservedAnnunciationDate(year, easter) },
  { month: 6, day: 24, observed: getObservedNativityOfJohnDate(year, easter) },
  { month: 6, day: 29, observed: getObservedPeterAndPaulDate(year, easter) },
].filter(({ month, day, observed }) => month !== observed.getMonth() + 1 || day !== observed.getDate());

const isObligatoryMemorial = (saint: SaintOfTheDay | null) =>
  /^Memoria(?: obligatoria)?(?: \/|$)/.test(saint?.title ?? '');

/**
 * Calculates important dates for the Advent season.
 * First Sunday of Advent is the Sunday closest to St. Andrew (Nov 30),
 * or the Sunday that falls between Nov 27 and Dec 3 inclusive.
 */
export const getAdventDates = (year: number) => {
  const advent1 = sundayOnOrAfter(new Date(year, 10, 27));
  return {
    advent1,
    advent2: addDays(advent1, 7),
    advent3: addDays(advent1, 14),
    advent4: addDays(advent1, 21),
    christTheKing: addDays(advent1, -7),
  };
};

export const getMovableFeast = (currentDate: Date, easterDate: Date): SaintOfTheDay | null => {
  if (!Number.isFinite(currentDate.getTime()) || !Number.isFinite(easterDate.getTime())) return null;
  const current = startOfDay(currentDate);
  const easter = startOfDay(easterDate);
  const year = current.getFullYear();
  const withDate = (feast: Omit<SaintOfTheDay, 'day' | 'month'>): SaintOfTheDay =>
    ({ ...feast, month: current.getMonth() + 1, day: current.getDate() });

  if (isSameDay(current, getEpiphanyDate(year))) return withDate(otherMovableFeasts.epiphany);
  if (isSameDay(current, getBaptismOfTheLordDate(year))) return withDate(otherMovableFeasts.baptism);
  if (isSameDay(current, getHolyFamilyDate(year))) return withDate(otherMovableFeasts.holyFamily);
  if (isSameDay(current, getPrayerForChileDate(year))) return withDate(otherMovableFeasts.prayerForChile);

  // 1. Calculate Advent Dates
  const adventDates = getAdventDates(year);
  // In Chile the Immaculate Conception takes precedence on 8 December.
  if (current.getMonth() === 11 && current.getDate() === 8) return null;
  const transferred = getTransferredFixedDates(year, easter).find(({ observed }) => isSameDay(observed, current));
  if (transferred) {
    const fixed = getFixedSaint(transferred.month, transferred.day);
    if (fixed) return withDate(fixed);
  }
  // The Sundays of Lent and Easter outrank even fixed solemnities and feasts.
  if (current.getDay() === 0) {
    const lentSunday = [42, 35, 28, 21, 14].findIndex((offset) =>
      isSameDay(current, addDays(easter, -offset)));
    if (lentSunday >= 0) {
      return withDate({
        name: `${['I', 'II', 'III', 'IV', 'V'][lentSunday]} Domingo de Cuaresma`,
        bio: 'La Iglesia se prepara para la Pascua con la oración, el ayuno y la caridad.',
        title: 'Domingo de Cuaresma',
        type: 'celebration',
      });
    }
    const easterSunday = [14, 21, 28, 35].findIndex((offset) => isSameDay(current, addDays(easter, offset)));
    if (easterSunday >= 0) {
      const ordinal = ['III', 'IV', 'V', 'VI'][easterSunday];
      const reflections = [
        'La Iglesia proclama que Jesús resucitó y se dio a conocer a sus discípulos. Su presencia renueva la fe de la comunidad.',
        'Jesús es el Buen Pastor. Conoce a los suyos, los llama y da la vida por ellos. Hoy la Iglesia reza por las vocaciones.',
        'La alegría de la Pascua nos llama a vivir unidos a Cristo y a dar testimonio de su amor.',
        'Cristo resucitado reúne a sus discípulos en el amor y prepara a la Iglesia para recibir el Espíritu Santo.',
      ];
      return withDate({
        name: `${ordinal} Domingo de Pascua`,
        bio: reflections[easterSunday],
        title: 'Domingo de Pascua',
        type: 'celebration',
      });
    }
  }
  const octaveWeekday = [1, 2, 3, 4, 5, 6].find((offset) => isSameDay(current, addDays(easter, offset)));
  if (octaveWeekday) {
    return withDate({
      name: `${['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][octaveWeekday - 1]} de la Octava de Pascua`,
      bio: 'La Iglesia prolonga la alegría del domingo de Resurrección y celebra la victoria de Cristo sobre la muerte.',
      title: 'Octava de Pascua',
      type: 'celebration',
    });
  }

  // 2. Check for Advent-related Feasts
  if (isSameDay(current, adventDates.christTheKing)) {
    return {
        ...movableFeastsDefinitions.christTheKing,
        day: adventDates.christTheKing.getDate(),
        month: adventDates.christTheKing.getMonth() + 1
    };
  }
  if (isSameDay(current, adventDates.advent1)) {
    return {
        ...movableFeastsDefinitions.advent1,
        day: adventDates.advent1.getDate(),
        month: adventDates.advent1.getMonth() + 1
    };
  }
  if (isSameDay(current, adventDates.advent2)) {
    return {
        ...movableFeastsDefinitions.advent2,
        day: adventDates.advent2.getDate(),
        month: adventDates.advent2.getMonth() + 1
    };
  }
  if (isSameDay(current, adventDates.advent3)) {
    return {
        ...movableFeastsDefinitions.advent3,
        day: adventDates.advent3.getDate(),
        month: adventDates.advent3.getMonth() + 1
    };
  }
  if (isSameDay(current, adventDates.advent4)) {
    return {
        ...movableFeastsDefinitions.advent4,
        day: adventDates.advent4.getDate(),
        month: adventDates.advent4.getMonth() + 1
    };
  }

  // 3. Check for Easter-related Feasts
  for (const key in movableFeastsDefinitions) {
    if (key === 'christTheKing' || key.startsWith('advent')) continue; // Handled above
    const feast = movableFeastsDefinitions[key];
    const feastDate = addDays(easter, feast.offset);
    
    if (isSameDay(current, feastDate)) {
      const fixed = getFixedSaint(current.getMonth() + 1, current.getDate(), year);
      // A fixed feast or solemnity outranks these weekday memorials.
      if ((key === 'maryMotherOfChurch' || key === 'immaculateHeart') &&
          /^(Fiesta|Solemnidad)\b/.test(fixed?.title ?? '')) return null;
      // Notif. 2671/98/L applies when these two obligatory memorials coincide.
      if (key === 'immaculateHeart' && isObligatoryMemorial(fixed)) {
        return withDate({ ...feast, title: 'Memoria libre' });
      }
      return {
        ...feast,
        day: feastDate.getDate(),
        month: feastDate.getMonth() + 1
      };
    }
  }

  return null;
};

export const getSaintDaySelection = (date: Date, movableFeastsEnabled: boolean) => {
  const easter = getEasterDate(date.getFullYear());
  const movable = getMovableFeast(date, easter);
  const fixed = getFixedSaint(date.getMonth() + 1, date.getDate(), date.getFullYear());
  if (!movableFeastsEnabled || !movable) {
    return { effectiveSaint: fixed ?? movable, hiddenFixedSaint: null };
  }
  if (movable.name === movableFeastsDefinitions.immaculateHeart.name && fixed && isObligatoryMemorial(fixed)) {
    return { effectiveSaint: movable, hiddenFixedSaint: { ...fixed, title: 'Memoria libre' } };
  }
  return { effectiveSaint: movable, hiddenFixedSaint: fixed?.name === movable.name ? null : fixed };
};

export const isAnnuumSeason = (date: Date): boolean => {
    const current = startOfDay(date);
    const year = current.getFullYear();
    
    // 1. Calculate Christ the King (Start of Annuum Season)
    const { christTheKing } = getAdventDates(year);
    
    // 2. Check if we are in the "end of year" part (Nov/Dec)
    // Season starts at Christ the King and ends on Dec 31
    if (current >= christTheKing && current.getMonth() >= 10) {
        return true;
    }
    
    return false;
};

export const getLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDateKey = (value: string | null): Date | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return getLocalDateKey(parsed) === value ? parsed : null;
};

export const getAnnuumAvailability = (
  date: Date,
  annualCompletionDate: string | null,
  forceSeason = false
): { bubbleVisible: boolean; settingsVisible: boolean } => {
  if (Number.isNaN(date.getTime())) {
    return { bubbleVisible: false, settingsVisible: false };
  }
  const year = date.getFullYear();
  const currentDateKey = getLocalDateKey(date);
  const completedDate = parseLocalDateKey(annualCompletionDate);
  const completedInCurrentYear =
    completedDate?.getFullYear() === year && getLocalDateKey(completedDate) <= currentDateKey;
  const seasonActive = forceSeason || isAnnuumSeason(date);
  const yearEndCutoff = new Date(year, 11, 31, 23, 50, 0, 0);

  return {
    bubbleVisible: seasonActive && !completedInCurrentYear,
    settingsVisible: seasonActive && completedInCurrentYear && date < yearEndCutoff,
  };
};
