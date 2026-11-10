package com.benjamin.studio;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.IOException;
import java.util.UUID;

/** A one-file capability for a completed native import; callers never supply a path. */
@CapacitorPlugin(name = "BackupImport")
public class BackupImportPlugin extends Plugin {
    private static String pendingToken;
    private static File pendingFile;

    private static File directory(Context context) { return new File(context.getCacheDir(), "cotidie-backup-import"); }

    static synchronized boolean clearPending(Context context) {
        pendingToken = null;
        pendingFile = null;
        File[] stale = directory(context).listFiles();
        boolean removed = true;
        if (stale != null) for (File file : stale) {
            if (file.isFile() && file.getName().matches("[a-f0-9-]{36}\\.ctd") && !file.delete() && file.exists()) removed = false;
        }
        return removed;
    }

    static synchronized String stage(Context context, File source) throws IOException {
        if (!clearPending(context)) throw new IOException("Cannot clear previous staged backup");
        File directory = directory(context);
        if (!directory.isDirectory() && !directory.mkdir()) throw new IOException("Private import cache unavailable");
        if (!source.isFile() || source.length() < 4 || source.length() > ImportReaderService.MAX_BYTES)
            throw new IOException("Invalid staged backup");
        String token = UUID.randomUUID().toString();
        File target = new File(directory, token + ".ctd");
        if (!source.renameTo(target)) throw new IOException("Cannot stage completed backup");
        pendingToken = token;
        pendingFile = target;
        return token;
    }

    static synchronized void discard(Context context, String token) {
        if (token != null && token.equals(pendingToken)) clearPending(context);
    }

    private static boolean matches(String token) {
        return token != null && token.equals(pendingToken) && pendingFile != null;
    }

    @PluginMethod public void resolve(PluginCall call) {
        synchronized (BackupImportPlugin.class) {
            String token = call.getString("token");
            try {
                if (!matches(token) || !pendingFile.isFile() || pendingFile.length() > ImportReaderService.MAX_BYTES ||
                        !pendingFile.getCanonicalFile().getParentFile().equals(directory(getContext()).getCanonicalFile()))
                    throw new IOException("Import capability unavailable");
                JSObject result = new JSObject();
                result.put("path", pendingFile.getCanonicalPath());
                result.put("name", "respaldo.ctd");
                result.put("size", pendingFile.length());
                call.resolve(result);
            } catch (Exception error) {
                discard(getContext(), token);
                call.reject("El respaldo pendiente ya no está disponible. Vuelve a abrir el archivo.");
            }
        }
    }

    @PluginMethod public void clear(PluginCall call) {
        synchronized (BackupImportPlugin.class) {
            String token = call.getString("token");
            if (!matches(token)) { call.reject("Referencia de respaldo no válida."); return; }
            if (!clearPending(getContext())) { call.reject("No se pudo retirar el respaldo temporal."); return; }
            call.resolve();
        }
    }
}
