package com.benjamin.studio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class CotidieNotificationSchedulerBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (!SystemBroadcastPolicy.notificationUpdate(action)) return;
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(action))
            com.capacitorjs.plugins.localnotifications.LocalNotificationManager.refreshCotidieNotificationIntents(context);
        if (Intent.ACTION_TIME_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action))
            CotidieNotificationSchedulerPlugin.rebaseRulesAfterClockChange(context);
        else CotidieNotificationSchedulerPlugin.scheduleNext(context);
        PrivateStoragePlugin.expireAndReschedule(context);
        BackgroundActionsPlugin.expireTimerNotification(context);
    }
}
