package com.benjamin.studio;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import androidx.core.view.WindowCompat;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String PENDING_IMPORT_KEY = "cotidie_pending_import";
    private static final int MAX_FLUSH_RETRIES = 12;
    private static final int MAX_IMPORT_BYTES = 15 * 1024 * 1024;
    private boolean isInForeground = false;
    private String pendingImportPayload = null;
    private int pendingFlushRetries = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundActionsPlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        configureWebViewStability();
        handleImportIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleImportIntent(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        isInForeground = true;
        flushPendingImportToWebView();
    }

    @Override
    protected void onPause() {
        isInForeground = false;
        super.onPause();
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
        if (payload == null || payload.trim().isEmpty()) return;

        pendingImportPayload = payload;
        flushPendingImportToWebView();
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

    private void scheduleFlushRetry() {
        if (pendingFlushRetries >= MAX_FLUSH_RETRIES) return;
        pendingFlushRetries += 1;
        new Handler(Looper.getMainLooper()).postDelayed(this::flushPendingImportToWebView, 350);
    }

    private void configureWebViewStability() {
        if (bridge == null || bridge.getWebView() == null) return;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        WebView webView = bridge.getWebView();
        webView.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (!isInForeground) {
                    return true;
                }
                try {
                    Intent restart = getIntent();
                    finish();
                    startActivity(restart);
                } catch (Exception ignored) {
                }
                return true;
            }
        });
    }
}
