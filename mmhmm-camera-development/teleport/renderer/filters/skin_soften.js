//
//  skin_soften.js
//  mmhmm
//
//  Created by Steve White on 11/12/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//

class SkinSoftenFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor() {
        const fragment = `
precision mediump float;

varying vec2 v_texcoord;uniform sampler2D u_texture;uniform lowp float u_opacity,u_brightness,u_intensity;
void main(){vec2 u=v_texcoord;vec4 v=texture2D(u_texture,u);if(v.w==0.){discard;}vec3 y=v.xyz,e=texture2D(u_texture,u,2.).xyz;float w=clamp((y.x-max(y.y,y.z))*5.,0.,1.);y=mix(y,e,w*u_intensity*2.);float x=dot(y,vec3(.333));y*=mix(.8+.4*u_brightness,2.2/(1.+x),u_brightness);y=mix(y,vec3(x),u_intensity*.2);y*=.5+.5*pow(16.*u.x*(1.-u.x)*u.y*(1.-u.y),.15);gl_FragColor=vec4(y,v.w*u_opacity);}
    `
        var parameters = {
            u_brightness: { name: LocalizedString("Brightness"), type: "range", min: 0.0, max: 1.0, default: 0.5, configurable: false },
            u_intensity: { name: LocalizedString("Intensity"), type: "range", min: 0.0, max: 1.0, default: 0.5, minValueTitle: LocalizedString("less"), maxValueTitle: LocalizedString("more") },
        }
        super(fragment, ["u_texture", "u_opacity", "u_brightness", "u_intensity"], parameters);
        this.modifiesContents = true;
    }
    prepare(gl, program) {
        gl.uniform1f(program.uniforms.u_brightness, this.u_brightness);
        gl.uniform1f(program.uniforms.u_intensity, this.u_intensity);
    }
}
SkinSoftenFilter.identifier = "5fd07572-b5c8-43cf-818f-eddd5d23cb61";
