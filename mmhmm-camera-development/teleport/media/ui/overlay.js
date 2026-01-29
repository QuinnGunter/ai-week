//
//  slide_overlay.js
//  mmhmm
//
//  Created by Steve White on 8/9/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

Media.Overlay = class extends Stage.Object.Overlay {
    constructor(media) {
        let cornerType, edgeType;
        if (media.resizable == false) {
            cornerType = Stage.Object.Overlay.Handle.Type.None;
            edgeType = Stage.Object.Overlay.Handle.Type.None;
        }
        else if (media.preserveAspectRatio == false) {
            edgeType = Stage.Object.Overlay.Handle.Type.Resize;
            cornerType = Stage.Object.Overlay.Handle.Type.Resize;
        }
        else {
            cornerType = Stage.Object.Overlay.Handle.Type.Scale;
            if (media.croppable == true) {
                edgeType = Stage.Object.Overlay.Handle.Type.Crop;
            }
            else {
                edgeType = Stage.Object.Overlay.Handle.Type.None;
            }
        }

        super(media, cornerType, edgeType);
        this.media = media;

        media.addObserverForProperty(this, "layer");
    }
    destroy() {
        super.destroy();

        var media = this.media;
        if (media != null) {
            media.removeObserverForProperty(this, "layer");
        }
    }
    /*
     *
     */
    get objectMinimumSize() {
        return this.media.minimumSize;
    }
    set objectSize(value) {
        this.media.contentSize = value;
    }
    get objectSize() {
        var media = this.media;
        if (media.preserveAspectRatio == false) {
            var size = this.media.contentSize;
            if (size != null) {
                return size;
            }
        }
        return super.objectSize;
    }
    get preserveAspectRatio() {
        return this.media.preserveAspectRatio;
    }

    observePropertyChanged(obj, key, val) {
        if (key == "layer") {
            this.layer = obj.layer;
        }
        else {
            super.observePropertyChanged(obj, key, val);
        }
    }
}
