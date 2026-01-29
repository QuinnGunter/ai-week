//
//  media/text/bubbles/funky/thought.js
//  mmhmm
//
//  Created by Steve White on 10/9/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Funky.Thought = class extends Media.Text.Style.Funky {
    constructor() {
        super(LocalizedString("Thought"), LocalizedString("Funky"), "funky-thought");

        this.frame = new PathHelper(640, 360, "M322.73 0C375.307 0 417.929 24.6104 417.929 54.9701C417.93 37.7067 460.551 23.7126 513.129 23.7126C565.706 23.7126 608.328 37.7067 608.328 54.9701C622.2 54.9701 633.447 67.6379 633.447 83.2635C633.447 98.8891 622.2 111.557 608.328 111.557C616.773 111.557 623.618 124.225 623.618 139.85C623.618 155.476 616.773 168.144 608.328 168.144C625.82 168.144 640 193.478 640 224.731C640 255.983 625.82 281.317 608.328 281.317C615.565 281.317 621.433 288.073 621.433 296.407C621.433 304.742 615.565 311.497 608.328 311.497C608.328 322.807 579.967 331.976 544.983 331.976C509.999 331.976 481.638 322.807 481.638 311.497C481.638 338.284 453.278 360 418.294 360C383.31 360 354.949 338.284 354.949 311.497C354.949 322.807 340.769 331.976 323.276 331.976C305.784 331.976 291.604 322.807 291.604 311.497C291.604 330.546 277.424 345.988 259.932 345.988C242.439 345.988 228.259 330.546 228.259 311.497C228.259 338.284 199.899 360 164.915 360C129.931 360 101.57 338.284 101.57 311.497C101.57 322.807 87.1448 331.976 69.3515 331.976C51.5582 331.976 37.1331 322.807 37.1331 311.497C19.6406 311.497 5.46075 299.613 5.46075 284.955C5.46075 270.297 19.6406 258.413 37.1331 258.413C25.673 258.413 16.3823 246.53 16.3823 231.871C16.3823 217.213 25.673 205.329 37.1331 205.329C16.6254 205.329 0 181.563 0 152.245C0 122.928 16.6254 99.1617 37.1331 99.1617C29.2918 99.1617 22.9352 89.2695 22.9352 77.0659C22.9352 64.8622 29.2918 54.9701 37.1331 54.9701C37.1331 41.8738 58.4439 31.2575 84.7323 31.2575C111.021 31.2575 132.333 41.8738 132.333 54.9701C132.333 31.1585 153.643 11.8563 179.932 11.8563C206.149 11.8563 227.417 31.0522 227.532 54.7743C227.714 24.5041 270.266 0 322.73 0Z");
        this.guide = new PathHelper(688, 408, "M147.086 38.0516C160.568 21.7509 181.734 11.8563 203.932 11.8563C222.036 11.8563 239.452 18.4351 252.574 29.704C257.278 25.7188 262.36 22.2241 267.554 19.2348C289.023 6.87874 317.059 0 346.73 0C376.463 0 404.558 6.90794 426.047 19.3162C434.818 24.3808 443.265 30.8929 450.11 38.776C454.065 36.9845 458.181 35.4261 462.326 34.0652C482.564 27.4202 509.009 23.7126 537.129 23.7126C568.105 23.7126 597.299 28.215 618.368 36.3586C628.688 40.3476 640.885 46.9424 651.567 55.1766C661.63 62.9337 673.669 74.671 678.69 89.941C680.491 95.4171 681.447 101.258 681.447 107.263C681.447 120.078 676.78 132.906 668.513 142.65C670.61 149.401 671.618 156.657 671.618 163.85C671.618 171.426 670.5 179.072 668.169 186.124C671.142 189.647 673.639 193.374 675.666 196.996C683.753 211.443 688 229.783 688 248.731C688 267.679 683.753 286.018 675.666 300.465C673.674 304.025 671.227 307.687 668.321 311.157C669.057 314.237 669.433 317.357 669.433 320.407C669.433 337.384 658.079 349.632 651.017 355.825C642.914 362.931 633.043 368.565 624.515 371.663C609.523 377.11 589.658 379.976 568.983 379.976C549.879 379.976 531.609 377.53 517.236 372.951C512.853 379.019 507.538 384.36 501.676 388.849C485.669 401.106 464.594 408 442.294 408C419.993 408 398.918 401.106 382.911 388.849C378.15 385.203 373.75 380.995 369.916 376.292C362.761 378.749 355.035 379.976 347.276 379.976C339.301 379.976 331.36 378.679 324.038 376.083C314.197 386.934 300.266 393.988 283.932 393.988C272.371 393.988 262.014 390.454 253.459 384.542C251.796 386.053 250.071 387.49 248.297 388.849C232.29 401.106 211.215 408 188.915 408C166.614 408 145.54 401.106 129.533 388.849C124.745 385.183 120.322 380.948 116.474 376.214C109.175 378.724 101.279 379.976 93.3515 379.976C88.3371 379.976 83.424 379.478 78.718 378.52C66.1923 375.968 53.3094 369.804 42.52 362.707C31.7643 355.632 20.8586 346.164 13.5827 335.325C8.56053 327.844 5.46075 318.805 5.46075 308.955C5.46075 294.923 11.1535 283.412 19.8057 274.94C17.5224 268.587 16.3823 261.984 16.3823 255.871C16.3823 248.994 17.8254 241.496 20.7159 234.433C18.7122 232.231 16.8742 229.917 15.2102 227.538C5.34156 213.431 0 195.221 0 176.246C0 157.27 5.34156 139.06 15.2102 124.953C17.8624 121.161 20.9565 117.536 24.4594 114.263C23.4349 109.942 22.9352 105.487 22.9352 101.066C22.9352 84.7306 31.8214 70.3628 39.8782 60.9512C48.2894 51.1255 59.899 41.8794 72.2193 37.3507C83.0923 33.3539 95.703 31.2575 108.732 31.2575C122.32 31.2575 135.669 33.5437 147.086 38.0516Z");

        this.guideDistance = 60;
        var tail = new PathHelper(124, 56, "M5.2 5.2C13.44 -3.03 29.65 -0.17 41.41 11.59C53.17 23.35 56.03 39.56 47.8 47.8C39.56 56.03 23.35 53.17 11.59 41.41C-0.17 29.65 -3.03 13.44 5.2 5.2ZM61.86 16.86C67.46 11.26 78.11 12.82 85.64 20.36C93.18 27.89 94.74 38.54 89.14 44.14C83.54 49.74 72.89 48.18 65.36 40.64C57.82 33.11 56.26 22.46 61.86 16.86ZM119.9 36.1C114.54 30.75 106.67 29.95 102.31 34.31C97.95 38.67 98.75 46.54 104.11 51.9C109.46 57.25 117.33 58.05 121.69 53.69C126.05 49.33 125.25 41.46 119.9 36.1ZM119.9 36.1");
        this.tail = tail;

        var maxScale = this._scaleForSize(1920, 1080);
        var tailFrame = RectMake(0, 0, Math.ceil(tail.width * maxScale), Math.ceil(tail.height * maxScale));
        this.tailFrame = tailFrame;

        this.primaryColor = Color(1,1,1,1);
        this.secondaryColor = Color(0.85,0.85,0.85,1.0);
        this.contentInsets = InsetsMake(0.1666, 0.09, 0.1666, 0.05);
        this.backgroundInset = Math.max(tailFrame.width, tailFrame.height) + this.guideDistance + this.shadowSize;
        this.insetsAreProportional = true;
        this.angle = 135;
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
    _scaleForSize(width, height) {
        var base = 540;
        var scaleX = width / base;
        var scaleY = height / base;
        return (scaleX + scaleY) / 2;
    }
    _fillOffsetsForSize(width, height) {
        var scale = this._scaleForSize(width, height);
        var min = (6 * scale);
        var med = (12 * scale);
        var max = (18 * scale);

        return {
            min: SizeMake(min, min),
            med: SizeMake(med, med),
            max: SizeMake(max, max),
        }
    }
    newShellForSize(width, height) {
        return this.frame.toPath2D(width, height);
    }
    newTailTransformForSize(width, height, angle) {
        var data = this._tailDataForSize(width, height, angle);
        return data?.transform;
    }
    newTailFrameForSize(width, height, angle) {
        var scale = this._scaleForSize(width, height);
        var shadowSize = this.shadowSize;
        var tail = this.tail;

        var r = RectMake(
            0, 0,
            (tail.width + shadowSize) * scale,
            (tail.height + shadowSize) * scale
        );
        return r;
    }
    newTailForSize(width, height, angle) {
        var data = this._tailDataForSize(width, height, angle);
        return data?.path;
    }
    _tailDataForSize(width, height, angle) {
        var scale = this._scaleForSize(width, height);
        var tail = this.tail;

        var scaledTail = SizeMake(
            tail.width * scale,
            tail.height * scale
        );

        var result = {
            path: tail.toPath2D(scaledTail.width, scaledTail.height),
            transform: AffineTransformIdentity()
        };

        var guideDistance = this.guideDistance * scale;

        var rads = degreesToRadians(angle);
        var lineStart = PointMake(
            Math.ceil(width / 2),
            Math.ceil(height / 2)
        );

        var lLength = Math.max(width, height) + (guideDistance * 2);

        var lineEnd = PointMake(
            Math.ceil(lineStart.x + (lLength * Math.cos(rads))),
            Math.ceil(lineStart.y + (lLength * Math.sin(rads)))
        );

        var line = KldIntersections.ShapeInfo.line(
            [lineStart.x, lineStart.y],
            [lineEnd.x, lineEnd.y],
        );

        var guide = this.guide.toD(width, height, true);

        var shape = KldIntersections.ShapeInfo.path(guide);

        const intersections = KldIntersections.Intersection.intersect(shape, line);
        var points = intersections.points;
        if (points.length == 0) {
            if (gLocalDeployment == true) {
                console.error("Tail bubble intersection fail", angle, rads, shape, line);
                debugger;
            }
            return result;
        }

        var center = points[points.length - 1];
        var tailFrame = this.tailFrame;

        var transform = AffineTransformMakeTranslation(center.x, center.y);
        transform = AffineTransformRotate(transform, rads);
        transform = AffineTransformTranslate(
            transform,
            guideDistance,
            -scaledTail.height / 2
        );
        result.transform = transform;
        return result;
     }
}
