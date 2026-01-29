//
//  tinted.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/30/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.Tinted = class {

    static patternOptions() {
        return [
            LookPatterns.Cube,
            LookPatterns.DotsOffset,
            LookPatterns.Filigree,
            LookPatterns.Japanese,
            LookPatterns.Slant,
            LookPatterns.Triangle,
            LookPatterns.Wave,
            LookPatterns.Weave,
        ];
    }

    static overlayOptions() {
        return [
            LookOverlays.ThinBorder,
            LookOverlays.ThickBorder,
            LookOverlays.Calligraphy,
            LookOverlays.RoundedInset,
            LookOverlays.Rounded,
        ];
    }

    static Colors = {
        PinkPurple: {
            tint: LooksColors.LinearPinkPurple,
        },
        LinearAqua: {
            tint: LooksColors.LinearAqua,
        },
        LinearOrange: {
            tint: LooksColors.LinearOrange,
        },

        RadialPinkPurple: {
            tint: LooksColors.RadialPinkPurple,
        },
        RadialAqua: {
            tint: LooksColors.RadialAqua,
        },
        RadialOrange: {
            tint: LooksColors.RadialOrange,
        },

        LinearCreamBlue: {
            tint: LooksColors.LinearCreamBlue,
        },
        LinearCreamGreen: {
            tint: LooksColors.LinearCreamGreen,
        },
        LinearVioletBurnt: {
            tint: LooksColors.LinearVioletBurnt,
            nametag: "#4B2223",
        },

        RadialCreamBlue: {
            tint: LooksColors.RadialCreamBlue,
        },
        RadialCreamGreen: {
            tint: LooksColors.RadialCreamGreen,
        },
        RadialVioletBurnt: {
            tint: LooksColors.RadialVioletBurnt,
        },

        LinearGray: {
            tint: LooksColors.LinearGray,
        },
        LinearGreenBlue: {
            tint: LooksColors.LinearGreenBlue,
        },
        BlueRed: {
            tint: LooksColors.BlueRed,
        },
    }

    static tintOptions() {
        return Object.values(this.Colors).map(color => color.tint);
    }

    static colorSchemeForPaint(paint) {
        const colors = LookPreset.Tinted.Colors;
        const options = Object.keys(colors);
        const match = options.find(key => colors[key].tint == paint);
        return match ? colors[match] : null;
    }

    /**
     * @param {Paint} paint
     * @param {Media.NameBadge} nametag
     */
    static colorizeNametag(paint, nametag) {
        const colorScheme = LookPreset.Tinted.colorSchemeForPaint(paint);
        let background = null;
        if (colorScheme?.nametag) {
            // We take the color and apply 60% opacity to the name tag background
            background = new Paint.Color(colorScheme.nametag);
        } else {
            const tint = LooksColors.secondaryColorFromPaint(paint);
            background = new Paint.Color(tint);
        }
        background.alpha = 0.6;
        LooksNameBadgeHandler.updateNameBadgeMediaColor(nametag, "secondary", background);
    }

    static Preset = new LookPreset("simple", LocalizedString("Tinted"))
        .setInitialEditorLayer(LooksLayer.Tint)
        .setNametagStyle(Media.NameBadge.Styles.Tinted)
        .setNametagColorizable(true)
        .setNametagColorizationCallback(this.colorizeNametag)
        .setShapeEditable(false)
        .setBackgroundStyle(Presenter.BackgroundStyle.Blur)
        .setTint(LooksColors.LinearPinkPurple)
        .setTintOptions(this.tintOptions())
        .setPattern(LookPatterns.Slant)
        .setPatternOptions(this.patternOptions())
        .setOverlay(LookOverlays.ThinBorder)
        .setOverlayOptions(this.overlayOptions())
        .setWallpaperEditable(false)
        .addVariant({
            id: "slant",
            name: LocalizedString("Purple"),
            tint: LooksColors.LinearPinkPurple,
            pattern: LookPatterns.Slant,
            overlay: LookOverlays.ThinBorder,
        })
        .addVariant({
            id: "dots",
            name: LocalizedString("Blue"),
            thumbnailUrl: "assets/looks/presets/simple-dots.png",
            tint: LooksColors.RadialCreamBlue,
            pattern: null,
            overlay: LookOverlays.RoundedInset,
        })
        .addVariant({
            id: "japanese",
            name: LocalizedString("Monochrome"),
            thumbnailUrl: "assets/looks/presets/simple-japanese.png",
            tint: LooksColors.LinearGray,
            pattern: LookPatterns.Japanese,
            overlay: LookOverlays.Rounded,
        })
        .addVariant({
            id: "calligraphy",
            name: LocalizedString("Burnt"),
            thumbnailUrl: "assets/looks/presets/simple-wave.png",
            tint: LooksColors.LinearVioletBurnt,
            pattern: LookPatterns.Wave,
            overlay: LookOverlays.Calligraphy,
        });

}
