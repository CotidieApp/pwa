package com.benjamin.studio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class CotidieNotificationSchedulerReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        CotidieNotificationSchedulerPlugin.dispatch(context);
    }
}
