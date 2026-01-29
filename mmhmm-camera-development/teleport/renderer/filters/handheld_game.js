//
//  handheld_game.js
//  mmhmm
//
//  Created by Steve White on 1/6/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//

class HandheldGameFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor() {
        const fragment = `
    precision mediump float;

    varying vec2 v_texcoord;uniform sampler2D u_texture;uniform lowp float u_opacity,kBayer[16];uniform vec3 kPalette[4];uniform vec2 kRes;uniform lowp float u_intensity;
    int v(int v,int u,int f){return v<u?u:v>f?f:v;}int v(int v,int i){return int(float(v)/float(i));}void main(){vec2 i=v_texcoord;i=floor(i*kRes)/kRes;vec4 u=texture2D(u_texture,i);if(u.w==0.){discard;}float f=.333*(u.x+u.y+u.z),k=.5;f*=mix(.5+k,2.2/(1.+f),max(2.*k-1.,0.));ivec2 r=ivec2(i/3.);int m=v(r.x,4)+v(r.y,4)*2;float s=0.;for(int b=0;b<16;b++){if(b==m){s=kBayer[b];break;}}int b=v(int(f*4.),0,3);vec3 y=vec3(0);for(int x=0;x<4;x++){if(x==b){y=kPalette[x];break;}}gl_FragColor=vec4(y,u.w*u_opacity);}
`
        var parameters = {
            intensity: { name: LocalizedString("Intensity"), type: "range", min: 1.0, max: 10.0, default: 3.0, minValueTitle: LocalizedString("hi-res"), maxValueTitle: LocalizedString("lo-res") },
        };
        super(fragment, ["u_texture", "u_opacity", "kRes", "kBayer", "kPalette"], parameters);
        this.modifiesContents = true;
        this.bayer = new Float32Array([
            0.0 / 16.0, 8.0 / 16.0, 2.0 / 16.0, 10.0 / 16.0,
            12.0 / 16.0, 4.0 / 16.0, 14.0 / 16.0, 6.0 / 16.0,
            3.0 / 16.0, 11.0 / 16.0, 1.0 / 16.0, 9.0 / 16.0,
            15.0 / 16.0, 7.0 / 16.0, 13.0 / 16.0, 5.0 / 16.0
        ]);
        this.palette = new Float32Array([
            15 / 255.0, 56 / 255.0, 15 / 255.0,
            48 / 255.0, 98 / 255.0, 48 / 255.0,
            139 / 255.0, 172 / 255.0, 15 / 255.0,
            155 / 255.0, 188 / 255.0, 15 / 255.0,
        ]);
    }
    set intensity(intensity) {
        this._intensity = intensity;
        var min = SizeMake(280, 210);
        var step = SizeMake(24, 18);
        this.size = new Float32Array([min.width - (step.width * intensity), min.height - (step.height * intensity)]);
    }
    get intensity() {
        return this._intensity;
    }
    prepare(gl, program, timestamp, renderer, layer) {
        gl.uniform2fv(program.uniforms.kRes, this.size);
        gl.uniform1fv(program.uniforms.kBayer, this.bayer);
        gl.uniform3fv(program.uniforms.kPalette, this.palette);
    }
}
HandheldGameFilter.identifier = "95d0015d-880e-469b-b347-acd9d0c19743";
