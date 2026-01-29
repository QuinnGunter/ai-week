//
//  gradient.js
//  mmhmm
//
//  Created by Steve White on 12/14/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class GradientFilter extends RenderFilter {
    constructor(fragment, uniforms=[]) {
        super(fragment, [...uniforms, "u_startColor", "u_stopColor", "u_opacity"], null);
        this._startColor = [0.996, 0.569, 0.776, 1.0];
        this._stopColor = [0.996, 0.816, 0.780, 1.0];
        this._needsUpdate = true;
    }
    set startColor(color) {
        if (color != null && color.length == 3) {
            color = Array.from(color);
            color.push(1.0);
        }
        this._startColor = color;
        this._needsUpdate = true;
    }
    get startColor() {
        return this._startColor;
    }
    set stopColor(color) {
        if (color != null && color.length == 3) {
            color = Array.from(color);
            color.push(1.0);
        }
        this._stopColor = color;
        this._needsUpdate = true;
    }
    get stopColor() {
        return this._stopColor;
    }
    prepare(gl, program) {
        if (this._needsUpdate == true) {
            this._needsUpdate = false;

            const uniforms = program.uniforms;
            gl.uniform4fv(uniforms.u_startColor, this.startColor);
            gl.uniform4fv(uniforms.u_stopColor, this.stopColor);
        }
    }
}

GradientFilter.Linear = class extends GradientFilter {
    constructor() {
        const fragment = `
precision mediump float;
uniform vec4 u_startColor;
uniform vec2 u_startPoint;
uniform vec4 u_stopColor;
uniform vec2 u_stopPoint;
uniform lowp float u_opacity;
varying vec2 v_texcoord;

void main() {
    // Calculate interpolation factor with vector projection.
    vec2 a = u_startPoint;
    vec2 b = u_stopPoint;
    vec2 ba = b - a;
    float t = dot(v_texcoord - a, ba) / dot(ba, ba);
    // Saturate and apply smoothstep to the factor.
    t = smoothstep(0.0, 1.0, clamp(t, 0.0, 1.0));
    // Interpolate.
    vec4 color = mix(u_startColor, u_stopColor, t);

    gl_FragColor = vec4(color.rgb, color.a * u_opacity);
}
        `;
        super(fragment, ["u_startPoint", "u_stopPoint"]);
        this._startPoint = [0.0, 0.0];
        this._stopPoint = [1.0, 1.0];
    }
    set startPoint(point) {
        this._startPoint = point;
        this._needsUpdate = true;
    }
    get startPoint() {
        return this._startPoint;
    }
    set stopPoint(point) {
        this._stopPoint = point;
        this._needsUpdate = true;
    }
    get stopPoint() {
        return this._stopPoint;
    }
    prepare(gl, program) {
        if (this._needsUpdate == true) {
            const uniforms = program.uniforms;
            gl.uniform2fv(uniforms.u_startPoint, this.startPoint);
            gl.uniform2fv(uniforms.u_stopPoint, this.stopPoint);
        }
        super.prepare(gl, program);
    }
}

GradientFilter.Radial = class extends GradientFilter {
    constructor() {
        const fragment = `
precision mediump float;
uniform vec4 u_startColor;
uniform vec4 u_stopColor;
uniform lowp float u_opacity;
varying vec2 v_texcoord;

void main() {
    const float max = sqrt(0.5);
    float d = distance(v_texcoord, vec2(0.5)) / max;

    vec4 col = mix(
        u_startColor,
        u_stopColor,
        d
    );

    gl_FragColor = vec4(col.rgb, col.a * u_opacity);
}`
        super(fragment);
    }
}
