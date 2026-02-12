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
    title: "Celebración del Día",
    type: "celebration",
  },
  palmSunday: {
    offset: -7,
    name: "Domingo de Ramos",
    bio: "Inicio de la Semana Santa. Se conmemora la entrada triunfal de Jesús en Jerusalén, aclamado por la multitud con ramos de olivo y palma.",
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
    bio: "Día de luto y penitencia en el que se recuerda la Pasión y Muerte de Jesucristo en la Cruz para la salvación del mundo.",
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
  christTheKing: {
    offset: 0, // Placeholder, calculated separately
    name: "Jesucristo, Rey del Universo",
    bio: "Solemnidad que cierra el Año Litúrgico. Celebramos que Cristo es Rey de todo lo creado, principio y fin de la historia.",
    title: "Solemnidad",
    type: "celebration",
  },
};

export const getMovableFeast = (currentDate: Date, easterDate: Date): SaintOfTheDay | null => {
  const current = startOfDay(currentDate);
  const easter = startOfDay(easterDate);

  // Christ the King is 34th Sunday in Ordinary Time (Last Sunday before Advent)
  // Advent starts 4 Sundays before Christmas.
  // So Christ the King is 1 week before First Sunday of Advent.
  const christmas = new Date(currentDate.getFullYear(), 11, 25); // Dec 25
  const christmasDayOfWeek = christmas.getDay(); // 0-6
  // Advent starts on the Sunday closest to Nov 30? No, it's 4 Sundays before Christmas.
  // Actually, 4th Sunday of Advent is the Sunday before Christmas (or Christmas itself if Sunday? No).
  // First Sunday of Advent is 4 Sundays back.
  // Simplest: Find Sunday before Dec 25, then go back 3 weeks to get 1st Sunday of Advent.
  // Then go back 1 week for Christ the King.
  // So Christ the King is 5 Sundays before Dec 25?
  // Let's verify:
  // Dec 25 2024 is Wednesday.
  // Sun Dec 22 (4th Adv), Sun Dec 15 (3rd), Sun Dec 8 (2nd), Sun Dec 1 (1st Adv).
  // Sun Nov 24 (Christ the King).
  // 5 Sundays back from Dec 25?
  // Dec 25 -> previous Sunday is Dec 22.
  // Dec 22 - 7*4 = Dec 22 - 28 = Nov 24. Correct.
  
  // Dec 25 2025 is Thursday.
  // Sun Dec 21 (4th), Dec 14 (3rd), Dec 7 (2nd), Nov 30 (1st).
  // Christ King: Nov 23.
  // Dec 21 - 28 = Nov 23. Correct.
  
  const tempXmas = new Date(current.getFullYear(), 11, 25);
  const tempXmasDay = tempXmas.getDay();
  // If Xmas is Sunday, 4th Sunday of Advent is Dec 18? No, if Xmas is Sunday, Advent 4 is Dec 18.
  // Wait, if Xmas is Sunday, Dec 25. Previous Sunday is Dec 18.
  // Let's use `lastSunday` logic.
  const lastSundayBeforeXmas = new Date(tempXmas);
  lastSundayBeforeXmas.setDate(tempXmas.getDate() - (tempXmasDay === 0 ? 7 : tempXmasDay)); 
  // If Xmas is Sunday (0), we want Dec 18? No, if Xmas is Sunday, the 4th Sunday of Advent is Dec 18.
  // Actually, "The First Sunday of Advent is the Sunday closest to St. Andrew's Day (30 November)."
  // Or: "Advent begins on the Sunday that falls between November 27 and December 3 inclusive."
  // Christ the King is the Sunday before First Advent.
  // Range of Christ the King: Nov 20 - Nov 26.
  
  // Let's stick to: Sunday before Advent 1.
  // Advent 1:
  let advent1 = new Date(current.getFullYear(), 10, 30); // Nov 30
  // Find nearest Sunday? No, "Sunday closest to Nov 30".
  // "Between Nov 27 and Dec 3".
  // Loop from Nov 27 to Dec 3, find Sunday.
  for(let d = 27; d <= 30 + 3; d++) {
      // Logic is tricky with dates.
      // Simpler: Start Nov 27.
      const candidate = new Date(current.getFullYear(), 10, 27);
      while(candidate.getDay() !== 0) {
          candidate.setDate(candidate.getDate() + 1);
      }
      advent1 = candidate;
      break;
  }
  
  const christTheKing = addDays(advent1, -7);
  
  if (isSameDay(current, christTheKing)) {
      return {
          ...movableFeastsDefinitions.christTheKing,
          day: christTheKing.getDate(),
          month: christTheKing.getMonth() + 1
      };
  }

  for (const key in movableFeastsDefinitions) {
    if (key === 'christTheKing') continue; // Handled above
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

export const isWrappedSeason = (date: Date): boolean => {
    const current = startOfDay(date);
    const year = current.getFullYear();
    
    // 1. Calculate Christ the King
    let advent1 = new Date(year, 10, 27); // Nov 27
    while(advent1.getDay() !== 0) {
        advent1.setDate(advent1.getDate() + 1);
    }
    const christTheKing = addDays(advent1, -7);
    
    // 2. Season start: Christ the King
    // 3. Season end: End of January (e.g., Jan 31st to be safe, or Baptism of Lord)
    // "Hasta finales del tiempo de Navidad, o sea, en enero."
    // Let's allow it until Jan 31st of the *next* year.
    
    // Check if we are in the "end of year" part (Nov/Dec)
    // End on Dec 31
    if (current >= christTheKing && current.getMonth() >= 10) {
        return true;
    }
    
    // Check if we are in the "beginning of year" part (Jan)
    // Remove Jan support as requested: "terminar el 31 de diciembre"
    // if (current.getMonth() === 0) {
    //    return true;
    // }
    
    return false;
};
