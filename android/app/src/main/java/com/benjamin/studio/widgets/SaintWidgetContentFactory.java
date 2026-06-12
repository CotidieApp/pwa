package com.benjamin.studio.widgets;

import android.content.Context;
import android.graphics.Color;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

final class SaintWidgetContentFactory {
    private static Map<Integer, SaintEntry> cachedSaints;
    private static Map<String, String> cachedPlaceholderAssetPaths;
    private static Map<String, String> cachedOfficialLiturgicalColors;
    private static final String ANNUNCIATION_OVERLAY_ASSET_PATH = "public/images/rosario/gozoso-1.jpg";
    private static final DevotionImageEntry[] DEVOTION_IMAGE_ENTRIES = new DevotionImageEntry[] {
            new DevotionImageEntry("sanjosemaria", "public/images/san-josemaria.jpeg",
                    new String[] {"san josemaria escriva", "san josemaria escriva de balaguer"}),
            new DevotionImageEntry("sanjuanpabloii", "public/images/san-juan-pablo-ii.jpeg",
                    new String[] {"san juan pablo ii"}),
            new DevotionImageEntry("sanbenjamin", "public/images/san-benjamin.jpeg",
                    new String[] {"san benjamin diacono y martir"}),
            new DevotionImageEntry("sanjuanbautista", "public/images/san-juan-bautista.jpeg",
                    new String[] {"natividad de san juan bautista", "martirio de san juan bautista"}),
            new DevotionImageEntry("sanpedro", "public/images/san-pedro.jpeg",
                    new String[] {"catedra de san pedro", "santos pedro y pablo", "san pedro apostol"}),
            new DevotionImageEntry("sancarloacutis", "public/images/san-carlo-acutis.jpeg",
                    new String[] {"san carlo acutis"}),
            new DevotionImageEntry("santateresadelosandes", "public/images/santa-teresa-andes.jpeg",
                    new String[] {"santa teresa de los andes"}),
            new DevotionImageEntry("sanalbertohurtado", "public/images/san-alberto.jpeg",
                    new String[] {"san alberto hurtado"}),
            new DevotionImageEntry("beatoalvaro", "public/images/beato-alvaro.jpeg",
                    new String[] {"beato alvaro del portillo"}),
            new DevotionImageEntry("sanfranciscodesales", "public/images/san-francisco.jpeg",
                    new String[] {"san francisco de sales"}),
            new DevotionImageEntry("sanagustindehipona", "public/images/san-agustin.jpeg",
                    new String[] {"san agustin obispo y doctor de la iglesia", "san agustin de hipona"}),
            new DevotionImageEntry("santotomasdeaquino", "public/images/santo-tomas.jpeg",
                    new String[] {"santo tomas de aquino"}),
            new DevotionImageEntry("devocion-san-jose", "public/images/san-jose.jpg",
                    new String[] {"san jose esposo de la virgen maria", "san jose obrero"}),
            new DevotionImageEntry("sagrado-corazon", "public/images/sacred-heart.jpeg",
                    new String[] {"sagrado corazon", "sagrado corazon de jesus"})
    };

    static SaintWidgetContent forNow(Context context) {
        Calendar now = Calendar.getInstance();
        int year = now.get(Calendar.YEAR);
        int month = now.get(Calendar.MONTH) + 1;
        int day = now.get(Calendar.DAY_OF_MONTH);

        Calendar easter = getEasterDate(year);
        SaintEntry movable = getMovableFeast(now, easter);
        SaintEntry fixed = getSaintForDate(context, month, day);
        SaintEntry saint = (movable != null) ? movable : fixed;

        String name = saint != null && saint.name != null ? saint.name : "Santo del Dia";
        String bio = saint != null && saint.bio != null ? saint.bio : "";
        SelectedImage selectedImage = pickSaintImage(context, saint, now);

        int backgroundColor = getLiturgicalColor(context, saint, now, easter);
        boolean lightBg = isLightColor(backgroundColor);
        int titleTextColor = lightBg ? Color.parseColor("#1E293B") : Color.WHITE;
        int bodyTextColor = lightBg ? Color.parseColor("#334155") : Color.argb(230, 255, 255, 255);

        return new SaintWidgetContent(
                name,
                bio,
                selectedImage.prayerId,
                selectedImage.id,
                selectedImage.assetPath,
                selectedImage.overlayAssetPath,
                backgroundColor,
                titleTextColor,
                bodyTextColor
        );
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

    private static SelectedImage pickSaintImage(Context context, SaintEntry saint, Calendar now) {
        int month = now.get(Calendar.MONTH) + 1;
        int day = now.get(Calendar.DAY_OF_MONTH);
        String dayImageId = "saintoftheday-" + toJsDayIndex(now.get(Calendar.DAY_OF_WEEK));
        boolean isAnnunciationDay = month == 3 && day == 25;

        if (month == 12 && (day == 24 || day == 25)) {
            String christmasPath = resolvePlaceholderAssetPath("christmas-image");
            if (christmasPath != null) {
                return new SelectedImage("christmas-image", christmasPath);
            }
        }

        SelectedImage devotionImage = resolveDevotionImage(saint);
        if (devotionImage != null) {
            return devotionImage;
        }

        String saintName = saint != null ? saint.name : "";
        String saintType = saint != null ? saint.type : "";
        String imageId = dayImageId;

        boolean isMarian = saintType != null && saintType.equalsIgnoreCase("marian");
        if (!isMarian && saintName != null && !saintName.isEmpty()) {
            String loweredName = saintName.toLowerCase(Locale.getDefault());
            isMarian = loweredName.contains("nuestra senora")
                    || loweredName.contains("nuestra se?ora")
                    || loweredName.contains("virgen maria")
                    || loweredName.contains("virgen mar?a")
                    || loweredName.contains("inmaculada concepcion")
                    || loweredName.contains("inmaculada concepci?n")
                    || loweredName.contains("asuncion de la virgen")
                    || loweredName.contains("asunci?n de la virgen")
                    || loweredName.contains("presentacion de la virgen")
                    || loweredName.contains("presentaci?n de la virgen")
                    || loweredName.contains("natividad de la virgen")
                    || loweredName.contains("visitacion de la virgen")
                    || loweredName.contains("visitaci?n de la virgen");
        }

        if (isMarian) {
            imageId = "saintoftheday-6";
        }

        String assetPath = resolvePlaceholderAssetPath(imageId);
        if (assetPath == null) {
            imageId = dayImageId;
            assetPath = resolvePlaceholderAssetPath(dayImageId);
        }
        return new SelectedImage(imageId, assetPath, isAnnunciationDay ? ANNUNCIATION_OVERLAY_ASSET_PATH : "", "");
    }

    private static SelectedImage resolveDevotionImage(SaintEntry saint) {
        if (saint == null || saint.name == null || saint.name.trim().isEmpty()) {
            return null;
        }

        String normalizedSaintName = normalizeLiturgicalText(saint.name);
        for (DevotionImageEntry entry : DEVOTION_IMAGE_ENTRIES) {
            for (String alias : entry.aliases) {
                if (normalizedSaintName.contains(alias)) {
                    return new SelectedImage(entry.id, entry.assetPath, "", entry.id);
                }
            }
        }
        return null;
    }

    private static int toJsDayIndex(int dayOfWeek) {
        switch (dayOfWeek) {
            case Calendar.SUNDAY:
                return 0;
            case Calendar.MONDAY:
                return 1;
            case Calendar.TUESDAY:
                return 2;
            case Calendar.WEDNESDAY:
                return 3;
            case Calendar.THURSDAY:
                return 4;
            case Calendar.FRIDAY:
                return 5;
            case Calendar.SATURDAY:
            default:
                return 6;
        }
    }

    private static String resolvePlaceholderAssetPath(String imageId) {
        return ensurePlaceholderAssetPathsLoaded().get(imageId);
    }

    private static synchronized Map<String, String> ensurePlaceholderAssetPathsLoaded() {
        if (cachedPlaceholderAssetPaths != null) return cachedPlaceholderAssetPaths;

        Map<String, String> map = new HashMap<>();
        map.put("saintoftheday-0", "public/images/resurrection.jpeg");
        map.put("saintoftheday-1", "public/images/holy-trinity.jpeg");
        map.put("saintoftheday-2", "public/images/creation.jpeg");
        map.put("saintoftheday-3", "public/images/holy-family.jpeg");
        map.put("saintoftheday-4", "public/images/eucharist.jpeg");
        map.put("saintoftheday-5", "public/images/crucifixion.jpeg");
        map.put("saintoftheday-6", "public/images/immaculate-conception.jpeg");
        map.put("sanalbertohurtado-image", "public/images/san-alberto.jpeg");
        map.put("sanfranciscodesales-image", "public/images/san-francisco.jpeg");
        map.put("sanagustindehipona-image", "public/images/san-agustin.jpeg");
        map.put("santotomasdeaquino-image", "public/images/santo-tomas.jpeg");
        map.put("sanjose-image", "public/images/san-jose.jpg");
        map.put("nativity-image", "public/images/nativity.jpeg");
        map.put("christmas-image", "public/images/christmas-image.png");
        cachedPlaceholderAssetPaths = map;
        return cachedPlaceholderAssetPaths;
    }

    private static synchronized Map<String, String> ensureOfficialLiturgicalColorsLoaded(Context context) {
        if (cachedOfficialLiturgicalColors != null) return cachedOfficialLiturgicalColors;

        Map<String, String> map = new HashMap<>();
        try {
            String[] assetNames = context.getAssets().list("");
            if (assetNames != null) {
                for (String assetName : assetNames) {
                    if (assetName == null
                            || !assetName.startsWith("liturgical-colors-chile-")
                            || !assetName.endsWith(".json")) {
                        continue;
                    }

                    String json = readAssetText(context, assetName);
                    JSONObject root = new JSONObject(json);
                    JSONObject days = root.optJSONObject("days");
                    if (days == null) continue;

                    JSONArray keys = days.names();
                    if (keys == null) continue;

                    for (int i = 0; i < keys.length(); i++) {
                        String dateKey = keys.optString(i, "");
                        if (dateKey == null || dateKey.trim().isEmpty()) continue;
                        JSONObject day = days.optJSONObject(dateKey);
                        if (day == null) continue;
                        String appColor = day.optString("appColor", "");
                        if (appColor == null || appColor.trim().isEmpty()) continue;
                        map.put(dateKey, appColor);
                    }
                }
            }
        } catch (Exception ignored) {
        }

        cachedOfficialLiturgicalColors = map;
        return cachedOfficialLiturgicalColors;
    }

    private static String getOfficialLiturgicalColorName(Context context, Calendar current) {
        String dateKey = String.format(
                Locale.US,
                "%04d-%02d-%02d",
                current.get(Calendar.YEAR),
                current.get(Calendar.MONTH) + 1,
                current.get(Calendar.DAY_OF_MONTH)
        );
        return ensureOfficialLiturgicalColorsLoaded(context).get(dateKey);
    }

    private static Integer mapOfficialLiturgicalColor(String colorName) {
        if (colorName == null || colorName.trim().isEmpty()) return null;
        String normalized = normalizeLiturgicalText(colorName);
        if (normalized.equals("blanco")) return Color.parseColor("#F8F9FA");
        if (normalized.equals("rojo")) return Color.parseColor("#8B0000");
        if (normalized.equals("verde")) return Color.parseColor("#225722");
        if (normalized.equals("morado")) return Color.parseColor("#5A2A69");
        if (normalized.equals("rosado")) return Color.parseColor("#D07A93");
        if (normalized.equals("negro")) return Color.parseColor("#111827");
        if (normalized.equals("azul")) return Color.parseColor("#5C83C6");
        if (normalized.equals("celeste")) return Color.parseColor("#7DB7E8");
        return null;
    }

    private static int getLiturgicalColor(Context context, SaintEntry saint, Calendar current, Calendar easter) {
        Integer protectedColor = LiturgicalColorRules.getSpecialDateLiturgicalColor(current, easter);
        if (protectedColor != null) return protectedColor;

        Integer officialColor = mapOfficialLiturgicalColor(getOfficialLiturgicalColorName(context, current));
        if (officialColor != null) return officialColor;

        return LiturgicalColorRules.getGeneralLiturgicalColor(
                saint != null ? saint.title : "",
                saint != null ? saint.type : "",
                saint != null ? saint.name : "",
                current,
                easter
        );
    }

    private static boolean isLightColor(int color) {
        double r = Color.red(color) / 255.0;
        double g = Color.green(color) / 255.0;
        double b = Color.blue(color) / 255.0;
        double luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luma > 0.60;
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

    private static boolean isAdventSeason(Calendar current) {
        Calendar day = startOfDay(current);
        int year = day.get(Calendar.YEAR);
        Map<String, Calendar> adventDates = getAdventDates(year);
        Calendar adventStart = adventDates.get("advent1");
        Calendar adventEnd = Calendar.getInstance();
        adventEnd.set(year, Calendar.DECEMBER, 24, 0, 0, 0);
        adventEnd.set(Calendar.MILLISECOND, 0);
        return adventStart != null && isWithinInclusive(day, adventStart, adventEnd);
    }

    private static boolean isPrivilegedAdventWeekday(Calendar current) {
        Calendar day = startOfDay(current);
        int year = day.get(Calendar.YEAR);
        Calendar start = Calendar.getInstance();
        start.set(year, Calendar.DECEMBER, 17, 0, 0, 0);
        start.set(Calendar.MILLISECOND, 0);
        Calendar end = Calendar.getInstance();
        end.set(year, Calendar.DECEMBER, 24, 0, 0, 0);
        end.set(Calendar.MILLISECOND, 0);
        return isWithinInclusive(day, start, end);
    }

    private static boolean isLentSeason(Calendar current, Calendar easter) {
        Calendar day = startOfDay(current);
        Calendar ashWednesday = addDays(easter, -46);
        Calendar holySaturday = addDays(easter, -1);
        return isWithinInclusive(day, ashWednesday, holySaturday);
    }

    private static Calendar startOfDay(Calendar source) {
        Calendar c = (Calendar) source.clone();
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c;
    }

    private static boolean isWithinInclusive(Calendar current, Calendar start, Calendar end) {
        Calendar c = startOfDay(current);
        Calendar s = startOfDay(start);
        Calendar e = startOfDay(end);
        return !c.before(s) && !c.after(e);
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
        easterFeasts.put(-46, new SaintEntry(0, 0, "Miércoles de Ceniza", "Inicio de la Cuaresma, un tiempo de penitencia y conversión de cuarenta días en preparación para la Pascua. Se caracteriza por la imposición de la ceniza en la frente.", "Conmemoración", "celebration;lent;ceniza"));
        easterFeasts.put(-7, new SaintEntry(0, 0, "Domingo de Ramos", "Inicio de la Semana Santa, día de la entrada triunfal de Jesús en Jerusalén, aclamado por la multitud con ramas de olivo y palmas.", "Celebración del Día", "celebration;lent;ramos"));
        easterFeasts.put(-6, new SaintEntry(0, 0, "Lunes Santo", "Día para preparar el alma...", "Celebración del Día", "celebration;lent"));
        easterFeasts.put(-5, new SaintEntry(0, 0, "Martes Santo", "Día para preparar el alma...", "Celebración del Día", "celebration;lent"));
        easterFeasts.put(-4, new SaintEntry(0, 0, "Miércoles Santo", "Día para preparar el alma...", "Celebración del Día", "celebration;lent"));
        easterFeasts.put(-3, new SaintEntry(0, 0, "Jueves Santo", "La Última Cena...", "Celebración del Día", "celebration;lent"));
        easterFeasts.put(-2, new SaintEntry(0, 0, "Viernes Santo", "La Crucifixión del Señor...", "Conmemoración", "celebration;lent;pasión"));
        easterFeasts.put(-1, new SaintEntry(0, 0, "Sábado Santo", "Día de silencio y espera...", "Conmemoración", "celebration;lent"));
        easterFeasts.put(0, new SaintEntry(0, 0, "Domingo de Resurrección", "¡Cristo ha resucitado!...", "Solemnidad", "celebration"));
        easterFeasts.put(39, new SaintEntry(0, 0, "Ascensión del Señor", "Jesús asciende al cielo...", "Solemnidad", "celebration"));
        easterFeasts.put(49, new SaintEntry(0, 0, "Pentecostés", "Venida del Espíritu Santo...", "Solemnidad", "celebration;pentecostés"));
        easterFeasts.put(50, new SaintEntry(0, 0, "María Madre de la Iglesia", "Memoria de la Bienaventurada Virgen María, Madre de la Iglesia.", "Memoria", "celebration;marian"));
        easterFeasts.put(56, new SaintEntry(0, 0, "Santísima Trinidad", "Misterio central de nuestra fe: un solo Dios en tres Personas.", "Solemnidad", "celebration"));
        easterFeasts.put(63, new SaintEntry(0, 0, "Corpus Christi", "Cuerpo y Sangre de Cristo. Celebramos la presencia real de Jesús en la Eucaristía.", "Solemnidad", "celebration;eucharist"));
        easterFeasts.put(68, new SaintEntry(0, 0, "Sagrado Corazón de Jesús", "Fiesta del Amor de Dios manifestado en el Corazón de su Hijo.", "Solemnidad", "celebration;sacred-heart"));
        easterFeasts.put(69, new SaintEntry(0, 0, "Inmaculado Corazón de María", "Memoria del Corazón de María, modelo de amor a Dios y a los hombres.", "Memoria", "celebration;marian"));

        long currentMillis = startOfDay(current).getTimeInMillis();
        long easterMillis = startOfDay(easter).getTimeInMillis();
        long diffDays = Math.round((currentMillis - easterMillis) / (24.0 * 60.0 * 60.0 * 1000.0));

        SaintEntry entry = easterFeasts.get((int) diffDays);
        if (entry != null) {
            return entry;
        }

        return null;
    }

    private static final class SelectedImage {
        final String id;
        final String assetPath;
        final String overlayAssetPath;
        final String prayerId;

        SelectedImage(String id, String assetPath) {
            this(id, assetPath, "", "");
        }

        SelectedImage(String id, String assetPath, String overlayAssetPath, String prayerId) {
            this.id = id != null ? id : "";
            this.assetPath = assetPath != null ? assetPath : "";
            this.overlayAssetPath = overlayAssetPath != null ? overlayAssetPath : "";
            this.prayerId = prayerId != null ? prayerId : "";
        }
    }

    private static final class DevotionImageEntry {
        final String id;
        final String assetPath;
        final String[] aliases;

        DevotionImageEntry(String id, String assetPath, String[] aliases) {
            this.id = id != null ? id : "";
            this.assetPath = assetPath != null ? assetPath : "";
            this.aliases = aliases != null ? aliases : new String[0];
        }
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
