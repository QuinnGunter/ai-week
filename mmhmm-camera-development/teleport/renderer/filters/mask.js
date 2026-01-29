//
//  mask.js
//  mmhmm
//
//  Created by Steve White on 10/20/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class RenderMaskFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor() {
        const fragment = `
    precision mediump float;
    varying vec2 v_texcoord;
    uniform sampler2D u_texture;
    uniform sampler2D u_mask;
    uniform lowp float u_opacity;
    void main() {
      vec4 pix = texture2D(u_texture, v_texcoord);
      float mask = texture2D(u_mask, v_texcoord).a;
      gl_FragColor = vec4(pix.rgb, pix.a * mask * u_opacity);
    }
    `
        const uniforms = ["u_texture", "u_mask", "u_opacity"];
        const params = [];
        super(fragment, uniforms, params);
    }
    prepare(gl, program, timestamp, renderer, layer) {
        if (layer == null) {
            return;
        }
        var maskObj = layer.mask;
        if (maskObj == null) {
            return;
        }

        // Important to activate the texture now, otherwise
        // the call to updateTextureWithBytes() will update
        // the wrong texture!
        gl.activeTexture(gl.TEXTURE1);

        var maskNeedsUpdate = layer.maskNeedsUpdate;
        var mask = this.texture;
        if (mask == null) {
            mask = renderer.newTexture(gl.ALPHA);
            this.texture = mask;
            maskNeedsUpdate = true;
        }
        if (maskNeedsUpdate == true) {
            if (maskObj.updateTexture != null) {
                maskObj.updateTexture(renderer, gl, mask);
            }
            else {
                renderer.updateTextureWithElement(mask, maskObj);
            }
            layer.maskNeedsUpdate = false;
        }

        var maskLoc = program.uniforms.u_mask;

        gl.bindTexture(gl.TEXTURE_2D, mask);
        gl.uniform1i(maskLoc, 1);

        // Switch back to texture0 now that we're finished.
        gl.activeTexture(gl.TEXTURE0);
    }
}
