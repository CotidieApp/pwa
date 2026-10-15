const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const external = path.join(os.homedir(), '.codex', 'projects', 'Cotidie', 'validation-notifications-2026-10-08');
fs.mkdirSync(external, { recursive: true });
const javaDirectory = 'node_modules/@capacitor/local-notifications/android/src/main/java/com/capacitorjs/plugins/localnotifications';

function fixture(run) {
  const scratch = fs.mkdtempSync(path.join(external, 'patch-'));
  try {
    fs.mkdirSync(path.join(scratch, 'scripts'));
    fs.mkdirSync(path.join(scratch, javaDirectory), { recursive: true });
    fs.copyFileSync(path.join(root, 'scripts/patch-local-notifications.js'), path.join(scratch, 'scripts/patch-local-notifications.js'));
    fs.mkdirSync(path.join(scratch, 'scripts/android'));
    fs.copyFileSync(path.join(root, 'scripts/android/CotidieNotificationIntentPolicy.java'),
      path.join(scratch, 'scripts/android/CotidieNotificationIntentPolicy.java'));
    fs.copyFileSync(path.join(root, 'scripts/android/CotidieNotificationTextLayout.java'),
      path.join(scratch, 'scripts/android/CotidieNotificationTextLayout.java'));
    for (const file of ['LocalNotificationManager.java', 'TimedNotificationPublisher.java', 'LocalNotificationRestoreReceiver.java'])
      fs.copyFileSync(path.join(root, javaDirectory, file), path.join(scratch, javaDirectory, file));
    run(scratch);
  } finally {
    assert.ok(path.resolve(scratch).startsWith(path.resolve(external) + path.sep));
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
const patch = scratch => execFileSync(process.execPath, [path.join(scratch, 'scripts/patch-local-notifications.js')], { cwd: scratch, encoding: 'utf8' });
const manager = scratch => path.join(scratch, javaDirectory, 'LocalNotificationManager.java');
function previousImageRoute(source) {
  return source.replace(/    \/\/ Cotidie immediate image v2[\s\S]*?    private void createActionIntents\(/,
    '    private void createActionIntents(').replace(
    /        \/\/ Cotidie multiline notification v\d+[^\n]*\n[\s\S]*?        String sound = localNotification.getSound/,
    `        JSObject extra = localNotification.getExtra();
        String imageDrawable = extra != null ? extra.getString("imageDrawable") : null;
        android.graphics.Bitmap bigPicture = localNotification.getLargeIcon(context);
        mBuilder.setStyle(new NotificationCompat.BigPictureStyle().bigPicture(bigPicture));
        String sound = localNotification.getSound`).replace(
    'android.graphics.Bitmap bigPicture = loadCotidieNotificationBitmap(context, imageDrawable);',
    'android.graphics.Bitmap bigPicture = localNotification.getLargeIcon(context);').replace(
    /\/\/ Cotidie dev test alerts:[^\r\n]*\r?\n        mBuilder\.setOnlyAlertOnce\([^\r\n]*\);/,
    'mBuilder.setOnlyAlertOnce(true);');
}

test('upgrade replaces the broken immediate-image route and remains idempotent', () => fixture(scratch => {
  fs.writeFileSync(manager(scratch), previousImageRoute(fs.readFileSync(manager(scratch), 'utf8')));
  patch(scratch);
  const once = fs.readFileSync(manager(scratch), 'utf8');
  assert.match(once, /bigPicture = loadCotidieNotificationBitmap\(context, imageDrawable\)/);
  assert.match(once, /inPreferredConfig = android.graphics.Bitmap.Config.RGB_565/);
  assert.match(once, /bounds.inScaled = false/);
  assert.equal((once.match(/private android.graphics.Bitmap loadCotidieNotificationBitmap/g) || []).length, 1);
  assert.match(once, /com.benjamin.studio.MARK_PRAYED/);
  assert.match(once, /Cotidie strict exact alarm v4/);
  assert.match(once, /CotidieNotificationTextLayout.apply/);
  assert.match(once, /setOnlyAlertOnce\(extra == null \|\| !Boolean.TRUE.equals\(extra.getBool\("devTest"\)\)\)/);
  patch(scratch);
  assert.equal(fs.readFileSync(manager(scratch), 'utf8'), once);
}));

test('fresh style installation resolves extra.imageDrawable without requiring largeIcon', () => fixture(scratch => {
  let source = previousImageRoute(fs.readFileSync(manager(scratch), 'utf8'));
  source = source.replace(/        JSObject extra = localNotification.getExtra\(\);[\s\S]*?        String sound = localNotification.getSound/,
    '        String sound = localNotification.getSound');
  fs.writeFileSync(manager(scratch), source);
  patch(scratch);
  const result = fs.readFileSync(manager(scratch), 'utf8');
  assert.match(result, /extra.getString\("imageDrawable"\)/);
  assert.match(result, /CotidieNotificationTextLayout.apply/);
  assert.match(result, /bigPicture = loadCotidieNotificationBitmap\(context, imageDrawable\)/);
  assert.doesNotMatch(result, /bigPicture = localNotification.getLargeIcon/);
}));

test('scheduled notifications retain actions and use the same multiline renderer with and without images', () => fixture(scratch => {
  patch(scratch);
  const timed = fs.readFileSync(path.join(scratch, javaDirectory, 'TimedNotificationPublisher.java'), 'utf8');
  const renderer = timed.slice(timed.indexOf('private Notification applyCotidieBigPictureStyle'),
    timed.indexOf('private NotificationCompat.Builder buildCotidieNotificationBuilder'));
  assert.match(renderer, /new NotificationCompat.Builder\(context, notification\)/);
  assert.match(renderer, /CotidieNotificationTextLayout.apply/);
  assert.doesNotMatch(renderer, /if \(extra == null\) return|if \(bigPicture == null\) return|setSummaryText/);
  const once = fs.readFileSync(manager(scratch), 'utf8');
  patch(scratch);
  assert.equal(fs.readFileSync(manager(scratch), 'utf8'), once);
}));

test('the dev image points to a packaged resource and all image routes remain available', () => {
  assert.ok(fs.existsSync(path.join(root, 'android/app/src/main/res/drawable/images_nativity_jpeg.jpeg')));
  const source = fs.readFileSync(path.join(root, 'src/context/settings/useNotificationScheduling.ts'), 'utf8');
  assert.match(source, /devTestNotificationImageEnabled \? '\/images\/nativity.jpeg'/);
  assert.match(source, /imageDrawable: devImageDrawable/);
  const published = fs.readFileSync(path.join(root, javaDirectory, 'TimedNotificationPublisher.java'), 'utf8');
  assert.match(published, /loadCotidieNotificationBitmap\(context, imageDrawable\)/);
});

function notificationPolicy() {
  const Module = require('node:module');
  const ts = require('typescript');
  const filename = path.join(root, 'src/lib/notification-events.ts');
  const compiled = new Module(filename, module);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return compiled.exports;
}

test('activity notification guard precedes effects and the producer signs its intent', () => fixture(scratch => {
  patch(scratch);
  const once = fs.readFileSync(manager(scratch), 'utf8');
  const handler = once.slice(once.indexOf('public JSObject handleNotificationActionPerformed'));
  assert.ok(handler.indexOf('CotidieNotificationIntentPolicy.isTrusted') < handler.indexOf('notificationStorage.deleteNotification'));
  assert.ok(handler.indexOf('CotidieNotificationIntentPolicy.isTrusted') < handler.indexOf('dismissVisibleNotification'));
  assert.match(once, /CotidieNotificationIntentPolicy.attach\(context, intent\)/);
  assert.match(once, /actionPendingIntent = PendingIntent.getBroadcast/);
  assert.match(once, /refreshCotidieNotificationIntents/);
  assert.ok(fs.existsSync(path.join(scratch, javaDirectory, 'CotidieNotificationIntentPolicy.java')));
  patch(scratch);
  assert.equal(fs.readFileSync(manager(scratch), 'utf8'), once);
}));

test('calendar replacement recognizes an active dated family but does not revive a changed Cartas anchor', () => {
  const source = notificationPolicy().notificationEventSource;
  const pending = { fixedKey: 'fixed:2:10-08', dateKey: '2026-10-08' };
  const future = { fixedKey: 'fixed:2:10-08', dateKey: '2027-10-08' };
  assert.equal(source(pending), source(future), 'Occurrence year must not erase a due active fixed notice');
  assert.equal(source({ feast: 'easter', dateKey: '2026-04-05' }), source({ feast: 'easter', dateKey: '2027-03-28' }));
  assert.notEqual(source({ feast: 'easter' }), source({ season: 'easter' }));
  assert.notEqual(source({ cartasInactivityReminder: true, anchorAt: 1 }), source({ cartasInactivityReminder: true, anchorAt: 2 }),
    'Reading again must retire notices from the previous inactivity anchor');
  assert.equal(source({ image: '/images/nativity.jpeg' }), '', 'An image is not an active dated source');
});

test('Android monthly and annual reminders extend across the calendar without the old publisher', () => {
  const limit = notificationPolicy().fixedNotificationOccurrenceLimit;
  for (const kind of ['monthly', 'relative-monthly', 'yearly']) {
    assert.equal(limit('android', kind, true), null, kind + ' must use the complete native calendar');
    assert.equal(limit('android', kind, false), null, 'Unconditional fixed reminders also need future occurrences');
  }
  assert.equal(limit('ios', 'monthly', true), 12, 'Preserve the iOS monthly agenda budget');
  assert.equal(limit('ios', 'relative-monthly', true), 12);
  assert.equal(limit('ios', 'yearly', false), 1, 'Preserve legacy publisher recurrence outside Android');
  assert.equal(limit('ios', 'yearly', true), null);
});
