/**
 * AudioWorklet processor for system audio capture.
 * Buffers audio samples and posts to main thread every ~100ms (1600 samples at 16kHz).
 */
class SystemAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.targetSamples = 1600; // 100ms at 16kHz
  }

  process(inputs) {
    const input = inputs[0];
    if (input?.[0]) {
      this.buffer.push(...input[0]);
      while (this.buffer.length >= this.targetSamples) {
        const chunk = new Float32Array(this.buffer.splice(0, this.targetSamples));
        this.port.postMessage({ samples: chunk, sampleRate: 16000 });
      }
    }
    return true;
  }
}

registerProcessor('system-audio-processor', SystemAudioProcessor);
