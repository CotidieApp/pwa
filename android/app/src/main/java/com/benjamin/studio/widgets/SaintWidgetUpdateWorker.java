package com.benjamin.studio.widgets;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class SaintWidgetUpdateWorker extends Worker {
    public SaintWidgetUpdateWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SaintWidgetUpdater.updateAll(context);
        SaintWidgetScheduler.ensureScheduled(context);
        return Result.success();
    }
}
