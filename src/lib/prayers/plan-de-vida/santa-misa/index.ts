import type { Prayer } from '@/lib/types';
import { LITURGY_MASS_ID } from '@/lib/liturgy-hours';
import { antesMisaPrayers } from './antes';
import { despuesMisaPrayers } from './despues';
import { misal } from './misal';

export const santaMisa: Prayer = {
  id: 'santa-misa',
  title: 'Santa Misa',
  categoryId: 'plan-de-vida',
  prayers: [
    {
      id: 'santa-misa-antes',
      title: 'Antes',
      categoryId: 'plan-de-vida',
      prayers: antesMisaPrayers,
    },
    misal,
    {
      id: LITURGY_MASS_ID,
      title: 'Lecturas de la Misa',
      categoryId: 'plan-de-vida',
    },
    {
      id: 'santa-misa-despues',
      title: 'Después',
      categoryId: 'plan-de-vida',
      prayers: despuesMisaPrayers,
    }
  ]
};
