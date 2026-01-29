//
//  thumbnails.js
//  mmhmm
//
//  Created by Steve White on 12/30/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class FileStorageThumbnailResolver extends FileStorageResolver {
    constructor(store) {
        super(store);
        this.size = { width: 1920/4, height: 1080/4 };
    }
    async createThumbnailForElement(element) {
        var imageSize = SizeZero();
        if (element.nodeName == "IMG") {
            imageSize.width = element.naturalWidth;
            imageSize.height = element.naturalHeight;
        }
        else if (element.nodeName == "VIDEO") {
            imageSize.width = element.videoWidth;
            imageSize.height = element.videoHeight;
        }
        else {
            return null;
        }

        if (imageSize.width <= 0 || imageSize.height <= 0) {
            return null;
        }

        var targetSize = this.size;
        var scale = Math.min(
            targetSize.width / imageSize.width,
            targetSize.height / imageSize.height
        );

        var outputSize = SizeMake(
            Math.floor(imageSize.width * scale),
            Math.floor(imageSize.height * scale),
        );

        var mime = "image/png";
        if (element.tagName == "VIDEO") {
            mime = "image/jpg";
        }

        var options = {
            type: mime,
            size: outputSize
        };

        return ImageBlobWithOptionsUsingCommands(options, async (context, loader) => {
            context.drawImage(element, 0, 0, outputSize.width, outputSize.height);
        });
    }
    async createThumbnailForURL(url, type) {
        if (type == "image") {
            var element = new Image();
            element.crossOrigin = "anonymous";
            element.src = url;
            await element.decode();
            return this.createThumbnailForElement(element);
        }
        else if (type != "video") {
            throw `Don't know how to handle type: ${type}`
        }

        return new Promise((resolve, reject) => {
            var element = null;
            var onload = (event) => {
                this.createThumbnailForElement(element).then(blob => {
                    resolve(blob);
                }).catch(err => {
                    reject(err);
                });
            };

            element = document.createElement("video");
            element.crossOrigin = "anonymous";
            element.muted = true;
            element.autoplay = false;

            element.addEventListener("loadeddata", evt => {
                element.addEventListener("seeked", onload, {once: true})
                element.currentTime = 1;
            }, {once: true});

            element.addEventListener("error", evt => {
                reject(element.error);
            }, {once: true})
            element.src = url;
        });
    }
    async resolveAssetBlob(asset, blob) {
        var type = null;
        if (blob.type.startsWith("video/") == true) {
            type = "video";
        }
        else {
            type = "image";
        }

        var url = URL.createObjectURL(blob);
        try {
            return await this.createThumbnailForURL(url, type);
        }
        catch (err) {
            gSentry.exception(err);
            throw (err);
        }
        finally {
            URL.revokeObjectURL(url);
        }
    }
    async elementTypeForURL(contentURL) {
        var url = new URL(contentURL);
        var last = url.lastPathComponent;

        var candidates = [];
        candidates.push(url.pathExtension);

        // cloudy URLs look like:
        // /users/cf1a56bb-a839-4ed0-9029-27e55428917a/assets/mp4.175041107.sha1.b8b977a3d08056f2b69e9d38745ef0c8fcbc56db
        // So we'll take the last path component (mp4.175041107.sha1.b8b977a3d08056f2b69e9d38745ef0c8fcbc56db)
        // and look at the string up to the first dot
        if (last.length > 0) {
            var components = last.split(".");
            if (components.length > 0) {
                candidates.push(components[0]);
            }
        }

        for (var idx = 0; idx < candidates.length; idx++) {
            var ext = candidates[idx].trim().toLowerCase();
            if (Media.Files.isVideoExtension(ext) == true) {
                return "video";
            }
            else if (Media.Files.isImageExtension(ext) == true) {
                return "image";
            }
        }

        // XXX: Could XHR a HEAD request to the URL and use it's mime-type
        return "image";
    }
    async resolveContentURL(contentURL) {
        var type = await this.elementTypeForURL(contentURL);
        return this.createThumbnailForURL(contentURL, type);
    }
    async _resolveColorizableMedia(media) {
        const asset = media.asset;
        const element = await media.getColorizedAssetElement(asset);
        return this.createThumbnailForElement(element);
    }
    async _resolveAsset(asset) {
        // XXX: this may need to open the asset,
        var result = null;
        if (asset.blob != null) {
            result = await this.resolveAssetBlob(asset, asset.blob);
        }
        else if (asset.contentURL != null) {
            result = await this.resolveContentURL(asset.contentURL);
        }
        else if (asset.downloadURL != null) {
            var contentURL = await asset.open();
            try {
                result = await this.resolveContentURL(contentURL);
            }
            catch (err) {
                gSentry.exception(err);
                throw err;
            }
            finally {
                asset.close();
            }
        }
        else {
            throw "No supported types on asset";
        }
        return result;
    }
    async _resolveSlide(slide) {
        var before, after;
        var tries = 0;
        var image = null;
        do {
            before = slide.hash;
            image = await Slide.Modern.NewThumbnailForSlide(slide);
            after = slide.hash;
            if (before == after) {
                return image;
            }
            tries += 1;
        } while (tries < 5);
        return image;
    }
    async _resolveRoom(room) {
        const element = await room.thumbnailForCurrentState();
        return this.createThumbnailForElement(element);
    }
    async _resolveMedia(media) {
        let asset = media.thumbnailAsset;
        if (asset != null) {
            try {
                return this._resolveAsset(asset);
            } catch (err) {
                console.log("Error resolving thumbnail asset", asset, err);
            }
        }

        asset = media.asset;
        if (asset == null) {
            return media.generateThumbnail();
        }

        let blob = null;
        try {
            if (media.isColorizable === true) {
                blob = await this._resolveColorizableMedia(media);
            } else {
                blob = await this._resolveAsset(asset);
            }
        } catch (err) {
            console.log("Error resolving media asset", media, asset, err);
        }
        if (blob == null) {
            return null;
        }

        // We'd like to persist this so we don't try again...
        // However we can't persist things without a delegate set
        // And this doesn't get set until the slide has attached
        // to the stage.
        if (!media.isPersisting) {
            let unsetDelegate = false;
            if (media.delegate == null) {
                const presentation = gApp.dataStore.presentationContainingMedia(media);
                if (presentation != null) {
                    const slide = presentation.slideContainingMedia(media);
                    if (slide != null) {
                        media.delegate = slide;
                        unsetDelegate = true;
                    }
                }
            }
            media.thumbnailAsset = new LocalAsset({blob});
            media.performPersistence().finally(() => {
                if (unsetDelegate == true && media.stage == null) {
                    media.delegate = null;
                }
            });
        }
        return blob;
    }
    async slideForPresentation(object) {
        return object.getSlideForThumbnail();
    }
    async _resolvePresentation(object) {
        const slide = await this.slideForPresentation(object);
        if (slide != null) {
            return this._resolveSlide(slide);
        }
        // Presumably the presentation has no slides, or there have been network issues
        return null;
    }
    async resolve(object) {
        if (IsKindOf(object, Slide.Modern) == true) {
            return this._resolveSlide(object);
        }
        else if (IsKindOf(object, Media) == true) {
            return this._resolveMedia(object);
        }
        else if (IsKindOf(object, Room) == true) {
            return this._resolveRoom(object);
        }
        else if (IsKindOf(object, LocalAsset) == true) {
            return this._resolveAsset(object);
        }
        else if (IsKindOf(object, Presentation.Modern) == true) {
            return this._resolvePresentation(object);
        }
        return super.resolve(object);
    }
}

class ThumbnailStorage extends FileStorage {
    constructor() {
        super("thumbnails", FileStorageThumbnailResolver);
    }
    async _requestForAsset(asset) {
        var key = null;
        if (asset.blob != null) {
            key = await super._hashForBlob(asset.blob);
        }
        else if (asset.fingerprint != null) {
            key = asset.fingerprint;
        }
        else if (asset.contentURL != null || asset.downloadURL != null) {
            var contentURL = null;
            if (asset.downloadURL != null) {
                contentURL = new URL(asset.downloadURL);
            }
            else {
                contentURL = new URL(asset.contentURL);
            }
            contentURL.search = "";

            const encoder = new TextEncoder();
            const data = encoder.encode(contentURL.toString());
            key = await super._hashForBuffer(data);
        }

        if (key == null) {
            return null;
        }
        var result = super._requestForKey(key);
        return result;
    }
    async _requestForPresentation(object) {
        // Presentations might store the ID of its preferred slide to use as a thumbnail
        const thumbnailSlideID = object.thumbnailSlideID;
        if (thumbnailSlideID != null) {
            // Is this slide already in our cache?
            const exists = await this.has(thumbnailSlideID);
            if (exists == true) {
                // We punt to super because we don't have a slide object
                // but we do know the slide thumbnail is cached under this UUID
                return super._requestForKey(thumbnailSlideID);
            }
        }

        const slide = await object.getSlideForThumbnail();
        if (slide != null) {
            return this._requestForKey(slide);
        }
        return null;
    }
    async _requestForKey(object) {
        if (IsKindOf(object, Media) == true) {
            const asset = object.asset;
            // If a piece of media has an asset its preferrable
            // to just use the asset as-is.
            // If this weren't here, we'd end up using a hash/etag
            // of the media, but that hash/etag changes based on
            // size/position/etc resulting in unnecessary cache invalidation
            if (asset != null) {
                return this._requestForAsset(asset);
            }
        }

        if (IsKindOf(object, Slide.Modern) == true ||
            IsKindOf(object, Media) == true ||
            IsKindOf(object, Room) == true)
        {
            let hash = object.hash;

            let headers = null;
            if (hash != null) {
                headers = {
                    headers: { Etag: object.hash }
                }
            }

            return new Request(`/${this.name}/${object.identifier}`, headers)
        }
        else if (IsKindOf(object, Presentation.Modern) == true) {
            return this._requestForPresentation(object);
        }
        else if (IsKindOf(object, LocalAsset) == true) {
            return this._requestForAsset(object);
        }
        else {
            return super._requestForKey(object);
        }
    }
}
ThumbnailStorage.shared = new ThumbnailStorage();
ThumbnailStorage.AssetMissing = "assets/thumb-missing.png";
