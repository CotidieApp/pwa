package com.benjamin.studio.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.TypedValue;
import android.view.View;
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
    private static Map<String, CropBias> cachedBiasByPlaceholderId;

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
            RemoteViews views = buildSmallViews(context, content, manager, id);
            manager.updateAppWidget(id, views);
        }
    }

    private static RemoteViews buildLargeViews(Context context, SaintWidgetContent content) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_saint_large);
        applyCommon(context, views, content);

        Bitmap bmp = loadAssetBitmap(context, content.imageAssetPath, 1400, 900);
        if (bmp != null) {
            CropBias bias = resolveCropBiasForImageId(context, content.imageId);
            Bitmap cropped = cropToAspectWithBias(bmp, 1.5f, bias.horizontal, bias.vertical);
            if (cropped != bmp) bmp.recycle();
            views.setImageViewBitmap(R.id.widget_saint_image, cropped);
            views.setViewVisibility(R.id.widget_saint_image, android.view.View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_saint_image, android.view.View.GONE);
        }

        return views;
    }

    private static CropBias resolveCropBiasForImageId(Context context, String imageId) {
        if (imageId == null || imageId.isEmpty()) return new CropBias(0.50f, 0.50f);
        CropBias bias = getBiasByPlaceholderId(context).get(imageId);
        return bias != null ? bias : new CropBias(0.50f, 0.50f);
    }

    private static Map<String, CropBias> getBiasByPlaceholderId(Context context) {
        if (cachedBiasByPlaceholderId != null) return cachedBiasByPlaceholderId;
        Map<String, CropBias> map = new HashMap<>();
        try {
            String source = readAssetText(context, "image-display.ts");
            String key = "export const placeholderImagePreference";
            int start = source.indexOf(key);
            if (start >= 0) {
                int open = source.indexOf('{', start);
                int close = source.indexOf("};", open);
                if (open > 0 && close > open) {
                    String objectBody = source.substring(open + 1, close);
                    Pattern p = Pattern.compile("\"([^\"]+)\"\\s*:\\s*\"(top|center|bottom|extra)\"");
                    Matcher m = p.matcher(objectBody);
                    while (m.find()) {
                        String id = m.group(1);
                        String pref = m.group(2);
                        map.put(id, toCropBias(pref));
                    }
                }
            }
        } catch (Exception ignored) {
        }
        cachedBiasByPlaceholderId = map;
        return cachedBiasByPlaceholderId;
    }

    private static CropBias toCropBias(String pref) {
        if ("top".equals(pref)) return new CropBias(0.50f, 0.15f);
        if ("bottom".equals(pref)) return new CropBias(0.50f, 0.85f);
        if ("extra".equals(pref)) return new CropBias(0.40f, 0.50f);
        return new CropBias(0.50f, 0.50f);
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

    private static RemoteViews buildSmallViews(Context context, SaintWidgetContent content, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_saint_small);
        applyCommon(context, views, content);
        applySmallSizing(views, manager != null ? manager.getAppWidgetOptions(appWidgetId) : null, content);
        return views;
    }

    private static void applyCommon(Context context, RemoteViews views, SaintWidgetContent content) {
        views.setInt(R.id.widget_bg, "setColorFilter", content.backgroundColor);
        views.setTextViewText(R.id.widget_saint_name, content.name);
        views.setTextViewText(R.id.widget_saint_bio, content.bio);
        views.setTextColor(R.id.widget_saint_name, content.titleTextColor);
        views.setTextColor(R.id.widget_saint_bio, content.bodyTextColor);
        views.setInt(R.id.widget_saint_name, "setMaxLines", getNameMaxLines(content.name));
        views.setInt(R.id.widget_saint_bio, "setMaxLines", getBioMaxLines(content.bio));
        views.setViewVisibility(
                R.id.widget_saint_bio,
                content.bio == null || content.bio.trim().isEmpty() ? View.GONE : View.VISIBLE
        );

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

    private static Bitmap cropToAspectWithBias(Bitmap src, float targetAspect, float horizontalBias, float verticalBias) {
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
            int maxX = Math.max(0, w - cropW);
            float clampedHorizontalBias = Math.max(0f, Math.min(1f, horizontalBias));
            x = Math.round(maxX * clampedHorizontalBias);
        } else {
            cropH = Math.round(w / targetAspect);
            int maxY = Math.max(0, h - cropH);
            float clampedVerticalBias = Math.max(0f, Math.min(1f, verticalBias));
            y = Math.round(maxY * clampedVerticalBias);
        }

        try {
            return Bitmap.createBitmap(src, x, y, cropW, cropH);
        } catch (Exception ignored) {
            return src;
        }
    }

    private static int getNameMaxLines(String name) {
        int length = name != null ? name.trim().length() : 0;
        return length > 34 ? 2 : 1;
    }

    private static int getBioMaxLines(String bio) {
        int length = bio != null ? bio.trim().length() : 0;
        if (length <= 0) return 1;
        if (length <= 90) return 2;
        if (length <= 160) return 3;
        return 4;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static int estimateLineCount(String text, int charsPerLine) {
        if (!hasText(text)) return 0;
        int safeCharsPerLine = Math.max(6, charsPerLine);
        String[] rawLines = text.split("\\r?\\n");
        int total = 0;
        for (String rawLine : rawLines) {
            String line = rawLine != null ? rawLine.trim() : "";
            if (line.isEmpty()) {
                total += 1;
                continue;
            }
            total += Math.max(1, (int) Math.ceil((double) line.length() / (double) safeCharsPerLine));
        }
        return total;
    }

    private static void applySmallSizing(RemoteViews views, Bundle options, SaintWidgetContent content) {
        int minWidthDp = options != null
                ? Math.max(140, options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 140))
                : 140;
        int minHeightDp = options != null
                ? Math.max(48, options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 48))
                : 48;

        float widthFactor = clamp((minWidthDp - 140f) / 160f, 0f, 1f);
        float heightFactor = clamp((minHeightDp - 48f) / 120f, 0f, 1f);
        boolean compactHeight = minHeightDp < 74;
        boolean hasBio = hasText(content.bio);

        float titleSizeSp = clamp(13f + (widthFactor * 5f) + (heightFactor * 5f), compactHeight ? 8f : 9f, 24f);
        float bioSizeSp = clamp(10f + (widthFactor * 3f) + (heightFactor * 4f), compactHeight ? 7f : 8f, 18f);

        int titleCharsPerLine = Math.max(10, Math.round(minWidthDp / (compactHeight ? 10.5f : 9.5f)));
        int bioCharsPerLine = Math.max(12, Math.round(minWidthDp / (compactHeight ? 8.5f : 7f)));

        int titleLines = clamp(
                estimateLineCount(content.name, titleCharsPerLine),
                1,
                minHeightDp >= 110 ? 4 : 3
        );
        int bioLines = hasBio
                ? clamp(
                        estimateLineCount(content.bio, bioCharsPerLine) + (minHeightDp >= 110 ? 1 : 0),
                        1,
                        minHeightDp >= 110 ? 14 : 10
                )
                : 0;

        views.setTextViewTextSize(R.id.widget_saint_name, TypedValue.COMPLEX_UNIT_SP, titleSizeSp);
        views.setInt(R.id.widget_saint_name, "setMaxLines", Math.max(1, titleLines));

        if (!hasBio) {
            views.setViewVisibility(R.id.widget_saint_bio, View.GONE);
        } else {
            views.setViewVisibility(R.id.widget_saint_bio, View.VISIBLE);
            views.setTextViewTextSize(R.id.widget_saint_bio, TypedValue.COMPLEX_UNIT_SP, bioSizeSp);
            views.setInt(R.id.widget_saint_bio, "setMaxLines", bioLines);
        }
    }

    private static float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(max, value));
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static final class CropBias {
        final float horizontal;
        final float vertical;

        CropBias(float horizontal, float vertical) {
            this.horizontal = horizontal;
            this.vertical = vertical;
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
