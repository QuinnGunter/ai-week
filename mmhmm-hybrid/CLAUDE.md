# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mmhmm-hybrid is a cross-platform (macOS and Windows) desktop application built on the Chromium Embedded Framework (CEF). The project creates a native "shell" application that hosts a web-based UI, with integrations for camera/video functionality, virtual camera support, and video segmentation.

The project name "Airtime" is used internally (CMake target, app bundle name).

## Architecture

### Multi-Process CEF Architecture
The application uses CEF's multi-process architecture:
- **Browser process**: Main application process (`mmhmm-hybrid/browser/`) - handles window management, native UI, and system integration
- **Renderer process**: Runs in separate processes (`mmhmm-hybrid/renderer/`) - handles JavaScript execution and web content
- **Common code**: Shared between processes (`mmhmm-hybrid/common/`)

### Platform-Specific Code
- **macOS**: `mac/` directory contains Xcode projects and Swift/Objective-C code
  - Main app: `mac/mmhmm/` (Swift)
  - Xcode workspace: `mac/mmhmm.xcworkspace`
  - CxxCEF: Swift/C++ interop wrapper framework for CEF headers
- **Windows**: `win/` directory and `mmhmm-hybrid/win/` for platform-specific C++ code
  - Built with CMake and Visual Studio/Ninja

### Key Components
- `mmhmm-hybrid/`: Core CEF-based application code (C++)
- `mac/mmhmm/`: macOS native Swift application layer
- `mac/CEF/`, `win/CEF/`: Platform-specific CEF binary distributions
- `cef-modifications/`, `chromium-modifications/`: Custom patches to CEF/Chromium

## Build Commands

### macOS
```bash
# Build release (from mac/ directory)
./Build-Tools/build.sh

# Build for CI
./Build-Tools/build.sh --ci

# Open in Xcode
open mac/mmhmm.xcworkspace
# Select "mmhmm" scheme and build (Cmd+B)
```

### Windows
```bash
# Configure with CMake (from project root)
mkdir build && cd build
cmake -G "Ninja" -DCMAKE_BUILD_TYPE=Release ..
# Or for Visual Studio:
cmake -G "Visual Studio 17 2022" -A x64 ..

# Build
ninja
# Or open build/cef.sln in Visual Studio
```

### CMake Presets (Windows)
```bash
cmake --preset x64-Debug    # Debug build with Ninja
cmake --preset x64-Release  # Release build with Ninja
```

## Testing

### macOS
```bash
# Run tests (from mac/ directory)
./Build-Tools/test.sh <test_plan> <junit_report_name>

# Available test plans:
# - UnitTests
# - UI-Tests-Debug
# - UI-Tests-Release

# Example: Run unit tests
./Build-Tools/test.sh UnitTests unit-test-results.xml

# Run with CI flags
./Build-Tools/test.sh UnitTests results.xml --ci /tmp
```

Tests require `xcbeautify` to be installed.

## Code Style and Linting

### C/C++/Objective-C
Uses Chromium style via clang-format:
```bash
# Format files
python tools/fix_style.py <file-path|git-hash|unstaged|staged>

# Examples
python tools/fix_style.py unstaged           # Format unstaged changes
python tools/fix_style.py staged             # Format staged changes
python tools/fix_style.py mmhmm-hybrid/      # Format directory recursively
```

### Swift (macOS)
SwiftLint and SwiftFormat are configured in `mac/.swiftlint.yml` and `mac/.swiftformat`:
- Tabs for indentation (4-space width)
- Trailing commas are mandatory
- Line length: 250 characters max

Linters run automatically during Xcode builds.

## PR Guidelines

PR titles should be prefixed with:
- `[CICD]` - pipeline/linter/GitHub config changes
- `[Common]` - shared code affecting both platforms
- `[Mac]` - macOS-specific changes
- `[Windows]` - Windows-specific changes

## Key Dependencies

- **CEF**: Chromium Embedded Framework (platform-specific binaries in mac/CEF/ and win/CEF/)
- **Sparkle**: macOS auto-update framework (mac/Dependencies/Sparkle/)
- **seglib**: Video segmentation library
- **Sentry**: Crash reporting (Windows)
