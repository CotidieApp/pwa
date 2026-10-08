package com.benjamin.studio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class CotidieNotificationSchedulerBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        CotidieNotificationSchedulerPlugin.scheduleNext(context);
        PrivateStoragePlugin.expireAndReschedule(context);
        BackgroundActionsPlugin.expireTimerNotification(context);
    }
}
