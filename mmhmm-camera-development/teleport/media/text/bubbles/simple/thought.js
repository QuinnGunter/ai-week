//
//  media/text/bubbles/simple/thought.js
//  mmhmm
//
//  Created by Steve White on 10/13/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Simple.Thought = class extends Media.Text.Style.Simple {
    constructor() {
        super(LocalizedString("Thought"), LocalizedString("Simple"), "simple-thought");
        this.createTail();
        this.angle = 135;
    }
    createTail() {
        var tailCircles = [
            { cx: 28, cy: 28, r: 28 },
            { cx: 79, cy: 33, r: 15 },
            { cx: 111, cy: 45, r: 9 }
        ];

        var tailPath = new Path2D();
        var left = 1<<27, top = 1<<27, right = 0, bottom = 0;

        tailCircles.forEach(circle => {
            var cx = circle.cx;
            var cy = circle.cy;
            var radius = circle.r;

            var path = new Path2D();
            path.ellipse(
            cx, cy,
            radius, radius,
            0, 0, Math.PI * 2
            );
            tailPath.addPath(path);

            var l = (cx - radius);
            var r = (cx + radius);
            var t = (cy - radius);
            var b = (cy + radius);

            if (l < left) left = l;
            if (r > right) right = r;
            if (t < top) top = t;
            if (b > bottom) bottom = b;
        });

        this.tailPath = tailPath;
        this.tailCircles = tailCircles;
        var tailFrame = RectMake(left, top, right - left, bottom - top);
        this.tailFrame = tailFrame;
        this.backgroundInset = Math.max(tailFrame.width, tailFrame.height);
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

        var tailCenter = PointMake(
            center.x + (radius.width * Math.cos(rads)),
            center.y + (radius.height * Math.sin(rads))
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
        // Slide it back horizontally so the half of the first circle is under
        // the main ellipse
        transform = AffineTransformTranslate(
            transform,
            tailFrame.width/2 - tailCircles[0].r,
            tailFrame.height/2 - tailCircles[0].r
        );

        return transform;
    }
}
