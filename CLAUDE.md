# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains Playwright-based end-to-end tests for the Airtime desktop application, a CEF (Chromium Embedded Framework) app. Tests connect to the running desktop app via Chrome DevTools Protocol (CDP) on port 9222.

## Commands

```bash
# Install dependencies (from airtime-tests/ directory)
npm install

# Run all tests
npm test

# Run specific test suites
npm run test:recorder
npm run test:camera
npm run test:toolbox

# Run only smoke tests
npm run test:smoke

# Run tests with specific tag
npm test -- --grep "@smoke"
npm test -- --grep-invert "@slow"

# Debug modes
npm run test:ui       # Playwright UI mode
npm run test:debug    # Step-through debugger
npm run test:headed   # See the browser

# View HTML report
npm run report
```

## Environment Variables

- `AIRTIME_APP_PATH` - Path to Airtime app (auto-detected by default)
- `AIRTIME_DEBUG_PORT` - CDP port (default: 9222)
- `AIRTIME_SKIP_LAUNCH` - Set to 'true' to connect to already-running app
- `AIRTIME_SKIP_CLOSE` - Set to 'true' to keep app running after tests

## Architecture

### Test Connection Pattern

Tests do NOT launch a browser. Instead, they connect to the running Airtime CEF app via CDP:
1. Global setup (`src/fixtures/global-setup.ts`) launches the app or connects to a running instance
2. Tests connect via `chromium.connectOverCDP('http://localhost:9222')`
3. The app exposes multiple pages (recorder, camera, toolbox) accessible via URL pattern matching
4. Global teardown optionally closes the app

### Fixtures (`src/fixtures/airtime.fixture.ts`)

Custom Playwright fixtures provide:
- `airtimeBrowser` - CDP-connected browser instance
- `recorderPage`, `cameraPage`, `toolboxPage` - Page Object instances
- `rawRecorderPage`, `rawCameraPage`, `rawToolboxPage` - Raw Playwright Page objects

Import tests from the custom fixture, not from `@playwright/test`:
```typescript
import { test, expect } from '../../src/fixtures/airtime.fixture';
```

### Page Objects (`src/pages/`)

- `BasePage` - Common functionality (waitForLoad, screenshot, error handling, native bridge messaging)
- `RecorderPage`, `CameraPage`, `ToolboxPage` - Feature-specific page objects with locators and actions

### Native Bridge (`src/helpers/native-bridge.ts`)

Helper for testing JS ↔ native C++/Objective-C communication:
- Supports `window.cefQuery`, `window.nativeBridge`, and `window.airtime` patterns
- Methods: `sendMessage()`, `sendCefQuery()`, `getCaptureSources()`, `mockMethod()`

### Test Tags

- `@smoke` - Quick sanity checks (run in CI by default)
- `@slow` - Long-running tests
- `@skip` - Temporarily disabled tests

## TypeScript Path Aliases

```typescript
@pages/*    -> src/pages/*
@helpers/*  -> src/helpers/*
@fixtures/* -> src/fixtures/*
@types/*    -> src/types/*
```

## Running Tests Locally

1. Launch Airtime with CDP enabled:
   ```bash
   # macOS
   open /Applications/airtime.app --args --remote-debugging-port=9222 --user-data-dir=remote-profile
   ```

2. Run tests:
   ```bash
   cd airtime-tests
   npm test
   ```

Or let tests auto-launch the app by just running `npm test` without pre-launching.
