import reflections from './prayers/plan-de-vida/mes-de-maria-reflections.json';

export const mesDeMariaReflections = reflections;
export const MES_DE_MARIA_REFLECTION_ID = 'mes-de-maria-pequena-reflexion';

export function getMesDeMariaDayIndex(date = new Date()): number {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const index = reflections.findIndex(item => item.month === month && item.day === day);
  return index < 0 ? 0 : index;
}
