//
//  media/custom_media.js
//  mmhmm
//
//  Created by Amol Ghode on 8/2/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

/**
 * This class represents a custom media that could be any arbitrary chunked upload.
 * This class wraps sync resource customMedia. This type of sync record has independent
 * existence (Does not need have any parent). This is similar to what we have for bridges.
 */
Media.CustomMedia = class extends Media {
    constructor(identifier, presenterID, asset) {
        super(identifier, presenterID, asset);
    }

    encodeToModernRecord(record) {
        super.encodeToModernRecord(record);
        record.encodeAssetReference(this.asset, "content");
        let thumbnailAsset = this.thumbnailAsset;
        if (thumbnailAsset != null) {
            record.encodeAssetReference(thumbnailAsset, "thumbnail");
        }
    }

    decodeFromModernRecord(record, endpoint) {
        const properties = record.properties;
        for (var key in properties) {
            var type = properties[key];
            var value = record.decodeProperty(key, type, null);
            if (value != null && value != this[key]) {
                this[key] = value;
            }
        }
        return true;
    }

    copy() {
        /**
         * Base's copy function copies all the properties but creates a new identifier. In that sense
         * that function is more of a clone than copy.
         * In case of customMedia, the element id is same as its upload id/ingest resource id.
         * This ingest resource id is queried (for the safety) before using this customMedia as another
         * chapter or a bridge. Base class creating a new Id is not going to work in that case
         * hence after super.copy() copies the necessary data, this function copies the identifier back to newly
         * copied object. Also, base class does not know about the other properties of customMedia. Those as well get copied here.
         */
        const copy = super.copy();
        copy.identifier = this.uploadId;
        copy.duration = this.duration;
        copy.mediaInfo = this.mediaInfo;
        copy.source = this.source;
        copy.sourceType = this.sourceType;
        copy.uploadId = this.uploadId;
        copy.uploadType = this.uploadType;
        copy.userId = this.userId;
        return copy;
    }
}

Object.defineProperty(Media.CustomMedia, "ClassIdentifier", {
    value: "customMedia",
    writable: false
});
