package com.benjamin.studio;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.app.NotificationManager;
import android.app.Notification;
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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
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
    private static final String RULE_NEXT = "rule_next_at";
    private static final String RETRY_AFTER = "retry_after";
    private static final int DEV_NOTIFICATION_ID = 820002;

    @PluginMethod
    public void replaceSchedule(PluginCall call) {
        synchronized (LOCK) {
        JSArray events = call.getArray("events");
        JSArray dailyRules = call.getArray("dailyRules");
        if (events == null) events = new JSArray();
        if (dailyRules == null) dailyRules = new JSArray();
        long now = System.currentTimeMillis();
        Set<String> activeSources = new HashSet<>();
        JSArray sourceIds = call.getArray("activeEventSources");
        if (sourceIds != null) for (int i = 0; i < sourceIds.length(); i++) {
            String source = sourceIds.optString(i);
            if (!source.isEmpty()) activeSources.add(source);
        }
        Set<Integer> eventIds = new HashSet<>();
        for (int i = 0; i < events.length(); i++) {
            JSONObject event = events.optJSONObject(i);
            if (event != null) {
                eventIds.add(event.optInt("id"));
                String source = eventSource(event);
                if (!source.isEmpty()) activeSources.add(source);
            }
        }
        JSONArray previousEvents = readArray(getContext(), EVENTS);
        for (int i = 0; i < previousEvents.length(); i++) {
            JSONObject event = previousEvents.optJSONObject(i);
            if (event != null && CotidieNotificationTimeline.preserveDated(event.optLong("at"), now,
                activeSources.contains(eventSource(event)), eventIds.contains(event.optInt("id")))) {
                events.put(event); eventIds.add(event.optInt("id"));
            }
        }
        JSONArray previousRules = readArray(getContext(), DAILY_RULES);
        Map<String, Long> previousPlan = plannedRules(getContext(), previousRules, now);
        JSONObject nextPlan = new JSONObject();
        for (int i = 0; i < dailyRules.length(); i++) {
            JSONObject raw = dailyRules.optJSONObject(i);
            if (raw == null) continue;
            CotidieNotificationTimeline.Rule rule = timelineRule(raw);
            JSONObject previous = findRule(previousRules, rule.id);
            boolean unchanged = previous != null && previous.optInt("hour", -1) == rule.hour &&
                previous.optInt("minute", 0) == rule.minute &&
                ((previous.optJSONArray("skipDateKeys") == null) == (raw.optJSONArray("skipDateKeys") == null));
            if (unchanged) unchanged = String.valueOf(previous.optJSONArray("skipDateKeys")).equals(String.valueOf(raw.optJSONArray("skipDateKeys")));
            try { nextPlan.put(rule.id, unchanged ? previousPlan.getOrDefault(rule.id, CotidieNotificationTimeline.nextAfter(rule, now))
                : CotidieNotificationTimeline.nextAfter(rule, now)); }
            catch (Exception error) { call.reject("Regla de recordatorio inválida."); return; }
        }
        SharedPreferences.Editor editor = prefs(getContext()).edit();
        editor.putString(EVENTS, events.toString());
        editor.putString(DAILY_RULES, dailyRules.toString());
        editor.putString(RULE_NEXT, nextPlan.toString());
        editor.remove(RETRY_AFTER);
        // Reconfiguring/foreground checks must not redeliver today's daily rule.
        if (!editor.commit()) { call.reject("No se confirmó el calendario de recordatorios."); return; }
        cleanLegacyDevNotifications(getContext(), previousRules, dailyRules);
        scheduleNext(getContext());
        call.resolve(scheduleStatus(getContext()));
        }
    }

    @PluginMethod public void getScheduleStatus(PluginCall call) {
        synchronized (LOCK) { call.resolve(scheduleStatus(getContext())); }
    }

    @PluginMethod public void resumeSchedule(PluginCall call) {
        synchronized (LOCK) { scheduleNext(getContext()); call.resolve(scheduleStatus(getContext())); }
    }

    private static JSObject scheduleStatus(Context context) {
        JSObject result = new JSObject();
        SharedPreferences state = prefs(context);
        String reason = state.getString("schedule_reason", "empty");
        String blocked = notificationsBlocked(context);
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (blocked != null) reason = blocked;
        else if (alarms != null && Build.VERSION.SDK_INT >= 31 && !alarms.canScheduleExactAlarms()) reason = "exact_alarm_permission";
        result.put("status", "scheduled".equals(reason) ? "scheduled" : "empty".equals(reason) ? "empty" : "blocked");
        result.put("reason", reason);
        long at = state.getLong("next_alarm_at", 0);
        result.put("nextAlarmAt", "scheduled".equals(reason) && at > 0 ? at : JSONObject.NULL);
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
        // Keep the token of any broadcast already queued by Android; cancelling it can lose delivery.
        PendingIntent pendingIntent = dispatchIntent(context, PendingIntent.FLAG_UPDATE_CURRENT);
        if (next == Long.MAX_VALUE) { manager.cancel(pendingIntent); status(context, "empty", 0); return; }
        String blocked = notificationsBlocked(context);
        if (blocked != null) { manager.cancel(pendingIntent); status(context, blocked, 0); return; }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) { manager.cancel(pendingIntent); status(context, "exact_alarm_permission", 0); return; }
        next = Math.max(Math.max(next, now + 1000), prefs(context).getLong(RETRY_AFTER, 0));
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

    static void rebaseRulesAfterClockChange(Context context) {
        synchronized (LOCK) {
            long now = System.currentTimeMillis();
            JSONArray rules = readArray(context, DAILY_RULES);
            Map<String, Long> plan = new LinkedHashMap<>();
            for (int i = 0; i < rules.length(); i++) {
                JSONObject raw = rules.optJSONObject(i);
                if (raw == null) continue;
                CotidieNotificationTimeline.Rule rule = timelineRule(raw);
                plan.put(rule.id, CotidieNotificationTimeline.nextAfter(rule, now));
            }
            if (!prefs(context).edit().putString(RULE_NEXT, new JSONObject(plan).toString()).remove(RETRY_AFTER).commit()) {
                status(context, "storage_error", 0); return;
            }
            scheduleNext(context);
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
            long at = event.optLong("at", Long.MAX_VALUE);
            if (CotidieNotificationTimeline.datedDue(at, now)) due.add(event);
            else if (at <= now) continue; // Do not replay obsolete dated notices after a clock jump/reboot.
            else remaining.put(event);
        }

        JSONArray rules = readArray(context, DAILY_RULES);
        List<CotidieNotificationTimeline.Rule> timelineRules = new ArrayList<>();
        for (int i = 0; i < rules.length(); i++) {
            JSONObject rule = rules.optJSONObject(i);
            if (rule != null) timelineRules.add(timelineRule(rule));
        }
        CotidieNotificationTimeline.Decision decision = CotidieNotificationTimeline.dispatch(timelineRules, plannedRules(context, rules, now), now);
        JSONObject delivered = readObject(context, DELIVERED);
        for (CotidieNotificationTimeline.Delivery delivery : decision.due.values()) {
            JSONObject rule = findRule(rules, delivery.rule.id);
            if (rule != null) {
                try {
                    JSONObject notification = new JSONObject(rule.toString());
                    notification.remove("sourceId");
                    notification.remove("hour");
                    notification.remove("minute");
                    notification.remove("skipDateKeys");
                    notification.put("id", delivery.rule.devTest ? DEV_NOTIFICATION_ID : stableId(delivery.rule.id + ":" + delivery.at));
                    notification.put("at", delivery.at);
                    due.add(notification);
                    delivered.put(delivery.rule.id, String.valueOf(delivery.at));
                } catch (Exception ignored) {}
            }
        }

        if (!publish(context, due)) {
            prefs(context).edit().putLong(RETRY_AFTER, now + 60000).commit();
            scheduleNext(context);
            status(context, "delivery_failed", prefs(context).getLong("next_alarm_at", 0));
            return;
        }
        JSONObject nextPlan = new JSONObject(decision.next);
        boolean committed = prefs(context).edit()
            .putString(EVENTS, remaining.toString())
            .putString(DELIVERED, delivered.toString())
            .putString(RULE_NEXT, nextPlan.toString())
            .remove(RETRY_AFTER)
            .commit();
        if (!committed) { status(context, "storage_error", 0); return; }
        // Diagnostic timestamps only, for the explicitly enabled developer test.
        // No prayer text, title, source identifier or private content is logged.
        for (CotidieNotificationTimeline.Delivery delivery : decision.due.values()) {
            if (delivery.rule.devTest) {
                android.util.Log.i("CotidieNotifications", "dev_test_delivery at=" + now);
                break;
            }
        }
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
            if (at > 0 && at < next) next = at;
        }
        JSONArray rules = readArray(context, DAILY_RULES);
        for (long at : plannedRules(context, rules, now).values()) if (at < next) next = at;
        return next;
    }

    private static CotidieNotificationTimeline.Rule timelineRule(JSONObject raw) {
        Set<String> skipped = new HashSet<>();
        JSONArray dates = raw.optJSONArray("skipDateKeys");
        if (dates != null) for (int i = 0; i < dates.length(); i++) skipped.add(dates.optString(i));
        JSONObject extra = raw.optJSONObject("extra");
        return new CotidieNotificationTimeline.Rule(raw.optString("sourceId"), raw.has("hour") ? bounded(raw.optInt("hour"), 0, 23) : -1,
            bounded(raw.optInt("minute"), 0, 59), extra != null && extra.optBoolean("devTest"), skipped);
    }
    private static String eventSource(JSONObject event) {
        String source = event.optString("sourceId");
        if (!source.isEmpty()) return source;
        JSONObject extra = event.optJSONObject("extra");
        if (extra == null) return "";
        if (extra.has("fixedKey")) return extra.optString("fixedKey");
        if (extra.has("feast")) return "feast:" + extra.optString("feast");
        if (extra.has("season")) return "season:" + extra.optString("season");
        if (extra.optBoolean("cartasInactivityReminder") && extra.has("anchorAt")) return "cartas:" + extra.optLong("anchorAt");
        return "";
    }
    private static JSONObject findRule(JSONArray rules, String id) {
        for (int i = 0; i < rules.length(); i++) {
            JSONObject rule = rules.optJSONObject(i);
            if (rule != null && id.equals(rule.optString("sourceId"))) return rule;
        }
        return null;
    }
    private static Map<String, Long> plannedRules(Context context, JSONArray rules, long now) {
        JSONObject stored = readObject(context, RULE_NEXT);
        Map<String, Long> planned = new LinkedHashMap<>();
        long previousAlarm = prefs(context).getLong("next_alarm_at", 0);
        JSONObject delivered = readObject(context, DELIVERED);
        for (int i = 0; i < rules.length(); i++) {
            JSONObject raw = rules.optJSONObject(i);
            if (raw == null) continue;
            CotidieNotificationTimeline.Rule rule = timelineRule(raw);
            long at = stored.optLong(rule.id, 0);
            if (at <= 0) {
                // Migrate the already registered alarm, never infer a backlog from all earlier minutes.
                at = CotidieNotificationTimeline.nextAfter(rule, previousAlarm > 0 ? previousAlarm - 1 : now);
                String legacyKey = rule.hour >= 0 ? CotidieNotificationTimeline.dateKey(at) : occurrenceKey(raw, at, CotidieNotificationTimeline.dateKey(at));
                if (legacyKey.equals(delivered.optString(rule.id))) at = CotidieNotificationTimeline.nextAfter(rule, Math.max(now, at));
            }
            planned.put(rule.id, at);
        }
        if (!prefs(context).contains(RULE_NEXT)) prefs(context).edit().putString(RULE_NEXT, new JSONObject(planned).toString()).commit();
        return planned;
    }
    private static void cleanLegacyDevNotifications(Context context, JSONArray previous, JSONArray current) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        Set<Integer> oldIds = new HashSet<>();
        boolean enabled = false;
        for (int i = 0; i < current.length(); i++) {
            JSONObject rule = current.optJSONObject(i);
            if (rule != null && rule.optJSONObject("extra") != null && rule.optJSONObject("extra").optBoolean("devTest")) enabled = true;
        }
        Calendar day = Calendar.getInstance();
        for (int d = 0; d < 2; d++, day.add(Calendar.DAY_OF_YEAR, -1)) {
            for (int i = 0; i < previous.length(); i++) {
                JSONObject rule = previous.optJSONObject(i);
                if (rule != null && rule.optJSONObject("extra") != null && rule.optJSONObject("extra").optBoolean("devTest"))
                    oldIds.add(stableId(rule.optString("sourceId") + ":" + CotidieNotificationTimeline.dateKey(day.getTimeInMillis())));
            }
        }
        for (android.service.notification.StatusBarNotification active : manager.getActiveNotifications())
            if (oldIds.contains(active.getId()) && "Notificación de prueba (Dev)".equals(active.getNotification().extras.getString(Notification.EXTRA_TITLE))) manager.cancel(active.getId());
        if (!enabled) manager.cancel(DEV_NOTIFICATION_ID);
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
