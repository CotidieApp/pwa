import type { LiturgyHour } from './liturgy-hours';
import type { LiturgyReading, LiturgySection } from './liturgy-hours-reader';
import {
  BENEDICTUS, MAGNIFICAT, GLORY, OPENING, OUR_FATHER, PRAISE_CONCLUSION, SHORT_CONCLUSION, TE_DEUM,
} from './liturgy-hours-ordinary';

type Office = Partial<Record<Exclude<LiturgyHour, 'invitatorio'> | 'primeras' | 'intermedia', LiturgySection[]>> & {
  oracion?: string;
  invitatorio?: string;
  oficioFuente?: string;
};

export type RegionalHours = {
  virgenes: Office;
  pastores: Office;
  maria: Office;
  guadalupe: Office;
  rosa: Office;
  carmen: Office;
  teresa: Office;
  alberto: Office;
  laura: Office;
  ceferino: Office;
  enero6: Office;
  enero7: Office;
  salterioNavidad: Record<'viernes' | 'sabado', Partial<Record<'oficio' | 'laudes' | 'visperas' | 'intermedia', string>>>;
  complementaria: Record<'tercia' | 'sexta' | 'nona', string>;
};

const offices = {
  our_lady_of_guadalupe: { proper: 'guadalupe', common: 'maria', feast: true },
  rose_of_lima_virgin: { proper: 'rosa', common: 'virgenes', feast: true },
  our_lady_of_mount_carmel: { proper: 'carmen', common: 'maria', feast: true },
  teresa_of_jesus_of_los_andes_virgin: { proper: 'teresa', common: 'virgenes', feast: true },
  alberto_hurtado_priest: { proper: 'alberto', feast: false },
  laura_vicuna_virgin: { proper: 'laura', feast: false },
  ceferino_namuncura: { proper: 'ceferino', feast: false },
} as const;

const notices: Partial<Record<keyof typeof offices, string>> = {
  our_lady_of_mount_carmel: 'Incluye textos del oficio histórico de Chile y del Común de Santa María. El Propio vigente de este oficio sigue pendiente de cotejo.',
  teresa_of_jesus_of_los_andes_virgin: 'Incluye la lectura del Propio carmelitano y el Común de vírgenes. El Propio nacional completo sigue pendiente de cotejo.',
  alberto_hurtado_priest: 'Se usa la salmodia de la feria y la oración de san Alberto.',
  ceferino_namuncura: 'Se usa la salmodia de la feria y la oración del Propio salesiano.',
};

function sectionCategory(section: LiturgySection) {
  return section.title?.split(' · ')[0];
}

function replaceSections(ordinary: LiturgySection[], proper: LiturgySection[]) {
  const used = new Set<string>();
  const result = ordinary.flatMap(section => {
    const group = sectionCategory(section);
    if (!group) return [section];
    const replacements = proper.filter(candidate => sectionCategory(candidate) === group);
    if (!replacements.length) return [section];
    if (used.has(group)) return [];
    used.add(group);
    return replacements;
  });
  return [...result, ...proper.filter(section => !used.has(sectionCategory(section) ?? ''))];
}

function withOfficeReadings(target: LiturgySection[], source: LiturgySection[]) {
  const own = source.findIndex(section => section.title === 'Segunda lectura');
  const from = target.findIndex(section => section.title === 'Segunda lectura');
  if (own < 0 || from < 0) return replaceSections(target, source);
  return [
    ...replaceSections(target.slice(0, from), source.slice(0, own).filter(section => section.title)),
    ...source.slice(own),
  ];
}

function withPsalmAntiphons(sections: LiturgySection[], antiphons: string[], sundayPsalms: string[]) {
  return sections.map(section => {
    if (section.title === 'Salmodia' && section.text.includes('@DomingoI')) {
      const old = section.text.match(/^Ant\. [123]\. .+/gm) ?? [];
      const texts = antiphons.length === 3 ? antiphons : old.map(line => line.replace(/^Ant\. [123]\. /, ''));
      return { ...section, text: sundayPsalms.map((psalm, index) => [texts[index], psalm, texts[index]].filter(Boolean).join('\n\n')).join('\n\n') };
    }
    if (section.title !== 'Salmodia' || antiphons.length !== 3) return section;
    return { ...section, text: section.text.replace(/^Ant\. ([123])\. .+/gm, (_, number) => antiphons[Number(number) - 1]) };
  }).filter(section => Boolean(section.text.trim()));
}

const hourLabels = {
  oficio: 'Oficio de lectura', laudes: 'Laudes', tercia: 'Tercia', sexta: 'Sexta', nona: 'Nona', visperas: 'Vísperas',
} as const;

export function readRegionalHours(
  corpus: RegionalHours,
  id: string,
  name: string,
  hour: LiturgyHour,
  first: boolean,
  weekday: number,
  sunday: Record<string, string | string[] | undefined> | undefined = undefined,
  fallback?: LiturgyReading,
  easter = false,
  firstVespersPsalm?: string,
): LiturgyReading | undefined {
  if (hour === 'completas') return undefined;
  const january = id === 'christmas_time_january_6' ? corpus.enero6
    : id === 'christmas_time_january_7' ? corpus.enero7 : undefined;
  if (!Object.hasOwn(offices, id) && !january) return undefined;
  const key = id as keyof typeof offices;
  const rule = january ? undefined : offices[key];
  const proper = january ?? corpus[offices[key].proper];
  const common = rule?.feast ? corpus[rule.common] : {};
  const christmasPsalter = january ? corpus.salterioNavidad[weekday === 5 ? 'viernes' : 'sabado'] : undefined;
  if (first && !proper.primeras) return undefined;
  if (hour === 'invitatorio') {
    if (rule && !rule.feast) return undefined;
    const antiphon = proper.invitatorio ?? (january ? 'A Cristo, que por nosotros ha nacido, venid, adorémosle.'
      : rule?.feast && rule.common === 'maria' ? 'Venid, adoremos a Cristo, Hijo de la Virgen María.'
        : 'Venid, adoremos al Señor, rey de las vírgenes.');
    return { label: 'Invitatorio', celebration: name, sections: [{ text: antiphon }] };
  }

  const office = first ? 'primeras' : hour;
  const principal = hour === 'laudes' || hour === 'visperas';
  const label = first ? 'I Vísperas' : key === 'our_lady_of_mount_carmel' && hour === 'visperas' ? 'II Vísperas'
    : hourLabels[hour];

  if (rule && !rule.feast && fallback) {
    const prayer = { title: 'Oración', text: `${proper.oracion}\n\n$℟. $Amén.` };
    let sections = principal || hour === 'oficio'
      ? fallback.sections.map(section => section.title === 'Oración' ? prayer : section)
      : fallback.sections;
    if (hour === 'oficio' && proper.oficio?.length && proper.oficioFuente) {
      const reading = sections.findIndex(section => section.title === 'Segunda lectura');
      const conclusion = sections.findIndex(section => section.title === 'Oración');
      if (reading >= 0 && conclusion > reading) {
        sections = [...sections.slice(0, reading), ...proper.oficio, ...sections.slice(conclusion)];
        return {
          label, celebration: name, sections,
          notice: `Segunda lectura según ${proper.oficioFuente}. El Propio nacional sigue pendiente de cotejo.`,
        };
      }
    }
    return { label, celebration: name, sections, notice: notices[key] };
  }

  const own = proper[office] ?? [];
  const base = common[office] ?? [];
  const afterCommon = hour === 'oficio' ? withOfficeReadings(base, own) : replaceSections(base, own);
  const psalms = ['primer', 'segundo', 'tercer'].map(prefix => {
    const text = sunday?.[`${prefix}_salmo_texto`];
    const reference = sunday?.[`${prefix}_salmo_cita`];
    return typeof text === 'string' ? [reference, text].filter(Boolean).join('\n\n') : '';
  });
  const antiphons = own.find(section => section.title === 'Antífonas de la salmodia')?.text.split('\n\n') ?? [];
  let sections = afterCommon.flatMap(section => {
    if (section.text.includes('@Común')) {
      const commonPsalm = base.find(candidate => candidate.title === 'Salmodia');
      return commonPsalm ? [commonPsalm] : [];
    }
    if (!section.title || section.title === 'Antífonas de la salmodia' || section.title === 'Te deum') return [];
    const [normal, paschal] = section.text.split(/\n\nTiempo pascual:\s*/);
    const text = (easter && paschal ? paschal : normal).replace(/^Fuera del tiempo pascual:\s*/, '')
      .replace(/@Benedictus/g, BENEDICTUS + '\n' + GLORY)
      .replace(/@Magnificat/g, MAGNIFICAT + '\n' + GLORY)
      .replace(/@Te Deum/g, '').trim();
    if (section.title === 'Cántico evangélico' && !/@Benedictus|@Magnificat/.test(section.text)) {
      const antiphon = text.replace(/^Ant\.\s*/, '');
      return [{ ...section, text: [antiphon, hour === 'laudes' ? BENEDICTUS : MAGNIFICAT, GLORY, antiphon].join('\n\n') }];
    }
    return text ? [{ ...section, text }] : [];
  });
  sections = withPsalmAntiphons(sections, antiphons, psalms);
  if (id === 'our_lady_of_mount_carmel' && first && firstVespersPsalm) {
    sections = sections.map(section => section.title === 'Salmodia'
      ? { ...section, text: section.text.replace(/\bSalmo 147[\s\S]*?(?=\n\nCántico)/, () =>
        `${firstVespersPsalm}\n\n${antiphons[1]}\n\n${antiphons[2]}\n\n`) }
      : section);
  }
  if (christmasPsalter && (hour === 'oficio' || hour === 'laudes' || hour === 'visperas')) {
    const text = christmasPsalter[hour];
    if (text) {
      const index = sections.findIndex(section => section.title === 'Himno');
      sections.splice(index + 1, 0, { title: 'Salmodia', text });
    }
  }
  // Some forms have two Salmodia lines, one with the antiphons and one for the
  // common Sunday psalms. Keep them in the same place in the office.
  if (hour === 'laudes') {
    sections.sort((a, b) => Number(b.title === 'Himno') - Number(a.title === 'Himno'));
  }

  if (hour === 'tercia' || hour === 'sexta' || hour === 'nona') {
    const ferial = fallback?.sections;
    const body = (christmasPsalter?.intermedia ?? corpus.complementaria[hour]).split('\n\n')
      .filter(paragraph => !paragraph.startsWith('SALMODIA PARA'));
    const antiphon = own.find(section => section.title === 'Antífona de la salmodia')?.text;
    const versicle = own.find(section => section.title === 'Versículo');
    const title = label;
    const middleIndex = ['tercia', 'sexta', 'nona'].indexOf(hour);
    const christmasReading = january?.intermedia?.filter(section => section.title?.startsWith('Lectura breve'))[middleIndex];
    const properMiddle = proper.intermedia?.find(section => section.title === 'Lectura breve');
    const reading = properMiddle?.text.match(new RegExp(`^\s*${title} (.+?)(?=^(?:Tercia|Sexta|Nona) |(?![\\s\\S]))`, 'ms'))?.[1].trim();
    const properCollect = proper.oracion ?? (!january ? proper.intermedia?.find(section => section.title === 'Oración')?.text : undefined)
      ?? proper.laudes?.find(section => section.title === 'Oración')?.text;
    return {
      label, celebration: name, notice: notices[key],
      sections: [
        ...(ferial?.slice(0, 2) ?? [{ text: OPENING }]),
        { title: 'Salmodia complementaria', text: (antiphon ? [antiphon, ...body, antiphon] : body).join('\n\n') },
        ...(christmasReading ? [christmasReading] : reading ? [{ title: 'Lectura breve', text: reading }]
          : ferial?.filter(section => section.title === 'Lectura breve') ?? []),
        ...(versicle ? [versicle] : []),
        ...(properCollect ? [{ title: 'Oración', text: `${properCollect}\n\n$℟. $Amén.` }] : []),
        { text: SHORT_CONCLUSION },
      ],
    };
  }
  const collect = proper.oracion ?? own.find(section => section.title === 'Oración')?.text
    ?? proper.laudes?.find(section => section.title === 'Oración')?.text;
  const collectSection = collect ? [{ title: 'Oración', text: `${collect}\n\n$℟. $Amén.` }] : [];
  sections = sections.filter(section => section.title !== 'Oración');
  if (principal) {
    const index = sections.findIndex(section => section.title === 'Cántico evangélico');
    const [canticle] = index >= 0 ? sections.splice(index, 1) : [];
    const preces = sections.findIndex(section => section.title === 'Preces');
    sections.splice(preces < 0 ? sections.length : preces, 0, canticle ?? {
      title: 'Cántico evangélico', text: (hour === 'laudes' ? BENEDICTUS : MAGNIFICAT) + '\n\n' + GLORY,
    });
  }
  return {
    label, celebration: name, notice: notices[key],
    sections: [
      { text: OPENING + '\nAleluya.' }, ...sections,
      ...(principal ? [{ title: 'Padrenuestro', text: OUR_FATHER }]
        : rule?.feast ? [{ title: 'Te Deum', text: TE_DEUM }] : []),
      ...collectSection, { text: principal ? PRAISE_CONCLUSION : SHORT_CONCLUSION },
    ],
  };
}

let pendingHours: Promise<RegionalHours> | undefined;

export function loadRegionalHours(): Promise<RegionalHours> {
  pendingHours ??= fetch('/liturgy/hours-cl.json').then(response => {
    if (!response.ok) throw new Error('No se pudo abrir la Liturgia de las Horas local.');
    return response.json() as Promise<RegionalHours>;
  }).catch(error => {
    pendingHours = undefined;
    throw error;
  });
  return pendingHours;
}
