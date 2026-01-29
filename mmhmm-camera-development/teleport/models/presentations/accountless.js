//
//  models/presentations/accountless.js
//  mmhmm
//
//  Created by Steve White on 3/1/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

// A presentation used when the person isn't signed in
// but we want to allow them to do some limited things
// with the app (e.g. share an image on a call)

Presentation.AccountLess = class extends Presentation.Modern {
    constructor() {
        var fakeEndpoint = {
            // If a slide needs persistence, the Slide will invoke this
            // we'll just immediately return since there isn't anywhere to
            // persist to
            _postSyncRecords: async function(records) {
                return records.map(record => {
                    return { status: { success: true}, record };
                })
            },
            _deleteSyncRecords: async function(records) {
                // XXX: Do we need to do anything?
            },
            _uploadBlobsForCloudyRecords: async (blobs, serverRecords, onProgress) => {
                return this._uploadBlobsForCloudyRecords(blobs, serverRecords, onProgress);
            }
        };

        var fakeRecord = new CloudyRecord({
            collection: mmhmmAPI.CloudyCollectionTypes.LegacyPresentation,
            id: createUUID()
        });
        fakeRecord.encodeProperty("hidden", false);
        fakeRecord.encodeProperty("lastViewed", Date());
        fakeRecord.encodeProperty("name", LocalizedString("Scratchpad"));

        super(fakeEndpoint, fakeRecord);
        this._loaded = true;
        this._loading = false;
        this._slides = [];
        this.type = "shadow";
    }
    get serviceLocator() {
        return null;
    }
    async _refreshServerContent() {
        // Intentionally blank, we have nothing to reload
        return this.slides;
    }
    async _uploadBlobsForCloudyRecords(blobs, serverRecords, onProgress) {
        for (let recordIdx=0; recordIdx<serverRecords.length; recordIdx+=1) {
            const record = serverRecords[recordIdx];

            const assetRefs = [];
            record.assetReferences = assetRefs;

            const fingerprintKeys = Object.keys(record.properties).filter(key => key.endsWith("AssetFingerprint"));
            fingerprintKeys.forEach(key => {
                const fingerprint = record.decodeProperty(key, String, null);
                if (fingerprint == null) {
                    return;
                }
                const blob = blobs[fingerprint];
                if (blob == null) {
                    console.error("Couldn't find blob with fingerprint", fingerprint, record, blobs);
                    return;
                }

                const ref = {
                    fingerprint: fingerprint,
                    uploaded: true,
                    blob: blob,
                };
                assetRefs.push(ref);
            })

            if (assetRefs.length > 0) {
                record.decodeAssetReference = function(endpoint, {key, fingerprint}, requireUploaded) {
                    if (key != null) {
                        fingerprint = this.decodeProperty(key + "AssetFingerprint", String, null);
                    }
                    const ref = record.assetReferences.find(ref => ref.fingerprint == fingerprint);
                    if (ref == null) {
                        return null;
                    }
                    return new LocalAsset(ref);
                }
            }
        }

        return serverRecords
    }
    async updatePropertiesOfSlides(serverUpdates) {
        for (var slideID in serverUpdates) {
            var slide = this.slideWithIdentifier(slideID);
            if (slide == null) {
                continue;
            }
            var updates = serverUpdates[slideID];
            for (var key in updates) {
                slide[key] = updates[key];
            }
        }
    }
    async setSlideSiblings(slideID, previousID, nextID) {
        // As we're just a shadow presentation, this method
        // should never be invoked: we don't allow re-ordering
        // in the recents list
    }
    async duplicateSlide(slide, slideCreatedCallback = null) {
        this.copySlideToPresentation(slide, this, slideCreatedCallback);
    }
    async copySlideToPresentation(slide, presentation, slideCreatedCallback = null) {
        // This method should never really be invoked, but..
        // just for completion sake
        return;
    }
    async createNewSlide(room, presenter) {
        return super.createNewSlide(room, presenter);
    }
    doesAddingObjectRequireUpload(object) {
        return false;
    }
    async deleteSlide(slide) {
        var slides = this.slides;
        var slideIdx = slides.indexOf(slide);
        if (slideIdx != -1) {
            slides.splice(slideIdx, 1);
            this.slides = slides;
        }

        var stage = this.stage;
        if (stage.slide == slide) {
            stage.slide = null;
        }
    }
}

Presentation.AccountLessLooks = class extends Presentation.AccountLess {
    constructor() {
        super();
    }

    newSlideForRecord(record) {
        return new Slide.Look(this.endpoint, record);
    }
}
