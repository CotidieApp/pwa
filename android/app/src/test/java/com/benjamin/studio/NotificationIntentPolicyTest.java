package com.benjamin.studio;

import static org.junit.Assert.*;
import com.capacitorjs.plugins.localnotifications.CotidieNotificationIntentPolicy;
import org.junit.Test;

public class NotificationIntentPolicyTest {
    static class Store implements CotidieNotificationIntentPolicy.TokenStore {
        String value;
        public String read() { return value; }
        public boolean write(String next) { value = next; return true; }
    }
    @Test public void externalIntentCannotCreateAuthority() {
        Store store = new Store();
        assertFalse(CotidieNotificationIntentPolicy.verify(store, null, 123, "mark_prayed", "{}", true));
        assertFalse(CotidieNotificationIntentPolicy.verify(store, "0".repeat(64), 123, "mark_prayed", "{}", true));
        assertNull(store.value);
    }
    @Test public void authenticOpenSurvivesRestartButEveryChangedFieldIsRejected() {
        Store store = new Store();
        String payload = "{\"extra\":{\"target\":{\"id\":\"santa-misa\"}}}";
        String signature = CotidieNotificationIntentPolicy.sign(store, 123, "tap", payload, true);
        Store reopened = new Store(); reopened.value = store.value;
        assertTrue(CotidieNotificationIntentPolicy.verify(reopened, signature, 123, "tap", payload, true));
        assertFalse(CotidieNotificationIntentPolicy.verify(reopened, signature, 124, "tap", payload, true));
        assertFalse(CotidieNotificationIntentPolicy.verify(reopened, signature, 123, "mark_prayed", payload, true));
        assertFalse(CotidieNotificationIntentPolicy.verify(reopened, signature, 123, "tap", payload + " ", true));
        assertFalse(CotidieNotificationIntentPolicy.verify(reopened, signature, 123, "tap", payload, false));
        assertFalse(CotidieNotificationIntentPolicy.verify(new Store(), signature, 123, "tap", payload, true));
    }
    @Test public void ambiguousFieldBoundariesAndUnsavedSecretsCannotAuthorize() {
        Store store = new Store();
        String signature = CotidieNotificationIntentPolicy.sign(store, 1, "a\0b", "c", true);
        assertFalse(CotidieNotificationIntentPolicy.verify(store, signature, 1, "a", "b\0c", true));
        Store failing = new Store() { public boolean write(String value) { return false; } };
        assertThrows(IllegalStateException.class, () -> CotidieNotificationIntentPolicy.sign(failing, 1, "tap", "{}", true));
    }
}
