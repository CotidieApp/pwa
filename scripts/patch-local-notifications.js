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

if (changed) {
  fs.writeFileSync(managerPath, source, 'utf8');
}
