import { getChileanMassSelection, type ChileanLiturgicalDay } from './liturgy-chile';
import type { LiturgyReading, LiturgySection } from './liturgy-hours-reader';

const LECTIONARY_PATH = '/liturgy/lectionary-cl.json.gz';
const { inflate } = require('pako') as { inflate: (input: Uint8Array) => Uint8Array };

type Passage = { c?: string; h?: string; i?: string; x: string };
type Form = {
  id: string;
  lb?: string;
  y?: string;
  p: { s: string; o: Passage[] }[];
};
export type Lectionary = Record<string, Form[]>;

const celebrations: Partial<Record<string, string>> = {
  mary_mother_of_god: 'md:01-01',
  epiphany_of_the_lord: 'md:01-06',
  baptism_of_the_lord: 'bautismo',
  sunday_of_the_word_of_god: 'dda:dom:3',
  joseph_spouse_of_mary: 'md:03-19',
  annunciation_of_the_lord: 'md:03-25',
  exaltation_of_the_holy_cross: 'chile:santa-cruz',
  philip_and_james_apostles: 'md:05-03',
  our_lord_jesus_christ_the_eternal_high_priest: 'chile:sumo-sacerdote',
  teresa_of_jesus_of_los_andes_virgin: 'chile:teresa-andes',
  our_lady_of_mount_carmel: 'chile:carmen',
  rose_of_lima_virgin: 'md:08-30',
  our_lady_of_guadalupe: 'md:12-12',
  immaculate_conception_of_the_blessed_virgin_mary: 'md:12-08',
  nativity_of_the_lord: 'md:12-25',
  holy_family_of_jesus_mary_and_joseph: 'sagrada-familia',
  second_sunday_after_christmas: 'nav:dom2',
  ash_wednesday: 'cen:3',
  palm_sunday_of_the_passion_of_the_lord: 'ramos',
  thursday_of_the_lords_supper: 'jueves-santo',
  friday_of_the_passion_of_the_lord: 'viernes-santo',
  holy_saturday: 'vigilia-pascual',
  easter_sunday: 'pascua-dia',
  divine_mercy_sunday: 'pas:dom:2',
  ascension_of_the_lord: 'ascension',
  pentecost_sunday: 'pentecostes',
  mary_mother_of_the_church: 'chile:madre-iglesia',
  most_holy_trinity: 'trinidad',
  most_holy_body_and_blood_of_christ: 'corpus',
  most_sacred_heart_of_jesus: 'sagrado-corazon',
  our_lord_jesus_christ_king_of_the_universe: 'cristo-rey',
};

const seasonKeys: Partial<Record<string, string>> = {
  ordinary_time: 'dda', advent: 'adv', lent: 'cuar', easter_time: 'pas',
};

function formKey(date: Date, id: string, rank: string) {
  const weekday = date.getDay();
  const mmdd = [date.getMonth() + 1, date.getDate()].map(n => String(n).padStart(2, '0')).join('-');
  if (id === 'exaltation_of_the_holy_cross' && mmdd === '09-14') return 'md:09-14';
  if (celebrations[id]) return celebrations[id];

  const week = id.match(/^(ordinary_time|advent|lent|easter_time)_(\d+)_[a-z]+$/);
  if (week) {
    const season = seasonKeys[week[1]];
    return weekday === 0 ? `${season}:dom:${week[2]}` : `${season}:fer:${week[2]}:${weekday}`;
  }
  if (id.startsWith('advent_december_')) return `adv:${mmdd}`;
  if (id.startsWith('christmas_octave_day_') || id.startsWith('christmas_time_january_')) {
    return mmdd === '01-06' ? 'chile:enero-6' : `nav:${mmdd}`;
  }
  if (id.endsWith('_after_epiphany')) return `nav:01-${String(weekday + 6).padStart(2, '0')}`;
  if (id.endsWith('_after_ash_wednesday')) return `cen:${weekday}`;
  if (/^holy_(monday|tuesday|wednesday)$/.test(id)) return `ss:${weekday}`;
  if (id.startsWith('easter_')) return `pas:oct:${weekday}`;
  if (['SUNDAY', 'FEAST', 'SOLEMNITY', 'COMMEMORATION'].includes(rank)) return `md:${mmdd}`;
  return undefined;
}

const mainRoles: Partial<Record<string, string>> = {
  L1: 'Primera lectura', L2: 'Segunda lectura', SAL: 'Salmo responsorial',
  EV: 'Evangelio', SEC: 'Secuencia', ACL: 'Aclamación al Evangelio',
};
const liturgicalNumbers = ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima', 'Octava'];

function readingTitle(role: string, vigil: boolean) {
  if (vigil && role === 'L8') return 'Epístola';
  if (vigil && role === 'SAL8') return 'Aleluya y salmo';
  if (vigil && /^SAL[2-7]$/.test(role)) return 'Salmo responsorial';
  if (/^L[3-8]$/.test(role)) return liturgicalNumbers[Number(role.slice(1)) - 1] + ' lectura';
  return mainRoles[role];
}

function sectionsFor(form: Form, vigil: boolean): LiturgySection[] {
  return form.p.flatMap(({ s, o }) => {
    const title = readingTitle(s, vigil);
    if (!title) return [];
    return o.filter(passage => passage.x.trim()).map(({ h, c, i, x }, index) => ({
      title: index ? `${title} · O bien` : title,
      text: [[h, c].filter(Boolean).join(' '), i, x].filter(Boolean).join('\n\n'),
    }));
  });
}

export function readMass(lectionary: Lectionary, date: Date, day: ChileanLiturgicalDay): LiturgyReading[] {
  const { lectionaryId, sundayCycle, weekdayCycle } = getChileanMassSelection(day);
  const key = formKey(date, lectionaryId, day.mass.rank);
  if (!key) return [];
  const cycle = sundayCycle.slice(-1);
  const parity = weekdayCycle === 'YEAR_1' ? 'I' : 'II';
  let forms = (lectionary[key] ?? []).filter(form => !form.y || form.y === cycle);
  if (forms.some(form => form.id === `${key}.${parity}`)) {
    forms = forms.filter(form => form.id === `${key}.${parity}`);
  }
  if (key === 'nav:01-07') {
    const wanted = lectionaryId.endsWith('_after_epiphany') ? /lunes después/i : /^feria/i;
    forms = forms.filter(form => wanted.test(form.lb ?? ''));
  }
  if (key === 'md:12-25' || key === 'ramos') {
    const wanted = key === 'md:12-25' ? 'Misa del día' : 'Misa';
    forms.sort((a, b) => Number(b.lb === wanted) - Number(a.lb === wanted));
  }
  return forms.map(form => ({
    label: form.lb ?? (key === 'vigilia-pascual' ? 'Vigilia Pascual' : 'Misa del día'),
    celebration: day.mass.name,
    sections: sectionsFor(form, key === 'vigilia-pascual'),
    notice: key === 'vigilia-pascual' ? 'Lecturas de la Vigilia Pascual, que se celebra después del anochecer.' : undefined,
  })).filter(form => form.sections.length > 0);
}

let pendingLectionary: Promise<Lectionary> | undefined;

export function loadLectionary(): Promise<Lectionary> {
  pendingLectionary ??= fetch(LECTIONARY_PATH)
    .then(async response => {
      if (!response.ok) throw new Error('No se pudo abrir el Leccionario local.');
      const raw = inflate(new Uint8Array(await response.arrayBuffer()));
      return JSON.parse(new TextDecoder().decode(raw)) as Lectionary;
    })
    .catch(error => {
      pendingLectionary = undefined;
      throw error;
    });
  return pendingLectionary;
}
