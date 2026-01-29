//
//  masker.js
//  mmhmm
//
//  Created by Steve White on 8/5/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class PresenterMaskerLayer extends PresenterVideoLayer {
    get usesHitTestMask() {
        return false;
    }
    startHitTestTask() {
        // Intentionally blank
    }
    _updateFilters() {
        super._updateFilters();

        const presenter = this.presenter;
        const segFilter = this.segFilter;

        if (presenter.physicalGreenScreen == true) {
            // We don't need to replace the background with pure green
            // if we're using a physical green screen - the remote side
            // will just run chroma keying on us
            // Similarly, they'll apply the paint for us
            segFilter.style = Presenter.BackgroundStyle.Show;
            segFilter.paint = null;
        }
        else if (presenter.backgroundStyle == Presenter.BackgroundStyle.Hide) {
            // We'll fill in our background with pure green,
            // but the remote side can apply the paint for us
            segFilter.paint = null;
        }

        // Send the full frame; the remote side will apply the shape mask
        segFilter.shape = "rectangle";
    }
    set filters(list) {
        // We only want the segmentation filter to be active
        // Any additional filters need to be ran on the remote end
        super.filters = list.filter(filter => filter == this.segFilter);
    }
    get filters() {
        return super.filters;
    }
}

/*
 * This class is used to create a masked image to
 * send out via WebRTC
 */
class PresenterMasker {
    constructor(presenter) {
        this.presenter = presenter;

        var canvas = document.createElement("canvas");
        this.canvas = canvas;

        // TODO (eslint, debugging, no-constant-condition): make a debug flag
        /* eslint-disable no-constant-condition */
        if (false) {
            // Change to true to see the canvas in the DOM
            // to aid in debugging.
            document.body.appendChild(canvas);
            canvas.style.width = `${1920 / 5}px`;
            canvas.style.height = `${1080 / 5}px`;
            canvas.style.zIndex = 10000;
            canvas.style.position = "absolute";
            canvas.style.left = "300px"
            canvas.style.top = "800px"
        }
        /* eslint-enable no-constant-condition */

        var vendor = navigator.vendor;
        var needsCanvasAdapter = false;
        if (vendor == "" && navigator.userAgent.indexOf("Firefox") != -1) {
            needsCanvasAdapter = true;
        }
        else if (vendor.startsWith("Apple") == true) {
            /*
             * WebKit has a memory leak when using a captureStream
             * from an HTMLCanvasElement using a webgl context.
             * We'll use a 2D context for WebKit for now..
             * See: https://github.com/All-Turtles/TeleportWeb/issues/107
             */
            needsCanvasAdapter = true;

            var versionMatch = navigator.appVersion.match(/Safari\/([0-9]*)/);
            if (versionMatch != null || versionMatch.length == 2) {
                // The leak seems to have gone away in Safari 17.0
                if (parseInt(versionMatch[1]) >= 605) {
                    needsCanvasAdapter = false;
                }
            }
        }

        if (needsCanvasAdapter == true) {
            this.context = canvas.getContext("2d");
            console.info("Using 2D context work around for leaks");
        }
        else {
            this.renderer = new Renderer(canvas);
            this.renderer.clearColor = [0, 1, 0, 1];

            this.layer = new PresenterMaskerLayer();
            this.layer.presenter = presenter;
            this.renderer.rootLayer.addSublayer(this.layer);
        }
    }
    destroy() {
        this.stop();
        const layer = this.layer;
        if (layer != null) {
            layer.presenter = null;
            this.layer = null;
        }
    }
    stop() {
        var outputStream = this._outputStream;

        var outputTrack = this._outputTrack;
        if (outputTrack != null) {
            outputTrack.stop();
            if (outputStream != null) {
                outputStream.removeTrack(outputTrack);
            }
            this._outputTrack = null;
        }

        this._outputStream = null;
    }
    get outputStream() {
        var stream = this._outputStream;
        if (stream == null) {
            stream = this.canvas.captureStream(30);
            this._outputStream = stream;
        }
        return stream;
    }
    get outputTrack() {
        var outputTrack = this._outputTrack;
        if (outputTrack == null) {
            outputTrack = this.outputStream.getVideoTracks()[0];
            this._outputTrack = outputTrack;
        }
        return outputTrack;
    }
    handleVideoResize(size) {
        this.size = size;

        var renderer = this.renderer;
        if (renderer != null) {
            renderer.size = size;
            this.layer.frame = RectMake(0, 0, size.width, size.height);
        }
        else {
            var canvas = this.canvas;
            canvas.width = size.width;
            canvas.height = size.height;
        }
    }
    drawMaskInContext(mask, videoContext) {
        if (mask == null) {
            return null;
        }

        var masker2D = this.masker2D;
        if (masker2D == null) {
            var maskCanvas = document.createElement("canvas");
            maskCanvas.width = mask.width;
            maskCanvas.height = mask.height;
            var maskContext = maskCanvas.getContext("2d");
            masker2D = {
                canvas: maskCanvas,
                context: maskContext,
                size: SizeMake(mask.width, mask.height)
            };
            this.masker2D = masker2D;
        }

        // Ensure the canvas is the correct size for the mask
        if (masker2D.size.width != mask.width || masker2D.size.height != mask.height) {
            var canvas = masker2D.canvas;
            canvas.width = mask.width;
            canvas.height = mask.height;
            masker2D.size = SizeMake(mask.width, mask.height);
        }

        // Store mask bytes on the context's imageData
        {
            var maskData = mask.array;
            const maskContext = masker2D.context;

            var imageData = maskContext.getImageData(0, 0, mask.width, mask.height);
            var imageBytes = imageData.data;

            for (var maskIdx = 0, imageIdx = 0; maskIdx < maskData.length; maskIdx += 1) {
                var maskValue = maskData[maskIdx];

                imageBytes[imageIdx++] = 0;
                imageBytes[imageIdx++] = 255;
                imageBytes[imageIdx++] = 0;
                imageBytes[imageIdx++] = (255 - maskValue);
            }

            maskContext.putImageData(imageData, 0, 0);
        }

        // Draw the mask canvas on top of the videoContext
        videoContext.drawImage(masker2D.canvas, 0, 0, this.size.width, this.size.height);
    }
    render(renderable, mask, userScale) {
        var renderer = this.renderer;
        var scaled = userScale;
        if (scaled < 0.0156) {
            // 20 pixels for 1280
            scaled = 0.0156;
        }
        else if (scaled > 1.0) {
            scaled = 1.0;
        }

        // Extract the frame of video and get its size
        var videoFrame = renderable;
        if (renderable.videoFrame != null) {
            videoFrame = renderable.videoFrame;
        }

        var width = videoFrame.videoWidth;
        if (width == null) {
            width = videoFrame.codedWidth;
            if (!width) {
                width = videoFrame.width;
            }
        }
        var height = videoFrame.videoHeight;
        if (height == null) {
            height = videoFrame.codedHeight;
            if (!height) {
                height = videoFrame.height;
            }
        }
        var useWidth = width;
        var useHeight = height;
        if (scaled < 1.0) {
            // Width needs to be a power of 4 for the video encoding
            // Using 80 so it does not change the video frame size as frequently
            useWidth = Math.ceil((width * scaled) / 80) * 80;
            useHeight = Math.floor(useWidth / 1.777778);

            // Scale height to aspect ratio then round to an even size
            if (useHeight & 1) {
                useHeight += 1;
            }
        }
        var size = SizeMake(useWidth, useHeight);
        if (SizeEquals(size, this.size) == false) {
            this.handleVideoResize(size);
        }

        if (renderer != null) {
            var layer = this.layer;
            layer.contents = renderable;
            layer.mask = mask;

            renderer.render(0);
            return;
        }

        var context = this.context;

        if (renderable.drawInContext != null) {
            renderable.drawInContext(context);
        }
        else {
            context.drawImage(renderable, 0, 0, useWidth, useHeight);
        }

        // Then draw the mask over it
        this.drawMaskInContext(mask, context);
    }
}
