//
//  presenters/provider/filter.js
//  mmhmm
//
//  Created by Steve White on 11/11/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class PresenterVideoFilter extends RenderFilter {
    constructor(pixelFormat) {
        super();
        this.pixelFormat = pixelFormat;
    }
    willCompileInRenderer(renderer) {
        const format = this.pixelFormat;
        const fragment = `
precision highp float;
varying vec2 v_texcoord;
uniform sampler2D sTextureRGB;
uniform sampler2D sTextureY;
uniform sampler2D sTextureU;
uniform sampler2D sTextureV;
uniform sampler2D sTextureUV;
uniform sampler2D sTextureA;
uniform lowp float u_opacity;

#define true 1
#define false 0

void applyTextureRGB(inout vec4 color, vec2 coord) {
    color.rgb = texture2D(sTextureRGB, coord).rgb;
}

void applyTextureNV12(inout vec4 color, vec2 coord) {
    const mat3 yuv2rgb = mat3(
        1.164, 0.0, 1.596,
        1.164, -0.391, -0.813,
        1.164, 2.018, 0.0
    );

    vec3 yuv = vec3(
        texture2D(sTextureY,  coord).r  - 0.0625,
        texture2D(sTextureUV, coord).ra - 0.5
    );

    color.rgb = vec3(
        dot(yuv, yuv2rgb[0]),
        dot(yuv, yuv2rgb[1]),
        dot(yuv, yuv2rgb[2])
    );

    color.a = 1.0;
}

void applyTextureI420(inout vec4 color, vec2 coord) {
    vec3 yuv = vec3(
        texture2D(sTextureY, coord).r - 0.062745,
        texture2D(sTextureU, coord).r - 0.501960,
        texture2D(sTextureV, coord).r - 0.501960
    );
    const mat3 YUVtoRGBCoeffMatrix = mat3(
        1.164383,  1.164383, 1.164383,
        0.000000, -0.391762, 2.017232,
        1.596027, -0.812968, 0.000000
    );

    color.rgb = YUVtoRGBCoeffMatrix * yuv;
    color.a = 1.0;
}

void applyTextureAlpha(inout vec4 color, vec2 coord) {
    color.a = texture2D(sTextureA, coord).a;
}

void main(void) {
    vec4 color = vec4(0.0);
    vec2 coord = v_texcoord;
#if ${format == "RGBA" || format == "BGRA"}
    applyTextureRGB(color, coord);
#endif
#if ${format.startsWith("NV12")}
    applyTextureNV12(color, coord);
#endif
#if ${format.startsWith("I420")}
    applyTextureI420(color, coord);
#endif
#if ${format.endsWith("A")}
    applyTextureAlpha(color, coord);
#endif
    color.a *= u_opacity;
    gl_FragColor = color;
}
`;
        const uniforms = this.textureMap.map(a => a.uniform);
        uniforms.push("u_opacity");

        this.fragment = fragment;
        this.uniforms = uniforms;
    }
    _rebuildTextureMap() {
        const format = this.pixelFormat;
        let textureMap = [];
        if (format.startsWith("NV12") == true) {
            textureMap.push({ index: 0, uniform: 'sTextureY',  size: 'full', format: 'LUMINANCE' });
            textureMap.push({ index: 1, uniform: 'sTextureUV', size: 'half', format: 'LUMINANCE_ALPHA' });
            if (format.endsWith("A") == true) {
                textureMap.push({ index: 2, uniform: 'sTextureA', size: 'full', format: 'ALPHA' });
            }
        }
        else if (format.startsWith("I420") == true) {
            textureMap.push({ index: 0, uniform: 'sTextureY', size: 'full', format: 'LUMINANCE' });
            textureMap.push({ index: 1, uniform: 'sTextureU', size: 'half', format: 'LUMINANCE' });
            textureMap.push({ index: 2, uniform: 'sTextureV', size: 'half', format: 'LUMINANCE' });
            if (format.endsWith("A") == true) {
                textureMap.push({ index: 3, uniform: 'sTextureA', size: 'full', format: 'ALPHA' });
            }
        }
        else {
            textureMap.push({ index: 0, uniform: 'sTextureRGB', size: 'full', format: 'RGBA' });
        }
        this.textureMap = textureMap;
    }
    set pixelFormat(aPixelFormat) {
        if (aPixelFormat == this._pixelFormat) {
            return;
        }
        this._pixelFormat = aPixelFormat;
        this._rebuildTextureMap();
    }
    get pixelFormat() {
        return this._pixelFormat;
    }
    get textureCount() {
        return this.textureMap.length;
    }
    prepare(gl, program, timestamp, renderer, layer, textures) {
        const textureMap = this.textureMap;
        // Walk the array backwards so we end at TEXTURE0
        for (let textureNum = textureMap.length - 1; textureNum >= 0; textureNum -= 1) {
            const entry = textureMap[textureNum];

            gl.activeTexture(gl.TEXTURE0 + textureNum);
            gl.bindTexture(gl.TEXTURE_2D, textures[entry.index]);
            gl.uniform1i(program.uniforms[entry.uniform], textureNum);
        }
    }
    textureFormatsIn(gl) {
        return this.textureMap.map(a => gl[a.format]);
    }
    textureSizesFor(size) {
        var sizes = {
            full: size,
            half: SizeMake(size.width / 2, size.height / 2)
        };
        return this.textureMap.map(a => sizes[a.size]);
    }
}
