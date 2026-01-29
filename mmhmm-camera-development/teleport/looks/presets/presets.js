//
//  presets.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/7/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

const LookPresets = class {

    static Blank = new LookPreset("blank", LocalizedString("Blank")).setAutomaticallyEnterEditor();

    static Branded = new LookPreset("branded", LocalizedString("Branded"))
        .setShapeEditable(false)
        .setOverlayOptions([
            LookOverlays.ThinBorder,
            LookOverlays.ThickBorder,
            LookOverlays.Rounded,
            LookOverlays.Calligraphy,
            LookOverlays.Bubble,
            LookOverlays.Spotlight,
            LookOverlays.HexGrid,
            LookOverlays.BuildingBlocks,
        ])
        .setWallpaperEditable(false)
        .addVariant({
            id: "airtime",
            name: "Airtime",
            brandDomain: "airtimetools.com",
            logo: "assets/looks/logos/airtime.png",
            tint: LooksColors.linearGradientPaintForColor("#6FBFC8"),
            pattern: LookPatterns.DotsOffset,
            overlay: LookOverlays.Rounded,
        })
        .addVariant({
            id: "ted",
            brandDomain: "ted.com",
            name: "TED",
            thumbnailUrl: "assets/looks/presets/branded-ted.png",
            logo: "assets/looks/logos/ted.png",
            pattern: LookPatterns.Grid,
            overlay: LookOverlays.ThickBorder,
            tint: LooksColors.linearGradientPaintForColor("#e62b1e"),
        })
        .addVariant({
            id: "nasa",
            brandDomain: "nasa.gov",
            name: "NASA",
            thumbnailUrl: "assets/looks/presets/branded-nasa.png",
            logo: "assets/looks/logos/nasa.png",
            pattern: null,
            overlay: LookOverlays.HexGrid,
            tint: LooksColors.linearGradientPaintForColor("#428BCA"),
        })
        .addVariant({
            id: "custom",
            name: LocalizedString("Use your own brand"),
            automaticallyEnterEditor: true,
        });

    static Wallpaper = new LookPreset("wallpaper", LocalizedString("Virtual Background"))
        .setInitialEditorLayer(LooksLayer.Wallpaper)
        .setShapeEditable(false)
        .setBackgroundStyle(Presenter.BackgroundStyle.Hide)
        .setBackgroundStyleEditable(false)
        .setTintEditable(false)
        .setPattern(LookPatterns.Japanese)
        .setWallpaper(LookWallpapers.Nebula)
        .setWallpaperNoneEnabled(false)
        .addVariant({
            id: "nebula",
            name: LocalizedString("Nebula"),
            pattern: LookPatterns.Japanese,
            wallpaper: LookWallpapers.Nebula,
        })
        .addVariant({
            id: "autumn",
            name: LocalizedString("Autumn Woods View"),
            pattern: null,
            thumbnailUrl: "assets/looks/presets/wallpaper-view.png",
            wallpaper: LookWallpapers.AutumnWoodsView,
        })
        .addVariant({
            id: "ripple",
            name: LocalizedString("Ripple"),
            pattern: null,
            thumbnailUrl: "assets/looks/presets/wallpaper-ripple.png",
            wallpaper: LookWallpapers.Ripple,
        })
        .addVariant({
            id: "morning-sun",
            name: LocalizedString("Morning Sun"),
            pattern: null,
            overlay: LookOverlays.ThinBorder,
            thumbnailUrl: "assets/looks/presets/wallpaper-morning-sun.png",
            wallpaper: LookWallpapers.MorningSun,
        });

    static Circle = new LookPreset("circle", LocalizedString("Circle"))
        .setInitialEditorLayer(LooksLayer.Wallpaper)
        .setShape(Presenter.Shape.Circle)
        .setShapeEditable(false)
        .setPattern(LookPatterns.Dots)
        .setOverlay(LookOverlays.Bubble)
        .setOverlayOptions(CircleOverlays)
        .setWallpaper(LookWallpapers.Sunset)
        .setWallpaperNoneEnabled(false)
        .addVariant({
            id: "cosmic-glow",
            name: LocalizedString("Burst"),
            pattern: null,
            overlay: CircleOverlays[3], // Burst
            thumbnailUrl: "assets/looks/presets/circle-burst.png",
            wallpaper: LookWallpapers.CosmicGlow,
        })
        .addVariant({
            id: "kaleidoscope-blur",
            name: LocalizedString("Bubble"),
            overlay: LookOverlays.Bubble,
            thumbnailUrl: "assets/looks/presets/circle-bubble.png",
            wallpaper: LookWallpapers.KaleideoscopeBlur,
        })
        .addVariant({
            id: "sunset",
            name: LocalizedString("Ring"),
            pattern: null,
            overlay: CircleOverlays[1], // Ring
            thumbnailUrl: "assets/looks/presets/circle-ring.png",
            wallpaper: LookWallpapers.Sunset,
        })
        .addVariant({
            id: "heatwave",
            name: LocalizedString("Spiral"),
            pattern: null,
            overlay: CircleOverlays[2], // Spiral
            thumbnailUrl: "assets/looks/presets/circle-spiral.png",
            wallpaper: LookWallpapers.Heatwave,
        });

    // The set of preset options we show as choices in the UI
    static Standard() {
        return [
            LookPreset.Tinted.Preset,
            LookPreset.Monochrome.Preset,
            LookPreset.Glow.Preset,
            LookPresets.Branded,
            // LookPreset.BlackAndWhite.Preset,
            LookPresets.Wallpaper,
            // LookPreset.Punchout.Preset,
            LookPresets.Circle,
            // LookPreset.Hex.Preset,
        ];
    }

    /**
     * The set of seasonal Halloween presets
     * @returns {LookPreset[]}
     */
    static Halloween() {
        return [
            LookPreset.Spooky.Preset,
            LookPreset.Tarot.Preset,
        ]
    }

    static FictionalBrands() {
        return [
            LookPreset.DunderMifflin.Preset,
            LookPreset.Lumon.Preset,
            LookPreset.Dune.Preset,
            LookPreset.Zissou.Preset,
        ];
    }

    static FictionalBrandData() {
        return [
            {
                domain: "dunder-mifflin.com",
                name: "Dunder Mifflin",
                icon: "assets/looks/presets/dunder-mifflin/icon.png",
                preset: LookPreset.DunderMifflin.Preset,
            },
            {
                domain: "lumon.industries",
                name: "Lumon Industries",
                icon: "assets/looks/presets/lumon/icon.png",
                preset: LookPreset.Lumon.Preset,
            },
            {
                domain: "zissou-society.com",
                name: "The Zissou Society",
                icon: "assets/looks/presets/zissou/icon.png",
                preset: LookPreset.Zissou.Preset,
            },
        ];
    }

    // All presets that exist
    static All() {
        return [
            ...LookPresets.Standard(),
            ...LookPresets.FictionalBrands(),
            LookPreset.Holiday.Preset,
            LookPresets.Blank
        ];
    }

    /**
     * @param {String} id
     * @returns {LookPreset|null}
     */
    static presetWithId(id) {
        return LookPresets.All().find(preset => preset.id === id);
    }

}
