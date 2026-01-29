//
//  spooky.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/22/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.Spooky = class {

    static Patterns = {
        HauntedHouse: new LookPattern(LocalizedString("Haunted House"), "pattern-hauntedhouse", 1, "png.1509225.sha1.7e47ec9a8e67fa6416bd6ad4e940ec228131f440", "assets/looks/presets/spooky").setDefaultOpacity(1),
        Graveyard: new LookPattern(LocalizedString("Graveyard"), "pattern-graveyard", 1, "svg.658592.sha1.f4155ec8f993969b55820b9b38779879e7baad91", "assets/looks/presets/spooky").setDefaultOpacity(1).setColorizable(true),
        HauntedForest: new LookPattern(LocalizedString("Haunted Forest"), "pattern-hauntedforest", 1, "png.1890384.sha1.3e186173af025db67b6b8a0ecb591dabbe6a2e66", "assets/looks/presets/spooky").setDefaultOpacity(1),
        EvilEyes: new LookPattern(LocalizedString("Evil Eyes"), "pattern-nightcreatures", 1, "png.2201003.sha1.6bfd5a26f934b3a517eb78f3ccbef15e7f8a37cb", "assets/looks/presets/spooky").setDefaultOpacity(1),
    };

    static patternOptions() {
        return Object.values(this.Patterns);
    }

    static Overlays = [
        new LookOverlay("Frame 1", "frame1", "svg.5079.sha1.821ad30fe70e103d6cc592ea068d37d52f002e78", "assets/looks/presets/spooky").setColorizable(true),
        new LookOverlay(LocalizedString("Frame 2"), "frame2", "svg.286.sha1.34c66ff484d048f2f4be833584cef06896f5c3ab", "assets/looks/presets/spooky").setColorizable(true),
    ];

    static overlayOptions() {
        return this.Overlays;
    }

    static Colors = {
        Green: "#00D948",
        Blue: "#00D4FF",
        Pink: "#E387FF",
        Yellow: "#FDEE37",
    };

    static defaultTint() {
        return LooksColors.linearGradientPaintForColor(this.Colors.Pink)
    }

    static tintOptions() {
        return Object.keys(this.Colors).map(key => {
            return LooksColors.linearGradientPaintForColor(this.Colors[key]);
        });
    }

    static colorize(color, colorScheme) {
        // Augment the default single color colorization with a darker secondary color
        // by application 10% opacity to each RGB component
        const rgba = ColorHexToRGB(color).slice(0, 3);
        for (let i = 0; i < 3; i++) {
            rgba[i] = rgba[i] * 0.1;
        }
        colorScheme["tint-dark"] = ColorRGBAToHex(rgba);
    }

    static Preset = new LookPreset("spooky", LocalizedString("Spooky"))
        .setInitialEditorLayer(LooksLayer.Pattern)
        .setThumbnailUrl("assets/looks/presets/spooky/spooky.png")
        .setBrandEditable(false)
        .setShapeEditable(false)
        .setBackgroundStyle(Presenter.BackgroundStyle.Blur)
        .setTint(this.defaultTint())
        .setTintOptions(this.tintOptions())
        .setLogoEditable(false)
        .setPattern(this.Patterns.Graveyard)
        .setPatternOptions(this.patternOptions())
        .setCustomPatternEnabled(false)
        .setPatternLayerTitle(LocalizedString("Scene"))
        .setOverlay(this.Overlays[0])
        .setOverlayOptions(this.overlayOptions())
        .setCustomOverlayEnabled(false)
        .setWallpaperEditable(false)
        .setColorizationCallback(this.colorize)
        .addVariant({
            id: "haunted-house",
            name: LocalizedString("Haunted House"),
            thumbnailUrl: "assets/looks/presets/spooky/haunted-house.png",
            pattern: this.Patterns.HauntedHouse,
            tint: LooksColors.linearGradientPaintForColor(this.Colors.Pink),
        })
        .addVariant({
            id: "graveyard",
            name: LocalizedString("Graveyard"),
            thumbnailUrl: "assets/looks/presets/spooky/graveyard.png",
            pattern: this.Patterns.Graveyard,
            tint: LooksColors.linearGradientPaintForColor(this.Colors.Blue),
        })
        .addVariant({
            id: "evil-eyes",
            name: LocalizedString("Evil Eyes"),
            thumbnailUrl: "assets/looks/presets/spooky/evil-eyes.png",
            pattern: this.Patterns.EvilEyes,
            tint: LooksColors.linearGradientPaintForColor(this.Colors.Yellow),
        })
        .addVariant({
            id: "haunted-forest",
            name: LocalizedString("Haunted Forest"),
            thumbnailUrl: "assets/looks/presets/spooky/haunted-forest.png",
            pattern: this.Patterns.HauntedForest,
            tint: LooksColors.linearGradientPaintForColor(this.Colors.Green),
        });

}
