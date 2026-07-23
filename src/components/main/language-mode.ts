import type { Prayer } from '@/lib/types';
import type { PrayerLanguageMode } from '@/context/SettingsContext';

export const normalizeLanguageKey = (value?: string | null) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

export const getPrayerLanguageModes = (prayer: Prayer | null): PrayerLanguageMode[] => {
  if (!prayer?.content || typeof prayer.content !== 'object') return [];
  if (prayer.id === 'angelus-regina-coeli') return ['espanol', 'latin', 'ambos'];

  const keys = Object.keys(prayer.content);
  const spanishIndex = keys.findIndex((key) => normalizeLanguageKey(key) === 'espanol');
  const latinIndex = keys.findIndex((key) => normalizeLanguageKey(key) === 'latin');
  if (spanishIndex < 0 || latinIndex < 0) return [];
  return spanishIndex < latinIndex
    ? ['espanol', 'latin', 'ambos']
    : ['latin', 'espanol', 'ambos'];
};

export const languageModeLabel: Record<PrayerLanguageMode, string> = {
  espanol: 'Español',
  latin: 'Latín',
  ambos: 'Ambos',
};
