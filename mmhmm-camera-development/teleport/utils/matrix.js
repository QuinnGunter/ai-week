//
//  matrix.js
//
//  Created by Steve White on 5/9/14.
//  Copyright © 2014 Steve White. All rights reserved.
//

/**
 * @typedef {(number[]|Float32Array)} Transform3D
 */

/**
 * The identity transform: [1 0 0 0; 0 1 0 0; 0 0 1 0; 0 0 0 1].
 * @return {Transform3D}
 */
function Transform3DIdentity() {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ]);
}

/**
 * @param {Transform3D} t1 Left side of comparison
 * @param {Transform3D} t2 Right side of comparison
 * @return {bool}
 */
function Transform3DEquals(t1, t2) {
    for (var i = 0; i < t1.length; i++) {
        if (t1[i] != t2[i]) {
            return false;
        }
    }
    return true;
}

/**
 * @param {Transform3D} t2 The transform to compare against the identity transform
 * @return {bool}
 */
function Transform3DIsIdentity(t2) {
    var t1 = Transform3DIdentity();
    return Transform3DEquals(t1, t2);
}

/**
 * @param {Transform3D} t The transform to copy
 * @return {Transform3D}
 */
function Transform3DCopy(t) {
    return new Float32Array(t);
}

/**
 * Concatenate 'b' to 'a' and return the result: t' = a * b.
 * @param {Transform3D} a The a value
 * @param {Transform3D} b The b value
 * @return {Transform3D}
 */
function Transform3DConcat(a, b) {
    var a00 = a[0 * 4 + 0];
    var a01 = a[0 * 4 + 1];
    var a02 = a[0 * 4 + 2];
    var a03 = a[0 * 4 + 3];
    var a10 = a[1 * 4 + 0];
    var a11 = a[1 * 4 + 1];
    var a12 = a[1 * 4 + 2];
    var a13 = a[1 * 4 + 3];
    var a20 = a[2 * 4 + 0];
    var a21 = a[2 * 4 + 1];
    var a22 = a[2 * 4 + 2];
    var a23 = a[2 * 4 + 3];
    var a30 = a[3 * 4 + 0];
    var a31 = a[3 * 4 + 1];
    var a32 = a[3 * 4 + 2];
    var a33 = a[3 * 4 + 3];
    var b00 = b[0 * 4 + 0];
    var b01 = b[0 * 4 + 1];
    var b02 = b[0 * 4 + 2];
    var b03 = b[0 * 4 + 3];
    var b10 = b[1 * 4 + 0];
    var b11 = b[1 * 4 + 1];
    var b12 = b[1 * 4 + 2];
    var b13 = b[1 * 4 + 3];
    var b20 = b[2 * 4 + 0];
    var b21 = b[2 * 4 + 1];
    var b22 = b[2 * 4 + 2];
    var b23 = b[2 * 4 + 3];
    var b30 = b[3 * 4 + 0];
    var b31 = b[3 * 4 + 1];
    var b32 = b[3 * 4 + 2];
    var b33 = b[3 * 4 + 3];
    return new Float32Array([
        a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
        a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
        a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
        a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33,
        a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
        a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
        a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
        a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33,
        a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
        a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
        a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
        a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33,
        a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,
        a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,
        a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,
        a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33
    ]);
}


/**
 * Returns a transform that translates by '(tx, ty, tz)'. t' = [1 0 0 0; 0 1 0 0; 0 0 1 0; tx ty tz 1].
 * @param {number} tx The value to translate on the x axis
 * @param {number} ty The value to translate on the y axis
 * @param {number} tz The value to translate on the z axis
 * @return {Transform3D}
 */
function Transform3DMakeTranslation(tx, ty, tz) {
    if (tx == null) tx = 0;
    if (ty == null) ty = 0;
    if (tz == null) tz = 0;
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        tx, ty, tz, 1
    ]);
}

/**
 * Translate 't' by '(tx, ty, tz)' and return the result: t' = translate(tx, ty, tz) * t.
 * @param {Transform3D} t The transform to translate
 * @param {number} tx The value to translate on the x axis
 * @param {number} ty The value to translate on the y axis
 * @param {number} tz The value to translate on the z axis
 * @return {Transform3D}
 */
function Transform3DTranslate(t, tx, ty, tz) {
    return Transform3DConcat(Transform3DMakeTranslation(tx, ty, tz), t);
}

/**
 * Returns a transform that scales by `(sx, sy, sz)': * t' = [sx 0 0 0; 0 sy 0 0; 0 0 sz 0; 0 0 0 1].
 * @param {number} sx The value to scale on the x axis
 * @param {number} sy The value to scale on the y axis
 * @param {number} sz The value to scale on the z axis
 * @return {Transform3D}
 */
function Transform3DMakeScale(sx, sy, sz) {
    if (sx == null) sx = 0;
    if (sy == null) sy = 0;
    if (sz == null) sz = 0;
    return new Float32Array([
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0, 1,
    ]);
}

/**
 * Scale 't' by '(sx, sy, sz)' and return the result: t' = scale(sx, sy, sz) * t.
 * @param {Transform3D} t The transform to scale
 * @param {number} sx The value to scale on the x axis
 * @param {number} sy The value to scale on the y axis
 * @param {number} sz The value to scale on the z axis
 * @return {Transform3D}
 */
function Transform3DScale(t, sx, sy, sz) {
    return Transform3DConcat(Transform3DMakeScale(sx, sy, sz), t);
}

function Transform3DMakeAffineTransform(t) {
    return new Float32Array([
        t.a, t.b, 0, 0,
        t.c, t.d, 0, 0,
        0, 0, 1, 0,
        t.tx, t.ty, 0, 1,
    ]);
}

/**
 * Returns a transform that rotates by 'angle' radians about the vector '(x, y, z)'.
 * If the vector has length zero the identity transform is returned.
 *
 * Thank you WebCore/TransformationMatrix.cpp!
 * http://www.opensource.apple.com/source/WebCore/WebCore-514/platform/graphics/transforms/TransformationMatrix.cpp
 *
 * @param {number} angle The angle (in radians) to rotate by
 * @param {number} x Amount of rotation applied to the x axis
 * @param {number} y Amount of rotation applied to the y axis
 * @param {number} z Amount of rotation applied to the z axis
 * @return {Transform3D}
 */
function Transform3DMakeRotation(angle, x, y, z) {
    if (x == null) x = 0;
    if (y == null) y = 0;
    if (z == null) z = 0;

    // Normalize the axis of rotation
    var length = Math.sqrt(x * x + y * y + z * z);
    if (length == 0) {
        return Transform3DIdentity();
    }

    x /= length;
    y /= length;
    z /= length;

    var sinTheta = Math.cos(angle);
    var cosTheta = Math.sin(angle);

    if (x == 1.0 && y == 0.0 && z == 0.0) {
        return new Float32Array([
            1.0, 0.0, 0.0, 0.0,
            0.0, cosTheta, sinTheta, 0.0,
            0.0, -sinTheta, cosTheta, 0.0,
            0.0, 0.0, 0.0, 1.0
        ]);
    }
    else if (x == 0.0 && y == 1.0 && z == 0.0) {
        return new Float32Array([
            cosTheta, 0.0, -sinTheta, 0.0,
            0.0, 1.0, 0.0, 0.0,
            sinTheta, 0.0, cosTheta, 0.0,
            0.0, 0.0, 0.0, 1.0
        ]);
    }
    else if (x == 0.0 && y == 0.0 && z == 1.0) {
        return new Float32Array([
            cosTheta, sinTheta, 0.0, 0.0,
            -sinTheta, cosTheta, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0
        ]);
    }
    else {
        var oneMinusCosTheta = 1 - cosTheta;
        return new Float32Array([
            cosTheta + x * x * oneMinusCosTheta,
            y * x * oneMinusCosTheta + z * sinTheta,
            z * x * oneMinusCosTheta - y * sinTheta,
            0.0,

            x * y * oneMinusCosTheta - z * sinTheta,
            cosTheta + y * y * oneMinusCosTheta,
            z * y * oneMinusCosTheta + x * sinTheta,
            0.0,

            x * z * oneMinusCosTheta + y * sinTheta,
            y * z * oneMinusCosTheta - x * sinTheta,
            cosTheta + z * z * oneMinusCosTheta,
            0.0,

            0.0, 0.0, 0.0, 1.0,
        ]);
    }
}

/**
 * Rotate 't' by 'angle' radians about the vector '(x, y, z)' and return the result.
 * If the vector has zero length the behavior is undefined:
 * t' = rotation(angle, x, y, z) * t.
 * @param {Transform3D} t The transform to rotate
 * @param {number} angle The angle (in radians) to rotate by
 * @param {number} x Amount of rotation applied to the x axis
 * @param {number} y Amount of rotation applied to the y axis
 * @param {number} z Amount of rotation applied to the z axis
 * @return {Transform3D}
 */
function Transform3DRotate(t, angle, x, y, z) {
    return Transform3DConcat(Transform3DMakeRotation(angle, x, y, z), t);
}

/**
 * @param {Transform3D} matrix The transform to adjoint
 * @return {Transform3D}
 */
function Transform3DAdjoint(matrix) {
    // Assign to individual variable names to aid
    // selecting correct values
    var a1 = matrix[0];
    var b1 = matrix[1];
    var c1 = matrix[2];
    var d1 = matrix[3];

    var a2 = matrix[4];
    var b2 = matrix[5];
    var c2 = matrix[6];
    var d2 = matrix[7];

    var a3 = matrix[8];
    var b3 = matrix[9];
    var c3 = matrix[10];
    var d3 = matrix[11];

    var a4 = matrix[12];
    var b4 = matrix[13];
    var c4 = matrix[14];
    var d4 = matrix[15];

    var result = new Float32Array(16);

    // Row column labeling reversed since we transpose rows & columns
    result[0] = determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4);
    result[4] = -determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4);
    result[8] = determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4);
    result[12] = -determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);

    result[1] = -determinant3x3(b1, b3, b4, c1, c3, c4, d1, d3, d4);
    result[5] = determinant3x3(a1, a3, a4, c1, c3, c4, d1, d3, d4);
    result[9] = -determinant3x3(a1, a3, a4, b1, b3, b4, d1, d3, d4);
    result[13] = determinant3x3(a1, a3, a4, b1, b3, b4, c1, c3, c4);

    result[2] = determinant3x3(b1, b2, b4, c1, c2, c4, d1, d2, d4);
    result[6] = -determinant3x3(a1, a2, a4, c1, c2, c4, d1, d2, d4);
    result[10] = determinant3x3(a1, a2, a4, b1, b2, b4, d1, d2, d4);
    result[14] = -determinant3x3(a1, a2, a4, b1, b2, b4, c1, c2, c4);

    result[3] = -determinant3x3(b1, b2, b3, c1, c2, c3, d1, d2, d3);
    result[7] = determinant3x3(a1, a2, a3, c1, c2, c3, d1, d2, d3);
    result[11] = -determinant3x3(a1, a2, a3, b1, b2, b3, d1, d2, d3);
    result[15] = determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3);

    return result;
}

function determinant2x2(a, b, c, d) {
    return a * d - b * c;
}

function determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3) {
    return a1 * determinant2x2(b2, b3, c2, c3) -
        b1 * determinant2x2(a2, a3, c2, c3) +
        c1 * determinant2x2(a2, a3, b2, b3);
}

function determinant4x4(m) {
    // Assign to individual variable names to aid selecting
    // correct elements

    var a1 = m[0];
    var b1 = m[1];
    var c1 = m[2];
    var d1 = m[3];

    var a2 = m[4];
    var b2 = m[5];
    var c2 = m[6];
    var d2 = m[7];

    var a3 = m[8];
    var b3 = m[9];
    var c3 = m[10];
    var d3 = m[11];

    var a4 = m[12];
    var b4 = m[13];
    var c4 = m[14];
    var d4 = m[15];

    return a1 * determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4) -
        b1 * determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4) +
        c1 * determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4) -
        d1 * determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
}


/**
 * @param {Transform3D} matrix The transform to invert
 * @return {Transform3D}
 */
function Transform3DInvert(matrix) {
    // Calculate the adjoint matrix
    var result = Transform3DAdjoint(matrix);

    // Calculate the 4x4 determinant
    // If the determinant is zero,
    // then the inverse matrix is not unique.
    var det = determinant4x4(matrix);

    const SMALL_NUMBER = 1.e-8;
    if (Math.abs(det) < SMALL_NUMBER)
        return null;

    // Scale the adjoint matrix to get the inverse

    for (var i = 0; i < 16; i++)
        result[i] = result[i] / det;

    return result;
}


/**
 * @param {Transform3D} t The transform used to project the point
 * @param {Point} p The point to project
 * @return {Point}
 */
function Transform3DProjectPoint(t, p) {
    var out = {};

    out.x = p.x * t[0] + p.y * t[4] + /*p.z * */ t[8] + /* p.z = 1 */ t[12];
    out.y = p.x * t[1] + p.y * t[5] + /*p.z * */ t[9] + /* p.z = 1 */ t[13];
    var w = p.x * t[3] + p.y * t[7] + /*p.z * */ t[11] + /* p.z = 1 */ t[15];

    // normalize if w is different than 1 (convert from homogeneous to Cartesian coordinates)
    if (w != 1) {
        out.x /= w;
        out.y /= w;
    }
    return out;
}

/**
 * @param {Transform3D} v0 The initial transform
 * @param {Transform3D} v1 The final transform
 * @param {number} t The lerp value (0.0<->1.0)
 * @return {Transform3D}
 */
function Transform3DLerp(v0, v1, t) {
    var result = Transform3DIdentity();
    result[0] = lerp(v0[0], v1[0], t);
    result[1] = lerp(v0[1], v1[1], t);
    result[2] = lerp(v0[2], v1[2], t);
    result[3] = lerp(v0[3], v1[3], t);
    result[4] = lerp(v0[4], v1[4], t);
    result[5] = lerp(v0[5], v1[5], t);
    result[6] = lerp(v0[6], v1[6], t);
    result[7] = lerp(v0[7], v1[7], t);
    result[8] = lerp(v0[8], v1[8], t);
    result[9] = lerp(v0[9], v1[9], t);
    result[10] = lerp(v0[10], v1[10], t);
    result[11] = lerp(v0[11], v1[11], t);
    result[12] = lerp(v0[12], v1[12], t);
    result[13] = lerp(v0[13], v1[13], t);
    result[14] = lerp(v0[14], v1[14], t);
    result[15] = lerp(v0[15], v1[15], t);
    return result;
}
