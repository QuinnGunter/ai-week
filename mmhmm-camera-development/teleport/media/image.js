//
//  image.js
//  mmhmm
//
//  Created by Steve White on 12/20/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

Media.Image = class extends Media {
    constructor(identifier, presenterID, asset) {
        super(identifier, presenterID);
        this.asset = asset;
        if (asset == null) {
            gSentry.message(`Media.Image created with null asset ${this.identifier}`);
        }
    }
    newLayer(stageSize) {
        const layer = super.newLayer(stageSize);
        const mime = this.asset?.mimeType ?? "";
        // XXX It would be to store whether or not
        // the asset has transparency somewhere...
        if (mime.endsWith("jpeg") == true) {
            layer.opaque = true;
        }
        return layer;
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);
        this.refreshLayerContents();
    }

    /**
     * Our asset has customizable colors if we have a color scheme set and the asset is an SVG.
     * @param {LocalAsset} asset
     * @returns {boolean}
     */
    isColorizableAsset(asset) {
        if (isFirefox()) {
            // I'm not able to get SVG colorization working in Firefox at the moment,
            // so fall back to default colors
            return false;
        }
        return this.colorScheme != null && asset?.mimeType === "image/svg+xml";
    }

    get isColorizable() {
        const asset = this.asset;
        return asset && this.isColorizableAsset(asset);
    }

    get colorScheme() {
        return this.metadata?.colorScheme;
    }

    async getColorizedAssetElement(asset) {
        const colorScheme = this.colorScheme;
        try {
            const blob = await asset.openAsBlob(true);
            if (blob) {
                let text = await blob.text();
                if (text) {
                    text = LooksSVGUtils.replaceColor(text, colorScheme);
                    return LooksSVGUtils.loadSvgAsImage(text);
                }
            }
        } catch (error) {
            console.error("Failed to colorize asset", error);
        }
        return null;
    }

    refreshLayerContents() {
        const asset = this.asset;
        if (asset == null) {
            console.error(`Media.Image willAttachToStage called with null asset for ${this.identifier}`);
            return;
        }

        if (this.isColorizableAsset(asset)) {
            // If our asset is an SVG and our metadata says to colorize it,
            // load the asset as a blob, colorize, and refresh the layer contents
            this.getColorizedAssetElement(asset).then(contents => {
                if (contents) {
                    this.setLayerContents(contents);
                }
            });
            return;
        }

        const contents = this.getCachedElementForAsset(asset);
        if (contents != null) {
            this.setLayerContents(contents);
        } else {
            asset.openAsElement().then(contents => {
                this.setLayerContents(contents);
            }).catch((err) => {
                console.error("Error loading asset", err);
            });
        }
    }

    setLayerContents(contents) {
        var layer = this.layer;
        if (layer == null) {
            return;
        }
        layer.contents = contents;
        this.resizeLayer();
    }
    async generateThumbnail() {
        if (this.asset == null) {
            throw new Error("Cannot thumbnail without an asset");
        }
        return await ThumbnailStorage.shared.get(this);
    }
    async getContentSize() {
        const asset = this.asset;
        if (asset == null) {
            return null;
        }

        const img = await asset.openAsElement();
        return SizeMake(img.naturalWidth, img.naturalHeight);
    }
    toJSON() {
        var r = super.toJSON();
        r.asset = this.asset;
        return r;
    }
    /*
     * Cloudy interop
     */
    decodeFromModernRecord(record, endpoint) {
        const success = super.decodeFromModernRecord(record, endpoint);

        // This is just for debugging - see if we can add some info as to why we were created with a null asset
        if (success == true && this.asset == null) {
            if (record.assetReferences == null || record.assetReferences.length == 0) {
                gSentry.message(`Media.Image decodeFromModernRecord did not find assetReferences for ${this.identifier}`);
                return;
            }
            const asset = record.decodeAssetReference(endpoint, {key: "content"}, false);
            if (asset == null) {
                gSentry.message(`Media.Image decodeFromModernRecord did not find contentAssetFingerprint for ${this.identifier}`);
            } else if (asset.uploaded != true) {
                gSentry.message(`Media.Image decodeFromModernRecord found unuploaded contentAssetFingerprint for ${this.identifier}`);
            }
        }

        return success;
    }
}

Object.defineProperty(Media.Image, "ClassIdentifier", {
    value: "image",
    writable: false
});

Object.defineProperty(Media.Image, "Title", {
    value: LocalizedString("Image"),
    writable: false
});
