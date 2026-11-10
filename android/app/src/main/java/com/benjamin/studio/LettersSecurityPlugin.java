package com.benjamin.studio;

import android.app.KeyguardManager;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import android.view.WindowManager;
import androidx.lifecycle.Lifecycle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Enumeration;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

/** Cartas-only password envelope; never the encryption key for the user's letters. */
@CapacitorPlugin(name = "LettersSecurity")
public class LettersSecurityPlugin extends Plugin {
    private static final String ALIAS_PREFIX = "cotidie.letters.auth.v1.";
    private static final int MAX_SECRET_BYTES = 4096;
    private static final long PROMPT_TIMEOUT_MS = 120000L;
    private final Handler main = new Handler(Looper.getMainLooper());
    // All request state and cryptographic finalization run on the activity's main thread.
    private Request pending;
    private boolean destroyed;

    private static final class Request {
        final PluginCall call;
        final CancellationSignal cancellation = new CancellationSignal();
        final boolean storing;
        byte[] secret;
        byte[] encrypted;
        String alias;
        Cipher cipher;
        Runnable timeout;

        Request(PluginCall call, boolean storing) {
            this.call = call;
            this.storing = storing;
        }

        void discard() {
            if (secret != null) Arrays.fill(secret, (byte) 0);
            if (encrypted != null) Arrays.fill(encrypted, (byte) 0);
            secret = null;
            encrypted = null;
            cipher = null;
            // The bridge must not retain the enrollment password in call arguments.
            call.getData().remove("secret");
        }
    }

    private boolean foreground() {
        return !destroyed && getActivity() != null && !getActivity().isFinishing()
            && !getActivity().isDestroyed()
            && getActivity().getLifecycle().getCurrentState().isAtLeast(Lifecycle.State.RESUMED);
    }

    private boolean authenticationAvailable() {
        // Older Android cannot combine per-operation CryptoObject authentication and
        // device credentials safely. Keep Cartas' app-password fallback there.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return false;
        KeyguardManager keyguard = getContext().getSystemService(KeyguardManager.class);
        BiometricManager biometrics = getContext().getSystemService(BiometricManager.class);
        return keyguard != null && keyguard.isDeviceSecure() && biometrics != null
            && biometrics.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG
                | BiometricManager.Authenticators.DEVICE_CREDENTIAL) == BiometricManager.BIOMETRIC_SUCCESS;
    }

    private AtomicFile envelopeFile() {
        // noBackupFilesDir excludes both the ciphertext and its alias from Android backup.
        return new AtomicFile(new File(getContext().getNoBackupFilesDir(), "cotidie_letters_auth_v1.sealed"));
    }

    private static KeyStore keyStore() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        return store;
    }

    private static String checkedAlias(String alias) {
        if (alias == null || !alias.startsWith(ALIAS_PREFIX)
            || !alias.substring(ALIAS_PREFIX.length()).matches("[a-f0-9-]{36}"))
            throw new IllegalArgumentException("Alias de Cartas inválido.");
        return alias;
    }

    private static byte[] metadata(String alias) {
        return ("cotidie.letters.password\0v1\0" + checkedAlias(alias)).getBytes(StandardCharsets.UTF_8);
    }

    private static SecretKey createKey(String alias) throws Exception {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) throw new IllegalStateException("Android no compatible.");
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(checkedAlias(alias),
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)
            // Zero means a fresh authentication for this exact cipher operation.
            .setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG | KeyProperties.AUTH_DEVICE_CREDENTIAL)
            .build());
        return generator.generateKey();
    }

    private JSONObject readEnvelope() throws Exception {
        AtomicFile source = envelopeFile();
        if (!source.getBaseFile().exists() && !new File(source.getBaseFile().getPath() + ".bak").exists()) return null;
        byte[] bytes = source.readFully();
        if (bytes.length > 16384) throw new IllegalStateException("Sobre de Cartas inválido.");
        JSONObject envelope = new JSONObject(new String(bytes, StandardCharsets.UTF_8));
        if (envelope.getInt("version") != 1) throw new IllegalStateException("Versión de Cartas no compatible.");
        checkedAlias(envelope.getString("alias"));
        return envelope;
    }

    private void writeEnvelope(JSONObject envelope) throws Exception {
        AtomicFile target = envelopeFile();
        FileOutputStream output = null;
        try {
            output = target.startWrite();
            output.write(envelope.toString().getBytes(StandardCharsets.UTF_8));
            output.getFD().sync();
            target.finishWrite(output);
        } catch (Exception error) {
            if (output != null) target.failWrite(output);
            throw error;
        }
    }

    private void deleteAlias(String alias) {
        try { keyStore().deleteEntry(checkedAlias(alias)); }
        catch (Exception ignored) { /* An unused key cannot reveal a secret; explicit clear retries all aliases. */ }
    }

    @PluginMethod public void available(PluginCall call) {
        JSObject result = new JSObject();
        try { result.put("available", authenticationAvailable()); }
        catch (Exception ignored) { result.put("available", false); }
        call.resolve(result);
    }

    @PluginMethod public void storeSecret(PluginCall call) {
        main.post(() -> begin(call, true));
    }

    @PluginMethod public void unlockSecret(PluginCall call) {
        main.post(() -> begin(call, false));
    }

    private void begin(PluginCall call, boolean storing) {
        if (pending != null) {
            call.getData().remove("secret");
            call.reject("Ya hay una autenticación de Cartas en curso.", "BUSY");
            return;
        }
        if (!foreground()) {
            call.getData().remove("secret");
            call.reject("Abre Cotidie para autenticarte.", "BACKGROUND");
            return;
        }
        Request request = new Request(call, storing);
        pending = request;
        try {
            if (!authenticationAvailable()) {
                fail(request, "Usa la contraseña de Cartas: el desbloqueo del dispositivo no está disponible.", "UNAVAILABLE");
                return;
            }
            request.cipher = Cipher.getInstance("AES/GCM/NoPadding");
            if (storing) {
                String secret = call.getString("secret");
                call.getData().remove("secret");
                if (secret == null || secret.isEmpty() || secret.length() > MAX_SECRET_BYTES)
                    throw new IllegalArgumentException("Contraseña de Cartas inválida.");
                request.secret = secret.getBytes(StandardCharsets.UTF_8);
                if (request.secret.length > MAX_SECRET_BYTES) throw new IllegalArgumentException("Contraseña de Cartas demasiado larga.");
                request.alias = ALIAS_PREFIX + UUID.randomUUID();
                request.cipher.init(Cipher.ENCRYPT_MODE, createKey(request.alias));
            } else {
                JSONObject envelope = readEnvelope();
                if (envelope == null) {
                    fail(request, "Activa el desbloqueo del dispositivo con tu contraseña de Cartas.", "NOT_ENROLLED");
                    return;
                }
                request.alias = checkedAlias(envelope.getString("alias"));
                SecretKey key = (SecretKey) keyStore().getKey(request.alias, null);
                if (key == null) {
                    fail(request, "El desbloqueo cambió. Usa la contraseña de Cartas y vuelve a activarlo.", "KEY_UNAVAILABLE");
                    return;
                }
                byte[] iv = Base64.decode(envelope.getString("iv"), Base64.NO_WRAP);
                request.encrypted = Base64.decode(envelope.getString("data"), Base64.NO_WRAP);
                if (iv.length != 12 || request.encrypted.length < 16 || request.encrypted.length > MAX_SECRET_BYTES + 16)
                    throw new IllegalArgumentException("Sobre de Cartas inválido.");
                request.cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            }
            prompt(request);
        } catch (KeyPermanentlyInvalidatedException error) {
            fail(request, "El bloqueo del dispositivo cambió. Usa la contraseña de Cartas y vuelve a activar el desbloqueo.", "KEY_INVALIDATED");
        } catch (Exception error) {
            fail(request, "No se pudo preparar el desbloqueo. Usa la contraseña de Cartas.", "AUTH_FAILED");
        }
    }

    private void prompt(Request request) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            fail(request, "Usa la contraseña de Cartas.", "UNAVAILABLE");
            return;
        }
        String reason = request.storing ? "Confirma tu identidad para activar el desbloqueo de Cartas."
            : request.call.getString("reason", "Desbloquear Cartas");
        if (reason.trim().isEmpty()) reason = "Desbloquear Cartas";
        if (reason.length() > 160) reason = reason.substring(0, 160);
        BiometricPrompt prompt = new BiometricPrompt.Builder(getActivity())
            .setTitle("Cartas")
            .setSubtitle(reason)
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG
                | BiometricManager.Authenticators.DEVICE_CREDENTIAL)
            .setConfirmationRequired(true)
            .build();
        request.timeout = () -> fail(request, "La autenticación caducó. Inténtalo otra vez.", "CANCELED");
        main.postDelayed(request.timeout, PROMPT_TIMEOUT_MS);
        prompt.authenticate(new BiometricPrompt.CryptoObject(request.cipher), request.cancellation,
            getActivity().getMainExecutor(), new BiometricPrompt.AuthenticationCallback() {
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    if (pending != request) return;
                    if (!foreground()) {
                        fail(request, "La autenticación se cerró al salir de Cotidie.", "BACKGROUND");
                        return;
                    }
                    BiometricPrompt.CryptoObject crypto = result.getCryptoObject();
                    if (crypto == null || crypto.getCipher() != request.cipher) {
                        fail(request, "No se autorizó la clave de Cartas.", "AUTH_FAILED");
                        return;
                    }
                    finish(request);
                }

                @Override public void onAuthenticationError(int code, CharSequence message) {
                    if (pending != request) return;
                    boolean canceled = code == BiometricPrompt.BIOMETRIC_ERROR_CANCELED
                        || code == BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED;
                    fail(request, canceled ? "Autenticación cancelada." : "No se pudo autenticar. Usa la contraseña de Cartas.",
                        canceled ? "CANCELED" : "AUTH_FAILED");
                }
            });
    }

    private void finish(Request request) {
        try {
            // AAD and doFinal run only after the exact CryptoObject was authenticated.
            request.cipher.updateAAD(metadata(request.alias));
            if (request.storing) {
                byte[] data = request.cipher.doFinal(request.secret);
                JSONObject envelope = new JSONObject().put("version", 1).put("alias", request.alias)
                    .put("iv", Base64.encodeToString(request.cipher.getIV(), Base64.NO_WRAP))
                    .put("data", Base64.encodeToString(data, Base64.NO_WRAP));
                // A failed/canceled enrollment never overwrites the previous envelope/key.
                writeEnvelope(envelope);
                complete(request);
                request.call.resolve();
            } else {
                request.secret = request.cipher.doFinal(request.encrypted);
                if (!foreground()) {
                    fail(request, "La autenticación se cerró al salir de Cotidie.", "BACKGROUND");
                    return;
                }
                JSObject result = new JSObject();
                result.put("secret", new String(request.secret, StandardCharsets.UTF_8));
                complete(request);
                request.call.resolve(result);
            }
        } catch (Exception error) {
            // Preserve both the user's letters and unreadable enrollment for manual recovery.
            fail(request, "No se pudo abrir la clave. Usa la contraseña de Cartas.", "KEY_UNAVAILABLE");
        }
    }

    private void complete(Request request) {
        if (pending != request) return;
        pending = null;
        if (request.timeout != null) main.removeCallbacks(request.timeout);
        request.discard();
    }

    private void fail(Request request, String message, String code) {
        if (pending != request) return;
        complete(request);
        request.cancellation.cancel();
        if (request.storing && request.alias != null) deleteAlias(request.alias);
        request.call.reject(message, code);
    }

    @PluginMethod public void clearSecret(PluginCall call) {
        main.post(() -> {
            if (pending != null) fail(pending, "Autenticación cancelada.", "CANCELED");
            try {
                KeyStore store = keyStore();
                ArrayList<String> aliases = new ArrayList<>();
                Enumeration<String> entries = store.aliases();
                while (entries.hasMoreElements()) {
                    String alias = entries.nextElement();
                    if (alias.startsWith(ALIAS_PREFIX)) aliases.add(checkedAlias(alias));
                }
                for (String alias : aliases) store.deleteEntry(alias);
                envelopeFile().delete();
                if (envelopeFile().getBaseFile().exists()) throw new IllegalStateException("No se confirmó el borrado.");
                call.resolve();
            } catch (Exception error) {
                call.reject("No se pudo desactivar el desbloqueo del dispositivo.", "CLEAR_FAILED");
            }
        });
    }

    @PluginMethod public void setPrivacy(PluginCall call) {
        main.post(() -> {
            if (destroyed || getActivity() == null || getActivity().isDestroyed()) {
                call.reject("Cotidie ya no está disponible.", "BACKGROUND");
                return;
            }
            if (Boolean.TRUE.equals(call.getBoolean("enabled", false)))
                getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            call.resolve();
        });
    }

    @Override protected void handleOnDestroy() {
        destroyed = true;
        if (pending != null) fail(pending, "Autenticación cancelada.", "CANCELED");
    }

    @Override protected void handleOnPause() {
        // System BiometricPrompt is an overlay, not a separate credential activity.
        // Leaving Cotidie invalidates even an outstanding authenticated operation.
        if (pending != null) fail(pending, "La autenticación se cerró al salir de Cotidie.", "BACKGROUND");
    }
}
