import type { Prayer } from '@/lib/types';
import { caminoPart1 } from './camino-content/part-1';
import { caminoPart2 } from './camino-content/part-2';
import { caminoPart3 } from './camino-content/part-3';
import { caminoPart4 } from './camino-content/part-4';
import { caminoPart5 } from './camino-content/part-5';
import { caminoPart6 } from './camino-content/part-6';
import { caminoPart7 } from './camino-content/part-7';

export const camino: Prayer = {
  id: 'camino-libro',
  title: 'Camino',
  categoryId: 'plan-de-vida',
  isLongText: true,
  content: caminoPart1 + caminoPart2 + caminoPart3 + caminoPart4 + caminoPart5 + caminoPart6 + caminoPart7,
};
