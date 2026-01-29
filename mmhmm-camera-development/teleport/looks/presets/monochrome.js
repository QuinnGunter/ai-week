//
//  monochrome.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/22/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.Monochrome = class {

    static Overlays = {
        Proportional: new LookOverlay(LocalizedString("Proportional"), "frame-proportional", "svg.460.sha1.78290d23a4f815a54d9408e985e1de4bef3c8255", "assets/looks/presets/monochrome").setColorizable(true),
        ProportionalSunburst: new LookOverlay(LocalizedString("Proportional Sunburst"), "frame-proportional-sunburst", "svg.16911.sha1.c39bc5a92afb54edbe89bf0d18391efb4f96520b", "assets/looks/presets/monochrome").setColorizable(true),
        ProportionalLines: new LookOverlay(LocalizedString("Proportional Lines"), "frame-proportional-lines", "svg.3538.sha1.355c528588a354f6204aa88c57430a75fd98ed6d", "assets/looks/presets/monochrome").setColorizable(true),
        ProportionalGlobe: new LookOverlay(LocalizedString("Proportional Globe"), "frame-proportional-globe", "svg.15237.sha1.9d8cd7970c145a8ccc86eda905869a043d10964e", "assets/looks/presets/monochrome").setColorizable(true),
        Heavy: new LookOverlay(LocalizedString("Heavy"), "frame-heavy", "svg.459.sha1.a02b1e70037f8fc7a425fe1741a3efd2d2cdb2c6", "assets/looks/presets/monochrome").setColorizable(true),
        HeavySunburst: new LookOverlay(LocalizedString("Heavy Sunburst"), "frame-heavy-sunburst", "svg.8721.sha1.046cf174f3cbcce871826df7fbc41effe93d6dfc", "assets/looks/presets/monochrome").setColorizable(true),
        HeavyLines: new LookOverlay(LocalizedString("Heavy Lines"), "frame-heavy-lines", "svg.1637.sha1.2ece3a4b086cd3ddef93a9abfe4fcbe5c2646d26", "assets/looks/presets/monochrome").setColorizable(true),
        HeavyGlobe: new LookOverlay(LocalizedString("Heavy Globe"), "frame-heavy-globe", "svg.7509.sha1.a588244a2d1af5e56d91a27a41314ef662e58656", "assets/looks/presets/monochrome").setColorizable(true),
    };

    static Colors = {
        GrayOlive: {
            tint: "#AAA795",
            accent: "#555746",
            nametag: "#EFEFD3"
        },
        Olive: {
            tint: "#838570",
            accent: "#555746",
            nametag: "#C7D06F"
        },
        Submarine: {
            tint: "#BAC7C6",
            accent: "#778887",
            nametag: "#FFFFFF",
        },
        Aloe: {
            tint: "#83ADA3",
            accent: "#4A766B",
            nametag: "#B2EDDF",
        },
        Slate: {
            tint: "#637488",
            accent: "#321A06",
            nametag: "#C0DBFC",
        },
        Pink: {
            tint: "#706472",
            accent: "#321A06",
            nametag: "#CFBED2",
        },
        Ochre: {
            tint: "#895123",
            accent: "#321A06",
            nametag: "#F8C59C",
        },
    }

    static defaultTint() {
        return LooksColors.solidPaintForColor(this.Colors.GrayOlive.tint);
    }

    static tintOptions() {
        return Object.keys(this.Colors).map(key => {
            return LooksColors.solidPaintForColor(this.Colors[key].tint);
        });
    }

    static colorSchemeForTint(tint) {
        const colors = LookPreset.Monochrome.Colors;
        const options = Object.keys(colors);
        const match = options.find(key => colors[key].tint == tint.toUpperCase());
        return match ? colors[match] : null;
    }

    static customAccentColor(tint) {
        // For custom colors, apply 90% opacity to each RGB component to darken it
        const rgba = ColorHexToRGB(tint).slice(0, 3);
        for (let i = 0; i < 3; i++) {
            rgba[i] = rgba[i] * 0.8;
        }
        return ColorRGBAToHex(rgba);
    }

    /**
     * @param {String} tint
     * @param {Object} colorScheme
     */
    static colorizeImage(tint, colorScheme) {
        // Augment the default single color colorization with a darker secondary color
        // For some colors we have a hardcoded darker variant
        const colors = LookPreset.Monochrome.colorSchemeForTint(tint);
        const color = colors ? colors.accent : LookPreset.Monochrome.customAccentColor(tint);
        colorScheme["tint-dark"] = color;
    }

    static customTextColor(tint) {
        // Given a custom tint color, choose a text color that will allow the name tag
        // to stand out against the background.
        const brightness = LooksColors.getBrightness(tint);
        if (brightness > 128) {
            // Dark text for light backgrounds
            return LooksColors.adjustBrightness(tint, -75);
        } else {
            // Light text for dark backgrounds
            return LooksColors.adjustBrightness(tint, 75);
        }
    }

    /**
     * @param {Paint} paint
     * @param {Media.NameBadge} nametag
     */
    static colorizeNametag(paint, nametag) {
        const tint = LooksColors.primaryColorFromPaint(paint);
        const colors = LookPreset.Monochrome.colorSchemeForTint(tint);
        const color = colors ? colors.nametag : LookPreset.Monochrome.customTextColor(tint);
        LooksNameBadgeHandler.updateNameBadgeMediaColor(nametag, "primary", color);
    }

    static Preset = new LookPreset("monochrome", LocalizedString("Monochrome"))
        .setThumbnailUrl("assets/looks/presets/monochrome/gray-olive.png")
        .setNametagStyle(Media.NameBadge.Styles.Monochrome)
        .setNametagVisibleByDefault(true)
        .setNametagColorizable(true)
        .setNametagColorizationCallback(this.colorizeNametag)
        .setShowNametagBehindPresenter(true)
        .setColorizationCallback(this.colorizeImage)
        .setInitialEditorLayer(LooksLayer.Tint)
        .setShapeEditable(false)
        .setBackgroundStyle(Presenter.BackgroundStyle.Blur)
        .setTintLayerTitle(LocalizedString("Color"))
        .setTint(this.defaultTint())
        .setTintOptions(this.tintOptions())
        .setPatternEditable(false)
        .setOverlay(this.Overlays.Proportional)
        .setOverlayOptions(Object.values(this.Overlays))
        .setCustomOverlayEnabled(false)
        .setWallpaperEditable(false)
        .addVariant({
            id: "gray-olive",
            name: LocalizedString("Gray Olive"),
            thumbnailUrl: "assets/looks/presets/monochrome/gray-olive.png",
            tint: LooksColors.solidPaintForColor(this.Colors.GrayOlive.tint),
        })
        .addVariant({
            id: "submarine",
            name: LocalizedString("Submarine"),
            thumbnailUrl: "assets/looks/presets/monochrome/submarine.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Submarine.tint),
            overlay: this.Overlays.ProportionalGlobe,
        })
        .addVariant({
            id: "aloe",
            name: LocalizedString("Aloe"),
            thumbnailUrl: "assets/looks/presets/monochrome/aloe.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Aloe.tint),
            overlay: this.Overlays.Heavy,
        })
        .addVariant({
            id: "slate",
            name: LocalizedString("Slate"),
            thumbnailUrl: "assets/looks/presets/monochrome/slate.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Slate.tint),
            overlay: this.Overlays.HeavySunburst,
        });

}
