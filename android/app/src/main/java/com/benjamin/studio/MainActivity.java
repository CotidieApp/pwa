package com.benjamin.studio;

import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String PENDING_IMPORT_KEY = "cotidie_pending_import";
    private static final String PENDING_NAVIGATION_KEY = "cotidie_pending_navigation";
    private static final String EXTRA_NAV_TARGET_TYPE = "cotidie_target_type";
    private static final String EXTRA_NAV_TARGET_ID = "cotidie_target_id";
    private static final String EXTRA_NAV_ROUTE = "cotidie_route";
    private static final int MAX_FLUSH_RETRIES = 12;
    private static final int MAX_IMPORT_BYTES = 15 * 1024 * 1024;
    private static final String WEBVIEW_PREFS = "cotidie_webview_stability";
    private static final String WEBVIEW_CRASH_COUNT_KEY = "render_crash_count";
    private static final String WEBVIEW_LAST_CRASH_AT_KEY = "render_crash_at";
    private static final String RECOVERY_MODE_EXTRA = "cotidie_recovery_mode";
    private static final long RENDER_CRASH_WINDOW_MS = 15000L;
    private static final int MAX_RENDER_RESTARTS = 2;
    private boolean isInForeground = false;
    private String pendingImportPayload = null;
    private String pendingNavigationPayload = null;
    private int pendingFlushRetries = 0;
    private int pendingNavigationFlushRetries = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundActionsPlugin.class);
        super.onCreate(savedInstanceState);
        configureSystemBars();
        configureWebViewStability();
        if (getIntent() != null && getIntent().getBooleanExtra(RECOVERY_MODE_EXTRA, false)) {
            showRecoveryScreen();
        }
        handleNavigationIntent(getIntent());
        handleImportIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNavigationIntent(intent);
        handleImportIntent(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        configureSystemBars();
        isInForeground = true;
        flushPendingNavigationToWebView();
        flushPendingImportToWebView();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            configureSystemBars();
        }
    }

    @Override
    public void onPause() {
        isInForeground = false;
        super.onPause();
    }

    private void configureSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }

    private void handleImportIntent(Intent intent) {
        if (intent == null) return;

        Uri uri = null;
        String action = intent.getAction();

        if (Intent.ACTION_VIEW.equals(action)) {
            uri = intent.getData();
        } else if (Intent.ACTION_SEND.equals(action)) {
            Object stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (stream instanceof Uri) {
                uri = (Uri) stream;
            }
        }

        if (uri == null || !isSupportedImportUri(uri)) return;

        String payload = readTextFromUri(uri);
        clearHandledImportIntent(intent);
        if (payload == null || payload.trim().isEmpty()) return;

        pendingImportPayload = payload;
        flushPendingImportToWebView();
    }

    private void handleNavigationIntent(Intent intent) {
        if (intent == null) return;

        String route = intent.getStringExtra(EXTRA_NAV_ROUTE);
        String targetType = intent.getStringExtra(EXTRA_NAV_TARGET_TYPE);
        String targetId = intent.getStringExtra(EXTRA_NAV_TARGET_ID);

        if ((route == null || route.trim().isEmpty())
                && (targetType == null || targetType.trim().isEmpty() || targetId == null || targetId.trim().isEmpty())) {
            return;
        }

        try {
            JSONObject payload = new JSONObject();
            if (route != null && !route.trim().isEmpty()) {
                payload.put("type", "route");
                payload.put("route", route.trim());
            } else {
                payload.put("type", targetType.trim());
                payload.put("id", targetId.trim());
            }
            pendingNavigationPayload = payload.toString();
            flushPendingNavigationToWebView();
        } catch (Exception ignored) {
        }

        intent.removeExtra(EXTRA_NAV_ROUTE);
        intent.removeExtra(EXTRA_NAV_TARGET_TYPE);
        intent.removeExtra(EXTRA_NAV_TARGET_ID);
    }

    private boolean isSupportedImportUri(Uri uri) {
        String path = uri.getPath();
        if (path == null) return true;
        String lower = path.toLowerCase();
        return lower.endsWith(".ctd") || lower.endsWith(".json");
    }

    private String readTextFromUri(Uri uri) {
        try (InputStream inputStream = getContentResolver().openInputStream(uri)) {
            if (inputStream == null) return null;
            BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line).append('\n');
                if (builder.length() > MAX_IMPORT_BYTES) {
                    return null;
                }
            }
            return builder.toString();
        } catch (Exception ignored) {
            return null;
        }
    }

    private void clearHandledImportIntent(Intent intent) {
        try {
            intent.setAction(Intent.ACTION_MAIN);
            intent.setData(null);
            intent.setType(null);
            intent.removeExtra(Intent.EXTRA_STREAM);
            setIntent(intent);
        } catch (Exception ignored) {
        }
    }

    private void flushPendingImportToWebView() {
        if (pendingImportPayload == null || pendingImportPayload.trim().isEmpty()) return;
        if (bridge == null || bridge.getWebView() == null) {
            scheduleFlushRetry();
            return;
        }

        final String payload = pendingImportPayload;
        pendingImportPayload = null;

        String js = "try{localStorage.setItem('" + PENDING_IMPORT_KEY + "',"
                + JSONObject.quote(payload)
                + ");window.dispatchEvent(new Event('cotidie-pending-import'));}catch(e){}";

        pendingFlushRetries = 0;
        runOnUiThread(() -> bridge.getWebView().evaluateJavascript(js, null));
    }

    private void flushPendingNavigationToWebView() {
        if (pendingNavigationPayload == null || pendingNavigationPayload.trim().isEmpty()) return;
        if (bridge == null || bridge.getWebView() == null) {
            scheduleNavigationFlushRetry();
            return;
        }

        final String payload = pendingNavigationPayload;
        pendingNavigationPayload = null;

        String js = "try{localStorage.setItem('" + PENDING_NAVIGATION_KEY + "',"
                + JSONObject.quote(payload)
                + ");window.dispatchEvent(new Event('cotidie-pending-navigation'));}catch(e){}";

        pendingNavigationFlushRetries = 0;
        runOnUiThread(() -> bridge.getWebView().evaluateJavascript(js, null));
    }

    private void scheduleFlushRetry() {
        if (pendingFlushRetries >= MAX_FLUSH_RETRIES) return;
        pendingFlushRetries += 1;
        new Handler(Looper.getMainLooper()).postDelayed(this::flushPendingImportToWebView, 350);
    }

    private void scheduleNavigationFlushRetry() {
        if (pendingNavigationFlushRetries >= MAX_FLUSH_RETRIES) return;
        pendingNavigationFlushRetries += 1;
        new Handler(Looper.getMainLooper()).postDelayed(this::flushPendingNavigationToWebView, 350);
    }

    private void configureWebViewStability() {
        if (bridge == null || bridge.getWebView() == null) return;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        WebView webView = bridge.getWebView();
        webView.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (getIntent() != null && getIntent().getBooleanExtra(RECOVERY_MODE_EXTRA, false)) {
                    return;
                }
                clearRenderCrashState();
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (!isInForeground) {
                    return true;
                }
                try {
                    Intent restart = new Intent(MainActivity.this, MainActivity.class);
                    if (getIntent() != null && getIntent().getExtras() != null) {
                        restart.putExtras(getIntent().getExtras());
                    }
                    restart.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                    int crashCount = registerRenderCrash();
                    if (crashCount >= MAX_RENDER_RESTARTS) {
                        restart.putExtra(RECOVERY_MODE_EXTRA, true);
                    }
                    finish();
                    startActivity(restart);
                } catch (Exception ignored) {
                }
                return true;
            }
        });
    }

    private int registerRenderCrash() {
        SharedPreferences prefs = getSharedPreferences(WEBVIEW_PREFS, MODE_PRIVATE);
        long now = System.currentTimeMillis();
        long lastCrashAt = prefs.getLong(WEBVIEW_LAST_CRASH_AT_KEY, 0L);
        int count = prefs.getInt(WEBVIEW_CRASH_COUNT_KEY, 0);
        if (now - lastCrashAt > RENDER_CRASH_WINDOW_MS) {
            count = 0;
        }
        count += 1;
        prefs.edit()
            .putLong(WEBVIEW_LAST_CRASH_AT_KEY, now)
            .putInt(WEBVIEW_CRASH_COUNT_KEY, count)
            .apply();
        return count;
    }

    private void clearRenderCrashState() {
        SharedPreferences prefs = getSharedPreferences(WEBVIEW_PREFS, MODE_PRIVATE);
        prefs.edit()
            .remove(WEBVIEW_LAST_CRASH_AT_KEY)
            .remove(WEBVIEW_CRASH_COUNT_KEY)
            .apply();
    }

    private void showRecoveryScreen() {
        if (bridge == null || bridge.getWebView() == null) return;
        String baseUrl = "https://localhost/";
        String html = "<!doctype html><html><head><meta charset='utf-8'>"
            + "<meta name='viewport' content='width=device-width, initial-scale=1'>"
            + "<title>Cotidie</title>"
            + "<style>body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}"
            + ".card{max-width:420px;background:#111827;border:1px solid #334155;border-radius:18px;padding:24px;box-shadow:0 20px 45px rgba(0,0,0,.35);}"
            + "h1{margin:0 0 12px;font-size:22px;}p{line-height:1.5;color:#cbd5e1;}button{margin-top:16px;background:#f8fafc;color:#0f172a;border:0;border-radius:999px;padding:12px 18px;font-weight:700;width:100%;}</style>"
            + "</head><body><div class='card'><h1>Cotidie se recupero de un fallo del WebView</h1>"
            + "<p>La app detecto varios cierres seguidos al abrirse y detuvo el reinicio automatico para evitar un bucle. Puedes intentar una recarga limpia desde aqui.</p>"
            + "<button onclick=\"window.location.replace('/')\">Reintentar</button></div></body></html>";
        bridge.getWebView().loadDataWithBaseURL(baseUrl, html, "text/html", "utf-8", null);
    }
}
