//
//  slides_video.js
//  mmhmm
//
//  Created by Steve White on 7/30/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

Media.BaseVideo = class extends Media {
    constructor(identifier, presenterID) {
        super(identifier, presenterID);

        this.player = null;
        this.playerReady = false;
        this.scrubbing = false;
        this.state = {};

        this._playbackLoops = true;
        this._muted = false;
        this._autoplays = true;

        this.controlElements = {};
    }
    /*
     * Generic access to the player
     */
    get playerVolume() {
        console.error("please implement `get playerVolume` in your subclass")
        return 0;
    }
    set playerVolume(volume) {
        console.error("please implement `set playerVolume` in your subclass")
    }
    get playerDuration() {
        console.error("please implement `get playerDuration` in your subclass")
        return 0;
    }
    get playerCurrentTime() {
        console.error("please implement `get playerCurrentTime` in your subclass")
        return 0;
    }
    get playerIsPlaying() {
        console.error("please implement `get playerIsPlaying` in your subclass")
        return 0;
    }
    get playerIsPaused() {
        console.error("please implement `get playerIsPaused` in your subclass")
        return 0;
    }
    playerSeekTo(time, completion) {
        console.error("please implement `playerSeekTo` in your subclass")
    }
    playerStopVideo() {
        console.error("please implement `playerStopVideo` in your subclass")
    }
    playerPauseVideo(completion) {
        console.error("please implement `playerPauseVideo` in your subclass")
    }
    playerPlayVideo(completion) {
        console.error("please implement `playerPlayVideo` in your subclass")
    }
    playPauseToggle() {
        if (this.playerIsReady == false) {
            return;
        }

        if (this.playerIsPlaying == true) {
            this.playerPauseVideo();
        }
        else {
            this.playerPlayVideo();
        }
    }
    /*
     * Properties
     */
    get isGIPHY() {
        var metadata = this.metadata;
        return (metadata != null && metadata.giphyID != null);
    }
    get supportsMuting() {
        if (this.isGIPHY == true) {
            return false;
        }
        const codecs = this.codecs;
        if (codecs != null && codecs.video != null && codecs.audio == null) {
            return false;
        }
        return true;
    }
    get classTitle() {
        if (this.isGIPHY == true) {
            return "GIPHY";
        }
        return super.classTitle;
    }
    set playbackLoops(val) {
        var playbackLoops = !!val;
        if (playbackLoops == this._playbackLoops) {
            return;
        }
        this._playbackLoops = playbackLoops;

        this.setNeedsPersistence();

        var mediaPlayer = this.mediaPlayer;
        if (mediaPlayer != null) {
            mediaPlayer.loop = playbackLoops;
        }
    }
    get playbackLoops() {
        return this._playbackLoops;
    }
    set muted(val) {
        var muted = !!val;
        if (muted == this._muted) {
            return;
        }
        this._muted = muted;
        this.setNeedsPersistence();

        var mediaPlayer = this.mediaPlayer;
        if (mediaPlayer != null) {
            mediaPlayer.muted = muted;
        }

        var controlElements = this.controlElements;
        if (controlElements != null) {
            var player_volume = controlElements.player_volume;
            if (player_volume != null) {
                player_volume.style.display = (muted ? "none" : "");
            }
        }
    }
    get muted() {
        return this._muted;
    }
    set autoplays(val) {
        var autoplays = !!val;
        if (autoplays == this._autoplays) {
            return;
        }
        this._autoplays = autoplays;
        this.setNeedsPersistence();

        var mediaPlayer = this.mediaPlayer;
        if (mediaPlayer != null) {
            mediaPlayer.autoplay = autoplays;
        }
    }
    get autoplays() {
        return this._autoplays;
    }
    /*
     *
     */
    onPlayerStateChange(event, forceNotify = false) {
        var text = null;
        var showPlay = false;
        var showPause = false;
        var newState = Object.assign({}, this.state);

        var currentTime = this.playerCurrentTime;
        var duration = this.playerDuration;

        if (this.playerIsPlaying == true) {
            newState.playing = true;
            text = "Pause";
            showPlay = false;
            showPause = true;
            if (this.timer == null) {
                this.timer = window.setInterval(evt => {
                    // Don't use the local variables, get new values via getters
                    if (this.playerIsReady == true) {
                        this.updateTimeline(this.playerCurrentTime, this.playerDuration)
                        this.state.time = Math.round(this.playerCurrentTime);
                    }
                }, 500);
            }
        }
        else {
            newState.playing = false;
            text = "Play";
            showPlay = true;
            showPause = false;
            if (this.timer != null) {
                window.clearInterval(this.timer);
                this.timer = null;
            }
            if (this.scrubbing != true) {
                this.updateTimeline(currentTime, duration)
            }
        }
        newState.time = Math.round(currentTime);

        var controlElements = this.controlElements;
        if (controlElements != null && controlElements.player_playpause != null) {
            var playStyle = "none",
                pauseStyle = "none";
            if (showPlay == true) {
                playStyle = "";
            }
            else {
                pauseStyle = "";
            }
            controlElements.player_play.style.display = playStyle;
            controlElements.player_pause.style.display = pauseStyle;
        }
        else {
            var playPauseButton = this.playPauseButton;
            if (playPauseButton != null) {
                playPauseButton.title = text;
                if (showPlay == true) {
                    playPauseButton.icon = playPauseButton.playIcon;
                }
                else {
                    playPauseButton.icon = playPauseButton.pauseIcon;
                }
            }
        }

        if (event != null && event.type == "loadeddata") {
            return;
        }

        this.state = newState;
    }
    /*
     * Controls
     */
    updateVolumeSlider(volume) {
        var volumeControl = this.volumeControl;
        if (volumeControl != null) {
            volumeControl.sliderValue = volume;
        }
    }
    updateTimeline(current, duration) {
        if (current == null || isNaN(current) == true) {
            current = 0;
        }
        if (duration == null || isNaN(duration) == true) {
            duration = 0;
        }

        var controlElements = this.controlElements;

        var slider = controlElements.player_seek;
        if (slider != null) {
            slider.max = duration;
            slider.value = current;
            var fillAmount = ((current / duration) * 100).toPrecision(4);
            slider.style.setProperty("--fillAmount", fillAmount + "%");
        }

        var elapsed = controlElements.player_elapsed;
        if (elapsed != null) {
            elapsed.innerText = FormatSeconds(Math.round(current));
        }

        var remaining = controlElements.player_remaining;
        if (remaining != null) {
            if (isFinite(duration) == true) {
                remaining.innerText = "-" + FormatSeconds(Math.round(duration - current));
            }
            else {
                remaining.innerText = ""
            }
        }

        var tooltip = controlElements.player_tooltip;
        if (tooltip != null) {
            var tooltipDistance = this.tooltipDistance;
            if (tooltipDistance == null) {
                tooltipDistance = 0;
            }
            tooltip.innerText = FormatSeconds(Math.round(tooltipDistance * duration));
        }
    }
    applyTimeAndPlayingState(time, playing) {
        var applyPlay = () => {
            if (playing != null && playing != this.playerIsPlaying) {
                if (playing == true) {
                    this.playerPlayVideo();
                }
                else {
                    this.playerPauseVideo();
                }
            }
        }

        try {
            if (time != null && time != Math.round(this.playerCurrentTime)) {
                this.playerSeekTo(time, applyPlay);
            }
            else {
                applyPlay();
            }
        }
        catch (err) {
            gSentry.exception(err);
            console.error("applyEvent threw exception", err);
        }
    }
    _updateControlsTitle() {
        var controls = this.playerHUD;
        if (controls != null) {
            var element = controls.querySelector("span.title");
            if (element != null) {
                element.innerText = this.title || "";
            }
        }
    }
    unbindControls() {
        var boundControls = this.boundControls;
        if (boundControls == null) {
            return;
        }
        boundControls.forEach(binding => {
            var control = binding[0];
            var event = binding[1];
            var handler = binding[2];
            control.removeEventListener(event, handler);
        })
        this.boundControls = [];
    }
    bindToControlEventWithHandler(control, event, handler) {
        control.addEventListener(event, handler);
        if (this.boundControls == null) {
            this.boundControls = [];
        }
        this.boundControls.push([control, event, handler]);
    }
    bindControls() {
        var controlElements = this.controlElements;
        if (controlElements == null) {
            return;
        }
        /*
         * Timeline
         */
        var scrubber = controlElements.player_seek;
        if (scrubber != null) {
            this.bindToControlEventWithHandler(scrubber, "mousedown", evt => {
                if (this.playerIsReady == false) {
                    return;
                }

                this.scrubbing = true;
                this.was_playing = this.playerIsPlaying;

                if (this.was_playing == true) {
                    this.playerPauseVideo();
                }
            })
            this.bindToControlEventWithHandler(scrubber, "mouseup", evt => {
                this.scrubbing = false;
                if (this.was_playing == true) {
                    this.playerPlayVideo();
                }
                this.was_playing = null;
            });

            this.bindToControlEventWithHandler(scrubber, "input", evt => {
                this.updateTimeline(scrubber.value, scrubber.max);
            });
            this.bindToControlEventWithHandler(scrubber, "change", evt => {
                if (this.playerIsReady == false) {
                    return;
                }
                this.playerSeekTo(scrubber.value);
            });
        }

        var playPause = controlElements.player_playpause;
        if (playPause != null) {
            this.bindToControlEventWithHandler(playPause, "click", evt => {
                this.playPauseToggle();
            });
        }

        var volume = controlElements.player_volume;
        if (volume != null) {
            this.bindToControlEventWithHandler(volume, "click", evt => {
                var control = this.volumeControl;
                if (control.visible == true) {
                    control.dismiss();
                }
                else {
                    control.sliderValue = this.maxVolume > 0 ? (100 / this.maxVolume) * this.playerVolume : this.playerVolume;
                    control.displayFrom(volume);
                }
            });
        }
    }
    createControls() {
        var buttons = [];

        var playerHUD = new NewPlayerHUD(null, buttons).hud;

        var controlKeys = [
            "player_elapsed", "player_remaining",
            "player_seek", "player_volume",
            "player_playpause", "player_play", "player_pause",
            "player_tooltip"
        ];

        controlKeys.forEach(key => {
            this.controlElements[key] = playerHUD.querySelector("#" + key);
        });

        if (this.muted == true) {
            this.controlElements.player_volume.style.display = "none";
        }

        var volumeControl = new ActionSheetSlider(0, 100, 50, (sheet, evt) => {
            this.playerVolume = sheet.sliderValue;
        });

        // Make the volume control sheet dark to match the HUD
        volumeControl.sheet.style.border = "1px solid rgba(255, 255, 255, 0.12)";
        volumeControl.container.style.backgroundColor = "#151419";
        volumeControl.container.style.color = "#B0B3BF";
        volumeControl.container.style.fill = volumeControl.container.style.color;
        this.volumeControl = volumeControl;

        this.playerHUD = playerHUD;
        this.bindControls();
        this._updateControlsTitle();
    }
    /*
     * Slide overrides
     */
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);

        this.state = {};

        if (this.player != null) {
            this.playerStopVideo();
            this.player = null;
        }
        if (this.timer != null) {
            window.clearInterval(this.timer);
            this.timer = null;
        }

        this.unbindControls();

        this.volumeControl = null;
        this.playerHUD = null;
        this.controlElements = {};
    }
    newSidebarPane() {
        return new Media.BaseVideo.SidebarPane(this);
    }
    onPointerLeave() {
        super.onPointerLeave();
        var volumeControl = this.volumeControl;
        if (volumeControl != null && volumeControl.visible == true) {
            volumeControl.dismiss();
        }
    }
    newMediaPlayer() {
        return document.createElement("video");
    }
    /*
     * Network events
     */
    applyEvent(event, sender) {
        super.applyEvent(event, sender);

        const body = event;
        if (body == null) {
            return;
        }

        const muted = event.muted;
        if (muted != null) {
            this.muted = muted;
        }
        const playbackLoops = event.playbackLoops;
        if (playbackLoops != null) {
            this.playbackLoops = playbackLoops;
        }
        const autoplays = event.autoplays;
        if (autoplays != null) {
            this.autoplays = autoplays;
        }
        const metadata = event.const;
        if (metadata != null) {
            this.metadata = metadata;
        }

        if (this.playerIsReady == false) {
            // We really need to scope player state
            // under a single key...
            const properties = this.properties;
            for (let key in properties) {
                delete body[key];
            }
            this.state = body;
            return;
        }

        const time = body.time;
        const playing = body.playing;
        this.applyTimeAndPlayingState(time, playing);
    }

    toJSON() {
        const result = super.toJSON();

        result.muted = this.muted;
        result.playbackLoops = this.playbackLoops;
        result.autoplays = this.autoplays;
        result.metadata = this.metadata;

        const state = this.state;
        for (var key in state) {
            result[key] = state[key];
        }
        return result;
    }
    /*
     * Cloudy
     */
    decodeMediaContent(media) {
        var success = super.decodeMediaContent(media);
        if (success == false) {
            return false;
        }
        this.hideControls = media.hideControls;
        this.codecs = media.codecs;

        if (this.isGIPHY == true) {
            media.playbackLoops = true;
            media.muted = true;
            media.autoplays = true;
        }

        this.playbackLoops = media.playbackLoops ?? true;
        this.muted = media.muted ?? false;
        this.autoplays = media.autoplays ?? true;

        return true;
    }
    encodeMediaContent() {
        var media = super.encodeMediaContent();

        var codecs = this.codecs;
        if (codecs != null) {
            media.codecs = codecs;
        }

        media.hideControls = (this.hideControls == true);
        media.resumesPlayback = false;

        media.playbackLoops = this.playbackLoops ?? true;
        media.muted = this.muted ?? false;
        media.autoplays = this.autoplays ?? true;

        return media;
    }
    /*
     * Properties
     */
    get title() {
        return super.title;
    }
    set title(aTitle) {
        super.title = aTitle;
        this._updateControlsTitle();
    }
}

Media.BasicVideo = class extends Media.BaseVideo {
    constructor(identifier, presenterID, asset) {
        super(identifier, presenterID);
        this.asset = asset;
        this.automaticallyNotifiesObserversOfAudioElement = false;
    }
    get isOpaque() {
        // We only have codecs for mp4/mov files, and in
        // the case of hvec/h265 we don't know if there is
        // an alpha track or not.
        // So the best we can do is say h264 is opaque,
        // and the rest .. who knows.
        const videoCodecs = this.codecs?.video ?? [];
        return videoCodecs.includes('avc1');
    }
    get hasAudioTrack() {
        var metadata = this.metadata;
        if (metadata != null && metadata.giphyID != null) {
            return false;
        }
        var codecs = this.codecs;
        if (codecs != null && codecs.video != null && (codecs.audio == null || codecs.audio.length == 0)) {
            return false;
        }
        return true;
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

        const video = await asset.openAsElement();
        return SizeMake(video.videoWidth, video.videoHeight);
    }
    get audioElement() {
        if (this.hasAudioTrack) {
            return this.mediaPlayer;
        }
        return null;
    }
    addEventListener(event, listener) {
        var listeners = this.eventListeners;
        if (listeners == null) {
            listeners = {};
            this.eventListeners = listeners;
        }
        var media = this.mediaPlayer;
        media.addEventListener(event, listener);
        listeners[event] = listener;
    }
    _mediaPlayerLoadedData(mediaPlayer) {
        if (this.stage == null) {
            // We were likely unloaded prior to the video loading
            return;
        }
        var state = this.state ?? {};
        var playing = state.playing ?? this.autoplays;
        var time = state.time ?? 0;
        this.applyTimeAndPlayingState(time, playing);

    }
    setMediaPlayerSource(mediaUrl) {
        if (mediaUrl.constructor == String) {
            mediaUrl = new URL(mediaUrl);
        }
        const mediaPlayer = this.mediaPlayer;
        if (mediaUrl == null) {
            mediaPlayer.src = "";
            return;
        }

        var errorListener = (evt) => {
            console.error("slide mediaPlayer load error event: ", evt, mediaPlayer, mediaPlayer.error);
        };

        mediaPlayer.addEventListener("loadeddata", () => {
            mediaPlayer.removeEventListener("error", errorListener);
            this._mediaPlayerLoadedData(mediaPlayer);
        }, { once: true });

        mediaPlayer.addEventListener("error", errorListener, { once: true });

        var hls = this.hls;
        if (hls != null) {
            hls.detachMedia();
            hls.stopLoad();
            hls.destroy();
            this.hls = null;
        }

        var videoSrc = mediaUrl.toString();
        // XXX the navigator.vendor check is gross, but
        // mediaPlayer.canPlayType('application/vnd.apple.mpegurl')
        // often returns "maybe" when the answer is really "absolutely not"
        if (mediaUrl.pathExtension != "m3u8" || navigator.vendor.startsWith("Apple") == true) {
            mediaPlayer.src = videoSrc;
            return;
        }

        if (typeof(Hls) != "undefined" && Hls.isSupported() == true) {
            hls = new Hls();
            hls.loadSource(videoSrc);
            hls.attachMedia(mediaPlayer);
            this.hls = hls;
            return;
        }

        ShowAlertView(
            LocalizedString("Video unsupported"),
            LocalizedString("The selected video cannot be played as your browser does not appear to support HLS."),
        );
    }
    createLayerOrBackdrop() {
        /*
        if (videoSrc != null) {
            if (layerRenderable == true) {
                var videoUrl = new URL(videoSrc, window.location);
                if (videoUrl.hostname != window.location.hostname && videoUrl.hostname.endsWith("mux.com") == false) {
                    // may cause access/CORS issues that prevent rendering
                    layerRenderable = false;
                }
            }
        }
        */

        var videoLayer = this.layer;
        videoLayer.contents = this.mediaPlayer;
        videoLayer.opaque = this.isOpaque;
        this.videoLayer = videoLayer;
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        var overlayHelper = this.overlayHelper;
        if (overlayHelper != null && this.hideControls != true) {
            this.createControls();
            var playerHUD = this.playerHUD;
            if (playerHUD != null) {
                overlayHelper.setButtonBarAtPosition(playerHUD, Stage.Object.Overlay.Position.BottomCenter);
            }
        }

        var mediaPlayer = this.mediaPlayer;
        var mediaLoader = null;
        if (mediaPlayer == null) {
            var asset = this.asset;
            mediaPlayer = this.getCachedElementForAsset(asset);
            if (mediaPlayer != null) {
                mediaLoader = () => this._mediaPlayerLoadedData(mediaPlayer);
            }
            else {
                mediaPlayer = this.newMediaPlayer();
                if (asset != null) {
                    mediaLoader = () => {
                        asset.open().then(contents => {
                            if (contents != null) {
                                if (this.mediaPlayer != null) {
                                    this.setMediaPlayerSource(contents);
                                    this.assetToClose = asset;
                                } else {
                                    // We were removed from the stage while the asset was loading
                                    asset.close();
                                }
                            }
                        })
                    }
                }
            }
            this.mediaPlayer = mediaPlayer;
            this.didChangeValueForProperty(mediaPlayer, "audioElement");
        }

        mediaPlayer.autoplay = this.autoplays;
        mediaPlayer.playsInline = true;
        mediaPlayer.loop = this.playbackLoops;
        mediaPlayer.volume = SharedUserDefaults.getValueForKey("volume", 0.5);
        mediaPlayer.muted = this.muted;
        mediaPlayer.crossOrigin = "anonymous";

        if (mediaLoader != null) {
            mediaLoader();
        }

        this.createLayerOrBackdrop();

        var loaded = false;
        var dataLoaded = (event) => {
            var player = this.mediaPlayer;
            if (player == null) {
                return;
            }

            if (loaded == false) {
                loaded = true;
                this.addEventListener("pause", evt => this.onPlayerStateChange(evt));
                this.addEventListener("play", evt => this.onPlayerStateChange(evt));
                this.addEventListener("seeked", evt => this.onPlayerStateChange(evt));
                this.addEventListener("timeupdate", evt => this.onPlayerStateChange(evt));
                this.addEventListener("volumechange", evt => {
                    this.didChangeValueForProperty(this.playerVolume, "playerVolume");
                });
            }

            if (player.tagName == "VIDEO") {
                this.resizeLayer();
            }

            if (player.paused == true) {
                var shouldPlay = this.autoplays;
                var state = this.state;
                if (state != null && state.playing != null) {
                    shouldPlay = state.playing;
                }

                if (shouldPlay == false) {
                    // Force a seek so we can have something to render
                    player.currentTime = 0.001;
                }
                else {
                    player.play().catch(err => {
                        if (err.name == "NotAllowedError" && player.muted == false) {
                            player.addEventListener("volumechange", () => {
                                player.play().catch(err => {
                                    gSentry.exception(err);
                                    console.error("player.play (still) threw: ", player, err)
                                })
                            }, {once: true});
                            player.muted = true;
                            return;
                        }

                        gSentry.exception(err);
                        console.error("player.play threw: ", player, err)
                    });
                }
            }
            this.updateVolumeSlider(player.volume * 100);
            this.onPlayerStateChange(event);
        };

        if (mediaPlayer.readyState >= HTMLMediaElement.HAVE_METADATA) {
            dataLoaded(null);
        }
        else {
            this.addEventListener("loadeddata", evt => dataLoaded(evt));
        }

        this.addEventListener("error", evt => {
            console.error("Media player error: ", mediaPlayer, mediaPlayer.error);
        });
    }
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);

        const mediaPlayer = this.mediaPlayer;
        const listeners = this.eventListeners;
        if (mediaPlayer != null) {
            mediaPlayer.pause();
            if (listeners != null) {
                for (var event in listeners) {
                    mediaPlayer.removeEventListener(event, listeners[event]);
                }
            }
            this.mediaPlayer = null;
        }
        this.eventListeners = null;

        const assetToClose = this.assetToClose;
        if (assetToClose != null) {
            assetToClose.close();
            this.assetToClose = null;
        }

        const hls = this.hls;
        if (hls != null) {
            hls.detachMedia();
            this.hls = null;
        }
    }
    /*
     * Teleport
     */
    toJSON() {
        var r = super.toJSON();
        r.asset = this.asset;
        r.hideControls = (this.hideControls == true);
        return r;
    }
    applyEvent(event, sender) {
        super.applyEvent(event, sender);

        const hideControls = event?.hideControls;
        if (hideControls != null) {
            this.hideControls = hideControls;
        }
    }
    /*
     * BaseVideoSlide overrides
     */
    get playerIsReady() {
        var media = this.mediaPlayer;
        return (media != null && media.readyState >= HTMLMediaElement.HAVE_METADATA);
    }
    get playerVolume() {
        var media = this.mediaPlayer;
        return (media?.volume ?? 1) * 100;
    }
    set playerVolume(volume) {
        var media = this.mediaPlayer;
        media.volume = this.maxVolume ? (this.maxVolume / 100) * (volume / 100) : volume / 100;
        SharedUserDefaults.setValueForKey(media.volume, "volume");
        this.updateVolumeSlider(volume);
    }
    get playerDuration() {
        if (this.playerIsReady == false) {
            return 0;
        }
        var media = this.mediaPlayer;
        return media.duration;
    }
    get playerCurrentTime() {
        if (this.playerIsReady == false) {
            return 0;
        }
        var media = this.mediaPlayer;
        return media.currentTime;
    }
    get playerIsPlaying() {
        if (this.playerIsReady == false) {
            return false;
        }
        var media = this.mediaPlayer;
        return (media.paused == false);
    }
    get playerIsPaused() {
        if (this.playerIsReady == false) {
            return false;
        }
        var media = this.mediaPlayer;
        return (media.paused == true);
    }
    playerSeekTo(time, completion) {
        if (this.playerIsReady == false) {
            if (completion != null) {
                completion();
            }
            return;
        }

        var media = this.mediaPlayer;
        if (completion != null) {
            media.addEventListener("seeked", completion, { once: true });
        }
        media.currentTime = time;
    }
    playerStopVideo() {
        if (this.playerIsReady == false) {
            return;
        }
        var media = this.mediaPlayer;
        media.pause();
    }
    playerPauseVideo(completion) {
        if (this.playerIsReady == false) {
            if (completion != null) {
                completion();
            }
            return;
        }
        var media = this.mediaPlayer;
        if (completion != null) {
            media.addEventListener("pause", completion, { once: true });
        }
        media.pause();
    }
    playerPlayVideo(completion) {
        var media = this.mediaPlayer;
        if (completion != null) {
            media.addEventListener("play", completion, { once: true });
        }
        media.play().catch(err => {
            console.error("Media play() threw: ", this, err);
            if (media.muted == false) {
                media.addEventListener("volumechange", () => {
                    media.play().catch(err => {
                        console.error("Media play() still threw: ", this, err);
                    })
                }, {once: true})
                media.muted = true;
            }
        });
    }
}

Object.defineProperty(Media.BasicVideo, "ClassIdentifier", {
    value: "video",
    writable: false
});

Object.defineProperty(Media.BasicVideo, "Title", {
    value: LocalizedString("Video"),
    writable: false
});
