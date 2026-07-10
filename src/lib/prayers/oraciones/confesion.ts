import type { Prayer } from '@/lib/types';
import { actoContricion } from './fundamentales';

const actoContricionConfesion: Prayer = {
  ...actoContricion,
  id: 'confesion-acto-contricion',
};

export const preparacionConfesion: Prayer = {
  id: 'confesion-preparacion',
  title: 'Preparación para la Confesión',
  categoryId: 'oraciones',
  content: {
    español: `*Preparación*

Señor, quiero acercarme a tu misericordia con sinceridad, sin excusas y sin miedo.

Dame luz para reconocer mis pecados, dolor verdadero por haberte ofendido y confianza filial para volver a empezar.

Espíritu Santo, ayúdame a confesarme con claridad, humildad y esperanza.

Amén.`,
    latin: `*Praeparatio*

Domine, ad misericordiam tuam sincere, sine excusationibus et sine timore accedere volo.

Da mihi lumen ut peccata mea agnoscam, verum dolorem quia te offendi, et fiduciam filialem ut iterum incipiam.

Spiritus Sancte, adiuva me ut clare, humiliter et cum spe confitear.

Amen.`,
  },
};

export const examenConfesion: Prayer = {
  id: 'confesion-examen-conciencia',
  title: 'Examen de conciencia para la Confesión',
  categoryId: 'oraciones',
  content: `*Examen de conciencia*

Pide luz al Espíritu Santo y revisa tu vida con paz, sin escribir listas sensibles ni guardar detalles innecesarios.

*Dios*

- ¿He buscado a Dios de verdad o lo he dejado para después?
- ¿He rezado con atención y constancia?
- ¿He faltado voluntariamente a la Misa dominical o a días de precepto?
- ¿He recibido los sacramentos con fe y reverencia?

*Los demás*

- ¿He faltado a la caridad con palabras, juicios, indiferencia o impaciencia?
- ¿He mentido, manipulado o dañado la fama de alguien?
- ¿He perdonado o sigo alimentando rencores?
- ¿He sido justo y generoso en mi familia, estudio, trabajo y amistades?

*Uno mismo*

- ¿He cuidado la pureza del corazón, la mirada y las acciones?
- ¿He sido sobrio en comida, bebida, pantallas y descansos?
- ¿He aprovechado el tiempo y cumplido mis deberes?
- ¿He consentido pensamientos, deseos o acciones contrarios al amor de Dios?

Termina el examen eligiendo qué confesar con sencillez y qué propósito concreto quieres pedirle al Señor.`,
};

export const guiaConfesion: Prayer = {
  id: 'confesion-guia',
  title: 'Guía breve de cómo confesarse',
  categoryId: 'oraciones',
  content: `*Cómo confesarse*

1. Saluda al sacerdote.
2. Di cuánto tiempo ha pasado desde tu última confesión.
3. Confiesa tus pecados con claridad y humildad.
4. Escucha al sacerdote.
5. Reza el acto de contrición.
6. Recibe la absolución.
7. Cumple la penitencia.

No hace falta explicar de más. Basta hablar con verdad, arrepentimiento y confianza en la misericordia de Dios.`,
};

export const accionGraciasConfesion: Prayer = {
  id: 'confesion-accion-gracias',
  title: 'Acción de gracias después de la Confesión',
  categoryId: 'oraciones',
  content: {
    español: `*Acción de gracias*

Gracias, Señor, por perdonarme y recibirme de nuevo como hijo.

Haz que no olvide tu misericordia. Dame un corazón limpio, humilde y agradecido, y ayúdame a vivir con más amor desde ahora.

Virgen María, Madre de misericordia, acompáñame y enséñame a ser fiel.

Amén.`,
    latin: `*Gratiarum actio*

Gratias tibi ago, Domine, quia mihi pepercisti et me iterum sicut filium suscepisti.

Fac ut misericordiam tuam non obliviscar. Da mihi cor mundum, humile et gratum, atque adiuva me ut posthac maiore amore vivam.

Virgo Maria, Mater misericordiae, me comitare et doce me fidelem esse.

Amen.`,
  },
};

export const propositoConfesion: Prayer = {
  id: 'confesion-proposito',
  title: 'Propósito concreto después de confesarse',
  categoryId: 'oraciones',
  content: `*Propósito concreto*

Elige un propósito sencillo, realista y espiritual. No guardes aquí listas de pecados ni notas sensibles.

Puede ayudarte formularlo así:

- Señor, con tu gracia, hoy voy a cuidar especialmente...
- Cuando aparezca la tentación, voy a responder con...
- Para reparar y crecer en amor, haré...

Que sea concreto, breve y fácil de recordar. Lo importante es volver a empezar con confianza.`,
};

export const confesionPrayers: Prayer[] = [
  preparacionConfesion,
  examenConfesion,
  actoContricionConfesion,
  guiaConfesion,
  accionGraciasConfesion,
  propositoConfesion,
];
