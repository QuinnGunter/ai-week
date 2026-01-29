//
//  rain.js
//  mmhmm
//
//  Created by Steve White on 1/5/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//

class RainFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor() {
        const fragment = `
    precision mediump float;

    varying vec2 v_texcoord;uniform sampler2D u_texture;uniform vec2 iResolution;uniform float iTime;uniform lowp float u_opacity,iBrightness,iIntensity;vec4 t(vec2 v){float y=113.231*v.y+v.x*1.912;return fract(y*fract(y*vec4(.31831,.192381,.952925,.713841)));}vec4 v(float y){return fract(y*fract(y*vec4(.31831,.192381,.952925,.713841)));}float f(in vec2 v){return dot(v,v);}float f(float y,vec4 v,float i,float x,float f){float s=.7*sin(y*60.*x+v.x*20.)+.3*sin(y*113.*x+v.y*20.);s*=iIntensity*iIntensity;return(.5*i-f)*(.2*s*(1.-x)+.8*(-1.+2.*v.z));}vec2 f(vec2 y,float x){float i=iTime*.025,u=0.,s=.2,m=1.,r=0.;for(int z=0;z<5;z++){float t=floor(y.x/s);vec4 e=v(t+float(z)*123.123);float d=.2+.8*e.z;d*=1.+2.*(1.-iIntensity);d/=m;float w=e.x*10.+i,c=floor(w),a=fract(w);w=c+smoothstep(.3,.7,a)+.1*i;w/=d;a=clamp((a-.3)/.4,0.,1.);float g=.1+6.*a*(1.-a);g/=d;float p=-.05+1.1*fract(-w),n=m*.05*(.6+.4*e.w-.2*p);n*=iIntensity;float o=f(p,e,s,d,n);vec2 l=vec2(mod(y.x,s)-s*.5-o,y.y-p);float h=l.y>0.?1.:0.;l.y*=1.-.1*abs(g)*h;float I=f(l),T=.1*n*smoothstep(0.,n,sqrt(max(n*n-I,0.)));o=f(y.y,e,s,d,n);l=vec2(mod(y.x,s)-s*.5-o,y.y-p);float R=.8*n*(1.-smoothstep(0.,.5,l.y)),D=(1.-smoothstep(R*.5,R*1.2,abs(l.x)))*smoothstep(0.,.01,l.y);u=max(u,T);r=max(r,D);s*=.8;m*=.9;}return vec2(u,r);}float t(vec2 y,float v){y*=30.;vec2 w=floor(y),s=fract(y);vec4 i=t(w);vec2 x=.5+.4*(2.*i.xy-1.);float f=length(s-x),a=fract(v+i.z),n=floor(v+i.z),e=smoothstep(0.,.03,a)*(1.-max(a-.03,0.)/.77),u=.25*fract(i.w+n*.129318);f=min(f/u,1.);return iIntensity*.001*e*sqrt(1.-f*f);}vec2 v(vec2 y,float v){y.y=1.-y.y;y*=.75;float i=t(y,v);vec2 s=f(y,v);return vec2(max(i,s.x),s.y);}void main(){vec2 f=v_texcoord;if(texture2D(u_texture,f).w==0.){discard;}vec2 i=v_texcoord*iResolution,y=i/iResolution.y;float s=.2*iTime;vec2 l=v(y,s),n=vec2(.001,0.);vec3 e=normalize(vec3(v(y+n.xy,s).x-l.x,n.x,v(y+n.yx,s).x-l.x));float x=mix(3.*(1.-l.y)*(.5+.5*iIntensity),0.,l.x);f=f+e.xz;vec4 m=texture2D(u_texture,f,x);vec3 u=m.xyz;u*=mix(.5+iBrightness,2.2/(1.+dot(u,vec3(.333))),max(2.*iBrightness-1.,0.));vec3 w=u;u=mix(u,vec3(dot(u,vec3(.333))),.4);u=vec3(.95,1.,1.05)*pow(u,vec3(1.3,1.2,1.))+vec3(0.,0.,.03);u=mix(w,u,.5+.5*iIntensity);u*=.5+.5*pow(16.*f.x*(1.-f.x)*f.y*(1.-f.y),.2);gl_FragColor=vec4(u,u_opacity*m.w);}
`;
        var parameters = {
            iBrightness: { name: LocalizedString("Brightness"), type: "range", min: 0.0, max: 1.0, default: 0.5, configurable: false },
            iIntensity: { name: LocalizedString("Amount"), type: "range", min: 0.0, max: 1.0, default: 0.5, minValueTitle: LocalizedString("drizzle"), maxValueTitle: LocalizedString("downpour") },
        };

        super(fragment, ["u_texture", "u_opacity", "iTime", "iResolution", "iIntensity", "iBrightness"], parameters);
        this.modifiesContents = true;
    }
    prepare(gl, program, timestamp, renderer, layer) {
        gl.uniform1f(program.uniforms.iBrightness, this.iBrightness);
        gl.uniform1f(program.uniforms.iIntensity, this.iIntensity);
    }
}
RainFilter.identifier = "22228387-db83-41b2-8f57-8fab8052e398";
