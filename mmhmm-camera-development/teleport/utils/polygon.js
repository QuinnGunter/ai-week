//
//  polygon.js
//  mmhmm
//
//  Created by Steve White on 10/1/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class Polygon {
    constructor(center, points, scale=SizeMake(1.0, 1.0), rotation=0) {
        this.points = points;
        this.center = center;
        this.scale = scale;
        this.rotation = rotation;
    }
    copy() {
        return new this.constructor(this.center, this.points, this.scale, this.rotation);
    }
    equals(other) {
        if (PointEquals(this.center, other.center) == false) {
            return false;
        }
        if (SizeEquals(this.scale, other.scale) == false) {
            return false;
        }
        if (this.rotation != other.rotation) {
            return false;
        }
        return EqualObjects(this.points, other.points);
    }
    /** @type {Point} */
    set center(center) {
        var previous = this.center;
        if (previous != null && PointEquals(previous, center) == true) {
            return;
        }
        this._center = center;
        this._polygon = null;
    }
    get center() {
        return this._center;
    }
    /** @type {Size} */
    set scale(scale) {
        if (scale == this._scale) {
            return;
        }
        this._scale = clamp(scale, 0, 1);
        this._polygon = null;
    }
    get scale() {
        return this._scale;
    }
    /** @type {number} */
    set rotation(rotation) {
        if (rotation == this._rotation) {
            return;
        }
        this._rotation = clamp(rotation, 0, 360);
        this._polygon = null;

        var angle = degreesToRadians(this._rotation);
        this.cos = Math.cos(angle);
        this.sin = Math.sin(angle);
    }
    get rotation() {
        return this._rotation;
    }
    /** @type {Rect} */
    get boundingBox() {
        let minx,miny,maxx,maxy;
        this.points.forEach(point => {
            const x = point.x;
            const y = point.y;
            if (minx == null || x < minx) minx = x;
            if (miny == null || y < miny) miny = y;
            if (maxx == null || x > maxx) maxx = x;
            if (maxy == null || y > maxy) maxy = y;
        })
        return RectMake(minx, miny, maxx-minx, maxy-miny);
    }
    /** @type {[Point]} */
    get polygon() {
        var polygon = this._polygon;
        if (polygon != null) {
            return polygon;
        }

        var points = this.points;
        if (this.rotation == 0) {
            return points;
        }

        var cos = this.cos;
        var sin = this.sin;
        var cx = this.center.x;
        var cy = this.center.y;
        var scale = this.scale;

        this._polygon = points.map(point => {
            var px = cx - (point.x * scale.x);
            var py = cy - (point.y * scale.y);
            var temp = ((px - cx) * cos - (py - cy) * sin) + cx;
            py = ((px - cx) * sin + (py - cy) * cos) + cy;
            px = temp;
            return PointMake(px, py);
        })
        return this._polygon;
    }
    containsPoint(point) {
        var poly = this.polygon;

        var npol = poly.length;
        var x = point.x;
        var y = point.y;
        var c = false;
        for (var i = 0, j = npol - 1; i < npol; j = i++) {
            if ((((poly[i].y <= y) && (y < poly[j].y)) ||
                    ((poly[j].y <= y) && (y < poly[i].y))) &&
                (x < (poly[j].x - poly[i].x) * (y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x))
                c = !c;
        }
        return c;
    }
    intersects(otherPolygon) {
        var poly = otherPolygon.polygon;
        var hit = poly.find(point => this.containsPoint(point));
        return (hit != null);
    }
    toPath2D() {
        const path = new Path2D();
        this.points.forEach((point, idx) => {
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
    toJSON() {
        return {
            points: Array.from(this.points),
            center: PointCopy(this.center),
            scale: SizeCopy(this.scale),
            rotation: this.rotation
        };
    }
}

Polygon.FromJSON = function({points, center, scale, rotation}) {
    const polygon = new Polygon(center, points, scale, rotation);
    return polygon;
}

Polygon.NewNGon = function(numberOfSides, center, radius) {
    const angle = degreesToRadians(360/numberOfSides);
    const points = [];
    for (let n = 0; n < numberOfSides; n+=1) {
        const current = degreesToRadians(270) + (angle * n);
        const point = PointMake(
            center.x + (Math.cos(current) * radius),
            center.y + (Math.sin(current) * radius),
        );
        points.push(point);
    }
    return new Polygon(center, points);
}

Polygon.RadiusForNGonOfHeight = function(numberOfSides, height) {
    if (numberOfSides % 2 == 0) {
        return height / 2;
    }

    var rads = Math.PI / numberOfSides;
    var M = Math.sin(rads);
    var s = Math.tan(rads);

    var r = 2 * height / (1 / s + 1 / M);
    return (0.5 * r) / M;
}
