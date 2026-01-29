//
//  renderer.js
//  mmhmm
//
//  Created by Steve White on 7/13/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

const RendererVertex = `
attribute vec4 a_position;
attribute vec2 a_texcoord;
attribute vec2 a_layercoord;

uniform mat4 u_model;
uniform mat4 u_projection;
uniform bool u_texcoordFromPosition;

varying vec2 v_texcoord;
varying vec2 v_layercoord;

void main() {
  gl_Position = u_projection * u_model * a_position;
  if (u_texcoordFromPosition == true) {
      v_texcoord = (gl_Position.xy + vec2(1.0)) / vec2(2.0);
  }
  else {
      v_texcoord = a_texcoord;
  }
  v_layercoord = a_layercoord;
}
`;

const RendererFragment = `
precision mediump float;

varying vec2 v_texcoord;
uniform sampler2D u_texture;
uniform lowp float u_opacity;

void main() {
  vec4 pix = texture2D(u_texture, v_texcoord);
	gl_FragColor = vec4(pix.rgb, pix.a * u_opacity);
}
`;

const RendererNoAlphaFragment = `
precision mediump float;

varying vec2 v_texcoord;
uniform sampler2D u_texture;
uniform lowp float u_opacity;

void main() {
  vec4 pix = texture2D(u_texture, v_texcoord);
  float alpha = u_opacity;
  if (pix.a == 0.0) {
      alpha = 0.0;
  }
	gl_FragColor = vec4(pix.rgb, alpha);
}
`;

class Renderer {
    constructor(canvas, width, height, alphaEnabled) {
        if (canvas == null) {
            canvas = document.createElement("canvas");
        }
        this.contextLostRestoredListener = (evt) => {
            var type = evt.type
            if (type == "webglcontextrestored") {
                this.initializeGL(this.canvas, this.alphaEnabled);
                // Display the canvas again...
                canvas.style.opacity = 1.0;
            }
            else if (type == "webglcontextlost") {
                // required to allow context to be restored
                evt.preventDefault();
                // after a successful restore, the canvas
                // still appears blank until a browser layout
                // event fires forcing it to redraw
                // e.g. toggling a sidebar pane
                // Opacity seems to do the trick programmatically
                canvas.style.opacity = 0.0;
            }
            else {
                console.error("Unhandled event: ", type, evt);
            }
        }
        this.canvas = canvas;
        this.clearColor = [0, 0, 0, alphaEnabled ? 0 : 1];

        if (width == null) {
            width = canvas.width;
        }
        if (height == null) {
            height = canvas.height;
        }

        this.initializeGL(canvas, alphaEnabled ?? false);
        this.size = SizeMake(width, height);
        this.scale = 1.0;

        var layer = new RenderLayer();
        layer.size = SizeMake(width, height);
        layer.position = PointMake(width / 2, height / 2);
        layer.userInteractionEnabled = true;
        this._rootLayer = layer;

        this.inOutFilter = new RenderFilter(RendererFragment, ["u_opacity", "u_texture"]);
        this.maskFilters = new WeakMap();
        if (typeof SharedUserDefaults != "undefined") {
            this.checkErrors = SharedUserDefaults.getValueForKey("glCheckError", false);
        }

        // Safari 15.4 won't render "complex" layers
        // where complex is > 1 filter, or 1 filter and > 0 sublayers
        //
        // This appears to be something to do with drawing to the canvas' framebuffer
        // and then binding a different framebuffer, binding back to the canvas, etc.
        //
        // The work around is to ensure we do all of our offscreen buffers first
        // and then draw to the canvas framebuffer.
        var useBlitRenderer = false;
        if (navigator.vendor.startsWith("Apple") == true) {
            // TODO (eslint, no-useless-escape): check this regex.
            /* eslint-disable no-useless-escape */
            var matches = navigator.appVersion.match(/Version\/([0-9\.]*)/);
            /* eslint-enable no-useless-escape */
            if (matches != null && matches.length == 2) {
                var version = parseFloat(matches[1]);
                if (version >= 15.4 && version < 16.0) {
                    useBlitRenderer = true;
                    this.inOutNoAlphaFilter = new RenderFilter(RendererNoAlphaFragment, ["u_opacity", "u_texture"]);
                }
            }
        }
        this.useBlitRenderer = useBlitRenderer;
    }

    destroy() {
        this.canvas = null;
    }

    set canvas(element) {
        var previous = this._canvas;
        if (previous == element) {
            return;
        }
        if (previous != null) {
            previous.removeEventListener("webglcontextlost", this.contextLostRestoredListener);
            previous.removeEventListener("webglcontextrestored", this.contextLostRestoredListener);
        }
        this._canvas = element;
        if (element != null) {
            element.addEventListener("webglcontextlost", this.contextLostRestoredListener);
            element.addEventListener("webglcontextrestored", this.contextLostRestoredListener);
        }
    }

    get canvas() {
        return this._canvas;
    }

    reinitializeGL(newCanvas, alphaEnabled) {
        this.canvas = newCanvas;
        this.initializeGL(newCanvas, alphaEnabled);
    }

    initializeGL(canvas, alphaEnabled) {
        var options = {
            preserveDrawingBuffer: false,
            antialias: false,
            premultipliedAlpha: true,
            alpha: alphaEnabled,
        };
        var gl = canvas.getContext("webgl2", options);
        if (gl != null) {
            this.textureLOD = true;
            this.version = 2.0;
            this.timerExtension = gl.getExtension('EXT_disjoint_timer_query_webgl2');
        }
        else {
            gl = canvas.getContext("webgl", options);
            if (gl != null) {
                this.version = 1.0;

                var textureLOD = gl.getExtension('EXT_shader_texture_lod');
                this.textureLOD = (textureLOD != null);
            }
            this.timerExtension = gl.getExtension('EXT_disjoint_timer_query');
        }

        this.gl = gl;
        this.alphaEnabled = alphaEnabled;
        if (gl == null) {
            return;
        }

        this._updateHardwareInfo(gl);

        gl.enable(gl.BLEND);
        var err = gl.getError();
        if (err != gl.NO_ERROR) {
            console.error("enable blend returned error: ", err);
        }
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.texcoordBuffer = gl.createBuffer();
        this.positionBuffer = gl.createBuffer();

        this.layerCoordBuffer = gl.createBuffer();
        this.layerCoords = new Float32Array([0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1]);

        this.emptyTexture = this.newTexture(gl.RGBA, null, SizeMake(1, 1));

        this.textures = new WeakMap();
        this.programs = new WeakMap();
        this.framebuffers = [];
    }
    _updateHardwareInfo(gl) {
        var hostInfo = {};
        const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
        var highPerformanceGPU = false;

        if (debugExt != null) {
            var renderer = gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL);
            if (renderer != null) {
                if (renderer.indexOf("Apple") != -1) {
                    // MacBook Pro, M1
                    // Firefox:  Apple M1
                    // Chromium: ANGLE (Apple, Apple M1, OpenGL 4.1)
                    // WebKit:   Apple GPU

                    // MacBook Pro, M1 Pro
                    // Chromium: ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)
                    // WebKit:   Apple GPU
                    highPerformanceGPU = (
                        (renderer.indexOf("Apple M") != -1) ||
                        (renderer == "Apple GPU")
                    );
                }
                else if (renderer.indexOf("Intel") != -1) {
                    // Celeron N4000
                    // Chromium: ANGLE (Intel, Intel(R) UHD Graphics 600 Direct3D11 vs_5_0 ps_5_0, D3D11)

                    // Thinkpad
                    // Chromium: ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)
                    highPerformanceGPU = (renderer.indexOf("Iris") != -1);
                }
                else if (renderer.indexOf("ATI") != -1 || renderer.indexOf("AMD") != -1) {
                    // iMac Intel I5:
                    // Chromium: ANGLE (ATI Technologies Inc., AMD Radeon R9 M390 OpenGL Engine, OpenGL 4.1)
                }
                else if (renderer.indexOf("NVIDIA") != -1) {
                    // While not all nvidias are high performance, for now assume those that
                    // still exist are...

                    // ANGLE (NVIDIA, NVIDIA Quadro T1000 Direct3D11 vs_5_0 ps_5_0, D3D11)
                    highPerformanceGPU = true;
                }
            }
        }

        this._highPerformanceGPU = highPerformanceGPU;
    }
    get highPerformanceGPU() {
        return !!this._highPerformanceGPU;
    }
    /*
     * Properties
     */
    /**
     * @type {RenderLayer}
     * @readonly
     */
    get rootLayer() {
        return this._rootLayer;
    }
    projectionMatrixForSize(size, scale) {
        var w = size.width;
        var h = size.height;
        var z = Math.max(w, h);

        var sX = 2 / w;
        var sY = -2 / h; // invert y-axis
        var sZ = 2 / z;

        var projection = new Float32Array([
            sX, 0, 0, 0,
            0, sY, 0, 0,
            0, 0, sZ, 0,
            -1, 1, 0, 1
        ]);

        if (scale != null) {
            projection = Transform3DScale(projection, 1.0 / scale, 1.0 / scale);
        }

        return projection;
    }
    set size(size) {
        var w = size.width;
        var h = size.height;

        const canvas = this.canvas;
        canvas.width = w;
        canvas.height = h;

        const gl = this.gl;
        gl.viewport(0, 0, w, h);
        this.projection = this.projectionMatrixForSize(size, this.scale);
    }
    get size() {
        const canvas = this.canvas;
        return SizeMake(canvas.width, canvas.height);
    }
    set scale(aScaleValue) {
        this._scale = aScaleValue;
        this.projection = this.projectionMatrixForSize(this.size, aScaleValue);
    }
    get scale() {
        return this._scale;
    }
    /*
     * Rendering
     */
    /**
     * @private
     */
    _bindRenderTarget(fboTexture) {
        const gl = this.gl;
        var framebuffer, size;
        if (fboTexture != null) {
            framebuffer = fboTexture.framebuffer;
            size = fboTexture.size;
        }
        else {
            framebuffer = null;
            size = this.size;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, size.width, size.height);
    }
    /**
     * @private
     */
    pushRenderTarget(fboTexture) {
        const gl = this.gl;
        var renderTargets = this._renderTargets;
        if (renderTargets == null) {
            renderTargets = [];
            this._renderTargets = renderTargets;
        }
        renderTargets.push(fboTexture);

        this._bindRenderTarget(fboTexture);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.blendFunc(gl.ONE, gl.ZERO);
    }
    /**
     * @private
     */
    popRenderTarget() {
        const gl = this.gl;
        var renderTargets = this._renderTargets;
        if (renderTargets == null || renderTargets.length == 0) {
            console.error("unbalanced push/pop?");
            return null;
        }
        var popped = renderTargets.pop();

        if (renderTargets.length > 0) {
            var fboTexture = renderTargets[renderTargets.length - 1];
            this._bindRenderTarget(fboTexture);
        }
        else {
            this._bindRenderTarget(null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, this.size.width, this.size.height);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        return popped;
    }
    /**
     * @private
     */
    renderLayerWithFilterAtTime(layer, filter, timestamp, opacity, projection, model, textureOverride) {
        const gl = this.gl;

        var positionBuffer = this.positionBuffer;
        var texcoordBuffer = this.texcoordBuffer;

        var program = this.programForFilter(filter);
        if (program != this.activeProgram) {
            this.activeProgram = program;
            gl.useProgram(program);
        }

        //
        // Load the layer's contents texture first
        // so we can hand it off to full featured filters
        //
        var contents = layer.contents;
        var contentsTexture = null;
        var contentCoordinates = layer.contentCoordinates;
        if (textureOverride != null) {
            contentsNeedUpdate = false;
            contentsTexture = textureOverride;
        }
        else if (contents != null) {
            var contentsNeedUpdate = layer.contentsNeedUpdate;
            contentsTexture = this.textures.get(contents);

            var textureCount = 1;
            if (contentsTexture != null && contentsTexture.length != null) {
                // contentsTexture may be a single texture or an array
                textureCount = contentsTexture.length;
            }
            if (contentsTexture == null || (contents.textureCount != null && textureCount != contents.textureCount)) {
                if (contents.createTexture != null) {
                    contentsTexture = contents.createTexture(this, gl);
                }
                else {
                    var wrap = layer.wrap;
                    if (wrap != null) {
                        wrap = gl[wrap];
                    }
                    var type = layer.type;
                    if (type != null) {
                        type = gl[type];
                    }

                    var format = gl.RGBA;
                    if (contents.tagName == "VIDEO" && contents.srcObject != null) {
                        //format = gl.RGB;
                        //type =  gl.UNSIGNED_SHORT_5_6_5
                    }
                    contentsTexture = this.newTexture(format, type, null, wrap);
                }

                this.textures.set(contents, contentsTexture);
                contentsNeedUpdate = true;
            }

            if (contentsNeedUpdate == true) {
                if (contents.updateTexture != null) {
                    contents.updateTexture(this, gl, contentsTexture);
                }
                else {
                    var success = this.updateTextureWithElement(contentsTexture, contents);
                    if (success == false) {
                        var delegate = layer.delegate;
                        if (delegate != null && delegate.contentsFailedToUpdateTexture != null) {
                            delegate.contentsFailedToUpdateTexture(contents);
                        }
                    }
                }
                layer.contentsNeedUpdate = false;
            }
        }

        if (filter.vertex != null) {
            filter.prepare(gl, program, timestamp, this, layer, contentsTexture, projection, model, opacity);
            return;
        }

        var benchmark = filter.benchmark;
        if (benchmark == true) {
            this.startTimer(filter);
        }

        if (filter.prepare != null) {
            var newprogram = filter.prepare(gl, program, timestamp, this, layer, contentsTexture);
            if (newprogram != null) {
                program = newprogram;
                this.activeProgram = program;
            }
        }

        //
        // If the filter wants a texture, bind it
        //
        var textureLoc = program.uniforms.u_texture;
        if (textureLoc != null) {
            gl.uniform1i(textureLoc, 0);

            if (contentsTexture == null) {
                contentsTexture = this.emptyTexture;
            }
            gl.bindTexture(gl.TEXTURE_2D, contentsTexture);
            this._lastContentsTexture = contentsTexture;
        }

        var projectionLoc = program.uniforms.u_projection;
        if (projectionLoc != null) {
            gl.uniformMatrix4fv(projectionLoc, false, projection)
        }

        var modelLoc = program.uniforms.u_model;
        if (modelLoc != null) {
            gl.uniformMatrix4fv(modelLoc, false, model)
        }

        var texcoordFromPositionLoc = program.uniforms.u_texcoordFromPosition;
        if (texcoordFromPositionLoc != null) {
            gl.uniform1i(texcoordFromPositionLoc, (layer.usePositionForCoordinate == true));
        }

        var positionLoc = program.attribs.a_position;
        if (positionLoc != null) {
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false /*normalize*/ , 0 /*stride*/ , 0 /*offset*/ );
            gl.bufferData(gl.ARRAY_BUFFER, layer.positions, gl.STATIC_DRAW);
        }

        var opacityLoc = program.uniforms.u_opacity;
        if (opacityLoc != null) {
            gl.uniform1f(opacityLoc, opacity);
        }

        var texcoordLoc = program.attribs.a_texcoord;
        if (texcoordLoc != null) {
            gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
            gl.enableVertexAttribArray(texcoordLoc);
            gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false /*normalize*/ , 0 /*stride*/ , 0 /*offset*/ );
            gl.bufferData(gl.ARRAY_BUFFER, contentCoordinates, gl.STATIC_DRAW);
        }

        var layerCoordLoc = program.attribs.a_layercoord;
        if (layerCoordLoc != null) {
            gl.enableVertexAttribArray(layerCoordLoc);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.layerCoordBuffer);
            gl.vertexAttribPointer(layerCoordLoc, 2, gl.FLOAT, false /*normalize*/ , 0 /*stride*/ , 0 /*offset*/ );
            gl.bufferData(gl.ARRAY_BUFFER, this.layerCoords, gl.STATIC_DRAW);
        }

        var iTimeLoc = program.uniforms.iTime;
        if (iTimeLoc != null) {
            gl.uniform1f(iTimeLoc, timestamp);
        }

        var iResolutionLoc = program.uniforms.iResolution;
        if (iResolutionLoc != null) {
            const size = layer.size;
            // Note: This size isn't going to be the render-size
            // since the layer's size doesn't have the transform
            // applied.  Its primarily useful for figuring out
            // the aspect ratio of the texture being draw.
            var scale = this.scale;
            var iResolution = [size.width / scale, size.height / scale];
            gl.uniform2fv(iResolutionLoc, iResolution);
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (this.checkErrors == true) {
            var err = gl.getError();
            if (err != gl.NO_ERROR) {
                console.error("drawArrays returned error: ", err);
            }
        }
        var targets = this._renderTargets;
        if (targets != null && targets.length > 0) {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }

        if (benchmark == true) {
            this.stopTimer(filter);
        }
    }
    /**
     * @private
     */
    renderLayerAtTime(layer, time, baseOpacity, projection, model) {
        var opacity = baseOpacity * layer.opacity;

        if (layer.hidden == true || opacity <= 0) {
            // Layer isn't visible, so nothing to render
            return;
        }

        var sublayers = layer.sublayers;
        var filters = layer.filters;
        var contents = layer.contents;
        var contentFilter = null;
        if (contents != null) {
            contentFilter = contents.filter;
            if (contentFilter != null) {
                filters.splice(0, 0, contentFilter);
            }
        }

        // Remove any disabled filters
        // for loop due to performance
        for (var filterIdx = 0; filterIdx < filters.length; filterIdx += 1) {
            if (filters[filterIdx].enabled == false) {
                filters.splice(filterIdx, 1);
                filterIdx -= 1;
            }
        }

        if (contents == null && sublayers.length == 0 && filters.length == 0) {
            // Layer has nothing to display
            return;
        }

        // If the layer has a mask, push a masking filter
        var mask = layer.mask;
        var maskFilter = null;
        if (mask != null) {
            maskFilter = layer.maskFilter;
            if (maskFilter == null) {
                maskFilter = this.maskFilters.get(layer);
                if (maskFilter == null) {
                    maskFilter = new layer.maskClass();
                    layer.maskFilter = maskFilter;
                }
                this.maskFilters.set(layer, maskFilter);
            }

            // The presenter chained filters expect
            // the mask to happen first (e.g. before the VignetteFilter)
            // But if the layer has sublayers, the mask would need to
            // come last in order to mask all of the sublayers too.
            if (sublayers.length == 0) {
                // If the content needs a special filter, it
                // must come before the mask... otherwise the
                // mask would mask some garbled contents
                var index = (contentFilter != null ? 1 : 0);
                filters.splice(index, 0, maskFilter);
            }
            else {
                filters.push(maskFilter);
            }
        }

        // Complex render: Has many filters, or
        // a filter applied to sublayers...
        var complexRender = false;
        switch (filters.length) {
            case 0:
                // no filters, easy peasy
                break;
            case 1:
                // One filter is easy if we don't have sublayers
                // Or if the filter doesn't modify the contents
                complexRender = filters[0].modifiesContents && (sublayers.length > 0);
                break;
            default:
                // Many filters which will need to be chained
                complexRender = true;
                break;
        }

        var enqueue = null;
        if (layer instanceof RendererFramebufferLayer) {
            // Get the current framebuffer contents
            const fboTexture = this.popRenderTarget();

            if (fboTexture != null) {
                // We'll enqueue this later: if we do
                // so now, we risk dequeing it before we're finished

                enqueue = fboTexture;
                // Store the texture in the cache for when the layer goes to draw
                var texture = fboTexture.texture;
                this.textures.set(contents, texture);

                // Need to re-draw them into the new framebuffer
                var framebufferLayer = this._framebufferLayer;
                framebufferLayer.contentsNeedUpdate = false;
                this.renderLayerWithFilterAtTime(framebufferLayer, this.inOutFilter, time, 1.0, framebufferLayer.projection, framebufferLayer.model, texture);
            }
        }

        const gl = this.gl;
        let fboTexture = null;
        var innerProjection = projection;
        var frame = layer.frame;
        if (complexRender == true) {
            // XXX: Not entirely sure what the best size is:
            // layer.frame: A presenter layer has a size of 1920x1080
            // layer.naturalSize: The contents texture may only be 1280x720 (e.g. FaceTime camera)
            // layer.boundingBox: And the render size may be significantly smaller (320x240 at 25% scale)
            //
            // Bounding box may swap width/height though due to rotation
            //
            var size = layer.naturalSize;
            fboTexture = this.dequeueFramebufferTextureOfSize(size);
            this.pushRenderTarget(fboTexture);

            innerProjection = this.projectionMatrixForSize(size);
            // The FBO textures have a flipped Y axis, so flip it back...
            innerProjection = Transform3DTranslate(innerProjection, 0, size.height, 0);
            innerProjection = Transform3DScale(innerProjection, 1, -1, 1);
        }

        var swapContentCoordinates = false;
        // We'll want to render ourself first
        {
            var filter = null;
            if (filters.length > 0) {
                if (filters[0].modifiesContents == false || sublayers.length == 0) {
                    filter = filters[0];
                    filters = filters.slice(1);
                }
            }

            if (filter == null) {
                if (contents != null) {
                    filter = this.inOutFilter;
                }
            }

            // If the layer has no contents, and the filters don't
            // provide the contents, we have nothing to do for this
            // layer
            if (filter != null) {
                var rOpacity = opacity;
                let rLayer = null;
                var rModel = null;
                if (fboTexture == null) {
                    rLayer = layer;
                    rModel = model;
                }
                else {
                    // We're rendering into offscreen framebuffer/texture:
                    // We don't want the opacity/transform/etc of the layer
                    // just yet, so we create a dummy layer.
                    rLayer = new RenderLayer();
                    rLayer.frame = RectMake(0, 0, size.width, size.height);
                    rLayer._setContentsAddingListener(layer.contents, false);
                    rLayer.contentsNeedUpdate = layer.contentsNeedUpdate;
                    rLayer.delegate = layer.delegate;
                    if (filter == maskFilter) {
                        rLayer.mask = layer.mask;
                        rLayer.maskNeedsUpdate = layer.maskNeedsUpdate;
                    }
                    if (filter == maskFilter || maskFilter == null) {
                        rLayer.contentRect = layer.contentRect;
                    }
                    rOpacity = 1.0;
                    rModel = Transform3DIdentity();
                    swapContentCoordinates = true;
                }

                this.renderLayerWithFilterAtTime(rLayer, filter, time, rOpacity, innerProjection, rModel, null);

                layer.contentsNeedUpdate = rLayer.contentsNeedUpdate;
            }
        }

        // Then render the sublayers
        if (sublayers.length > 0) {
            var sublayerProjection = innerProjection;

            // for loop due to performance
            var numSublayers = sublayers.length;
            for (let sublayerIdx = 0; sublayerIdx < numSublayers; sublayerIdx += 1) {
                var sublayer = sublayers[sublayerIdx];
                var sublayerModel = sublayer.model;
                if (complexRender == false) {
                    sublayerModel = Transform3DConcat(sublayerModel, model);
                }
                this.renderLayerAtTime(sublayer, time, opacity, sublayerProjection, sublayerModel);
            }
        }

        // Then the remaining filters
        var drawable = null;
        var drawableFilter = null;
        if (filters.length > 0) {
            drawable = fboTexture.texture;

            // We create a dummy layer that doesn't contain
            // transformations, opacity, etc.
            var rLayer = new RenderLayer();
            rLayer.frame = RectMake(0, 0, size.width, size.height);
            rLayer.delegate = layer.delegate;

            const rModel = Transform3DIdentity();

            var lastFilterFBO = null;
            // for loop due to performance
            var numFilters = filters.length;
            for (let filterIdx = 0; filterIdx < numFilters - 1; filterIdx += 1) {
                var aFilter = filters[filterIdx];
                // Create a new framebuffer texture to render into
                var filterFBO = this.dequeueFramebufferTextureOfSize(size);
                this.pushRenderTarget(filterFBO);

                if (aFilter == maskFilter) {
                    rLayer.mask = layer.mask;
                    rLayer.maskNeedsUpdate = layer.maskNeedsUpdate;
                    rLayer.contentRect = layer.contentRect;
                }

                // Render the filter against the current drawable
                this.renderLayerWithFilterAtTime(rLayer, aFilter, time, 1.0, innerProjection, rModel, drawable);

                // Restore the previous framebuffer
                this.popRenderTarget();

                // Release resources we no longer need
                if (lastFilterFBO != null) {
                    this.enqueueFramebufferTexture(lastFilterFBO);
                }

                if (aFilter == maskFilter) {
                    rLayer.contentRect = RectMake(0, 0, 1, 1);
                    layer.maskNeedsUpdate = false;
                }

                lastFilterFBO = filterFBO;
                drawable = filterFBO.texture;
            }

            if (lastFilterFBO != null) {
                this.enqueueFramebufferTexture(lastFilterFBO);
            }

            drawableFilter = filters[numFilters - 1];
        }

        // We're done drawing to the offscreen texture
        if (fboTexture != null) {
            this.popRenderTarget();
            if (drawable == null) {
                drawable = fboTexture.texture;
            }
        }

        // We have something to draw to the current framebuffer
        if (drawable != null) {
            if (drawableFilter == maskFilter) {
                swapContentCoordinates = false;
            }
            var swappedCCs = null;
            if (swapContentCoordinates == true) {
                swappedCCs = layer.contentCoordinates;
                layer._contentCoordinates = this.layerCoords;
            }

            this.renderLayerWithFilterAtTime(layer, drawableFilter, time, opacity, projection, model, drawable);

            if (swappedCCs != null) {
                layer._contentCoordinates = swappedCCs;
            }
        }

        // We're done with the offscreen framebuffer/texture
        if (fboTexture != null) {
            this.enqueueFramebufferTexture(fboTexture);
        }

        if (enqueue != null) {
            this.enqueueFramebufferTexture(enqueue);
        }
    }
    getRenderableLayers(rootLayer, renderSize) {
        if (rootLayer == null) {
            rootLayer = this.rootLayer;
        }
        if (renderSize == null) {
            renderSize = this.size;
        }

        //
        // Collect all of the visible layers
        //
        var renderable = [];
        var collectLayers = function(fromLayer, model, opacity) {
            opacity *= fromLayer.opacity;
            if (fromLayer.hidden == true || opacity <= 0) {
                return;
            }

            const frame = fromLayer.frame;
            const transform = Transform3DConcat(
                model,
                fromLayer.model,
            );

            if (fromLayer.contents != null || fromLayer.filters.length > 0) {
                const topLeft = Transform3DProjectPoint(transform, PointZero());
                const bottomRight = Transform3DProjectPoint(transform, PointMake(RectGetWidth(frame), RectGetHeight(frame)));
                const extent = SizeMake(bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);

                const origin = PointCopy(topLeft);
                if (origin.x < 0) {
                    extent.width += origin.x;
                    origin.x = 0;
                }
                if (origin.y < 0) {
                    extent.height += origin.y;
                    origin.y = 0;
                }

                if (origin.x + extent.width > renderSize.width) {
                    extent.width = renderSize.width - origin.x;
                }
                if (origin.y + extent.height > renderSize.height) {
                    extent.height = renderSize.height - origin.y;
                }

                renderable.push({
                    layer: fromLayer,
                    box: RectIntegral(RectMake(origin.x, origin.y, extent.width, extent.height)),
                    opacity: opacity,
                    visible: true,
                });
            }

            fromLayer.sublayers.forEach(sublayer => collectLayers(sublayer, transform, opacity));
        }
        collectLayers(rootLayer, Transform3DIdentity(), 1.0);

        //
        // Skip rendering layers that are completely covered by opaque content
        //
        var skippedLayers = null;
        for (var topIdx = renderable.length - 1; topIdx >= 0; topIdx -= 1) {
            const top = renderable[topIdx];
            if (top.visible == false) {
                // we have already encountered it inside this loop
                continue;
            }
            else if (top.opacity < 1.0) {
                continue;
            }
            else if (top.layer.opaque == false) {
                continue;
            }

            const tBox = top.box;
            for (var botIdx = topIdx-1; botIdx >= 0; botIdx -= 1) {
                const bottom = renderable[botIdx];
                const bBox = bottom.box;

                if (RectEquals(tBox, bBox) == false &&
                    RectContainsRect(tBox, bBox) == false)
                {
                    continue;
                }

                bottom.visible = false;
                bottom.obscuredBy = top.layer;
            }
        }

        return renderable;
    }
    layersObscuringLayer(otherLayer) {
        const renderable = this.getRenderableLayers();
        return renderable.filter(entry => {
            if (entry.visible == true) {
                return false;
            }

            const eLayer = entry.layer;
            if (eLayer == otherLayer) {
                return true;
            }
            if (eLayer.isDescendentOfLayer(otherLayer) == true) {
                return true;
            }
            if (eLayer.isAncestorOfLayer(otherLayer) == true) {
                return true;
            }
        }).map(entry => entry.obscuredBy);
    }
    willLayerBeRendered(otherLayer) {
        const obscurers = this.layersObscuringLayer(otherLayer);
        return (obscurers.length == 0);
    }
    /**
     * @param {number} timestamp The timestamp for the render job
     * @return {number} duration of the render
     */
    render(timestamp) {
        var benchmark = this.benchmark;
        if (benchmark != null) {
            this.startTimer(benchmark);
        }
        var timeSource = performance ? performance : Date;

        var start = timeSource.now();
        const gl = this.gl;
        const clearColor = this.clearColor;

        var useBlitRenderer = this.useBlitRenderer;
        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var iTime = timestamp / 1000.0;
        var projection = this.projection;

        const size = this.size;
        var layer = this.rootLayer;

        //
        // Collect all of the visible layers
        //
        var renderable = this.getRenderableLayers(layer, size);

        //
        // Skip rendering layers that are completely covered by opaque content
        //
        var skippedLayers = null;
        for (var entryIdx = renderable.length - 1; entryIdx >= 0; entryIdx -= 1) {
            const entry = renderable[entryIdx];
            if (entry.visible == true) {
                continue;
            }

            if (skippedLayers == null) {
                skippedLayers = [];
            }

            const eLayer = entry.layer;
            skippedLayers.push(eLayer);
            eLayer.hidden = true;
        }

        // Find out how many layers have contents: RendererFramebufferContents
        const numberOfLayersNeedingFramebuffer = function(layer) {
            if (layer.hidden == true || layer.opacity <= 0) {
                return 0;
            }

            var r = 0;
            if (layer instanceof RendererFramebufferLayer) {
                r += 1;
            }
            var sublayers = layer.sublayers;
            for (var idx = 0; idx < sublayers.length; idx += 1) {
                r += numberOfLayersNeedingFramebuffer(sublayers[idx]);
            }
            return r;
        }

        var count = numberOfLayersNeedingFramebuffer(layer);
        if (useBlitRenderer == true) {
            count += 1;
        }
        if (count > 0) {
            var framebufferLayer = this._framebufferLayer;
            if (framebufferLayer == null) {
                framebufferLayer = new RenderLayer();
                this._framebufferLayer = framebufferLayer;
            }

            if (SizeEquals(size, framebufferLayer.size) == false) {
                framebufferLayer.frame = RectMake(0, 0, size.width, size.height);
                framebufferLayer.projection = this.projectionMatrixForSize(size);
                framebufferLayer.contentSize = SizeMake(1, -1);
            }

            // Push N framebuffers so these layers can access them as textures
            for (var num = 0; num < count; num += 1) {
                var alpha = (num == 0 && useBlitRenderer == true) ? true : false;
                var fboTexture = this.dequeueFramebufferTextureOfSize(size, alpha);
                this.pushRenderTarget(fboTexture);
            }
        }

        // Now we can render
        this.renderLayerAtTime(layer, iTime, layer.opacity, projection, layer.model);

        // And restore the hidden flag for the layers we hide from the renderer
        if (skippedLayers != null && skippedLayers.length > 0) {
            skippedLayers.forEach(layer => layer.hidden = false);
        }

        if (useBlitRenderer == true) {
            var target = this.popRenderTarget();
            var filter = null;
            if (this.alphaEnabled == true) {
                filter = this.inOutFilter;
            }
            else {
                filter = this.inOutNoAlphaFilter;
            }

            this.renderLayerWithFilterAtTime(
                this._framebufferLayer,
                filter,
                iTime,
                1.0,
                framebufferLayer.projection,
                framebufferLayer.model,
                target.texture
            );
            this.enqueueFramebufferTexture(target);
        }

        var end = timeSource.now();

        if (benchmark != null) {
            this.stopTimer(benchmark, end - start);
        }

        return (end - start);
    }
    /*
     * Render timing info
     */
    startTimer(target) {
        var timerExt = this.timerExtension;
        if (timerExt == null) {
            return;
        }

        var queryPool = this.queryPool;
        if (queryPool == null) {
            queryPool = [];
            this.queryPool = queryPool;
        }

        if (queryPool != null && queryPool.length > 0) {
            var last = queryPool[queryPool.length - 1];
            if (last.ended == false) {
                // We can't have multiple timers running concurrently
                // so end the previous one...
                this.stopTimer(last.target, null);
            }
        }

        var benchmarkQuery = null;
        if (this.version == 2) {
            var gl = this.gl;
            benchmarkQuery = gl.createQuery();
            gl.beginQuery(timerExt.TIME_ELAPSED_EXT, benchmarkQuery);
        }
        else {
            benchmarkQuery = timerExt.createQueryEXT();
            timerExt.beginQueryEXT(timerExt.TIME_ELAPSED_EXT, benchmarkQuery);
        }

        queryPool.push({
            target: target,
            query: benchmarkQuery,
            ended: false,
        });
    }
    stopTimer(target, userInfo) {
        var timerExt = this.timerExtension;
        if (timerExt == null) {
            return;
        }

        var queryPool = this.queryPool;
        if (queryPool == null || queryPool.length == 0) {
            return;
        }

        var last = queryPool[queryPool.length - 1];
        if (last.ended == false) {
            last.ended = true;

            if (this.version == 2) {
                this.gl.endQuery(timerExt.TIME_ELAPSED_EXT);
            }
            else {
                timerExt.endQueryEXT(timerExt.TIME_ELAPSED_EXT);
            }
        }

        last.userInfo = userInfo;
        this.processQueryPool();
    }
    processQueryPool() {
        var queryPool = this.queryPool
        var gl = this.gl;
        var timerExt = this.timerExtension;
        var idx = 0;
        var version = this.version;
        while (idx < queryPool.length) {
            var entry = queryPool[idx];
            var query = entry.query;
            var available = null;
            if (version == 2) {
                available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
            }
            else {
                available = timerExt.getQueryObjectEXT(query, timerExt.QUERY_RESULT_AVAILABLE_EXT);
            }

            if (available == false) {
                if (queryPool.length > 30) {
                    queryPool.splice(idx, 1);
                }
                else {
                    idx += 1;
                }
                continue;
            }

            var disjoint = gl.getParameter(timerExt.GPU_DISJOINT_EXT);
            if (disjoint != null || version == 2) {
                var ns = null;
                if (version == 2) {
                    ns = gl.getQueryParameter(query, gl.QUERY_RESULT);
                }
                else {
                    ns = timerExt.getQueryObjectEXT(query, timerExt.QUERY_RESULT_EXT);
                }

                var target = entry.target;
                var ms = ns * 0.000001;
                if (target != null) {
                    target.benchmarkResultDelivered(ms, entry.userInfo);
                }
                else {
                    console.log("available, disjoint, ns, ms", available, disjoint, ns, ms);
                }
            }
            queryPool.splice(idx, 1);
        }
    }
    /*
     * Shaders
     */
    /**
     * @private
     */
    programForFilter(filter) {
        var program = this.programs.get(filter);
        if (program == null) {
            if (filter.willCompileInRenderer != null) {
                program = filter.willCompileInRenderer(this);
            }
            if (program == null) {
                program = this.newProgram(filter.fragment, filter.uniforms, filter.vertex, filter.attribs);
                if (program == null) {
                    console.error("Error compiling: ", filter);
                    // Use the default to prevent trying to compile this again
                    program = this.inOutProgram;
                }
            }
            this.programs.set(filter, program);
            if (filter.initialize != null) {
                filter.initialize(this.gl, program, this);
            }
        }
        return program;
    }
    /**
     * @private
     */
    newProgram(fragment, uniforms, vertex, attribs) {
        if (vertex == null) {
            vertex = RendererVertex;
            attribs = ["a_position", "a_texcoord", "a_layercoord"];
            uniforms = uniforms.concat(["u_model", "u_projection", "u_texcoordFromPosition"]);
        }
        const gl = this.gl;
        const vs = gl.createShader(gl.VERTEX_SHADER);
        if (vs == null) {
            console.error("Failed to create a vertex shader, gl is: ", gl);
            return null;
        }
        gl.shaderSource(vs, vertex);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        if (fs == null) {
            console.error("Failed to create a fragment shader, gl is: ", gl);
            return null;
        }

        var header = "";
        if (this.textureLOD == false) {
            header += "#define textureLod(x,y,z) texture2D(x,y)\n"
        }
        else {
            if (this.version == 2.0) {
                header += "#define textureLod(x,y,z) texture2D(x,y,z)\n"
            }
            else if (this.version == 1.0) {
                header += "#extension GL_EXT_shader_texture_lod : enable\n";
                header += "#define textureLod(x,y,z) texture2DLodEXT(x,y,z)\n"
            }
        }
        if (header.length > 0) {
            fragment = header + fragment;
        }
        gl.shaderSource(fs, fragment);
        gl.compileShader(fs);

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(vs));
            return null;
        }

        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(fs));
            return null;
        }

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(program));
            return null;
        }

        program.attribs = {};
        for (let idx = 0; idx < attribs.length; idx += 1) {
            const name = attribs[idx];
            const location = gl.getAttribLocation(program, name);
            if (location == -1 || location == null) {
                // Android seems quite aggressive about finding unused variables
                // and while `a_layercoord` is always populated in the vertex shader,
                // most fragment shaders don't use it so its end up logging here.
                if (name != "a_layercoord") {
                    console.error("Could not find location for attrib named: " + name)
                }
            }
            else {
                program.attribs[name] = location;
            }
        }

        program.uniforms = {};
        for (let idx = 0; idx < uniforms.length; idx += 1) {
            const name = uniforms[idx];
            const location = gl.getUniformLocation(program, name);
            if (location == -1 || location == null) {
                console.error("Could not find location for uniform named: " + name)
            }
            else {
                program.uniforms[name] = location;
            }
        }

        return program;
    }
    /*
     * Textures
     */
    /**
     * @private
     */
    newTexture(format, type, size, wrap) {
        const gl = this.gl;
        const texture = gl.createTexture();
        if (texture == null) {
            console.error("Failed to create a new texture, gl is: ", gl);
            return null;
        }
        if (size != null) {
            if (size.width == 0) {
                size.width = 1;
            }
            if (size.height == 0) {
                size.height = 1;
            }
        }
        if (format == null) {
            format = gl.RGBA;
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // The media might not be available yet (network)
        // so create a 1x1 texture so it can be used immediately
        const level = 0;
        const internalFormat = format;
        const width = (size == null) ? 1 : size.width;
        const height = (size == null) ? 1 : size.height;
        const border = 0;
        const srcFormat = format;
        const srcType = (type != null) ? type : gl.UNSIGNED_BYTE;
        var pixel;
        if (size != null) {
            pixel = null;
        }
        else {
            if (format == gl.RGBA) {
                pixel = new Uint8Array([0, 0, 0, 0]);
            }
            else if (format == gl.RGB) {
                pixel = new Uint8Array([0, 0, 0]);
            }
            else {
                pixel = new Uint8Array(1);
            }
        }
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
            width, height, border, srcFormat, srcType,
            pixel);

        if (wrap == null) {
            wrap = gl.CLAMP_TO_EDGE;
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        texture.format = format;
        texture.type = srcType;
        return texture;
    }
    /**
     * @private
     */
    updateTextureWithElement(texture, element) {
        if (texture == null || element == null) {
            //console.error("passed null texture and/or element", texture, element);
            //if (gLocalDeployment == true) {
            //    debugger;
            //}
            return false;
        }
        if (element.tagName === "IMG") {
            // When uploading an image if it is too slow this can fire before the image is actaully ready to be displayed
            // This avoids a problem with texImage2D
            if (element.width < 1 || element.height < 1 || element.src == null || element.srcset == null) {
                return true;
            }
        }

        const gl = this.gl;
        const level = 0;
        var format = texture.format;
        if (format != null) {
            if (format instanceof String) {
                format = gl[format];
            }
        }
        if (format == null) {
            format = gl.RGBA;
        }
        var type = texture.type;
        if (type == null) {
            type = gl.UNSIGNED_BYTE;
        }

        const internalFormat = format;
        const srcFormat = format;
        const srcType = type;
        gl.bindTexture(gl.TEXTURE_2D, texture);

        try {
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                srcFormat, srcType, element);
            return true;
        }
        catch (err) {
            console.error("Error updating texture for layer, will use solid color", err, element);
            gl.texImage2D(
                gl.TEXTURE_2D,
                0, // level
                gl.RGBA, // internal format
                1, // width
                1, // height
                0, // border
                gl.RGBA, // format
                gl.UNSIGNED_BYTE, // type
                new Uint8Array([0, 0, 0, 255]) // solid black
            );
            return false;
        }
    }

    textureNamed(name, wrap) {
        var key = { name };
        var texture = this.textures.get(key);
        if (texture != null) {
            return texture;
        }

        var gl = this.gl;
        if (wrap == null) {
            wrap = gl.CLAMP_TO_EDGE;
        }
        texture = this.newTexture(gl.RGBA, null, null, wrap);
        this.textures.set(key, texture);

        var image = new Image();
        image.onload = () => {
            this.updateTextureWithElement(texture, image);
        };
        image.src = name;

        return texture;
    }
    copyTextureFromLayerToLayer(source, dest) {
        const texture = this.textures.get(source.contents);
        if (texture == null) {
            return false;
        }
        dest.contentsNeedUpdate = false;
        this.textures.set(dest.contents, texture);
        return true;
    }
    /**
     * @private
     */
    enqueueFramebufferTexture(fbo) {
        this.framebuffers.push(fbo);
        this.textures.delete(fbo);
    }
    /**
     * @private
     */
    dequeueFramebufferTextureOfSize(size, alphaChannel = true) {
        var framebuffers = this.framebuffers;
        var fbo = framebuffers.find(a =>
            a.size.width == size.width &&
            a.size.height == size.height &&
            a.alphaChannel == alphaChannel
        );

        if (fbo != null) {
            var index = framebuffers.indexOf(fbo);
            framebuffers.splice(index, 1);
            return fbo;
        }

        const gl = this.gl;
        var format = null;
        if (alphaChannel == true) {
            format = gl.RGBA;
        }
        else {
            format = gl.RGB;
        }

        const texture = this.newTexture(format, null, size);
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        fbo = { texture: texture, framebuffer: fb, size: size, alphaChannel: alphaChannel };
        return fbo;
    }

    async snapshot(snapshotSize, mimeType = "image/png", options = []) {
        if (snapshotSize == null) {
            snapshotSize = this.size;
        }

        // Render into a framebuffer that's only for this snapshot,
        // then remove that bufffer when we're done
        var fboTexture = this.dequeueFramebufferTextureOfSize(snapshotSize, false);
        this.pushRenderTarget(fboTexture);

        // Drawing to the offscreen buffer is coming through upside down
        // Invert the y-axis on the projection matrix to resolve this
        var projection = this.projection;
        var flipped = new Float32Array(projection);
        flipped[5] = -flipped[5];
        flipped[13] = -flipped[13];
        this.projection = flipped;

        var pixels = null;
        try {
            // Ready to render
            this.render(0, false);

            // Read the data back out of the GL context
            var gl = this.gl;
            pixels = new Uint8ClampedArray(snapshotSize.width * snapshotSize.height * 4);
            gl.readPixels(0, 0, snapshotSize.width, snapshotSize.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        }
        catch (err) {
            console.error("render error: ", err);
            throw err;
        }
        finally {
            // Restore original projection
            this.projection = projection;

            // Ensure the next draw call goes to the regular framebuffer
            this.popRenderTarget();
        }

        if (pixels == null) {
            return null;
        }

        var image = new ImageData(pixels, snapshotSize.width, snapshotSize.height);

        // Draw the image to a canvas, convert it to the requested type,
        // and return the image data as a Blob
        var canvas = document.createElement("canvas");
        canvas.width = snapshotSize.width;
        canvas.height = snapshotSize.height;
        canvas.style.position = "absolute";
        canvas.style.left = "0px";
        canvas.style.top = "0px";

        var context = canvas.getContext("2d");
        context.putImageData(image, 0, 0)

        return new Promise((resolve, reject) => {
            var args = [resolve, mimeType];
            args = args.concat(options);
            try {
                canvas.toBlob.apply(canvas, args);
            }
            catch (err) {
                console.error("canvas.toBlob threw: ", args, err);
                reject(err);
            }
        });
    }
}
