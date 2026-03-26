package com.benjamin.studio.widgets;

public final class SaintWidgetContent {
    public final String name;
    public final String bio;
    public final String prayerId;
    public final String imageId;
    public final String imageAssetPath;
    public final String overlayImageAssetPath;
    public final int backgroundColor;
    public final int titleTextColor;
    public final int bodyTextColor;

    public SaintWidgetContent(
            String name,
            String bio,
            String prayerId,
            String imageId,
            String imageAssetPath,
            String overlayImageAssetPath,
            int backgroundColor,
            int titleTextColor,
            int bodyTextColor
    ) {
        this.name = name;
        this.bio = bio;
        this.prayerId = prayerId;
        this.imageId = imageId;
        this.imageAssetPath = imageAssetPath;
        this.overlayImageAssetPath = overlayImageAssetPath;
        this.backgroundColor = backgroundColor;
        this.titleTextColor = titleTextColor;
        this.bodyTextColor = bodyTextColor;
    }
}
