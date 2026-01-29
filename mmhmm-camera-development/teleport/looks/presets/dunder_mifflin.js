//
//  dunder_mifflin.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/27/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.DunderMifflin = class {

    static Overlays = {
        Simple: new LookOverlay(LocalizedString("Simple"), "frame-simple", "svg.163472.sha1.da96a5e4b8b5f734e915e39328ddc686d035a683", "assets/looks/presets/dunder-mifflin").setColorizable(true),
        PaperPlane: new LookOverlay(LocalizedString("Paper Plane"), "frame-paper-plane", "svg.166469.sha1.6a6c590e53e76ee7529d310c8eade00fe2e11175", "assets/looks/presets/dunder-mifflin").setColorizable(true),
        PrintMarks: new LookOverlay(LocalizedString("Print Marks"), "frame-print-marks", "svg.101357.sha1.73871034e68bfefed206591c1f058a21d74dcc4f", "assets/looks/presets/dunder-mifflin").setColorizable(true),
    };

    static Logos = {
        Default: { url: "assets/looks/presets/dunder-mifflin/logo.svg" },
    };

    static Colors = {
        Blue: {
            tint: "#86A9FA",
            logotext: "#FFFFFF",
            frame: "#003BC3",
            plane: "#FFFFFF",
            outline: "#000000",
            tail: "#FFFFFF"
        },
        Light: {
            tint: "#8D8B8B",
            logotext: "#403F3F",
            frame: "#FCF8EC",
            plane: "#FCF8EC",
            outline: "#403F3F",
            tail: "#000000"
        },
        DarkBlue: {
            tint: "#163A8E",
            logotext: "#FFFFFF",
            frame: "#000E2F",
            plane: "#FFFFFF",
            outline: "#000E2F",
            tail: "#FFFFFF"
        },
        Teal: {
            tint: "#03C6E5",
            logotext: "#FFFFFF",
            frame: "#014E5A",
            plane: "#FFFFFF",
            outline: "#014E5A",
            tail: "#FFFFFF"
        },
        Gray: {
            tint: "#DDDCDC",
            logotext: "#000000",
            frame: "#C8C5C6",
            plane: "#FFFFFF",
            outline: "#626262",
            tail: "#000000"
        }
    };

    static defaultTint() {
        return LooksColors.solidPaintForColor(this.Colors.Light.tint);
    }

    static tintOptions() {
        const colors = this.Colors;
        const keys = Object.keys(colors);
        return keys.map((key) => {
            const color = colors[key];
            return LooksColors.solidPaintForColor(color.tint);
        });
    }

    static Preset = new LookPreset("dunder-mifflin", LocalizedString("Dunder Mifflin"))
        .setInitialEditorLayer(LooksLayer.Tint)
        .setThumbnailUrl("assets/looks/presets/dunder-mifflin/light.png")
        .setFakeBrandData({
            name: "Dunder Mifflin",
            iconUrl: "assets/looks/presets/dunder-mifflin/icon.png",
        })
        .setNametagStyle(Media.NameBadge.Styles.DunderMifflin)
        .setNametagVisibleByDefault(true)
        .setDefaultNametagValues({
            title: LocalizedString("Michael Scott"),
            subtitle: LocalizedString("Regional Manager"),
        })
        .setNametagColorizable(true)
        .setNametagColorizationCallback(this.colorizeNametag)
        .setShapeEditable(false)
        .setBackgroundStyle(Presenter.BackgroundStyle.Blur)
        .setLogo(this.Logos.Default.url)
        .setLogoAnchor(Stage.Object.Anchor.TopLeft)
        .setAnchorInset(76)
        .setLogoScale(0)
        .setLogoColorizable(true)
        .setLogoOptions(Object.values(this.Logos))
        .setTintLayerTitle(LocalizedString("Color"))
        .setTint(this.defaultTint())
        .setTintOptions(this.tintOptions())
        .setPatternEditable(false)
        .setOverlay(this.Overlays.PaperPlane)
        .setOverlayOptions(Object.values(this.Overlays))
        .setCustomOverlayEnabled(false)
        .setWallpaperEditable(false)
        .setColorizationCallback(this.colorize)
        .addVariant({
            id: "light",
            name: LocalizedString("Light"),
            thumbnailUrl: "assets/looks/presets/dunder-mifflin/light.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Light.tint),
            overlay: this.Overlays.PaperPlane,
            logo: this.Logos.Default.url,
        })
        .addVariant({
            id: "blue",
            name: LocalizedString("Blue Printer's Marks"),
            thumbnailUrl: "assets/looks/presets/dunder-mifflin/blue.png",
            tint: LooksColors.solidPaintForColor(this.Colors.Blue.tint),
            overlay: this.Overlays.PrintMarks,
            logo: this.Logos.Default.url,
        })
        // .addVariant({
        //     id: "blue-plane",
        //     name: LocalizedString("Blue Paper Plane"),
        //     thumbnailUrl: "assets/looks/presets/dunder-mifflin/blue-plane.png",
        //     tint: LooksColors.solidPaintForColor(this.Colors.Blue.tint),
        //     overlay: this.Overlays.PaperPlane,
        //     logo: this.Logos.Default.url,
        // })
        // .addVariant({
        //     id: "color",
        //     name: LocalizedString("Color"),
        //     thumbnailUrl: "assets/looks/presets/dunder-mifflin/color.png",
        //     tint: null, // TODO this isn't working
        //     overlay: this.Overlays.PrintMarks,
        //     logo: this.Logos.Default.url,
        // })


    static colorize(tint, colorScheme) {
        const colors = LookPreset.DunderMifflin.colorSchemeForTint(tint);
        if (colors) {
            Object.keys(colors).forEach(key =>  colorScheme[key] = colors[key]);
        } else {
            colorScheme["tint"] = tint;
            colorScheme["logotext"] = "#000000";
            colorScheme["frame"] = LookPreset.DunderMifflin.customFrameColor(tint);
            colorScheme["plane"] = "#FFFFFF";
            colorScheme["outline"] = "#000000";
            colorScheme["tail"] = "#FFFFFF";
        }
    }

    static customFrameColor(tint) {
        // For custom colors, apply 80% opacity to each RGB component to darken it
        const rgba = ColorHexToRGB(tint).slice(0, 3);
        for (let i = 0; i < 3; i++) {
            rgba[i] = rgba[i] * 0.8;
        }
        return ColorRGBAToHex(rgba);
    }

    /**
     * @param {Paint} paint
     * @param {Media.NameBadge} nametag
     */
    static colorizeNametag(paint, nametag) {
        // Given a presenter tint color, return the desired name tag color
        const tint = LooksColors.primaryColorFromPaint(paint);
        const colors = LookPreset.DunderMifflin.colorSchemeForTint(tint);
        const foreground = colors ? colors.logotext : "#FFFFFF";
        const background = new Paint.Color(colors ? colors.frame : LookPreset.DunderMifflin.customFrameColor(tint));
        background.alpha = 0.5;
        LooksNameBadgeHandler.updateNameBadgeMediaColor(nametag, "primary", foreground);
        LooksNameBadgeHandler.updateNameBadgeMediaColor(nametag, "secondary", background);
    }

    /**
     * @param {String} tint
     */
    static colorSchemeForTint(tint) {
        const colors = LookPreset.DunderMifflin.Colors;
        const options = Object.keys(colors);
        const match = options.find(key => colors[key].tint == tint.toUpperCase());
        return match ? colors[match] : null;
    }
}
