package com.benjamin.studio.widgets;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.benjamin.studio.SystemBroadcastPolicy;

public class WidgetBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !SystemBroadcastPolicy.widgetUpdate(intent.getAction())) return;
        SaintWidgetScheduler.ensureScheduled(context);
        SaintWidgetUpdater.updateAll(context);
    }
}
