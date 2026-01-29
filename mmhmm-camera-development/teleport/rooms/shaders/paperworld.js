//
//  paperworld.js
//  mmhmm
//
//  Created by Steve White on 10/7/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//

Room.Shader.Paperworld = class extends Room.Shader {
    constructor() {
        super(
            "23940e80-5d06-4c04-b86a-9851ec78ccf9",
            LocalizedString("Paperworld"),
            "paperworld.png",
            new Room.Shader.Paperworld.Filter(),
            true
        );
    }
    async thumbnailForState(state) {
        // Our settings control the speed of playback,
        // which doesn't affect the thumbnail any.
        // So always use our thumbnailSrc.
        return this.thumbnailAsset.openAsElement();
    }
    doesParameterKeyAffectThumbnail(key) {
        return false;
    }
}

/**
 * @extends {Room.Shader.Filter}
 * @property {number} speed Valid ranges 0.01<->0.5
 * @property {number} camSpeed Valid ranges 0.01<->0.4
 */
Room.Shader.Paperworld.Filter = class extends Room.Shader.Filter {
    constructor() {
        const fragment = `
    precision mediump float;
    precision highp int;
    varying vec2 v_texcoord;
    int clamp(int f,int v,int y){if(f<v)return v;if(f>y)return y;return f;}float round(float f){return floor(f+.5);}vec2 round(vec2 f){return floor(f+.5);}vec3 round(vec3 f){return floor(f+.5);}vec4 round(vec4 f){return floor(f+.5);}float sdEllipse(in vec2 f,in float v,in float i){vec2 y=vec2(v,i);float l=length(f/y),m=length(f/(y*y));return l*(l-1.)/m;}vec2 sdEllipse(in vec2 f,in float i,in float v,in float m){return vec2(max(sdEllipse(f,i,m),v-f.y),(f.y-v)/(m-v));}float sdCircle(in vec2 f,in float v){return length(f)-v;}float sdCircle(in vec2 f,in float v,in float i){return max(length(f)-v,i-f.y);}vec2 sdTriangleIsosceles(in vec2 f,in vec2 i){f.x=abs(f.x);vec2 v=vec2(f.x,f.y-i.y),s=vec2(i.x,-i.y);float l=length(v-s*clamp(dot(v,s)/dot(i,i),0.,1.)),m=v.y*s.x-v.x*s.y;return vec2(l*sign(m),f.y/i.y);}float sdVerticalCapsule(vec2 f,float i,float v){return f.y-=clamp(f.y,0.,i),length(f)-v;}float ndot(vec2 f,vec2 v){return f.x*v.x-f.y*v.y;}float dot2(vec2 i){return dot(i,i);}float sdRhombus(in vec2 f,in vec2 i){vec2 v=abs(f);float y=clamp((-2.*ndot(v,i)+ndot(i,i))/dot2(i),-1.,1.),m=length(v-.5*i*vec2(1.-y,1.+y));m*=sign(v.x*i.y+v.y*i.x-i.x*i.y);return m;}float hash(float f){return fract(113.*sin(1312.*f));}float linearstep(float f,float v,float i){return clamp((i-f)/(v-f),0.,1.);}vec3 mc(const int f,const int i,const int v){return pow(vec3(f,i,v)/255.,vec3(2.2));}const float kWaterLevel=-.58;vec3 layerBackground(in vec2 f,in float v,in float i,in float y){return mix(mc(204,232,239),mc(112,197,233),pow(linearstep(kWaterLevel,1.,f.y),.75));}vec3 layerWater(in vec3 f,in vec2 i,in float v,in float s,in float y){if(i.y<kWaterLevel){s+=.05*y;f=mix(mc(81,179,205),mc(123,202,218),1.-linearstep(-1.,kWaterLevel,i.y));for(int l=0;l<2;l++){float x=float(l),m=8.+3.*x,c=3.+x,h=i.x+c*s+4.1*float(l),d=mod(h,m)-m*.5,k=round(d/m),a=i.y-(-.7-.15*float(l));vec2 r=vec2(d-2.*(hash(k+x*6.1)-.5),a);float z=3.*(.6+.4*x),p=.06*(.6+.4*x);const float n=.01;float e=sdRhombus(r,vec2(z,p)),t=1.-smoothstep(-v-n,v+n,e);f=mix(f,mc(111,178,212),t);}f+=.4*smoothstep(-.5,1.5,i.x);}return f;}vec3 layerSun(in vec3 f,in vec2 v,in float i,in float l,in float y){const vec2 s=vec2(-.58,.2);float m=length(v-s);f+=vec3(.15,.09,.06)*(1.-smoothstep(-i-.02,i+.02,m-.36));f+=vec3(.15,.09,.06)*(1.-smoothstep(-i-.01,i+.01,m-.22));f+=vec3(.3,.2,.2)*(1.-smoothstep(-i-.002,i+.002,m-.14));return f;}vec3 layerCirrus(in vec3 f,in vec2 v,in float i,in float x,in float y){x+=.05*y;for(int l=0;l<3;l++){float s=float(l)/float(2),m=4.+4.*s,h=mod(v.x+x*(.3+.7*s)*.1+4.1*float(l),m)-m*.5,a=v.y-(.5+.2*float(l));vec2 r=vec2(h,a);const float n=.01;float d=2.*(.5+.5*s),c=.08*(.5+.5*s),p=sdRhombus(r,vec2(d,c)),k=1.-smoothstep(-i-n,i+n,p);f+=k*.1;}return f;}float sdfCloud(in vec2 f){float v=sdEllipse(f-vec2(.2,0.),.4,0.,.1).x;v=min(v,sdEllipse(f-vec2(-.2,0.),.2,0.,.06).x);v=min(v,sdEllipse(f-vec2(-.1,.08),.16,-.06,.16).x);v=min(v,sdCircle(f-vec2(.2,.12),.18,-.06));v=min(v,sdCircle(f-vec2(.04,.19),.12));v=min(v,sdCircle(f-vec2(.4,.08),.06));v=min(v,sdCircle(f-vec2(.28,.02),.08));return v;}vec3 layerCloud(in vec3 f,in vec2 v,in float i,in float m,in float x,in float l,in float s,in float y,in float r,in float n,in float c,in float d,in vec3 p){const float h=.12;x*=.05;float k=m+x,a=n+v.x+k*r,e=mod(a,s)-.5*s,t=floor(a/s),u=v.y-y+.6*(hash(t+c)-.5);u+=.1/l*(-1.+2.*smoothstep(-.2,.2,sin(10.*x+t*1.3+n+1.1*c)));e*=l;u*=l;{float z=sdVerticalCapsule(vec2(e-.04,u-.1),3.,.001),o=1.-smoothstep(-i-d*.25,i+d*.25,z);f=mix(f,5.*(l-1.)*vec3(.2,.4,.6),o);}if(dot2(vec2(e-.1,u-.1))>.5)return f;{float z=sdfCloud(vec2(e-.03,u+.03)),o=1.-smoothstep(-i-h,i+h,z);f=max(f-o*vec3(.4,.4,.3),0.);}{float z=sdfCloud(vec2(e,u)),o=1.-smoothstep(-i-d,i+d,z);f=mix(f,p,o);}return f;}vec3 kScaleRepSha(int f){if(f==0)return vec3(1.2,1.5,0.);else if(f==1)return vec3(1.,1.3,1.);else if(f==2)return vec3(1.,.6,0.);else if(f==3)return vec3(1.,.5,0.);else if(f==4)return vec3(1.,.5,1.);else if(f==5)return vec3(1.,.5,0.);else if(f==6)return vec3(.6,1.1,1.);else if(f==7)return vec3(1.,.3,1.);else return vec3(.8,.25,1.);}vec3 layerHills(in vec3 f,in vec2 i,in float v,in float m,in float l,vec3 s,vec3 r,in int y){float x=float(y)/8.;vec3 k=kScaleRepSha(y);vec2 h=k.xy;float d=k.z,p=1.+.3*float(y);i.y-=kWaterLevel;i/=p;v/=p;i.x+=m;float n=.0001+.02*pow(1.-x,2.),o=y>=7?.55:.4;if(i.y>o*h.y)return f;if(y>=7){for(int e=0;e<2;e++){const float c=.1;float z=.5*c*float(e)+.5*float(y),a=i.x+z;vec2 u=vec2(mod(a+.5*c,c)-.5*c,i.y);float t=round(a/c),C=t*c-z,g=.52+.48*sin(C*6.2831/6.);if(g<.6)continue;float E=hash(t+8.),R=hash(t+3.);u.y-=.1*g-.1-.05*R;float H=.04+.02*hash(t+7.),W=.12+.03*hash(t+11.);const float L=.0001;vec2 S=sdTriangleIsosceles(u,vec2(H,W));float w=1.-smoothstep(-v-L,v+L,S.x);f*=mix(smoothstep(0.,.02,S.x),1.,S.y);vec3 b=mix(mc(49,101,22),mc(68,110,139),smoothstep(.3,.8,S.y));f=mix(f,b,w);}}if(d>.5){for(int e=0;e<3;e++){float c=pow(.6,float(e)),z=.575*float(e)+.5*float(y),a=i.x+z;vec2 t=vec2(mod(a+.5*c,c)-.5*c,i.y);float u=round(a/c),S=u*c-z,W=mix(.52,.68,smoothstep(3.,0.,float(y))),g=W+(1.-W)*sin(S*6.2831/6.);if(g<.2)continue;float L=.05,w=smoothstep(.15,.3,t.y);vec3 b=f*mix(vec3(.1,.25,.4),vec3(1.),w);float C=sdEllipse(t-vec2(.02,-L),h.x*g*c*.5,L,L+h.y*g*c*.35).x,R=1.-smoothstep(-v*16.,v*16.,C);f=mix(f,b,R);}}for(int e=0;e<3;e++){float c=pow(.6,float(e)),z=.575*float(e)+.5*float(y),a=i.x+z;vec2 t=vec2(mod(a+.5*c,c)-.5*c,i.y);float u=round(a/c),S=u*c-z,W=mix(.52,.68,smoothstep(3.,0.,float(y))),g=W+(1.-W)*sin(S*6.2831/6.);if(g<.2)continue;const float L=.05;float b=h.x*g*c*.5,w=h.y*g*c*.35+L;vec2 C=sdEllipse(t-vec2(0.,-L),b,L,w);float R=1.-smoothstep(-v-n,v+n,C.x);vec3 H=mix(s,r,C.y)*(.5+.5*clamp(t.y/.03,0.,1.));f=mix(f,H,R);}if(y>=6){for(int e=0;e<3;e++){float c=pow(.6,float(e)),z=.575*float(e)+.5*float(y),a=i.x+z;vec2 t=vec2(mod(a+.5*c,c)-.5*c,i.y);float u=round(a/c),g=u*c-z,S=.52+.48*sin(g*6.2831/6.);if(S<.2)continue;const float L=.05;vec2 C=vec2(h.x*S*c*.5,L+h.y*S*c*.35);int W=clamp(int(C.x*(C.y-L)*300.),0,16);for(int w=0;w<16;w++){float R=16.*u+float(w);vec2 b=sin(R+vec2(0.,2.));b.y=abs(b.y);float H=hash(R),E=.03*(3./p)*(.2+.8*H),T=.05*(3./p)*(.2+.8*H);vec2 D=t-vec2(0.,-L)-vec2(.6,.6)*C*b,M=sdEllipse(D,E,0.,T);float B=1.-smoothstep(-v-.001,v+.001,M.x);f=mix(f,mix(f,mc(60,86,20),M.y),B);if(w==W){break;}}}}return f;}vec3 layerHillsRef(in vec3 f,in vec2 i,in float v,in float m,in float l,vec3 y,vec3 s,in int e){float c=smoothstep(-1.,kWaterLevel,i.y),a=float(e)/8.;vec3 h=kScaleRepSha(e);vec2 t=h.xy;float x=h.z,p=1.+.3*float(e);i.y-=kWaterLevel;i/=p;v/=p;i.x+=m;float z=.003,r=1e+20;for(int u=0;u<3;u++){float g=x*pow(.6,float(u)),L=.575*float(u)+.5*float(e),S=i.x+L;vec2 d=vec2(mod(S+.5*g,g)-.5*g,i.y);float k=round(S/g),C=k*g-L,W=mix(.52,.68,smoothstep(3.,0.,float(e))),w=W+(1.-W)*sin(C*6.2831/6.);if(w<.2)continue;const float n=.05;vec2 b=vec2(t.x*w*g*.5,n+t.y*w*g*.35);d.y=-d.y;r=min(r,sdEllipse(d-vec2(0.,-n),b.x,n,b.y).x);}float u=1.-smoothstep(-v-z,v+z,r);u*=c;f=mix(f,mix(y,s,1.-c),u);return f;}vec3 layerFoam(in vec3 f,in vec2 v,in float i,in float x,in float y){const float m=3.;x+=.05*y;float l=.1+v.x+x*4.,e=mod(l,m)-.5*m,a=floor(l/m),s=v.y+.8+.2*(hash(a+1.1)-.5);e-=m*.4*(hash(a+7.1)-.5);float z=hash(a+8.2);for(int c=0;c<4;c++){vec2 u=sin(float(c)*1.2+z+vec2(0.,1.6));float t=.5+.5*hash(a+float(c)+9.4);{const float n=.005;float p=sdEllipse(vec2(e,s+n)-u*.45*vec2(1.,.1),t*(.3-n),.01),g=1.-smoothstep(-i-n,i+n,p);f=max(f-g*vec3(.6),0.);}{const float n=.001;float p=sdEllipse(vec2(e,s)-u*.45*vec2(1.,.1),t*.3,.01),w=1.-smoothstep(-i-n,i+n,p);f=mix(f,mc(176,220,223),w);}}return f;}float sdDuckBody(in vec2 f,in float i){float v=sdCircle(f,i*.05,i*.015);return min(v,sdEllipse(f-vec2(-i*.035,i*.015),i*.017,0.,i*.07).x);}vec3 layerDucks(in vec3 f,in vec2 v,in float i,in float m,in float c,float y){const float s=2.;if(v.y>kWaterLevel)return f;c*=.05;float l=m+c,x=5.+1.5*y,a=.1+v.x+l*x,e=mod(a,s)-.5*s,t=floor(a/s);if(hash(t*1.3+27.7+y*7.2)>.6)return f;float u=v.y+.75+.2*y+.1*(hash(t+3.8+y*1.4)-.5);e-=s*.6*(hash(t+17.7+y*3.7)-.5);e+=s*.2*sin(20.*c+t+y);float z=.8+.2*hash(t+21.3+y*5.3)+.1*y;if(dot2(vec2(e,u))>.01*z)return f;float p=x+.2*s*20.*cos(20.*c+t+y),k=-1.+2.*smoothstep(-1.,1.,p);e/=k;{float n=0.,w=sdDuckBody(vec2(e,-u+z*.01),z),g=1.-smoothstep(-i-n,i+n,w);g*=.4;f=mix(f,mc(238,248,250),g);}float n=0.;{float w=sdDuckBody(vec2(e,u),z);f*=mix(1.,.7+.3*smoothstep(0.,6.*i,w),smoothstep(0.,z*.1,u));float g=1.-smoothstep(-i-n,i+n,w);f=mix(f,mc(238,248,250),g);}{float w=sdEllipse(vec2(e+z*.05,u-z*.065),z*.013,z*.007),g=1.-smoothstep(-i-n,i+n,w);f=mix(f,mc(244,139,48),g);}{float w=sdCircle(vec2(e+z*.033,u-z*.072),z*.005);f*=smoothstep(-i-n,i+n,w);}return f;}float sdfMonster(in vec2 f,in float v){f.x=.36-f.x;f.x-=.06*sin(2.*v)*smoothstep(.5,0.,f.y);float i=sdEllipse(f-vec2(0.,-.16),.5,.35);i=min(i,sdEllipse(f-vec2(.615,.14),.4,.53));i=max(i,-sdEllipse(f-vec2(.835,.23),.36,.46));i=min(i,sdEllipse(f-vec2(.605,.543),.2,.08));i=min(i,sdCircle(f-vec2(.668,.587),.078));i=max(i,-f.y);return i;}vec3 layerMonster(in vec3 f,in vec2 v,in float i,in float x,in float m){const float y=60.,s=600.;x+=.05*(m-s);float e=v.x+x*5.5,a=mod(e+y*.5,y)-.5*y,c=v.y+.8;const float l=1.5;if(dot2(vec2(a-.1,c-.1))>.6/(l*l))return f;{float n=.01,w=sdfMonster(l*vec2(a,-c),m)/l,g=1.-smoothstep(-i-n,i+n,w);f=mix(f,mc(21,64,90),.7*g*(1.-linearstep(0.,.15,-c)));}{float n=0.,w=sdfMonster(l*vec2(a,c),m)/l,z=1.-smoothstep(-i-n,i+n,w);f=mix(f,mc(21,64,90),z);}return f;}uniform vec2 iResolution;uniform lowp float u_opacity,iTimeAni,iTimeCam,camSpeed;
    void main(){float f=iTimeAni,i=iTimeCam;vec2 fc=v_texcoord*iResolution;vec2 v=(2.*fc.xy-iResolution.xy)/iResolution.y;v.y=-v.y;float m=2./iResolution.y;vec3 e;if(v.y>kWaterLevel)e=layerBackground(v,m,i,f),e=layerSun(e,v,m,i,f),e=layerCirrus(e,v,m,i,f),e=layerCloud(e,v,m,i,f,1.2,2.,.3,.9,0.,0.,.02,mc(181,224,238)),e=layerHills(e,v,m,i,f,mc(120,194,221),mc(120,194,221),0),e=layerHills(e,v,m,i,f,mc(84,174,227),mc(84,174,227),1),e=layerCloud(e,v,m,i,f,1.1,2.2,.2,1.1,1.,.6,.008,mc(231,250,248)),e=layerCloud(e,v,m,i,f,1.,3.,.1,1.3,6.1,.3,.002,mc(255,255,255)),e=layerHills(e,v,m,i,f,mc(52,153,206),mc(52,153,206),2),e=layerHills(e,v,m,i,f,mc(52,145,186),mc(52,145,186),3),e=layerHills(e,v,m,i,f,mc(29,106,160),mc(29,106,160),4),e=layerHills(e,v,m,i,f,mc(44,90,74),mc(44,90,74),5),e=layerHills(e,v,m,i,f,mc(24,78,56),mc(24,70,93),6),e=layerHills(e,v,m,i,f,mc(32,43,3),mc(32,43,3),7),e=layerHills(e,v,m,i,f,mc(32,43,3),mc(32,43,3),8);else e=layerWater(e,v,m,i,f),e=layerHillsRef(e,v,m,i,f,mc(63,116,108),mc(91,184,208),7),e=layerHillsRef(e,v,m,i,f,mc(41,76,54),mc(57,149,168),8),e=layerFoam(e,v,m,i,f),e=layerDucks(e,v,m,i,f,0.);float y=1.-linearstep(.022,.025,abs(v.y-kWaterLevel));e=mix(e,mc(30,54,25),y);e=layerMonster(e,v,m,i,f),e=layerDucks(e,v,m,i,f,1.);e=pow(e,vec3(.4545));gl_FragColor=vec4(e,u_opacity);}
`;
        var parameters = {
            "speed": { name: LocalizedString("Speed"), type: "range", min: 0.01, max: 0.5, default: 0.05 },
            "camSpeed": { name: LocalizedString("Camera"), type: "range", min: 0.01, max: 0.4, default: 0.05, },
        };

        super(fragment, ["iTimeAni", "iTimeCam", "iResolution", "u_opacity"], parameters);
    }
    prepare(gl, program, timestamp) {
        gl.uniform1f(program.uniforms.speed, this.speed);
        gl.uniform1f(program.uniforms.camSpeed, this.camSpeed);

        var lastTimestamp = this.lastTimestamp;
        if (lastTimestamp == null) {
            lastTimestamp = timestamp;
        }
        this.lastTimestamp = timestamp;

        var delta = (timestamp - lastTimestamp);

        var timeCam = this.lastTimeCam;
        if (timeCam == null) {
            timeCam = 0;
        }
        timeCam += delta * this.speed * this.camSpeed;
        this.lastTimeCam = timeCam;

        var timeAni = this.lastTimeAni;
        if (timeAni == null) {
            timeAni = 0;
        }
        timeAni += delta * this.speed;
        this.lastTimeAni = timeAni;


        gl.uniform1f(program.uniforms.iTimeAni, timeAni);
        gl.uniform1f(program.uniforms.iTimeCam, timeCam);
    }
    reset() {
        super.reset();
        this.lastTimeAni = 0;
        this.lastTimeCam = 0;
        this.lastTimestamp = null;
    }
    toJSON() {
        var r = super.toJSON();
        var timeCam = this.lastTimeCam;
        if (timeCam != null) {
            r.timeCam = timeCam;
        }
        var timeAni = this.lastTimeAni;
        if (timeAni != null) {
            r.timeAni = timeAni;
        }
        return r;
    }
    applyEvent(event, sender) {
        super.applyEvent(event, sender);
        var timeAni = event.timeAni;
        if (timeAni != null) {
            this.lastTimeAni = timeAni;
        }
        var timeCam = event.timeCam;
        if (timeCam != null) {
            this.lastTimeCam = timeCam;
        }
    }
}
