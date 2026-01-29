# Looks Pane Documentation

## Overview

The Looks Pane manages the visual presentation layer of `Airtime Camera`. It handles everything from looks (visual presets), reactions, wallpapers, and camera controls.

The pane is designed to be a central hub for managing all visual aspects of a presentation, including:
- Visual presets (looks)
- Real-time reactions and overlays
- Background/wallpaper management
- Camera and presenter controls
- Name badge customization

## Architecture

### Core Components

1. **LooksSidebarPane** (`looks_pane.js`)
   - Main controller class that orchestrates all looks-related functionality
   - Extends `SidebarPane` to integrate with the sidebar system
   - Manages state transitions and UI updates
   - Handles communication between different subcomponents
   - Coordinates with the stage for visual updates

2. **Key Subcomponents**
   - `LooksIdlePanel`:
     - Handles the main idle state UI
     - Manages the grid of available looks and reactions
     - Handles drag and drop operations
     - Controls the visibility of camera preview

   - `SettingsPanel`:
     - Manages look settings and customization
     - Handles style settings (watermarks, etc.)
     - Controls overlay settings (name badges)
     - Manages virtual background settings

   - `ReactionSettingsPanel`:
     - Controls reaction-specific settings
     - Manages GIPHY integration
     - Handles reaction positioning and scaling
     - Controls reaction text editing

   - `NameBadgeHandler`:
     - Manages name badge/nametag functionality
     - Handles font management
     - Controls color customization
     - Manages layout options

   - `WallpaperSettings`:
     - Handles background/wallpaper management
     - Controls room selection
     - Manages custom wallpaper uploads
     - Handles wallpaper scaling and positioning

### State Management

The pane uses a state machine pattern with the following states:
```javascript
#states = {
    IDLE: "looks.idle",                    // Default state showing available looks
    SETTINGS_NEW_LOOK: "looks.settings.new", // Creating a new look
    SETTINGS: "looks.settings",            // Editing an existing look
    REACTIONS_SETTINGS: "reactions.settings" // Editing reactions
};
```

State transitions are managed through the `#setState()` method:
```javascript
#setState(state) {
    this.state = state;
    this.pane?.setAttribute("data-state", state);
    this.#makeSubpanelsInert();

    // Handle specific state transitions
    if (state.startsWith(this.#states.IDLE)) {
        this.pane.querySelector(`[data-id="${LooksIdlePanel.id}"]`).inert = false;
    }
    // ... handle other states
}
```

## Event Handling System

### Data-Attribute Based Event Handling

The pane uses a data-attribute based event handling system. This approach provides several benefits:
- Decouples event handling from HTML structure
- Makes it easy to add new actions
- Provides a consistent pattern for handling user interactions
- Simplifies debugging and maintenance

1. **Action Definition**
```javascript
#actions = {
    backToIdle: "back-to-idle",
    removeActiveLook: "remove-active-look",
    selectItem: "select-item",
    selectWallpaper: "select-wallpaper",
    addWallpaper: "add-wallpaper",
    dropWallpaper: "drop-wallpaper",
    setState: "set-state",
    addLook: "add-look",
    editLook: "edit-look",
    shareLook: "share-look",
    duplicateActiveLook: "duplicate-active-look",
    // ... more actions
};
```

2. **Event Handler Registration**
```javascript
#addEventListeners() {
    // The callback function will receive `element.dataset`
    const handlers = {
        [this.#actions.setState]: ({ state }) => this.#setState(state),
        [this.#actions.backToIdle]: () => this.#backToIdle(),
        [this.#actions.showMenu]: (_, event) => this.#showAccountMenu(event),
        [this.#actions.editLook]: () => this.#onEditCurrentLook(),
        [this.#actions.duplicateActiveLook]: () => this.#onDuplicateCurrentLook(),
        [this.#actions.removeActiveLook]: () => this.#removeActiveLook(),
        [this.#actions.shareLook]: () => this.#onShareCurrentLook(),
        // ... more handlers
    };

    this.#handleClick = this.#createClickHandler(handlers);
    this.pane?.addEventListener("click", this.#handleClick);
    this.pane?.addEventListener("change", this.#handleOnChange);
    this.pane?.addEventListener("input", this.#handleOnInputChange);
}
```

3. **Click Handler Creation**
```javascript
#createClickHandler(handlers) {
    return (ev) => {
        let item = ev.target.closest("[data-action]");
        if (!item) return;

        const action = item.dataset.action;
        const handler = handlers[action];

        if (handler) {
            ev.stopPropagation();
            // passing dataset for use cases where you click on a item
            // and need to pass an id along, e.g: `data-id=123`
            handler(item.dataset, ev);
        } else {
            console.log("🍋 [Unhandled Click Bubbling Up]", { action });
        }
    };
}
```

### Using Data-Attributes in HTML

Example of how to use data-attributes in your HTML:
```html
<!-- Action with additional data -->
<button data-action="edit-item" data-id="123" data-type="look">
    Edit Look
</button>

<!-- Action with state change -->
<button data-action="set-state" data-state="looks.settings">
    Open Settings
</button>
```

## Key Features

### 1. Look Management
- **Creating new looks**
  ```javascript
  async #onAddLook() {
      const look = await this.controller.createLook();
      if (!look) {
          console.error("Error creating new look");
          return;
      }
      this.controller.currentLook = look;
      this.settingsPanel.setActiveTab(SettingsPanel.tabIds.STYLE);
      this.#setState(this.#states.SETTINGS_NEW_LOOK);
  }
  ```

- **Editing existing looks**
  ```javascript
  async #onEditCurrentLook() {
      const look = this.controller.currentLook;
      if (look) {
          this.#setState(this.#states.SETTINGS);
          LooksAnalytics.onEditLook(look.identifier);
      }
  }
  ```

- **Duplicating looks**
  ```javascript
  async #onDuplicateLook(look) {
      const slide = await this.controller.duplicateLook(look);
      if (slide == null) return;

      let newTitle = slide.title ?? "";
      if (newTitle.length > 0) {
          newTitle += " ";
      }
      newTitle += LocalizedString("Copy");
      this.#updateLookTitle(newTitle);
  }
  ```

- **Sharing looks**
  ```javascript
  async #onShareCurrentLook() {
      const slide = this.controller.currentLook;
      if (!slide) {
          this.#onShareApp();
          return;
      }

      const sharing = this.controller.sharing;
      const sheet = new LooksShareSheet(sharing, slide, LooksContentType.Look);
      sheet.displayAsModal();
  }
  ```

### 2. Reaction System
- **Adding reactions**
  ```javascript
  async #addNewReaction(media) {
      if (media.isGIPHY === true) {
          const style = SharedUserDefaults.getValueForKey(this.#defaultsKeyGIPHYStyle);
          const position = SharedUserDefaults.getValueForKey(this.#defaultsKeyGIPHYPosition);
          const scale = SharedUserDefaults.getValueForKey(this.#defaultsKeyGIPHYScale);
          await this.controller.createReaction(media, style, position, scale);
      } else {
          await this.controller.createReaction(media);
      }
  }
  ```

- **Editing reaction properties**
  ```javascript
  #onEditReactionStyle(value) {
      const reaction = this.controller.currentReaction;
      if (!reaction) return;

      this.controller.updateReactionStyle(reaction, value);
      const positionEditable = value == LooksReactionLayout.OverTheShoulder;
      this.reactionSettings.reactionLayoutChanged(positionEditable, anchor, scale);
  }
  ```

### 3. Wallpaper/Background Management
- **Custom wallpaper upload**
  ```javascript
  async #onWallpapersDrop(dataTransfer) {
      try {
          const media = await this.controller.createMediaFromDataTransfer(dataTransfer);
          if (media == null) {
              console.error("No media created from data transfer");
              return;
          }
          this.#addNewWallpaper(media);
      } catch (err) {
          console.error("Error creating new custom room from drop", err);
      }
  }
  ```

- **Default room management**
  ```javascript
  #getDefaultRecentRooms(maxCount = 20) {
      const rooms = [];
      const recents = this.roomsStore.recentRooms;
      rooms.push(...recents);

      // If the current room isn't in recents, add it to the front
      const currentRoom = this.stage.room;
      if (currentRoom && !rooms.includes(currentRoom)) {
          rooms.unshift(currentRoom);
          this.roomsStore.addRoomToRecents(currentRoom);
      }

      return rooms.slice(0, maxCount);
  }
  ```

### 4. Name Badge System
- **Customizable name badges**
  ```javascript
  #onShowNametagStyleSheet(target) {
      const look = this.controller.currentLook;
      const customNametagStyles = this.controller.listCustomNametagStyles();

      const onChange = (styleId) => {
          const customNametag = customNametagStyles.find((s) => s.style.id === styleId);
          if (customNametag) {
              this.nameBadgeHandler.useCustomNametag(look, customNametag);
          } else {
              this.nameBadgeHandler.changeStyle(look, styleId);
          }
      };

      this.nameBadgeSettings.showNametagStylesSheet(target, customNametagStyles, onChange);
  }
  ```

### 5. Camera Controls
- **Camera device selection**
  ```javascript
  #onChangeCamera(deviceId) {
      const presenter = this.stage.localPresenter;
      const device = presenter.deviceWithID(deviceId);
      presenter.videoDevice = device;
      if (presenter.videoTrackEnabled == false) {
          presenter.videoTrackEnabled = true;
      }
  }
  ```

### Adding a New Action

1. Add the action to the `#actions` object:
```javascript
#actions = {
    // ... existing actions
    newAction: "new-action"
};
```

2. Add the handler to the handlers object:
```javascript
const handlers = {
    // ... existing handlers
    [this.#actions.newAction]: (data, ev) => this.#handleNewAction(data, ev)
};
```

3. Implement the handler method:
```javascript
#handleNewAction(data, ev) {
    // Implementation
    try {
        // Do something
        this.#setState(this.#states.SOME_STATE);
    } catch (err) {
        console.error("Error handling new action", err);
    }
}
```

### Managing State Transitions

```javascript
#setState(state) {
    this.state = state;
    this.pane?.setAttribute("data-state", state);
    this.#makeSubpanelsInert();

    // Handle specific state transitions
    if (state.startsWith(this.#states.IDLE)) {
        this.pane.querySelector(`[data-id="${LooksIdlePanel.id}"]`).inert = false;
    }

    if (state.startsWith(this.#states.REACTIONS_SETTINGS)) {
        this.pane.querySelector(`[data-id="${ReactionSettingsPanel.id}"]`).inert = false;
    }

    if (state.startsWith(this.#states.SETTINGS)) {
        this.pane.querySelector(`[data-id="${SettingsPanel.id}"]`).inert = false;
    }
}
```

## Integration Points

### 1. Stage Integration
- **Camera controls**
  ```javascript
  #onVideoTrackEnabledChanged() {
      this.idlePanel.updateCameraButton(this.stage.localPresenter.videoTrackEnabled);
  }
  ```

- **Presenter positioning**
  ```javascript
  #onPresenterInsetChange(value) {
      const size = Stage.DefaultSize;
      const presenter = this.stage.localPresenter;
      presenter.fullscreen = false;
      presenter.scale = value;

      if (presenter.shape == Presenter.Shape.Rectangle) {
          presenter.anchor = Stage.Object.Anchor.Center;
      }
  }
  ```

### 2. Data Store Integration
- **Look persistence**
  ```javascript
  async #updateCurrentLookThumbnail() {
      const activeLook = this.#findActiveSlide();
      if (!activeLook) return;

      if (this.#useLiveThumbnails()) {
          if (this.stage.localPresenter.videoTrackEnabled) {
              this.#createStageSnapshot(activeLook, this.stage).then((img) => {
                  this.idlePanel.updateItemThumbnail(activeLook, img);
              });
          }
      } else {
          activeLook?.performPersistence().then((_) => {
              ThumbnailStorage.shared.delete(activeLook).then((_) => {
                  this.idlePanel.updateItemThumbnail(activeLook);
              });
          });
      }
  }
  ```

### 3. Analytics Integration
- **User actions tracking**
  ```javascript
  #onLookClicked(id) {
      const currentSelection = this.controller.currentLook;
      let analyticsId = null;
      if (currentSelection?.identifier == id) {
          this.controller.currentLook = null;
      } else {
          this.controller.currentLook = this.controller.lookWithIdentifier(id);
          analyticsId = id;
      }
      LooksAnalytics.onLookClicked(analyticsId);
  }
  ```


## Related Files

- `looks_pane.js`: Main controller
  - Handles core functionality
  - Manages state transitions
  - Coordinates between components

- `looks_idle_panel.js`: Idle state UI
  - Shows available looks
  - Handles grid layout
  - Manages drag and drop

- `settings_panel.js`: Settings management
  - Handles look customization
  - Manages style settings
  - Controls overlay options

- `name_badge_handler.js`: Name badge functionality
  - Manages name badge styles
  - Handles font management
  - Controls color options

- `catalog_looks.js`: Look catalog management
  - Handles look templates
  - Manages look categories
  - Controls look sharing

- `catalog_reactions.js`: Reaction catalog management
  - Handles reaction templates
  - Manages GIPHY integration
  - Controls reaction sharing

- `sharing.js`: Sharing functionality
  - Handles look sharing
  - Manages reaction sharing
  - Controls export options

- `analytics.js`: Analytics integration
  - Tracks user actions
  - Monitors performance
  - Logs errors
