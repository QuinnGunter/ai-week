//
//  pixelize.js
//  mmhmm
//
//  Created by Steve White on 8/3/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//


class PixelizeFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor() {
        const fragment = `
precision mediump float;

varying vec2 v_texcoord;uniform sampler2D u_texture;uniform lowp float u_opacity,u_intensity,u_brightness;uniform vec2 iResolution;
vec2 v(vec2 v){return floor(v+.5);}
void main(){vec2 u=mix(vec2(32.,32.),iResolution.xy,u_intensity),y=v_texcoord.xy;y=v(y*u)/u;float i=mix(2.,0.,u_brightness);vec4 m=texture2D(u_texture,y,i);if(m.w<0.1){discard;}vec3 f=m.xyz;f*=mix(.5+u_brightness,2.2/(1.+dot(f,vec3(.333))),max(2.*u_brightness-1.,0.));gl_FragColor=vec4(f,u_opacity);}
`;
        var parameters = {
            u_intensity: { name: LocalizedString("Brightness"), type: "range", min: 0.0, max: 1.0, default: 0.5, configurable: false },
            u_brightness: { name: LocalizedString("Amount"), type: "range", min: 0.0, max: 1.0, default: 0.8, minValueTitle: LocalizedString("small"), maxValueTitle: LocalizedString("large") },
        };
        super(fragment, ["iResolution", "u_texture", "u_opacity", "u_brightness", "u_intensity"], parameters);
        this.modifiesContents = true;
    }
    prepare(gl, program) {
        gl.uniform1f(program.uniforms.u_brightness, this.u_intensity);
        gl.uniform1f(program.uniforms.u_intensity, Math.pow(1.0 - this.u_brightness, 5.0));
    }
}
PixelizeFilter.identifier = "5ae6964b-d233-45c4-a02b-76c199b708a1";
