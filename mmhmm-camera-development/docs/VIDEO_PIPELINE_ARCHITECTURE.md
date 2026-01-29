# Video Pipeline Architecture

## Overview

The Airtime video pipeline is a WebGL-based compositing system that renders layers in a hierarchical tree structure. The pipeline handles alpha transparency, filter chaining, and media compositing through framebuffer-based rendering passes.

---

## 1. Layer Hierarchy & Z-Ordering

### Layer Structure (`teleport/renderer/layers/core.js`)

Layers form a tree with parent-child relationships:
- `superlayer` - parent reference
- `sublayers` - child array, auto-sorted by `zIndex`

**Stage Layer Hierarchy:**
```
RenderLayer (Root)
├── BackgroundLayer (zIndex: -1)     ← Room/background
├── ForegroundLayer                  ← Media + Presenters
│   ├── Media layers (sorted by zIndex)
│   └── Presenter layers
│       └── PresenterVideoLayer      ← Segmented video with alpha
│       └── PresenterGestureLayer    ← Interactions
└── AnnotationsLayer (zIndex: 10)    ← Drawing/annotations
```

**Rendering Order:**
1. Layer content rendered first
2. Sublayers rendered in sorted zIndex order (back-to-front)
3. Remaining filters applied to composited result

---

## 2. Alpha/Transparency Handling

### Blend Functions (`teleport/renderer/core.js`)

**Standard compositing:**
```javascript
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)  // lines 206, 381, 565
```

**Offscreen framebuffer:**
```javascript
gl.blendFunc(gl.ONE, gl.ZERO)  // Direct copy, no blending
```

### Fragment Shader Alpha (lines 33-44)
```glsl
void main() {
    vec4 pix = texture2D(u_texture, v_texcoord);
    gl_FragColor = vec4(pix.rgb, pix.a * u_opacity);
}
```

### Alpha-Aware Filter Modes

Filters like LUT and Tune support targeting based on alpha:
- `All` - affects entire frame
- `Foreground` - blends where alpha HIGH (segmented person)
- `Background` - blends where alpha LOW (background)

```glsl
// From lut.js, tune.js
if (u_alphaMode == 1) {
    blendAmount *= smoothstep(0.4, 0.6, color.a);  // Foreground
} else if (u_alphaMode == 2) {
    blendAmount *= 1.0 - smoothstep(0.4, 0.6, color.a);  // Background
}
```

### Alpha Flatten Filter (`teleport/renderer/filters/alpha_flatten.js`)

Used after segmentation-aware filters to flatten alpha to 1.0 for final display:
```
Segmentation (preserves alpha) → LUT/Tune (use alpha for targeting) → AlphaFlatten → Display
```

### Mask Filter (`teleport/renderer/filters/mask.js`)

Multiplies layer alpha by mask alpha channel:
```glsl
pix.a * mask * u_opacity
```

---

## 3. Looks System

### What is a "Look"? (`teleport/models/slides/modern/look.js`)

A Look is a complete visual configuration containing:
- **Presenter settings**: Background style, paint, shape, enhancement
- **Media layers**: Pattern (bottom), Overlay (middle), Logo (top)
- **Color effects**: LUT color grading + Tune adjustments
- **Presets**: Curated templates with branding/colors/patterns

### Look Application Flow (`teleport/looks/looks_controller.js`)

```
User selects look → LooksController.selectedLook = look
    → Updates stage.localPresenter
    → Sets presenter layer visual properties
    → Applies effect filters to presenter
    → Media layers render on top
```

---

## 4. Filter System

### Base Class (`teleport/renderer/filters/core.js`)

```javascript
RenderFilter {
    fragment      // GLSL shader source
    uniforms      // Required uniform names
    parameters    // UI-configurable values (sliders)
    enabled       // Toggle on/off
    modifiesContents  // Affects rendering complexity

    prepare(gl, program, timestamp, renderer, layer, contentsTexture)
    // Sets shader uniforms before render
}
```

### Filter Registry (`teleport/renderer/filters/registry.js`)

```javascript
PresenterFilterRegistry = [
    BlackAndWhiteFilter,  // Grayscale + brightness
    PixelizeFilter,       // 32px pixelization
    ComplementsFilter,    // Color complement
    SkinSoftenFilter,     // Beauty/touch-up
    HandheldGameFilter,   // Retro gameboy
    TransmissionFilter,   // Glitch effect
    RainFilter,           // Animated rain
    FilmFilter,           // Old film grain
    VignetteFilter,       // Edge darkening
    ChromaFilter,         // Green screen (internal)
    LUTFilter,            // 3D color grading (configurable)
    TuneFilter,           // Exposure/contrast/saturation (configurable)
    AlphaFlattenFilter    // Alpha normalization (internal)
]
```

### Filter Chaining (`teleport/renderer/core.js`)

Filters chain via framebuffer stacking:

```
Video Input
    ↓
[Filter 0] → FBO0.texture
    ↓
[Filter 1] reads FBO0 → FBO1.texture
    ↓
[Filter 2] reads FBO1 → FBO2.texture
    ↓
Final Output to Canvas
```

**Complexity Detection (lines 640-654):**
```javascript
complexRender = (filters.length > 1) ||
                (1 filter && modifiesContents && has sublayers)
```

**Single filter**: Renders directly to canvas
**Multiple filters**: Uses offscreen framebuffers with texture pooling

### Presenter Filter Pipeline (`teleport/presenters/layers/video.js`)

**Segmentation Filter Setup** (lines 115-200):
```javascript
_updateFilters() {
    let filters = [];
    const segFilter = this.segFilter;

    // Set segmentation type based on conditions:
    if (physicalGreenScreen) {
        segFilter.segmentationType = "chroma";  // Chroma key removal
    }
    else if (style == Show && paint == null) {
        if (forceSegmentationForEffects) {
            // Force segmentation for alpha-aware LUT/Tune
            segFilter.segmentationType = "hybrid" | "virtual";
        } else {
            segFilter.segmentationType = "none";  // No segmentation
        }
    }
    else {
        // Look active or paint set
        segFilter.segmentationType = "hybrid" | "virtual";
    }

    filters.push(segFilter);

    // Add presenter effect filter
    const effect = presenter.effect;
    if (effect != null) {
        filters.push(effect);
    }

    this.filters = filters;
}
```

**Segmentation Types:**
- `"none"` - No segmentation, full frame passes through
- `"chroma"` - Physical green screen removal via chroma keying
- `"virtual"` - ML-based person segmentation (web app with mask)
- `"hybrid"` - Native app segmentation (alpha in texture)

**Filter Order:** `[Video] → [Segmentation] → [Effect] → [Output]`

---

## 5. Media on Stage

### Media Loading (`teleport/media/`)

1. Asset loaded via `asset.openAsElement()` → HTMLImageElement / HTMLVideoElement
2. Element assigned to `layer.contents`
3. `layer.naturalSize` extracted from element dimensions
4. Frame calculated via `Stage.Object.frameForLayer()`

### Positioning Properties (`teleport/stage/objects/core.js`)

- `center` - (x, y) position when anchor=None
- `scale` - 0.0 to maxScale (default 0.7)
- `anchor` - 9 predefined positions or freeform
- `rotation` - 0-360 degrees
- `cropInsets` - {top, left, bottom, right} fractions (0-1)
- `fullscreen` - fills entire stage

### Transform Stack

```javascript
updateLayerTransform():
1. Translation to frame position
2. Scale (fit-to-stage aspect ratio)
3. Rotation (if rotation > 0)
4. Anchor point adjustment
→ Result: 3D transformation matrix
```

---

## 6. Complete Rendering Pipeline

### Stage.render() Flow (`teleport/stage/stage.js`)

```javascript
Stage.render(timestamp):
    room.render()           // Background layer
    media[].render()        // All media layers
    presenters[].render()   // Presenter layers
    annotations[].render()  // Annotation layers
    Renderer.render()       // GPU rendering pass
```

### Renderer Pipeline (`teleport/renderer/core.js`)

```
1. COLLECTION PHASE (lines 861-953)
   - Recursively collect visible layers
   - Build renderable list with layer, box, opacity, visible flags

2. OCCLUSION PHASE (lines 1007-1024)
   - Mark layers covered by opaque content as hidden
   - Optimization to skip invisible layers

3. FRAMEBUFFER SETUP (lines 1047-1066)
   - Allocate framebuffer textures for complex renders
   - Pool-based reuse (lines 1503-1541)

4. RENDER TRAVERSAL (lines 575-860)
   renderLayerAtTime(layer, time, opacity, projection, model):
       Calculate combined opacity (line 576)
       Check visibility: hidden or opacity <= 0 (line 578)

       Prepare filters (lines 583-636):
         - Get content filter from layer.contents.filter
         - Remove disabled filters
         - Add mask filter at correct position

       Determine complex render (lines 640-654):
         complexRender = (filters.length > 1) OR
                        (1 filter with modifiesContents AND sublayers)

       IF complex render (lines 681-697):
         - Get FBO of layer.naturalSize
         - pushRenderTarget(fboTexture)
         - Create flipped projection matrix for FBO

       Render layer content (lines 701-751):
         - First filter applied if modifiesContents=false or no sublayers
         - Otherwise use inOutFilter (passthrough)
         - renderLayerWithFilterAtTime() draws to current target

       Render sublayers (lines 754-768):
         - Loop through sublayers in zIndex order
         - Recursively call renderLayerAtTime()

       Chain remaining filters (lines 770-824):
         FOR EACH remaining filter (except last):
           - Dequeue new FBO
           - pushRenderTarget(filterFBO)
           - Render with previous FBO texture as input
           - popRenderTarget()
           - Enqueue previous FBO (release)
           - drawable = filterFBO.texture
         END FOR

       Final output (lines 834-855):
         - popRenderTarget() if complex
         - renderLayerWithFilterAtTime() with last filter
         - enqueueFramebufferTexture() to release FBO
```

---

## 7. Key Files Reference

| Component | File Path |
|-----------|-----------|
| Core Renderer | `teleport/renderer/core.js` |
| RenderLayer | `teleport/renderer/layers/core.js` |
| Stage | `teleport/stage/stage.js` |
| Stage Objects/Transform | `teleport/stage/objects/core.js` |
| Filter Base | `teleport/renderer/filters/core.js` |
| Filter Registry | `teleport/renderer/filters/registry.js` |
| LUT Filter | `teleport/renderer/filters/lut.js` |
| Tune Filter | `teleport/renderer/filters/tune.js` |
| Alpha Flatten | `teleport/renderer/filters/alpha_flatten.js` |
| Mask Filter | `teleport/renderer/filters/mask.js` |
| Look Model | `teleport/models/slides/modern/look.js` |
| Looks Controller | `teleport/looks/looks_controller.js` |
| Presenter Core | `teleport/presenters/core.js` |
| Presenter Video Layer | `teleport/presenters/layers/video.js` |
| Media Core | `teleport/media/core.js` |
| Media Image | `teleport/media/image.js` |

---

## 8. Configurable Color Filters

### TuneFilter (`teleport/renderer/filters/tune.js`)

Technical image corrections applied BEFORE LUT:

```glsl
// Order: exposure → contrast → saturation → temperature
rgb = applyExposure(rgb, u_exposure);   // EV stops (-1 to +1)
rgb = applyContrast(rgb, u_contrast);   // S-curve around 0.5
rgb = applySaturation(rgb, u_saturation); // Luminance-preserving
rgb = applyTemperature(rgb, u_temperature); // Kelvin (4000K-9000K)
```

Parameters: `exposure`, `contrast`, `saturation`, `temperature` (all -1 to +1)

### LUTFilter (`teleport/renderer/filters/lut.js`)

3D color lookup table for creative grading:

```glsl
// Sample LUT texture and blend with original
vec3 lutColor = applyLUT(color.rgb);
vec3 finalColor = mix(color.rgb, lutColor, u_intensity);
```

- WebGL2: Native `sampler3D` (3D texture)
- WebGL1: 2D texture with horizontal slice packing
- Parameter: `intensity` (0 to 1)

### Alpha Discarding

Both filters discard transparent pixels:
```glsl
if (color.a < 0.01) {
    discard;  // Don't process fully transparent pixels
}
```

---

## Visual Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        Stage.render()                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                               │
│  │ Room/BG      │ zIndex: -1                                    │
│  │ (Background) │                                               │
│  └──────────────┘                                               │
│         ↓                                                       │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ Media Layer  │ →   │ Media Layer  │ →   │ Media Layer  │    │
│  │ (Pattern)    │     │ (Overlay)    │     │ (Logo)       │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Presenter Layer                         │   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │            PresenterVideoLayer                     │  │   │
│  │  │                                                    │  │   │
│  │  │  Video → Segmentation → LUT → Tune → AlphaFlatten │  │   │
│  │  │         (alpha mask)   (color) (adjust)  (final)   │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                       │
│  ┌──────────────┐                                               │
│  │ Annotations  │ zIndex: 10                                    │
│  └──────────────┘                                               │
│                                                                 │
│  All composited via gl.blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA)│
└─────────────────────────────────────────────────────────────────┘
```
