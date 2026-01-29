//
//  audio.js
//  mmhmm
//
//  Created by Steve White on 2/23/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

Media.Audio = class extends Media.BasicVideo {
    set muted(val) {
        // intentionally discard
    }
    get muted() {
        return false;
    }
    get supportsMuting() {
        return false;
    }
    newMediaPlayer() {
        return document.createElement("audio");
    }
    didDetachFromStage(stage) {
        super.didDetachFromStage(stage);
        var mediaPlayer = this.mediaPlayer;
        if (mediaPlayer != null) {
            mediaPlayer.pause();
            this.mediaPlayer = null;
        }

        var thumbnailAsset = this.thumbnailAsset;
        if (thumbnailAsset != null) {
            thumbnailAsset.close();
        }
    }
    createLayerOrBackdrop() {
        var layer = this.layer;
        layer.onContentsSrcLoaded = (element) => {
            var imageSize = SizeMake(element.naturalWidth, element.naturalHeight);
            this.resizeLayer();
        };

        var useGenericArtwork = function() {
            layer.contentsSrc = "assets/GenericArtwork512.png";
        }

        var thumbnailAsset = this.thumbnailAsset;
        if (thumbnailAsset == null) {
            useGenericArtwork();
        }
        else {
            thumbnailAsset.open().then(thumbnail => {
                if (thumbnail.constructor == String || thumbnail.constructor == URL) {
                    layer.contentsSrc = thumbnail;
                }
                else {
                    debugger;
                    useGenericArtwork();
                }
            }).catch(err => {
                useGenericArtwork();
            })
        }
    }
    async generateThumbnail() {
        var image = new Image();
        image.src = "assets/GenericArtwork512.png";
        return image;
    }
    async getContentSize() {
        return SizeMake(512, 512); // GenericArtwork512.png
    }
    encodeMediaContent() {
        var media = super.encodeMediaContent();
        media.playbackLoops = false;
        media.resumesPlayback = false;
        media.muted = false;
        return media;
    }
    toJSON() {
        var r = super.toJSON();
        var thumbnailAsset = this.thumbnailAsset;
        if (thumbnailAsset != null) {
            r.thumbnail = thumbnailAsset;
        }
        return r;
    }
    applyEvent(event) {
        super.applyEvent(event);
        var thumbnail = event.thumbnail;
        if (thumbnail != null) {
            var asset = new LocalAsset(thumbnail);
            if (asset != null) {
                this.thumbnailAsset = asset;
            }
        }
    }
}

Object.defineProperty(Media.Audio, "ClassIdentifier", {
    value: "audio",
    writable: false
});

Object.defineProperty(Media.Audio, "Title", {
    value: LocalizedString("Audio"),
    writable: false
});
