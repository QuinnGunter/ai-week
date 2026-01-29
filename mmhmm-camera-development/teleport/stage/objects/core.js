//
//  stage/object.js
//  mmhmm
//
//  Created by Steve White on 8/14/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Stage.Object = class extends ObservableObject {
    constructor(identifier) {
        super();

        if (identifier != null) {
            identifier = identifier.toLowerCase();
        }
        this.identifier = identifier;

        this._assetCache = [];

        // Define for KVO purposes
        this.cursor = null;
        this.title = null;
        this.stage = null;
        this.controls = null;
        this.layer = null;

        this.automaticallyNotifiesObserversOfOpacity = false;
        this.automaticallyNotifiesObserversOfScale = false;
        this.automaticallyNotifiesObserversOfRotation = false;
        this.automaticallyNotifiesObserversOfCenter = false;
        this.automaticallyNotifiesObserversOfAnchor = false;
        this.automaticallyNotifiesObserversOfFullscreen = false;
        this.automaticallyNotifiesObserversOfZIndex = false;
        this.automaticallyNotifiesObserversOfCroppable = false;
        this.automaticallyNotifiesObserversOfCropInsets = false;
        this.automaticallyNotifiesObserversOfEditable = false;
    }
    /*
     * Properties
     */
    get classIdentifier() {
        return this.constructor.ClassIdentifier;
    }
    get movable() {
        return false;
    }
    get resizable() {
        return true;
    }
    get preserveAspectRatio() {
        return true;
    }
    get croppable() {
        return false;
    }
    get editable() {
        return (
            this.croppable == true &&
            this.rotation == 0
        );
    }
    get properties() {
        return {
            fullscreen: Boolean,
            zIndex: Number,
            scale: Number,
            opacity: Number,
            rotation: Number,
            anchor: String,
            center: Object,
            cropInsets: Object,
        };
    }
    /** @type {boolean} */
    set fullscreen(value) {
        this.setFullscreenAnimated(value, false);
    }
    get fullscreen() {
        return this._fullscreen ?? false;
    }
    setFullscreenAnimated(fullscreen, animated) {
        var previous = this.fullscreen;
        if (fullscreen == previous) {
            return;
        }
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'setFullscreenAnimated', previous, animated);
        this._fullscreen = fullscreen;
        this.updateLayerTransform();
        this.updateSizeButton();
        this.updateMouseCursor();
        this.didChangeValueForProperty(fullscreen, "fullscreen");
    }
    /** @type {number} */
    set zIndex(value) {
        var previous = this._zIndex;
        if (value == previous) {
            return;
        }
        this._zIndex = value;
        var layer = this.layer;
        if (layer != null) {
            layer.zIndex = value;
        }
        this.didChangeValueForProperty(value, "zIndex");
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'zIndex', previous);
    }
    get zIndex() {
        return this._zIndex;
    }
    /** @type {number} */
    get maxScale() {
        var max = 1.0;
        var contentInsets = this.contentInsets;
        if (contentInsets.left != 0 || contentInsets.right != 0 ||
            contentInsets.top != 0 || contentInsets.bottom != 0)
        {
            var size = this.layer?.size;
            if (size != null) {
                var insetW = size.width + contentInsets.left + contentInsets.right;
                var insetH = size.height + contentInsets.top + contentInsets.bottom;
                max = Math.max(insetW / size.width, insetH / size.height);
            }
        }
        return max;
    }
    set scale(aScaleValue) {
        var scale = clamp(aScaleValue, 0.0, this.maxScale);
        var previous = this.scale;
        if (scale == previous) {
            return;
        }

        this._scale = scale;
        this.didChangeValueForProperty(scale, "scale");

        let validate = true;
        const undoManager = this.undoManager;
        if (undoManager != null) {
            undoManager.registerUndoWithTargetSlotArguments(this, 'scale', previous);
            if (undoManager.isUndoing != true && undoManager.isRedoing != true) {
                validate = false;
            }
        }
        if (validate == true) {
            this._clampCenterPoint(true);
        }
        this.updateLayerTransform();

    }
    get scale() {
        return this._scale ?? 1;
    }
    /** @type {number} */
    set opacity(anOpacityValue) {
        var opacity = clamp(anOpacityValue, 0.0, 1.0);
        var previous = this.opacity;
        if (opacity == previous) {
            return;
        }
        this._opacity = opacity;
        this.didChangeValueForProperty(opacity, "opacity");
        var layer = this.layer;
        if (layer != null) {
            layer.opacity = opacity;
        }
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'opacity', previous);
    }
    get opacity() {
        return this._opacity ?? 1;
    }
    /** @type {number} */
    set rotation(aRotationValue) {
        var rotation = aRotationValue % 360;
        if (rotation < 0) {
            rotation = 360 - rotation;
        }
        var previous = this.rotation;
        if (rotation == previous) {
            return;
        }
        this._rotation = rotation;
        this.didChangeValueForProperty(rotation, "rotation");
        this.updateLayerTransform();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'rotation', previous);
        if ((previous == 0 && rotation != 0) ||
            (rotation == 0 && previous != 0))
        {
            this.didChangeValueForProperty(this.editable, "editable");
        }
    }
    get rotation() {
        return this._rotation ?? 0;
    }
    /** @type {Stage.Object.Anchor} */
    set anchor(aStageAnchor) {
        var previous = this.anchor;
        if (aStageAnchor == previous) {
            return;
        }

        var anchors = Object.values(Stage.Object.Anchor);
        if (anchors.indexOf(aStageAnchor) == -1) {
            console.error("invalid anchor supplied: ", aStageAnchor);
            return;
        }
        this._anchor = aStageAnchor;
        this.didChangeValueForProperty(aStageAnchor, "anchor");
        this.updateLayerTransform();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'anchor', previous);
    }
    get anchor() {
        return this._anchor ?? Stage.Object.Anchor.None;
    }
    /** @type {Point} */
    set center(aPointValue) {
        var previous = this.center;
        if (PointEquals(aPointValue, previous) == true) {
            return;
        }

        var center = PointCopy(aPointValue);
        this._center = center;
        this._clampCenterPoint(false);
        this.didChangeValueForProperty(this._center, "center");
        this.updateLayerTransform();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'center', previous);
    }
    get center() {
        return PointCopy(this._center);
    }
    /** @type {Insets} */
    set cropInsets(value) {
        let cropInsets = InsetsCopy(value);
        if (isNaN(cropInsets.top) == true) cropInsets.top = 0;
        if (isNaN(cropInsets.left) == true) cropInsets.left = 0;
        if (isNaN(cropInsets.bottom) == true) cropInsets.bottom = 0;
        if (isNaN(cropInsets.right) == true) cropInsets.right = 0;

        cropInsets.left = clamp(cropInsets.left, 0, 1);
        cropInsets.right = clamp(cropInsets.right, 0, 1);
        if (cropInsets.left + cropInsets.right >= 1) {
            return;
        }
        cropInsets.top = clamp(cropInsets.top, 0, 1);
        cropInsets.bottom = clamp(cropInsets.bottom, 0, 1);
        if (cropInsets.top + cropInsets.bottom >= 1) {
            return;
        }

        const previous = this.cropInsets;
        if (InsetsEqual(cropInsets, previous) == true) {
            return;
        }

        this._cropInsets = cropInsets;
        this.didChangeValueForProperty(this.cropInsets, "cropInsets");
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'cropInsets', previous);
        this._cropInsetsChanged();
    }
    get cropInsets() {
        return InsetsCopy(this._cropInsets);
    }
    /** @type {Insets} */
    set contentInsets(val) {
        this._contentInsets = InsetsCopy(val);
    }
    get contentInsets() {
        return InsetsCopy(this._contentInsets) ?? InsetsZero();
    }
    /*
     *
     */
    async prepareForDuplication() {
        // If our editor is open and someone is duplicating the slide we're on,
        // save and close the editor
        if (this.editing == true) {
            this.exitEditMode();
        }
        return super.prepareForDuplication();
    }
    /*
     * Asset caching
     */
    get assets() {
        // Intentionally blank, subclass hook
        return [];
    }
    async loadAssetsIntoCache() {
        var promise = this._loadAssetsIntoCachePromise;
        if (promise != null) {
            return promise;
        }

        console.debug("Loading assets into cache", this);
        const assets = this.assets.filter(asset => {
            if (asset == null) {
                return false;
            }
            // Filter out assets that are already in the cache
            return this._assetCache.find(entry => entry.asset == asset) == null;
        });

        const tasks = assets.map(asset => {
            return asset.openAsElement().then(element => {
                this._assetCache.push({asset, element});
            }).catch(err => {
                console.error("Error loading asset into cache", asset.fingerprint, this.identifier, err);
            });
        });
        promise = Promise.allSettled(tasks).then(() => this._loadAssetsIntoCachePromise = null);
        this._loadAssetsIntoCachePromise = promise;
        return promise;
    }
    getCachedElementForAsset(asset) {
        var cache = this._assetCache;
        var entry = cache.find(entry => entry.asset == asset);
        if (entry == null) {
            return null;
        }
        var index = cache.indexOf(entry);
        cache.splice(index, 1);
        return entry.element;
    }
    get undoManager() {
        return this.stage?.undoManager;
    }
    /*
     * Stage methods
     */
    willAttachToStage(stage) {
        if (stage == null) {
            console.error("willAttachToStage invoked with null stage")
            debugger;
        }
        if (this.stage != null) {
            console.error("willAttachToStage invoked when this.stage isn't null", this, stage);
            debugger;
        }
        this.stage = stage;

        var layer = this.layer;
        if (layer == null) {
            layer = this.newLayer(stage.size);
            layer.zIndex = this.zIndex;
            this.layer = layer;
        }
        if (this.movable == true) {
            layer.delegate = this;
            layer.userInteractionEnabled = true;
        }

        var overlayHelper = this.newOverlayHelper();
        var overlay = null;
        if (overlayHelper != null) {
            overlay = overlayHelper.overlay;
        }
        this.overlayHelper = overlayHelper;
        this.overlay = overlay;
        this._updateOverlayVisibility();
    }
    didAttachToStage(stage) {
        if (stage == null) {
            console.error("didAttachToStage invoked with null stage")
            debugger;
        }
        if (stage != this.stage) {
            console.error("didAttachToStage invoked with differing stage", this, stage);
            debugger;
        }

        var asset = this.asset;
        if (IsKindOf(asset, CloudyAsset) == true) {
            NotificationCenter.default.addObserver(
                CloudyAsset.Notifications.RefreshedURL,
                asset,
                this._assetWasRefreshed,
                this
            );
        }
    }
    willDetachFromStage(stage) {
        if (stage == null) {
            console.error("willDetachFromStage invoked with null stage")
            debugger;
        }
        if (stage != this.stage) {
            console.error("willDetachFromStage invoked with differing stage", this, stage);
            debugger;
        }

        var overlayHelper = this.overlayHelper;
        if (overlayHelper != null) {
            overlayHelper.destroy();
            this.overlayHelper = null;
        }

        this.overlay = null;
        this.cursor = null;
        this.sizeButton = null;
        this.hideAlignmentGrid();
    }
    didDetachFromStage(stage) {
        if (stage == null) {
            console.error("didDetachFromStage invoked with null stage")
            debugger;
        }
        if (stage != this.stage) {
            console.error("didDetachFromStage invoked with differing stage", this, stage);
            debugger;
        }
        this.stage = null;
        this.layer = null;
        this._assetCache = [];

        var asset = this.asset;
        if (IsKindOf(asset, CloudyAsset) == true) {
            NotificationCenter.default.removeObserver(
                CloudyAsset.Notifications.RefreshedURL,
                asset,
                this._assetWasRefreshed,
                this
            );
        }
    }
    contentsFailedToUpdateTexture(contents) {
        var asset = this.asset;
        if (asset == null) {
            return;
        }

        var refreshingAsset = this._refreshingAsset;
        if (refreshingAsset == true) {
            return;
        }
        this._refreshingAsset = true;

        asset.openAsElement().then((element) => {
            this._updateContentsSource(contents.src, element.src);
        }).catch((err) => {
            console.error("Error opening asset: ", this, asset, err);
        }).finally(() => {
            this._refreshingAsset = false;
        })
    }
    _assetWasRefreshed(info, name, object) {
        var previousURL = info?.previousURL;
        var currentURL = info?.currentURL;
        if (previousURL == null || currentURL == null) {
            console.error("Unexpected notification userInfo", info);
            return;
        }
        this._updateContentsSource(previousURL.toString(), currentURL.toString());
    }
    _updateContentsSource(previousURL, currentURL) {
        var layer = this.layer;
        var layers = layer.sublayers.concat(layer);

        layers.forEach(aLayer => {
            var contents = aLayer.contents;
            if (contents == null || contents.src != previousURL) {
                return;
            }

            var isVideo = (contents.tagName == "VIDEO");
            var time = null;
            var paused = null;
            if (isVideo == true) {
                time = contents.currentTime;
                paused = contents.paused;
            }

            contents.src = currentURL;

            if (isVideo == true) {
                contents.currentTime = time;
                if (paused != true) {
                    contents.play();
                }
            }
        })
    }
    render(timestamp) {
        // Intentionally blank, subclass hook
    }
    set selected(value) {
        var selected = !!value;
        if (selected == this.selected) {
            return;
        }
        this._selected = selected;
        this._updateOverlayVisibility();
        if (this.selected == false && this.editing == true) {
            this.exitEditMode();
        }
    }
    get selected() {
        return this._selected ?? false;
    }
    newSettingsControl() {
        // Intentionally blank, subclass hook
        return null;
    }
    /*
     * Layers
     */
    newLayer(stageSize) {
        const layer = new RenderLayer();
        layer.size = stageSize;
        layer.filter = this.effect;
        return layer;
    }
    updateLayerTransform(layer) {
        if (layer == null) {
            layer = this.layer;
        }
        if (layer == null) {
            return;
        }

        let transform = Transform3DIdentity();

        const size = layer.size;
        const position = layer.position;
        if (SizeEquals(size, SizeZero()) == true) {
            layer.transform = transform;
            return;
        }

        const target = this.frameForLayer(layer);
        const center = PointMake(
            RectGetMidX(target),
            RectGetMidY(target)
        );

        const tX = center.x - position.x;
        const tY = center.y - position.y;
        if (tX != 0 || tY != 0) {
            transform = Transform3DTranslate(transform, tX, tY, 0);
        }

        const scale = Math.min(
            RectGetWidth(target) / size.width,
            RectGetHeight(target) / size.height
        );

        if (scale != 1.0) {
            transform = Transform3DScale(transform, scale, scale, 1.0);
        }

        const rotation = this.rotation;
        if (rotation != null && rotation > 0) {
            const radians = degreesToRadians(90 + rotation);
            transform = Transform3DRotate(transform, radians, 0, 0, 1);
        }
        layer.transform = transform;
    }
    naturalSizeForLayer(layer) {
        const size = layer.naturalSize;

        const cropInsets = this.cropInsets;
        size.width *= 1.0 - (cropInsets.left + cropInsets.right);
        size.height *= 1.0 - (cropInsets.top + cropInsets.bottom);

        return size;
    }
    contentSizeForLayer(layer, stageSize) {
        let contentSize = this.naturalSizeForLayer(layer);

        let scale = Math.min(
            stageSize.width / contentSize.width,
            stageSize.height / contentSize.height
        );

        if (this.fullscreen == false) {
            scale *= this.scale;
        }

        return SizeMake(
            Math.round(contentSize.width * scale),
            Math.round(contentSize.height * scale)
        );
    }
    _clampCenterPoint(useSetter) {
        const undoManager = this.undoManager;
        if (undoManager?.isUndoing == true || undoManager?.isRedoing == true) {
            // No need to validate this...
            return;
        }

        var layer = this.layer;
        if (layer == null) {
            return;
        }

        var frame = this.frameForLayer(layer);
        this.clampFreeformLayerFrame(frame, this.stage.size);

        var center = PointMake(
            RectGetMidX(frame),
            RectGetMidY(frame),
        );
        if (PointEquals(center, this.center) == false) {
            if (useSetter == true) {
                this.center = center;
            }
            else {
                this._center = center;
            }
        }
    }
    // Media is required to be on screen
    // Presenters are allow to only show a quarter of the frame
    // Method is so presenter can override with its rule.
    clampFreeformLayerFrame(frame, stageSize) {
        var {top, left, bottom, right} = this.contentInsets;
        var bounds = RectInset(
            RectMake(0, 0, stageSize.width, stageSize.height),
            InsetsMake(-top, -left, -bottom, -right)
        );

        if (this.fullscreen == true) {
            // Content required to remain on stage when full screen
            if (RectGetMinX(frame) < RectGetMinX(bounds)) {
                frame.x = RectGetMinX(bounds)
            }
            else if (RectGetMaxX(frame) > RectGetMaxX(bounds)) {
                frame.x = RectGetMaxX(bounds) - RectGetWidth(frame);
            }

            if (RectGetMinY(frame) < RectGetMinY(bounds)) {
                frame.y = RectGetMinY(bounds)
            }
            else if (RectGetMaxY(frame) > RectGetMaxY(bounds)) {
                frame.y = RectGetMaxY(bounds) - RectGetHeight(frame);
            }
        }
        else {
            // Content can go 3/4 off stage - 1/4 of it must remain
            if (RectGetMidX(frame) < RectGetMinX(bounds)) {
                frame.x = -RectGetWidth(frame) / 2;
            }
            else if (RectGetMidX(frame) > RectGetMaxX(bounds)) {
                frame.x = RectGetMaxX(bounds) - (RectGetWidth(frame) / 2);
            }

            if (RectGetMidY(frame) < RectGetMinY(bounds)) {
                frame.y = -RectGetWidth(frame) / 2;
            }
            else if (RectGetMidY(frame) > RectGetMaxY(bounds)) {
                frame.y = RectGetMaxY(bounds) - (RectGetHeight(frame) / 2);
            }
        }
    }
    frameForLayer(layer) {
        var stage = this.stage ?? gApp.stage;
        var stageSize = stage.size;

        var contentSize = this.contentSizeForLayer(layer, stageSize);
        var contentInsets = this.contentInsets;

        var frame = RectMake(
            0, 0,
            contentSize.width,
            contentSize.height
        );

        const anchors = Stage.Object.Anchor;
        var anchor = this.anchor;
        if (anchor == anchors.None) {
            var center = null;
            if (this.fullscreen == true) {
                center = PointMake(stageSize.width / 2, stageSize.height / 2);
            }
            else {
                center = this.center;
            }
            frame.x = center.x - (frame.width / 2);
            frame.y = center.y - (frame.height / 2);
        }
        else if (anchor == anchors.Center) {
            frame.x = (stageSize.width - frame.width) / 2;
            frame.y = (stageSize.height - frame.height) / 2;
        }
        else {
            var gridSize = this.anchorInset ?? 0;
            var insetStage = RectMake(
                gridSize, gridSize,
                stageSize.width - (gridSize * 2),
                stageSize.height - (gridSize * 2)
            );

            // If the slide exceeds the inset bounds, enlarge them
            // to fit the slide.
            var width = RectGetWidth(frame) - (contentInsets.left + contentInsets.right);
            if (width > RectGetWidth(insetStage)) {
                const diff = width - RectGetWidth(insetStage);
                insetStage.x -= diff / 2;
                insetStage.y -= diff / 2;
                insetStage.width += diff;
                insetStage.height += diff;
            }

            var height = RectGetHeight(frame) - (contentInsets.top + contentInsets.bottom);
            if (height > RectGetHeight(insetStage)) {
                const diff = height - RectGetHeight(insetStage);
                insetStage.x -= diff / 2;
                insetStage.y -= diff / 2;
                insetStage.width += diff;
                insetStage.height += diff;
            }

            // Vertical placement
            // Top aligned
            if (anchor == anchors.TopLeft || anchor == anchors.TopCenter || anchor == anchors.TopRight) {
                frame.y = RectGetMinY(insetStage) - contentInsets.top;
            }
            // Bottom aligned
            else if (anchor == anchors.BottomLeft || anchor == anchors.BottomCenter || anchor == anchors.BottomRight) {
                frame.y = RectGetMaxY(insetStage) + contentInsets.bottom - frame.height;
            }
            // Center aligned
            else {
                frame.y = RectGetMidY(insetStage) - (frame.height / 2);
            }

            // Horizontal placement
            // Left aligned
            if (anchor == anchors.TopLeft || anchor == anchors.CenterLeft || anchor == anchors.BottomLeft) {
                frame.x = RectGetMinX(insetStage) - contentInsets.left;
            }
            // Right aligned
            else if (anchor == anchors.TopRight || anchor == anchors.CenterRight || anchor == anchors.BottomRight) {
                frame.x = RectGetMaxX(insetStage) + contentInsets.right - frame.width;
            }
            // Center aligned
            else {
                frame.x = RectGetMidX(insetStage) - (frame.width / 2);
            }
        }
        return frame;
    }
    deanchor() {
        const layer = this.layer;
        const bbox = layer.boundingBox;
        this.anchor = Stage.Object.Anchor.None;
        this.center = PointMake(RectGetMidX(bbox), RectGetMidY(bbox));
    }
    /*
     * Cropping
     */
    get cropZoomFactor() {
        const cropInsets = this.cropInsets;
        return Math.min(
            1.0 / (1.0 - (cropInsets.left + cropInsets.right)),
            1.0 / (1.0 - (cropInsets.top + cropInsets.bottom)),
        )
    }
    zoomWithinCrop(scale) {
        scale = clamp(scale, 1.0, 5.0);

        const layer = this.layer;

        // The uncropped, unscaled size of our layer
        const naturalSize = layer.naturalSize;

        // The current cropped/scale box our layer is displaying in
        const visible = this.frameForLayer(layer);

        // Figure out the scale from natural size into viewport size
        const natViewScale = Math.max(
            visible.width / naturalSize.width,
            visible.height / naturalSize.height
        );

        // Which gives us the minimum size needed to display in the viewport
        // with aspect-fill
        const minimumSize = SizeMake(
            naturalSize.width * natViewScale,
            naturalSize.height * natViewScale
        );

        // Now we know the target size for our contents in the cropbox
        const newW = minimumSize.width * scale;
        const newH = minimumSize.height * scale;

        // Determine what the new uncropped frame will be
        const uncropped = this.boundingBoxWithoutCropInsets();

        // We want to preserve the visual center of the crop box.
        // We need to know where that point is on the stage
        const viewportCenter = PointMake(
            RectGetMidX(visible),
            RectGetMidY(visible)
        );

        // We need to know what point of the contents was being displayed there
        const contentsCenter = PointMake(
            (RectGetMidX(visible) - RectGetMinX(uncropped)) / RectGetWidth(uncropped),
            (RectGetMidY(visible) - RectGetMinY(uncropped)) / RectGetHeight(uncropped),
        );

        // With that and the newly scaled contents size, we know what the
        // box will be
        const target = RectMake(
            viewportCenter.x - (contentsCenter.x * newW),
            viewportCenter.y - (contentsCenter.y * newH),
            newW,
            newH
        );

        // If some edge of the contents is inside the crop box, move
        // things around so its flush with that edge
        if (RectGetMinX(target) > RectGetMinX(visible)) {
            const diff = RectGetMinX(target) - RectGetMinX(visible);
            target.x = RectGetMinX(visible);
        }
        if (RectGetMinY(target) > RectGetMinY(visible)) {
            const diff = RectGetMinY(target) - RectGetMinY(visible);
            target.y = RectGetMinY(visible);
        }

        if (RectGetMaxX(target) < RectGetMaxX(visible)) {
            const diff = RectGetMinX(visible) - RectGetMinX(target);
            target.x = RectGetMaxX(visible) - RectGetWidth(target);
        }
        if (RectGetMaxY(target) < RectGetMaxY(visible)) {
            const diff = RectGetMinY(visible) - RectGetMinY(target);
            target.y = RectGetMaxY(visible) - RectGetHeight(target);
        }

        // And with all of that we can figure out the new crop insets...
        const cropInsets = InsetsZero();
        cropInsets.top = Math.max(0, (RectGetMinY(visible) - RectGetMinY(target)) / newH);
        cropInsets.left = Math.max(0, (RectGetMinX(visible) - RectGetMinX(target)) / newW);
        cropInsets.bottom = Math.max(0, (RectGetMaxY(target) - RectGetMaxY(visible)) / newH);
        cropInsets.right = Math.max(0, (RectGetMaxX(target) - RectGetMaxX(visible)) / newW);

        this.cropInsets = cropInsets;
    }
    panWithinCrop(mousePoint) {
        const dragState = this.dragState;
        const lastMousePoint = dragState.lastPoint;

        const deltaM = PointMake(
            mousePoint.x - lastMousePoint.x,
            mousePoint.y - lastMousePoint.y
        );

        dragState.lastPoint = mousePoint;

        // Move the uncropped box
        const uncropped = this.boundingBoxWithoutCropInsets();
        const target = RectCopy(uncropped);
        target.x += deltaM.x;
        target.y += deltaM.y;

        // See what region of the screen we're currently filling
        const visible = this.layer.boundingBox;

        // And use the two to compute new crop insets
        const cropInsets = this.cropInsets;

        const top = (RectGetMinY(visible) - RectGetMinY(target)) / RectGetHeight(target);
        const bottom = (RectGetMaxY(target) - RectGetMaxY(visible)) / RectGetHeight(target);
        if (top >= 0 && bottom >= 0) {
            cropInsets.top = top;
            cropInsets.bottom = bottom;
        }

        const left = (RectGetMinX(visible) - RectGetMinX(target)) / RectGetWidth(target);
        const right = (RectGetMaxX(target) - RectGetMaxX(visible)) / RectGetWidth(target);
        if (left >= 0 && right >= 0) {
            cropInsets.left = left;
            cropInsets.right = right;
        }

        this.cropInsets = cropInsets;
    }
    boundingBoxWithoutCropInsets() {
        const bbox = this.layer.boundingBox;
        const cropInsets = this.cropInsets;
        const fullSize = SizeMake(
            bbox.width / (1.0 - (cropInsets.left + cropInsets.right)),
            bbox.height / (1.0 - (cropInsets.top + cropInsets.bottom)),
        );

        let top = RectGetMinY(bbox);
        let left = RectGetMinX(bbox);
        let bottom = RectGetMaxY(bbox);
        let right = RectGetMaxX(bbox);

        top -= cropInsets.top * fullSize.height;
        left -= cropInsets.left * fullSize.width;
        bottom += cropInsets.bottom * fullSize.height;
        right += cropInsets.right * fullSize.width;

        const result = RectMake(left, top, right - left, bottom - top);
        return result;
    }
    _cropInsetsChanged() {
        const layer = this.layer;
        if (layer == null) {
            return;
        }

        layer.contentRect = this.contentRectFromCropInsets();

        // The layer's size w/o any cropping
        let size = layer.naturalSize;
        // Apply crop insets
        let cropInsets = this.cropInsets;
        size.width *= 1.0 - (cropInsets.left + cropInsets.right);
        size.height *= 1.0 - (cropInsets.top + cropInsets.bottom);
        // Update its display size
        layer.size = size;

        this.updateLayerTransform();
    }
    contentRectFromCropInsets() {
        let center = PointMake(0.5, 0.5);
        let size = SizeMake(1.0, 1.0);

        if (this.croppable == true) {
            const cropInsets = this.cropInsets;

            const cropRect = RectMake(
                cropInsets.left,
                cropInsets.top,
                1.0 - (cropInsets.left + cropInsets.right),
                1.0 - (cropInsets.top + cropInsets.bottom),
            );

            center.x = RectGetMidX(cropRect);
            center.y = RectGetMidY(cropRect);
            size.width *= RectGetWidth(cropRect);
            size.height *= RectGetHeight(cropRect);
        }
        return RectMake(
            center.x - (size.width / 2),
            center.y - (size.height / 2),
            size.width,
            size.height
        );
    }
    resetCropInsets() {
        const stage = this.stage;
        if (stage == null) {
            // We need the stage to know how to update
            // the scale if removing the crop insets
            // causes the aspect-ratio to change which
            // causes the aspect-fit scaling to change
            console.error("Cannot reset w/o a stage");
            return;
        }
        this.undoManager?.beginUndoGrouping();

        // Removing the crop insets may result in the
        // scale changing. Capture the current uncropped
        // box so we can match the effective visual size
        // after removing the crop
        const bbox = this.boundingBoxWithoutCropInsets();

        // Remove the crop
        this.cropInsets = InsetsZero();

        if (this.anchor == Stage.Object.Anchor.None) {
            this.center = PointMake(RectGetMidX(bbox), RectGetMidY(bbox));
        }

        //
        const stageSize = stage.size
        this.scale = Math.max(
            bbox.width / stageSize.width,
            bbox.height / stageSize.height
        );

        this.undoManager?.endUndoGrouping();
    }

    /*
     * Stage overlays
     */
    newOverlayHelper() {
        return null;
    }

    handleWillBeginTracking(handle) {
        this.undoManager?.beginUndoGrouping();
        this.showAlignmentGrid();
        this.handleIsTracking = true;
        if (this.fullscreen == true) {
            this.exitFullscreenPreservingPosition();
        }

        if (handle?.type == Stage.Object.Overlay.Handle.Type.Crop &&
            this.editing == false)
        {
            const overlay = this.overlayHelper;
            if (overlay != null) {
                overlay.createUncroppedLayer();
            }
        }
    }
    handleWillEndTracking(handle) {
        this.hideAlignmentGrid();
        this.undoManager?.endUndoGrouping();
        this.handleIsTracking = false;

        if (handle?.type == Stage.Object.Overlay.Handle.Type.Crop &&
            this.editing == false)
        {
            const overlay = this.overlayHelper;
            if (overlay != null) {
                overlay.destroyUncroppedLayer();
            }
        }
    }
    _updateOverlayVisibility() {
        var overlayHelper = this.overlayHelper;
        if (overlayHelper == null) {
            return;
        }

        if (this.selected == true) {
            overlayHelper.visible = true;
            overlayHelper.dragHandlesVisible = true;
            overlayHelper.buttonBarsVisible = true;
        }
        else {
            overlayHelper.visible = false;
        }
    }
    newSizeButton() {
        // Intentionally blank, subclass hook
        return null;
    }
    updateSizeButton() {
        // XXX: We don't want to change all size buttons...
        var sizeButton = this.sizeButton;
        if (sizeButton == null) {
            return;
        }

        var previous = sizeButton.querySelector("svg");
        if (previous == null) {
            console.error("Couldn't find icon in size button", sizeButton);
            return;
        }

        var current = null;
        var title = null;
        if (this.fullscreen == true) {
            current = AppIcons.Collapse();
            title = LocalizedString("Exit fullscreen");
        }
        else {
            current = AppIcons.Expand();
            title = LocalizedString("Fullscreen");
        }

        sizeButton.replaceChild(current, previous);
        sizeButton.title = title;
    }
    updateMouseCursor() {
        if (this.movable == false) {
            this.cursor = null;
            return;
        }

        if (this.fullscreen == true) {
            // If the slide is full screen, see if it fills
            // the stage: If so, do not use a custom mouse
            // cursor
            var layer = this.layer;
            var stage = this.stage;
            if (layer != null && stage != null) {
                var bbox = layer.boundingBox;
                var stageSize = stage.size;
                if (stageSize.width <= bbox.width && stageSize.height <= bbox.height) {
                    this.cursor = null;
                    return;
                }
            }
        }

        var lastMousePoint = this.lastMousePoint;
        if (lastMousePoint != null && lastMousePoint.x >= 0 && lastMousePoint.y >= 0) {
            this.cursor = "grabbing";
        }
        else {
            this.cursor = "grab";
        }
    }
    newEditMenu() {
        return null;
    }
    showEditMenu(sender, domEvent, appEvent) {
        var menu = this.editMenu;
        if (menu != null) {
            menu.dismiss();
            return true;
        }

        menu = this.newEditMenu();
        if (menu == null) {
            return false;
        }

        this._addObjectsBehindToEditMenu(menu);
        if (menu.menuItems.length == 0) {
            return true;
        }

        menu.onDismiss = () => {
            this.editMenu = null;
        }
        menu.displayFrom(sender, domEvent);
        this.editMenu = menu;
        return true;
    }
    _addObjectsBehindToEditMenu(menu) {
        var objectsBeneath = this.stage.objectsBehind(this);
        if (objectsBeneath.length == 0) {
            return;
        }

        objectsBeneath.reverse();
        if (menu.menuItems.length > 0) {
            menu.addDivider();
        }

        var highlighted = null;
        var highlightObject = function(object) {
            if (highlighted != null) {
                highlighted.overlayHelper.visible = false;
                highlighted = null;
            }
            if (object == null) {
                return;
            }

            var overlayHelper = object.overlayHelper;
            if (overlayHelper != null) {
                overlayHelper.visible = true;
                highlighted = object;
            }
        }

        var submenu = menu.addSubmenu("Select behind");
        objectsBeneath.forEach((object, idx) => {
            let title = object.classTitle;
            if (title == null) {
                title = LocalizedString("Object")
            }
            const item = submenu.addItem(title, () => {
                this.stage.selectedObject = object;
                menu.dismiss();
            });

            item.addEventListener("mouseenter", evt => {
                highlightObject(object);
            })
            item.addEventListener("mouseleave", evt => {
                if (highlighted == object) {
                    highlightObject(null);
                }
            })
        })
        submenu.addEventListener("dismiss", evt => {
            highlightObject(null);
        })
    }
    /*
     * Alignment grids
     */
    newAlignmentGrid(size) {
        return null;
    }
    showAlignmentGrid() {
        var stage = this.stage;
        if (stage == null) {
            return null;
        }

        var grid = this.alignmentGrid;
        if (grid != null) {
            return grid;
        }

        grid = this.newAlignmentGrid(stage.size);
        if (grid != null) {
            grid.attach(this);
        }

        this.alignmentGrid = grid;
        return grid;
    }
    hideAlignmentGrid() {
        var alignmentGrid = this.alignmentGrid;
        if (alignmentGrid == null) {
            return;
        }
        alignmentGrid.detach();
        this.alignmentGrid = null;
    }
    /*
     * Mouse / pointer events
     */
    /*
     * @param {StageEvent} event
     */
    onPointerEnter(event) {
        if (this.selected == false) {
            var overlayHelper = this.overlayHelper;
            if (overlayHelper != null) {
                overlayHelper.visible = true;
                overlayHelper.dragHandlesVisible = false;
                overlayHelper.buttonBarsVisible = false;
            }
        }
        this.updateMouseCursor();
    }
    /*
     * @param {StageEvent} event
     */
    onPointerLeave(event) {
        if (this.selected == false) {
            var overlayHelper = this.overlayHelper;
            if (overlayHelper != null) {
                overlayHelper.visible = false;
            }
        }
        this.updateMouseCursor();
    }
    /*
     * @param {StageEvent} event
     */
    onPointerOver(event) {
        var overlayHelper = this.overlayHelper;
        if (overlayHelper != null) {
            overlayHelper.onPointerOver();
        }
    }
    /*
     * @param {StageEvent} event
     */
    onPointerDown(event) {
        this.updateMouseCursor();

        this.mouseHasMoved = false;

        this.dragState = {
            downPoint: event.point,
            lastPoint: event.point,
            center: null,
            panWithinCrop: (
                this.croppable == true &&
                (this.editing == true || event.altKey == true)
            )
        };

        this.undoManager?.beginUndoGrouping();

        // Wait a brief amount of time to try and differentiate
        // click events from non-click events
        var clickTester = this.clickTester;
        if (clickTester != null) {
            window.clearTimeout(clickTester);
        }
        this.clickTester = window.setTimeout(() => {
            this.clickTester = null;

            if (this.dragState.panWithinCrop == false) {
                this.showAlignmentGrid();
            }
            else {
                const overlay = this.overlayHelper;
                if (overlay != null) {
                    overlay.createUncroppedLayer();
                }
            }
        }, 150);
    }

    /*
     * @param {StageEvent} event
     */
    onPointerMove(event) {
        let dragState = this.dragState;

        const curMousePoint = event.point;
        const mouseDownPoint = dragState.downPoint;

        const delta = PointMake(
            curMousePoint.x - mouseDownPoint.x,
            curMousePoint.y - mouseDownPoint.y
        );

        if (delta.x == 0 && delta.y == 0) {
            return;
        }

        const layer = this.layer;
        if (layer == null) {
            return;
        }


        // We waited for the mouse to move before de-anchoring
        if (this.mouseHasMoved == false) {
            this.mouseHasMoved = true;
            var overlayHelper = this.overlayHelper;
            if (overlayHelper != null) {
                overlayHelper.buttonBarsVisible = false;
                overlayHelper.dragHandlesVisible = false;
            }
            if (this.fullscreen == true) {
                this.exitFullscreenPreservingPosition();
            }
            if (this.anchor != Stage.Object.Anchor.None) {
                this.deanchor();
            }
            dragState.center = this.center;
        }

        if (dragState.panWithinCrop == true) {
            this.panWithinCrop(curMousePoint);
            return;
        }

        dragState.lastPoint = curMousePoint;

        // Update our center point
        let center = PointCopy(dragState.center);
        center.x += delta.x;
        center.y += delta.y;

        const alignmentGrid = this.alignmentGrid;
        // If there isn't a grid or the person is overriding center
        if (alignmentGrid == null || event.shiftKey == true) {
            // Then just persist the center
            this.center = center;

            // And remove highlights if they were shown
            if (alignmentGrid != null && event.shiftKey == true) {
                alignmentGrid.highlightGuide(null);
            }
            return;
        }

        // See what our box would align with if it were moved
        const bbox = layer.boundingBox;
        bbox.x = center.x - (RectGetWidth(bbox) / 2);
        bbox.y = center.y - (RectGetHeight(bbox) / 2);

        // Some media (e.g. speech bubble text) has content insets
        // to make the outline box smaller than the bounding box
        // We only want to test against that box.
        const contentBox = RectInset(bbox, this.contentInsets);
        const guide = alignmentGrid.guideForRect(contentBox);

        if (guide != null) {
            // We got a snap guide, use its center points.
            const centerX = guide.centerX;
            if (centerX != null) {
                center.x = centerX;
                bbox.x = center.x - (RectGetWidth(bbox) / 2);
            }
            const centerY = guide.centerY;
            if (centerY != null) {
                center.y = centerY;
                bbox.y = center.y - (RectGetHeight(bbox) / 2);
            }
        }

        // Highlight matches (or unhighlight) and move
        alignmentGrid.highlightGuide(guide, bbox);
        this.center = center;

        // We store the guide because it may have an anchor that
        // we need to apply on mouse up
        this.activeSnapGuide = guide;
    }
    /*
     * @param {StageEvent} event
     */
    onPointerUp(event) {
        this.mouseDownPoint = PointMake(-1, -1);
        this.mouseHasMoved = false;
        this.dragState = null;
        this.updateMouseCursor();

        var clickTester = this.clickTester;
        if (clickTester != null) {
            // This appears to have been a click event,
            // ensure the timeout isn't allowed to complete
            // otherwise it'll show the alignment grid
            // with no way to dismiss it
            window.clearTimeout(clickTester);
            this.clickTester = null;
        }

        const activeSnapGuide = this.activeSnapGuide;
        if (activeSnapGuide != null) {
            const anchor = activeSnapGuide.anchor;
            if (anchor != null && anchor != Stage.Object.Anchor.None) {
                this.anchor = anchor;
                this.center = PointZero();
            }
            this.activeSnapGuide = null;
        }
        this.hideAlignmentGrid();

        var overlayHelper = this.overlayHelper;
        if (overlayHelper != null) {
            overlayHelper.dragHandlesVisible = true;
            overlayHelper.buttonBarsVisible = true;
            if (this.editing == false) {
                overlayHelper.destroyUncroppedLayer();
            }
        }

        this.undoManager?.endUndoGrouping();
    }
    onMouseWheelStart(event) {
        this.controlWillStartTracking(null);
        if (event.ctrlKey == true && this.fullscreen == true) {
            this.exitFullscreenPreservingPosition();
        }
        this.undoManager?.beginUndoGrouping();
    }
    onMouseWheelEnd(event) {
        this.controlDidEndTracking(null);
        this.undoManager?.endUndoGrouping();
    }
    onMouseWheel(event) {
        const deltaY = event.deltaY / Stage.Object.MouseWheelDivisor;
        if (event.ctrlKey == true) {
            if (this.editing == true && this.croppable == true) {
                this.zoomWithinCrop(this.cropZoomFactor - deltaY);
            }
            else {
                this.scale -= deltaY;
            }
        }
    }
    onMouseDoubleClick(event) {
        if (this.editable == false || this.editing == true) {
            return;
        }

        this.enterEditMode();
    }

    /*
     * Gestures
     */
    /*
     * @param {GestureEvent} Browser GestureEvent object
     */
    onGestureStart(event) {
        var maxTouchPoints = navigator.maxTouchPoints;
        if (maxTouchPoints != null && maxTouchPoints > 0) {
            // Processing both is a bit weird, although could be made to work
            // light-table style.
            // For now just handle pinch-scaling
            this.lastGestureRotation = null;
            this.lastGestureScale = event.scale;
        }
        else {
            // But for trackpad "gestures", only process one...
            if (event.rotation != 0) {
                this.lastGestureRotation = event.rotation;
                this.lastGestureScale = null;
            }
            else {
                this.lastGestureScale = event.scale;
                this.lastGestureRotation = null;
                if (this.fullscreen == true) {
                    this.exitFullscreenPreservingPosition();
                }
            }
        }
    }
    /*
     * @param {GestureEvent} Browser GestureEvent object
     */
    onGestureChange(event) {
        if (this.lastGestureScale != null) {
            var scale = event.scale - this.lastGestureScale;
            if (scale != 1.0) {
                this.scale += scale;
            }
            this.lastGestureScale = event.scale;
        }

        if (this.lastGestureRotation != null) {
            var rotation = event.rotation - this.lastGestureRotation;
            if (rotation != 0) {
                this.rotation -= rotation;
            }
            this.lastGestureRotation = event.rotation;
        }
    }
    /*
     * @param {GestureEvent} Browser GestureEvent object
     */
    onGestureEnd(event) {
        this.lastGestureRotation = null;
        this.lastGestureScale = null;
    }
    //
    // Editing
    //
    set editing(val) {
        const editing = !!val;
        if (editing == this.editing) {
            return;
        }
        this._editing = editing;
    }
    get editing() {
        return !!this._editing;
    }
    _newEditModeButtonBar() {
        const zoomBox = document.createElement("div");
        zoomBox.classList.add("zoom_box");

        const zoomLabel = document.createElement("label");
        zoomLabel.innerText = LocalizedString("Size");
        zoomBox.appendChild(zoomLabel);

        const sliderWrapper = document.createElement("div");
        sliderWrapper.classList.add("slider_wrapper");
        sliderWrapper.style.setProperty("--slider-length", "100px");
        zoomBox.appendChild(sliderWrapper);

        const zoomSlider = document.createElement("input");
        zoomSlider.type = "range";
        zoomSlider.min = 100;
        zoomSlider.max = 500;
        sliderWrapper.appendChild(zoomSlider);
        zoomSlider.addEventListener("input", (event) => {
            const value = zoomSlider.value;
            this.zoomWithinCrop(value / 100);

            UpdateStyledSliderFillAmount(zoomSlider, value);
        });

        const resetButton = document.createElement("button");
        resetButton.classList.add("capsule", "secondary");
        resetButton.innerText = LocalizedString("Reset");
        resetButton.addEventListener("click", (event) => this.resetCropInsets());

        const resetWrapper = document.createElement("div");
        resetWrapper.classList.add("button_wrapper");
        resetWrapper.appendChild(resetButton);

        const doneButton = document.createElement("button");
        doneButton.classList.add("capsule");
        doneButton.innerText = LocalizedString("Done");
        doneButton.addEventListener("click", (event) => this.exitEditMode());

        const doneWrapper = document.createElement("div");
        doneWrapper.classList.add("button_wrapper");
        doneWrapper.appendChild(doneButton);

        const buttons = [zoomBox, resetWrapper, doneWrapper];
        const bar = Stage.Object.Overlay.NewButtonBar(buttons);
        return { bar, reset: resetButton, slider: zoomSlider };
    }
    enterEditMode() {
        if (this.editable == false || this.editing == true) {
            return;
        }
        this.editing = true;

        const overlay = this.overlayHelper;
        if (overlay == null) {
            return;
        }

        // Hide all of the drag handles that are not for cropping
        const handles = overlay.handles;
        const cropHandles = handles.filter(handle => handle.type == Stage.Object.Overlay.Handle.Type.Crop);
        overlay.handles = cropHandles;

        // Create a new button bar to display in top center
        const cropModeBar = this._newEditModeButtonBar();

        const buttonBars = overlay.buttonBars;
        overlay.buttonBars = {
            [Stage.Object.Overlay.Position.TopCenter]: cropModeBar.bar
        };

        // Observe cropInsets to update the bar's elements
        const cropObserver = (obj, key, val) => {
            const reset = cropModeBar.reset;
            reset.disabled = InsetsEqual(this.cropInsets, InsetsZero());

            const slider = cropModeBar.slider;
            slider.value = Math.round(this.cropZoomFactor * 100);

            UpdateStyledSliderFillAmount(slider, slider.value);
        };
        cropObserver(); // Ensure initial state of things is correct

        const cropEditObserver = (obj, key, val) => {
            if (this.croppable == false || this.editable == false) {
                this.exitEditMode();
            }
        }

        this.addObserverForProperty(cropObserver, "cropInsets");
        this.addObserverForProperty(cropEditObserver, "croppable");
        this.addObserverForProperty(cropEditObserver, "editable");

        // Store the original handles and button bars so they can be restored
        this._editorState = {
            handles: handles,
            buttonBars: buttonBars,
            teardown: () => {
                this.removeObserverForProperty(cropObserver, "cropInsets");
                this.removeObserverForProperty(cropEditObserver, "croppable");
                this.removeObserverForProperty(cropEditObserver, "editable");
            }
        }

        // Change the outline to help illustrate the change of mode
        overlay.frame.style.borderStyle = "dashed";
        overlay.overlay.style.boxShadow = "rgba(0, 0, 0, 0.4) 0px 0px 0px 2px";
        overlay.overlay.style.setProperty("--frame-color", "white");

        // And reveal the uncropped layer
        overlay.createUncroppedLayer();
    }
    exitEditMode() {
        if (this.editing == false) {
            return;
        }
        this.editing = false;

        const overlay = this.overlayHelper;
        if (overlay == null) {
            return;
        }

        const state = this._editorState;
        if (state != null) {
            // Restore the handles and button bars back to regular
            overlay.handles = state.handles;
            overlay.buttonBars = state.buttonBars;
            state.teardown();
            this._editorState = null;
        }

        // Restore the outline to normal
        overlay.frame.style.borderStyle = "";
        overlay.overlay.style.boxShadow = "";
        overlay.overlay.style.setProperty("--frame-color", "");

        // And destroy the uncropped layer
        overlay.destroyUncroppedLayer();
    }
    /*
     * @return {SidebarPane=}
     */
    newSidebarPane() {
        // Intentionally blank, subclass responsibility
        return null;
    }
    /*
     * Controls
     */
    controlWillStartTracking(control, property) {
        var overlayHelper = this.overlayHelper;
        if (overlayHelper != null) {
            overlayHelper.buttonBarsVisible = false;
            overlayHelper.dragHandlesVisible = false;
        }
        if (property == "scale" && this.fullscreen == true) {
            this.exitFullscreenPreservingPosition();
        }
        this.undoManager?.beginUndoGrouping();
    }
    controlDidEndTracking(control, property) {
        var overlayHelper = this.overlayHelper;
        if (overlayHelper != null) {
            overlayHelper.buttonBarsVisible = true;
            overlayHelper.dragHandlesVisible = true;
        }
        this.undoManager?.endUndoGrouping();
    }
    //
    // Pre-set sizes
    //
    sizeOptions() {
        const options = [
            { ratio: 1.0,        label: LocalizedString("Square") },
            { ratio: 4.0 / 3.0,  label: LocalizedString("Portrait (3:4)") },
            { ratio: 3.0 / 4.0,  label: LocalizedString("Landscape (4:3)") },
            { ratio: 9.0 / 16.0, label: LocalizedString("Widescreen (16:9)") },
        ];

        if (this.preserveAspectRatio == true) {
            options.push({
                aspect: "fit",
                label: LocalizedString("Fit to slide")
            });
        }

        options.push({
            aspect: "fill",
            label: LocalizedString("Fill entire slide")
        });

        return options;
    }
    async drawSizeOptionPreviewInContext(option, context, width, height) {
        const stageSize = SizeMake(width, height);

        const layer = this.layer;
        let naturalSize;
        if (layer.contents != null) {
            naturalSize = layer.naturalSize;
        }
        if (naturalSize == null || SizeEquals(naturalSize, SizeZero()) == true) {
            // The layer may not have loaded the contents yet...
            // We'll wait for the first resize and hope for the best
            let onResizePromise = this.onResizePromise;
            if (onResizePromise == null) {
                onResizePromise = promiseWrapper();
                this.onResizePromise = onResizePromise;
            }
            await onResizePromise;
            naturalSize = layer.naturalSize;
        }

        // Supply a fake object to apply the size to
        let fake = {
            layer: {
                naturalSize: naturalSize,
            },
            stage: {
                size: stageSize
            },
            scale: 0.7,
            cropInsets: InsetsZero(),
            resetCropInsets: () => {},
            _clampCenterPoint: () => {},
        };

        this.applySizeOption(option, fake);

        // Get our thumbnail
        const thumbnail = await this.thumbnailAsElement();
        if (thumbnail == null) {
            return;
        }

        let size = SizeMake(
            thumbnail.naturalWidth,
            thumbnail.naturalHeight
        );

        const crop = fake.cropInsets;
        const source = RectMake(
            crop.left * size.width,
            crop.top * size.height,
            (1.0 - (crop.left + crop.right)) * size.width,
            (1.0 - (crop.top + crop.bottom)) * size.height,
        );

        const scale = Math.min(stageSize.width / source.width, stageSize.height / source.height) * fake.scale;

        const dest = RectMake(
            (stageSize.width - (source.width * scale)) / 2,
            (stageSize.height - (source.height * scale)) / 2,
            source.width * scale,
            source.height * scale
        );

        try {
            context.drawImage(thumbnail,
                source.x, source.y, source.width, source.height,
                dest.x, dest.y, dest.width, dest.height
            );
        }
        catch (err) {
            console.error("Error drawing image", thumbnail, source, dest);
        }
    }
    propertiesAffectingSizeOptionPreview() {
        return [];
    }
    previewForSizeOption(option, previewScale=10) {
        const wrapper = document.createElement("div");
        wrapper.className = "resize_preview";

        const roomImage = new Image();
        wrapper.appendChild(roomImage);

        const stage = this.stage;
        if (stage == null) {
            const icon = AppIcons.SlideThumbnailRectangleBackground();
            const iconSVG = new XMLSerializer().serializeToString(icon);
            const iconB64 = 'data:image/svg+xml;base64,' + btoa(iconSVG);
            roomImage.src = iconB64;
        }
        else {
            roomImage.src = ThumbnailStorage.AssetMissing;

            ThumbnailStorage.shared.get(stage.room).then(blob => {
                const url = URL.createObjectURL(blob);
                roomImage.src = url;
                roomImage.decode().finally(() => URL.revokeObjectURL(url));
            })
        }

        const stageSize = stage?.size ?? Stage.DefaultSize;

        const canvas = document.createElement("canvas");
        canvas.width = stageSize.width / previewScale;
        canvas.height = stageSize.height / previewScale;
        wrapper.appendChild(canvas);

        const context = canvas.getContext("2d");
        context.save();
        context.scale(1 / previewScale, 1 / previewScale);

        this.drawSizeOptionPreviewInContext(option, context, stageSize.width, stageSize.height);

        return wrapper;
    }
    applySizeOption(option, target) {
        if (target == null) {
            target = this;
        }

        if (option.reset == true) {
            target.resetCropInsets();
            return;
        }

        const layer = target.layer;
        const naturalSize = layer.naturalSize;
        const cropInsets = InsetsZero();

        const ratio = option.ratio;
        const aspect = option.aspect;

        if (ratio != null) {
            const width = naturalSize.height / ratio;
            if (width < naturalSize.width) {
                const inset = ((naturalSize.width - width) / 2) / naturalSize.width;
                cropInsets.left = inset;
                cropInsets.right = inset;
            }
            else {
                const height = naturalSize.height * (naturalSize.width / width);
                const inset = ((naturalSize.height - height) / 2) / naturalSize.height
                cropInsets.top = inset;
                cropInsets.bottom = inset;
            }
        }
        else if (aspect != null) {
            target.scale = 1;
            target.anchor = Stage.Object.Anchor.Center;

            if (aspect == "fit") {
                // Nothing to do here: We've set the scale above to 1
                // And the crop insets are already zero'ed out.
            }
            else if (aspect == "fill") {
                const stageSize = this.stage?.size ?? Stage.DefaultSize;
                const scale = Math.max(
                    stageSize.width / naturalSize.width,
                    stageSize.height / naturalSize.height,
                );
                const scaleUp = SizeMake(
                    naturalSize.width * scale,
                    naturalSize.height * scale
                );
                if (scaleUp.width > stageSize.width) {
                    const inset = ((scaleUp.width - stageSize.width) / scaleUp.width) / 2;
                    cropInsets.left = inset;
                    cropInsets.right = inset;
                }
                else if (scaleUp.height > stageSize.height) {
                    const inset = ((scaleUp.height - stageSize.height) / scaleUp.height) / 2;
                    cropInsets.top = inset;
                    cropInsets.bottom = inset;
                }
            }
        }
        target.cropInsets = cropInsets;
        target._clampCenterPoint(true);
    }
    /*
     * Actions
     */
    toggleFullscreen() {
        this.setFullscreenAnimated(!this.fullscreen, true);
    }
    exitFullscreenPreservingPosition() {
        var bbox = this.layer.boundingBox;
        var center = PointMake(
            RectGetMidX(bbox),
            RectGetMidY(bbox)
        );
        this.fullscreen = false;
        this.anchor = Stage.Object.Anchor.None;
        this.scale = 1;
        this.center = center;
    }
    clipboardData() {
        var record = new CloudyRecord({
            collection: mmhmmAPI.CloudyCollectionTypes.Media
        });
        this.encodeToModernRecord(record);

        // XXX: Why doesn't encodeToPageMedia encode the assets?!
        var assets = {
            content: this.asset,
            mask: this.maskAsset,
            thumbnail: this.thumbnailAsset
        };
        for (var key in assets) {
            var asset = assets[key];
            if (asset == null) {
                continue;
            }

            if (asset.fingerprint != null) {
                record.encodeAssetReference(asset, key);
            }
            else {
                var contentURL = asset.contentURL;
                if (contentURL != null) {
                    record.encodeProperty(key + "URL", contentURL);
                }
            }
        }

        return record.toLocalJSON();
    }
    clipboardItemData() {
        const recordJSON = this.clipboardData();
        const mime = Stage.Object.ClipboardType;
        const blob = new Blob([JSON.stringify(recordJSON)], {type: mime});
        return {[`web ${mime}`]: blob};
    }
    writeToClipboard() {
        const data = this.clipboardItemData();
        const item = new ClipboardItem(data);
        const success = navigator.clipboard.write([item])
        success.then(() => {
            console.info("successfully wrote item to clipboard", item);
        }).catch(err => {
            console.error("error writing item to clipboard", item, err);
        })
    }
    /*
     * Cloudy
     */
    encodeToModernRecord(record) {
        record.id = this.identifier;
        record.schemaVersion = 1;

        var classIdentifier = this.classIdentifier;
        if (classIdentifier == null) {
            throw "Please implement classIdentifier in your Media subclass";
        }

        record.encodeProperty("type", classIdentifier);

        const properties = this.properties;
        for (var key in properties) {
            record.encodeProperty(key, this[key]);
        }

        var filter = null;
        var effect = this.effect;
        if (effect != null) {
            filter = effect.toMedia();
        }
        record.encodeProperty("filter", filter, true);

        var content = this.encodeMediaContent();
        if (content != null && Object.keys(content).length == 0) {
            content = null;
        }
        record.encodeProperty("content", content);
    }
    encodeMediaContent() {
        // Intentionally blank, subclass hook
        return {};
    }
    decodeFromModernRecord(record, endpoint) {
        this.undoManager?.disableUndoRegistration();

        try {
            const properties = this.properties;
            for (var key in properties) {
                var type = properties[key];
                var value = record.decodeProperty(key, type, null);
                if (value != null && value != this[key]) {
                    this[key] = value;
                }
            }

            var filter = record.decodeProperty("filter", Object, null);
            if (filter == null || filter.id == null) {
                this.effect = null;
            }
            else {
                var effect = this.effect;
                if (effect == null || effect.identifier != filter.id) {
                    effect = NewFilterWithID(filter.id);
                }
                if (effect != null) {
                    effect.applyEvent(filter.state);
                }
                this.effect = effect;
            }

            var content = record.decodeProperty("content", Object, null);
            var success = true;
            if (content != null) {
                success = this.decodeMediaContent(content);
            }
            return success;
        }
        finally {
            this.undoManager?.enableUndoRegistration();
        }
    }
    decodeMediaContent(media) {
        // Intentionally blank, subclass hook
        return true;
    }
    /*
     * Teleport
     */
    toJSON() {
        var record = {
            id: this.identifier
        };
        const properties = this.properties;
        for (var key in properties) {
            record[key] = this[key];
        }
        var effect = this.effect;
        if (effect != null) {
            effect = effect.toJSON();
        }
        record.effect = effect;
        return record;
    }
    applyEvent(event, sender) {
        const properties = this.properties;
        for (var key in properties) {
            if (key in event) {
                var value = event[key];
                if (value != null && value != this[key]) {
                    this[key] = value;
                }
            }
        }

        if ('effect' in event) {
            var effect = event.effect;
            if (effect == null) {
                this.effect = null;
            }
            else {
                var effectID = effect.id;
                if (effectID == null) {
                    this.effect = null;
                }
                else {
                    var filter = this.effect;
                    if (filter == null || filter.id != effectID) {
                        filter = NewFilterWithID(effectID);
                        this.effect = filter;
                    }
                    filter.applyEvent(effect);
                }
            }
        }
    }
}

Stage.Object.ClipboardType = "application/x-mmhmm-record";

Stage.Object.Anchor = Object.freeze({
    None: "none",
    TopLeft: "tl",
    TopCenter: "tc",
    TopRight: "tr",
    BottomLeft: "bl",
    BottomCenter: "bc",
    BottomRight: "br",
    CenterLeft: "cl",
    CenterRight: "cr",
    Center: "mid"
});

Stage.Object.AnchorMap = Object.freeze({
    [Stage.Object.Anchor.TopLeft]:      PointMake(0.0, 0.0),
    [Stage.Object.Anchor.TopCenter]:    PointMake(0.5, 0.0),
    [Stage.Object.Anchor.TopRight]:     PointMake(1.0, 0.0),

    [Stage.Object.Anchor.BottomLeft]:   PointMake(0.0, 1.0),
    [Stage.Object.Anchor.BottomCenter]: PointMake(0.5, 1.0),
    [Stage.Object.Anchor.BottomRight]:  PointMake(1.0, 1.0),

    [Stage.Object.Anchor.CenterLeft]:   PointMake(0.0, 0.5),
    [Stage.Object.Anchor.Center]:       PointMake(0.5, 0.5),
    [Stage.Object.Anchor.CenterRight]:  PointMake(1.0, 0.5),
})

Stage.Object.PointForAnchor = function(anchor) {
    return Stage.Object.AnchorMap[anchor];
}

Stage.Object.AnchorForPoint = function(point) {
    const map = Stage.Object.AnchorMap;
    for (var anchor in map) {
        if (PointEquals(map[anchor], point) == true) {
            return anchor;
        }
    }
    return Stage.Object.Anchor.None;
}

if (navigator.platform.startsWith("Mac") == true) {
    Stage.Object.MouseWheelDivisor = 100;
}
else {
    Stage.Object.MouseWheelDivisor = 2000;
}
