//
//  hexagons.js
//  mmhmm
//
//  Created by Steve White on 8/9/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//

Room.Shader.Hexagons = class extends Room.Shader {
    constructor() {
        super(
            "dd12e631-f1e1-45c3-87ba-ad28ed20081d",
            LocalizedString("Hexagons"),
            "hexagons-thumb.png",
            new Room.Shader.Hexagons.Filter(),
            true
        );
    }
    async thumbnailForState(state) {
        // We are not a light weight shader, so trying
        // to snapshot a GL context is ill advised.

        var styles = ["neutral", "light", "dark"];
        var styleName = styles[this.shader.style];
        if (styleName == null) {
            styleName = styles[0];
        }
        // TODO we could pre-create these
        var path = `assets/rooms/hexagons_${styleName}.jpg`
        return new LocalAsset({contentURL: path}).openAsElement();
    }
    doesParameterKeyAffectThumbnail(key) {
        return (key == "style");
    }
}

Room.Shader.Hexagons.Filter = class extends Room.Shader.Filter {
    constructor() {
        const fragment = `
precision mediump float;

#define AA 1

varying vec2 v_texcoord;
int v(int v){v+=768;float i=float(v)/3.;return int((ceil(i)-i)*float(v));}int v(int v,int i){i+=1;float f=float(v)/float(i);return int((f-floor(f))*float(i));}ivec2 f(vec2 i){float f=1.73205;vec2 y=vec2(i.x,i.y*f*.5+i.x*.5);ivec2 d=ivec2(floor(y));vec2 n=fract(y);int t=v(d.x+d.y),o=t<1?0:1,x=t<2?0:1;ivec2 s=n.x>n.y?ivec2(0,1):ivec2(1,0),e=d+o-x*s;e=ivec2(e.x,e.y-(e.x+e.y)/3);return e;}vec2 t(in ivec2 v){float f=1.73205;return vec2(float(v.x),float(v.y)*f);}const float i=4.;float f(vec2 v,in float f){v*=.5;float e=.5+.5*sin(.53*v.x+.1*f+sin(v.y*.13))*sin(.13*v.y+.17*f);e*=.75+.25*sin(3.7*v.x+.32*f)*sin(2.3*v.y+f*1.1);return i*e;}vec4 f(in vec3 v,in vec3 i,in float x,out ivec2 e,out int y){ivec2 d=f(v.xz);e=ivec2(0,0);y=0;vec4 s=vec4(-1.,0.,0.,0.);float o=.866025;vec2 n=vec2(1.,0.),c=vec2(.5,o),A=vec2(-.5,o);float z=1./dot(i.xz,n),g=1./dot(i.xz,c),m=1./dot(i.xz,A),p=1./i.y,r=z<0.?-1.:1.,u=g<0.?-1.:1.,a=m<0.?-1.:1.,w=p<0.?-1.:1.;ivec2 k=ivec2(2,0);if(z<0.)k=-k;ivec2 l=ivec2(1,1);if(g<0.)l=-l;ivec2 b=ivec2(-1,1);if(m<0.)b=-b;for(int R=0;R<100;R++){vec2 F=t(d);float C=.5*f(F,x);vec3 T=v-vec3(F.x,C,F.y);vec2 Z=(vec2(-r,r)-dot(T.xz,n))*z,Y=(vec2(-u,u)-dot(T.xz,c))*g,X=(vec2(-a,a)-dot(T.xz,A))*m,W=(vec2(-w,w)*C-T.y)*p;int V=0;vec4 U=vec4(Z.x,r*vec3(n.x,0,n.y));V=z<0.?-1:1;if(Y.x>U.x)U=vec4(Y.x,u*vec3(c.x,0,c.y)),V=g<0.?-2:2;if(X.x>U.x)U=vec4(X.x,a*vec3(A.x,0,A.y)),V=m<0.?-3:3;if(W.x>U.x)U=vec4(W.x,w*vec3(0.,1,0)),V=p<0.?4:-4;float S=min(min(Z.y,Y.y),min(X.y,W.y));if(U.x<S&&S>0.){s=U;e=d;y=V;break;}if(Z.y<Y.y&&Z.y<X.y)d+=k;else if(Y.y<X.y)d+=l;else d+=b;}return s;}float s(float v){return acos(clamp(v,-1.,1.));}float f(in vec3 v,in vec3 i,in vec3 x,in vec3 f,in vec3 o,in vec3 y){x=normalize(x-v);f=normalize(f-v);o=normalize(o-v);y=normalize(y-v);float d=dot(i,normalize(cross(x,f)))*s(dot(x,f)),n=dot(i,normalize(cross(f,o)))*s(dot(f,o)),e=dot(i,normalize(cross(o,y)))*s(dot(o,y)),A=dot(i,normalize(cross(y,x)))*s(dot(y,x));return abs(d+n+e+A)/6.28319;}float f(in vec3 v,in vec3 i,in vec3 x,in vec3 f,in vec3 o,in vec3 y,in vec3 d,in vec3 e){x=normalize(x-v);f=normalize(f-v);o=normalize(o-v);y=normalize(y-v);d=normalize(d-v);e=normalize(e-v);float t=dot(i,normalize(cross(x,f)))*s(dot(x,f)),n=dot(i,normalize(cross(f,o)))*s(dot(f,o)),A=dot(i,normalize(cross(o,y)))*s(dot(o,y)),V=dot(i,normalize(cross(y,d)))*s(dot(y,d)),r=dot(i,normalize(cross(d,e)))*s(dot(d,e)),c=dot(i,normalize(cross(e,x)))*s(dot(e,x));return abs(t+n+A+V+r+c)/6.28319;}const ivec2 y=ivec2(2,0),o=ivec2(1,1),n=ivec2(-1,1);const float e=1.1547,x=e*.5,d=e;bool s(ivec2 v,in vec2 i,in float o,in float d,out vec3 e,out vec3 r,out vec3 s,out vec3 n){vec3 V=vec3(i.x,0.,i.y);float c=f(t(v+y),d);if(c<o)return false;e=V+vec3(1.,o,x);r=V+vec3(1.,c,x);s=V+vec3(1.,c,-x);n=V+vec3(1.,o,-x);return true;}bool t(ivec2 v,in vec2 i,in float o,in float y,out vec3 e,out vec3 r,out vec3 s,out vec3 V){vec3 U=vec3(i.x,0.,i.y);float c=f(t(v-n),y);if(c<o)return false;e=U+vec3(1.,o,-x);r=U+vec3(1.,c,-x);s=U+vec3(0.,c,-d);V=U+vec3(0.,o,-d);return true;}bool v(ivec2 v,in vec2 i,in float y,in float n,out vec3 e,out vec3 r,out vec3 s,out vec3 V){vec3 U=vec3(i.x,0.,i.y);float c=f(t(v-o),n);if(c<y)return false;e=U+vec3(0.,y,-d);r=U+vec3(0.,c,-d);s=U+vec3(-1.,c,-x);V=U+vec3(-1.,y,-x);return true;}bool r(ivec2 v,in vec2 i,in float o,in float d,out vec3 e,out vec3 r,out vec3 s,out vec3 V){vec3 n=vec3(i.x,0.,i.y);float c=f(t(v-y),d);if(c<o)return false;e=n+vec3(-1.,o,-x);r=n+vec3(-1.,c,-x);s=n+vec3(-1.,c,x);V=n+vec3(-1.,o,x);return true;}bool a(ivec2 v,in vec2 i,in float o,in float y,out vec3 e,out vec3 r,out vec3 s,out vec3 V){vec3 U=vec3(i.x,0.,i.y);float c=f(t(v+n),y);if(c<o)return false;e=U+vec3(-1.,o,x);r=U+vec3(-1.,c,x);s=U+vec3(0.,c,d);V=U+vec3(0.,o,d);return true;}bool w(ivec2 v,in vec2 i,in float y,in float c,out vec3 e,out vec3 r,out vec3 s,out vec3 V){vec3 n=vec3(i.x,0.,i.y);float z=f(t(v+o),c);if(z<y)return false;e=n+vec3(0.,y,d);r=n+vec3(0.,z,d);s=n+vec3(1.,z,x);V=n+vec3(1.,y,x);return true;}void a(ivec2 v,in vec2 i,in float o,in float f,out vec3 e,out vec3 r,out vec3 y,out vec3 s,out vec3 c,out vec3 V){vec3 n=vec3(i.x,0.,i.y);e=n+vec3(0.,o,-d);r=n+vec3(-1.,o,-x);y=n+vec3(-1.,o,x);s=n+vec3(0.,o,d);c=n+vec3(1.,o,x);V=n+vec3(1.,o,-x);}float a(in vec3 i,in vec3 x,in float c,in ivec2 d,in int e){vec3 z,A,u,V,m,k;if(e==-1)d+=y;else if(e==1)d-=y;else if(e==-2)d+=o;else if(e==2)d-=o;else if(e==-3)d+=n;else if(e==3)d-=n;vec2 U=t(d);float F=f(U,c),l=0.;if(e!=1&&s(d,U,F,c,z,A,u,V))l+=f(i,x,z,A,u,V);if(e!=-3&&t(d,U,F,c,z,A,u,V))l+=f(i,x,z,A,u,V);if(e!=-2&&v(d,U,F,c,z,A,u,V))l+=f(i,x,z,A,u,V);if(e!=-1&&r(d,U,F,c,z,A,u,V))l+=f(i,x,z,A,u,V);if(e!=3&&a(d,U,F,c,z,A,u,V))l+=f(i,x,z,A,u,V);if(e!=2&&w(d,U,F,c,z,A,u,V))l+=f(i,x,z,A,u,V);if(e!=4){a(d,U,F,c,z,A,u,V,m,k);l+=f(i,x,z,A,u,V,m,k);}return 1.-l;}vec3 a(in vec3 d,in vec3 o,in float x,int y){ivec2 c;int V;vec4 n=f(d,o,x,c,V);float s=n.x;vec3 e=d+o*s,z=-n.yzw;vec2 r=t(c);float U=f(r,x),A=a(e,z,x,c,V);vec3 u;if(y==1){u=vec3(.85,.9,1.)+vec3(.1,.05,0.)*U/i;float l=U/i;u*=.8+.2*l;A=A*A*.3+.7*A;}else if(y==2){float l=U/i;u=vec3(.008,.012,.025)*.5+.005*vec3(.1,.63,0.)*l*l;u*=.2+5.*l;A=(A*A+A)*.5;}else{int l=c.x*131+c.y*57;l=l*l*l/8192;u=v(l,1)==1?vec3(2.4,2.9,3.4):vec3(5.1,5.25,5.2);u=.5+.5*sin(float(v(l,255))*.005+u);u*=.05+.95*float(v(l,3))/3.;u=pow(u,vec3(.8,.95,1.));A=(A*A+A)*.5;}return u*A;}uniform lowp float scale;uniform int style;uniform float uTime;uniform vec2 iResolution;uniform lowp float u_opacity;
void main(){vec2 fc=v_texcoord*iResolution;vec3 i=vec3(0.);for(int v=0;v<AA;v++){for(int o=0;o<AA;o++){vec2 y=vec2(v,o)/float(AA)-.5,c=(2.*(fc.xy+y)-iResolution.xy)/min(iResolution.x,iResolution.y);float f=.5+.5*sin(fc.x*147.)*sin(fc.y*131.),x=uTime-.5*(1./24.)*(float(v*AA+o)+f)/float(AA*AA),z=10.+20.*scale;vec3 e=vec3(.01,z,0.),A=normalize(vec3(c.y,-2.,c.x)),n=a(e,A,x,style);i+=n;}}i/=float(AA*AA);i=pow(clamp(i,0.,1.),vec3(.45));vec2 v=fc.xy/iResolution.xy;i*=.5+.5*pow(16.*v.x*v.y*(1.-v.x)*(1.-v.y),.1);gl_FragColor=vec4(i,u_opacity);}
`;
        var parameters = {
            "speed": { name: LocalizedString("Speed"), type: "range", min: 0.01, max: 1.0, default: 0.5 },
            "scale": { name: LocalizedString("Scale"), type: "range", min: 0.01, max: 0.4, default: 0.05, },
            "style": {
                name: LocalizedString("Style"),
                type: "select",
                default: 1,
                values: [
                    LocalizedString("Neutral"),
                    LocalizedString("Light"),
                    LocalizedString("Dark"),
                ]
            },
        };
        super(fragment, ["uTime", "iResolution", "style", "scale", "u_opacity"], parameters);
    }
    prepare(gl, program, timestamp) {
        gl.uniform1f(program.uniforms.scale, this.scale);
        gl.uniform1i(program.uniforms.style, this.style);

        var lastTimestamp = this.lastTimestamp;
        if (lastTimestamp == null) {
            lastTimestamp = timestamp;
        }
        var time = this.lastTime;
        if (time == null) {
            time = 0;
        }
        time += (timestamp - lastTimestamp) * this.speed;

        this.lastTime = time;
        this.lastTimestamp = timestamp;
        gl.uniform1f(program.uniforms.uTime, time);
    }
    reset() {
        super.reset();
        this.lastTime = 0;
        this.lastTimestamp = null;
    }
    toJSON() {
        var r = super.toJSON();
        var time = this.lastTime;
        if (time != null) {
            r.time = time;
        }
        return r;
    }
    applyEvent(event, sender) {
        super.applyEvent(event, sender);
        var time = event.time;
        if (time != null) {
            this.lastTime = time;
        }
    }
}
