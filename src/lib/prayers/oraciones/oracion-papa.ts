import type { Prayer } from '@/lib/types';

export const oracionporelPapa: Prayer = {
  id: 'oracion-papa',
  categoryId: 'oraciones',
  title: 'Oración por el Papa',
  content: {
    español: `Dios nuestro, Pastor eterno,
mira con bondad a tu Iglesia
y guía con tu amor al Papa León XIV,
a quien has puesto como pastor de tu pueblo.
Concédele espíritu de sabiduría y fortaleza,
para que conduzca fielmente a quienes le has confiado
y edifique a tu Iglesia en la unidad y la paz.
Por Jesucristo nuestro Señor. 
Amén.

Por las intenciones y salud del Papa.

_Padre Nuestro, Ave María, Gloria._`,
    latin: `Deus noster, Pastor aeterne,
Ecclesiam tuam benignus respice
et amore tuo Papam Leonem XIV dirige,
quem pastorem populi tui constituisti.
Concede ei spiritum sapientiae et fortitudinis,
ut fideles sibi commissos fideliter regat
et Ecclesiam tuam in unitate et pace aedificet.
Per Christum Dominum nostrum.
Amen.

Pro intentionibus et valetudine Papae.

_Pater Noster, Ave Maria, Gloria._`
  },
  imageUrl: '/images/papa-leon.jpeg',
  imageHint: 'Papa León XIV'
};