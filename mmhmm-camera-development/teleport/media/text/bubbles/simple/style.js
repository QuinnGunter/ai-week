//
//  media/text/bubbles/simple/style.js
//  mmhmm
//
//  Created by Steve White on 10/9/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Simple = class extends Media.Text.Style.BubbleCore {
    constructor(family, variant, theme) {
        const fontFamily = new FontFace("Montserrat", `url(assets/fonts/Montserrat-VariableFont_wght.woff2)` );

        const attrs = {
            textAttributes: {
                font: Font({ weight: 600, bold: 800, size: 96, strikeout: { pos: 0.583, size: 0.05 }, family: fontFamily }),
                color: Color(1, 1, 1, 1),
                alignment: AdvancedTextLayer.HorizontalAlignment.Center,
            },
        };
        super(family, variant, theme, attrs);

        this.fillStyle = "#000000";
        this.shape = AdvancedTextLayer.Shape.Ellipse;
        this.contentInsets = InsetsMake(24, 24, 24, 24);
        this.shadowSize = SizeMake(24, 24);
    }
    get defaultContentSize() {
        return SizeMake(560, 560);
    }
    minimumCharacterSizeForSize(sizeEnum) {
        var pointSize = this.sizes[sizeEnum] ?? 72;
        return pointSize * 1.7;
    }
    //
    // Shapes
    //
    newTailForSize(width, height, angle) {
        // Intentionally blank, subclass responsibility
        return null;
    }
    newShellForSize(width, height) {
        var center = PointMake(
            width / 2,
            height / 2,
        );

        var radius = SizeMake(
            width / 2,
            height / 2
        );

        var path = new Path2D();
        path.ellipse(
            center.x, center.y,
            radius.width, radius.height,
            0, 0, Math.PI * 2
        );
        return path;
    }
    //
    // Drawing
    //
    drawPathInContext(path, context, shadowSize, width, heght) {
        context.save();
        context.translate(shadowSize.width, shadowSize.height);
        context.fillStyle = Color(0, 0, 0, 0.4);
        context.fill(path);
        context.restore();

        context.fillStyle = this.fillStyle;
        context.fill(path);
    }
    drawPreviewInContext(context, width, height) {
        var path = this.newShellForSize(width, height);
        var shadow = SizeMake(8, 8);
        this.drawPathInContext(path, context, shadow, width, height);
    }
    drawInContext(context, width, height) {
        const backgroundInset = this.backgroundInset ?? 0;

        const doubleInset = backgroundInset * 2;
        const insetWidth = width - doubleInset;
        const insetHeight = height - doubleInset;
        if (insetWidth <= 0 || insetHeight <= 0) {
            return;
        }
        const shadowSize = this.shadowSize;

        const path = this.newShellForSize(insetWidth, insetHeight);

        const tail = this.newTailForSize(insetWidth, insetHeight, this.angle);
        if (tail != null) {
            // Add the tail to the shell
            const transform = this.newTailTransformForSize(insetWidth, insetHeight, this.angle);
            var matrix = null;
            if (transform != null) {
                matrix = AffineTransformToDOMMatrix(transform);
            }
            path.addPath(tail, matrix);
        }

        // As we'll be changing the matrix, save state so
        // we can restore when we're done
        context.save();
        context.translate(backgroundInset, backgroundInset);

        this.drawPathInContext(path, context, shadowSize, insetWidth, insetHeight);

        context.restore();
    }
}

