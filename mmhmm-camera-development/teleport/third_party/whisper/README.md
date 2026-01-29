# Whisper.cpp WASM Integration

This directory contains the Whisper.cpp WebAssembly module for speech recognition.

## Current State

The `whisper.js` file contains a **mock implementation** that provides the expected API but returns empty transcriptions. This allows the UI and integration code to work without the actual Whisper model.

## Setting Up Real Whisper WASM

To enable actual speech recognition, download the Whisper.cpp WASM build:

### Option 1: Pre-built Binaries

1. Visit https://github.com/nicholasday/nicholasday.github.io/tree/main/whisper-web
2. Download the following files:
   - `whisper.js` (replace the mock)
   - `whisper.wasm`
   - `whisper-tiny.bin` (~40MB) or `whisper-base.bin` (~75MB)

### Option 2: Build from Source

1. Clone whisper.cpp: `git clone https://github.com/ggerganov/whisper.cpp`
2. Build the WASM version following their documentation
3. Copy the output files to this directory

## Files Required

| File | Description | Size |
|------|-------------|------|
| `whisper.js` | JavaScript bindings | ~50KB |
| `whisper.wasm` | WebAssembly binary | ~2MB |
| `whisper-tiny.bin` | Tiny model weights | ~40MB |
| `whisper-base.bin` | Base model weights | ~75MB |

## Model Selection

- **tiny**: Fastest, least accurate, ~40MB
- **base**: Better accuracy, larger, ~75MB

The `SpeechService` defaults to the `tiny` model but can be configured to use `base` for better accuracy at the cost of higher memory usage and slower loading.

## Fallback: Web Speech API

When Whisper WASM is not available, the system can optionally fall back to the browser's Web Speech API (if supported). This provides basic transcription in Chrome and some other browsers but:

- Requires internet connection
- May have privacy implications (audio sent to cloud)
- Less consistent across browsers
- Not available in all contexts (e.g., no microphone permission)

## Testing

To test the mock implementation, the UI will still function but no actual transcription will occur. Keywords will need to be manually triggered for testing the reaction display system.
