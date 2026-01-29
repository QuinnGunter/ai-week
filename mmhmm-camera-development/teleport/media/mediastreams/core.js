//
//  media/mediastreams/core.js
//  mmhmm
//
//  Created by Steve White on 12/20/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

Media.MediaStream = class extends Media {
    constructor(identifier, presenterID) {
        super(identifier, presenterID);
        this.audioElement = null;
    }
    get classTitle() {
        return LocalizedString("Video stream", "Video stream");
    }
    get classIdentifierForTeleport() {
        return Media.MediaStream.ClassIdentifier;
    }
    get hash() {
        var str = `${super.hash}`;
        var mediaStream = this.mediaStream;
        if (mediaStream != null) {
            str += mediaStream.identifier;
        }
        return cyrb53(str);
    }
    set selected(value) {
        super.selected = value;
        this._updateOverlayVisibility();
    }
    get selected() {
        return super.selected;
    }
    set remoteMediaStream(aMediaStream) {
        this._remoteMediaStream = aMediaStream;
        this.mediaStreamChanged();
    }
    get remoteMediaStream() {
        return this._remoteMediaStream;
    }
    onRemoteTrackAdded(remoteTrack) {
        var stream = this.remoteMediaStream;
        if (stream == null) {
            stream = new MediaStream();
            this.remoteMediaStream = stream;
        }
        var existingTracksOfKind = stream.getTracks().filter(a => a.kind == remoteTrack.kind);
        existingTracksOfKind.forEach(track => stream.removeTrack(track));

        stream.addTrack(remoteTrack);
        this._updateAudioElement();
        this.mediaStreamChanged();
    }
    onRemoteTrackRemoved(remoteTrack) {
        var stream = this.remoteMediaStream;
        if (stream == null) {
            return;
        }

        stream.removeTrack(remoteTrack);
        this.mediaStreamChanged();
    }
    get mediaStream() {
        return this.remoteMediaStream;
    }
    get mediaStreamHasVideoTrack() {
        const mediaStream = this.mediaStream;
        return (
            mediaStream != null &&
            mediaStream.getVideoTracks().length > 0
        );
    }
    mediaStreamChanged() {
        const mediaStream = this.mediaStream;

        const player = this.player;
        if (player != null) {
            player.srcObject = mediaStream;
            const layer = this.layer;
            if (layer.contents != player) {
                layer.contents = player;
            }
        }
        else {
            const provider = this.provider;
            if (provider != null) {
                var track = null;
                if (mediaStream != null) {
                    var videoTracks = mediaStream.getVideoTracks();
                    if (videoTracks.length > 0) {
                        track = videoTracks[0];
                    }
                }
                provider.videoTrack = track;
            }

            const layer = this.layer;
            if (layer != null) {
                layer.contents = null;
            }
        }

        if (this.stage == null) {
            return;
        }

        this.setMissingOverlayVisible(this.mediaStreamHasVideoTrack == false);
    }
    async getContentSize() {
        const contentSize = this.contentSize;
        if (contentSize.width > 0 && contentSize.height > 0) {
            return contentSize;
        }

        const mediaStream = this.mediaStream;
        if (mediaStream != null) {
            const videoTracks = mediaStream.getVideoTracks();
            if (videoTracks.length > 0) {
                const videoTrack = videoTracks[0];
                const settings = videoTrack.getSettings();
                const width = settings.width;
                const height = settings.height;
                if (width != null && height != null) {
                    return SizeMake(width, height);
                }
            }

        }
        // This may be approximately correct for camera shares
        // Its most likely not correct for screenshares, but
        // its the best we can do w/o more information.
        return Stage.DefaultSize;
    }
    _updateAudioElement() {
        var mediaStream = this.mediaStream;
        var audioElement = null;
        if (mediaStream != null) {
            var tracks = mediaStream.getAudioTracks();
            if (tracks != null && tracks.length > 0) {
                audioElement = this.player;
            }
        }
        this.audioElement = audioElement;
    }
    async isReadyToThumbnail() {
        var player = this.player;
        if (player != null) {
            if (player.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
                return false;
            }
            if (player.videoWidth == 0 || player.videoHeight == 0) {
                return false;
            }
            return true;
        }
        else {
            var provider = this.provider;
            if (provider != null) {
                var renderable = provider.renderable;
                if (renderable != null) {
                    return true;
                }
            }
        }

        // We don't have a player, which means we've likely not been
        // selected yet...
        return false;
    }
    async generateThumbnail() {
        var drawable = null;
        var size = null;

        var provider = this.provider;
        if (provider != null) {
            drawable = await provider.thumbnailNextFrame();
            size = SizeMake(drawable.width, drawable.height);
        }
        else {
            drawable = this.player;
            if (drawable != null) {
                size = SizeMake(drawable.videoWidth, drawable.videoHeight);
            }
        }

        if (drawable == null || size == null || size.width == 0 || size.height == 0) {
            return null;
        }

        var options = {
            size,
            type: "image/jpg",
            quality: 0.8
        };

        var blob = await ImageBlobWithOptionsUsingCommands(options, async (context) => {
            context.drawImage(drawable, 0, 0);
        })

        var asset = new LocalAsset({blob});
        asset.fingerprint = await FingerprintForBlob(blob);
        this.thumbnailAsset = asset;
        this.setNeedsPersistence();
        return blob;
    }
    newLayer(size) {
        const layer = super.newLayer(size);
        layer.opaque = true;
        return layer;
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        // Ensure if this is lingering about we don't try to use it
        this.disconnectedOverlay = null;

        if (PresenterVideoWebCodecsProvider.supported == true &&
            SharedUserDefaults.getValueForKey("mediaStreamUseWebCodecs", false) == true)
        {
            this.provider = new PresenterVideoWebCodecsProvider();
        }
        else {
            const player = this.newMediaPlayer();
            this.player = player;
            this.layer.contents = player;
        }

        const contentSize = this.contentSize;
        if (contentSize?.width > 0 && contentSize?.height > 0) {
            const layer = this.layer;
            layer.size = contentSize;
            this.resizeLayer();
        }

        if (this.mediaStreamHasVideoTrack == true) {
            this.mediaStreamChanged();
            return;
        }

        this.restoreMediaStreamOnStage(stage).then((stream) => {
            if (stream == null) {
                return;
            }
            const videoTracks = stream.getVideoTracks() ?? [];
            const audioTracks = stream.getAudioTracks() ?? [];
            if (videoTracks.length > 0) {
                this.videoTrack = videoTracks[0];
                this.audioTrack = audioTracks[0];
            }
        }).finally(() => {
            if (this.mediaStreamHasVideoTrack == true) {
                this.setMissingOverlayVisible(false);
            }
            else {
                // Wait a second as we may be on a call and receiving the stream
                window.setTimeout(() => {
                    this.setMissingOverlayVisible(this.mediaStreamHasVideoTrack == false);
                }, 1000);
            }
        });
    }
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);

        var player = this.player;
        if (player != null) {
            var parent = player.parentNode;
            if (parent != null) {
                parent.removeChild(player);
            }
            this.player = null;
        }
        else {
            var provider = this.provider;
            if (provider != null) {
                provider.videoTrack = null;
            }
        }

        var mediaStream = this.mediaStream;
        if (mediaStream != null) {
            mediaStream.getTracks().forEach(track => {
                track.stop();
                mediaStream.removeTrack(track);
            });
        }

        this.audioElement = null;
    }
    didDetachFromStage(stage) {
        super.didDetachFromStage(stage);

        // If the disconnected overlay was shown, clear it
        var disconnectedOverlay = this.disconnectedOverlay;
        if (disconnectedOverlay != null) {
            this.disconnectedOverlay = null;
        }
    }
    decodeMediaContent(media) {
        var success = super.decodeMediaContent(media);
        if (success == false) {
            return false;
        }

        this.contentSize = media.contentSize;
        return true;
    }
    encodeMediaContent() {
        var media = super.encodeMediaContent();
        media.contentSize = this.contentSize;
        return media;
    }
    newMediaPlayer() {
        const player = document.createElement("video");
        player.setAttribute("x-mmhmm-streamid", this.identifier);
        player.addEventListener("loadeddata", evt => {
            this.playerLoadedData(evt);
        }, {once: true});
        player.autoplay = true;
        player.playsInline = true;
        if (this.localMediaStream != null) {
            player.muted = true;
        }
        // Browsers don't seem to play video elements with srcObjects
        // unless the element is in the DOM.  So lets make it
        // virtually hidden, and add it to the DOM.
        player.style.opacity = 0;
        player.style.position = "absolute";
        player.style.top = "0px";
        player.style.left = "0px";
        player.style.width = "1px";
        player.style.height = "1px";
        document.body.insertBefore(player, document.body.childNodes[0]);
        return player;
    }
    async restoreMediaStreamOnStage(stage) {
        // Intentionally blank, subclass hook
        return null;
    }
    setMissingOverlayVisible(visible) {
        if (visible == true) {
            this.showDisconnectedOverlay();
        }
        else {
            this.hideDisconnectedOverlay();
        }
    }
    hideDisconnectedOverlay() {
        const disconnectedOverlay = this.disconnectedOverlay;
        if (disconnectedOverlay == null) {
            return;
        }
        this.disconnectedOverlay = null;

        const parent = disconnectedOverlay.parentNode;
        if (parent != null) {
            parent.removeChild(disconnectedOverlay);
        }

        const layer = this.layer;
        if (layer != null) {
            layer.filters = [];
            layer.cornerRadius = this.cornerRadius ?? 0;
            layer.contents = this.player;
        }

        this._updateOverlayVisibility();
    }
    disconnectedOverlayStrings() {
        return {
            title: LocalizedString("Media unavailable"),
            message: LocalizedString("The connection to the content was lost."),
            edit: LocalizedString("Replace media"),
            remove: LocalizedString("Remove media")
        }
    }
    showDisconnectedOverlay() {
        let disconnectedOverlay = this.disconnectedOverlay;
        if (disconnectedOverlay != null) {
            return;
        }

        const strings = this.disconnectedOverlayStrings();

        disconnectedOverlay = Media.MissingOverlay(
            this, strings.title, strings.message, strings.edit, strings.remove
        );
        this.disconnectedOverlay = disconnectedOverlay;

        const layer = this.layer;
        // Our layer needs contents, otherwise it won't
        // display.  And if it won't display, then the
        // overlay won't display either.
        // However we don't want to render anything
        // to the layer as that would show up in recordings...
        if (layer != null) {
            layer.contents = null;
            layer.filter = new SolidColorFilter([0, 0, 0, 0]);
            layer.cornerRadius = 0;
            layer.hidden = false;
            if (SizeEquals(layer.size, SizeZero()) == true) {
                const stage = this.stage;
                if (stage != null) {
                    layer.size = stage.size;
                    this.resizeLayer();
                }
            }
        }

        this._updateOverlayVisibility();
    }
    _updateOverlayVisibility() {
        var selected = this.selected;
        var disconnectedOverlay = this.disconnectedOverlay;

        var helper = this.overlayHelper;
        if (helper == null) {
            if (this.stage != null) {
                console.error("No overlay helper but we have a stage?");
                debugger;
            }
            return;
        }

        if (disconnectedOverlay != null) {
            helper.visible = true;
            helper.dragHandlesVisible = false;
            helper.buttonBarsVisible = false;
        }
        else {
            helper.visible = selected;
            helper.dragHandlesVisible = selected;
            helper.buttonBarsVisible = selected;
        }
    }
    displayContentsEditor() {
        if (this.editorClass != null) {
            return super.displayContentsEditor();
        }
        // Otherwise do nothing in Camera
    }
    playerLoadedData(event) {
        this._updateAudioElement();
        this.handlePendingThumbnailRequest();
    }
    render(timestamp) {
        super.render(timestamp);

        // The video may be of a window, and windows
        // can change size. There doesn't seem to be
        // a dom event that fires for the resize,
        // so we check on each render to ensure we're
        // rendering at the correct size.
        var layer = this.layer;
        if (layer == null) {
            console.error("render() called but layer is null")
            gSentry.message("Media.MediaStream render() invoked without layer")
            return;
        }

        var videoSize = null;
        var provider = this.provider;
        if (provider != null) {
            var contentsNeedUpdate = provider.render(timestamp);
            if (contentsNeedUpdate == false) {
                return;
            }
            var renderable = provider.renderable;
            layer.contents = renderable;
            videoSize = provider.size;
        }
        else {
            const player = this.player;
            videoSize = null;
            if (player == null) {
                console.error("render() called but player is null");
                gSentry.message("Media.MediaStream render() invoked without video player")
            }
            else if (player != layer.contents) {
                return;
            }
            videoSize = SizeMake(player.videoWidth, player.videoHeight);
        }

        if (SizeEquals(videoSize, SizeZero()) == true) {
            layer.hidden = true;
            return;
        }

        if (layer.hidden == true) {
            layer.hidden = false;
        }

        if (SizeEquals(layer.size, videoSize) == false) {
            this.resizeLayer();
            this.contentSize = videoSize;
        }
    }
}

Object.defineProperty(Media.MediaStream, "ClassIdentifier", {
    value: "mediaStream",
    writable: false
});
