package com.benjamin.studio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CotidieNotificationSchedulerReceiver extends BroadcastReceiver {
    private static final ExecutorService DELIVERY = Executors.newSingleThreadExecutor();
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !"com.benjamin.studio.NOTIFICATION_DISPATCH".equals(intent.getAction())) return;
        PendingResult pending = goAsync();
        PowerManager power = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = power == null ? null : power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Cotidie:notification-delivery");
        try {
            if (wakeLock != null) wakeLock.acquire(30000);
            DELIVERY.execute(() -> {
                try { CotidieNotificationSchedulerPlugin.dispatch(context.getApplicationContext()); }
                finally {
                    if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
                    pending.finish();
                }
            });
        } catch (RuntimeException error) {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
            pending.finish();
        }
    }
}
