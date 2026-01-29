//
//  webcodecs.js
//  mmhmm
//
//  Created by Steve White on 11/11/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class PresenterVideoWebCodecsProvider extends PresenterVideoProvider {
    constructor() {
        super();
        this.contentsPool = [];

        this.shouldProvideBuffer = true;
        this.needsAlphaWorkaround = false;
    }

    destroy() {
        this.stopProcessor();
        this.renderable = null;
        this.size = SizeZero();
    }

    get canProvideBuffer() {
        return true;
    }

    protect(renderable) {
        if (renderable == this._renderable) {
            this._renderable = null;
        }
    }
    unprotect(renderable) {

    }

    detachFrame(renderable) {
        if (renderable != null && renderable.videoFrame) {
            renderable.videoFrame.close();
        }
    }

    set renderable(aRenderableOrNull) {
        var previous = this._renderable;
        if (previous == aRenderableOrNull) {
            return;
        }
        if (previous != null) {
            previous.destroy();

            var contentsPool = this.contentsPool;
            if (contentsPool.indexOf(previous) == -1) {
                contentsPool.push(previous);
            }
        }

        this._renderable = aRenderableOrNull;
    }
    get renderable() {
        return this._renderable;
    }

    set videoTrack(aVideoTrackOrNull) {
        console.info("PresenterVideoWebCodecsProvider set videoTrack", aVideoTrackOrNull);
        var previous = this._videoTrack;
        if (previous == aVideoTrackOrNull) {
            return;
        }

        this.stopProcessor();
        this._videoTrack = aVideoTrackOrNull;

        if (aVideoTrackOrNull != null) {
            this.startProcessor();
        }
    }

    get videoTrack() {
        return this._videoTrack;
    }

    stopProcessor() {
        this.renderable = null;

        var reader = this.reader;
        if (reader != null) {
            reader.cancel();
            this.reader = null;
        }

        var processor = this.processor;
        if (processor != null) {
            // XXX: anything??
            this.processor = null;
        }

        if (this.active == true) {
            this.active = false;
        }
    }

    startProcessor() {
        var videoTrack = this.videoTrack;
        if (videoTrack == null) {
            return;
        }

        const trackProcessor = new MediaStreamTrackProcessor(videoTrack);
        if (trackProcessor == null) {
            console.error("Failed to create MediaStreamTrackProcessor", videoTrack);
            return;
        }

        const reader = trackProcessor.readable.getReader();
        if (reader == null) {
            console.error("trackProcessor returned null reader", trackProcessor);
            return;
        }

        this.processor = trackProcessor;
        this.reader = reader;

        this.readNextFrame();
    }

    async thumbnailNextFrame() {
        var task = {};
        task.promise = new Promise((resolve, reject) => {
            task.resolve = resolve;
            task.reject = reject;
        })
        this.thumbnailTask = task;
        return task.promise;
    }

    async readNextFrame() {
        var result = null;
        var reader = this.reader;
        try {
            result = await reader.read();
        }
        catch (err) {
            console.error("reader read threw: ", reader, err);
            this.stopProcessor();
            return;
        }

        if (result.done == true) {
            if (reader == this.reader) {
                this.stopProcessor();
            }
            return;
        }

        const frameFromCamera = result.value;
        var width = frameFromCamera.codedWidth;
        var height = frameFromCamera.codedHeight;

        // According to:
        // https://github.com/google/mediapipe/issues/2726#issuecomment-956689056
        // MediaPipe will accept WebFrames if they
        // have these two properties set.
        frameFromCamera.width = width;
        frameFromCamera.height = height;

        var frameSize = SizeMake(width, height);
        if (SizeEquals(frameSize, this.size) == false) {
            this.size = frameSize;
        }
        if (this.active == false) {
            this.active = true;
        }

        this.processVideoFrame(frameFromCamera);

        this.readNextFrame();
    }
    render(timestamp) {
        var renderable = this.renderable;
        if (renderable != null) {
            return renderable.dirty;
        }
        return false;
    }
    processVideoFrame(videoFrame) {
        var contentsPool = this.contentsPool;

        var renderable = contentsPool.pop();
        if (renderable == null) {
            renderable = new PresenterVideoContents();
            renderable.onDestroy = function() {
                if (contentsPool.indexOf(renderable) == -1) {
                    contentsPool.push(renderable)
                }
            }
        }

        renderable.videoFrame = videoFrame;
        renderable.size = this.size;
        renderable.contents = null;
        renderable.layout = null;

        var format = videoFrame.format;
        var filter = this.filter;
        if (format != this.format) {
            console.info("VideoFrame format is: ", format);
            this.format = format;
            if (format != null) {
                if (format.startsWith("NV12") == true || format.startsWith("I420") == true) {
                    filter = new PresenterVideoFilter(format);
                    // In hybrid apps we need filter workaround to support blur and layering.
                    this.needsAlphaWorkaround = App.isHybrid;
                }
                else if (format == "BGRA" || format == "RGBA") {
                    // We don't need a custom filter to support these
                    filter = null;
                    this.needsAlphaWorkaround = false;
                }
                else {
                    console.error("unknown format: ", format);
                    debugger;
                }
            }
            this.filter = filter;
        }
        renderable.format = format;
        renderable.filter = filter;

        var halfSize = SizeMake(videoFrame.width / 2, videoFrame.height / 2);
        var thumbnailTask = this.thumbnailTask;
        // WebCodec code throws for odd size video frames, which Twilio can send us
        // WebCodec code currently does not correctly copy the buffer when the UV buffer has an odd height
        // Twilio was sending 370x210 as a down sampled frame which was causing image skewing from the bad copy
        if (thumbnailTask != null || videoFrame.width & 1 || videoFrame.height & 1 || halfSize.width & 1 || halfSize.height & 1) {
            createImageBitmap(videoFrame).then((bitmap) => {
                renderable.contents = bitmap;
                // No filter needed to render the ImageBitmap object
                renderable.filter = null;
                this.renderable = renderable;
                if (thumbnailTask != null) {
                    thumbnailTask.resolve(bitmap);
                    this.thumbnailTask = null;
                }
            }).catch(err => {
                if (thumbnailTask != null) {
                    thumbnailTask.reject(err);
                    this.thumbnailTask = null;
                }
            }).finally(() => {
                videoFrame.close();
            })
            // Since this only happens on remote presenter we don't need the video frame for segmentation
            return;
        }

        if (this.needsAlphaWorkaround == false && this.shouldProvideBuffer === false) {
            // No filter needed to render the VideoFrame object
            renderable.filter = null;
            renderable.dirty = true;
            this.renderable = renderable;
        }
        else {
            var allocSize = videoFrame.allocationSize();
            var buffer = renderable.buffer;
            if (buffer == null || buffer.length < allocSize) {
                buffer = new Uint8Array(allocSize);
                renderable.buffer = buffer;
            }

            videoFrame.copyTo(buffer).then(layout => {
                renderable.dirty = true;
                renderable.layout = layout;
                this.renderable = renderable;
            });
        }
    }

    getFrameForSegmentation(planarAcceptable) {
        var renderable = this.renderable;
        if (renderable.dirty === false) {
            return null;
        }
        if (planarAcceptable == true) {
            return renderable;
        }
        return renderable.videoFrame;
    }
}

PresenterVideoWebCodecsProvider.supported = (
    window.MediaStreamTrackProcessor != null
)

