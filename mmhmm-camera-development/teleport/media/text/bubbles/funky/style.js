//
//  media/text/bubbles/funky/style.js
//  mmhmm
//
//  Created by Steve White on 10/9/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Funky = class extends Media.Text.Style.BubbleCore {
    constructor(family, variant, theme) {
        const fontFamily = [
            new FontFace("KomikaHand", `url(assets/fonts/KomikaHand.woff2)` ),
            new FontFace("KomikaHand", `url(assets/fonts/KomikaHand-Bold.woff2)` )
        ];

        const attrs = {
            textAttributes: {
                font: Font({ weight: 600, bold: 800, size: 96, strikeout: { pos: 0.563, size: 0.05 }, family: fontFamily }),
                color: Color(0, 0, 0, 1),
                transform: "uppercase",
                alignment: AdvancedTextLayer.HorizontalAlignment.Center,
            },
        };
        super(family, variant, theme, attrs);

        // For the editor, so it'll create a canvas for us
        this.backgroundIsDynamic = true;
        this.shadowSize = 24;
    }
    get defaultContentSize() {
        return SizeMake(600, 400);
    }
    minimumCharacterSizeForSize(sizeEnum) {
        var pointSize = this.sizes[sizeEnum] ?? 72;
        return pointSize * 1.9;
    }
    drawPreviewInContext(context, width, height) {
        return this._drawInContextWithInset(context, width, height, 0);
    }
    drawInContext(context, width, height) {
        var bgInset = this.backgroundInset;
        return this._drawInContextWithInset(context, width, height, bgInset);
    }
    _fillOffsetsForSize(width, height) {
        var min = 0.0125; // ~ 8
        var med = 0.025;  // ~ 16
        var max = 0.0375; // ~ 24
        return {
            min: SizeMake(min * width, min * height),
            med: SizeMake(med * width, med * height),
            max: SizeMake(max * width, max * height),
        }
    }
    _drawInContextWithInset(context, width, height, bgInset) {
        var iWidth = width;
        var iHeight = height;
        if (bgInset > 0) {
            iWidth -= (bgInset * 2);
            iHeight -= (bgInset * 2);
            context.save();
            context.translate(bgInset, bgInset);
        }

        var offsets = this._fillOffsetsForSize(iWidth, iHeight);
        var offsetMin = offsets.min;
        var offsetMed = offsets.med;
        var offsetMax = offsets.max;

        var path = null;
        if (bgInset > 0) {
            path = this.newPathForSize(iWidth, iHeight);
        }
        else {
            path = this.newShellForSize(iWidth, iHeight);
        }

        context.save();
        context.translate(offsetMin.width, offsetMin.height);

        context.save();
        context.translate(offsetMed.width, offsetMed.height);
        context.fillStyle = Color(0,0,0,1);
        context.fill(path);
        context.restore();

        context.save();
        context.translate(-offsetMin.width, -offsetMin.height);
        context.fillStyle = Color(0,0,0,1);
        context.fill(path);
        context.restore();

        context.save();
        context.fillStyle = this.secondaryColor;
        context.fill(path);
        context.restore();

        context.save();
        context.clip(path);
        context.translate(offsetMin.width, -offsetMin.height);
        context.fillStyle = this.primaryColor;
        context.fill(path);
        context.restore();

        context.restore();

        if (bgInset > 0) {
            context.restore();
        }
    }
}
