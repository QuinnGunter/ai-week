/**
 * @typedef {Object} Size
 * @property {number} width
 * @property {number} height
 */

/**
 * @param {number} width The size's width
 * @param {number} height The size's height
 * @return {Size}
 */
function SizeMake(width, height) {
    return { width: width, height: height };
}

/**
 * @return {Size}
 */
function SizeZero() {
    return SizeMake(0, 0);
}

/**
 * @param {Size} size The size to copy
 * @return {Size}
 */
function SizeCopy(size) {
    if (size == null) {
        return SizeZero();
    }
    return Object.assign({}, size);
}

/**
 * @param {Size} a Left side of comparison
 * @param {Size} b Right side of comparison
 * @return {bool}
 */
function SizeEquals(a, b) {
    if (a == b) return true;
    if (a == null || b == null) return false;

    if (a.width != b.width &&
        (isNaN(a.width) == false ||
         isNaN(b.width) == false))
    {
        return false;
    }

    if (a.height != b.height &&
        (isNaN(a.height) == false ||
         isNaN(b.height) == false))
    {
        return false;
    }
    return true;
}

/**
 * @param {Size} a The initial size
 * @param {Size} b The final size
 * @param {number} t The lerp value (0.0<->1.0)
 * @return {Size}
 */
function SizeLerp(a, b, t) {
    var width = lerp(a.width, b.width, t);
    var height = lerp(a.height, b.height, t);
    return SizeMake(width, height);
}

/**
 * @typedef {Object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @param {number} x The Point's x coordinate
 * @param {number} y The Point's y coordinate
 * @return {Point}
 */
function PointMake(x, y) {
    return { x: x, y: y }
}

/**
 * @param {Point} p The point to copy
 * @return {Point}
 */
function PointCopy(p) {
    return PointMake(
        p?.x ?? 0,
        p?.y ?? 0
    )
}

/**
 * @return {Point}
 */
function PointZero() {
    return PointMake(0, 0);
}

/**
 * @param {Point} a Left side of comparison
 * @param {Point} b Right side of comparison
 * @return {bool}
 */
function PointEquals(a, b) {
    if (a == b) return true;
    if (a == null || b == null) return false;

    if (a.x != b.x &&
        (isNaN(a.x) == false ||
         isNaN(b.x) == false))
    {
        return false;
    }

    if (a.y != b.y &&
        (isNaN(a.y) == false ||
         isNaN(b.y) == false))
    {
        return false;
    }
    return true;
}

/**
 * @param {Point} a The initial point
 * @param {Point} b The final point
 * @param {number} t The lerp value (0.0<->1.0)
 * @return {Point}
 */
function PointLerp(a, b, t) {
    var x = lerp(a.x, b.x, t);
    var y = lerp(a.y, b.y, t);
    return PointMake(x, y);
}

/**
 * @param {Point} a The a value
 * @param {Point} b The b value
 * @return {number} The angle between the two points
 */
function PointAngle(a, b) {
    var theta1 = Math.atan2(a.y, a.x);
    var theta2 = Math.atan2(b.y, b.x);
    var dtheta = theta2 - theta1;
    while (dtheta > Math.PI)
        dtheta -= Math.PI * 2;
    while (dtheta < -Math.PI)
        dtheta += Math.PI * 2;

    return dtheta;
}

/**
 * @param {Point} a The a value
 * @param {Point} b The b value
 * @return {number}
 */
function PointDistance(a, b) {
    var deltaX = a.x - b.x;
    var deltaY = a.y - b.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

/**
 * @typedef {Object} Insets
 * @property {number} top
 * @property {number} left
 * @property {number} bottom
 * @property {number} right
 */

/**
 * @param {number} top The top value
 * @param {number} left The left value
 * @param {number} bottom The bottom value
 * @param {number} right The right value
 * @return {Insets}
 */
function InsetsMake(top, left, bottom, right) {
    return { top, left, bottom, right };
}

/**
 * @return {Insets}
 */
function InsetsZero() {
    return InsetsMake(0, 0, 0, 0);
}

/**
 * @param {Insets} source The insets to copy
 * @return {Insets}
 */
function InsetsCopy(source) {
    return InsetsMake(
        source?.top ?? 0,
        source?.left ?? 0,
        source?.bottom ?? 0,
        source?.right ?? 0
    );
}

/**
 * @param {Insets} a Left side of comparison
 * @param {Insets} b Right side of comparison
 * @return {bool}
 */
function InsetsEqual(a, b) {
    return (
        a?.top == b?.top &&
        a?.left == b?.left &&
        a?.bottom == b?.bottom &&
        a?.right == b?.right
    )
}

/**
 * @typedef {Object} Rect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @param {number} x The rectangle's x coordinate
 * @param {number} y The rectangle's y coordinate
 * @param {number} width The rectangle's width
 * @param {number} height The rectangle's height
 * @return {Rect}
 */
function RectMake(x, y, width, height) {
    return { x: x, y: y, width: width, height: height }
}

/**
 * @return {Rect}
 */
function RectZero() {
    return RectMake(0, 0, 0, 0);
}

/**
 * @param {Rect} rect The rect to copy
 * @return {Rect}
 */
function RectCopy(rect) {
    if (rect == null) {
        return RectZero();
    }
    return Object.assign({}, rect);
}

/**
 * @param {Rect} a The a value
 * @param {Rect} b The b value
 * @return {Rect}
 */
function RectUnion(a, b) {
    var minX = Math.min(RectGetMinX(a), RectGetMinX(b));
    var minY = Math.min(RectGetMinY(a), RectGetMinY(b));
    var maxX = Math.max(RectGetMaxX(a), RectGetMaxX(b));
    var maxY = Math.max(RectGetMaxY(a), RectGetMaxY(b));
    return RectMake(minX, minY, maxX - minX, maxY - minY);
}

/**
 * @param {Rect} a Left side of comparison
 * @param {Rect} b Right side of comparison
 * @return {bool}
 */
function RectEquals(a, b) {
    if (a == b) return true;
    if (a == null || b == null) return false;
    return (
        PointEquals(a, b) &&
        SizeEquals(a, b)
    );
}

/**
 * @param {Rect} a The initial value
 * @param {Rect} b The final value
 * @param {number} t The lerp value (0.0<->1.0)
 * @return {Rect}
 */
function RectLerp(a, b, t) {
    var origin = PointLerp(a, b, t);
    var size = SizeLerp(a, b, t);
    return RectMake(origin.x, origin.y, size.width, size.height);
}

/**
 * @param {Rect} rect The rectangle
 * @return {number}
 */
function RectGetWidth(rect) {
    return Math.abs(rect.width);
}

/**
 * @param {Rect} rect The rectangle
 * @return {number}
 */
function RectGetMinX(rect) {
    if (rect.width < 0) {
        return rect.x + rect.width;
    }
    return rect.x;
}

/**
 * @param {Rect} rect The rectangle
 * @return {number}
 */
function RectGetMidX(rect) {
    return RectGetMinX(rect) + (RectGetWidth(rect) / 2.0);
}

/**
 * @param {Rect} rect The rectangle
 * @return {number}
 */
function RectGetMaxX(rect) {
    if (rect.width < 0) {
        return rect.x;
    }
    return rect.x + rect.width;
}

/**
 * @param {Rect} rect The rectangle
 * @return {number}
 */
function RectGetHeight(rect) {
    return Math.abs(rect.height);
}

/**
 * @param {Rect} rect The rectangle
 * @return {number}
 */
function RectGetMinY(rect) {
    if (rect.height < 0) {
        return rect.y + rect.height;
    }
    return rect.y;
}

/**
 * @param {Rect} rect The rectangle
 * @return {number}
 */
function RectGetMidY(rect) {
    return RectGetMinY(rect) + (RectGetHeight(rect) / 2.0);
}

/**
 * @param {Rect} rect The rectangle
 * @return {number}
 */
function RectGetMaxY(rect) {
    if (rect.height < 0) {
        return rect.y;
    }
    return rect.y + rect.height;
}

/**
 * @param {Rect} rect The rectangle
 * @param {Point} point The point
 * @return {bool}
 */
function RectContainsPoint(rect, point) {
    if (point.x < RectGetMinX(rect)) {
        return false;
    }
    if (point.y < RectGetMinY(rect)) {
        return false;
    }
    if (point.x > RectGetMaxX(rect)) {
        return false;
    }
    if (point.y > RectGetMaxY(rect)) {
        return false;
    }
    return true;
}

/**
 * @param {Rect} a The a value
 * @param {Rect} b The b value
 * @return {Rect}
 */
function RectContainsRect(rect, other) {
    if (other.x < rect.x) {
        return false;
    }
    if (other.y < rect.y) {
        return false;
    }
    if (RectGetMaxX(other) > RectGetMaxX(rect)) {
        return false;
    }
    if (RectGetMaxY(other) > RectGetMaxY(rect)) {
        return false;
    }
    return true;
}

function RectIntersection(a, b) {
    if (RectGetMaxX(a) <= RectGetMinX(b) ||
        RectGetMinX(a) >= RectGetMaxX(b) ||
        RectGetMaxY(a) <= RectGetMinY(b) ||
        RectGetMinY(a) >= RectGetMaxY(b))
    {
        return RectZero();
    }

    var x = Math.max(RectGetMinX(a), RectGetMinX(b));
    var y = Math.max(RectGetMinY(a), RectGetMinY(b));
    var w = Math.min(RectGetMaxX(a), RectGetMaxX(b)) - x;
    var h = Math.min(RectGetMaxY(a), RectGetMaxY(b)) - y;
    return RectMake(x, y, w, h);
}

function RectInset(rect, insets) {
    const left = insets?.left ?? 0;
    const right = insets?.right ?? 0;
    const top = insets?.top ?? 0;
    const bottom = insets?.bottom ?? 0;

    return RectMake(
        RectGetMinX(rect) + left,
        RectGetMinY(rect) + top,
        RectGetWidth(rect) - (left + right),
        RectGetHeight(rect) - (top + bottom),
    )
}

function RectIntegral(rect) {
    var left = RectGetMinX(rect);
    var top = RectGetMinY(rect);
    var right = RectGetMaxX(rect);
    var bottom = RectGetMaxY(rect);
    return RectMake(
        Math.floor(left),
        Math.floor(top),
        Math.ceil(right - left),
        Math.ceil(bottom - top)
    );
}

function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180.0;
}

function radiansToDegrees(radians) {
    return (radians * 180) / Math.PI;
}

function NewRoundRectPathForRectWithRadius(rect, radius) {
    // NOTE: At this point you may want to verify that your radius is no more than half
    // the width and height of your rectangle, as this technique degenerates for those cases.

    // In order to draw a rounded rectangle, we will take advantage of the fact that
    // CGContextAddArcToPoint will draw straight lines past the start and end of the arc
    // in order to create the path from the current position and the destination position.

    // In order to create the 4 arcs correctly, we need to know the min, mid and max positions
    // on the x and y lengths of the given rectangle.
    var minx = RectGetMinX(rect);
    var midx = RectGetMidX(rect);
    var maxx = RectGetMaxX(rect);
    var miny = RectGetMinY(rect);
    var midy = RectGetMidY(rect);
    var maxy = RectGetMaxY(rect);

    // Next, we will go around the rectangle in the order given by the figure below.
    //       minx    midx    maxx
    // miny    2       3       4
    // midy   1 9              5
    // maxy    8       7       6
    // Which gives us a coincident start and end point, which is incidental to this technique, but still doesn't
    // form a closed path, so we still need to close the path to connect the ends correctly.
    // Thus we start by moving to point 1, then adding arcs through each pair of points that follows.
    // You could use a similar tecgnique to create any shape with rounded corners.

    var path = new Path2D();
    var svg = [];
    // Start at 1
    path.moveTo(minx, midy);
    svg.push(`M ${minx},${miny}`);

    // Add an arc through 2 to 3
    path.arcTo(minx, miny, midx, miny, radius);
    svg.push(`L${minx},${miny+radius}`);
    svg.push(`a${radius},${radius} 0 0 1 ${radius},${-radius}`);

    // Add an arc through 4 to 5
    path.arcTo(maxx, miny, maxx, midy, radius);
    svg.push(`L${maxx-radius},${miny}`);
    svg.push(`a${radius},${radius} 0 0 1 ${radius},${radius}`);

    // Add an arc through 6 to 7
    path.arcTo(maxx, maxy, midx, maxy, radius);
    svg.push(`L${maxx},${maxy-radius}`);
    svg.push(`a${radius},${radius} 0 0 1 ${-radius},${radius}`);

    // Add an arc through 8 to 9
    path.arcTo(minx, maxy, minx, midy, radius);
    svg.push(`L${minx+radius},${maxy}`);
    svg.push(`a${radius},${radius} 0 0 1 ${-radius},${-radius}`);

    path.closePath();
    svg.push('Z');

    path.d = svg.join(" ");
    return path;
}
