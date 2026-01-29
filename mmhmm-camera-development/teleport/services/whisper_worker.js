//
//  services/whisper_worker.js
//  mmhmm
//
//  Manager class for Whisper Web Worker communication.
//  Provides a Promise-based API for main thread to interact with the worker.
//  Supports queue-based processing for multiple audio sources (mic + system audio).
//

/**
 * WhisperWorker manages communication with the Whisper transcription worker.
 * Moves Whisper transcription off the main thread to prevent video lag.
 * Supports queue-based processing for multiple audio sources with speaker labels.
 */
class WhisperWorker {
    #worker = null;
    #isLoaded = false;
    #isLoading = false;
    #pendingTranscription = null;
    #loadPromise = null;
    #onProgress = null;

    // Queue for handling multiple audio sources
    #transcriptionQueue = [];
    #isProcessingQueue = false;

    /**
     * Check if the worker is loaded and ready
     */
    get isLoaded() {
        return this.#isLoaded;
    }

    /**
     * Check if the worker is currently loading
     */
    get isLoading() {
        return this.#isLoading;
    }

    /**
     * Load the Whisper model in the worker
     * @param {Function} onProgress - Progress callback (progress: number, status: string)
     * @returns {Promise<void>}
     */
    async load(onProgress = null) {
        if (this.#isLoaded) {
            return;
        }

        // If already loading, return existing promise
        if (this.#loadPromise) {
            return this.#loadPromise;
        }

        this.#onProgress = onProgress;
        this.#isLoading = true;

        this.#loadPromise = new Promise((resolve, reject) => {
            try {
                // Create a module worker (required for ES module imports in the worker)
                this.#worker = new Worker("./workers/workerWhisper.js", { type: "module" });

                this.#worker.onmessage = (event) => {
                    this.#handleMessage(event, resolve, reject);
                };

                this.#worker.onerror = (error) => {
                    console.error("Whisper worker error:", error);
                    this.#isLoading = false;
                    this.#loadPromise = null;
                    reject(new Error(`Worker error: ${error.message}`));
                };

                // Send load command
                this.#worker.postMessage(["Load"]);

            } catch (err) {
                this.#isLoading = false;
                this.#loadPromise = null;
                reject(err);
            }
        });

        return this.#loadPromise;
    }

    /**
     * Handle messages from the worker
     */
    #handleMessage(event, loadResolve, loadReject) {
        const [msgType, data] = event.data;

        switch (msgType) {
            case "LoadProgress":
                if (this.#onProgress) {
                    this.#onProgress(data.progress, data.status);
                }
                break;

            case "LoadComplete":
                this.#isLoaded = true;
                this.#isLoading = false;
                if (loadResolve) {
                    loadResolve();
                }
                break;

            case "TranscriptionResult":
                if (this.#pendingTranscription) {
                    this.#pendingTranscription.resolve(data);
                    this.#pendingTranscription = null;
                }
                break;

            case "TranscriptionError":
                if (this.#pendingTranscription) {
                    this.#pendingTranscription.reject(new Error(data));
                    this.#pendingTranscription = null;
                } else if (loadReject && this.#isLoading) {
                    this.#isLoading = false;
                    this.#loadPromise = null;
                    loadReject(new Error(data));
                }
                break;

            default:
                console.warn("WhisperWorker: Unknown message type:", msgType);
        }
    }

    /**
     * Transcribe audio data with optional speaker label.
     * Uses queue-based processing to handle multiple audio sources.
     * @param {Float32Array} audioData - Audio samples at 16kHz
     * @param {string} source - Speaker source identifier ("user" or "other")
     * @returns {Promise<Object>} - {text: string, source: string}
     */
    async transcribe(audioData, source = "user") {
        if (!this.#isLoaded || !this.#worker) {
            throw new Error("Whisper worker not loaded");
        }

        return new Promise((resolve, reject) => {
            // Add to queue with source label
            this.#transcriptionQueue.push({
                audioData,
                source,
                resolve,
                reject
            });

            // Start processing if not already running
            this.#processQueue();
        });
    }

    /**
     * Process the transcription queue one item at a time.
     * This prevents Whisper from processing multiple audio streams simultaneously.
     */
    async #processQueue() {
        if (this.#isProcessingQueue || this.#transcriptionQueue.length === 0) {
            return;
        }

        this.#isProcessingQueue = true;

        while (this.#transcriptionQueue.length > 0) {
            const item = this.#transcriptionQueue.shift();

            try {
                const text = await this.#transcribeSingle(item.audioData);
                item.resolve({ text, source: item.source });
            } catch (err) {
                item.reject(err);
            }
        }

        this.#isProcessingQueue = false;
    }

    /**
     * Internal method to transcribe a single audio buffer
     * @param {Float32Array} audioData
     * @returns {Promise<string>}
     */
    async #transcribeSingle(audioData) {
        return new Promise((resolve, reject) => {
            // Cancel any pending transcription (shouldn't happen with queue)
            if (this.#pendingTranscription) {
                this.#pendingTranscription.reject(new Error("Cancelled"));
                this.#pendingTranscription = null;
            }

            this.#pendingTranscription = { resolve, reject };

            // Transfer the audio data to the worker (zero-copy)
            // Note: This transfers ownership of the ArrayBuffer
            const buffer = audioData.buffer.slice(0);
            const transferableAudio = new Float32Array(buffer);

            this.#worker.postMessage(
                ["Transcribe", transferableAudio],
                [buffer]
            );
        });
    }

    /**
     * Preload the model during idle time
     * Uses requestIdleCallback to avoid blocking user interactions
     * @param {number} timeout - Maximum wait time in ms (default: 10000)
     * @returns {Promise<void>}
     */
    preloadWhenIdle(timeout = 10000) {
        if (this.#isLoaded || this.#isLoading) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const callback = () => {
                this.load().then(resolve).catch(() => resolve());
            };

            if (typeof requestIdleCallback === "function") {
                requestIdleCallback(callback, { timeout });
            } else {
                // Fallback for browsers without requestIdleCallback
                setTimeout(callback, 100);
            }
        });
    }

    /**
     * Dispose of the worker and clean up resources
     */
    dispose() {
        if (this.#worker) {
            this.#worker.postMessage(["Dispose"]);
            this.#worker.terminate();
            this.#worker = null;
        }

        if (this.#pendingTranscription) {
            this.#pendingTranscription.reject(new Error("Worker disposed"));
            this.#pendingTranscription = null;
        }

        this.#isLoaded = false;
        this.#isLoading = false;
        this.#loadPromise = null;
        this.#onProgress = null;
    }
}
