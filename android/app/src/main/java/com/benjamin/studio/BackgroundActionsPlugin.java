package com.benjamin.studio;

import android.content.Context;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.AlarmManager;
import android.provider.Settings;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.content.SharedPreferences;
import android.graphics.Color;
import com.benjamin.studio.widgets.SaintWidgetPreferences;
import com.benjamin.studio.widgets.SaintWidgetContent;
import com.benjamin.studio.widgets.SaintWidgetUpdater;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "BackgroundActions")
public class BackgroundActionsPlugin extends Plugin {
    private static final String PREFS_NAME = "cotidie_background_actions";
    private static final String PREFS_KEY = "pending_mark_prayed";
    private static final int TIMER_NOTIFICATION_ID = 820001;
    private static final String TIMER_CHANNEL = "cotidie_timer";
    private final Handler timerHandler = new Handler(Looper.getMainLooper());
    private long timerDeadline = 0;
    private boolean timerBackground = false;
    private final Runnable hideTimer = () -> cancelTimerNotification();
    private static final String TIMER_PREFS = "cotidie_timer_session";

    private static SharedPreferences timerPrefs(Context context) { return context.getSharedPreferences(TIMER_PREFS, Context.MODE_PRIVATE); }
    private static int bootCount(Context context) { return Settings.Global.getInt(context.getContentResolver(), Settings.Global.BOOT_COUNT, -1); }
    private long savedDeadline() {
        SharedPreferences prefs = timerPrefs(getContext());
        int boot = bootCount(getContext());
        return boot >= 0 && prefs.getInt("boot", -2) == boot ? prefs.getLong("deadline", 0) : 0;
    }
    private static PendingIntent expiryIntent(Context context) {
        return PendingIntent.getBroadcast(context, TIMER_NOTIFICATION_ID,
            new Intent(context, TimerExpiryReceiver.class).setAction("cotidie.timer.expiry"),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void expireTimerNotification(Context context) {
        SharedPreferences prefs = timerPrefs(context);
        long deadline = prefs.getLong("deadline", 0);
        int boot = bootCount(context);
        if (boot >= 0 && prefs.getInt("boot", -2) == boot && deadline > SystemClock.elapsedRealtime()) return;
        NotificationManager notifications = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notifications != null) notifications.cancel(TIMER_NOTIFICATION_ID);
    }
    private void scheduleTimerExpiry() {
        AlarmManager alarms = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        PendingIntent intent = expiryIntent(getContext());
        alarms.cancel(intent);
        if (timerDeadline <= 0) return;
        try {
            if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms())
                alarms.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, timerDeadline, intent);
            else alarms.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, timerDeadline, intent);
        } catch (SecurityException error) { alarms.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, timerDeadline, intent); }
    }

    @Override public void load() { timerDeadline = savedDeadline(); }

    @PluginMethod
    public void setTimerNotification(PluginCall call) {
        double remaining = call.getDouble("remainingMs", 0.0);
        boolean active = call.getBoolean("active", false);
        if (!Double.isFinite(remaining) || remaining < 0 || remaining > 86400000) {
            call.reject("Duración de temporizador inválida");
            return;
        }
        getActivity().runOnUiThread(() -> {
            timerDeadline = active && remaining > 0 ? SystemClock.elapsedRealtime() + (long) remaining : 0;
            if (!timerPrefs(getContext()).edit().putLong("deadline", timerDeadline).putInt("boot", bootCount(getContext())).commit()) {
                call.reject("No se confirmó el estado del temporizador."); return;
            }
            try {
                scheduleTimerExpiry();
                if (timerBackground && timerDeadline > 0) showTimerNotification();
                else cancelTimerNotification();
                call.resolve();
            } catch (SecurityException error) {
                call.reject("No hay permiso para mostrar el temporizador", error);
            }
        });
    }

    @Override
    protected void handleOnStop() {
        timerBackground = true;
        if (getActivity().isChangingConfigurations()) return;
        try { showTimerNotification(); } catch (SecurityException ignored) { }
    }

    @PluginMethod
    public void getTimerNotification(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject result = new JSObject();
            result.put("remainingMs", Math.max(0, timerDeadline - SystemClock.elapsedRealtime()));
            result.put("hasSession", timerPrefs(getContext()).getLong("deadline", 0) > 0);
            call.resolve(result);
        });
    }

    @Override
    protected void handleOnResume() {
        timerBackground = false;
        cancelTimerNotification();
    }

    @Override
    protected void handleOnDestroy() {
        timerHandler.removeCallbacks(hideTimer);
        // The persisted expiry broadcast and timeout survive WebView/process teardown.
    }

    private void cancelTimerNotification() {
        timerHandler.removeCallbacks(hideTimer);
        NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.cancel(TIMER_NOTIFICATION_ID);
    }

    private void showTimerNotification() {
        long remaining = timerDeadline - SystemClock.elapsedRealtime();
        if (timerDeadline == 0 || remaining <= 0) {
            cancelTimerNotification();
            return;
        }
        scheduleTimerExpiry();
        NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || !manager.areNotificationsEnabled()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(TIMER_CHANNEL, "Temporizador de oración", NotificationManager.IMPORTANCE_LOW);
            channel.setSound(null, null);
            channel.enableVibration(false);
            manager.createNotificationChannel(channel);
        }
        Intent open = new Intent(getContext(), MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(getContext(), TIMER_NOTIFICATION_ID, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(getContext(), TIMER_CHANNEL) : new Notification.Builder(getContext());
        builder.setSmallIcon(R.drawable.ic_stat_cotidie)
                .setContentTitle("Tiempo de oración")
                .setContentText("Temporizador en curso")
                .setWhen(System.currentTimeMillis() + remaining)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setContentIntent(content)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setCategory(Notification.CATEGORY_PROGRESS);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) builder.setTimeoutAfter(remaining);
        manager.notify(TIMER_NOTIFICATION_ID, builder.build());
        timerHandler.removeCallbacks(hideTimer);
        timerHandler.postDelayed(hideTimer, remaining);
    }

    @PluginMethod
    public void getPendingMarkPrayed(PluginCall call) {
        JSArray items = new JSArray();
        try {
            Context context = getContext();
            if (context != null) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String raw = prefs.getString(PREFS_KEY, null);
                JSONArray list = raw != null ? new JSONArray(raw) : new JSONArray();
                for (int i = 0; i < list.length(); i++) {
                    JSONObject entry = list.optJSONObject(i);
                    if (entry == null) {
                        String legacyValue = list.optString(i, "");
                        if (legacyValue != null && !legacyValue.isEmpty()) {
                            JSObject item = new JSObject();
                            item.put("id", legacyValue);
                            item.put("dateKey", JSONObject.NULL);
                            items.put(item);
                        }
                        continue;
                    }

                    String value = entry.optString("id", "");
                    if (value != null && !value.isEmpty()) {
                        JSObject item = new JSObject();
                        item.put("id", value);
                        item.put("dateKey", entry.optString("dateKey", null));
                        items.put(item);
                    }
                }
                prefs.edit().remove(PREFS_KEY).apply();
            }
        } catch (Exception ignored) {
        }

        JSObject result = new JSObject();
        result.put("items", items);
        call.resolve(result);
    }

    @PluginMethod
    public void setSmallWidgetMode(PluginCall call) {
        String mode = SaintWidgetPreferences.normalizeSmallWidgetMode(call.getString("mode", SaintWidgetPreferences.DISPLAY_MODE_FULL));
        Context context = getContext();
        if (context != null) {
            SaintWidgetPreferences.setSmallWidgetMode(context, mode);
            SaintWidgetUpdater.updateAll(context);
        }

        JSObject result = new JSObject();
        result.put("mode", mode);
        call.resolve(result);
    }

    @PluginMethod
    public void setMovableFeastsEnabled(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", true);
        Context context = getContext();
        if (context != null) {
            SaintWidgetPreferences.setMovableFeastsEnabled(context, enabled);
            SaintWidgetUpdater.updateAll(context);
        }
        call.resolve();
    }

    @PluginMethod
    public void refreshSaintWidgets(PluginCall call) {
        Context context = getContext();
        if (context != null) {
            SaintWidgetContent fallback = SaintWidgetUpdater.contentForNow(context);
            String name = call.getString("name", fallback.name);
            String bio = call.getString("bio", fallback.bio);
            String prayerId = call.getString("prayerId", fallback.prayerId);
            String imageId = call.getString("imageId", fallback.imageId);
            String imageAssetPath = resolvePublicAssetPath(call.getString("imageUrl", ""), fallback.imageAssetPath);
            int backgroundColor = parseColor(call.getString("backgroundColor", ""), fallback.backgroundColor);
            boolean lightBackground = isLightColor(backgroundColor);
            SaintWidgetContent synced = new SaintWidgetContent(
                    name,
                    bio,
                    prayerId,
                    imageId,
                    imageAssetPath,
                    fallback.overlayImageAssetPath,
                    backgroundColor,
                    lightBackground ? Color.parseColor("#1E293B") : Color.WHITE,
                    lightBackground ? Color.parseColor("#334155") : Color.argb(230, 255, 255, 255)
            );
            SaintWidgetUpdater.updateAll(context, synced);
        }
        call.resolve();
    }

    private static String resolvePublicAssetPath(String imageUrl, String fallback) {
        if (imageUrl == null || !imageUrl.startsWith("/")) return fallback;
        return "public" + imageUrl;
    }

    private static int parseColor(String value, int fallback) {
        try {
            return Color.parseColor(value);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private static boolean isLightColor(int color) {
        double luminance = (0.2126 * Color.red(color))
                + (0.7152 * Color.green(color))
                + (0.0722 * Color.blue(color));
        return luminance > 153;
    }

    @PluginMethod
    public void setSystemBarAppearance(PluginCall call) {
        boolean darkStatusIcons = call.getBoolean("darkStatusIcons", true);
        boolean darkNavigationIcons = call.getBoolean("darkNavigationIcons", darkStatusIcons);
        if (getActivity() instanceof MainActivity) {
            ((MainActivity) getActivity()).setSystemBarIconAppearance(darkStatusIcons, darkNavigationIcons);
        }
        call.resolve();
    }
}
