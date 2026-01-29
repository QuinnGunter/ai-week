//
//  preprocess.js
//  mmhmm
//
//  Created by Filip Mroz on 9/09/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class MLPreprocess {
    constructor(config) {
        this.config = config;
        this.width = config.width;
        this.height = config.height;
        this.depth = config.depth;
        this.method = config.method; // canvas2d, gpu, webcodec
        console.assert(['canvas2d', 'gpu', 'webcodec'].includes(this.method));
        console.log(`MLPreprocess created with method: ${this.method}`)
        this.alphaIsFloat = config.alphaIsFloat;
        this.toFloat = config.toFloat;
        this.timer = null;
        this.knowsOfVideoFrame = (window.VideoFrame != null);
    }
    getAverageTime() {
        if (window.CircularBuffer == null) {
            return 0;
        }
        if (this.timer == null) {
            this.timer = new CircularBuffer(30);
        }
        return this.timer.avg();
    }
    InitInputTexture(w, h) {
        // Create a texture for the video frame
        var gl = this.glContext;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        return texture;
    }
    async load() {
        var config = this.config;
        if (this.method === "gpu") {
            this.createGLContext(config.width, config.height, config.depth);
        }
        // Check if canvas is needed.
        var isFirefox = (navigator.vendor == "" && navigator.userAgent.indexOf("Firefox") != -1);
        if (isFirefox || this.method === "canvas2d") {
            var canvas = null;
            if (window.OffscreenCanvas != null) {
                canvas = new OffscreenCanvas(config.width, config.height);
            }
            else // Safari does not seem to have OffscreenCanvas implemented at the moment, Firefox does as of 105
            {
                canvas = document.createElement("canvas");
                canvas.width = config.width;
                canvas.height = config.height;
            }
            var context = canvas.getContext("2d");
            context.imageSmoothingQuality = "low";
            context.imageSmoothingEnabled = false;
            context.globalCompositeOperation = 'copy';
            this.textureAdapter = { canvas, context };
        }
        //console.log(`Preprocess load finished`);
    }
    /*
     * GL canvas for downscaling images
     */
    createGLContext(width, height, depth) {
        var contextAttributes = {
            alpha: false,
            stencil: false,
            antialias: false,
            preserveDrawingBuffer: false,
            premultipliedAlpha: true,
        };

        var canvas = null;
        var gl = null;
        if (window.OffscreenCanvas != null) {
            canvas = new OffscreenCanvas(width, height);
            gl = canvas.getContext('webgl2', contextAttributes);
        }

        if (canvas == null || gl == null) {
            canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            gl = canvas.getContext('webgl2', contextAttributes);
        }

        canvas.addEventListener("webglcontextlost", evt => {
            console.info("MLPreprocess webglcontextlost")
            evt.preventDefault();
        }, {once: true});
        canvas.addEventListener("webglcontextrestored", evt => {
            console.info("MLPreprocess webglcontextrestored")
            this.createGLContext(width, height, depth);
        }, {once: true});

        this.canvas = canvas;


        this.glContext = gl;

        var ext = gl.getExtension('EXT_color_buffer_float');

        var vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, `
            attribute highp vec2 vx;
            varying highp vec2 tx;
            void main(){
                gl_Position = vec4(vx.x*2.0-1.0, vx.y*2.0-1.0,0,1);
                tx = vx;
            }
        `);
        gl.compileShader(vs);

        var ps = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(ps, `
            uniform sampler2D sm;
            varying highp vec2 tx;
            void main(){
                gl_FragColor = texture2D(sm, tx).bgra;
            }
        `);
        gl.compileShader(ps);

        var shader = gl.createProgram();
        gl.attachShader(shader, vs);
        gl.attachShader(shader, ps);
        gl.linkProgram(shader);

        var vx = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vx);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);

        var ix = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ix);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

        // Set up the shader parameters
        gl.useProgram(shader);
        var vx_loc = gl.getAttribLocation(shader, "vx");
        gl.vertexAttribPointer(vx_loc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vx_loc);
        gl.uniform1i(gl.getUniformLocation(shader, "sm"), 0);

        // Renderbuffer/framebuffer
        var renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGB8, width, height);

        var fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
            throw "framebuffer with RGB8 color buffer is incomplete";
        }

        // Texture for the video element
        this.inputTexture = this.InitInputTexture(1, 1);

        var readPixelsRequiresRGBA = false;
        // XXX: Better test might be gl.getRenderbufferParameter() ??
        // Gecko and WebKit will only return RGBA data in readPixels:
        // Chromium will return RGB.
        // Figure out who we're dealing with..
        var vendor = navigator.vendor;
        var userAgent = navigator.userAgent;
        if (vendor.startsWith("Apple") == true) {
            readPixelsRequiresRGBA = true;
        }
        else if (vendor.startsWith("Google") == true) {
            if (userAgent.indexOf("Windows") != -1) { // perhaps not only Windows?
                readPixelsRequiresRGBA = true;
            }
        }
        else if (vendor == "") {
            if (userAgent.indexOf("WebKit") == -1) {
                readPixelsRequiresRGBA = true;
            }
        }
        this.readPixelsRequiresRGBA = readPixelsRequiresRGBA;
    }
    async renderPreprocess(renderable) {
        this.dataArray = null;
        try {
            this.dataArray = await this.dataFromElement(renderable);
        }
        catch (err) {
            this.dataArray = null;
            throw err;
        }
        return this.dataArray;
    }
    async dataFromElement(element) {
        var textureElement = null;
        var textureAdapter = this.textureAdapter;
        var useGpu = textureAdapter == null;
        var flipChannels = false;
        var byteDepth = -1;
        var numBytes = -1;
        var data = undefined;
        var pixels = null;

        if (element instanceof PresenterVideoContents) {
            const width = this.width;
            const height = this.height;
            const depth = this.depth;

            if (!element.layout)
                return null;

            pixels = this.convertFromBuffer(
                element.buffer,
                width, height, depth,
                element.format, element.layout,
            );
            byteDepth = 3;
            flipChannels = false;
            numBytes = width * height * byteDepth;
        }
        else if (this.knowsOfVideoFrame == true && element instanceof VideoFrame) {
            var frame = element;
            var allocationSize = frame.allocationSize();
            var format = frame.format;

            var contentsBuffer = this.contentsBuffer;
            if (contentsBuffer == null || contentsBuffer.length != allocationSize) {
                contentsBuffer = new Uint8Array(allocationSize);
                this.contentsBuffer = contentsBuffer;
            }

            var frameLayout = null;
            try {
                frameLayout = frame.copyTo(contentsBuffer);
            }
            catch (err) {
                console.error("frame.copyTo threw", frame, contentsBuffer, err);
                debugger;
                return;
            }

            const width = this.width;
            const height = this.height;
            const depth = this.depth;

            pixels = this.convertFromBuffer(
                contentsBuffer,
                width, height, depth,
                format, frameLayout,
            );
            byteDepth = 3;
            flipChannels = false;
            numBytes = width * height * byteDepth;
        }
        else if (useGpu && (element instanceof HTMLCanvasElement) == false) {
            // Incoming texture, i.e.camera texture
            textureElement = element;

            // Draw the video frame
            var gl = this.glContext;
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureElement);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

            // Initiate read-back from GPU
            var type = gl.UNSIGNED_BYTE;
            // var type = gl.FLOAT;
            //var bytesPerComponent = (type == gl.FLOAT ? 4 : 1);
            byteDepth = this.depth;
            let format = null;
            if (this.readPixelsRequiresRGBA == false) {
                format = gl.RGB;
            }
            else {
                format = gl.RGBA;
                byteDepth = 4;
            }

            numBytes = this.width * this.height * byteDepth;
            let pixels = this.pixels;
            if (pixels == null || pixels.length != numBytes) {
                pixels = new Uint8Array(numBytes);
                this.pixels = pixels;
            }

            await this.readPixelsAsync(gl, 0, 0, this.width, this.height, format, type, pixels);
        }
        else {
            var elementWidth = element.videoWidth ?? element.codedWidth ?? element.naturalWidth ?? element.width;
            var elementHeight = element.videoHeight ?? element.codedHeight ?? element.naturalHeight ?? element.height;

            // use canvas2d - CPU
            // Using the canvas as input and downscaling with drawImage
            textureAdapter.context.drawImage(
                element,
                0, 0, elementWidth, elementHeight, // source
                0, 0, this.width, this.height // dest
            );

            var imageData = this.textureAdapter.context.getImageData(0, 0, this.width, this.height);
            pixels = imageData.data;
            byteDepth = 4;
            flipChannels = true;
            numBytes = this.width * this.height * byteDepth;
        }

        const alphaDivide = this.alphaIsFloat ? 0xff : 1;
        const dataBytes = this.width * this.height * this.depth;

        if (this.toFloat === true) {
            // Convert ints to floats
            var floats = this.floats;
            if (floats == null || floats.length != dataBytes) {
                floats = new Float32Array(dataBytes);
                this.floats = floats;
            }
            data = floats;
        }
        else {
            var uints = this.uints;
            if (uints == null || uints.length != dataBytes) {
                uints = new Uint8Array(dataBytes);
                this.uints = uints;
            }
            data = uints;
        }

        // Skip the translation of the results if it would be the same.
        if (flipChannels == false && alphaDivide == 1 && data.length == pixels.length) {
            data = pixels;
        } else {
            var dataIndex = 0;
            for (var byteIndex = 0; byteIndex < numBytes; byteIndex += byteDepth) {
                if (flipChannels) {
                    const value = pixels[byteIndex]; // so that it works in-place
                    data[dataIndex] = pixels[byteIndex + 2] / alphaDivide;
                    data[dataIndex + 1] = pixels[byteIndex + 1] / alphaDivide;
                    data[dataIndex + 2] = value / alphaDivide;
                } else {
                    data[dataIndex] = pixels[byteIndex] / alphaDivide;
                    data[dataIndex + 1] = pixels[byteIndex + 1] / alphaDivide;
                    data[dataIndex + 2] = pixels[byteIndex + 2] / alphaDivide;
                }
                dataIndex += this.depth;
            }
        }
        return data;
    }
    async readPixelsAsync(gl, x, y, w, h, format, type, dest) {
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, dest.byteLength, gl.STREAM_READ);
        gl.readPixels(x, y, w, h, format, type, 0);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

        await this.getBufferSubDataAsync(gl, gl.PIXEL_PACK_BUFFER, buf, 0, dest);

        gl.deleteBuffer(buf);
        return dest;
    }
    async getBufferSubDataAsync(
        gl, target, buffer, srcByteOffset, dstBuffer,
        /* optional */ dstOffset, /* optional */ length) {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();

        await this.clientWaitAsync(gl, sync, 0, 1);
        gl.deleteSync(sync);

        gl.bindBuffer(target, buffer);
        gl.getBufferSubData(target, srcByteOffset, dstBuffer, dstOffset, length);
        gl.bindBuffer(target, null);

        return dstBuffer;
    }
    clientWaitAsync(gl, sync, flags, interval_ms) {
        return new Promise((resolve, reject) => {
            function test() {
                const res = gl.clientWaitSync(sync, flags, 0);
                if (res == gl.WAIT_FAILED) {
                    reject();
                    return;
                }
                else if (res == gl.TIMEOUT_EXPIRED) {
                    window.setTimeout(test, interval_ms);
                    return;
                }
                // Other conditions just resolve
                resolve();
            }
            test();
        });
    }

    clamp(x) {
        return (x < 0) ? 0 :
            (x > 255) ? 255 :
            x;
    }

    iYCrCbToBGR(dst, offset, y, cr, cb) {
        const c = 298 * (y - 16);
        const d = cb - 128;
        const e = cr - 128;

        const kr = +409 * e + 128;
        const kg = -100 * d - 208 * e + 128;
        const kb = 516 * d + 128;

        dst[offset + 0] = this.clamp((c + kb) >> 8);
        dst[offset + 1] = this.clamp((c + kg) >> 8);
        dst[offset + 2] = this.clamp((c + kr) >> 8);
    }

    pixel_I420_to_bgr(dst, offset, pixelX, pixelY, src, xres, frameLayout) {
        const smallX = pixelX >> 1;
        const smallY = pixelY >> 1;
        const smallxres = xres >> 1;
        const smallShift = smallY * smallxres + smallX;

        const srcY = frameLayout[0].offset + pixelY * xres + pixelX;
        const srcU = frameLayout[1].offset + smallShift;
        const srcV = frameLayout[2].offset + smallShift;

        const y = src[srcY];
        const cb = src[srcU];
        const cr = src[srcV];

        this.iYCrCbToBGR(dst, offset, y, cr, cb);
    }

    pixel_NV12_to_bgr(dst, offset, pixelX, pixelY, src, xres, frameLayout) {
        const smallY = pixelY >> 1;
        const smallShift = smallY * xres + ((pixelX >> 1) << 1); // this pushes to current UV

        const srcY = frameLayout[0].offset + pixelY * xres + pixelX;
        const srcUV = frameLayout[1].offset + smallShift;

        const y = src[srcY];
        const cb = src[srcUV];
        const cr = src[srcUV+1];

        this.iYCrCbToBGR(dst, offset, y, cr, cb);
    }

    pixel_RGBA_or_BGRA_to_bgr(dst, offset, pixelX, pixelY, src, srcWidth, frameLayout, isBGRA) {
        let redIdx, greenIdx=1, blueIdx;
        if (isBGRA == true) {
            blueIdx = 0;
            redIdx = 2;
        }
        else {
            blueIdx = 2;
            redIdx = 0;
        }

        const bytesPerPixel = 4;
        const bytesPerRow = srcWidth * bytesPerPixel;
        const srcOffset = (pixelY * bytesPerRow) + (pixelX * bytesPerPixel);

        dst[offset+0] = src[srcOffset+blueIdx];
        dst[offset+1] = src[srcOffset+greenIdx];
        dst[offset+2] = src[srcOffset+redIdx];
    }

    convertFromBuffer(frameBuffer, width, height, depth, format, frameLayout) {
        let isNV12 = false;
        let isI420 = false;
        let isRGBA = false;
        let isBGRA = false;

        if (format == 'NV12' || format == 'NV12A')  {
            isNV12 = true;
        }
        else if (format == 'I420' || format == 'I420A')  {
            isI420 = true;
        }
        else if (format == 'RGBA') {
            isRGBA = true;
        }
        else if (format == 'BGRA') {
            isBGRA = true;
        }
        else {
            throw new Error(`Unknown format in preprocessing: ${format}`)
        }

        let imageWidth, imageHeight, imageDepth;

        if (isRGBA == true || isBGRA == true) {
            const bytesPerRow = frameLayout[0].stride;
            const bytesPerPixel = 4;
            imageWidth = bytesPerRow / bytesPerPixel;
            imageHeight = frameBuffer.length / bytesPerRow;
            imageDepth = 3;
        }
        else {
            imageWidth = frameLayout[0].stride;
            imageHeight = frameLayout[1].offset / imageWidth;
            imageDepth = 3;
        }

        var resUints = this.convertUints;
        var numUints = width * height * depth;
        if (resUints == null || resUints.length != numUints) {
            resUints = new Uint8Array(numUints);
            this.convertUints = resUints;
        }

        let intIndex = 0;
        const scaleY = imageHeight / height;
        const scaleX = imageWidth / width;
        for (var y = 0; y < height; ++y) {
            // Convert to the half pixel offset to center
            const yi = Math.round((y + 0.5) * scaleY);
            for (var x = 0; x < width; ++x) {
                // Convert to the half pixel offset to center
                const xi = Math.round((x + 0.5) * scaleX);
                if (isRGBA || isBGRA) {
                    this.pixel_RGBA_or_BGRA_to_bgr(resUints, intIndex, xi, yi, frameBuffer, imageWidth, frameLayout, isBGRA);
                }
                else if (isNV12) {
                    this.pixel_NV12_to_bgr(resUints, intIndex, xi, yi, frameBuffer, imageWidth, frameLayout);
                }
                else {
                    this.pixel_I420_to_bgr(resUints, intIndex, xi, yi, frameBuffer, imageWidth, frameLayout);
                }
                intIndex += imageDepth;
            }
        }

        return resUints;
    }
}
