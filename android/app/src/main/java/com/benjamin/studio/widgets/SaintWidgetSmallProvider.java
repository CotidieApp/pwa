package com.benjamin.studio.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

public class SaintWidgetSmallProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SaintWidgetScheduler.ensureScheduled(context);
        SaintWidgetUpdater.updateAll(context);
    }

    @Override
    public void onEnabled(Context context) {
        SaintWidgetScheduler.ensureScheduled(context);
        SaintWidgetUpdater.updateAll(context);
    }
}
