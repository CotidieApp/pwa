package com.capacitorjs.plugins.localnotifications;

import android.content.Context;
import android.graphics.Bitmap;
import android.view.View;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;

/** Keep message text out of BigPictureStyle's single-line summary. */
public final class CotidieNotificationTextLayout {
    private CotidieNotificationTextLayout() {}

    public static void apply(Context context, NotificationCompat.Builder builder,
            String title, String body, Bitmap image) {
        String pkg = context.getPackageName();
        int compactId = context.getResources().getIdentifier("cotidie_notification_compact", "layout", pkg);
        int expandedId = context.getResources().getIdentifier("cotidie_notification_expanded", "layout", pkg);
        int headsUpId = context.getResources().getIdentifier("cotidie_notification_heads_up", "layout", pkg);
        int titleId = context.getResources().getIdentifier("cotidie_notice_title", "id", pkg);
        int bodyId = context.getResources().getIdentifier("cotidie_notice_body", "id", pkg);
        int imageId = context.getResources().getIdentifier("cotidie_notice_image", "id", pkg);
        // Standard BigText remains available if app resources are missing in a different host.
        if (compactId == 0 || expandedId == 0 || headsUpId == 0 || titleId == 0 || bodyId == 0 || imageId == 0) {
            builder.setStyle(new NotificationCompat.BigTextStyle().bigText(body).setBigContentTitle(title));
            return;
        }
        RemoteViews compact = textView(pkg, compactId, titleId, bodyId, title, body);
        RemoteViews expanded = textView(pkg, expandedId, titleId, bodyId, title, body);
        RemoteViews headsUp = textView(pkg, headsUpId, titleId, bodyId, title, body);
        expanded.setViewVisibility(imageId, image == null ? View.GONE : View.VISIBLE);
        if (image != null) expanded.setImageViewBitmap(imageId, image);
        builder.setContentTitle(title).setContentText(body)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setLargeIcon((Bitmap) null)
            .setCustomContentView(compact)
            .setCustomBigContentView(expanded)
            .setCustomHeadsUpContentView(headsUp);
    }

    private static RemoteViews textView(String pkg, int layout, int titleId, int bodyId,
            String title, String body) {
        RemoteViews view = new RemoteViews(pkg, layout);
        view.setTextViewText(titleId, title == null ? "" : title);
        view.setTextViewText(bodyId, body == null ? "" : body);
        view.setViewVisibility(bodyId, body == null || body.isEmpty() ? View.GONE : View.VISIBLE);
        return view;
    }
}
