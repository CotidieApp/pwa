package com.capacitorjs.plugins.localnotifications;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** Only app-signed identity, action and payload may authorize notification side effects. */
public final class CotidieNotificationIntentPolicy {
    public static final String EXTRA = "cotidie_notification_signature_v1";
    public interface TokenStore {
        String read();
        boolean write(String value);
    }
    private CotidieNotificationIntentPolicy() {}

    private static TokenStore store(Context context) {
        SharedPreferences preferences = context.getSharedPreferences("cotidie_notification_auth", Context.MODE_PRIVATE);
        return new TokenStore() {
            public String read() { return preferences.getString("secret", null); }
            public boolean write(String value) { return preferences.edit().putString("secret", value).commit(); }
        };
    }

    private static synchronized String secret(TokenStore store, boolean create) {
        String value = store.read();
        if (value == null && create) {
            value = UUID.randomUUID().toString();
            if (!store.write(value)) throw new IllegalStateException("Notification authentication could not be saved");
        }
        return value;
    }

    private static void field(Mac mac, String value) {
        if (value == null) { mac.update(ByteBuffer.allocate(4).putInt(-1).array()); return; }
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        mac.update(ByteBuffer.allocate(4).putInt(bytes.length).array());
        mac.update(bytes);
    }

    private static String digest(String key, int id, String action, String payload, boolean removable) {
        if (key == null) return null;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            field(mac, Integer.toString(id)); field(mac, action); field(mac, payload);
            field(mac, Boolean.toString(removable));
            StringBuilder hex = new StringBuilder(64);
            for (byte value : mac.doFinal()) hex.append(String.format(java.util.Locale.ROOT, "%02x", value & 255));
            return hex.toString();
        } catch (java.security.GeneralSecurityException error) { throw new IllegalStateException(error); }
    }

    public static String sign(TokenStore store, int id, String action, String payload, boolean removable) {
        return digest(secret(store, true), id, action, payload, removable);
    }

    public static boolean verify(TokenStore store, String signature, int id, String action, String payload, boolean removable) {
        if (signature == null || signature.length() != 64) return false;
        String expected = digest(secret(store, false), id, action, payload, removable);
        return expected != null && MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                signature.getBytes(StandardCharsets.US_ASCII));
    }

    public static void attach(Context context, Intent intent) {
        intent.putExtra(EXTRA, sign(store(context), intent.getIntExtra("LocalNotificationId", Integer.MIN_VALUE),
                intent.getStringExtra("LocalNotificationUserAction"), intent.getStringExtra("LocalNotficationObject"),
                intent.getBooleanExtra("LocalNotificationRepeating", true)));
    }

    public static boolean isTrusted(Context context, Intent intent) {
        try {
            return intent != null && verify(store(context), intent.getStringExtra(EXTRA),
                    intent.getIntExtra("LocalNotificationId", Integer.MIN_VALUE),
                    intent.getStringExtra("LocalNotificationUserAction"), intent.getStringExtra("LocalNotficationObject"),
                    intent.getBooleanExtra("LocalNotificationRepeating", true));
        } catch (RuntimeException invalidExtras) { return false; }
    }
}
