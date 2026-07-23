const fs = require('fs');
const path = require('path');

const managerPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@capacitor',
  'local-notifications',
  'android',
  'src',
  'main',
  'java',
  'com',
  'capacitorjs',
  'plugins',
  'localnotifications',
  'LocalNotificationManager.java'
);
const publisherPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@capacitor',
  'local-notifications',
  'android',
  'src',
  'main',
  'java',
  'com',
  'capacitorjs',
  'plugins',
  'localnotifications',
  'TimedNotificationPublisher.java'
);
const restorePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@capacitor',
  'local-notifications',
  'android',
  'src',
  'main',
  'java',
  'com',
  'capacitorjs',
  'plugins',
  'localnotifications',
  'LocalNotificationRestoreReceiver.java'
);

if (!fs.existsSync(managerPath)) {
  process.exit(0);
}

let source = fs.readFileSync(managerPath, 'utf8');
let changed = false;

const replaceOnce = (pattern, replacement, label) => {
  const next = source.replace(pattern, replacement);
  if (next === source) {
    console.error(`patch-local-notifications: pattern not found for ${label}`);
    process.exit(1);
  }
  source = next;
  changed = true;
};

if (!source.includes('com.benjamin.studio.MARK_PRAYED')) {
  replaceOnce(
    /\/\/ TODO Add custom icons to actions[\s\S]*?NotificationCompat\.Action\.Builder actionBuilder = new NotificationCompat\.Action\.Builder\(/,
    `// TODO Add custom icons to actions
                    LocalNotificationSchedule actionSchedule = localNotification.getSchedule();
                    boolean isRemovable = actionSchedule == null || actionSchedule.isRemovable();
                    Intent actionIntent;
                    PendingIntent actionPendingIntent;
                    if ("mark_prayed".equals(notificationAction.getId())) {
                        actionIntent = new Intent("com.benjamin.studio.MARK_PRAYED");
                        actionIntent.setPackage(context.getPackageName());
                        actionIntent.putExtra(ACTION_INTENT_KEY, notificationAction.getId());
                        actionIntent.putExtra(NOTIFICATION_OBJ_INTENT_KEY, localNotification.getSource());
                        actionIntent.putExtra(NOTIFICATION_IS_REMOVABLE_KEY, isRemovable);
                        actionPendingIntent = PendingIntent.getBroadcast(
                            context,
                            localNotification.getId() + notificationAction.getId().hashCode(),
                            actionIntent,
                            flags
                        );
                    } else {
                        actionIntent = buildIntent(localNotification, notificationAction.getId());
                        actionPendingIntent = PendingIntent.getActivity(
                            context,
                            localNotification.getId() + notificationAction.getId().hashCode(),
                            actionIntent,
                            flags
                        );
                    }
                    NotificationCompat.Action.Builder actionBuilder = new NotificationCompat.Action.Builder(`,
    'mark_prayed action'
  );
}

if (!source.includes('NotificationCompat.BigPictureStyle')) {
  replaceOnce(
    /        String sound = localNotification\.getSound\(context, getDefaultSound\(context\)\);/,
    `        JSObject extra = localNotification.getExtra();
        String imageDrawable = extra != null ? extra.getString("imageDrawable") : null;
        String bigPictureSummaryText = localNotification.getBody() != null
            ? localNotification.getBody()
            : localNotification.getSummaryText();

        if (imageDrawable != null) {
            android.graphics.Bitmap bigPicture = localNotification.getLargeIcon(context);
            if (bigPicture != null) {
                mBuilder.setStyle(
                    new NotificationCompat.BigPictureStyle()
                        .bigPicture(bigPicture)
                        .bigLargeIcon((android.graphics.Bitmap) null)
                        .setBigContentTitle(localNotification.getTitle())
                        .setSummaryText(bigPictureSummaryText)
                );
            }
        } else if (localNotification.getBody() != null) {
            mBuilder.setStyle(
                new NotificationCompat.BigTextStyle()
                    .bigText(localNotification.getBody())
                    .setBigContentTitle(localNotification.getTitle())
            );
        }

        String sound = localNotification.getSound(context, getDefaultSound(context));`,
    'big picture and big text style'
  );
}

if (!source.includes('Cotidie strict exact alarm v4')) {
  replaceOnce(
    /    private void setExactIfPossible\(\r?\n        AlarmManager alarmManager,\r?\n        LocalNotificationSchedule schedule,\r?\n        long trigger,\r?\n        PendingIntent pendingIntent\r?\n    \) \{[\s\S]*?\r?\n    \}\r?\n\r?\n    public void cancel\(PluginCall call\) \{/,
    `    private void setExactIfPossible(
        AlarmManager alarmManager,
        LocalNotificationSchedule schedule,
        long trigger,
        PendingIntent pendingIntent
    ) {
        // Cotidie strict exact alarm v4 (setAlarmClock for maximum precision)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            Logger.error(
                Logger.tags("LN"),
                "Exact alarm access is required. Notification was not scheduled with an imprecise fallback.",
                null
            );
            return;
        }

        try {
            Intent showIntent;
            if (activity != null) {
                showIntent = new Intent(context, activity.getClass());
            } else {
                showIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            }
            if (showIntent != null) {
                showIntent.setAction(Intent.ACTION_MAIN);
                showIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                showIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            } else {
                showIntent = new Intent();
            }
            int showFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                showFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent showPendingIntent = PendingIntent.getActivity(context, 0, showIntent, showFlags);
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(trigger, showPendingIntent), pendingIntent);
        } catch (Exception exactError) {
            Logger.error(
                Logger.tags("LN"),
                "Exact alarm scheduling failed. Notification was not scheduled with an imprecise fallback.",
                exactError
            );
        }
    }

    public void cancel(PluginCall call) {`,
    'alarm-clock exact fallback'
  );
}

if (changed) {
  fs.writeFileSync(managerPath, source, 'utf8');
}

if (fs.existsSync(publisherPath)) {
  let publisherSource = fs.readFileSync(publisherPath, 'utf8');
  let publisherChanged = false;

  const replacePublisherOnce = (pattern, replacement, label) => {
    const next = publisherSource.replace(pattern, replacement);
    if (next === publisherSource) {
      console.error(`patch-local-notifications: pattern not found for ${label}`);
      process.exit(1);
    }
    publisherSource = next;
    publisherChanged = true;
  };

  if (!publisherSource.includes('Cotidie delayed big picture v2')) {
    if (!publisherSource.includes('import android.graphics.Bitmap;')) {
      replacePublisherOnce(
        /import android\.content\.Intent;\r?\nimport android\.os\.Build;/,
        `import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;`,
        'timed notification bitmap imports'
      );
    }
    if (!publisherSource.includes('import androidx.core.app.NotificationCompat;')) {
      replacePublisherOnce(
        /import com\.getcapacitor\.JSObject;\r?\nimport com\.getcapacitor\.Logger;/,
        `import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.plugin.util.AssetUtil;`,
        'timed notification androidx imports'
      );
    } else if (!publisherSource.includes('import com.getcapacitor.plugin.util.AssetUtil;')) {
      replacePublisherOnce(
        /import com\.getcapacitor\.Logger;/,
        `import com.getcapacitor.Logger;
import com.getcapacitor.plugin.util.AssetUtil;`,
        'timed notification asset util import'
      );
    }
    if (!publisherSource.includes('applyCotidieBigPictureStyle(context, notification, notificationJson)')) {
      replacePublisherOnce(
        /        JSObject notificationJson = storage\.getSavedNotificationAsJSObject\(Integer\.toString\(id\)\);\r?\n        LocalNotificationsPlugin\.fireReceived\(notificationJson\);\r?\n        notificationManager\.notify\(id, notification\);/,
        `        JSObject notificationJson = storage.getSavedNotificationAsJSObject(Integer.toString(id));
        LocalNotificationsPlugin.fireReceived(notificationJson);
        notification = applyCotidieBigPictureStyle(context, notification, notificationJson);
        notificationManager.notify(id, notification);`,
        'timed notification delayed big picture call'
      );
    }

    const delayedBigPictureMethods = `    private Notification applyCotidieBigPictureStyle(Context context, Notification notification, JSObject notificationJson) {
        // Cotidie delayed big picture v2
        if (notification == null || notificationJson == null) return notification;
        try {
            JSObject extra = notificationJson.getJSObject("extra");
            if (extra == null) return notification;
            String imageDrawable = extra.optString("imageDrawable", null);
            if (imageDrawable == null || imageDrawable.trim().isEmpty()) return notification;

            Bitmap bigPicture = loadCotidieNotificationBitmap(context, imageDrawable);
            if (bigPicture == null) return notification;

            String title = notificationJson.optString("title", null);
            String body = notificationJson.optString("body", null);
            NotificationCompat.Builder builder = buildCotidieNotificationBuilder(context, notification, title, body);
            NotificationCompat.BigPictureStyle style = new NotificationCompat.BigPictureStyle()
                .bigPicture(bigPicture)
                .bigLargeIcon((Bitmap) null);
            if (title != null && !title.isEmpty()) {
                style.setBigContentTitle(title);
            }
            if (body != null && !body.isEmpty()) {
                style.setSummaryText(body);
            }
            builder.setStyle(style);
            builder.setLargeIcon((Bitmap) null);
            return builder.build();
        } catch (Exception ignored) {
            return notification;
        }
    }

    private NotificationCompat.Builder buildCotidieNotificationBuilder(
        Context context,
        Notification notification,
        String title,
        String body
    ) {
        String channelId = LocalNotificationManager.DEFAULT_NOTIFICATION_CHANNEL_ID;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && notification.getChannelId() != null) {
            channelId = notification.getChannelId();
        }

        int smallIcon = notification.icon != 0 ? notification.icon : context.getApplicationInfo().icon;
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(smallIcon)
            .setContentIntent(notification.contentIntent)
            .setDeleteIntent(notification.deleteIntent)
            .setAutoCancel((notification.flags & Notification.FLAG_AUTO_CANCEL) != 0)
            .setOngoing((notification.flags & Notification.FLAG_ONGOING_EVENT) != 0)
            .setOnlyAlertOnce((notification.flags & Notification.FLAG_ONLY_ALERT_ONCE) != 0)
            .setDefaults(notification.defaults)
            .setPriority(notification.priority)
            .setVisibility(notification.visibility)
            .setWhen(notification.when > 0 ? notification.when : System.currentTimeMillis())
            .setShowWhen(true);

        if (notification.sound != null) {
            builder.setSound(notification.sound);
        }
        if (notification.tickerText != null) {
            builder.setTicker(notification.tickerText);
        }
        if (notification.category != null) {
            builder.setCategory(notification.category);
        }
        if (notification.color != 0) {
            builder.setColor(notification.color);
        }
        return builder;
    }

    private Bitmap loadCotidieNotificationBitmap(Context context, String imageDrawable) {
        int resId = AssetUtil.getResourceID(context, imageDrawable, "drawable");
        if (resId <= 0) return null;

        final int maxDimension = 512;
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeResource(context.getResources(), resId, bounds);
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null;

        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inSampleSize = calculateCotidieInSampleSize(bounds.outWidth, bounds.outHeight, maxDimension);
        Bitmap decoded = BitmapFactory.decodeResource(context.getResources(), resId, options);
        if (decoded == null) return null;

        Bitmap scaled = scaleCotidieBitmap(decoded, maxDimension);
        if (scaled != decoded) {
            decoded.recycle();
        }

        Bitmap compact = scaled.getConfig() == Bitmap.Config.RGB_565
            ? scaled
            : scaled.copy(Bitmap.Config.RGB_565, false);
        if (compact != null && compact != scaled) {
            scaled.recycle();
            return compact;
        }
        return scaled;
    }

    private int calculateCotidieInSampleSize(int width, int height, int maxDimension) {
        int sampleSize = 1;
        while ((width / sampleSize) > maxDimension || (height / sampleSize) > maxDimension) {
            sampleSize *= 2;
        }
        return Math.max(1, sampleSize);
    }

    private Bitmap scaleCotidieBitmap(Bitmap bitmap, int maxDimension) {
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        int largest = Math.max(width, height);
        if (largest <= maxDimension) return bitmap;
        float scale = (float) maxDimension / (float) largest;
        int nextWidth = Math.max(1, Math.round(width * scale));
        int nextHeight = Math.max(1, Math.round(height * scale));
        return Bitmap.createScaledBitmap(bitmap, nextWidth, nextHeight, true);
    }

`;

    if (publisherSource.includes('private Notification applyCotidieBigPictureStyle')) {
      replacePublisherOnce(
        /    private Notification applyCotidieBigPictureStyle\(Context context, Notification notification, JSObject notificationJson\) \{[\s\S]*?\r?\n    @SuppressWarnings\("deprecation"\)/,
        `${delayedBigPictureMethods}    @SuppressWarnings("deprecation")`,
        'timed notification delayed big picture methods update'
      );
    } else {
      replacePublisherOnce(
        /    @SuppressWarnings\("deprecation"\)/,
        `${delayedBigPictureMethods}    @SuppressWarnings("deprecation")`,
        'timed notification delayed big picture methods'
      );
    }
  }

  if (!publisherSource.includes('Cotidie fixed recurrence reschedule v1')) {
    const ensurePublisherImport = (pattern, replacement, label) => {
      if (publisherSource.includes(replacement.trim().split('\n').pop())) return;
      replacePublisherOnce(pattern, replacement, label);
    };

    if (!publisherSource.includes('import com.getcapacitor.CapConfig;')) {
      replacePublisherOnce(
        /import com\.getcapacitor\.JSObject;\r?\n/,
        `import com.getcapacitor.CapConfig;
import com.getcapacitor.JSObject;
`,
        'timed notification cap config import'
      );
    }
    ensurePublisherImport(
      /import com\.getcapacitor\.CapConfig;\r?\nimport com\.getcapacitor\.JSObject;\r?\n/,
      `import com.getcapacitor.CapConfig;
import com.getcapacitor.JSObject;
`,
      'timed notification cap config import'
    );
    ensurePublisherImport(
      /import java\.text\.SimpleDateFormat;\r?\nimport java\.util\.Date;/,
      `import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.TimeZone;
import java.util.regex.Matcher;
import java.util.regex.Pattern;`,
      'timed notification recurrence imports'
    );

    replacePublisherOnce(
      /        if \(!rescheduleNotificationIfNeeded\(context, intent, id\)\) \{/,
      `        if (!rescheduleNotificationIfNeeded(context, intent, storage, notificationJson, id)) {`,
      'timed notification recurrence call'
    );

    replacePublisherOnce(
      /    private boolean rescheduleNotificationIfNeeded\(Context context, Intent intent, int id\) \{/,
      `    private boolean rescheduleNotificationIfNeeded(
        Context context,
        Intent intent,
        NotificationStorage storage,
        JSObject notificationJson,
        int id
    ) {`,
      'timed notification recurrence signature'
    );

    replacePublisherOnce(
      /        return false;\r?\n    \}\r?\n\}/,
      `        if (rescheduleCotidieFixedNotification(context, storage, notificationJson, id)) {
            return true;
        }

        return false;
    }

    private boolean rescheduleCotidieFixedNotification(
        Context context,
        NotificationStorage storage,
        JSObject notificationJson,
        int currentId
    ) {
        // Cotidie fixed recurrence reschedule v1
        if (notificationJson == null) return false;
        try {
            JSObject extra = notificationJson.getJSObject("extra");
            if (extra == null) return false;

            String recurrence = extra.optString("fixedRecurrence", null);
            String dateRule = extra.optString("date", null);
            String fixedKey = extra.optString("fixedKey", null);
            if (recurrence == null || dateRule == null || fixedKey == null) return false;

            Date next = getNextCotidieFixedOccurrence(recurrence, dateRule, new Date());
            if (next == null) return false;

            String nextDateKey = formatCotidieDateKey(next);
            int nextId = toCotidieNotificationId(fixedKey + ":" + nextDateKey);

            JSObject schedule = notificationJson.getJSObject("schedule");
            if (schedule == null) schedule = new JSObject();
            schedule.put("at", formatCotidieNotificationDate(next));
            schedule.put("allowWhileIdle", true);
            notificationJson.put("schedule", schedule);

            String titleTemplate = extra.optString("titleTemplate", notificationJson.optString("title", ""));
            String bodyTemplate = extra.optString("bodyTemplate", notificationJson.optString("body", ""));
            notificationJson.put("id", nextId);
            notificationJson.put("title", formatCotidieTemplate(titleTemplate, next));
            notificationJson.put("body", formatCotidieTemplate(bodyTemplate, next));
            extra.put("dateKey", nextDateKey);
            notificationJson.put("extra", extra);

            ArrayList<LocalNotification> nextNotifications = new ArrayList<>();
            nextNotifications.add(LocalNotification.buildNotificationFromJSObject(notificationJson));
            storage.appendNotifications(nextNotifications);

            CapConfig config = CapConfig.loadDefault(context);
            LocalNotificationManager localNotificationManager = new LocalNotificationManager(storage, null, context, config);
            if (localNotificationManager.schedule(null, nextNotifications) == null) return false;

            storage.deleteNotification(Integer.toString(currentId));
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private Date getNextCotidieFixedOccurrence(String recurrence, String dateRule, Date now) {
        if ("yearly".equals(recurrence)) {
            Matcher matcher = Pattern.compile("^(\\\\d{1,2})/(\\\\d{1,2})\\\\s+(\\\\d{1,2}):(\\\\d{2})$").matcher(dateRule);
            if (!matcher.matches()) return null;
            int day = Integer.parseInt(matcher.group(1));
            int month = Integer.parseInt(matcher.group(2));
            int hour = Integer.parseInt(matcher.group(3));
            int minute = Integer.parseInt(matcher.group(4));
            Calendar next = Calendar.getInstance();
            next.setTime(now);
            next.set(Calendar.MONTH, month - 1);
            next.set(Calendar.DAY_OF_MONTH, Math.min(day, daysInCotidieMonth(next.get(Calendar.YEAR), month - 1)));
            next.set(Calendar.HOUR_OF_DAY, hour);
            next.set(Calendar.MINUTE, minute);
            next.set(Calendar.SECOND, 0);
            next.set(Calendar.MILLISECOND, 0);
            if (!next.getTime().after(now)) {
                next.add(Calendar.YEAR, 1);
                next.set(Calendar.DAY_OF_MONTH, Math.min(day, daysInCotidieMonth(next.get(Calendar.YEAR), month - 1)));
            }
            return next.getTime();
        }

        if ("monthly".equals(recurrence)) {
            Matcher matcher = Pattern.compile("^(\\\\d{1,2})\\\\s+(\\\\d{1,2}):(\\\\d{2})$").matcher(dateRule);
            if (!matcher.matches()) return null;
            int day = Integer.parseInt(matcher.group(1));
            int hour = Integer.parseInt(matcher.group(2));
            int minute = Integer.parseInt(matcher.group(3));
            Calendar next = Calendar.getInstance();
            next.setTime(now);
            next.set(Calendar.DAY_OF_MONTH, Math.min(day, daysInCotidieMonth(next.get(Calendar.YEAR), next.get(Calendar.MONTH))));
            next.set(Calendar.HOUR_OF_DAY, hour);
            next.set(Calendar.MINUTE, minute);
            next.set(Calendar.SECOND, 0);
            next.set(Calendar.MILLISECOND, 0);
            if (!next.getTime().after(now)) {
                next.add(Calendar.MONTH, 1);
                next.set(Calendar.DAY_OF_MONTH, Math.min(day, daysInCotidieMonth(next.get(Calendar.YEAR), next.get(Calendar.MONTH))));
            }
            return next.getTime();
        }

        if ("relative-monthly".equals(recurrence)) {
            Matcher matcher = Pattern.compile("^([lmwjvsd])([1234u])\\\\s+(\\\\d{1,2}):(\\\\d{2})$", Pattern.CASE_INSENSITIVE).matcher(dateRule);
            if (!matcher.matches()) return null;
            int weekday = getCotidieWeekday(matcher.group(1));
            String ordinal = matcher.group(2).toLowerCase();
            int hour = Integer.parseInt(matcher.group(3));
            int minute = Integer.parseInt(matcher.group(4));
            if (weekday < 0) return null;

            Calendar base = Calendar.getInstance();
            base.setTime(now);
            Date next = buildCotidieRelativeMonthlyDate(base.get(Calendar.YEAR), base.get(Calendar.MONTH), weekday, ordinal, hour, minute);
            if (next == null) return null;
            if (!next.after(now)) {
                base.add(Calendar.MONTH, 1);
                next = buildCotidieRelativeMonthlyDate(base.get(Calendar.YEAR), base.get(Calendar.MONTH), weekday, ordinal, hour, minute);
            }
            return next;
        }

        return null;
    }

    private Date buildCotidieRelativeMonthlyDate(int year, int month, int weekday, String ordinal, int hour, int minute) {
        Calendar next = Calendar.getInstance();
        next.clear();
        next.set(Calendar.YEAR, year);
        next.set(Calendar.MONTH, month);
        next.set(Calendar.HOUR_OF_DAY, hour);
        next.set(Calendar.MINUTE, minute);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);

        if ("u".equals(ordinal)) {
            next.set(Calendar.DAY_OF_MONTH, daysInCotidieMonth(year, month));
            int delta = (next.get(Calendar.DAY_OF_WEEK) - weekday + 7) % 7;
            next.add(Calendar.DAY_OF_MONTH, -delta);
            return next.getTime();
        }

        int nth = Integer.parseInt(ordinal);
        next.set(Calendar.DAY_OF_MONTH, 1);
        int delta = (weekday - next.get(Calendar.DAY_OF_WEEK) + 7) % 7;
        next.add(Calendar.DAY_OF_MONTH, delta + ((nth - 1) * 7));
        if (next.get(Calendar.MONTH) != month) return null;
        return next.getTime();
    }

    private int getCotidieWeekday(String letter) {
        if ("d".equalsIgnoreCase(letter)) return Calendar.SUNDAY;
        if ("l".equalsIgnoreCase(letter)) return Calendar.MONDAY;
        if ("m".equalsIgnoreCase(letter)) return Calendar.TUESDAY;
        if ("w".equalsIgnoreCase(letter)) return Calendar.WEDNESDAY;
        if ("j".equalsIgnoreCase(letter)) return Calendar.THURSDAY;
        if ("v".equalsIgnoreCase(letter)) return Calendar.FRIDAY;
        if ("s".equalsIgnoreCase(letter)) return Calendar.SATURDAY;
        return -1;
    }

    private int daysInCotidieMonth(int year, int month) {
        Calendar calendar = Calendar.getInstance();
        calendar.clear();
        calendar.set(Calendar.YEAR, year);
        calendar.set(Calendar.MONTH, month);
        return calendar.getActualMaximum(Calendar.DAY_OF_MONTH);
    }

    private String formatCotidieNotificationDate(Date date) {
        SimpleDateFormat formatter = new SimpleDateFormat(LocalNotificationSchedule.JS_DATE_FORMAT);
        formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
        return formatter.format(date);
    }

    private String formatCotidieDateKey(Date date) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(date);
        return calendar.get(Calendar.YEAR) + "-" + padCotidie2(calendar.get(Calendar.MONTH) + 1) + "-" + padCotidie2(calendar.get(Calendar.DAY_OF_MONTH));
    }

    private String formatCotidieTemplate(String template, Date date) {
        if (template == null) return "";
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(date);
        String result = template;
        result = result.replace("{year}", Integer.toString(calendar.get(Calendar.YEAR)));
        result = result.replace("{month}", padCotidie2(calendar.get(Calendar.MONTH) + 1));
        result = result.replace("{day}", padCotidie2(calendar.get(Calendar.DAY_OF_MONTH)));
        result = result.replace("{hour}", padCotidie2(calendar.get(Calendar.HOUR_OF_DAY)));
        result = result.replace("{minute}", padCotidie2(calendar.get(Calendar.MINUTE)));
        result = result.replace("{date}", padCotidie2(calendar.get(Calendar.DAY_OF_MONTH)) + "/" + padCotidie2(calendar.get(Calendar.MONTH) + 1) + "/" + calendar.get(Calendar.YEAR));

        Matcher matcher = Pattern.compile("\\\\{year([+-]\\\\d+)\\\\}").matcher(result);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            int offset = Integer.parseInt(matcher.group(1));
            matcher.appendReplacement(buffer, Integer.toString(calendar.get(Calendar.YEAR) + offset));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private String padCotidie2(int value) {
        return value < 10 ? "0" + value : Integer.toString(value);
    }

    private int toCotidieNotificationId(String key) {
        long hash = 2166136261L;
        for (int i = 0; i < key.length(); i++) {
            hash ^= key.charAt(i);
            hash = (hash * 16777619L) & 0xffffffffL;
        }
        int id = (int) (hash % 2147483647L);
        return id == 0 ? 1 : id;
    }
}`,
      'timed notification fixed recurrence methods'
    );
  }

  if (!publisherSource.includes('Cotidie early-delivery guard v2')) {
    if (!publisherSource.includes('deferCotidieEarlyNotification(context, intent, notificationJson, id)')) {
      replacePublisherOnce(
        /        notification\.when = System\.currentTimeMillis\(\);\r?\n\r?\n        int id = intent\.getIntExtra\(LocalNotificationManager\.NOTIFICATION_INTENT_KEY, Integer\.MIN_VALUE\);([\s\S]*?)        JSObject notificationJson = storage\.getSavedNotificationAsJSObject\(Integer\.toString\(id\)\);/,
        `        int id = intent.getIntExtra(LocalNotificationManager.NOTIFICATION_INTENT_KEY, Integer.MIN_VALUE);$1        JSObject notificationJson = storage.getSavedNotificationAsJSObject(Integer.toString(id));
        if (deferCotidieEarlyNotification(context, intent, notificationJson, id)) {
            return;
        }

        notification.when = System.currentTimeMillis();`,
        'timed notification early-delivery call'
      );
    }

    replacePublisherOnce(
      /    private boolean deferCotidieEarlyNotification\(Context context, Intent intent, JSObject notificationJson, int id\) \{[\s\S]*?\r?\n    \}\r?\n\r?\n    private Notification applyCotidieBigPictureStyle\(Context context, Notification notification, JSObject notificationJson\) \{|    private Notification applyCotidieBigPictureStyle\(Context context, Notification notification, JSObject notificationJson\) \{/,
      `    private boolean deferCotidieEarlyNotification(Context context, Intent intent, JSObject notificationJson, int id) {
        // Cotidie early-delivery guard v2
        if (notificationJson == null) return false;
        try {
            JSObject schedule = notificationJson.getJSObject("schedule");
            if (schedule == null) return false;
            String atValue = schedule.optString("at", null);
            if (atValue == null || atValue.trim().isEmpty()) return false;

            SimpleDateFormat formatter = new SimpleDateFormat(LocalNotificationSchedule.JS_DATE_FORMAT);
            formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date scheduledAt = formatter.parse(atValue);
            if (scheduledAt == null || scheduledAt.getTime() <= System.currentTimeMillis()) return false;

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent retryIntent = (Intent) intent.clone();
            int flags = PendingIntent.FLAG_CANCEL_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags |= PendingIntent.FLAG_MUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, id, retryIntent, flags);
            long triggerAt = scheduledAt.getTime();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                Logger.error(
                    Logger.tags("LN"),
                    "An early notification was suppressed because exact alarm access is unavailable.",
                    null
                );
                return true;
            }

            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            Logger.warn(
                "Capacitor/LocalNotification",
                "Notification arrived before its requested time and was deferred to the exact schedule."
            );
            return true;
        } catch (Exception exactError) {
            Logger.error(Logger.tags("LN"), "Failed to defer an early notification exactly.", exactError);
            return true;
        }
    }

    private Notification applyCotidieBigPictureStyle(Context context, Notification notification, JSObject notificationJson) {`,
      'timed notification early-delivery helper'
    );
  }

  if (publisherChanged) {
    fs.writeFileSync(publisherPath, publisherSource, 'utf8');
  }
}

if (fs.existsSync(restorePath)) {
  let restoreSource = fs.readFileSync(restorePath, 'utf8');
  let restoreChanged = false;

  const replaceRestoreOnce = (pattern, replacement, label) => {
    const next = restoreSource.replace(pattern, replacement);
    if (next === restoreSource) {
      console.error(`patch-local-notifications: pattern not found for ${label}`);
      process.exit(1);
    }
    restoreSource = next;
    restoreChanged = true;
  };

  if (restoreSource.includes('COTIDIE_RESTORE_NOTIFICATION_LIMIT = 42')) {
    restoreSource = restoreSource.replace('COTIDIE_RESTORE_NOTIFICATION_LIMIT = 42', 'COTIDIE_RESTORE_NOTIFICATION_LIMIT = 32');
    restoreChanged = true;
  }

  if (!restoreSource.includes('Cotidie restore cap v1')) {
    if (!restoreSource.includes('import java.util.Collections;')) {
      replaceRestoreOnce(
        /import java\.util\.ArrayList;\r?\nimport java\.util\.Date;\r?\nimport java\.util\.List;/,
        `import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;`,
        'restore receiver collection imports'
      );
    }

    replaceRestoreOnce(
      /public class LocalNotificationRestoreReceiver extends BroadcastReceiver \{\r?\n/,
      `public class LocalNotificationRestoreReceiver extends BroadcastReceiver {
    private static final int COTIDIE_RESTORE_NOTIFICATION_LIMIT = 32;

`,
      'restore receiver cap constant'
    );

    replaceRestoreOnce(
      /        if \(updatedNotifications\.size\(\) > 0\) \{\r?\n            storage\.appendNotifications\(updatedNotifications\);\r?\n        \}\r?\n\r?\n        CapConfig config = CapConfig\.loadDefault\(context\);/,
      `        if (updatedNotifications.size() > 0) {
            storage.appendNotifications(updatedNotifications);
        }

        if (notifications.size() > COTIDIE_RESTORE_NOTIFICATION_LIMIT) {
            // Cotidie restore cap v1
            Collections.sort(
                notifications,
                new Comparator<LocalNotification>() {
                    @Override
                    public int compare(LocalNotification first, LocalNotification second) {
                        return Long.compare(getNotificationRestoreTime(first), getNotificationRestoreTime(second));
                    }
                }
            );
            ArrayList<LocalNotification> keepNotifications = new ArrayList<>(
                notifications.subList(0, COTIDIE_RESTORE_NOTIFICATION_LIMIT)
            );
            for (int i = COTIDIE_RESTORE_NOTIFICATION_LIMIT; i < notifications.size(); i++) {
                LocalNotification removedNotification = notifications.get(i);
                if (removedNotification != null && removedNotification.getId() != null) {
                    storage.deleteNotification(removedNotification.getId().toString());
                }
            }
            notifications = keepNotifications;
        }

        CapConfig config = CapConfig.loadDefault(context);`,
      'restore receiver cap block'
    );

    replaceRestoreOnce(
      /\r?\n\}\r?\n$/,
      `

    private long getNotificationRestoreTime(LocalNotification notification) {
        if (notification == null || notification.getSchedule() == null) return Long.MAX_VALUE;
        LocalNotificationSchedule schedule = notification.getSchedule();
        Date at = schedule.getAt();
        return at != null ? at.getTime() : Long.MAX_VALUE;
    }
}
`,
      'restore receiver sort helper'
    );
  }

  if (restoreChanged) {
    fs.writeFileSync(restorePath, restoreSource, 'utf8');
  }
}
