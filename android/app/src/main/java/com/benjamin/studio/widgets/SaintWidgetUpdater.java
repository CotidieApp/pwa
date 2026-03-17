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
            RemoteViews views = buildSmallViews(context, content);
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

            int radiusPx = dpToPx(context, 24);
            Bitmap rounded = roundTopCorners(cropped, radiusPx);
            if (rounded != cropped) cropped.recycle();

            views.setImageViewBitmap(R.id.widget_saint_image, rounded);
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

    private static Bitmap roundTopCorners(Bitmap src, int radiusPx) {
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
            Path path = new Path();
            path.addRoundRect(rect, new float[] {r, r, r, r, 0f, 0f, 0f, 0f}, Path.Direction.CW);
            canvas.drawPath(path, paint);
            return out;
        } catch (Exception ignored) {
            return src;
        }
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
