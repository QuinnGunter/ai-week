//
//  zissou.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/22/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.Zissou = class {

    static Overlays = {
        Team: new LookOverlay(LocalizedString("Team Zissou"), "frame-team", "svg.419995.sha1.825a6c8f86c697571ed138d7e2e7fa92296c777e", "assets/looks/presets/zissou").setColorizable(true),
        Society: new LookOverlay(LocalizedString("Zissou Society"), "frame-society", "svg.598.sha1.5351a21ae6f0120733ebc81d60047b3b7ad6d221", "assets/looks/presets/zissou").setColorizable(true),
    }

    static Logos = {
        Team: { url: "assets/looks/presets/zissou/logo-team.svg" },
        Society: { url: "assets/looks/presets/zissou/logo-society.svg" },
    }

    static Colors = {
        Gray: {
            tint: "#CCCCCC",
            accent: "#4E5B60",
            background: "#5B7275",
            foreground: "#010B13",
        },
        Navy: {
            tint: "#57AEEF",
            accent: "#006B95",
            background: "#0C3A5C",
            foreground: "#57AEEF",
        },
        Teal: {
            tint: "#42E4FF",
            accent: "#03A9C5",
            background: "#0090A8",
            foreground: "#032945",
        }
    }

    static tintOptions() {
        const colors = this.Colors;
        const keys = Object.keys(colors);
        return keys.map((key) => {
            const color = colors[key];
            return LooksColors.solidPaintForColor(color.tint);
        });
    }

    static Preset = new LookPreset("zissou", LocalizedString("The Zissou Society"))
        .setInitialEditorLayer(LooksLayer.Tint)
        .setThumbnailUrl("assets/looks/presets/zissou/society-navy.png")
        .setFakeBrandData({
            name: "The Zissou Society",
            iconUrl: "assets/looks/presets/zissou/icon.png",
        })
        .setNametagStyle(Media.NameBadge.Styles.Zissou)
        .setNametagVisibleByDefault(true)
        .setDefaultNametagValues({
            title: LocalizedString("Steve Zissou"),
            subtitle: LocalizedString("Oceanographer"),
        })
        .setShapeEditable(false)
        .setBackgroundStyle(Presenter.BackgroundStyle.Show)
        .setLogo(this.Logos.Society.url)
        .setLogoAnchor(Stage.Object.Anchor.TopLeft)
        .setAnchorInset(50)
        .setLogoScale(0)
        .setLogoColorizable(true)
        .setLogoOptions(Object.values(this.Logos))
        .setTintLayerTitle(LocalizedString("Color"))
        .setTint(LooksColors.solidPaintForColor(this.Colors.Navy.tint))
        .setTintOptions(this.tintOptions())
        .setPatternEditable(false)
        .setOverlay(this.Overlays.Society)
        .setOverlayOptions(Object.values(this.Overlays))
        .setCustomOverlayEnabled(false)
        .setWallpaperEditable(false)
        .setColorizationCallback(this.colorize)
        .addVariant({
            id: "society-navy",
            name: LocalizedString("Navy Window"),
            thumbnailUrl: "assets/looks/presets/zissou/society-navy.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Navy.tint),
            logo: this.Logos.Society.url,
            overlay: this.Overlays.Society,
        })
        // .addVariant({
        //     id: "society-gray",
        //     name: LocalizedString("Gray Window"),
        //     thumbnailUrl: "assets/looks/presets/zissou/society-gray.png",
        //     tint: LooksColors.solidPaintForColor(this.Colors.Gray.tint),
        //     logo: this.Logos.Society.url,
        //     overlay: this.Overlays.Society,
        // })
        // .addVariant({
        //     id: "team-navy",
        //     name: LocalizedString("Navy Waves"),
        //     thumbnailUrl: "assets/looks/presets/zissou/team-navy.png",
        //     tint: LooksColors.solidPaintForColor(this.Colors.Navy.tint),
        //     logo: this.Logos.Team.url,
        //     overlay: this.Overlays.Team,
        // })
        .addVariant({
            id: "team-gray",
            name: LocalizedString("Gray Waves"),
            thumbnailUrl: "assets/looks/presets/zissou/team-gray.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Gray.tint),
            logo: this.Logos.Team.url,
            overlay: this.Overlays.Team,
        })

    static colorize(color, colorScheme) {
        // Augment the default single color colorization with a darker background color
        // For some colors we have a hardcoded darker variant
        const colors = LookPreset.Zissou.Colors;
        const options = Object.keys(colors);
        const match = options.find(key => colors[key].tint == color);
        if (match) {
            const option = colors[match];
            Object.keys(option).forEach(key =>  colorScheme[key] = option[key]);
        } else {
            // For custom colors, apply 90% opacity to each RGB component to darken it
            const rgba = ColorHexToRGB(color).slice(0, 3);
            for (let i = 0; i < 3; i++) {
                rgba[i] = rgba[i] * 0.8;
            }
            colorScheme["tint"] = color;
            colorScheme["accent"] = color;
            colorScheme["foreground"] = "#000000";
            colorScheme["background"] = ColorRGBAToHex(rgba);
        }
    }

}
