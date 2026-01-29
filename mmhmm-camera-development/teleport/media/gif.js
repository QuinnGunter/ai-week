//
//  slides_gif.js
//  mmhmm
//
//  Created by Steve White on 3/7/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

Media.GIF = class extends Media {
    constructor(identifier, presenterID, asset) {
        super(identifier, presenterID);
        this.asset = asset;
    }
    async generateThumbnail() {
        if (this.asset == null) {
            throw new Error("Cannot thumbnail without an asset");
        }
        return await ThumbnailStorage.shared.get(this);
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        var frameNumber = this.frameNumber;
        if (frameNumber != null) {
            this.layer.frameNumber = frameNumber;
            delete this.frameNumber;
        }

        this.asset.open().then(contents => {
            this.createPlayerWithURL(contents);
        });
    }
    willDetachFromStage(stage) {
        var asset = this.asset;
        if (asset != null) {
            asset.close();
        }

        super.willDetachFromStage(stage);
    }
    newLayer(stageSize) {
        return new GIFLayer();
    }
    render(timestamp) {
        super.render(timestamp);
        this.layer.render(timestamp);
    }
    toJSON() {
        var r = super.toJSON();
        r.asset = this.asset;

        var frameNumber = 0;
        var layer = this.layer;
        if (layer != null) {
            frameNumber = layer.frameNumber;
        }
        r.frameNumber = frameNumber;
        return r;
    }
    applyEvent(event, sender) {
        super.applyEvent(event, sender);

        var frameNumber = event.frameNumber;
        if (frameNumber != null) {
            var layer = this.layer;
            if (layer != null) {
                layer.frameNumber = frameNumber;
            }
            else {
                this.frameNumber = frameNumber;
            }
        }
    }

    createPlayerWithURL(contentURL) {
        var request = new XMLHttpRequest();
        request.addEventListener("load", () => {
            this.createPlayerWithBuffer(request.response);
        })
        request.open("GET", contentURL);
        request.responseType = "arraybuffer";
        request.send();
    }
    createPlayerWithBuffer(anArrayBuffer) {
        var decoder = DecodeGIF(anArrayBuffer);
        if (decoder == null) {
            return;
        }

        var layer = this.layer;
        if (layer == null) {
            // we probably unloaded before the gif finished loading
            return;
        }

        layer.imageDecoder = decoder;

        var contentSize = SizeMake(layer.contents.width, layer.contents.height);
        this.resizeLayer();
        layer.renderNextFrame();
    }
    async getContentSize() {
        const asset = this.asset;
        if (asset == null) {
            return null;
        }

        const img = await asset.openAsElement();
        return SizeMake(img.naturalWidth, img.naturalHeight);
    }
    /*
     *
     */
    encodeMediaContent() {
        const content = super.encodeMediaContent();
        content.loop = true;
        return content;
    }
}

Object.defineProperty(Media.GIF, "ClassIdentifier", {
    value: "imageAnimation",
    writable: false
});

Object.defineProperty(Media.GIF, "Title", {
    value: LocalizedString("GIF"),
    writable: false
});


Media.GIF.supported = true; //(window.ImageDecoder != null);

class GIFLayer extends RenderLayer {
    constructor() {
        super();

        this.frames = [];
        this.frameNumber = 0;
        this.frameTimeRemaining = null;
    }
    set imageDecoder(anImageDecoder) {
        this._imageDecoder = anImageDecoder;

        this.frames = [];
        this.frameTimeRemaining = null;
        if (anImageDecoder == null) {
            return;
        }

        var screenDescriptor = anImageDecoder.lsd;
        var width = screenDescriptor.width;
        var height = screenDescriptor.height;

        this.size = SizeMake(width, height);
        this.contents = new RendererArrayContents(
            new Uint8Array(width * height * 4),
            width,
            height,
            'RGBA',
        );
    }
    get imageDecoder() {
        return this._imageDecoder;
    }
    render(timestamp) {
        var lastTimestamp = this.lastTimestamp;
        if (lastTimestamp == null) {
            lastTimestamp = timestamp;
        }
        var delta = timestamp - lastTimestamp;

        var frameTimeRemaining = this.frameTimeRemaining;
        if (frameTimeRemaining != null) {
            frameTimeRemaining -= delta;

            if (frameTimeRemaining > 0) {
                this.frameTimeRemaining = frameTimeRemaining;
            }
            else {
                this.frameTimeRemaining = null;
                this.renderNextFrame();
            }
        }
        this.lastTimestamp = timestamp;
    }
    decodeNextFrame() {
        let imageDecoder = this.imageDecoder;
        var frameNumber = this.frameNumber;

        var frames = imageDecoder.frames;
        if (frameNumber >= frames.length) {
            frameNumber = 0;
        }

        var frame = null;
        var count = 0;
        while (count < frames.length) {
            frame = frames[frameNumber];
            // Some frames aren't image frames...
            // I'm not yet sure if these non-image frames are
            // needed...
            if (frame.decompress != null) {
                break;
            }

            frameNumber += 1;
            count += 1;
            if (frameNumber >= frames.length) {
                frameNumber = 0;
            }
        }
        if (count == frames.length) {
            // we wrapped the entire array of frames
            // and couldn't find an image to decode??
            this.frameTimeRemaining = null;
            return;
        }

        var image = frame.decompress();
        this.frameTimeRemaining = image.delay;

        this.frameNumber = frameNumber + 1;
        this.frames.push(image);

        return image;
    }
    renderNextFrame() {
        var frames = this.frames;
        var image = null;
        if (frames.length == 0) {
            image = this.decodeNextFrame();
        }
        else {
            image = frames.shift();
        }

        if (image == null) {
            console.error("no image to render");
            return;
        }

        var contents = this.contents;
        var bytes = contents.array;
        var width = contents.width;
        var height = contents.height;

        var dims = image.dims;

        var sourceOffset = 0;

        var pixels = image.pixels;
        var clut = image.colorTable;
        var sourceBytesPerRow = dims.width;
        var transparentIndex = image.transparentIndex;

        // The disposalType defines how that patch should be drawn over
        // the gif canvas. In most cases, that value will be 1, indicating
        // that the gif frame should be simply drawn over the existing gif
        // canvas without altering any pixels outside the frames patch dimensions.
        //
        // A value of 2 would have meant that the canvas should be restored to
        // the background color (as indicated by the logical screen descriptor).
        //
        // A value of 3 is defined to mean that the decoder should restore the
        // canvas to its previous state before the current image was drawn. (!?!)
        var disposalType = image.disposalType;

        if (disposalType == 2) {
            var decoder = this.imageDecoder;
            var globalClut = decoder.gct;
            var bgEntry = decoder.lsd.backgroundColorIndex;
            var bgColor = globalClut[bgEntry];
            // XXX: This isn't really correct...
            bytes.fill(0x00);
        }


        var top = dims.top;
        var bottom = dims.top + dims.height;

        for (var y = top; y < bottom; y += 1) {

            var destOffset = ((y * width) + dims.left) * 4;
            var sourceEnd = sourceOffset + sourceBytesPerRow;

            for (var sourceIdx = sourceOffset; sourceIdx < sourceEnd; sourceIdx += 1) {
                var entry = pixels[sourceIdx];

                // If a transparentIndex is defined for a frame, it means that
                // any pixel within the pixel data that matches this index
                // should not be drawn.
                if (entry == transparentIndex) {
                    destOffset += 4;
                    continue;
                }

                var color = clut[entry];
                bytes[destOffset++] = color[0];
                bytes[destOffset++] = color[1];
                bytes[destOffset++] = color[2];
                bytes[destOffset++] = 0xff;
            }
            sourceOffset = sourceEnd;
        }

        this.contentsNeedUpdate = true;
        this.frameTimeRemaining = (image.delay / 1000);

        this.decodeNextFrame();
    }
}
