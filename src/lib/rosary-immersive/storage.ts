import { z } from 'zod';
import type { Jaculatoria } from './types';

const intentionsSchema = z.array(z.string());
const jaculatoriasSchema = z.array(z.object({ v: z.string(), r: z.string() }));

export function parseRosaryIntentions(raw: string | null): string[] {
  return raw === null ? [] : intentionsSchema.parse(JSON.parse(raw));
}

export function parseRosaryJaculatorias(raw: string | null): Jaculatoria[] | null {
  return raw === null ? null : jaculatoriasSchema.parse(JSON.parse(raw));
}
