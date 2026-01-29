//
//  glow.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/30/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.Glow = class {

    static Patterns = {
        Mist: new LookPattern(LocalizedString("Mist"), "pattern-1", 1, "svg.2938.sha1.4dffa2277d854d4cea7fe0c1cce221a5559bd00a", "assets/looks/presets/glow").setDefaultOpacity(1).setColorizable(true),
        Spotlight: new LookPattern(LocalizedString("Spotlight"), "pattern-2", 1, "svg.2784.sha1.29ad6fb7d017a763e6a9a6382078acada05674dc", "assets/looks/presets/glow").setDefaultOpacity(1).setColorizable(true),
    };

    static Colors = {
        Purple: {
            tint: "#F6E5FF",
            primary: "#3E00FF",
            secondary: "#4D0079",
        },
        Peach: {
            tint: "#FFE5F2",
            primary: "#FFC564",
            secondary: "#A32764",
        },
        Pink: {
            tint: "#E5F9FF",
            primary: "#EB15B5",
            secondary: "#00C8FF",
        },
        Green: {
            tint: "#E5FFF2",
            primary: "#03B8BC",
            secondary: "#00FF80",
        }
    }

    static colorOptions() {
        const colors = this.Colors;
        return Object.keys(colors).map((key) => LooksColors.solidPaintForColor(colors[key].primary));
    }

    static overlayOptions() {
        return [
            LookOverlays.ThinBorder,
            LookOverlays.ThickBorder,
            LookOverlays.Calligraphy,
            LookOverlays.RoundedInset,
            LookOverlays.Rounded,
            LookOverlays.Radius,
            LookOverlays.Bubble,
        ];
    }

    static colorize(color, colorScheme) {
        const colors = LookPreset.Glow.colorSchemeForPrimaryColor(color);
        if (colors) {
            Object.keys(colors).forEach(key => colorScheme[key] = colors[key]);
        } else {
            // TODO figure out how to choose the secondary color
            const rgba = ColorHexToRGB(color).slice(0, 3);
            for (let i = 0; i < 3; i++) {
                rgba[i] = rgba[i] * 0.8;
            }
            colorScheme["tint"] = color;
            colorScheme["secondary"] = ColorRGBAToHex(rgba);
        }
    }

    static getTintColor(color) {
        const colors = LookPreset.Glow.colorSchemeForPrimaryColor(color);
        if (colors) {
            return colors.tint;
        }
        // TODO figure out how to choose the tint color
        return color;
    }

    static colorSchemeForPrimaryColor(color) {
        const colors = LookPreset.Glow.Colors;
        const options = Object.keys(colors);
        const match = options.find(key => colors[key].primary.toUpperCase() == color.toUpperCase());
        if (match) {
            return colors[match];
        }
        return null;
    }

    static Preset = new LookPreset("glow", LocalizedString("Glow"))
        .setInitialEditorLayer(LooksLayer.Pattern)
        .setThumbnailUrl("assets/looks/presets/glow/mystic.png")
        .setNametagStyle(Media.NameBadge.Styles.MysticGlow)
        .setNametagStyleOptions([
            Media.NameBadge.Styles.MysticGlow,
            Media.NameBadge.Styles.SherbertGlow,
        ])
        .setShapeEditable(false)
        .setBackgroundStyle(Presenter.BackgroundStyle.Blur)
        .setTint(LooksColors.solidPaintForColor(this.Colors.Purple.tint))
        .setTintLayerTitle(LocalizedString("Color"))
        .setTintEditable(false)
        .setColor(LooksColors.solidPaintForColor(this.Colors.Purple.primary))
        .setColorOptions(this.colorOptions())
        .setPattern(this.Patterns.Mist)
        .setPatternOptions(Object.values(this.Patterns))
        .setOverlayOptions(this.overlayOptions())
        .setWallpaperEditable(false)
        .setTintColorCallback(this.getTintColor)
        .setColorizationCallback(this.colorize)
        .addVariant({
            id: "purple",
            name: LocalizedString("Purple"),
            thumbnailUrl: "assets/looks/presets/glow/purple.png",
            nametagStyle: Media.NameBadge.Styles.MysticGlow,
            pattern: this.Patterns.Mist,
            tint: LooksColors.solidPaintForColor(this.Colors.Purple.tint),
            color: LooksColors.solidPaintForColor(this.Colors.Purple.primary),
        })
        .addVariant({
            id: "peach",
            name: LocalizedString("Peach"),
            thumbnailUrl: "assets/looks/presets/glow/peach.png",
            nametagStyle: Media.NameBadge.Styles.MysticGlow,
            pattern: this.Patterns.Spotlight,
            tint: LooksColors.solidPaintForColor(this.Colors.Peach.tint),
            color: LooksColors.solidPaintForColor(this.Colors.Peach.primary),
        })
        .addVariant({
            id: "pink",
            name: LocalizedString("Aqua"),
            thumbnailUrl: "assets/looks/presets/glow/pink.png",
            nametagStyle: Media.NameBadge.Styles.MysticGlow,
            pattern: this.Patterns.Spotlight,
            tint: LooksColors.solidPaintForColor(this.Colors.Pink.tint),
            color: LooksColors.solidPaintForColor(this.Colors.Pink.primary),
        })
        .addVariant({
            id: "green",
            name: LocalizedString("Green"),
            thumbnailUrl: "assets/looks/presets/glow/green.png",
            nametagStyle: Media.NameBadge.Styles.MysticGlow,
            pattern: this.Patterns.Mist,
            tint: LooksColors.solidPaintForColor(this.Colors.Green.tint),
            color: LooksColors.solidPaintForColor(this.Colors.Green.primary),
        });

}
