//
//  film.js
//  mmhmm
//
//  Created by Steve White on 1/5/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//

class FilmFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor() {
        /*
         * The shader contains three functions:
         * hash (minified: i)
         * noise (minified: t)
         * fbm (minified: f)
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

    varying vec2 v_texcoord;uniform sampler2D u_texture,iChannel1;uniform float iTime;uniform lowp float iBrightness,iDisplacement,u_opacity;uniform int iFrame;uniform vec2 iResolution;float i(float i){return i=fract(i*.011),i*=i+7.5,i*=i+i,fract(i);}float t(float f){float y=floor(f),v=fract(f),x=v*v*(3.-2.*v);return mix(i(y),i(y+1.),x);}float f(float i){float y=0.,v=.5,x=float(100);for(int f=0;f<5;++f)y+=v*t(i),i=i*2.+x,v*=.5;return y;}void main(){vec2 v=v_texcoord*iResolution,x=v.xy/iResolution.y,t=v_texcoord;float y=floor(iTime*12.)/12.;vec2 u=t,r=x;float e=f(iTime),d=.01*(-1.+2.*e);u.y+=d;r.y+=d;vec4 m=texture2D(u_texture,u);if(m.w<0.1){discard;}float s=dot(m.xyz,vec3(.333)),n=iBrightness;s*=mix(.5+n,2.2/(1.+s),max(2.*n-1.,0.));s=s*s*(3.-2.*s);vec2 g=r+fract(y*vec2(1.3,3.7)*1100.11);s*=1.-smoothstep(.92,.95,textureLod(iChannel1,g*12./256.,0.).x);s*=sqrt(16.*t.x*(1.-t.x)*t.y*(1.-t.y));float w=i(float(iFrame));s*=.85+.15*w;g=r+fract(y*vec2(3.7,1.3)*1.1711);s+=.1*textureLod(iChannel1,.6*g,0.).x;s*=1.-.2*smoothstep(.9,1.,textureLod(iChannel1,vec2(.15*g.x,0.),0.).x);gl_FragColor=vec4(s,s,s,u_opacity);}
    `;
        var parameters = {};
        super(fragment, ["u_texture", "u_opacity", "iTime", "iResolution", "iBrightness", "iFrame", "iChannel1"], parameters);
        this.modifiesContents = true;
    }
    initialize(gl, program, renderer) {
        this.noiseTexture = renderer.textureNamed("assets/textures/noise.png", gl.REPEAT);
    }
    toJSON() {
        var r = super.toJSON();
        r.frame = this.frame;
        return r;
    }
    applyEvent(event) {
        super.applyEvent(event);
        var frame = event?.frame;
        if (frame != null) {
            this.frame = frame;
        }
    }
    prepare(gl, program, timestamp, renderer, layer, contentsTexture) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
        gl.uniform1i(program.uniforms.iChannel1, 2);
        gl.activeTexture(gl.TEXTURE0);

        gl.uniform1f(program.uniforms.iBrightness, 0.5);

        var frame = this.frame;
        if (frame == null) {
            frame = 0;
        }
        gl.uniform1i(program.uniforms.iFrame, frame);
        this.frame = frame + 1;
    }
}
FilmFilter.identifier = "07565ed2-4229-4da5-a319-a9d18c185ec3";
