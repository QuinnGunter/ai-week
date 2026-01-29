//
//  media/mediastreams/local.js
//  mmhmm
//
//  Created by Steve White on 12/20/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

Media.LocalMediaStream = class extends Media.MediaStream {
    constructor(identifier, presenterID, inputMediaStream) {
        super(identifier, presenterID);

        var trackListener = (event) => {
            this.lastMediaStreamEvent = event;
        }
        var mediaStream = new MediaStream();

        // addTrack and removeTrack don't seem to be firing the events.
        // But incase they start working in the future due to a browser update,
        // we don't want to double fire the event.  So we will listen for
        // the events, and after performing an addTrack/removeTrack see
        // if the expected event fired: If not, we'll manually dispatch an event
        mediaStream.addEventListener("addtrack", trackListener);
        mediaStream.addEventListener("removetrack", trackListener);
        this._localMediaStream = mediaStream;

        this.videoTrackEndedListener = (evt) => {
            this.videoTrackEnded(evt);
        }

        if (inputMediaStream != null) {
            var videoTracks = inputMediaStream.getVideoTracks();
            if (videoTracks.length > 0) {
                this.videoTrack = videoTracks[0];
            }
            var audioTracks = inputMediaStream.getAudioTracks();
            if (audioTracks.length > 0) {
                this.audioTrack = audioTracks[0];
            }
        }
    }
    _removeLocalMediaStreamTrack(aMediaStreamTrack, eventListener) {
        const mediaStream = this.localMediaStream;

        if (eventListener != null) {
            aMediaStreamTrack.removeEventListener("ended", eventListener);
        }
        mediaStream.removeTrack(aMediaStreamTrack);

        let event = this.lastMediaStreamEvent;
        if (event == null || event.type != "removetrack" || event.track != aMediaStreamTrack) {
            event = new MediaStreamTrackEvent("removetrack", {track: aMediaStreamTrack});
            mediaStream.dispatchEvent(event);
            this.lastMediaStreamEvent = event;
        }

        aMediaStreamTrack.stop();
    }
    _addLocalMediaStreamTrack(aMediaStreamTrack, eventListener) {
        const mediaStream = this.localMediaStream;

        if (eventListener != null) {
            aMediaStreamTrack.addEventListener("ended", eventListener);
        }

        mediaStream.addTrack(aMediaStreamTrack);

        let event = this.lastMediaStreamEvent;
        if (event == null || event.type != "addtrack" || event.track != aMediaStreamTrack) {
            event = new MediaStreamTrackEvent("addtrack", {track: aMediaStreamTrack});
            mediaStream.dispatchEvent(event);
            this.lastMediaStreamEvent = event;
        }
    }
    set videoTrack(aMediaStreamTrack) {
        const previous = this._videoTrack;
        if (previous == aMediaStreamTrack) {
            return;
        }

        if (previous != null) {
            this._removeLocalMediaStreamTrack(previous, this.videoTrackEndedListener);
        }

        this._videoTrack = aMediaStreamTrack;
        if (aMediaStreamTrack != null) {
            this._addLocalMediaStreamTrack(aMediaStreamTrack, this.videoTrackEndedListener);
        }

        this.mediaStreamChanged();
    }
    get videoTrack() {
        return this._videoTrack;
    }
    set audioTrack(aMediaStreamTrack) {
        const previous = this._audioTrack;
        if (previous == aMediaStreamTrack) {
            return;
        }

        if (previous != null) {
            this._removeLocalMediaStreamTrack(previous);
        }
        this._audioTrack = aMediaStreamTrack;
        if (aMediaStreamTrack != null) {
            this._addLocalMediaStreamTrack(aMediaStreamTrack);
        }

        this.mediaStreamChanged();
    }
    get audioTrack() {
        return this._audioTrack;
    }
    videoTrackEnded(event) {
        var source = event.srcElement;
        if (source == this.videoTrack) {
            this.videoTrack = null;
        }
    }
    // Read-only as teleport cannot support the stream being changed
    get localMediaStream() {
        return this._localMediaStream;
    }
    get audioContextShouldIgnoreMute() {
        return true;
    }
    // Overrides
    onRemoteTrackAdded(remoteTrack) {
        console.error("onRemoteTrackAdded should not be invoked on a LocalMediaStream", remoteTrack);
        debugger;
    }
    onRemoteTrackRemoved(remoteTrack) {
        console.error("onRemoteTrackRemoved should not be invoked on a LocalMediaStream", remoteTrack);
        debugger;
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        if (this.videoTrack != null) {
            this.startLoadTimer();
        }
    }
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);
        this.stopLoadTimer();

        window.setTimeout(() => {
            this.videoTrack = null;
        }, 1);
    }
    playerLoadedData(event) {
        super.playerLoadedData(event);
        this.stopLoadTimer();
    }
    startLoadTimer() {
        this.stopLoadTimer();
        this.loadTimer = window.setTimeout(() => {
            var player = this.player;
            if (player != null && player.readyState != HTMLMediaElement.HAVE_NOTHING) {
                return;
            }
            else {
                var provider = this.provider;
                if (provider != null && provider.renderable != null) {
                    return;
                }
            }

            var close = document.createElement("button");
            close.className = "capsule";
            close.innerText = LocalizedString("Close");

            var viewHelpDesk = document.createElement("button");
            viewHelpDesk.className = "capsule";
            viewHelpDesk.innerText = LocalizedString("Help Center");

            var dismiss = ShowAlertView(
                LocalizedString("Stream error"),
                LocalizedString("The stream has not provided any data after two seconds.\n\nIf you are attempting to present a screen share slide, this may be indicative of operating system permission issues."),
                {buttons: [close, viewHelpDesk]}
            );

            viewHelpDesk.addEventListener("click", evt => {
                window.open("https://help.airtime.com/hc", "_blank");
                dismiss();
            }, {once: true});

            close.addEventListener("click", evt => {
                dismiss();
            })
        }, 2000);
    }
    stopLoadTimer() {
        var loadTimer = this.loadTimer;
        if (loadTimer != null) {
            window.clearTimeout(loadTimer);
            this.loadTimer = null;
        }
    }
    get mediaStream() {
        return this.localMediaStream;
    }
    set contentSize(value) {
        const size = SizeMake(value?.width ?? 0, value?.height ?? 0);
        const previous = this.contentSize;
        if (SizeEquals(size, previous) == true) {
            return;
        }
        this._contentSize = size;
        this.setNeedsPersistence();
    }
    get contentSize() {
        return this._contentSize ?? SizeZero();
    }
}
