//
//  workerWhisper.js
//
//  Copyright 2025 mmhmm, inc. All rights reserved.
//
// Web Worker (module) for Whisper transcription using Transformers.js
// Runs transcription off the main thread to prevent video lag
//
// Message protocol:
// IN:  ["Load"]              -> Load Transformers.js and Whisper model
// IN:  ["Transcribe", audio] -> Process Float32Array audio
// IN:  ["Dispose"]           -> Clean up resources
// OUT: ["LoadProgress", {progress, status}]
// OUT: ["LoadComplete"]
// OUT: ["TranscriptionResult", text]
// OUT: ["TranscriptionError", message]

let pipeline = null;
let env = null;
let transcriber = null;
let isLoading = false;
let isLoaded = false;

/**
 * Initialize Transformers.js and load the Whisper model
 */
async function loadModel() {
    if (isLoaded) {
        postMessage(["LoadComplete"]);
        return;
    }

    if (isLoading) {
        return;
    }

    isLoading = true;

    try {
        postMessage(["LoadProgress", { progress: 0, status: "Loading Transformers.js..." }]);

        // Dynamic import of Transformers.js (works in module workers)
        const transformers = await import(
            "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.2"
        );

        pipeline = transformers.pipeline;
        env = transformers.env;

        // Configure environment for browser/worker
        env.allowLocalModels = false;
        env.useBrowserCache = true;

        postMessage(["LoadProgress", { progress: 10, status: "Downloading Whisper model..." }]);

        // Create the transcription pipeline
        // Using whisper-tiny for fast performance (~40MB download, cached in IndexedDB)
        transcriber = await pipeline(
            "automatic-speech-recognition",
            "Xenova/whisper-tiny.en",
            {
                progress_callback: (progress) => {
                    if (progress.status === "progress") {
                        // Scale download progress from 10% to 90%
                        const pct = 10 + Math.round((progress.progress || 0) * 0.8);
                        postMessage(["LoadProgress", {
                            progress: pct,
                            status: `Downloading model: ${Math.round(progress.progress || 0)}%`
                        }]);
                    }
                }
            }
        );

        isLoaded = true;
        isLoading = false;

        postMessage(["LoadProgress", { progress: 100, status: "Model loaded" }]);
        postMessage(["LoadComplete"]);

        console.log("Whisper worker: Model loaded successfully");

    } catch (err) {
        isLoading = false;
        console.error("Whisper worker: Error loading model:", err);
        postMessage(["TranscriptionError", err.message]);
    }
}

/**
 * Transcribe audio data using Whisper
 * @param {Float32Array} audioData - Audio samples at 16kHz
 */
async function transcribe(audioData) {
    if (!isLoaded || !transcriber) {
        postMessage(["TranscriptionError", "Model not loaded"]);
        return;
    }

    try {
        // Transformers.js expects audio at 16kHz sample rate
        // Note: whisper-tiny.en is English-only, so we don't specify language/task
        const result = await transcriber(audioData, {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: false
        });

        const text = result.text?.trim() || "";
        postMessage(["TranscriptionResult", text]);

    } catch (err) {
        console.error("Whisper worker: Transcription error:", err);
        postMessage(["TranscriptionError", err.message]);
    }
}

/**
 * Clean up resources
 */
function dispose() {
    transcriber = null;
    pipeline = null;
    isLoaded = false;
    isLoading = false;
    console.log("Whisper worker: Disposed");
}

// Message handler
onmessage = (event) => {
    const [msgType, data] = event.data;

    switch (msgType) {
        case "Load":
            loadModel();
            break;

        case "Transcribe":
            transcribe(data);
            break;

        case "Dispose":
            dispose();
            break;

        default:
            console.warn("Whisper worker: Unknown message type:", msgType);
    }
};
