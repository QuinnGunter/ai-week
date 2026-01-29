//
//  advanced.js
//  mmhmm
//
//  Created by Steve White on 12/21/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

/**
 * @extends {CanvasLayer}
 */
class AdvancedTextLayer extends CanvasLayer {
    /**
     * @override
     * @constructor
     * @param {Rect} frame The frame layer's frame
     */
    constructor(frame) {
        if (frame == null) {
            frame = RectZero();
        }
        super(frame.width, frame.height); // dummy values
        this.frame = frame;
        this.verticalAlignment = AdvancedTextLayer.VerticalAlignment.Top;
        this.horizontalAlignment = AdvancedTextLayer.HorizontalAlignment.Center;
        this.typesetter = new Typesetter();

        var textBaseline = null;
        var vendor = navigator.vendor;
        if (vendor != "") {
            textBaseline = "ideographic";
        }
        else {
            textBaseline = "bottom";
        }
        this.textBaseline = textBaseline;
        this.shape = AdvancedTextLayer.Shape.Rectangle;
    }
    _copyOnto(copy) {
        super._copyOnto(copy);

        copy.verticalAlignment = this.verticalAlignment;
        copy.attributedString = this.attributedString;
    }
    /** @type AttributedString */
    set attributedString(anAttributedString) {
        this._attributedString = anAttributedString;
        this.lines = null;
    }
    get attributedString() {
        return this._attributedString;
    }
    /** @type Size */
    set size(value) {
        super.size = value;
        this.lines = null;
    }
    get size() {
        return super.size;
    }
    set verticalAlignment(val) {
        this._verticalAlignment = val;
    }
    get verticalAlignment() {
        if (this.shape == AdvancedTextLayer.Shape.Ellipse) {
            return AdvancedTextLayer.VerticalAlignment.Center;
        }
        return this._verticalAlignment;
    }
    set shape(val) {
        if (val == this._shape) {
            return;
        }
        this._shape = val;
        this._lines = null;
    }
    get shape() {
        return this._shape;
    }
    // These are overridden as we don't need the filter
    // RenderLayer would automatically create
    set cornerRadius(val) {
        const previous = this.cornerRadius;
        if (previous == val) {
            return;
        }
        this._cornerRadius = val;
        this.lines = null;
        if (this.context != null) {
            this.draw();
        }
    }
    get cornerRadius() {
        return this._cornerRadius;
    }
    /**
     * @readonly
     * @type {Rect}
     */
    get textRect() {
        const size = this.size;
        return RectMake(0, 0, size.width, size.height);
    }
    /**
     * @private
     */
    drawInContext(context, width, height) {
        var lines = this.lines;
        if (lines == null) {
            this.recalculate();
            lines = this.lines;
        }
        if (lines == null || lines.length == 0) {
            return;
        }

        context.save();
        context.textBaseline = this.textBaseline;

        var textRect = this.textRect;

        // Handle vertical alignment
        var y = RectGetMinY(textRect);
        if (this.verticalAlignment != AdvancedTextLayer.VerticalAlignment.Top) {
            var totalHeight = this.lines.reduce((height, line) => height += line.height, 0);
            if (this.verticalAlignment == AdvancedTextLayer.VerticalAlignment.Center) {
                y = RectGetMidY(textRect) - Math.min(RectGetHeight(textRect), totalHeight) / 2;
            }
            else {
                y = RectGetMaxY(textRect) - Math.min(RectGetHeight(textRect), totalHeight);
            }
        }

        // Helper for horizontal alignment
        const horizontalAlignment = this.horizontalAlignment;
        const xOrigin = (line) => {
            var center = RectGetMidX(textRect);
            var left = center - (line.maxWidth / 2);
            var right = center + (line.maxWidth / 2);
            var maxW = null;
            if (this.shape == AdvancedTextLayer.Shape.Ellipse) {
                maxW = line.maxWidth;
            }
            else {
                maxW = RectGetWidth(textRect);
            }
            var lineW = line.width;
            if (horizontalAlignment != AdvancedTextLayer.HorizontalAlignment.Left) {
                var lastGlyph = line.lastGlyph;
                if (lastGlyph?.isWhitespace == true) {
                    lineW -= lastGlyph.width;
                }
            }
            var textWidth = Math.min(lineW, maxW);

            switch (horizontalAlignment) {
                case AdvancedTextLayer.HorizontalAlignment.Left:
                default:
                    return left;
                case AdvancedTextLayer.HorizontalAlignment.Center:
                    return Math.floor(center - (textWidth / 2));
                case AdvancedTextLayer.HorizontalAlignment.Right:
                    return right - textWidth;
            }
        }

        context.beginPath();
        context.rect(
            RectGetMinX(textRect), RectGetMinY(textRect),
            RectGetWidth(textRect), RectGetHeight(textRect),
        );
        context.clip();

        // Draw the lines
        this.lines.forEach(line => {
            if (y > RectGetMaxY(textRect)) {
                return;
            }
            var x = xOrigin(line);
            var point = line.drawInContextAtPoint(context, PointMake(x, y));
            y = point.y;
        })

        context.restore();
    }
    /**
     * @private
     */
    recalculate() {
        var textRect = this.textRect;
        var maxSize = SizeMake(textRect.width, textRect.height);

        var typesetter = this.typesetter;
        if (this.shape == AdvancedTextLayer.Shape.Ellipse) {
            this.lines = typesetter.linesFromTextConstrainedToEllipse(this.attributedString, maxSize);
        }
        else {
            const cornerRadius = this.cornerRadius;
            if (cornerRadius != null && cornerRadius > 0) {
                // app specifies cornerRadius as a percent of min dimension
                // need to convert this to a pixel value
                var radius = (Math.min(maxSize.width, maxSize.height) / 2) * cornerRadius;
                this.lines = typesetter.linesFromTextConstrainedToRoundRect(this.attributedString, maxSize, radius);
            }
            else {
                this.lines = typesetter.linesFromTextConstrainedToSize(this.attributedString, maxSize);
            }
        }
    }
    /**
     * @param {Size} maxSize The maximum size considered.
     * @return {Size} The size needed to render all of the text
     */
    sizeThatFits(maxSize) {
        const {size} = this.fullSizeThatFits(maxSize);
        return size;
    }
    fullSizeThatFits(maxSize) {
        const typesetter = this.typesetter;

        let lines = null;
        if (this.shape == AdvancedTextLayer.Shape.Ellipse) {
            lines = typesetter.linesFromTextConstrainedToEllipse(this.attributedString, maxSize);
        }
        else {
            lines = typesetter.linesFromTextConstrainedToSize(this.attributedString, maxSize);
        }

        let height = 0;
        let width = 0;
        lines.forEach(line => {
            height += line.height;
            width = Math.max(width, line.width);
        });

        let result = SizeZero();
        result.height = Math.min(maxSize.height, height);
        result.width = Math.min(maxSize.width, width);

        return {
            size:result,
            fits: (typesetter.exhausted != true),
            wrappedOnCharacter: !!typesetter.wrappedOnCharacter,
            lines: lines
         };
    }
    /*
     *
     */
    lineAtPoint(point) {
        var lines = this.lines;
        if (lines == null) {
            this.recalculate();
            lines = this.lines;
        }
        if (lines == null || lines.length == 0) {
            return null;
        }
        var ourSize = this.size;
        var verticalAlignment = this.verticalAlignment;
        if (verticalAlignment != AdvancedTextLayer.VerticalAlignment.Top) {
            var textHeight = lines.reduce((total, line) => total += line.height, 0);
            if (verticalAlignment == AdvancedTextLayer.VerticalAlignment.Bottom) {
                point.y -= (ourSize.height - textHeight);
            }
            else {
                point.y -= (ourSize.height - textHeight) / 2;
            }
        }

        if (point.y < 0 || point.y > ourSize.height ||
            point.x < 0 || point.x > ourSize.width)
        {
            return null;
        }

        var y = 0;
        return lines.find(line => {
            if (point.y >= y && point.y < y + line.height) {
                return line;
            }
            y += line.height;
        })
    }
    attributesAtPoint(point) {
        var line = this.lineAtPoint(point);
        if (line == null) {
            return null;
        }
        var horizontalAlignment = this.horizontalAlignment;
        if (horizontalAlignment != AdvancedTextLayer.HorizontalAlignment.Left) {
            var lineWidth = line.width;
            var lastGlyph = line.lastGlyph;
            if (lastGlyph?.isWhitespace == true) {
                lineWidth -= lastGlyph.width;
            }

            var ourWidth = this.size.width;
            if (horizontalAlignment == AdvancedTextLayer.HorizontalAlignment.Right) {
                point.x -= (ourWidth - lineWidth);
            }
            else {
                point.x -= (ourWidth - lineWidth) / 2;
            }
        }

        var x = 0;
        var run = line.runs.find(run => {
            if (point.x >= x && point.x < x + run.width) {
                return run;
            }
            x += run.width;
            return null;
        });
        return run?.attributes;
    }
}

AdvancedTextLayer.VerticalAlignment = Object.freeze({
    Top: "top",
    Center: "center",
    Bottom: "bottom"
});

AdvancedTextLayer.HorizontalAlignment = Object.freeze({
    Left: "left",
    Center: "center",
    Right: "right"
});

AdvancedTextLayer.Shape = Object.freeze({
    Rectangle: "rect",
    Ellipse: "ellipse"
});
