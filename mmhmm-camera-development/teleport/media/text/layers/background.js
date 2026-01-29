//
//  media/text/layers/background.js
//  mmhmm
//
//  Created by Steve White on 10/24/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.BackgroundLayer = class extends CanvasLayer {
    constructor() {
        super(1, 1);
        this.hitTestMaskThreshold = 0.0001;
    }
    // These are overridden as we don't need the filter
    // RenderLayer would automatically create
    set cornerRadius(val) {
        if (val == this._cornerRadius) {
            return;
        }
        this._cornerRadius = val;
        if (this.context != null) {
            this.draw();
        }
    }
    get cornerRadius() {
        return this._cornerRadius;
    }
    set style(object) {
        var previous = this._style;
        if (previous == object) {
            return;
        }
        this._style = object;

        var useBackgroundInteraction = true;
        var opaque = false;
        if (object != null) {
            var fill = object.backgroundAttributes?.fill;
            if (fill != null) {
                // This assumes gradient paints wouldn't be
                // fully transparent.
                var color = fill.color;
                if (color != null && color[3] == 0.0) {
                    useBackgroundInteraction = false;
                }
                else if (fill[3] == 1) {
                    opaque = fill.opaque;
                }
            }
        }
        this.userInteractionEnabled = useBackgroundInteraction;
        this.opaque = opaque;
    }
    get style() {
        return this._style;
    }
    canvasForHitTestMask() {
        var style = this.style;
        if (style.drawHitTestMaskInContext == null) {
            return super.canvasForHitTestMask();
        }

        var size = this.size;
        var width = Math.floor(size.width);
        var height = Math.floor(size.height);

        var canvas = this._hitTestCanvas;
        if (canvas == null) {
            if (window.OffscreenCanvas != null) {
                canvas = new OffscreenCanvas(width, height);
            }
            else {
                canvas = document.createElement("canvas");
            }
        }
        canvas.width = width;
        canvas.height = height;

        var context = canvas.getContext("2d");
        context.save();
        style.drawHitTestMaskInContext(context, width, height);
        context.restore();
        return canvas;
    }
    hitTestPixelAtPoint(point) {
        var mask = this.hitTestMask;
        if (mask == null) {
            return null;
        }

        var width = mask.width;
        var height = mask.height;
        var x = Math.floor(point.x);
        var y = Math.floor(point.y);
        var index = (y * width) + x;

        var pixel = mask.array[index];
        return pixel;
    }
    drawInContext(context, width, height) {
        context.clearRect(0, 0, width, height);

        var style = this.style;
        if (style != null) {
            context.save();

            var cornerRadius = this.cornerRadius;
            if (cornerRadius != null && cornerRadius > 0) {
                // app specifies cornerRadius as a percent of min dimension
                // need to convert this to a pixel value
                var radius = (Math.min(width, height) / 2.0) * cornerRadius;
                var rect = RectMake(0, 0, width, height);

                var path = NewRoundRectPathForRectWithRadius(rect, radius);
                context.clip(path);
            }

            style.drawInContext(context, width, height, cornerRadius);
            context.restore();
        }
    }
}
