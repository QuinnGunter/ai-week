//
//  affine.js
//
//  Created by Steve White on 5/9/14.
//  Copyright © 2014 Steve White. All rights reserved.
//

function AffineTransformIdentity() {
    return {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        tx: 0,
        ty: 0
    };
}

function AffineTransformMakeRotation(radians) {
    return {
        a: Math.cos(radians),
        b: Math.sin(radians),
        c: -Math.sin(radians),
        d: Math.cos(radians),
        tx: 0,
        ty: 0
    };
}

function AffineTransformMakeScale(sx, sy) {
    return {
        a: sx,
        b: 0,
        c: 0,
        d: sy,
        tx: 0,
        ty: 0
    };
}

function AffineTransformMakeTranslation(tx, ty) {
    return {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        tx: tx,
        ty: ty
    };
}

function AffineTransformConcat(t2, t1) {
    var a = t2.a * t1.a + t2.b * t1.c;
    var b = t2.a * t1.b + t2.b * t1.d;
    var c = t2.c * t1.a + t2.d * t1.c;
    var d = t2.c * t1.b + t2.d * t1.d;
    var tx = t2.tx * t1.a + t2.ty * t1.c + t1.tx;
    var ty = t2.tx * t1.b + t2.ty * t1.d + t1.ty;

    return { a: a, b: b, c: c, d: d, tx: tx, ty: ty };
}

function AffineTransformRotate(t, radians) {
    return AffineTransformConcat(AffineTransformMakeRotation(radians), t);
}

function AffineTransformScale(t, sx, sy) {
    return AffineTransformConcat(AffineTransformMakeScale(sx, sy), t);
}

function AffineTransformTranslate(t, tx, ty) {
    return AffineTransformConcat(AffineTransformMakeTranslation(tx, ty), t);
}

function AffineTransformToCSS(t) {
    return "matrix(" + t.a + ", " + t.b + ", " + t.c + ", " + t.d + ", " + t.tx + ", " + t.ty + ")";
}

function AffineTransformToDOMMatrix(t) {
	return new DOMMatrix([t.a, t.b, t.c, t.d, t.tx, t.ty]);
}

function AffineTransformProjectPoint(t, p) {
	return {
		x: t.a * p.x + t.c * p.y + t.tx,
		y: t.b * p.x + t.d * p.y + t.ty
	};
}
