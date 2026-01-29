//
//  layers_canvas.js
//  mmhmm
//
//  Created by Steve White on 9/28/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

/**
 * @extends {RenderLayer}
 */
class CanvasLayer extends RenderLayer {
    /**
     * @param {number} width The width of the layer
     * @param {number} height The height of the layer
     * @return {CanvasLayer}
     */
    constructor(width, height) {
        super();

        if (window.OffscreenCanvas != null && navigator.vendor.startsWith("Apple") == false) {
            this.contents = new OffscreenCanvas(width, height);
        }
        else {
            this.contents = document.createElement("canvas");
        }

        this.context = this.contents.getContext("2d");
        this.size = SizeMake(width, height);
    }
    _copyOnto(copy) {
        // RenderLayer will overwrite _contents, and the
        // two layers will end up sharing the same canvas.
        // So we'll store the copy's canvas, let super copy
        // things over, and then restore it.
        var contents = copy._contents;
        super._copyOnto(copy);
        copy._contents = contents;

        var size = this.size;
        contents.width = size.width;
        contents.height = size.height;
    }
    /** @type {Size} */
    set size(size) {
        super.size = size;
        var contents = this.contents;
        if (contents != null) {
            var width = Math.ceil(size.width);
            var height = Math.ceil(size.height);
            var changed = false;
            // Only change the property when necessary
            // Otherwise Chrome will clear the canvas contents
            // Which will screw up hit test mask generation
            if (width != contents.width) {
                contents.width = width;
                changed = true;
            }
            if (height != contents.height) {
                contents.height = height;
                changed = true;
            }
            if (changed == true) {
                this._hitTestMask = null;
            }
        }
    }
    get size() {
        return super.size;
    }
    /** @private **/
    canvasForHitTestMask() {
        return this.contents;
    }
    /** @private **/
    get hitTestMask() {
        var mask = this._hitTestMask;
        if (mask != null) {
            return mask;
        }

        var canvas = this.canvasForHitTestMask();
        var context = canvas.getContext("2d");

        var width = canvas.width;
        var height = canvas.height;

        var imagedata = context.getImageData(0, 0, width, height);
        var bytes = imagedata.data;

        var data = new Uint8Array(width * height);
        for (var inidx = 0, outidx = 0; inidx < bytes.length; inidx += 4, outidx += 1) {
            data[outidx] = bytes[inidx + 3];
        }

        mask = new RendererArrayContents(data, width, height);
        this._hitTestMask = mask;

        return mask;
    }
    /**
     * @param {Point} point Pixel coordinate being inquired about
     * @return (number[]}
     */
    colorAtPoint(point) {
        var imagedata = this.context.getImageData(point.x, point.y, 1, 1);
        var bytes = imagedata.data;
        return new Uint8Array(bytes);
    }
    /**
     * @param {CanvasRenderingContext2D} context The a context to draw in
     * @param {number} width The width of the context
     * @param {number} height The height of the context
     */
    drawInContext(context, width, height) {
        throw AbstractError();
    }
    draw() {
        this.contentsNeedUpdate = true;

        var context = this.context;
        var width = this.contents.width;
        var height = this.contents.height;
        context.clearRect(0, 0, width, height);
        this.drawInContext(context, width, height);
        this._hitTestMask = null;
    }
}
