//
//  presenters/layers/shadow.js
//  mmhmm
//
//  Created by Steve White on 2/24/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

class PresenterShadowLayer extends CanvasLayer {
    constructor() {
        // CanvasLayer needs a width & height
        super(1920, 1080);
        this.shadowBlur = 25;
        this.shadowOffset = PointMake(0, 10);
        this.shadowColor = Color(0, 0, 0, 0.47);
    }
    set size(size) {
        const previous = this.size;
        super.size = size;
        if (SizeEquals(previous, size) == false) {
            this.redraw();
        }
    }
    get size() {
        return super.size;
    }
    set shadowBlur(val) {
        if (val == this.shadowBlur) {
            return;
        }
        this._shadowBlur = val;
        this.redraw();
    }
    get shadowBlur() {
        return this._shadowBlur ?? 0;
    }
    set shadowOffset(val) {
        if (PointEquals(val, this.shadowOffset) == true) {
            return;
        }
        this._shadowOffset = PointCopy(val);
        this.redraw();
    }
    get shadowOffset() {
        return PointCopy(this._shadowOffset);
    }
    set shadowColor(val) {
        if (val == this._shadowColor) {
            return;
        }
        this._shadowColor = val;
        this.redraw();
    }
    get shadowColor() {
        return this._shadowColor ?? Color(0,0,0,0);
    }
    set shape(val) {
        if (val == this._shape) {
            return;
        }
        this._shape = val;
        this.redraw();
    }
    get shape() {
        return this._shape ?? Presenter.Shape.Rectangle;
    }
    set polygonSides(val) {
        if (val == this._polygonSides) {
            return;
        }
        this._polygonSides = val;
        this.redraw();
    }
    get polygonSides() {
        return this._polygonSides ?? 6;
    }
    redraw() {
        if (this._redrawTimeout == null) {
            this._redrawTimeout = window.setTimeout(() => {
                this.draw();
                this._redrawTimeout = null;
            }, 1000/60);
        }
    }
    frameFromSize(size) {
        const frame = RectMake(0, 0, size.width, size.height);

        const shadowOffset = this.shadowOffset;
        if (shadowOffset.x < 0) {
            frame.x += shadowOffset.x;
        }
        else {
            frame.width += shadowOffset.x;
        }

        if (shadowOffset.y < 0) {
            frame.y += shadowOffset.y;
        }
        else {
            frame.height += shadowOffset.y;
        }

        const shadowBlur = -this.shadowBlur;
        const insets = InsetsMake(shadowBlur, shadowBlur, shadowBlur, shadowBlur);
        return RectInset(frame, insets);
    }
    drawInContext(context, width, height) {
        context.clearRect(0, 0, width, height);

        const frame = RectMake(0, 0, width, height);

        const shadowOffset = this.shadowOffset;
        if (shadowOffset.y < 0) {
            frame.y -= shadowOffset.y;
            frame.height += shadowOffset.y;
        }
        else {
            frame.height -= shadowOffset.y;
        }

        if (shadowOffset.x < 0) {
            frame.x -= shadowOffset.x;
            frame.height -= shadowOffset.x;
        }
        else {
            frame.width -= shadowOffset.x;
        }

        const shadowBlur = this.shadowBlur;
        const insets = InsetsMake(shadowBlur, shadowBlur, shadowBlur, shadowBlur);
        const boxRect = RectInset(frame, insets);

        const shape = this.shape;
        const drawShape = () => {
            context.fillStyle = "white";
            if (shape == Presenter.Shape.Rectangle) {
                context.fillRect(boxRect.x, boxRect.y, boxRect.width, boxRect.height);
            }
            else if (shape == Presenter.Shape.Circle) {
                const radius = Math.min(RectGetWidth(boxRect), RectGetHeight(boxRect)) * 0.49;
                const center = PointMake(RectGetMidX(boxRect), RectGetMidY(boxRect));
                context.arc(center.x, center.y, radius, 0, 2 * Math.PI);
                context.fill();
            }
            else if (shape == Presenter.Shape.Polygon) {
                const numSides = this.polygonSides;
                // XXX: Why is the +15 needed?!
                const size = RectGetHeight(boxRect) + 15;
                const radius = Polygon.RadiusForNGonOfHeight(numSides, size);
                const center = PointMake(RectGetMidX(boxRect), RectGetMidY(boxRect));
                const polygon = Polygon.NewNGon(numSides, center, radius);

                // The Polygon doesn't support rounded corners.
                // So we'll make them here...
                const points = polygon.points;
                const angle = degreesToRadians(360/numSides);
                const roundInset = degreesToRadians(90 + (180/numSides));

                // This needs to match the presenter seg filter value.
                const rounded = size * 0.1;
                context.beginPath();
                points.forEach((point, idx) => {
                    const current = degreesToRadians(270) + (angle * idx);

                    const cp1 = {
                      x: point.x + (rounded * Math.cos(current - roundInset)),
                      y: point.y + (rounded * Math.sin(current - roundInset))
                    };

                    const cp2 = {
                      x: point.x + (rounded * Math.cos(current + roundInset)),
                      y: point.y + (rounded * Math.sin(current + roundInset))
                    };

                    if (idx == 0) {
                        context.moveTo(cp1.x, cp1.y);
                    }

                    context.lineTo(cp1.x, cp1.y);
                    context.arcTo(point.x, point.y, cp2.x, cp2.y, rounded/2);
                    context.lineTo(cp2.x, cp2.y);
                })

                context.closePath();
                context.fill();
            }
        }

        // Fill the shape with a shape
        context.save();
        context.shadowBlur = shadowBlur;
        context.shadowOffsetX = shadowOffset.x;
        context.shadowOffsetY = shadowOffset.y;
        context.shadowColor = this.shadowColor;
        drawShape();
        context.restore();

        // And then clear out the shape itself
        context.save();
        context.globalCompositeOperation = "destination-out";
        drawShape();
        context.restore();
    }
}
