//
//  rooms_shaders.js
//  mmhmm
//
//  Created by Steve White on 8/9/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

Room.Shader = class extends Room {
    constructor(identifier, title, thumbnailSrc, shader, excludeFromDefaults) {
        super(identifier, title, thumbnailSrc);
        this.shader = shader;
        this.excludeFromDefaults = excludeFromDefaults;
        this.restoreSettings();
    }
    get hash() {
        const shader = this.shader;
        const parameters = shader.parameters;
        let string = "";
        for (let key in parameters) {
            string += key;
            const value = shader[key];
            string += value.toString();
        }
        return cyrb53(string);
    }
    _hasSettings() {
        var shader = this.shader;
        if (shader == null) {
            return false;
        }
        var parameters = shader.parameters;
        if (parameters == null || Object.keys(parameters).length == 0) {
            return false;
        }
        return true;
    }
    persistSettings() {
        if (this._hasSettings()) {
            var shader = this.shader;
            var parameters = shader.parameters;

            var settings = {};
            for (key in parameters) {
                settings[key] = shader[key];
            }
            SharedUserDefaults.setValueForKey(settings, this.identifier);
        }
    }
    restoreSettings() {
        if (this._hasSettings()) {
            var shader = this.shader;
            var parameters = shader.parameters;

            var storedSettings = SharedUserDefaults.getValueForKey(this.identifier);
            for (key in storedSettings) {
                // Make sure this is a known setting
                if (key in parameters) {
                    shader[key] = storedSettings[key];
                }
            }
        }
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        this.layer.filter = this.shader;
        this.shader.basetime = null;
    }
    didDetachFromStage(stage) {
        super.didDetachFromStage(stage);
        if (this.shader.reset != null) {
            this.shader.reset();
        }
    }
    applyEvent(event, sender) {
        super.applyEvent(event, sender);
        if (event == null) {
            return;
        }

        var shader = event.shader;
        if (shader != null) {
            this.shader.applyEvent(shader);
        }
    }
    toJSON() {
        var result = super.toJSON();
        result.shader = this.shader.toJSON();
        return result;
    }
    doesParameterKeyAffectThumbnail(key) {
        return true;
    }
    parameterChangedValue(key) {
        if (this.applyingEvent == true) {
            return;
        }
        this.persistSettings();

        var shader = this.shader;
        var value = shader[key];
        var parameter = shader.parameters[key];
        var type = null;
        if (parameter != null) {
            type = parameter.type;
        }

        var userInfo = {
            key: key,
            value: value,
            type: type,
        }

        NotificationCenter.default.postNotification(
            Room.Notifications.SettingsChanged,
            this,
            userInfo
        );

        if (this.doesParameterKeyAffectThumbnail(key) == true) {
            this._postThumbnailChangedNotification();
        }
    }
}

Room.Shader.Filter = class extends RenderFilter {
    /**
     * @constructor
     * @override
     */
    constructor(fragment, uniforms, parameters) {
        super(fragment, uniforms, parameters);
        this.benchmark = true;
    }
    /**
     * @private
     */
    benchmarkResultDelivered(msTime) {
        var times = this.benchmarkTimes;
        if (times == null) {
            times = [];
            this.benchmarkTimes = times;
        }
        times.push(msTime);
        if (times.length < 10) {
            return;
        }
        var total = times.reduce((acc, cur) => cur + acc, 0);
        var mean = total / times.length;
        this.benchmarkTimes = null;

        // The app targets 30fps, but if this shader
        // takes 30fps, then the overall will drop
        // because there's other work to be done.
        // So we target a little higher than 30fps
        var threshold = 1000.0 / 45.0;
        var scale = this.lowResScale;
        if (scale == null) {
            scale = 1;
        }

        if (mean < threshold || scale >= 4) {
            this.benchmark = false;
            return;
        }

        if (this.prepareOrig == null) {
            this.prepareOrig = this.prepare;
            this.prepare = this.prepareLowResolution;
        }

        this.lowResScale = scale + 1;
    }
    /**
     * @private
     */
    goLowRes() {
        this.prepareOrig = this.prepare;
        this.prepare = this.prepareLowResolution;
    }
    /**
     * @private
     */
    prepareLowResolution(gl, program, timestamp, renderer, layer, contentsTexture) {
        var originalSize = SizeMake(layer.frame.width, layer.frame.height);
        var scale = this.lowResScale;
        var size = SizeMake(
            originalSize.width / scale,
            originalSize.height / scale
        );

        // Let the original filter prepare itself
        this.prepareOrig.apply(this, arguments);

        // We need a framebuffer to draw a downscaled shader into
        var framebuffer = renderer.dequeueFramebufferTextureOfSize(size);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.framebuffer);
        gl.viewport(0, 0, size.width, size.height);

        // It may have been previously used, so clear it
        gl.clearDepth(1.0);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Bind the things...
        var iResolutionLoc = program.uniforms.iResolution;
        if (iResolutionLoc != null) {
            gl.uniform2fv(iResolutionLoc, [size.width, size.height]);
        }

        var opacityLoc = program.uniforms.u_opacity;
        if (opacityLoc != null) {
            gl.uniform1f(opacityLoc, 1.0);
        }

        var projectionLoc = program.uniforms.u_projection;
        if (projectionLoc != null) {
            var projection = renderer.projectionMatrixForSize(originalSize, 1.0);
            // Revert the vertical mirroring that projectionMatrixForSize applies
            projection[5] = -projection[5];
            projection[13] = -projection[13];
            gl.uniformMatrix4fv(projectionLoc, false, projection);
        }

        var modelLoc = program.uniforms.u_model;
        if (modelLoc != null) {
            gl.uniformMatrix4fv(modelLoc, false, layer.model);
        }

        var positionLoc = program.attribs.a_position;
        if (positionLoc != null) {
            var positions = [
                // triangle 1
                0, 0,
                0, size.height,
                size.width, 0,
                // triangle 2
                size.width, 0,
                0, size.height,
                size.width, size.height
            ];
            gl.bindBuffer(gl.ARRAY_BUFFER, renderer.positionBuffer);
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false /*normalize*/ , 0 /*stride*/ , 0 /*offset*/ );
            gl.bufferData(gl.ARRAY_BUFFER, layer.positions, gl.STATIC_DRAW);
        }

        //
        // Draw the down-scaled shader
        //
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        /*
        var pixels = new Uint8Array(size.width * size.height * 4);
        gl.readPixels(0, 0, size.width, size.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        console.log("pixels: ", pixels.find(i => i != 0));
        */
        //
        // Restore the framebuffer
        //
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        var realSize = renderer.size;
        gl.viewport(0, 0, realSize.width, realSize.height);

        // Switch to the texture in/out program
        program = renderer.programForFilter(renderer.inOutFilter);
        gl.useProgram(program);

        // Bind texture related things, as the renderer
        // likely will not do this when we return,
        // as it will see the layer has no contents
        gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture);
        gl.uniform1i(program.uniforms.u_texture, 0);

        renderer.enqueueFramebufferTexture(framebuffer);
        return {
            uniforms: {
                u_opacity: program.uniforms.u_opacity,
                u_projection: program.uniforms.u_projection,
                u_model: program.uniforms.u_model,
            },
            attribs: {
                a_position: program.attribs.a_position,
                a_texcoord: program.attribs.a_texcoord,
            },
        };
    }
    reset() {
        this.benchmark = true;
        this.benchmarkTimes = null;
        this.lowResScale = null;
        if (this.prepareOrig != null) {
            this.prepare = this.prepareOrig;
            this.prepareOrig = null;
        }
    }
}
