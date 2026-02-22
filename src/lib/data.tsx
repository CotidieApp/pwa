
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
import { oracionAlSagradoCorazonDeJesus } from './prayers/oraciones/oracion-al-sagrado-corazon';

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
  
  // Oraciones Varias
  estructurales,
  comunionEspiritualAntes,
  comunionEspiritual,
  oracionporelPapa,
  oracionPorLasVocaciones,
  oracionAlEspirituSanto,
  oracionJuventudInquieta,
  queBienSeEstaContigo,
  oracionPorLosDifuntos,
  oracionDeLaFamilia,
  oracionAlSagradoCorazonDeJesus,
  letaniasHumildad
];
