package com.benjamin.studio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;

public class MarkPrayedActionReceiver extends BroadcastReceiver {
    private static final String ACTION_INTENT_KEY = "LocalNotificationUserAction";
    private static final String NOTIFICATION_OBJ_INTENT_KEY = "LocalNotficationObject";
    private static final String PREFS_NAME = "cotidie_background_actions";
    private static final String PREFS_KEY = "pending_mark_prayed";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String actionId = intent.getStringExtra(ACTION_INTENT_KEY);
        if (!"mark_prayed".equals(actionId)) return;

        String notificationJson = intent.getStringExtra(NOTIFICATION_OBJ_INTENT_KEY);
        if (notificationJson == null || notificationJson.isEmpty()) return;

        try {
            JSONObject payload = new JSONObject(notificationJson);
            int notificationId = payload.optInt("id", -1);
            JSONObject extra = payload.optJSONObject("extra");
            JSONObject target = extra != null ? extra.optJSONObject("target") : null;
            String type = target != null ? target.optString("type", "") : "";
            String prayerId = target != null ? target.optString("id", "") : "";

            if ("prayer".equals(type) && prayerId != null && !prayerId.isEmpty()) {
                appendPendingPrayer(context, prayerId);
            }

            if (notificationId >= 0) {
                NotificationManagerCompat.from(context).cancel(notificationId);
            }
        } catch (Exception ignored) {
        }
    }

    private void appendPendingPrayer(Context context, String prayerId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(PREFS_KEY, null);
        JSONArray list;
        try {
            list = raw != null ? new JSONArray(raw) : new JSONArray();
        } catch (Exception e) {
            list = new JSONArray();
        }

        for (int i = 0; i < list.length(); i++) {
            if (prayerId.equals(list.optString(i, ""))) {
                return;
            }
        }
        list.put(prayerId);
        prefs.edit().putString(PREFS_KEY, list.toString()).apply();
    }
}
