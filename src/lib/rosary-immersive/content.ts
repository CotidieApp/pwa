import type { Jaculatoria, MysteryType } from './types';

export const PRAYERS_TEXT = {
  padre_nuestro: `Padre nuestro, que estás en el cielo, santificado sea tu Nombre; venga a nosotros tu reino; hágase tu voluntad en la tierra como en el cielo. Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal. Amén.`,
  ave_maria: `Dios te salve, María, llena eres de gracia; el Señor es contigo; bendita Tú eres entre todas las mujeres, y bendito es el fruto de tu vientre, Jesús. Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte. Amén.`,
  gloria: `Gloria al Padre, y al Hijo, y al Espíritu Santo. Como era en el principio, ahora y siempre, por los siglos de los siglos. Amén.`,
  jaculatoria: `¡Oh Jesús mío! Perdona nuestros pecados, líbranos del fuego del infierno, lleva al cielo a todas las almas, especialmente a las más necesitadas de tu misericordia.`,
  start: `Ofrecemos este misterio por...`,
};

export const DEFAULT_JACULATORIAS: Jaculatoria[] = [
  { v: 'Sagrado Corazón de Jesús', r: 'En vos confío' },
  { v: 'Dulce e inmaculado Corazón de María', r: 'Sé la salvación nuestra' },
  { v: 'San José y todos los santos', r: 'Rueguen por nosotros' },
  { v: 'Santa María, Esperanza nuestra, Asiento de la Sabiduría', r: 'Ruega por nosotros' },
];

const ADORACION_SANTISIMO_TEXT_1 = `Bendito sea Jesús en el Santísimo Sacramento.

${PRAYERS_TEXT.padre_nuestro}

${PRAYERS_TEXT.ave_maria}

${PRAYERS_TEXT.gloria}`;

const ADORACION_SANTISIMO_TEXT_2 = `Bendito sea Jesús en el Santísimo Sacramento.

${PRAYERS_TEXT.padre_nuestro}

${PRAYERS_TEXT.ave_maria}

${PRAYERS_TEXT.gloria}`;

const ADORACION_SANTISIMO_TEXT_3 = `Bendito sea Jesús en el Santísimo Sacramento.

${PRAYERS_TEXT.padre_nuestro}

${PRAYERS_TEXT.ave_maria}

${PRAYERS_TEXT.gloria}`;

const ADORACION_SANTISIMO_TEXT_4 = 'Bendito sea Jesús en el Santísimo Sacramento.';

const COMUNION_ESPIRITUAL_TEXT = `Yo quisiera, Señor, recibiros con aquella pureza, humildad y devoción con que os recibió vuestra Santísima Madre, con el espíritu y fervor de los santos.`;

const SENAL_DE_LA_CRUZ_TEXT = `Por la señal † de la Santa Cruz, de nuestros † enemigos, líbranos, Señor, † Dios nuestro. En el nombre del Padre, y del Hijo, † y del Espíritu Santo. Amén.`;

const ACTO_CONTRICION_TEXT = `Señor mío Jesucristo, Dios y hombre verdadero, Creador, Padre y Redentor mío; por ser Tú quien eres y porque te amo sobre todas las cosas, me pesa de todo corazón haberte ofendido. Propongo firmemente enmendarme y nunca más pecar; confesarme a su tiempo y cumplir la penitencia que me fuera impuesta.

Te ofrezco, Señor, mi vida, obras y trabajos en satisfacción de mis pecados. Así como te lo suplico, así confío en tu bondad y misericordia infinitas, que me los perdonarás y me darás gracia para perseverar en tu santo servicio hasta el fin de mi vida.
Amén.

Abre + Señor mis labios.
Y mi boca proclamará tus alabanzas.

Ven + oh Dios, en mi ayuda.
Apresúrate, Señor, a socorrerme.`;

export const SALVE_TEXT = `Dios te salve, Reina y Madre de misericordia, vida, dulzura y esperanza nuestra; Dios te salve. A Ti llamamos los desterrados hijos de Eva; a Ti suspiramos, gimiendo y llorando, en este valle de lágrimas. Ea, pues, Señora, abogada nuestra, vuelve a nosotros esos tus ojos misericordiosos; y después de este destierro muéstranos a Jesús, fruto bendito de tu vientre. ¡Oh clementísima, oh piadosa, oh dulce Virgen María! Ruega por nosotros, Santa Madre de Dios, para que seamos dignos de alcanzar las promesas de Nuestro Señor Jesucristo. Amén.`;

export const PRE_ROSARY_STEPS = [
  { type: 'adoracion', label: 'Adoración', content: ADORACION_SANTISIMO_TEXT_1 },
  { type: 'adoracion', label: 'Adoración', content: ADORACION_SANTISIMO_TEXT_2 },
  { type: 'adoracion', label: 'Adoración', content: ADORACION_SANTISIMO_TEXT_3 },
  { type: 'adoracion', label: 'Adoración', content: ADORACION_SANTISIMO_TEXT_4 },
  { type: 'comunion', label: 'Comunión Espiritual', content: COMUNION_ESPIRITUAL_TEXT },
  { type: 'senal_cruz', label: 'Señal de la Cruz', content: SENAL_DE_LA_CRUZ_TEXT },
  { type: 'acto_contricion', label: 'Acto de contrición', content: ACTO_CONTRICION_TEXT },
  { type: 'gloria', label: 'Gloria', content: PRAYERS_TEXT.gloria },
];

export const MYSTERY_COLORS: Record<MysteryType, string> = {
  gozosos: 'from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950',
  luminosos: 'from-yellow-100 to-amber-100 dark:from-yellow-950 dark:to-amber-950',
  dolorosos: 'from-rose-100 to-red-100 dark:from-rose-950 dark:to-red-950',
  gloriosos: 'from-sky-100 to-blue-100 dark:from-sky-950 dark:to-blue-950',
};

export const MYSTERY_IMAGES: Record<MysteryType, string> = {
  gozosos: '/images/nativity.jpeg',
  luminosos: '/images/eucharist.jpeg',
  dolorosos: '/images/crucifixion.jpeg',
  gloriosos: '/images/resurrection.jpeg',
};

// Placeholder for user-defined or specific mystery images
// Format: 'type-index' (e.g. 'gozoso-1') -> url
export const MYSTERY_SPECIFIC_IMAGES: Record<string, string> = {
  // Misterios Gozosos
  'gozoso-1': '/images/rosario/gozoso-1.jpg',
  'gozoso-2': '/images/rosario/gozoso-2.jpg',
  'gozoso-3': '/images/rosario/gozoso-3.jpg',
  'gozoso-4': '/images/rosario/gozoso-4.jpg',
  'gozoso-5': '/images/rosario/gozoso-5.jpg',
  // Misterios Luminosos
  'luminoso-1': '/images/rosario/luminoso-1.jpg',
  'luminoso-2': '/images/rosario/luminoso-2.jpg',
  'luminoso-3': '/images/rosario/luminoso-3.jpg',
  'luminoso-4': '/images/rosario/luminoso-4.jpg',
  'luminoso-5': '/images/rosario/luminoso-5.jpg',
  // Misterios Dolorosos
  'doloroso-1': '/images/rosario/doloroso-1.jpg',
  'doloroso-2': '/images/rosario/doloroso-2.jpg',
  'doloroso-3': '/images/rosario/doloroso-3.jpg',
  'doloroso-4': '/images/rosario/doloroso-4.jpg',
  'doloroso-5': '/images/rosario/doloroso-5.jpg',
  // Misterios Gloriosos
  'glorioso-1': '/images/rosario/glorioso-1.jpg',
  'glorioso-2': '/images/rosario/glorioso-2.jpg',
  'glorioso-3': '/images/rosario/glorioso-3.jpg',
  'glorioso-4': '/images/rosario/glorioso-4.jpg',
  'glorioso-5': '/images/rosario/glorioso-5.jpg',
};

export const MYSTERY_NAMES: Record<MysteryType, string> = {
  gozosos: 'Misterios Gozosos',
  luminosos: 'Misterios Luminosos',
  dolorosos: 'Misterios Dolorosos',
  gloriosos: 'Misterios Gloriosos',
};

export const FULL_MYSTERY_TITLES: Record<string, string> = {
  'gozoso-1': 'La Encarnación del Hijo de Dios',
  'gozoso-2': 'La Visitación de la Virgen María a su prima Santa Isabel',
  'gozoso-3': 'El Nacimiento del Hijo de Dios en Belén',
  'gozoso-4': 'La Presentación del Señor en el Templo',
  'gozoso-5': 'El Niño Jesús perdido y hallado en el Templo',
  'luminoso-1': 'El Bautismo del Señor en el Jordán',
  'luminoso-2': 'La autorrevelación de Jesús en las bodas de Caná',
  'luminoso-3': 'El Anuncio del Reino de Dios y la invitación a la conversión',
  'luminoso-4': 'La Transfiguración del Señor',
  'luminoso-5': 'La Institución de la Eucaristía',
  'doloroso-1': 'La Oración de Jesús en el Huerto',
  'doloroso-2': 'La Flagelación del Señor',
  'doloroso-3': 'La Coronación de espinas',
  'doloroso-4': 'Jesús con la Cruz a cuestas',
  'doloroso-5': 'La Crucifixión y Muerte del Señor',
  'glorioso-1': 'La Resurrección del Señor',
  'glorioso-2': 'La Ascensión del Señor',
  'glorioso-3': 'La Venida del Espíritu Santo',
  'glorioso-4': 'La Asunción de la Virgen María',
  'glorioso-5': 'La Coronación de la Virgen María',
};

export const JACULATORIAS_STORAGE_KEY = 'rosary_jaculatorias';
