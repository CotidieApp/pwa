
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
import { lecturaNuevoTestamento } from './prayers/plan-de-vida/lectura-nuevo-testamento';
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
import { mesdeMaria } from './prayers/plan-de-vida/mes-de-maria';
import { preces } from './prayers/plan-de-vida/preces';
import { viaCrucis } from './prayers/plan-de-vida/via-crucis';
import { camino } from './prayers/plan-de-vida/camino';
import { lecturaEspiritual as lecturaEspiritualTexts } from './prayers/plan-de-vida/lectura-espiritual';
import { cartas } from './prayers/plan-de-vida/cartas';


// Oraciones
import { comunionEspiritual } from './prayers/oraciones/comunion-espiritual';
import { comunionEspiritualAntes } from './prayers/oraciones/comunion-espiritual-antes';
import { oracionPorLasVocaciones } from './prayers/oraciones/oracion-vocaciones';
import { oracionporelPapa } from './prayers/oraciones/oracion-papa';
import { oracionAlEspirituSanto } from './prayers/oraciones/oracion-espiritu-santo';
import { oracionJuventudInquieta } from './prayers/oraciones/oracion-juventud-inquieta';
import { queBienSeEstaContigo } from './prayers/oraciones/que-bien-se-esta-contigo';
import { oracionPorLosDifuntos } from './prayers/oraciones/oracion-difuntos';
import { oracionDeLaFamilia } from './prayers/oraciones/oracion-familia';
import { letaniasHumildad } from './prayers/oraciones/letanias-humildad';
import { estructurales } from './prayers/oraciones/estructurales';
import { venicreator } from './prayers/oraciones/veni-creator';
import { pangelingua } from './prayers/oraciones/pange-lingua';
import { tedeum } from './prayers/oraciones/te-deum';
import { oracionAlSagradoCorazonDeJesus } from './prayers/oraciones/oracion-al-sagrado-corazon';
import { exposicionBendicion } from './prayers/oraciones/exposicion-bendicion';
import {
  actoContricion,
  angelGuarda,
  bendicionMesa,
  magnificat,
  consagracionVirgen,
  almaDeCristo,
  oracionSanFrancisco,
  aceptacionMuerte,
  oracionTrabajo
} from './prayers/oraciones/fundamentales';

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
    {
      id: 'lectura-espiritual-predeterminadas',
      title: 'Predeterminadas',
      categoryId: 'plan-de-vida',
      prayers: [
        camino,
        ...lecturaEspiritualTexts,
      ],
    },
    {
      id: 'lectura-espiritual-personales',
      title: 'Personales',
      categoryId: 'plan-de-vida',
      content: 'EPUBs personales para lectura espiritual.',
    },
  ]
};

const oracionesSubcategories: Prayer[] = [
  {
    id: 'subcat-comunes',
    title: 'Oraciones Comunes',
    categoryId: 'oraciones',
    imageUrl: '/images/resurrection.jpeg',
    prayers: [
      ...estructurales.prayers!,
      actoContricion,
      angelGuarda,
      bendicionMesa,
      comunionEspiritualAntes,
      comunionEspiritual,
    ]
  },
  {
    id: 'subcat-marianas',
    title: 'Devoción Mariana',
    categoryId: 'oraciones',
    imageUrl: '/images/immaculate-conception.jpeg',
    prayers: [
      acordaos,
      magnificat,
      consagracionVirgen,
      avesMariasPureza,
      salveRegina,
    ]
  },
  {
    id: 'subcat-espiritu',
    title: 'Al Espíritu Santo',
    categoryId: 'oraciones',
    imageUrl: '/images/holy-family.jpeg', // Fallback image
    prayers: [
      oracionAlEspirituSanto,
      venicreator,
    ]
  },
  {
    id: 'subcat-momentos',
    title: 'Momentos del Día',
    categoryId: 'oraciones',
    imageUrl: '/images/eucharist.jpeg',
    prayers: [
      oracionTrabajo,
      oracionJuventudInquieta,
      queBienSeEstaContigo,
      aceptacionMuerte,
    ]
  },
  {
    id: 'subcat-santos',
    title: 'Intercesión y Santos',
    categoryId: 'oraciones',
    imageUrl: '/images/holy-family.jpeg',
    prayers: [
      oracionporelPapa,
      oracionPorLasVocaciones,
      oracionPorLosDifuntos,
      oracionDeLaFamilia,
      oracionSanFrancisco,
      almaDeCristo,
    ]
  },
  {
    id: 'subcat-himnos',
    title: 'Himnos y Letanías',
    categoryId: 'oraciones',
    imageUrl: '/images/crucifixion.jpeg',
    prayers: [
      oracionAlSagradoCorazonDeJesus,
      letaniasHumildad,
      pangelingua,
      tedeum,
      exposicionBendicion,
    ]
  }
];

export const initialPrayers: Prayer[] = [
  // Devociones
  sanJosemariaPrayer,
  sanJuanPabloIIPrayer,
  sanJuanBautistaPrayer,
  sanPedroPrayer,
  sanCarloAcutisPrayer,
  santaTeresaDeLosAndesPrayer,
  sanAlbertoHurtadoPrayer,
  sanBenjaminPrayer,
  beatoAlvaroPrayer,
  sanFranciscoDeSalesPrayer,
  sanAgustinDeHiponaPrayer,
  santoTomasDeAquinoPrayer,
  sanJosePrayer,

  // Plan de Vida
  ofrecimientoDeObras,
  oracionManana,
  santaMisa,
  lecturaNuevoTestamento,
  visitaSantisimo,
  mesdeMaria,
  angelusReginaCoeli,
  santoRosario,
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

  // Oraciones Varias (Agrupadas)
  ...oracionesSubcategories,
];
