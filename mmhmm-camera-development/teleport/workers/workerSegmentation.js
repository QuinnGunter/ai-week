//
//  workerSegmentation.js
//
//  Copyright � 2022 mmhmm, inc. All rights reserved.
//
// This for a worker thread running segmentation off line from the main thread

// All files stuffed into a single worker file
// Tried to make the worker a module so it could just load the other files
// That had issues, maybe fix later if this seems like a good way to do segmentation


class PerformantModelSelection {
    constructor(recheckDuration, modelCount) {
        this.modelCount = modelCount;
        this.lastModel = 0;
        this.waitCheckDuration = 30000; // 30s
        this.recheckDuration = recheckDuration;
        this.checkingTime = false;
        this.runCounts = 0;
        this.totalLapsedTime = 0;
        this.lastTime = 0;
        this.lastInterval = 0;
        this.maxFrameTime = 33;
        this.waitingToCheck(this.waitCheckDuration);
    }

    runningSegmentation(startTime, modelTime) {
        if (this.checkingTime == false) {
            return;
        }
        // Just reset last frame time, not measuring
        if (this.lastTime == 0) {
            // First pass through
            this.lastInterval = 0;
            this.lastTime = startTime;
            return;
        }
        this.lastInterval = startTime - this.lastTime;
        //console.log(`... ${this.lastInterval} duration: ${modelTime}`);
        this.lastTime = startTime;
        if (this.lastInterval > 5000) {
            // If we have 5s or more between segmentation starts, then we may have had a mode change
            // Wait again for it to stabilize before checking anyting
            this.waitingToCheck(this.waitCheckDuration);
        }
    }

    segmentationModelRan() {
        var modelChange = this.lastModel;
        if (this.checkingTime == false) {
            return modelChange;
        }
        if (this.lastInterval == 0) {
            // First pass through
            return modelChange;
        }
        var lapse = this.lastInterval;
        this.runCounts += 1;
        this.totalLapsedTime += lapse;
        //console.log(`t${this.runCounts} ${lapse}`);

        // Using 8 since it can have a long run in that many run
        if (this.runCounts == 8) {
            // We still get great visual feed back if it takes 2 frames since it is running in a worker
            // The model quality difference appears to outweigh the frequence when it is close
            var frameThreshold = 54;
            var timePerFrame = this.totalLapsedTime / this.runCounts;
            //
            if (timePerFrame > frameThreshold) {
                // Need to drop down
                modelChange = this.lastModel + 1;
                this.lastModel = modelChange;
                //console.log(`  Model change ${timePerFrame} -> ${modelChange}`);
                if (modelChange == this.modelCount - 1) {
                    // Exit and do not restart check
                    // TODO: We only down scale so once we reach the lowest this is done
                    // How do we measure the possiblity to move back up?
                    this.checkingTime = false;
                    return modelChange;
                }
            }
            else {
                //console.log(`  Checked ${timePerFrame}`);
            }
            var recheckDuration = this.recheckDuration;
            if (timePerFrame < frameThreshold * 0.5) {
                // Slow rechecking when it is doing well below threshold
                recheckDuration *= 2;
            }
            this.waitingToCheck(recheckDuration);
        }
        return modelChange;
    }

    startTimingCheck() {
        //console.log(`start checking`);
        this.runCounts = 0;
        this.totalLapsedTime = 0;
        this.lastTime = 0;
        this.lastInterval = 0;
        this.checkingTime = true;
    }

    waitingToCheck(waitDuration) {
        this.checkingTime = false;
        setTimeout(() => {
            this.startTimingCheck();
        }, waitDuration);
    }
}

// This is from onnx.js
class MLModelONNX {
    constructor(model) {
        this.model = model;
    }
    async load() {
        if (MLModelONNX.loaded != true) {
            var onnxSource = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js";
            Segmenter.LoadScriptSource(onnxSource);
            MLModelONNX.loaded = true;
        }
        var options = {
            // Can't seem to use webgl with most models:
            // Uncaught (in promise) TypeError: cannot resolve operator 'ConvTranspose' with opsets: ai.onnx v11
            executionProviders: ['wasm'] //, 'webgl'],
            //enableProfiling: true,
        };
        var model = this.model;
        ort.env.wasm.simd = true;
        var session = await ort.InferenceSession.create(model.name, options);
        this.dimensions = model.makeDimensions();
        this.inputTensorName = session.inputNames[0];
        this.outputTensorName = session.outputNames[0];
        this.onnxSession = session;
    }
    async runUsingDataArray(dataArray) {
        var model = this.model;

        var inputTensor = this.inputTensor;
        if (inputTensor != null) {
            inputTensor.data = dataArray;
        }
        else {
            inputTensor = new ort.Tensor('float32', dataArray, this.dimensions);
            this.inputTensor = inputTensor;
        }

        var inputs = {};
        inputs[this.inputTensorName] = inputTensor;

        var outputs = await this.onnxSession.run(inputs);
        var outputTensor = outputs[this.outputTensorName];

        return outputTensor.data;
    }
}
// End onnx.js

// This is from seglib.js
var seglibWasmLoaded = false;
var SeglibModule = null;
var onSeglibWasmLoaded = [];
var Module = {
    onRuntimeInitialized: function () {
        console.log("Seglibjs has been loaded sucessfully, revision ", Module.GetSeglibRevString());
        seglibWasmLoaded = true;
        SeglibModule = Module;
        onSeglibWasmLoaded.forEach(fun => fun());
    }
};

class MLModelSeglib {
    constructor(seglib_config) {
        this.seglib_config = seglib_config;
        this.seglibInitialized = false;
        this.imageBuffer = null;
        this.maskBuffer = null;
        this.mce = null;
        this.mappedOutputBuffer = null;
        this.wasmMemorySize = 0;

        this.timer = null;
        // Note: the number of models needs to match the models listed in the auto json config file
        this.modelSelection = new PerformantModelSelection(60000, 3);
    }

    createMaskCalcEngine() {
        this.mce = new SeglibModule.MaskCalcEngine(
            this.seglib_config.json_config_path,
            this.seglib_config.models_root_dir,
            (status) => {
                this.seglibInitialized = status;
            },
            (current_segmentation_index, segmentations_count) => {
                if (this.modelSelection != null) {
                    var modelChange = this.modelSelection.segmentationModelRan();
                    // TODO: implement logic described here https://github.com/All-Turtles/mmhmm-web/issues/1425
                    return modelChange;
                }
                else {
                    return current_segmentation_index;
                }
            }
        );
    }

    ensureMaskCalcEngineReady() {
        if (this.mce === null) {
            if (!seglibWasmLoaded) {
                return false;
            }
            this.createMaskCalcEngine();
            return false;
        }
        return this.seglibInitialized;
    }

    prepareBuffers(imageBytes) {
        const width = this.inputWidth;
        const height = this.inputHeight;
        const depth = this.seglib_config.depth;
        if (this.imageBuffer == null) {
            this.imageBuffer = SeglibModule._malloc(imageBytes.length * imageBytes.BYTES_PER_ELEMENT);
            this.maskBufferSize = imageBytes.length * imageBytes.BYTES_PER_ELEMENT / depth;
            this.maskBuffer = SeglibModule._malloc(this.maskBufferSize);
            this.mappedOutputBuffer = new Uint8ClampedArray(SeglibModule.HEAPU8.buffer, this.maskBuffer, this.maskBufferSize);
            this.wasmMemorySize = SeglibModule.HEAPU8.byteLength;
        }

        SeglibModule.HEAPU8.set(imageBytes, this.imageBuffer);
        return this.imageBuffer;
    }

    waitAsync(mce, interval_ms) {
        return new Promise((resolve, reject) => {
            function wait() {
                const ready = !mce.NextFrameAsyncInProgress();
                if (ready == false) {
                    setTimeout(wait, interval_ms);
                    return;
                }
                resolve();
            }
            wait();
        });
    }

    updateMappedOutputBufferIfNeeded() {
        if(this.wasmMemorySize !== SeglibModule.HEAPU8.byteLength) {
          // reallocation happened so mappedOutputBuffer must be recreated
          this.mappedOutputBuffer = new Uint8ClampedArray(SeglibModule.HEAPU8.buffer, this.maskBuffer, this.maskBufferSize);
          this.wasmMemorySize = SeglibModule.HEAPU8.byteLength;
        }
    }

    async callSeglibSync() {
        if (this.ensureMaskCalcEngineReady()) {
            const width = this.inputWidth;
            const height = this.inputHeight;
            const depth = this.seglib_config.depth;
            var seglibCallStartTime = performance.now();
            var result = this.mce.NextFrame(
                { data: this.imageBuffer, width: width, height: height, channels: depth, depth: SeglibModule.DepthType.uint8 },
                { data: this.maskBuffer, width: width, height: height, channels: 1, depth: SeglibModule.DepthType.uint8 },
                { data: this.maskBuffer, width: width, height: height, channels: 1, depth: SeglibModule.DepthType.uint8 }
            );
            this.updateMappedOutputBufferIfNeeded();
            var seglibCallStopTime = performance.now();
            if (this.modelSelection != null)
                this.modelSelection.runningSegmentation(seglibCallStartTime, seglibCallStopTime - seglibCallStartTime);
            //console.log('Seglib sync result:', result, `, duration: ${seglibCallStopTime - seglibCallStartTime} [ms]`);
        }
        return this.mappedOutputBuffer;
    }

    // Not currently used
    async callSeglib() {
        if (this.ensureMaskCalcEngineReady()) {
            const width = this.inputWidth;
            const height = this.inputHeight;
            const depth = this.seglib_config.depth;
            var seglibCallStartTime = performance.now();
            //console.log(new Date().getMilliseconds(), "seglib.scheduling...");
            try {
                var scheduled = this.mce.NextFrameAsync(
                    { data: this.imageBuffer, width: width, height: height, channels: depth, depth: SeglibModule.DepthType.uint8 },
                    { data: this.maskBuffer, width: width, height: height, channels: 1, depth: SeglibModule.DepthType.uint8 },
                    { data: this.maskBuffer, width: width, height: height, channels: 1, depth: SeglibModule.DepthType.uint8 }
                );
                if (!scheduled) {
                    console.warn(`Seglib async call failed. ${scheduled}.`);
                }

                /*while(true)
                {
                    var status = this.mce.WaitForAsyncResultUpTo(1);
                    console.log("wait status", status);

                }*/

                await this.waitAsync(this.mce, 1);
                var result = this.mce.GetAsyncResult();
            }
            catch (err) {
                console.error(`Seglib call failed with exception. ${err}`)
            }

            this.updateMappedOutputBufferIfNeeded();
            var seglibCallStopTime = performance.now();
            //console.log('Seglib async result:', result, `, duration: ${seglibCallStopTime - seglibCallStartTime} [ms]`);
        }
        return this.mappedOutputBuffer;
    }

    async runUsingDataArray(dataArray) {
        //var time_R2 = performance.now();
        this.prepareBuffers(dataArray);
        var res = undefined;
        if (this.seglib_config.async_call) {
            res = await this.callSeglib();
        }
        else {
            res = await this.callSeglibSync();
        }
        //var time_R3 = performance.now();
        //this.timer?.push(time_R3 - time_R2);
        //console.log(`Seglib usage: ${time_R3 - time_R2} ms`);
        return res;
    }

    async load() {
        this.inputWidth = this.seglib_config.input_width;
        this.inputHeight = this.seglib_config.input_height;

        if (MLModelSeglib.scriptLoaded != true) {
            Segmenter.LoadScriptSource("./seglibweb.js");
            MLModelSeglib.scriptLoaded = true;
        }
    }

    cleanup() {
        // Not used in the app, not tested.
        this.mce.delete();
        SeglibModule._free(this.imageBuffer);
        SeglibModule._free(this.maskBuffer);
        this.seglibInitialized = false;
    }
}
// End seglib.js

// This is from segmenter.js
class Segmenter {
    constructor(inputImageDepth) {
        this.processingFrame = false;
        this.lastModelTime = 0;
        this.maskCutoff = 0.4;
        this.inputImageDepth = inputImageDepth;

        this.loadSegmentationLibrary(Segmenter.DefaultSeglib());
    }

    loadSegmentationLibrary(seglib) {
        this.render = () => { };
        this.processingFrame = false;

        if (seglib == "seglib") {
            this.setupSeglib();
            this.setupSeglibGreenEstimation();
        }
        else {
            this.setupOnnx();
        }

        this.seglib = seglib;
        postMessage(["SegmentationMode", this.seglib]);
    }

    /*
     * ONNX (maybe keep for now?)
     */
    setupOnnx() {
        this.maskWidth = 160;
        this.maskHeight = 96;
        this.maskDepth = 4;

        //var params = {
        //    name: `../assets/models/segnet_u256--21-10-2021_nhwc.onnx`,
        //    width: 256, height: 144, depth: 3, count: 1,
        //    alphaIsFloat: false,
        //    makeDimensions:function() {
        //      return [this.count, this.height, this.width, this.depth]
        //    }
        //}
        var params = {
            name: `../assets/models/Tune_SegnetSlimBCEWLDice160x96V6a_wd3e-3_alldata_2023_09_20_nhwc_fix.onnx`,
            width: this.maskWidth,
            height: this.maskHeight,
            depth: this.inputImageDepth,
            count: 1,
            alphaIsFloat: false,
            makeDimensions: function () {
                return [this.count, this.height, this.width, this.depth]
            }
        }

        if (params == null) {
            return;
        }

        this.model = null;

        var model = new MLModelONNX(params);
        model.load().then(() => {
            this.model = model;
            this.render = this.onnxRender;
            postMessage(["SegmentationReady", this.seglib]);
        }).catch(err => {
            console.error("Error loading onnx: ", err)
        })
    }

    async onnxRender(dataArray, timestamp) {
        var reqTime = Date.now();

        if (this.processingFrame == true) {
            return null;
        }

        var model = this.model;
        if (model == null) {
            return null;
        }

        this.processingFrame = true;

        try {
            var data = await model.runUsingDataArray(dataArray);
            var newTime = Date.now();
            const delta = newTime - this.lastModelTime;
            this.lastModelTime = newTime;
            //console.log(`segmenter time: ${delta} ${newTime - reqTime} ms`);

            var outputFloats = data;
            var outputLength = outputFloats.length;

            // Convert output back to bytes, as WebGL
            // doesn't like gl.FLOAT + gl.ALPHA
            var outputBytes = this.outputBytes;
            if (outputBytes == null || outputBytes.length != outputLength) {
                outputBytes = new Uint8Array(outputLength);
                this.outputBytes = outputBytes;
            }

            for (var idx = 0; idx < outputLength; idx += 1) {
                outputBytes[idx] = outputFloats[idx] * 255;
            }

            return outputBytes;
        }
        catch (err) {
            console.error("onnx threw: ", err);
            throw err;
        }
        finally {
            this.processingFrame = false;
        }
    }

    /*
     * Seglib
     */
    setupSeglib() {
        // Should be coming from config json
        this.maskWidth = 320;
        this.maskHeight = 180;
        this.maskDepth = 4;

        //const seglib_json_config_path = "./web_seglib_auto.json";
        const seglib_json_config_path = "./web_seglib_low.json";
        // const seglib_json_config_path = "./web_seglib_middle.json";
        // const seglib_json_config_path = "./web_seglib_high.json";

        console.info("Using Seglib segmentation");
        if (typeof this.seglibModel === "undefined") {
            var seglib_config = {
                json_config_path: `${seglib_json_config_path}`,
                models_root_dir: '../assets/models',
                input_width: this.maskWidth,
                input_height: this.maskHeight,
                depth: this.inputImageDepth,
                async_call: false
            };
            var model = new MLModelSeglib(seglib_config);
            model.load().then(() => {
                this.model = model;
                this.render = this.seglibRender;
                this.seglibModel = model;
                this.seglibPreprocess = null;
                onSeglibWasmLoaded.push(function() {
                    // prepare engine as soon as wasm is ready
                    model.ensureMaskCalcEngineReady();
                });
                postMessage(["SegmentationReady", this.seglib]);
            }).catch(err => {
                console.error("Error loading seglib: ", err)
            });
        }
        else {
            this.model = this.seglibModel;
            this.render = this.seglibRender;
            this.preprocess = null;
        }
        this.lastModelScheduledTime = 0;
    }
    /*
     * Create and load a separate Seglib engine, configured to work on green screen.
     * It is used to estimate green screen parameters when fed input frames.
     */
    setupSeglibGreenEstimation() {
        let config_name = "web_seglib_greenscreen.json"
        console.info("Loading Seglib green segmentation");
        if (typeof this.greenScreenEstimationModel === "undefined") {
            let params = {
                json_config_path: `./${config_name}`,
                models_root_dir: "",
                input_width: this.maskWidth,
                input_height: this.maskHeight,
                depth: this.inputImageDepth,
                asyncCall: false
            }
            let greenScreenEstimationModel = new MLModelSeglib(params);
            greenScreenEstimationModel.modelSelection = null;
            greenScreenEstimationModel.load().then(() => {
                this.greenScreenEstimationModel = greenScreenEstimationModel;

                onSeglibWasmLoaded.push(function() {
                    // prepare green engine as soon as wasm is ready
                    greenScreenEstimationModel.ensureMaskCalcEngineReady();
                });
                postMessage(["GreenReady", this.seglib]);
            }).catch(err => {
                console.error("Error loading green seglib: ", err)
            });
        }
    }
    async runModel(model, dataArray, timestamp)
    {
        if (this.processingFrame == true) {
            return null;
        }

        if (model == null || seglibWasmLoaded !== true) {
            return null;
        }

        if (timestamp - this.lastModelScheduledTime < 20) {
            //console.log("  Too fast segmentation render call ", timestamp - this.lastModelScheduledTime)
            return null;
        }

        this.processingFrame = true;
        this.lastModelScheduledTime = timestamp;

        try {
            var outputByteArray = await model.runUsingDataArray(dataArray);
            var outputLength = outputByteArray.length;

            var outputBytes = this.outputBytes;
            if (outputBytes == null || outputBytes.length != outputLength) {
                outputBytes = new Uint8Array(outputLength);
                this.outputBytes = outputBytes;
            }

            for (var idx = 0; idx < outputLength; idx += 1) {
                outputBytes[idx] = outputByteArray[idx];
            }

            return outputBytes;
        }
        catch (err) {
            console.error("runUsingDataArray threw", err);
            throw err;
        }
        finally {
            this.processingFrame = false;
        }
    }
    async seglibRender(dataArray, timestamp) {
        return this.runModel(this.model, dataArray, timestamp)
    }
    async seglibGreenRender(dataArray, timestamp) {
        return this.runModel(this.greenScreenEstimationModel, dataArray, timestamp)
    }
    get maskWidth() {
        return this._maskWidth;
    }
    set maskWidth(width) {
        this._maskWidth = width;
    }
    get maskHeight() {
        return this._maskHeight;
    }
    set maskHeight(height) {
        this._maskHeight = height;
    }
    get maskCutoff() {
        return this._maskCutoff;
    }
    set maskCutoff(cutoff) {
        this._maskCutoff = cutoff;
    }
    get maskDepth() {
        return this._maskDepth;
    }
    set maskDepth(depth) {
        this._maskDepth = depth;
    }
}

Segmenter.LoadScriptSource = function(source) {
    return new Promise((resolve, reject) => {
        if (typeof self.importScripts === 'function') {
            try {
                self.importScripts(source);
            }
            catch (err) {
                console.error(`Script failed to load `, source);
            }
        }
    });
}

Segmenter.DefaultSeglib = function () {
    var recommendedSeglib = "seglib";
    // this was for Safari which currently does not use the worker
    //var vendor = navigator.vendor;
    //if (vendor != null) {
    //    if (vendor.startsWith("Apple") == true) {
    //        recommendedSeglib = "onnx";
    //    }
    //}
    return recommendedSeglib;
}
// End segmenter.js

// Finally the worker code

var segmentation;
let segmentationActive = false;

onmessage = (msg) => {
    let msgType = msg.data[0];
    let data = msg.data[1];
    let isFirstEstimation = msg.data[3];
    let currentCropInsets = msg.data[4];
    switch (msgType) {
        case "Load":
            if (segmentationActive === false) {
                segmentation = new Segmenter(data);
                segmentationActive = true;
            }
            postMessage(["MaskDepth", segmentation.maskDepth]);
            postMessage(["MaskWidth", segmentation.maskWidth]);
            postMessage(["MaskHeight", segmentation.maskHeight]);
            postMessage(["MaskCutoff", segmentation.maskCutoff]);

            break;
        case "GetGreenScreenParams":
            postMessage(["GreenScreenParams", segmentation.model.mce.GreenScreenGetConfig()]);
            break;
        case "RequestGreenScreenParams":
            imageDataSource = data;
            if (segmentation.greenScreenEstimationModel.mce !== null) {
                // In case we have initial estimation we should reset all
                // tracking parameters in seglib.
                if (isFirstEstimation === true) {
                    segmentation.greenScreenEstimationModel.mce.GreenScreenSessionStartMarker();
                }
                // Inform seglib about current presenter crop parameters.
                if (currentCropInsets) {
                    segmentation.greenScreenEstimationModel.mce.GreenScreenSessionSetCrop(currentCropInsets.left, currentCropInsets.top, currentCropInsets.right, currentCropInsets.bottom);
                }
            }
            segmentation.seglibGreenRender(imageDataSource, msg.data[2]).then((outputData) => {
                if (outputData != null) {
                    const params = segmentation.greenScreenEstimationModel.mce.GreenScreenGetConfig();
                    postMessage(["GreenScreenParamsReady", params]);
                }
                else {
                    postMessage(["GreenScreenParamsFailed"]);
                }
            }).catch(err => {
                postMessage(["GreenScreenParamsFailed"]);
                console.error("Error in estimation: ", err);
            })
            break;
        case "Closing":
            segmentationActive = false;
            break;
        case "SegmentationMode":
            // Change the segmentation mode being used
            break;
        case "NewFrame":
            //const start = performance.now();
            //console.log('   input image data rec ', msg.data[2]);
            segmentation.render(data, msg.data[2]).then((outputData) => {
                if (outputData != null) {
                    const view = new Uint8Array(outputData);
                    postMessage(["Mask", view]);
                }
                else {
                    postMessage(["NoMask"]);
                }
            }).catch(err => {
                postMessage(["NoMask"]);
                console.error("Error in inference: ", err);
            })
            break;
    }
};
