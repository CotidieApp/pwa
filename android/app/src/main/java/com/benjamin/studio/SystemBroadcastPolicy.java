package com.benjamin.studio;

public final class SystemBroadcastPolicy {
    private SystemBroadcastPolicy() {}

    public static boolean notificationUpdate(String action) {
        return "android.intent.action.BOOT_COMPLETED".equals(action)
                || "android.intent.action.MY_PACKAGE_REPLACED".equals(action)
                || "android.intent.action.TIME_SET".equals(action)
                || "android.intent.action.TIMEZONE_CHANGED".equals(action);
    }

    public static boolean widgetUpdate(String action) {
        return notificationUpdate(action) || "android.intent.action.DATE_CHANGED".equals(action);
    }
}
