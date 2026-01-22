# Running Smoke Tests

This document describes how to run the smoke tests using the CEF CDP MCP tools.

## Prerequisites

1. Airtime app running with CDP enabled on port 9222:
   ```bash
   open /Applications/airtime.app --args --remote-debugging-port=9222 --user-data-dir=remote-profile
   ```

2. Connected to CDP via MCP tools

## Test Execution

### Connect to the App

```
cdp_connect(port: 9222)
cdp_select_page(selector: "Camera")  # or selector: 0
```

### Run Individual Test Steps

Each test in `smoke-tests.js` contains steps with `run` properties that are JavaScript expressions. Execute them using:

```
cdp_evaluate(expression: "<step.run code>")
```

### Quick Test Commands

Below are ready-to-run expressions for each smoke test:

---

## Test 1: Page Load Verification

### Check page loads correctly
```javascript
(() => {
  return {
    url: window.location.href,
    title: document.title,
    readyState: document.readyState
  };
})()
```

### Check all main sections exist
```javascript
(() => {
  const sections = ['container', 'app', 'stage', 'stage_wrapper',
                    'camera_tools_top', 'camera_tools_bottom'];
  const result = {};
  sections.forEach(id => {
    result[id] = !!document.getElementById(id);
  });
  result.allPresent = Object.values(result).every(v => v);
  return result;
})()
```

---

## Test 2: Looks Feature

### Open Looks widget
```javascript
(() => {
  const btn = document.querySelector('[data-action="show-looks-widget"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

### Toggle Looks ON
```javascript
(() => {
  const btn = document.querySelector('[data-action="toggle-look-on"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

### Toggle Looks OFF
```javascript
(() => {
  const btn = document.querySelector('[data-action="toggle-look-off"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

### Close widget
```javascript
(() => {
  const btn = document.querySelector('[data-action="close-widget"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

---

## Test 3: Name Tag Feature

### Open Name Tag widget
```javascript
(() => {
  const btn = document.querySelector('[data-action="show-nametag-widget"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

### Toggle Name Tag ON
```javascript
(() => {
  const btn = document.querySelector('[data-action="toggle-nametag-on"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

### Toggle Name Tag OFF
```javascript
(() => {
  const btn = document.querySelector('[data-action="toggle-nametag-off"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

---

## Test 4: Away Mode

### Open Away widget
```javascript
(() => {
  const btn = document.querySelector('[data-action="show-away-widget"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

### Toggle Away ON (camera off)
```javascript
(() => {
  const btn = document.querySelector('[data-action="toggle-away-on"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

### Toggle Camera ON
```javascript
(() => {
  const btn = document.querySelector('[data-action="toggle-away-off"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

---

## Test 5: Filters (Enhance)

### Open Enhance widget
```javascript
(() => {
  const btn = document.querySelector('[data-action="show-enhance-widget"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

### Check sliders
```javascript
(() => {
  const enhancement = document.getElementById('enhancement');
  const complements = document.getElementById('complements');
  return {
    enhancementExists: !!enhancement,
    enhancementValue: enhancement ? parseFloat(enhancement.value) : null,
    complementsExists: !!complements,
    complementsValue: complements ? parseFloat(complements.value) : null
  };
})()
```

### Adjust enhancement slider
```javascript
(() => {
  const slider = document.getElementById('enhancement');
  if (!slider) return { success: false };
  slider.value = 75;
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  slider.dispatchEvent(new Event('change', { bubbles: true }));
  return { success: true, newValue: slider.value };
})()
```

---

## Test 6: Color Grades (LUT)

### Open LUT widget
```javascript
(() => {
  const btn = document.querySelector('[data-action="show-lut-widget"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

### Switch to Tune tab
```javascript
(() => {
  const tabs = document.querySelectorAll('[data-action="switch-tab"]');
  const tuneTab = Array.from(tabs).find(t => t.textContent.includes('Tune'));
  if (tuneTab) { tuneTab.click(); return { success: true }; }
  return { success: false };
})()
```

### Check tune sliders
```javascript
(() => {
  const sliders = document.querySelectorAll('.tune-panel__slider');
  return { sliderCount: sliders.length, hasSliders: sliders.length > 0 };
})()
```

---

## Test 7: Virtual Camera Status

### Check connection status
```javascript
(() => {
  const btn = document.querySelector('[data-action="show-virtual-camera-menu"]');
  if (!btn) return { found: false };
  const text = btn.textContent.trim().toLowerCase();
  return {
    found: true,
    connected: text.includes('connected'),
    status: text
  };
})()
```

---

## Test 8: Edge Light

### Toggle Edge Light
```javascript
(() => {
  const btn = document.querySelector('[data-action="toggle-edge-light"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

---

## Test 9: Background Options

### Check background style options
```javascript
(() => {
  const btns = document.querySelectorAll('[data-action="set-presenter-background-style"]');
  return {
    count: btns.length,
    options: Array.from(btns).map(b => b.textContent.trim())
  };
})()
```

---

## Test 10: Speech Reactions

### Toggle speech reactions
```javascript
(() => {
  const btn = document.querySelector('[data-action="toggle-speech-reactions"]');
  if (btn) { btn.click(); return { success: true }; }
  return { success: false };
})()
```

---

## Full Test Suite Runner

Run all tests in sequence (copy this to cdp_evaluate):

```javascript
(() => {
  const results = { passed: 0, failed: 0, tests: [] };

  // Test 1: Page Load
  const pageLoad = {
    name: 'Page Load',
    checks: [
      { name: 'title', pass: document.title === 'Airtime Camera' },
      { name: 'container', pass: !!document.getElementById('container') },
      { name: 'app', pass: !!document.getElementById('app') },
      { name: 'stage', pass: !!document.getElementById('stage') }
    ]
  };
  pageLoad.passed = pageLoad.checks.every(c => c.pass);
  results.tests.push(pageLoad);

  // Test 2: Essential Buttons
  const buttons = {
    name: 'Essential Buttons',
    checks: [
      { name: 'looks', pass: !!document.querySelector('[data-action="show-looks-widget"]') },
      { name: 'nametag', pass: !!document.querySelector('[data-action="show-nametag-widget"]') },
      { name: 'away', pass: !!document.querySelector('[data-action="show-away-widget"]') },
      { name: 'enhance', pass: !!document.querySelector('[data-action="show-enhance-widget"]') },
      { name: 'lut', pass: !!document.querySelector('[data-action="show-lut-widget"]') },
      { name: 'vcam', pass: !!document.querySelector('[data-action="show-virtual-camera-menu"]') }
    ]
  };
  buttons.passed = buttons.checks.every(c => c.pass);
  results.tests.push(buttons);

  // Test 3: Virtual Camera Connected
  const vcam = document.querySelector('[data-action="show-virtual-camera-menu"]');
  const vcamStatus = {
    name: 'Virtual Camera',
    checks: [
      { name: 'connected', pass: vcam && vcam.textContent.toLowerCase().includes('connected') }
    ]
  };
  vcamStatus.passed = vcamStatus.checks.every(c => c.pass);
  results.tests.push(vcamStatus);

  // Summary
  results.passed = results.tests.filter(t => t.passed).length;
  results.failed = results.tests.filter(t => !t.passed).length;
  results.total = results.tests.length;

  return results;
})()
```
