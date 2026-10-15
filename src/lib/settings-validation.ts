import { z } from 'zod';
import type { Prayer } from './types';
import { normalizeSimulatedDate } from './calendar-date';

const text = z.string();
const id = text.min(1);
const content = z.union([text, z.record(text)]);
const color = z.object({ h: z.number().finite().min(0).max(360), s: z.number().finite().min(0).max(100) });
const colors = z.object({ primary: color, background: color, accent: color });
const image = z.object({ id, description: text, imageUrl: text, imageHint: text.optional(),
  themeColors: colors.optional(), isUserDefined: z.boolean().optional() }).passthrough();
const quote = z.object({ id: text.optional(), text, author: text, isUserDefined: z.boolean().optional() }).passthrough();
const saint = z.object({ month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31),
  name: text, bio: text, title: text, type: text, isHighImportance: z.boolean().optional() }).passthrough();
const prayer: z.ZodType<Prayer> = z.lazy(() => z.object({ id: id.optional(), originalId: id.optional(),
  title: text, content: content.optional(), categoryId: z.enum(['devociones','plan-de-vida','oraciones','cartas','santa-misa']),
  imageUrl: text.optional(), imageHint: text.optional(), audio: text.optional(), prayers: z.array(prayer).optional(),
  showOnDay: z.number().int().min(0).max(6).optional(), isUserDefined: z.boolean().optional(),
  isDaySpecific: z.boolean().optional(), isLongText: z.boolean().optional() }).passthrough());

// These structures reach JSX/CSS and recursive navigation without further parsing.
// Other historic scalar fields retain their backwards-compatible normalizers.
const settings = z.object({
  simulatedDate: z.string().refine(value => value === '' || normalizeSimulatedDate(value) !== null).nullable().optional(),
  userHomeBackgrounds: z.array(image).optional(), userQuotes: z.array(quote).optional(),
  quoteOfTheDay: quote.nullable().optional(), saintOfTheDay: saint.nullable().optional(),
  saintOfTheDayImage: image.nullable().optional(),
  userDevotions: z.array(prayer).optional(), userPrayers: z.array(prayer).optional(), userLetters: z.array(prayer).optional(),
  predefinedPrayerOverrides: z.record(z.object({ title: text, content: content.optional(), imageUrl: text.optional() }).passthrough()).optional(),
  customThemeColors: colors.optional(),
  homeBackgroundId: text.nullable().optional(),
  customPlans: z.array(z.object({ id: id.optional(), slot: z.number().int().min(1).max(4),
    name: text, prayerIds: z.array(id), createdAt: z.number().finite().optional() }).passthrough().nullable()).max(4).optional(),
}).passthrough();

export function validateSettingsData(value: unknown): void {
  const result = settings.safeParse(value);
  if (!result.success) {
    const field = result.error.issues[0]?.path.join('.') || 'datos';
    throw new Error(`El respaldo contiene un campo inválido: ${field}.`);
  }
  const ids = new Set<string>();
  const visit = (items: Prayer[]) => {
    for (const item of items) {
      if (item.id) {
        if (ids.has(item.id)) throw new Error('El respaldo contiene identificadores de oración repetidos.');
        ids.add(item.id);
      }
      if (item.prayers) visit(item.prayers);
    }
  };
  visit([...(result.data.userDevotions ?? []), ...(result.data.userPrayers ?? []), ...(result.data.userLetters ?? [])]);
}

export function validatePlanReferences(plans: Array<{ prayerIds: string[] } | null>, prayers: Prayer[]): void {
  const ids = new Set<string>();
  const visit = (items: Prayer[]) => { for (const item of items) { if (item.id) ids.add(item.id); if (item.prayers) visit(item.prayers); } };
  visit(prayers);
  if (plans.some(plan => plan?.prayerIds.some(key => !ids.has(key))))
    throw new Error('El plan hace referencia a una oración que no está disponible. Importa primero su contenido.');
}
