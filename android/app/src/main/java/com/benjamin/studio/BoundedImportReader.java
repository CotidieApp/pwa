package com.benjamin.studio;

import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.InterruptedIOException;
import java.io.SequenceInputStream;
import java.nio.charset.StandardCharsets;
import java.util.function.BooleanSupplier;

final class BoundedImportReader {
    private BoundedImportReader() {}

    static String read(InputStream input, int maxBytes, BooleanSupplier canceled) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(Math.min(Math.max(maxBytes, 1), 8192));
        copy(input, bytes, maxBytes, canceled);
        return new String(bytes.toByteArray(), StandardCharsets.UTF_8);
    }

    static byte[] prefix(InputStream input, BooleanSupplier canceled) throws IOException {
        byte[] result = new byte[4];
        int total = 0;
        while (total < result.length) {
            if (canceled.getAsBoolean() || Thread.currentThread().isInterrupted()) throw new InterruptedIOException();
            int count = input.read(result, total, result.length - total);
            if (canceled.getAsBoolean() || Thread.currentThread().isInterrupted()) throw new InterruptedIOException();
            if (count < 0) return java.util.Arrays.copyOf(result, total);
            if (count == 0) throw new IOException("Import stream made no progress");
            total += count;
        }
        return result;
    }

    static boolean isBinaryBackup(byte[] prefix) {
        return prefix.length == 4 && prefix[0] == 'C' && prefix[1] == 'T' && prefix[2] == 'D' &&
                (prefix[3] == '2' || prefix[3] == '3');
    }

    static void copyImport(InputStream input, OutputStream output, int jsonLimit, int binaryLimit,
            BooleanSupplier canceled) throws IOException {
        byte[] prefix = prefix(input, canceled);
        int limit = isBinaryBackup(prefix) ? binaryLimit : jsonLimit;
        copy(new SequenceInputStream(new ByteArrayInputStream(prefix), input), output, limit, canceled);
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
