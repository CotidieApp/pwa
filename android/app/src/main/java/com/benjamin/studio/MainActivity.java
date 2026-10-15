package com.benjamin.studio;

import android.content.Intent;
import android.content.ComponentName;
import android.content.Context;
import android.content.ServiceConnection;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.IBinder;
import android.os.ResultReceiver;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.InputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String PENDING_IMPORT_KEY = "cotidie_pending_import";
    private static final String PENDING_NAVIGATION_KEY = "cotidie_pending_navigation";
    private static final String EXTRA_NAV_TARGET_TYPE = "cotidie_target_type";
    private static final String EXTRA_NAV_TARGET_ID = "cotidie_target_id";
    private static final String EXTRA_NAV_ROUTE = "cotidie_route";
    private static final int MAX_FLUSH_RETRIES = 12;
    private static final int MAX_IMPORT_BYTES = ImportReaderService.MAX_BYTES;
    private static final long IMPORT_TIMEOUT_MS = ImportReaderService.TIMEOUT_MS + 5000L;
    // This worker reads only a completed app-private cache file, never an external provider.
    private static final ThreadPoolExecutor IMPORT_READS = new ThreadPoolExecutor(
            1, 1, 0L, TimeUnit.MILLISECONDS, new ArrayBlockingQueue<>(1));
    private final Handler importHandler = new Handler(Looper.getMainLooper());
    private ImportReadRequest importRequest;

    private static final class ImportReadRequest {
        final AtomicBoolean canceled = new AtomicBoolean(false);
        File output;
        ServiceConnection connection;
        boolean bound;
        boolean received;
        Future<?> future;
        Runnable timeout;
        Runnable completion;

        void cancel() {
            canceled.set(true);
            if (future != null) future.cancel(true);
            IMPORT_READS.purge();
        }
    }
    private static final String WEBVIEW_PREFS = "cotidie_webview_stability";
    private static final String WEBVIEW_CRASH_COUNT_KEY = "render_crash_count";
    private static final String WEBVIEW_LAST_CRASH_AT_KEY = "render_crash_at";
    private static final String RECOVERY_MODE_EXTRA = "cotidie_recovery_mode";
    private static final String SYSTEM_BAR_PREFS = "cotidie_system_bars";
    private static final String STATUS_BAR_DARK_ICONS_KEY = "status_dark_icons";
    private static final String NAVIGATION_BAR_DARK_ICONS_KEY = "navigation_dark_icons";
    private static final long RENDER_CRASH_WINDOW_MS = 15000L;
    private static final int MAX_RENDER_RESTARTS = 2;
    private boolean isInForeground = false;
    private String pendingImportPayload = null;
    private String pendingNavigationPayload = null;
    private int pendingFlushRetries = 0;
    private int pendingNavigationFlushRetries = 0;
    private boolean useDarkStatusBarIcons = true;
    private boolean useDarkNavigationBarIcons = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundActionsPlugin.class);
        registerPlugin(CotidieNotificationSchedulerPlugin.class);
        registerPlugin(PrivateStoragePlugin.class);
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setNetworkAvailable(false);
            bridge.getWebView().getSettings().setBlockNetworkLoads(true);
        }
        SharedPreferences systemBarPrefs = getSharedPreferences(SYSTEM_BAR_PREFS, MODE_PRIVATE);
        useDarkStatusBarIcons = systemBarPrefs.getBoolean(STATUS_BAR_DARK_ICONS_KEY, true);
        useDarkNavigationBarIcons = systemBarPrefs.getBoolean(NAVIGATION_BAR_DARK_ICONS_KEY, true);
        configureSystemBars();
        keepScreenAwake();
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
        keepScreenAwake();
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

    @Override
    public void onDestroy() {
        cancelImportRead();
        pendingImportPayload = null;
        super.onDestroy();
    }

    private void configureSystemBars() {
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.getDecorView().setFitsSystemWindows(false);
        // Some devices still pad DecorView; pass insets through to WebView without shifting it.
        window.getDecorView().setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(0, 0, 0, 0);
            return insets;
        });
        window.getDecorView().setPadding(0, 0, 0, 0);
        window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        window.getDecorView().setBackgroundColor(Color.TRANSPARENT);

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setBackgroundColor(Color.TRANSPARENT);
        }

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);
            bridge.getWebView().getRootView().setBackgroundColor(Color.TRANSPARENT);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.setNavigationBarDividerColor(Color.TRANSPARENT);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }
        applySystemBarIconAppearance();
    }

    public void setSystemBarIconAppearance(boolean darkStatusIcons, boolean darkNavigationIcons) {
        useDarkStatusBarIcons = darkStatusIcons;
        useDarkNavigationBarIcons = darkNavigationIcons;
        getSharedPreferences(SYSTEM_BAR_PREFS, MODE_PRIVATE)
                .edit()
                .putBoolean(STATUS_BAR_DARK_ICONS_KEY, darkStatusIcons)
                .putBoolean(NAVIGATION_BAR_DARK_ICONS_KEY, darkNavigationIcons)
                .apply();
        runOnUiThread(this::applySystemBarIconAppearance);
    }

    private void applySystemBarIconAppearance() {
        Window window = getWindow();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(useDarkStatusBarIcons);
        controller.setAppearanceLightNavigationBars(useDarkNavigationBarIcons);
    }

    private void keepScreenAwake() {
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
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

        final Uri importUri = uri;
        clearHandledImportIntent(intent);
        if (importRequest != null) {
            Toast.makeText(this, "Espera a que termine la lectura del archivo anterior.", Toast.LENGTH_SHORT).show();
            return;
        }
        pendingImportPayload = null;
        final ImportReadRequest request = new ImportReadRequest();
        importRequest = request;
        request.timeout = () -> {
            if (importRequest != request) return;
            cancelImportRead();
            showImportReadError();
        };
        importHandler.postDelayed(request.timeout, IMPORT_TIMEOUT_MS);
        try {
            request.output = File.createTempFile("cotidie-import-", ".json", getCacheDir());
            ResultReceiver reply = new ResultReceiver(importHandler) {
                @Override protected void onReceiveResult(int code, Bundle data) {
                    if (importRequest != request || request.canceled.get() || request.received || isDestroyed()) return;
                    request.received = true;
                    if (code != ImportReaderService.SUCCESS) { cancelImportRead(); showImportReadError(); return; }
                    loadCompletedImport(request);
                }
            };
            request.connection = new ServiceConnection() {
                @Override public void onServiceConnected(ComponentName name, IBinder service) {}
                @Override public void onServiceDisconnected(ComponentName name) {
                    if (importRequest == request && !request.received) { cancelImportRead(); showImportReadError(); }
                }
            };
            Intent readIntent = new Intent(this, ImportReaderService.class).setData(importUri);
            readIntent.putExtra(ImportReaderService.EXTRA_OUTPUT, request.output.getName());
            readIntent.putExtra(ImportReaderService.EXTRA_REPLY, reply);
            request.bound = bindService(readIntent, request.connection, Context.BIND_AUTO_CREATE);
            if (!request.bound) { cancelImportRead(); showImportReadError(); }
        } catch (Exception ignored) {
            cancelImportRead();
            showImportReadError();
        }
    }

    private void loadCompletedImport(ImportReadRequest request) {
        try {
            request.future = IMPORT_READS.submit(() -> {
                String payload = null;
                try (InputStream stream = new FileInputStream(request.output)) {
                    payload = BoundedImportReader.read(stream, MAX_IMPORT_BYTES, request.canceled::get);
                } catch (Exception ignored) {
                } finally {
                    request.output.delete();
                }
                final String result = payload;
                synchronized (request) {
                    if (request.canceled.get()) return;
                    request.completion = () -> {
                        synchronized (request) { request.completion = null; }
                        if (importRequest != request || request.canceled.get() || isDestroyed()) return;
                        importHandler.removeCallbacks(request.timeout);
                        unbindImportReader(request);
                        importRequest = null;
                        if (result == null || result.trim().isEmpty()) { showImportReadError(); return; }
                        pendingImportPayload = result;
                        flushPendingImportToWebView();
                    };
                    importHandler.post(request.completion);
                }
            });
        } catch (RejectedExecutionException ignored) { cancelImportRead(); showImportReadError(); }
    }

    private void unbindImportReader(ImportReadRequest request) {
        if (!request.bound) return;
        request.bound = false;
        try { unbindService(request.connection); } catch (IllegalArgumentException ignored) {}
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


    private void cancelImportRead() {
        ImportReadRequest previous = importRequest;
        importRequest = null;
        if (previous == null) return;
        synchronized (previous) {
            previous.canceled.set(true);
            importHandler.removeCallbacks(previous.timeout);
            if (previous.completion != null) importHandler.removeCallbacks(previous.completion);
            previous.completion = null;
        }
        previous.cancel();
        unbindImportReader(previous);
        if (previous.output != null) previous.output.delete();
    }

    private void showImportReadError() {
        Toast.makeText(this, "No se pudo leer el archivo. Comprueba que sea un respaldo válido de hasta 15 MB e inténtalo de nuevo.", Toast.LENGTH_LONG).show();
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

        String js = "try{window." + PENDING_IMPORT_KEY + " = "
                + JSONObject.quote(payload)
                + ";window.dispatchEvent(new Event('cotidie-pending-import'));}catch(e){}";

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
        webView.setNetworkAvailable(false);
        webView.getSettings().setBlockNetworkLoads(true);
        webView.setRendererPriorityPolicy(
            WebView.RENDERER_PRIORITY_IMPORTANT,
            true
        );
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
            count = 1;
        } else {
            count += 1;
        }

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

        String baseUrl = "https://localhost";
        String html = "<!doctype html><html><head><meta charset='utf-8'>"
                + "<meta name='viewport' content='width=device-width, initial-scale=1'>"
                + "<title>Cotidie</title>"
                + "<style>body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;}"
                + ".card{max-width:420px;background:#111827;border:1px solid #334155;border-radius:18px;padding:24px;box-shadow:0 20px 45px rgba(0,0,0,.35);}"
                + "h1{margin:0 0 12px;font-size:22px;}p{line-height:1.5;color:#cbd5e1;}button{margin-top:16px;background:#f8fafc;color:#0f172a;border:0;border-radius:999px;padding:12px 18px;font-weight:700;width:100%;}</style>"
                + "</head><body><div class='card'><h1>Cotidie se recupero de un fallo del WebView</h1>"
                + "<p>La app detecto varios cierres seguidos al abrirse y detuvo el reinicio automatico para evitar un bucle. Puedes intentar una recarga limpia desde aqui.</p>"
                + "<button onclick=\"window.location.replace('/')\">Reintentar</button></div></body></html>";

        bridge.getWebView().loadDataWithBaseURL(baseUrl, html, "text/html", "utf-8", null);
    }
}
