package com.benjamin.studio.widgets;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class SaintWidgetAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        SaintWidgetUpdater.updateAll(context);
        SaintWidgetScheduler.ensureScheduled(context);
    }
}
