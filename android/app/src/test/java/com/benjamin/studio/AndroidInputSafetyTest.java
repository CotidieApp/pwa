package com.benjamin.studio;

import static org.junit.Assert.*;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.Test;

public class AndroidInputSafetyTest {
    @Test public void preservesExactUtf8ContentAndLimit() throws Exception {
        String content = "\uFEFF{\"texto\":\"oración\"}\r\n";
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        assertEquals(content, BoundedImportReader.read(new ByteArrayInputStream(bytes), bytes.length, () -> false));
        assertEquals("", BoundedImportReader.read(new ByteArrayInputStream(new byte[0]), 1, () -> false));
    }

    @Test public void oversizedUnbrokenLineStopsAtLimitPlusOne() throws Exception {
        int limit = 15 * 1024 * 1024;
        final int[] consumed = {0};
        InputStream endlessLine = new InputStream() {
            @Override public int read() { consumed[0]++; return 'a'; }
            @Override public int read(byte[] buffer, int offset, int length) {
                java.util.Arrays.fill(buffer, offset, offset + length, (byte) 'a');
                consumed[0] += length;
                return length;
            }
        };
        assertThrows(IOException.class, () -> BoundedImportReader.read(endlessLine, limit, () -> false));
        assertEquals(limit + 1, consumed[0]);
    }

    @Test public void limitCountsBytesRatherThanCharacters() {
        byte[] bytes = "ááá".getBytes(StandardCharsets.UTF_8);
        assertThrows(IOException.class, () -> BoundedImportReader.read(new ByteArrayInputStream(bytes), 3, () -> false));
    }

    @Test public void shortReadsRemainValid() throws Exception {
        byte[] bytes = "{\"theme\":\"dark\"}".getBytes(StandardCharsets.UTF_8);
        InputStream shortReads = new ByteArrayInputStream(bytes) {
            @Override public synchronized int read(byte[] buffer, int offset, int length) {
                return super.read(buffer, offset, Math.min(3, length));
            }
        };
        assertEquals(new String(bytes, StandardCharsets.UTF_8), BoundedImportReader.read(shortReads, bytes.length, () -> false));
    }

    @Test public void streamingCopyNeverWritesBytesBeyondLimit() {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        assertThrows(IOException.class, () -> BoundedImportReader.copy(
                new ByteArrayInputStream(new byte[]{1, 2, 3, 4}), output, 3, () -> false));
        assertTrue(output.size() <= 3);
        ByteArrayOutputStream valid = new ByteArrayOutputStream();
        try { BoundedImportReader.copy(new ByteArrayInputStream(new byte[]{1, 2, 3}), valid, 3, () -> false); }
        catch (IOException error) { fail(error.toString()); }
        assertArrayEquals(new byte[]{1, 2, 3}, valid.toByteArray());
    }

    @Test public void cancellationBeforeAndDuringReadNeverReturnsPartialPayload() {
        assertThrows(InterruptedIOException.class, () -> BoundedImportReader.read(
                new ByteArrayInputStream(new byte[]{1}), 8, () -> true));
        AtomicBoolean canceled = new AtomicBoolean();
        InputStream cancelDuringRead = new ByteArrayInputStream(new byte[]{1, 2}) {
            @Override public synchronized int read(byte[] buffer, int offset, int length) {
                int result = super.read(buffer, offset, length);
                canceled.set(true);
                return result;
            }
        };
        assertThrows(InterruptedIOException.class, () -> BoundedImportReader.read(cancelDuringRead, 8, canceled::get));
    }

    @Test public void ioFailureAndNonProgressAreRejected() {
        InputStream broken = new InputStream() {
            @Override public int read() throws IOException { throw new IOException("fixture failure"); }
        };
        assertThrows(IOException.class, () -> BoundedImportReader.read(broken, 8, () -> false));
        InputStream stuck = new ByteArrayInputStream(new byte[]{1}) {
            @Override public synchronized int read(byte[] buffer, int offset, int length) { return 0; }
        };
        assertThrows(IOException.class, () -> BoundedImportReader.read(stuck, 8, () -> false));
    }

    @Test public void receiversAcceptOnlyTheirDeclaredSystemActions() {
        for (String action : new String[]{"android.intent.action.BOOT_COMPLETED", "android.intent.action.MY_PACKAGE_REPLACED",
                "android.intent.action.TIME_SET", "android.intent.action.TIMEZONE_CHANGED"}) {
            assertTrue(SystemBroadcastPolicy.widgetUpdate(action));
            assertTrue(SystemBroadcastPolicy.notificationUpdate(action));
        }
        assertTrue(SystemBroadcastPolicy.widgetUpdate("android.intent.action.DATE_CHANGED"));
        assertFalse(SystemBroadcastPolicy.notificationUpdate("android.intent.action.DATE_CHANGED"));
        for (String action : new String[]{null, "", "attacker.action.UPDATE", "android.intent.action.PACKAGE_REPLACED",
                "android.intent.action.BOOT_COMPLETED "}) {
            assertFalse(SystemBroadcastPolicy.widgetUpdate(action));
            assertFalse(SystemBroadcastPolicy.notificationUpdate(action));
        }
    }
}
