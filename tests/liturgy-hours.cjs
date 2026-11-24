const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const Module = require('node:module');
const ts = require('typescript');

const src = path.resolve(__dirname, '../src');
const compiled = new Map();
function load(source) {
  const filename = path.resolve(source);
  if (compiled.has(filename)) return compiled.get(filename);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = name => {
    if (name === 'lucide-react') return new Proxy({}, { get: () => 'svg' });
    if (!name.startsWith('@/') && !name.startsWith('./')) return original(name);
    const base = name.startsWith('@/') ? path.join(src, name.slice(2)) : path.resolve(path.dirname(filename), name);
    const file = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(entry =>
      fs.existsSync(entry) && fs.statSync(entry).isFile());
    if (!file || !/\.tsx?$/.test(file)) return original(base);
    return load(file);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  compiled.set(filename, loaded.exports);
  return loaded.exports;
}

const { LITURGY_HOURS_ID, LITURGY_MASS_ID, LITURGY_HOURS, parseLiturgyDate } = load(path.join(src, 'lib/liturgy-hours.ts'));
const { readLiturgy } = load(path.join(src, 'lib/liturgy-hours-reader.ts'));
const { getChileanMassSelection } = load(path.join(src, 'lib/liturgy-chile.ts'));
const { readMass, loadLectionary } = load(path.join(src, 'lib/liturgy-mass-reader.ts'));
const { loadRegionalHours } = load(path.join(src, 'lib/liturgy-hours-chile.ts'));
const corpusPath = path.resolve(__dirname, '../public/liturgy/breviarium-3.1.8.js');
const corpus = import(pathToFileURL(corpusPath).href);
const read = async (date, hour) => (await readLiturgy(await corpus, parseLiturgyDate(date), hour))[0];
const readingText = reading => reading.sections.map(section => [section.title, section.text].filter(Boolean).join('\n')).join('\n');

test('liturgical dates preserve valid local dates, leap days and far-future years', () => {
  for (const invalid of ['', '2026-02-29', '2026-13-01', '14/11/2026', '100000-01-01']) {
    assert.equal(parseLiturgyDate(invalid), null);
  }
  assert.equal(parseLiturgyDate('2028-02-29').getHours(), 12);
  assert.equal(parseLiturgyDate('2300-01-01').getFullYear(), 2300);
  assert.equal(parseLiturgyDate('99999-12-31').getFullYear(), 99999);
});

test('Chilean calendar observes the national feasts, rank and split between Mass and Hours', async () => {
  const { getChileanLiturgicalDay } = await corpus;
  const day = date => getChileanLiturgicalDay(parseLiturgyDate(date));
  for (const [date, id, rank] of [
    ['2026-01-04', 'epiphany_of_the_lord', 'SOLEMNITY'],
    ['2026-01-06', 'tuesday_after_epiphany', 'WEEKDAY'],
    ['2026-02-11', 'our_lady_of_lourdes', 'MEMORIAL'],
    ['2026-05-03', 'easter_time_5_sunday', 'SUNDAY'],
    ['2026-05-04', 'philip_and_james_apostles', 'FEAST'],
    ['2026-05-17', 'ascension_of_the_lord', 'SOLEMNITY'],
    ['2026-05-28', 'our_lord_jesus_christ_the_eternal_high_priest', 'FEAST'],
    ['2026-06-07', 'most_holy_body_and_blood_of_christ', 'SOLEMNITY'],
    ['2026-07-13', 'teresa_of_jesus_of_los_andes_virgin', 'FEAST'],
    ['2026-07-16', 'our_lady_of_mount_carmel', 'SOLEMNITY'],
    ['2026-08-18', 'alberto_hurtado_priest', 'MEMORIAL'],
    ['2026-09-14', 'ordinary_time_24_monday', 'WEEKDAY'],
    ['2026-12-12', 'our_lady_of_guadalupe', 'FEAST'],
    ['2027-05-03', 'exaltation_of_the_holy_cross', 'FEAST'],
    ['2027-08-30', 'rose_of_lima_virgin', 'FEAST'],
    ['2028-07-16', 'our_lady_of_mount_carmel', 'SOLEMNITY'],
  ]) {
    const { hours, mass } = await day(date);
    assert.equal(hours.id, id, date);
    assert.equal(hours.rank, rank, date);
    assert.deepEqual(hours, mass, date);
  }
  assert.ok((await day('2026-08-26')).optional.some(entry => entry.id === 'ceferino_namuncura'));
  assert.ok((await day('2027-05-24')).optional.some(entry => entry.id === 'mary_help_of_christians'));
  const advent = await day('2019-12-08');
  assert.equal(advent.hours.id, 'advent_2_sunday');
  assert.equal(advent.mass.id, 'immaculate_conception_of_the_blessed_virgin_mary');
  assert.equal((await day('2019-12-09')).mass.id, 'advent_2_monday');
  const holyThursday = await day('2026-04-02');
  assert.equal(holyThursday.hours.id, 'holy_thursday');
  assert.equal(holyThursday.mass.id, 'thursday_of_the_lords_supper');
});


test('Chilean calendar and Mass selection work for every date of 2073 with network disabled', async (t) => {
  const blocked = t.mock.method(globalThis, 'fetch', () => { throw new Error('Network disabled'); });
  const { getChileanLiturgicalDay } = await corpus;
  const day = date => getChileanLiturgicalDay(parseLiturgyDate(date));
  for (const date = new Date(2073, 0, 1, 12); date.getFullYear() === 2073; date.setDate(date.getDate() + 1)) {
    const liturgy = await getChileanLiturgicalDay(date);
    assert.match(liturgy.hours.psalterWeek, /^WEEK_[1-4]$/);
    const mass = getChileanMassSelection(liturgy);
    assert.ok(mass.lectionaryId);
    assert.match(mass.sundayCycle, /^YEAR_[ABC]$/);
    assert.match(mass.weekdayCycle, /^YEAR_[12]$/);
  }
  assert.equal((await day('2073-03-26')).hours.id, 'easter_sunday');
  const november = getChileanMassSelection(await day('2073-11-14'));
  assert.equal(november.lectionaryId, 'ordinary_time_32_tuesday');
  assert.equal(november.weekdayCycle, 'YEAR_1');
  const advent = getChileanMassSelection(await day('2073-12-03'));
  assert.equal(advent.sundayCycle, 'YEAR_A');
  assert.equal(advent.weekdayCycle, 'YEAR_2');
  const hurtado = getChileanMassSelection(await day('2026-08-18'));
  assert.equal(hurtado.lectionaryId, 'ordinary_time_20_tuesday');
  assert.equal(hurtado.properReferences, undefined);
  const motherOfTheChurch = getChileanMassSelection(await day('2026-05-25'));
  assert.equal(motherOfTheChurch.lectionaryId, 'mary_mother_of_the_church');
  assert.deepEqual(motherOfTheChurch.properReferences.gospel, ['Jn 19, 25-34']);
  const holyCross = getChileanMassSelection(await day('2025-05-03'));
  assert.deepEqual(holyCross.properReferences.psalm, ['Sal 77, 1-2. 34-38']);
  const carmen = getChileanMassSelection(await day('2026-07-16'));
  assert.equal(carmen.lectionaryId, 'our_lady_of_mount_carmel');
  assert.equal(carmen.properReferences.gospel[0], 'Jn 2, 1-11');
  assert.equal(carmen.properReferences.second[0], '1 Tim 2, 1-8');
  const teresa = getChileanMassSelection(await day('2026-07-13'));
  assert.deepEqual(teresa.properReferences.first, ['Os 2, 14-20', 'Flp 4, 4-9']);
  assert.equal(teresa.properReferences.second, undefined);
  assert.equal(blocked.mock.callCount(), 0);
});

test('all seven hours and the Invitatory resolve on first use with external network disabled', async (t) => {
  const blocked = t.mock.method(globalThis, 'fetch', () => { throw new Error('Network disabled'); });
  const cases = [
    ['2026-11-13', /Viernes de la 32ª semana/],
    ['2026-12-25', /Navidad/],
    ['2027-04-07', /Feria del día|Juan Bautista de la Salle/],
    ['2073-11-14', /Martes de la 32ª semana/],
    ['2100-03-28', /Pascua/],
    ['2300-01-01', /María/],
  ];
  for (const [date, celebration] of cases) {
    for (const hour of LITURGY_HOURS) {
      const reading = await read(date, hour.id);
      assert.ok(reading.sections.length >= 2, `${date} ${hour.id}`);
      assert.match(reading.celebration, celebration);
    }
  }
  assert.equal(blocked.mock.callCount(), 0);
  assert.doesNotMatch(fs.readFileSync(corpusPath, 'utf8'), /\b(?:fetch\s*\(|XMLHttpRequest|WebSocket)\b/);
});

test('Vespers and Compline respect precedence, solemnities and the Sunday cycle', async () => {
  const ordinarySaturday = await read('2026-11-14', 'visperas');
  assert.equal(ordinarySaturday.label, 'I Vísperas');
  assert.match(ordinarySaturday.celebration, /33º domingo/);
  assert.match(readingText(ordinarySaturday), /Al que tiene se le dará/);
  assert.doesNotMatch(readingText(ordinarySaturday), /Año [ABC]/);
  const christmas = await read('2026-12-24', 'visperas');
  assert.equal(christmas.label, 'I Vísperas');
  assert.equal(christmas.celebration, 'Navidad');
  assert.match(readingText(christmas), /Cuando salga el sol/);
  assert.match(readingText(await read('2026-12-24', 'completas')), /Salmo 4\b/);
  assert.match(readingText(await read('2026-12-25', 'completas')), /Salmo 90\b/);
  assert.match((await read('2073-12-24', 'laudes')).celebration, /4º domingo de Adviento/);
  const christmasOnMonday = await read('2073-12-24', 'visperas');
  assert.equal(christmasOnMonday.label, 'I Vísperas');
  assert.equal(christmasOnMonday.celebration, 'Navidad');
  assert.equal((await read('2073-12-24', 'completas')).celebration, 'Navidad');
  assert.equal((await read('2026-11-01', 'visperas')).celebration, 'Todos los Santos');
  assert.equal((await read('2026-05-17', 'laudes')).celebration, 'Ascensión del Señor');
  assert.match((await read('2026-06-07', 'laudes')).celebration, /Corpus Christi|Cuerpo y Sangre/);
  const january = await read('2027-01-02', 'visperas');
  assert.equal(january.label, 'I Vísperas');
  assert.match(january.celebration, /domingo.*Navidad/i);
  assert.match(readingText(january), /Salmo 118, 105-112/);
  const easterOctave = await read('2026-04-11', 'visperas');
  assert.equal(easterOctave.label, 'I Vísperas');
  assert.match(easterOctave.celebration, /Divina Misericordia/);
});

test('Triduum and Easter select their rubrics and readings', async () => {
  const thursday = readingText(await read('2026-04-02', 'completas'));
  const friday = readingText(await read('2026-04-03', 'completas'));
  assert.match(thursday, /se sometió incluso a la muerte\./);
  assert.doesNotMatch(thursday, /muerte de cruz/);
  assert.match(friday, /y una muerte de cruz\./);
  assert.doesNotMatch(friday, /Dios lo levantó/);
  const holySaturday = await read('2026-04-04', 'completas');
  assert.match(holySaturday.notice, /Vigilia Pascual/);
  assert.match(readingText(holySaturday), /Dios lo levantó/);
  assert.match(readingText(await read('2026-04-06', 'completas')), /Este es el día en que actuó el Señor/);
  const vigil = await read('2026-04-05', 'oficio');
  assert.equal(vigil.label, 'Vigilia Pascual');
  assert.ok(vigil.sections.length >= 9);
  assert.match(readingText(vigil), /Te Deum/);
  assert.match(readingText(vigil), /puertas de la vida/);
  const thursdayOffice = await read('2026-05-07', 'oficio');
  assert.match(readingText(thursdayOffice), /Como me envió el Padre/);
});

test('the Hours are an opt-in at the end of Plan de Vida and Mass readings remain inside Santa Misa', () => {
  const { initialPrayers } = load(path.join(src, 'lib/data.tsx'));
  const { applyPredefinedPrayerState } = load(path.join(src, 'context/settings/normalize.ts'));
  const { getPrayerPathIds, isNavigationOnlyPrayerNode } = load(path.join(src, 'components/main/prayer-navigation.ts'));
  const entry = initialPrayers.find(prayer => prayer.id === LITURGY_HOURS_ID);
  assert.equal(entry.categoryId, 'plan-de-vida');
  assert.equal(isNavigationOnlyPrayerNode(entry), true);
  assert.equal(applyPredefinedPrayerState(initialPrayers, [], {}).some(prayer => prayer.id === entry.id), false);
  const enabled = applyPredefinedPrayerState(initialPrayers, [entry.id], {}, [entry.id]);
  assert.equal(enabled.filter(prayer => prayer.categoryId === 'plan-de-vida').at(-1).id, entry.id);
  const massFolder = initialPrayers.find(prayer => prayer.id === 'santa-misa');
  const mass = massFolder.prayers.find(prayer => prayer.id === LITURGY_MASS_ID);
  assert.equal(mass.categoryId, 'plan-de-vida');
  assert.equal(isNavigationOnlyPrayerNode(mass), true);
  assert.deepEqual(getPrayerPathIds(mass.id, initialPrayers), ['santa-misa', LITURGY_MASS_ID]);
  const restored = applyPredefinedPrayerState(initialPrayers, [mass.id], {});
  assert.deepEqual(getPrayerPathIds(mass.id, restored), ['santa-misa', LITURGY_MASS_ID]);
});

test('Ordinary Time Compline aligns Spanish and Latin by form and uses the prayer of weekday solemnities', async () => {
  const module = await corpus;
  const regional = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/liturgy/hours-cl.json')));
  const atNight = async value => (await readLiturgy(module, parseLiturgyDate(value), 'completas', regional))[0];
  for (const value of ['2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06', '2026-02-07', '2026-02-08', '2073-11-14']) {
    const prayer = await atNight(value);
    assert.equal(prayer.latinSections.length, prayer.sections.length, value);
    assert.match(prayer.latinSections[0].text, /Deus, in adiutórium/);
    const psalms = sections => sections.flatMap(({ title }) => title?.match(/^(?:Salmo|Psalmus) (\d+)/)?.[1] ?? []);
    assert.deepEqual(psalms(prayer.latinSections), psalms(prayer.sections), value);
    assert.match(prayer.latinSections.at(-1).text, /^Salve, Regina/);
  }
  for (const value of ['2026-07-15', '2026-07-16']) {
    const prayer = await atNight(value);
    assert.match(prayer.celebration, /Carmen/);
    assert.equal(prayer.latinSections.length, prayer.sections.length);
    assert.match(prayer.latinSections.find(section => section.title === 'Oratio').text, /habitatiónem istam/);
    assert.match(prayer.sections.find(section => section.title === 'Oración').text, /esta habitación/);
  }
  assert.doesNotMatch((await atNight('2026-02-08')).sections.find(section => section.title === 'Oración').text, /esta habitación|Después de/);
  assert.match((await atNight('2026-04-03')).sections.find(section => section.title === 'Oración').text, /esta habitación/);
  assert.equal((await atNight('2026-04-05')).latinSections, undefined);
});

test('Chilean Ordo 24–30 August 2026: packaged offices, optional memorials and Sunday readings', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Network disabled'); });
  const engine = await corpus;
  const assets = path.dirname(corpusPath);
  const regional = JSON.parse(fs.readFileSync(path.join(assets, 'hours-cl.json'), 'utf8'));
  const lectionary = JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(path.join(assets, 'lectionary-cl.json.gzip'))));
  // CECh, Ordo 2026, Tiempo ordinario II, PDF pp. 33–34. The August 30
  // Mass readings agree across sources; the celebration and Office are disputed.
  const week = [
    [24, 'bartholomew_apostle', 'FEAST', [], /Juan\s+1,\s*45-51/i],
    [25, 'ordinary_time_21_tuesday', 'WEEKDAY', ['louis_ix_of_france', 'joseph_of_calasanz_priest'], /Mateo\s+23,\s*23-26/i],
    [26, 'ordinary_time_21_wednesday', 'WEEKDAY', ['ceferino_namuncura'], /Mateo\s+23,\s*27-32/i],
    [27, 'monica_of_hippo', 'MEMORIAL', [], /Mateo\s+24,\s*42-51/i],
    [28, 'augustine_of_hippo_bishop', 'MEMORIAL', [], /Mateo\s+25,\s*1-13/i],
    [29, 'passion_of_saint_john_the_baptist', 'MEMORIAL', [], /Mateo\s+25,\s*14-30/i],
    [30, undefined, undefined, [], /Mateo\s+16,\s*21-27/i],
  ];
  for (const [number, id, rank, options, gospel] of week) {
    const date = new Date(2026, 7, number, 12);
    const day = await engine.getChileanLiturgicalDay(date);
    if (id) {
      assert.deepEqual([day.hours.id, day.hours.rank, day.mass.id, day.mass.rank], [id, rank, id, rank], String(number));
      assert.deepEqual(day.optional.map(option => option.id).sort(), [...options].sort(), String(number));
    }
    const mass = readMass(lectionary, date, day)[0];
    assert.match(mass.sections.find(section => section.title === 'Evangelio').text, gospel, String(number));
    const [lauds] = await readLiturgy(engine, date, 'laudes', regional);
    assert.ok(lauds.sections.length > 1, String(number));
    if (number === 29) {
      const [vespers] = await readLiturgy(engine, date, 'visperas', regional);
      assert.equal(vespers.label, 'I Vísperas');
      assert.match(vespers.celebration, /22º domingo/i);
    }
  }
});

test('Mass readings begin with the proclaimed text and keep the Lateran readings in order', async () => {
  const { getChileanLiturgicalDay } = await corpus;
  const lectionary = JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(path.join(path.dirname(corpusPath), 'lectionary-cl.json.gzip'))));
  const forms = new Set(Object.values(lectionary).flat());
  for (const { id, p } of forms) {
    for (const { s, o } of p) {
      for (const passage of o) {
        assert.ok(!Object.hasOwn(passage, 'i'), `${id} ${s} has an editorial subtitle`);
        if (s.startsWith('SAL')) assert.doesNotMatch(passage.x, /\nPalabra de Dios\.?$/i, id);
      }
    }
  }

  const massOn = async key => {
    const date = parseLiturgyDate(key);
    return readMass(lectionary, date, await getChileanLiturgicalDay(date))[0].sections;
  };
  // A previously cached lectionary may still contain the source subtitles.
  const weekday = lectionary['dda:fer:34:1'].find(form => form.id.endsWith('.II'));
  weekday.p.find(section => section.s === 'L1').o[0].i = 'Tenían escrito en la frente el nombre del Cordero y de su Padre';
  weekday.p.find(section => section.s === 'EV').o[0].i = 'Vio una viuda de condición muy humilde';
  delete lectionary['ordo:2026-11-23'];

  for (const [key, first, gospel] of [
    ['2026-11-21', /^Se me dijo a mí, Juan:/, /^Se acercaron a Jesús algunos saduceos/],
    ['2026-11-23', /^Yo, Juan, vi al Cordero/, / los ojos, Jesús vio a unos ricos/],
  ]) {
    const mass = await massOn(key);
    assert.match(mass.find(section => section.title === 'Primera lectura').text.split('\n\n')[1], first, key);
    assert.match(mass.find(section => section.title === 'Evangelio').text.split('\n\n')[1], gospel, key);
  }

  const lateran = (await massOn('2026-11-09')).filter(section => /lectura|Salmo/.test(section.title));
  assert.deepEqual(lateran.map(section => section.title), ['Primera lectura', 'Primera lectura · O bien', 'Salmo responsorial']);
  assert.match(lateran[1].text, /Corinto 3, 9c-11\. 16-17\n\nHermanos:/);
  assert.match(lateran[2].text, /^Sal 45, 2-3/);
});

test('the published Chilean Ordo takes priority over calculated Mass formularies offline', async () => {
  const { getChileanLiturgicalDay } = await corpus;
  const lectionary = JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(path.join(path.dirname(corpusPath), 'lectionary-cl.json.gzip'))));
  const index = JSON.parse(fs.readFileSync(path.join(__dirname, '../scripts/lectionary-ordo-chile.json'), 'utf8'));
  const massOn = async key => {
    const date = parseLiturgyDate(key);
    return readMass(lectionary, date, await getChileanLiturgicalDay(date));
  };

  for (const [date, entry] of Object.entries(index)) {
    const readings = await massOn(date);
    assert.ok(readings.length, date);
    assert.deepEqual(readings[0].ordo, {
      url: 'https://www.iglesia.cl/docs/' + entry.source + '.pdf#page=' + entry.page,
      references: entry.references,
      pending: entry.pending ?? false,
      unverified: entry.unverified ?? [],
    }, date);
  }

  const [weekday] = await massOn('2026-11-23');
  assert.equal(weekday.ordo.pending, false);
  assert.match(readingText(weekday), /Apocalipsis 14, 1-5[\s\S]+y son vírgenes/);
  const psalm = weekday.sections.find(section => section.title === 'Salmo responsorial').text;
  assert.match(psalm, /^Sal 23, 1-6\n\n\$℟\$ Así son los que buscan tu rostro, Señor\./);
  assert.match(psalm, /ni jura falsamente\. \$℟\$/);
  assert.equal(psalm.match(/\$℟\$/g).length, 4);
  assert.doesNotMatch(psalm, /R\./);
  assert.match(readingText(weekday), /Lucas 21, 1-4\n\nLevantando los ojos/);

  const [ferial, memorial] = await massOn('2026-11-21');
  assert.match(readingText(ferial), /Lucas 20, 27-40/);
  assert.equal(memorial.label, 'Lecturas del santoral');
  assert.match(readingText(memorial), /me llamarán feliz\. \$℟\$/m);
  assert.match(readingText(memorial), /Zacarías 2, 14-17[\s\S]+Mateo 12, 46-50/);

  assert.match(readingText((await massOn('2026-01-31'))[0]), /Marcos 4, 35-41/);
  const [ferialNovember24, memorialNovember24] = await massOn('2026-11-24');
  assert.match(readingText(ferialNovember24), /Lucas 21, 5-9/);
  assert.match(readingText(memorialNovember24), /Mateo 10, 17-22/);
  const [november25] = await massOn('2026-11-25');
  assert.equal(november25.santiago, '2026-11-25');
  assert.equal(november25.sections.find(section => section.title === 'Salmo responsorial').notice, undefined);
  assert.match(readingText(november25), /Lucas 21, 10-19/);
  const [future] = await massOn('2073-11-14');
  assert.equal(future.ordo, undefined);
  assert.match(readingText(future), /Lucas 17, 7-10/);
});

test('recurring Chilean readings use the correct weekday formularies and Sunday cycle without annual data', async () => {
  const { getChileanLiturgicalDay } = await corpus;
  const lectionary = JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(path.join(path.dirname(corpusPath), 'lectionary-cl.json.gzip'))));
  const projected = Object.fromEntries(Object.entries(lectionary).filter(([key]) => !key.startsWith('ordo:')));
  const massOn = async key => {
    const date = parseLiturgyDate(key);
    return readMass(projected, date, await getChileanLiturgicalDay(date))[0];
  };

  const thursday = await massOn('2027-08-19');
  assert.match(readingText(thursday), /Jueces 11, 29-39a[\s\S]+Jefté/);
  assert.match(readingText(thursday), /Sal 39, 5\. 7-10[\s\S]+Mateo 22, 1-14/);
  assert.match(readingText(await massOn('2027-09-02')), /Colosas 1, 9-14\n\n/);
  assert.match(readingText(await massOn('2028-11-28')), /Lucas 21, 5-9/);
  assert.match(readingText(await massOn('2028-11-29')), /Lucas 21, 10-19/);

  for (const [date, citation] of [
    ['2026-01-31', /Marcos 4, 35-41/],
    ['2026-02-17', /Marcos 8, 13-21/],
    ['2026-05-29', /Marcos 11, 11-25/],
    ['2026-06-08', /Mateo 4, 25-5, 12/],
    ['2026-08-19', /Mateo 19, 30[–-]20, 16/],
    ['2026-09-10', /Lucas 6, 27-36/],
    ['2026-09-11', /Lucas 6, 37-42/],
    ['2030-11-01', /Mateo 4, 25\s*[-–]\s*5, 12/],
  ]) {
    const gospel = (await massOn(date)).sections.find(section => section.title === 'Evangelio');
    assert.match(gospel.text, citation, date);
  }
  assert.match(readingText(await massOn('2027-12-04')), /Isaías 30, 19-21\. 23-26/);

  for (const [date, citation] of [
    ['2026-08-06', /Mateo 17, 1-9/],
    ['2027-08-06', /Marcos 9, 2-10/],
    ['2028-08-06', /Lucas 9, 28b-36/],
  ]) {
    const gospels = (await massOn(date)).sections.filter(section => section.title.startsWith('Evangelio'));
    assert.equal(gospels.length, 1, date);
    assert.match(gospels[0].text, citation, date);
  }

  for (const [date, citation] of [
    ['2023-08-07', /Mateo 14, 13-21/],
    ['2023-08-08', /Mateo 14, 22-36/],
    ['2026-08-03', /Mateo 14, 22-36/],
    ['2026-08-04', /Mateo 15, 1-2\. 10-14/],
    ['2027-08-02', /Mateo 14, 13-21/],
    ['2027-08-03', /Mateo 14, 22-36/],
  ]) {
    const gospels = (await massOn(date)).sections.filter(section => section.title.startsWith('Evangelio'));
    assert.equal(gospels.length, 1, date);
    assert.match(gospels[0].text, citation, date);
  }

  assert.match(readingText(await massOn('2031-01-06')), /Mateo 4, 12-17\. 23-25/);
  assert.match(readingText(await massOn('2031-01-07')), /Marcos 6, 34-44/);
});

test('proper evening vigils and the Chrism Mass can be selected on their projected dates', async () => {
  const { getChileanLiturgicalDay } = await corpus;
  const lectionary = JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(path.join(path.dirname(corpusPath), 'lectionary-cl.json.gzip'))));
  const projected = Object.fromEntries(Object.entries(lectionary).filter(([key]) => !key.startsWith('ordo:')));
  for (const [key, label, expected] of [
    ['2028-04-13', 'Misa crismal', /Lucas 4, 16-21/],
    ['2028-06-03', 'Vigilia de Pentecostés · Forma breve', /Juan 7, 37-39/],
    ['2031-05-31', 'Vigilia de Pentecostés · Forma breve', /Juan 7, 37-39/],
    ['2027-06-23', 'Vigilia del Nacimiento de san Juan Bautista', /Lucas 1, 5-17/],
    ['2033-06-22', 'Vigilia del Nacimiento de san Juan Bautista', /Lucas 1, 5-17/],
    ['2028-06-28', 'Vigilia de san Pedro y san Pablo', /Juan 21, 1\. 15-19/],
    ['2028-08-14', 'Vigilia de la Asunción', /Lucas 11, 27-28/],
    ['2028-12-24', 'Vigilia de Navidad', /Mateo 1, 1-25/],
  ]) {
    const date = parseLiturgyDate(key);
    const forms = readMass(projected, date, await getChileanLiturgicalDay(date));
    assert.notEqual(forms[0].label, label, key);
    const extra = forms.find(form => form.label === label);
    assert.ok(extra, key);
    assert.match(readingText(extra), expected, key);
  }
  for (const [key, id, gospel] of [
    ['2028-06-23', 'most_sacred_heart_of_jesus', /Lucas 15, 3-7/],
    ['2028-06-24', 'nativity_of_john_the_baptist', /Lucas 1, 57-66\. 80/],
    ['2030-06-29', 'peter_and_paul_apostles', /Mateo 16, 13-19/],
    ['2033-06-23', 'nativity_of_john_the_baptist', /Lucas 1, 57-66\. 80/],
    ['2033-06-24', 'most_sacred_heart_of_jesus', /Juan 19, 31-37/],
  ]) {
    const date = parseLiturgyDate(key);
    const day = await getChileanLiturgicalDay(date);
    const [mass] = readMass(projected, date, day);
    assert.equal(day.mass.id, id, key);
    assert.equal(day.johnBaptistVigil, false, key);
    assert.match(mass.sections.find(section => section.title === 'Evangelio').text, gospel, key);
  }
  const massOn = async (key, data) => {
    const date = parseLiturgyDate(key);
    return readMass(data, date, await getChileanLiturgicalDay(date));
  };
  const [sunday, memorial] = await massOn('2031-11-02', projected);
  assert.equal(sunday.label, 'Lecturas del domingo');
  assert.match(readingText(sunday), /Lucas 19, 1-10/);
  assert.equal(memorial.label, 'Lecturas de difuntos');
  assert.match(readingText(memorial), /Corinto 15, 51-57/);
  assert.match(readingText(memorial), /Juan 11, 17-27/);
  const [annual] = await massOn('2026-11-02', lectionary);
  assert.deepEqual(annual.sections, memorial.sections);
  assert.equal(annual.ordo.pending, false);
  const [ordinarySunday, dedication] = await massOn('2031-11-09', projected);
  assert.match(readingText(ordinarySunday), /Lucas 20, 27-38/);
  assert.equal(dedication.label, 'Dedicación de la Basílica de Letrán');
  assert.match(dedication.sections.find(section => section.title === 'Segunda lectura').text, /Corinto 3, 9c-11\. 16-17/);
});

test('the Chilean source review retains the approved passages and liturgical alternatives offline', async () => {
  const { getChileanLiturgicalDay } = await corpus;
  const lectionary = JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(path.join(path.dirname(corpusPath), 'lectionary-cl.json.gzip'))));
  const massOn = async key => {
    const date = parseLiturgyDate(key);
    return readMass(lectionary, date, await getChileanLiturgicalDay(date));
  };

  const [magdalene] = await massOn('2026-07-22');
  assert.equal(magdalene.ordo.pending, false);
  assert.match(readingText(magdalene), /Cantares 3, 1-4a/);
  assert.match(readingText(magdalene), /Primera lectura · O bien[\s\S]+Corinto 5, 14-17/);
  for (const date of ['2026-11-11', '2031-11-11']) {
    const [, memorial] = await massOn(date);
    assert.equal(memorial.label, 'Lecturas del santoral', date);
    assert.match(readingText(memorial), /Isaías 61, 1-3a[\s\S]+Sal 88, 2-5[\s\S]+Mateo 25, 31-40/, date);
  }

  const [corinthians] = await massOn('2026-09-10');
  assert.match(readingText(corinthians), /Corinto 8, 1\. 4b-13[\s\S]+uso de esta libertad/);
  const [priest] = await massOn('2026-05-28');
  assert.match(readingText(priest), /Primera lectura · O bien[\s\S]+Hebreos 10, 12-23/);
  const [carmen] = await massOn('2028-07-16');
  const secondReadings = carmen.sections.filter(section => section.title.startsWith('Segunda lectura'));
  assert.equal(secondReadings.length, 3);
  assert.match(secondReadings[0].text, /Hechos de los Apóstoles 1, 12\s*[-–]\s*14/);
  assert.match(secondReadings[1].text, /Timoteo 2, 1-8/);
  assert.match(secondReadings[2].text, /Galacia 4, 4-7/);
  assert.match(carmen.sections.find(section => section.title === 'Salmo responsorial').text, /Sal 84/);
  assert.match(readingText(carmen), /Judit 13, 18-20a; 15, 8-10[\s\S]+Jdt 16, 13-17/);
  const [, pius] = await massOn('2026-08-21');
  assert.match(readingText(pius), /Sal 88, 2-5\. 21-22\. 25\. 27[\s\S]+Juan 21, 1\. 15-17/);
  const [pentecost] = await massOn('2026-05-24');
  assert.match(readingText(pentecost), /Segunda lectura · O bien[\s\S]+Galacia 5, 16-25/);

  for (const date of ['2026-05-23', '2031-05-31']) {
    const forms = await massOn(date);
    const vigil = forms.find(form => form.label === 'Vigilia de Pentecostés · Forma extensa');
    assert.ok(vigil, date);
    assert.equal(vigil.sections.filter(section => section.title === 'Salmo responsorial').length, 4, date);
    assert.match(readingText(vigil), /Salmo responsorial · O bien\nSal 18, 8\. 9\. 10\. 11/, date);
    assert.match(readingText(vigil), /Epístola\n[^\n]+8, 22-27[\s\S]+Juan 7, 37-39/, date);
  }
});

test('Santiago editions resolve every reviewed Mass entry and apply to recurring forms', async () => {
  const { getChileanLiturgicalDay } = await corpus;
  const lectionary = JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(path.join(path.dirname(corpusPath), 'lectionary-cl.json.gzip'))));
  const editions = require('../scripts/lectionary-santiago-chile.json');
  const index = require('../scripts/lectionary-ordo-chile.json');
  const massOn = async key => {
    const date = parseLiturgyDate(key);
    return readMass(lectionary, date, await getChileanLiturgicalDay(date));
  };

  for (const [date, entry] of Object.entries(index)) {
    assert.deepEqual(entry.unverified ?? [], [], date);
  }
  for (const [date, { edition }] of Object.entries(editions)) {
    const [mass] = await massOn(date);
    assert.equal(mass.santiago, edition, date);
    assert.equal(mass.ordo.pending, false, date);
    assert.ok(mass.sections.every(section => section.notice === undefined), date);
  }
  const [stephen] = await massOn('2025-12-26');
  const first = stephen.sections.find(section => section.title === 'Primera lectura').text;
  assert.match(first, /Hechos de los Apóstoles 6, 8-10[\s\S]+7, 54-60/);
  assert.doesNotMatch(first, /8, 2|sepultura/i);

  for (const date of ['2026-10-02', '2031-10-02']) {
    const [angels, ferial] = await massOn(date);
    assert.match(readingText(angels), /Éxodo 23[\s\S]+Mateo 18/, date);
    assert.equal(ferial.label, 'Lecturas de la feria', date);
  }
  assert.equal((await massOn('2027-12-16'))[0].santiago, '2022-12-15');
});

test('packaged Chilean Hour and Mass readers cover current and future dates offline', async t => {
  const requested = new Set();
  const blocked = t.mock.method(globalThis, 'fetch', async url => {
    assert.match(url, /^\/liturgy\/(hours-cl\.json|lectionary-cl\.json\.gzip)$/);
    requested.add(url);
    return new Response(fs.readFileSync(path.join(__dirname, '../public', url)));
  });
  const [engine, regional, lectionary] = await Promise.all([corpus, loadRegionalHours(), loadLectionary()]);
  const massOn = async key => {
    const date = parseLiturgyDate(key);
    return readMass(lectionary, date, await engine.getChileanLiturgicalDay(date));
  };
  const hoursOn = async (key, hour, memorial) => (await readLiturgy(engine, parseLiturgyDate(key), hour, regional, memorial))[0];
  for (const year of [2026, 2027, 2028, 2073, 9999, 10000, 99999]) {
    for (const date = new Date(year, 0, 1, 12); date.getFullYear() === year; date.setDate(date.getDate() + 1)) {
      const day = await engine.getChileanLiturgicalDay(date);
      const forms = readMass(lectionary, date, day);
      const [mass] = forms;
      assert.ok(mass, `${date.toLocaleDateString()} ${day.mass.id}`);
      assert.ok(mass.sections.some(section => section.title === 'Primera lectura'), day.mass.id);
      assert.ok(mass.sections.some(section => section.title === 'Salmo responsorial'), day.mass.id);
      assert.ok(mass.sections.some(section => section.title === 'Evangelio'), day.mass.id);
      for (const { sections } of forms) {
        for (const { text } of sections) assert.doesNotMatch(text, /‹\/?[a-z]+›/i, day.mass.id);
      }
      if (year === 2073) {
        for (const { id } of LITURGY_HOURS) {
          const [office] = await readLiturgy(engine, date, id, regional);
          assert.ok(office?.sections.length >= 2, `${date.toLocaleDateString()} ${id} ${day.hours.id}`);
        }
      }
    }
  }
  assert.match(readingText((await massOn('10000-04-16'))[0]), /Juan 20, 1-9/);
  assert.match(readingText((await massOn('99999-03-28'))[0]), /Juan 20, 1-9/);
  const [future] = await massOn('2073-11-14');
  assert.match(readingText(future), /Sabiduría 2, 23-3, 9/);
  assert.match(readingText(future), /Lucas 17, 7-10/);
  assert.ok(!future.sections.some(section => section.title === 'Segunda lectura'));
  const [carmen] = await massOn('2026-07-16');
  assert.match(readingText(carmen), /Sal 129, 1-8/);
  assert.ok(carmen.sections.some(section => section.title === 'Segunda lectura'));
  const [motherOfTheChurch, ferial] = await massOn('2026-05-25');
  assert.match(readingText(motherOfTheChurch), /Juan 19, 25-27/);
  assert.match(readingText(ferial), /Marcos 10, 17-27/);
  assert.equal(ferial.label, 'Lecturas de la feria');
  const [projectedMotherOfTheChurch, longerForm] = await massOn('2027-05-17');
  assert.match(readingText(projectedMotherOfTheChurch), /Juan 19, 25-27/);
  assert.match(readingText(longerForm), /Juan 19, 25-34/);
  assert.equal((await massOn('2026-12-25'))[0].label, 'Misa del día');
  assert.equal((await massOn('2026-04-04'))[0].label, 'Vigilia Pascual');
  assert.match(readingText(await hoursOn('2073-11-14', 'completas')), /Salmo 142/);
  assert.match((await hoursOn('2026-01-04', 'laudes')).celebration, /Epifanía/);
  const firstVespers = await hoursOn('2026-07-15', 'visperas');
  assert.equal(firstVespers.label, 'I Vísperas');
  assert.match(firstVespers.celebration, /Carmen/);
  assert.match(readingText(firstVespers), /hermosura del Carmelo/);
  assert.match(readingText(firstVespers), /Salmo 47\b/);
  assert.match(firstVespers.sections.find(section => section.title === 'Responsorio breve').text, /Extendió la nube/);
  const midday = await hoursOn('2026-07-16', 'sexta');
  const psalmody = midday.sections.find(section => section.title === 'Salmodia complementaria').text.split('\n\n');
  assert.match(psalmody[0], /Grande es el Señor nuestro Dios/);
  assert.equal(psalmody.at(-1), psalmody[0]);
  assert.match(midday.sections.find(section => section.title === 'Versículo').text, /prenda de tu protección/);
  const secondVespers = await hoursOn('2026-07-16', 'visperas');
  const intercessions = secondVespers.sections.findIndex(section => section.title === 'Preces');
  assert.match(secondVespers.sections[intercessions - 1].text, /Me gozaré en el Señor/);
  assert.match(secondVespers.sections.find(section => section.title === 'Himno').text, /María, tu Hijo de Belén/);
  assert.match(readingText(await hoursOn('2073-01-06', 'laudes')), /Salmo 50\b/);
  assert.match(readingText(await hoursOn('2073-01-07', 'laudes')), /Salmo 91\b/);
  assert.match(readingText(await hoursOn('2026-07-13', 'oficio')), /Solo Jesús es hermoso/);
  assert.match(readingText(await hoursOn('2026-08-18', 'laudes')), /san Alberto/i);
  const hurtadoOffice = await hoursOn('2026-08-18', 'oficio');
  const hurtadoSecondReading = hurtadoOffice.sections.findIndex(section => section.title === 'Segunda lectura');
  assert.match(hurtadoOffice.sections[hurtadoSecondReading].text, /Tranquilidad solo en Dios/);
  assert.match(hurtadoOffice.sections[hurtadoSecondReading + 1].title, /Gál 2, 20; Is 61, 1/);
  assert.match(hurtadoOffice.sections[hurtadoSecondReading + 2].text, /san Alberto/);
  assert.ok(hurtadoOffice.sections.some(section => section.title === 'Primera lectura'));
  assert.match(readingText(await hoursOn('2026-01-22', 'laudes', 'laura_vicuna_virgin')), /beata Laura/i);
  const lauraOffice = await hoursOn('2026-01-22', 'oficio', 'laura_vicuna_virgin');
  assert.match(lauraOffice.notice, /Propio salesiano/);
  const lauraReading = lauraOffice.sections.findIndex(section => section.title === 'Segunda lectura');
  assert.match(lauraOffice.sections[lauraReading].text, /Mi mejor oración es hacer la voluntad de Dios/);
  assert.match(lauraOffice.sections[lauraReading + 1].title, /Sal 70, 17/);
  assert.match(lauraOffice.sections[lauraReading + 2].text, /beata Laura/i);
  const ceferino = await hoursOn('2026-08-26', 'oficio', 'ceferino_namuncura');
  assert.match(ceferino.celebration, /Ceferino Namuncurá/);
  assert.match(ceferino.notice, /Propio salesiano/);
  const ceferinoReading = ceferino.sections.findIndex(section => section.title === 'Segunda lectura');
  assert.match(ceferino.sections[ceferinoReading].text, /Milán, 3 de octubre de 1904/);
  assert.match(ceferino.sections[ceferinoReading + 1].title, /Is 49, 2/);
  assert.match(ceferino.sections[ceferinoReading + 2].text, /santidad florecida en tierra patagónica/);
  assert.doesNotMatch((await hoursOn('2026-08-26', 'oficio')).celebration, /Ceferino/);
  assert.equal(requested.size, 2);
  assert.equal(blocked.mock.callCount(), 2);
});
