//
//  solid_colors.js
//  mmhmm
//
//  Created by Steve White on 8/3/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//


class SolidColorFilter extends RenderFilter {
    /**
     * @override
     * @param {(number[]|Float32Array)} color
     */
    constructor(color) {
        const fragment = `
precision mediump float;
uniform vec4 u_color;
uniform bool u_sample;
varying vec2 v_texcoord;
uniform sampler2D u_texture;

void main() {
  float alpha = 1.0;
  if (u_sample == true) {
    alpha = texture2D(u_texture, v_texcoord).a;
    if (alpha == 0.0) {
      discard;
    }
  }
  gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
}
`;
        super(fragment, ["u_color", "u_sample", "u_texture"], null);
        if (color == null) {
            color = [0, 0, 0, 1.0];
        }
        this.color = color;
    }
    set color(aColor) {
        if (aColor == null) {
            aColor = new Float32Array([0, 0, 0, 0]);
        }
        else if (aColor.constructor == Array) {
            aColor = new Float32Array(aColor);
        }
        else if (aColor.constructor == Uint8Array) {
            aColor = new Float32Array([
                aColor[0] / 255,
                aColor[1] / 255,
                aColor[2] / 255,
                aColor[3] / 255,
            ]);
        }
        this._color = aColor;
    }
    get color() {
        return this._color;
    }
    containsPoint(point, layer) {
        var color = this.color;
        if (color[3] <= 0) {
            return false;
        }
        return RectContainsPoint(layer.frame, point);
    }
    prepare(gl, program, timestamp, renderer, layer, contentsTexture) {
        gl.uniform1i(program.uniforms.u_sample, (contentsTexture != null));
        gl.uniform4fv(program.uniforms.u_color, this.color);
    }
}
