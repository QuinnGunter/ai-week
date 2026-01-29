//
//  black_and_white.js
//  mmhmm
//
//  Created by Steve White on 10/8/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//


class BlackAndWhiteFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor() {
        const fragment = `
precision mediump float;

varying vec2 v_texcoord;uniform sampler2D u_texture;uniform lowp float u_opacity,u_brightness;
void main(){vec4 u=texture2D(u_texture,v_texcoord);if(u.w==0.){discard;}else{float v=dot(u.xyz,vec3(.333));v*=mix(.5+u_brightness,2.2/(1.+v),max(2.*u_brightness-1.,0.));gl_FragColor=vec4(v,v,v,u.w*u_opacity);}}
    `
        var parameters = {
            u_brightness: { name: LocalizedString("Brightness"), type: "range", min: 0.0, max: 1.0, default: 0.5, minValueTitle: LocalizedString("darker"), maxValueTitle: LocalizedString("lighter") },
        }
        super(fragment, ["u_texture", "u_opacity", "u_brightness"], parameters);
        this.modifiesContents = true;
    }
    prepare(gl, program) {
        gl.uniform1f(program.uniforms.u_brightness, this.u_brightness);
    }
}
BlackAndWhiteFilter.identifier = "2c05939a-2361-405f-94d2-7e5db2c13e4a";
