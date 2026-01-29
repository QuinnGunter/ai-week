//
//  arrayed.js
//  mmhmm
//
//  Created by Steve White on 11/11/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class RendererArrayContents extends RendererContents {
    constructor(array, width, height, format = null, type = null) {
        super();

        this.array = array;

        this.width = width;
        this.height = height;
        this.format = format;
        this.type = type;
    }
    get textureCount() {
        return 1;
    }
    updateTexture(renderer, glContext, texture) {
        if (texture == null) {
            return;
        }

        const gl = glContext;

        var internalFormat = gl.ALPHA;
        var srcFormat = gl.ALPHA;
        var srcType = null;

        var width = this.width;
        var height = this.height;
        var array = this.array;

        var format = this.format;
        if (format != null) {
            internalFormat = gl[format];
            srcFormat = gl[format];
        }

        var type = this.type;
        if (type != null) {
            srcType = gl[type];
        }

        if (internalFormat == null) {
            internalFormat = gl.ALPHA;
        }
        if (srcFormat == null) {
            srcFormat = gl.ALPHA;
        }
        if (srcType == null) {
            srcType = gl.UNSIGNED_BYTE;
        }

        const level = 0;
        const border = 0;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border,
            srcFormat, srcType, array);
    }

}
