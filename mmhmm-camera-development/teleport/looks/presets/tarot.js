//
//  tarot.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/22/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.Tarot = class {

    static Overlays = {
        Spiders: new LookOverlay("Spiders", "frame-spiders", "svg.37620.sha1.2353f5539422a0c3c8b7844de25c6fecc55508d4", "assets/looks/presets/tarot").setColorizable(true),
        Bats: new LookOverlay("Bats", "frame-bats", "svg.41636.sha1.0b0daa69a91455c5d303d786fca287f5151e29f4", "assets/looks/presets/tarot").setColorizable(true),
        Stars: new LookOverlay("Stars", "frame-stars", "svg.216694.sha1.defcc7c04045e5cbb63660642ffc6ae9ff124de0", "assets/looks/presets/tarot").setColorizable(true),
        Potions: new LookOverlay("Potions", "frame-potions", "svg.145123.sha1.b3f8ef2359060a8a81a89971668108b11b493d71", "assets/looks/presets/tarot").setColorizable(true),
    };

    static overlayOptions() {
        return Object.values(this.Overlays);
    }

    static Colors = {
        Violet: LooksColors.solidPaintForColor("#809DFF"),
        Green: new Paint.LinearGradient().addStopAt("#000000", 0.5, 0.0).addStopAt("#4AD91A", 0.5, 1.0),
        Purple: new Paint.LinearGradient().addStopAt("#000000", 0.5, 0.0).addStopAt("#7317FF", 0.5, 1.0),
        Yellow: new Paint.LinearGradient().addStopAt("#FFC533", 0.5, 0.25).addStopAt("#000000", 0.5, 1.0),
        Orange: new Paint.LinearGradient().addStopAt("#FF8800", 0.5, 0.25).addStopAt("#000000", 0.5, 1.0)
    };

    static defaultTint() {
        return this.Colors.Purple;
    }

    static tintOptions() {
        return Object.values(this.Colors);
    }

    static logoOptions() {
        return [
            { url: "assets/looks/presets/tarot/tarot-castle.png", title: LocalizedString("Next Topic") },
            { url: "assets/looks/presets/tarot/tarot-cups.png", title: LocalizedString("I Agree") },
            { url: "assets/looks/presets/tarot/tarot-skull.png", title: LocalizedString("Nope") },
            { url: "assets/looks/presets/tarot/tarot-stars.png", title: LocalizedString("Hello") },
        ];
    }

    static Preset = new LookPreset("tarot", LocalizedString("Witchcraft"))
        .setInitialEditorLayer(LooksLayer.Overlay)
        .setThumbnailUrl("assets/looks/presets/tarot/tarot.png")
        .setBrandEditable(false)
        .setShapeEditable(false)
        .setBackgroundStyle(Presenter.BackgroundStyle.Show)
        .setLogoAnchor(Stage.Object.Anchor.CenterLeft)
        .setLogoLayerTitle(LocalizedString("Visual"))
        .setLogoOptions(this.logoOptions())
        .setImportLogosAsVisuals(true)
        .setScaleForVisuals(0.6)
        .setTint(this.defaultTint())
        .setTintOptions(this.tintOptions())
        .setPatternEditable(false)
        .setOverlay(this.Overlays.Potions)
        .setOverlayOptions(this.overlayOptions())
        .setCustomOverlayEnabled(false)
        .setWallpaperEditable(false)
        .addVariant({
            id: "potions",
            name: LocalizedString("Potions"),
            thumbnailUrl: "assets/looks/presets/tarot/potions.png",
            logo: "assets/looks/presets/tarot/tarot-cups.png",
            overlay: this.Overlays.Potions,
            tint: this.Colors.Green,
        })
        .addVariant({
            id: "spiders",
            name: LocalizedString("Spiders"),
            thumbnailUrl: "assets/looks/presets/tarot/spiders.png",
            logo: "assets/looks/presets/tarot/tarot-castle.png",
            overlay: this.Overlays.Spiders,
            tint: this.Colors.Purple,
        })
        .addVariant({
            id: "stars",
            name: LocalizedString("Stars"),
            thumbnailUrl: "assets/looks/presets/tarot/stars.png",
            logo: "assets/looks/presets/tarot/tarot-skull.png",
            overlay: this.Overlays.Stars,
            tint: this.Colors.Yellow,
        })
        .addVariant({
            id: "bats",
            name: LocalizedString("Bats"),
            thumbnailUrl: "assets/looks/presets/tarot/bats.png",
            logo: "assets/looks/presets/tarot/tarot-stars.png",
            overlay: this.Overlays.Bats,
            tint: this.Colors.Orange,
        });
}
