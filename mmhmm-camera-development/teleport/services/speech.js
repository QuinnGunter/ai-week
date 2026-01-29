//
//  services/speech.js
//  mmhmm
//
//  Speech recognition service using Transformers.js (Whisper)
//  Runs fully local/offline after initial model download.
//

/**
 * Speech recognition service using Transformers.js (Whisper).
 * Captures audio from the microphone and transcribes it locally.
 * Fully offline after initial model download (~40MB cached in IndexedDB).
 */
class SpeechService extends ObservableObject {

    static Notifications = Object.freeze({
        TranscriptUpdated: "SpeechService.TranscriptUpdated",
        PartialTranscript: "SpeechService.PartialTranscript",  // NEW: For faster reaction suggestions
        KeywordDetected: "SpeechService.KeywordDetected",
        ModelLoadProgress: "SpeechService.ModelLoadProgress",
        Error: "SpeechService.Error"
    });

    static ModelSize = Object.freeze({
        Tiny: "tiny",
        Base: "base"
    });

    static RecognitionMode = Object.freeze({
        WebSpeech: "webSpeech",
        Whisper: "whisper"
    });

    // Singleton instance
    static shared = null;

    // Private fields
    #isModelLoaded = false;
    #isListening = false;
    #currentTranscript = "";
    #modelSize = SpeechService.ModelSize.Tiny;
    #recognitionMode = SpeechService.RecognitionMode.Whisper; // Default to Whisper (Web Speech API requires internet)

    #audioContext = null;
    #audioWorklet = null;
    #mediaStream = null;
    #sourceNode = null;
    #whisperWorker = null;
    #webSpeechFallback = null;

    #audioBuffer = [];
    #processingInterval = null;
    #sampleRate = 16000; // Whisper expects 16kHz
    #bufferDurationMs = 1000; // Process every 1 second (reduced from 3s for faster reactions)
    #minAudioSamples = 16000 * 0.5; // Minimum 0.5 seconds of audio before processing (reduced from 2s)
    #selectedMicrophoneId = null;

    // VAD (Voice Activity Detection) fields for faster end-of-speech detection
    #vadSilenceThreshold = 0.015;  // RMS threshold for silence
    #vadSilenceDurationMs = 300;   // How long silence = end of speech
    #vadLastSpeechTime = 0;
    #vadIsSpeaking = false;
    #vadPendingBuffer = [];        // Buffer accumulating during speech
    #partialTranscript = "";       // Current partial transcript

    constructor() {
        super();

        // Disable automatic notification for properties we'll manually control
        this.automaticallyNotifiesObserversOfIsModelLoaded = false;
        this.automaticallyNotifiesObserversOfIsListening = false;
        this.automaticallyNotifiesObserversOfCurrentTranscript = false;

        // Initialize Web Speech API fallback
        if (typeof WebSpeechFallback !== "undefined") {
            this.#webSpeechFallback = new WebSpeechFallback();
            this.#webSpeechFallback.onResult = (transcript) => {
                this.currentTranscript = transcript.trim().toLowerCase();
            };
            this.#webSpeechFallback.onError = (error) => {
                console.error("Web Speech API error:", error);
            };
        }
    }

    get recognitionMode() {
        return this.#recognitionMode;
    }

    set recognitionMode(value) {
        this.#recognitionMode = value;
    }

    // Observable properties
    get isModelLoaded() {
        return this.#isModelLoaded;
    }

    set isModelLoaded(value) {
        const previous = this.#isModelLoaded;
        this.#isModelLoaded = value;
        this.didChangeValueForProperty(value, "isModelLoaded", previous);
    }

    get isListening() {
        return this.#isListening;
    }

    set isListening(value) {
        const previous = this.#isListening;
        this.#isListening = value;
        this.didChangeValueForProperty(value, "isListening", previous);
    }

    get currentTranscript() {
        return this.#currentTranscript;
    }

    set currentTranscript(value) {
        const previous = this.#currentTranscript;
        this.#currentTranscript = value;
        this.didChangeValueForProperty(value, "currentTranscript", previous);

        if (value && value.trim()) {
            // Add to conversation buffer with "user" speaker label
            if (typeof ConversationBuffer !== "undefined" && ConversationBuffer.shared) {
                ConversationBuffer.shared.addEntry("user", value);
            }

            NotificationCenter.default.postNotification(
                SpeechService.Notifications.TranscriptUpdated,
                this,
                {
                    transcript: value,
                    speaker: "user",
                    timestamp: Date.now()
                }
            );
        }
    }

    get modelSize() {
        return this.#modelSize;
    }

    get selectedMicrophoneId() {
        return this.#selectedMicrophoneId;
    }

    set selectedMicrophoneId(value) {
        this.#selectedMicrophoneId = value;
        // If currently listening, restart with new microphone
        if (this.#isListening) {
            this.stopListening();
            this.startListening();
        }
    }

    /**
     * Get the Whisper worker instance for shared usage.
     * Used by SystemAudioService to share the same worker for system audio transcription.
     * @returns {WhisperWorker|null}
     */
    getWhisperWorker() {
        return this.#whisperWorker;
    }

    /**
     * Load the speech recognition model
     * @param {string} modelSize - 'tiny' or 'base' (default: 'tiny') - only used for Whisper mode
     * @returns {Promise<boolean>} - true if model loaded successfully
     */
    async loadModel(modelSize = SpeechService.ModelSize.Tiny) {
        if (this.#isModelLoaded && this.#modelSize === modelSize) {
            return true;
        }

        this.#modelSize = modelSize;

        // For Web Speech API mode, no model loading needed
        if (this.#recognitionMode === SpeechService.RecognitionMode.WebSpeech) {
            if (this.#webSpeechFallback && this.#webSpeechFallback.isSupported) {
                NotificationCenter.default.postNotification(
                    SpeechService.Notifications.ModelLoadProgress,
                    this,
                    { progress: 100, status: "Web Speech API ready" }
                );
                this.isModelLoaded = true;
                console.log("Web Speech API ready for speech recognition");
                return true;
            } else {
                console.warn("Web Speech API not supported in this browser");
                NotificationCenter.default.postNotification(
                    SpeechService.Notifications.Error,
                    this,
                    { error: "Web Speech API not supported in this browser" }
                );
                return false;
            }
        }

        // Whisper/Transformers.js mode (via Web Worker for performance)
        try {
            // Check if WhisperWorker is available
            if (typeof WhisperWorker === "undefined") {
                console.warn("WhisperWorker not loaded. Speech recognition unavailable.");
                return false;
            }

            // Create the worker manager
            this.#whisperWorker = new WhisperWorker();

            // Load the model in the worker with progress reporting
            await this.#whisperWorker.load((progress, status) => {
                NotificationCenter.default.postNotification(
                    SpeechService.Notifications.ModelLoadProgress,
                    this,
                    { progress, status }
                );
            });

            this.isModelLoaded = true;
            console.log("Whisper model loaded successfully (Web Worker)");
            return true;

        } catch (err) {
            console.error("Error loading Whisper model:", err);
            NotificationCenter.default.postNotification(
                SpeechService.Notifications.Error,
                this,
                { error: err.message }
            );
            return false;
        }
    }

    /**
     * Start listening and transcribing audio from the microphone
     */
    async startListening() {
        if (this.#isListening) {
            return;
        }

        if (!this.#isModelLoaded) {
            console.warn("Speech recognition not loaded. Call loadModel() first.");
            const loaded = await this.loadModel();
            if (!loaded) {
                return;
            }
        }

        // Use Web Speech API mode
        if (this.#recognitionMode === SpeechService.RecognitionMode.WebSpeech) {
            if (this.#webSpeechFallback && this.#webSpeechFallback.isSupported) {
                const started = this.#webSpeechFallback.start();
                if (started) {
                    this.isListening = true;
                    console.log("Speech recognition started (Web Speech API)");
                } else {
                    NotificationCenter.default.postNotification(
                        SpeechService.Notifications.Error,
                        this,
                        { error: "Failed to start Web Speech API" }
                    );
                }
            }
            return;
        }

        // Whisper/Transformers.js mode
        try {
            // Request microphone access
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: this.#sampleRate,
                }
            };

            // Use selected microphone if specified
            if (this.#selectedMicrophoneId) {
                constraints.audio.deviceId = { exact: this.#selectedMicrophoneId };
            }

            this.#mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Create audio context for processing
            this.#audioContext = new AudioContext({ sampleRate: this.#sampleRate });

            // Create source from microphone
            this.#sourceNode = this.#audioContext.createMediaStreamSource(this.#mediaStream);

            // Create script processor for capturing audio data
            const bufferSize = 4096;
            const scriptProcessor = this.#audioContext.createScriptProcessor(bufferSize, 1, 1);

            scriptProcessor.onaudioprocess = (event) => {
                if (!this.#isListening) return;

                const inputData = event.inputBuffer.getChannelData(0);
                // Copy the data since it will be reused
                const audioData = new Float32Array(inputData);
                this.#audioBuffer.push(audioData);

                // VAD processing for faster end-of-speech detection
                this.#processVAD(audioData);
            };

            this.#sourceNode.connect(scriptProcessor);
            scriptProcessor.connect(this.#audioContext.destination);
            this.#audioWorklet = scriptProcessor;

            // Start processing audio at intervals
            this.#processingInterval = setInterval(() => {
                this.#processAudioBuffer();
            }, this.#bufferDurationMs);

            this.isListening = true;
            console.log("Speech recognition started (Whisper/Transformers.js)");

        } catch (err) {
            console.error("Error starting speech recognition:", err);
            NotificationCenter.default.postNotification(
                SpeechService.Notifications.Error,
                this,
                { error: err.message }
            );
        }
    }

    /**
     * Stop listening and transcribing
     */
    stopListening() {
        if (!this.#isListening) {
            return;
        }

        // Stop Web Speech API if active
        if (this.#recognitionMode === SpeechService.RecognitionMode.WebSpeech && this.#webSpeechFallback) {
            this.#webSpeechFallback.stop();
            this.isListening = false;
            console.log("Speech recognition stopped (Web Speech API)");
            return;
        }

        // Stop Whisper/Transformers.js mode
        // Stop the processing interval
        if (this.#processingInterval) {
            clearInterval(this.#processingInterval);
            this.#processingInterval = null;
        }

        // Disconnect audio nodes
        if (this.#sourceNode) {
            this.#sourceNode.disconnect();
            this.#sourceNode = null;
        }

        if (this.#audioWorklet) {
            this.#audioWorklet.disconnect();
            this.#audioWorklet = null;
        }

        // Stop media tracks
        if (this.#mediaStream) {
            this.#mediaStream.getTracks().forEach(track => track.stop());
            this.#mediaStream = null;
        }

        // Close audio context
        if (this.#audioContext) {
            this.#audioContext.close();
            this.#audioContext = null;
        }

        // Clear audio buffer
        this.#audioBuffer = [];

        this.isListening = false;
        console.log("Speech recognition stopped (Whisper/Transformers.js)");
    }

    /**
     * Toggle listening state
     */
    toggleListening() {
        if (this.#isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    /**
     * Process accumulated audio buffer through Whisper
     */
    async #processAudioBuffer() {
        if (this.#audioBuffer.length === 0) {
            return;
        }

        // Concatenate all audio chunks
        const totalLength = this.#audioBuffer.reduce((sum, arr) => sum + arr.length, 0);

        // Skip if we don't have enough audio yet
        if (totalLength < this.#minAudioSamples) {
            return;
        }

        const combinedAudio = new Float32Array(totalLength);

        let offset = 0;
        for (const chunk of this.#audioBuffer) {
            combinedAudio.set(chunk, offset);
            offset += chunk.length;
        }

        // Clear the buffer
        this.#audioBuffer = [];

        // Skip if audio is too quiet (likely silence)
        const rms = this.#calculateRMS(combinedAudio);
        if (rms < 0.01) {
            return;
        }

        console.log(`[Speech] 📊 Processing ${combinedAudio.length} samples (${(combinedAudio.length / this.#sampleRate).toFixed(1)}s) | RMS: ${rms.toFixed(4)}`);

        try {
            // Transcribe the audio (Transformers.js handles variable length audio)
            console.log(`[Speech] 🔄 Transcribing main buffer...`);
            const transcript = await this.#transcribe(combinedAudio);

            if (transcript && transcript.trim()) {
                console.log(`[Speech] ✅ Main Transcript: "${transcript.trim()}"`);
                this.currentTranscript = transcript.trim().toLowerCase();
            } else {
                console.log(`[Speech] ⚠️ Main transcription returned empty`);
            }
        } catch (err) {
            console.error("[Speech] ❌ Error transcribing audio:", err);
        }
    }

    /**
     * Calculate Root Mean Square of audio to detect silence
     */
    #calculateRMS(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    }

    /**
     * Process audio through VAD (Voice Activity Detection) for faster end-of-speech detection.
     * Triggers immediate transcription when speech ends (silence detected).
     * @param {Float32Array} audioData - Audio samples to analyze
     */
    #processVAD(audioData) {
        const rms = this.#calculateRMS(audioData);
        const now = Date.now();

        // Log audio levels periodically (every ~500ms worth of samples)
        if (this.#vadPendingBuffer.length % 8 === 0) {
            console.log(`[Speech] RMS: ${rms.toFixed(4)} | Speaking: ${this.#vadIsSpeaking} | Buffer: ${this.#vadPendingBuffer.length} chunks`);
        }

        if (rms > this.#vadSilenceThreshold) {
            // Speech detected
            if (!this.#vadIsSpeaking) {
                console.log(`[Speech] 🎤 Speech started (RMS: ${rms.toFixed(4)})`);
            }
            this.#vadLastSpeechTime = now;
            this.#vadIsSpeaking = true;
            this.#vadPendingBuffer.push(audioData);
        } else if (this.#vadIsSpeaking) {
            // Check if we've been silent long enough to trigger end-of-speech
            const silentDuration = now - this.#vadLastSpeechTime;

            if (silentDuration > this.#vadSilenceDurationMs && this.#vadPendingBuffer.length > 0) {
                // End of speech detected - trigger immediate transcription
                console.log(`[Speech] 🔇 Speech ended after ${silentDuration}ms silence`);
                this.#vadIsSpeaking = false;
                this.#processVADBuffer();
            } else {
                // Still potentially speaking, accumulate
                this.#vadPendingBuffer.push(audioData);
            }
        }
    }

    /**
     * Process the VAD buffer immediately when end-of-speech is detected.
     * Emits partial transcript for faster reaction matching.
     */
    async #processVADBuffer() {
        if (this.#vadPendingBuffer.length === 0) {
            return;
        }

        // Concatenate VAD buffer
        const totalLength = this.#vadPendingBuffer.reduce((sum, arr) => sum + arr.length, 0);
        const combinedAudio = new Float32Array(totalLength);

        let offset = 0;
        for (const chunk of this.#vadPendingBuffer) {
            combinedAudio.set(chunk, offset);
            offset += chunk.length;
        }

        // Clear the VAD buffer
        this.#vadPendingBuffer = [];

        // Skip if too short
        if (combinedAudio.length < this.#sampleRate * 0.3) { // At least 300ms
            return;
        }

        console.log(`VAD: Processing ${combinedAudio.length} samples (${(combinedAudio.length / this.#sampleRate).toFixed(1)}s)`);

        try {
            console.log(`[Speech] 🔄 Transcribing VAD buffer...`);
            const transcript = await this.#transcribe(combinedAudio);

            if (transcript && transcript.trim()) {
                console.log(`[Speech] ✅ VAD Transcript: "${transcript.trim()}"`);
                // Emit partial transcript for immediate reaction matching
                NotificationCenter.default.postNotification(
                    SpeechService.Notifications.PartialTranscript,
                    this,
                    {
                        partialTranscript: transcript.trim().toLowerCase(),
                        isFinal: false,
                        timestamp: Date.now()
                    }
                );
            } else {
                console.log(`[Speech] ⚠️ VAD transcription returned empty`);
            }
        } catch (err) {
            console.error("[Speech] ❌ VAD transcription error:", err);
        }
    }

    /**
     * Transcribe audio using Whisper (via Web Worker)
     */
    async #transcribe(audioData) {
        if (!this.#whisperWorker || !this.#whisperWorker.isLoaded) {
            return null;
        }

        try {
            // Call transcription in the worker (non-blocking)
            // Worker now returns {text, source} - we only need the text for mic input
            const result = await this.#whisperWorker.transcribe(audioData, "user");
            return result?.text ?? result;  // Handle both new and legacy format
        } catch (err) {
            console.error("Whisper transcription error:", err);
            return null;
        }
    }

    /**
     * Preload the Whisper model without starting the microphone.
     * Call this during app startup to eliminate load time when feature is enabled.
     * @param {string} modelSize - 'tiny' or 'base' (default: 'tiny')
     * @returns {Promise<boolean>} - true if model preloaded successfully
     */
    async preloadModel(modelSize = SpeechService.ModelSize.Tiny) {
        // Skip if already loaded or not using Whisper mode
        if (this.#isModelLoaded) {
            return true;
        }

        if (this.#recognitionMode !== SpeechService.RecognitionMode.Whisper) {
            return true;
        }

        this.#modelSize = modelSize;

        try {
            // Check if WhisperWorker is available
            if (typeof WhisperWorker === "undefined") {
                console.warn("WhisperWorker not available for preload");
                return false;
            }

            // Create the worker manager if not already created
            if (!this.#whisperWorker) {
                this.#whisperWorker = new WhisperWorker();
            }

            // Preload during idle time
            await this.#whisperWorker.preloadWhenIdle();

            if (this.#whisperWorker.isLoaded) {
                this.isModelLoaded = true;
                console.log("Whisper model preloaded successfully");
                return true;
            }

            return false;

        } catch (err) {
            console.warn("Error preloading Whisper model:", err);
            return false;
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopListening();

        if (this.#whisperWorker) {
            try {
                this.#whisperWorker.dispose();
            } catch (err) {
                console.error("Error disposing Whisper worker:", err);
            }
        }

        this.#whisperWorker = null;
        this.isModelLoaded = false;
    }
}

// Create singleton instance
SpeechService.shared = new SpeechService();
