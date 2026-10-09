package com.benjamin.studio;

import java.util.Calendar;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Scheduling decisions without Android dependencies, shared by the receiver and JVM regressions. */
final class CotidieNotificationTimeline {
    static boolean datedDue(long at, long now) { return at > 0 && at <= now && now - at <= 86400000L; }
    static boolean preserveDated(long at, long now, boolean sourceActive, boolean duplicate) {
        return datedDue(at, now) && sourceActive && !duplicate;
    }
    static final class Rule {
        final String id;
        final int hour; // -1: every hour, at minute
        final int minute;
        final boolean devTest;
        final Set<String> skippedDates;
        Rule(String id, int hour, int minute, boolean devTest, Set<String> skippedDates) {
            this.id = id;
            this.hour = hour;
            this.minute = minute;
            this.devTest = devTest;
            this.skippedDates = skippedDates == null ? Collections.emptySet() : skippedDates;
        }
    }
    static final class Delivery {
        final Rule rule;
        final long at;
        Delivery(Rule rule, long at) { this.rule = rule; this.at = at; }
    }
    static final class Decision {
        final Map<String, Long> next = new LinkedHashMap<>();
        final Map<String, Delivery> due = new LinkedHashMap<>();
    }

    static String dateKey(long at) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(at);
        return String.format(Locale.US, "%04d-%02d-%02d", calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH) + 1, calendar.get(Calendar.DAY_OF_MONTH));
    }
    private static Calendar slot(Rule rule, long at) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(at);
        if (rule.hour >= 0) calendar.set(Calendar.HOUR_OF_DAY, rule.hour);
        calendar.set(Calendar.MINUTE, rule.minute);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar;
    }
    static long nextAfter(Rule rule, long now) {
        Calendar calendar = slot(rule, now);
        if (calendar.getTimeInMillis() <= now)
            calendar.add(rule.hour < 0 ? Calendar.HOUR_OF_DAY : Calendar.DAY_OF_YEAR, 1);
        // skip dates can include simulated future checks; never arm an excluded day.
        while (rule.skippedDates.contains(dateKey(calendar.getTimeInMillis())))
            calendar.add(Calendar.DAY_OF_YEAR, 1);
        return calendar.getTimeInMillis();
    }
    static long latestAt(Rule rule, long now) {
        Calendar calendar = slot(rule, now);
        if (calendar.getTimeInMillis() > now)
            calendar.add(rule.hour < 0 ? Calendar.HOUR_OF_DAY : Calendar.DAY_OF_YEAR, -1);
        return calendar.getTimeInMillis();
    }

    static Decision dispatch(List<Rule> rules, Map<String, Long> planned, long now) {
        Decision result = new Decision();
        Delivery latestTest = null;
        for (Rule rule : rules) {
            long at = planned.getOrDefault(rule.id, nextAfter(rule, now));
            if (at > now) { result.next.put(rule.id, at); continue; }
            long occurrence = Math.max(at, latestAt(rule, now));
            result.next.put(rule.id, nextAfter(rule, now));
            if (rule.skippedDates.contains(dateKey(occurrence))) continue;
            Delivery delivery = new Delivery(rule, occurrence);
            if (!rule.devTest) result.due.put(rule.id, delivery);
            else if (latestTest == null || occurrence > latestTest.at) latestTest = delivery;
        }
        // An overdue test interval is diagnostic, not a backlog of notifications.
        if (latestTest != null) result.due.put(latestTest.rule.id, latestTest);
        return result;
    }
}
