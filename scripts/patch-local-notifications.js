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

if (!source.includes('Cotidie exact alarm safe fallback v2')) {
  replaceOnce(
    /    private void setExactIfPossible\(\r?\n        AlarmManager alarmManager,\r?\n        LocalNotificationSchedule schedule,\r?\n        long trigger,\r?\n        PendingIntent pendingIntent\r?\n    \) \{[\s\S]*?\r?\n    \}\r?\n\r?\n    public void cancel\(PluginCall call\) \{/,
    `    private void setExactIfPossible(
        AlarmManager alarmManager,
        LocalNotificationSchedule schedule,
        long trigger,
        PendingIntent pendingIntent
    ) {
        // Cotidie exact alarm safe fallback v2
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            Logger.warn(
                "Capacitor/LocalNotification",
                "Exact alarms not allowed in user settings. Notification scheduled with alarm-clock fallback."
            );
            try {
                Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
                PendingIntent showIntent = launchIntent != null
                    ? PendingIntent.getActivity(
                        context,
                        (int) (trigger % Integer.MAX_VALUE),
                        launchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    )
                    : pendingIntent;
                alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(trigger, showIntent), pendingIntent);
                return;
            } catch (Exception ignored) {}

            setInexactFallback(alarmManager, schedule, trigger, pendingIntent);
            return;
        }

        try {
            if (schedule.allowWhileIdle()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, trigger, pendingIntent);
            }
        } catch (Exception exactError) {
            Logger.warn(
                "Capacitor/LocalNotification",
                "Exact alarm scheduling failed. Notification scheduled with inexact fallback."
            );
            setInexactFallback(alarmManager, schedule, trigger, pendingIntent);
        }
    }

    private void setInexactFallback(
        AlarmManager alarmManager,
        LocalNotificationSchedule schedule,
        long trigger,
        PendingIntent pendingIntent
    ) {
        try {
            if (schedule.allowWhileIdle()) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pendingIntent);
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, trigger, pendingIntent);
            }
        } catch (Exception ignored) {
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

  if (publisherChanged) {
    fs.writeFileSync(publisherPath, publisherSource, 'utf8');
  }
}
