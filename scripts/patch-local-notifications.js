const fs = require('fs');
const path = require('path');

const filePath = path.join(
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

if (!fs.existsSync(filePath)) {
  process.exit(0);
}

const original = fs.readFileSync(filePath, 'utf8');
if (original.includes('com.benjamin.studio.MARK_PRAYED')) {
  process.exit(0);
}

const pattern = /\/\/ TODO Add custom icons to actions[\s\S]*?NotificationCompat\.Action\.Builder actionBuilder = new NotificationCompat\.Action\.Builder\(/;
const replacement = `// TODO Add custom icons to actions
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
                    NotificationCompat.Action.Builder actionBuilder = new NotificationCompat.Action.Builder(`;

const next = original.replace(pattern, replacement);
if (next === original) {
  console.error('patch-local-notifications: pattern not found');
  process.exit(1);
}

fs.writeFileSync(filePath, next, 'utf8');
