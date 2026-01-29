//
//  tile.js
//  mmhmm
//
//  Created by Steve White on 12/13/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class TileFilter extends RenderFilter {
    constructor() {
        const fragment = RendererFragment;
        // Nearly identical to RendererVertex,
        // except it removes a_layercoord
        // so that we don't have to populate it...
        const vertex = `attribute vec4 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_model;
uniform mat4 u_projection;
uniform bool u_texcoordFromPosition;

varying vec2 v_texcoord;

void main() {
  gl_Position = u_projection * u_model * a_position;
  if (u_texcoordFromPosition == true) {
      v_texcoord = (gl_Position.xy + vec2(1.0)) / vec2(2.0);
  }
  else {
      v_texcoord = a_texcoord;
  }
}`

        var uniforms = ["u_model", "u_projection", "u_texcoordFromPosition", "u_texture", "u_opacity"];
        var attribs = ["a_position", "a_texcoord"];

        super(fragment, uniforms, null);
        this.vertex = vertex;
        this.attribs = attribs;
    }
    updatePositionsIfNecessary(gl, layer) {
        var naturalSize = layer.naturalSize;
        var lastNaturalSize = this.lastNaturalSize;

        var layerSize = layer.size;
        var lastLayerSize = this.lastLayerSize;

        if (lastLayerSize != null && SizeEquals(layerSize, lastLayerSize) &&
            lastNaturalSize != null && SizeEquals(naturalSize, lastNaturalSize))
        {
            return false;
        }

        this.lastNaturalSize = naturalSize;
        this.lastLayerSize = layerSize;

        var columns = Math.ceil(layerSize.width / naturalSize.width);
        var rows = Math.ceil(layerSize.height / naturalSize.height);
        var cells = columns * rows;

        var triangles = cells * 2;
        var vertices = triangles * 3;
        var bufferSize = vertices * 2;

        var positions = new Float32Array(bufferSize);
        var index = 0;

        var w = naturalSize.width;
        var h = naturalSize.height;
        var y = (layerSize.height - (rows * h)) / 2;

        for (var row = 0; row < rows; row += 1) {
            var x = (layerSize.width - (columns * w)) / 2;
            for (var col = 0; col < columns; col += 1) {
                // Triangle 1
                positions[index++] = x;
                positions[index++] = y;

                positions[index++] = x;
                positions[index++] = y + h;

                positions[index++] = x + w;
                positions[index++] = y;

                // Triangle 2
                positions[index++] = x + w;
                positions[index++] = y;

                positions[index++] = x;
                positions[index++] = y + h;

                positions[index++] = x + w;
                positions[index++] = y + h;

                x += w;
            }
            y += h;
        }

        this.positions = positions;
        return true;
    }
    updateCoordinatesIfNecessary(gl, layer) {
        var contentCoordinates = layer.contentCoordinates;
        var lastContentCoordinates = this.lastContentCoordinates;
        if (lastContentCoordinates != null) {
            if (lastContentCoordinates.length == contentCoordinates.length) {
                var same = true;
                for (let idx = 0; idx < contentCoordinates.length; idx += 1) {
                    if (contentCoordinates[idx] != lastContentCoordinates[idx]) {
                        same = false;
                    }
                }
                if (same == true) {
                    return false;
                }
            }
        }

        this.lastContentCoordinates = contentCoordinates;

        var inLength = contentCoordinates.length;
        var outLength = this.positions.length;

        var ourContentCoordinates = new Float32Array(outLength);
        for (let idx = 0; idx < outLength; idx += 1) {
            ourContentCoordinates[idx] = contentCoordinates[idx % inLength];
        }
        this.contentCoordinates = ourContentCoordinates;
        return true;
    }
    prepare(gl, program, timestamp, renderer, layer, contentsTexture, projection, model, opacity) {
        //
        // Uniforms
        //
        var textureLoc = program.uniforms.u_texture;
        if (textureLoc != null) {
            gl.uniform1i(textureLoc, 0);

            gl.bindTexture(gl.TEXTURE_2D, contentsTexture);
        }

        var projectionLoc = program.uniforms.u_projection;
        if (projectionLoc != null) {
            gl.uniformMatrix4fv(projectionLoc, false, projection)
        }

        var modelLoc = program.uniforms.u_model;
        if (modelLoc != null) {
            gl.uniformMatrix4fv(modelLoc, false, model)
        }

        var opacityLoc = program.uniforms.u_opacity;
        if (opacityLoc != null) {
            gl.uniform1f(opacityLoc, opacity);
        }

        var texcoordFromPositionLoc = program.uniforms.u_texcoordFromPosition;
        if (texcoordFromPositionLoc != null) {
            gl.uniform1i(texcoordFromPositionLoc, false);
        }

        //
        // Attribs
        //

        var positionsChanged = this.updatePositionsIfNecessary(gl, layer);
        var coordinatesChanged = this.updateCoordinatesIfNecessary(gl, layer);

        var positions = this.positions;
        var vertices = positions.length / 2;

        var bufferType = gl.ARRAY_BUFFER;

        var positionLoc = program.attribs.a_position;
        if (positionLoc != null) {
            var positionBuffer = this.positionBuffer;
            if (positionBuffer == null) {
                positionBuffer = gl.createBuffer();
                this.positionBuffer = positionBuffer;
                positionsChanged = true;
            }

            gl.bindBuffer(bufferType, positionBuffer);
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false /*normalize*/ , 0 /*stride*/ , 0 /*offset*/ );
            if (positionsChanged == true) {
                gl.bufferData(bufferType, positions, gl.STATIC_DRAW);
            }
        }

        var texcoordLoc = program.attribs.a_texcoord;
        if (texcoordLoc != null) {
            var texcoordBuffer = this.texcoordBuffer;
            if (texcoordBuffer == null) {
                texcoordBuffer = gl.createBuffer();
                this.texcoordBuffer = texcoordBuffer;
                coordinatesChanged = true;
            }

            gl.bindBuffer(bufferType, texcoordBuffer);
            gl.enableVertexAttribArray(texcoordLoc);
            gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false /*normalize*/ , 0 /*stride*/ , 0 /*offset*/ );
            if (coordinatesChanged == true) {
                gl.bufferData(bufferType, this.contentCoordinates, gl.STATIC_DRAW);
            }
        }


        //
        // Draw!
        //
        gl.drawArrays(gl.TRIANGLES, 0 /*offset*/ , vertices);
    }
}
