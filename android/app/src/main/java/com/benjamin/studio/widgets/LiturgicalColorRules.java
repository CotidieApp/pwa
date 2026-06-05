package com.benjamin.studio.widgets;

import android.graphics.Color;

import java.text.Normalizer;
import java.util.Calendar;
import java.util.Locale;

final class LiturgicalColorRules {
    private static final int RED = Color.parseColor("#8B0000");
    private static final int WHITE = Color.parseColor("#F8F9FA");
    private static final int PURPLE = Color.parseColor("#5A2A69");
    private static final int GREEN = Color.parseColor("#225722");

    private LiturgicalColorRules() {
    }

    static Integer getSpecialDateLiturgicalColor(Calendar current, Calendar easter) {
        Calendar day = startOfDay(current);
        int year = day.get(Calendar.YEAR);
        Calendar holyFamily = getHolyFamilyDate(year);
        Calendar baptism = getBaptismOfTheLordDate(year);
        Calendar saintJoseph = getObservedSaintJosephDate(year, easter);
        Calendar annunciation = getObservedAnnunciationDate(year, easter);
        Calendar immaculateConception = getObservedImmaculateConceptionDate(year);

        if (isSameDay(day, saintJoseph) || isSameDay(day, annunciation) || isSameDay(day, immaculateConception)) {
            return WHITE;
        }

        if (!isSpecialFixedDateObservedElsewhere(day, easter)) {
            Integer fixedColor = getFixedSpecialDateColor(day);
            if (fixedColor != null) {
                return fixedColor;
            }
        }

        if (isSameDay(day, holyFamily) || isSameDay(day, baptism)) return WHITE;
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
        if (isSameDay(day, addDays(easter, 69))) return WHITE;
        if (isSameDay(day, addDays(easter, 50))) return WHITE;

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

    static int getGeneralLiturgicalColor(String title, String type, String name, Calendar current, Calendar easter) {
        Calendar day = startOfDay(current);
        Integer specialColor = getSpecialDateLiturgicalColor(day, easter);
        if (specialColor != null) {
            return specialColor;
        }

        Integer saintColor = getSaintCelebrationColor(title, type, name, day, easter);
        if (saintColor != null) {
            return saintColor;
        }

        return getSeasonDefaultColor(day, easter);
    }

    private static Integer getSaintCelebrationColor(
            String rawTitle,
            String rawType,
            String rawName,
            Calendar current,
            Calendar easter
    ) {
        String title = normalizeLiturgicalText(rawTitle);
        String type = normalizeLiturgicalText(rawType);
        String name = normalizeLiturgicalText(rawName);
        int rank = parseCelebrationRank(title);

        if (rank == 0 || rank == 3) return null;

        boolean suppressInPenitentialSeason =
                (rank == 2 || rank == 4)
                        && (isLentSeason(current, easter) || isPrivilegedAdventWeekday(current))
                        && !keepsOwnColorInPenitentialSeason(title, name);
        if (suppressInPenitentialSeason) {
            return getSeasonDefaultColor(current, easter);
        }

        if (name.contains("conmemoracion de los fieles difuntos") || name.contains("fieles difuntos")) {
            return WHITE;
        }

        boolean martyr = type.contains("martyr") || type.contains("martir") || name.contains("martir");
        boolean whiteApostolicException =
                (name.contains("juan") && name.contains("evangelista"))
                        || name.contains("catedra de san pedro")
                        || name.contains("conversion de san pablo");
        boolean apostleOrEvangelist =
                (type.contains("apostle")
                        || type.contains("apostol")
                        || type.contains("evangelist")
                        || type.contains("evangelista"))
                        && !whiteApostolicException;

        if (martyr || apostleOrEvangelist) return RED;
        if (isMarianCelebration(type, name)) return WHITE;
        return WHITE;
    }

    private static int parseCelebrationRank(String title) {
        if (title.contains("solemnidad")) return 1;
        if (title.contains("fiesta")) return 2;
        if (title.matches(".*\\bmemoria\\b(?!\\s+libre).*")) return 2;
        if (title.contains("memoria libre")) return 3;
        if (title.contains("conmemoracion")) return 4;
        return 0;
    }

    private static Integer getFixedSpecialDateColor(Calendar date) {
        int month = date.get(Calendar.MONTH) + 1;
        int day = date.get(Calendar.DAY_OF_MONTH);

        if (month == 1 && (day == 1 || day == 3 || day == 6 || day == 25)) return WHITE;
        if (month == 2 && (day == 2 || day == 22)) return WHITE;
        if (month == 3 && (day == 19 || day == 25)) return WHITE;
        if (month == 6 && day == 24) return WHITE;
        if (month == 6 && day == 29) return RED;
        if (month == 8 && (day == 6 || day == 15)) return WHITE;
        if (month == 9 && day == 14) return RED;
        if (month == 9 && day == 29) return WHITE;
        if (month == 10 && day == 2) return WHITE;
        if (month == 11 && (day == 1 || day == 2 || day == 9 || day == 21)) return WHITE;
        if (month == 12 && (day == 8 || day == 25 || day == 27)) return WHITE;
        if (month == 12 && (day == 26 || day == 28)) return RED;

        return null;
    }

    private static boolean isSpecialFixedDateObservedElsewhere(Calendar date, Calendar easter) {
        int year = date.get(Calendar.YEAR);
        int month = date.get(Calendar.MONTH) + 1;
        int day = date.get(Calendar.DAY_OF_MONTH);
        if (month == 3 && day == 19 && !isSameDay(date, getObservedSaintJosephDate(year, easter))) return true;
        if (month == 3 && day == 25 && !isSameDay(date, getObservedAnnunciationDate(year, easter))) return true;
        if (month == 12 && day == 8 && !isSameDay(date, getObservedImmaculateConceptionDate(year))) return true;
        return false;
    }

    private static Calendar getObservedSaintJosephDate(int year, Calendar easter) {
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

    private static Calendar getObservedAnnunciationDate(int year, Calendar easter) {
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

    private static Calendar getObservedImmaculateConceptionDate(int year) {
        Calendar original = Calendar.getInstance();
        original.set(year, Calendar.DECEMBER, 8, 0, 0, 0);
        original.set(Calendar.MILLISECOND, 0);
        if (isSunday(original) && isAdventSeason(original)) {
            return addDays(original, 1);
        }
        return startOfDay(original);
    }

    private static Calendar getHolyFamilyDate(int year) {
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

    private static Calendar getBaptismOfTheLordDate(int year) {
        Calendar candidate = Calendar.getInstance();
        candidate.set(year, Calendar.JANUARY, 7, 0, 0, 0);
        candidate.set(Calendar.MILLISECOND, 0);
        while (candidate.get(Calendar.DAY_OF_WEEK) != Calendar.SUNDAY) {
            candidate.add(Calendar.DAY_OF_MONTH, 1);
        }
        return candidate;
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

    private static Calendar getAdventStart(int year) {
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

    private static boolean keepsOwnColorInPenitentialSeason(String title, String name) {
        return title.contains("solemnidad")
                || title.contains("fiesta")
                || title.contains("fiesta del senor")
                || name.contains("jueves santo")
                || name.contains("viernes santo")
                || name.contains("pasion del senor")
                || name.contains("pentecostes")
                || name.contains("domingo de ramos");
    }

    private static boolean isMarianCelebration(String type, String name) {
        if (type.contains("marian")) return true;
        return name.contains("nuestra senora")
                || name.contains("santa maria")
                || name.contains("virgen maria")
                || name.contains("madre de dios")
                || name.contains("inmaculada")
                || name.contains("asuncion de la virgen")
                || name.contains("presentacion de la virgen")
                || name.contains("natividad de la virgen")
                || name.contains("visitacion de la virgen")
                || name.contains("virgen del ")
                || name.contains("virgen de ");
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

    private static String normalizeLiturgicalText(String value) {
        if (value == null) return "";

        String normalized = value
                .toLowerCase(Locale.getDefault())
                .replace("Ã¡", "a")
                .replace("Ã©", "e")
                .replace("Ã­", "i")
                .replace("Ã³", "o")
                .replace("Ãº", "u")
                .replace("Ã±", "n")
                .replace("Ã¼", "u");

        normalized = Normalizer.normalize(normalized, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{M}+", "");
        return normalized.replaceAll("[^a-z0-9]+", " ").trim();
    }
}
