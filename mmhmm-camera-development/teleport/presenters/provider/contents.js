//
//  presenters/provider/contents.js
//  mmhmm
//
//  Created by Steve White on 11/11/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class PresenterVideoContents extends RendererContents {
    destroy() {
        if (this.videoFrame) {
            this.videoFrame.close();
        }
        this.videoFrame = null;
        this.contents = null;
        this.onDestroy();
    }
    set videoFrame(aVideoFrameOrNull) {
        var previous = this._videoFrame;
        if (previous != null) {
            previous.close();
        }

        this._videoFrame = aVideoFrameOrNull;
    }
    get videoFrame() {
        return this._videoFrame;
    }
    set contents(aRenderableOrNull) {
        this._contents = aRenderableOrNull;
    }
    get contents() {
        return this._contents;
    }
    get textureCount() {
        return this.filter?.textureCount ?? 1;
    }
    createTexture(renderer, gl) {
        var filter = this.filter;
        if (filter == null) {
            var contents = this.contents ?? this.videoFrame;
            if (contents != null) {
                return renderer.newTexture(gl.RGBA, gl.UNSIGNED_BYTE, null, gl.CLAMP_TO_EDGE)
            }
            return null;
        }

        var sizes = filter.textureSizesFor(this.size);
        var formats = filter.textureFormatsIn(gl);

        var textures = [];
        for (var idx = 0; idx < sizes.length; idx += 1) {
            var texture = renderer.newTexture(
                formats[idx],
                gl.UNSIGNED_BYTE,
                sizes[idx],
                gl.CLAMP_TO_EDGE
            );
            textures.push(texture);
        }
        return textures;
    }
    updateTexture(renderer, gl, texture) {
        this.hitTestMask = null;

        var videoFrame = this.videoFrame;
        var filter = this.filter;
        var layout = this.layout;
        if (filter == null || layout == null) {
            var contents = this.contents ?? videoFrame;
            if (contents != null) {
                renderer.updateTextureWithElement(texture, contents);
            }
            return;
        }

        var sizes = filter.textureSizesFor(this.size);
        var formats = filter.textureFormatsIn(gl);
        var textures = texture;
        var buffer = this.buffer;

        for (var idx = 0; idx < textures.length; idx += 1) {
            gl.bindTexture(gl.TEXTURE_2D, textures[idx]);
            var format = formats[idx];
            var size = sizes[idx];

            gl.texImage2D(
                gl.TEXTURE_2D, // target
                0, // level
                format, // internalformat
                size.width,
                size.height,
                0, // A GLint specifying the width of the border. Must be 0.
                format, // In WebGL 1, this must be the same as internalformat (see above).
                gl.UNSIGNED_BYTE,
                buffer,
                layout[idx].offset
            );

            if (format != gl.ALPHA) {
                continue;
            }

            this.hitTestMaskThreshold = 100; // XXX: what should this be?
            this.hitTestMask = {
                width: size.width,
                height: size.height,
                array: buffer.subarray(
                    layout[idx].offset,
                    layout[idx].offset + (size.width * size.height)
                )
            }
        }
    }
    drawInContext(context) {
        var videoFrame = this.videoFrame;
        if (videoFrame == null) {
            context.clearRect(0, 0, context.width, context.height);
        }
        else {
            context.drawImage(videoFrame, 0, 0);
        }
    }
}

