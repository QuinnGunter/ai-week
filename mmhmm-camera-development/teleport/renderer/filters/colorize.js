//
//  colorize.js
//  mmhmm
//
//  Created by Steve White on 10/8/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//


class ColorizeFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor(color=[1,0,1]) {
        const fragment = `
    precision mediump float;
varying vec2 v_texcoord;uniform sampler2D u_texture;uniform lowp float u_opacity;uniform vec3 u_color;void main(){vec4 u=texture2D(u_texture,v_texcoord);if(u.w==0.){discard;}float v=u.x*.21+u.y*.72+u.z*.07;vec3 z=(u_color.x+u_color.y+u_color.z)*.3333-u_color;z*=2.;u.xyz=pow(vec3(v),1.+z);gl_FragColor=vec4(u.xyz,u.w*u_opacity);}
    `
        super(fragment, ["u_texture", "u_opacity", "u_color"], []);
        this.modifiesContents = true;
        this.color = color;
    }
    prepare(gl, program) {
        var color = this.color;
        if (color == null) {
            color = new Float32Array([1, 0, 1]);
            this.color = color;
        }
        gl.uniform3fv(program.uniforms.u_color, this.color);
    }
    toJSON() {
        var r = super.toJSON();
        r.color = this.color;
        return r;
    }
}
ColorizeFilter.identifier = "5FFF9B5E-AA95-4556-B4E1-8F5DE24CB58C";
