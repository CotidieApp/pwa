package com.benjamin.studio;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.app.NotificationManager;
import androidx.core.app.NotificationManagerCompat;
import com.capacitorjs.plugins.localnotifications.LocalNotification;
import com.capacitorjs.plugins.localnotifications.LocalNotificationManager;
import com.capacitorjs.plugins.localnotifications.NotificationStorage;
import com.getcapacitor.CapConfig;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Persists Cotidie's complete notification calendar, while Android keeps only
 * one exact alarm: the chronologically next delivery. This avoids the platform
 * PendingIntent ceiling without relying on the WebView being open.
 */
@CapacitorPlugin(name = "CotidieNotificationScheduler")
public class CotidieNotificationSchedulerPlugin extends Plugin {
    private static final String PREFS = "cotidie_notification_scheduler";
    private static final String EVENTS = "events";
    private static final String DAILY_RULES = "daily_rules";
    private static final String DELIVERED = "delivered";
    private static final String ACTION_DISPATCH = "com.benjamin.studio.NOTIFICATION_DISPATCH";
    private static final int DISPATCH_REQUEST_CODE = 0x434F54;
    private static final Object LOCK = new Object();

    @PluginMethod
    public void replaceSchedule(PluginCall call) {
        synchronized (LOCK) {
        JSArray events = call.getArray("events");
        JSArray dailyRules = call.getArray("dailyRules");
        if (events == null) events = new JSArray();
        if (dailyRules == null) dailyRules = new JSArray();
        SharedPreferences.Editor editor = prefs(getContext()).edit();
        editor.putString(EVENTS, events.toString());
        editor.putString(DAILY_RULES, dailyRules.toString());
        // Reconfiguring/foreground checks must not redeliver today's daily rule.
        if (!editor.commit()) { call.reject("No se confirmó el calendario de recordatorios."); return; }
        scheduleNext(getContext());
        call.resolve(scheduleStatus(getContext()));
        }
    }

    @PluginMethod public void getScheduleStatus(PluginCall call) {
        synchronized (LOCK) { scheduleNext(getContext()); call.resolve(scheduleStatus(getContext())); }
    }

    private static JSObject scheduleStatus(Context context) {
        JSObject result = new JSObject();
        SharedPreferences state = prefs(context);
        String reason = state.getString("schedule_reason", "empty");
        result.put("status", "scheduled".equals(reason) ? "scheduled" : "empty".equals(reason) ? "empty" : "blocked");
        result.put("reason", reason);
        long at = state.getLong("next_alarm_at", 0);
        result.put("nextAlarmAt", at > 0 ? at : JSONObject.NULL);
        return result;
    }

    private static void status(Context context, String reason, long at) {
        prefs(context).edit().putString("schedule_reason", reason).putLong("next_alarm_at", at).commit();
    }

    private static String notificationsBlocked(Context context) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return "notification_permission";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null && manager.getNotificationChannel("cotidie-reminders") != null &&
                manager.getNotificationChannel("cotidie-reminders").getImportance() == NotificationManager.IMPORTANCE_NONE)
                return "notification_channel_disabled";
        }
        return null;
    }

    @PluginMethod
    public void clearSchedule(PluginCall call) {
        synchronized (LOCK) {
            if (!clear(getContext())) { call.reject("No se confirmó el borrado de recordatorios."); return; }
            call.resolve();
        }
    }

    static boolean clear(Context context) {
        if (!prefs(context).edit().clear().commit()) return false;
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pendingIntent = dispatchIntent(context, PendingIntent.FLAG_NO_CREATE);
        if (manager != null && pendingIntent != null) manager.cancel(pendingIntent);
        return true;
    }

    static void scheduleNext(Context context) {
        if (context == null) return;
        synchronized (LOCK) {
        long now = System.currentTimeMillis();
        long next = nextEventAt(context, now);
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) { status(context, "alarm_service_unavailable", 0); return; }
        PendingIntent pendingIntent = dispatchIntent(context, PendingIntent.FLAG_CANCEL_CURRENT);
        manager.cancel(pendingIntent);
        if (next == Long.MAX_VALUE) { status(context, "empty", 0); return; }
        String blocked = notificationsBlocked(context);
        if (blocked != null) { status(context, blocked, 0); return; }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) { status(context, "exact_alarm_permission", 0); return; }
        Intent showIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent showPendingIntent = PendingIntent.getActivity(
            context,
            0,
            showIntent == null ? new Intent() : showIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag()
        );
        try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            manager.setAlarmClock(new AlarmManager.AlarmClockInfo(next, showPendingIntent), pendingIntent);
        } else {
            manager.setExact(AlarmManager.RTC_WAKEUP, next, pendingIntent);
        }
        status(context, "scheduled", next);
        } catch (SecurityException error) { status(context, "exact_alarm_permission", 0); }
        }
    }

    static void dispatch(Context context) {
        if (context == null) return;
        synchronized (LOCK) {
        String blocked = notificationsBlocked(context);
        if (blocked != null) { status(context, blocked, 0); return; }
        long now = System.currentTimeMillis();
        List<JSONObject> due = new ArrayList<>();
        JSONArray remaining = new JSONArray();
        JSONArray events = readArray(context, EVENTS);
        for (int i = 0; i < events.length(); i++) {
            JSONObject event = events.optJSONObject(i);
            if (event == null) continue;
            if (event.optLong("at", Long.MAX_VALUE) <= now) due.add(event);
            else remaining.put(event);
        }

        JSONObject delivered = readObject(context, DELIVERED);
        JSONArray rules = readArray(context, DAILY_RULES);
        String todayKey = dateKey(now);
        for (int i = 0; i < rules.length(); i++) {
            JSONObject rule = rules.optJSONObject(i);
            if (rule == null) continue;
            String sourceId = rule.optString("sourceId", "");
            String occurrenceKey = occurrenceKey(rule, now, todayKey);
            if (sourceId.isEmpty() || occurrenceKey.equals(delivered.optString(sourceId, ""))) continue;
            long dueAt = todayAt(rule, now);
            if (dueAt <= now && !isSkipped(rule, todayKey)) {
                try {
                    JSONObject notification = new JSONObject(rule.toString());
                    notification.remove("sourceId");
                    notification.remove("hour");
                    notification.remove("minute");
                    notification.remove("skipDateKeys");
                    notification.put("id", stableId(sourceId + ":" + todayKey));
                    due.add(notification);
                    delivered.put(sourceId, occurrenceKey);
                } catch (Exception ignored) {}
            }
        }

        if (!publish(context, due)) { status(context, "delivery_failed", 0); return; }
        boolean committed = prefs(context).edit()
            .putString(EVENTS, remaining.toString())
            .putString(DELIVERED, delivered.toString())
            .commit();
        if (!committed) { status(context, "storage_error", 0); return; }
        scheduleNext(context);
        }
    }

    private static boolean publish(Context context, List<JSONObject> due) {
        if (due.isEmpty()) return true;
        Collections.sort(due, Comparator.comparingLong(item -> item.optLong("at", 0L)));
        List<LocalNotification> notifications = new ArrayList<>();
        for (JSONObject event : due) {
            try {
                JSONObject raw = new JSONObject(event.toString());
                raw.remove("at");
                LocalNotification notification = LocalNotification.buildNotificationFromJSObject(JSObject.fromJSONObject(raw));
                notification.setSchedule(null);
                notifications.add(notification);
            } catch (Exception error) { return false; }
        }
        if (notifications.isEmpty()) return false;
        LocalNotificationManager manager = new LocalNotificationManager(
            new NotificationStorage(context),
            null,
            context,
            CapConfig.loadDefault(context)
        );
        try { return manager.areNotificationsEnabled() && manager.schedule(null, notifications) != null; }
        catch (Exception error) { return false; }
    }

    private static long nextEventAt(Context context, long now) {
        long next = Long.MAX_VALUE;
        JSONArray events = readArray(context, EVENTS);
        for (int i = 0; i < events.length(); i++) {
            JSONObject event = events.optJSONObject(i);
            long at = event == null ? Long.MAX_VALUE : event.optLong("at", Long.MAX_VALUE);
            if (at > now && at < next) next = at;
        }
        JSONArray rules = readArray(context, DAILY_RULES);
        for (int i = 0; i < rules.length(); i++) {
            JSONObject rule = rules.optJSONObject(i);
            if (rule == null) continue;
            long at = nextDailyAt(rule, now);
            if (at < next) next = at;
        }
        return next;
    }

    private static long nextDailyAt(JSONObject rule, long now) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(now);
        boolean hourly = !rule.has("hour");
        if (!hourly) calendar.set(Calendar.HOUR_OF_DAY, bounded(rule.optInt("hour", 9), 0, 23));
        calendar.set(Calendar.MINUTE, bounded(rule.optInt("minute", 0), 0, 59));
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        if (calendar.getTimeInMillis() <= now) calendar.add(hourly ? Calendar.HOUR_OF_DAY : Calendar.DAY_OF_YEAR, 1);
        return calendar.getTimeInMillis();
    }

    private static long todayAt(JSONObject rule, long now) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(now);
        if (rule.has("hour")) calendar.set(Calendar.HOUR_OF_DAY, bounded(rule.optInt("hour", 9), 0, 23));
        calendar.set(Calendar.MINUTE, bounded(rule.optInt("minute", 0), 0, 59));
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar.getTimeInMillis();
    }

    private static boolean isSkipped(JSONObject rule, String dateKey) {
        JSONArray skipped = rule.optJSONArray("skipDateKeys");
        if (skipped == null) return false;
        for (int i = 0; i < skipped.length(); i++) {
            if (dateKey.equals(skipped.optString(i))) return true;
        }
        return false;
    }

    private static String occurrenceKey(JSONObject rule, long now, String dateKey) {
        if (rule.has("hour")) return dateKey;
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(now);
        return dateKey + ":" + calendar.get(Calendar.HOUR_OF_DAY);
    }

    private static int stableId(String value) {
        int id = value.hashCode() & 0x7fffffff;
        return id == 0 ? 1 : id;
    }

    private static String dateKey(long timestamp) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(timestamp);
        return String.format(java.util.Locale.US, "%04d-%02d-%02d", calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH) + 1, calendar.get(Calendar.DAY_OF_MONTH));
    }

    private static int bounded(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static JSONArray readArray(Context context, String key) {
        try { return new JSONArray(prefs(context).getString(key, "[]")); }
        catch (Exception ignored) { return new JSONArray(); }
    }

    private static JSONObject readObject(Context context, String key) {
        try { return new JSONObject(prefs(context).getString(key, "{}")); }
        catch (Exception ignored) { return new JSONObject(); }
    }

    private static PendingIntent dispatchIntent(Context context, int baseFlags) {
        int flags = baseFlags | immutableFlag();
        Intent intent = new Intent(context, CotidieNotificationSchedulerReceiver.class).setAction(ACTION_DISPATCH);
        return PendingIntent.getBroadcast(context, DISPATCH_REQUEST_CODE, intent, flags);
    }

    private static int immutableFlag() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
    }
}
