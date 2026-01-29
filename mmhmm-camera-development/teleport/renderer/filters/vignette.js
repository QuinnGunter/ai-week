//
//  vignette.js
//  mmhmm
//
//  Created by Steve White on 9/29/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//

class VignetteFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor() {
        const fragment = `
    precision mediump float;

varying vec2 v_texcoord;varying vec2 v_layercoord;uniform lowp float iStart; uniform sampler2D u_texture;uniform lowp float u_opacity;
void main(){vec4 v=texture2D(u_texture,v_texcoord);float u=v.w*u_opacity;if(u==0.){discard;}else{if(v_layercoord.y>=iStart)u*=1.-(v_layercoord.y-iStart)/.2;gl_FragColor=vec4(v.xyz,u);}}
    `;
        super(fragment, ["u_texture", "u_opacity", "iStart"], []);
        this.modifiesContents = true;
    }
    prepare(gl, program, timestamp, renderer, layer) {
        var start = 0.8;
        if (IsKindOf(layer, PresenterVideoLayer) == true) {
            layer = layer.superlayer;
        }
        if (layer != null) {
            var bbox = layer.boundingBox;
            var bottom = bbox.y + bbox.height;
            start = Math.max(start, bottom / renderer.size.height);
        }

        gl.uniform1f(program.uniforms.iStart, start);
    }
}
VignetteFilter.identifier = "69520beb-7e3c-497e-82d0-afe778f8f4ce";
