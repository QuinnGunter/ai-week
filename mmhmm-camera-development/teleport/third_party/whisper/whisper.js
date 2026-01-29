//
//  third_party/whisper/whisper.js
//  mmhmm
//
//  Whisper speech recognition module wrapper.
//  Uses Transformers.js (Hugging Face) for fully local/offline speech recognition.
//
//  Previous implementation used whisper.cpp WASM, but it had threading issues
//  (SharedArrayBuffer/Atomics) that caused abort errors in the CEF environment.
//
//  Transformers.js runs ML models directly in the browser using ONNX Runtime Web.
//  No server needed, fully offline after initial model download (~40MB cached in IndexedDB).
//

// Track initialization state
let whisperTransformersInstance = null;
let whisperInitPromise = null;

/**
 * Load the Transformers.js-based Whisper implementation.
 * @returns {Promise<WhisperTransformers>}
 */
async function loadWhisperTransformers() {
    if (whisperTransformersInstance) {
        return whisperTransformersInstance;
    }

    if (whisperInitPromise) {
        return whisperInitPromise;
    }

    whisperInitPromise = (async () => {
        // Load the whisper-transformers.js helper if not already loaded
        if (typeof WhisperTransformers === "undefined") {
            await new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "third_party/whisper/whisper-transformers.js";
                script.async = true;
                script.onload = resolve;
                script.onerror = () => reject(new Error("Failed to load whisper-transformers.js"));
                document.head.appendChild(script);
            });
        }

        whisperTransformersInstance = new WhisperTransformers();
        return whisperTransformersInstance;
    })();

    return whisperInitPromise;
}

/**
 * Whisper module wrapper that provides the expected API for SpeechService.
 * Uses Transformers.js for fully local/offline speech recognition.
 * @returns {Promise<Object>} The Whisper module instance
 */
async function WhisperModule() {
    console.log("WhisperModule: Initializing with Transformers.js implementation");

    const whisper = await loadWhisperTransformers();
    let modelLoaded = false;
    let instanceId = Date.now(); // Simple instance tracking

    return {
        /**
         * Initialize the Whisper model.
         * Note: modelData parameter is ignored - Transformers.js downloads its own model.
         * @param {Uint8Array} modelData - Ignored (kept for API compatibility)
         * @returns {number} Instance handle
         */
        init: async function(modelData) {
            // modelData is ignored - Transformers.js downloads the model from HuggingFace
            // We keep the parameter for API compatibility with SpeechService
            console.log("WhisperModule: init() called (Transformers.js will download model automatically)");

            try {
                // Load the model with progress callback
                await whisper.load((progress, status) => {
                    console.log(`WhisperModule: ${status} (${progress}%)`);
                    // Progress is reported via NotificationCenter in SpeechService
                });

                modelLoaded = true;
                console.log("WhisperModule: Model initialization complete");
                return instanceId;

            } catch (err) {
                console.error("WhisperModule init error:", err);
                throw err;
            }
        },

        /**
         * Transcribe audio data.
         * @param {number} instance - The Whisper instance handle (ignored, kept for compatibility)
         * @param {Float32Array} audioData - 16kHz mono audio samples
         * @returns {Promise<string>} Transcribed text
         */
        transcribe: async function(instance, audioData) {
            if (!modelLoaded || !whisper.isLoaded) {
                throw new Error("Whisper not initialized");
            }

            if (!audioData || audioData.length === 0) {
                return "";
            }

            console.log(`WhisperModule: Transcribing ${audioData.length} audio samples`);

            try {
                const result = await whisper.transcribe(audioData);
                if (result) {
                    console.log("WhisperModule: Transcription result:", result);
                }
                return result || "";

            } catch (err) {
                console.error("WhisperModule transcribe error:", err);
                return "";
            }
        },

        /**
         * Free the Whisper instance resources.
         * @param {number} instance - The instance handle to free
         */
        free: function(instance) {
            console.log("WhisperModule: Freeing instance", instance);
            modelLoaded = false;
            // Note: We don't fully dispose the Transformers.js instance
            // as it may be reused. The model stays cached in IndexedDB.
        },

        /**
         * Check if model is loaded.
         * @returns {boolean}
         */
        isModelLoaded: function() {
            return modelLoaded && whisper.isLoaded;
        }
    };
}

// Make WhisperModule available globally
window.WhisperModule = WhisperModule;

/**
 * Alternative implementation using Web Speech API for browsers that support it.
 * This can be used as a fallback when Whisper is not available.
 * Note: Web Speech API requires internet connection (sends audio to Google servers).
 */
class WebSpeechFallback {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onResult = null;
        this.onError = null;

        this.#initialize();
    }

    #initialize() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn("Web Speech API not supported in this browser");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-US";

        this.recognition.onresult = (event) => {
            const results = event.results;
            const lastResult = results[results.length - 1];

            if (lastResult.isFinal) {
                const transcript = lastResult[0].transcript;
                if (this.onResult) {
                    this.onResult(transcript);
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error("Web Speech API error:", event.error);
            if (this.onError) {
                this.onError(event.error);
            }
        };

        this.recognition.onend = () => {
            // Restart if we're supposed to be listening
            if (this.isListening && this.recognition) {
                try {
                    this.recognition.start();
                } catch (e) {
                    // Ignore - might already be running
                }
            }
        };
    }

    get isSupported() {
        return this.recognition !== null;
    }

    start() {
        if (!this.recognition) {
            console.warn("Web Speech API not available");
            return false;
        }

        try {
            this.recognition.start();
            this.isListening = true;
            return true;
        } catch (e) {
            console.error("Error starting Web Speech recognition:", e);
            return false;
        }
    }

    stop() {
        this.isListening = false;
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Ignore
            }
        }
    }
}

// Export fallback for optional use
window.WebSpeechFallback = WebSpeechFallback;
