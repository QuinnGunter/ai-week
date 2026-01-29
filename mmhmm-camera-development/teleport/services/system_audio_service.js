//
//  services/system_audio_service.js
//  mmhmm
//
//  Captures system audio via native bridge and feeds it to Whisper for transcription.
//  Enables context-aware GIF suggestions by capturing what others say in video calls.
//

/**
 * SystemAudioService captures system audio output (what headphones would hear)
 * via a native bridge and transcribes it using the shared Whisper worker.
 *
 * This requires the native bridge (gHybrid.systemAudio) to be implemented in the
 * CEF wrapper. The JS layer gracefully handles unavailability.
 */
class SystemAudioService extends ObservableObject {

    static Notifications = Object.freeze({
        TranscriptUpdated: "SystemAudioService.TranscriptUpdated",
        CaptureStarted: "SystemAudioService.CaptureStarted",
        CaptureStopped: "SystemAudioService.CaptureStopped",
        Unavailable: "SystemAudioService.Unavailable",
        Error: "SystemAudioService.Error"
    });

    // Singleton instance
    static shared = null;

    // Private fields
    #audioBuffer = [];
    #bufferDurationMs = 3000;     // Process every 3 seconds
    #bufferOffsetMs = 1500;       // Stagger with mic processing to avoid Whisper contention
    #minAudioSamples = 16000 * 2; // Minimum 2 seconds before processing
    #sampleRate = 16000;          // Whisper expects 16kHz

    #isCapturing = false;
    #processingInterval = null;
    #whisperWorker = null;

    constructor() {
        super();

        // Disable automatic notification for properties we'll manually control
        this.automaticallyNotifiesObserversOfIsCapturing = false;
    }

    /**
     * Check if native bridge supports system audio capture
     * @returns {boolean}
     */
    get isAvailable() {
        return typeof gHybrid?.systemAudio?.isAvailable === "boolean"
            && gHybrid.systemAudio.isAvailable;
    }

    /**
     * Check if currently capturing system audio
     * @returns {boolean}
     */
    get isCapturing() {
        return this.#isCapturing;
    }

    set isCapturing(value) {
        const previous = this.#isCapturing;
        this.#isCapturing = value;
        this.didChangeValueForProperty(value, "isCapturing", previous);
    }

    /**
     * Set the Whisper worker instance to use for transcription.
     * If not set, will attempt to use SpeechService.shared's worker.
     * @param {WhisperWorker} worker
     */
    setWhisperWorker(worker) {
        this.#whisperWorker = worker;
    }

    /**
     * Start capturing system audio via native bridge
     * @returns {boolean} True if capture started successfully
     */
    startCapture() {
        // Check availability
        if (!this.isAvailable) {
            console.warn("SystemAudioService: Native bridge not available");
            NotificationCenter.default.postNotification(
                SystemAudioService.Notifications.Unavailable,
                this
            );
            return false;
        }

        // Already capturing
        if (this.#isCapturing) {
            return true;
        }

        try {
            // Start native capture
            const success = gHybrid.systemAudio.startCapture((audioData) => {
                this.#handleAudioData(audioData);
            });

            if (success) {
                this.isCapturing = true;
                this.#startProcessingLoop();

                console.log("SystemAudioService: Capture started");
                NotificationCenter.default.postNotification(
                    SystemAudioService.Notifications.CaptureStarted,
                    this
                );
                return true;
            } else {
                console.error("SystemAudioService: Native bridge failed to start capture");
                return false;
            }

        } catch (err) {
            console.error("SystemAudioService: Error starting capture:", err);
            NotificationCenter.default.postNotification(
                SystemAudioService.Notifications.Error,
                this,
                { error: err.message }
            );
            return false;
        }
    }

    /**
     * Stop capturing system audio
     */
    stopCapture() {
        if (!this.#isCapturing) {
            return;
        }

        try {
            gHybrid.systemAudio?.stopCapture();
        } catch (err) {
            console.error("SystemAudioService: Error stopping native capture:", err);
        }

        this.isCapturing = false;

        // Stop processing loop
        if (this.#processingInterval) {
            clearInterval(this.#processingInterval);
            this.#processingInterval = null;
        }

        // Clear buffer
        this.#audioBuffer = [];

        console.log("SystemAudioService: Capture stopped");
        NotificationCenter.default.postNotification(
            SystemAudioService.Notifications.CaptureStopped,
            this
        );
    }

    /**
     * Handle incoming audio data from native bridge
     * @param {Object} audioData - {samples: Float32Array, sampleRate: number}
     */
    #handleAudioData(audioData) {
        if (!this.#isCapturing) {
            return;
        }

        // Native sends Float32Array samples
        if (audioData?.samples && audioData.samples.length > 0) {
            // If sample rate doesn't match, we'd need to resample
            // For now, assume native sends 16kHz as specified in the interface
            this.#audioBuffer.push(...audioData.samples);
        }
    }

    /**
     * Start the audio processing loop, offset from mic processing
     */
    #startProcessingLoop() {
        // Offset by 1.5s from mic processing to avoid Whisper contention
        setTimeout(() => {
            this.#processingInterval = setInterval(() => {
                this.#processAudioBuffer();
            }, this.#bufferDurationMs);
        }, this.#bufferOffsetMs);
    }

    /**
     * Process accumulated audio buffer through Whisper
     */
    async #processAudioBuffer() {
        if (this.#audioBuffer.length < this.#minAudioSamples) {
            return; // Not enough audio yet
        }

        // Get the audio data
        const audio = new Float32Array(this.#audioBuffer);
        this.#audioBuffer = [];

        // Skip if audio is too quiet (likely silence)
        const rms = this.#calculateRMS(audio);
        if (rms < 0.01) {
            return;
        }

        // Get Whisper worker
        const worker = this.#whisperWorker || this.#getSharedWhisperWorker();

        if (!worker || !worker.isLoaded) {
            console.warn("SystemAudioService: Whisper worker not available");
            return;
        }

        try {
            console.log(`SystemAudioService: Processing ${audio.length} samples (${(audio.length / this.#sampleRate).toFixed(1)}s)`);

            // Transcribe with "other" speaker label
            const result = await worker.transcribe(audio, "other");

            if (result?.text?.trim()) {
                const transcript = result.text.trim().toLowerCase();

                // Add to conversation buffer
                ConversationBuffer.shared?.addEntry("other", transcript);

                // Notify listeners
                NotificationCenter.default.postNotification(
                    SystemAudioService.Notifications.TranscriptUpdated,
                    this,
                    {
                        transcript,
                        speaker: "other",
                        timestamp: Date.now()
                    }
                );
            }
        } catch (err) {
            console.error("SystemAudioService: Transcription error:", err);
        }
    }

    /**
     * Calculate Root Mean Square of audio to detect silence
     * @param {Float32Array} audioData
     * @returns {number}
     */
    #calculateRMS(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    }

    /**
     * Get the shared Whisper worker from SpeechService
     * @returns {WhisperWorker|null}
     */
    #getSharedWhisperWorker() {
        // Access SpeechService's whisper worker if available
        // Note: This requires the worker to be exposed or shared
        if (typeof SpeechService !== "undefined" && SpeechService.shared) {
            // The worker might be accessed through a getter method we'll add
            return SpeechService.shared.getWhisperWorker?.() || null;
        }
        return null;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopCapture();
        this.#whisperWorker = null;
    }
}

// Create singleton instance
SystemAudioService.shared = new SystemAudioService();
