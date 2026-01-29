//
//  waves.js
//  mmhmm
//
//  Created by Steve White on 11/9/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//

Room.Shader.Waves = class extends Room.Shader {
    constructor() {
        super(
            "e84d7258-4f4c-4c22-9b93-9272f92bdafa",
            LocalizedString("Waves"),
            "waves_thm.png",
            new Room.Shader.Waves.Filter(),
            true
        );
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);
    }
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);
        this.shader.lastTimestamp = null;
        this.shader.lastTime = null;
    }
    async thumbnailForState(state) {
        // We are not a light weight shader, so trying
        // to snapshot a GL context is ill advised.

        var styles = ["ocean", "sand", "storm"];
        var styleName = styles[this.shader.style];
        if (styleName == null) {
            styleName = styles[0];
        }
        var path = `assets/rooms/waves_${styleName}.jpg`
        return new LocalAsset({contentURL: path}).openAsElement();
    }
    doesParameterKeyAffectThumbnail(key) {
        return (key == "style");
    }
}
/**
 * @extends {Room.Shader.Filter}
 * @property {number} speed Valid ranges 0.01<->1.0
 * @property {number} scale Valid ranges 0.3<->0.9
 * @property {0|1|2} style
 */
Room.Shader.Waves.Filter = class extends Room.Shader.Filter {
    constructor() {
        var fragment = `
precision mediump float;
precision highp int;
varying vec2 v_texcoord;
uniform lowp float uScale; uniform float uTime;uniform vec2 iResolution;uniform lowp float u_opacity;uniform vec3 kColor[15];uniform sampler2D uAudio;
void main(){float e=uTime;vec2 u=vec2(v_texcoord.x, 1.0-v_texcoord.y);float v=1./iResolution.y;vec3 f=vec3(0.,0.,0.);for(int y=0;y<45;y++){float i=float(y)/44.,a=1.4*i-.8,r=2.*u.x-1.,m=10.*exp2(-5.*a*a),t=.2*exp2(-6.*a*a)*exp2(-2.*r*r)*uScale,o=sin(i*123.)*2.;t*=1.+texture2D(uAudio,vec2(i*.25,.25)).w;float x=1.-i+t*sin(u.x*m+o+.02*m*(m+o)*e);f*=1.-.25*exp2(-60.*max(0.,u.y-x));vec3 s=kColor[y/3];s*=smoothstep(.5*v,2.*v,abs(x-u.y));float k=smoothstep(-v,v,x-u.y);f=mix(f,s,k);}gl_FragColor=vec4(f,u_opacity);}`;
        var parameters = {
            "speed": { name: LocalizedString("Speed"), type: "range", min: 0.01, max: 1.0, default: 0.3 },
            "scale": { name: LocalizedString("Wave Height"), type: "range", min: 0.3, max: 0.9, default: 0.65, },
            "style": {
                name: LocalizedString("Style"),
                type: "select",
                default: 0,
                values: [
                    LocalizedString("Ocean"),
                    LocalizedString("Sand"),
                    LocalizedString("Storm"),
                ]
            },
        };

        super(fragment, ["uTime", "iResolution", "uScale", "kColor", "u_opacity", "uAudio"], parameters);
    }
    set style(aStyle) {
        if (aStyle == null) {
            aStyle = 0;
        }
        aStyle = clamp(aStyle, 0, 2);
        if (aStyle == this._style) {
            return;
        }
        switch (aStyle) {
            case 0: // Ocean
                this.palette = [
                    0.03, 0.06, 0.30, 0.04, 0.15, 0.40, 0.05, 0.27, 0.48, 0.07, 0.32, 0.56,
                    0.10, 0.48, 0.66, 0.13, 0.64, 0.73, 0.25, 0.77, 0.78, 0.36, 0.81, 0.74,
                    0.47, 0.85, 0.73, 0.16, 0.66, 0.67, 0.58, 0.89, 0.74, 0.40, 0.81, 0.80,
                    0.69, 0.90, 0.76, 0.55, 0.89, 0.89, 0.81, 0.95, 0.84
                ];
                break;
            case 1: // Sand
                this.palette = [
                    0.22, 0.29, 0.42, 0.27, 0.33, 0.44, 0.38, 0.38, 0.45, 0.56, 0.50, 0.52,
                    0.64, 0.56, 0.51, 0.78, 0.67, 0.55, 0.86, 0.73, 0.60, 0.87, 0.75, 0.64,
                    0.93, 0.82, 0.75, 0.68, 0.58, 0.53, 0.93, 0.82, 0.75, 0.86, 0.74, 0.61,
                    0.96, 0.89, 0.80, 0.89, 0.80, 0.70, 0.98, 0.93, 0.85
                ];
                break;
            case 2: // Storm
                this.palette = [
                    0.19, 0.20, 0.25, 0.25, 0.27, 0.32, 0.32, 0.36, 0.41, 0.40, 0.47, 0.50,
                    0.45, 0.54, 0.56, 0.55, 0.63, 0.63, 0.62, 0.70, 0.68, 0.68, 0.75, 0.72,
                    0.77, 0.82, 0.79, 0.45, 0.54, 0.54, 0.77, 0.82, 0.79, 0.64, 0.71, 0.71,
                    0.84, 0.87, 0.85, 0.76, 0.81, 0.81, 0.91, 0.93, 0.91
                ];
                break;
        }
        this._style = aStyle;
    }
    get style() {
        return this._style;
    }
    initialize(gl, program, renderer) {
        var dataLength = 512;

        program.data = {
            frequency: new Uint8Array(dataLength),
            timeDomain: new Uint8Array(dataLength),
            combined: new Uint8Array(dataLength * 2),
        };
        program.textures = {
            // XXX: This may cause a problem if the
            // context is lost/restored.
            audio: renderer.newTexture(
                gl.ALPHA /*format*/ ,
                gl.UNSIGNED_BYTE /*type*/ ,
                SizeMake(dataLength, 2),
                null /*wrap*/
            ),
        }

        var combined = program.data.combined;
        this.textureContents = new RendererArrayContents(combined, combined.length / 2, 2);
    }
    prepare(gl, program, timestamp, renderer) {
        var freqData = program.data.frequency;
        var waveData = program.data.timeDomain;
        freqData.fill(0x00);
        waveData.fill(0x00);

        var combined = program.data.combined;
        combined.set(freqData);
        combined.set(waveData, freqData.length);

        var texture = program.textures.audio;
        // Avoid fighting with the renderer that
        // may want to bind layer contents to TEXTURE0
        gl.activeTexture(gl.TEXTURE1);

        this.textureContents.updateTexture(renderer, gl, texture);

        gl.uniform1i(program.uniforms.uAudio, 1);
        gl.activeTexture(gl.TEXTURE0);

        gl.uniform1f(program.uniforms.uScale, this.scale);
        gl.uniform3fv(program.uniforms.kColor, this.palette);

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
