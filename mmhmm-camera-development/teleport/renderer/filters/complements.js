//
//  complements.js
//  mmhmm
//
//  Created by Steve White on 11/12/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//

class ComplementsFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor() {
        const fragment = `
precision mediump float;
varying vec2 v_texcoord;uniform sampler2D u_texture;uniform lowp float u_opacity,u_brightness,u_intensity;
void main(){vec2 m=v_texcoord;vec4 v=texture2D(u_texture,m);if(v.w==0.){discard;}vec3 u=v.xyz;u*=mix(.5+u_brightness,2.2/(1.+dot(u,vec3(.333))),max(2.*u_brightness-1.,0.));float y=clamp((u.x-max(u.y,u.z))*5.,0.,1.);u=pow(u,mix(vec3(1.),vec3(1.-.2*y,1.-.1*y,.8+.2*y),u_intensity*2.))+vec3(0.,0.,.03*(1.-y));gl_FragColor=vec4(u,v.w*u_opacity);}
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
ComplementsFilter.identifier = "857fb303-8fcf-4499-97d8-dcba9213ac73";
