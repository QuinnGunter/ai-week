//
//  blur.js
//  mmhmm
//
//  Created by Steve White on 1/21/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//

class GaussianBlurFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor(amount=35) {
        const fragment = `
    precision mediump float;

    varying vec2 v_texcoord;uniform sampler2D u_texture;uniform lowp float u_opacity;uniform vec2 iResolution;
    const int v=${amount},i=2,e=4;const float d=float(v)*.25,r=d*d;const int f=v/e,w=f*f;
    float t(vec2 v){return exp(-.5*dot(v/=d,v))/(6.28*d*d);}int t(int v,int d){return v-v/d*d;}
    vec4 t(sampler2D d,vec2 u,vec2 n){vec4 c=vec4(0);for(int r=0;r<w;r++){vec2 s=vec2(t(r,f),r/f)*float(e)-float(v)/2.;c+=t(s)*textureLod(d,u+n*s,float(i));}return c/c.w;}
    void main(){if(texture2D(u_texture,v_texcoord).w==0.){discard;}vec4 v=t(u_texture,v_texcoord,1./iResolution);gl_FragColor=vec4(v.xyz,v.w*u_opacity);}`
        const uniforms = [
            "u_opacity", "iResolution", "u_texture"
        ];

        const parameters = [

        ];
        super(fragment, uniforms, parameters);
        this.modifiesContents = true;
    }
}
