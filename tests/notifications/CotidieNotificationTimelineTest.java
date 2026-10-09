package com.benjamin.studio;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

/** Runs the production timeline on the JVM; no Android stub or duplicated algorithm. */
public class CotidieNotificationTimelineTest {
    private static int assertions = 0;
    private static void expect(boolean condition, String message) {
        assertions++;
        if (!condition) throw new AssertionError(message);
    }
    private static long at(int year, int month, int day, int hour, int minute) {
        Calendar calendar = Calendar.getInstance();
        calendar.clear(); calendar.set(year, month - 1, day, hour, minute);
        return calendar.getTimeInMillis();
    }
    private static CotidieNotificationTimeline.Rule daily(String id, int hour, int minute) {
        return new CotidieNotificationTimeline.Rule(id, hour, minute, false, Collections.emptySet());
    }
    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("America/Santiago"));
        List<CotidieNotificationTimeline.Rule> dev = new ArrayList<>();
        Map<String, Long> planned = new HashMap<>();
        long enabledAt = at(2026, 10, 8, 8, 1);
        for (int minute = 0; minute < 60; minute += 5) {
            CotidieNotificationTimeline.Rule rule = new CotidieNotificationTimeline.Rule("dev:" + minute, -1, minute, true, Collections.emptySet());
            dev.add(rule); planned.put(rule.id, CotidieNotificationTimeline.nextAfter(rule, enabledAt));
        }
        // The reported 10-notification burst: device wakes at :52 after an hour without dispatch.
        long wake = at(2026, 10, 8, 9, 52);
        CotidieNotificationTimeline.Decision delayed = CotidieNotificationTimeline.dispatch(dev, planned, wake);
        expect(delayed.due.size() == 1, "Only one test after prolonged sleep");
        expect(delayed.due.values().iterator().next().at == at(2026, 10, 8, 9, 50), "Latest five-minute occurrence");
        expect(Collections.min(delayed.next.values()) == at(2026, 10, 8, 9, 55), "Next test keeps its five-minute slot");
        expect(CotidieNotificationTimeline.dispatch(dev, delayed.next, wake).due.isEmpty(), "Repeated/queued broadcast cannot duplicate");

        // New or newly enabled rules never imply that previous minutes were scheduled.
        expect(CotidieNotificationTimeline.dispatch(dev, Collections.emptyMap(), wake).due.isEmpty(), "No initial catch-up storm");
        CotidieNotificationTimeline.Rule prayer = daily("daily:prayer", 9, 0);
        List<CotidieNotificationTimeline.Rule> all = new ArrayList<>(dev); all.add(prayer);
        planned.put(prayer.id, at(2026, 10, 8, 9, 0));
        CotidieNotificationTimeline.Decision mixed = CotidieNotificationTimeline.dispatch(all, planned, wake);
        expect(mixed.due.size() == 2 && mixed.due.containsKey(prayer.id), "Coalescing tests must not swallow normal reminders");
        expect(mixed.due.get(prayer.id).at == at(2026, 10, 8, 9, 0), "A registered normal occurrence survives delayed delivery");
        expect(mixed.next.get(prayer.id) == at(2026, 10, 9, 9, 0), "Normal rule advances exactly once");
        expect(CotidieNotificationTimeline.dispatch(all, mixed.next, wake).due.isEmpty(), "Normal and dev ledgers survive foreground/duplicate callbacks");
        expect(CotidieNotificationTimeline.nextAfter(prayer, at(2026, 10, 8, 10, 0)) == at(2026, 10, 9, 9, 0), "Adding a past hour schedules tomorrow");

        CotidieNotificationTimeline.Rule skipped = new CotidieNotificationTimeline.Rule(prayer.id, 9, 0, false,
            Collections.singleton("2026-10-08"));
        expect(CotidieNotificationTimeline.nextAfter(skipped, enabledAt) == at(2026, 10, 9, 9, 0), "Checked date is not armed");
        expect(CotidieNotificationTimeline.dispatch(Arrays.asList(skipped), Collections.singletonMap(skipped.id, at(2026, 10, 8, 9, 0)), wake).due.isEmpty(), "A newly checked due reminder is not delivered");

        // Hundreds of regular punctual callbacks through midnight keep ONE test each.
        Map<String, Long> ledger = new HashMap<>(planned); ledger.remove(prayer.id);
        long tick = at(2026, 10, 8, 8, 5);
        for (int i = 0; i < 400; i++, tick += 5 * 60000L) {
            CotidieNotificationTimeline.Decision result = CotidieNotificationTimeline.dispatch(dev, ledger, tick);
            expect(result.due.size() == 1, "One punctual test per interval " + i);
            expect(result.due.values().iterator().next().at == tick, "Correct registered timestamp " + i);
            expect(CotidieNotificationTimeline.dispatch(dev, result.next, tick).due.isEmpty(), "Duplicate broadcast " + i);
            ledger = result.next;
        }

        // Civil daily time follows local daylight-saving transitions, not 24-hour arithmetic.
        expect(CotidieNotificationTimeline.nextAfter(prayer, at(2026, 9, 5, 10, 0)) == at(2026, 9, 6, 9, 0), "Santiago spring DST daily slot");
        expect(CotidieNotificationTimeline.nextAfter(prayer, at(2026, 4, 4, 10, 0)) == at(2026, 4, 5, 9, 0), "Santiago fall DST daily slot");
        expect(CotidieNotificationTimeline.preserveDated(wake - 60000, wake, true, false), "Dated occurrence survives a foreground calendar replacement");
        expect(!CotidieNotificationTimeline.preserveDated(wake - 60000, wake, false, false), "Disabled dated source must not be restored");
        expect(!CotidieNotificationTimeline.preserveDated(wake - 60000, wake, true, true), "Dated IDs cannot duplicate during merging");
        expect(!CotidieNotificationTimeline.datedDue(wake - 86400001L, wake), "Old dated events expire instead of replaying years");
        expect(!CotidieNotificationTimeline.datedDue(wake + 1000, wake), "Future dated event is never delivered early");
        System.out.println("Notification timeline: " + assertions + " assertions passed (burst, five-minute cadence, daily, skips, duplicates, midnight, DST).");
    }
}
