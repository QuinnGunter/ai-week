# LUT Effects Implementation Plan

Add support for importing and applying LUT (Look-Up Table) color grading effects to the Airtime Camera page, integrated with the existing Looks system.

## Requirements
- **Formats**: .cube, .3dl, .csp, .look
- **Location**: Camera page, integrated with Looks system
- **Import**: Drag-and-drop + native file picker
- **Rendering**: WebGL shaders with 3D texture lookup

---

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ LUT Parser  │───▶│ LUT Storage │───▶│ LUTFilter   │
│ (formats)   │    │ (IndexedDB) │    │ (WebGL)     │
└─────────────┘    └─────────────┘    └─────────────┘
       ▲                                     │
┌─────────────┐                    ┌─────────────────┐
│ File Import │                    │ Filter Registry │
│ (drag/pick) │                    │ + Looks Pane    │
└─────────────┘                    └─────────────────┘
```

---

## Implementation Steps

### 1. Create LUT Parser Module
**New file**: `mmhmm-camera-development/teleport/renderer/filters/lut_parser.js`

- `LUTParser.parse(file)` - detect format, delegate to specific parser
- `parseCube(text)` - parse .cube format (primary)
- `parse3DL(text)` - parse .3dl Autodesk format
- `parseCSP(text)` - parse .csp format
- `parseLOOK(text)` - parse DaVinci .look format

Output normalized structure:
```javascript
{
  size: 33,           // LUT dimension (17, 33, or 65)
  title: "Film Look", // From file metadata
  data: Float32Array, // Flattened RGB [r,g,b,r,g,b,...]
  domainMin: [0,0,0],
  domainMax: [1,1,1]
}
```

### 2. Create LUT WebGL Filter
**New file**: `mmhmm-camera-development/teleport/renderer/filters/lut.js`

Extend `RenderFilter` (from `core.js`):
- Static `identifier = "LUT-FILTER-001"`
- Fragment shader with 3D texture lookup for color transformation
- `createLUTTexture(gl)` - upload LUT data as WebGL 3D texture
- `intensity` parameter (0-1) for blending original/graded colors
- `setLUT(lutData)` method to change active LUT
- WebGL1 fallback using 2D texture packing if needed

Key shader logic:
```glsl
uniform sampler3D u_lut;
uniform float u_intensity;
// Sample 3D LUT with trilinear interpolation
vec3 lutColor = texture(u_lut, color.rgb * scale + offset).rgb;
vec3 finalColor = mix(color.rgb, lutColor, u_intensity);
```

### 3. Create LUT Storage Manager
**New file**: `mmhmm-camera-development/teleport/looks/luts.js`

`LookLUTs` class:
- `BuiltIn` - bundled preset LUTs (Film Noir, Vintage, Cinematic Warm, etc.)
- `getBuiltInLUTs()` - list bundled LUTs
- `getUserLUTs()` - list user-imported LUTs from IndexedDB
- `importLUT(file)` - parse and store new LUT
- `getLUTData(lutInfo)` - load LUT data (with caching)
- `deleteLUT(lutId)` - remove user LUT

Storage via existing `FileStorage` class:
- `luts-v1/{id}-data` - LUT binary data
- `luts-v1/{id}-meta` - metadata JSON

### 4. Register LUT Filter
**Modify**: `mmhmm-camera-development/teleport/renderer/filters/registry.js`

Add to `PresenterFilterRegistry()`:
```javascript
{
  class: LUTFilter,
  title: LocalizedString("Color Grade"),
  thumbnail: "filter_lut.png",
  style: PresenterFilterStyle.PresenterOnly,
  appearancePane: true,
  configurable: true
}
```

### 5. Create LUT Panel UI
**New file**: `mmhmm-camera-development/teleport/sidebar/looks_pane/lut_panel.js`

`LUTPanel` class:
- Header with "Color Grades" title + Import button
- Grid of LUT cards (None + built-in + user LUTs)
- Intensity slider (0-100%)
- Drag-drop zone using existing `LooksDragDropHandler`
- Delete button on user-imported LUTs
- Selection state management

**New file**: `mmhmm-camera-development/teleport/sidebar/looks_pane/lut_panel.css`
- Grid layout for LUT cards
- Selection highlight styles
- Drag-drop overlay styles

### 6. Integrate with Looks Pane
**Modify**: `mmhmm-camera-development/teleport/sidebar/looks_pane/looks_pane.js`

- Add LUT panel as new section/tab
- Wire up panel show/hide
- Connect to `LooksController` for applying effects

### 7. Add Built-in LUT Assets
**New directory**: `mmhmm-camera-development/teleport/assets/luts/`

Include 4-5 preset .cube files:
- `film_noir.cube`
- `vintage.cube`
- `cinematic_warm.cube`
- `cold_blue.cube`
- `sepia.cube`

---

## Files Summary

| Action | File |
|--------|------|
| Create | `teleport/renderer/filters/lut_parser.js` |
| Create | `teleport/renderer/filters/lut.js` |
| Create | `teleport/looks/luts.js` |
| Create | `teleport/sidebar/looks_pane/lut_panel.js` |
| Create | `teleport/sidebar/looks_pane/lut_panel.css` |
| Create | `teleport/assets/luts/*.cube` (5 files) |
| Modify | `teleport/renderer/filters/registry.js` |
| Modify | `teleport/sidebar/looks_pane/looks_pane.js` |

---

## Verification Plan

1. **Unit test LUT parser**: Parse sample .cube file, verify size/data correctness
2. **Manual test filter**: Apply LUT to camera feed, verify color transformation
3. **Test import flow**:
   - Drag .cube file onto panel → appears in grid
   - Click Import → file picker opens → select file → appears in grid
4. **Test intensity slider**: Drag slider, verify blend between original/graded
5. **Test persistence**: Import LUT, reload app, verify LUT still available
6. **Test deletion**: Delete user LUT, verify removed from grid and storage
7. **Run existing test suite**: `npm test` from `airtime-tests/` directory
