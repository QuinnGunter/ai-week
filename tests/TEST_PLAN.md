# Airtime Camera Test Plan

## Overview
Automated tests for the Airtime Camera application using CEF CDP (Chrome DevTools Protocol).

## Test Categories

### 1. Basic UI Load Tests
- [ ] Camera page loads successfully
- [ ] Main container elements are present (`#container`, `#app`, `#stage`)
- [ ] Navigation banner is visible
- [ ] Bottom toolbar is rendered

---

### 2. Looks Feature
**Toggle Tests:**
- [ ] Toggle Looks ON via `data-action="toggle-look"`
- [ ] Toggle Looks OFF
- [ ] Verify Looks widget opens via `data-action="show-looks-widget"`

**Interaction Tests:**
- [ ] Open Looks catalog (`data-action="show-looks-catalog"`)
- [ ] Select a preset look (`data-action="select-preset"`)
- [ ] Edit current look (`data-action="edit-look"`)
- [ ] Pin a look (`data-action="pin-look"`)
- [ ] Delete a look (`data-action="delete-look"`)
- [ ] Cancel look changes (`data-action="discard-look-changes"`)
- [ ] Save look changes (`data-action="save-look-changes"`)

---

### 3. Name Tag Feature
**Toggle Tests:**
- [ ] Toggle Name Tag ON (`data-action="toggle-nametag-on"`)
- [ ] Toggle Name Tag OFF (`data-action="toggle-nametag-off"`)
- [ ] Open Name Tag widget (`data-action="show-nametag-widget"`)

**Customization Tests:**
- [ ] Edit name text input
- [ ] Edit title text input
- [ ] Change font (`data-action="show-font-menu"`)
- [ ] Select name badge style (`data-action="show-name-badge-styles"`)

---

### 4. Away Mode (Camera Off)
- [ ] Toggle Away ON (`data-action="toggle-away-on"`)
- [ ] Toggle Camera ON (`data-action="toggle-away-off"`)
- [ ] Open Away widget (`data-action="show-away-widget"`)
- [ ] Set away reaction image

---

### 5. Filters (Enhance)
- [ ] Toggle Filters ON (`data-action="toggle-enhance-on"`)
- [ ] Toggle Filters OFF (`data-action="toggle-enhance-off"`)
- [ ] Open Enhance widget (`data-action="show-enhance-widget"`)
- [ ] Adjust enhancement slider (`#enhancement`)
- [ ] Adjust complements slider (`#complements`)

---

### 6. Color Grades (LUTs)
**Toggle Tests:**
- [ ] Toggle LUT ON/OFF (`data-action="toggle-lut"`)
- [ ] Open LUT widget (`data-action="show-lut-widget"`)

**Tab Navigation:**
- [ ] Switch to LUTs tab (`data-action="switch-tab"`)
- [ ] Switch to Tune tab

**LUT Controls:**
- [ ] Adjust LUT intensity slider
- [ ] Import custom LUT (`data-action="import-lut"`)

**Tune Panel:**
- [ ] Adjust exposure slider
- [ ] Adjust contrast slider
- [ ] Adjust saturation slider
- [ ] Adjust temperature slider
- [ ] Reset individual slider
- [ ] Reset all sliders

---

### 7. Edge Light
- [ ] Toggle Edge Light ON/OFF (`data-action="toggle-edge-light"`)
- [ ] Open Edge Light widget (`data-action="show-edge-light-widget"`)

---

### 8. Background Options
- [ ] Set background to Visible (`data-action="set-presenter-background-style"`)
- [ ] Set background to Blurred
- [ ] Set background to Hidden

---

### 9. Presenter Shape
- [ ] Change presenter shape (circle, rectangle, etc.) via `data-action="set-presenter-shape"`

---

### 10. Virtual Camera
- [ ] Check virtual camera connection status
- [ ] Open virtual camera menu (`data-action="show-virtual-camera-menu"`)

---

### 11. Speech Reactions
- [ ] Toggle speech reactions ON/OFF (`data-action="toggle-speech-reactions"`)

---

### 12. Widget Management
- [ ] Close any open widget (`data-action="close-widget"`)
- [ ] Close help cards (`data-action="close-help-card"`)

---

## Priority Tests (Smoke Suite)

For a quick smoke test, prioritize these core workflows:

1. **Page Load** - Verify app loads with main elements
2. **Toggle Looks** - ON/OFF functionality
3. **Toggle Name Tag** - ON/OFF functionality
4. **Toggle Away** - Camera ON/OFF
5. **Toggle Filters** - ON/OFF functionality
6. **Virtual Camera Status** - Connection check

---

## Test Utilities Needed

```javascript
// Helper functions to create:
- clickByDataAction(action)     // Click button by data-action attribute
- toggleFeature(feature, state) // Toggle a feature ON/OFF
- openWidget(widgetName)        // Open a specific widget
- closeWidget()                 // Close current widget
- getSliderValue(sliderId)      // Get slider current value
- setSliderValue(sliderId, val) // Set slider to specific value
- waitForElement(selector)      // Wait for element to appear
- verifyElementVisible(sel)     // Assert element is visible
```

---

## Notes

- All tests connect via CDP on port 9222
- Tests should be independent and not rely on previous state
- Reset app state between tests where possible
- Use `data-action` attributes as primary selectors (stable)
