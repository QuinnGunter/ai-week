//
//  media/text/bubbles/simple/angry.js
//  mmhmm
//
//  Created by Steve White on 10/13/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Simple.Angry = class extends Media.Text.Style.Simple {
    constructor() {
        super(LocalizedString("Yell"), LocalizedString("Simple"), "simple-angry");

        this.fillStyle = "#F9DF74";
        this.textAttributes.color = "#0A0A0E";
        this.contentInsets = InsetsMake(60, 60, 60, 60);
        this.backgroundInset = 24;
    }
    drawPreviewInContext(context, width, height) {
        var shell = this.newShellForSize(width, height, 8, 24);
        this.drawPathInContext(shell, context, SizeMake(8, 8), width, height);
    }
    newShellForSize(width, height, fringe=40, numCuts=56) {
        const center = PointMake(
            width/2,
            height/2,
        );
        const inner = SizeMake(
            (width - (fringe * 2)) / 2,
            (height - (fringe * 2)) / 2,
        );
        const outer = SizeMake(
            width / 2,
            height / 2,
        );

        const path = new Path2D();
        const points = this.equalPointsOnEllipse(outer.width, outer.height, numCuts);
        const halfPi = Math.PI/2;

        points.forEach((point, idx) => {
            var radius = (idx % 2) ? outer : inner;
            var angle = Math.atan2(point.y, point.x) + halfPi;

            var lineX = center.x + (radius.width * Math.cos(angle));
            var lineY = center.y + (radius.height * Math.sin(angle));

            if (idx == 0) {
                path.moveTo(lineX, lineY);
            }
            else {
                path.lineTo(lineX, lineY);
            }
        });
        path.closePath();
        return path;
    }
}
