//
//  worker_segmenter.js
//  mmhmm
//
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

class WorkerSegmenter {
    constructor() {
        this.canEstimateGreenScreen = true;
        try {
            this.launchSegmentationWorker();
        }
        catch(err) {
            console.error("Error while preparing segmentation worker. Please investigate.");
            throw err;
        }

        var observer = new PerformanceObserver(evt => {
            var entries = evt.getEntries();
            var names = entries.map(entry => entry.name);

            if (names.indexOf(WorkerSegmenter.PerformanceMarks.PreprocessEnd) != -1) {
                performance.measure(
                    WorkerSegmenter.PerformanceMeasures.Preprocess,
                    WorkerSegmenter.PerformanceMarks.PreprocessStart,
                    WorkerSegmenter.PerformanceMarks.PreprocessEnd,
                );
            }

            if (names.indexOf(WorkerSegmenter.PerformanceMarks.SegmentationEnd) != -1) {
                performance.measure(
                    WorkerSegmenter.PerformanceMeasures.Segmentation,
                    WorkerSegmenter.PerformanceMarks.SegmentationStart,
                    WorkerSegmenter.PerformanceMarks.SegmentationEnd,
                );
            }
        });
        observer.observe({
            entryTypes: ["mark"],
        });
        this.performanceObserver = observer;
    }
    terminateWorker() {
        this.segmentationPreprocess = null;
        this.segmentationReady = false;
        if (this.segmentationWorker != null) {
            this.segmentationWorker.terminate();
            this.segmentationWorker = null;
        }
    }
    destroy() {
        this.terminateWorker();
        var observer = this.performanceObserver;
        if (observer != null) {
            observer.disconnect();
            this.performanceObserver = null;
        }
    }

    async render(renderable, timestamp) {
        if (this.segmentationPreprocess == null || this.segmentationReady == false) {
            // Segmentation worker not started yet
            return null;
        }

        var request = this.request;
        if (request != null) {
            // We're busy with another request
            return null;
        }

        request = {};
        request.promise = new Promise((resolve, reject) => {
            request.resolve = resolve;
            request.reject = reject;
        });
        this.request = request;

        performance.mark(WorkerSegmenter.PerformanceMarks.PreprocessStart);
        this.segmentationPreprocess.renderPreprocess(renderable).then(dataArray => {
            performance.mark(WorkerSegmenter.PerformanceMarks.PreprocessEnd);
            performance.mark(WorkerSegmenter.PerformanceMarks.SegmentationStart);

            if (dataArray == null)
            {
                request.resolve(null);
                this.request = null;
            }
            else {
                this.segmentationWorker.postMessage(["NewFrame", dataArray, timestamp]);
            }
        });

        return request.promise;
    }

    setSegmentationMaskSize(width, height) {
        if (width != null) {
            this.maskSizeWidth = width;
        }
        if (height != null) {
            this.maskSizeHeight = height;
        }
        // They come in in two different messages
        if (this.maskSizeWidth > 0 && this.maskSizeHeight > 0) {
            this.inputDataSize = this.maskSizeWidth * this.maskSizeHeight * this.inputImageDepth;
            let preprocessMethod = "webcodec"
            if (typeof gHybrid != "undefined" && navigator.platform.startsWith("Win")) {
                // Windows hybrid is passing BGRA images which the MLPreprocess
                // class doesn't know how to handle.
                // Given it does native segmentation, this code would only
                // be used for the green screen auto-tune, so there isn't
                // a performance concern for using canvas2d.
                preprocessMethod = "canvas2d";
            }
            else if (navigator.vendor.startsWith("Apple") == true) {
                preprocessMethod = "gpu";

                const matches = navigator.userAgent.match(/^.*Safari\/([0-9.]*)$/);
                if (matches != null && matches.length == 2) {
                    const version = parseFloat(matches[1]);
                    if (version >= 605.1) {
                        // We need to get pixels out of the <video> element
                        // Something has recently changed where Safari is
                        // failing to do this via the GL pipeline, but
                        // canvas2d still works.
                        // This fixes virtual green screen and
                        // physical green screen tuner
                        preprocessMethod = "canvas2d";
                    }
                }
            }

            // Start the data preprocessor
            var paramsPreprocess = {
                width: this.maskSizeWidth,
                height: this.maskSizeHeight,
                depth: this.inputImageDepth,
                count: 1,
                alphaIsFloat: false,
                toFloat: false,
                method: preprocessMethod,
            }
            this.segmentationPreprocess = new MLPreprocess(paramsPreprocess);
            this.segmentationPreprocess.load();
        }
    }

    async estimateGreen(renderable, timestamp, initialEstimation, cropInsets) {
        if (this.segmentationPreprocess == null || this.segmentationReady == false) {
            throw new Error('Estimation worker not started yet');
        }

        var request = this.greenScreenParamsRequest;
        if (request != null) {
            throw new Error('Estimation worker busy with previous request');
        }

        request = {};
        request.promise = new Promise((resolve, reject) => {
            request.resolve = resolve;
            request.reject = reject;
        });
        this.greenScreenParamsRequest = request;
        
        this.segmentationPreprocess.renderPreprocess(renderable).then(dataArray => {
            if (dataArray == null) {
                request.reject("No input data.");
                this.greenScreenParamsRequest = null;
            }
            else {
                this.segmentationWorker.postMessage(["RequestGreenScreenParams", dataArray, timestamp, initialEstimation, cropInsets]);
            }
        }).catch((err) => {
            request.reject(err);
            this.greenScreenParamsRequest = null;
        })

        return request.promise;
    }

    // Segmentation worker
    launchSegmentationWorker() {
        this.inputImageDepth = 3;

        if (this.segmentationWorker == null) {
            this.segmentationWorker = new Worker("workers/workerSegmentation.js");

            this.segmentationWorker.onmessage = (msg) => {
                let msgType = msg.data[0];
                let data = msg.data[1];
                let requestGreen = this.greenScreenParamsRequest;

                switch (msgType) {
                    case "Mask": {
                        performance.mark(WorkerSegmenter.PerformanceMarks.SegmentationEnd);
                        var maskDataSource = data;
                        var mask = new RendererArrayContents(
                            maskDataSource,
                            this.maskSizeWidth,
                            this.maskSizeHeight,
                        );
                        mask.depth = 1;
                        mask.cutoff = this.maskCutoff;
                        mask.hitTestMaskThreshold = 255 * mask.cutoff;

                        const request = this.request;
                        if (request != null) {
                            request.resolve(mask);
                            this.request = null;
                        }
                        break;
                    }
                    case "NoMask": {
                        performance.mark(WorkerSegmenter.PerformanceMarks.SegmentationEnd);
                        const request = this.request;
                        if (request != null) {
                            request.reject();
                            this.request = null;
                        }
                        break;
                    }
                    case "MaskDepth":
                        this.maskDepth = data;
                        break;
                    case "MaskWidth":
                        this.setSegmentationMaskSize(data, null);
                        break;
                    case "MaskHeight":
                        this.setSegmentationMaskSize(null, data);
                        break;
                    case "MaskCutoff":
                        this.maskCutoff = data;
                        break;
                    case "SegmentationMode":
                        break;
                    case "SegmentationReady":
                        this.segmentationReady = true;
                        break;
                    case "GreenScreenParamsReady":
                        if (requestGreen != null) {
                            requestGreen.resolve(data);
                            this.greenScreenParamsRequest = null;
                        }
                        break;
                    case "GreenScreenParamsFailed":
                        if (requestGreen != null) {
                            requestGreen.reject();
                            this.greenScreenParamsRequest = null;
                        }
                        break;
                }
            };

            this.segmentationWorker.postMessage(["Load", this.inputImageDepth]);
            // Stops the display of full frames when the user expects segmentation to be removing the background
            this.segmentationReady = false;
        }
    }
}

WorkerSegmenter.PerformanceMeasures = Object.freeze({
    Segmentation: "segmentation",
    Preprocess: "preprocess",
})

WorkerSegmenter.PerformanceMarks = Object.freeze({
    SegmentationStart: "segmentation_start",
    SegmentationEnd: "segmentation_end",
    PreprocessStart: "preprocess_start",
    PreprocessEnd: "preprocess_end",
})
