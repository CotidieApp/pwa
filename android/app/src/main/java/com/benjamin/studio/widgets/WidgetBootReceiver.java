package com.benjamin.studio.widgets;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class WidgetBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        SaintWidgetScheduler.ensureScheduled(context);
        SaintWidgetUpdater.updateAll(context);
    }
}
