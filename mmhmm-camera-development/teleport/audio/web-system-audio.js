/**
 * Web-based system audio capture using getDisplayMedia.
 * Provides gHybrid.systemAudio when native bridge is unavailable.
 *
 * This module captures system audio (what the user hears) via the browser's
 * getDisplayMedia API with audio sharing. It resamples to 16kHz for Whisper
 * compatibility and delivers audio chunks to the registered callback.
 */
(function() {
  'use strict';

  // Skip if native already provides systemAudio
  if (typeof gHybrid !== 'undefined' && gHybrid.systemAudio?.isAvailable) {
    console.log('[WebSystemAudio] Native bridge available, skipping web implementation');
    return;
  }

  class WebSystemAudioCapture {
    constructor() {
      this._isCapturing = false;
      this._pendingCapture = false;
      this._stream = null;
      this._audioContext = null;
      this._scriptProcessor = null;
      this._callback = null;
      this._buffer = [];
    }

    get isAvailable() {
      return !!(navigator.mediaDevices?.getDisplayMedia);
    }

    get isCapturing() {
      return this._isCapturing;
    }

    /**
     * Start capturing system audio.
     * Returns true synchronously to indicate the request was accepted,
     * then shows the picker asynchronously. If the user cancels or
     * doesn't share audio, a CaptureStopped notification is posted.
     */
    startCapture(callback) {
      if (this._isCapturing || this._pendingCapture) {
        console.warn('[WebSystemAudio] Already capturing or pending');
        return false;
      }

      this._pendingCapture = true;
      this._callback = callback;

      // Start async capture process
      this._initCaptureAsync().then(success => {
        this._pendingCapture = false;
        if (!success) {
          // Notify SystemAudioService that capture failed/was cancelled
          this._notifyCaptureStopped();
        }
      });

      // Return true to indicate request accepted (picker will appear)
      return true;
    }

    async _initCaptureAsync() {
      try {
        // Request display media with audio
        // Note: User must check "Share audio" checkbox in the picker
        this._stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1, height: 1 }, // Minimal video (required by API)
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });

        const audioTrack = this._stream.getAudioTracks()[0];
        if (!audioTrack) {
          throw new Error('No audio track - user must check "Share audio"');
        }

        // Create audio context at 16kHz for Whisper compatibility
        this._audioContext = new AudioContext({ sampleRate: 16000 });
        if (this._audioContext.state === 'suspended') {
          await this._audioContext.resume();
        }

        const source = this._audioContext.createMediaStreamSource(
          new MediaStream([audioTrack])
        );

        // Use ScriptProcessor for compatibility (deprecated but widely supported)
        // Buffer size 4096 at 16kHz = 256ms chunks
        this._scriptProcessor = this._audioContext.createScriptProcessor(4096, 1, 1);
        this._buffer = [];

        this._scriptProcessor.onaudioprocess = (e) => {
          const samples = e.inputBuffer.getChannelData(0);
          this._buffer.push(...samples);

          // Flush every ~100ms (1600 samples at 16kHz)
          while (this._buffer.length >= 1600) {
            const chunk = new Float32Array(this._buffer.splice(0, 1600));
            if (this._callback) {
              this._callback({ samples: chunk, sampleRate: 16000 });
            }
          }
        };

        source.connect(this._scriptProcessor);
        this._scriptProcessor.connect(this._audioContext.destination);
        this._isCapturing = true;

        // Handle when user stops sharing
        audioTrack.onended = () => this.stopCapture();

        // Also handle video track ending (user closes picker)
        const videoTrack = this._stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => this.stopCapture();
        }

        console.log('[WebSystemAudio] Capture started');
        return true;

      } catch (error) {
        console.error('[WebSystemAudio] Failed:', error.message);
        this._cleanup();
        return false;
      }
    }

    stopCapture() {
      if (!this._isCapturing) return;
      console.log('[WebSystemAudio] Stopping');
      this._cleanup();
      // Note: Don't post CaptureStopped here - SystemAudioService handles that
      // We only post when the picker is cancelled (async failure case)
    }

    _cleanup() {
      // Stop all tracks
      this._stream?.getTracks().forEach(t => t.stop());

      // Disconnect audio processing
      this._scriptProcessor?.disconnect();

      // Close audio context
      this._audioContext?.close().catch(() => {});

      // Reset state
      this._stream = null;
      this._scriptProcessor = null;
      this._audioContext = null;
      this._callback = null;
      this._buffer = [];
      this._isCapturing = false;
    }

    /**
     * Post CaptureStopped notification to sync with SystemAudioService.
     * This is called when capture fails (user cancels picker) or stops.
     */
    _notifyCaptureStopped() {
      if (typeof NotificationCenter !== 'undefined' &&
          typeof SystemAudioService !== 'undefined') {
        NotificationCenter.default?.postNotification(
          SystemAudioService.Notifications?.CaptureStopped,
          { source: 'WebSystemAudio' }
        );
      }
    }
  }

  // Initialize gHybrid.systemAudio
  function init() {
    // Ensure gHybrid exists
    if (typeof gHybrid === 'undefined') {
      window.gHybrid = {};
    }

    // Skip if native already defined systemAudio
    if (gHybrid.systemAudio) {
      console.log('[WebSystemAudio] systemAudio already defined');
      return;
    }

    const capture = new WebSystemAudioCapture();

    Object.defineProperty(gHybrid, 'systemAudio', {
      value: {
        get isAvailable() { return capture.isAvailable; },
        get isCapturing() { return capture.isCapturing; },
        startCapture: (cb) => capture.startCapture(cb),
        stopCapture: () => capture.stopCapture()
      },
      writable: false,
      configurable: true
    });

    console.log('[WebSystemAudio] Ready (web-based)');
  }

  // Run immediately - this script loads before hybrid/capabilities.js
  init();
})();
