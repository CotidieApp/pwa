package com.benjamin.studio;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

@CapacitorPlugin(name = "PrivateStorage")
public class PrivateStoragePlugin extends Plugin {
    private static final Object LOCK = new Object();
    private static final String[] KEYS = { "cotidie_app_state", "cotidie_confession_note_v1", "cotidie_confession_auto_delete_v1" };

    private static String validate(String key) {
        for (String allowed : KEYS) if (allowed.equals(key)) return key;
        throw new IllegalArgumentException("Clave privada no permitida.");
    }
    private static AtomicFile file(Context context, String key) {
        return new AtomicFile(new File(context.getNoBackupFilesDir(), validate(key) + ".sealed"));
    }
    private static KeyStore keyStore() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        return store;
    }
    private static String alias(String key) { return "cotidie.private." + validate(key); }
    private static byte[] metadata(String key, long expiresAt, long revision) {
        return (key + "\0" + expiresAt + "\0" + revision).getBytes(StandardCharsets.UTF_8);
    }
    private static SecretKey encryptionKey(String key, boolean create) throws Exception {
        KeyStore store = keyStore();
        if (store.containsAlias(alias(key))) return (SecretKey) store.getKey(alias(key), null);
        if (!create) throw new IllegalStateException("Clave privada no disponible.");
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(alias(key), KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256).build());
        return generator.generateKey();
    }
    private static JSONObject record(Context context, String key) throws Exception {
        AtomicFile source = file(context, key);
        if (!source.getBaseFile().exists() && !new File(source.getBaseFile().getPath() + ".bak").exists()) return null;
        return new JSONObject(new String(source.readFully(), StandardCharsets.UTF_8));
    }
    static void removeValue(Context context, String key) throws Exception {
        synchronized (LOCK) {
            file(context, key).delete();
            if (file(context, key).getBaseFile().exists()) throw new IllegalStateException("Borrado no confirmado.");
            KeyStore store = keyStore();
            if (store.containsAlias(alias(key))) store.deleteEntry(alias(key));
            AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (manager != null) manager.cancel(expiryIntent(context, key));
        }
    }
    private static PendingIntent expiryIntent(Context context, String key) {
        Intent intent = new Intent(context, PrivateStorageExpiryReceiver.class).setAction("cotidie.expire." + validate(key));
        intent.putExtra("key", key);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    private static void scheduleExpiry(Context context, String key, long expiresAt) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        PendingIntent intent = expiryIntent(context, key);
        manager.cancel(intent);
        if (expiresAt <= 0) return;
        // Expiry is also enforced before decryption. Inexact fallback may be delayed by Android.
        try {
            if (Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms())
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, expiresAt, intent);
            else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, expiresAt, intent);
        } catch (SecurityException error) {
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, expiresAt, intent);
        }
    }
    static void expireAndReschedule(Context context) {
        synchronized (LOCK) {
            for (String key : new String[] { "cotidie_confession_note_v1" }) {
                try {
                    JSONObject value = record(context, key);
                    if (value == null) continue;
                    long expiresAt = value.optLong("expiresAt", 0);
                    if (expiresAt > 0 && System.currentTimeMillis() >= expiresAt) removeValue(context, key);
                    else scheduleExpiry(context, key, expiresAt);
                } catch (Exception ignored) { /* Preserve unreadable data for explicit recovery, never replace it. */ }
            }
        }
    }
    @PluginMethod public void get(PluginCall call) {
        try {
            synchronized (LOCK) {
                String key = validate(call.getString("key"));
                JSONObject value = record(getContext(), key);
                JSObject result = new JSObject();
                if (value != null && value.optLong("expiresAt", 0) > 0 && System.currentTimeMillis() >= value.getLong("expiresAt")) {
                    removeValue(getContext(), key);
                    value = null;
                }
                if (value == null) result.put("value", JSONObject.NULL);
                else {
                    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                    cipher.init(Cipher.DECRYPT_MODE, encryptionKey(key, false),
                        new GCMParameterSpec(128, Base64.decode(value.getString("iv"), Base64.NO_WRAP)));
                    cipher.updateAAD(metadata(key, value.optLong("expiresAt", 0), value.optLong("revision", 0)));
                    result.put("value", new String(cipher.doFinal(Base64.decode(value.getString("data"), Base64.NO_WRAP)), StandardCharsets.UTF_8));
                }
                result.put("revision", value == null ? 0 : value.optLong("revision", 0));
                call.resolve(result);
            }
        } catch (Exception error) { call.reject("No se pudo leer el almacenamiento privado."); }
    }
    @PluginMethod public void set(PluginCall call) {
        try {
            synchronized (LOCK) {
                String key = validate(call.getString("key"));
                String text = call.getString("value");
                double expiry = call.getDouble("expiresAt", 0.0);
                JSONObject previous = record(getContext(), key);
                long revision = previous == null ? 0 : previous.optLong("revision", 0);
                double expectedRevision = call.getDouble("expectedRevision", 0.0);
                if (!Double.isFinite(expectedRevision) || expectedRevision != revision)
                    throw new IllegalStateException("Los datos cambiaron en otra ventana.");
                if (text == null || text.length() > 40 * 1024 * 1024 || !Double.isFinite(expiry) || expiry < 0)
                    throw new IllegalArgumentException("Valor privado inválido.");
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.ENCRYPT_MODE, encryptionKey(key, true));
                cipher.updateAAD(metadata(key, (long) expiry, revision + 1));
                byte[] encrypted = cipher.doFinal(text.getBytes(StandardCharsets.UTF_8));
                JSONObject value = new JSONObject().put("expiresAt", (long) expiry).put("revision", revision + 1)
                    .put("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
                    .put("data", Base64.encodeToString(encrypted, Base64.NO_WRAP));
                AtomicFile target = file(getContext(), key);
                FileOutputStream output = null;
                try {
                    output = target.startWrite();
                    output.write(value.toString().getBytes(StandardCharsets.UTF_8));
                    output.getFD().sync();
                    target.finishWrite(output);
                    if (!new String(target.readFully(), StandardCharsets.UTF_8).equals(value.toString()))
                        throw new IllegalStateException("Archivo privado no confirmado.");
                } catch (Exception error) { if (output != null) target.failWrite(output); throw error; }
                try { scheduleExpiry(getContext(), key, (long) expiry); }
                catch (Exception ignored) { /* Deadline remains enforced before every read. */ }
                JSObject result = new JSObject();
                result.put("revision", revision + 1);
                call.resolve(result);
            }
        } catch (Exception error) { call.reject("No se confirmó el guardado privado."); }
    }
    @PluginMethod public void remove(PluginCall call) {
        try { removeValue(getContext(), validate(call.getString("key"))); call.resolve(); }
        catch (Exception error) { call.reject("No se confirmó el borrado privado."); }
    }
}
