//
//  colors.js
//  mmhmm
//
//  Created by Seth Hitchings on 9/12/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LooksColors {

    static SolidColorsTint = [
        { name: LocalizedString("Light Gray"), color: "rgba(136, 136, 136, 1.0)" },
        { name: LocalizedString("Red"), color: "rgba(102, 0, 0, 1.0)" },
        { name: LocalizedString("Orange"), color: "rgba(102, 51, 0, 1.0)" },
        { name: LocalizedString("Yellow"), color: "rgba(102, 102, 0, 1.0)" },
        { name: LocalizedString("Green"), color: "rgba(0, 102, 0, 1.0)" },
        { name: LocalizedString("Aqua"), color: "rgba(0, 68, 102, 1.0)" },
        { name: LocalizedString("Blue"), color: "rgba(17, 0, 102, 1.0)" },
        { name: LocalizedString("Purple"), color: "rgba(68, 0, 102, 1.0)" },
        { name: LocalizedString("Magenta"), color: "rgba(102, 0, 68, 1.0)" },
    ];

    static SolidColorsNametag = [
        { name: "White", color: "rgba(255, 255, 255, 1.0)" },
        { name: "Dark Gray", color: "rgba(60, 60, 60, 1.0)" },
        { name: "Black", color: "rgba(0, 0, 0, 1.0)" },
        { name: "Red", color: "rgba(217, 43, 43, 1.0)" },
        { name: "Orange", color: "rgba(232, 146, 65, 1.0)" },
        { name: "Yellow", color: "rgba(242, 211, 65, 1.0)" },
        { name: "Green", color: "rgba(107, 184, 79, 1.0)" },
        { name: "Light Blue", color: "rgba(108, 199, 232, 1.0)" },
        { name: "Blue", color: "rgba(46, 55, 232, 1.0)" },
        { name: "Purple", color: "rgba(112, 38, 168, 1.0)" },
        { name: "Pink", color: "rgba(236, 77, 203, 1.0)" },
        { name: "Light Pink", color: "rgba(230, 168, 168, 1.0)" },
        { name: "Pale Yellow", color: "rgba(249, 243, 168, 1.0)" },
        { name: "Light Green", color: "rgba(207, 255, 195, 1.0)" },
        { name: "Soft Blue", color: "rgba(175, 196, 248, 1.0)" },
        { name: "Teal", color: "rgba(0, 128, 128, 1.0)" }
    ];

    static RedWhite = new Paint.LinearGradient()
                    .addStopAt("#FF262A", 0.5, 0.0)
                    .addStopAt("#F5FFD8", 0.5, 1.0);
    static BlueRed = new Paint.LinearGradient()
                    .addStopAt("#89DEFF", 0.5, 0.0)
                    .addStopAt("#FF5959", 0.5, 1.0);
    static LinearGreenBlue = new Paint.LinearGradient()
                    .addStopAt("#DDFF57", 0.5, 0.0)
                    .addStopAt("#0070C0", 0.5, 1.0);
    static RadialGreenBlue = new Paint.RadialGradient(["#DDFF57", "#0070C0"]);
    static Blue = new Paint.RadialGradient([
                    [0.7, 1.0, 0.88, 1.0],
                    [0.3, 0.42, 1.0, 1.0]]);
    static LinearPinkPurple = new Paint.LinearGradient()
                   .addStopAt("#FFC2C2", 0.5, 0.0)
                   .addStopAt("#000638", 0.5, 1.0);
    static RadialPinkPurple = new Paint.RadialGradient(["#FFC2C2", "#000638"]);
    static LinearVioletBurnt = new Paint.LinearGradient()
                    .addStopAt("#98A3D9", 0.5, 0.0)
                    .addStopAt("#995736", 0.5, 0.65);
    static RadialVioletBurnt = new Paint.RadialGradient(["#98A3D9", "#995736"]);
    static LinearCreamGreen = new Paint.LinearGradient()
                    .addStopAt("#FFFBCD", 0.5, 0.25)
                    .addStopAt("#1C2E10", 0.5, 0.75);
    static RadialCreamGreen = new Paint.RadialGradient(["#FFFBCD", "#1C2E10"]);
    static LinearCreamBlue = new Paint.LinearGradient()
                    .addStopAt("#FFFBCD", 0.5, 0.0)
                    .addStopAt("#00274E", 0.5, 0.75);
    static RadialCreamBlue = new Paint.RadialGradient(["#FFFBCD", "#00274E"]);
    static Black = new Paint.LinearGradient()
                    .addStopAt([0.0, 0.0, 0.0, 0.6], 0.5, 0.0)
                    .addStopAt([0.0, 0.0, 0.0, 1.0], 0.5, 1.0);

    static SolidWhite = LooksColors.solidPaintForColor("#FFFFFF");

    static SolidBlack = LooksColors.solidPaintForColor("#000000");
    static RadialBlack = LooksColors.radialGradientPaintForColor(LooksColors.SolidBlack);

    static SolidGray = LooksColors.solidPaintForColor("#888888");
    static LinearGray = LooksColors.linearGradientPaintForColor(LooksColors.SolidGray);
    static RadialGray = LooksColors.radialGradientPaintForColor(LooksColors.SolidGray);

    static SolidAqua = LooksColors.solidPaintForColor("#004466");
    static LinearAqua = LooksColors.linearGradientPaintForColor(LooksColors.SolidAqua);
    static RadialAqua = LooksColors.radialGradientPaintForColor(LooksColors.SolidAqua);

    static SolidOrange = LooksColors.solidPaintForColor("#663300");
    static LinearOrange = LooksColors.linearGradientPaintForColor(LooksColors.SolidOrange);
    static RadialOrange = LooksColors.radialGradientPaintForColor(LooksColors.SolidOrange);

    static DefaultGradients = [
        { name: LocalizedString("Red white"), paint: LooksColors.RedWhite },
        { name: LocalizedString("Blue red"), paint: LooksColors.BlueRed },
        { name: LocalizedString("Green blue"), paint: LooksColors.LinearGreenBlue},
        { name: LocalizedString("Blue"), paint: LooksColors.Blue },
        { name: LocalizedString("Pink purple"), paint: LooksColors.LinearPinkPurple },
        { name: LocalizedString("Black"), paint: LooksColors.Black }
    ];

    static randomGradientTint() {
        const options = LooksColors.getSolidColorsForTint();
        const index = Math.floor(Math.random() * options.length);
        const color = options[index];
        return LooksColors.linearGradientPaintForColor(color.color);
    }

    static getSolidColorsForTint() {
        return LooksColors.SolidColorsTint;
    }

    static getSolidColorsForNametag() {
        return LooksColors.SolidColorsNametag;
    }

    static getGradientColorsForTint() {
        const solidColors = LooksColors.getSolidColorsForTint();
        const gradients = LooksColors.generateGradientsFromSolids(solidColors);
        return gradients.concat(LooksColors.DefaultGradients);
    }

    static generateGradientsFromSolids(solidColors) {
        // For each of our solid colors except white, generate a corresponding gradient
        const solids = solidColors.filter((solid) => solid.color != "rgba(255, 255, 255, 1.0)");
        const gradients = [];

        solids.forEach((solid) => {
            const gradient = LooksColors.linearGradientPaintForColor(solid.color);
            gradients.push({
                name: solid.name,
                paint: gradient,
            });
        });

        return gradients;
    }

    static brandColorOptionsForTint(look) {
        // If the look uses a preset that pretends to be a brand, use those colors
        if (!look.hasRealBrandData() && look.hasLimitedTintOptions() && look.hasFakeBrandData()) {
            return look.getTintOptions();
        }

        // Make a set of tint options based on the brand colors
        // For each color, create a solid color and gradient tint
        const colors = LooksColors.#getFilteredBrandColors(look);
        const result = [];
        colors.forEach((color) => {
            result.push(LooksColors.linearGradientPaintForColor(color));
            result.push(LooksColors.solidPaintForColor(color));
        });
        return result;
    }

    static brandColorOptionsForNametag(look) {
        if (!look.hasRealBrandData() && look.hasLimitedTintOptions() && look.hasFakeBrandData()) {
            const options = look.getTintOptions();
            // Remove gradients
            return options.filter(o => IsKindOf(o, Paint.Color));
        }

        // Make a set of tint options based on the brand colors
        // TODO if the look has a preset with custom nametag colors, use those instead
        const colors = LooksColors.#getFilteredBrandColors(look);
        return colors.map((color) => LooksColors.solidPaintForColor(color));
    }

    static #getFilteredBrandColors(look) {
        // Filter out colors that are mostly black or white
        const upperLimit = 250/255;
        const lowerLimit = 25/255;

        let colors = look.brandColors ?? [];
        return colors.filter((color) => {
            const rgb = ColorHexToRGB(color);
            if (rgb.every(c => c > upperLimit) || rgb.every(c => c < lowerLimit)) {
                return false
            }
            return true;
        });
    }

    static solidPaintForColor(color) {
        return new Paint.Color(color);
    }

    static solidPaintForColorWithAlpha(color, alpha) {
        const paint = new Paint.Color(color);
        paint.alpha = alpha;
        return paint;
    }

    static linearGradientPaintForColor(color) {
        if (IsKindOf(color, Paint.Color)) {
            color = color.color;
        }
        return new Paint.LinearGradient()
            .addStopAt(color, 0.5, 0.0)
            .addStopAt(LooksColors.SolidWhite.color, 0.5, 1.0);
    }

    static radialGradientPaintForColor(color) {
        if (IsKindOf(color, Paint.Color)) {
            color = color.color;
        }
        return new Paint.RadialGradient([
            LooksColors.SolidWhite.color,
            color
        ]);
    }

    /**
     * Performs the opposite of linearGradientPaintForColor() or radialGradientPaintForColor(),
     * extracting the primary color from a gradient that fades to white. If the paint is a solid color,
     * it is returned as-is. If the gradient does not fade to white, the first color stop is returned.
     * @param {Paint} paint
     * @returns {String} hex color string, e.g. "#RRGGBB"
     */
    static primaryColorFromPaint(paint) {
        if (!paint) {
            return "#FFFFFF";
        }

        if (IsKindOf(paint, Paint.Color)) {
            return ColorRGBAToHex(paint.color);
        }

        // It's a gradient
        // If one of the colors is solid white or solid black, return the other
        const colors = paint.colors;
        const solidWhite = LooksColors.SolidWhite.color;
        const solidBlack = LooksColors.SolidBlack.color;

        const primaryColor = colors.find((c) => {
            return !LooksColors.sameColor(c, solidWhite) && !LooksColors.sameColor(c, solidBlack);
        });
        return ColorRGBAToHex(primaryColor ?? colors[0]);
    }

    /**
     * Performs the opposite of linearGradientPaintForColor() or radialGradientPaintForColor(),
     * extracting the primary color from a gradient that fades to white. If the paint is a solid color,
     * it is returned as-is. If the gradient does not fade to white, the last color stop is returned.
     * @param {Paint} paint
     * @returns {String} hex color string, e.g. "#RRGGBB"
     */
    static secondaryColorFromPaint(paint) {
        if (!paint) {
            return "#FFFFFF";
        }

        if (IsKindOf(paint, Paint.Color)) {
            return ColorRGBAToHex(paint.color);
        }

        // It's a gradient
        // If one of the colors is solid white or solid black, return the other
        const colors = paint.colors;
        const solidWhite = LooksColors.SolidWhite.color;
        const solidBlack = LooksColors.SolidBlack.color;

        const primaryColor = colors.findLast((c) => {
            return !LooksColors.sameColor(c, solidWhite) && !LooksColors.sameColor(c, solidBlack);
        });
        return ColorRGBAToHex(primaryColor ?? colors[0]);
    }

    /**
     * Compare two arrays of RGBA color components for equality.
     * Each color is an array of [r, g, b, a]
     * @param {[Number]} a
     * @param {[Number]} b
     * @returns {boolean}
     */
    static sameColor(a, b) {
        if (a == null || b == null) {
            return false;
        }
        if (a.length != 4 || b.length != 4) {
            debugger;
            return false;
        }
        for (let i = 0; i < 4; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Calculate a simple "brightness" value for a color
     * based on the Rec. 709 standard.
     * @param {String} color hex color string, e.g. "#RRGGBB"
     */
    static getBrightness(color) {
        const [r, g, b] = ColorHexToRGB(color).map(c => c * 255);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    static adjustBrightness(color, percent) {
        const [r, g, b] = ColorHexToRGB(color).map(c => c * 255);

        // If percent > 0, move toward white; if < 0, move toward black
        const adjust = (c) => {
            if (percent > 0) {
                return Math.round(c + (255 - c) * (percent / 100));
            } else {
                return Math.round(c * (1 + percent / 100));
            }
        };

        const adjusted = [adjust(r), adjust(g), adjust(b)];
        return ColorRGBAToHex(adjusted.map(c => c / 255));
    }
}
