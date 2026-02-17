
import React from 'react';
import { ClipboardList, Settings, BookOpen } from 'lucide-react';
import type { Category, Prayer } from '@/lib/types';
import { DevotionIcon } from '@/components/icons/DevotionIcon';

// Devociones
import { sanJosemariaPrayer } from './prayers/devociones/sanjosemaria';
import { sanJuanPabloIIPrayer } from './prayers/devociones/sanjuanpabloii';
import { sanBenjaminPrayer } from './prayers/devociones/sanbenjamin';
import { sanJuanBautistaPrayer } from './prayers/devociones/sanjuanbautista';
import { sanPedroPrayer } from './prayers/devociones/sanpedro';
import { sanCarloAcutisPrayer } from './prayers/devociones/sancarloacutis';
import { santaTeresaDeLosAndesPrayer } from './prayers/devociones/santateresadelosandes';
import { sanAlbertoHurtadoPrayer } from './prayers/devociones/sanalbertohurtado';
import { beatoAlvaroPrayer } from './prayers/devociones/beatoalvaro';
import { sanFranciscoDeSalesPrayer } from './prayers/devociones/sanfranciscodesales';
import { sanAgustinDeHiponaPrayer } from './prayers/devociones/sanagustindehipona';
import { santoTomasDeAquinoPrayer } from './prayers/devociones/santotomasdeaquino';
import { sanJosePrayer } from './prayers/devociones/sanjose';

// Plan de Vida
import { ofrecimientoDeObras } from './prayers/plan-de-vida/ofrecimiento-obras';
import { oracionManana } from './prayers/plan-de-vida/oracion-manana';
import { oracionTarde } from './prayers/plan-de-vida/oracion-tarde';
import { santaMisa } from './prayers/plan-de-vida/santa-misa';
import { visitaSantisimo } from './prayers/plan-de-vida/visita-santisimo';
import { angelusReginaCoeli } from './prayers/plan-de-vida/angelus-regina-coeli';
import { santoRosario } from './prayers/plan-de-vida/santo-rosario';
import { examenConciencia } from './prayers/plan-de-vida/examen-conciencia';
import { avesMariasPureza } from './prayers/plan-de-vida/aves-marias-pureza';
import { acordaos } from './prayers/plan-de-vida/acordaos';
import { simboloQuicumque } from './prayers/plan-de-vida/simbolo-quicumque';
import { salmoII } from './prayers/plan-de-vida/salmo-ii';
import { adoroTeDevote } from './prayers/plan-de-vida/adoro-te-devote';
import { salveRegina } from './prayers/plan-de-vida/salve-regina';
import { preces } from './prayers/plan-de-vida/preces';
import { viaCrucis } from './prayers/plan-de-vida/via-crucis';
import { camino } from './prayers/plan-de-vida/camino';
import { lecturaEspiritual as lecturaEspiritualTexts } from './prayers/plan-de-vida/lectura-espiritual';
import { cartas } from './prayers/plan-de-vida/cartas';


// Oraciones
import { comunionEspiritual } from './prayers/oraciones/comunion-espiritual';
import { comunionEspiritualAntes } from './prayers/oraciones/comunion-espiritual-antes';
import { oracionPorLasVocaciones } from './prayers/oraciones/oracion-vocaciones';
import { oracionAlEspirituSanto } from './prayers/oraciones/oracion-espiritu-santo';
import { oracionJuventudInquieta } from './prayers/oraciones/oracion-juventud-inquieta';
import { queBienSeEstaContigo } from './prayers/oraciones/que-bien-se-esta-contigo';
import { oracionPorLosDifuntos } from './prayers/oraciones/oracion-difuntos';
import { oracionDeLaFamilia } from './prayers/oraciones/oracion-familia';
import { letaniasHumildad } from './prayers/oraciones/letanias-humildad';
import { estructurales } from './prayers/oraciones/estructurales';

export const categories: Category[] = [
  { 
    id: 'devociones', 
    name: 'Devociones', 
    icon: <DevotionIcon className="size-8" />
  },
  { id: 'plan-de-vida', name: 'Plan de Vida', icon: <ClipboardList className="size-8" /> },
  { 
    id: 'oraciones', 
    name: 'Oraciones', 
    icon: <BookOpen className="size-8" /> 
  },
  { id: 'ajustes', name: 'Ajustes', icon: <Settings className="size-8" /> },
];

const lecturaEspiritual: Prayer = {
  id: 'lectura-espiritual-container',
  title: 'Lectura Espiritual',
  categoryId: 'plan-de-vida',
  prayers: [
    camino,
    ...lecturaEspiritualTexts,
  ]
};

const oracionMesDeMaria: Prayer = {
  id: 'oracion-mes-de-maria',
  title: 'Oración del Mes de María',
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

const oracionAlSagradoCorazonDeJesus: Prayer = {
  id: 'oraciones-varias-predeterminadas-8',
  categoryId: 'oraciones',
  title: 'Oración al Sagrado Corazón de Jesús',
  content: `Rendido a tus pies, ¡oh Jesús mío!, considerando las inefables muestras de amor que me has dado y las  sublimes lecciones que me enseña de continuo tu adorable Corazón, te pido humildemente la gracia de conocerte,  amarte y servirte como fiel dicípulo tuyo para hacerme digno de las mercedes y bendiciones que, generoso, concedes a los que de veras te conocen, aman y sirven.

¡Mira que soy muy pobre, dulcísimo Jesús, y necesito de Ti como el mendigo de la limosna! ¡Mira que soy muy rudo, oh soberano Maestro!, y necesito de tus divinas enseñanzas, para  luz y guía de mi ignorancia! ¡Mira que soy muy débil, oh poderosísimo amparo de los frágiles, y caigo a cada paso y necesito apoyarme en Ti, para no desfallecer!

Sé todo para mí, Sagrado Corazón; socorro de  mi miseria, lumbre de mis ojos, báculo de mis pasos, remedio de mis males, auxilio en toda necesidad. De Ti lo espera todo  mi pobre corazón. Tú lo alentaste y convidaste, cuando, con tan tiernos acentos, dijiste repetidas veces en tu Evangelio: "Venid a mí, aprended de mí, pedid, llamad..." A las puertas de tu Corazón vengo, pues hoy, y llamo y pido y espero. Del mío te hago firme, formal, y decidida entrega. Tómalo y dame en cambio lo que sabes que me ha de hacer bueno en la Tierra y dichoso para la eternidad.

Amén.`
};

export const initialPrayers: Prayer[] = [
  // Devociones
  sanJosemariaPrayer,
  sanJuanPabloIIPrayer,
  sanBenjaminPrayer,
  sanJuanBautistaPrayer,
  sanPedroPrayer,
  sanCarloAcutisPrayer,
  santaTeresaDeLosAndesPrayer,
  sanAlbertoHurtadoPrayer,
  beatoAlvaroPrayer,
  sanFranciscoDeSalesPrayer,
  sanAgustinDeHiponaPrayer,
  santoTomasDeAquinoPrayer,
  sanJosePrayer,

  // Plan de Vida
  ofrecimientoDeObras,
  oracionManana,
  santaMisa,
  visitaSantisimo,
  angelusReginaCoeli,
  santoRosario,
  oracionMesDeMaria,
  lecturaEspiritual,
  oracionTarde,
  examenConciencia,
  cartas,
  avesMariasPureza,
  acordaos,
  simboloQuicumque,
  salmoII,
  adoroTeDevote,
  salveRegina,
  preces,
  viaCrucis,
  
  // Oraciones Varias
  estructurales,
  comunionEspiritualAntes,
  comunionEspiritual,
  oracionPorLasVocaciones,
  oracionAlEspirituSanto,
  oracionJuventudInquieta,
  queBienSeEstaContigo,
  oracionPorLosDifuntos,
  oracionDeLaFamilia,
  oracionAlSagradoCorazonDeJesus,
  letaniasHumildad
];
