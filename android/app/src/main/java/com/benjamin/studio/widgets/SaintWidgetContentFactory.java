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
        int month = now.get(Calendar.MONTH) + 1;
        int day = now.get(Calendar.DAY_OF_MONTH);
        int dow = now.get(Calendar.DAY_OF_WEEK);

        SaintEntry saint = getSaintForDate(context, month, day);
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
        
        // 1. Specific Saint Images (Priority)
        if (name != null) {
            if (name.contains("Alberto Hurtado")) return "public/images/san-alberto.jpeg";
            if (name.contains("Francisco de Sales")) return "public/images/san-francisco.jpeg";
            if (name.contains("Agustín, obispo y doctor")) return "public/images/san-agustin.jpeg";
            if (name.contains("Santo Tomás de Aquino")) return "public/images/santo-tomas.jpeg";
            if (name.contains("Natividad del Señor")) return "public/images/nativity.jpeg";
        }

        // 2. Marian Logic (Matches SettingsContext.tsx)
        // Regex: /(Nuestra Señora|Virgen María|Inmaculada Concepción|Asunción de la Virgen|Presentación de la Virgen|Natividad de la Virgen|Visitación de la Virgen)/i
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

        int gold = Color.parseColor("#B8860B");
        int red = Color.parseColor("#8B0000");
        int white = Color.parseColor("#F8F9FA");
        int purple = Color.parseColor("#5A2A69");
        int green = Color.parseColor("#225722");
        int blue = Color.parseColor("#3A5F7A");

        if (title.contains("solemnidad") || name.contains("señor") || name.contains("cristo rey")) {
            return gold;
        }
        if (title.contains("fiesta del señor")) {
            return gold;
        }
        if (title.contains("fiesta") && !(type.contains("marian") || type.contains("apostle"))) {
            return white;
        }

        if (type.contains("martyr") || type.contains("mártir") || name.contains("mártir") || type.contains("apostle") || type.contains("evangelist")) {
            return red;
        }

        if (type.contains("marian")) {
            return blue;
        }

        // Fix: Virgins (not martyrs) should be green, not blue
        if (type.contains("virgin") || type.contains("virgen")) {
             // Martyrs are already caught above, so here we return green
             return green;
        }

        if (type.contains("pope") || type.contains("papa")) {
            return purple;
        }

        if (title.contains("memoria")) {
            if (type.contains("doctor") || type.contains("confessor") || type.contains("abbot")
                    || type.contains("bishop") || type.contains("priest") || type.contains("religious")) {
                return green;
            }
        }

        return green;
    }

    private static boolean isLightColor(int color) {
        double r = Color.red(color) / 255.0;
        double g = Color.green(color) / 255.0;
        double b = Color.blue(color) / 255.0;
        double luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luma > 0.60;
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
