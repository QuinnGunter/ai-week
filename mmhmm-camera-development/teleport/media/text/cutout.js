//
//  media/text/cutout.js
//  mmhmm
//
//  Created by Steve White on 7/25/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Cutout = class extends Media.Text.Style {
    constructor(variant, themeID, assetID) {
        const family = LocalizedString("Cutout");

        // These assets aren't in version control, we manually deployed them to this location
        const assetBaseURL = `https://app.airtimetools.com/talk/assets/cutout/${assetID}/`;

        const parameters = {
            textAttributes: {
                font: Font({ weight: 400, bold: 700, size: 244, strikeout: { pos: 0.373, size: 0.04 }, family:
                    new FontFace("BeniBlack", "url(assets/fonts/BeniBlack.woff2)" ),
                }),
                color: Color(1, 1, 1, 1.0),
                toolbarSize: 14,
                alignment: "center",
            },
            sizes: {
                [Media.Text.Size.Small]: 120,
                [Media.Text.Size.Medium]: 260,
                [Media.Text.Size.Large]: 400,
                [Media.Text.Size.ExtraLarge]: 544,
                [Media.Text.Size.Enormous]: 680,
            },
            contentInsets: {
                top: 0,
                left: 0,
                bottom: 0,
                right: 0
            },
            filter: {
                type: Media.Text.Style.Cutout.Filter,
                properties: {
                    previewAssetURL: assetBaseURL + "preview.webp",
                    staticAssetURL: assetBaseURL + "static.jpg",
                    canvasAssetURL: assetBaseURL + "video.mp4",
                    editorAssetURL: assetBaseURL + "video.webp",
                }
            }
        };
        super(family, variant, themeID, parameters);
        this.assetID = assetID;
    }
    get supportsRTF() {
        return false;
    }
    get supportsCornerRadius() {
        return false;
    }
    async loadAssetsIntoCache() {
        var asset = new LocalAsset({contentURL: this.canvasAssetURL});
        return Promise.all([
            asset.openAsElement(),
            super.loadAssetsIntoCache()
        ]);
    }
    //
    get previewAssetURL() {
        return this.filter.properties.previewAssetURL;
    }
    get editorAssetURL() {
        return this.filter.properties.editorAssetURL;
    }
    get staticAssetURL() {
        return this.filter.properties.staticAssetURL;
    }
    get canvasAssetURL() {
        return this.filter.properties.canvasAssetURL;
    }
    //
    //
    //
    _populateContainerWithAssetURL(container, assetURL) {
        var style = container.style;
        style.setProperty("background-image", `url(${assetURL})`, "important");
        container.classList.add("cutout");
    }
    populatePreviewContainer(container, textBox) {
        this._populateContainerWithAssetURL(textBox, this.previewAssetURL);

        var font = this.textAttributes.font.copy();
        font.size = 36;
        font.weight = 100;
        textBox.style.font = font.toString();
    }
    populateEditorContainer(container) {
        this._populateContainerWithAssetURL(container, this.editorAssetURL);
    }
    populateFamilyContainer(container) {
        container.style.setProperty("-webkit-font-smoothing", "antialiased");
        container.style.setProperty("-moz-osx-font-smoothing", "grayscale");
    }
    async postprocessThumbnailInContext(context, loader, width, height) {
        var image = await loader(this.staticAssetURL);

        context.save();
        context.globalCompositeOperation = "source-atop";

        var frontSize = SizeMake(
            image.naturalWidth,
            image.naturalHeight
        );

        var layerSize = SizeMake(width, height);

        var {minX, minY, maxX, maxY} = Media.Text.Style.Cutout.Filter.RectForFrontSizeInLayerSize(frontSize, layerSize);

        var fX = frontSize.width * minX;
        var fY = frontSize.height * minY;
        var fW = frontSize.width * maxX;
        var fH = frontSize.height * maxY;

        context.drawImage(
            image,
            fX, fY, fW, fH,
            0, 0, width, height,
        );
        context.restore();
    }
}

Media.Text.Style.Cutout.Filter = class extends RenderFilter {
    constructor() {
        const fragment = `
      precision mediump float;
      varying vec2 v_texcoord;
      uniform sampler2D u_texture;

      varying vec2 v_frontcoord;
      uniform sampler2D u_front;

      uniform lowp float u_opacity;
      void main() {
          float mask = texture2D(u_texture, v_texcoord).a;
          if (mask <= 0.0) {
              discard;
          }
          else {
              vec4 pix = texture2D(u_front, v_frontcoord);
              gl_FragColor = vec4(pix.rgb, pix.a * mask * u_opacity);
          }
      }
      `
        const vertex = `
      attribute vec4 a_position;
      attribute vec2 a_texcoord;
      attribute vec2 a_frontcoord;

      uniform mat4 u_model;
      uniform mat4 u_projection;

      varying vec2 v_texcoord;
      varying vec2 v_frontcoord;

      void main() {
        gl_Position = u_projection * u_model * a_position;
        v_texcoord = a_texcoord;
        v_frontcoord = a_frontcoord;
      }
      `
        const uniforms = ["u_texture", "u_front", "u_opacity", "u_model", "u_projection"];
        const params = [];
        super(fragment, uniforms, params);
        this.ourVertex = vertex;
        this.ourAttribs = ["a_position", "a_texcoord", "a_frontcoord"];
        this.debugID = createUUID();
    }
    willCompileInRenderer(renderer) {
        this.vertex = this.ourVertex;
        this.attribs = this.ourAttribs;
    }
    initialize(gl, program, renderer) {
        program.buffers = {
            frontcoord: {
                gl: gl.createBuffer(),
                js: new Float32Array(12),
            },
        }

        // We delete these so that Renderer will continue
        // doing the bulk of work for us
        delete this.vertex;
        delete this.attribs;
        delete this.texture;
        delete this.lastLayerSize;

        this.createFrontElement();
    }
    createFrontElement() {
        var front = null;
        var fillSrc = this.canvasAssetURL;
        var loadEvent = null;
        if (fillSrc.endsWith("mp4") == true) {
            front = document.createElement("video");
            front.playsInline = true;
            front.loop = true;
            front.muted = true;
            front.autoplay = true;
            loadEvent = "canplay";
        }
        else {
            front = new Image();
            loadEvent = "load";
        }
        this.front = front;
        this.frontLoaded = false;

        front.crossOrigin = "anonymous";
        front.addEventListener(loadEvent, evt => {
            this.frontLoaded = true;
            if (front.play != null) {
                front.play();
            }
        }, {once: true})

        front.src = fillSrc;
    }
    prepare(gl, program, timestamp, renderer, layer) {
      if (layer == null) {
        return;
      }

      // Important to activate the texture now, otherwise
      // the call to updateTextureWithBytes() will update
      // the wrong texture!
      gl.activeTexture(gl.TEXTURE1);

      var frontObj = this.front;
      var texture = null;
      if (frontObj == null || this.frontLoaded == false) {
          texture = renderer.emptyTexture;
      }
      else {
          var frontNeedsUpdate = (timestamp != this.lastTextureTime);
          texture = this.texture;
          if (texture == null) {
              var size = null;
              if (frontObj.tagName == "VIDEO") {
                  size = SizeMake(frontObj.videoWidth, frontObj.videoHeight);
              }
              else {
                  size = SizeMake(frontObj.naturalWidth, frontObj.naturalHeight);
              }

              texture = renderer.newTexture(gl.RGBA, null, size, gl.CLAMP_TO_EDGE);
              this.texture = texture;
              frontNeedsUpdate = true;

              // Ensure we update the front coordinate buffer
              this.lastLayerSize = SizeZero();
          }

          if (frontNeedsUpdate == true) {
              renderer.updateTextureWithElement(texture, frontObj);
              this.lastTextureTime = timestamp;
          }
      }

      var frontLoc = program.uniforms.u_front;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(frontLoc, 1);

      //
      //
      //
      var frontcoordLoc = program.attribs.a_frontcoord;
      if (frontcoordLoc != null) {
          var frontcoord = program.buffers.frontcoord;
          var coordinates = frontcoord.js;

          var layerSize = layer.size;
          if (SizeEquals(layerSize, this.lastLayerSize) == false) {
              var frontSize = SizeMake(
                  frontObj.videoWidth ?? frontObj.naturalWidth ?? frontObj.width ?? 0,
                  frontObj.videoHeight ?? frontObj.naturalHeight ?? frontObj.height ?? 0,
              );

              var {minX, minY, maxX, maxY} = Media.Text.Style.Cutout.Filter.RectForFrontSizeInLayerSize(frontSize, layerSize);

              coordinates[0] = minX; coordinates[1] = minY;
              coordinates[2] = minX; coordinates[3] = maxY;
              coordinates[4] = maxX; coordinates[5] = minY;
              coordinates[6] = maxX; coordinates[7] = minY;
              coordinates[8] = minX; coordinates[9] = maxY;
              coordinates[10] = maxX; coordinates[11] = maxY;
              this.lastLayerSize = layerSize;
          }

          var buffer = frontcoord.gl;
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.enableVertexAttribArray(frontcoordLoc);
          gl.vertexAttribPointer(frontcoordLoc, 2, gl.FLOAT, false /*normalize*/ , 0 /*stride*/ , 0 /*offset*/ );
          gl.bufferData(gl.ARRAY_BUFFER, coordinates, gl.STATIC_DRAW);
      }

      // Switch back to texture0 now that we're finished.
      gl.activeTexture(gl.TEXTURE0);
    }
}

Media.Text.Style.Cutout.Filter.RectForFrontSizeInLayerSize = function(frontSize, layerSize) {
    var scale = Math.max(
        layerSize.width / frontSize.width,
        layerSize.height / frontSize.height
    );

    var targetSize = SizeMake(
        frontSize.width * scale,
        frontSize.height * scale
    );

    var width = layerSize.width / targetSize.width;
    var height = layerSize.height / targetSize.height;

    var minX = (1.0 - width) / 2,
        minY = (1.0 - height) / 2,
        maxX = 1.0 - ((1.0 - width) / 2),
        maxY = 1.0 - ((1.0 - height) / 2);
    return {minX, minY, maxX, maxY};
}
