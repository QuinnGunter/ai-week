//
//  gestures.js
//  mmhmm
//
//  Created by Steve White on 1/13/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class PresenterGestureLayer extends RenderLayer {
    constructor() {
        super();
        var isJapanese = (navigator.language.toLowerCase().indexOf("jp") != -1);
        this.assetBase = "assets/gestures/";
        this.gestureAssets = {
            thumbUp: "gesture-ThumbUp-colored-green.png",
            thumbDown: "gesture-ThumbDown-colored-orange.png",
            palm: "gesture-Wave.png",
            three: "gesture-NumberThree.png",
            peace: "gesture-Peace.png",
            point: "gesture-HandPointing.png", // gesture-PointFront
            hangLoose: "gesture-HangLooseFront.png",
            phone: "gesture-Phone-colored.png",
            heart: "gesture-Heart-EyesOpen.png",
            binocular: "gesture-Eyes01.png",
        }
    }
    set gesture(aGesture) {
        this._gesture = aGesture;
        this.updateLayout();
    }
    get gesture() {
        return this._gesture;
    }
    observePropertyChanged(obj, key, value) {
        if (key == "zIndex") {
            this.zIndex = value + 1;
        }
        else {
            this.updateLayout();
        }
    }
    get videoFrame() {
        // The gesture recognizer runs against an uncropped/mirrored frame
        // The videoLayer's frame may not match the uncropped size
        // This method returns what the frame would be if there weren't
        // cropping.   It is similar to the Stage.Object's boundingBoxWithoutCropInsets()
        const videoLayer = this.superlayer.videoLayer;
        const frame = videoLayer.frame;
        const contentRect = videoLayer.contentRect;

        // If the videoLayer weren't cropped, what its full size would be
        const fullSize = SizeMake(
            RectGetWidth(frame) / RectGetWidth(contentRect),
            RectGetHeight(frame) / RectGetHeight(contentRect)
        );

        // Work out the crop insets from the content rect
        let insetL = RectGetMinX(contentRect);
        let insetR = 1.0 - RectGetMaxX(contentRect);
        if (contentRect.width < 0) {
            // Swap for mirrored
            [insetL, insetR] = [insetR, insetL];
        }
        let insetT = RectGetMinY(contentRect);
        let insetB = 1.0 - RectGetMaxY(contentRect);
        if (contentRect.height < 0) {
            // Swap for mirrored
            [insetT, insetB] = [insetB, insetT];
        }

        const x1 = RectGetMinX(frame) - (insetL * fullSize.width);
        const y1 = RectGetMinY(frame) - (insetT * fullSize.height);
        const x2 = RectGetMaxX(frame) + (insetR * fullSize.width);
        const y2 = RectGetMaxY(frame) + (insetB * fullSize.height);

        return RectMake(x1, y1, x2 - x1, y2 - y1);
    }
    updateLayout() {
        var gesture = this.gesture;
        if (gesture == null) {
            this.opacity = 0;
            return;
        }
        this.opacity = 1.0;

        // Gesture results are in fractional pixels
        // clamp them to ensure they're sensible
        var frame = gesture.frame;
        var lFrame = RectMake(
            clamp(frame.x, 0, 1),
            clamp(frame.y, 0, 1),
            clamp(frame.width, 0, 1),
            clamp(frame.height, 0, 1),
        );

        var flip = gesture.flip;
        var vector = gesture.vector;
        var angle = (Math.PI / 2);

        // Deal with the gesture angle and presenter mirror video
        var videoLayer = this.superlayer.videoLayer;
        if (videoLayer.contentSize.width > 0) {
            angle += Math.atan2(vector.dx, vector.dy);
        }
        else {
            angle -= Math.atan2(vector.dx, vector.dy);
            flip = !flip;
            lFrame.x = 1.0 - RectGetMaxX(lFrame);
        }

        // This is the center of the gesture, relative to videoLayer
        var fullFrame = this.videoFrame;
        var position = PointMake(
            RectGetMinX(fullFrame) + (RectGetMidX(lFrame) * RectGetWidth(fullFrame)),
            RectGetMinY(fullFrame) + (RectGetMidY(lFrame) * RectGetHeight(fullFrame)),
        );

        // The gesture may be out of bounds due to cropping or circle
        // So check for that, and if so, discard it
        var vFrame = videoLayer.frame;
        if (position.x < 0 || position.x > RectGetMaxX(vFrame) ||
            position.y < 0 || position.y > RectGetMaxY(vFrame))
        {
            this.opacity = 0;
            return;
        }

        this.position = position;

        if (angle < 0) {
            angle += 2 * Math.PI;
        }
        this.angle = angle;

        var contentSize = SizeMake(1, 1);
        if (flip == true) {
            contentSize.width = -1;
        }
        this.contentSize = contentSize;

        // Load the asset
        var asset = this.assetBase + this.gestureAssets[gesture.style];
        if (asset != this.contentsSrc) {
            this.onContentsSrcLoaded = (image) => {
                if (this.contentsSrc == asset) {
                    this.size = this.naturalSize;
                    this.updateRotationAndScale();
                }
            }
            this.contentsSrc = asset;
        }

        // Final lyout
        this.updateRotationAndScale();
    }
    updateRotationAndScale() {
        var gesture = this.gesture;
        if (gesture == null) {
            // Function may have been invoked when the asset loaded
            // but the gesture may have gone by now...
            return;
        }

        var iSize = this.naturalSize;
        var pSize = this.videoFrame;
        var gSize = SizeMake(
            gesture.frame.width * pSize.width,
            gesture.frame.height * pSize.height
        );

        var scale = Math.min(gSize.width / iSize.width, gSize.height / iSize.height);
        scale += 0.1; // Fudge factor...

        // Rotate and scale the gesture layer
        var transform = Transform3DIdentity();
        transform = Transform3DRotate(transform, this.angle, 0, 0, 1);
        transform = Transform3DScale(transform, scale, scale, 1);
        this.transform = transform;
    }
}
