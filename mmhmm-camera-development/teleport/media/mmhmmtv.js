//
//  slides_mmhmmtv.js
//  mmhmm
//
//  Created by Steve White on 11/3/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

Media.mmhmmTV = class extends Media.BasicVideo {
    constructor(identifier, presenterID, asset) {
        if (asset == null) {
            asset = new LocalAsset({contentURL: null});
        }

        super(identifier, presenterID, asset);
    }
    copy() {
        var r = super.copy();
        r.thumbnailAsset = this.thumbnailAsset;
        r.state = this.state;
        return r;
    }
    set asset(anAsset) {
        this._asset = anAsset;
        if (anAsset?.contentURL != null) {
            if (this.stage != null) {
                anAsset.open().then(contents => {
                    anAsset.close();
                    this.setMediaPlayerSource(contents);
                })
            }
        }
    }
    get asset() {
        return this._asset;
    }
    get editorClass() {
        return Media.mmhmmTV.Editor;
    }
    async loadAssetsIntoCache() {
        // Intentionally blank to prevent super from loading the asset
        // XXX: figure out how to warm an mmhmmTV video...
    }
    async refreshVideoData() {
        var refreshPromise = this._refreshPromise;
        if (refreshPromise != null) {
            return refreshPromise;
        }

        refreshPromise = new Promise((resolve, reject) => {
            this._refreshVideoData()
                .then(resolve)
                .catch(reject)
                .finally(() => {
                    this._refreshPromise = null;
                    this._lastRefreshTime = Date.now();
                })
        });
        this._refreshPromise = refreshPromise;
        return refreshPromise;
    }
    async _refreshVideoData() {
        let state = this.state;
        const { videoID, environment } = state;

        var endpoint = mmhmmAPI.getEndpointForEnvironment(environment);
        this.endpoint = endpoint;

        var videoData = null;
        try {
            videoData = await endpoint.retrieveVideoData(videoID);
        }
        catch (err) {
            state.invalid = true;
            throw err;
        }
        if (videoData == null) {
            state.invalid = true;
            throw "Error 1";
        }

        var catalog = videoData.catalogInfo;
        var title = videoData.catalogInfo?.title ?? "";

        var preferredPlaybackSpeed = videoData.preferredPlaybackSpeed;
        if (preferredPlaybackSpeed == null || preferredPlaybackSpeed == 0) {
            preferredPlaybackSpeed = Media.mmhmmTV.defaultPlaybackRate;
        }

        var playbackSource = videoData.playbackSource;
        if (playbackSource == null || playbackSource.length == 0) {
            throw "Could not find a valid playback source for the specified video"
        }

        state = {
            playbackSourceType: videoData.playbackSourceType,
            playbackSource: videoData.playbackSource,
            preferredPlaybackSpeed: preferredPlaybackSpeed,
            videoID: videoID,
            environment: environment,
            title: title,
            poster: videoData.posterUrl,
            presentationID: videoData.presentationId,
        };
        this.state = state;
        this.title = title;
        this.asset = new LocalAsset({contentURL: state.playbackSource});

        await this.updateThumbnailAsset(endpoint);

        return true;
    }
    async updateThumbnailAsset(endpoint) {
        var state = this.state;

        var thumbnailURL = state.poster;
        if (thumbnailURL == null) {
            var manifest = await endpoint.retrieveVideoManifest(state.videoID);
            if (manifest == null) {
                console.error("retrieveVideoManifest returned null manifest");
            }
            else {
                var entryWithThumbnail = manifest.find(a => a.thumbnail != null);
                if (entryWithThumbnail != null) {
                    thumbnailURL = entryWithThumbnail.thumbnail;
                }
            }
        }
        if (thumbnailURL != null) {
            this.thumbnailAsset = new LocalAsset({contentURL: thumbnailURL, mimeType: "image/jpeg"});
        }
        else {
            this.thumbnailAsset = this.brokenThumbnailAsset();
        }
    }
    brokenThumbnailAsset() {
        var assetURL = new URL('assets/thumb-missing.png', window.location);
        return new LocalAsset({contentURL: assetURL});
    }
    /*
     *
     */
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        let refreshTask = null;

        if (this.belongsToLocalPresenter == true) {
            var lastRefreshTime = this._lastRefreshTime ?? 0;
            if (Date.now() - lastRefreshTime > 1000) {
                refreshTask = this.refreshVideoData();
            }
        }

        if (refreshTask == null) {
            refreshTask = Promise.resolve();
        }

        refreshTask.then(() => {
            if (this.state?.invalid == true) {
                this.showDisconnectedOverlay();
            }

            this.analyticsDisabled = false;
        })
    }
    willDetachFromStage(stage) {
        // Super will destroy the state, so make a copy
        var state = Object.assign({}, this.state);
        // We don't need the current time or playing bits
        /* TODO (eslint, no-redeclare, possible bug): I don't know what is happening here
        deleting keys from this copied object then reassigning
        state looks like it will do exactly nothing. I don't
        know that it will create bugs, but it seems like it
        won't do what was intended */

        delete state.playing;
        delete state.time;

        this.logAnalyticsEvent("END");

        super.willDetachFromStage(stage);

        this.analyticsDisabled = false;
        this.state = state;

        // If the disconnected overlay was shown, clear it
        var disconnectedOverlay = this.disconnectedOverlay;
        if (disconnectedOverlay != null) {
            this.disconnectedOverlay = null;
        }
    }
    //
    // Overlays for when we can't retrieve the video
    //
    showDisconnectedOverlay() {
        var disconnectedOverlay = this.disconnectedOverlay;
        if (disconnectedOverlay != null) {
            return;
        }

        disconnectedOverlay = Media.MissingOverlay(
            this,
            LocalizedString("Video unavailable"),
            LocalizedString("The requested video may not exist or is unavailable for your account."),
            LocalizedString("Select video"),
            LocalizedString("Remove video")
        );
        this.disconnectedOverlay = disconnectedOverlay;

        var layer = this.layer;
        // Our layer needs contents, otherwise it won't
        // display.  And if it won't display, then the
        // overlay won't display either.
        // However we don't want to render anything
        // to the layer as that would show up in recordings...
        layer.contents = null;
        layer.filter = new SolidColorFilter([0, 0, 0, 0]);

        this._updateOverlayVisibility();
    }
    hideDisconnectedOverlay() {
        var disconnectedOverlay = this.disconnectedOverlay;
        if (disconnectedOverlay == null) {
            return;
        }
        this.disconnectedOverlay = null;

        var parent = disconnectedOverlay.parentNode;
        if (parent != null) {
            parent.removeChild(disconnectedOverlay);
        }

        var layer = this.layer;
        layer.filters = [];
        layer.contents = this.mediaPlayer;

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
    /*
     * Teleport methods
     */
    applyEvent(event, sender) {
        super.applyEvent(event, sender);

        var body = event;
        if (body == null) {
            return;
        }

        var assetData = body.asset;
        if (assetData != null) {
            var asset = new LocalAsset(assetData);
            this.asset = asset;
        }

        var preferredPlaybackSpeed = body.preferredPlaybackSpeed;
        if (preferredPlaybackSpeed != this.playbackRate) {
            this.playbackRate = preferredPlaybackSpeed;
        }
    }
    /*
     *
     */
    setMediaPlayerSource(videoSrc, playbackRate) {
        if (videoSrc != null && videoSrc != "") {
            this.mediaPlayer.addEventListener("loadeddata", evt => {
                this.lastAnalyticsEvent = 0;
                this.analyticsStartTime = Date.now();
                this.logAnalyticsEvent("START");
                this.handlePendingThumbnailRequest();
            }, { once: true });
        }

        super.setMediaPlayerSource(videoSrc);

        if (videoSrc != null) {
            if (playbackRate == null || playbackRate <= 0) {
                playbackRate = 1;
            }
            this.mediaPlayer.playbackRate = playbackRate;
        }
    }
    playPauseToggle() {
        super.playPauseToggle();
        var event = null;
        if (this.playerIsPlaying == true) {
            event = "RESUME";
        }
        else {
            event = "PAUSE";
        }
        this.logAnalyticsEvent(event);
    }
    updateTimeline(current, duration) {
        super.updateTimeline(current, duration);
        if (this.scrubbing == true || this.playerIsPlaying == false) {
            return;
        }
        var lastEvent = this.lastAnalyticsEvent || 0;
        var now = Date.now();
        if (now - lastEvent < 2000 /*2sec in ms*/ ) {
            return;
        }
        this.logAnalyticsEvent("PROGRESS");
        this.lastAnalyticsEvent = now;
    }
    // XXX: START, PROGRESS, SPEED_CHANGE, PAUSE, RESUME, END
    logAnalyticsEvent(type) {
        var state = this.state;
        if (state == null || state.videoID == null) {
            return;
        }
        if (this.analyticsDisabled == true) {
            return;
        }

        var environment = state.environment;
        var endpoint = this.endpoint;
        if (endpoint == null) {
            endpoint = mmhmmAPI.getEndpointForEnvironment(environment);
        }

        var startTime = this.analyticsStartTime;
        var mediaPlayer = this.mediaPlayer;
        var videoDuration = mediaPlayer.duration;
        var playbackSpeed = mediaPlayer.playbackRate;
        var playbackProgress = mediaPlayer.currentTime;

        endpoint.logVideoAnalyticsEvent(state.videoID, type, startTime, videoDuration, playbackSpeed, playbackProgress).then((request) => {
            if (Math.floor(request.status / 100) != 2) {
                console.info("Disabling analytics due to abnormal status code", request.status);
                this.analyticsDisabled = true;
            }
        }).catch(error => {
            console.info("Disabling analytics due to abnormal error", error);
            this.analyticsDisabled = true;
        });
    }
    /*
     * Thumbnails
     */
    async generateThumbnail() {
        var thumbnailAsset = this.thumbnailAsset;
        if (thumbnailAsset == null) {
            if (this.belongsToLocalPresenter == true) {
                try {
                    await this.refreshVideoData();
                }
                catch (err) {
                    console.error("Erroring refreshing video data", err, this);
                }
            }
            thumbnailAsset = this.thumbnailAsset;
        }

        if (thumbnailAsset == null) {
            thumbnailAsset = this.brokenThumbnailAsset();
        }

        return new Promise(async (resolve, reject) => {
            try {
                var blob = await thumbnailAsset.openAsBlob();
                resolve(blob);
                thumbnailAsset.close();
            }
            catch (err) {
                reject(err);
            }
        })
    }
    async getContentSize() {
        // While mmhmmTV may support non 16:9 resolutions
        // this seems like a safe assumption for now
        return Stage.DefaultSize;
    }
    /*
     * Cloudy helpers
     */
    encodeMediaContent() {
        var media = super.encodeMediaContent();

        var state = this.state;
        var videoID = state.videoID;
        var environment = state.environment;

        media.mmhmmTV = {
            identifier: videoID,
            environment: environment,
        };
        return media;
    }
    decodeMediaContent(media) {
        var success = super.decodeMediaContent(media);
        if (success == false) {
            return false;
        }

        var mmhmmTV = null;
        var metadata = media.metadata;
        if (metadata != null) {
            mmhmmTV = metadata.mmhmmTV;
        }

        if (mmhmmTV == null) {
            mmhmmTV = media.mmhmmTV;
            if (mmhmmTV == null) {
                // XXX Kludge for old pages importer
                mmhmmTV = media.video;
            }
        }

        if (mmhmmTV == null) {
            console.error("Couldn't find mmhmmTV state in media", media);
            return false;
        }

        var videoID = mmhmmTV.identifier;
        if (videoID == null) {
            videoID = mmhmmTV.id;
        }
        if (videoID == null) {
            console.error("Couldn't find videoID in mmhmmTV state", mmhmmTV, media);
            return false;
        }

        if (this.state == null || this.state.videoID != videoID) {
            this.state = {
                videoID: videoID,
                environment: mmhmmTV.environment,
            };
        }

        return true;
    }
    getAssetForCloudy() {
        return null;
    }
}

Object.defineProperty(Media.mmhmmTV, "ClassIdentifier", {
    value: "mmhmmTV",
    writable: false
});

Object.defineProperty(Media.mmhmmTV, "Title", {
    value: LocalizedString("Airtime Video"),
    writable: false
});


Media.mmhmmTV.isSupportedOnBrowser = function() {
    return typeof(Hls) != "undefined" && Hls.isSupported();
}

Media.mmhmmTV.defaultPlaybackRate = 1.0;

Media.mmhmmTV.Editor = class {
}

Media.mmhmmTV.RequestNew = async function(sender) {
    return new Promise((resolve, reject) => {
        resolve(null);
    })
}
