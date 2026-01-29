//
//  lut_thumbnail_renderer.js
//  mmhmm
//
//  Created for offscreen LUT thumbnail rendering.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Offscreen WebGL renderer for generating LUT preview thumbnails.
 *
 * This renderer creates thumbnails without affecting the main video feed,
 * eliminating the visual flashing that occurs when applying LUTs to the
 * main renderer for snapshot purposes.
 *
 * Uses the same 2D texture packing approach as LUTFilter for compatibility.
 */
class LUTThumbnailRenderer {
    #canvas;
    #gl;
    #program;
    #videoTexture;
    #lutTexture;
    #positionBuffer;
    #texcoordBuffer;
    #uniforms;
    #initialized = false;

    // Vertex shader - simple passthrough
    static #vertexShaderSource = `
        attribute vec2 a_position;
        attribute vec2 a_texcoord;
        varying vec2 v_texcoord;

        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texcoord = a_texcoord;
        }
    `;

    // Fragment shader - applies LUT via 2D texture lookup
    // Uses same logic as lut.js for consistency
    static #fragmentShaderSource = `
        precision mediump float;

        varying vec2 v_texcoord;
        uniform sampler2D u_texture;
        uniform sampler2D u_lut2d;
        uniform float u_lutSize;
        uniform float u_hasLUT;

        vec3 applyLUT(vec3 color) {
            // Clamp input color
            color = clamp(color, 0.0, 1.0);

            // 2D texture fallback - LUT is packed as horizontal slices
            // Texture dimensions: width = size*size, height = size
            float sliceSize = 1.0 / u_lutSize;
            float slicePixelSize = sliceSize / u_lutSize;
            float sliceInnerSize = slicePixelSize * (u_lutSize - 1.0);
            float pixelSizeY = 1.0 / u_lutSize;
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
        }

        void main() {
            vec4 color = texture2D(u_texture, v_texcoord);

            if (u_hasLUT > 0.5) {
                vec3 lutColor = applyLUT(color.rgb);
                gl_FragColor = vec4(lutColor, color.a);
            } else {
                gl_FragColor = color;
            }
        }
    `;

    /**
     * Create a new offscreen LUT thumbnail renderer
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    constructor(width, height) {
        console.log('[LUTThumbnailRenderer] Creating renderer', { width, height });

        this.#canvas = document.createElement('canvas');
        this.#canvas.width = width;
        this.#canvas.height = height;

        // Get WebGL context - prefer WebGL2 but fall back to WebGL1
        this.#gl = this.#canvas.getContext('webgl2', { preserveDrawingBuffer: true }) ||
                   this.#canvas.getContext('webgl', { preserveDrawingBuffer: true });

        if (!this.#gl) {
            console.error('[LUTThumbnailRenderer] WebGL not supported');
            return;
        }

        console.log('[LUTThumbnailRenderer] Got WebGL context:', this.#gl.constructor.name);

        this.#initShaders();
        this.#initBuffers();
        this.#initTextures();
        this.#initialized = true;

        console.log('[LUTThumbnailRenderer] Initialized successfully');
    }

    /**
     * Initialize WebGL shaders and program
     */
    #initShaders() {
        const gl = this.#gl;

        // Compile vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, LUTThumbnailRenderer.#vertexShaderSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('[LUTThumbnailRenderer] Vertex shader compile error:', gl.getShaderInfoLog(vertexShader));
            return;
        }

        // Compile fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, LUTThumbnailRenderer.#fragmentShaderSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('[LUTThumbnailRenderer] Fragment shader compile error:', gl.getShaderInfoLog(fragmentShader));
            return;
        }

        // Link program
        this.#program = gl.createProgram();
        gl.attachShader(this.#program, vertexShader);
        gl.attachShader(this.#program, fragmentShader);
        gl.linkProgram(this.#program);

        if (!gl.getProgramParameter(this.#program, gl.LINK_STATUS)) {
            console.error('[LUTThumbnailRenderer] Program link error:', gl.getProgramInfoLog(this.#program));
            return;
        }

        console.log('[LUTThumbnailRenderer] Shaders compiled and linked successfully');

        // Get uniform locations
        this.#uniforms = {
            u_texture: gl.getUniformLocation(this.#program, 'u_texture'),
            u_lut2d: gl.getUniformLocation(this.#program, 'u_lut2d'),
            u_lutSize: gl.getUniformLocation(this.#program, 'u_lutSize'),
            u_hasLUT: gl.getUniformLocation(this.#program, 'u_hasLUT')
        };

        // Clean up shader objects
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
    }

    /**
     * Initialize vertex buffers for fullscreen quad
     */
    #initBuffers() {
        const gl = this.#gl;

        // Position buffer (fullscreen quad in clip space)
        this.#positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1
        ]), gl.STATIC_DRAW);

        // Texcoord buffer (flip Y for proper orientation)
        this.#texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            0, 0,
            1, 1,
            1, 0
        ]), gl.STATIC_DRAW);
    }

    /**
     * Initialize texture objects
     */
    #initTextures() {
        const gl = this.#gl;

        // Video texture
        this.#videoTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.#videoTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // LUT texture
        this.#lutTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.#lutTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    /**
     * Upload LUT data to texture (2D packed format)
     * @param {Object} lutData - LUT data with size and data properties
     */
    #uploadLUTTexture(lutData) {
        const gl = this.#gl;
        const size = lutData.size;
        const data = lutData.data;

        const clampToUint8 = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));

        // Pack 3D LUT into 2D texture (horizontal slices)
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

        gl.bindTexture(gl.TEXTURE_2D, this.#lutTexture);
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
    }

    /**
     * Render a video frame with a LUT applied
     * @param {HTMLVideoElement|ImageBitmap} source - Video element or captured frame
     * @param {Object} lutData - LUT data with size and data properties
     * @returns {Promise<Blob>} - PNG blob of the rendered thumbnail
     */
    async renderWithLUT(source, lutData) {
        console.log('[LUTThumbnailRenderer] renderWithLUT called', {
            initialized: this.#initialized,
            sourceType: source?.constructor?.name,
            hasLutData: !!lutData,
            canvasSize: this.#canvas ? `${this.#canvas.width}x${this.#canvas.height}` : 'no canvas'
        });

        if (!this.#initialized) {
            console.error('[LUTThumbnailRenderer] Not initialized');
            return null;
        }

        const gl = this.#gl;

        // Upload video frame as texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.#videoTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

        // Upload LUT texture if provided
        if (lutData) {
            this.#uploadLUTTexture(lutData);
        }

        // Set up rendering
        gl.viewport(0, 0, this.#canvas.width, this.#canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.#program);

        // Bind position attribute
        const positionLocation = gl.getAttribLocation(this.#program, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Bind texcoord attribute
        const texcoordLocation = gl.getAttribLocation(this.#program, 'a_texcoord');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#texcoordBuffer);
        gl.enableVertexAttribArray(texcoordLocation);
        gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

        // Set uniforms
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.#videoTexture);
        gl.uniform1i(this.#uniforms.u_texture, 0);

        if (lutData) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.#lutTexture);
            gl.uniform1i(this.#uniforms.u_lut2d, 1);
            gl.uniform1f(this.#uniforms.u_lutSize, lutData.size);
            gl.uniform1f(this.#uniforms.u_hasLUT, 1.0);
        } else {
            gl.uniform1f(this.#uniforms.u_hasLUT, 0.0);
        }

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Check for WebGL errors
        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
            console.error('[LUTThumbnailRenderer] WebGL error after draw:', error);
        }

        // Convert to blob
        return new Promise((resolve) => {
            this.#canvas.toBlob((blob) => {
                console.log('[LUTThumbnailRenderer] toBlob result:', blob ? `${blob.size} bytes` : 'null');
                resolve(blob);
            }, 'image/png');
        });
    }

    /**
     * Resize the renderer canvas
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height) {
        this.#canvas.width = width;
        this.#canvas.height = height;
    }

    /**
     * Check if renderer is initialized and ready
     * @returns {boolean}
     */
    get isReady() {
        return this.#initialized;
    }

    /**
     * Clean up WebGL resources
     */
    dispose() {
        if (!this.#gl) return;

        const gl = this.#gl;

        if (this.#videoTexture) {
            gl.deleteTexture(this.#videoTexture);
            this.#videoTexture = null;
        }

        if (this.#lutTexture) {
            gl.deleteTexture(this.#lutTexture);
            this.#lutTexture = null;
        }

        if (this.#positionBuffer) {
            gl.deleteBuffer(this.#positionBuffer);
            this.#positionBuffer = null;
        }

        if (this.#texcoordBuffer) {
            gl.deleteBuffer(this.#texcoordBuffer);
            this.#texcoordBuffer = null;
        }

        if (this.#program) {
            gl.deleteProgram(this.#program);
            this.#program = null;
        }

        this.#initialized = false;
        this.#gl = null;
        this.#canvas = null;
    }
}
