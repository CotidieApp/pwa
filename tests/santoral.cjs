const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

process.env.TZ = 'America/Santiago';
require.extensions['.ts'] = require.extensions['.tsx'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText, filename,
);

const { getLocalDateKey, parseCalendarDate } = require('../src/lib/calendar-date.ts');
const {
  CHRIST_THE_KING, getAdventDates, getAnnuumAvailability, getEasterDate, getFixedSaint, getMovableFeast,
  getSaintDaySelection,
} = require('../src/lib/movable-feasts.ts');
const { getGeneralLiturgicalColorName, isAdventSeason } = require('../src/lib/liturgical-color-rules.ts');
const webSaints = require('../src/lib/saints-data.json');
const androidSaints = require('../android/app/src/main/assets/saints-data.json');

// Independent dates from the Chilean 2027 calendar and the CECh's annual table.
// https://gcatholic.org/calendar/2027/CL-es
// https://www.iglesia.cl/tiempos_liturgicos.php
const movable2027 = {
  '01-03': 'Epifanía del Señor',
  '01-10': 'Bautismo del Señor',
  '02-10': 'Miércoles de Ceniza',
  '02-14': 'I Domingo de Cuaresma',
  '02-21': 'II Domingo de Cuaresma',
  '02-28': 'III Domingo de Cuaresma',
  '03-07': 'IV Domingo de Cuaresma',
  '03-14': 'V Domingo de Cuaresma',
  '03-21': 'Domingo de Ramos',
  '03-22': 'Lunes Santo',
  '03-23': 'Martes Santo',
  '03-24': 'Miércoles Santo',
  '03-25': 'Jueves Santo',
  '03-26': 'Viernes Santo',
  '03-27': 'Sábado Santo',
  '03-28': 'Domingo de Resurrección',
  '03-29': 'Lunes de la Octava de Pascua',
  '03-30': 'Martes de la Octava de Pascua',
  '03-31': 'Miércoles de la Octava de Pascua',
  '04-01': 'Jueves de la Octava de Pascua',
  '04-02': 'Viernes de la Octava de Pascua',
  '04-03': 'Sábado de la Octava de Pascua',
  '04-04': 'Domingo de la Divina Misericordia',
  '04-05': 'Anunciación del Señor',
  '04-11': 'III Domingo de Pascua',
  '04-18': 'IV Domingo de Pascua',
  '04-25': 'V Domingo de Pascua',
  '05-02': 'VI Domingo de Pascua',
  '05-09': 'Ascensión del Señor',
  '05-16': 'Pentecostés',
  '05-17': 'María, Madre de la Iglesia',
  '05-20': 'Jesucristo, Sumo y Eterno Sacerdote',
  '05-23': 'Santísima Trinidad',
  '05-30': 'Corpus Christi',
  '06-04': 'Sagrado Corazón de Jesús',
  '06-05': 'Inmaculado Corazón de María',
  '09-26': 'Día de Oración por Chile',
  '11-21': 'Nuestro Señor Jesucristo, Rey del Universo',
  '11-28': 'I Domingo de Adviento',
  '12-05': 'II Domingo de Adviento',
  '12-12': 'III Domingo de Adviento (Gaudete)',
  '12-19': 'IV Domingo de Adviento',
  '12-26': 'Sagrada Familia de Jesús, María y José',
};

test('2027 has exactly the expected mobile celebrations when each of its 365 days is evaluated', () => {
  const easter = getEasterDate(2027);
  const actual = {};
  let days = 0;
  for (let date = new Date(2027, 0, 1, 12); date.getFullYear() === 2027; date.setDate(date.getDate() + 1)) {
    days++;
    const key = getLocalDateKey(date).slice(5);
    const movable = getMovableFeast(date, easter);
    const fixed = getFixedSaint(date.getMonth() + 1, date.getDate());
    assert.ok(fixed?.name && fixed.bio && fixed.title, key);
    if (movable) actual[key] = movable.name;
  }
  assert.equal(days, 365);
  assert.deepEqual(actual, movable2027);
});

test('Annuum moves to settings immediately on the first day and starts anew next year', () => {
  const firstDay = getAdventDates(2026).christTheKing;
  const completed = getLocalDateKey(firstDay);
  assert.deepEqual(getAnnuumAvailability(parseCalendarDate('2026-11-21'), null), {
    bubbleVisible: false, settingsVisible: false,
  });
  assert.deepEqual(getAnnuumAvailability(firstDay, null), {
    bubbleVisible: true, settingsVisible: false,
  });
  assert.deepEqual(getAnnuumAvailability(firstDay, completed), {
    bubbleVisible: false, settingsVisible: true,
  });
  assert.deepEqual(getAnnuumAvailability(getAdventDates(2027).christTheKing, completed), {
    bubbleVisible: true, settingsVisible: false,
  });
});

test('the fixed devotional catalog contains one entry for every civil month and day, in both clients', () => {
  assert.deepEqual(androidSaints, webSaints);
  assert.equal(webSaints.saints.length, 366);
  for (let date = new Date(2024, 0, 1, 12); date.getFullYear() === 2024; date.setDate(date.getDate() + 1)) {
    assert.ok(getFixedSaint(date.getMonth() + 1, date.getDate()));
  }
  assert.ok(webSaints.saints.every(({ name }) => !/Rafael González|Rey del Universo|Epifanía del Señor|Sagrada Familia/.test(name)));
  assert.match(getFixedSaint(5, 3).name, /Exaltación de la Santa Cruz/);
  assert.match(getFixedSaint(5, 4).name, /Felipe y Santiago/);
  assert.match(getFixedSaint(8, 30).name, /Rosa de Lima/);
});

test('the fixed catalog highlights one observance and retains joint or locally significant entries', () => {
  for (const [month, day, name] of [
    [1, 22, 'Beata Laura Vicuña'],
    [5, 12, 'Santos Nereo y Aquileo, mártires'],
    [6, 29, 'Santos Pedro y Pablo, apóstoles'],
    [7, 29, 'Santos Marta, María y Lázaro'],
    [8, 26, 'Beato Ceferino Namuncurá'],
    [11, 15, 'San Alberto Magno'],
    [11, 17, 'Santa Isabel de Hungría'],
  ]) {
    assert.equal(getFixedSaint(month, day).name, name);
  }
  assert.deepEqual(
    webSaints.saints.filter(({ name }) => name.includes('/')).map(({ name }) => name),
    ['Nuestra Señora del Pilar / San Carlo Acutis', 'San Juan Damasceno / Santa Bárbara'],
  );
  assert.equal(getFixedSaint(10, 9, 2025).name, 'San Dionisio y compañeros, mártires');
  assert.equal(getFixedSaint(10, 9, 2026).name, 'San Juan Enrique Newman');
});

test('the widget Easter offsets agree with the Chilean 2027 reference dates', () => {
  const source = fs.readFileSync(path.resolve(__dirname,
    '../android/app/src/main/java/com/benjamin/studio/widgets/SaintWidgetContentFactory.java'), 'utf8');
  const offsets = [...source.matchAll(/easterFeasts\.put\((-?\d+), new SaintEntry\(0, 0, "([^"]+)"/g)];
  assert.equal(offsets.length, 18);
  for (const [, offset, name] of offsets) {
    const day = getEasterDate(2027);
    day.setDate(day.getDate() + Number(offset));
    assert.equal(movable2027[getLocalDateKey(day).slice(5)], name);
  }
  assert.match(source, /readAssetText\(context, "saint-day-images\.json"\)/);
});

test('the Chilean date color and the saint revealed by the eye are independent', () => {
  const easterSunday = getSaintDaySelection(parseCalendarDate('2025-05-04'), true);
  assert.equal(easterSunday.effectiveSaint.name, 'III Domingo de Pascua');
  assert.match(easterSunday.hiddenFixedSaint.name, /Felipe y Santiago/);
  assert.equal(getGeneralLiturgicalColorName(easterSunday.effectiveSaint, '2025-05-04'), 'Blanco');
  assert.equal(getGeneralLiturgicalColorName(easterSunday.hiddenFixedSaint, '2025-05-04', true), 'Rojo');
  assert.equal(getGeneralLiturgicalColorName(getFixedSaint(11, 9), '2025-11-09'), 'Blanco');
  assert.equal(getGeneralLiturgicalColorName(getFixedSaint(1, 20), '2025-01-20'), 'Rojo');

  const family = getSaintDaySelection(parseCalendarDate('2036-12-28'), true);
  assert.match(family.effectiveSaint.name, /Sagrada Familia/);
  assert.match(family.hiddenFixedSaint.name, /Santos Inocentes/);
  assert.equal(getGeneralLiturgicalColorName(family.effectiveSaint, '2036-12-28'), 'Blanco');
  assert.equal(getGeneralLiturgicalColorName(family.hiddenFixedSaint, '2036-12-28', true), 'Rojo');
});

test('the displayed saint supplies the color when a full celebration is allowed', () => {
  for (const [date, name, color, fixedFirstColor = color] of [
    ['2026-11-21', /Presentación/, 'Blanco'],
    ['2026-08-05', /Santa María la Mayor/, 'Blanco'],
    ['2026-08-26', /Ceferino Namuncurá/, 'Blanco'],
    ['2026-09-02', /Bartolomé Gutiérrez/, 'Verde'],
    ['2026-11-15', /Alberto Magno/, 'Verde'],
    ['2026-12-04', /Juan Damasceno/, 'Blanco'],
    ['2026-12-21', /Pedro Canisio/, 'Morado'],
    ['2025-03-07', /Perpetua y Felicidad/, 'Morado'],
    ['2025-04-23', /Octava de Pascua/, 'Blanco'],
    ['2026-05-24', /Pentecostés/, 'Rojo'],
    ['2027-06-05', /Inmaculado Corazón/, 'Blanco', 'Rojo'],
  ]) {
    const civilDate = parseCalendarDate(date);
    const { effectiveSaint, hiddenFixedSaint } = getSaintDaySelection(civilDate, true);
    assert.match(effectiveSaint.name, name);
    assert.equal(getGeneralLiturgicalColorName(effectiveSaint, date), color, date);
    const fixedFirst = getSaintDaySelection(civilDate, false).effectiveSaint;
    assert.equal(getGeneralLiturgicalColorName(fixedFirst, date), fixedFirstColor, date);
    if (date === '2026-05-24') {
      assert.match(hiddenFixedSaint.name, /María Auxiliadora/);
      assert.equal(getGeneralLiturgicalColorName(hiddenFixedSaint, date, true), 'Blanco');
    }
    if (date === '2027-06-05') {
      assert.match(fixedFirst.name, /Bonifacio/);
      assert.equal(hiddenFixedSaint.title, 'Memoria libre');
      assert.equal(getGeneralLiturgicalColorName(hiddenFixedSaint, date, true), 'Rojo');
    }
  }
});

test('Chile prayer, artwork and corrected biographies are available from the shipped catalogs', () => {
  const art = require('../src/lib/saint-day-images.json');
  for (const [name, url] of [
    ['Domingo de Resurrección', '/images/rosario/glorioso-1.jpg'],
    ['Sagrada Familia de Jesús, María y José', '/images/holy-family.jpeg'],
    ['Inmaculado Corazón de María', '/images/corazon-inmaculado-de-maria.jpg'],
    ['Día de Oración por Chile', '/images/virgen-del-carmen-chile.jpeg'],
  ]) {
    assert.equal(art.find(({ names }) => names.includes(name)).imageUrl, url);
    assert.ok(fs.statSync(path.join(__dirname, '..', 'public', url)).size > 0);
  }
  const chile = getSaintDaySelection(parseCalendarDate('2036-09-28'), true);
  assert.equal(chile.effectiveSaint.name, 'Día de Oración por Chile');
  assert.equal(getGeneralLiturgicalColorName(chile.effectiveSaint, '2036-09-28'), 'Verde');
  assert.match(getFixedSaint(2, 25).bio, /Decio/);
  assert.match(getFixedSaint(3, 10).bio, /Apamea/);
  assert.match(getFixedSaint(6, 10).name, /Bolzano/);
  assert.equal(getFixedSaint(11, 19).name, 'San Abdías, profeta');
  assert.doesNotMatch(getFixedSaint(12, 8).bio, /patrona de Chile/i);
});

test('Christ the King respects the fixed calendar preference and exposes the hidden saint', () => {
  const image = require('../src/lib/placeholder-images.json').placeholderImages.find(
    ({ id }) => id === 'christ-the-king-image',
  );
  assert.equal(image.imageUrl, '/images/cristo-rey.jpg');
  assert.ok(fs.statSync(path.join(__dirname, '..', 'public', image.imageUrl)).size > 0);

  for (const [date, saint] of [
    ['2022-11-20', /Edmundo/],
    ['2026-11-22', /Cecilia/],
    ['2027-11-21', /Presentación/],
  ]) {
    const civilDate = parseCalendarDate(date);
    const fixed = getFixedSaint(11, civilDate.getDate());
    assert.match(fixed.name, saint);
    const { effectiveSaint, hiddenFixedSaint } = getSaintDaySelection(civilDate, true);
    assert.equal(effectiveSaint.name, CHRIST_THE_KING.name);
    assert.equal(effectiveSaint.bio, CHRIST_THE_KING.bio);
    assert.equal(hiddenFixedSaint, fixed);
    assert.equal(getGeneralLiturgicalColorName(effectiveSaint, date), 'Blanco');

    assert.deepEqual(getSaintDaySelection(civilDate, false), {
      effectiveSaint: fixed,
      hiddenFixedSaint: null,
    });
  }
  const saint = getSaintDaySelection(parseCalendarDate('2026-11-20'), true).effectiveSaint;
  assert.equal(saint.name, 'San Edmundo, rey y mártir');
  assert.equal(getGeneralLiturgicalColorName(saint, '2026-11-20'), 'Rojo');
});

test('the civil date and local rules cover the Advent and Christmas boundary cases', () => {
  assert.equal(getLocalDateKey(parseCalendarDate('2026-11-20')), '2026-11-20');
  assert.equal(parseCalendarDate('2026-02-29'), null);
  assert.equal(getLocalDateKey(getAdventDates(2026).advent1), '2026-11-29');
  assert.equal(getLocalDateKey(getAdventDates(2027).advent1), '2027-11-28');
  assert.equal(getLocalDateKey(getAdventDates(2023).advent1), '2023-12-03');
  assert.ok(!isAdventSeason(parseCalendarDate('2026-11-28')));
  assert.ok(isAdventSeason(parseCalendarDate('2026-12-24')));
  assert.ok(!isAdventSeason(parseCalendarDate('2026-12-25')));
  for (let year = 2000; year <= 2100; year++) {
    const { christTheKing, advent1, advent2, advent3, advent4 } = getAdventDates(year);
    assert.equal(christTheKing.getMonth(), 10);
    assert.ok(christTheKing.getDate() >= 20 && christTheKing.getDate() <= 26);
    assert.ok([christTheKing, advent1, advent2, advent3, advent4].every(date => date.getDay() === 0));
    assert.ok(advent1 >= new Date(year, 10, 27) && advent1 <= new Date(year, 11, 3));
    assert.ok(advent4 >= new Date(year, 11, 18) && advent4 <= new Date(year, 11, 24));
  }

  for (const [date, name] of [
    ['2024-01-07', 'Epifanía del Señor'],
    ['2024-01-08', 'Bautismo del Señor'],
    ['2022-12-30', 'Sagrada Familia de Jesús, María y José'],
    ['2024-12-08', 'Inmaculada Concepción de la Virgen María'],
    ['2022-06-23', 'Natividad de San Juan Bautista'],
    ['2022-06-24', 'Sagrado Corazón de Jesús'],
    ['2027-03-25', 'Jueves Santo'],
    ['2027-04-05', 'Anunciación del Señor'],
  ]) {
    const { effectiveSaint } = getSaintDaySelection(parseCalendarDate(date), true);
    assert.equal(effectiveSaint.name, name);
  }

  const june5 = getSaintDaySelection(parseCalendarDate('2027-06-05'), true);
  assert.equal(june5.effectiveSaint.title, 'Memoria libre');
  assert.match(june5.hiddenFixedSaint.name, /Bonifacio/);
  assert.equal(june5.hiddenFixedSaint.title, 'Memoria libre');
});

test('the daily card shows Christ the King alone with the eye available for Santa Cecilia', () => {
  const image = require('../src/lib/placeholder-images.json').placeholderImages.find(
    ({ id }) => id === 'christ-the-king-image',
  );
  const simulatedDate = '2026-11-22';
  let selection = getSaintDaySelection(parseCalendarDate(simulatedDate), true);
  const load = Module._load;
  Module._load = function (name, parent, isMain) {
    if (name === '@/context/SettingsContext') {
      return { useSettings: () => ({
        simulatedDate, saintOfTheDay: selection.effectiveSaint, saintOfTheDayImage: image,
        overriddenFixedSaint: selection.hiddenFixedSaint,
      }) };
    }
    if (name === 'lucide-react') return { Eye: () => null };
    if (name.startsWith('@/')) name = path.join(__dirname, '..', 'src', name.slice(2));
    return load.call(this, name, parent, isMain);
  };
  try {
    const Card = require('../src/components/saints/SaintOfTheDayCard.tsx').default;
    const html = renderToStaticMarkup(React.createElement(Card));
    assert.match(html, /Nuestro Señor Jesucristo, Rey del Universo/);
    assert.match(html, /cristo-rey\.jpg/);
    assert.match(html, /background-color:#F8F9FA/);
    assert.match(html, /Mantener presionado para ver el santo del día/);
    assert.doesNotMatch(html, /Santa Cecilia/);

    selection = getSaintDaySelection(parseCalendarDate(simulatedDate), false);
    const fixedHtml = renderToStaticMarkup(React.createElement(Card));
    assert.match(fixedHtml, /Santa Cecilia/);
    assert.doesNotMatch(fixedHtml, /Nuestro Señor Jesucristo|Mantener presionado/);
  } finally {
    Module._load = load;
  }
});
