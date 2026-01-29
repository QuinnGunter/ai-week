//
//  media/namebadge/textlayer.js
//  mmhmm
//
//  Created by Steve White on 3/11/25.
//  Copyright © 2025 mmhmm, inc. All rights reserved.
//

Media.NameBadge.TextLayer = class extends Media.NameBadge.LayerMixin(AdvancedTextLayer) {
    constructor(hideWhenEmpty=false) {
        super();
        this._hideWhenEmpty = hideWhenEmpty;
        this.userInteractionEnabled = false;
    }
    get hideWhenEmpty() {
        return this._hideWhenEmpty === true;
    }

    diamondBorderPathInContextForLine(context, x, w, y, h) {
        const path = new Path2D();

        const radius = 1.5;
        const diameter = radius * 2;
        const spacing = 3;
        const shift = ((radius + diameter) * 2) + spacing;

        const center = PointMake(x + (w/2), y + (h/2));
        const diamonds = [center];
        if (w > h) {

            const left = PointMake(center.x - shift, center.y);
            const right = PointMake(center.x + shift, center.y);
            diamonds.push(left, right);

            path.moveTo(x, y);
            path.lineTo(left.x - shift, y);

            path.moveTo(right.x + shift, y);
            path.lineTo(x + w, y);
        }
        else {
            const up = PointMake(center.x, center.y - shift);
            const down = PointMake(center.x, center.y + shift);
            diamonds.push(up, down);

            path.moveTo(x, y);
            path.lineTo(x, up.y - shift);

            path.moveTo(x, down.y + shift);
            path.lineTo(x, y + h);
        }

        diamonds.forEach(center => {
            const points = [
                PointMake(center.x, center.y - diameter),
                PointMake(center.x, center.y + diameter),
                PointMake(center.x - diameter, center.y),
                PointMake(center.x + diameter, center.y),
            ];

            points.forEach(point => {
                path.moveTo(point.x, point.y);
                path.arc(point.x, point.y, radius, 0, 2 * Math.PI);
            })
        })

        return path;
    }
    drawBorderInContext(border, context, width, height) {
        let color = border.color ?? this.foregroundColor;
        if (color.toCSS != null) {
            color = color.toCSS(true);
        }
        context.fillStyle = color;
        context.strokeStyle = color;

        const margin = border.margin;
        const lengths = border.length;
        const bounds = RectMake(0, 0, width, height);
        const box = RectInset(bounds, margin);

        const drawLine = (x, y, w, h) => {
            if (border.style == "diamond") {
                const path = this.diamondBorderPathInContextForLine(context, x, w, y, h);
                context.stroke(path);
                context.fill(path);
            }
            else {
                context.fillRect(x, y, w, h);
            }
        }

        const top = border.top;
        if (top != null && top > 0) {
            context.lineWidth = top;
            const length = lengths?.top ?? RectGetWidth(box);
            drawLine(RectGetMinX(box), RectGetMinY(box), length, top);
        }
        const left = border.left;
        if (left != null && left > 0) {
            context.lineWidth = left;
            const length = lengths?.left ?? RectGetHeight(box);
            drawLine(RectGetMinX(box), RectGetMinY(box), left, length);
        }
        const bottom = border.bottom;
        if (bottom != null && bottom > 0) {
            context.lineWidth = bottom;
            const length = lengths?.bottom ?? RectGetWidth(box);
            drawLine(RectGetMaxX(box) - length, RectGetMaxY(box) - bottom, length, bottom);
        }
        const right = border.right;
        if (right != null && right > 0) {
            context.lineWidth = right;
            const length = lengths?.right ?? RectGetHeight(box);
            drawLine(RectGetMaxX(box) - right, RectGetMaxY(box) - length, right, length);
        }
    }
    drawInContext(context, width, height) {
        this.hidden = this.hideWhenEmpty == true && this.isEmpty();

        let backgroundColor = this.backgroundColor;
        if (backgroundColor != null) {
            context.save();

            // Using the clip points is only applicable
            // when filling the background
            const clipPoints = this.clipPoints;
            if (clipPoints != null && clipPoints.length == 4) {
                const tl = clipPoints[0];
                const tr = clipPoints[1];
                const bl = clipPoints[2];
                const br = clipPoints[3];

                const path = new Path2D();
                path.moveTo(tl.x, tl.y);
                path.lineTo(width - tr.x, tr.y);
                path.lineTo(width - br.x, height - br.y);
                path.lineTo(bl.x, height - bl.y);
                path.closePath();

                context.clip(path);
            }

            if (backgroundColor.fillInContext != null) {
                backgroundColor.fillInContext(context, SizeMake(width, height));
            }
            else {
                if (backgroundColor.toCSS != null) {
                    backgroundColor = backgroundColor.toCSS(true);
                }
                context.fillStyle = backgroundColor;
                context.fillRect(0, 0, width, height);
            }

            context.restore();
        }

        const border = this.border;
        if (border != null) {
            this.drawBorderInContext(border, context, width, height);
        }

        // The padding will already be applied due
        // to us overriding textRect
        super.drawInContext(context, width, height);

        this.needsDisplay = false;
    }

    fullSizeThatFits(maxSize) {
        const padding = this.padding;
        const size = SizeCopy(maxSize);
        size.width -= padding.left + padding.right;
        size.height -= padding.top + padding.bottom;

        const result = super.fullSizeThatFits(size);
        const maxNumberOfLines = this.maxNumberOfLines;
        if (this.hideWhenEmpty == true && this.isEmpty()) {
            result.size = SizeZero();
        } else if (maxNumberOfLines > 0 && result.lines.length > maxNumberOfLines) {
            const lines = result.lines.splice(0, maxNumberOfLines);
            const size = SizeZero();
            lines.forEach(line => {
                size.width = Math.max(size.width, line.width);
                size.height += line.height;
            })
            result.lines = lines;
            result.size = size;
            result.fits = false;
            // XXX: unsure how to populate wrappedOnCharacter really...
        }

        result.size.width += padding.left + padding.right;
        result.size.height += padding.top + padding.bottom;

        return result;
    }

    recalculate() {
        super.recalculate();
        this.needsLayout = false;

        const maxNumberOfLines = this.maxNumberOfLines;
        if (maxNumberOfLines > 0) {
            this.lines = this.lines.splice(0, maxNumberOfLines);
        }
    }

    get textRect() {
        const textRect = super.textRect;
        const padding = this.padding;
        textRect.x += padding.left;
        textRect.y += padding.top;
        textRect.width -= padding.left + padding.right;
        textRect.height -= padding.top + padding.bottom;
        return textRect;
    }

    setNeedsDisplay() {
        this.needsDisplay = true;
    }

    setNeedsLayout() {
        this.needsLayout = true;

        this.lines = [];

        let font = this.font;
        const fontFace = this.fontFace;
        if (fontFace != null) {
            const bits = font.toJSON();
            bits.family = fontFace;
            font = new Font(bits);
        }

        let foregroundColor = this.foregroundColor;
        if (foregroundColor?.toCSS != null) {
            foregroundColor = foregroundColor.toCSS(true);
        }

        const string = this.string;
        const attributes = {
            font: font,
            color: foregroundColor,
            transform: this.textTransform,
        }

        this.attributedString = new AttributedString(string, attributes);
        this.needsDisplay = true;
    }

    /** @type {String} */
    set string(string) {
        const previous = this._string;
        if (string == previous) {
            return;
        }
        this._string = string;
        this.setNeedsLayout();
    }
    get string() {
        return this._string ?? "";
    }
    isEmpty() {
        return this.string.trim().length == 0;
    }


    /** @type {number} */
    set maxNumberOfLines(number) {
        const previous = this._maxNumberOfLines;
        if (previous == number) {
            return;
        }
        this._maxNumberOfLines = number;
        this.setNeedsLayout();
    }
    get maxNumberOfLines() {
        return this._maxNumberOfLines ?? 0;
    }

    /** @type {String=} */
    set backgroundColor(color) {
        const previous = this._backgroundColor;
        if (EqualObjects(previous, color) == true) {
            return;
        }

        this._backgroundColor = color;
        this.setNeedsDisplay();
    }
    get backgroundColor() {
        return this._backgroundColor;
    }

    /** @type {String} */
    set foregroundColor(color) {
        const previous = this._foregroundColor;
        if (EqualObjects(previous, color) == true) {
            return;
        }

        this._foregroundColor = color;
        this.setNeedsLayout();
    }
    get foregroundColor() {
        return this._foregroundColor ?? Paint.Black();
    }

    /** @type {Font} */
    set font(font) {
        const previous = this._font;
        if (font != null && font.toJSON == null) {
            font = new Font(font);
        }
        if (EqualObjects(font, previous) == true) {
            return;
        }

        this._font = font;
        this.setNeedsLayout();
    }
    get font() {
        let font = this._font;
        if (font == null) {
            font = new Font({ family: "sans-serif", size: 72 });
            this._font = font;
        }
        return font;
    }

    set fontFace(fontFace) {
        const previous = this._fontFace;
        if (fontFace == previous) {
            return;
        }
        this._fontFace = fontFace;
        this.setNeedsLayout();
    }
    get fontFace() {
        return this._fontFace;
    }

    /** @type {String=} */
    set textTransform(textTransform) {
        const previous = this._textTransform;
        if (EqualObjects(textTransform, previous) == true) {
            return;
        }

        this._textTransform = textTransform;
        this.setNeedsLayout();
    }
    get textTransform() {
        return this._textTransform;
    }

    /** @type {Insets=} */
    set padding(padding) {
        const previous = this._padding;
        if (InsetsEqual(previous, padding) == true) {
            return;
        }
        this._padding = InsetsCopy(padding);
        this.setNeedsLayout();
    }
    get padding() {
        return InsetsCopy(this._padding);
    }

    /** @type {Insets=} */
    set margin(margin) {
        const previous = this._margin;
        if (InsetsEqual(previous, margin) == true) {
            return;
        }
        this._margin = margin;
        // This'll cause the text to be unnecessarily invalidated...
        this.setNeedsLayout();
    }
    get margin() {
        return InsetsCopy(this._margin);
    }

    // This needs to be an array of four points
    // These define the shape that will be used
    // when filling the background color
    // ([0]=tr, [1]=tl, [2]=bl, [3]=br)
    /** @type {[Point]=} */
    set clipPoints(points) {
        const previous = this.clipPoints;
        if (EqualObjects(points, previous) == true) {
            return;
        }

        if (points != null) {
            points = points.map(point => PointCopy(point));
        }
        this._clipPoints = points;
        this.setNeedsDisplay();
    }
    get clipPoints() {
        const clipPoints = this._clipPoints;
        if (clipPoints == null) {
            return null;
        }
        return clipPoints.map(point => PointCopy(point));
    }

    /** @type {AdvancedTextLayer.HorizontalAlignment} */
    set horizontalAlignment(alignment) {
        const previous = this._horizontalAlignment;
        if (previous == alignment) {
            return;
        }

        this._horizontalAlignment = alignment;
        this.setNeedsDisplay();
    }
    get horizontalAlignment() {
        return this._horizontalAlignment;
    }

    /** @type {AdvancedTextLayer.VerticalAlignment} */
    set verticalAlignment(alignment) {
        const previous = this._verticalAlignment;
        if (previous == alignment) {
            return;
        }

        this._verticalAlignment = alignment;
        this.setNeedsDisplay();
    }
    get verticalAlignment() {
        return this._verticalAlignment;
    }

    set size(size) {
        const previous = super.size;
        if (SizeEquals(previous, size) == true) {
            return;
        }
        super.size = size;
        this.setNeedsLayout();
    }
    get size() {
        return super.size;
    }

    /** @type {number=} */
    set top(top) {
        const previous = this._top;
        if (top == previous) {
            return;
        }
        this._top = top;
        this.setNeedsLayout();
    }
    get top() {
        return this._top;
    }

    /** @type {number=} */
    set left(left) {
        const previous = this._left;
        if (left == previous) {
            return;
        }
        this._left = left;
        this.setNeedsLayout();
    }
    get left() {
        return this._left;
    }

    /** @type {number=} */
    set bottom(bottom) {
        const previous = this._bottom;
        if (bottom == previous) {
            return;
        }
        this._bottom = bottom;
        this.setNeedsLayout();
    }
    get bottom() {
        return this._bottom;
    }

    /** @type {number=} */
    set right(right) {
        const previous = this._right;
        if (right == previous) {
            return;
        }
        this._right = right;
        this.setNeedsLayout();
    }
    get right() {
        return this._right;
    }

    set border(border) {
        const previous = this._border;
        if (EqualObjects(border, previous) == true) {
            return;
        }
        this._border = border;
        this.setNeedsDisplay();
    }
    get border() {
        return this._border;
    }

    decodeObjectForProperty(object, prop) {
        if (prop == "font" && object != null) {
            return new Font(object);
        }
        return super.decodeObjectForProperty(object, prop);
    }

    get codingProperties() {
        return [
            'string', 'backgroundColor', 'foregroundColor', 'font', 'fontFace',
            'padding', 'margin', 'clipPoints', 'verticalAlignment', 'horizontalAlignment',
            'numberOfLines', 'top', 'left', 'bottom', 'right', 'textTransform', 'border'
        ]
    }
}
