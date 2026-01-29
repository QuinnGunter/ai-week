//
//  lumon.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/23/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.Lumon = class {

    static Overlays = {
        Round: new LookOverlay(LocalizedString("Round"), "frame-round", "svg.604.sha1.b28ad713c8be4789a816d3549e63e42ce53124a4", "assets/looks/presets/lumon").setColorizable(true),
        RoundWatermark: new LookOverlay(LocalizedString("Round Watermark"), "frame-round-watermark", "svg.7364.sha1.245aff6ae8682c934525a1e2ca370cce48a8a2c4", "assets/looks/presets/lumon").setColorizable(true),
        Square: new LookOverlay(LocalizedString("Square"), "frame-square", "svg.471.sha1.94afff27ffdeaa39f5739bcad18e9985436d62f4", "assets/looks/presets/lumon").setColorizable(true),
        SquareWatermark: new LookOverlay(LocalizedString("Square Watermark"), "frame-square-watermark", "svg.7231.sha1.f9b683b727072bf5c57b9a6424469d2a40571b10", "assets/looks/presets/lumon").setColorizable(true),
    };

    static Patterns = {
        Dark: new LookPattern(LocalizedString("Dark"), "pattern-dark", 1.0, "png.2771247.sha1.a96c7977bfb95997e9b1aa9433cb98ec575c8584", "assets/looks/presets/lumon").setDefaultOpacity(1),
        Light: new LookPattern(LocalizedString("Light"), "pattern-light", 1.0, "png.2715919.sha1.e75cf66716dccc256c905f7201710347b3a82a40", "assets/looks/presets/lumon").setDefaultOpacity(1),
    };

    static Logos = {
        A: { url: "assets/looks/presets/lumon/logo-a.svg" },
        B: { url: "assets/looks/presets/lumon/logo-b.svg" },
        C: { url: "assets/looks/presets/lumon/logo-c.svg" },
    };

    static Colors = {
        Black: {
            tint: "#0B0705",
            frame: "#FFFCF0",
        },
        Teal: {
            tint: "#99FFF6",
            frame: "#1A374D",
        },
        Blue: {
            tint: "#205CA9",
            frame: "#FAFAFF",
        }
    };

    static defaultTint() {
        return LooksColors.solidPaintForColor(this.Colors.Teal.tint);
    }

    static tintOptions() {
        const colors = this.Colors;
        return Object.keys(colors).map((key) => LooksColors.solidPaintForColor(colors[key].tint));
    }

    static colorize(color, colorScheme) {
        // Augment the default single color colorization with a darker background color
        // For some colors we have a hardcoded darker variant
        const colors = LookPreset.Lumon.Colors;
        const options = Object.keys(colors);
        const match = options.find(key => colors[key].tint == color);
        if (match) {
            const option = colors[match];
            Object.keys(option).forEach(key => colorScheme[key] = option[key]);
        } else {
            // For custom colors, apply opacity to each RGB component to darken it
            const rgba = ColorHexToRGB(color).slice(0, 3);
            for (let i = 0; i < 3; i++) {
                rgba[i] = rgba[i] * 0.5;
            }
            colorScheme["tint"] = color;
            colorScheme["frame"] = ColorRGBAToHex(rgba);
        }
    }


    static Preset = new LookPreset("lumon", LocalizedString("Lumon"))
        .setInitialEditorLayer(LooksLayer.Tint)
        .setThumbnailUrl("assets/looks/presets/lumon/dark.png")
        .setFakeBrandData({
            name: "Lumon Industries",
            iconUrl: "assets/looks/presets/lumon/icon.png",
        })
        .setNametagStyle(Media.NameBadge.Styles.LumonCorp)
        .setNametagVisibleByDefault(true)
        .setDefaultNametagValues({
            title: "Mark S.",
            subtitle: "Macrodata Refinement Chief",
        })
        .setNametagColorizable(true)
        .setShapeEditable(false)
        .setBackgroundStyle(Presenter.BackgroundStyle.Blur)
        .setLogo(this.Logos.A.url)
        .setLogoOptions(Object.values(this.Logos))
        .setLogoAnchor(Stage.Object.Anchor.TopRight)
        .setAnchorInset(50)
        .setLogoScale(0) // 0 means "natural size"
        .setLogoColorizable(true)
        .setTintLayerTitle(LocalizedString("Color"))
        .setTint(this.defaultTint())
        .setTintOptions(this.tintOptions())
        .setOverlay(this.Overlays.Round)
        .setOverlayOptions(Object.values(this.Overlays))
        .setCustomOverlayEnabled(false)
        .setPattern(this.Patterns.Dark)
        .setPatternOptions(Object.values(this.Patterns))
        .setCustomPatternEnabled(false)
        .setWallpaperEditable(false)
        .setColorizationCallback(this.colorize)
        .addVariant({
            id: "dark",
            name: LocalizedString("Dark"),
            thumbnailUrl: "assets/looks/presets/lumon/dark.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Teal.tint),
            logo: this.Logos.A.url,
            overlay: this.Overlays.Round,
            pattern: this.Patterns.Dark,
        })
        .addVariant({
            id: "black",
            name: LocalizedString("Black"),
            thumbnailUrl: "assets/looks/presets/lumon/black.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Black.tint),
            logo: this.Logos.B.url,
            overlay: this.Overlays.SquareWatermark,
            pattern: null,
        })
        .addVariant({
            id: "blue",
            name: LocalizedString("Blue"),
            thumbnailUrl: "assets/looks/presets/lumon/blue.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Blue.tint),
            logo: this.Logos.A.url,
            overlay: this.Overlays.Round,
            pattern: null,
        })
        .addVariant({
            id: "teal",
            name: LocalizedString("Teal"),
            thumbnailUrl: "assets/looks/presets/lumon/teal.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Teal.tint),
            logo: this.Logos.B.url,
            overlay: this.Overlays.SquareWatermark,
            pattern: null,
        });
}
