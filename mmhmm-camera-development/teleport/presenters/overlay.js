//
//  presenter/overlay.js
//  mmhmm
//
//  Created by Steve White on 8/30/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Presenter.Overlay = class extends Stage.Object.Overlay {
    constructor(object) {
        super(object, Stage.Object.Overlay.Handle.Type.Scale, Stage.Object.Overlay.Handle.Type.Crop, "presenter-overlay");
    }
    set object(object) {
        var previous = this.object;
        if (previous != null) {
            previous.removeObserverForProperty(this, "shape");
        }
        super.object = object;
        if (object != null) {
            object.addObserverForProperty(this, "shape");
        }
    }
    get object() {
        return super.object;
    }
    observePropertyChanged(obj, key, val) {
        if (key == "shape") {
            this.updateOverlayPosition();
        }
        else {
            super.observePropertyChanged(obj, key, val);
        }
    }
    get objectBoundingBox() {
        var result = super.objectBoundingBox;
        var presenter = this.object;
        if (presenter.shape != Presenter.Shape.Circle) {
            return result;
        }

        var center = PointMake(
            RectGetMidX(result),
            RectGetMidY(result)
        );

        var size = this.objectSize;
        if (presenter.fullscreen == false) {
            var scale = this.objectScale;
            size.width *= scale;
            size.height *= scale;
        }
        return RectMake(
            center.x - (size.width / 2),
            center.y - (size.height / 2),
            size.width,
            size.height
        );
    }
    /*
     *
     */
    layerForCropReveal() {
        const presenter = this.object;
        const presLayer = presenter.layer;
        const videoLayer = presLayer?.videoLayer;
        return videoLayer;
    }
    newUncroppedLayer() {
        const layer = super.newUncroppedLayer();
        // Handle mirror video
        if (this.object.mirrorVideo == true) {
            // We can't just copy the contentRect over because that'll
            // have the crop insets applied, so we need to make a new one
            layer.contentRect = RectMake(1, 0, -1, 1);
        }
        return layer;
    }
}
