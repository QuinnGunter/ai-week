//
//  media/text/styles/builtin.js
//  mmhmm
//
//  Created by Steve White on 2/23/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

Media.Text.Style.DefaultSizes = Object.freeze({
    [Media.Text.Size.Small]: 48,
    [Media.Text.Size.Medium]: 68,
    [Media.Text.Size.Large]: 96,
    [Media.Text.Size.ExtraLarge]: 144,
    [Media.Text.Size.Enormous]: 600,
})

Media.Text.Styles = [];
Media.Text.TitleCardStyles = [];

Media.Text.StyleWithIdentifier = function(identifier) {
    if (identifier == "24DD199D-603A-4012-8736-AC5385A8C8E6") {
        return Media.Text.StyleWithThemeID("glossy-light");
    }
    else if (identifier == "3B97D1EA-D88C-46CC-831A-22F3AD35CAA1") {
        return Media.Text.StyleWithThemeID("glossy-dark");
    }
    return Media.Text.Style.Default;
}

Media.Text.StyleWithThemeID = function(themeID, fromStyles = Media.Text.Styles) {
    if (themeID.startsWith("ploeg") == true) {
        themeID = "billboard" + themeID.substring(5);
    }
    return fromStyles.find(style => style.themeID == themeID);
}

Media.Text.Styles.Fonts = {};
Media.Text.Styles.LoadFonts = function() {
    const supportsVariableFonts = (window.matchMedia('(hover: none)')?.matches == false);
    const assetDir = "assets/fonts";

    const familes = {
        Mulish: {
            variable: "Mulish-VariableFont_wght",
            nonvariable: [ "Mulish-Black", "Mulish-Bold" ],
            attributes: { weight: 700, bold: 900, size: 96, strikeout: { pos: 0.6, size: 0.05 } },
        },
        NunitoSans: {
            variable: "NunitoSans-VariableFont_YTLC,opsz,wdth,wght",
            nonvariable: [ "NunitoSans-SemiBold", "NunitoSans-ExtraBold" ],
            attributes: { weight: 600, bold: 800, size: 96, strikeout: { pos: 0.683, size: 0.05 } },
        },
        LibreBaskerville: {
            variable: "LibreBaskerville-Regular",
            nonvariable: [ "LibreBaskerville-Bold", "LibreBaskerville-Italic", "LibreBaskerville-Regular" ],
            attributes: { weight: 400, bold: 700, size: 96, strikeout: { pos: 0.6029, size: 0.05 } },
        },
        Inter: {
            variable: "Inter-VariableFont_slnt,wght",
            nonvariable: [ "Inter-Bold", "Inter-Black" ],
            attributes: { weight: 700, bold: 900, size: 96, strikeout: { pos: 0.573, size: 0.04 } } ,
        },
        Merriweather: {
            variable: "Merriweather-VariableFont_opsz,wdth,wght",
            nonvariable: [ "Merriweather-Regular", "Merriweather-Bold", "Merriweather-Italic" ],
            attributes: { weight: 400, bold: 700, size: 96, strikeout: { pos: 0.6, size: 0.05 } },
        },
    };

    const makeURL = function(filename) {
        return `url(${assetDir}/${filename}.woff2)`;
    };

    const fonts = Media.Text.Styles.Fonts;
    for (let family in familes) {
        const entry = familes[family];
        let faces = null;
        if (supportsVariableFonts == true) {
            faces = new FontFace(family, makeURL(entry.variable))
        }
        else {
            faces = entry.nonvariable.map(filename => new FontFace(family, makeURL(filename)));
        }

        fonts[family] = new Font({...entry.attributes, family: faces});
    }
}

Media.Text.Styles.CreateDefaultStyles = function() {
    var styles = Media.Text.Styles;

    var merge = function(overrides, target) {
        for (var key in overrides) {
            var val = overrides[key];

            if (val.constructor == Object) {
                if (target[key] == null) {
                    target[key] = {};
                }
                merge(val, target[key]);
            }
            else {
                if (val.constructor == Array) {
                    target[key] = Array.from(val);
                }
                else {
                    target[key] = val;
                }
            }
        }
        return target;
    }

    var defaultSizes = Media.Text.Style.DefaultSizes;


    //
    // Glossy
    //
    const fonts = Media.Text.Styles.Fonts;

    var glossyBase = {
        textAttributes: {
            font: fonts.Mulish,
            alignment: AdvancedTextLayer.HorizontalAlignment.Center,
            shadow: {
                offset: PointMake(2, 2),
                radius: 0,
            }
        },
        sizes: Object.assign({}, defaultSizes),
        linkAttributes: {
            underline: true,
            shadow: {
                offset: PointMake(2, 2),
                radius: 0,
            }
        },
        backgroundAttributes: {
            strokeWidth: 5,
            filter: "blur",
        },
        cornerRadius: 32,
        contentInsets: {
            top: 48,
            left: 96,
            bottom: 48,
            right: 96
        }
    };

    var glossyTitle = LocalizedString("Glossy");
    styles.push(new Media.Text.Style(glossyTitle, LocalizedString("Light"), "glossy-light", merge(glossyBase, {
        textAttributes: {
            color: ColorWithWhite(0, 1),
            shadow: {
                color: ColorWithWhite(1, 1),
            }
        },
        linkAttributes: {
            color: Color(0.259, 0.204, 0.949, 1),
            underline: true,
            shadow: {
                color: ColorWithWhite(1, 1),
            }
        },
        backgroundAttributes: {
            stroke: new Paint.Color([1, 1, 1, 0.5]),
            fill: new Paint.Color([0.913, 0.913, 0.913, 0.7]),
        },
    })));


    styles.push(new Media.Text.Style(glossyTitle, LocalizedString("Dark"), "glossy-dark", merge(glossyBase, {
        textAttributes: {
            color: ColorWithWhite(1, 1),
            shadow: {
                color: ColorWithWhite(0, 1),
            }
        },
        linkAttributes: {
            color: Color(0.443, 0.404, 0.961, 1),
            underline: true,
            shadow: {
                color: ColorWithWhite(0, 1),
            }
        },
        backgroundAttributes: {
            stroke: new Paint.Color([0, 0, 0, 0.5]),
            fill: new Paint.Color([0.087, 0.087, 0.087, 0.7]),
        },
    })));

    //
    // Modern
    //

    var modernBase = {
        textAttributes: {
            font: fonts.NunitoSans,
        },
        sizes: Object.assign({}, defaultSizes),
        contentInsets: {
            top: 48,
            left: 96,
            bottom: 48,
            right: 96
        }
    };

    var modernTitle = LocalizedString("Modern");
    styles.push(new Media.Text.Style(modernTitle, LocalizedString("Dark – Clear"), "modern-dark", merge(modernBase, {
        textAttributes: {
            color: ColorWithWhite(1, 1),
        },
        backgroundAttributes: {
            fill: new Paint.Color([0, 0, 0, 0.0]),
        },
        sortOrder: 0,
    })));
    styles.push(new Media.Text.Style(modernTitle, LocalizedString("Light – Clear"), "modern-light", merge(modernBase, {
        textAttributes: {
            color: ColorWithWhite(0, 1),
        },
        backgroundAttributes: {
            fill: new Paint.Color([1, 1, 1, 0.0]),
        },
        sortOrder: 1,
    })));

    styles.push(new Media.Text.Style(modernTitle, LocalizedString("Dark – Transparent"), "modern-dark-transparent", merge(modernBase, {
        textAttributes: {
            color: ColorWithWhite(1, 1),
        },
        backgroundAttributes: {
            fill: new Paint.Color([0, 0, 0, 0.85]),
        },
        sortOrder: 2,
    })));
    styles.push(new Media.Text.Style(modernTitle, LocalizedString("Light – Transparent"), "modern-light-transparent", merge(modernBase, {
        textAttributes: {
            color: ColorWithWhite(0, 1),
        },
        backgroundAttributes: {
            fill: new Paint.Color([1, 1, 1, 0.85]),
        },
        sortOrder: 3,
    })));

    styles.push(new Media.Text.Style(modernTitle, LocalizedString("Dark – Solid"), "modern-dark-opaque", merge(modernBase, {
        textAttributes: {
            color: ColorWithWhite(1, 1),
        },
        backgroundAttributes: {
            fill: new Paint.Color([0, 0, 0, 1.0]),
        },
        sortOrder: 4,
    })));
    styles.push(new Media.Text.Style(modernTitle, LocalizedString("Light – Solid"), "modern-light-opaque", merge(modernBase, {
        textAttributes: {
            color: ColorWithWhite(0, 1),
        },
        backgroundAttributes: {
            fill: new Paint.Color([1, 1, 1, 1.0]),
        },
        sortOrder: 5,
    })));

    //
    // Classic
    //
    // XXX: classic needs the border...
    var classicBase = {
        textAttributes: {
            font: fonts.LibreBaskerville,
            alignment: AdvancedTextLayer.HorizontalAlignment.Center,
        },
        sizes: Object.assign({}, defaultSizes),
        contentInsets: {
            top: 48,
            left: 96,
            bottom: 48,
            right: 96
        }
    }

    var classicTitle = LocalizedString("Classic");
    styles.push(new Media.Text.Style(classicTitle, LocalizedString("White – Clear"), "classic-white-clear", merge(classicBase, {
        textAttributes: {
            color: Color(1.0, 1.0, 1.0, 1.0),
        },
        backgroundAttributes: {
            fill: new Paint.Color([0.90196, 0.90196, 0.89411, 0.0]),
        },
        sortOrder: 0,
    })));
    styles.push(new Media.Text.Style(classicTitle, LocalizedString("Black – Clear"), "classic-black-clear", merge(classicBase, {
        textAttributes: {
            color: Color(0.0, 0.0, 0.0, 1.0)
        },
        backgroundAttributes: {
            fill: new Paint.Color([0.07058, 0.07450, 0.08235, 0.0]),
        },
        sortOrder: 1,
    })));
    styles.push(new Media.Text.Style(classicTitle, LocalizedString("Dark – Clear"), "classic-dark-clear", merge(classicBase, {
        textAttributes: {
            color: Color(0.65098, 0.58823, 0.454901, 1.0)
        },
        backgroundAttributes: {
            fill: new Paint.Color([0.07058, 0.07450, 0.08235, 0.0]),
        },
        sortOrder: 2,
    })));
    styles.push(new Media.Text.Style(classicTitle, LocalizedString("Light – Clear"), "classic-light-clear", merge(classicBase, {
        textAttributes: {
            color: Color(0.52156, 0.47058, 0.35686, 1.0),
        },
        backgroundAttributes: {
            fill: new Paint.Color([0.90196, 0.90196, 0.89411, 0.0]),
        },
        sortOrder: 3,
    })));

    styles.push(new Media.Text.Style(classicTitle, LocalizedString("Dark – Transparent"), "classic-dark-transparent", merge(classicBase, {
        textAttributes: {
            color: Color(0.65098, 0.58823, 0.454901, 1.0)
        },
        backgroundAttributes: {
            fill: new Paint.Color([0.07058, 0.07450, 0.08235, 0.7]),
        },
        sortOrder: 4,
    })));
    styles.push(new Media.Text.Style(classicTitle, LocalizedString("Light – Transparent"), "classic-light-transparent", merge(classicBase, {
        textAttributes: {
            color: Color(0.52156, 0.47058, 0.35686, 1.0),
        },
        backgroundAttributes: {
            fill: new Paint.Color([0.90196, 0.90196, 0.89411, 0.7]),
        },
        sortOrder: 5,
    })));

    styles.push(new Media.Text.Style(classicTitle, LocalizedString("Dark – Solid"), "classic-dark", merge(classicBase, {
        textAttributes: {
            color: Color(0.65098, 0.58823, 0.454901, 1.0)
        },
        backgroundAttributes: {
            fill: new Paint.Color([0.07058, 0.07450, 0.08235, 1.0]),
        },
        sortOrder: 6,
    })));
    styles.push(new Media.Text.Style(classicTitle, LocalizedString("Light – Solid"), "classic-light", merge(classicBase, {
        textAttributes: {
            color: Color(0.52156, 0.47058, 0.35686, 1.0),
        },
        backgroundAttributes: {
            fill: new Paint.Color([0.90196, 0.90196, 0.89411, 1.0]),
        },
        sortOrder: 7,
    })));



    //
    // Title cards
    //
    let titleCardStyles = Media.Text.TitleCardStyles;

    var titleCardBase = {
        textAttributes: {
            font: fonts.Merriweather,
            alignment: AdvancedTextLayer.HorizontalAlignment.Center,
        },
        sizes: Object.assign({}, defaultSizes),
        contentInsets: {
            top: 48,
            left: 96,
            bottom: 48,
            right: 96
        }
    };

    var titleCardTitle = LocalizedString("Title Card");
    titleCardStyles.push(new Media.Text.Style(titleCardTitle, LocalizedString("Basic Light"), "titlecard-light", merge(titleCardBase, {
        textAttributes: {
            color: Color(0, 0, 0, 1)
        },
        backgroundAttributes: {
            fill: new Paint.Color([1, 1, 1, 1]),
        },
    })));
    titleCardStyles.push(new Media.Text.Style(titleCardTitle, LocalizedString("Basic Dark"), "titlecard-dark", merge(titleCardBase, {
        textAttributes: {
            color: Color(1, 1, 1, 1)
        },
        backgroundAttributes: {
            fill: new Paint.Color([0, 0, 0, 1]),
        },
    })));
    titleCardStyles.push(new Media.Text.Style(titleCardTitle, LocalizedString("Blue Light"), "titlecard-blue-light", merge(titleCardBase, {
        textAttributes: {
            color: Color(0, 0, 0, 1)
        },
        backgroundAttributes: {
            fill: new Paint.Color([217/255, 233/255, 1, 1]),
        },
    })));
    titleCardStyles.push(new Media.Text.Style(titleCardTitle, LocalizedString("Blue Dark"), "titlecard-blue-dark", merge(titleCardBase, {
        textAttributes: {
            color: Color(1, 1, 1, 1)
        },
        backgroundAttributes: {
            fill: new Paint.LinearGradient([
                [Color(32/255, 43/255, 64/255, 1), 0.5, 0],
                [Color(52/255, 73/255, 115/255, 1), 0.5, 1.0]
            ]),
        },
    })));
    titleCardStyles.push(new Media.Text.Style(titleCardTitle, LocalizedString("Green Light"), "titlecard-green-light", merge(titleCardBase, {
        textAttributes: {
            color: Color(0, 0, 0, 1)
        },
        backgroundAttributes: {
            fill: new Paint.Color([229/255, 1, 229/255, 1]),
        },
    })));
    titleCardStyles.push(new Media.Text.Style(titleCardTitle, LocalizedString("Green Dark"), "titlecard-green-dark", merge(titleCardBase, {
        textAttributes: {
            color: Color(1, 1, 1, 1)
        },
        backgroundAttributes: {
            fill: new Paint.LinearGradient([
                [Color(15/255, 77/255, 61/255, 1), 0.5, 0.0],
                [Color(38/255, 128/255, 105/255, 1), 0.5, 1.0]
            ]),
        },
    })));
    titleCardStyles.push(new Media.Text.Style(titleCardTitle, LocalizedString("Red Light"), "titlecard-red-light", merge(titleCardBase, {
        textAttributes: {
            color: Color(0, 0, 0, 1)
        },
        backgroundAttributes: {
            fill: new Paint.Color([1, 245/255, 217/255, 1]),
        },
    })));
    titleCardStyles.push(new Media.Text.Style(titleCardTitle, LocalizedString("Red Dark"), "titlecard-red-dark", merge(titleCardBase, {
        textAttributes: {
            color: Color(1, 1, 1, 1)
        },
        backgroundAttributes: {
            fill: new Paint.LinearGradient([
                [Color(115/255, 17/255, 33/255, 1), 0.5, 0.0],
                [Color(178/255, 54/255, 74/255, 1), 0.5, 1.0]
            ]),
        },
    })));
    titleCardStyles.push(new Media.Text.Style(titleCardTitle, LocalizedString("Maroon Light"), "titlecard-maroon-light", merge(titleCardBase, {
        textAttributes: {
            color: Color(0, 0, 0, 1)
        },
        backgroundAttributes: {
            fill: new Paint.Color([1, 217/255, 217/255, 1]),
        },
    })));
    titleCardStyles.push(new Media.Text.Style(titleCardTitle, LocalizedString("Maroon Dark"), "titlecard-maroon-dark", merge(titleCardBase, {
        textAttributes: {
            color: Color(1, 1, 1, 1)
        },
        backgroundAttributes: {
            fill: new Paint.LinearGradient([
                [Color(51/255, 20/255, 36/255, 1), 0.5, 0.0],
                [Color(89/255, 36/255, 62/255, 1), 0.5, 1.0]
            ]),
        },
    })));

    //
    // Emoji
    // Based on Billboard - just text, no background, minimal padding
    styles.push(new Media.Text.Style(LocalizedString("Emoji"), LocalizedString("Emoji"), "emoji", {
        textAttributes: {
            font: fonts.Inter,
            color: Color(1, 1, 1, 1)
        },
        backgroundAttributes: {
            fill: new Paint.Color([0, 0, 0, 0]),
        },
        sizes: Object.assign({}, defaultSizes),
        contentInsets: {
            top: 0,
            left: 0,
            bottom: 0,
            right: 0
        }
    }));

    //
    // Ploeg/Billboard
    //
    var billboardBase = {
        textAttributes: {
            font: fonts.Inter,
            transform: "uppercase",
        },
        sizes: Object.assign({}, defaultSizes),
        contentInsets: {
            top: 48,
            left: 96,
            bottom: 48,
            right: 96
        }
    };

    var billboardTitle = LocalizedString("Billboard");
    styles.push(new Media.Text.Style(billboardTitle, LocalizedString("Dark – Clear"), "billboard-dark", merge(billboardBase, {
        textAttributes: {
            color: Color(1, 1, 1, 0.85)
        },
        backgroundAttributes: {
            fill: new Paint.Color([0, 0, 0, 0]),
        },
        sortOrder: 0,
    })));
    styles.push(new Media.Text.Style(billboardTitle, LocalizedString("Light – Clear"), "billboard-light", merge(billboardBase, {
        textAttributes: {
            color: Color(0, 0, 0, 0.9)
        },
        backgroundAttributes: {
            fill: new Paint.Color([1, 1, 1, 0]),
        },
        sortOrder: 1,
    })));

    styles.push(new Media.Text.Style(billboardTitle, LocalizedString("Dark – Transparent"), "billboard-dark-with-background", merge(billboardBase, {
        textAttributes: {
            color: Color(1, 1, 1, 0.85)
        },
        backgroundAttributes: {
            fill: new Paint.Color([0, 0, 0, 0.45]),
        },
        sortOrder: 2,
    })));
    styles.push(new Media.Text.Style(billboardTitle, LocalizedString("Light – Transparent"), "billboard-light-with-background", merge(billboardBase, {
        textAttributes: {
            color: Color(0, 0, 0, 0.9)
        },
        backgroundAttributes: {
            fill: new Paint.Color([1, 1, 1, 0.45]),
        },
        sortOrder: 3,
    })));

    styles.push(new Media.Text.Style(billboardTitle, LocalizedString("Dark – Solid"), "billboard-dark-opaque", merge(billboardBase, {
        textAttributes: {
            color: Color(1, 1, 1, 0.85)
        },
        backgroundAttributes: {
            fill: new Paint.Color([0, 0, 0, 1.00]),
        },
        sortOrder: 4,
    })));
    styles.push(new Media.Text.Style(billboardTitle, LocalizedString("Light – Solid"), "billboard-light-opaque", merge(billboardBase, {
        textAttributes: {
            color: Color(0, 0, 0, 0.9)
        },
        backgroundAttributes: {
            fill: new Paint.Color([1, 1, 1, 1.0]),
        },
        sortOrder: 5,
    })));

    //
    // Cutout
    //
    styles.push(new Media.Text.Style.Cutout(LocalizedString("Clouds"), "cutout-clouds", "clouds"));
    styles.push(new Media.Text.Style.Cutout(LocalizedString("Fire"), "cutout-fire", "fire"));
    styles.push(new Media.Text.Style.Cutout(LocalizedString("Fireworks"), "cutout-fireworks", "fireworks"));
    styles.push(new Media.Text.Style.Cutout(LocalizedString("Ink"), "cutout-ink", "ink"));
    styles.push(new Media.Text.Style.Cutout(LocalizedString("Space"), "cutout-space", "space"));
    styles.push(new Media.Text.Style.Cutout(LocalizedString("Water"), "cutout-water", "water"));

    //
    // Speech bubbles
    //
    styles.push(new Media.Text.Style.Classic.Speech());
    styles.push(new Media.Text.Style.Classic.Thought());
    styles.push(new Media.Text.Style.Classic.Angry());
    styles.push(new Media.Text.Style.Funky.Speech());
    styles.push(new Media.Text.Style.Funky.Thought());
    styles.push(new Media.Text.Style.Funky.Angry());
    styles.push(new Media.Text.Style.Simple.Speech());
    styles.push(new Media.Text.Style.Simple.Thought());
    styles.push(new Media.Text.Style.Simple.Angry());

    // Setup the default
    Media.Text.Style.Default = Media.Text.StyleWithThemeID("glossy-light");
};

// Have to wait for the dom to load before we can use
// Font.DefaultFontFamily() since it tries to infer
// the value from the style sheet.
window.addEventListener("load", () => {
    Media.Text.Styles.LoadFonts();
    Media.Text.Styles.CreateDefaultStyles();
});

Media.Text.Style.FontFaceForAsset = async function(asset, blob) {
    let registered = Media.Text.Style.RegisteredFontAssets;
    if (registered == null) {
        registered = {};
        Media.Text.Style.RegisteredFontAssets = registered;
    }

    const fingerprint = asset.fingerprint;
    const existing = registered[fingerprint];
    if (existing != null) {
        return existing;
    }

    if (blob == null) {
        blob = await asset.openAsBlob();
    }

    if (blob == null) {
        console.error("Failed to open asset as blob", asset);
        return null;
    }

    const arrayBuffer = await blob.arrayBuffer();
    const fontName = Media.Text.Style.FontNameFromFontAsset(asset)
    const fontFace = new FontFace(fontName, arrayBuffer);
    await fontFace.load();
    // Register only after it was successfully loaded
    registered[fingerprint] = fontFace;
    document.fonts.add(fontFace);
    return fontFace;
}

Media.Text.Style.FontNameFromFontAsset = (fontAsset) => {
    const fingerprintComps = fontAsset.fingerprint.split(".");
    const fontName = "Font" + fingerprintComps[fingerprintComps.length - 1];
    return fontName;
}

Media.Text.Style.IsFontFamilyFromAsset = (family, fontAsset) => {
    if (!family || !fontAsset?.fingerprint) {
        return false;
    }

    const fontName = Media.Text.Style.FontNameFromFontAsset(fontAsset)
    return family.includes(fontName);
};
