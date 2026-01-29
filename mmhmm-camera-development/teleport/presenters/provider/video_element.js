//
//  video_element.js
//  mmhmm
//
//  Created by Steve White on 11/11/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class PresenterVideoElementProvider extends PresenterVideoProvider {
    constructor() {
        super();

        // Create the element
        var videoElement = document.createElement("video");
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        this.videoElement = videoElement;

        this.addEventListener("suspend", evt => {
            this.updateVideoReadyState();
        })
        this.addEventListener("loadeddata", evt => {
            this.updateVideoReadyState();
            this.handleVideoResize();
        })
        this.addEventListener("playing", evt => {
            this.updateVideoReadyState();
        });
        this.addEventListener("resize", evt => {
            this.handleVideoResize();
        });

        // XXX: could listen for "timeupdate" and flag dirty??

        // It seems the video will stop updating if the
        // element isn't in the visible viewport
        // and if the css display is none/hidden/etc
        // So we need to ensure it always remains visible
        // without actually being visible..
        videoElement.style.position = "absolute";
        videoElement.style.top = "0px";
        videoElement.style.left = "0px";
        // TODO (eslint, debugging, no-constant-condition): make a debug flag
        /* eslint-disable no-constant-condition */
        if (false) {
            // Make true to debug things...
            videoElement.style.opacity = 1;
            videoElement.style.width = "320px";
            videoElement.style.height = "240px";
            videoElement.style.zIndex = 10000;
            videoElement.style.right = "0px";
            videoElement.style.left = "";
        }
        /* eslint-enable no-constant-condition */
        else {
            videoElement.style.opacity = 0;
            videoElement.style.width = "1px";
            videoElement.style.height = "1px";
        }
        document.body.insertBefore(videoElement, document.body.childNodes[0]);

        // Firefox leaks memory when converting a webcam/webrtc backed video element
        // to a GL texture.  See: https://github.com/All-Turtles/TeleportWeb/issues/110
        //
        // It does *not* leak memory when drawing webcam backed video element
        // into a 2D context. So on Firefox, we'll create a 2d context to
        // draw the video into, and then supply that as the layer contents.
        if (navigator.vendor == "" && navigator.userAgent.indexOf("Firefox") != -1) {
            console.info("Using Firefox GPU texture leak work around");
            this.canvasPool = [];
            var entry = this._createNewPoolEntry();
            this.renderable = entry.canvas;
        }
        else {
            this.renderable = videoElement;
        }

        this.updateVideoReadyState();
        this.handleVideoResize();
    }
    destroy() {
        var videoElement = this.videoElement;
        if (videoElement != null) {
            videoElement.pause();
            videoElement.muted = true;
            videoElement.srcObject = null;
            videoElement.parentNode.removeChild(videoElement);

            var listeners = this._eventListeners;
            if (listeners != null) {
                for (var event in listeners) {
                    videoElement.removeEventListener(event, listeners[event]);
                }
                this._eventListeners = null;
            }
            this.videoElement = null;
        }
        this._videoTrack = null;
        this._inputStream = null;
        this.active = false;
        this.size = SizeZero();
    }
    addEventListener(event, block) {
        var listeners = this._eventListeners;
        if (listeners == null) {
            listeners = {};
            this._eventListeners = listeners;
        }
        listeners[event] = block;
        this.videoElement.addEventListener(event, block);
    }

    getFrameForSegmentation(planarAcceptable) {
        return this.videoElement;
    }
    set videoTrack(aVideoTrackOrNull) {
        var previous = this._videoTrack;
        if (previous == aVideoTrackOrNull) {
            return;
        }

        this._videoTrack = aVideoTrackOrNull;

        var srcObject = null;
        if (aVideoTrackOrNull != null) {
            srcObject = new MediaStream([aVideoTrackOrNull]);
        }

        var videoElement = this.videoElement;
        videoElement.srcObject = srcObject;
        if (videoElement.paused == true) {
            videoElement.play().catch(err => {
                // This can happen if the srcObject is changed before
                // the call to play completes. It typically seems to be harmless.
                console.error("Error playing presenter video element: ", err);
            });
        }

        this.updateVideoReadyState();
        this.handleVideoResize();
    }
    get videoTrack() {
        return this._videoTrack;
    }
    set inputStream(anInputStreamOrNull) {
        if (anInputStreamOrNull == this._inputStream) {
            return;
        }

        this._inputStream = anInputStreamOrNull;

        var videoElement = this.videoElement;
        videoElement.srcObject = anInputStreamOrNull;

        this.updateVideoReadyState();
        this.handleVideoResize();
    }
    get inputStream() {
        return this._inputStream;
    }
    updateVideoReadyState() {
        var videoElement = this.videoElement;

        var active = false;
        if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            if (videoElement.paused == false) {
                active = true;
            }
        }

        if (active != this.active) {
            this.active = active;
        }
    }
    handleVideoResize() {
        const videoElement = this.videoElement;

        const width = videoElement.videoWidth;
        const height = videoElement.videoHeight;

        // TensorFlow needs these attributes set
        // and they need to be accurate
        videoElement.width = width;
        videoElement.height = height;

        const videoSize = SizeMake(width, height);
        if (SizeEquals(videoSize, this.size) == false) {
            this.size = videoSize;
        }

        var canvasPool = this.canvasPool;
        if (canvasPool != null) {
            canvasPool.forEach(entry => {
                this._updateCanvasSize(entry.canvas);
            })
        }
    }
    _createNewPoolEntry() {
        var canvas = document.createElement("canvas");
        this._updateCanvasSize(canvas);

        var context = canvas.getContext("2d");

        var poolEntry = { canvas, context, protected: false };
        this.canvasPool.push(poolEntry);

        canvas.destroy = () => {
            poolEntry.protected = false;
        };

        return poolEntry;
    }
    _updateCanvasSize(canvas) {
        var size = this.size;
        var width = size.width;
        var height = size.height;

        // Firefox has an issue with odd-numbered resolutions...
        canvas.width = width - (width % 1);
        canvas.height = height - (height % 1);
    }
    render(timestamp) {
        if (this.active == false) {
            return false;
        }

        // We only need to manually render if we're using
        // the Firefox memory leak prevention canvas2d
        var canvasPool = this.canvasPool;
        if (canvasPool == null) {
            return true;
        }

        var poolEntry = canvasPool.find(entry => entry.protected != true);
        if (poolEntry == null) {
            poolEntry = this._createNewPoolEntry();
        }

        var videoElement = this.videoElement;
        var size = this.size;

        if (this.active == true) {
            poolEntry.context.drawImage(videoElement, 0, 0, size.width, size.height);
        }
        else {
            poolEntry.context.clearRect(0, 0, size.width, size.height);
        }

        this.renderable = poolEntry.canvas;
        return true;
    }
    protect(renderable) {
        if (renderable instanceof HTMLCanvasElement) {
            var poolEntry = this.canvasPool.find(entry => entry.canvas == renderable);
            if (poolEntry != null) {
                poolEntry.protected = true;
            }
        }
    }
    unprotect(renderable) {

    }
    detachFrame(renderable) {

    }
}
