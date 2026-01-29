//
//  punchout.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/5/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.Punchout = class {

    static nametagOptions() {
        return [
            Media.NameBadge.Styles.Angles,
            Media.NameBadge.Styles.Paint,
        ];
    }

    static overlayOptions() {
        return [
            LookOverlays.Angles,
            LookOverlays.Paint,
        ];
    }

    static Colors = {
        Angles: {
            tint: "#000000",
        },
        Paint: {
            tint: "#000000",
        }
    }

    static defaultTint() {
        return LooksColors.solidPaintForColor(this.Colors.Angles.tint);
    }

    static tintOptions() {
        return Object.keys(this.Colors).map(key => {
            return LooksColors.solidPaintForColor(this.Colors[key].tint);
        });
    }

    // nametagStyleOptions

    static Preset = new LookPreset("punchout", LocalizedString("Punchout"))
        .setThumbnailUrl("assets/looks/presets/punchout/angles.png")
        .setInitialEditorLayer(LooksLayer.Overlay)
        .setNametagStyle(Media.NameBadge.Styles.Angles)
        .setShapeEditable(false)
        .setNametagStyle(Media.NameBadge.Styles.Angles)
        .setNametagStyleOptions(this.nametagOptions())
        .setBackgroundStyle(Presenter.BackgroundStyle.Show)
        .setTint(this.defaultTint())
        // .setTintOptions(this.tintOptions())
        .setPatternEditable(false)
        .setOverlay(LookOverlays.Angles)
        .setOverlayOptions(this.overlayOptions())
        .setCustomOverlayEnabled(false)
        .setWallpaperEditable(false)
        .addVariant({
            id: "angles",
            name: LocalizedString("Angles"),
            thumbnailUrl: "assets/looks/presets/punchout/angles.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Angles.tint),
            overlay: LookOverlays.Angles,
            nametagStyle: Media.NameBadge.Styles.Angles,
        })
        .addVariant({
            id: "paint",
            name: LocalizedString("Paint"),
            thumbnailUrl: "assets/looks/presets/punchout/paint.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Paint.tint),
            overlay: LookOverlays.Paint,
            nametagStyle: Media.NameBadge.Styles.Paint,
        });

}
