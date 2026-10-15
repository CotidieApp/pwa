package com.benjamin.studio;

import android.app.Service;
import android.content.Intent;
import android.content.res.AssetFileDescriptor;
import android.net.Uri;
import android.os.Binder;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.Process;
import android.os.ParcelFileDescriptor;
import android.os.ResultReceiver;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;

/** The manifest places this nonexported service in a disposable private process. */
public class ImportReaderService extends Service {
    static final String EXTRA_OUTPUT = "cotidie_import_output";
    static final String EXTRA_REPLY = "cotidie_import_reply";
    static final int SUCCESS = 1;
    static final int FAILURE = 0;
    static final int MAX_BYTES = 15 * 1024 * 1024;
    static final long TIMEOUT_MS = 15000L;
    private final Handler deadline = new Handler(Looper.getMainLooper());
    private File activeOutput;

    @Override public IBinder onBind(Intent intent) {
        Uri uri = intent == null ? null : intent.getData();
        String name = intent == null ? null : intent.getStringExtra(EXTRA_OUTPUT);
        ResultReceiver reply = intent == null ? null : intent.getParcelableExtra(EXTRA_REPLY);
        if (uri == null || reply == null || name == null || !name.matches("cotidie-import-[a-zA-Z0-9-]+\\.json")) {
            Process.killProcess(Process.myPid());
            return null;
        }
        File output = new File(getCacheDir(), name);
        activeOutput = output;
        deadline.postDelayed(() -> {
            reply.send(FAILURE, null);
            // No provider-controlled close/cancellation call can delay this process deadline.
            Process.killProcess(Process.myPid());
        }, TIMEOUT_MS);
        new Thread(() -> {
            int status = FAILURE;
            // The Activity creates this file. Never recreate a path removed during cancellation.
            try (ParcelFileDescriptor targetDescriptor = ParcelFileDescriptor.open(output,
                    ParcelFileDescriptor.MODE_WRITE_ONLY | ParcelFileDescriptor.MODE_TRUNCATE);
                 OutputStream target = new ParcelFileDescriptor.AutoCloseOutputStream(targetDescriptor);
                 AssetFileDescriptor descriptor = getContentResolver().openAssetFileDescriptor(uri, "r", new CancellationSignal())) {
                if (descriptor != null) {
                    try (InputStream input = descriptor.createInputStream()) {
                        BoundedImportReader.copy(input, target, MAX_BYTES, () -> false);
                    }
                    status = SUCCESS;
                }
            } catch (Exception ignored) {
                // Only a completed, bounded file can be handed back to the application process.
            }
            final int result = status;
            deadline.post(() -> {
                deadline.removeCallbacksAndMessages(null);
                reply.send(result, null);
            });
        }, "cotidie-provider-import").start();
        return new Binder();
    }

    @Override public boolean onUnbind(Intent intent) {
        try { if (activeOutput != null) activeOutput.delete(); }
        finally { Process.killProcess(Process.myPid()); }
        return false;
    }
}
