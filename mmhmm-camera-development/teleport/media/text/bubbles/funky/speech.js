//
//  media/text/bubbles/funky/speech.js
//  mmhmm
//
//  Created by Steve White on 10/9/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Funky.Speech = class extends Media.Text.Style.Funky {
    constructor() {
        super(LocalizedString("Speech"), LocalizedString("Funky"), "funky-speech");
        this.shape = [
            { x: 0.050, y: 0.991 },
            { x: 0.000, y: 0.826 },
            { x: 0.068, y: 0.000 },
            { x: 0.951, y: 0.000 },
            { x: 0.990, y: 0.355 },
            { x: 0.951, y: 0.991 },
        ];
        this.primaryColor = "#ffd600";
        this.secondaryColor = "#d7b707";

        var tailFrame = RectMake(0, 0, 80, 60);
        this.tailFrame = tailFrame;
        this.backgroundInset = this.shadowSize + Math.max(RectGetWidth(tailFrame), RectGetHeight(tailFrame));
        this.angle = 133;

        this.contentInsets = InsetsMake(0.0555, 0.109375, 0.075, 0.078125);
        this.insetsAreProportional = true;
    }
    newPathForSize(width, height) {
        var shell = this.newShellForSize(width, height);
        var tail = this._tailDataForSize(width, height, this.angle);
        if (tail != null) {
            shell.addPath(
                tail.path,
                AffineTransformToDOMMatrix(tail.transform),
            );
        }

        return shell;
    }
    _shapeForSize(width, height) {
        return this.shape.map(coord => {
            return PointMake(
                coord.x * width,
                coord.y * height
            );
        });
    }
    _tailDataForSize(width, height, angle, context) {
        var rads = degreesToRadians(angle);
        var center = PointMake(
            width / 2,
            height / 2
        );

        var lLength = Math.max(width, height);

        var guideEnd = PointMake(
            center.x + (lLength * Math.cos(rads)),
            center.y + (lLength * Math.sin(rads))
        );

        var guideLine = KldIntersections.ShapeInfo.line(
            [guideEnd.x, guideEnd.y],
            [center.x, center.y],
        );

        var tailFrame = this.tailFrame;

        var points = this._shapeForSize(width, height);
        for (var pointIdx=0; pointIdx<points.length; pointIdx+=1) {
            var start = points[pointIdx];
            var endIdx = pointIdx + 1;
            if (endIdx == points.length) {
                endIdx = 0;
            }
            var end = points[endIdx];

            var edgeLine = KldIntersections.ShapeInfo.line(start, end);

            const intersections = KldIntersections.Intersection.intersect(edgeLine, guideLine);
            var match = intersections.points;
            if (match.length == 0) {
                continue;
            }

            var tailCenter = match[0];


            var segmentLength = PointDistance(start, end);
            var segmentProgress = PointDistance(tailCenter, start);

            var edgeLength = 0;
            var edgeProgress = segmentProgress;

            if (context != null) {
                context.fillStyle = "blue";
                context.fillRect(tailCenter.x - 5, tailCenter.y - 5, 10, 10);
            }

            if (pointIdx == 0 || pointIdx == 1) {
                const seg1 = PointDistance(points[0], points[1]);
                const seg2 = PointDistance(points[1], points[2]);
                edgeLength = seg1 + seg2;
                if (pointIdx == 1) {
                    edgeProgress += seg1;
                }
            }
            else if (pointIdx == 3 || pointIdx == 4) {
                const seg1 = PointDistance(points[3], points[4]);
                const seg2 = PointDistance(points[4], points[5]);
                edgeLength = seg1 + seg2;
                if (pointIdx == 4) {
                    edgeProgress += seg1;
                }
            }
            else {
                edgeLength = segmentLength;
            }

            edgeProgress /= edgeLength;
            segmentProgress /= segmentLength;

            // At narrow sizes, two of the edges may be too small
            // to contain the tail.  We'll try to resize the tail
            // to fit in these scenarios...
            height = tailFrame.height;
            var top = 0;
            var bottom = height;
            if (height > segmentLength) {
                top = 0;
                bottom = segmentLength;
                height = segmentLength;
            }

            var path = new Path2D();
            path.moveTo(0, top);
            path.lineTo(tailFrame.width, top + (height * edgeProgress));
            path.lineTo(0, bottom);

            var edgeAngle = Math.PI - Math.atan2(start.x - end.x, start.y - end.y);

            var transform = AffineTransformMakeTranslation(
                tailCenter.x,
                tailCenter.y
            );

            transform = AffineTransformRotate(transform, edgeAngle);

            transform = AffineTransformTranslate(
                transform,
                0,
                -height * segmentProgress,
            );

            return { path, transform }
        }

        return null;
    }
    newTailTransformForSize(width, height, angle) {
        var data = this._tailDataForSize(width, height, angle);
        return data?.transform;
    }
    newTailForSize(width, height, angle) {
        var data = this._tailDataForSize(width, height, angle);
        return data?.path;
    }
    newShellForSize(width, height) {
        var path = new Path2D();
        this._shapeForSize(width, height).forEach((point, idx) => {
            if (idx == 0) {
                path.moveTo(point.x, point.y);
            }
            else {
                path.lineTo(point.x, point.y);
            }
        })
        path.closePath();
        return path;
    }
}
