import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Input: dist/breviarium.es.js from the published npm package breviarium@3.1.8.
// The generated module is committed as an application asset. Builds use that copy.
const [input, chileInput] = process.argv.slice(2);
if (!input || !chileInput) {
  throw new Error('Indica dist/breviarium.es.js de Breviarium 3.1.8 y esm/es.js de @romcal/calendar.chile 3.0.0-dev.119.');
}
let source = readFileSync(input, 'utf8');
const digest = createHash('sha256').update(source).digest('hex');
if (digest !== '04eadc920ccb173acc4a0e370b0a68fad10d0bc4507d65542f44606324a62270') {
  throw new Error('El archivo no coincide con Breviarium 3.1.8.');
}
const chileDigest = createHash('sha256').update(readFileSync(chileInput)).digest('hex');
if (chileDigest !== '8f59b15d9ade381dbcc1b6d033ab16767d258c1a321c3ddac419e7cbc639ed48') {
  throw new Error('El archivo no coincide con @romcal/calendar.chile 3.0.0-dev.119.');
}
const { Chile_Es: chile } = await import(pathToFileURL(path.resolve(chileInput)).href);

// Ordo Litúrgico Pastoral 2022, Calendario litúrgico propio de Chile.
chile.inputs.exaltation_of_the_holy_cross.push({
  dateDef: { month: 5, date: 3 }, precedence: 'PROPER_FEAST_8F', fromCalendarId: 'chile',
});
for (const [id, name, month, date] of [
  ['mary_help_of_christians', 'Santa María, Auxilio de los cristianos', 5, 24],
  ['ceferino_namuncura', 'Beato Ceferino Namuncurá', 8, 26],
  ['josemaria_escriva_priest', 'San Josemaría Escrivá de Balaguer, presbítero', 6, 26],
]) {
  chile.inputs[id] = [{ dateDef: { month, date }, precedence: 'OPTIONAL_MEMORIAL_12', fromCalendarId: 'chile' }];
  chile.i18n.names[id] = name;
}
Object.assign(chile.i18n.names, {
  laura_vicuna_virgin: 'Beata Laura Vicuña, virgen',
  our_lady_of_mercy: 'Nuestra Señora de la Merced',
  our_lady_of_mount_carmel_mother_and_queen_of_chile: 'Nuestra Señora del Carmen, Madre y Reina de Chile',
  teresa_of_jesus_of_los_andes_virgin: 'Santa Teresa de los Andes, virgen',
});

source = source
  .replace('En = new Sn({ localizedCalendar: $n })', 'En = new Sn({ localizedCalendar: $n, ascensionOnSunday: true, corpusChristiOnSunday: true })')
  .replace('this.options.showSupportNotice !== !1 && !jo(this)', 'false')
  .replace(/async function zn\(s\) \{[\s\S]*?\n\}\nasync function R\(s\) \{[\s\S]*?\n\}/, `const calendarYears = new Map();
function zn(year) {
  if (!calendarYears.has(year)) {
    if (calendarYears.size >= 3) calendarYears.delete(calendarYears.keys().next().value);
    calendarYears.set(year, En.generateCalendar(year).catch(error => {
      calendarYears.delete(year);
      throw error;
    }));
  }
  return calendarYears.get(year);
}
async function R(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return (await zn(year))[\`\${year}-\${month}-\${day}\`]?.find(entry => !entry.isOptional);
}`)
  .replace('return Xn(n);', 'return n ? Xn(n) : undefined;')
  .replace(', o.push(n);', ';\n  if (n) o.push(n);')
  .replace('function or(s) {', 'function or(s) { if (!s[0]) return undefined;')
  .replace('"resp_3_a":[25584,25585,25586]', '"resp_3_a":[25584,25585]')
  .replace(/class pl \{[\s\S]*?(?=\nconst vl =)/, implementation =>
    implementation.replace('constructor() {\n  }', 'constructor(resolveDay = R) { this.resolveDay = resolveDay; }')
      .replaceAll('await R(e)', 'await this.resolveDay(e)'))
  .replace(/\/\/# sourceMappingURL=breviarium\.es\.js\.map\s*$/, '');

source += `
// Cotidie: expose the liturgical date and the first Vespers stored in the corpus.
export async function getLiturgicalDay(date) {
  const day = await R(date);
  if (!day) throw new Error('No se encontró el día litúrgico.');
  return { id: day.id, celebration: day.name, seasons: day.seasons, periods: day.periods,
    precedence: day.precedence, rank: day.rank, cycle: day.cycles.sundayCycle,
    weekdayId: day.weekday?.id };
}

export function getVespersForm(id, cycle) {
  const forms = Za.filter(form => form.id === id);
  const form = forms.find(form => form.cycle === cycle) ?? forms.find(form => form.cycle === 'ANY');
  return form ? ar([form])[0] : undefined;
}

export async function getFerialInvitatory(date) {
  const day = await R(date);
  const row = so.find(form => form.id === day?.weekday?.id);
  return row ? Xn(row) : undefined;
}
`;

source += `
const chileDefinition = ${JSON.stringify(chile)};
const chileOptions = { epiphanyOnSunday: true, ascensionOnSunday: true, corpusChristiOnSunday: true };
const immaculateConception = 'immaculate_conception_of_the_blessed_virgin_mary';
const immaculateDefinition = chileDefinition.inputs[immaculateConception];
const chileCalendarOptions = {
  ...chileOptions,
  localizedCalendar: {
    ...chileDefinition,
    inputs: {
      ...chileDefinition.inputs,
      // In Chile the Mass celebrates the Immaculate Conception on December 8.
      // When it is Sunday, the Hours follow Advent II and neither is transferred.
      [immaculateConception]: [...immaculateDefinition, {
        dateDef: { month: 12, date: 8 }, fromCalendarId: 'chile',
      }],
    },
  },
};
const chileYears = new Map();

function summarizeChileanDay(day) {
  return { id: day.id, name: day.name, rank: day.rank, precedence: day.precedence,
    proper: day.fromCalendarId, sundayCycle: day.cycles.sundayCycle,
    weekdayCycle: day.cycles.weekdayCycle, psalterWeek: day.cycles.psalterWeek,
    seasons: day.seasons, periods: day.periods, weekdayId: day.weekday?.id };
}

export async function getChileanLiturgicalDay(date) {
  const { hours, mass, optional } = await resolveChileanDay(date);
  const hoursDay = summarizeChileanDay(hours);
  const massDay = mass.id === immaculateConception && mass !== hours
    ? { ...hoursDay, ...summarizeChileanDay(mass), seasons: hoursDay.seasons,
        periods: hoursDay.periods, psalterWeek: hoursDay.psalterWeek }
    : summarizeChileanDay(mass);
  return { hours: hoursDay, mass: massDay, optional: optional.map(summarizeChileanDay) };
}

async function resolveChileanDay(date) {
  if (!Number.isFinite(date.getTime())) throw new Error('Fecha litúrgica inválida.');
  const year = date.getFullYear();
  const key = [year, date.getMonth() + 1, date.getDate()].map((part, index) =>
    String(part).padStart(index === 0 ? 4 : 2, '0')).join('-');
  if (!chileYears.has(year)) {
    if (chileYears.size >= 3) chileYears.delete(chileYears.keys().next().value);
    const calendar = new Sn(chileCalendarOptions);
    const days = calendar.generateCalendar(year).then(async days => {
      const immaculate = await calendar.getOneLiturgicalDay(immaculateConception, { year });
      return { days, immaculate };
    }).catch(error => {
      if (chileYears.get(year) === days) chileYears.delete(year);
      throw error;
    });
    chileYears.set(year, days);
  }
  const { days, immaculate } = await chileYears.get(year);
  const entries = days[key];
  const hours = entries?.find(entry => !entry.isOptional);
  if (!hours) throw new Error('No se encontró el día litúrgico chileno.');
  const mass = key.endsWith('-12-08') && date.getDay() === 0 ? immaculate
    : entries.find(entry => entry.id === 'thursday_of_the_lords_supper') ?? hours;
  return { hours, mass, optional: entries.filter(entry => entry.isOptional) };
}

export function createChileanHoursEngine(id) {
  const engine = new pl(async date => {
    const { hours, optional } = await resolveChileanDay(date);
    return optional.find(entry => entry.id === id) ?? hours;
  });
  engine.getInvitatoriumPsalms = async () => vl;
  return engine;
}

export function getHoursForm(hour, id, cycle) {
  const rows = { invitatorio: so, laudes: Wa, visperas: Za, oficio: oo, tercia: Xa, sexta: eo, nona: ao }[hour];
  const form = rows?.find(row => row.id === id && row.cycle === cycle)
    ?? rows?.find(row => row.id === id && (!row.cycle || row.cycle === "ANY"));
  if (!form) return undefined;
  if (hour === "invitatorio") return Xn(form);
  if (hour === "laudes") return er([form])[0];
  if (hour === "visperas") return ar([form])[0];
  if (hour === "oficio") return or([form]);
  return Ye(null, [form]);
}

export async function getChileanFerialInvitatory(date) {
  const { hours } = await resolveChileanDay(date);
  const row = so.find(form => form.id === hours.weekday?.id);
  return row ? Xn(row) : undefined;
}
`;
source = '/*! Breviarium 3.1.8 by Miguel Martínez and contributors; modified by Cotidie. See LICENSE.txt. */\n' + source;

const target = fileURLToPath(new URL('../public/liturgy/', import.meta.url));
mkdirSync(target, { recursive: true });
writeFileSync(path.join(target, 'breviarium-3.1.8.js'), source, 'utf8');
