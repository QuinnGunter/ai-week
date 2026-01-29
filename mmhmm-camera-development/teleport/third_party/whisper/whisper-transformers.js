//
//  third_party/whisper/whisper-transformers.js
//  mmhmm
//
//  Transformers.js-based Whisper implementation.
//  Loads the Whisper model from Hugging Face and runs entirely in the browser.
//

/**
 * Transformers.js Whisper wrapper.
 * Provides speech-to-text using the Xenova/whisper-tiny.en model.
 */
class WhisperTransformers {
    constructor() {
        this.pipeline = null;
        this.transcriber = null;
        this.isLoaded = false;
        this.isLoading = false;
        this.loadError = null;
        this.onProgress = null;
    }

    /**
     * Load the Transformers.js library and Whisper model.
     * @param {Function} onProgress - Progress callback (0-100)
     * @returns {Promise<boolean>}
     */
    async load(onProgress = null) {
        if (this.isLoaded) {
            return true;
        }

        if (this.isLoading) {
            // Wait for existing load to complete
            while (this.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.isLoaded;
        }

        this.isLoading = true;
        this.onProgress = onProgress;

        try {
            console.log("Transformers.js: Loading library from CDN...");

            if (onProgress) {
                onProgress(5, "Loading Transformers.js library...");
            }

            // Dynamically import Transformers.js from CDN
            const { pipeline, env } = await import(
                "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.2"
            );

            // Configure environment for browser
            env.allowLocalModels = false;
            env.useBrowserCache = true;

            console.log("Transformers.js: Library loaded, initializing Whisper model...");

            if (onProgress) {
                onProgress(10, "Downloading Whisper model...");
            }

            // Create the automatic-speech-recognition pipeline
            // Using whisper-tiny.en for fast performance (~40MB model)
            this.transcriber = await pipeline(
                "automatic-speech-recognition",
                "Xenova/whisper-tiny.en",
                {
                    progress_callback: (progress) => {
                        if (onProgress && progress.status === "progress") {
                            // Scale download progress from 10% to 90%
                            const percent = 10 + Math.round((progress.progress || 0) * 0.8);
                            onProgress(percent, `Downloading model: ${Math.round(progress.progress || 0)}%`);
                        }
                    }
                }
            );

            console.log("Transformers.js: Whisper model loaded successfully");

            if (onProgress) {
                onProgress(100, "Model loaded");
            }

            this.isLoaded = true;
            this.isLoading = false;
            return true;

        } catch (err) {
            console.error("Transformers.js: Failed to load:", err);
            this.loadError = err;
            this.isLoading = false;

            if (onProgress) {
                onProgress(-1, `Error: ${err.message}`);
            }

            throw err;
        }
    }

    /**
     * Transcribe audio data to text.
     * @param {Float32Array} audioData - Audio samples at 16kHz mono
     * @returns {Promise<string>} - Transcribed text
     */
    async transcribe(audioData) {
        if (!this.isLoaded || !this.transcriber) {
            throw new Error("Whisper model not loaded. Call load() first.");
        }

        if (!audioData || audioData.length === 0) {
            return "";
        }

        try {
            // Transformers.js expects audio as Float32Array at 16kHz
            // The pipeline handles the audio format conversion internally
            // Note: whisper-tiny.en is English-only, so we don't specify language/task
            const result = await this.transcriber(audioData, {
                chunk_length_s: 30,
                stride_length_s: 5,
                return_timestamps: false
            });

            const text = result.text || "";
            console.log("Transformers.js transcription:", text);
            return text.trim();

        } catch (err) {
            console.error("Transformers.js transcription error:", err);
            return "";
        }
    }

    /**
     * Cleanup resources.
     */
    dispose() {
        this.transcriber = null;
        this.isLoaded = false;
        console.log("Transformers.js: Resources disposed");
    }
}

// Export singleton instance
window.WhisperTransformers = WhisperTransformers;
