package com.benjamin.studio.widgets;

import android.graphics.Color;

import java.util.Calendar;

final class LiturgicalColorRules {
    private static final int RED = Color.parseColor("#8B0000");
    private static final int WHITE = Color.parseColor("#F8F9FA");
    private static final int PURPLE = Color.parseColor("#5A2A69");
    private static final int GREEN = Color.parseColor("#225722");

    private LiturgicalColorRules() {
    }

    private static Integer getSpecialDateLiturgicalColor(Calendar current, Calendar easter, boolean movableObserved) {
        Calendar day = startOfDay(current);
        int year = day.get(Calendar.YEAR);
        Calendar holyFamily = getHolyFamilyDate(year);
        Calendar baptism = getBaptismOfTheLordDate(year);
        Calendar saintJoseph = getObservedSaintJosephDate(year, easter);
        Calendar annunciation = getObservedAnnunciationDate(year, easter);
        boolean immaculateConception = day.get(Calendar.MONTH) == Calendar.DECEMBER
                && day.get(Calendar.DAY_OF_MONTH) == 8;

        if (isSameDay(day, saintJoseph) || isSameDay(day, annunciation)
                || isSameDay(day, getObservedNativityOfJohnDate(year, easter)) || immaculateConception) {
            return WHITE;
        }

        if (isSameDay(day, holyFamily) || isSameDay(day, baptism) || isSameDay(day, getEpiphanyDate(year))) return WHITE;
        if (isSameDay(day, getObservedPeterAndPaulDate(year, easter))) return RED;
        if (isSameDay(day, addDays(easter, -46))) return PURPLE;
        if (isSameDay(day, addDays(easter, -7))) return RED;
        if (isWithinInclusive(day, addDays(easter, -6), addDays(easter, -4))) return PURPLE;
        if (isSameDay(day, addDays(easter, -3))) return WHITE;
        if (isSameDay(day, addDays(easter, -2))) return RED;
        if (isSameDay(day, addDays(easter, -1))) return WHITE;
        if (isWithinInclusive(day, easter, addDays(easter, 7))) return WHITE;

        if (isSameDay(day, addDays(easter, 42))) return WHITE;
        if (isSameDay(day, addDays(easter, 49))) return RED;
        if (isSameDay(day, addDays(easter, 56))) return WHITE;
        if (isSameDay(day, addDays(easter, 63))) return WHITE;
        if (isSameDay(day, addDays(easter, 68))) return WHITE;
        if (movableObserved && (isSameDay(day, addDays(easter, 69))
                || isSameDay(day, addDays(easter, 50)))) return WHITE;
        if (isSameDay(day, addDays(easter, 53))) return WHITE;

        Calendar christTheKing = addDays(getAdventStart(year), -7);
        if (isSameDay(day, christTheKing)) return WHITE;

        Calendar adventStart = getAdventStart(year);
        Calendar advent4 = addDays(adventStart, 21);
        if (isSunday(day) && isWithinInclusive(day, adventStart, advent4)) return PURPLE;
        if (isSunday(day) && isChristmasSeason(day)) return WHITE;
        if (isSunday(day) && isLentSeason(day, easter)) return PURPLE;
        if (isSunday(day) && isEasterSeason(day, easter)) return WHITE;

        return null;
    }

    static int getGeneralLiturgicalColor(Calendar current, Calendar easter, int fixedRank,
                                        Integer fixedColor, boolean movableObserved,
                                        boolean competingMemorials, Integer saintColor) {
        Calendar day = startOfDay(current);
        Integer specialColor = getSpecialDateLiturgicalColor(day, easter, movableObserved && !competingMemorials);
        if (specialColor != null) return specialColor;

        boolean restrictedMemorial = isLentSeason(day, easter) || isPrivilegedAdventWeekday(day)
                || (day.get(Calendar.MONTH) == Calendar.DECEMBER && day.get(Calendar.DAY_OF_MONTH) >= 26);
        boolean suppressedFixed = fixedRank == 3 && (restrictedMemorial || competingMemorials);
        if (fixedColor != null && !suppressedFixed && (!isSunday(day) || fixedRank >= 5)
                && !isSpecialFixedDateObservedElsewhere(day, easter)) return fixedColor;
        if (saintColor != null && !isSunday(day) && !restrictedMemorial) return saintColor;
        return getSeasonDefaultColor(day, easter);
    }

    private static boolean isSpecialFixedDateObservedElsewhere(Calendar date, Calendar easter) {
        int year = date.get(Calendar.YEAR);
        int month = date.get(Calendar.MONTH) + 1;
        int day = date.get(Calendar.DAY_OF_MONTH);
        if (month == 3 && day == 19 && !isSameDay(date, getObservedSaintJosephDate(year, easter))) return true;
        if (month == 3 && day == 25 && !isSameDay(date, getObservedAnnunciationDate(year, easter))) return true;
        if (month == 6 && day == 24 && !isSameDay(date, getObservedNativityOfJohnDate(year, easter))) return true;
        if (month == 6 && day == 29 && !isSameDay(date, getObservedPeterAndPaulDate(year, easter))) return true;
        return false;
    }

    static Calendar getObservedSaintJosephDate(int year, Calendar easter) {
        Calendar original = Calendar.getInstance();
        original.set(year, Calendar.MARCH, 19, 0, 0, 0);
        original.set(Calendar.MILLISECOND, 0);

        Calendar palmSunday = addDays(easter, -7);
        Calendar holySaturday = addDays(easter, -1);
        if (isWithinInclusive(original, palmSunday, holySaturday)) {
            return addDays(palmSunday, -1);
        }
        if (isSunday(original) && isLentSeason(original, easter)) {
            return addDays(original, 1);
        }
        return startOfDay(original);
    }

    static Calendar getObservedAnnunciationDate(int year, Calendar easter) {
        Calendar original = Calendar.getInstance();
        original.set(year, Calendar.MARCH, 25, 0, 0, 0);
        original.set(Calendar.MILLISECOND, 0);

        if (isWithinInclusive(original, addDays(easter, -7), addDays(easter, 7))) {
            return addDays(easter, 8);
        }
        if (isSunday(original) && isLentSeason(original, easter)) {
            return addDays(original, 1);
        }
        return startOfDay(original);
    }

    static Calendar getHolyFamilyDate(int year) {
        for (int day = 26; day <= 31; day++) {
            Calendar candidate = Calendar.getInstance();
            candidate.set(year, Calendar.DECEMBER, day, 0, 0, 0);
            candidate.set(Calendar.MILLISECOND, 0);
            if (candidate.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY) {
                return candidate;
            }
        }
        Calendar fallback = Calendar.getInstance();
        fallback.set(year, Calendar.DECEMBER, 30, 0, 0, 0);
        fallback.set(Calendar.MILLISECOND, 0);
        return fallback;
    }

    static Calendar getObservedNativityOfJohnDate(int year, Calendar easter) {
        Calendar date = Calendar.getInstance();
        date.set(year, Calendar.JUNE, 24, 0, 0, 0);
        date.set(Calendar.MILLISECOND, 0);
        if (isSameDay(date, addDays(easter, 68))) return addDays(date, -1);
        return isSameDay(date, addDays(easter, 63)) ? addDays(date, 1) : date;
    }

    static Calendar getObservedPeterAndPaulDate(int year, Calendar easter) {
        Calendar date = Calendar.getInstance();
        date.set(year, Calendar.JUNE, 29, 0, 0, 0);
        date.set(Calendar.MILLISECOND, 0);
        return isSameDay(date, addDays(easter, 68)) ? addDays(date, 1) : date;
    }

    static Calendar getEpiphanyDate(int year) {
        Calendar candidate = Calendar.getInstance();
        candidate.set(year, Calendar.JANUARY, 2, 0, 0, 0);
        candidate.set(Calendar.MILLISECOND, 0);
        while (candidate.get(Calendar.DAY_OF_WEEK) != Calendar.SUNDAY) {
            candidate.add(Calendar.DAY_OF_MONTH, 1);
        }
        return candidate;
    }

    static Calendar getBaptismOfTheLordDate(int year) {
        Calendar epiphany = getEpiphanyDate(year);
        return addDays(epiphany, epiphany.get(Calendar.DAY_OF_MONTH) > 6 ? 1 : 7);
    }

    private static int getSeasonDefaultColor(Calendar current, Calendar easter) {
        if (isChristmasSeason(current) || isEasterSeason(current, easter)) return WHITE;
        if (isAdventSeason(current) || isLentSeason(current, easter)) return PURPLE;
        return GREEN;
    }

    private static boolean isChristmasSeason(Calendar current) {
        Calendar day = startOfDay(current);
        int year = day.get(Calendar.YEAR);
        if (day.get(Calendar.MONTH) == Calendar.DECEMBER && day.get(Calendar.DAY_OF_MONTH) >= 25) {
            return true;
        }
        if (day.get(Calendar.MONTH) != Calendar.JANUARY) return false;
        Calendar start = Calendar.getInstance();
        start.set(year, Calendar.JANUARY, 1, 0, 0, 0);
        start.set(Calendar.MILLISECOND, 0);
        Calendar end = getBaptismOfTheLordDate(year);
        return isWithinInclusive(day, start, end);
    }

    private static boolean isEasterSeason(Calendar current, Calendar easter) {
        return isWithinInclusive(current, easter, addDays(easter, 49));
    }

    private static boolean isAdventSeason(Calendar current) {
        Calendar day = startOfDay(current);
        int year = day.get(Calendar.YEAR);
        Calendar start = getAdventStart(year);
        Calendar end = Calendar.getInstance();
        end.set(year, Calendar.DECEMBER, 24, 0, 0, 0);
        end.set(Calendar.MILLISECOND, 0);
        return isWithinInclusive(day, start, end);
    }

    static Calendar getAdventStart(int year) {
        Calendar start = Calendar.getInstance();
        start.set(year, Calendar.NOVEMBER, 27, 0, 0, 0);
        start.set(Calendar.MILLISECOND, 0);
        while (start.get(Calendar.DAY_OF_WEEK) != Calendar.SUNDAY) {
            start.add(Calendar.DAY_OF_MONTH, 1);
        }
        return start;
    }

    private static boolean isPrivilegedAdventWeekday(Calendar current) {
        if (!isAdventSeason(current) || isSunday(current)) return false;
        int year = current.get(Calendar.YEAR);
        Calendar start = Calendar.getInstance();
        start.set(year, Calendar.DECEMBER, 17, 0, 0, 0);
        start.set(Calendar.MILLISECOND, 0);
        Calendar end = Calendar.getInstance();
        end.set(year, Calendar.DECEMBER, 24, 0, 0, 0);
        end.set(Calendar.MILLISECOND, 0);
        return isWithinInclusive(current, start, end);
    }

    private static boolean isLentSeason(Calendar current, Calendar easter) {
        return isWithinInclusive(current, addDays(easter, -46), addDays(easter, -1));
    }

    private static boolean isSunday(Calendar current) {
        return startOfDay(current).get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY;
    }

    private static Calendar startOfDay(Calendar source) {
        Calendar c = (Calendar) source.clone();
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c;
    }

    private static Calendar addDays(Calendar date, int days) {
        Calendar cal = (Calendar) date.clone();
        cal.add(Calendar.DAY_OF_YEAR, days);
        return startOfDay(cal);
    }

    private static boolean isSameDay(Calendar a, Calendar b) {
        return startOfDay(a).getTimeInMillis() == startOfDay(b).getTimeInMillis();
    }

    private static boolean isWithinInclusive(Calendar current, Calendar start, Calendar end) {
        long day = startOfDay(current).getTimeInMillis();
        return day >= startOfDay(start).getTimeInMillis() && day <= startOfDay(end).getTimeInMillis();
    }

}
