package com.benjamin.studio.widgets;

import android.content.Context;
import android.content.SharedPreferences;

public final class SaintWidgetPreferences {
    public static final String DISPLAY_MODE_FULL = "full";
    public static final String DISPLAY_MODE_SAINT_PRIORITY = "saint_priority";
    private static final String PREFS_NAME = "cotidie_widget_preferences";
    private static final String PREFS_KEY_SMALL_WIDGET_MODE = "small_widget_mode";
    private static final String PREFS_KEY_MOVABLE_FEASTS_ENABLED = "movable_feasts_enabled";

    private SaintWidgetPreferences() {
    }

    public static String getSmallWidgetMode(Context context) {
        if (context == null) return DISPLAY_MODE_FULL;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return normalizeSmallWidgetMode(prefs.getString(PREFS_KEY_SMALL_WIDGET_MODE, DISPLAY_MODE_FULL));
    }

    public static void setSmallWidgetMode(Context context, String mode) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(PREFS_KEY_SMALL_WIDGET_MODE, normalizeSmallWidgetMode(mode)).apply();
    }

    public static boolean isMovableFeastsEnabled(Context context) {
        if (context == null) return true;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(PREFS_KEY_MOVABLE_FEASTS_ENABLED, true);
    }

    public static void setMovableFeastsEnabled(Context context, boolean enabled) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(PREFS_KEY_MOVABLE_FEASTS_ENABLED, enabled).apply();
    }

    public static String normalizeSmallWidgetMode(String mode) {
        return DISPLAY_MODE_SAINT_PRIORITY.equals(mode) ? DISPLAY_MODE_SAINT_PRIORITY : DISPLAY_MODE_FULL;
    }
}
