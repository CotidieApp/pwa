package com.benjamin.studio;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.InterruptedIOException;
import java.nio.charset.StandardCharsets;
import java.util.function.BooleanSupplier;

final class BoundedImportReader {
    private BoundedImportReader() {}

    static String read(InputStream input, int maxBytes, BooleanSupplier canceled) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(Math.min(Math.max(maxBytes, 1), 8192));
        copy(input, bytes, maxBytes, canceled);
        return new String(bytes.toByteArray(), StandardCharsets.UTF_8);
    }

    static void copy(InputStream input, OutputStream output, int maxBytes, BooleanSupplier canceled) throws IOException {
        if (maxBytes < 1) throw new IllegalArgumentException("Invalid import limit");
        byte[] chunk = new byte[8192];
        int total = 0;
        while (true) {
            if (canceled.getAsBoolean() || Thread.currentThread().isInterrupted()) throw new InterruptedIOException();
            int count = input.read(chunk, 0, (int) Math.min(chunk.length, (long) maxBytes - total + 1));
            if (canceled.getAsBoolean() || Thread.currentThread().isInterrupted()) throw new InterruptedIOException();
            if (count < 0) return;
            if (count == 0) throw new IOException("Import stream made no progress");
            if (count > maxBytes - total) throw new IOException("Import exceeds byte limit");
            output.write(chunk, 0, count);
            total += count;
        }
    }
}
