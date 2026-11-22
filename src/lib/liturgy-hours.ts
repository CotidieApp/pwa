import { getLocalDateKey } from './calendar-date';

export const LITURGY_HOURS_ID = 'liturgia-de-las-horas';
export const LITURGY_MASS_ID = 'lecturas-de-la-misa';
export const LITURGY_HOURS = [
  { id: 'invitatorio', label: 'Invitatorio' },
  { id: 'oficio', label: 'Oficio de lectura' },
  { id: 'laudes', label: 'Laudes' },
  { id: 'tercia', label: 'Tercia' },
  { id: 'sexta', label: 'Sexta' },
  { id: 'nona', label: 'Nona' },
  { id: 'visperas', label: 'Vísperas' },
  { id: 'completas', label: 'Completas' },
] as const;

export type LiturgyHour = typeof LITURGY_HOURS[number]['id'];

export function parseLiturgyDate(value: string): Date | null {
  if (!/^\d{4,}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 100) return null;
  const date = new Date(year, month - 1, day, 12);
  return getLocalDateKey(date) === value ? date : null;
}
