//
//  stage/objects/overlay.js
//  mmhmm
//
//  Created by Steve White on 8/9/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

Stage.Object.Overlay = class {
    constructor (
        object,
        cornerType = Stage.Object.Overlay.Handle.Type.None,
        edgeType = Stage.Object.Overlay.Handle.Type.None,
        overlayType = "overlay",
    ) {
        var stage = object.stage;
        var layer = object.layer;
        this.object = object;

        var overlay = document.createElement("div");
        overlay = document.createElement("div");
        overlay.className = "slide_overlay";
        overlay.style.display = "none";
        this.overlay = overlay;

        this._buttonBars = {};

        this.resizeObserver = new ResizeObserver(entries => {
            this.updateOverlayPosition();
        });
        this.resizeObserver.observe(stage.overlay);

        var frame = document.createElement("div");
        frame.className = "frame";
        overlay.appendChild(frame);
        if (navigator.vendor.startsWith("Apple") == true) {
            frame.style.filter = "none";
        }
        this.frame = frame;

        var destroyController = new AbortController()
        this.destroyController = destroyController;

        this.verticalInset = 8;
        this.horizontalInset = 0;

        var handles = [];
        if (cornerType != Stage.Object.Overlay.Handle.Type.None) {
            handles.push(
                new Stage.Object.Overlay.Handle(PointMake(0, 0), "nwse-resize", cornerType, overlayType + "-nw-handle"),
                new Stage.Object.Overlay.Handle(PointMake(1, 0), "nesw-resize", cornerType, overlayType + "-ne-handle"),
                new Stage.Object.Overlay.Handle(PointMake(0, 1), "nesw-resize", cornerType, overlayType + "-sw-handle"),
                new Stage.Object.Overlay.Handle(PointMake(1, 1), "nwse-resize", cornerType, overlayType + "-se-handle"),
            );
        }

        if (edgeType != Stage.Object.Overlay.Handle.Type.None) {
            handles.push(
                new Stage.Object.Overlay.Handle(PointMake(0.5, 0.0), "ns-resize", edgeType, overlayType + "-n-handle"),
                new Stage.Object.Overlay.Handle(PointMake(0.5, 1.0), "ns-resize", edgeType, overlayType + "-s-handle"),
                new Stage.Object.Overlay.Handle(PointMake(0.0, 0.5), "ew-resize", edgeType, overlayType + "-w-handle"),
                new Stage.Object.Overlay.Handle(PointMake(1.0, 0.5), "ew-resize", edgeType, overlayType + "-e-handle"),
            );
        }

        var handlesContainer = document.createElement("div");
        handlesContainer.className = "handles";
        handlesContainer.style.display = "none";
        overlay.appendChild(handlesContainer);
        this.handlesContainer = handlesContainer;
        this._handleListener = (event) => {
            this.onHandleMouseDown(event);
        };

        this.handles = handles;

        this.stage = stage;
        this.layer = layer;
    }
    destroy() {
        var resizeObserver = this.resizeObserver;
        if (resizeObserver != null) {
            resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        var destroyController = this.destroyController;
        if (destroyController != null) {
            destroyController.abort();
            this.destroyController = null;
        }

        var buttonBars = this._buttonBars;
        for (var position in buttonBars) {
            var entry = buttonBars[position];
            var observer = entry.resizeObserver;
            if (observer != null) {
                observer.disconnect();
            }
        }

        this.object = null;
        this.layer = null;
        this.stage = null;
    }
    /*
     *
     */
    /** @type {Stage.Object.Overlay.Handle[]} */
    set handles(list) {
        const handlesContainer = this.handlesContainer;
        const destroySignal = this.destroyController.signal;
        const handleListener = this._handleListener;

        const previous = this.handles;

        const removed = previous.filter(handle => list.includes(handle) == false);
        removed.forEach(handle => {
            const element = handle.element;
            if (element.parentNode == handlesContainer) {
                handlesContainer.removeChild(element);
            }
            element.removeEventListener("mousedown", handleListener);
        });


        const added = list.filter(handle => previous.includes(handle) == false);
        added.forEach(handle => {
            const element = handle.element;
            handlesContainer.appendChild(element);

            element.addEventListener("mousedown", handleListener, {signal: destroySignal});
        });
        this._handles = Array.from(list);
    }
    get handles() {
        return Array.from(this._handles ?? []);
    }
    set object(object) {
        var previous = this._object;
        // Presenter will change its croppable flag based on the style
        // e.g. rectangle + silhouette can be cropped, circle/triangle cannot
        // So we need to observe that.
        if (previous != null) {
            previous.removeObserverForProperty(this, "contentInsets");
            previous.removeObserverForProperty(this, "croppable");
            previous.removeObserverForProperty(this, "rotation");
        }
        this._object = object;
        if (object != null) {
            object.addObserverForProperty(this, "contentInsets");
            object.addObserverForProperty(this, "croppable");
            object.addObserverForProperty(this, "rotation");
        }
    }
    get object() {
        return this._object;
    }
    set visible(value) {
        var visible = !!value;
        if (visible == this.visible) {
            return;
        }

        this._visible = visible;

        var display = (visible ? "" : "none");
        var overlay = this.overlay;
        overlay.style.display = display;
        if (visible == true) {
            this.updateOverlayPosition();
        }
    }
    get visible() {
        return this._visible ?? false;
    }
    set buttonBars(val) {
        const positions = Stage.Object.Overlay.Position;
        for (let key in positions) {
            const position = positions[key];
            const buttonBar = val[position];
            this.setButtonBarAtPosition(buttonBar, position);
        }
    }
    get buttonBars() {
        const result = {};
        const buttonBars = this._buttonBars;
        for (let position in buttonBars) {
            result[position] = buttonBars[position].element;
        }
        return result;
    }
    set buttonBarsVisible(value) {
        var buttonBarsVisible = !!value;
        if (buttonBarsVisible == this.buttonBarsVisible) {
            return;
        }
        this._buttonBarsVisible = buttonBarsVisible;

        var display = (buttonBarsVisible ? "" : "none");
        var buttonBars = this._buttonBars;
        for (var position in buttonBars) {
            var entry = buttonBars[position];

            var element = entry.element;
            element.style.display = display;

            if (buttonBarsVisible == true) {
                var box = element.getBoundingClientRect();
                entry.height = box.height;
                entry.width = box.width;
            }
        }
        if (this.visible == true) {
            this.updateOverlayPosition();
        }
    }
    get buttonBarsVisible() {
        return this._buttonBarsVisible ?? false;
    }
    set dragHandlesVisible(value) {
        var dragHandlesVisible = !!value;
        if (dragHandlesVisible == this.dragHandlesVisible) {
            return;
        }
        this._dragHandlesVisible = dragHandlesVisible;

        this.handlesContainer.style.display = (dragHandlesVisible ? "" : "none");

        if (this.visible == true) {
            this.updateOverlayPosition();
        }
    }
    get dragHandlesVisible() {
        return this._dragHandlesVisible ?? false;
    }
    /*
     *
     */
    get anchored() {
        return (this.object.anchor != Stage.Object.Anchor.None);
    }
    deanchor() {
        this.object.deanchor();
    }

    get objectCanBeCropped() {
        const object = this.object;
        return (object.croppable == true && object.rotation == 0);
    }
    get objectCropInsets() {
        return this.object.cropInsets ?? InsetsZero();
    }
    set objectCropInsets(val) {
        this.object.cropInsets = val;
    }

    set objectAnchor(anchor) {
        this.object.anchor = anchor;
    }
    get objectAnchor() {
        return this.object.anchor;
    }

    set objectScale(scale) {
        this.object.scale = scale;
    }
    get objectScale() {
        return this.object.scale;
    }

    set objectCenter(center) {
        this.object.center = center;
    }
    get objectCenter() {
        return this.object.center;
    }

    get objectBoundingBox() {
        return this.layer.boundingBox;
    }

    get objectBoundingBoxWithoutCropInsets() {
        return this.object.boundingBoxWithoutCropInsets();
    }

    get objectMinimumSize() {
        return null;
    }
    get objectMaximumSize() {
        const currentSize = this.objectSize;
        const stageSize = this.object.stage?.size ?? Stage.DefaultSize;
        const scale = Math.min(
            stageSize.width / currentSize.width,
            stageSize.height / currentSize.height
        );
        return SizeMake(
            currentSize.width * scale,
            currentSize.height * scale
        );
    }

    get objectSize() {
        return this.layer.size;
    }
    set objectSize(value) {
        throw AbstractError();
    }
    get preserveAspectRatio() {
        return true;
    }
    set layer(aLayer) {
        var previous = this._layer;
        if (aLayer == previous) {
            return;
        }

        if (previous != null) {
            previous.removeObserverForProperty(this, "transform");
            previous.removeObserverForProperty(this, "frame");
        }

        this._layer = aLayer;
        if (aLayer != null) {
            aLayer.addObserverForProperty(this, "transform");
            aLayer.addObserverForProperty(this, "frame");
            this.updateOverlayPosition();
        }
    }
    get layer() {
        return this._layer;
    }
    observePropertyChanged(obj, key, val) {
        if (key == "transform" || key == "frame" || key == "contentInsets") {
            this.updateOverlayPosition();
        }
        else if (key == "croppable" || key == "rotation") {
            this.updateHandleVisibility();
        }
    }
    /*
     *
     */
    pointForObjectAnchor(anchor) {
        if (anchor == null) {
            anchor = this.media.anchor;
        }
        return Stage.Object.PointForAnchor(anchor);
    }
    needsDeanchorForAnchorPointAndHandle(anchorPoint, handle) {
        const handlePoint = handle.point;

        if (anchorPoint.y == handlePoint.y) {
            // e.g. anchored in the top left corner, use the top handle
            // must deanchor
            return true;
        }
        if (anchorPoint.x == handlePoint.x) {
            // e.g. anchored in the top left corner, use the left handle
            // must deanchor
            return true;
        }

        if (handle.type == Stage.Object.Overlay.Handle.Type.Crop) {
            // When the anchor is centered (vertical/horizontal)
            // the only crop handle that doesn't need to be deanchored
            // is the one opposite the anchor
            // e.g. anchor center-left, the only valid handle is right
            if (anchorPoint.x == 0.5 && handlePoint.x != 0.5) {
                return true;
            }
            if (anchorPoint.y == 0.5 && handlePoint.y != 0.5) {
                return true;
            }
            if (anchorPoint.x == 0.5 && anchorPoint.y == 0.5) {
                // We only crop the side where the handle is
                // so center stage anchor requires de-anchoring
                // in all situations
                return true;
            }
        }
        return false;
    }
    //
    //
    //
    _handleObjectCrop(stagePoint, handlePoint) {
        // We need this to calculate the change to the inset value
        const uncropped = this.objectBoundingBoxWithoutCropInsets;

        // We need to know what the current crop is to preserve the
        // three values that won't be changing
        const inputInsets = this.objectCropInsets;

        // Where we'll store our update
        let outputInsets = InsetsCopy(inputInsets);

        // We'd like to prevent people from making impossibly narrow
        // crops, so require there to be a little gap between
        // two edges on the same axis
        const gap = 0.95;

        // Top or bottom handle
        if (handlePoint.y == 0) {
            outputInsets.top = clamp(
                (stagePoint.y - RectGetMinY(uncropped)) / RectGetHeight(uncropped),
                0.0,
                (1.0 - outputInsets.bottom) * gap
            );
        }
        else if (handlePoint.y == 1) {
            outputInsets.bottom = clamp(
                (RectGetMaxY(uncropped) - stagePoint.y) / RectGetHeight(uncropped),
                0.0,
                (1.0 - outputInsets.top) * gap
            );
        }

        // Left or right handle
        if (handlePoint.x == 0) {
            outputInsets.left = clamp(
                (stagePoint.x - RectGetMinX(uncropped)) / RectGetWidth(uncropped),
                0.0,
                (1.0 - outputInsets.right) * gap
            );
        }
        else if (handlePoint.x == 1) {
            outputInsets.right = clamp(
                (RectGetMaxX(uncropped) - stagePoint.x) / RectGetWidth(uncropped),
                0.0,
                (1.0 - outputInsets.left) * gap
            );
        }

        if (InsetsEqual(inputInsets, outputInsets) == true) {
            // Nothing to do.
            return;
        }

        this.objectCropInsets = outputInsets;

        // The app aspect-fits all contents to the stage, and then applies
        // the user-selected scale to that size.  This is so that 100% user
        // scale always results in edges of the content touching the edges
        // of the stage.
        //
        // Changing the size of the content (via crop) may result in a
        // different aspect fit scale being used, and the existing user scale
        // applied to that may cause it to grow or shrink.
        //
        // In order to try and preserve the visual size on the size, to prevent
        // the contents from changing size during crop, we may need to
        // update the user-scale to take into account the new aspect-fit scale
        let scale = this.objectScale;
        const originalBox = this.dragState.box;
        const croppedBox = this.objectBoundingBox;
        if (handlePoint.y == 0.5) {
            scale *= originalBox.height / croppedBox.height;
        }
        else if (handlePoint.x == 0.5) {
            scale *= originalBox.width / croppedBox.width;
        }
        this.objectScale = scale;

        // The object stores a center which is relative to the stage.
        // So far we've only changed the size in one dimension, but
        // if the center is left unchanged, then the object will appear
        // to shrink/grow on both ends.
        // We'll try to move the center so that the three sides that
        // aren't moving remain unchanged

        let center = this.objectCenter;
        const croppedScaledBox = this.objectBoundingBox;
        if (handlePoint.y == 0.5) {
            var halfWidth = (croppedScaledBox.width / 2);

            if (handlePoint.x == 0) {
                // Keep it pinned on the right edge
                center.x = RectGetMaxX(originalBox) - halfWidth;
            }
            else if (handlePoint.x == 1) {
                // Keep it pinned on the left edge
                center.x = RectGetMinX(originalBox) + halfWidth;
            }
        }
        else if (handlePoint.x == 0.5) {
            var halfHeight = (croppedScaledBox.height / 2);

            if (handlePoint.y == 0) {
                // Keep it pinned on the bottom edge
                center.y = RectGetMaxY(originalBox) - halfHeight;
            }
            else if (handlePoint.y == 1) {
                // Keep it pinned on the top edge
                center.y = RectGetMinY(originalBox) + halfHeight;
            }
        }

        this.objectCenter = center;
    }
    objectFrameByMovingHandleToStagePoint(handle, stagePoint) {
        let handlePoint = handle.point;

        // The layer we're operating on
        const layerBox = this.objectBoundingBox;
        let layerTop = Math.floor(RectGetMinY(layerBox));
        let layerLeft = Math.floor(RectGetMinX(layerBox));
        let layerBottom = Math.ceil(RectGetMaxY(layerBox));
        let layerRight = Math.ceil(RectGetMaxX(layerBox));
        const contentInsets = this.object.contentInsets;

        // Based on the dragging handle, move
        // the appropriate sides of the layer
        if (handlePoint.x == 0) {
            layerLeft = stagePoint.x - contentInsets.left;
        }
        else if (handlePoint.x == 1) {
            layerRight = stagePoint.x + contentInsets.right;
        }

        if (handlePoint.y == 0) {
            layerTop = stagePoint.y - contentInsets.top;
        }
        else if (handlePoint.y == 1) {
            layerBottom = stagePoint.y + contentInsets.bottom;
        }

        var minimum = this.objectMinimumSize;
        if (minimum != null) {
            var badH = (layerRight - layerLeft <= minimum.width);
            var badV = (layerBottom - layerTop <= minimum.height);
            if (badH == true && badV == true) {
                return layerBox;
            }
            if (badH == true) {
                if (handlePoint.x == 0) {
                    layerLeft = layerRight - minimum.width;
                }
                else {
                    layerRight = layerLeft + minimum.width;
                }
            }
            if (badV == true) {
                if (handlePoint.y == 0) {
                    layerTop = layerBottom - minimum.height;
                }
                else {
                    layerBottom = layerTop + minimum.height;
                }
            }
        }


        let dragState = this.dragState;
        const handleType = handle.type;

        // If the handle was dragged so it crossed its opposite
        // Invert that to generate sane numbers
        if (handleType != Stage.Object.Overlay.Handle.Type.Crop) {
            const switchToHandleAt = (x, y) => {
                const mirror = this.handles.find(other =>
                    other != handle &&
                    other.type == handleType &&
                    other.point.x == x &&
                    other.point.y == y
                );

                if (mirror != null) {
                    handle = mirror;
                    handlePoint = handle.point;
                    this.movingHandle = handle;

                    dragState.origin = this._originForHandlePoint(handlePoint, layerBox);
                    dragState.anchor = this._anchorForHandlePoint(handlePoint);
                }
            }

            if (layerRight < layerLeft) {
                [layerRight, layerLeft] = [layerLeft, layerRight];
                switchToHandleAt(1.0 - handlePoint.x, handlePoint.y);
            }

            if (layerBottom < layerTop) {
                [layerTop, layerBottom] = [layerBottom, layerTop];
                switchToHandleAt(handlePoint.x, 1.0 - handlePoint.y);
            }
        }

        //
        //
        //
        let frame = RectMake(
            layerLeft,
            layerTop,
            layerRight - layerLeft,
            layerBottom - layerTop
        );

        const ratios = dragState.ratios;
        if (ratios != null) {
            if ((handlePoint.y == 0 || handlePoint.y == 1) && handlePoint.x == 0.5) {
                frame.width = frame.height / ratios.height;
                if (frame.width < 0 || frame.width > dragState.maxSize.width) {
                    return layerBox;
                }
            }
            else {
                frame.height = frame.width / ratios.width;
                if (frame.height < 0 || frame.height > dragState.maxSize.height) {
                    return layerBox;
                }
            }
        }

        let clampedSize = null;

        if (handleType == Stage.Object.Overlay.Handle.Type.Crop) {
            const uncropped = this.objectBoundingBoxWithoutCropInsets;
            clampedSize = SizeMake(
                Math.min(frame.width, uncropped.width),
                Math.min(frame.height, uncropped.height)
            );
        }
        else if (handleType == Stage.Object.Overlay.Handle.Type.Scale) {
            // Scale handles need to preserve the aspect ratio of the object
            // The frame right may not have the correct aspect ratio
            // Figure out what scale fills the frame best
            // And then use that to massage the frame back into correct aspect ratio
            const layerSize = this.objectMaximumSize;
            let scale = Math.min(
                frame.width / layerSize.width,
                frame.height / layerSize.height
            );
            scale = clamp(scale, 0.005, this.object.maxScale);

            clampedSize = SizeMake(
                layerSize.width * scale,
                layerSize.height * scale
            );
        }

        if (clampedSize != null) {
            frame.width = clampedSize.width;
            frame.height = clampedSize.height;

            if (handlePoint.x == 0) {
                frame.x = RectGetMaxX(layerBox) - frame.width;
            }
            else if (handlePoint.x == 1) {
                frame.x = RectGetMinX(layerBox);
            }

            if (handlePoint.y == 0) {
                frame.y = RectGetMaxY(layerBox) - frame.height;
            }
            else {
                frame.y = RectGetMinY(layerBox);
            }
        }

        return frame;
    }
    applyObjectFrameForScaleOrSize(frame) {
        if (this.handleUpdatesContentSize == true) {
            this.objectSize = SizeMake(
                RectGetWidth(frame),
                RectGetHeight(frame)
            );
        }
        else {
            const layerSize = this.objectMaximumSize;
            const scale = Math.min(
                frame.width / layerSize.width,
                frame.height / layerSize.height
            );
            this.objectScale = clamp(scale, 0.005, this.object.maxScale);
            frame = this.objectBoundingBox;
        }

        if (this.anchored == true) {
            // If the object is anchored, nothing more is needed
            // than the change to objectSize or objectScale
            return;
        }

        // For un-anchored objects, we'd like the object to remain
        // fixed to the point opposite of the handle being moved
        const multiplier = function(val) {
            // anchor is 0.0, center is origin + half size
            if (val == 0.0) return 0.5;
            // anchor is 0.5, center is origin
            else if (val == 0.5) return 0.0;
            // anchor is 1.0, center is origin - half size
            else return -0.5;
        }

        const dragState = this.dragState;
        const origin = dragState.origin;
        const anchor = dragState.anchor;
        const center = PointMake(
            Math.round(origin.x + (RectGetWidth(frame) * multiplier(anchor.x))),
            Math.round(origin.y + (RectGetHeight(frame) * multiplier(anchor.y)))
        );

        this.objectCenter = center;
    }
    applyAspectRatioCorrectionTo(centerX, centerY, frame, handlePoint) {
        if ((centerX == null && centerY == null) ||
            (centerX != null && centerY != null))
        {
            return [centerX, centerY];
        }

        const maxSize = this.objectMaximumSize;

        if (centerX == null) {
            let height;
            if (handlePoint.y == 0) {
                height = RectGetMaxY(frame) - centerY;
            }
            else {
                height = centerY - RectGetMinY(frame);
            }

            const scale = height / maxSize.height;
            const scaledWidth = maxSize.width * scale;

            if (handlePoint.x == 0) {
                centerX = RectGetMaxX(frame) - scaledWidth;
            }
            else {
                centerX = RectGetMinX(frame) + scaledWidth;
            }
        }
        else {
            let width;
            if (handlePoint.x == 0) {
                width = RectGetMaxX(frame) - centerX;
            }
            else {
                width = centerX - RectGetMinX(frame);
            }

            const scale = width / maxSize.width;
            const scaledHeight = maxSize.height * scale;

            if (handlePoint.x == 0) {
                centerY = RectGetMaxY(frame) - scaledHeight;
            }
            else {
                centerY = RectGetMinY(frame) + scaledHeight;
            }
        }

        return [centerX, centerY];
    }
    _anchorForHandlePoint(handlePoint) {
        return PointMake(1.0 - handlePoint.x, 1.0 - handlePoint.y);
    }
    _originForHandlePoint(handlePoint, bbox) {
        const anchor = this._anchorForHandlePoint(handlePoint);
        return PointMake(
            RectGetMinX(bbox) + (RectGetWidth(bbox) * anchor.x),
            RectGetMinY(bbox) + (RectGetHeight(bbox) * anchor.y)
        );
    }
    /*
     * Drag handle mouse methods
     */
    onHandleMouseDown(event) {
        const element = event.target;
        const handle = this.handles.find(handle => handle.element == element);
        if (handle == null) {
            console.error("couldn't find handle for event", event);
            return;
        }

        const onMouseMove = (event) => {
            this.onHandleMouseMove(event);
        };
        const onMouseUp = (event) => {
            this.onHandleMouseUp(event);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "";
        }

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        document.body.style.cursor = handle.cursor;

        const object = this.object;
        object.handleWillBeginTracking(handle);

        this.movingHandle = handle;
        this.lastWindowPoint = PointMake(event.x, event.y);

        this.alignmentGrid = object.alignmentGrid;

        // They may jump around as the object is resized,
        // so we'll hide them during the drag operation
        // and show them in onHandleMouseUp
        this.buttonBarsVisible = false;

        let handlePreservesAspectRatio = false;

        if (handle.type == Stage.Object.Overlay.Handle.Type.Scale) {
            this.handleUpdatesContentSize = false;
            handlePreservesAspectRatio = true;
        }
        else if (handle.type == Stage.Object.Overlay.Handle.Type.Resize) {
            this.handleUpdatesContentSize = true;
            handlePreservesAspectRatio = (event.shiftKey == true);
        }
        else {
            this.handleUpdatesContentSize = false;
        }

        if (this.anchored == true) {
            const anchor = this.objectAnchor;
            var aPoint = this.pointForObjectAnchor(anchor);

            if (this.needsDeanchorForAnchorPointAndHandle(aPoint, handle) == true) {
                this.deanchor();
            }
        }

        const bbox = this.objectBoundingBox;
        const insets = this.object.contentInsets;

        const stageSize = this.stage.size;
        const dragState = {
            origin: this._originForHandlePoint(handle.point, bbox),
            anchor: this._anchorForHandlePoint(handle.point),
            box: bbox,
            maxSize: SizeMake(
                stageSize.width + (insets.left + insets.right),
                stageSize.height + (insets.top + insets.bottom),
            ),
        }
        if (handlePreservesAspectRatio == true) {
            const contentSize = this.objectSize;
            dragState.ratios = {
                width: contentSize.width / contentSize.height,
                height: contentSize.height / contentSize.width,
            }
        }
        this.dragState = dragState;
        this.lastStagePoint = null;
    }
    _stagePointFromMouseEvent(event) {
        const windowPoint = PointMake(event.x, event.y);

        const stage = this.stage;
        const canvas = stage.canvas;

        // The window point clamped inside the canvas
        const canvasBox = canvas.getBoundingClientRect();
        const canvasPoint = PointMake(
            clamp(windowPoint.x - canvasBox.x, 0, canvasBox.width),
            clamp(windowPoint.y - canvasBox.y, 0, canvasBox.height)
        )

        // The canvas point scaled to stage resolution
        const scale = stage.canvasWindowScale;
        const stagePoint = PointMake(
            Math.round(canvasPoint.x / scale),
            Math.round(canvasPoint.y / scale)
        );

        return stagePoint;
    }
    onHandleMouseMove(event) {
        const handle = this.movingHandle;
        if (handle == null) {
            return;
        }

        // The point in window coordinates
        const windowPoint = PointMake(event.x, event.y);
        const lastWindowPoint = this.lastWindowPoint;
        if (PointEquals(windowPoint, lastWindowPoint) == true) {
            return;
        }
        this.lastWindowPoint = windowPoint;

        const stagePoint = this._stagePointFromMouseEvent(event);
        const lastStagePoint = this.lastStagePoint;
        if (lastStagePoint != null && PointEquals(stagePoint, lastStagePoint) == true) {
            return;
        }
        this.lastStagePoint = stagePoint;

        let snapPoint = PointCopy(stagePoint);
        const handlePoint = handle.point;

        const grid = this.alignmentGrid;
        let snapGuide = null;

        if (grid != null) {
            let frame = this.objectFrameByMovingHandleToStagePoint(handle, stagePoint);

            // frame is the entire size of the object, but the handles may
            // be inset due to the object's contentInsets.  We need to
            // inset the frame so the x/y coordinate we generate matches
            // where the handles are.
            const contentInsets = this.object.contentInsets;
            frame = RectInset(frame, contentInsets);

            snapPoint.x = RectGetMinX(frame) + (RectGetWidth(frame) * handlePoint.x);
            snapPoint.y = RectGetMinY(frame) + (RectGetHeight(frame) * handlePoint.y);

            snapGuide = grid.guideForRect(RectMake(snapPoint.x, snapPoint.y, 0, 0));
            if (snapGuide != null) {
                let centerX = snapGuide.centerX;
                let centerY = snapGuide.centerY;

                if (handle.type == Stage.Object.Overlay.Handle.Type.Scale) {
                    [centerX, centerY] = this.applyAspectRatioCorrectionTo(centerX, centerY, frame, handlePoint);
                }

                if (centerX != null) {
                    snapPoint.x = centerX;
                }
                if (centerY != null) {
                    snapPoint.y = centerY;
                }
            }
        }


        if (handle.type == Stage.Object.Overlay.Handle.Type.Crop) {
            this._handleObjectCrop(snapPoint, handlePoint);
        }
        else {
            let frame = this.objectFrameByMovingHandleToStagePoint(handle, snapPoint);
            this.applyObjectFrameForScaleOrSize(frame);
        }

        if (grid != null) {
            grid.highlightGuide(snapGuide, this.objectBoundingBox);
        }
    }
    onHandleMouseUp(event) {
        this.object?.handleWillEndTracking(this.movingHandle);

        this.movingHandle = null;
        this.lastWindowPoint = null;
        this.lastStagePoint = null;

        this.alignmentGrid = null;
        delete this.dragState;

        this.buttonBarsVisible = true;

        this.handleUpdatesContentSize = false;
    }
    /*
     * Crop reveal
     */
    layerForCropReveal() {
        return this.layer;
    }
    newUncroppedLayer() {
        return new RenderLayer();
    }
    createUncroppedLayer() {
        this.destroyUncroppedLayer();

        const sourceLayer = this.layerForCropReveal();
        if (sourceLayer == null) {
            return null;
        }

        // Figure out where in the render tree the source resides
        const stage = this.object.stage;
        const stageLayers = [stage.foregroundLayer];
        let parentLayer = sourceLayer;
        while (parentLayer != null && stageLayers.indexOf(parentLayer.superlayer) == -1) {
            parentLayer = parentLayer.superlayer;
        }

        // Create the layer to show the uncrop reveal
        let uncropped = this.newUncroppedLayer();
        // Copy the contents
        uncropped.contents = sourceLayer.contents;
        // And the mask
        uncropped.mask = sourceLayer.mask;
        // The filters
        uncropped.filters = sourceLayer.filters;
        // Fade it more
        uncropped.opacity = sourceLayer.opacity * 0.5;
        // Position it
        uncropped.frame = this.objectBoundingBoxWithoutCropInsets;

        const shouldHideUncroppedLayer = () => {
            return (
                stage.isVirtualCameraActive == true
            );
        }

        // Hide it if something is consuming the virtual camera
        uncropped.hidden = shouldHideUncroppedLayer();

        // May need to get our texture updated so observe contentsNeedUpdate
        let timeout = null;
        let updateObserver = (obj, key, val) => {
            if (key == "isVirtualCameraActive") {
                uncropped.hidden = shouldHideUncroppedLayer();
            }
            else if (key == "mask") {
                uncropped.mask = sourceLayer.mask;
            }
            else if (key == "contentsNeedUpdate") {
                uncropped.contentsNeedUpdate = sourceLayer.contentsNeedUpdate;
            }
            else {
                if (timeout != null) {
                    window.clearTimeout(timeout);
                }
                timeout = window.setTimeout(() => {
                    timeout = null;
                    uncropped.frame = this.objectBoundingBoxWithoutCropInsets;
                }, 1);
            }
        }
        stage.addObserverForProperty(updateObserver, "isVirtualCameraActive");
        sourceLayer.addObserverForProperty(updateObserver, "contentsNeedUpdate");
        sourceLayer.addObserverForProperty(updateObserver, "mask");
        parentLayer.addObserverForProperty(updateObserver, "frame");
        parentLayer.addObserverForProperty(updateObserver, "transform");
        this.object.addObserverForProperty(updateObserver, "cropInsets");

        // Add it to the render tree
        parentLayer.superlayer.insertSublayerBefore(uncropped, parentLayer);

        // Make it easy to clean everything up
        this.uncroppedLayerCleanup = () => {
            stage.removeObserverForProperty(updateObserver, "isVirtualCameraActive");
            sourceLayer.removeObserverForProperty(updateObserver, "contentsNeedUpdate");
            sourceLayer.removeObserverForProperty(updateObserver, "mask");
            parentLayer.removeObserverForProperty(updateObserver, "frame");
            parentLayer.removeObserverForProperty(updateObserver, "transform");
            this.object.removeObserverForProperty(updateObserver, "cropInsets");

            const parent = uncropped.superlayer;
            if (parent != null) {
                parent.removeSublayer(uncropped);
            }
        };

        const grid = this.alignmentGrid;
        if (grid != null) {
            grid.ignoreLayer(uncropped);
        }
    }
    destroyUncroppedLayer() {
        const cleanup = this.uncroppedLayerCleanup;
        if (cleanup != null) {
            cleanup();
            this.uncroppedLayerCleanup = null;
        }
    }

    /*
     *
     */
    updateHandleVisibility(top, left, bottom, right) {
        this.handles.forEach(handle => {
            const handlePoint = handle.point;

            if ((handlePoint.x == 0 && left == false) ||
                (handlePoint.x == 1 && right == false) ||
                (handlePoint.y == 0 && top == false) ||
                (handlePoint.y == 1 && bottom == false))
            {
                handle.valid = false;
            }
            else {
                if (handle.type == Stage.Object.Overlay.Handle.Type.Crop) {
                    handle.valid = this.objectCanBeCropped;
                }
                else {
                    handle.valid = true;
                }
            }
        });
    }
    updateOverlayPosition() {
        var overlay = this.overlay;

        var bbox = this.objectBoundingBox;
        if (bbox.width <= 0 || bbox.height <= 0) {
            return;
        }

        bbox = RectInset(bbox, this.object.contentInsets);

        var stage = this.stage;
        var stageSize = stage.size;
        var scale = stage.canvasWindowScale;

        var top = Math.round(RectGetMinY(bbox));
        var left = Math.round(RectGetMinX(bbox));
        var width = Math.round(RectGetWidth(bbox));
        var height = Math.round(RectGetHeight(bbox));

        // If a handle would be off stage, hide it.
        this.updateHandleVisibility(
            top >= -1,
            left >= -1,
            Math.round(top + height) <= stageSize.height + 1,
            Math.round(left + width) <= stageSize.width + 1,
        );

        // Clamp the frame to remain on stage
        if (top < 0) {
            height += top;
            top = 0;
        }
        if (left < 0) {
            width += left;
            left = 0;
        }
        if (top + height > stageSize.height) {
            height = stageSize.height - top;
        }
        if (left + width > stageSize.width) {
            width = stageSize.width - left;
        }

        // Update the DOM
        top = (top * scale);
        left = (left * scale);
        width = (width * scale);
        height = (height * scale);

        overlay.style.left = `${left}px`;
        overlay.style.top = `${top}px`;
        overlay.style.width = `${width}px`;
        overlay.style.height = `${height}px`;

        var frame = RectIntegral(RectMake(left, top, width, height));
        var maxSize = SizeMake(
            Math.round(stageSize.width * scale),
            Math.round(stageSize.height * scale)
        );
        this.updateButtonBarPlacement(frame, maxSize);
    }
    updateButtonBarPlacement(overlayFrame, maxSize) {
        var buttonBars = this._buttonBars;

        const verticalInset = this.verticalInset;
        const horizontalInset = this.horizontalInset;
        const positions = Stage.Object.Overlay.Position;

        const insetStage = RectInset(
            RectMake(0, 0, maxSize.width, maxSize.height),
            InsetsMake(5, 5, 5, 5)
        );

        for (var position in buttonBars) {
            var entry = buttonBars[position];
            if (entry == null) {
                continue;
            }

            var buttonBarWidth = entry.width;
            var buttonBarHeight = entry.height;
            if (buttonBarWidth == null || buttonBarHeight == null) {
                continue;
            }

            var buttonBar = entry.element;

            var frame = RectZero();
            frame.width = buttonBarWidth;
            frame.height = buttonBarHeight;

            // Apply horizontal positioning
            if (position == positions.TopLeft ||
                position == positions.CenterLeft ||
                position == positions.BottomLeft)
            {
                frame.x = RectGetMinX(overlayFrame) + horizontalInset;
            }
            else if (position == positions.TopRight ||
                     position == positions.Right ||
                     position == positions.BottomRight)
            {
                frame.x = RectGetMaxX(overlayFrame) - horizontalInset - frame.width;
            }
            else {
                frame.x = RectGetMidX(overlayFrame) - (frame.width / 2);
            }

            // Apply vertical positioning
            if (position == positions.TopLeft ||
                position == positions.TopCenter ||
                position == positions.TopRight)
            {
                frame.y = RectGetMinY(overlayFrame) - verticalInset - frame.height;
            }
            else if (position == positions.BottomLeft ||
                     position == positions.BottomCenter ||
                     position == positions.BottomRight)
            {
                frame.y = RectGetMaxY(overlayFrame) + verticalInset;
            }
            else {
                frame.y = RectGetMidY(overlayFrame) - (frame.height / 2);
            }

            frame = RectIntegral(frame);

            // Constrain it to remain within the stage
            if (frame.x < RectGetMinX(insetStage)) {
                frame.x = RectGetMinX(insetStage);
            }
            else if (RectGetMaxX(frame) > RectGetMaxX(insetStage)) {
                frame.x = RectGetMaxX(insetStage) - RectGetWidth(frame);
            }

            var top = frame.y - overlayFrame.y;
            var left = frame.x - overlayFrame.x;

            if (RectEquals(frame, entry.frame) == true &&
                entry.left == left && entry.top == top)
            {
                continue;
            }

            entry.frame = frame;
            buttonBar.style.top = `${top}px`;
            buttonBar.style.left = `${left}px`;
        }
    }
    /*
     *
     */
    _isValidButtonBarPosition(position) {
        for (var key in Stage.Object.Overlay.Position) {
            if (Stage.Object.Overlay.Position[key] == position) {
                return true;
            }
        }
        return false;
    }
    setButtonBarAtPosition(buttonBar, position) {
        // Verify valid position
        if (this._isValidButtonBarPosition(position) == false) {
            console.error("setButtonBarAtPosition supplied invalid position: ", position);
            return;
        }

        var previous = this._buttonBars[position];
        // No change? nothing to do
        if (previous == buttonBar) {
            return;
        }

        var overlay = this.overlay;
        // Remove the previous if it exists
        if (previous != null) {
            if (previous.element.parentNode == overlay) {
                overlay.removeChild(previous.element);
            }
            const observer = previous.observer;
            if (observer != null) {
                observer.disconnect();
            }
        }

        if (buttonBar == null) {
            delete this._buttonBars[position];
        }
        else {
            buttonBar.style.pointerEvents = "auto";
            buttonBar.style.position = "absolute";
            buttonBar.style.display = (this.buttonBarsVisible ? "" : "none");
            overlay.appendChild(buttonBar);

            var box = buttonBar.getBoundingClientRect();
            var entry = {
                frame: RectZero(),
                element: buttonBar,
                width: box.width,
                height: box.height,
                observer: null
            };

            const observer = new ResizeObserver(entries => {
                if (this.visible == true) {
                    var box = buttonBar.getBoundingClientRect();
                    entry.width = box.width;
                    entry.height = box.height;

                    this.updateOverlayPosition();
                }
            });
            observer.observe(buttonBar);
            entry.observer = observer;

            this._buttonBars[position] = entry;
        }

        if (this.visible == true) {
            this.updateOverlayPosition();
        }
    }
    buttonBarAtPosition(position) {
        if (this._isValidButtonBarPosition(position) == false) {
            console.error("buttonBarAtPosition supplied invalid position: ", position);
            return;
        }
        var entry = this._buttonBars[position];
        if (entry != null) {
            return entry.element;
        }
        return null;
    }
    allButtonBars() {
        return Object.values(this._buttonBars).map(buttonBar => buttonBar.element);
    }
}

// Effectively a copy of Stage.Object.Anchor, without "none"
Stage.Object.Overlay.Position = Object.freeze({
    TopLeft: "tl",
    TopCenter: "tc",
    TopRight: "tr",
    BottomLeft: "bl",
    BottomCenter: "bc",
    BottomRight: "br",
    CenterLeft: "cl",
    Center: "mid",
    CenterRight: "cr",
});

Stage.Object.Overlay.NewButton = function(title, icon, action) {
    var button = document.createElement("button");
    button.title = title;
    if (icon != null) {
        button.appendChild(icon);
    }
    else {
        var text = document.createTextNode(title);
        button.appendChild(text);
    }
    button.addEventListener("click", action);
    return button;
}

Stage.Object.Overlay.NewButtonBar = function(buttons) {
    if (buttons == null || buttons.length == 0) {
        return null;
    }
    var bar = document.createElement("div");
    bar.className = "button_bar";
    buttons.forEach(button => bar.appendChild(button));
    return bar;
}

Stage.Object.Overlay.Handle = class {
    constructor(point, cursor, type, id) {
        this.point = point;
        this.cursor = cursor;
        this.type = type;

        const element = document.createElement("div");
        element.className = "handle"
        element.style.left = `${point.x * 100}%`;
        element.style.top = `${point.y * 100}%`;
        element.style.cursor = cursor;
        this.element = element;
        element.id = id;
        if (type == Stage.Object.Overlay.Handle.Type.Crop) {
            const classList = element.classList;
            classList.add("crop");
            if (point.x == 0.5) {
                classList.add("vertical");
            }
            else {
                classList.add("horizontal");
            }
        }
    }
    // updateHandleVisibility sets this.
    // false when the handle is off-stage,
    // true when the handle is on-stage
    set valid(value) {
        this._valid = !!value;
        this._updateElementDisplay();
    }
    get valid() {
        return this._valid ?? true;
    }
    // The two subclasses set this based on their
    // own decisions
    set visible(value) {
        this._visible = !!value;
        this._updateElementDisplay();
    }
    get visible() {
        return this._visible ?? true;
    }
    _updateElementDisplay() {
        var display = "";
        if (this.visible == false || this.valid == false) {
            display = "none";
        }
        this.element.style.display = display;
    }
}

Stage.Object.Overlay.Handle.Type = Object.freeze({
    None: "none",
    Resize: "resize",
    Scale: "scale",
    Crop: "crop,"
});
