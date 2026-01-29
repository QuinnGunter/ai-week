# Test Project Structure Plan - Airtime Camera

## Overview

Comprehensive restructure of the `airtime-tests/` project based on analysis of:
- **mmhmm-camera-development/** - Web UI layer (vanilla JS, observable patterns)
- **mmhmm-hybrid/** - Native CEF layer (C++/Objective-C/Swift)

**Goal**: Create feature-specific page objects, organized test suites, and native bridge testing utilities.

---

## Implementation Plan

### Phase 1: New Page Objects (Feature-Based)

Create new page objects in `src/pages/features/` using real selectors from the camera web code:

#### 1.1 LooksPage (`src/pages/features/looks.page.ts`)
**Source**: `teleport/looks/`, `teleport/sidebar/looks_pane/`

```typescript
// Key locators (from teleport/looks/looks_controller.js, widgets/)
readonly looksWidget: Locator;           // .looks-widget, #looks-pane
readonly looksToggle: Locator;           // Toggle looks on/off
readonly looksList: Locator;             // List of available looks
readonly lookItem: Locator;              // Individual look items
readonly createBlankLookButton: Locator; // "Create blank look"
readonly editLookButton: Locator;        // Edit button on look
readonly pinLookButton: Locator;         // Pin/unpin look
readonly deleteLookButton: Locator;      // Delete look

// Layer editing (from teleport/looks/ui/)
readonly wallpaperLayer: Locator;
readonly tintLayer: Locator;
readonly logoLayer: Locator;
readonly patternLayer: Locator;
readonly overlayLayer: Locator;
```

**Methods**:
- `toggleLooks(enable?: boolean)`
- `areLooksEnabled(): boolean`
- `createBlankLook(): Promise<void>`
- `selectLook(name: string)`
- `editLook(name: string)`
- `deleteLook(name: string)`
- `pinLook(name: string)`
- `duplicateLook(name: string)`
- `getAvailableLooks(): string[]`
- `editLayer(layer: 'wallpaper'|'tint'|'logo'|'pattern'|'overlay')`

#### 1.2 ReactionsPage (`src/pages/features/reactions.page.ts`)
**Source**: `teleport/media/`, `teleport/stage/reaction_overlay.js`

```typescript
// Key locators
readonly reactionsWidget: Locator;       // Reactions/Visuals widget
readonly reactionsList: Locator;         // Grid of reactions
readonly reactionItem: Locator;          // Individual reaction
readonly searchInput: Locator;           // Search reactions
readonly categoryTabs: Locator;          // All, Media, Text, Emoji
readonly layoutSelector: Locator;        // Layout style dropdown
readonly pinReactionButton: Locator;     // Pin reaction
```

**Methods**:
- `triggerReaction(name: string)`
- `searchReactions(query: string)`
- `filterByCategory(category: 'all'|'media'|'text'|'emoji')`
- `pinReaction(name: string)`
- `unpinReaction(name: string)`
- `setLayout(layout: 'fullScreen'|'overShoulder'|'slideMedia'|'slidePresenter')`
- `getVisibleReactions(): string[]`

#### 1.3 VirtualCameraPage (`src/pages/features/virtual-camera.page.ts`)
**Source**: `teleport/hybrid/virtual_camera.js`, `mmhmm-hybrid/common/virtual_camera.h`

```typescript
// Key locators
readonly virtualCameraToggle: Locator;
readonly virtualCameraStatus: Locator;
readonly installButton: Locator;
readonly authorizeButton: Locator;
readonly clientsList: Locator;           // Connected clients
```

**Methods**:
- `getState(): 'notInstalled'|'installed'|'awaitingUserApproval'|'needsReboot'|'error'`
- `install(): Promise<void>`
- `authorize(): Promise<void>`
- `toggle(enable?: boolean)`
- `isEnabled(): boolean`
- `getConnectedClients(): string[]`
- `waitForState(state: string, timeout?: number)`

#### 1.4 EnhancementsPage (`src/pages/features/enhancements.page.ts`)
**Source**: `teleport/presenters/`, `teleport/renderer/filters/`

```typescript
// Key locators
readonly enhanceWidget: Locator;
readonly enhanceToggle: Locator;
readonly filterOptions: Locator;
readonly complementSelector: Locator;
```

**Methods**:
- `toggleEnhancements(enable?: boolean)`
- `areEnhancementsEnabled(): boolean`
- `selectFilter(name: string)`
- `applyComplement(name: string)`
- `getAvailableFilters(): string[]`

#### 1.5 NameTagPage (`src/pages/features/nametag.page.ts`)
**Source**: `teleport/text/`, `teleport/widgets/`

```typescript
// Key locators
readonly nametagToggle: Locator;
readonly titleInput: Locator;
readonly subtitleInput: Locator;
readonly styleOptions: Locator;
```

**Methods**:
- `toggle(enable?: boolean)`
- `isEnabled(): boolean`
- `setTitle(text: string)`
- `setSubtitle(text: string)`
- `getTitle(): string`
- `getSubtitle(): string`

#### 1.6 AwayScreenPage (`src/pages/features/away-screen.page.ts`)
**Source**: `teleport/start_screen/`

```typescript
// Key locators
readonly awayToggle: Locator;
readonly awayPresets: Locator;
readonly titleInput: Locator;
readonly subtitleInput: Locator;
```

**Methods**:
- `toggle(enable?: boolean)`
- `isEnabled(): boolean`
- `selectPreset(name: string)`
- `setTitle(text: string)`
- `setSubtitle(text: string)`

---

### Phase 2: Enhanced Native Bridge Helper

Update `src/helpers/native-bridge.ts` to use the actual `gHybrid` patterns from the hybrid app:

```typescript
// Updated NativeBridge class
export class HybridBridge {
  // Check for actual gHybrid object (not cefQuery)
  async isAvailable(): Promise<boolean> {
    return this.page.evaluate(() => window.gHybrid !== undefined);
  }

  // Get gHybrid API version
  async getApiVersion(): Promise<string> {
    return this.page.evaluate(() => window.gHybrid?.apiVersion);
  }

  // Virtual Camera API
  async getVirtualCameraState(): Promise<VirtualCameraState> {
    return this.page.evaluate(() => window.gHybrid?.virtualCamera?.state);
  }

  async installVirtualCamera(): Promise<void> {
    return this.page.evaluate(() => window.gHybrid?.virtualCamera?.install());
  }

  // Capabilities API
  async getCameraAuthState(): Promise<string> {
    return this.page.evaluate(() => window.gHybrid?.capabilities?.camera?.state);
  }

  async getMicrophoneAuthState(): Promise<string> {
    return this.page.evaluate(() => window.gHybrid?.capabilities?.microphone?.state);
  }

  async requestCameraAuth(): Promise<void> {
    return this.page.evaluate(() => window.gHybrid?.capabilities?.camera?.Authorize());
  }

  // Window management
  async setWindowFloating(floating: boolean): Promise<void> {
    return this.page.evaluate((f) => {
      window.gHybrid.windows.main.isFloating = f;
    }, floating);
  }

  // Property change monitoring
  async interceptPropertyChanges(): Promise<void> {
    await this.page.evaluate(() => {
      window.__propertyChanges = [];
      const original = window.mmhmm_propertyChanged;
      window.mmhmm_propertyChanged = (key, value) => {
        window.__propertyChanges.push({ key, value, timestamp: Date.now() });
        return original?.(key, value);
      };
    });
  }

  async getPropertyChanges(): Promise<PropertyChange[]> {
    return this.page.evaluate(() => window.__propertyChanges || []);
  }

  // Power state
  async getPowerState(): Promise<string> {
    return this.page.evaluate(() => window.gHybrid?.powerMonitor?.powerState);
  }
}
```

---

### Phase 3: Test Suite Organization

Create test files organized by feature:

```
tests/
├── smoke/
│   └── app-launch.spec.ts              # Basic app load, no errors
│
├── looks/
│   ├── looks-toggle.spec.ts            # Enable/disable looks
│   ├── looks-creation.spec.ts          # Create blank look
│   ├── looks-editing.spec.ts           # Edit layers
│   ├── looks-management.spec.ts        # Pin, delete, duplicate
│   └── looks-presets.spec.ts           # Apply presets
│
├── reactions/
│   ├── reaction-triggers.spec.ts       # Trigger reactions
│   ├── reaction-search.spec.ts         # Search/filter
│   ├── reaction-pinning.spec.ts        # Pin/unpin
│   └── reaction-layouts.spec.ts        # Layout styles
│
├── virtual-camera/
│   ├── vc-state.spec.ts                # State checking
│   ├── vc-installation.spec.ts         # Install flow
│   └── vc-clients.spec.ts              # Client tracking
│
├── enhancements/
│   └── filters.spec.ts                 # Filter toggle/selection
│
├── nametag/
│   └── nametag.spec.ts                 # Toggle, edit text
│
├── away-screen/
│   └── away-screen.spec.ts             # Toggle, presets, text
│
├── bridge/
│   ├── bridge-availability.spec.ts     # gHybrid exists
│   ├── property-sync.spec.ts           # mmhmm_propertyChanged calls
│   ├── capabilities.spec.ts            # Camera/mic auth states
│   └── virtual-camera-api.spec.ts      # VC native calls
│
└── recorder/                           # (existing)
    └── recorder.spec.ts
```

---

### Phase 4: Update Fixtures

Update `src/fixtures/airtime.fixture.ts` to include new page objects:

```typescript
type AirtimeFixtures = {
  // Existing
  airtimeBrowser: Browser;
  cameraPage: CameraPage;
  recorderPage: RecorderPage;
  toolboxPage: ToolboxPage;
  rawCameraPage: Page;
  rawRecorderPage: Page;
  rawToolboxPage: Page;

  // New feature pages
  looksPage: LooksPage;
  reactionsPage: ReactionsPage;
  virtualCameraPage: VirtualCameraPage;
  enhancementsPage: EnhancementsPage;
  nametagPage: NameTagPage;
  awayScreenPage: AwayScreenPage;

  // Bridge helper
  hybridBridge: HybridBridge;
};
```

---

### Phase 5: Types

Add types in `src/types/airtime.types.ts`:

```typescript
// Virtual Camera States (from mmhmm-hybrid/common/virtual_camera.h)
export type VirtualCameraRawState =
  | 'notInstalled'
  | 'notInstallable'
  | 'awaitingUserApproval'
  | 'installed'
  | 'installing'
  | 'needsUpdate'
  | 'needsReboot'
  | 'uninstalling'
  | 'error';

export interface VirtualCameraState {
  rawState: VirtualCameraRawState;
  description: string;
}

// Capability States (from mmhmm-hybrid/common/app_capabilities.h)
export type CaptureDeviceState =
  | 'notDetermined'
  | 'restricted'
  | 'denied'
  | 'authorized';

// Look types
export interface Look {
  id: string;
  name: string;
  isPinned: boolean;
  isCustom: boolean;
  layers: LookLayers;
}

export interface LookLayers {
  wallpaper?: string;
  tint?: string;
  logo?: string;
  pattern?: string;
  overlay?: string;
}

// Reaction types
export type ReactionCategory = 'all' | 'media' | 'text' | 'emoji';
export type ReactionLayout = 'fullScreen' | 'overShoulder' | 'slideMedia' | 'slidePresenter';

// Property change tracking
export interface PropertyChange {
  key: string;
  value: unknown;
  timestamp: number;
}
```

---

## Files to Create/Modify

### New Files
| File | Description |
|------|-------------|
| `src/pages/features/looks.page.ts` | Looks system page object |
| `src/pages/features/reactions.page.ts` | Reactions page object |
| `src/pages/features/virtual-camera.page.ts` | Virtual camera page object |
| `src/pages/features/enhancements.page.ts` | Enhancements page object |
| `src/pages/features/nametag.page.ts` | Name tag page object |
| `src/pages/features/away-screen.page.ts` | Away screen page object |
| `src/helpers/hybrid-bridge.ts` | Enhanced bridge helper using gHybrid |
| `tests/looks/*.spec.ts` | Looks test suites |
| `tests/reactions/*.spec.ts` | Reactions test suites |
| `tests/virtual-camera/*.spec.ts` | Virtual camera test suites |
| `tests/bridge/*.spec.ts` | Bridge communication tests |
| `tests/smoke/app-launch.spec.ts` | Smoke tests |

### Modified Files
| File | Changes |
|------|---------|
| `src/fixtures/airtime.fixture.ts` | Add new page fixtures |
| `src/types/airtime.types.ts` | Add new type definitions |
| `src/pages/camera.page.ts` | Refactor to use feature pages |

---

## Verification Plan

### How to verify changes work:

1. **Run smoke tests**: `npm run test:smoke`
2. **Test individual features**:
   ```bash
   npm test -- --grep "looks"
   npm test -- --grep "virtual-camera"
   npm test -- --grep "bridge"
   ```
3. **Verify bridge communication**:
   - Check `gHybrid` object is accessible
   - Verify property changes are intercepted
   - Test capability queries return expected states
4. **Visual verification**:
   - Use `npm run test:headed` to watch tests
   - Check screenshots in `screenshots/` directory

---

## Implementation Order

1. **Types first** - Add all type definitions
2. **Bridge helper** - Create HybridBridge class
3. **Feature page objects** - One at a time (Looks → Reactions → VirtualCamera → etc.)
4. **Update fixtures** - Wire up new pages
5. **Test suites** - Create tests as pages are completed
6. **Smoke tests** - Add basic launch verification

---

## Source Code References

### Web Layer (mmhmm-camera-development/teleport/)
- `looks/looks_controller.js` - Looks state management
- `looks/ui/` - Look editing UI components
- `media/` - Media and reactions handling
- `stage/reaction_overlay.js` - Reaction display
- `hybrid/bridge.js` - Web-to-native bridge
- `hybrid/virtual_camera.js` - Virtual camera web API
- `widgets/` - Reusable UI components

### Native Layer (mmhmm-hybrid/)
- `renderer/hybrid_capabilities.h` - gHybrid V8 object definition
- `common/virtual_camera.h` - Virtual camera states and API
- `common/app_capabilities.h` - Camera/mic capability states
- `browser/client_handler.cc` - Browser process message handling
- `renderer/js_callback_handler.cc` - JS callback handling

---

## Resume Instructions

To continue implementing this plan in a new session:

1. Open the project: `cd /Users/quinn/Developer/test automation`
2. Reference this file: `TEST_RESTRUCTURE_PLAN.md`
3. Start with Phase 1 (Types) or whichever phase you want to begin
4. Use the source code references to find actual selectors and patterns
