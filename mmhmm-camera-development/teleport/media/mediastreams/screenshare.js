//
//  media/mediastreams/screenshare.js
//  mmhmm
//
//  Created by Steve White on 12/20/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

// A ScreenShareSlide is only used locally.
// If one is shared on a call, the other ends would
// display a Media.MediaStream instead.

Media.ScreenShare = class extends Media.LocalMediaStream {
    videoTrackEnded(event) {
        super.videoTrackEnded(event);
        if (this.stage != null) {
            this.showDisconnectedOverlay();
        }
    }
    get classTitle() {
        return LocalizedString("Screenshare");
    }
    get editorClass() {
        return Media.ScreenShare.Editor;
    }
    get useHybridScreenshareMedia() {
        return (App.isHybrid == true && window.getScreenshareMedia != null)
    }
    get supportsCopyPaste() {
        // We only support copy/paste of screenshares on Hybrid
        // As its the only place where we can easily reconnect
        // to the same screen share. Regular browsers would just
        // show the picker dialog.
        return super.supportsCopyPaste && this.useHybridScreenshareMedia;
    }
    async restoreMediaStreamOnStage(stage) {
        if (this.useHybridScreenshareMedia == false) {
            return null;
        }

        const mediaSource = this.mediaSource;
        const mediaSourceId = this.mediaSourceId;
        if (mediaSource == null || mediaSourceId == null) {
            return null;
        }

        const stageSize = stage.size;
        const conf = Media.ScreenShare.HybridGetUserMediaConfig(mediaSource, mediaSourceId, stageSize);

        try {
            return await navigator.mediaDevices.getUserMedia(conf);
        }
        catch (err) {
            console.error("getUserMedia returned: ", err);
        }
        return null;
    }
    disconnectedOverlayStrings() {
        return {
            title: LocalizedString("Screen share window unavailable"),
            message: LocalizedString("The connection to this window was lost. Try sharing again"),
            edit: LocalizedString("Share screen"),
            remove: LocalizedString("Remove screen share")
        }
    }
    decodeMediaContent(media) {
        var success = super.decodeMediaContent(media);
        if (success == false) {
            return false;
        }

        this.mediaSource = media.mediaSource;
        this.mediaSourceId = media.mediaSourceId;
        this.title = media.title;

        return true;
    }
    encodeMediaContent() {
        var media = super.encodeMediaContent();
        media.mediaSource = this.mediaSource;
        media.mediaSourceId = this.mediaSourceId;
        media.title = this.title; // XXX: hmm
        return media;
    }
}

Object.defineProperty(Media.ScreenShare, "ClassIdentifier", {
    value: "windowRecorder",
    writable: false
});

Object.defineProperty(Media.ScreenShare, "Title", {
    value: LocalizedString("Screen share"),
    writable: false
});

Media.ScreenShare.HybridGetUserMediaConfig = function(type, id, stageSize) {
    const videoConf = {
        mandatory: {
            chromeMediaSource: type,
            chromeMediaSourceId: id,
            maxWidth: stageSize.width,
            maxHeight: stageSize.height
        },
        optional: []
    };

    let audioConf = null;
    if (SharedUserDefaults.getValueForKey("screenShareAudio", false) != true) {
        audioConf = false;
    }
    else {
        audioConf = {
            mandatory: {
                chromeMediaSource: type,
                chromeMediaSourceId: id,
            }
        };
    }

    return { audio: audioConf, video: videoConf };
}

Media.ScreenShare.HybridRequestExisting = async function(type, id, title) {
    if (App.isHybrid == false || window.getScreenshareMedia == null) {
        return null;
    }

    const stage = gApp.stage;
    const stageSize = stage.size;

    const conf = Media.ScreenShare.HybridGetUserMediaConfig(type, id, stageSize);
    console.info("will invoke getUserMedia with conf: ", conf);

    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia(conf);
        console.info("getUserMedia returned stream: ", stream);
    }
    catch (err) {
        console.error("getUserMedia returned error: ", err);
        throw err;
    }

    var slide = new Media.ScreenShare(createUUID(), stage.localPresenter.identifier, stream);
    slide.mediaSource = type;
    slide.mediaSourceId = id;
    slide.title = title ? title : "";
    return slide;
};

Media.ScreenShare.HybridRequestNew = async function(event) {
    return new Promise((resolve, reject) => {
        const onSuccess = (type, id, title, app) => {
            Media.ScreenShare.HybridRequestExisting(type, id, title).then((slide) => {
                resolve(slide);
                const props = {};
                if (app) {
                    props.process_name = app;
                }
                Analytics.Log("presentation.slides.added.screen_recorder", props);
                Media.ScreenShare.lastRequestState.state = "success";
            }).catch(reject);
        };
        const onError = (error) => {
            console.error("getScreenshareMedia returned error: ", error);
            Media.ScreenShare.lastRequestState.state = "failure";
            reject(error);
        };

        getScreenshareMedia(
            true, // listScreens
            true, // listWindows
            onSuccess,
            onError,
        );
    })
}

// this observableObject is needed for a quick tour
// it enables the quick tour to observe the state of the
// screenshare request. This allows the quick tour to
// progress to the next step or go back to the previous step
// based on whether the user cancelled the request or selected a screen.
Media.ScreenShare.lastRequestState = new ObservableObject();
Media.ScreenShare.lastRequestState.state = "idle";

Media.ScreenShare.RequestNew = async function (evt) {
    Media.ScreenShare.lastRequestState.state = "active";

    if (App.isHybrid == true && window.getScreenshareMedia != null) {
        return Media.ScreenShare.HybridRequestNew(evt);
    }

    const opts = {
        video: true,
        audio: true,
        systemAudio: "include",
    };

    return navigator.mediaDevices.getDisplayMedia(opts).then(stream => {
        if (stream == null) {
            console.error("getDisplayMedia returned a null stream??", stream);
            return null;
        }

        const tracks = stream.getVideoTracks();
        if (tracks == null || tracks.length == 0) {
            console.error("No video tracks in stream ??", stream);
            return null;
        }

        const stage = gApp.stage;

        Analytics.Log("presentation.slides.added.screen_recorder");

        const slide = new Media.ScreenShare(createUUID(), stage.localPresenter.identifier, stream);

        return slide;
    }).then(slide => {
        Media.ScreenShare.lastRequestState.state = slide ? "success" : "failure";

        return slide;
    }).catch(err => {
        console.log("getDisplayMedia returned error: ", err);
        Media.ScreenShare.lastRequestState.state = "failure";

        if (err.name == "NotAllowedError" && err.message == "Permission denied") {
            var message = err.message;

            if (message == "Permission denied") {
                // Seen on Blink browsers when the human cancels out of the picker
                // When there is actually an OS permission error, it seems like Edge
                // returns: "Permission denied by system"
                return null;
            }
            else if (message == "The request is not allowed by the user agent or the platform in the current context.") {
                // Seen on Firefox when the human block out of the picker
                return null;
            }
        }

        ShowAlertView(
            LocalizedString("Screen Share Error"),
            LocalizedString("An unknown error occurred trying to setup the screen share: ") + err.toString(),
        );
    });
}

Media.ScreenShare.Editor = class {
    constructor(slide) {
        this.slide = slide;
    }
    _addMediaToUndoHistory(slide) {
        const mediaSource = slide.mediaSource;
        const mediaSourceId = slide.mediaSourceId;
        const title = slide.title;

        slide.undoManager?.registerUndoWithTargetBlock(this, async () => {
            try {
                const updated = await Media.ScreenShare.HybridRequestExisting(mediaSource, mediaSourceId, title);
                if (updated != null) {
                    this._applyChangesFromMedia(updated);
                    return;
                }
            }
            catch (err) {
                console.error("HybridRequestExisting threw: ", err);
            }

            slide.displayContentsEditor();
        });
    }
    _applyChangesFromMedia(updated) {
        const slide = this.slide;

        this._addMediaToUndoHistory(slide);

        slide.mediaSource = updated.mediaSource;
        slide.mediaSourceId = updated.mediaSourceId;
        slide.title = updated.title;
        slide.videoTrack = updated.videoTrack;
        slide.audioTrack = updated.audioTrack;
        slide.thumbnailAsset = null;
        slide.hideDisconnectedOverlay();

        slide.invalidateThumbnail();
    }
    displayFrom(sender) {
        Media.ScreenShare.RequestNew().then(updated => {
            if (updated == null) {
                return;
            }

            this._applyChangesFromMedia(updated);
        }).finally(() => {
            var onDismiss = this.onDismiss;
            if (onDismiss != null) {
                onDismiss();
            }
        })
    }
}
