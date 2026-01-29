//
//  layers.js
//  mmhmm
//
//  Created by Steve White on 7/16/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

/**
 * @constructor
 */
class RenderLayer extends ObservableObject {
    constructor() {
        super();

        this._filters = [];
        this._sublayers = [];
        this.contentCenter = PointMake(0.5, 0.5);
        this.contentSize = SizeMake(1.0, 1.0);
        this.contents = null;
        this.mask = null;
        this.contentsNeedUpdate = false;
        this.maskNeedsUpdate = false;
        this.usePositionForCoordinate = false;

        this.position = PointZero();
        this.size = SizeZero();
        this.zIndex = 0;
        this.hitTestMaskThreshold = 0;
        this.cornerRadius = 0.0;

        this.anchorPoint = PointMake(0.5, 0.5);
        this.transform = Transform3DIdentity();

        this.hidden = false;
        this.opacity = 1.0;
        this.userInteractionEnabled = false;
        this.opaque = false;

        this.automaticallyNotifiesObserversOfSublayers = false;
        this.automaticallyNotifiesObserversOfFrame = false;
        this.automaticallyNotifiesObserversOfContents = false;
        this.automaticallyNotifiesObserversOfHidden = false;
    }
    _copyOnto(r) {
        r.contentCenter = this.contentCenter;
        r.contentSize = this.contentSize;
        r._contents = this._contents;
        r._mask = this._mask;
        r.contentsNeedUpdate = this.contentsNeedUpdate;
        r.position = this.position;
        r.size = this.size;
        r.anchorPoint = this.anchorPoint;
        r.transform = this.transform;
        r.hidden = this.hidden;
        r.opacity = this.opacity;
        r.filters = this.filters;
        r.zIndex = this.zIndex;
        r.cornerRadius = this.cornerRadius;

        this.sublayers.forEach(sublayer => {
            r.addSublayer(sublayer.copy());
        });
    }
    /**
     * @return {RenderLayer}
     */
    copy() {
        var r = new this.constructor();
        this._copyOnto(r);
        return r;
    }
    /*
     * Helpers
     */
    /**
     * @type {Size}
     * @readonly
     */
    get naturalSize() {
        var contents = this.contents;
        if (contents != null) {
            if (contents.tagName == "IMG") {
                return SizeMake(contents.naturalWidth, contents.naturalHeight);
            }
            else if (contents.tagName == "VIDEO") {
                return SizeMake(contents.videoWidth, contents.videoHeight);
            }
            else if (contents.size != null) {
                var size = contents.size;
                if (IsKindOf(size, Object) && size.width != null && size.height != null) {
                    return size;
                }
            }
            else if (contents.width != null && contents.height != null) {
                return SizeMake(contents.width, contents.height);
            }
        }
        return SizeCopy(this.size);
    }

    /*
     * Misc properties
     */
    /** @type {number} */
    set zIndex(value) {
        this._zIndex = value;
        var superlayer = this.superlayer;
        if (superlayer != null) {
            superlayer._sortSublayers();
        }
    }
    get zIndex() {
        return this._zIndex;
    }
    set hidden(value) {
        const hidden = !!value;
        if (hidden == this.hidden) {
            return;
        }
        this._hidden = hidden;
        this.didChangeValueForProperty(hidden, "hidden");
    }
    get hidden() {
        return this._hidden ?? false;
    }
    /*
     * Sublayers
     */
    _sortSublayers() {
        var sublayers = this._sublayers;
        this._sublayers = sublayers.sort((a, b) => {
            var zA = a.zIndex;
            var zB = b.zIndex;
            if (zA < zB) {
                return -1;
            }
            else if (zA > zB) {
                return 1;
            }
            var iA = sublayers.indexOf(a);
            var iB = sublayers.indexOf(b);
            if (iA < iB) {
                return -1;
            }
            else if (iA > iB) {
                return 1;
            }
            return 0;
        });
        this.didChangeValueForProperty(sublayers, "sublayers");
    }
    get rootLayer() {
        var superlayer = this.superlayer;
        if (superlayer == null) {
            return this;
        }
        return superlayer.rootLayer;
    }
    /**
     * @type {RenderLayer=}
     * @readonly
     */
    get superlayer() {
        return this._superlayer;
    }
    _insertSublayerAtIndex(sublayer, targetIndex) {
        // If the layer is being moved, ensure
        // the old superlayer forgets about it
        var superlayer = sublayer._superlayer;
        if (superlayer != null && superlayer != this) {
            superlayer.removeSublayer(sublayer);
        }
        sublayer._superlayer = this;

        // If we already know of the layer, remove it
        // so it only exists once.
        var sublayers = this._sublayers;
        var currentIndex = sublayers.indexOf(sublayer);
        if (currentIndex != -1) {
            sublayers.splice(currentIndex, 1);
        }
        sublayers.splice(targetIndex, 0, sublayer);
        this._sortSublayers();
        this.didChangeValueForProperty(this.sublayers, "sublayers");
    }
    /**
     * @param {RenderLayer} sublayer The sublayer to insert
     * @param {RenderLayer} sibling The sibling to insert before
     */
    insertSublayerBefore(sublayer, sibling) {
        var sublayers = this._sublayers;
        var target = sublayers.indexOf(sibling);
        if (target == -1) {
            target = sublayers.length;
        }
        this._insertSublayerAtIndex(sublayer, target);
    }
    /**
     * @param {RenderLayer} sublayer The sublayer to add
     */
    addSublayer(sublayer) {
        this._insertSublayerAtIndex(sublayer, this._sublayers.length);
    }
    /**
     * @param {RenderLayer} sublayer The sublayer to remove
     */
    removeSublayer(sublayer) {
        var sublayers = this._sublayers;
        var index = sublayers.indexOf(sublayer);
        if (index != -1) {
            sublayers.splice(index, 1);
            this.didChangeValueForProperty(this.sublayers, "sublayers");
        }
        var superlayer = sublayer._superlayer;
        if (superlayer == this) {
            sublayer._superlayer = null;
        }
    }
    /**
     * @type {RenderLayer[]}
     * @readonly
     */
    get sublayers() {
        return Array.from(this._sublayers);
    }
    isDescendentOfLayer(otherLayer) {
        return otherLayer.isAncestorOfLayer(this);
    }
    isAncestorOfLayer(otherLayer) {
        let test = otherLayer;
        while (test != null) {
            if (test == this) {
                return true;
            }
            test = test.superlayer;
        }
        return false;
    }
    /*
     * Contents
     */
    /** @type {Rect} */
    get contentRect() {
        const center = this.contentCenter;
        const size = this.contentSize;
        return RectMake(center.x - (size.width / 2), center.y - (size.height / 2), size.width, size.height);
    }
    set contentRect(rect) {
        if (rect == null) {
            rect = RectZero();
        }
        var w = rect.width;
        var h = rect.height;
        this.contentSize = SizeMake(w, h);

        var x = rect.x + (rect.width / 2);
        var y = rect.y + (rect.height / 2);
        this.contentCenter = PointMake(x, y);
    }
    /** @type {Point} */
    set contentCenter(center) {
        this._contentCenter = center;
        this._contentCoordinates = null;
    }
    get contentCenter() {
        var contentCenter = this._contentCenter;
        // Return a copy so that if its altered it doesn't
        // have unintended effects
        return PointMake(contentCenter.x, contentCenter.y);
    }
    /** @type {Size} */
    set contentSize(size) {
        this._contentSize = size;
        this._contentCoordinates = null;
    }
    get contentSize() {
        var contentSize = this._contentSize;
        // Return a copy so that if its altered it doesn't
        // have unintended effects
        return SizeMake(contentSize.width, contentSize.height);
    }
    get contentCoordinates() {
        var contentCoordinates = this._contentCoordinates;
        if (contentCoordinates == null) {
            var rect = this.contentRect;
            var minX = rect.x,
                minY = rect.y,
                maxX = rect.x + rect.width,
                maxY = rect.y + rect.height;
            contentCoordinates = new Float32Array([
                minX, minY,
                minX, maxY,
                maxX, minY,
                maxX, minY,
                minX, maxY,
                maxX, maxY,
            ]);
            this._contentCoordinates = contentCoordinates;
        }
        return contentCoordinates;
    }
    /**
     * @private
     */
    get contentsListener() {
        var contentsListener = this._contentsListener;
        if (contentsListener == null) {
            contentsListener = (evt) => {
                var src = evt.srcElement;
                if (src != this.contents) {
                    return;
                }
                if (src.tagName == "VIDEO" && src.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
                    return;
                }
                this.contentsNeedUpdate = true;
            }
        }
        return contentsListener;
    }
    /** @property {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|ImageBitmap|RendererContents} [contents] */
    set contents(contents) {
        this._setContentsAddingListener(contents, true);
    }
    _setContentsAddingListener(contents, addListener = true) {
        var old = this._contents;
        if (contents == old) {
            return;
        }

        if (old != null) {
            if (old.destroy != null) {
                old.destroy();
            }
            else if (old.nodeType == Node.ELEMENT_NODE) {
                if (old.tagName == "IMG") {
                    old.removeEventListener("load", this.contentsListener);
                }
                else if (old.tagName == "VIDEO") {
                    old.removeEventListener("loadeddata", this.contentsListener);
                }
            }
        }

        this._contents = contents;
        this.didChangeValueForProperty(contents, "contents");
        this.contentsNeedUpdate = true;
        if (contents != null && contents.nodeType == Node.ELEMENT_NODE && addListener == true) {
            var contentSize = SizeMake(1, 1);
            var tagName = contents.tagName;
            if (tagName == "IMG") {
                contents.addEventListener("load", this.contentsListener);
            }
            else if (tagName == "VIDEO") {
                contents.addEventListener("loadeddata", this.contentsListener);
                if (contents.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
                    this.contentsNeedUpdate = false;
                }
            }
            this.contentSize = contentSize;
        }
    }
    get contents() {
        return this._contents;
    }
    /** @type {string=} */
    set contentsSrc(aContentsSrc) {
        this.setContentsSrc(aContentsSrc, null, true);
    }
    get contentsSrc() {
        return this._contentsSrc;
    }
    /**
     * @param {string} aContentsSrc The source for the contents
     * @param {string} mimeType The content's mime type
     * @param {bool} autoHide If the layer should hide during load, un-hide after load
     */
    setContentsSrc(aContentsSrc, mimeType, autoHide) {
        this._contentsSrc = aContentsSrc;
        if (aContentsSrc == null) {
            this.contents = null;
            return;
        }

        var contentsSrc = aContentsSrc;
        if (IsKindOf(contentsSrc, String) == false) {
            contentsSrc = aContentsSrc.toString();
        }

        if (autoHide == null) {
            autoHide = true;
        }

        if (autoHide == true) {
            this.hidden = true;
        }

        var isVideoSource = false;
        if (contentsSrc.startsWith("data:") == true || contentsSrc.startsWith("blob:") == true) {
            isVideoSource = (mimeType != null && mimeType.startsWith("video"));
        }
        else {
            var extension = null;
            try {
                var url = new URL(contentsSrc, window.location);
                extension = url.pathExtension;
                if (extension.length == 40) {
                    var filename = url.lastPathComponent;
                    var dot = filename.indexOf(".");
                    if (dot != -1) {
                        extension = filename.substring(0, dot);
                    }
                }
                if (extension != null) {
                    extension = extension.toLowerCase();
                }
            }
            catch (err) {
                gSentry.exception(err);
                console.error("Error parsing src", contentsSrc);
            }

            isVideoSource = Media.Files.isVideoExtension(extension);
        }

        var element = null;
        var loadEvent = null;
        if (isVideoSource == true) {
            element = document.createElement("video");
            element.playsInline = true;
            element.loop = true;
            element.muted = true;
            element.autoplay = true;
            loadEvent = "canplay";

            element.style.position = "absolute";
            element.style.width = "1px";
            element.style.height = "1px";
            element.style.zIndex = -1;
            document.body.appendChild(element);
        }
        else {
            element = new Image();
            element.crossOrigin = "anonymous";
            element.loading = "eager";
            loadEvent = "load";
        }

        element.addEventListener(loadEvent, evt => {
            if (this.onContentsSrcLoaded != null) {
                this.onContentsSrcLoaded(element);
            }

            if (isVideoSource == true) {
                window.setTimeout(() => {
                    if (this.superlayer != null && element.paused == true) {
                        element.play()
                    }
                }, 1);
            }
            this.contentsNeedUpdate = true;
            if (autoHide == true) {
                this.hidden = false;
            }
            var parent = element.parentNode;
            if (parent != null) {
                parent.removeChild(element);
            }
        }, {once: true});
        element.addEventListener("error", evt => {
            console.error("Error loading contents source", contentsSrc, element, element.error, evt);
            var parent = element.parentNode;
            if (parent != null) {
                parent.removeChild(element);
            }
        }, {once: true});

        if (gLocalDeployment == true) {
            if (contentsSrc.startsWith("http") == false) {
                element.addEventListener("error", evt => {
                    var hosted = new URL(contentsSrc, "https://app.dev.airtimetools.com/camera/");
                    element.src = hosted.toString();
                }, {once: true});
            }
        }

        element.crossOrigin = "anonymous";
        element.src = contentsSrc;
        if (element.decode != null) {
            element.decode();
        }
        this.contents = element;
    }
    /** @type {bool} */
    set contentsNeedUpdate(needsUpdate) {
        this._contentsNeedUpdate = needsUpdate;
    }
    get contentsNeedUpdate() {
        var contents = this.contents;
        if (contents != null && contents.tagName == "VIDEO" && contents.readyState >= 2) {
            return true;
        }
        return this._contentsNeedUpdate;
    }
    /*
     * Mask
     */
    get maskClass() {
        return RenderMaskFilter;
    }
    /** @property {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement|ImageBitmap|RendererContents} [contents] */
    set mask(mask) {
        var previous = this._mask;
        if (mask == previous) {
            return;
        }
        if (previous != null && previous.close != null) {
            previous.close();
        }
        this._mask = mask;
        this.maskNeedsUpdate = true;
    }
    get mask() {
        return this._mask;
    }
    /*
     * Filter helper
     */
    /** @type {RenderFilter=} */
    set filter(aFilter) {
        if (aFilter == null) {
            this.filters = [];
        }
        else {
            this.filters = [aFilter];
        }
    }
    /** @type {RenderFilter[]} */
    set filters(someFilters) {
        if (someFilters == null) {
            someFilters = [];
        }

        const filters = Array.from(someFilters);
        const cornerRadiusFilter = this._cornerRadiusFilter;
        if (cornerRadiusFilter != null && filters.includes(cornerRadiusFilter) == false) {
            filters.push(cornerRadiusFilter);
        }
        this._filters = filters;
    }
    get filters() {
        return Array.from(this._filters);
    }
    addFilter(aFilter) {
        const filters = this.filters;
        if (filters.includes(aFilter) == false) {
            filters.push(aFilter);
            this.filters = filters;
        }
    }
    removeFilter(aFilter) {
        const filters = this.filters;
        const index = filters.indexOf(aFilter);
        if (index != -1) {
            filters.splice(index, 1);
            this.filters = filters;
        }
    }
    /*
     * Layout
     */
    /**
     * @private
     */
    _invalidateDerivedLayout() {
        this._model = null;
        this._positions = null;
        this._boundingBox = null;
        this._invertedModel = null;
    }
    get positions() {
        var positions = this._positions;
        if (positions == null) {
            var frame = this.frame;
            var x = 0,
                y = 0,
                w = frame.width,
                h = frame.height;
            positions = new Float32Array([
                x, y,
                x, y + h,
                x + w, y,
                x + w, y,
                x, y + h,
                x + w, y + h,
            ]);
            this._positions = positions;
        }
        return positions;
    }
    /** @type {Rect} */
    get frame() {
        const center = this.position;
        const size = this.size;
        return RectMake(center.x - (size.width / 2), center.y - (size.height / 2), size.width, size.height);
    }
    set frame(frame) {
        if (frame == null) {
            frame = RectZero();
        }
        this.size = SizeMake(frame.width, frame.height);
        this.position = PointMake(frame.x + (frame.width / 2), frame.y + (frame.height / 2));
        this.didChangeValueForProperty(frame, "frame");
    }
    /** @type {Size} */
    set size(size) {
        this._size = size;
        this._invalidateDerivedLayout();
        this.didChangeValueForProperty(this.frame, "frame");
    }
    get size() {
        return SizeCopy(this._size);
    }
    /** @type {Point} */
    set position(position) {
        var previous = this._position;
        if (previous != null && position != null && position.x == previous.x && position.y == previous.y) {
            return;
        }
        this._position = position;
        this._invalidateDerivedLayout();
        this.didChangeValueForProperty(this.frame, "frame");
    }
    get position() {
        return PointCopy(this._position);
    }
    /** @type {Transform3D} */
    set transform(transform) {
        this._transform = transform;
        this._invalidateDerivedLayout();
    }
    get transform() {
        return this._transform;
    }
    /** @type {Point} */
    set anchorPoint(point) {
        if (point == null) {
            point = PointZero();
        }

        var clamped = PointMake(
            clamp(point.x, 0, 1),
            clamp(point.y, 0, 1),
        );

        var previous = this._anchorPoint;
        if (previous != null && clamped.x == previous.x && clamped.y == previous.y) {
            return;
        }
        this._anchorPoint = clamped;
        this._invalidateDerivedLayout();
    }
    get anchorPoint() {
        var anchorPoint = this._anchorPoint;
        return PointMake(anchorPoint.x, anchorPoint.y);
    }
    /** @private */
    get model() {
        var model = this._model;
        if (model == null) {
            const frame = this.frame;
            var origin = Transform3DMakeTranslation(frame.x, frame.y, 0);
            var transform = this.transform;
            var result;
            if (Transform3DIsIdentity(transform) == true) {
                // Layer doesn't have a transform, so just use the translation
                result = origin;
            }
            else {
                const anchor = this.anchorPoint;
                if (anchor.x == 0 && anchor.y == 0) {
                    result = transform;
                }
                else {
                    result = Transform3DMakeTranslation(frame.width * anchor.x, frame.height * anchor.y, 0);
                    result = Transform3DConcat(transform, result);
                    result = Transform3DTranslate(result, -frame.width * anchor.x, -frame.height * anchor.y, 0);
                }

                result = Transform3DConcat(result, origin);
            }

            model = new Float32Array(result);
            this._model = model;
        }
        return model;
    }
    /*
     *
     */
    set cornerRadius(value) {
        const cornerRadius = clamp(value, 0.0, 1.0);
        if (cornerRadius == this._cornerRadius) {
            return;
        }
        this._cornerRadius = cornerRadius;

        let cornerRadiusFilter = this._cornerRadiusFilter;
        if (cornerRadius == 0.0) {
            this._cornerRadiusFilter = null;
            this.removeFilter(cornerRadiusFilter);
        }
        else {
            if (cornerRadiusFilter == null) {
                cornerRadiusFilter = new RoundRectMaskFilter();
                this._cornerRadiusFilter = cornerRadiusFilter;
                this.addFilter(cornerRadiusFilter);
            }
            cornerRadiusFilter.cornerRadius = cornerRadius;
        }
    }
    get cornerRadius() {
        return this._cornerRadius ?? 0;
    }
    /*
     * UI events
     */
    /**
     * @param {Point} event The event value
     * @return {bool}
     */
    containsPoint(point) {
        var layer = this.hitTest({point});
        return (layer != null);
    }
   /**
    * @param {PointerEvent|StageEvent} event The event value
    * @return {RenderLayer=}
    */
    hitTest(event) {
        if (this.userInteractionEnabled == false) {
            return null;
        }
        if (this.hidden == true && this.userInteractionEnabledWhenHidden != true) {
            return null;
        }

        var point = event.point;
        if (point == null) {
            var offsetX = event.offsetX;
            var offsetY = event.offsetY;
            if (offsetX == null || offsetY == null) {
                if (gLocalDeployment == true) {
                    console.error("No point value in event?", event);
                }
                return null;
            }
            point = PointMake(event.offsetX, event.offsetY);
        }

        // XXX: This has only been tested with origin=0x0
        // and probably needs a smidgen more work for non zero origins

        var bbox = this.boundingBox;
        if (RectContainsPoint(bbox, point) == false) {
            return null;
        }

        // local is expressed relative to our frame
        var inverted = this._invertedModel;
        if (inverted == null) {
            inverted = Transform3DInvert(this.model);
            this._invertedModel = inverted;
        }

        var local = Transform3DProjectPoint(inverted, point);
        if (local.x < 0) {
            return null;
        }
        if (local.y < 0) {
            return null;
        }

        var frame = this.frame;
        if (local.x > RectGetWidth(frame)) {
            return null;
        }
        if (local.y > RectGetHeight(frame)) {
            return null;
        }

        // We know the point is within our bounds.
        // First, check to see if any of our sublayers
        // want it
        var sublayers = this.sublayers;
        var numSublayers = sublayers.length;
        if (sublayers != null && numSublayers > 0) {
            var subevent = { point: local };
            for (var idx=numSublayers-1; idx>=0; idx-=1) {
                var sublayer = sublayers[idx];
                const hit = sublayer.hitTest(subevent);
                if (hit != null) {
                    return hit;
                }
            }
        }

        // No sublayers wanted it, so see if any of our filters
        // want it
        var filters = this.filters;
        var filterResult = null;
        if (filters != null) {
            for (var filterIdx = 0; filterIdx < filters.length; filterIdx += 1) {
                var filter = filters[filterIdx];
                if (filter.containsPoint == null) {
                    continue;
                }
                const hit = filter.containsPoint(local, this);
                if (hit == false) {
                    return null;
                }
                filterResult = this;
                // Maybe the next filter will say yes, or the mask, or ...
            }
        }

        var maskFilter = this.maskFilter;
        if (maskFilter != null && maskFilter.containsPoint != null) {
            const hit = maskFilter.containsPoint(local, this);
            if (hit == false) {
                return null;
            }
        }

        // No sublayers and no filters wanted it.
        // If we don't have a mask, then the result
        // is dependent on if we have contents
        var mask = this.mask;
        var maskThreshold = null;
        if (mask == null || mask.array == null) {
            mask = this.hitTestMask;
        }

        if (mask != null) {
            maskThreshold = mask.hitTestMaskThreshold;
        }
        else {
            var contents = this.contents;
            if (contents == null) {
                return filterResult;
            }
            mask = contents.hitTestMask;
            if (mask == null) {
                // Absolutely no mask, so we'll claim it
                return this;
            }
            maskThreshold = contents.hitTestMaskThreshold;
        }
        if (maskThreshold == null) {
            maskThreshold = this.hitTestMaskThreshold;
        }

        // XXX: It'd be great to move this into RenderMaskFilter
        // but that doesn't necessarily exist in this.filters
        // as the Renderer implicitly adds it when it sees a mask

        // The content rect may be flipped for mirroring
        // or cropped for crop. We'll need to apply this
        // to the local point to get the underlying mask
        // point
        let contentRect = this.contentRect;

        // What the frame's size would be if we weren't cropped/etc
        const fullSize = SizeMake(
            frame.width / RectGetWidth(contentRect),
            frame.height / RectGetHeight(contentRect),
        );

        // Convert the content rect into pixel units
        contentRect.x *= fullSize.width;
        contentRect.width *= fullSize.width;
        contentRect.y *= fullSize.height;
        contentRect.height *= fullSize.height;

        // Map the local layer point to a content point
        // taking into consideration crops and mirroring
        let contentPoint = PointZero();
        if (contentRect.width < 0) {
            contentPoint.x = RectGetMaxX(contentRect) - local.x;
        }
        else {
            contentPoint.x = RectGetMinX(contentRect) + local.x;
        }
        if (contentRect.height < 0) {
            contentPoint.y = RectGetMaxY(contentRect) - local.y;
        }
        else {
            contentPoint.y = RectGetMinY(contentRect) + local.y;
        }

        // Our layer is probably 1080p, and the mask
        // is quite often 720p (FaceTime) so we'll
        // need to scale the point
        const maskScale = SizeMake(
            mask.width / fullSize.width,
            mask.height / fullSize.height,
        );

        const maskPoint = PointMake(
            Math.floor(contentPoint.x * maskScale.width),
            Math.floor(contentPoint.y * maskScale.height)
        );
        const dataOffset = Math.floor(maskPoint.y * mask.width) + maskPoint.x;
        const bit = mask.array[dataOffset];
        if (bit < maskThreshold) {
            return null;
        }
        return this;
    }
    /**
     * @type {Rect}
     * @readonly
     */
    get boundingBox() {
        var bbox = this._boundingBox;
        if (bbox != null) {
            return RectCopy(bbox);
        }

        var f = this.frame;
        if (Transform3DIsIdentity(this.transform) == true) {
            this._boundingBox = f;
            return f;
        }

        var t = this.model;

        var tl = Transform3DProjectPoint(t, { x: 0, y: 0 });
        var tr = Transform3DProjectPoint(t, { x: f.width, y: 0 });
        var bl = Transform3DProjectPoint(t, { x: 0, y: f.height });
        var br = Transform3DProjectPoint(t, { x: f.width, y: f.height });

        var top = Math.min(tl.y, Math.min(tr.y, Math.min(bl.y, br.y)));
        var bottom = Math.max(tl.y, Math.max(tr.y, Math.max(bl.y, br.y)));
        var left = Math.min(tl.x, Math.min(tr.x, Math.min(bl.x, br.x)));
        var right = Math.max(tl.x, Math.max(tr.x, Math.max(bl.x, br.x)));
        bbox = { x: left, y: top, width: right - left, height: bottom - top };
        this._boundingBox = bbox;
        return bbox;
    }
}
