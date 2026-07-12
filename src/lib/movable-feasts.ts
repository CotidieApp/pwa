import type { SaintOfTheDay } from './types';
import { addDays, isSameDay, startOfDay } from 'date-fns';

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
    bio: "Día para preparar el alma para la crucifixión, muerte y resurrección del Señor. Ocasión de reflexión y meditación. Lunes, conmemoración de los Santos Arcángeles.",
    title: "Celebración del Día",
    type: "celebration",
  },
  holyTuesday: {
    offset: -5,
    name: "Martes Santo",
    bio: "Día para preparar el alma para la crucifixión, muerte y resurrección del Señor. Ocasión de reflexión y meditación. Martes, conmemoración de la filiación divina.",
    title: "Celebración del Día",
    type: "celebration",
  },
  holyWednesday: {
    offset: -4,
    name: "Miércoles Santo",
    bio: "Día para preparar el alma para la crucifixión, muerte y resurrección del Señor. Ocasión de reflexión y meditación. Miércoles, conmemoración a San José.",
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
    offset: 39, // 40th day, but often celebrated on the next Sunday
    name: "Ascensión del Señor",
    bio: "Cuarenta días después de su Resurrección, Jesús asciende al cielo en presencia de sus discípulos, prometiendo el envío del Espíritu Santo.",
    title: "Solemnidad",
    type: "celebration",
  },
  pentecost: {
    offset: 49, // 50th day
    name: "Pentecostés",
    bio: "Cincuenta días después de la Resurrección, el Espíritu Santo desciende sobre los Apóstoles, marcando el nacimiento de la Iglesia y el inicio de su misión evangelizadora.",
    title: "Solemnidad",
    type: "celebration",
  },
  divineMercy: {
    offset: 7,
    name: "Domingo de la Divina Misericordia",
    bio: "Jornada para confiar en la misericordia de Dios y en la obra redentora de Cristo, que nos llama a la conversión y al perdón.",
    title: "Fiesta",
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
    bio: "Solemnidad que reconoce a Jesús como sumo sacerdote, ofrecimiento perpetuo y mediador entre Dios y la humanidad.",
    title: "Solemnidad",
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
    name: "Jesucristo, Rey del Universo",
    bio: "Solemnidad que cierra el Año Litúrgico. Celebramos que Cristo es Rey de todo lo creado, principio y fin de la historia.",
    title: "Solemnidad",
    type: "celebration",
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

/**
 * Calculates important dates for the Advent season.
 * First Sunday of Advent is the Sunday closest to St. Andrew (Nov 30),
 * or the Sunday that falls between Nov 27 and Dec 3 inclusive.
 */
const getAdventDates = (year: number) => {
    // Start searching from Nov 27
    const startWindow = new Date(year, 10, 27); // Nov 27
    let advent1 = new Date(startWindow);
    
    // Find the first Sunday on or after Nov 27
    while (advent1.getDay() !== 0) {
        advent1.setDate(advent1.getDate() + 1);
    }
    // advent1 is now the First Sunday of Advent

    return {
        advent1,
        advent2: addDays(advent1, 7),
        advent3: addDays(advent1, 14),
        advent4: addDays(advent1, 21),
        christTheKing: addDays(advent1, -7)
    };
};

export const getMovableFeast = (currentDate: Date, easterDate: Date): SaintOfTheDay | null => {
  const current = startOfDay(currentDate);
  const easter = startOfDay(easterDate);
  const year = current.getFullYear();

  // 1. Calculate Advent Dates
  const adventDates = getAdventDates(year);

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
      return {
        ...feast,
        day: feastDate.getDate(),
        month: feastDate.getMonth() + 1
      };
    }
  }

  return null;
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
  firstOpenedDate: string | null,
  forceSeason = false
): { bubbleVisible: boolean; settingsVisible: boolean } => {
  if (Number.isNaN(date.getTime())) {
    return { bubbleVisible: false, settingsVisible: false };
  }

  const year = date.getFullYear();
  const currentDateKey = getLocalDateKey(date);
  const openedDate = parseLocalDateKey(firstOpenedDate);
  const openedInCurrentYear =
    openedDate?.getFullYear() === year && getLocalDateKey(openedDate) <= currentDateKey
      ? openedDate
      : null;
  const seasonActive = forceSeason || isAnnuumSeason(date);
  const christTheKingKey = getLocalDateKey(getAdventDates(year).christTheKing);
  const yearEndCutoff = new Date(year, 11, 31, 23, 50, 0, 0);

  let bubbleVisible = seasonActive && !openedInCurrentYear;
  if (seasonActive && openedInCurrentYear && getLocalDateKey(openedInCurrentYear) === currentDateKey) {
    const openedDayCutoff = new Date(
      openedInCurrentYear.getFullYear(),
      openedInCurrentYear.getMonth(),
      openedInCurrentYear.getDate(),
      23,
      59,
      0,
      0
    );
    bubbleVisible = date < openedDayCutoff;
  }

  const settingsVisible = Boolean(
    seasonActive &&
      openedInCurrentYear &&
      currentDateKey > getLocalDateKey(openedInCurrentYear) &&
      currentDateKey > christTheKingKey &&
      date < yearEndCutoff
  );

  return { bubbleVisible, settingsVisible };
};
