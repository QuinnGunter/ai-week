//
//  media/text/titlecard.js
//  mmhmm
//
//  Created by Amol Ghode on 3/12/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

/**
 * This class represents bridge title card.
 * Though in the server hierarchy, bridge can exist independently and it can
 * contain different children in the hierarchy (Title card, video, image)
 * for malk it is manifested as different media elements.
 *
 * If it was a C++ kind of language where multiple inheritance was supported,
 * right hierarchy would have been such that
 * TitleCard IS A Bridge and TitleCard IS A Media.Text. This is not possible
 * Malk uses media for creating Bridge. Just while uploading the record,
 * it sets the Cloudy record type as Bridge.
 */
Media.TitleCard = class extends Media.Text {
    constructor(identifier, presenterID, asset) {
        super(identifier, presenterID);
        this.asset = asset;
    }

    get availableStyles() {
        return Media.Text.TitleCardStyles;
    }

    get contentSize() {
        return Stage.DefaultSize;
    }

    set contentSize(size) {
        // Ignored, we're always 1920x1080
    }

    encodeToModernRecord(record) {
        super.encodeToModernRecord(record);
        record.encodeAssetReference(this.asset, "content");
        let thumbnailAsset = this.thumbnailAsset;
        if (thumbnailAsset != null) {
            record.encodeAssetReference(thumbnailAsset, "thumbnail");
        }
    }

    decodeAssetReferences(record, endpoint) {}

    // Update the title card's asset property with the current state of the title card.
    async renderAsset() {
        let promise = promiseWrapper();
        const fullSize = this.contentSize;
        const { width, height } = fullSize;

        const style = this.style;
        // Styles may map small/med/large/xl to different point sizes
        const fontSize = style.pointSizeForSize(this.textSize);
        const alignment = this.textAlignment;

        // The editor doesn't apply styling to the attributed string it returns
        // to make changing styles easier. We'll need to apply them ourselves...
        const text = new AttributedString();
        this.attributedString.enumerate((offset, string, attributes) => {
            const attrs = { };
            // Copy over bold/italic/etc
            Object.assign(attrs, attributes);
            // Assign the style's attributes
            Object.assign(attrs, style.textAttributes);
            // Copy over alignment
            attrs.alignment = alignment;
            // The style's default attributes know nothing of the font size
            // so we'll copy the font and set the desired size on the copy
            let font = attrs.font;
            if (font != null) {
                font = font.copy();
                font.size = fontSize;
                attrs.font = font;
            }
            text.appendStringWithAttributes(string, attrs);
        })
        const layer = new Media.Text.Layer(fullSize, style);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        const textLayer = layer.textLayer;
        // Draw the Text.
        textLayer.attributedString = text;
        textLayer.horizontalAlignment = alignment;
        textLayer.drawInContext(context, width, height);
        await layer.drawStandaloneImageInContext(context, null);
        // And we're done
        canvas.toBlob((blob) => {
            let asset = new LocalAsset({ blob });
            FingerprintForBlob(blob).then(fingerprint => {
                asset.fingerprint = fingerprint;
                this.asset = asset;
                promise.resolve();
            });
        });
        return promise;
    }
}

Object.defineProperty(Media.TitleCard, "ClassIdentifier", {
    value: "titleCard",
    writable: false
});
