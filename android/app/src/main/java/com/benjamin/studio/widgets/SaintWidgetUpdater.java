package com.benjamin.studio.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.widget.RemoteViews;

import com.benjamin.studio.MainActivity;
import com.benjamin.studio.R;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class SaintWidgetUpdater {
    private static Map<String, Float> cachedBiasByPlaceholderId;

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        SaintWidgetContent content = SaintWidgetContentFactory.forNow(context);

        int[] largeIds = manager.getAppWidgetIds(new ComponentName(context, SaintWidgetLargeProvider.class));
        for (int id : largeIds) {
            RemoteViews views = buildLargeViews(context, content);
            manager.updateAppWidget(id, views);
        }

        int[] smallIds = manager.getAppWidgetIds(new ComponentName(context, SaintWidgetSmallProvider.class));
        for (int id : smallIds) {
            RemoteViews views = buildSmallViews(context, content);
            manager.updateAppWidget(id, views);
        }
    }

    private static RemoteViews buildLargeViews(Context context, SaintWidgetContent content) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_saint_large);
        applyCommon(context, views, content);

        Bitmap bmp = loadAssetBitmap(context, content.imageAssetPath, 1400, 900);
        if (bmp != null) {
            // Apply smart cropping based on bias (e.g. keeping the face visible)
            // We aim for a landscape-ish aspect ratio (e.g. 1.6) which fits most large widget headers,
            // relying on centerCrop in XML to handle the final fit.
            float bias = resolveVerticalBiasForAssetPath(context, content.imageAssetPath);
            Bitmap cropped = cropToAspectWithVerticalBias(bmp, 1.6f, bias);
            if (cropped != bmp) bmp.recycle();
            
            int radiusPx = dpToPx(context, 24);
            Bitmap rounded = roundAllCorners(cropped, radiusPx);
            if (rounded != cropped) cropped.recycle();

            views.setImageViewBitmap(R.id.widget_saint_image, rounded);
            views.setViewVisibility(R.id.widget_saint_image, android.view.View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_saint_image, android.view.View.GONE);
        }

        return views;
    }

    private static float resolveVerticalBiasForAssetPath(Context context, String assetPath) {
        String id = toPlaceholderId(assetPath);
        if (id == null) return 0.22f;
        Float bias = getBiasByPlaceholderId(context).get(id);
        return bias != null ? bias : 0.22f;
    }

    private static String toPlaceholderId(String assetPath) {
        if (assetPath == null) return null;
        if (assetPath.endsWith("/resurrection.jpeg")) return "saintoftheday-0";
        if (assetPath.endsWith("/holy-trinity.jpeg")) return "saintoftheday-1";
        if (assetPath.endsWith("/creation.jpeg")) return "saintoftheday-2";
        if (assetPath.endsWith("/holy-family.jpeg")) return "saintoftheday-3";
        if (assetPath.endsWith("/eucharist.jpeg")) return "saintoftheday-4";
        if (assetPath.endsWith("/crucifixion.jpeg")) return "saintoftheday-5";
        if (assetPath.endsWith("/immaculate-conception.jpeg")) return "saintoftheday-6";
        if (assetPath.endsWith("/san-alberto.jpeg")) return "sanalbertohurtado-image";
        if (assetPath.endsWith("/san-francisco.jpeg")) return "sanfranciscodesales-image";
        if (assetPath.endsWith("/san-agustin.jpeg")) return "sanagustindehipona-image";
        if (assetPath.endsWith("/santo-tomas.jpeg")) return "santotomasdeaquino-image";
        if (assetPath.endsWith("/nativity.jpeg")) return "nativity-image";
        return null;
    }

    private static Map<String, Float> getBiasByPlaceholderId(Context context) {
        if (cachedBiasByPlaceholderId != null) return cachedBiasByPlaceholderId;
        Map<String, Float> map = new HashMap<>();
        try {
            String source = readAssetText(context, "image-display.ts");
            String key = "export const placeholderImagePreference";
            int start = source.indexOf(key);
            if (start >= 0) {
                int open = source.indexOf('{', start);
                int close = source.indexOf("};", open);
                if (open > 0 && close > open) {
                    String objectBody = source.substring(open + 1, close);
                    Pattern p = Pattern.compile("\"([^\"]+)\"\\s*:\\s*\"(top|center|bottom)\"");
                    Matcher m = p.matcher(objectBody);
                    while (m.find()) {
                        String id = m.group(1);
                        String pref = m.group(2);
                        map.put(id, toVerticalBias(pref));
                    }
                }
            }
        } catch (Exception ignored) {
        }
        cachedBiasByPlaceholderId = map;
        return cachedBiasByPlaceholderId;
    }

    private static float toVerticalBias(String pref) {
        if ("top".equals(pref)) return 0.15f;
        if ("bottom".equals(pref)) return 0.85f;
        if ("extra".equals(pref)) return 0.40f; // Adjusted for 'extra' preference
        return 0.50f;
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

    private static RemoteViews buildSmallViews(Context context, SaintWidgetContent content) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_saint_small);
        applyCommon(context, views, content);
        return views;
    }

    private static void applyCommon(Context context, RemoteViews views, SaintWidgetContent content) {
        views.setInt(R.id.widget_bg, "setColorFilter", content.backgroundColor);
        views.setTextViewText(R.id.widget_saint_name, content.name);
        views.setTextViewText(R.id.widget_saint_bio, content.bio);
        views.setTextColor(R.id.widget_saint_name, content.titleTextColor);
        views.setTextColor(R.id.widget_saint_bio, content.bodyTextColor);

        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
    }

    private static int dpToPx(Context context, int dp) {
        float density = context.getResources().getDisplayMetrics().density;
        return Math.max(1, Math.round(dp * density));
    }

    private static Bitmap cropToAspectWithVerticalBias(Bitmap src, float targetAspect, float verticalBias) {
        if (src == null) return null;
        int w = src.getWidth();
        int h = src.getHeight();
        if (w <= 0 || h <= 0) return src;

        float srcAspect = (float) w / (float) h;
        if (Math.abs(srcAspect - targetAspect) < 0.01f) return src;

        int cropW = w;
        int cropH = h;
        int x = 0;
        int y = 0;

        if (srcAspect > targetAspect) {
            cropW = Math.round(h * targetAspect);
            x = Math.max(0, (w - cropW) / 2);
        } else {
            cropH = Math.round(w / targetAspect);
            int maxY = Math.max(0, h - cropH);
            float clampedBias = Math.max(0f, Math.min(1f, verticalBias));
            y = Math.round(maxY * clampedBias);
        }

        try {
            return Bitmap.createBitmap(src, x, y, cropW, cropH);
        } catch (Exception ignored) {
            return src;
        }
    }

    private static Bitmap roundAllCorners(Bitmap src, int radiusPx) {
        if (src == null) return null;
        int w = src.getWidth();
        int h = src.getHeight();
        if (w <= 0 || h <= 0) return src;

        float r = Math.max(0f, Math.min(radiusPx, Math.min(w, h) / 2f));
        if (r <= 0f) return src;

        try {
            Bitmap out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(out);

            Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
            Shader shader = new BitmapShader(src, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
            paint.setShader(shader);

            RectF rect = new RectF(0f, 0f, w, h);
            canvas.drawRoundRect(rect, r, r, paint);
            return out;
        } catch (Exception ignored) {
            return src;
        }
    }

    private static Bitmap loadAssetBitmap(Context context, String assetPath, int maxWidth, int maxHeight) {
        if (assetPath == null || assetPath.isEmpty()) return null;
        try {
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            try (InputStream is = context.getAssets().open(assetPath)) {
                BitmapFactory.decodeStream(is, null, bounds);
            }

            int inSampleSize = 1;
            int outW = Math.max(1, bounds.outWidth);
            int outH = Math.max(1, bounds.outHeight);
            while ((outW / inSampleSize) > maxWidth || (outH / inSampleSize) > maxHeight) {
                inSampleSize *= 2;
            }

            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inSampleSize = inSampleSize;
            opts.inPreferredConfig = Bitmap.Config.ARGB_8888;

            Bitmap decoded;
            try (InputStream is = context.getAssets().open(assetPath)) {
                decoded = BitmapFactory.decodeStream(is, null, opts);
            }
            if (decoded == null) return null;

            int w = decoded.getWidth();
            int h = decoded.getHeight();
            if (w <= maxWidth && h <= maxHeight) return decoded;

            float scale = Math.min((float) maxWidth / (float) w, (float) maxHeight / (float) h);
            int nw = Math.max(1, Math.round(w * scale));
            int nh = Math.max(1, Math.round(h * scale));
            Bitmap scaled = Bitmap.createScaledBitmap(decoded, nw, nh, true);
            if (scaled != decoded) decoded.recycle();
            return scaled;
        } catch (Exception ignored) {
            return null;
        }
    }
}
