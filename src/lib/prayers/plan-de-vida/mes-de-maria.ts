import type { Prayer } from '@/lib/types';

export const mesdeMaria: Prayer = {
  id: 'mes-de-maria',
  title: 'Mes de María',
  categoryId: 'plan-de-vida',
  isDaySpecific: true,
  prayers: [
    {
      id: 'oracion-mes-de-maria-inicial',
      title: 'Oración Inicial',
      categoryId: 'plan-de-vida',
      isLongText: true,
      content: `¡Oh, María!, durante el bello mes que te está consagrado, todo resuena con tu Nombre y alabanza. Tu Santuario resplandece con nuevo brillo y nuestras manos te han elevado un trono de gracia y de amor, desde donde presides nuestras fiestas y escuchas nuestras oraciones y votos.

Para honrarte, hemos esparcido frescas flores a tus pies y adornado tu frente con guirnaldas y coronas. Mas, ¡oh, María!, no te das por satisfecha con estos homenajes; hay flores cuya frescura y lozanía jamás pasan y coronas que no se marchitan. Estas son las que Tú esperas de tus hijos, porque el más hermoso adorno de una madre es la piedad de sus hijos y la más bella corona que pueden poner a sus pies es la de sus virtudes.

Sí, los lirios que Tú nos pides son la inocencia de nuestros corazones. Nos esforzaremos pues, durante el curso de este mes consagrado a tu gloria, ¡oh, Virgen Santa! en conservar nuestras almas puras y sin mancha, y en separar de nuestros pensamientos, deseos y miradas, aún la sombra misma del mal.

La rosa, cuyo brillo agrada a tus ojos es la caridad, el amor a Dios y a nuestros hermanos. Nos amaremos pues los unos a los otros como hijos de una misma familia cuya madre eres, viviendo todos en la dulzura de una concordia fraternal.

En este mes bendito, procuraremos cultivar en nuestros corazones la humildad, modesta flor que te es tan querida y con tu auxilio llegaremos a ser puros, humildes, caritativos, pacientes y esperanzados.

¡Oh, María!, haz producir en el fondo de nuestros corazones todas estas amables virtudes, que ellas broten, florezcan y den al fin frutos de gracia, para poder ser algún día dignos hijos de la más Santa y de la mejor de las madres. Amén.`
    },
    {
      id: 'oracion-mes-de-maria-final',
      title: 'Oración Final',
      categoryId: 'plan-de-vida',
      isLongText: true,
      content: `¡Oh María, Madre de Jesús nuestro Salvador y nuestra buena madre! Nosotros venimos a ofrecerte con estos obsequios que colocamos a tus pies, nuestros corazones deseosos de agradecerte y solicitar de tu bondad un nuevo ardor en tu santo servicio.

Dígnate presentarnos a tu Divino Hijo que, en vista de sus méritos y a nombre su Santa Madre, dirija nuestros pasos por el sendero de la virtud, que haga lucir con nuevo esplendor la luz de la fe sobre los infortunados pueblos que gimen por tanto tiempo en las tinieblas del error; que vuelvan hacia Él y cambien tantos corazones rebeldes, cuya penitencia regocijará en su corazón y el tuyo.

Que convierta a los enemigos de tu Iglesia, y que, en fin, encienda por todas partes el fuego de tu ardiente caridad; que nos colme de alegría en medio de las tribulaciones de esta vida y de esperanza para el porvenir. Amén.`
    }
  ],
};
