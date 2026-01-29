# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CDP-based smoke tests for the Airtime Camera desktop application (CEF/Chromium Embedded Framework). Tests connect directly to the running app via Chrome DevTools Protocol on port 9222 and execute JavaScript to verify UI functionality.

## Running Tests

### Prerequisites

Launch Airtime with CDP enabled:
```bash
open /Applications/airtime.app --args --remote-debugging-port=9222 --user-data-dir=remote-profile
```

### Using MCP CDP Tools

```
cdp_connect(port: 9222)
cdp_select_page(selector: "Camera")
cdp_evaluate(expression: "<javascript>")
```

### Running Test Steps

Tests in `smoke-tests.js` contain step objects with `run` properties (JavaScript expressions). Execute them via `cdp_evaluate`. The `expect` property defines expected return values.

## Architecture

### File Structure

- `smoke-tests.js` - Test definitions with 10 test suites covering core features
- `helpers.js` - Reusable CDP evaluation helpers (click by data-action, check elements, slider manipulation)
- `TEST_PLAN.md` - Full test plan with checkbox items for manual tracking
- `run-smoke-tests.md` - Ready-to-run JavaScript snippets for each test

### Test Pattern

Tests are defined as objects with:
```javascript
{
  name: 'Test Name',
  description: 'What it tests',
  steps: [
    {
      name: 'Step name',
      run: `(() => { /* JS to evaluate */ })()`,
      expect: { /* expected return values */ }
    }
  ]
}
```

### Key Selectors

The app uses `data-action` attributes as primary selectors (stable across versions):
- `show-*-widget` - Opens feature widgets (looks, nametag, away, enhance, lut, edge-light)
- `toggle-*-on` / `toggle-*-off` - Feature toggles
- `close-widget` - Closes current widget

### Main UI Sections

- `#container`, `#app`, `#stage`, `#stage_wrapper` - Core layout
- `#camera_tools_top/bottom/left/right` - Toolbars
- `#sidebar_pane` - Widget container
- `#notifications-banner` - Notification area

### Helper Functions (helpers.js)

- `clickByDataAction(action)` - Click element by data-action attribute
- `checkElement(selector)` - Check existence and visibility
- `getSliderValue(id)` / `setSliderValue(id, val)` - Slider manipulation
- `isFeatureActive(feature)` - Check toggle state
- `openWidget(name)` / `closeWidget()` - Widget management
- `getVirtualCameraStatus()` - Connection status check
