package com.benjamin.studio.widgets;

public final class SaintWidgetContent {
    public final String name;
    public final String bio;
    public final String imageId;
    public final String imageAssetPath;
    public final int backgroundColor;
    public final int titleTextColor;
    public final int bodyTextColor;

    public SaintWidgetContent(
            String name,
            String bio,
            String imageId,
            String imageAssetPath,
            int backgroundColor,
            int titleTextColor,
            int bodyTextColor
    ) {
        this.name = name;
        this.bio = bio;
        this.imageId = imageId;
        this.imageAssetPath = imageAssetPath;
        this.backgroundColor = backgroundColor;
        this.titleTextColor = titleTextColor;
        this.bodyTextColor = bodyTextColor;
    }
}
