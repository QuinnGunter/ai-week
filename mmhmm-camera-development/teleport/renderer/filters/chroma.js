//
//  chroma.js
//  mmhmm
//
//  Created by Steve White on 7/29/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

//
// Please refer to xxx
// for non-minified shader source
//

class ChromaFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor() {
        const fragment = `
precision mediump float;

varying vec2 v_texcoord;uniform sampler2D u_texture;uniform lowp float u_opacity;
uniform vec2 iResolution;
uniform vec3 keyRGB;
uniform vec2 range;
uniform lowp vec4 u_background;

#define float2 vec2
#define float3 vec3
#define float4 vec4

float2 RGBToCC(float3 rgb) {
    float Y = 0.2989 * rgb.r + 0.5866 * rgb.g + 0.1145 * rgb.b;
    return float2((rgb.b - Y) * 0.5647, (rgb.r - Y) * 0.7132);
}

float3 YCCToRGB(float y, float cb, float cr) {
    float3 c = float3(y,cb,cr);
    float r = c.x + 1.40213 * c.z;
    float g = c.x - 0.34565 * c.y - 0.71445 * c.z;
    float b = c.x + 1.77085 * c.y;
    return float3(r,g,b);
}

void main( )
{
    vec2 q = v_texcoord;

    vec4 pix = texture2D( u_texture, q );
    if (pix.a == 0.0) {
        discard;
    }

    float3 rgb_blur = pix.rgb;

    float2 CC = RGBToCC(rgb_blur);
    float2 keyCC = RGBToCC(keyRGB);

    float dist_val = distance(float2(keyCC.x, keyCC.y), float2(CC.x, CC.y));
    float mask = smoothstep(range.x, range.y, dist_val);

    vec4 fg;

    if (mask <= 0.0) {
        fg = vec4(0.0);
    }
    else if (mask >= 1.0) {
        fg = vec4(pix.rgb, pix.a);
    }
    else {
        float Y = 0.2989 * pix.r + 0.5866 * pix.g + 0.1145 * pix.b;
        float2 diffCC = CC - keyCC;

        float degreen_factor = clamp(dist_val / range.y, 0.0, 1.0);
        float2 shiftedCC = keyCC + diffCC / (degreen_factor + 0.0001);

        float3 rgb_new = YCCToRGB(Y, shiftedCC.x, shiftedCC.y);
        fg = float4(rgb_new * mask, mask);
    }

    //vec4 col = mix(fg, u_background, 1.0 - fg.a);
    vec4 col = (u_background * (1.0 - fg.a)) + fg;
    gl_FragColor = vec4(col.rgb, col.a * u_opacity);
}
`;
        var parameters = {
            keyRGB: {
                default: [0, 1, 0]
            },
            rangeLow: {
                default: 0.4
            },
            rangeHigh: {
                default: 0.5
            },
        };
        super(fragment, ["u_texture", "u_opacity", "u_background", "range", "keyRGB"], parameters);
        this.modifiesContents = true;
        this.backgroundColor = [0, 0, 0, 0];
        this.automaticallyNotifiesObserversOfRange = false;
    }
    containsPoint(point, layer) {
        var color = this.backgroundColor;
        if (color == null || color[3] <= 0) {
            return null;
        }
        return RectContainsPoint(layer.frame, point);
    }
    set rangeLow(value) {
        var previous = this._rangeLow;
        var current = clamp(value, 0, 1);
        if (current == previous) {
            return;
        }
        this._rangeLow = current;
        this.updateRange();
    }
    get rangeLow() {
        return this._rangeLow ?? 0;
    }
    set rangeHigh(value) {
        var previous = this._rangeHigh;
        var current = clamp(value, 0, 1);
        if (current == previous) {
            return;
        }
        this._rangeHigh = current;
        this.updateRange();
    }
    get rangeHigh() {
        return this._rangeHigh ?? 0;
    }
    updateRange() {
        this.range = [this.rangeLow, this.rangeHigh];
        this.didChangeValueForProperty(this.range, "range");
    }
    prepare(gl, program, timestamp, renderer, layer, contentsTexture) {
        gl.uniform2fv(program.uniforms.range, this.range);
        gl.uniform3fv(program.uniforms.keyRGB, this.keyRGB);

        var backgroundColor = this.backgroundColor;
        if (backgroundColor == null) {
            backgroundColor = [0,0,0,0];
            this.backgroundColor = backgroundColor;
        }
        gl.uniform4fv(program.uniforms.u_background, backgroundColor);
    }
}

ChromaFilter.identifier = "b0146ea1-464d-4df9-be34-7ed109d69ee9";
