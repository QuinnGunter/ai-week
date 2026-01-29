//
//  transmission.js
//  mmhmm
//
//  Created by Steve White on 1/7/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//

class TransmissionFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor() {
        /*
         * The shader contains three functions:
         * hash (minified: t)
         * noise (minified: x)
         * fbm (minified: v)
         * from: https://www.shadertoy.com/view/4dS3Wd
         * with the following license:
         */
        /*
         * Copyright 2014 Morgan McGuire @morgan3d, http://graphicscodex.com
         *
         * Redistribution and use in source and binary forms, with or without modification,
         * are permitted provided that the following conditions are met:
         *
         * Redistributions of source code must retain the above copyright notice, this list of
         * conditions and the following disclaimer.
         *
         * Redistributions in binary form must reproduce the above copyright notice, this list
         * of conditions and the following disclaimer in the documentation and/or other materials
         * provided with the distribution.
         *
         * Neither the name of the copyright holder nor the names of its contributors may be used
         * to endorse or promote products derived from this software without specific prior written
         * permission.
         *
         * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
         * OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
         * AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
         * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
         * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
         * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
         * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
         * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
         */
        const fragment = `
    precision mediump float;
    varying vec2 v_texcoord;uniform sampler2D u_texture,u_noise;uniform lowp float u_opacity,u_intensity,iTime;uniform vec2 iResolution;
    float t(float f){return f=fract(f*.011),f*=f+7.5,f*=f+f,fract(f);}float x(float f){float v=floor(f),u=fract(f),r=u*u*(3.-2.*u);return mix(t(v),t(v+1.),r);}float f(in vec2 f){return textureLod(u_noise,f,0.).x;}float v(float f){float v=0.,u=.5,e=float(100);for(int r=0;r<5;++r)v+=u*x(f),f=f*2.+e,u*=.5;return v;}void main(){vec2 u=v_texcoord;if(texture2D(u_texture,u).w<0.1){discard;}vec2 r=u;float m=u_intensity,t=floor(iTime*15.)/15.,e=v(t);vec2 i=floor(u*20.)/20.;float x=f(vec2(0.,i.y+.1*t));if(x>.8)u.x+=.05*e*2.*m;u.y+=e*.02*m;vec3 y;{float g=2.+15.*e*f(vec2(0.,.1*u.y+t));g*=2.*m*1.5/iResolution.x;y=vec3(texture2D(u_texture,u-vec2(g,0)).x,texture2D(u_texture,u).y,texture2D(u_texture,u+vec2(g,0)).z);}const float g=.5;y*=mix(.5+g,2.2/(1.+dot(y,vec3(.333))),max(2.*g-1.,0.));y=mix(y,vec3(dot(y,vec3(.333))),.2*e);y*=mix(1.,.95+.1*mod(gl_FragCoord.y/2.,2.),2.*m);r+=fract(t*vec2(1.3,3.7)*1000.11);y+=m*.06*(.6+.4*e)*(-1.+2.*f(.3*iResolution.xy*r/256.));gl_FragColor=vec4(y,u_opacity);}
`
        var parameters = {
            intensity: { name: LocalizedString("Intensity"), type: "range", min: 0.0, max: 10.0, default: 0.5, minValueTitle: LocalizedString("moderate"), maxValueTitle: LocalizedString("severe") },
        };
        super(fragment, ["u_texture", "u_noise", "u_opacity", "u_intensity", "iTime", "iResolution"], parameters);
        this.modifiesContents = true;
    }
    initialize(gl, program, renderer) {
        this.noiseTexture = renderer.textureNamed("assets/textures/noise.png", gl.REPEAT);
    }
    prepare(gl, program, timestamp, renderer, layer) {
        gl.uniform1f(program.uniforms.u_intensity, this.intensity);

        //
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
        gl.uniform1i(program.uniforms.u_noise, 1);
        gl.activeTexture(gl.TEXTURE0);
    }
}
TransmissionFilter.identifier = "e9ad75a9-dae2-4b11-8ae0-27c9490fc04b";
