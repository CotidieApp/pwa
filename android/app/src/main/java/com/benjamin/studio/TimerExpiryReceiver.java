package com.benjamin.studio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class TimerExpiryReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent != null && "cotidie.timer.expiry".equals(intent.getAction()))
            BackgroundActionsPlugin.expireTimerNotification(context);
    }
}
