//
//  media/text/bubbles/classic/angry.js
//  mmhmm
//
//  Created by Steve White on 10/9/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Classic.Angry = class extends Media.Text.Style.Classic {
    constructor() {
        super(LocalizedString("Yell"), LocalizedString("Classic"), "classic-angry");

        this.primaryColor = "#FF4469";      // Background
        this.secondaryColor = "#d93a5a";    // Border
        this.shape = AdvancedTextLayer.Shape.Ellipse;

        var inset = 65;
        var doubled = inset * 2;
        this.contentInsets = InsetsMake(doubled, doubled, doubled, doubled);

        this.cuts = {
            count: 24,
            size: inset,
            fluctuations: null,
        };
        this.seed = Math.floor(Math.random() * 0x7FFFFFFF);
    }
    get defaultContentSize() {
        return SizeMake(680, 560);
    }
    clone() {
        var r = super.clone();
        r.cuts = Object.assign({}, this.cuts);
        r.seed = Math.floor(Math.random() * 0x7FFFFFFF);
        return r;
    }
    encodeToRecord(record) {
        super.encodeToRecord(record);

        record.seed = this.seed;
    }
    decodeFromRecord(record) {
        super.decodeFromRecord(record);

        var seed = record.seed;
        if (seed != null) {
            this.seed = seed;
        }
    }
    set seed(value) {
        if (value == this._seed) {
            return;
        }
        this._seed = value;
        this.cuts.fluctuations = this.makeFluctuations();
    }
    get seed() {
        return this._seed;
    }
    makeFluctuations(max=51) {
        var rng = new PRNG(this.seed);

        var fluctuations = [];
        var numCuts = this.cuts.count;
        for (var i=0; i<numCuts; i++) {
            fluctuations.push(rng.randomI(0, max));
        }
        return fluctuations;
    }
    drawPreviewInContext(context, width, height) {
        var cuts = {
            count: 24,
            size: 8,
            fluctuations: this.makeFluctuations(8),
        };

        var shell = this.newShellForSize(width, height, cuts);

        context.fillStyle = "white";
        context.strokeStyle = "black";
        context.fill(shell);
        context.stroke(shell);
    }
    newShellForSize(width, height, cuts) {
        if (cuts == null) {
            cuts = this.cuts;
        }

        var center = PointMake(
            width / 2,
            height / 2
        );
        var outerR = SizeMake(
            width / 2,
            height / 2,
        );

        var cutSize = cuts.size;
        var innerR = SizeMake(
            outerR.width - (cutSize * 2),
            outerR.height - (cutSize * 2),
        );

		var points = this.equalPointsOnEllipse(outerR.width, outerR.height, cuts.count);
        var numPoints = points.length;

        var fluctuations = cuts.fluctuations;
        var rnd1 = -fluctuations[0];
        var path = new Path2D();

        for (var idx=1; idx<=numPoints; idx+=2) {
            var last = points[idx-1];

            var nidx = idx;
            if (nidx >= numPoints) {
                nidx = nidx - numPoints;
            }
            var control = points[nidx];
            var rnd2 = fluctuations[nidx] - cutSize;

            nidx += 1;
            if (nidx >= numPoints) {
                nidx = nidx - points.length;
            }

            var next = points[nidx];
            var rnd3 = -fluctuations[nidx];

            var a1 = Math.atan2(last.y, last.x);
            var p1 = PointMake(
                center.x + ((outerR.width + rnd1) * Math.sin(a1)),
                center.y + ((outerR.height + rnd1) * Math.cos(a1))
            );
            if (idx == 1) {
                path.moveTo(p1.x, p1.y);
            }
            var a2 = Math.atan2(control.y, control.x);
            var p2 = PointMake(
                center.x + ((innerR.width + rnd2) * Math.sin(a2)),
                center.y + ((innerR.height + rnd2) * Math.cos(a2))
            );
            var a3 = Math.atan2(next.y, next.x);
            var p3 = PointMake(
                center.x + ((outerR.width + rnd3) * Math.sin(a3)),
                center.y + ((outerR.height + rnd3) * Math.cos(a3))
            );

            path.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);

            rnd1 = rnd3;
        }
        path.closePath();
        return path;
    }
}
