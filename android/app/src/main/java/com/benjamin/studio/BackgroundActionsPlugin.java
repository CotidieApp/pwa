package com.benjamin.studio;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

@CapacitorPlugin(name = "BackgroundActions")
public class BackgroundActionsPlugin extends Plugin {
    private static final String PREFS_NAME = "cotidie_background_actions";
    private static final String PREFS_KEY = "pending_mark_prayed";

    @PluginMethod
    public void getPendingMarkPrayed(PluginCall call) {
        JSArray ids = new JSArray();
        try {
            Context context = getContext();
            if (context != null) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String raw = prefs.getString(PREFS_KEY, null);
                JSONArray list = raw != null ? new JSONArray(raw) : new JSONArray();
                for (int i = 0; i < list.length(); i++) {
                    String value = list.optString(i, "");
                    if (value != null && !value.isEmpty()) {
                        ids.put(value);
                    }
                }
                prefs.edit().remove(PREFS_KEY).apply();
            }
        } catch (Exception ignored) {
        }

        JSObject result = new JSObject();
        result.put("ids", ids);
        call.resolve(result);
    }
}
