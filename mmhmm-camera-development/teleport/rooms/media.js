//
//  media.js
//  mmhmm
//
//  Created by Steve White on 8/3/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class MediaRoom extends Room {
    constructor(identifier, title, thumbnailSrc, backgroundSrc) {
        if (backgroundSrc != null && backgroundSrc.indexOf("/") == -1) {
            backgroundSrc = Room.assetBaseURL + backgroundSrc;
        }
        super(identifier, title, thumbnailSrc);
        this.backgroundSrc = backgroundSrc;
        this.asset = new LocalAsset({contentURL: backgroundSrc});
    }
    get assets() {
        return [this.asset];
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        var backgroundSrc = this.backgroundSrc;
        if (backgroundSrc == null) {
            return;
        }

        var backgroundURL = new URL(backgroundSrc, window.location);
        var backgroundType = backgroundURL.pathExtension;

        var backgroundIsVideo = Media.Files.isVideoExtension(backgroundType);

        var layer = this.layer;
        var element = this.getCachedElementForAsset(this.asset);
        if (element == null) {
            var tagName = (backgroundIsVideo ? "video" : "img");
            element = document.createElement(tagName);
            element.crossOrigin = "anonymous";
            element.src = backgroundSrc;
        }

        layer.contents = element;
        if (backgroundIsVideo == true) {
            element.loop = true;
            element.muted = true;
            element.playsInline = true;
            element.play().catch(err => {
                if (err && err.constructor == DOMException && err.name == "AbortError") {
                    // This can happen if the user changes rooms while the video is still
                    // loading - the play call will get interrupted by a pause. Ignore it.
                    return;
                }
                console.error("Error playing video media", err);
            });
        }
        this._cachedElement = null;

        if (backgroundIsVideo == true) {
            this.videoPlayer = element;
            element.addEventListener("error", evt => {
                var error = element.error;
                if (error != null) {
                    var message = error.message;
                    ShowAlertView(
                        LocalizedString("Video unsupported"),
                        LocalizedStringFormat("The selected video cannot be played. Your browser reported: ${message}", {message}),
                    )
                }
            })
        }
    }
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);

        var videoPlayer = this.videoPlayer;
        if (videoPlayer != null) {
            videoPlayer.pause();
        }
        this.videoPlayer = null;
    }
    applyEvent(event, sender) {
        super.applyEvent(event, sender);
        if (event == null) {
            return;
        }

        var currentTime = event.currentTime;
        if (currentTime != null) {
            var videoPlayer = this.videoPlayer;
            if (videoPlayer != null) {
                videoPlayer.currentTime = currentTime;
            }
        }
    }
    toJSON() {
        var r = super.toJSON();
        var videoPlayer = this.videoPlayer;
        if (videoPlayer != null) {
            r.currentTime = videoPlayer.currentTime;
        }
        return r;
    }
}
