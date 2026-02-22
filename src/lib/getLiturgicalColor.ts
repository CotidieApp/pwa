import { getEasterDate } from './movable-feasts';

type DateInput = Date | string | null | undefined;

const normalizeDate = (input: DateInput): Date | null => {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getAdventStart = (year: number) => {
  const start = new Date(year, 10, 27); // Nov 27
  while (start.getDay() !== 0) {
    start.setDate(start.getDate() + 1);
  }
  return startOfDay(start);
};

const isWithinInclusive = (date: Date, start: Date, end: Date) => {
  const d = startOfDay(date).getTime();
  return d >= startOfDay(start).getTime() && d <= startOfDay(end).getTime();
};

const isPenitentialSeason = (date: Date) => {
  const year = date.getFullYear();
  const adventStart = getAdventStart(year);
  const adventEnd = new Date(year, 11, 24); // Dec 24
  if (isWithinInclusive(date, adventStart, adventEnd)) return true;

  const easter = getEasterDate(year);
  const ashWednesday = addDays(easter, -46);
  const holySaturday = addDays(easter, -1);
  return isWithinInclusive(date, ashWednesday, holySaturday);
};

export function getLiturgicalColor(
  saint: { title?: string; type?: string; name?: string },
  dateInput?: DateInput
) {
  if (!saint) return "hsl(var(--card))"; // Color de la tarjeta por defecto

  const title = saint.title?.toLowerCase() || "";
  const type = saint.type?.toLowerCase() || "";
  const name = saint.name?.toLowerCase() || "";

  // Colores litúrgicos oficiales
  const colors = {
    gold: "#B8860B",      // Solemnidades, Fiestas del Señor
    red: "#8B0000",       // Pasión, Mártires, Apóstoles, Evangelistas, Pentecostés
    white: "#F8F9FA",     // Navidad, Pascua, Santos (no mártires), Doctores, Ví­rgenes
    purple: "#5A2A69",    // Adviento, Cuaresma, Misas de Difuntos
    green: "#225722",     // Tiempo Ordinario
    blue: "#3A5F7A",      // Privilegio hispano para Inmaculada y fiestas marianas
    rose: "#D470A2",      // Gaudete (Adviento 3) y Laetare (Cuaresma 4) - Opcional
  };

  let baseColor = colors.green;

  const isFatimaSeers =
    name.includes("jacinta") && name.includes("francisco") && name.includes("marto");

  // 1. Solemnidades y Fiestas del Señor (Blanco/Dorado)
  if (!isFatimaSeers) {
    if (title.includes("solemnidad") || name.includes("señor") || name.includes("cristo rey") || title.includes("fiesta del señor")) {
      // Excepción: Viernes Santo (Pasión) es Rojo, aunque sea "del Señor"
      if (name.includes("pasión") || name.includes("viernes santo") || name.includes("cruz")) {
        baseColor = colors.red;
      } else {
        baseColor = colors.gold;
      }
    } else if (
      name.includes("viernes santo") || 
      name.includes("pentecostés") || 
      name.includes("espí­ritu santo") ||
      name.includes("pasión") ||
      type.includes("martyr") || type.includes("mártir") || name.includes("mártir") ||
      type.includes("apostle") || type.includes("apóstol") ||
      type.includes("evangelist") || type.includes("evangelista")
    ) {
      // Excepción: San Juan Evangelista es Blanco (no mártir) tradicionalmente, pero litúrgicamente se usa blanco.
      // Si el dato dice "Apóstol y Evangelista", la regla general es Rojo, pero Juan es excepción.
      baseColor = name.includes("juan") && name.includes("evangelista") ? colors.white : colors.red;
    } else if (type.includes("marian") || name.includes("virgen") || name.includes("inmaculada") || name.includes("asunción") || name.includes("madre de dios")) {
      baseColor = colors.blue; 
    } else if (type.includes("virgin") || type.includes("virgen")) {
      baseColor = colors.green;
    } else if (
      type.includes("confessor") || 
      type.includes("doctor") || 
      type.includes("pope") || type.includes("papa") || 
      type.includes("bishop") || type.includes("obispo") ||
      type.includes("religious") || type.includes("religioso") ||
      type.includes("abbot") || type.includes("abad") ||
      title.includes("fiesta") || title.includes("memoria")
    ) {
      baseColor = colors.white;
    }
  }

  const date = normalizeDate(dateInput ?? new Date());
  if (date && isPenitentialSeason(date)) {
    if (baseColor !== colors.red && baseColor !== colors.blue && baseColor !== colors.gold) {
      return colors.purple;
    }
  }

  return baseColor;
}
