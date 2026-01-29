//
//  dune.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/23/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.Dune = class {

    static Overlays = {
        Wave: new LookOverlay(LocalizedString("Wave"), "frame-wave", "svg.255981.sha1.dde67be642dc14412b9b2ebef35ac6a22f3d07a0", "assets/looks/presets/dune").setColorizable(true),
        Bar: new LookOverlay(LocalizedString("Bar"), "frame-bar", "svg.153301.sha1.ba22f67366b98e36223872480ba98f759b9382ae", "assets/looks/presets/dune").setColorizable(true),
        Window: new LookOverlay(LocalizedString("Window"), "frame-window", "svg.207842.sha1.6840e9c6b064e43abd296858e12af9013341ae0c", "assets/looks/presets/dune").setColorizable(true),
        WaveBadge: new LookOverlay(LocalizedString("Wave & Houses"), "frame-wave-badge", "svg.260641.sha1.52788d304dbedc08e43d2b689f3f27a4f0e60b6c", "assets/looks/presets/dune").setColorizable(true),
        BarBadge: new LookOverlay(LocalizedString("Bar & Houses"), "frame-bar-badge", "svg.157966.sha1.1a9f110d5c83ca718e17842085f4955b53ab9f84", "assets/looks/presets/dune").setColorizable(true),
        WindowBadge: new LookOverlay(LocalizedString("Window & Houses"), "frame-window-badge", "svg.212622.sha1.c5459117b6304d17fdf89995ba96d5534cd15a2d", "assets/looks/presets/dune").setColorizable(true),
    };

    static Logos = {
        Atreides: { url: "assets/looks/presets/dune/logo-atreides.svg" },
        Harkonnen: { url: "assets/looks/presets/dune/logo-harkonnen.svg" },
        Corrino: { url: "assets/looks/presets/dune/logo-corrino.svg" },
    };

    static Colors = {
        Gray: {
            tint: "#E3E3E3",
            frame: "#CBCBCB",
            logoForeground: "#CBCBCB",
            logoBackground: "#797676",
            badge: "#000000",
        },
        Green: {
            tint: "#A0C394",
            frame: "#789F6E",
            logoForeground: "#789F6E",
            logoBackground: "#324A2C",
            badge: "#FFFFFF",
        },
        Blue: {
            tint: "#51C9CD",
            frame: "#41A3A6",
            logoForeground: "#4BB9BD",
            logoBackground: "#2A6B6D",
            badge: "#FFFFFF",
        },
        Orange: {
            tint: "#F9A773",
            frame: "#F17424",
            logoForeground: "#F7975A",
            logoBackground: "#AF5922",
            badge: "#FFFFFF",
        },
        Sand: {
            tint: "#E9CCA3",
            frame: "#DBCBB4",
            logoForeground: "#DBCBB4",
            logoBackground: "#947D5D",
            badge: "#000000",
        },
        Brown: {
            tint: "#D7BC96",
            frame: "#936F3D",
            logoForeground: "#C6AD8A",
            logoBackground: "#73501C",
            badge: "#FFFFFF",
        },
        Black: {
            tint: "#7B7F6D",
            frame: "#1E1E1E",
            logoForeground: "#949292",
            logoBackground: "#000000",
            badge: "#FFFFFF",
        },
        DarkBlue: {
            tint: "#4EC4C9",
            frame: "#23555E",
            logoForeground: "#5C99A2",
            logoBackground: "#204C54",
            badge: "#FFFFFF",
        },
        OrangeSand: {
            tint: "#D86920",
            frame: "#E5DACB",
            logoForeground: "#E5DACB",
            logoBackground: "#A89680",
            badge: "#000000",
        },
    };

    static defaultTint() {
        return LooksColors.solidPaintForColor(this.Colors.OrangeSand.tint);
    }

    static tintOptions() {
        const colors = this.Colors;
        const keys = Object.keys(colors);
        return keys.map((key) => {
            const color = colors[key];
            return LooksColors.solidPaintForColor(color.tint);
        });
    }

    /**
     * @param {String} tint
     */
    static colorSchemeForTint(tint) {
        const colors = LookPreset.Dune.Colors;
        const options = Object.keys(colors);
        const match = options.find(key => colors[key].tint == tint.toUpperCase());
        return match ? colors[match] : null;
    }

    static colorize(tint, colorScheme) {
        // Augment the default single color colorization with a darker background color
        // For some colors we have a hardcoded darker variant
        const colors = LookPreset.Dune.colorSchemeForTint(tint);
        if (colors) {
            Object.keys(colors).forEach(key => colorScheme[key] = colors[key]);
        } else {
            // For custom colors, apply opacity to each RGB component to darken it
            const rgba = ColorHexToRGB(tint).slice(0, 3);
            for (let i = 0; i < 3; i++) {
                rgba[i] = rgba[i] * 0.5;
            }
            colorScheme["tint"] = tint;
            colorScheme["frame"] = ColorRGBAToHex(rgba);
            colorScheme["logoForeground"] = tint;
            colorScheme["logoBackground"] = ColorRGBAToHex(rgba);
            colorScheme["badge"] = "#FFFFFF";
        }
    }

    /**
     * @param {Paint} paint
     * @param {Media.NameBadge} nametag
     */
    static colorizeNametag(paint, nametag) {
        const tint = LooksColors.primaryColorFromPaint(paint);
        const colors = LookPreset.Dune.colorSchemeForTint(tint);
        const color = colors ? colors.badge : "#FFFFFF";
        LooksNameBadgeHandler.updateNameBadgeMediaColor(nametag, "primary", color);
    }

    static Preset = new LookPreset("dune", LocalizedString("Dune"))
        .setInitialEditorLayer(LooksLayer.Tint)
        .setThumbnailUrl("assets/looks/presets/dune/orange-sand.png")
        .setFakeBrandData({
            name: "House of Atreides",
            iconUrl: "assets/looks/presets/dune/icon.png",
        })
        .setNametagStyle(Media.NameBadge.Styles.Dune)
        .setNametagVisibleByDefault(true)
        .setDefaultNametagValues({
            title: LocalizedString("Paul Atreides"),
            subtitle: LocalizedString("Duke"),
        })
        .setNametagColorizable(true)
        .setShapeEditable(false)
        .setBackgroundStyle(Presenter.BackgroundStyle.Show)
        .setLogo(this.Logos.Atreides.url)
        .setLogoOptions(Object.values(this.Logos))
        .setLogoAnchor(Stage.Object.Anchor.TopRight)
        .setLogoColorizable(true)
        .setAnchorInset(0)
        .setLogoScale(0) // Use natural size
        .setTintLayerTitle(LocalizedString("Color"))
        .setTint(this.defaultTint())
        .setTintOptions(this.tintOptions())
        .setPatternEditable(false)
        .setOverlay(this.Overlays.Wave)
        .setOverlayOptions(Object.values(this.Overlays))
        .setCustomOverlayEnabled(false)
        .setWallpaperEditable(false)
        .setColorizationCallback(this.colorize)
        .setNametagColorizationCallback(this.colorizeNametag)
        .addVariant({
            id: "orange-sand",
            name: LocalizedString("Atreides"),
            thumbnailUrl: "assets/looks/presets/dune/orange-sand.png",
            tint: LooksColors.solidPaintForColor(this.Colors.OrangeSand.tint),
            overlay: this.Overlays.Wave,
            logo: this.Logos.Atreides.url,
        })
        .addVariant({
            id: "sand",
            name: LocalizedString("Harkonnen"),
            thumbnailUrl: "assets/looks/presets/dune/black.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Black.tint),
            overlay: this.Overlays.WindowBadge,
            logo: this.Logos.Harkonnen.url,
        });
}
