//
//  media/text/bubbles/simple/speech.js
//  mmhmm
//
//  Created by Steve White on 10/13/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Simple.Speech = class extends Media.Text.Style.Simple {
    constructor() {
        super(LocalizedString("Speech"), LocalizedString("Simple"), "simple-speech");
        this.angle = 133;

        var tailFrame = RectMake(0, 0, 118, 118);
        this.tailFrame = tailFrame;
        this.tailOffset = 25;
        this.backgroundInset = Math.max(tailFrame.width, tailFrame.height);
    }
    newTailTransformForHitTest(width, height, angle) {
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
        var transform = AffineTransformMakeTranslation(tailCenter.x, tailCenter.y);
        transform = AffineTransformRotate(transform, degreesToRadians(angle));
        // As of now, the top-left of the tailPath is at the tailCenter
        // This shifts it so the center point of the tailPath is at tailCenter
        transform = AffineTransformTranslate(transform, -(tailFrame.width / 2), -(tailFrame.height / 2));
        // XXX: -25 is to pull the triangle a little further in...
        // would be nice to understand how this value was arrived at
        transform = AffineTransformTranslate(transform, (tailFrame.width / 2) - this.tailOffset, 0);
        return transform;
    }
    newTailForSize(width, height, angle) {
        var rads = degreesToRadians(this.angle);
        var tailFrame = this.tailFrame;
        var tailOffset = this.tailOffset;

        var center = PointMake(
            width / 2,
            height / 2,
        );

        var radius = SizeMake(
            width / 2,
            height / 2
        );

        var tailCenter = PointMake(
            center.x + ((radius.width + (tailFrame.width - tailOffset)) * Math.cos(rads)),
            center.y + ((radius.height + (tailFrame.height - tailOffset)) * Math.sin(rads))
        );

        var clampPointToEllipse = function(point) {
            if (isNaN(point.x) || isNaN(point.y)) {
                debugger;
            }
            var isInside = Math.pow((point.x - center.x), 2) / Math.pow(radius.width, 2) +
                           Math.pow((point.y - center.y), 2) / Math.pow(radius.height, 2);
            if (isInside <= 1) {
                return point;
            }

            var line = KldIntersections.ShapeInfo.line(point, center);
            var ellipse = KldIntersections.ShapeInfo.ellipse(
                [center.x, center.y],
                radius.width,
                radius.height
            );
            var intersection = KldIntersections.Intersection.intersect(ellipse, line);
            var points = intersection.points;
            if (points.length > 0) {
                return points[0];
            }
            console.error("intersection failed", ellipse, line);
            return point;
        }

        var tailAngle = Math.atan2(tailFrame.height/2, tailFrame.width);
        var back1 = clampPointToEllipse(PointMake(
            tailCenter.x - (tailFrame.width * Math.cos(rads + tailAngle)),
            tailCenter.y - (tailFrame.height * Math.sin(rads + tailAngle)),
        ));
        var back2 = clampPointToEllipse(PointMake(
            tailCenter.x - (tailFrame.width * Math.cos(rads - tailAngle)),
            tailCenter.y - (tailFrame.height * Math.sin(rads - tailAngle)),
        ));

        var tail = new Path2D();
        tail.moveTo(back1.x, back1.y);
        tail.lineTo(tailCenter.x, tailCenter.y);
        tail.lineTo(back2.x, back2.y);
        tail.closePath();
        return tail;
    }
}

