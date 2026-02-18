package com.benjamin.studio.widgets;

import android.content.Context;
import android.graphics.Color;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

final class SaintWidgetContentFactory {
    private static Map<Integer, SaintEntry> cachedSaints;

    static SaintWidgetContent forNow(Context context) {
        Calendar now = Calendar.getInstance();
        int year = now.get(Calendar.YEAR);
        int month = now.get(Calendar.MONTH) + 1;
        int day = now.get(Calendar.DAY_OF_MONTH);
        int dow = now.get(Calendar.DAY_OF_WEEK);

        // 1. Calculate Movable Feasts
        Calendar easter = getEasterDate(year);
        SaintEntry movable = getMovableFeast(now, easter);

        // 2. Get Fixed Saint
        SaintEntry fixed = getSaintForDate(context, month, day);

        // 3. Priority: Movable > Fixed
        SaintEntry saint = (movable != null) ? movable : fixed;

        String name = saint != null && saint.name != null ? saint.name : "Santo del Día";
        String bio = saint != null && saint.bio != null ? saint.bio : "";

        String imageAssetPath = pickSaintImageAssetPath(saint, dow);

        int backgroundColor = getLiturgicalColor(saint);
        boolean lightBg = isLightColor(backgroundColor);
        int titleTextColor = lightBg ? Color.parseColor("#1E293B") : Color.WHITE;
        int bodyTextColor = lightBg ? Color.parseColor("#334155") : Color.argb(230, 255, 255, 255);

        return new SaintWidgetContent(name, bio, imageAssetPath, backgroundColor, titleTextColor, bodyTextColor);
    }

    private static SaintEntry getSaintForDate(Context context, int month, int day) {
        Map<Integer, SaintEntry> map = ensureSaintsLoaded(context);
        return map.get(month * 100 + day);
    }

    private static synchronized Map<Integer, SaintEntry> ensureSaintsLoaded(Context context) {
        if (cachedSaints != null) return cachedSaints;

        Map<Integer, SaintEntry> map = new HashMap<>();
        try {
            String json = readAssetText(context, "saints-data.json");
            JSONObject root = new JSONObject(json);
            JSONArray saints = root.optJSONArray("saints");
            if (saints != null) {
                for (int i = 0; i < saints.length(); i++) {
                    JSONObject s = saints.optJSONObject(i);
                    if (s == null) continue;
                    int month = s.optInt("month", -1);
                    int day = s.optInt("day", -1);
                    if (month <= 0 || day <= 0) continue;
                    String name = s.optString("name", "");
                    String bio = s.optString("bio", "");
                    String title = s.optString("title", "");
                    String type = s.optString("type", "");
                    map.put(month * 100 + day, new SaintEntry(month, day, name, bio, title, type));
                }
            }
        } catch (Exception ignored) {
        }

        cachedSaints = map;
        return cachedSaints;
    }

    private static String readAssetText(Context context, String assetPath) throws Exception {
        InputStream is = context.getAssets().open(assetPath);
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line).append('\n');
            }
            return sb.toString();
        }
    }

    private static String pickSaintImageAssetPath(SaintEntry saint, int dow) {
        String name = saint != null ? saint.name : "";
        String type = saint != null ? saint.type : "";
        
        // 1. Specific Saint/Feast Images (Priority)
        if (name != null) {
            if (name.contains("Alberto Hurtado")) return "public/images/san-alberto.jpeg";
            if (name.contains("Francisco de Sales")) return "public/images/san-francisco.jpeg";
            if (name.contains("Agustín, obispo y doctor")) return "public/images/san-agustin.jpeg";
            if (name.contains("Santo Tomás de Aquino")) return "public/images/santo-tomas.jpeg";
            if (name.contains("Natividad del Señor")) return "public/images/nativity.jpeg";
            
            // Movable Feasts Images
            if (name.contains("Resurrección")) return "public/images/resurrection.jpeg";
            if (name.contains("Ceniza") || name.contains("Cuaresma")) return "public/images/crucifixion.jpeg"; // Or generic penitential
            if (name.contains("Ramos") || name.contains("Viernes Santo")) return "public/images/crucifixion.jpeg";
            if (name.contains("Pentecostés")) return "public/images/holy-trinity.jpeg"; // Close enough
            if (name.contains("Ascensión")) return "public/images/resurrection.jpeg";
            if (name.contains("Rey del Universo")) return "public/images/resurrection.jpeg";
            if (name.contains("Adviento")) return "public/images/nativity.jpeg"; // Preparation for Nativity
            if (name.contains("Santísima Trinidad")) return "public/images/holy-trinity.jpeg";
            if (name.contains("Corpus Christi")) return "public/images/eucharist.jpeg";
            if (name.contains("Sagrado Corazón")) return "public/images/sacred-heart.jpeg";
        }

        // 2. Marian Logic (Matches SettingsContext.tsx)
        boolean isMarian = false;
        if (type != null && type.toLowerCase(Locale.getDefault()).contains("marian")) {
            isMarian = true;
        } else if (name != null) {
             String n = name.toLowerCase(Locale.getDefault());
             if (n.contains("nuestra señora") || 
                 n.contains("virgen maría") || 
                 n.contains("inmaculada concepción") || 
                 n.contains("asunción de la virgen") || 
                 n.contains("presentación de la virgen") || 
                 n.contains("natividad de la virgen") || 
                 n.contains("visitación de la virgen")) {
                 isMarian = true;
             }
        }

        if (isMarian) {
            return "public/images/immaculate-conception.jpeg";
        }

        // 3. Day of Week Fallback
        switch (dow) {
            case Calendar.SUNDAY:
                return "public/images/resurrection.jpeg";
            case Calendar.MONDAY:
                return "public/images/holy-trinity.jpeg";
            case Calendar.TUESDAY:
                return "public/images/creation.jpeg";
            case Calendar.WEDNESDAY:
                return "public/images/holy-family.jpeg";
            case Calendar.THURSDAY:
                return "public/images/eucharist.jpeg";
            case Calendar.FRIDAY:
                return "public/images/crucifixion.jpeg";
            default: // SATURDAY
                return "public/images/immaculate-conception.jpeg";
        }
    }

    private static int getLiturgicalColor(SaintEntry saint) {
        if (saint == null) return Color.parseColor("#225722");

        String title = saint.title != null ? saint.title.toLowerCase(Locale.getDefault()) : "";
        String type = saint.type != null ? saint.type.toLowerCase(Locale.getDefault()) : "";
        String name = saint.name != null ? saint.name.toLowerCase(Locale.getDefault()) : "";

        // Liturgical Colors
        int gold = Color.parseColor("#B8860B");
        int red = Color.parseColor("#8B0000");
        int white = Color.parseColor("#F8F9FA");
        int purple = Color.parseColor("#5A2A69");
        int green = Color.parseColor("#225722");
        int blue = Color.parseColor("#3A5F7A");

        // 1. Solemnities and Feasts of the Lord (Gold/White)
        if (title.contains("solemnidad") || name.contains("señor") || name.contains("cristo rey") || title.contains("fiesta del señor")) {
            // Exception: Good Friday / Passion is Red
            if (name.contains("pasión") || name.contains("viernes santo") || name.contains("cruz")) {
                return red;
            }
            return gold;
        }

        // 2. Penitential Seasons: Advent & Lent (Purple)
        if (type.contains("advent") || type.contains("lent") || title.contains("ceniza")) {
             // Exception: Palm Sunday (Red)
             if (name.contains("ramos") || name.contains("palm")) {
                 return red;
             }
             return purple;
        }

        // 3. Passion, Holy Spirit, Martyrs, Apostles (Red)
        if (name.contains("viernes santo") || 
            name.contains("pentecostés") || 
            name.contains("espíritu santo") ||
            name.contains("pasión") ||
            type.contains("martyr") || type.contains("mártir") || name.contains("mártir") ||
            type.contains("apostle") || type.contains("apóstol") ||
            type.contains("evangelist") || type.contains("evangelista")) {
            
            // Exception: St. John Evangelist is White
            if (name.contains("juan") && name.contains("evangelista")) {
                return white;
            }
            return red;
        }

        // 4. Marian Feasts (Blue - Hispanic privilege, or White)
        if (type.contains("marian") || name.contains("virgen") || name.contains("inmaculada") || name.contains("asunción") || name.contains("madre de dios")) {
            return blue;
        }

        // 5. Virgins (Green - User explicit request)
        if (type.contains("virgin") || type.contains("virgen")) {
            return green;
        }

        // 6. Saints (Non-Martyrs), Popes, Doctors (White)
        if (type.contains("confessor") || 
            type.contains("doctor") || 
            type.contains("pope") || type.contains("papa") || 
            type.contains("bishop") || type.contains("obispo") ||
            type.contains("religious") || type.contains("religioso") ||
            type.contains("abbot") || type.contains("abad") ||
            title.contains("fiesta") || title.contains("memoria")) {
            return white;
        }

        // 7. Ordinary Time (Green)
        return green;
    }

    private static boolean isLightColor(int color) {
        double r = Color.red(color) / 255.0;
        double g = Color.green(color) / 255.0;
        double b = Color.blue(color) / 255.0;
        double luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luma > 0.60;
    }

    // ==========================================
    // Movable Feasts Logic (Ported from TS)
    // ==========================================

    private static Calendar getEasterDate(int year) {
        int a = year % 19;
        int b = year % 4;
        int c = year % 7;
        int k = year / 100;
        int p = (13 + 8 * k) / 25;
        int q = k / 4;
        int M = (15 - p + k - q) % 30;
        int N = (4 + k - q) % 7;
        int d = (19 * a + M) % 30;
        int e = (2 * b + 4 * c + 6 * d + N) % 7;
        
        int day = d + e < 10 ? 22 + d + e : d + e - 9;
        int month = d + e < 10 ? 3 : 4; // 3=March, 4=April

        // Adjust for special cases
        if (day == 26 && month == 3) {
            day = 19;
        }
        if (day == 25 && month == 3 && d == 28 && a > 10) {
            day = 18;
        }

        Calendar cal = Calendar.getInstance();
        cal.set(year, month - 1, day, 0, 0, 0); // Month is 0-indexed in Calendar
        cal.set(Calendar.MILLISECOND, 0);
        return cal;
    }

    private static Calendar addDays(Calendar date, int days) {
        Calendar cal = (Calendar) date.clone();
        cal.add(Calendar.DAY_OF_YEAR, days);
        return cal;
    }

    private static boolean isSameDay(Calendar a, Calendar b) {
        return a.get(Calendar.YEAR) == b.get(Calendar.YEAR) &&
               a.get(Calendar.DAY_OF_YEAR) == b.get(Calendar.DAY_OF_YEAR);
    }
    
    // Advent Calculation (Updated)
    private static Map<String, Calendar> getAdventDates(int year) {
        Map<String, Calendar> dates = new HashMap<>();
        
        // Start searching from Nov 27
        Calendar advent1 = Calendar.getInstance();
        advent1.set(year, Calendar.NOVEMBER, 27, 0, 0, 0);
        advent1.set(Calendar.MILLISECOND, 0);

        // Find the first Sunday on or after Nov 27
        while (advent1.get(Calendar.DAY_OF_WEEK) != Calendar.SUNDAY) {
            advent1.add(Calendar.DAY_OF_MONTH, 1);
        }

        dates.put("advent1", advent1);
        dates.put("advent2", addDays(advent1, 7));
        dates.put("advent3", addDays(advent1, 14));
        dates.put("advent4", addDays(advent1, 21));
        dates.put("christTheKing", addDays(advent1, -7));

        return dates;
    }

    private static SaintEntry getMovableFeast(Calendar current, Calendar easter) {
        int year = current.get(Calendar.YEAR);
        
        // 1. Advent Feasts
        Map<String, Calendar> adventDates = getAdventDates(year);
        
        if (isSameDay(current, adventDates.get("christTheKing"))) {
            return new SaintEntry(0, 0, "Jesucristo, Rey del Universo", 
                "Solemnidad que cierra el Año Litúrgico. Celebramos que Cristo es Rey de todo lo creado, principio y fin de la historia.", 
                "Solemnidad", "celebration");
        }
        if (isSameDay(current, adventDates.get("advent1"))) {
            return new SaintEntry(0, 0, "I Domingo de Adviento", 
                "Inicio del Año Litúrgico. La Iglesia comienza el tiempo de espera y preparación para la venida de Cristo.", 
                "Domingo de Adviento", "celebration;advent");
        }
        if (isSameDay(current, adventDates.get("advent2"))) {
            return new SaintEntry(0, 0, "II Domingo de Adviento", 
                "La voz del Bautista resuena en el desierto: «Preparad el camino del Señor».", 
                "Domingo de Adviento", "celebration;advent");
        }
        if (isSameDay(current, adventDates.get("advent3"))) {
            return new SaintEntry(0, 0, "III Domingo de Adviento (Gaudete)", 
                "Domingo de la alegría. «Estad siempre alegres en el Señor; os lo repito, estad alegres» (Fil 4, 4).", 
                "Domingo de Adviento", "celebration;advent");
        }
        if (isSameDay(current, adventDates.get("advent4"))) {
            return new SaintEntry(0, 0, "IV Domingo de Adviento", 
                "María, la Virgen de la espera. El Señor está cerca.", 
                "Domingo de Adviento", "celebration;advent");
        }

        // 2. Easter Feasts
        // Map offset to Definition
        // -46: Ash Wed
        // -7: Palm Sun
        // -6: Holy Mon
        // -5: Holy Tue
        // -4: Holy Wed
        // -3: Holy Thu
        // -2: Good Fri
        // -1: Holy Sat
        // 0: Easter
        // 39: Ascension
        // 49: Pentecost
        
        // We can check offsets directly
        long diffMillis = current.getTimeInMillis() - easter.getTimeInMillis();
        long diffDays = diffMillis / (24 * 60 * 60 * 1000);
        // Approximation due to DST can be tricky, better to iterate or use careful date logic.
        // Or loop through definitions.
        
        // Let's iterate definitions
        Map<Integer, SaintEntry> easterFeasts = new HashMap<>();
        easterFeasts.put(-46, new SaintEntry(0, 0, "Miércoles de Ceniza", "Inicio de la Cuaresma...", "Conmemoración", "celebration;lent;ceniza"));
        easterFeasts.put(-7, new SaintEntry(0, 0, "Domingo de Ramos", "Inicio de la Semana Santa...", "Celebración del Día", "celebration;lent;ramos"));
        easterFeasts.put(-6, new SaintEntry(0, 0, "Lunes Santo", "Día para preparar el alma...", "Celebración del Día", "celebration;lent"));
        easterFeasts.put(-5, new SaintEntry(0, 0, "Martes Santo", "Día para preparar el alma...", "Celebración del Día", "celebration;lent"));
        easterFeasts.put(-4, new SaintEntry(0, 0, "Miércoles Santo", "Día para preparar el alma...", "Celebración del Día", "celebration;lent"));
        easterFeasts.put(-3, new SaintEntry(0, 0, "Jueves Santo", "La Última Cena...", "Celebración del Día", "celebration;lent"));
        easterFeasts.put(-2, new SaintEntry(0, 0, "Viernes Santo", "La Crucifixión del Señor...", "Conmemoración", "celebration;lent;pasión"));
        easterFeasts.put(-1, new SaintEntry(0, 0, "Sábado Santo", "Día de silencio y espera...", "Conmemoración", "celebration;lent"));
        easterFeasts.put(0, new SaintEntry(0, 0, "Domingo de Resurrección", "¡Cristo ha resucitado!...", "Solemnidad", "celebration"));
        easterFeasts.put(39, new SaintEntry(0, 0, "Ascensión del Señor", "Jesús asciende al cielo...", "Solemnidad", "celebration"));
        easterFeasts.put(49, new SaintEntry(0, 0, "Pentecostés", "Venida del Espíritu Santo...", "Solemnidad", "celebration;pentecostés"));

        for (Map.Entry<Integer, SaintEntry> entry : easterFeasts.entrySet()) {
            Calendar feastDate = addDays(easter, entry.getKey());
            if (isSameDay(current, feastDate)) {
                return entry.getValue();
            }
        }

        return null;
    }

    private static final class SaintEntry {
        final int month;
        final int day;
        final String name;
        final String bio;
        final String title;
        final String type;

        SaintEntry(int month, int day, String name, String bio, String title, String type) {
            this.month = month;
            this.day = day;
            this.name = name != null ? name : "";
            this.bio = bio != null ? bio : "";
            this.title = title != null ? title : "";
            this.type = type != null ? type : "";
        }

        @Override
        public String toString() {
            return String.format(Locale.US, "%d/%d %s", month, day, name);
        }
    }
}
