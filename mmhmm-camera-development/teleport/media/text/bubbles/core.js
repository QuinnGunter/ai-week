//
//  media/text/bubbles/core.js
//  mmhmm
//
//  Created by Steve White on 10/25/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.BubbleCore = class extends Media.Text.Style {
    constructor(family, variant, theme, attrs={}) {
        attrs.sizes = {
            [Media.Text.Size.Small]: 32,
            [Media.Text.Size.Medium]: 48,
            [Media.Text.Size.Large]: 68,
            [Media.Text.Size.ExtraLarge]: 96,
            [Media.Text.Size.Enormous]: 260,
        };
        super(family, variant, theme, attrs);

        this.backgroundInset = 0;
        // So we can generate previews in the format bar
        this.backgroundIsDynamic = true;
    }
    get supportsCornerRadius() {
        return false;
    }
    encodeToRecord(record) {
        super.encodeToRecord(record);

        if ('angle' in this) {
            record.angle = this.angle;
        }
    }
    decodeFromRecord(record) {
        super.decodeFromRecord(record);

        if ('angle' in this) {
            this.angle = record.angle ?? 135;
        }
    }
    populateFamilyContainer(container) {
        container.style.setProperty("font-family", "");
    }
    populatePreviewContainer(container) {
        // Intentionally blank, subclass hook
    }
    newTailForSize(width, height, angle) {
        // Intentionally blank, subclass responsibility
        return null;
    }
    newShellForSize(width, height) {
        // Intentionally blank, subclass responsibility
        return null;
    }
    newTailTransformForHitTest(width, height, angle) {
        return this.newTailTransformForSize(width, height, angle);
    }
    newTailTransformForSize(width, height, angle) {
        return null;
    }
    newTailFrameForSize(width, height, angle) {
        return this.tailFrame;
    }
    drawHitTestMaskInContext(context, width, height) {
        const backgroundInset = this.backgroundInset ?? 0;

        const doubleInset = backgroundInset * 2;
        const insetWidth = width - doubleInset;
        const insetHeight = height - doubleInset;
        if (insetWidth <= 0 || insetHeight <= 0) {
            return;
        }
        const shadowSize = this.shadowSize;

        context.save();
        context.translate(backgroundInset, backgroundInset);
        if (shadowSize != null) {
            context.shadowOffsetX = shadowSize.width;
            context.shadowOffsetY = shadowSize.height;
        }

        const shell = this.newShellForSize(insetWidth, insetHeight);
        const shellColor = Color(0, 0, 0, 1);
        const lineWidth = this.lineWidth ?? 0;

        context.fillStyle = shellColor;
        context.strokeStyle = shellColor;
        context.shadowColor = shellColor;
        context.lineWidth = lineWidth;
        context.fill(shell);
        if (lineWidth > 0) {
            context.stroke(shell);
        }

        var angle = this.angle;
        const tail = this.newTailForSize(insetWidth, insetHeight, angle);
        if (tail != null) {
            const transform = this.newTailTransformForHitTest(insetWidth, insetHeight, angle);
            if (transform != null) {
                context.transform(transform.a, transform.b, transform.c, transform.d, transform.tx, transform.ty);
            }

            var tailFrame = this.newTailFrameForSize(insetWidth, insetHeight, angle);
            if (lineWidth > 0) {
                // We enlarge the rect to cover the stroke width
                // rather than stroking it, since we're using
                // an alpha color here.
                tailFrame = RectInset(tailFrame, InsetsMake(-lineWidth, -lineWidth, -lineWidth, -lineWidth));
            }

            const tailColor = Color(0, 0, 0, 0.5);
            context.fillStyle = tailColor;
            context.fillRect(tailFrame.x, tailFrame.y, tailFrame.width, tailFrame.height);
        }

        context.restore();
    }
    // These came from https://stackoverflow.com/a/20510150
    equalPointsOnEllipse(radiusX, radiusY, numPoints) {
        var theta = 0.0;
        var twoPi = Math.PI*2.0;
        var deltaTheta = 0.0001;
        var numIntegrals = Math.round(twoPi/deltaTheta);
        var circ=0.0;
        var dpt=0.0;
        var computeDpt = function( r1, r2, theta ) {
            var dp=0.0;

            var dpt_sin = Math.pow(r1*Math.sin(theta), 2.0);
            var dpt_cos = Math.pow( r2*Math.cos(theta), 2.0);
            dp = Math.sqrt(dpt_sin + dpt_cos);

            return dp;
        }

        /* integrate over the elipse to get the circumference */
        for (let i = 0; i < numIntegrals; i++) {
            theta += i*deltaTheta;
            dpt = computeDpt(radiusX, radiusY, theta);
            circ += dpt;
        }

        var nextPoint = 0;
        var run = 0.0;
        var points = [];
        theta = 0.0;

        for (let i = 0; i < numIntegrals; i++) {
            theta += deltaTheta;
            var subIntegral = numPoints*run/circ;
            if (Math.floor(subIntegral) >= nextPoint) {
                var x = radiusX * Math.cos(theta);
                var y = radiusY * Math.sin(theta);
                points.push({x, y});
                nextPoint++;
            }
            run += computeDpt(radiusX, radiusY, theta);
        }
        if (points.length > numPoints) {
            points.splice(numPoints, points.length - numPoints);
        }
        return points;
	}
}
