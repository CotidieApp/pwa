package com.benjamin.studio.widgets;

import android.content.Context;

import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import java.util.Calendar;
import java.util.concurrent.TimeUnit;

final class SaintWidgetScheduler {
    static final String UNIQUE_WORK_NAME = "saint_widget_daily_update";

    static void ensureScheduled(Context context) {
        long delayMs = millisUntilNextMidnight();
        OneTimeWorkRequest req = new OneTimeWorkRequest.Builder(SaintWidgetUpdateWorker.class)
                .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
                .addTag(UNIQUE_WORK_NAME)
                .build();
        WorkManager.getInstance(context).enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.REPLACE, req);
    }

    private static long millisUntilNextMidnight() {
        Calendar now = Calendar.getInstance();
        Calendar next = Calendar.getInstance();
        next.setTimeInMillis(now.getTimeInMillis());
        next.add(Calendar.DAY_OF_MONTH, 1);
        next.set(Calendar.HOUR_OF_DAY, 0);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 5);
        next.set(Calendar.MILLISECOND, 0);
        long delay = next.getTimeInMillis() - now.getTimeInMillis();
        return Math.max(0L, delay);
    }
}
