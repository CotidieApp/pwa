package com.benjamin.studio;

import android.content.Context;
import android.content.SharedPreferences;
import com.benjamin.studio.widgets.SaintWidgetPreferences;
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
    public void setSystemBarAppearance(PluginCall call) {
        boolean darkStatusIcons = call.getBoolean("darkStatusIcons", true);
        boolean darkNavigationIcons = call.getBoolean("darkNavigationIcons", darkStatusIcons);
        if (getActivity() instanceof MainActivity) {
            ((MainActivity) getActivity()).setSystemBarIconAppearance(darkStatusIcons, darkNavigationIcons);
        }
        call.resolve();
    }
}
