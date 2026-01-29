//
//  holiday.js
//  mmhmm
//
//  Created by Seth Hitchings on 12/8/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.Holiday = class {

    static Colors = {
        Red: "#8A0000",
        DarkBlue: "#01293A",
        Green: "#047451",
        LightBlue: "#3B79B6",
    };

    static tintOptions() {
        const colors = this.Colors;
        return Object.keys(colors).map((key) => LooksColors.solidPaintForColor(colors[key]));
    }

    static Overlays = {
        Snowflakes: new LookOverlay(LocalizedString("Snowflakes"), "frame-snowflakes", "svg.107620.sha1.f7f74ff419bca8f8e8a046e73731c22324107e43", "assets/looks/presets/holiday").setColorizable(true),
        Reindeer: new LookOverlay(LocalizedString("Reindeer"), "frame-reindeer", "svg.191100.sha1.42556620557439721547e9ab92546057bc65aff5", "assets/looks/presets/holiday").setColorizable(true),
        Diamonds: new LookOverlay(LocalizedString("Diamonds"), "frame-diamonds", "svg.215014.sha1.e0310b0615a28b8e207977566ded594fbce9f5e7", "assets/looks/presets/holiday").setColorizable(true),
        Ribbon: new LookOverlay(LocalizedString("Ribbon"), "frame-ribbon", "svg.189011.sha1.b8afe757de2ae3d9078efc49831ac905b2557d43", "assets/looks/presets/holiday").setColorizable(true),
    };

    static overlayOptions() {
        return Object.values(this.Overlays);
    }

    static Preset = new LookPreset("holiday-stitch", LocalizedString("Stitch"))
        .setInitialEditorLayer(LooksLayer.Tint)
        .setThumbnailUrl("assets/looks/presets/holiday/red.png")
        .setNametagStyle(Media.NameBadge.Styles.HolidayCraft)
        .setNametagVisibleByDefault(true)
        .setNametagColorizable(true)
        .setNametagColorizationCallback(this.colorizeNametag)
        .setDefaultNametagValues({
            title: LocalizedString("Kris Kringle"),
            subtitle: LocalizedString("The North Pole"),
        })
        .setShapeEditable(false)
        .setBackgroundStyle(Presenter.BackgroundStyle.Visible)
        .setTintLayerTitle(LocalizedString("Color"))
        .setTint(LooksColors.solidPaintForColor(this.Colors.Red))
        .setTintOptions(this.tintOptions())
        .setOverlay(this.Overlays.Reindeer)
        .setOverlayOptions(this.overlayOptions())
        .setCustomOverlayEnabled(false)
        .setWallpaperEditable(false)
        .setPatternEditable(false)
        .addVariant({
            id: "red",
            name: LocalizedString("Red"),
            thumbnailUrl: "assets/looks/presets/holiday/red.png",
            tint: new Paint.Color(this.Colors.Red),
            overlay: this.Overlays.Reindeer,
        })
        .addVariant({
            id: "light-blue",
            name: LocalizedString("Blue"),
            thumbnailUrl: "assets/looks/presets/holiday/light-blue.png",
            tint: new Paint.Color(this.Colors.LightBlue),
            overlay: this.Overlays.Ribbon,
        });

    /**
     * @param {Paint} paint
     * @param {Media.NameBadge} nametag
     */
    static colorizeNametag(paint, nametag) {
        const tint = LooksColors.primaryColorFromPaint(paint);
        const gradient = new Paint.LinearGradient()
            .addStopAt("rgba(255,255,255,0)", 0.5, 0)
            .addStopAt(tint, 0.5, 1);
        LooksNameBadgeHandler.updateNameBadgeMediaColor(nametag, "secondary", gradient);
    }
}
