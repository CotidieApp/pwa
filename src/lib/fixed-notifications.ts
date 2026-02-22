export type FixedNotificationEntry = {
  date: string; // HH:MM | DD HH:MM | DD/MM HH:MM | DD/MM/AAAA HH:MM | l/m/w/j/v/s/d + 1/2/3/4/u HH:MM
  title: string;
  text: string;
  route?: string; // e.g. "inicio/plan-de-vida/Santa-Misa"
  image?: string; // URL o path local para banner (Android: largeIcon, iOS: attachment)
  devOnly?: boolean; // si es true, solo se programa cuando el modo desarrollador está activo
};

export const fixedNotifications: FixedNotificationEntry[] = [
  {
    date: '3/10 9:00', // Aniversario Cotidie
    title: '#{year-2025} aniversaio de Cotidie',
    text: 'Conmemoramos el día en el que nació como un mero proyecto esta aplicación. ¡Gracias por formar parte de esta comunidad!'
  },
  {
    date: 'j1 9:00', // Recuerdo a las vocaciones
    title: 'Oración por las vocaciones',
    text: 'Unámonos en oración este primer jueves de mes por las vocaciones al sacerdocio que tanta falta hacen en la actualidad.',
    route: 'inicio/oraciones/oracion-por-las-vocaciones'
  },
  {
    date: 'd1 9:00', // Recuerdo al Papa
    title: 'Oración por el Papa',
    text: 'Dediquemos los rezos de este primer domingo de mes por el Papa, cabeza de la Iglesia, y por todos los obispos, pastores de esta comunidad.',
    route: 'inicio/oracion/oracion-por-el-papa'
  },
  {
    date: '25/12 7:00', // Navidad
    title: '¡Feliz Navidad!',
    text: 'Desde Cotidie les deseamos una muy feliz Navidad y un próspero {year+1}.',
    image: './nativity.jpeg'
  },
  // Fiestas principales (hora sugerida 09:00)
  {
    date: '01/01 09:00', // Santa María, Madre de Dios
    title: 'Santa María, Madre de Dios',
    text: 'En esta solemnidad, encomienda el año nuevo a la intercesión de María y comienza este día con gratitud.'
  },
  {
    date: '06/01 09:00', // Epifanía del Señor
    title: 'Epifanía del Señor',
    text: 'En esta solemnidad, adora al Señor manifestado a las naciones y ofrécele tus mejores dones.'
  },
  {
    date: '02/02 09:00', // Presentación del Señor
    title: 'Presentación del Señor',
    text: 'Cristo es la luz del mundo: enciende tu fe y preséntale tu vida.'
  },
  {
    date: '19/03 09:00', // San José
    title: 'San José',
    text: 'Pide a San José un corazón fiel y trabajador para servir en lo cotidiano.',
    image: './san-jose.jpg'
  },
  {
    date: '25/03 09:00', // Anunciación del Señor
    title: 'Anunciación del Señor',
    text: 'Di tu hágase al Señor y renueva tu confianza en su plan.'
  },
  {
    date: '06/08 09:00', // Transfiguración del Señor
    title: 'Transfiguración del Señor',
    text: 'Contempla la gloria de Cristo y deja que ilumine tu camino.'
  },
  {
    date: '15/08 09:00', // Asunción de la Virgen María
    title: 'Asunción de la Virgen María',
    text: 'Alégrate con María en el cielo y confía tu vida a su protección.'
  },
  {
    date: '14/09 09:00', // Exaltación de la Santa Cruz
    title: 'Exaltación de la Santa Cruz',
    text: 'Abraza la cruz con esperanza: en ella está nuestra salvación.'
  },
  {
    date: '29/09 09:00', // Santos Arcángeles
    title: 'Santos Arcángeles',
    text: 'Pide la ayuda de los Arcángeles en tu lucha diaria y en tu camino de fe.'
  },
  {
    date: '01/11 09:00', // Todos los Santos
    title: 'Todos los Santos',
    text: 'Celebra la comunión de los santos y renueva tu llamado a la santidad.'
  },
  {
    date: '02/11 09:00', // Fieles Difuntos
    title: 'Fieles Difuntos',
    text: 'Reza por las almas del purgatorio y por tus seres queridos difuntos.'
  },
  {
    date: '08/12 09:00', // Inmaculada Concepción
    title: 'Inmaculada Concepción',
    text: 'Contempla la pureza de María y consagra tu corazón a su cuidado.'
  },
];

// Ejemplo:
// {
//   date: '19/02/2026 07:30', // solo en esa fecha
//   title: 'Oración fija - {weekday}',
//   text: 'Texto de la notificación. Año {year}, fecha {date}.',
// },
// {
//   date: '07:30', // diario a esa hora
//   title: 'Todos los días',
//   text: 'Hoy es {date}.',
//   route: 'inicio/plan-de-vida/Santa-Misa',
// },
// {
//   date: '25 12:00', // cada mes el día 25
//   title: 'Día 25',
//   text: 'Hoy es {date}.',
// },
// {
//   date: '25/12 12:00', // cada año el 25/12
//   title: 'Navidad',
//   text: 'Feliz {year}.',
// },
// {
//   date: 'w2 18:30', // segundo miércoles del mes a las 18:30
//   title: 'Miércoles del mes',
//   text: 'Hoy es {date}.',
// },