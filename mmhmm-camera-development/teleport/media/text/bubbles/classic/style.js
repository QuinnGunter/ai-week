//
//  media/text/bubbles/classic/style.js
//  mmhmm
//
//  Created by Steve White on 10/9/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Classic = class extends Media.Text.Style.BubbleCore {
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
    }
    get defaultContentSize() {
        return SizeMake(600, 400);
    }
    minimumCharacterSizeForSize(sizeEnum) {
        var pointSize = this.sizes[sizeEnum] ?? 72;
        return pointSize * 1.9;
    }
    newPathForSize(width, height) {
        var path = this.newShellForSize(width, height);

        var tail = this.newTailForSize(width, height, this.angle);
        if (tail != null) {
            var transform = this.newTailTransformForSize(width, height, this.angle);
            var matrix = null;
            if (transform != null) {
                matrix = AffineTransformToDOMMatrix(tail.transform);
            }

            path.addPath(tail, matrix);
        }
        return path;
    }
    drawWithStrokeWidthInContext(context, strokeWidth, width, height) {
        var path = this.newPathForSize(width - strokeWidth, height - strokeWidth);

        context.save();
        context.translate(strokeWidth/2, strokeWidth/2);
        context.fillStyle = this.primaryColor ?? "#FFFFFF";
        context.strokeStyle = this.secondaryColor ?? "#000000";
        context.lineWidth = strokeWidth;
        context.fill(path);
        context.stroke(path);
        context.restore();
    }
    drawPreviewInContext(context, width, height) {
        this.drawWithStrokeWidthInContext(context, 2, width, height);
    }
    drawInContext(context, width, height, strokeWidth) {
        // As we'll be changing the matrix, save state so
        // we can restore when we're done
        context.save();

        var backgroundInset = this.backgroundInset ?? 0;
        context.translate(backgroundInset, backgroundInset);

        var doubleInset = backgroundInset * 2;
        var insetWidth = width - doubleInset;
        var insetHeight = height - doubleInset;

        this.drawWithStrokeWidthInContext(context, 6, insetWidth, insetHeight);

        context.restore();
    }
}

