package com.benjamin.studio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class PrivateStorageExpiryReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent != null && intent.getAction() != null && intent.getAction().startsWith("cotidie.expire."))
            PrivateStoragePlugin.expireAndReschedule(context);
    }
}
