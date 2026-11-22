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
  for (const invalid of ['', '2026-02-29', '2026-13-01', '14/11/2026']) assert.equal(parseLiturgyDate(invalid), null);
  assert.equal(parseLiturgyDate('2028-02-29').getHours(), 12);
  assert.equal(parseLiturgyDate('2300-01-01').getFullYear(), 2300);
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
  for (const year of [2026, 2027, 2028, 2073]) {
    for (const date = new Date(year, 0, 1, 12); date.getFullYear() === year; date.setDate(date.getDate() + 1)) {
      const day = await engine.getChileanLiturgicalDay(date);
      const mass = readMass(lectionary, date, day)[0];
      assert.ok(mass, `${date.toLocaleDateString()} ${day.mass.id}`);
      assert.ok(mass.sections.some(section => section.title === 'Primera lectura'), day.mass.id);
      assert.ok(mass.sections.some(section => section.title === 'Salmo responsorial'), day.mass.id);
      assert.ok(mass.sections.some(section => section.title === 'Evangelio'), day.mass.id);
      if (year === 2073) {
        for (const { id } of LITURGY_HOURS) {
          const [office] = await readLiturgy(engine, date, id, regional);
          assert.ok(office?.sections.length >= 2, `${date.toLocaleDateString()} ${id} ${day.hours.id}`);
        }
      }
    }
  }
  const [future] = await massOn('2073-11-14');
  assert.match(readingText(future), /Sabiduría 2, 23-3, 9/);
  assert.match(readingText(future), /Lucas 17, 7-10/);
  assert.ok(!future.sections.some(section => section.title === 'Segunda lectura'));
  const [carmen] = await massOn('2026-07-16');
  assert.match(readingText(carmen), /Sal 129, 1-8/);
  assert.ok(carmen.sections.some(section => section.title === 'Segunda lectura'));
  assert.match(readingText((await massOn('2026-05-25'))[0]), /Juan 19, 25-34/);
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
