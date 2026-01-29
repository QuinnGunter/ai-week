//
//  media/text/bubbles/classic/thought.js
//  mmhmm
//
//  Created by Steve White on 10/9/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Classic.Thought = class extends Media.Text.Style.Classic {
    constructor() {
        super(LocalizedString("Thought"), LocalizedString("Classic"), "classic-thought");
        this.shape = AdvancedTextLayer.Shape.Ellipse;
        this.angle = 135;
        this.createTail();
        this.contentInsets = {
            top: 24,
            left: 24,
            bottom: 24,
            right: 24
        }
    }
    createTail() {
        var tailCircles = [
            { cx: 15,  cy: 10, rx: 27, ry: 20, angle: 80 },
            { cx: 63,  cy: 13, rx: 19, ry: 15, angle: 83 },
            { cx: 100, cy: 26, rx: 13, ry: 11, angle: 86 }
        ];

        var tailPath = new Path2D();
        var left = 1<<27, top = 1<<27, right = 0, bottom = 0;

        tailCircles.forEach(circle => {
            var cx = circle.cx;
            var cy = circle.cy;
            var rx = circle.rx;
            var ry = circle.ry;

            var path = new Path2D();
            path.ellipse(
                cx, cy,
                rx, ry,
                degreesToRadians(circle.angle),
                0, Math.PI * 2
            );
            tailPath.addPath(path);

            var l = (cx - rx);
            var r = (cx + rx);
            var t = (cy - ry);
            var b = (cy + ry);

            if (l < left) left = l;
            if (r > right) right = r;
            if (t < top) top = t;
            if (b > bottom) bottom = b;
        });

        this.tailPath = tailPath;
        this.tailCircles = tailCircles;
        var tailFrame = RectMake(left, top, right - left, bottom - top);
        this.tailFrame = tailFrame;
        this.tailOffset = 25;
        this.backgroundInset = Math.max(tailFrame.width, tailFrame.height) + this.tailOffset;
    }
    //
    // Paths
    //
    newShellForSize(width, height) {
        var center = PointMake(
            width / 2,
            height / 2,
        );

        var radius = SizeMake(
            width / 2,
            height / 2
        );

        var path = new Path2D();
        path.ellipse(
            center.x, center.y,
            radius.width, radius.height,
            0, 0, Math.PI * 2
        );

        return path;
    }
    newTailForSize(width, height, angle) {
        return this.tailPath;
    }
    newTailTransformForSize(width, height, angle) {
        var rads = degreesToRadians(angle);

        var center = PointMake(
            width / 2,
            height / 2,
        );

        var radius = SizeMake(
            width / 2,
            height / 2
        );

        var tailOffset = this.tailOffset;
        var tailCenter = PointMake(
            center.x + ((tailOffset + radius.width) * Math.cos(rads)),
            center.y + ((tailOffset + radius.height) * Math.sin(rads))
        );

        var tailFrame = this.tailFrame;
        var tailCircles = this.tailCircles;

        var transform = AffineTransformMakeTranslation(tailCenter.x, tailCenter.y);
        transform = AffineTransformRotate(transform, rads);
        // As of now, the top-left of the tailPath is at the tailCenter
        // This shifts it so the center point of the tailPath is at tailCenter
        transform = AffineTransformTranslate(
            transform,
            -tailFrame.width/2,
            -tailFrame.height/2
        );

        transform = AffineTransformTranslate(
            transform,
            tailFrame.width/2,
            tailFrame.height/2 - tailCircles[0].ry
        );

        return transform;
    }
    // Legacy
    newPathForSize(width, height) {
        var path = this.newShellForSize(width, height);
        var tail = this.newTailForSize(width, height, this.angle);
        var transform = this.newTailTransformForSize(width, height, this.angle);
        var matrix = null;
        if (transform != null) {
            matrix = AffineTransformToDOMMatrix(transform);
        }
        path.addPath(tail, matrix);

        return path;
    }
}
