//
//  media/text/bubbles/classic/speech.js
//  mmhmm
//
//  Created by Steve White on 10/9/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Classic.Speech = class extends Media.Text.Style.Classic {
    constructor() {
        super(LocalizedString("Speech"), LocalizedString("Classic"), "classic-speech");
        this.primaryColor = "#FFFFFF";   // Background
        this.secondaryColor = "#000000"; // Border
        this.contentInsets = InsetsMake(36, 36, 36, 36);

        this.angle = 133;

        this.cornerRadius = 24;
        this.lineWidth = 12;

        var tailFrame = RectMake(0, 0, 96, 70);
        this.tailFrame = tailFrame;

        this.backgroundInset = Math.max(RectGetWidth(tailFrame), RectGetHeight(tailFrame)) + this.lineWidth;
    }
    clipLineToRect(lineStart, lineEnd, rect, cornerRadius) {
        var box = null;
        if (cornerRadius == null || cornerRadius <= 0) {
            box = KldIntersections.ShapeInfo.rectangle(rect.x, rect.y, rect.width, rect.height);
        }
        else {
            var d = "";
            const radius = cornerRadius;

            d += ` M${RectGetMinX(rect) + radius},${RectGetMinY(rect)}`;
            d += ` h${RectGetWidth(rect) - (radius * 2)}`;
            d += ` a${radius},${radius} 0 0 1 ${radius},${radius}`;
            d += ` v${RectGetHeight(rect) - (radius * 2)}`;
            d += ` a${radius},${radius} 0 0 1 -${radius},${radius}`;
            d += ` h-${RectGetWidth(rect) - (radius * 2)}`;
            d += ` a${radius},${radius} 0 0 1 -${radius},-${radius}`;
            d += ` v-${RectGetHeight(rect) - (radius * 2)}`;
            d += ` a${radius},${radius} 0 0 1 ${radius},-${radius}`;
            d += ` z`

            box = KldIntersections.ShapeInfo.path(d);
        }
        var line = KldIntersections.ShapeInfo.line(lineStart, lineEnd);
        var intersections = KldIntersections.Intersection.intersect(box, line);
        var points = intersections?.points ?? [];

        var best = {
            point: lineEnd,
            distance: null
        };

        for (var pointIdx=0; pointIdx<points.length; pointIdx+=1) {
            var point = points[pointIdx];
            var distance = PointDistance(lineStart, point);
            if (best.distance == null || distance < best.distance) {
                best.distance = distance;
                best.point = point;
            }
        }

        return PointMake(
            Math.round(best.point.x),
            Math.round(best.point.y)
        );
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

        var box = RectMake(0, 0, width, height);
        var tailTip = PointMake(
            center.x + (width * Math.cos(rads)),
            center.y + (height * Math.sin(rads))
        );
        tailTip = this.clipLineToRect(center, tailTip, box);

        var cornerRadius = this.cornerRadius;
        var clampH = false;

        var tailRotate = 0;
        if (tailTip.x == 0) {
            tailRotate = 180;
        }
        else if (tailTip.x == width) {
            tailRotate = 0;
        }
        else if (tailTip.y == 0) {
            tailRotate = 270;
            clampH = true;
        }
        else {
            tailRotate = 90;
            clampH = true;
        }

        var tailFrame = this.tailFrame;

        var halfW = tailFrame.width / 2;
        if (clampH == true) {
            tailTip.x = clamp(tailTip.x, cornerRadius + halfW, width - cornerRadius - halfW);
        }
        else {
            tailTip.y = clamp(tailTip.y, cornerRadius + halfW, height - cornerRadius - halfW);
        }

        var transform = AffineTransformMakeTranslation(tailTip.x, tailTip.y);
        transform = AffineTransformRotate(transform, degreesToRadians(tailRotate));
        // As of now, the top-left of the tailPath is at the tailCenter
        // This shifts it so the center point of the tailPath is at tailCenter
        transform = AffineTransformTranslate(transform, 0, -(tailFrame.height / 2));
        return transform;

    }
    newTailForSize(width, height, angle) {
        const rads = degreesToRadians(angle);
        const shell = RectMake(0, 0, width, height);

        const center = PointMake(
            width / 2,
            height / 2
        );

        var tailTip = PointMake(
            center.x + (RectGetWidth(shell) * Math.cos(rads)),
            center.y + (RectGetHeight(shell) * Math.sin(rads))
        );
        tailTip = this.clipLineToRect(center, tailTip, shell);

        var distance = 0;
        if (tailTip.x == 0) {
            distance = (height - tailTip.y) / height;
        }
        else if (tailTip.x == width) {
            distance = tailTip.y / height;
        }
        else if (tailTip.y == 0) {
            distance = tailTip.x / width;
        }
        else {
            distance = (width - tailTip.x) / width;
        }

        const tailFrame = this.tailFrame;
        var path = new Path2D();
        path.moveTo(0, 0);
        path.lineTo(tailFrame.width, tailFrame.height * distance);
        path.lineTo(0, tailFrame.height);
        path.closePath();
        return path;
    }
    newShellForSize(width, height) {
        var rect = RectMake(0, 0, width, height);
        var path = NewRoundRectPathForRectWithRadius(rect, this.cornerRadius);
        return path;
    }
    drawInContext(context, width, height) {
        var backgroundInset = this.backgroundInset;
        var iWidth = width - (backgroundInset * 2);
        var iHeight = height - (backgroundInset * 2);

        var inside = this.newShellForSize(iWidth, iHeight);
        var tail = null;
        try {
            tail = this.newTailForSize(iWidth, iHeight, this.angle);
            var transform = this.newTailTransformForSize(iWidth, iHeight, this.angle);
            if (tail != null && transform != null) {
                var matrix = AffineTransformToDOMMatrix(transform);
                var path = new Path2D();
                path.addPath(tail, matrix);
                tail = path;
            }
        }
        catch (err) {
            console.error("Error genearting tail", iWidth, iHeight, this.angle, err);
        }

        context.save();
        context.translate(backgroundInset, backgroundInset);


        context.lineWidth = this.lineWidth;
        context.strokeStyle = Color(...ColorHexToRGB(this.secondaryColor), 1);
        context.stroke(inside);
        if (tail != null) {
            context.stroke(tail);
        }

        context.fillStyle = Color(...ColorHexToRGB(this.primaryColor), 1);
        context.fill(inside);
        if (tail != null) {
            context.fill(tail);
        }

        context.restore();
    }

    // Legacy
    newPathForSize(width, height, cornerRadius = 24) {
        return this.newShellForSize(width, height);
    }

}
