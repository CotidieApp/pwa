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
