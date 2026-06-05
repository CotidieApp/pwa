import type { Prayer } from '@/lib/types';

const ORACION_DEL_DIA_ID = '__oracion_del_dia__';

export const resolveOracionDelDiaPrayerId = () => {
  const day = new Date().getDay();
  if (day === 2) return 'salmo-ii';
  if (day === 4) return 'adoro-te-devote';
  if (day === 6) return 'salve-regina';
  if (day === 0) return 'simbolo-quicumque';
  return null;
};

export const resolvePlanPrayerId = (id: string) => {
  if (id === ORACION_DEL_DIA_ID) return resolveOracionDelDiaPrayerId();
  const legacyIdMap: Record<string, string> = {
    acordaos: 'acordaos-oracion',
    salmoII: 'salmo-ii',
    adoroTeDevote: 'adoro-te-devote',
    salveRegina: 'salve-regina',
    simboloQuicumque: 'simbolo-quicumque',
  };
  return legacyIdMap[id] ?? id;
};

export const getPrayerPathIds = (targetId: string, list: Prayer[], path: string[] = []): string[] | null => {
  for (const prayer of list) {
    if (!prayer.id) continue;
    const nextPath = [...path, prayer.id];
    if (prayer.id === targetId) return nextPath;
    if (prayer.prayers && prayer.prayers.length > 0) {
      const found = getPrayerPathIds(targetId, prayer.prayers, nextPath);
      if (found) return found;
    }
  }
  return null;
};

export const normalizeRouteSegment = (value: string) =>
  value
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const findPrayerIdByTitle = (title: string, list: Prayer[]): string | null => {
  const target = normalizeRouteSegment(title);
  for (const prayer of list) {
    const prayerTitle = normalizeRouteSegment(prayer.title || '');
    if (prayerTitle === target) return prayer.id ?? null;
    if (prayer.prayers && prayer.prayers.length > 0) {
      const found = findPrayerIdByTitle(title, prayer.prayers);
      if (found) return found;
    }
  }
  return null;
};
