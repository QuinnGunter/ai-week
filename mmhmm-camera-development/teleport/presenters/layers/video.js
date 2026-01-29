//
//  video.js
//  mmhmm
//
//  Created by Steve White on 1/14/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class PresenterVideoLayer extends RenderLayer {
    constructor() {
        super();

        this.segFilter = new Presenter.SegmentationFilter();
    }
    _setContentsAddingListener(contents, addListener = true) {
        super._setContentsAddingListener(contents, addListener);
        this.hidden = (contents == null);
    }
    set hidden(val) {
        super.hidden = val;
        // We don't want to run the hit test stuff when we're hidden
        // We *may* want to run it when we're not
        this._updateMaskAndHitTest();
    }
    get hidden() {
        return super.hidden;
    }
    set mask(val) {
        const previous = this.mask;
        super.mask = val;
        if (previous != val &&
            (previous == null || val == null))
        {
            this._updateFilters();
        }
    }
    get mask() {
        return super.mask;
    }
    set opaque(val) {
        // Intentionally discarded
    }
    get opaque() {
        const presenter = this.presenter;
        if (presenter?.shape != Presenter.Shape.Rectangle) {
            // There will be alpha around our circle/hexagon shape
            return false;
        }
        if (presenter?.backgroundStyle != Presenter.BackgroundStyle.Hide) {
            // We're showing or blurring it, so there is no alpha
            return true;
        }
        const paint = presenter?.backgroundPaint;
        if (paint == null) {
            // Fully transparent around the silhouette
            return false;
        }
        // Some paints use alpha transparency, others don't...
        // Consult the paint to find out.
        return paint.opaque;
    }

    set presenter(presenter) {
        const previous = this._presenter;
        if (presenter == previous) {
            return;
        }

        const properties = [
            "physicalGreenScreen", "enhancement",
            "shape", "backgroundPaint", "effect", "backgroundStyle",
            "chromaFilter.keyRGB", "chromaFilter.range", "polygonSides",
            "blurAmount"
        ];

        if (previous != null) {
            properties.forEach(prop => previous.removeObserverForKeyPath(this, prop));
        }

        this._presenter = presenter;

        if (presenter != null) {
            properties.forEach(prop => presenter.addObserverForKeyPath(this, prop));
        }

        this._updateFilters();
        this._updateMaskAndHitTest();
    }
    get presenter() {
        return this._presenter;
    }

    _updateFilters() {
        // Preserve user-added filters (LUT, Tune) that aren't managed by this method
        const existingFilters = this.filters || [];
        const preservedFilters = existingFilters.filter(f =>
            f.identifier === 'com.mmhmm.filter.lut' ||
            f.identifier === 'com.mmhmm.filter.tune'
        );

        let filters = [];
        const presenter = this.presenter;
        if (presenter != null) {
            const physicalGreenScreen = presenter.physicalGreenScreen;

            let style = null;
            let backgroundPaint = null;
            style = presenter.backgroundStyle;
            backgroundPaint = presenter.backgroundPaint;

            const segFilter = this.segFilter;
            segFilter.paint = backgroundPaint;
            segFilter.style = style;
            segFilter.nativeBlur = presenter.usesHybridBlur;

            let blurAmount = 0;
            if (style == Presenter.BackgroundStyle.Blur) {
                if (presenter.blurAmount == Presenter.BlurAmount.Large) {
                    blurAmount = 60;
                }
                else {
                    blurAmount = 30;
                }
            }
            segFilter.blurAmount = blurAmount;

            let maskFilter = null;
            if (physicalGreenScreen == true) {
                segFilter.segmentationType = "chroma";
                segFilter.chromaRange = presenter.chromaFilter.range;
                segFilter.chromaColor = presenter.chromaFilter.keyRGB;
            }
            else if (style == Presenter.BackgroundStyle.Show && backgroundPaint == null && !presenter.forceSegmentationForAlpha) {
                segFilter.segmentationType = "none";
            }
            else {
                if (App.isHybrid == true) {
                    segFilter.segmentationType = "hybrid";
                }
                else {
                    if (this.mask != null) {
                        segFilter.segmentationType = "virtual";
                        maskFilter = segFilter;
                    }
                    else {
                        segFilter.segmentationType = "none";
                    }
                }
            }

            this.maskFilter = maskFilter;
            if (maskFilter == null) {
                filters.push(segFilter);
            }

            let shape = presenter.shape;
            segFilter.shape = shape;
            if (shape == Presenter.Shape.Polygon) {
                segFilter.polygonSides = presenter.polygonSides;
            }

            segFilter.enhancement = presenter.enhancement;

            const effect = presenter.effect;
            if (effect != null) {
                filters.push(effect);
            }
        }

        // Re-add preserved user filters (Tune before LUT for correct processing order)
        const tuneFilter = preservedFilters.find(f => f.identifier === 'com.mmhmm.filter.tune');
        const lutFilter = preservedFilters.find(f => f.identifier === 'com.mmhmm.filter.lut');
        if (tuneFilter) {
            filters.push(tuneFilter);
        }
        if (lutFilter) {
            filters.push(lutFilter);
        }

        if (EqualObjects(filters, this.filters) == false) {
            this.filters = filters;
        }
    }
    _updateMaskAndHitTest() {
        const presenter = this.presenter;

        const physicalGreenScreen = presenter?.physicalGreenScreen ?? false;
        const backgroundStyle = presenter?.backgroundStyle ?? Presenter.BackgroundStyle.Show;
        const backgroundPaint = presenter?.backgroundPaint;

        if (physicalGreenScreen == true ||
            App.isHybrid == true ||
            (backgroundStyle == Presenter.BackgroundStyle.Show && backgroundPaint == null))
        {
            this.mask = null;
        }

        if (this.usesHitTestMask == false) {
            this.stopHitTestTask();
        }
        else {
            this.startHitTestTask();
        }
    }

    observePropertyChanged(obj, key, val) {
        if (key.startsWith("chromaFilter") == true) {
            if (key.endsWith("range") == true) {
                this.segFilter.chromaRange = val;
            }
            else {
                this.segFilter.chromaColor = val;
            }
        }
        else {
            this._updateFilters();

            if (key == "physicalGreenScreen" || key == "backgroundPaint" || key == "backgroundStyle") {
                this._updateMaskAndHitTest();
            }
        }
    }

    containsPoint(point) {
        var r = super.containsPoint(point);
        if (r == false) {
            return false;
        }

        var contents = this.contents;
        if (contents == null || contents.containsPoint == null) {
            return r;
        }

        return contents.containsPoint(point, this);
    }

    /*
     * Silhouette hit test mask tasks
     *
     * Used whenever we don't generate and apply a silhouette mask from within the app,
     * including when we're using a physical green screen and when virtual green screen
     * is being done natively in the hybrid app.
     */
    get usesHitTestMask() {
        if (this.hidden == true || this.superlayer?.hidden == true) {
            // We can't be seen so there isn't much point in wasting cycles
            return false;
        }
        const presenter = this.presenter;
        if (presenter == null) {
            // We've lost our presenter, so there isn't much point...
            return false;
        }

        if (this.mask != null) {
            // If we have a mask, we don't need to create one via
            // rendering the contents/texture
            return false;
        }

        if (presenter.backgroundStyle != Presenter.BackgroundStyle.Hide) {
            // Blur and Show reveal the entire background, so there
            // won't be transparent pixels we need to worry about
            return false;
        }

        if (presenter.backgroundPaint != null) {
            // While the background is being hidden, there won't be
            // transparent pixels due to the paint filling those regions
            return false;
        }

        if (App.isHybrid == true) {
            // We don't have mask data for the hybrid app. Its
            // in the alpha channel of the MediaInputStream.
            // We need to perform hit testing.
            return true;
        }

        if (presenter.physicalGreenScreen == true) {
            // The physical green screen is being removed via
            // a shader, and we need to perform hit testing
            // to figure out where the transparency is
            return true;
        }

        // If we've reached here, something seems amiss.
        // We'd have to be in the web app, virtual green screen,
        // which would provide a mask object which we tested for
        // up top.
        return false;
    }
    startHitTestTask() {
        var hitTestTask = this.hitTestTask;
        if (hitTestTask != null) {
            return;
        }
        hitTestTask = window.setInterval(() => {
            this.updateHitTestMask();
        }, 1000);
        this.hitTestTask = hitTestTask;
    }
    stopHitTestTask() {
        var hitTestTask = this.hitTestTask;
        if (hitTestTask == null) {
            return;
        }
        window.clearInterval(hitTestTask);
        this.hitTestTask = null;
        this._hitTestLayer = null;

        this.hitTestMask = null;
        this.hitTestMaskThreshold = 0;
    }
    updateHitTestMask() {
        this.hitTestMask = null;
        this.hitTestMaskThreshold = 0;

        if (this.usesHitTestMask == false) {
            return;
        }

        const presenter = this.presenter;
        const stage = presenter?.stage;
        if (stage == null) {
            return;
        }

        // Create a dummy layer to render using
        let hitTestLayer = this._hitTestLayer;
        if (hitTestLayer == null) {
            hitTestLayer = new RenderLayer();
            hitTestLayer.contents = {};
            this._hitTestLayer = hitTestLayer;
        }

        hitTestLayer.contents.filter = this.contents?.filter;

        // Copy over the regular video source
        const renderer = stage.renderer;
        const success = renderer.copyTextureFromLayerToLayer(this, hitTestLayer);
        if (success == false) {
            console.log("Failed to copy texture from video layer", this);
            return;
        }

        // If we have a physical green screen, copy
        // over the chroma filter
        if (presenter.physicalGreenScreen == true) {
            hitTestLayer.filter = presenter.chromaFilter;
        }
        else {
            hitTestLayer.filter = null;
        }

        // Figure out the size of the snapshot
        const size = this.naturalSize;
        hitTestLayer.size = size;

        // We'd like our snapshot to be 1/4 size
        var snapshotScale = 4;
        var snapshotSize = SizeMake(
            Math.floor(size.width) / snapshotScale,
            Math.floor(size.height) / snapshotScale
        );

        // XXX: Could we get an alpha only texture??
        var fboTexture = renderer.dequeueFramebufferTextureOfSize(snapshotSize, true);
        renderer.pushRenderTarget(fboTexture);

        // Store current projection matrix, as we will replace it..
        var originalProjection = renderer.projection;

        // Drawing to the offscreen buffer is coming through upside down
        // Invert the y-axis on the projection matrix to resolve this
        var flipped = renderer.projectionMatrixForSize(size, 1);
        flipped[5] = -flipped[5];
        flipped[13] = -flipped[13];
        renderer.projection = flipped;

        var pixels = null;
        try {
            // Ready to render
            renderer.renderLayerAtTime(hitTestLayer, 0, 1.0, flipped, Transform3DIdentity());

            // Read the data back out of the GL context
            var gl = renderer.gl;
            pixels = new Uint8ClampedArray(snapshotSize.width * snapshotSize.height * 4);
            gl.readPixels(0, 0, snapshotSize.width, snapshotSize.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        }
        catch (err) {
            console.error("render error: ", err);
            throw err;
        }
        finally {
            // Ensure the next draw call goes to the regular framebuffer
            renderer.popRenderTarget();

            // Restore the bits we replaced.
            renderer.projection = originalProjection;
        }

        if (pixels == null) {
            return null;
        }

        var mask = new Uint8Array(snapshotSize.width * snapshotSize.height);
        for (var pixelIdx=3, maskIdx=0; pixelIdx<pixels.length; pixelIdx+=4, maskIdx+=1) {
            mask[maskIdx] = pixels[pixelIdx];
        }

        this.hitTestMaskThreshold = 100;
        this.hitTestMask = {
            array: mask,
            width: snapshotSize.width,
            height: snapshotSize.height
        };
    }
    hitTest(event) {
        const presenter = this.presenter;
        const bgStyle = presenter?.backgroundStyle ?? Presenter.BackgroundStyle.Hide;
        const bgPaint = presenter?.backgroundPaint;

        let mask = null;
        if (bgPaint == null && bgStyle == Presenter.BackgroundStyle.Hide) {
            // Only the pixels specified by the mask are valid for hit testing.
        }
        else {
            // We're either painting or showing the background. All pixels
            // within our shape are valid for hit testing.
            mask = this.mask;
            this.mask = null;
        }
        const result = super.hitTest(event);
        if (mask != null) {
            this.mask = mask;
        }
        return result;
    }
}
