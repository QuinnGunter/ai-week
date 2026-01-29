//
//  media/namebadge/bglayer.js
//  mmhmm
//
//  Created by Steve White on 3/13/25.
//  Copyright © 2025 mmhmm, inc. All rights reserved.
//

Media.NameBadge.BackgroundLayer = class extends Media.NameBadge.LayerMixin(CanvasLayer) {
    constructor() {
        super(0,0);
    }
    setNeedsDisplay() {
        this.needsDisplay = true;
    }

    set size(size) {
        const previous = super.size;
        if (SizeEquals(previous, size) == true) {
            return;
        }
        super.size = size;
        this.setNeedsDisplay();
    }
    get size() {
        return super.size;
    }

    drawInContext(context, width, height) {
        const paint = this.paint;
        if (paint != null && paint.fillInContext != null) {
            paint.fillInContext(context, SizeMake(width, height));
        }

        const border = this.border;
        if (border != null) {
            let color = border.color;
            if (color != null && color.toCSS != null) {
                color = color.toCSS(true);
            }
            const margin = border.margin;
            if (color != null) {
                context.fillStyle = color;

                let box = RectMake(0, 0, width, height);
                box = RectInset(box, margin);

                const top = border.top;
                if (top != null && top > 0) {
                    context.fillRect(RectGetMinX(box), RectGetMinY(box), RectGetWidth(box), top);
                }
                const left = border.left;
                if (left != null && left > 0) {
                    context.fillRect(RectGetMinX(box), RectGetMinY(box), left, RectGetHeight(box));
                }
                const bottom = border.bottom;
                if (bottom != null && bottom > 0) {
                    context.fillRect(RectGetMinX(box), RectGetMaxY(box) - bottom, RectGetWidth(box), bottom);
                }
                const right = border.right;
                if (right != null && right > 0) {
                    context.fillRect(RectGetMaxX(box) - right, RectGetMinY(box), right, RectGetHeight(box));
                }
            }
        }
        this.needsDisplay = false;
    }

    set paint(paint) {
        const previous = this._paint;
        if (EqualObjects(paint, previous) == true) {
            return;
        }
        this._paint = paint;
        this.setNeedsDisplay();
    }
    get paint() {
        return this._paint;
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

    get codingProperties() {
        return ["paint", "border"];
    }

    decodeObjectForProperty(object, prop) {
        if (prop == "paint" && object != null && object.toJSON == null) {
            return Paint.FromJSON(object);
        }
        return super.decodeObjectForProperty(object, prop);
    }
}
