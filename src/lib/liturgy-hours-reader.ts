import type { LiturgyHour } from './liturgy-hours';
import type { ChileanLiturgicalDay } from './liturgy-chile';
import { readRegionalHours, type RegionalHours } from './liturgy-hours-chile';
import complineLatin from './compline-latin.json';
import { salveRegina } from './prayers/plan-de-vida/salve-regina';
import {
  BENEDICTUS, GLORY, INVITATORY_OPENING, MAGNIFICAT, MARIAN_ANTIPHON,
  NIGHT_CONCLUSION, NUNC_DIMITTIS, OPENING, OUR_FATHER, PRAISE_CONCLUSION,
  SHORT_CONCLUSION, TE_DEUM,
} from './liturgy-hours-ordinary';

const CORPUS_PATH = '/liturgy/breviarium-3.1.8.js';
const FIRST_VESPERS_EXCEPTIONS = new Set([
  'easter_sunday', 'commemoration_of_all_the_faithful_departed',
]);
const NIGHT_AFTER_FIRST_VESPERS = new Date(2000, 0, 1, 12);
const NIGHT_AFTER_SECOND_VESPERS = new Date(2000, 0, 2, 12);
const SOLEMNITY_NIGHT_PRAYER = 'Visita, Señor, esta habitación: aleja de ella las insidias del enemigo; que tus santos ángeles habiten en ella y nos guarden en paz y que tu bendición permanezca siempre con nosotros. Por Jesucristo, nuestro Señor.';
const LATIN_SALVE = (salveRegina.content as Record<string, string>).latín.split(/\r?\n/, 1)[0];

type Day = {
  id: string;
  celebration: string;
  seasons: string[];
  periods: string[];
  precedence: string;
  rank: string;
  cycle: string;
  weekdayId?: string;
};

type TextFields = {
  [field: string]: string | string[] | undefined;
  id?: string;
};

type Psalter = {
  title: string;
  psalm: string;
}[];

const methods = {
  oficio: 'getOfficium',
  tercia: 'getTertia',
  sexta: 'getSexta',
  nona: 'getNona',
} as const;

type Engine = Record<typeof methods[keyof typeof methods], (date: Date) => Promise<TextFields | undefined>> & {
  getInvitatorium: (date: Date) => Promise<TextFields | undefined>;
  getInvitatoriumPsalms: () => Promise<Psalter>;
  getLaudes: (date: Date) => Promise<TextFields[]>;
  getVesperae: (date: Date) => Promise<TextFields[]>;
  getCompletorium: (date: Date) => Promise<TextFields>;
  getLectures: (date: Date) => Promise<{
    cycle: string;
    lecturas: { type: string; ref: string; texto: string }[];
  }[]>;
};

type Corpus = {
  Breviarium: new () => Engine;
  getLiturgicalDay(date: Date): Promise<Day>;
  getChileanLiturgicalDay(date: Date): Promise<ChileanLiturgicalDay>;
  createChileanHoursEngine(id?: string): Engine;
  getChileanFerialInvitatory(date: Date): Promise<TextFields | undefined>;
  getHoursForm(hour: LiturgyHour, id: string, cycle: string): TextFields | undefined;
  getVespersForm(id: string, cycle: string): TextFields | undefined;
  getFerialInvitatory(date: Date): Promise<TextFields | undefined>;
};

export type LiturgySection = { title?: string; text: string; notice?: string };
export type LiturgyReading = {
  label: string;
  celebration: string;
  sections: LiturgySection[];
  latinSections?: LiturgySection[];
  notice?: string;
  ordo?: { url: string; references: string[]; pending: boolean; unverified: string[] };
  santiago?: string;
};

export function loadLiturgyCorpus(): Promise<Corpus> {
  // Capacitor serves this bundled file from its local origin. On the web it is
  // part of the app shell precache and remains separate from the initial JS.
  return import(/* webpackIgnore: true */ CORPUS_PATH);
}

function precedence(day: Day) {
  return Number(day.precedence.match(/_(\d+)[A-Z]?$/)?.[1] ?? 13);
}

function hasEveningOffice(day: Day, date: Date) {
  return !FIRST_VESPERS_EXCEPTIONS.has(day.id)
    && !day.seasons.includes('PASCHAL_TRIDUUM')
    && (date.getDay() === 0 || day.rank === 'SOLEMNITY' && !day.periods.includes('EASTER_OCTAVE'));
}

function nextEveningOffice(today: Day, tomorrow: Day, nextDate: Date) {
  // Christmas begins after None on December 24, including when it is Advent IV.
  if (tomorrow.id === 'nativity_of_the_lord') return true;
  if (today.id === 'easter_saturday' && tomorrow.id === 'divine_mercy_sunday') return true;
  // Equal precedence leaves the evening to the current celebration.
  return hasEveningOffice(tomorrow, nextDate) && precedence(tomorrow) < precedence(today);
}

function firstVespersFerialId(day: Day, tomorrow: Day) {
  // In this edition the January Sunday record contains the first Vespers.
  if (tomorrow.id === 'second_sunday_after_christmas') return tomorrow.id;
  const saturday = day.weekdayId ?? day.id;
  if (saturday === 'easter_saturday' && tomorrow.id === 'divine_mercy_sunday') return 'easter_saturday_1v';
  return saturday;
}

function sectionsFor(fields: TextFields, day: Day, hour: LiturgyHour): LiturgySection[] {
  const sections: LiturgySection[] = [];
  const txt = (name: string) => {
    const value = fields[name];
    return Array.isArray(value) ? value.filter(Boolean).join('\n') : value;
  };
  const add = (title: string | undefined, ...parts: (string | undefined)[]) => {
    const text = parts.filter(part => part?.trim()).join('\n\n');
    if (text) sections.push({ title, text });
  };
  const canticle = (title: string, text: string) => {
    const antiphon = txt('cantico_evangelico_antifona');
    const variants = antiphon?.matchAll(/\$\s*Año\s+([ABC])\s*:?\s*\$\s*([\s\S]*?)(?=\$\s*Año\s+[ABC]\b|$)/gi);
    const proper = variants && [...variants].find(match => `YEAR_${match[1].toUpperCase()}` === day.cycle)?.[2].trim();
    add(title, proper || antiphon, text, GLORY, proper || antiphon);
  };
  const easter = day.seasons.includes('EASTER_TIME');
  const triduum = day.seasons.includes('PASCHAL_TRIDUUM') && !easter;
  const isLent = day.seasons.includes('LENT');

  const omitsAlleluia = isLent || triduum || hour === 'completas' && day.id === 'holy_thursday';
  add(undefined, OPENING + (omitsAlleluia ? '' : '\nAleluya.'));
  if (hour === 'completas') add('Examen de conciencia', '$Haz un breve examen de conciencia.$');
  add('Himno', txt('himno'));
  for (const prefix of ['primer', 'segundo', 'tercer']) {
    const antiphon = txt(`${prefix}_salmo_antifona`);
    add(txt(`${prefix}_salmo_cita`) ?? 'Salmodia', antiphon, txt(`${prefix}_salmo_texto`), antiphon);
  }

  if (hour === 'oficio') {
    add(undefined, txt('responsorio1'));
    add('Primera lectura', txt('lectura_biblica_cita_a'), txt('lectura_biblica_titulo_a'), txt('lectura_biblica_texto_a'));
    add('Responsorio', txt('responsorio2_a'));
    add('Segunda lectura', txt('lectura_patristica_cita_a'), txt('lectura_patristica_titulo_a'), txt('lectura_patristica_texto_a'));
    const secondResponse = fields.responsorio3_a;
    // Breviarium 3.1.8 omits one line here. Restore the response and verse
    // in the order given in the Spanish edition, volume II.
    if (fields.id === 'easter_time_5_thursday' && Array.isArray(secondResponse) && secondResponse[0] && secondResponse[1]) {
      const response = secondResponse[1].replace(/^\$℟\. \$/, '').replace(/^Y el que/, 'quien');
      const verse = secondResponse[0].replace(/^\$℟\. \$/, '$℣. $');
      add('Responsorio · Jn 6, 58; Lc 22, 19', [
        '$℟. $Como me envió el Padre que posee la vida y yo vivo por el Padre, de la misma manera ' + response,
        verse, '$℟. $' + response[0].toUpperCase() + response.slice(1),
      ].join('\n'));
    } else add('Responsorio', txt('responsorio3_a'));
    if (!triduum && day.id !== 'commemoration_of_all_the_faithful_departed' && (
      day.rank === 'SOLEMNITY' || day.rank === 'FEAST' || day.periods.includes('EASTER_OCTAVE')
      || day.rank === 'SUNDAY' && !isLent
    )) add('Te Deum', TE_DEUM);
  } else {
    add('Lectura breve', txt('lectura_biblica_cita'), txt('lectura_biblica') ?? txt('lectura_biblica_texto'));
    if (hour === 'completas') {
      if (triduum || day.id === 'holy_thursday') {
        const parts = txt('antifona_triduo')?.split(/, y una muerte de cruz; por eso /);
        const first = parts?.[0];
        let antiphon = txt('antifona_triduo');
        if (day.id === 'holy_thursday' && first) antiphon = first.replace(/\.$/, '') + '.';
        if (day.id === 'friday_of_the_passion_of_the_lord' && first) antiphon = first + ', y una muerte de cruz.';
        add('Antífona', antiphon);
      } else if (day.periods.includes('EASTER_OCTAVE')) add('Antífona', txt('antifona_inalbis'));
      else add('Responsorio breve', txt(easter ? 'responsorio_pascua' : 'responsorio'));
      canticle('Cántico de Simeón · Lc 2, 29-32', NUNC_DIMITTIS);
    } else {
      const principal = hour === 'laudes' || hour === 'visperas';
      add(principal ? 'Responsorio breve' : undefined, txt('responsorios'));
      if (principal) {
        canticle(hour === 'laudes' ? 'Cántico de Zacarías · Lc 1, 68-79' : 'Cántico de María · Lc 1, 46-55',
          hour === 'laudes' ? BENEDICTUS : MAGNIFICAT);
        const intentions = fields.preces_contenido;
        add('Preces', txt('preces_intro'), txt('preces_respuesta'),
          Array.isArray(intentions) ? intentions.filter(Boolean).join('\n\n') : intentions);
        add('Padrenuestro', txt('invitacion_padrenuestro'), OUR_FATHER);
      }
    }
  }

  const collect = (txt('oracion_final') ?? txt('final'))?.replace(/^Oremos:\s*/i, '').trim();
  add('Oración', collect, collect && '$℟. $Amén.');
  if (hour === 'completas') {
    add(undefined, NIGHT_CONCLUSION);
    add('Antífona mariana', MARIAN_ANTIPHON[easter ? 'easter' : 'salve']);
  } else add(undefined, hour === 'laudes' || hour === 'visperas' ? PRAISE_CONCLUSION : SHORT_CONCLUSION);
  return sections;
}

async function easterVigil(engine: Engine, date: Date, day: Day): Promise<LiturgySection[]> {
  const [lectures, laudes] = await Promise.all([engine.getLectures(date), engine.getLaudes(date)]);
  const set = (lectures.find(entry => entry.cycle === day.cycle) ?? lectures[0])?.lecturas;
  const collect = laudes[0]?.oracion_final;
  const types = ['THIRDLECTURE', 'THIRDPSALM', 'SEVENTHLECTURE', 'SEVENTHPSALM', 'EIGHTHLECTURE', 'ACCLAMATION', 'GOSPEL'];
  if (typeof collect !== 'string' || !collect.trim() || !set
    || types.some(type => !set.some(lecture => lecture.type === type && lecture.texto))) return [];
  return [
    { text: '$La Vigilia Pascual sustituye al Oficio de lectura. Quienes no asisten pueden rezar el Oficio con estas lecturas de la Vigilia.$' },
    ...types.map(type => {
      const { ref, texto } = set.find(lecture => lecture.type === type)!;
      return { title: ref.replaceAll('_', ''), text: texto };
    }),
    { title: 'Te Deum', text: TE_DEUM },
    { title: 'Oración', text: `${collect}\n\n$℟. $Amén.` },
    { text: SHORT_CONCLUSION },
  ];
}

export async function readLiturgy(
  corpus: Corpus, date: Date, hour: LiturgyHour, regional?: RegionalHours, memorial?: string,
): Promise<LiturgyReading[]> {
  const dayFor = async (value: Date, optional?: string): Promise<Day> => {
    if (!regional) return corpus.getLiturgicalDay(value);
    const result = await corpus.getChileanLiturgicalDay(value);
    const selected = result.optional.find(entry => entry.id === optional) ?? result.hours;
    return { ...selected, celebration: selected.name, cycle: selected.sundayCycle };
  };
  const engine = regional ? corpus.createChileanHoursEngine(memorial) : new corpus.Breviarium();
  const day = await dayFor(date, memorial);
  const regionalOffice = (context: Day, first: boolean, fallback?: LiturgyReading) => regional && readRegionalHours(
    regional, context.id, context.celebration, hour, first, date.getDay(),
    corpus.getHoursForm('laudes', 'ordinary_time_5_sunday', context.cycle),
    fallback, context.seasons.includes('EASTER_TIME'),
    first && context.id === 'our_lady_of_mount_carmel'
      ? ['Salmo 47', corpus.getHoursForm('laudes', 'ordinary_time_1_thursday', context.cycle)?.tercer_salmo_texto].filter(Boolean).join('\n\n')
      : undefined,
  );
  const celebration = day.celebration;
  const makeReading = (fields: TextFields, label: string, context = day, title = context.celebration): LiturgyReading => ({
    label,
    celebration: title,
    sections: sectionsFor(fields, context, hour),
  });

  if (hour === 'invitatorio') {
    const [proper, ferial, psalms] = await Promise.all([
      engine.getInvitatorium(date), regional ? corpus.getChileanFerialInvitatory(date) : corpus.getFerialInvitatory(date),
      engine.getInvitatoriumPsalms(),
    ]);
    const regionalAntiphon = regionalOffice(day, false)?.sections[0]?.text;
    const antiphon = regionalAntiphon ?? proper?.val ?? ferial?.val;
    if (typeof antiphon !== 'string' || !antiphon.trim()) return [];
    return psalms.map(({ title, psalm }) => ({
      label: title,
      celebration: regionalAntiphon || proper?.val ? celebration : 'Feria del día',
      sections: [
        { text: INVITATORY_OPENING },
        { title, text: [antiphon, psalm.replace(/<small\b[^>]*>[^<]*<\/small>/gi, `\n\n${antiphon}\n\n`), antiphon].join('\n\n') },
      ],
    }));
  }

  if (hour === 'oficio' && day.id === 'easter_sunday') {
    const sections = await easterVigil(engine, date, day);
    return sections.length ? [{ label: 'Vigilia Pascual', celebration, sections }] : [];
  }

  if (hour === 'visperas' || hour === 'completas') {
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    const tomorrow = await dayFor(nextDate);
    const first = nextEveningOffice(day, tomorrow, nextDate);
    const context = first ? tomorrow : day;
    const second = hasEveningOffice(day, date) || day.id === 'easter_sunday';
    if (hour === 'visperas') {
      if (first) {
        const form = corpus.getVespersForm(`${tomorrow.id}_1v`, tomorrow.cycle)
          ?? (nextDate.getDay() === 0 ? corpus.getVespersForm(firstVespersFerialId(day, tomorrow), tomorrow.cycle) : undefined);
        const proper = regionalOffice(context, true, form ? makeReading(form, 'I Vísperas', context) : undefined);
        if (proper) return [proper];
        return form ? [makeReading(form, 'I Vísperas', context)] : [];
      }
      const forms = await engine.getVesperae(date);
      const proper = regionalOffice(day, false, forms[0] ? makeReading(forms[0], 'Vísperas') : undefined);
      if (proper) return [proper];
      return forms.map((form, index) => makeReading(form, index ? 'Feria' : second ? 'II Vísperas' : 'Vísperas',
        day, index || form.id !== day.id ? 'Feria del día' : celebration));
    }
    const specialNight = day.id === 'holy_thursday' || day.seasons.includes('PASCHAL_TRIDUUM')
      || day.periods.includes('EASTER_OCTAVE') && day.rank !== 'SUNDAY';
    const formDate = first ? NIGHT_AFTER_FIRST_VESPERS : second || specialNight ? NIGHT_AFTER_SECOND_VESPERS : date;
    const form = await engine.getCompletorium(formDate);
    const reading = makeReading(form, first ? 'Después de I Vísperas' : second ? 'Después de II Vísperas' : 'Completas', context);
    const eveningDate = first ? nextDate : date;
    const weekdaySolemnity = context.rank === 'SOLEMNITY' && eveningDate.getDay() !== 0;
    const triduum = !first && (day.id === 'holy_thursday' || day.id === 'friday_of_the_passion_of_the_lord' || day.id === 'holy_saturday');
    const prayer = reading.sections.find(section => section.title === 'Oración');
    if (prayer) {
      const sundayPrayer = /<\/span>\s*([^<]+)\s*<span\b/i.exec(prayer.text)?.[1].trim().replace(/\s*Amén\.$/, '');
      const properPrayer = weekdaySolemnity || triduum ? SOLEMNITY_NIGHT_PRAYER : sundayPrayer;
      if (properPrayer) prayer.text = `${properPrayer}\n\n$℟. $Amén.`;
    }
    if (context.seasons.includes('ORDINARY_TIME')) {
      const latinForm = complineLatin.week[(formDate.getDay() + 6) % 7];
      const latinSections = [
        ...complineLatin.opening, ...latinForm.psalms, latinForm.reading, ...complineLatin.closing,
        weekdaySolemnity ? complineLatin.solemnity : latinForm.prayer, complineLatin.blessing,
        { title: 'Antiphona finalis ad Beatam Mariam Virginem', text: LATIN_SALVE },
      ];
      if (latinSections.length === reading.sections.length) reading.latinSections = latinSections;
    }
    if (day.id === 'holy_saturday') reading.notice = 'Las Completas se rezan si no se participa en la Vigilia Pascual.';
    return [reading];
  }

  if (hour === 'laudes') {
    const forms = await engine.getLaudes(date);
    const proper = regionalOffice(day, false, forms[0] ? makeReading(forms[0], 'Laudes') : undefined);
    if (proper) return [proper];
    return forms.map((form, index) => {
      const title = form.id === day.id ? celebration : 'Feria del día';
      return makeReading(form, index || form.id !== day.id ? 'Feria' : celebration, day, title);
    });
  }
  const form = await engine[methods[hour]](date);
  const fallback = form?.himno ? makeReading(form, form.id === day.id ? celebration : 'Feria del día',
    day, form.id === day.id ? celebration : 'Feria del día') : undefined;
  const proper = regionalOffice(day, false, fallback);
  return proper ? [proper] : fallback ? [fallback] : [];
}
