//
//  lut.js
//  mmhmm
//
//  Created for LUT color grading support.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * LUT (Look-Up Table) Filter for color grading
 *
 * Applies a 3D color lookup table to transform colors in the video feed.
 * Supports intensity control for blending between original and graded colors.
 *
 * WebGL2 uses native 3D textures; WebGL1 falls back to 2D texture packing.
 */
class LUTFilter extends RenderFilter {
    // Current LUT data
    #lutData = null;
    #lutTexture = null;
    #needsTextureUpdate = false;
    #isWebGL2 = false;

    // LUT metadata
    #lutId = null;
    #lutTitle = null;

    /**
     * @override
     */
    constructor() {
        // Fragment shader for WebGL2 with 3D texture support
        // Will be swapped for WebGL1 fallback if needed
        const fragment = `
    precision mediump float;

    varying vec2 v_texcoord;
    uniform sampler2D u_texture;
    uniform lowp float u_opacity;
    uniform lowp float u_intensity;
    uniform int u_alphaMode;

    #ifdef WEBGL2
    uniform mediump sampler3D u_lut;
    uniform float u_lutSize;
    #else
    uniform sampler2D u_lut2d;
    uniform float u_lutSize;
    #endif

    vec3 applyLUT(vec3 color) {
        // Clamp input color
        color = clamp(color, 0.0, 1.0);

        #ifdef WEBGL2
        // Scale coordinates to sample from center of texels
        float scale = (u_lutSize - 1.0) / u_lutSize;
        float offset = 0.5 / u_lutSize;
        vec3 lutCoord = color * scale + offset;
        return texture(u_lut, lutCoord).rgb;
        #else
        // 2D texture fallback - LUT is packed as horizontal slices
        // Texture dimensions: width = size*size, height = size
        float sliceSize = 1.0 / u_lutSize;
        float slicePixelSize = sliceSize / u_lutSize;  // X pixel size: 1/(size*size)
        float sliceInnerSize = slicePixelSize * (u_lutSize - 1.0);
        float pixelSizeY = 1.0 / u_lutSize;  // Y pixel size: 1/size (different from X!)
        float yInnerSize = pixelSizeY * (u_lutSize - 1.0);
        float zSlice0 = min(floor(color.b * (u_lutSize - 1.0)), u_lutSize - 2.0);
        float zSlice1 = zSlice0 + 1.0;
        float xOffset = slicePixelSize * 0.5 + color.r * sliceInnerSize;
        float yOffset = pixelSizeY * 0.5 + color.g * yInnerSize;
        float s0 = xOffset + zSlice0 * sliceSize;
        float s1 = xOffset + zSlice1 * sliceSize;
        vec3 slice0Color = texture2D(u_lut2d, vec2(s0, yOffset)).rgb;
        vec3 slice1Color = texture2D(u_lut2d, vec2(s1, yOffset)).rgb;
        float zOffset = mod(color.b * (u_lutSize - 1.0), 1.0);
        return mix(slice0Color, slice1Color, zOffset);
        #endif
    }

    void main() {
        vec4 color = texture2D(u_texture, v_texcoord);

        // Only discard transparent pixels when not using layer targeting
        // When using foreground/background modes, we need all pixels for proper targeting
        if (u_alphaMode == 0 && color.a < 0.01) {
            discard;
        }

        // Apply LUT transformation
        vec3 lutColor = applyLUT(color.rgb);

        // Alpha-aware blend amount
        float blendAmount = u_intensity;
        if (u_alphaMode == 1) {
            // Foreground: apply effect only where alpha is high (person)
            blendAmount *= smoothstep(0.4, 0.6, color.a);
        } else if (u_alphaMode == 2) {
            // Background: apply effect only where alpha is low (background)
            blendAmount *= 1.0 - smoothstep(0.4, 0.6, color.a);
        }
        // u_alphaMode == 0: All - use full intensity (default)

        vec3 finalColor = mix(color.rgb, lutColor, blendAmount);

        // When using layer targeting, output full opacity so both fg and bg are visible
        // The alpha channel is used for mask data, not compositing
        float outputAlpha = (u_alphaMode == 0) ? color.a * u_opacity : u_opacity;
        gl_FragColor = vec4(finalColor, outputAlpha);
    }
        `;

        const parameters = {
            intensity: {
                type: "slider",
                min: 0,
                max: 1,
                default: 1.0,
                title: LocalizedString("Intensity")
            }
        };

        // Note: u_lut (3D sampler) is omitted since WEBGL2 is not currently enabled
        super(fragment, ["u_texture", "u_opacity", "u_intensity", "u_lut2d", "u_lutSize", "u_alphaMode"], parameters);
        this.modifiesContents = true;
        this.intensity = 1.0;
        this.alphaMode = 0;  // 0=All, 1=Foreground, 2=Background
    }

    /**
     * Initialize the filter with WebGL context
     * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
     * @param {Object} program
     * @param {Object} renderer
     */
    initialize(gl, program, renderer) {
        // Always use 2D texture path - 3D textures require GLSL ES 3.0 shader
        // which isn't currently supported. The 2D fallback works in both WebGL1/2.
        this.#isWebGL2 = false;
    }

    /**
     * Set the LUT data for this filter
     * @param {LUTData} lutData - Parsed LUT data from LUTParser
     * @param {string} lutId - Unique identifier for this LUT
     */
    setLUT(lutData, lutId) {
        this.#lutData = lutData;
        this.#lutId = lutId;
        this.#lutTitle = lutData?.title || 'Unknown';
        this.#needsTextureUpdate = true;
    }

    /**
     * Clear the current LUT
     */
    clearLUT() {
        this.#lutData = null;
        this.#lutId = null;
        this.#lutTitle = null;
        this.#needsTextureUpdate = true;

        if (this.#lutTexture) {
            // Texture will be cleaned up by renderer
            this.#lutTexture = null;
        }
    }

    /**
     * Get current LUT ID
     * @returns {string|null}
     */
    get lutId() {
        return this.#lutId;
    }

    /**
     * Get current LUT title
     * @returns {string|null}
     */
    get lutTitle() {
        return this.#lutTitle;
    }

    /**
     * Check if a LUT is currently loaded
     * @returns {boolean}
     */
    get hasLUT() {
        return this.#lutData !== null;
    }

    /**
     * Create or update the LUT texture from data
     * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
     */
    #updateLUTTexture(gl) {
        if (!this.#lutData) {
            return;
        }

        const lutData = this.#lutData;
        const size = lutData.size;
        const data = lutData.data;

        // Clean up old texture
        if (this.#lutTexture) {
            gl.deleteTexture(this.#lutTexture);
        }

        this.#lutTexture = gl.createTexture();

        // Clamp values to valid Uint8 range (handles LUTs with extended range values)
        const clampToUint8 = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));

        if (this.#isWebGL2) {
            // WebGL2: Use native 3D texture
            gl.bindTexture(gl.TEXTURE_3D, this.#lutTexture);

            // Convert Float32Array to Uint8Array (0-255 range)
            const rgbaData = new Uint8Array(size * size * size * 4);
            for (let i = 0; i < size * size * size; i++) {
                rgbaData[i * 4] = clampToUint8(data[i * 3]);
                rgbaData[i * 4 + 1] = clampToUint8(data[i * 3 + 1]);
                rgbaData[i * 4 + 2] = clampToUint8(data[i * 3 + 2]);
                rgbaData[i * 4 + 3] = 255;
            }

            gl.texImage3D(
                gl.TEXTURE_3D,
                0,
                gl.RGBA,
                size, size, size,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                rgbaData
            );

            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        } else {
            // WebGL1: Pack 3D LUT into 2D texture (horizontal slices)
            gl.bindTexture(gl.TEXTURE_2D, this.#lutTexture);

            const width = size * size;
            const height = size;
            const rgbaData = new Uint8Array(width * height * 4);

            for (let b = 0; b < size; b++) {
                for (let g = 0; g < size; g++) {
                    for (let r = 0; r < size; r++) {
                        const srcIdx = (b * size * size + g * size + r) * 3;
                        const dstX = b * size + r;
                        const dstY = g;
                        const dstIdx = (dstY * width + dstX) * 4;

                        rgbaData[dstIdx] = clampToUint8(data[srcIdx]);
                        rgbaData[dstIdx + 1] = clampToUint8(data[srcIdx + 1]);
                        rgbaData[dstIdx + 2] = clampToUint8(data[srcIdx + 2]);
                        rgbaData[dstIdx + 3] = 255;
                    }
                }
            }

            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                width, height,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                rgbaData
            );

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        this.#needsTextureUpdate = false;
    }

    /**
     * Prepare uniforms for rendering
     * @override
     */
    prepare(gl, program, timestamp, renderer, layer, contentsTexture) {
        // Update texture if needed
        if (this.#needsTextureUpdate) {
            this.#updateLUTTexture(gl);
        }

        // Set intensity uniform
        gl.uniform1f(program.uniforms.u_intensity, this.intensity);

        // Set alpha mode uniform
        gl.uniform1i(program.uniforms.u_alphaMode, this.alphaMode);

        // Bind LUT texture if available
        if (this.#lutTexture && this.#lutData) {
            const textureUnit = 2; // Use texture unit 2 (0 and 1 are typically used by base)

            if (this.#isWebGL2) {
                gl.activeTexture(gl.TEXTURE0 + textureUnit);
                gl.bindTexture(gl.TEXTURE_3D, this.#lutTexture);
                gl.uniform1i(program.uniforms.u_lut, textureUnit);
            } else {
                gl.activeTexture(gl.TEXTURE0 + textureUnit);
                gl.bindTexture(gl.TEXTURE_2D, this.#lutTexture);
                gl.uniform1i(program.uniforms.u_lut2d, textureUnit);
            }

            gl.uniform1f(program.uniforms.u_lutSize, this.#lutData.size);
            gl.activeTexture(gl.TEXTURE0);
        } else {
            // No LUT loaded - use identity (pass through)
            gl.uniform1f(program.uniforms.u_intensity, 0);
        }
    }

    /**
     * Serialize filter state
     * @override
     */
    toJSON() {
        const result = super.toJSON();
        result.intensity = this.intensity;
        result.alphaMode = this.alphaMode;
        result.lutId = this.#lutId;
        return result;
    }

    /**
     * Apply state from event/serialized data
     * @override
     */
    applyEvent(event) {
        super.applyEvent(event);

        if (event.intensity !== undefined) {
            this.intensity = event.intensity;
        }

        if (event.alphaMode !== undefined) {
            this.alphaMode = event.alphaMode;
        }

        // Note: lutId changes should be handled by the LUT panel/controller
        // which will call setLUT() with the appropriate data
    }

    /**
     * Create a copy of this filter
     * @override
     */
    copy() {
        const copy = super.copy();
        copy.#lutData = this.#lutData;
        copy.#lutId = this.#lutId;
        copy.#lutTitle = this.#lutTitle;
        copy.#needsTextureUpdate = true;
        copy.alphaMode = this.alphaMode;
        return copy;
    }
}

LUTFilter.identifier = "a3f5d821-9b47-4c6e-8e2a-1f7c3b5d9a0e";
