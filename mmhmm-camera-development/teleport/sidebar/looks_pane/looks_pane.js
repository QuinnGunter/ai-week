//
//  sidebar/looks_pane/looks_pane.js
//  mmhmm
//
//  Created by Cristiano Oliveira on 1/28/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//
//

/**
 *
 */
class LooksSidebarPane extends ObservableObject {
    #observersRegistered = false;
    #shareAirtimeSheet = null;
    #chromaThresholdControls = null;

    #lookEditorOptions = null;
    #lookEditorSettings = null;

    #previouslySelectedLook = null;

    #toursController = null;
    #undoManager = null;

    #currentContextMenu = null;
    #notificationBanner = null;

    // Offscreen renderer for LUT thumbnails (avoids flashing main video)
    #lutThumbnailRenderer = null;

    /**
     * Used to control UI state and determine which view to show
     */
    #states = {
        IDLE: "looks.idle",
        SETTINGS_NEW_LOOK: "looks.settings.new",
        LOOKS_LIST: "looks.list",
        LOOK_SETTINGS: "looks.settings",
        REACTIONS_SETTINGS: "reactions.settings"
    };

    #cls = {
        sideBySide: "side-by-side",
        lookEditor: "look-editor",
        visualEditor: "visual-editor",
        stageNoPreview: "stage__no_preview",
        container: "looks",
        demo: "looks-demo",
        loading: "looks-loading",
        dropZone: "looks-drop-zone",
        dragging: `dragging`
    };

    #selector = {
        stageWrapper: "#stage_wrapper"
    };

    // event listener action keys attached to data-attr
    #actions = {
        backToIdle: "back-to-idle",
        selectTab: "select-tab",
        saveLookChanges: "save-look-changes",
        discardLookChanges: "discard-look-changes",
        saveDemoLook: "save-demo-look",
        shareDemoLook: "share-demo-look",

        showLooksCatalog: "show-looks-catalog",
        cancelSelectLook: "cancel-select-look",

        share: "share",

        // back: "back",
        selectItem: "select-item",
        selectPreset: "select-preset",

        returnToPresetsList: "return-to-presets-list",
        searchBrand: "search-brand",
        setPresenterBackgroundStyle: "set-presenter-background-style",
        setPresenterShape: "set-presenter-shape",
        editPresenterTint: "edit-presenter-tint",
        removePresenterTint: "remove-presenter-tint",

        updateLogoLayerContents: "update-logo-layer-contents",
        updatePatternLayerContents: "update-pattern-layer-contents",
        updateOverlayLayerContents: "update-overlay-layer-contents",
        updateWallpaperLayerContents: "update-wallpaper-layer-contents",

        selectWallpaper: "select-wallpaper",

        createBlankLook: "create-blank-look",
        deleteLook: "delete-look",
        importLook: "import-look",
        editLook: "edit-look",
        editPreset: "edit-preset",
        shareLook: "share-look",
        duplicateActiveLook: "duplicate-active-look",

        pinItem: "pin-item",
        unpinItem: "unpin-item",
        pinLook: "pin-look",
        unpinLook: "unpin-look",

        uploadReaction: "upload-reaction",
        dropReaction: "drop-reaction",
        duplicateReaction: "duplicate-reaction",
        deleteReaction: "delete-reaction",
        selectReaction: "select-reaction",
        editReaction: "edit-reaction",
        importReaction: "import-reaction",
        cancelReactionSearch: "cancel-reaction-search",
        showReactionStyleSelector: "show-reaction-style-selector",

        showNameBadgeStyles: "show-name-badge-styles",
        showColorPicker: "show-color-picker",
        editNametag: "edit-nametag",
        revertNametagColors: "revert-name-badge-colors",

        showMenu: "show-menu",
        showFontMenu: "show-font-menu",
        showCameraMenu: "show-camera-menu",
        showDemoCameraMenu: "show-demo-camera-menu",
        showContextMenu: "show-context-menu",
        showLookEditorContextMenu: "show-look-editor-context-menu",

        showLooksWidget: "show-looks-widget",
        toggleLook: "toggle-look",
        toggleLookOn: "toggle-look-on",
        toggleLookOff: "toggle-look-off",

        showNameTagWidget: "show-nametag-widget",
        toggleNameTag: "toggle-name-tag",
        toggleNameTagOn: "toggle-nametag-on",
        toggleNameTagOff: "toggle-nametag-off",

        showAwayWidget: "show-away-widget",
        toggleAway: "toggle-away",
        toggleAwayOn: "toggle-away-on",
        toggleAwayOff: "toggle-away-off",

        showEnhanceWidget: "show-enhance-widget",
        toggleEnhance: "toggle-enhance",
        toggleEnhanceOn: "toggle-enhance-on",
        toggleEnhanceOff: "toggle-enhance-off",

        showLUTWidget: "show-lut-widget",
        toggleLUT: "toggle-lut",
        toggleLUTOn: "toggle-lut-on",
        toggleLUTOff: "toggle-lut-off",

        showEdgeLightWidget: "show-edge-light-widget",
        toggleEdgeLight: "toggle-edge-light",
        toggleEdgeLightOn: "toggle-edge-light-on",
        toggleEdgeLightOff: "toggle-edge-light-off",

        selectAwayScreen: "select-camera-off-reaction",
        useDefaultAwayScreen: "remove-camera-off-reaction",
        showVirtualCameraMenu: "show-virtual-camera-menu",
        toggleSpeechReactions: "toggle-speech-reactions",
        toggleCallContext: "toggle-call-context",
    };

    #keyboardActionKeys = {
        deleteItemKey: "backspace",
        deleteItemAltKey: "delete",
        toggleCameraKey: "c",
        toggleAwayKey: "a",
        toggleNametagKey: "n",
        hideReactionKey: "h",
        toggleEnhanceKey: "f",
        closeWidgetKey: "escape",
        searchReactionsKey: "/",
    };
    #keyboardActionHandlers = null;

    #handleClick;
    #enableVideoTimeout;
    #currentVideoDeviceId;

    // Defaults keys
    #defaultsKeyNametagVisible = "nametagVisible";
    #defaultsKeyFiltersEnabled = "filtersEnabled";
    #defaultsKeyEnhancement = "filterEnhancement";
    #defaultsKeyComplements = "filterComplements";

    // Defaults keys for reactions
    #defaultsKeyNewReactionLayout = "newReactionLayout";
    #defaultsKeyNewReactionAnchor = "newReactionAnchor";
    #defaultsKeyNewReactionScale = "newReactionScale";

    #idlePanelLooksListLoaded = false;
    #showCreateFirstLookCoachmarkOnIdlePanelLoaded = false;
    #debouncedMediaNeedsPersistence = null;

    /**
     * @param {LooksController} controller
     * @param {Stage} stage
     * @param {DataStore} dataStore
     * @param {RoomsController} roomsStore our store of rooms/backgrounds/wallpapers
     */
    constructor(controller, stage, dataStore, roomsStore, accountUI, toursController, undoManager) {
        super();
        this.controller = controller;
        this.stage = stage;
        this.dataStore = dataStore;
        this.roomsStore = roomsStore;
        this.accountUI = accountUI;
        this.state = this.#states.IDLE;
        this.#toursController = toursController;
        this.#undoManager = undoManager;

        this.#activate();
        this.#initializeKeyboardShortcuts();
        this.#initializeHybridEventHandlers();

        this.#debouncedMediaNeedsPersistence = debounce((slide, media) => {
            this.controller.mediaNeedsPersistence(slide, media);
        }, 1000);
    }

    preferencesChanged() {
        this.#updateStageVisibility();
    }

    /**
     * Called when we become the active sidebar pane and should do our thing.
     */
    async #activate() {
        // Create the UI
        if (App.isDemo) {
            document.body.classList.add(this.#cls.demo);
        }
        this.#buildPane();

        this.#setState(this.#states.IDLE);

        // We may still be in the larger window size used for the look editor
        // In that case, we'd like to snap back to the smaller size, but doing
        // so immediately will cause the hybrid app to mistakely associate the
        // resize with Creator when switching from Creator to Camera.
        window.setTimeout(() => {
            this.#resizeToSmallIfNecessary();
            this.#setWindowSizeLimits(
                LooksSidebarPane.WindowSizes.MinimumSmall,
                LooksSidebarPane.WindowSizes.MaximumSmall
            );
        }, 200);

        gApp.registerKeyboardObserver(this);

        // Ensure the controller is initialized
        try {
            await this.controller.initializationPromise;
        } catch (err) {
            return;
        }

        this.controller.setReactionControlsOverlay(this.#createReactionControlOverlay());

        if (!App.isDemo) {
            this.presetsPanel.setSharing(this.controller.sharing);
            this.reactionsPanel.setSharing(this.controller.sharing);
        }

        // Restore the nametag on/off setting
        const nametagPreference = App.isDemo ? false :
            SharedUserDefaults.getValueForKey(this.#defaultsKeyNametagVisible, true);
        let showNametag = nametagPreference;
        if (this.controller.createdLooksPresentation) {
            // Let the controller decide on first launch...
            showNametag = this.controller.nametagVisible;
        }
        this.nameBadgeSettings.nametagVisible = showNametag;
        this.widgetBar.nametagEnabled = showNametag;
        this.nametagWidget.setNametagEnabled(showNametag);

        // See if the user has a demo look to be imported
        let demoLook = null;
        if (this.controller.isAuthenticated) {
            demoLook = await this.#importUserDemoLook();
        }

        // Initialize various parts of the UI
        this.#onLooksSlidesChanged().then(() => {
            this.#onCurrentLookChanged(this.controller.currentLook);
            this.#onSelectedLookChanged(this.controller.selectedLook);
        });
        this.#onReactionsSlidesChanged();
        this.#onRoomsChanged();
        this.#onFiltersChanged();
        this.#onVideoTrackEnabledChanged();
        this.#onAwayScreenChanged();
        this.#onDefaultReactionLayoutChanged();
        this.#onIsVirtualCameraActiveChanged();

        // Watch for data changes
        this.#setupObservers();
        this.#setupSpeechReactionsObservers();
        this.#addDragAndDropHandlers();

        // React to user input
        this.#addEventListeners();

        // See if this is the marketing website demo
        if (App.isDemo === true) {
            this.#onLaunchDemoApp().then(() => {
                // Notify the app that we're ready to be used in demo mode
                gApp.onAppReady();
            });
            return;
        }

        this.#initializeHybrid();

        this.#showLaunchCoachmarks(this.controller.createdLooksPresentation === true, demoLook != null);
    }

    async #onLaunchDemoApp() {
        // See if there's a demo look to start with
        const searchParams = new URL(window.parent.location).searchParams;
        if (searchParams.has("lookId")) {
            const id = searchParams.get("lookId");
            const look = await this.#importDemoLook(id).catch((err) => {
                console.error("Error importing demo look", id, err);
            });
            if (look) {
                await this.#onEditCurrentLook();
                return;
            }
        }

        let preset = LookPreset.Tinted.Preset;
        let variant = null;

        const iframeSearchParams = new URL(window.location).searchParams;
        if (searchParams.has("p") || iframeSearchParams.has("p")) {
            // This specifies both the order of presets and the one to start with
            const presetId = iframeSearchParams.get("p") || searchParams.get("p");
            if (presetId == "halloween") {
                preset = LookPresets.Halloween()[0];
                this.presetsPanel.setPresets([
                    ...LookPresets.Halloween(),
                    ...LookPresets.Standard(),
                    LookPresets.Blank,
                ]);
            } else if (presetId == "brands") {
                preset = LookPresets.FictionalBrands()[0];
                this.presetsPanel.setPresets([
                    ...LookPresets.FictionalBrands(),
                    ...LookPresets.Standard(),
                    LookPresets.Blank,
                ]);
            } else if (presetId == "holiday") {
                preset = LookPreset.Holiday.Preset;
            } else {
                // See if we can find the preset by ID
                const parts = presetId.split("_");
                const match = LookPresets.presetWithId(parts[0]);
                if (match) {
                    preset = match;
                }
                if (parts.length > 1) {
                    variant = preset.getVariantWithId(parts[1]);
                }
            }
        }

        if (variant == null) {
            variant = preset.getVariants()[0];
        }
        this.lookSettings && (this.lookSettings.enablePresets = true);

        // Split test what happens next
        const experiment = await this.#getDemoExperiment();
        if (experiment.preset) {
            preset = experiment.preset;
            variant = experiment.presetVariant ?? preset.getVariants()[0];
        }

        await this.#onSelectPresetInDemoApp(preset.id, variant?.id);
        this.#enterLookEditor(this.#states.SETTINGS_NEW_LOOK);

        if (experiment.group == "editor") {
            this.#editCurrentPreset();
            if (preset == LookPresets.Spooky) {
                this.#onUpdatePatternLayerContents();
            }
        } else {
            this.#onReturnToPresetsList();
        }
    }

    #getSplitTestOverride() {
        return Flags.getConfig()["variant"];
    }

    #enableStatsigTesting() {
        // We don't want to do statsig testing if we're not running in an iframe on the website
        if (window.self === window.top) {
            return false;
        }

        // We don't want to do statsig testing in our user testing environment
        const url = window.top.location.href;
        if (url.includes("usertest")) {
            return false;
        }

        return true;
    }

    async #getDemoExperiment() {
        // See https://console.statsig.com/6CwCptI2DyGWt2mwX27x60/experiments
        const experimentName = "camera_demo_5_-_preset_variants";

        const result = {
            group: "control",
        };

        // For testing only
        const splitTestOverride = this.#getSplitTestOverride();
        if (splitTestOverride) {
            result.group = splitTestOverride;
            return result;
        // } else if (gLocalDeployment == true) {
        //     result.preset = LookPreset.Tinted.Preset;
        //     result.presetVariant = result.preset.getVariants()[0];
        //     return result;
        } else if (!this.#enableStatsigTesting()) {
            return result;
        }

        try {
            const statsig = Statsig.default;
            const experiment = await Statsig.default.waitUntilInitialized().then(
                () => statsig.getExperiment(experimentName)
            );
            if (experiment && experiment.groupName) {
                LooksAnalytics.onDemoExperimentStarted(experimentName, experiment.groupName);
                result.group = experiment.groupName;
            }
        } catch (err) {
            console.error("Error initializing Statsig:", err);
        }

        return result;
    }

    #trackDemoLookSavedEvent() {
        // This allows us to track the results of our Statsig split testing
        // We'll optimize for the percentage of users who click the "Use this look" button
        Statsig.default.logEvent("camera_demo_use_this_look");
    }

    async #startNewLookTour() {
        const look = this.controller.currentLook;

        // Randomly choose a tint
        const paint = LooksColors.randomGradientTint();
        this.#onSetPresenterTint(paint);

        // Randomly chooses a pattern
        const pattern = LookPatterns.random();
        await this.#onReplacePatternLayer(look, pattern);

        // Show the tint options panel
        this.#editPresenterTint();

        // Start the tour
        // TODO only once per user?
        this.#toursController.startTour(new LookBuilderTour(this));
    }

    showTintOptions() {
        this.#onEditPresenterTint();
    }

    async showPatternOptions() {
        await this.#onUpdatePatternLayerContents();
    }

    async #onSelectPreset(id, variantId = null) {
        if (App.isDemo) {
            this.#onSelectPresetInDemoApp(id, variantId);
            return;
        }

        // We want to create a slide from the preset and put it on stage so the
        // user can see what it looks like, but we don't want to persist it yet.
        // If they then change presets, we want to simply delete the slide, such
        // that it never gets persisted on the service.

        // We could do this in a few ways:
        // - Create a temporary Presentation.Accountless in which we create the slide,
        //   then create a normal instance of the slide when they click "OK".
        //   If we allow the user to eidt the slide, we'd need to copy over the modifications
        //   as well...
        // - Create the slide in the normal looks presentation, but create it without
        //   persisting it, and delete it if they change presets or click "Cancel".
        //   This seems better long-term, but fussier to get working correctly quickly -
        //   we'll need a way to know if the slide has ever been persisted, and if not,
        //   splice it out of the presentation's slide list.

        // Regardless, there are two actions:
        // 1. Select the preset you want to try on, which doesn't persist it
        // 2. Continue with that preset, which persists it

        const preset = LookPresets.presetWithId(id);
        if (!preset) {
            return;
        }
        let variant = null;
        if (variantId) {
            variant = preset.getVariantWithId(variantId);
            if (!variant) {
                console.error("Unknown preset variant selected", id, variantId);
                return;
            }
        }

        // If it's already selected, don't re-create it
        if (id == this.presetsPanel.getSelectedItemId() && variantId == this.presetsPanel.getSelectedVariantId()) {
            return;
        }

        LooksAnalytics.onLookPresetClicked(preset.id);

        const panel = this.presetsPanel;
        panel.showLoadingState(id, variantId);

        let slide = null;
        try {
            slide = await this.controller.createLookFromPresetWithoutPersisting(preset, variant);
            if (slide) {
                LooksAnalytics.onLookCreated(slide.id, preset.id);
                this.#selectLookBypassingTransition(slide);
                panel.setSelectedItemId(preset.id, variant?.id);

                // For some looks we immediately enter the look editor
                if (preset.automaticallyEnterEditor || variant?.automaticallyEnterEditor) {
                    this.#onEditCurrentLook();
                    if (preset == LookPresets.Branded) {
                        this.#onSearchBrand();
                    }
                }
            }
        } catch (err) {
            console.error("Error creating look from preset", err);
            return;
        } finally {
            window.setTimeout(() => {
                panel.hideLoadingState();
            }, 300);
        }
    }

    /**
     * Called when a Demo app user selects a preset from the presets panel
     * in the left sidebar.
     * @param {String} id
     * @param {String|null} variantId
     */
    async #onSelectPresetInDemoApp(id, variantId = null) {
        const preset = LookPresets.All().find(p => p.id == id);
        if (!preset) {
            console.error("Unknown preset selected", id);
            return;
        }

        let variant = null;
        if (variantId) {
            variant = preset.getVariantWithId(variantId);
            if (!variant) {
                console.error("Unknown preset variant selected", id, variantId);
                return;
            }
        }

        if (id == this.presetsPanel.getSelectedItemId() && variantId == this.presetsPanel.getSelectedVariantId()) {
            if (preset.automaticallyEnterEditor || variant?.automaticallyEnterEditor) {
                this.#editCurrentPreset();
            }
            return;
        }

        LooksAnalytics.onLookPresetClicked(preset.id, variant?.id);

        // All we do here is put the preset on stage
        const panel = this.presetsPanel;
        panel.showLoadingState(id, variantId);
        this.editorTopBar.disabled = true;
        this.lookSettingsPanel.setDemoFooterCTADisabled(true);
        try {
            const slide = await this.controller.createLookFromPreset(preset, variant);
            if (slide) {
                this.#selectLookBypassingTransition(slide);
                this.lookSettings.updatePresenterSettings();
                panel.setSelectedItemId(preset.id, variant?.id);

                // For some looks we turn on the name tag
                this.controller.nametagVisible = preset.isNametagVisibleByDefault();

                // For some looks we immediately enter the look editor
                if (preset.automaticallyEnterEditor || variant?.automaticallyEnterEditor) {
                    this.#editCurrentPreset();
                    if (preset == LookPresets.Branded) {
                        this.#onSearchBrand();
                    }
                }
            }
        } finally {
            window.setTimeout(() => {
                panel.hideLoadingState();
                this.editorTopBar.disabled = false;
                this.lookSettingsPanel.setDemoFooterCTADisabled(false);
            }, 300);
        }
    }

    async #onEditCurrentPreset() {
        this.#editCurrentPreset();

        // Figure out which preset is currently selected
        const panel = this.presetsPanel;
        const presetId = panel.getSelectedItemId();
        const variantId = panel.getSelectedVariantId();
        LooksAnalytics.onEditLook(this.controller.currentLook?.identifier, presetId, variantId);
    }

    async #editCurrentPreset() {
        this.lookSettingsPanel.setActiveTab(LookSettingsPanel.tabIds.STYLE);
        this.#selectInitialLookEditorLayer(this.controller.currentLook);
    }

    async #onReturnToPresetsList() {
        this.#dismissLookEditorToolbars();
        this.lookSettingsPanel.setActiveTab(LookSettingsPanel.tabIds.PRESET);
        LooksAnalytics.onShowPresetsList();

    }

    #initializeKeyboardShortcuts() {
        const actionKeys = this.#keyboardActionKeys;
        this.#keyboardActionHandlers = {
            [actionKeys.deleteItemKey]: this.#handleDeleteKeyboardEvent.bind(this),
            [actionKeys.deleteItemAltKey]: this.#handleDeleteKeyboardEvent.bind(this),
            [actionKeys.toggleCameraKey]: this.#handleToggleCameraEnabledKeyboardEvent.bind(this),
            [actionKeys.toggleAwayKey]: this.#handleToggleAwayKeyboardEvent.bind(this),
            [actionKeys.toggleNametagKey]: this.#handleToggleNametagKeyboardEvent.bind(this),
            [actionKeys.hideReactionKey]: this.#handleHideReactionKeyboardEvent.bind(this),
            [actionKeys.toggleEnhanceKey]: this.#handleToggleEnhanceKeyboardEvent.bind(this),
            [actionKeys.closeWidgetKey]: this.#handleCloseWidgetKeyboardEvent.bind(this),
            [actionKeys.searchReactionsKey]: this.#handleSearchReactionsKeyboardEvent.bind(this),
        }
    }

    handleKeyboardEvent(event) {
        if (App.isDemo) {
            return true;
        }

        // TODO handlers to add
        // - Cmd-1 through Cmd-9 should select(/deselect?) looks/visuals

        // Ignore events with modifiers
        if (
            event.repeat == true ||
            event.altKey == true ||
            event.metaKey == true ||
            event.ctrlKey == true
        ) {
            return true;
        }

        // Ignore the keydown, we react on keyup
        if (event.type != "keyup") {
            return true;
        }

        const key = event.key?.toLowerCase();
        const handler = this.#keyboardActionHandlers[key];
        if (handler != null) {
            handler();
        }

        // In Camera we'll block all other keyboard handlers
        // since they were never intended to be used in Camera
        return true;
    }

    async #handleDeleteKeyboardEvent() {
        if (this.state == this.#states.IDLE) {
            const controller = this.controller;
            if (controller.currentReaction) {
                this.#onDeleteCurrentReaction(true);
            }
        } else if (this.state == this.#states.LOOK_SETTINGS) {
            const selectedObject = this.stage.selectedObject;
            if (selectedObject) {
                const look = this.controller.currentLook;
                const logo = await look.getLogoMedia();
                if (selectedObject == logo) {
                    this.#onRemoveLogoLayer(look);
                }
            }
        }
    }

    async #setupObservers() {
        if (this.#observersRegistered) {
            return;
        }

        // Watch for presentation's contents to change
        NotificationCenter.default.addObserver(
            Presentation.Notifications.SlidesChanged,
            null,
            this.#onPresentationSlidesChanged,
            this
        );

        // Watch for slide thumbnails to change
        NotificationCenter.default.addObserver(
            Slide.Notifications.ThumbnailUpdated,
            null,
            this.onSlideThumbnailUpdated,
            this
        );

        // Watch for user preferences to change
        NotificationCenter.default.addObserver(
            UserDefaults.Notifications.DefaultChanged,
            null,
            this.#onUserDefaultChanged,
            this
        );

        // Watch for virtual camera clients to change
        NotificationCenter.default.addObserver(
            App.Notifications.VirtualCameraClientsChanged,
            null,
            this.#onVirtualCameraClientsChanged,
            this
        );

        this.stage.addObserverForProperty(this, "isVirtualCameraActive");

        this.#currentVideoDeviceId = this.stage.localPresenter.videoDevice?.deviceId;
        this.stage.localPresenter.addObserverForProperty(this, "videoDevice");
        this.stage.localPresenter.addObserverForProperty(this, "videoTrackEnabled");

        this.#currentVideoDeviceId = this.stage.localPresenter.videoDevice?.deviceId;
        this.stage.localPresenter.addObserverForProperty(this, "videoDevice");

        // Watch for selected objects to change
        this.controller.addObserverForProperty(this, "currentLook");
        this.controller.addObserverForProperty(this, "selectedLook");
        this.controller.addObserverForProperty(this, "currentReaction");

        // Watch for recent rooms (wallpapers) to change
        this.stage.addObserverForProperty(this, "room");
        this.roomsStore.addObserverForProperty(this, "rooms");
        this.roomsStore.addObserverForProperty(this, "recentRooms");

        this.#observersRegistered = true;
    }

    #removeObservers() {
        if (!this.#observersRegistered) {
            return;
        }

        NotificationCenter.default.removeObserver(
            Presentation.Notifications.SlidesChanged,
            null,
            this.#onPresentationSlidesChanged,
            this
        );

        NotificationCenter.default.removeObserver(
            Slide.Notifications.ThumbnailUpdated,
            null,
            this.onSlideThumbnailUpdated,
            this
        );

        NotificationCenter.default.removeObserver(
            UserDefaults.Notifications.DefaultChanged,
            null,
            this.#onUserDefaultChanged,
            this
        );

        this.stage.removeObserverForProperty(this, "isVirtualCameraActive");
        this.stage.localPresenter.removeObserverForProperty(this, "videoDevice");
        this.stage.localPresenter.removeObserverForProperty(this, "videoTrackEnabled");

        this.controller.removeObserverForProperty(this, "currentLook");
        this.controller.removeObserverForProperty(this, "selectedLook");
        this.controller.removeObserverForProperty(this, "currentReaction");

        // Don't remove our observer for the localPresenter's cameras,
        // we want to keep our selector up-to-date
        // TODO that presumably means we'll end up with duplicate observers

        // Watch for recent rooms (wallpapers) to change
        this.stage.removeObserverForProperty(this, "room");
        this.roomsStore.removeObserverForProperty(this, "rooms");
        this.roomsStore.removeObserverForProperty(this, "recentRooms");

        this.#observersRegistered = false;
    }

    /**
     * - handlers handle click events
     *  - `click` events: will count on a `data-action` attribute. They may have other data attributes to help with the action
     *  - `change, input` events: are handled as form inputs with `name` + `value`
     */
    #addEventListeners() {
        const handlers = {
            /* App actions */
            [this.#actions.showMenu]: (_, event) => this.#showAccountMenu(event),
            [this.#actions.showCameraMenu]: (_, event) => this.#showCameraMenu(event),
            [this.#actions.backToIdle]: () => this.#backToIdle(),
            [this.#actions.showVirtualCameraMenu]: (_, event) => this.#onShowVirtualCameraMenu(event),
            [this.#actions.showContextMenu]: (dataset, event) => this.#showContextMenu(dataset, event),
            [this.#actions.toggleSpeechReactions]: () => this.#onToggleSpeechReactions(),
            [this.#actions.toggleCallContext]: () => this.#onToggleCallContext(),

            /* Demo mode actions */
            [this.#actions.showDemoCameraMenu]: (_, event) => this.#showDemoCameraMenu(event),
            [this.#actions.saveDemoLook]: () => this.#onSaveDemoLook(),
            [this.#actions.shareDemoLook]: () => this.#onShareDemoLook(),
            [this.#actions.editPreset]: () => this.#onEditCurrentPreset(),
            [this.#actions.returnToPresetsList]: () => this.#onReturnToPresetsList(),

            /* Catalog actions */
            [this.#actions.showLooksCatalog]: () => this.#onShowLooksCatalog(),
            [this.#actions.importLook]: ({ id }) => this.#onImportLookFromCatalog(id),
            [this.#actions.selectPreset]: ({ id, variant }) => this.#onSelectPreset(id, variant),
            [this.#actions.cancelSelectLook]: () => this.#onCancelLooksCatalog(),

            /* Look actions */
            [this.#actions.createBlankLook]: () => this.#createBlankLook(false),
            [this.#actions.editLook]: () => this.#onEditCurrentLook(),
            [this.#actions.duplicateActiveLook]: () => this.#onDuplicateCurrentLook(),
            [this.#actions.deleteLook]: () => this.#deleteCurrentLook(false),
            [this.#actions.pinLook]: () => this.#onPinCurrentLook(),
            [this.#actions.unpinLook]: () => this.#onUnpinCurrentLook(),

            /* Presenter actions */
            [this.#actions.setPresenterBackgroundStyle]: ({ value }) => this.#onSetPresenterBackgroundStyle(value),
            [this.#actions.setPresenterShape]: ({ value }) => this.#onSetPresenterShape(value),
            [this.#actions.editPresenterTint]: (_, _event, element) => this.#onEditPresenterTint(element),
            [this.#actions.removePresenterTint]: () => this.#onRemovePresenterTint(),

            /* Look editor actions */
            [this.#actions.selectTab]: ({ tab }) => this.#onSelectTab(tab),
            [this.#actions.saveLookChanges]: () => this.#onSaveLookChanges(),
            [this.#actions.discardLookChanges]: () => this.#onDiscardLookChanges(),
            [this.#actions.showLookEditorContextMenu]: (_, event) => this.#showLookEditorContextMenu(event),
            [this.#actions.searchBrand]: () => this.#onSearchBrand(),
            [this.#actions.updateLogoLayerContents]: (_, _event, element) => this.#onUpdateLogoLayerContents(element),
            [this.#actions.updatePatternLayerContents]: (_, _event, element) => this.#onUpdatePatternLayerContents(element),
            [this.#actions.updateOverlayLayerContents]: (_, _event, element) => this.#onUpdateOverlayLayerContents(element),
            [this.#actions.updateWallpaperLayerContents]: (_, _event, element) => this.#onUpdateWallpaperLayerContents(element),
            [this.#actions.selectWallpaper]: ({ id }) => this.#onRoomThumbnailClick(id),

            /* Is this just for reactions at this point */
            [this.#actions.pinItem]: ({ id, type }) => this.#onPinItem(id, type),
            [this.#actions.unpinItem]: ({ id, type }) => this.#onUnpinItem(id, type),
            [this.#actions.selectItem]: ({ id, type, message }) => this.#onSelectItem(id, type, message),

            /* Sharing */
            [this.#actions.share]: () => this.#onShare(),
            [this.#actions.shareLook]: () => this.#onShareCurrentLook(),

            /* Widgets */
            [this.#actions.showLooksWidget]: () => this.#onShowLooksWidget(),
            [this.#actions.showNameTagWidget]: () => this.#onShowNameTagWidget(),
            [this.#actions.showAwayWidget]: () => this.#onShowAwayWidget(),
            [this.#actions.showEnhanceWidget]: () => this.#onShowEnhanceWidget(),
            [this.#actions.showLUTWidget]: () => this.#onShowLUTWidget(),
            [this.#actions.showEdgeLightWidget]: () => this.#onShowEdgeLightWidget(),
            [this.#actions.toggleLook]: () => this.#onToggleLook(),
            [this.#actions.toggleLookOn]: () => this.#onToggleLookOn(),
            [this.#actions.toggleLookOff]: () => this.#onToggleLookOff(),
            [this.#actions.toggleNameTag]: () => this.#onToggleNameTag(),
            [this.#actions.toggleNameTagOn]: () => this.#onToggleNameTagOn(),
            [this.#actions.toggleNameTagOff]: () => this.#onToggleNameTagOff(),
            [this.#actions.toggleAway]: () => this.#onToggleAway(),
            [this.#actions.toggleAwayOn]: () => this.#onToggleAwayOn(),
            [this.#actions.toggleAwayOff]: () => this.#onToggleAwayOff(),
            [this.#actions.toggleEnhance]: () => this.#onToggleEnhance(),
            [this.#actions.toggleEnhanceOn]: () => this.#onToggleEnhanceOn(),
            [this.#actions.toggleEnhanceOff]: () => this.#onToggleEnhanceOff(),
            [this.#actions.toggleLUT]: () => this.#onToggleLUT(),
            [this.#actions.toggleLUTOn]: () => this.#onToggleLUTOn(),
            [this.#actions.toggleLUTOff]: () => this.#onToggleLUTOff(),
            [this.#actions.toggleEdgeLight]: () => this.#onToggleEdgeLight(),
            [this.#actions.toggleEdgeLightOn]: () => this.#onToggleEdgeLightOn(),
            [this.#actions.toggleEdgeLightOff]: () => this.#onToggleEdgeLightOff(),

            /** Reactions */
            [this.#actions.deleteReaction]: () => this.#onDeleteCurrentReaction(false),
            [this.#actions.duplicateReaction]: () => this.#onDuplicateCurrentReaction(),
            [this.#actions.selectReaction]: ({ id }) => this.#onReactionClicked(id),
            [this.#actions.editReaction]: () => this.#onEditReaction(),
            [this.#actions.selectAwayScreen]: ({ id }) => this.#onSelectAwayScreenById(id),
            [this.#actions.useDefaultAwayScreen]: () => this.#onUseDefaultAwayScreen(),
            [this.#actions.cancelReactionSearch]: () => this.#onCancelReactionSearch(),
            [this.#actions.showReactionStyleSelector]: (_, ev) => this.#onShowReactionStyleMenu(ev),

            /** Nametags */
            [this.#actions.showNameBadgeStyles]: (_, ev) => this.#onShowNametagStyleSheet(ev.target),
            [this.#actions.showColorPicker]: ({ name }) => this.#onShowNametagColorPickerSheet(name),
            [this.#actions.editNametag]: () => this.#onEditNametag(),
            [this.#actions.showFontMenu]: (_, event) => this.#showFontMenu(event),
            [this.#actions.revertNametagColors]: () => this.#onRevertNametagColors(),
        };

        this.#handleClick = this.#createClickHandler(handlers);
        this.pane?.addEventListener("click", this.#handleClick);
        this.pane?.addEventListener("change", this.#handleOnChange);
        this.pane?.addEventListener("input", this.#handleOnInputChange);
        this.pane?.addEventListener("contextmenu", this.#handleOnContextMenu);
    }

    #createClickHandler(handlers) {
        return (ev) => {
            let item = ev.target.closest("[data-action]");
            if (!item) {
                return;
            }

            const action = item.dataset.action;
            const handler = handlers[action];

            // if we have a handler for this action
            // stop propagation, else let the event bubble up so that the parent can handle it
            if (handler) {
                ev.stopPropagation();
                // passing dataset for use cases where you click on a item
                // and need to pass an id along, e.g: `data-id=123`
                handler(item.dataset, ev, item);
            } else {
                console.log("🍋 [Unhandled Click Bubbling Up]", { action });
            }
        };
    }

    #handleOnContextMenu = (ev) => {
        const item = ev.target.closest("[data-id][data-type]");
        if (!item) {
            return;
        }
        const id = item.dataset.id;
        const type = item.dataset.type;

        if (id && type) {
            ev.preventDefault();
            ev.stopPropagation();
            this.#showContextMenu(item.dataset, ev);
        }
    };

    #handleOnInputChange = (ev) => {
        ev.stopPropagation();
        const { name, value } = ev.target;

        switch (name) {
            case "look-title-editor":
                this.#updateCurrentLookTitle(value);
                break;

            case "name-badge-title":
                this.nameBadgeHandler.updateNameBadgeTitle(
                    this.controller.selectedLook,
                    value
                );
                this.#nametagThumbnailNeedsUpdate();
                break;

            case "name-badge-subtitle":
                this.nameBadgeHandler.updateNameBadgeSubtitle(
                    this.controller.selectedLook,
                    value
                );
                this.#nametagThumbnailNeedsUpdate();
                break;

            case "look-logo-scale":
                this.#onLogoLayerScaleChange(value);
                break;

            case "look-overlay-opacity":
                this.#onOverlayLayerOpacityChange(value);
                break;

            case "look-pattern-opacity":
                this.#onPatternLayerOpacityChange(value);
                break;

            case "reaction-scale":
                this.#onReactionScaleChange(value);
                break;

            case "reaction-name": {
                const reaction = this.controller.currentReaction;
                if (!reaction) {
                    return;
                }

                reaction.title = value;
                this.reactionsPanel.updateTitle(reaction);
                break;
            }

            case "edit-text-media": {
                this.#onEditReactionText(
                    ev.target.dataset.id,
                    ev.target.dataset.key,
                    value
                );
                break;
            }

            case "edit-away-screen-text": {
                this.#onEditAwayScreenText(
                    ev.target.dataset.id,
                    ev.target.dataset.key,
                    value
                );
                break;
            }

            case "enhancement": {
                this.#onChangeEnhancement(value);
                break;
            }

            case "complements": {
                this.#onChangeComplements(value);
                break;
            }

            default:
                break;
        }
    };

    #handleOnChange = (ev) => {
        ev.stopPropagation();

        const { name, value } = ev.target;

        switch (name) {
            case "name-badge-layout":
                this.nameBadgeHandler.changeLayout(this.controller.currentLook, value);
                this.#nametagThumbnailNeedsUpdate();
                break;

            case "toggle-nametag-visible":
                this.#onToggleNametagVisible(ev.target.checked);
                break;

            case "toggle-camera-preview":
                ev.target.checked ? this.#showStage() : this.#hideStage();
                break;

            case "look-logo-position":
                this.#onLogoLayerPositionChange(value);
                break;

            case "reaction-layout":
                this.#onReactionLocationChange(value);
                break;

            case "edit-reaction-style": {
                this.#onEditReactionStyle(value);
                break;
            }

            default:
                break;
        }
    };

    #onUserDefaultChanged(info, name, obj) {
        let { key, value } = info;
        if (key == "looksUseLiveThumbnails") {
            if (value === true) {
                // Regenerate a live thumbnail for the current look
                this.#updateCurrentLookThumbnail();
            } else if (value === false) {
                // If the preference changed to false, invalidate existing thumbnails
                const presentation = this.controller.looksPresentation;
                presentation.activeSlides.forEach((slide) => {
                    slide.invalidateThumbnail();
                });
            }
        }
    }

    #useLiveThumbnails() {
        return SharedUserDefaults.getValueForKey("looksUseLiveThumbnails", true);
    }

    /**
     * Changing states alters the data-state attribute on the container
     * Based on that we show/hide elements on the page
     *
     * What is hidden shouldn't be clickable/focusable
     */
    #setState(state) {
        this.previousState = this.state;
        this.state = state;
        this.pane?.setAttribute("data-state", state);

        this.#makeSubpanelsInert();
        this.#setupPasteListeners();

        // `startwith` to account for sub-states
        if (state.startsWith(this.#states.IDLE)) {
            this.pane.querySelector(`[data-id="${IdlePanel.id}"]`).inert = false;
        }

        if (state.startsWith(this.#states.REACTIONS_SETTINGS)) {
            this.pane.querySelector(`[data-id="${ReactionSettingsPanel.id}"]`).inert =
                false;
        }

        if (state.startsWith(this.#states.LOOK_SETTINGS)) {
            this.pane.querySelector(`[data-id="${LookSettingsPanel.id}"]`).inert = false;
        }

        if (state.startsWith(this.#states.LOOKS_LIST)) {
            this.pane.querySelector(`[data-id="${LooksListPanel.id}"]`).inert = false;
        }

        if (state == this.#states.REACTIONS_SETTINGS) {
            document.body.classList.add(this.#cls.visualEditor);
        } else {
            document.body.classList.remove(this.#cls.visualEditor);
        }
    }

    #makeSubpanelsInert() {
        const panels = this.pane.querySelectorAll(":scope > [data-panel]");
        panels.forEach((panel) => {
            panel.inert = true;
        });
    }

    async #onDiscardLookChanges() {
        if (this.state == this.#states.SETTINGS_NEW_LOOK) {
            if (this.previousState == this.#states.LOOKS_LIST) {
                // If we're coming from the look catalog, go back to the look catalog instead of the idle state
                this.#showLooksCatalog();
            } else {
                // If the user cancels creation of a new look, we delete it
                this.#deleteCurrentLook(false);
            }
            return;
        }

        let sheet = null;
        const look = this.controller.currentLook;
        if (look.hasLocalChanges()) {
            const proceed = await this.#confirmOperation(
                LocalizedString("Discard changes"),
                LocalizedString("Are you sure you want to discard your changes to this look?"),
                LocalizedString("Discard changes")
            )
            if (!proceed) {
                return;
            }
            sheet = this.#newSpinnerSheet(LocalizedString("Discard changes"), LocalizedString("Discarding your changes..."));
        }

        // If they cancel edits to an existing look, we'll roll back any unsaved changes
        look.rollbackLocalChanges().catch((err) => {
            console.error("Error rolling back local changes for look", err);
        }).then(() => {
            // Refresh the UI with the reverted values
            this.#refreshLookEditor(look);
            this.looksWidget.updateTitle(look);
        }).finally(() => {
            if (this.previousState == this.#states.LOOKS_LIST) {
                // If we're coming from the look catalog, go back to the look catalog instead of the idle state
                this.#showLooksCatalog();
            } else {
                this.#backToIdle();
            }
            sheet?.dismiss();
            LooksAnalytics.onDiscardLookChanges(look.identifier);
        });
    }

    #onSaveLookChanges() {
        const look = this.controller.currentLook;

        // The user just imported this look from the catalog and
        // is choosing to use it, so mark it as non-temporary
        const temporaryCatalogLook = look.temporaryCatalogLook;
        if (temporaryCatalogLook) {
            look.temporaryCatalogLook = false;
        }

        // The user may have tried other catalog looks that they ultimately
        // decided not to use
        this.#cleanUpTemporaryCatalogLooks();

        // We don't pause persistence for temporary catalog looks,
        // so we don't need to bother resuming it
        if (temporaryCatalogLook || !look.hasLocalChanges()) {
            console.log("No local changes to save for look", look.identifier);
            this.#backToIdle();
            return;
        }

        // TODO consider adding an unloadhandler here to prevent the user from navigating away while the save is in progress
        const sheet = this.#newSpinnerSheet(LocalizedString("Saving"), LocalizedString("Saving your changes..."));
        return look.resumePersistence().catch((err) => {
            console.error("Error resuming persistence for look", err);
        }).finally(() => {
            console.log("Look changes saved");
            this.#backToIdle();
            sheet.dismiss();
            LooksAnalytics.onSaveLookChanges(look.identifier);
        });
    }

    /* Demo mode stuff */

    async #onSaveDemoLook() {
        // 1. Persist the current look to a temporary location on the service and get back an ID
        // 2. Navigate to the account creation flow with the look ID

        // Notify the website for analytics purposes
        if (gApp.onSaveDemoLook) {
            gApp.onSaveDemoLook();
        }

        const look = this.controller.currentLook;
        const id = await this.controller.exportDemoLook().catch((err) => {
            console.error("Error persisting demo look", err);
        });

        console.log("Demo look persisted with ID", id);
        LooksAnalytics.onDemoLookSaved(id, look?.getPresetId(), look?.getPresetVariantId());
        this.#trackDemoLookSavedEvent();

        if (gApp.onDemoLookSaved) {
            gApp.onDemoLookSaved(id);
        }
    }

    async #onShareDemoLook() {
        const sheet = new ShareDemoLookSheet();
        sheet.displayAsModal();

        try {
            const look = this.controller.currentLook;
            const id = await this.controller.exportDemoLook();

            const location = window.parent.location;
            const hostname = location.hostname;
            const path = location.pathname;

            // We use the current host & path so that we're flexible across deployments
            const shareLink = `https://${hostname}${path}?lookId=${id}`;

            sheet.setShareLink(shareLink);

            LooksAnalytics.onDemoLookShared(look?.identifier, id);
        } catch (err) {
            console.error("Error persisting demo look", err);
        }
    }

    async #importDemoLook(id) {
        const look = await this.controller.importDemoLook(id);
        if (look) {
            this.#refreshLookEditor(look);
        }
        return look;
    }

    async #importUserDemoLook() {
        const sharing = this.controller.sharing;
        await sharing.loadUser();
        const id = sharing.demoLookId;
        if (id) {
            const look = await this.#importDemoLook(id);
            await sharing.removeDemoLook();
            LooksAnalytics.onDemoLookImported(look?.identifier, id, look.getPresetId());
            return look;
        }
        return null;
    }

    /* Window resizing stuff */

    static WindowSizes = Object.freeze({
        DefaultSmall: SizeMake(320, 600),
        MinimumSmall: SizeMake(240, 480),
        MaximumSmall: SizeMake(480, 2000),

        DefaultLarge: SizeMake(1280, 640),
        MinimumLarge: SizeMake(1000, 580),
        MaximumLarge: SizeMake(1920 + 340, 1080 + 120) // Made up numbers...
    });

    #saveCurrentWindowSize(defaultsKey) {
        const size = SizeMake(window.outerWidth, window.outerHeight);
        SharedUserDefaults.setValueForKey(size, defaultsKey);
    }

    #resizeToLarge() {
        if (!this.#canResizeWindow()) {
            if (App.isUserTesting) {
                window.parent.toLargeWindow();
            }
            return;
        }

        // Save the current "small" size so that we can restore it later
        this.#saveCurrentWindowSize("looksSmallSize");

        // Resize the window to the look editor size
        const largeSize = SharedUserDefaults.getValueForKey("looksLargeSize",
            LooksSidebarPane.WindowSizes.DefaultLarge);

        // If the large size is larger than the available screen size, use the available size instead
        const availableSize = SizeMake(window.screen.availWidth, window.screen.availHeight);
        if (largeSize.width > availableSize.width || largeSize.height > availableSize.height) {
            largeSize.width = Math.min(largeSize.width, availableSize.width);
            largeSize.height = Math.min(largeSize.height, availableSize.height);
        }

        this.#resizeWindow(
            largeSize,
            LooksSidebarPane.WindowSizes.MinimumLarge,
            LooksSidebarPane.WindowSizes.MaximumLarge
        );
    }

    #resizeToSmall() {
        if (!this.#canResizeWindow()) {
            if (App.isUserTesting) {
                window.parent.toSmallWindow();
            }
            return;
        }

        // Save the current "large" size preference
        this.#saveCurrentWindowSize("looksLargeSize");

        // Switch to the previous "small" size
        const smallSize =  SharedUserDefaults.getValueForKey("looksSmallSize",
            LooksSidebarPane.WindowSizes.DefaultSmall);

        this.#resizeWindow(
            smallSize,
            LooksSidebarPane.WindowSizes.MinimumSmall,
            LooksSidebarPane.WindowSizes.MaximumSmall
        );
    }

    #resizeToSmallIfNecessary() {
        if (!this.#canResizeWindow()) {
            return;
        }

        // If we're larger than the max "small size", resize to the previously saved small size
        const currentSize = SizeMake(window.outerWidth, window.outerHeight);
        const maxSmallSize = LooksSidebarPane.WindowSizes.MaximumSmall;

        if (currentSize.width > maxSmallSize.width || currentSize.height > maxSmallSize.height) {
            const smallSize =
                SharedUserDefaults.getValueForKey("looksSmallSize") ?? LooksSidebarPane.WindowSizes.DefaultSmall;

            this.#resizeWindow(
                smallSize,
                LooksSidebarPane.WindowSizes.MinimumSmall,
                LooksSidebarPane.WindowSizes.MaximumSmall
            );
        }
    }

    #resizeWindow(size, minSize, maxSize) {
        // Remove the window size limits while we resize
        this.#removeWindowSizeLimits();

        // Resize the window
        gHybrid.windows.mainAppWindow.resizeTo(size.width, size.height);

        // Set the new size limits
        this.#setWindowSizeLimits(minSize, maxSize);
    }

    #canResizeWindow() {
        return App.isHybrid && gHybrid.windows?.mainAppWindow?.resizeTo && window.setMinimumSize;
    }

    #removeWindowSizeLimits() {
        this.#setWindowSizeLimits(
            LooksSidebarPane.WindowSizes.MinimumSmall,
            LooksSidebarPane.WindowSizes.MaximumLarge
        );
    }

    #setWindowSizeLimits(min, max) {
        if (this.#canResizeWindow()) {
            window.setMinimumSize(min.width, min.height);
            window.setMaximumSize(max.width, max.height);
        }
    }

    #useSideBySideLayout() {
        if (!this.#isInSideBySideLayout()) {
            this.#showStage();
            document.body.classList.add(this.#cls.sideBySide);
            this.#resizeToLarge();
        }
    }

    #useStackedLayout(resizeWindow = true) {
        this.#updateStageVisibility();
        if (document.body.classList.contains(this.#cls.sideBySide)) {
            document.body.classList.remove(this.#cls.sideBySide);
            if (resizeWindow === true) {
                this.#resizeToSmall();
            }
        }
    }

    isLookEditorOpen() {
        return document.body.classList.contains(this.#cls.lookEditor);
    }

    #isInSideBySideLayout() {
        return document.body.classList.contains(this.#cls.sideBySide);
    }

    #backToIdle(resizeWindow = true) {
        // If we're coming from the look catalog and we changed the look, show a toast
        this.#showLookChangedToastIfNecessary();
        this.#previouslySelectedLook = null;

        this.#setState(this.#states.IDLE);
        this.#useStackedLayout(resizeWindow);
        this.#removeLookEditorUnloadHandler();

        if (this.isLookEditorOpen()) {
            this.#dismissLookEditorToolbars();
            document.body.classList.remove(this.#cls.lookEditor);
        }

        this.#updateCurrentLookThumbnail();
}

    #showLookChangedToastIfNecessary() {
        const statesToNotify = [
            this.#states.SETTINGS_NEW_LOOK,
            this.#states.LOOKS_LIST,
        ];

        // We're changing states back to idle, see if we were in a look-changing state
        if (!statesToNotify.includes(this.state)) {
            return;
        }

        // See if the look actually changed
        const look = this.controller.currentLook;
        if (!look || look == this.#previouslySelectedLook) {
            return;
        }

        Toast.show(LocalizedStringFormat("Look changed to ${title}", { title: look.title }));
    }

    #onSelectTab(id) {
        // When the looks settings pane switches tabs,
        // make sure any open editor options toolbar is dismissed
        this.#dismissLookEditorToolbars();

        // If the user switches to the nametag tab, make sure the nametag is visible
        if (id == LookSettingsPanel.tabIds.NAMETAG && !this.controller.nametagVisible) {
            this.#toggleNametagVisible(true);
        }
    }

    /**
     * Handle backwards compatibility if the hybrid app doesn't support resizing.
     * Shows an error message if the look editor is not supported.
     * @returns {boolean} true if the look editor is supported, false otherwise.
     */
    #checkLookEditorSupport() {
        if (App.isDemo === true) {
            return true;
        } else if (App.isHybrid && this.#canResizeWindow()) {
            return true;
        } else if (!App.isHybrid) {
            // You're in the browser, so presumably this is internal demo usage
            return true;
        }

        ShowAlertView(
            LocalizedString("Upgrade required"),
            LocalizedString("You are using an older version of Airtime Camera. Please install the latest update to create and edit looks.")
        );
        return false;
    }

    #enterLookEditor(state, look = null) {
        // If we're in a hybrid app that allows window resizing,
        // make the window larger so the user gets a good preview
        // of their changes on stages. Also do this locally for development.
        if (!this.#checkLookEditorSupport()) {
            return;
        }

        // If there's a reaction on stage, remove it
        this.controller.currentReaction = null;

        this.#dismissLookEditorToolbars();
        this.#useSideBySideLayout();
        document.body.classList.add(this.#cls.lookEditor);

        // Warn the user if they try to close the window while editing a look
        if (!App.isDemo && !gLocalDeployment) {
            this.#addLookEditorUnloadHandler();
        }

        // What if the current look changes while we're in the editor?
        // That probably shouldn't be supported, I doubt it would work anyway?
        this.controller.currentLook.pausePersistence();
        this.#setState(state);

        const lookTabActive = this.lookSettingsPanel.isLookTabActive();
        if (look && lookTabActive) {
            this.#selectInitialLookEditorLayer(look);
        }
    }

    #addLookEditorUnloadHandler() {
        // Warn the user if they try to close the window while editing a look
        const beforeUnloadHandler = (evt) => evt.preventDefault();
        gApp.registerCustomBeforeUnloadHandler(beforeUnloadHandler);
    }

    #removeLookEditorUnloadHandler() {
        gApp.removeCustomBeforeUnloadHandler();
    }

    // NOTE: stage preview element is outside of this container

    #updateStageVisibility() {
        let showStage = SharedUserDefaults.getValueForKey("miniShowStage", "yes");
        if (showStage == "auto") {
            showStage = this.stage.isVirtualCameraActive ? "no" : "yes";
        }
        if (showStage == "yes") {
            this.#showStage();
        } else if (showStage == "no") {
            this.#hideStage();
        }
    }

    #showStage(ttl = 300) {
        const el = document.querySelector(this.#selector.stageWrapper);
        if (el) {
            el.classList.remove(this.#cls.stageNoPreview);
            setTimeout(() => el.classList.remove("hidden"), ttl);
        }
    }

    #hideStage(ttl = 300) {
        const el = document.querySelector(this.#selector.stageWrapper);
        if (el) {
            el.classList.add(this.#cls.stageNoPreview);
            setTimeout(() => el.classList.add("hidden"), ttl);
        }
    }

    #showLookEditorContextMenu(evt) {
        const menu = new Menu();
        const sender = evt.target.closest("button");

        menu.addItem(
            LocalizedString("Rename"),
            () => this.#onRenameCurrentLook()
        );

        menu.addItem(
            LocalizedString("Duplicate"),
            () => this.#onDuplicateCurrentLook(),
        );

        menu.addDivider();

        menu.addItem(
            LocalizedString("Delete"),
            () => this.#deleteCurrentLook(false), // TODO revert changes?
            true
        );

        menu.displayFrom(sender, evt);
    }

    #showContextMenu(dataset, event) {
        const { id, type } = dataset;
        if (type == "look") {
            const look = this.controller.lookWithIdentifier(id);
            if (look) {
                this.#showLookContextMenu(look, event);
            }
        } else if (type == "reaction") {
            const reaction = this.controller.reactionWithIdentifier(id);
            if (reaction) {
                this.#showReactionContextMenu(reaction, event);
            }
        } else if (type == "catalog-item") {
            if (dataset.canDelete == "true") {
                this.#showCatalogItemContextMenu(id, event);
            }
        }
    }

    async #showLookContextMenu(look, ev) {
        const menu = new Menu();
        const sender = ev.target.closest("button");

        const options = [];

        options.push({
            label: LocalizedString("Edit"),
            action: () => {
                // Switch to this look if it's not the current selection
                if (this.controller.getLooksToggle()) {
                    this.controller.toggleLooksOn();
                }
                if (this.controller.selectedLook != look) {
                    this.controller.selectedLook = look;
                }
                this.#onEditCurrentLook();
            },
        });

        if (this.controller.currentLook == look) {
            options.push({
                label: LocalizedString("Share"),
                action: () => this.#onShareCurrentLook()
            });
        }

        options.push({
            label: LocalizedString("Duplicate"),
            action: () => this.#onDuplicateLook(look)
        });

        // If this item came from the catalog, let the user revert changes they've made
        const sharedObject =
            await this.controller.sharing.findSourceSharedObjectForSlide(look);
        if (sharedObject) {
            options.push({
                label: LocalizedString("Revert"),
                action: () => this.#onRevertLook(look, sharedObject),
                disabled: false // TODO see if we can tell if it changed
            });
        }

        options.push({
            label: LocalizedString("Delete"),
            action: () => this.#onDeleteLook(look),
            destructive: true,
            disabled: !this.#canDeleteLook(look)
        });

        options.forEach((option) =>
            menu.addItem(
                option.label,
                option.action.bind(this),
                option.destructive === true,
                option.disabled === true
            )
        );
        this.#displayContextMenu(menu, sender, ev);
    }

    async #showReactionContextMenu(reaction, ev) {
        const menu = new Menu();
        const sender = ev.target.closest("button");

        const options = [];

        if (this.controller.currentReaction == reaction) {
            options.push({
                label: LocalizedString("Edit"),
                action: () => this.#onEditReaction()
            });
            options.push({
                label: LocalizedString("Share"),
                action: () => this.#onShareCurrentReaction()
            });
        }
        // TODO add a toggle between reaction styles for "standard" reactions
        options.push({
            label: LocalizedString("Duplicate"),
            action: () => this.#onDuplicateReaction(reaction)
        });

        options.push({
            label: LocalizedString("Use as an away screen"),
            action: () => this.#onToggleUseReactionAsAwayScreen(reaction),
            checkbox: true,
            checked: reaction.useAsAwayScreen
        });

        // If this item came from the catalog, let the user revert changes they've made
        const sharedObject =
            await this.controller.sharing.findSourceSharedObjectForSlide(reaction);
        if (sharedObject) {
            options.push({
                label: LocalizedString("Revert"),
                action: () => this.#onRevertReaction(reaction, sharedObject),
                disabled: false // TODO see if we can tell if it changed
            });
        }

        options.push({
            label: LocalizedString("Delete"),
            action: () => this.#onDeleteReaction(reaction, false),
            destructive: true
        });

        options.forEach((option) => {
            if (option.checkbox) {
                const checkbox = menu.addCheckbox(
                    option.label,
                    option.action.bind(this),
                    null,
                    false
                );
                checkbox.checked = option.checked;
            } else {
                menu.addItem(
                    option.label,
                    option.action.bind(this),
                    option.destructive === true,
                    option.disabled === true
                );
            }
        });
        this.#displayContextMenu(menu, sender, ev);
    }

    async #showCatalogItemContextMenu(id, ev) {
        const menu = new Menu();
        const sender = ev.target.closest("button");

        menu.addItem(
            LocalizedString("Remove from catalog"),
            () => this.#onRemoveFromCatalog(id),
            true // destructive
        );

        this.#displayContextMenu(menu, sender, ev);
    }

    #displayContextMenu(menu, sender, ev) {
        if (this.#currentContextMenu) {
            this.#currentContextMenu.dismiss();
            this.#currentContextMenu = null;
        }
        menu.displayFrom(sender, ev);
        this.#currentContextMenu = menu;
    }

    #handleToggleCameraEnabledKeyboardEvent() {
        this.#toggleCameraEnabled();
    }

    #toggleCameraEnabled() {
        if (this.controller.isCameraEnabled()) {
            this.#toggleCameraOff();
        } else {
            this.#toggleCameraOn();
        }
    }

    #toggleCameraOn() {
        this.controller.enableCamera();
        LooksAnalytics.onUnmuteCamera();
    }

    #toggleCameraOff() {
        this.controller.disableCamera();
        LooksAnalytics.onMuteCamera();
    }

    #showDemoCameraMenu(ev) {
        const menu = new Menu();
        const camerOptions = this.#getCameraToolbarOptions();
        camerOptions.forEach((option) => this.#addCameraMenuDeviceOption(menu, option));

        const sender = ev.target.closest("button");
        menu.displayFrom(sender, ev);
    }

    #showCameraMenu(ev) {
        const camerOptions = this.#getCameraToolbarOptions();
        const menu = new Menu();
        const sender = ev.target.closest("button");

        const enabled = this.stage.localPresenter.videoTrackEnabled;

        if (enabled) {
            const videoButton = menu.addItem(LocalizedString("Stop Video"), () => {
                this.controller.disableCamera();
                LooksAnalytics.onMuteCamera();
            });

            videoButton.innerHTML = `
                <span class="icon">${AppIcons.CameraOn().outerHTML}</span>
                <div class="caption1 flex items-center gap-2 text-destructive">
                    ${LocalizedString("Stop Video")}
                </div>`;
        } else {
            const videoButton = menu.addItem(LocalizedString("Start Video"), () => {
                this.controller.enableCamera();
                LooksAnalytics.onUnmuteCamera();
            });

            videoButton.innerHTML = `
                <span class="icon text-destructive">${AppIcons.CameraOff().outerHTML}</span>
                <div class="caption1 flex items-center gap-2">
                    ${LocalizedString("Start Video")}
                </div>`;
        }

        menu.addDivider();

        camerOptions.forEach((option) => this.#addCameraMenuDeviceOption(menu, option));

        menu.addDivider();
        this.#addGreenScreenMenuItem(menu);

        menu.displayFrom(sender, ev);
        LooksAnalytics.onShowCameraMenu();
    }

    #addCameraMenuDeviceOption(menu, { value, label, selected }) {
        const button = menu.addItem(label, () => {
            this.#onChangeCamera(value);
        });

        button.innerHTML = `
            ${selected ? `<span class="icon checkmark">${AppIcons.Checkmark().outerHTML}</span>` : ""}
            <div class="caption1 flex items-center gap-2">
                ${label}
            </div>
        `;
    }

    #addGreenScreenMenuItem(menu) {
        const presenter = this.stage.localPresenter;

        // Let the user toggle chroma keying on and off
        const greenScreen = presenter.physicalGreenScreen;
        const label = LocalizedString("I have a green screen");
        const toggleButton = menu.addItem(
            label,
            () => (presenter.physicalGreenScreen = !greenScreen)
        );
        toggleButton.innerHTML = `
            ${greenScreen ? `<span class="icon">${AppIcons.Checkmark().outerHTML}</span>` : ""}
            <div class="caption1 flex items-center gap-2">
                ${label}
            </div>
        `;

        if (!greenScreen) {
            return;
        }

        // Let the user toggle automatic adjustment of the green screen
        const canEstimate = presenter.canEstimateGreenScreen;
        const autoMode = presenter.chromaMode == Presenter.ChromaMode.Automatic;
        if (canEstimate) {
            const label = LocalizedString("Auto-adjust");
            const autoButton = menu.addItem(label, () => {
                presenter.chromaMode = autoMode
                    ? Presenter.ChromaMode.Manual
                    : Presenter.ChromaMode.Automatic;
            });
            autoButton.innerHTML = `
                ${autoMode ? `<span class="icon">${AppIcons.Checkmark().outerHTML}</span>` : ""}
                <div class="caption1 flex items-center gap-2">
                    ${label}
                </div>
            `;
        }

        if (autoMode) {
            return;
        }

        // Add manual threshold controls
        if (this.#chromaThresholdControls == null) {
            this.#chromaThresholdControls = new ChromaThresholdControl(
                presenter.chromaFilter
            );
        }
        menu.addCustomView(this.#chromaThresholdControls.container);
    }

    #showFontMenu(ev) {
        LooksSidebarPane.showFontMenu(
            this.controller.currentLook,
            this.nameBadgeHandler,
            this.nameBadgeSettings,
            ev
        );
    }

    static showFontMenu(slide, nameBadgeHandler, nameBadgeSettings, ev) {
        const media = slide.getNametagMedia();

        const selectedFamily = LooksNameBadgeHandler.getFontFamily(media);
        const defaultFamily = LooksNameBadgeHandler.getDefaultFontFamily(media);

        const onUpload = () => {
            LooksSidebarPane.onUploadCustomFont(media, nameBadgeSettings);
        };

        let options = [];

        // First, upload a custom font
        options.push({
            label: LocalizedString("Upload font (.woff2)"),
            icon: AppIcons.Plus(),
            action: onUpload
        });
        if (media.fontAsset) {
            options.push({
                label: LocalizedString("Custom"),
                value: media.fontAsset.fingerprint,
                style: `font-family: ${Media.Text.Style.FontNameFromFontAsset(media.fontAsset)}`,
                selected: Media.Text.Style.IsFontFamilyFromAsset(
                    selectedFamily,
                    media.fontAsset
                )
            });
        }

        options.push({ divider: true });

        options = options.concat(
            Media.NameBadge.FontConfig.map((option) => ({
                value: option.value,
                label: option.label,
                className: option.className,
                selected: option.value === selectedFamily,
                defaultFamily: option.value === defaultFamily
            }))
        );

        const onChange = (value) => {
            if (value === media.fontAsset?.fingerprint) {
                const fontFace = Media.Text.Style.FontNameFromFontAsset(media.fontAsset);
                nameBadgeHandler.setFontFamily(media, fontFace);
                nameBadgeSettings.updateSelectedFont(LocalizedString("Custom"));
            } else {
                nameBadgeHandler.setFontFamily(media, value);
                nameBadgeSettings.updateSelectedFont(value);
            }
        };

        // See if the default was already list
        const hasDefault = Media.NameBadge.FontConfig.some(
            (option) => option.value === defaultFamily
        );
        if (!hasDefault) {
            options.push({
                label: defaultFamily,
                value: defaultFamily,
                style: `font-family: ${defaultFamily}`,
                selected: defaultFamily === selectedFamily,
                defaultFamily: true
            });
        }

        nameBadgeSettings.showFontMenu(ev, options, onChange);
    }

    static async onUploadCustomFont(media, nameBadgeSettings) {
        const files = await Media.Files.showFilePicker(1, Media.Files.fontMimeTypes());
        if (!files || files.length == 0) {
            return null;
        }

        const file = files[0];
        if (!Media.Files.isFontFile(file)) {
            console.error("Unsupported file type", file);
            return null;
        }

        await media.onUseUploadedFont(file);
        nameBadgeSettings.updateSelectedFont(LocalizedString("Custom"));
    }

    #showAccountMenu(evt) {
        this.accountUI.settingsButtonClicked(evt.target, evt);
    }

    /** UI construction functionality */

    /**
     * this buils the containers that will be populated
     *
     * - we select the containers by data-attr
     *   able to transition from list -> detail view
     *
     */
    #buildPane() {
        const parent = document.getElementById("sidebar_pane");

        this.lookSettings = new LookSettings(this.stage);
        this.presetsPanel = new LookPresetsPanel();

        this.nameBadgeSettings = new LookNameBadgeSettings();
        this.nameBadgeHandler = new LooksNameBadgeHandler();

        this.lookSettingsPanel = new LookSettingsPanel();
        this.lookSettingsPanel.setStyleTab(this.lookSettings.el);
        this.lookSettingsPanel.setNameTagTab(this.nameBadgeSettings.el);
        if (App.isDemo) {
            this.lookSettingsPanel.setPresetsTab(this.presetsPanel.el);
        }

        this.looksListPanel = new LooksListPanel();
        if (!App.isDemo) {
            this.looksListPanel.setCatalogPanel(this.presetsPanel.el);
        }

        this.reactionSettings = new ReactionSettingsPanel();

        const editorTopBar = new LookEditorTopBar();
        editorTopBar.getParentElement().addEventListener("click", (ev) => this.#handleClick(ev));
        editorTopBar.getParentElement().addEventListener("input", (ev) => this.#handleOnInputChange(ev));
        editorTopBar.display();
        this.editorTopBar = editorTopBar;

        // The new 3.0 UI
        this.newIdlePanel = new IdlePanel();
        this.toolbar = new ApplicationToolbar();
        this.newIdlePanel.setToolbar(this.toolbar);
        this.widgetBar = new WidgetBar();
        this.newIdlePanel.setWidgetBar(this.widgetBar);
        this.reactionsPanel = new ReactionsPanel(this.controller.isFirstUse);
        this.newIdlePanel.setReactionsPanel(this.reactionsPanel);

        this.looksWidget = new LooksWidget();
        this.newIdlePanel.addWidget(this.looksWidget.el);

        this.nametagWidget = new NameTagWidget();
        this.newIdlePanel.addWidget(this.nametagWidget.el);

        this.awayWidget = new AwayWidget();
        this.newIdlePanel.addWidget(this.awayWidget.el);

        this.enhanceWidget = new EnhanceWidget();
        this.newIdlePanel.addWidget(this.enhanceWidget.el);

        this.lutWidget = new LUTWidget();
        this.newIdlePanel.addWidget(this.lutWidget.el);
        this.#setupLUTWidget();
        this.#setupTuneWidget();

        const panelContainer = document.createElement("div");
        panelContainer.className = this.#cls.container;
        panelContainer.setAttribute("data-state", this.state);
        panelContainer.appendChild(this.newIdlePanel.el);
        panelContainer.appendChild(this.lookSettingsPanel.el);
        panelContainer.appendChild(this.reactionSettings.el);
        panelContainer.appendChild(this.looksListPanel.el);

        const paneContainer = document.createElement("div");
        paneContainer.className = "contents";
        paneContainer.appendChild(panelContainer);
        parent.appendChild(paneContainer);

        this.pane = panelContainer;

        this.#notificationBanner = new LooksNotificationBanner();
    }

    /** Presentation handling functionality */

    /**
     * @returns {Presentation.Modern}
     */
    #getLooksPresentation() {
        return this.controller.looksPresentation;
    }

    /**
     * @returns {Presentation.Modern}
     */
    #getReactionsPresentation() {
        return this.controller.reactionsPresentation;
    }

    #findActiveSlide() {
        return this.stage.slide;
    }

    /**
     * Called when a presentation's slides have changed.
     * @param {Presentation} obj
     */
    #onPresentationSlidesChanged(_info, _name, obj) {
        if (obj == this.#getLooksPresentation()) {
            this.#onLooksSlidesChanged();
        } else if (obj == this.#getReactionsPresentation()) {
            this.#onReactionsSlidesChanged();
        }
    }

    /**
     * Called when the current look (the one on stage) changes.
     * @param {Slide.Look | null} look
     */
    #onCurrentLookChanged(look) {
        console.log('[LUT] onCurrentLookChanged:', {
            lookId: look?.identifier,
            hasLUTFilter: !!this.stage?.localPresenter?.layer?.videoLayer?.filters?.find(f => f instanceof LUTFilter)
        });

        this.#deselectReaction();

        // Update our UI state
        this.#onLooksEnabledChanged();

        if (look) {
            this.looksWidget.selectLook(look);

            // Show/hide the look's name tag as needed
            LooksNameBadgeHandler.populateNameBadgeFieldsIfNeeded(look);

            // TODO revisit this, who is the source of truth for nametag visibility?
            this.controller.nametagVisible = this.widgetBar.nametagEnabled;
            this.#notifyHybridOfStateChanges();

            this.nametagWidget.setNametag(look.getNametagMedia());
            this.nametagWidget.setNametagEnabled(this.controller.nametagVisible);

            this.#refreshLookEditor(look);


            // Wait for the slide to render, then update our thumbnail
            window.setTimeout((_) => {
                // Make sure the slide didn't change during our timeout
                if (look == this.controller.currentLook) {
                    this.#updateCurrentLookThumbnail();
                }
            }, 750);
        } else {
            // TODO is this needed?
            this.editorTopBar.setLook();
        }
    }

    /**
     * Called when the selected look (not necessarily on stage) changes.
     * @param {Slide.Look} look
     */
    #onSelectedLookChanged(look) {
        if (look) {
            this.looksWidget.selectLook(look);
            this.nametagWidget.setNametag(look.getNametagMedia());
        } else {
            // In general this shouldn't happen - you always have a look
            // selected, even if it's turned off. However, you might delete
            // the selected look or delete all looks, so it's possible.
            this.looksWidget.unselectLook();
        }
    }

    // The user clicked share, but no look or visual is selected
    // Let them share a link to get the app
    #onShareApp() {
        if (this.#shareAirtimeSheet) {
            return;
        }

        const sheet = new ShareAirtimeCameraSheet();
        sheet.addEventListener("dismiss", () => (this.#shareAirtimeSheet = null));
        this.#shareAirtimeSheet = sheet;
        sheet.displayAsModal();
    }

    /* Looks functionality */

    async #onEditCurrentLook() {
        const look = this.controller.currentLook;
        if (look) {
            const state = look.hasBeenPersisted ? this.#states.LOOK_SETTINGS : this.#states.SETTINGS_NEW_LOOK;
            this.#enterLookEditor(state, look);
            LooksAnalytics.onEditLook(look.identifier, look.getPresetId(), look.getPresetVariantId());
        }
    }

    #selectInitialLookEditorLayer(look) {
        // For looks created from a preset, preselect a layer to see options for
        switch (look?.getInitialEditorLayer()) {
            case LooksLayer.Logo:
                this.#onUpdateLogoLayerContents();
                break;
            case LooksLayer.Overlay:
                this.#onUpdateOverlayLayerContents();
                break;
            case LooksLayer.Pattern:
                this.#onUpdatePatternLayerContents();
                break;
            case LooksLayer.Tint:
                this.#editPresenterTint();
                break;
            case LooksLayer.Wallpaper:
                this.#updateWallpaperLayerContents();
                break;
            default:
                break;
        }
    }

    async #createBlankLook(addBrand, presetId = null) {
        if (!this.#checkLookEditorSupport()) {
            return;
        }

        const look = await this.controller.createLook();
        if (!look) {
            // TODO error handling
            console.error("Error creating new look");
            return;
        }
        this.#editNewlyCreatedLook(look, addBrand);
        LooksAnalytics.onLookCreated(look.identifier, presetId);
    }

    #editNewlyCreatedLook(look, addBrand) {
        this.#selectLookBypassingTransition(look);

        this.lookSettingsPanel.setActiveTab(LookSettingsPanel.tabIds.STYLE);
        this.#enterLookEditor(this.#states.SETTINGS_NEW_LOOK, look);

        if (!App.isDemo && addBrand) {
            // When we're in the full app, we always show the "add a brand" dialog
            this.#onSearchLogo(true);
        }
    }

    #selectLookBypassingTransition(look) {
        // Bypass the selectedLook setter so we can skip the transition
        this.controller.selectLookAndToggleOnBypassingTransition(look);
    }

    async #onRevertLook(look, sharedObject) {
        const proceed = await this.#confirmOperation(
            LocalizedString("Revert Look"),
            LocalizedString(
                "Are you sure you want to discard your changes and revert to the catalog version of this look?"
            ),
            LocalizedString("Revert")
        );
        if (proceed) {
            await this.controller.revertLook(look, sharedObject);
            LooksAnalytics.onLookReverted(look.identifier, sharedObject.identifier);
        }
    }

    async #onShareCurrentLook() {
        const slide = this.controller.currentLook;

        if (!slide) {
            this.#onShareApp();
            return;
        }

        const sharing = this.controller.sharing;

        // Mark the text fields on the look's nametag as templates
        // so they'll be replaced when someone imports them
        const nametag = slide.getNametagMedia();
        if (nametag) {
            nametag.template = true;
            nametag.setNeedsPersistence();
        }
        const thumbnailHander = async (options = {}) => {
            if (options.useLiveThumbnails) {
                return this.#createStageSnapshot(slide, this.stage);
            } else {
                await ThumbnailStorage.shared.delete(slide);
                const img = await slide.thumbnail();
                return img;
            }
        };

        const sheet = new LooksShareSheet(
            sharing,
            slide,
            LooksContentType.Look,
            thumbnailHander
        );
        sheet.addEventListener("dismiss", (_) => {
            sharing.refreshContent().then(() => this.presetsPanel.sharedObjectsChanged());

            if (nametag) {
                // TODO it'd be nice if we could set template to true
                // on the import, not the export, so that we wouldn't have
                // a potential race condition if the user quits the app
                // with the share sheet open or something.
                nametag.template = false;
                nametag.setNeedsPersistence();
            }
        });
        sheet.displayAsModal();
    }

    async #onRemoveFromCatalog(id) {
        const proceed = await this.#confirmOperation(
            LocalizedString("Remove from catalog"),
            LocalizedString("Are you sure you want to permanently remove this look from the catalog?"),
            LocalizedString("Remove")
        );
        if (!proceed) {
            return;
        }

        const sheet = this.#newSpinnerSheet(LocalizedString("Removing from catalog"));
        let result = null;
        try {
            result = await this.controller.sharing.unshareObject(id);
        } finally {
            sheet.dismiss();
        }
        if (result.successful) {
            this.presetsPanel.sharedObjectsChanged();
        } else {
            ShowAlertView(
                LocalizedString("Error"),
                LocalizedString("An unexpected error occurred attempting to remove the look from the catalog.")
            );
        }
    }

    async #onDuplicateCurrentLook() {
        // If we're in the look editor, we need to save changes first
        if (this.state.startsWith(this.#states.LOOK_SETTINGS)) {
            await this.#onSaveLookChanges();
        } else {
            this.#backToIdle();
        }

        const look = this.controller.currentLook;
        if (!look) {
            return;
        }

        // Take the look off the stage while we duplicate it
        this.controller.toggleLooksOff();
        console.log("Duplicating look");
        await this.#onDuplicateLook(look);
        this.controller.toggleLooksOn();
    }

    async #onDuplicateLook(originalLook) {
        const duplicatedLook = await this.controller.duplicateLook(originalLook);
        if (duplicatedLook == null) {
            return;
        }

        let newTitle = duplicatedLook.title ?? "";
        if (newTitle.length > 0) {
            newTitle += " ";
        }
        newTitle += LocalizedString("Copy");
        this.#updateLookTitle(duplicatedLook, newTitle);

        this.#refreshLookEditor(duplicatedLook);

        LooksAnalytics.onLookDuplicated(originalLook.identifier, duplicatedLook.identifier);

        return duplicatedLook;
    }

    /**
     * Delete the current selected look
     */
    async #deleteCurrentLook(requiresConfirmation) {
        const look = this.controller.currentLook;
        if (!this.#canDeleteLook(look)) {
            return;
        }

        const proceed = !requiresConfirmation || await this.#confirmOperation(
            LocalizedString("Delete Look"),
            LocalizedString("Are you sure you want to delete this look?"),
            LocalizedString("Delete")
        );

        if (!proceed) {
            return;
        }

        // If we're in the look editor, we'll revert any pending changes
        if (this.state.startsWith(this.#states.LOOK_SETTINGS)) {
            if (look.hasLocalChanges()) {
                await look.rollbackLocalChanges().catch((err) => {
                    console.error("Error rolling back local changes for look", err);
                });
            }
        }

        this.controller.deleteLook(look);
        this.#backToIdle();
        this.#ensureLookSelected();

        LooksAnalytics.onLookDeleted(look.identifier);
    }

    async #onDeleteLook(look) {
        if (!this.#canDeleteLook(look)) {
            return;
        }
        this.controller.deleteLook(look);
        this.#ensureLookSelected();
        LooksAnalytics.onLookDeleted(look.identifier);
    }

    #canDeleteLook(look) {
        const looks = this.controller.looksPresentation.activeSlides;
        if (looks.length <= 1) {
            Toast.show(LocalizedString("You must have at least one look"));
            return false;
        }
        return true;
    }

    async #ensureLookSelected() {
        // When the selected look is deleted, we want to select another one
        // so that there is always a selection
        let look = this.controller.selectedLook;
        if (!look) {
            const looks = this.controller.looksPresentation.activeSlides;
            if (looks.length > 0) {
                this.controller.selectedLook = looks[0];
            } else {
                // If the user has no looks, turn looks off
                this.#toggleLookOff();
            }
        }
    }

    async #confirmOperation(title, message, action) {
        const wrapper = promiseWrapper();
        const sheet = new ConfirmationSheet(title, message, action);
        sheet.addActionHandler((_) => {
            sheet.dismiss();
            wrapper.resolve(true);
        });
        sheet.addCancelHandler((_) => {
            sheet.dismiss();
            wrapper.resolve(false);
        });
        sheet.displayAsModal();
        return wrapper;
    }

    #onRenameCurrentLook() {
        this.editorTopBar.enterTitleEditor();
    }

    #updateCurrentLookTitle(value) {
        const look = this.controller.currentLook;
        if (look) {
            this.#updateLookTitle(look, value);
        }
    }

    #updateLookTitle(look, newTitle) {
        look.title = newTitle;
        this.looksWidget.updateTitle(look);
    }

    #onSelectItem(id, type, text) {
        if (type === "look") {
            this.#onLookClicked(id);
        } else if (type === "reaction") {
            this.#onReactionClicked(id);
            this.reactionsPanel.clearSearch();
        } else if (type == "giphy") {
            this.#onGiphySearchResultClicked(id).then(() => this.reactionsPanel.clearSearch());
        } else if (type == "catalog") {
            // TODO for now we're hardcoding that this is a reaction
            this.#onImportReactionFromCatalog(id).then(() => this.reactionsPanel.clearSearch());
        } else if (type == "text-reaction") {
            // id contains the style, e.g. "thought" or "speech"
            this.#onAddTextReaction(id, text).then(() => this.reactionsPanel.clearSearch());
        } else if (type == "emoji-reaction") {
            // id contains the emoji title
            this.#onAddEmojiReaction(id, text).then(() => this.reactionsPanel.clearSearch());
        } else {
            console.error("Unknown item type selected", type);
        }
    }

    async #onAddTextReaction(style, message) {
        const anchor = this.#getDefaultReactionAnchor();
        const media = TextReaction.createMediaForTextReaction(style, message, anchor);
        const slide = await this.#addTextReaction(media);
        if (slide) {
            LooksAnalytics.onReactionCreated(slide.identifier, style);
        }
    }

    async #onAddEmojiReaction(title, message) {
        const media = TextReaction.CreateEmoji(message);
        if (media) {
            media.title = title;
            const slide = await this.#addTextReaction(media);
            if (slide) {
                LooksAnalytics.onReactionCreated(slide.identifier, "emoji");
            }
        }
    }

    async #addTextReaction(media) {
        const style = this.#getDefaultReactionLayout();
        const position = this.#getDefaultReactionAnchor();

        const slide = await this.controller.createReaction(
            media,
            style,
            position,
            media.scale
        ).catch(err => {
            console.error("Error creating text reaction", err);
        });
        if (slide) {
            this.#onReactionClicked(slide.identifier);
        }
        return slide;
    }

    async #onImportReactionFromCatalog(id) {
        const sharing = this.controller.sharing;
        const sheet = this.#newSpinnerSheet(LocalizedString("Adding visual..."), "");
        try {
            const result = await sharing.importReaction(id);
            if (!result.successful) {
                return;
            }

            const records = result.results;
            this.#logUnuploadedAssets(records);

            const presentation = this.#getReactionsPresentation();
            if (presentation) {
                const slide =  this.controller.slideWasImported(presentation, records);
                if (slide) {
                    this.#onReactionClicked(slide.identifier);
                }
            }

            sharing.refreshContent();
            LooksAnalytics.onCatalogItemImported(LooksContentType.Reaction, records);
        } catch (err) {
            console.error("Error adding catalog item", err);
        } finally {
            sheet.dismiss();
        }
    }

    async #onGiphySearchResultClicked(id) {
        try {
            // Can we put it on stage and show it right away,
            // without waiting for persistence to complete,
            // so it feels snappy?
            const giphy = new GIPHYClient();

            let item = this.reactionsPanel.cachedSearchResultForId(id);
            if (!item) {
                item = await giphy.getByID(id);
            }

            const media = giphy.newMediaForItem(item);
            const slide = await this.#onAddGIPHYReaction(media);
            if (slide) {
                LooksAnalytics.onReactionCreated(slide.identifier, "giphy");
            }
        } catch (err) {
            console.error("Error adding reaction from search result", err);
        }
    }

    /**
     * @param {string} id the id of the look the user clicked on
     */
    #onLookClicked(id) {
        const currentSelection = this.controller.selectedLook;
        if (currentSelection?.identifier == id) {
            // If this is already the selected look, do nothing
        } else {
            const look = this.controller.lookWithIdentifier(id);
            this.controller.selectedLook = look;
            LooksAnalytics.onLookClicked(id, look?.exportId, look?.getPresetId());
        }
    }

    #onPinCurrentLook() {
        const currentLook = this.controller.currentLook;
        if (currentLook) {
            this.#onPinItem(currentLook.identifier, "look");
        }
    }

    #onUnpinCurrentLook() {
        const currentLook = this.controller.currentLook;
        if (currentLook) {
            this.#onUnpinItem(currentLook.identifier, "look");
        }
    }

    #onPinItem(id, type) {
        this.#updateItemPinned(id, type, true);
    }

    #onUnpinItem(id, type) {
        this.#updateItemPinned(id, type, false);
    }

    #updateItemPinned(id, type, isPinned) {
        const slide =
            type == "look"
                ? this.controller.lookWithIdentifier(id)
                : this.controller.reactionWithIdentifier(id);
        if (slide) {
            if (isPinned) {
                this.controller.pinSlide(slide);
                LooksAnalytics.onItemPinned(id, type);
            } else {
                this.controller.unpinSlide(slide);
                LooksAnalytics.onItemUnpinned(id, type);
            }
            this.#onPresentationSlidesChanged(null, null, slide.presentation);
        }
    }

    async #onLooksSlidesChanged() {
        const { activeSlides } = this.#getLooksPresentation();
        await this.looksWidget.looksChanged(activeSlides);

        // TODO this isn't relevant anymore
        this.#idlePanelLooksListLoaded = true;

        // It's spaghetti to put this here, but I don't want to
        // refactor a bunch of other things just now...
        if (this.#showCreateFirstLookCoachmarkOnIdlePanelLoaded === true) {
            this.#showCreateFirstLookCoachmarkOnIdlePanelLoaded = false;
            this.#showCreateFirstLookCoachmark();
        }
    }

    async #onSearchBrand() {
        const look = this.controller.currentLook;
        if (look.hasBrandData()) {
            LooksAnalytics.onChangeBrand(look.identifier);
        } else {
            LooksAnalytics.onAddBrand(look.identifier);
        }

        this.#searchBrand(false).then((updatedBrand) => {
            // If the user applied a brand, we want to refresh the current look editor option toolbar
            if (updatedBrand) {
                const optionsToolbar = this.lookEditorOptionsPanel;
                if (IsKindOf(optionsToolbar, LogoLayerOptions)) {
                    // Force the logo layer options toolbar to refresh
                    this.#updateLogoLayerContents();
                } else if (IsKindOf(optionsToolbar, NametagColorOptions)) {
                    // Force the nametag color options toolbar to refresh
                    this.#onShowNametagColorPickerSheet(optionsToolbar.swatchName);
                } else if (IsKindOf(optionsToolbar, TintLayerOptions)) {
                    // Force the presenter tint layer options toolbar to refresh
                    this.#editPresenterTint();
                }
                // Other options toolbars don't have brand-specific content
            }
        });

    }

    async #searchBrand(forNewLook = false) {
        const look = this.controller.currentLook;
        if (!look) {
            return;
        }

        // Prompt the user for a brand
        let initialDomain = look.brandDomain;
        let showExamples = false;
        if (!initialDomain) {
            // If we're creating a new look, show example brands
            showExamples = forNewLook;

            // If the user's email address isn't a freemail domain,
            // prefill the text field with it
            const email = mmhmmAPI.defaultEndpoint().user?.email;
            if (email) {
                const domain = email.split("@")[1];
                if (!LooksUtils.isFreemailDomain(domain)) {
                    initialDomain = domain;
                }
            }
        }

        const title = forNewLook ?
            LocalizedString("Start with a brand") :
            LocalizedString("Add a brand");
        const action = forNewLook ?
            LocalizedString("No brand"):
            LocalizedString("Cancel");

        // Allow callers to block while the sheet is open
        const promise = promiseWrapper();

        const sheet = new BrandSearchSheet(title, action, initialDomain, showExamples);
        sheet.addEventListener("dismiss", async () => {
            const domain = sheet.selectedDomain;
            if (this.#isFictionalBrandDomain(domain)) {
                try {
                    await this.#updateLookWithFictionalBrandData(look, domain, forNewLook);
                    this.#refreshLookEditor(look);
                    promise.resolve(true);
                    return;
                } catch (err) {
                    console.error("Error updating look with brand data", err);
                }
            } else if (domain) {
                const brandData = await this.controller.getBrandDataForDomain(domain);
                if (brandData) {
                    try {
                        await this.#updateLookWithBrandData(look, brandData, forNewLook);
                        this.#refreshLookEditor(look);
                        promise.resolve(true);
                        return;
                    } catch (err) {
                        console.error("Error updating look with brand data", err);
                    }
                }
            } else if (forNewLook) {
                LooksAnalytics.onSkipBrandSearch(look.identifier);
            }
            promise.resolve(false);
        });
        sheet.displayAsModal();

        return promise;
    }

    #isFictionalBrandDomain(domain) {
        return domain && LookPresets.FictionalBrandData().some((brand) => brand.domain == domain);
    }

    async #updateLookWithFictionalBrandData(look, domain, forNewLook) {
        const match = LookPresets.FictionalBrandData().find((brand) => brand.domain == domain);
        if (!match) {
            console.error("No brand data found for domain " + domain);
            return;
        }
        look.rawBrandData = null;
        return this.controller.applyPresetToLook(look, match.preset);
    }

    async #updateLookWithBrandData(look, brandData, forNewLook) {
        // TODO if the look was associated with a preset that's not the "branded" preset,
        // change the preset?

        // Save the old brand data's name before updating to the new brand data
        const oldName = look.brandName;
        look.rawBrandData = brandData;

        if (!look.title || look.title == oldName) {
            // If the look's title is the same as the brand name,
            // update it to the new brand name
            const name = look.brandName;
            if (name) {
                this.#updateCurrentLookTitle(name);
                this.#refreshLookEditor(look);
            }
        }

        // Update the look's presenter background color
        const brandColor = look.primaryBrandColor;
        if (look.isTintEditable()) {
            if (brandColor) {
                const paint = LooksColors.linearGradientPaintForColor(brandColor);
                this.#onSetPresenterTint(paint);
            } else {
                this.#onRemovePresenterTint();
            }
        }
        if (look.hasLimitedColorOptions()) {
            // This look uses explicit color schemes, so set the color scheme
            if (brandColor) {
                const paint = LooksColors.solidPaintForColor(brandColor);
                this.#onSetColorScheme(paint);
            } else {
                this.#onRemoveColorScheme();
            }
        }

        // Update the look's logo
        const logoUrl = look.primaryBrandLogoUrl;
        if (logoUrl) {
            await this.#onReplaceLogoLayer(look, logoUrl, forNewLook);
        } else {
            await this.#onRemoveLogoLayer(look);
        }

        // For new looks, add a randomly chosen pattern
        if (forNewLook) {
            const pattern = LookPatterns.random();
            await this.#onReplacePatternLayer(look, pattern);
        }

        LooksAnalytics.onApplyBrandToLook(look.identifier, look.brandDomain);
    }

    #onSetPresenterBackgroundStyle(style) {
        this.stage.localPresenter.backgroundStyle = style;
        LooksAnalytics.onChangeLookBackgroundStyle(
            this.controller.currentLook?.identifier,
            style
        );

        // Update segmentation state in LUT/Tune widgets for alpha mode warnings
        this.#updateWidgetSegmentationState(style);

        // Update seg filter alpha-only mode based on new background style
        this.#updateSegmentationForAlphaMode();
    }

    /**
     * Update the segmentation active state in LUT and Tune widgets.
     * This enables/disables warnings when using Foreground/Background alpha modes.
     * @param {string} style - The background style
     */
    #updateWidgetSegmentationState(style) {
        const presenter = this.stage?.localPresenter;
        const isSegmentationActive =
            style === Presenter.BackgroundStyle.Hide ||
            style === Presenter.BackgroundStyle.Blur ||
            (presenter?.forceSegmentationForAlpha === true);

        if (this.lutWidget) {
            this.lutWidget.setSegmentationActive(isSegmentationActive);
        }
    }

    /**
     * Check if any LUT/Tune filter needs alpha mode segmentation and update presenter.
     * When Foreground or Background alpha mode is selected, segmentation is auto-enabled.
     */
    #updateSegmentationForAlphaMode() {
        const presenter = this.stage?.localPresenter;
        if (!presenter) {
            console.warn('[LUT] updateSegmentationForAlphaMode: No presenter');
            return;
        }

        // Get alpha modes from both LUT widget and Tune panel
        const lutAlphaMode = this.lutWidget?.getAlphaMode() ?? 0;
        const tuneValues = this.lutWidget?.getTuneValues();
        const tuneAlphaMode = tuneValues?.alphaMode ?? 0;

        // Check if either filter needs segmentation for alpha targeting
        const needsAlpha = (lutAlphaMode !== 0) || (tuneAlphaMode !== 0);

        console.log('[LUT] updateSegmentationForAlphaMode:', {
            lutAlphaMode,
            tuneAlphaMode,
            needsAlpha,
            currentForceSegmentation: presenter.forceSegmentationForAlpha
        });

        // Update presenter flag and trigger segmentation requirements update
        presenter.forceSegmentationForAlpha = needsAlpha;
        presenter.segmentationRequirementsChanged();

        // Update the seg filter to use alpha-only mode when needed
        const segFilter = presenter.layer?.videoLayer?.filters?.find(f => f instanceof Presenter.SegmentationFilter);
        if (segFilter) {
            // Only enable alpha-only mode when we're forcing segmentation for alpha
            // AND we don't have visual background effects (Hide/Blur)
            const hasVisualBackgroundEffect =
                presenter.backgroundStyle === Presenter.BackgroundStyle.Hide ||
                presenter.backgroundStyle === Presenter.BackgroundStyle.Blur ||
                presenter.backgroundPaint != null;

            segFilter.alphaOnly = needsAlpha && !hasVisualBackgroundEffect;
        }

        // Update widget warning states
        this.#updateWidgetSegmentationState(presenter.backgroundStyle);
    }

    #onSetPresenterShape(shape) {
        this.#setPresenterShape(shape);
        LooksAnalytics.onChangeLookShape(
            this.controller.currentLook?.identifier,
            shape
        );
    }

    #setPresenterShape(shape) {
        const presenter = this.stage.localPresenter;
        let scale = 1.0;

        // For Camera we've modified how the think about shape:
        // "None" means full screen video, e.g. rectangle at full scale
        // The other values use that shape and are inset
        if (shape == "none") {
            shape = Presenter.Shape.Rectangle;
        } else {
            scale = LooksUtils.minPresenterScale();

            // If there's a shape but not background (real or paint), add paint
            if (presenter.backgroundStyle == Presenter.BackgroundStyle.Hide && presenter.backgroundPaint == null) {
                presenter.backgroundPaint = new Paint.Color([0, 0, 0, .1]);
            }
        }

        presenter.shape = shape;
        this.#onPresenterInsetChange(scale);
    }

    #onPresenterInsetChange(value) {
        const size = Stage.DefaultSize;

        const presenter = this.stage.localPresenter;
        presenter.fullscreen = false;
        presenter.scale = value;

        // TODO seems like we should only do this in Rectangle, but...?
        if (presenter.shape == Presenter.Shape.Rectangle) {
            presenter.anchor = Stage.Object.Anchor.Center;
        }

        // TODO cropping makes sense when the background is visible, but not when it's hidden
        const scale = presenter.scale;
        const border = (size.width - scale * size.width) / 2;

        const height = size.height - border * 2;
        const crop = (scale * size.height - height) / 2;

        presenter.cropInsets = InsetsMake(crop / size.height, 0, crop / size.height, 0);
    }

    #isShapeNone() {
        return LooksUtils.isShapeNone(this.stage.localPresenter);
    }

    /**
     * @param {Paint} tint
     */
    #onSetPresenterTint(tint) {
        const presenter = this.stage.localPresenter;
        presenter.backgroundPaint = tint;
        // TODO deal with border color & gradients
        // TODO push this logic into the controller

        // If this look uses explicit color schemes, we don't
        // drive the rest of the colorization off of the presenter tint
        const look = this.controller.currentLook;
        if (!look.hasLimitedColorOptions()) {
            this.#updateColorizedLayers(tint);
        }
    }

    #onEditPresenterTint(element) {
        if (!this.#handleLayerEditorClick(element)) {
            return;
        }
        this.#editPresenterTint();
        LooksAnalytics.onOpenLookEditorLayerOptions(
            this.controller.currentLook?.identifier,
            "presenter.backgroundColor"
        );
    }

    #editPresenterTint() {
        const look = this.controller.currentLook;
        if (look?.hasLimitedColorOptions()) {
            // This look drives colorization from a color scheme,
            // not the presenter background
            this.#editColorScheme();
            return;
        }

        const presenter = this.stage.localPresenter;
        const currentTint = presenter.backgroundPaint;

        let startingColor = null;
        if (currentTint) {
            const color = currentTint.toCSS(true);
            startingColor = {
                value: color,
                paint: currentTint
            };
        }

        const optionsBar = new TintLayerOptions(
            this.controller.currentLook,
            startingColor,
            (newColor) => this.#onSetPresenterTint(newColor?.paint),
            () => this.#onRemovePresenterTint(),
            () => this.#onSearchBrand(),
            () => this.#dismissLookEditorToolbars()
        );
        this.#displayLookEditorToolbars(optionsBar);

        this.lookSettings.setEditingTint();
    }

    #editColorScheme() {
        // Similar to #editPresenterTint, but drives the color
        // scheme explicitly instead of driving it from
        // the presenter background color

        const look = this.controller.currentLook;
        const currentColor = look.getColorOption(); // Hex code
        let startingColor = null;
        if (currentColor) {
            const paint = LooksColors.solidPaintForColor(currentColor);
            startingColor = {
                value: paint.toCSS(true),
                paint
            };
        }

        const optionsBar = new TintLayerOptions(
            this.controller.currentLook,
            startingColor,
            (newColor) => this.#onSetColorScheme(newColor?.paint),
            () => this.#onRemoveColorScheme(),
            () => this.#onSearchBrand(),
            () => this.#dismissLookEditorToolbars()
        );
        this.#displayLookEditorToolbars(optionsBar);

        this.lookSettings.setEditingTint();
    }

    #onSetColorScheme(paint) {
        const look = this.controller.currentLook;

        const keyColor = LooksColors.primaryColorFromPaint(paint);

        // 1. Persist the color scheme change somewhere
        look.setColorOption(keyColor);

        // 2. Modify the presenter background tint
        const tint = look.getTintColorForColorScheme(keyColor);
        const presenter = this.stage.localPresenter;
        presenter.backgroundPaint = tint;

        // 3. Colorize other layers
        this.#updateColorizedLayers(paint);

        // 4. Update the look editor UI
        this.lookSettings.updateLayerContents(look);
    }

    #onRemoveColorScheme() {
        // TODO what should this do to colorized layers?
        this.#onSetPresenterTint(null);

        const look = this.controller.currentLook;
        look.setColorOption(null);

        this.lookSettings.updateLayerContents(look);
    }

    #onRemovePresenterTint() {
        this.#onSetPresenterTint(null);
    }

    /* Functionality related to colorized media */

    /**
     * If the current look has layers that are dynamically colorized, update them
     * to use the specified color.
     * @param {Paint} paint
     */
    async #updateColorizedLayers(paint) {
        const look = this.controller.currentLook;
        if (!look) {
            return;
        }

        const logoMedia = await look.getLogoMedia();
        if (logoMedia?.isColorizable) {
            this.#updateColorizedMedia(paint, look, logoMedia);
        }
        const overlayMedia = await look.getOverlayMedia();
        if (overlayMedia?.isColorizable) {
            this.#updateColorizedMedia(paint, look, overlayMedia);
        }
        const patternMedia = await look.getPatternMedia();
        if (patternMedia?.isColorizable) {
            this.#updateColorizedMedia(paint, look, patternMedia);
        }

        const preset = look.getPreset();
        if (preset) {
            preset.colorizeNametag(paint, look.getNametagMedia());

            // Update the name badge settings UI
            this.nameBadgeSettings.setLook(look);
        }
    }

    /**
     * @param {Paint} color
     * @param {Media} media
     * @param {LookOverlay|LookPattern} patternOrOverlay
     */
    async #updateColorizedMedia(color, look, media) {
        if (!media) {
            return;
        }

        const preset = look.getPreset();
        const callback = preset?.getColorizationCallback();

        LooksUtils.updateColorScheme(color, media, callback);

        media.setNeedsPersistence();
        if (media.refreshLayerContents) {
            media.refreshLayerContents();
        }
    }

    /* Layer editing functionality */

    get lookEditorOptionsPanel() {
        return this.#lookEditorOptions;
    }

    set lookEditorOptionsPanel(value) {
        this.#lookEditorOptions = value;
    }

    get lookEditorSettingsPanel() {
        return this.#lookEditorSettings;
    }

    set lookEditorSettingsPanel(value) {
        this.#lookEditorSettings = value;
    }

    #displayLookEditorToolbars(optionsToolbar, settingsToolbar = null) {
        const current = this.lookEditorOptionsPanel;
        if (current && current != optionsToolbar) {
            current.dismiss();
        }
        if (current != optionsToolbar) {
            optionsToolbar.display();
            this.lookEditorOptionsPanel = optionsToolbar;
        }
        this.#displayLookEditorSettingsToolbar(settingsToolbar);
    }

    #dismissLookEditorToolbars() {
        if (this.lookEditorOptionsPanel) {
            this.lookEditorOptionsPanel.dismiss();
            this.lookEditorOptionsPanel = null;
        }
        this.#dismissLookEditorSettingsToolbar();

        this.lookSettings.clearSelection();
        this.nameBadgeSettings.clearSelection();
    }

    #displayLookEditorSettingsToolbar(toolbar) {
        const current = this.lookEditorSettingsPanel;
        if (current && current != toolbar) {
            current.dismiss();
        }
        if (toolbar && current != toolbar) {
            toolbar.display();
            // TODO see if we can apply this same pattern to the options toolbars -
            // attach handlers to their container instead of doing the event handling
            // inside the toolbar classes.
            toolbar.container.addEventListener("change", this.#handleOnChange);
            toolbar.container.addEventListener("input", this.#handleOnInputChange);
            this.lookEditorSettingsPanel = toolbar;
        }
    }

    #dismissLookEditorSettingsToolbar() {
        const toolbar = this.lookEditorSettingsPanel;
        if (toolbar) {
            toolbar.container.removeEventListener("change", this.#handleOnChange);
            toolbar.container.removeEventListener("input", this.#handleOnInputChange);
            toolbar.dismiss();
            this.lookEditorSettingsPanel = null;
        }
    }

    #handleLayerEditorClick(element) {
        // If the user clicks on the currently selected layer,
        // we'll close the toolbar
        if (element?.getAttribute("aria-selected") == "true") {
            this.#dismissLookEditorToolbars();
            return false;
        }
        return true;
    }

    /**
     * Called when the look has been changed and we need to refresh
     * the various parts of the look editor UI.
     * @param {Look} look
     */
    #refreshLookEditor(look) {
        this.lookSettingsPanel.setLook(look);

        // The "Style" tab
        this.lookSettings.slideChanged(look);

        // The "Name tag" tab
        this.nameBadgeSettings.setLook(look);

        // The top bar, which has the "Add brand" button
        this.editorTopBar.setLook(look);
    }

    async #onUpdateLogoLayerContents(element) {
        if (!this.#handleLayerEditorClick(element)) {
            return;
        }
        this.#updateLogoLayerContents();
        LooksAnalytics.onOpenLookEditorLayerOptions(this.controller.currentLook?.identifier, LooksMediaType.Logo);
    }

    async #updateLogoLayerContents() {
        const optionsBar = new LogoLayerOptions(
            this.controller.currentLook,
            () => this.#onSearchLogo(),
            (look) => this.#onRemoveLogoLayer(look),
            (look, url) => this.#onReplaceLogoLayer(look, url),
            () => this.#dismissLookEditorToolbars()
        );
        const settingsBar = new LogoLayerSettings(this.controller.currentLook);
        this.#displayLookEditorToolbars(optionsBar, settingsBar);

        this.lookSettings.setEditingLogo();
    }

    async #onSearchLogo(forNewLook = false) {
        // TODO analytics?

        this.#searchBrand(forNewLook).then((addedLogo) => {
            // Refresh the contents of the logo options list
            if (addedLogo) {
                this.#updateLogoLayerContents();
            }
        });
    }

    async #onRemoveLogoLayer(slide) {
        const media = await slide.getLogoMedia();
        if (media) {
            await this.#onRemoveImageLayer(slide, media);
        }
    }

    async #onReplaceLogoLayer(slide, assetUrl, randomizeSizeAndPosition = false) {
        const toReplace = await slide.getLogoMedia();
        const preset = slide.getPreset();

        let media = null;
        if (assetUrl) {
            if (preset) {
                // The preset makes the Media object for us
                const tint = this.stage.localPresenter.backgroundPaint;
                media = await preset.createLogoMedia(this.stage, assetUrl, tint);
            } else {
                // No preset, just create a basic image media
                media = LooksUtils.createImageMediaFromURL(assetUrl, LooksMediaType.Logo);
            }
        } else {
            // No URL, the user wants to upload their own logo
            media = await this.#promptForMedia();
            if (media) {
                media.metadata = { type: LooksMediaType.Logo };
                if (preset?.anchorInset != null) {
                    media.metadata.anchorInset = preset.anchorInset;
                }
            }
        }
        if (!media) {
            return;
        }

        if (toReplace) {
            // If we're replacing an existing logo, keep its existing properties
            media.zIndex = toReplace.zIndex;
            media.anchor = toReplace.anchor;
            if (media.anchor == Stage.Object.Anchor.None) {
                media.center = toReplace.center;
            }
            if (preset?.logoScale !== 0) {
                // Copy over the scale unless we're using a preset that specifies "natural scale"
                media.scale = toReplace.scale;
            }
        } else if (!preset) {
            // If we have a preset, properties were set when creating the Media above
            media.anchor = this.#chooseAnchorForLogo(randomizeSizeAndPosition);
            try {
                media.scale = await this.#chooseScaleForLogo(media, randomizeSizeAndPosition);
            } catch (err) {
                console.error("Error calculating logo scale", err);
            }
        }

        try {
            if (toReplace) {
                await slide.replaceObject(toReplace, media, false);
            } else {
                await this.#addMediaLayer(slide, media);
            }
            this.lookSettings.updateLayerContents(slide);
            this.lookEditorSettingsPanel?.update();
            return media;
        } catch (err) {
            console.error("Error replacing logo media on slide", err);
        }
    }

    async #chooseScaleForLogo(media, randomize) {
        const options = [
            SizeMake(480, 480),
            SizeMake(440, 440),
            SizeMake(400, 400),
            SizeMake(360, 360),
        ];
        const index = randomize ? Math.floor(Math.random() * options.length) : 0;
        return await LooksUtils.calculateScaleForLogo(media, options[index]);
    }

    #chooseAnchorForLogo(randomize) {
        const options = [
            Stage.Object.Anchor.TopLeft,
            Stage.Object.Anchor.TopRight,
        ];
        const index = randomize ? Math.floor(Math.random() * options.length) : 0;
        return options[index];
    }

    async #onLogoLayerPositionChange(value) {
        const look = this.controller.currentLook;
        const media = await look.getLogoMedia();
        if (media) {
            media.anchor = value;
        } else {
            console.error("Can't find logo layer to update");
        }
    }

    async #onLogoLayerScaleChange(value) {
        const look = this.controller.currentLook;
        const media = await look.getLogoMedia();
        if (media) {
            media.scale = value;
        } else {
            console.error("Can't find logo layer to update");
        }
        this.lookEditorSettingsPanel?.update();
    }

    async #onUpdatePatternLayerContents(element) {
        if (!this.#handleLayerEditorClick(element)) {
            return;
        }

        const toolbar = new PatternLayerOptions(
            this.controller.currentLook,
            (look) => this.#onRemovePatternLayer(look),
            (look, pattern) => this.#onReplacePatternLayer(look, pattern),
            () => this.#dismissLookEditorToolbars()
        );
        const settingsBar = new PatternLayerSettings(this.controller.currentLook);
        this.#displayLookEditorToolbars(toolbar, settingsBar);

        this.lookSettings.setEditingPattern();

        LooksAnalytics.onOpenLookEditorLayerOptions(this.controller.currentLook?.identifier, LooksMediaType.Pattern);
    }

    /**
     * @param {Slide.Modern} slide
     * @param {LookPattern?} pattern
     */
    async #onReplacePatternLayer(slide, pattern=null) {
        const toReplace = await slide.getPatternMedia();
        const assetUrl = pattern?.assetUrl;

        // See if this is the same pattern as the current one
        if (pattern && pattern.fingerprint == toReplace?.asset?.fingerprint) {
            return;
        }

        let media = null;
        if (assetUrl) {
            media = LooksUtils.createImageMediaFromURL(assetUrl, LooksMediaType.Pattern);
            if (pattern?.isColorizable) {
                const color = slide.getColorizationColor(this.stage.localPresenter);
                this.#updateColorizedMedia(color, slide, media);
            }
        } else {
            media = await this.#promptForMedia();
            if (media) {
                media.metadata = { type: LooksMediaType.Pattern };
            }
        }
        if (!media) {
            return;
        }
        media.zIndex = toReplace?.zIndex;
        media.anchor = Stage.Object.Anchor.None;
        media.scale = 1.0;
        media.center = LooksUtils.stageCenterPoint(this.stage);

        const opacity = toReplace ? slide.getPatternOpacityForMedia(toReplace) : slide.getDefaultOpacityForPattern(pattern);
        media.opacity = slide.getMediaOpacityForPattern(media, opacity);

        try {
            if (toReplace) {
                await slide.replaceObject(toReplace, media, false);
            } else {
                await this.#addMediaLayer(slide, media);
            }
            this.lookSettings.updateLayerContents(slide);
            this.lookEditorSettingsPanel?.update();
            return media;
        } catch (err) {
            console.error("Error adding pattern media to slide", err);
        }
    }

    async #onRemovePatternLayer(slide) {
        const media = await slide.getPatternMedia();
        if (media) {
            await this.#onRemoveImageLayer(slide, media);
        }
    }

    async #onPatternLayerOpacityChange(value) {
        const look = this.controller.currentLook;
        const media = await look.getPatternMedia();
        if (media) {
            media.opacity = look.getMediaOpacityForPattern(media, value);
        } else {
            console.error("Can't find pattern layer to update");
        }
        this.lookEditorSettingsPanel?.update();
    }

    async #onUpdateOverlayLayerContents(element) {
        if (!this.#handleLayerEditorClick(element)) {
            return;
        }

        const toolbar = new OverlayLayerOptions(
            this.controller.currentLook,
            (look) => this.#onRemoveOverlayLayer(look),
            (look, pattern) => this.#onReplaceOverlayLayer(look, pattern),
            () => this.#dismissLookEditorToolbars()
        );
        const settingsBar = new OverlayLayerSettings(this.controller.currentLook);
        this.#displayLookEditorToolbars(toolbar, settingsBar);

        this.lookSettings.setEditingOverlay();

        LooksAnalytics.onOpenLookEditorLayerOptions(this.controller.currentLook?.identifier, LooksMediaType.Overlay);
    }

    async #onRemoveOverlayLayer(slide) {
        const media = await slide.getOverlayMedia();
        if (media) {
            await this.#onRemoveImageLayer(slide, media);
        }
    }

    /**
     * @param {Slide.Modern} slide
     * @param {LookOverlay?} overlay
     */
    async #onReplaceOverlayLayer(slide, overlay=null) {
        const toReplace = await slide.getOverlayMedia();
        const assetUrl = overlay?.assetUrl;

        // See if this is the same overlay as the current one
        if (overlay && overlay.fingerprint == toReplace?.asset?.fingerprint) {
            return;
        }

        let media = null;
        if (assetUrl) {
            media = LooksUtils.createImageMediaFromURL(assetUrl, LooksMediaType.Overlay);
            if (overlay?.isColorizable) {
                const color = slide.getColorizationColor(this.stage.localPresenter);
                this.#updateColorizedMedia(color, slide, media);
            }
        } else {
            media = await this.#promptForMedia();
            if (media) {
                media.metadata = { type: LooksMediaType.Overlay };
            }
        }
        if (!media) {
            return;
        }
        media.zIndex = toReplace?.zIndex;
        media.anchor = Stage.Object.Anchor.None;
        media.scale = 1.0;
        media.center = LooksUtils.stageCenterPoint(this.stage);

        try {
            if (toReplace) {
                await slide.replaceObject(toReplace, media, false);
            } else {
                await this.#addMediaLayer(slide, media);
            }
            this.lookSettings.updateLayerContents(slide);
            this.lookEditorSettingsPanel?.update();
            return media;
        } catch (err) {
            console.error("Error replacing logo media on slide", err);
        }
    }

    async #onOverlayLayerOpacityChange(value) {
        const look = this.controller.currentLook;
        const media = await look.getOverlayMedia();
        if (media) {
            media.opacity = value;
        } else {
            console.error("Can't find overlay layer to update");
        }
        this.lookEditorSettingsPanel?.update();
    }

    #onUpdateWallpaperLayerContents(element) {
        if (this.#handleLayerEditorClick(element)) {
            this.#updateWallpaperLayerContents();
            LooksAnalytics.onOpenLookEditorLayerOptions(this.controller.currentLook?.identifier, "look.wallpaper");
        }
    }

    #updateWallpaperLayerContents() {
        const optionsBar = new WallpaperLayerOptions(
            this.controller.currentLook,
            this.stage.room,
            this.roomsStore,
            (id) => this.#onRoomThumbnailClick(id),
            (evt) => { return this.#onUploadWallpaper(evt) },
            () => this.#dismissLookEditorToolbars()
        );
        this.#displayLookEditorToolbars(optionsBar);

        this.lookSettings.setEditingWallpaper();
    }

    async #addMediaLayer(look, media, onProgress) {

        // When replacing an existing layer's contents, maintain the same zIndex
        //     This is done elsewhere
        // Use sane defaults for the zIndex for each layer

        const presenter = this.stage.localPresenter;
        const presenterForegroundZindex = presenter.foregroundZIndex;
        const presenterBackgroundZindex = presenter.zIndex;

        const type = media.metadata?.type;
        const targetZ = LooksUtils.defaultZIndexForLayer(type, presenterForegroundZindex);
        if (targetZ <= presenterBackgroundZindex) {
            console.error("LooksPane: adding media layer below presenter background layer!");
        }

        // Add the new media item with the calculated z-index
        media.zIndex = targetZ;
        console.log("Adding media layer", type, "with z-index", targetZ);
        await look.addObjects([media], onProgress, null, false);

        // Sanity check the layering
        // Find the media item for each layer
        const logo = await look.getLogoMedia();
        const overlay = await look.getOverlayMedia();
        const pattern = await look.getPatternMedia();
        const layers = [logo, overlay, pattern, presenter].filter((m) => m != null);
        let outOfOrder = false;
        for (let i = 1; i < layers.length; i++) {
            const top = layers[i-1];
            const bottom = layers[i];
            if (top.zIndex <= bottom.zIndex) {
                outOfOrder = true;
            }
        }
        if (layers[0].zIndex >= presenterForegroundZindex) {
            outOfOrder = true;
        }

        // Fix this by brute-forcing the z-indexes to their defaults
        if (outOfOrder) {
            console.error("z-indexes are not in order!");
            presenter.foregroundZIndex = Slide.Modern.DefaultPresenterZIndices.Foreground;
            if (logo) {
                logo.zIndex = LooksUtils.defaultZIndexForLayer(LooksMediaType.Logo);
            }
            if (overlay) {
                overlay.zIndex = LooksUtils.defaultZIndexForLayer(LooksMediaType.Overlay);
            }
            if (pattern) {
                pattern.zIndex = LooksUtils.defaultZIndexForLayer(LooksMediaType.Pattern);
            }
            presenter.zIndex = Slide.Modern.DefaultPresenterZIndices.Background;
        }
    }

    async #onRemoveImageLayer(slide, media) {
        try {
            await slide.deleteObjects([media]);
            return Promise.allSettled([
                this.lookSettings.updateLayerContents(slide),
                this.lookEditorSettingsPanel?.update()
            ]);
        } catch (err) {
            // TODO error handling
            console.error("Error removing layer media from slide", err);
        }
    }

    /* Look thumbnail functionality */

    /**
     * Called when a slide thumbnail has been updated.
     * @param {Slide.Modern} slide
     */
    onSlideThumbnailUpdated(_info, _name, slide) {
        if (this.#getLooksPresentation()?.containsSlide(slide)) {
            const currentSlide = this.#findActiveSlide();
            if (currentSlide == slide) {
                this.#updateCurrentLookThumbnail();
            } else {
                // TODO if you select and then quickly deselect a look,
                // the thumbnail may end up getting updated after the look
                // has been deselected, which resets it back to a generic
                // thumbnail. We don't want to overwrite "live" thumbs with
                // generic ones...should we just remove this, or do we need
                // to detect "this is a generic thumbnail" and allow updates?
                this.looksWidget.updateLookThumbnail(slide);
            }
        } else if (this.#getReactionsPresentation()?.containsSlide(slide)) {
            this.reactionsPanel.updateReactionThumbnail(slide);
            this.awayWidget.updateReactionThumbnail(slide);
        }
    }

    #updateCurrentLookThumbnail() {
        // If we're currently in the look editor, skip this - we'll update
        // thumbnails when the user is done editing the look
        if (this.isLookEditorOpen()) {
            return;
        }

        const activeLook = this.#findActiveSlide();
        if (!activeLook) {
            return;
        }

        // Should we stage snapshots as thumbnails instead of the standard
        // slide thumbnails that use a presenter silhouette icon?
        const useLive = this.#useLiveThumbnails();

        if (useLive) {
            // Use a live grab of the stage as the thumbnail,
            // but only if the presenter's video is on
            if (this.stage.localPresenter.videoTrackEnabled) {
                this.#createStageSnapshot(activeLook, this.stage).then((img) => {
                    this.looksWidget.updateLookThumbnail(activeLook, img.cloneNode());
                });
            }
        } else {
            // The application debounces changes so that we're not constantly
            // persisting them to the cloud and rerendering thumbnails.
            // However, since we have an explicit "done editing this look"
            // action, we can work around the debounce delay by explicitly
            // forcing persistence and deleting the current thumbnail, which will
            // force a new one to be generated.
            activeLook?.performPersistence().then((_) => {
                ThumbnailStorage.shared.delete(activeLook).then((_) => {
                    this.looksWidget.updateLookThumbnail(activeLook);
                });
            });
        }
    }

    async #createStageSnapshot(slide, stage) {
        // Figure out the thumbnail size
        const thumbnailScale = 4;
        const stageSize = stage.size;
        const thumbnailSize = SizeMake(
            stageSize.width / thumbnailScale,
            stageSize.height / thumbnailScale
        );

        // Hide the nametag and visuals from the snapshot
        const hiddenLayers = [];
        if (IsKindOf(slide, Slide.Look)) {
            const nametag = slide.getNametagMedia();
            if (nametag && nametag.backgroundLayer.hidden == false) {
                hiddenLayers.push(nametag.backgroundLayer);
            }
        }

        // Hide any media that aren't part of the look
        for (const media of stage.media) {
            if (!slide.objects.includes(media) && media.layer != null) {
                hiddenLayers.push(media.layer);
            }
        }
        hiddenLayers.forEach((layer) => (layer.hidden = true));

        const promise = promiseWrapper();
        try {
            stage.renderer.snapshot(thumbnailSize).then((blob) => {
                // Restore the hidden media
                hiddenLayers.forEach((layer) => (layer.hidden = false));

                // Cache it
                // TODO If we end up liking this snapshot-as-thumbnail approach,
                // this logic should be moved into the slide or some such
                ThumbnailStorage.shared.put(blob, slide);

                // Create a new image out of the snapshot
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.src = url;
                img.decode().then((_) => URL.revokeObjectURL(url));

                promise.resolve(img);
            });
        } catch (err) {
            console.error("Error creating thumbnail from stage snapshot", err);
            promise.reject(err);
        }
        return promise;
    }

    /* Looks room / wallpaper functionality */

    async #onUploadWallpaper(evt) {
        try {
            const media = await Media.Files.requestFile(evt, null, Media.Files.imageAndVideoMimeTypes());
            if (media) {
                const room = await this.#addNewWallpaper(media);
                if (room) {
                    await this.#onRoomThumbnailClick(room.identifier);
                    return room;
                }
            }
        } catch (err) {
            console.error("Error uploading wallpaper", err);
        }
        return null;
    }

    async #addNewWallpaper(media) {
        try {
            const room = await this.roomsStore.createNewRoomFromLocalAsset(media);
            if (room) {
                this.roomsStore.addRoomToRecents(room);
            }
            return room;
        } catch (err) {
            console.error("Error creating new custom room from media", err);
        }
    }

    async #onRoomThumbnailClick(id) {
        this.#undoManager?.beginUndoGrouping();
        try {
            const room = this.#findRoomById(id);
            await this.roomsStore.loadRoomIntoStage(room);

            // If the shape is "none", set it to rectangle
            // This is legacy behavior, so only do this if the look doesn't come from a preset
            const look = this.controller.currentLook;
            if (!look?.hasPreset()) {
               if (LooksUtils.isWallpaperNone(this.stage.localPresenter)) {
                    this.#setPresenterShape(Presenter.Shape.Rectangle);
                }
            }
        } finally {
            this.#undoManager?.endUndoGrouping();
        }
    }

    /**
     * Called when the selected room changed.
     */
    #onRoomChanged() {
    }

    /**
     * Called when the list of available rooms changes.
     */
    async #onRoomsChanged() {
        // Make sure we update the selection state now that the list has changed
        this.#onRoomChanged();
    }

    /**
     * @param {string} id
     * @returns {Room}
     */
    #findRoomById(id) {
        return this.roomsStore.roomWithIdentifier(id);
    }

    #isBackgroundVisible() {
        return this.stage.renderer.willLayerBeRendered(this.stage.room.layer);
    }

    /* Nametag functionality */

    #nametagThumbnailNeedsUpdate = debounce(() => {
        this.nameBadgeSettings.updateThumbnail(this.controller.selectedLook);
    }, 500);

    #onToggleNametagVisible(enabled) {
        this.#toggleNametagVisible(enabled);
        LooksAnalytics.onToggleNametag(this.controller.currentLook, enabled);
    }

    #toggleNametagVisible(enabled) {
        SharedUserDefaults.setValueForKey(enabled, this.#defaultsKeyNametagVisible);
        if (enabled && !this.controller.canEnableNametags()) {
            enabled = false;
        }
        this.controller.nametagVisible = enabled;
        this.nameBadgeSettings.nametagVisible = enabled;
        this.widgetBar.nametagEnabled = enabled;
        this.nametagWidget.setNametagEnabled(enabled);

        if (enabled) {
            if (this.controller.isAway()) {
                Toast.show(LocalizedString("Name tags are not shown when away"));
            } else if (this.controller.currentLook == null) {
                Toast.show(LocalizedString("Name tags are not shown when looks are off"));
            }
        }

        this.#notifyHybridOfStateChanges();
    }

    #handleToggleNametagKeyboardEvent() {
        const visible = this.controller.nametagVisible;
        this.#onToggleNametagVisible(!visible);
    }

    /**
     * Action sheet to choose colors for a nametag
     * @param {string} name the name of the Media.NameBadge.variables key to change
     * @param {HTMLElement} target use to position the action sheet
     */
    #onShowNametagColorPickerSheet(name) {
        const startingColor = this.nameBadgeSettings.getSwatchColor(name);
        const optionsBar = new NametagColorOptions(
            this.controller.currentLook,
            startingColor,
            (newColor) => {
                this.#onNametagColorChange(name, newColor);
                this.nameBadgeSettings.colorSwatchChanged(name, newColor);
            },
            null, // No "none" option
            () => this.#onSearchBrand(),
            () => this.#dismissLookEditorToolbars(),
            name
        );
        this.#displayLookEditorToolbars(optionsBar);

        this.nameBadgeSettings.setEditingColorSwatch(name);
    }

    /**
     * @param {string} name the name of the Media.NameBadge.variables key to change
     * @param {Object} color - Color configuration.
     * @param {{ value: string, rgba: { r: number, g: number, b: number, a: number } }} color
     */
    #onNametagColorChange(name, color) {
        const slide = this.controller.currentLook;
        LooksNameBadgeHandler.updateNameBadgeColor(slide, name, color);
    }

    #onRevertNametagColors() {
        const look = this.controller.currentLook;
        const paint = this.stage.localPresenter.backgroundPaint;
        this.nameBadgeHandler.revertNameBadgeColorsToDefaults(look, paint);
        this.nameBadgeSettings.setLook(look);
    }

    /**
     * Expose a public function to open the picker.
     */
    showLooksCatalog() {
        this.#onShowLooksCatalog();
    }

    #onShowLooksCatalog() {
        this.#previouslySelectedLook = this.controller.selectedLook;
        this.#showLooksCatalog();
    }

    #showLooksCatalog() {
        this.#dismissLookEditorToolbars();
        this.presetsPanel.setSelectedItemId(null);
        document.body.classList.remove(this.#cls.lookEditor);

        // Make sure looks are visible and we're not away
        if (!this.controller.getLooksToggle()) {
            this.#toggleLookOn();
        }
        if (this.controller.isAway()) {
            this.#onToggleAwayOff();
        }

        this.#useSideBySideLayout();
        this.#setState(this.#states.LOOKS_LIST);
        return;
    }

    #onCancelLooksCatalog() {
        const selectedLook = this.controller.selectedLook;
        const previouslySelectedLook = this.#previouslySelectedLook;

        if (previouslySelectedLook && previouslySelectedLook != selectedLook) {
            this.#selectLookBypassingTransition(previouslySelectedLook);
        }

        // The user may have tried other catalog looks that they ultimately
        // decided not to use
        this.#cleanUpTemporaryCatalogLooks();

        this.#backToIdle();
    }

    async #onImportLookFromCatalog(id) {
        try {
            // If it's already selected, don't re-create it
            if (id == this.presetsPanel.getSelectedItemId()) {
                return;
            }

            const slide = await this.controller.importObject(id, LooksContentType.Look);
            if (slide) {
                // Keep track of the fact that this look came from the catalog
                // and the user hasn't yet decided to "use" it.
                slide.temporaryCatalogLook = true;
                this.presetsPanel.setSelectedItemId(id);
            } else {
                console.error("Import returned no slide!");
            }
        } catch (err) {
            console.error("Error importing look", err);
        }
    }

    #cleanUpTemporaryCatalogLooks() {
        // While in the catalog, the user may have imported a number of looks
        // from the catalog but ultimately not decided to use them. When existing
        // the catalog, we need to clean these up.
        const presentation = this.#getLooksPresentation();
        const slides = presentation.activeSlides.filter(s => s.temporaryCatalogLook);

        // Sanity check - we don't want to mistakenly delete real looks
        const nonCatalogLooks = slides.filter(s => !s.lookCameFromShare());
        if (nonCatalogLooks.length > 0) {
            console.error("Found non-catalog looks marked as temporary!", nonCatalogLooks);
            return;
        }

        // Delete these temporary looks
        presentation.deleteSlides(slides, (err) => {
            if (err != null) {
                console.error("Error deleting temporary catalog looks", err);
            }
        });
    }

    /**
     * See https://github.com/All-Turtles/mmhmm-web/issues/5073
     * @param {CloudyRecord[]} records
     */
    #logUnuploadedAssets(records) {
        if (records == null) {
            return;
        }

        // Look for Media records with unuploaded assets
        records.forEach((record) => {
            if (record.collection == mmhmmAPI.CloudyCollectionTypes.Media &&
                record.assetReferences != null &&
                record.assetReferences.some((asset) => asset.uploaded !== true)) {
                console.error(`Found unuploaded assets in imported record ${record.id}`);
                gSentry.message(`Found unuploaded assets in imported record ${record.id}`);
            }
        });
    }

    #onEditNametag() {
        if (!this.controller.nametagVisible) {
            this.#toggleNametagVisible(true);
        }
        this.lookSettingsPanel.setActiveTab(LookSettingsPanel.tabIds.NAMETAG);

        const look = this.controller.currentLook;
        this.#enterLookEditor(this.#states.LOOK_SETTINGS, look);
        LooksAnalytics.onEditNametag(look);
    }

    /**
     * Action sheet to choose a name badge style
     * @param {HTMLElement} target use to position the action sheet
     */
    #onShowNametagStyleSheet(target) {
        const look = this.controller.currentLook;

        const baseStyles = look.getNametagStyleOptions() ?? Object.values(Media.NameBadge.Styles);
        const customNametagStyles = this.controller.listCustomNametagStyles();
        const styleOptions = [ ...baseStyles, ...customNametagStyles ];

        const onChange = (styleId) => {
            const customNametag = customNametagStyles.find((s) => s.style.id === styleId);
            if (customNametag) {
                this.nameBadgeHandler.useCustomNametag(look, customNametag);
            } else {
                const tint = this.stage.localPresenter.backgroundPaint;
                this.nameBadgeHandler.changeStyle(look, tint, styleId);
            }
        };

        this.nameBadgeSettings.showNametagStylesSheet(target, styleOptions, onChange);
    }

    /* Reactions functionality */

    #createReactionControlOverlay() {
        const overlay = new ReactionOverlay(
            () => this.#onToggleReactionStyle(),
            () => this.#deselectReaction(),
            () => this.#onEditReaction(),
        );
        const overlayContainer = document.getElementById("stage_overlay");
        overlay.attachTo(overlayContainer);
        return overlay;
    }

    #onToggleReactionStyle() {
        const slide = this.controller.currentReaction;
        const currentLayout = slide.layout;
        let updatedLayout = null;
        switch (currentLayout) {
            case LooksReactionLayout.FullScreen:
                updatedLayout = LooksReactionLayout.OverTheShoulder;
                break;
            case LooksReactionLayout.OverTheShoulder:
                updatedLayout = LooksReactionLayout.FullScreen;
                break;
            default:
                console.error("Unknown reaction style", currentLayout);
                return currentLayout;
        }
        this.#onEditReactionStyle(updatedLayout);
        return updatedLayout;
    }

    async #onDuplicateCurrentReaction() {
        this.#backToIdle();

        const reaction = this.controller.currentReaction;
        if (!reaction) {
            return;
        }
        this.controller.currentReaction = null;

        await this.controller.duplicateReaction(reaction);
    }

    async #onDuplicateReaction(reaction) {
        const slide = await this.controller.duplicateReaction(reaction);
        if (slide) {
            LooksAnalytics.onReactionDuplicated(reaction.identifier, slide.identifier);
        }
    }

    async #onRevertReaction(reaction, sharedObject) {
        const proceed = await this.#confirmOperation(
            LocalizedString("Revert Visual"),
            LocalizedString(
                "Are you sure you want to discard your changes and revert to the catalog version of this visual?"
            ),
            LocalizedString("Revert")
        );
        if (proceed) {
            await this.controller.revertReaction(reaction, sharedObject);
            LooksAnalytics.onReactionReverted(
                reaction.identifier,
                sharedObject.identifier
            );
        }
    }

    async #onDeleteCurrentReaction(requiresConfirmation) {
        const reaction = this.controller.currentReaction;
        if (reaction) {
            if (this.#onDeleteReaction(reaction, requiresConfirmation)) {
                this.#setState(this.#states.IDLE);
            }
        }
    }

    async #onDeleteReaction(reaction, requiresConfirmation) {
        const proceed = !requiresConfirmation || await this.#confirmOperation(
            LocalizedString("Delete visual"),
            LocalizedString("Are you sure you want to delete this visual?"),
            LocalizedString("Delete")
        );
        if (proceed) {
            this.controller.deleteReaction(reaction);
            LooksAnalytics.onReactionDeleted(reaction.identifier);
        }
        return proceed;
    }

    /**
     * Create a new reaction with the contents of a drag & drop operation
     * @param {DataTransfer} dataTransfer
     * @return {Promise<Slide.Modern>}
     */
    async #onDropReaction(dataTransfer) {
        const slide = await this.controller.createReactionFromDataTransfer(dataTransfer);
        if (slide) {
            this.#onReactionClicked(slide.identifier);
        }
        return slide;
    }

    /**
     * Create a new reaction with the contents of an uploaded file
     * @param {Media} media
     * @returns {Promise<Slide.Modern>}
     */
    async #onUploadReaction(media) {
        const slide = await this.controller.createReaction(media);
        if (slide) {
            this.#onReactionClicked(slide.identifier);
        }
        return slide;
    }

    /**
     * Create a new reaction with a GIPHY search result
     * @param {Media} media
     * @returns {Promise<Slide.Modern>}
     */
    async #onAddGIPHYReaction(media) {
        const style = this.#getDefaultReactionLayout();
        const position = this.#getDefaultReactionAnchor();
        const scale = SharedUserDefaults.getValueForKey(this.#defaultsKeyNewReactionScale);

        const slide = await this.controller.createReaction(media, style, position, scale);
        if (slide) {
            this.#onReactionClicked(slide.identifier);
        }
        return slide;
    }

    #onReactionClicked(id) {
        if (this.controller.isAway()) {
            Toast.show(LocalizedString("Visuals are not shown while away"));
            return;
        }

        const currentSelection = this.controller.currentReaction;
        if (currentSelection?.identifier == id) {
            // If this is already the selected reaction, toggle it off
            this.controller.currentReaction = null;
            LooksAnalytics.onReactionClicked(null);
        } else {
            const reaction = this.controller.reactionWithIdentifier(id);
            if (reaction && !reaction.worksWithNametags()) {
                // Turn off name tags, they don't work with some reactions
                this.nameBadgeSettings.previewEnabled = false;
            }
            this.controller.currentReaction = reaction;
            LooksAnalytics.onReactionClicked(id, reaction?.exportId);
        }

    }

    #onSelectedReactionChanged() {
        const reaction = this.controller.currentReaction;
        if (reaction) {
            this.reactionsPanel.selectReaction(reaction.identifier);
        } else {
            this.reactionsPanel.unselectReaction();
        }
    }

    async #onReactionsSlidesChanged() {
        const presentation = this.controller.reactionsPresentation;
        await this.reactionsPanel.reactionsChanged(presentation.activeSlides);

        // Away screens are currently reactions used for a special purpose
        this.#onAwayScreenSlidesChanged();
    }

    #deselectReaction() {
        this.controller.currentReaction = null;
    }

    #onCancelReactionSearch() {
        this.reactionsPanel.clearSearch();
    }

    #handleHideReactionKeyboardEvent() {
        this.#deselectReaction();
        LooksAnalytics.onReactionClicked(null);
    }

    #handleSearchReactionsKeyboardEvent() {
        this.reactionsPanel.focusSearchInput();
    }

    async #onShareCurrentReaction() {
        return this.#onShare();
    }

    async #onShare() {
        const reaction = this.controller.currentReaction;
        if (!reaction) {
            // If there's no reaction selected, share the current look instead
            // If there's no look selected, it will fall back to sharing the app
            return this.#onShareCurrentLook();
        }

        const sharing = this.controller.sharing;
        const sheet = new LooksShareSheet(sharing, reaction, LooksContentType.Reaction);
        sheet.addEventListener("dismiss", () => {
            sharing.refreshContent();
        });
        sheet.displayAsModal();
    }

    async #onEditReaction() {
        const reaction = this.controller.currentReaction;
        if (!reaction) {
            return;
        }

        const currentLayout = reaction.layout;

        let options = [];

        // If the reaction has exactly 1 media, we can apply standard layouts
        let includePosition = false;
        let anchor = null;
        let scale = null;

        if (reaction.objects.length == 1) {
            const media = reaction.objects[0];

            if (!IsKindOf(media, Media.NameBadge)) {
                includePosition = true;
                anchor = media.anchor;

                options.push({
                    id: LooksReactionLayout.FullScreen,
                    label: LocalizedString("Full Screen")
                });
                options.push({
                    id: LooksReactionLayout.OverTheShoulder,
                    label: LocalizedString("Inset")
                });
            }

            if (!IsKindOf(media, Media.NameBadge) && !IsKindOf(media, Media.Text)) {
                scale = media.scale;
            }
        }

        // Custom reactions are just slides created in Creator, at least for now
        const custom = reaction.isCustomReaction();
        if (custom) {
            options.push({
                id: LooksReactionLayout.SlideMedia,
                label: LocalizedString("Slide media only")
            });
            options.push({
                id: LooksReactionLayout.SlideAndPresenter,
                label: LocalizedString("Slide media and presenter")
            });
        }

        options = options.map((option) => ({
            label: option.label,
            value: option.id,
            selected: option.id == currentLayout
        }));

        this.reactionSettings.updateStyleTab(
            reaction,
            options,
            includePosition,
            anchor,
            scale
        );

        const positionEditable = currentLayout == LooksReactionLayout.OverTheShoulder;
        this.reactionSettings.reactionLayoutChanged(positionEditable, anchor, scale);

        this.#setState(this.#states.REACTIONS_SETTINGS);
        LooksAnalytics.onEditReaction(reaction.identifier);
    }

    #onEditReactionText(id, key, value) {
        const reaction = this.controller.currentReaction;
        if (!reaction) {
            return;
        }

        const media = reaction.objects.find((val) => val.identifier === id);
        if (!media) {
            console.error("Couldn't find media with id", id);
            return;
        }

        if (IsKindOf(media, Media.Text)) {
            media.attributedString = new AttributedString(value);
            TextReaction.resizeTextToFit(media);
            media.updateTextLayer();
        } else if (IsKindOf(media, Media.NameBadge)) {
            const label = media[key];
            label.string = value;
        }
    }

    #onReactionLocationChange(value) {
        const reaction = this.controller.currentReaction;
        if (!reaction) {
            return;
        }
        const media = reaction.objects[0];
        if (media) {
            media.anchor = value;

            // If this is a speech/though bubble with a tail, try to position it
            if (
                IsKindOf(media.style, Media.Text.Style.BubbleCore) &&
                media.style.angle != null
            ) {
                // Try to position the tail as appropriately as possible
                // This asumes the presenter is centered, we're not looking at where they are
                media.style.angle = TextReaction.tailAngleForMedia(media);
                media.setNeedsDisplay();
                media.setNeedsPersistence();
            }
        }
    }

    isGIPHY(reaction) {
        if (reaction) {
            const media = reaction.objects[0];
            return media?.isGIPHY === true;
        }
        return false;
    }

    #getDefaultReactionLayout() {
        return SharedUserDefaults.getValueForKey(this.#defaultsKeyNewReactionLayout, LooksReactionLayout.FullScreen);
    }

    #getDefaultReactionAnchor() {
        return SharedUserDefaults.getValueForKey(this.#defaultsKeyNewReactionAnchor);
    }

    #onDefaultReactionLayoutChanged() {
        const layout = this.#getDefaultReactionLayout();
        const anchor = this.#getDefaultReactionAnchor();

        let icon = null;
        switch (layout) {
            case LooksReactionLayout.OverTheShoulder:
                if (anchor == Stage.Object.Anchor.TopLeft) {
                    icon = AppIcons.LayoutInsetLeft();
                } else {
                    icon = AppIcons.LayoutInsetRight();
                }
                break;

            case LooksReactionLayout.FullScreen:
            default:
                icon = AppIcons.LayoutFullScreen();
                break;
        }

        this.reactionsPanel.updateDefaultReactionLayout(icon, anchor);
    }

    #onShowReactionStyleMenu(evt) {
        const menu = new Menu();

        const currentLayout = this.#getDefaultReactionLayout();
        const currentAnchor = this.#getDefaultReactionAnchor();

        const select = (layout, anchor) => {
            this.#onEditDefaultReactionLayout(layout, anchor);
            menu.dismiss();
        };

        const options = [
            {
                label: LocalizedString("Inset left"),
                icon: AppIcons.LayoutInsetLeft(),
                action: () => select(
                    LooksReactionLayout.OverTheShoulder,
                    Stage.Object.Anchor.TopLeft
                ),
                checked: currentLayout == LooksReactionLayout.OverTheShoulder &&
                    currentAnchor == Stage.Object.Anchor.TopLeft,
            },
            {
                label: LocalizedString("Inset right"),
                icon: AppIcons.LayoutInsetRight(),
                action: () => select(
                    LooksReactionLayout.OverTheShoulder,
                    Stage.Object.Anchor.TopRight
                ),
                checked: currentLayout == LooksReactionLayout.OverTheShoulder &&
                    currentAnchor == Stage.Object.Anchor.TopRight,
            },
            {
                label: LocalizedString("Full screen"),
                icon: AppIcons.LayoutFullScreen(),
                action: () => select(LooksReactionLayout.FullScreen),
                checked: currentLayout == LooksReactionLayout.FullScreen,
            },
        ];

        options.forEach((option) => {
            const checkbox = menu.addCheckbox(option.label, option.action, option.icon, true);
            checkbox.checked = option.checked;
        });

        const sender = evt.target.closest("button");
        menu.displayFrom(sender, evt);
    }

    #onEditDefaultReactionLayout(layout, anchor = null) {
        // This action isn't changing a reaction, it's setting defaults for new reactions
        SharedUserDefaults.setValueForKey(layout, this.#defaultsKeyNewReactionLayout);
        SharedUserDefaults.setValueForKey(anchor, this.#defaultsKeyNewReactionAnchor);
        this.#onDefaultReactionLayoutChanged();
    }

    #onEditReactionStyle(value) {
        const reaction = this.controller.currentReaction;
        if (!reaction) {
            return;
        }

        this.controller.updateReactionStyle(reaction, value);

        const positionEditable = value == LooksReactionLayout.OverTheShoulder;
        let anchor = null;
        let scale = null;
        if (positionEditable) {
            const media = reaction.objects[0];
            anchor = media.anchor;
            scale = media.scale;
        }
        this.reactionSettings.reactionLayoutChanged(positionEditable, anchor, scale);
    }

    #onReactionScaleChange(value) {
        const reaction = this.controller.currentReaction;
        if (!reaction) {
            return;
        }
        const media = reaction.objects[0];
        if (media) {
            media.scale = value;

            // If the user changes the scale of a reaction, use that for the next reaction they create
            SharedUserDefaults.setValueForKey(value, this.#defaultsKeyNewReactionScale);
        }

        this.reactionSettings.updateReactionScale(value);
    }

    /* Away screen functionality */

    async #onAwayScreenSlidesChanged() {
        const presentation = this.controller.reactionsPresentation;
        await this.awayWidget.reactionsChanged(presentation.activeSlides);
    }

    #onUseDefaultAwayScreen() {
        this.controller.setSelectedAwayScreen(null);
        this.#onAwayScreenChanged();
    }

    #onSelectAwayScreenById(id) {
        const reaction = this.controller.reactionWithIdentifier(id);
        if (reaction) {
            reaction.useAsAwayScreen = true;
            this.controller.setSelectedAwayScreen(reaction);
            this.#onAwayScreenChanged();
        }
    }

    #onToggleUseReactionAsAwayScreen(reaction) {
        // Toggle whether this reaction is shown in the list of away screens
        // TODO I think there's a race condition here if you quickly toggle on then off
        if (reaction.useAsAwayScreen) {
            reaction.useAsAwayScreen = false;
            const currentAwayScreen = this.controller.getSelectedAwayScreen();
            if (currentAwayScreen == reaction) {
                this.controller.setSelectedAwayScreen(null);
            }
        } else {
            reaction.useAsAwayScreen = true;
            this.controller.setSelectedAwayScreen(reaction);
        }
        this.#onAwayScreenChanged();
    }

    #onAwayScreenChanged() {
        const reaction = this.controller.getSelectedAwayScreen();
        this.awayWidget.setSelectedAwayScreen(reaction);

        this.#onAwayScreenSlidesChanged();
    }

    #onEditAwayScreenText(id, key, value) {
        const reaction = this.controller.getSelectedAwayScreen();
        if (!reaction) {
            console.error("No camera off reaction to edit");
            return;
        }

        const media = reaction.objects.find((val) => val.identifier === id);
        if (!media) {
            console.error("Couldn't find media with id", id);
            return;
        }

        if (IsKindOf(media, Media.Text)) {
            media.attributedString = new AttributedString(value);
            TextReaction.resizeTextToFit(media); // TODO?
            media.updateTextLayer();
        } else if (IsKindOf(media, Media.NameBadge)) {
            // TODO we need to force this to persist if it's not on stage
            const label = media[key];
            label.string = value;
        }

        // TODO debounce this
        this.#debouncedMediaNeedsPersistence(reaction, media);
    }

    /* Paste handling */

    #setupPasteListeners() {
        const state = this.state;
        const listener = this.pasteListener;
        if (state == this.#states.IDLE) {
            if (!listener) {
                this.pasteListener = (event) => this.#onPaste(event);
                document.addEventListener("paste", this.pasteListener);
            }
        } else {
            if (listener) {
                document.removeEventListener("paste", listener);
                this.pasteListener = null;
            }
        }
    }

    async #onPaste(event) {
        // We only paste in our truly idle state, when no widgets are open
        if (this.state != this.#states.IDLE || this.#getVisibleWidget() != null) {
            return;
        }
        const clipboard = event.clipboardData;
        if (!clipboard) {
            return;
        }

        // Allow the user to paste content into a new visual
        // - Files act like drag & drop
        // - Images and video act like drag & drop
        // - Text becomes a search query and can then become a text reaction

        let reaction = null;
        let text = null;
        if (clipboard.files?.length > 0 || clipboard.items?.length > 0) {
            // Reading from the data seems to make it go away,
            // so we need to look for text before we read the files?
            text = await this.#getTextFromPasteEvent(clipboard);

            // Now look for files, those are higher priority
            reaction = await this.controller.createReactionFromDataTransfer(clipboard).catch(err => {
                console.error("Error creating reaction from clipboard data", err);
            });
        } else {
            reaction = await this.controller.createReactionFromClipboardData().catch(err => {
                console.error("Error creating reaction from clipboard text data", err);
            });
        }

        // If we created a new reaction, put it on stage
        if (reaction) {
            this.controller.currentReaction = reaction;
            return;
        }

        // If not, see if there's text and put it into the visuals search input
        // so that we can suggest text reactions for it
        if (text) {
            this.reactionsPanel.setSearchQuery(text);
        }
    }

    async #getTextFromPasteEvent(dataTransfer) {
        const items = Array.from(dataTransfer.items ?? []);
        const item = items.find((item) => item.type == "text/plain");
        const wrapper = promiseWrapper();
        if (item) {
            item.getAsString((str) => wrapper.resolve(str));
        } else {
            wrapper.resolve(null);
        }
        return wrapper;
    }

    /* Camera selection functionality */

    #onVideoTrackEnabledChanged() {
        const enabled = this.stage.localPresenter.videoTrackEnabled;
        this.toolbar.cameraEnabled = enabled;
        this.widgetBar.awayEnabled = !enabled;
        this.awayWidget.setAwayEnabled(!enabled);

        this.#notifyHybridOfStateChanges();
    }

    #getCameraToolbarOptions() {
        const options = (this.stage.localPresenter["cameras"] || []).map((device) => {
            return {
                value: device.deviceId,
                label: device.label ?? LocalizedString("Unknown device"),
                selected:
                    device.deviceId === this.stage.localPresenter.videoDevice?.deviceId
            };
        });
        return options;
    }

    /**
     * Called when the camera in use by the presenter changes.
     */
    onVideoDeviceChanged() {
        const id = this.stage.localPresenter.videoDevice?.deviceId;
        if (id) {
            if (id != this.#currentVideoDeviceId) {
                this.#currentVideoDeviceId = id;
                this.#ensurePresenterVideoTrackEnabled();
            }
        }
        this.editorTopBar.selectedCameraChanged();
    }

    // When a camera becomes unavailable, the app falls back to a
    // different camera, but doesn't automatically enable it, leaving
    // the presenter's video track disabled. That's not helpful,
    // so we turn it back on.
    #ensurePresenterVideoTrackEnabled() {
        if (this.stage.localPresenter.videoTrackEnabled == false) {
            console.log("Enabling presenter video track");

            // Add a delay to debounce repeated changes
            if (this.#enableVideoTimeout != null) {
                window.clearTimeout(this.#enableVideoTimeout);
                this.#enableVideoTimeout = null;
            }
            this.#enableVideoTimeout = window.setTimeout(() => {
                this.stage.localPresenter.videoTrackEnabled = true;
            }, 1000);
        }
    }

    /**
     * Called when the user selects a different camera from our list.
     *
     * @param {string} deviceId
     */
    #onChangeCamera(deviceId) {
        const presenter = this.stage.localPresenter;
        const device = presenter.deviceWithID(deviceId);
        presenter.videoDevice = device;
        if (presenter.videoTrackEnabled == false) {
            presenter.videoTrackEnabled = true;
        }
    }

    /* Look watermarks / drag & drop handling */

    #addDragAndDropHandlers() {
        this.reactionsPanel.setReactionsDragDropCallback((dataTransfer) =>
            this.#onDropReaction(dataTransfer)
        );

        this.reactionsPanel.addDragAndDropHandlers();
    }

    #removeDragAndDropHandlers() {
        this.reactionsPanel.removeDragAndDropHandlers();
    }

    #newSpinnerSheet(title, message) {
        const sheet = new LoadingSheet(title, message, null, 300);
        sheet.displayAsModal();
        return sheet;
    }

    #newUploadProgressSheet(title) {
        const sheet = new ProgressSheet(title, false);
        const onProgress = (progress) => (sheet.progressIndicator.value = progress * 100);
        sheet.displayAsModal();
        return { sheet, onProgress };
    }

    /**
     * Prompt for a file upload
     * Eventually we'll use a simplified version of the media library here
     * @returns {?Media}
     */
    async #promptForMedia() {
        const files = await Media.Files.showFilePicker(
            1,
            Media.Files.imageAndVideoMimeTypes()
        );
        if (!files || files.length == 0) {
            return null;
        }

        const file = files[0];
        if (!Media.Files.isImageOrVideoFile(file)) {
            console.error("Unsupported file type", file);
            return null;
        }

        try {
            const media = await Media.Files.createWithFile(file);
            if (!media) {
                console.error("Couldn't create media from file");
            }
            return media;
        } catch (err) {
            console.error("Error creating media from file", err);
        }
        return null;
    }

    /* Presenter filters */
    // We have two filters that we control with a single "enhance" toggle,
    // enhancement and complements. Each has a single configuration value.

    // TODO don't persist the values on the presenter media record

    #onChangeEnhancement(value) {
        this.stage.localPresenter.enhancement = value;
        this.enhanceWidget.setEnhancementValue(value);
        SharedUserDefaults.setValueForKey(value, this.#defaultsKeyEnhancement);
    }

    #getEnhancementValue() {
        return SharedUserDefaults.getValueForKey(this.#defaultsKeyEnhancement, 0.5);
    }

    #onChangeComplements(value) {
        let filter = this.stage.localPresenter.effect;
        if (!filter) {
            console.error("Missing presenter complements filter");
            filter = this.#makeComplementsFilter();
            this.stage.localPresenter.effect = filter;
        }
        filter.u_intensity = value;
        this.enhanceWidget.setComplementsValue(value);
        SharedUserDefaults.setValueForKey(value, this.#defaultsKeyComplements);
    }

    #getComplementsValue() {
        return SharedUserDefaults.getValueForKey(this.#defaultsKeyComplements, 0.5);
    }

    #enablePresenterFilters() {
        this.stage.localPresenter.enhancement = this.#getEnhancementValue();
        this.stage.localPresenter.effect = this.#makeComplementsFilter();
    }

    #disablePresenterFilters() {
        this.stage.localPresenter.enhancement = 0;
        this.stage.localPresenter.effect = null;
    }

    #makeComplementsFilter() {
        const filter = NewFilterWithID(ComplementsFilter.identifier);
        filter.u_intensity = this.#getComplementsValue();
        return filter;
    }

    #onFiltersChanged() {
        // Used to initialize filters on launch
        const enabled = this.#getFiltersEnabled();

        // Set up the UI
        this.widgetBar.enhanceEnabled = enabled;
        this.enhanceWidget.setEnhanceEnabled(enabled);
        this.enhanceWidget.setEnhancementValue(this.#getEnhancementValue());
        this.enhanceWidget.setComplementsValue(this.#getComplementsValue());

        // Set up the filters
        if (enabled) {
            this.#enablePresenterFilters();
        } else {
            this.#disablePresenterFilters();
        }
    }

    get filtersEnabled() {
        return this.#getFiltersEnabled();
    }

    set filtersEnabled(enabled) {
        this.#setFiltersEnabled(enabled);
    }

    #getFiltersEnabled() {
        return SharedUserDefaults.getValueForKey(this.#defaultsKeyFiltersEnabled, false) === true;
    }

    #setFiltersEnabled(enabled) {
        SharedUserDefaults.setValueForKey(!!enabled, this.#defaultsKeyFiltersEnabled);
        this.#notifyHybridOfStateChanges();
    }

    #handleToggleEnhanceKeyboardEvent() {
        this.#onToggleEnhance();
    }

    #onToggleFilters() {
        const enabled = this.#getFiltersEnabled();
        if (enabled) {
            this.#onToggleFiltersOff();
        } else {
            this.#onToggleFiltersOn();
        }
    }

    #onToggleFiltersOn() {
        // Save the setting
        this.filtersEnabled = true;

        // Update the UI
        this.widgetBar.enhanceEnabled = true;
        this.enhanceWidget.setEnhanceEnabled(true);

        // Turn on the effects
        this.#enablePresenterFilters();

        if (this.controller.isAway()) {
            Toast.show(LocalizedString("Filters are not applied when away"));
        }
    }

    #onToggleFiltersOff() {
        // Save the setting
        this.filtersEnabled = false;

        // Update the UI
        this.widgetBar.enhanceEnabled = false;
        this.enhanceWidget.setEnhanceEnabled(false);

        // Turn off the effects
        this.#disablePresenterFilters();
    }

    /* Widgets */

    #onShowLooksWidget() {
        this.looksWidget.show();
    }

    #onShowNameTagWidget() {
        this.nametagWidget.show();
    }

    #onShowAwayWidget() {
        this.awayWidget.show();
    }

    #onShowEnhanceWidget() {
        this.enhanceWidget.show();
    }

    #onShowLUTWidget() {
        this.lutWidget.show();
        // Generate LUT thumbnails when widget is shown (lazy loading)
        this.#generateAllLUTThumbnails();
    }

    #setupLUTWidget() {
        console.log('[LUT] setupLUTWidget called');

        // Set up LUT selection callback
        this.lutWidget.onLUTSelected(async (lutInfo, lutData) => {
            const presenter = this.stage.localPresenter;
            if (!presenter) return;

            // Find or create LUT filter
            let lutFilter = presenter.layer?.videoLayer?.filters?.find(f => f instanceof LUTFilter);

            if (!lutInfo || !lutData) {
                // Clear LUT
                if (lutFilter) {
                    lutFilter.clearLUT();
                    lutFilter.enabled = false;
                }
                this.widgetBar.lutEnabled = false;
                return;
            }

            // Create filter if needed
            if (!lutFilter) {
                lutFilter = NewFilterWithID(LUTFilter.identifier);
                if (lutFilter) {
                    presenter.layer?.videoLayer?.addFilter(lutFilter);
                }
            }

            if (lutFilter) {
                lutFilter.setLUT(lutData, lutInfo.id);
                lutFilter.enabled = true;
                this.widgetBar.lutEnabled = true;
            }
        });

        // Set up intensity change callback
        this.lutWidget.onIntensityChanged((intensity) => {
            const presenter = this.stage.localPresenter;
            if (!presenter) return;

            const lutFilter = presenter.layer?.videoLayer?.filters?.find(f => f instanceof LUTFilter);
            if (lutFilter) {
                lutFilter.intensity = intensity;
            }
        });

        // Set up alpha mode change callback
        this.lutWidget.onAlphaModeChanged((alphaMode) => {
            const presenter = this.stage.localPresenter;
            if (!presenter) return;

            const lutFilter = presenter.layer?.videoLayer?.filters?.find(f => f instanceof LUTFilter);
            if (lutFilter) {
                lutFilter.alphaMode = alphaMode;
            }

            // Auto-enable segmentation if needed for alpha mode
            this.#updateSegmentationForAlphaMode();
        });

        // Restore saved LUT selection on initialization
        console.log('[LUT] Calling restoreSavedSelection');
        this.lutWidget.restoreSavedSelection().then((saved) => {
            console.log('[LUT] restoreSavedSelection resolved:', {
                hasSaved: !!saved,
                savedLUTId: saved?.lutInfo?.id,
                presenterExists: !!this.stage?.localPresenter,
                videoLayerExists: !!this.stage?.localPresenter?.layer?.videoLayer
            });

            if (saved) {
                const presenter = this.stage.localPresenter;
                if (presenter) {
                    let lutFilter = presenter.layer?.videoLayer?.filters?.find(f => f instanceof LUTFilter);
                    if (!lutFilter) {
                        lutFilter = NewFilterWithID(LUTFilter.identifier);
                        if (lutFilter) {
                            presenter.layer?.videoLayer?.addFilter(lutFilter);
                        }
                    }
                    if (lutFilter) {
                        lutFilter.setLUT(saved.lutData, saved.lutInfo.id);
                        lutFilter.intensity = this.lutWidget.getIntensity();
                        lutFilter.alphaMode = saved.alphaMode || 0;
                        lutFilter.enabled = true;
                        this.widgetBar.lutEnabled = true;

                        console.log('[LUT] Filter added:', {
                            enabled: lutFilter.enabled,
                            intensity: lutFilter.intensity,
                            alphaMode: lutFilter.alphaMode,
                            filterCount: presenter.layer?.videoLayer?.filters?.length
                        });
                    }

                    // Update segmentation for alpha mode if needed
                    this.#updateSegmentationForAlphaMode();
                } else {
                    console.warn('[LUT] No presenter when restoration resolved!');
                }
            }
        });

        // Generate thumbnail for newly imported LUTs
        this.lutWidget.onLUTImported(async (lutInfo) => {
            if (!lutInfo) return;

            const presenter = this.stage?.localPresenter;
            if (!presenter?.videoTrackEnabled) return;

            const videoTrack = presenter.videoTrack;
            if (!videoTrack || videoTrack.readyState !== 'live') return;

            try {
                // Capture current frame using ImageCapture API
                const imageCapture = new ImageCapture(videoTrack);
                const frameBitmap = await imageCapture.grabFrame();
                const lutData = await LookLUTs.getLUTData(lutInfo);
                const img = await this.#createLUTSnapshot(lutInfo, lutData, frameBitmap, this.stage);
                frameBitmap.close();

                if (img) {
                    this.lutWidget.updateLUTThumbnail(lutInfo.id, img);
                    if (this.lutPanel) {
                        const clonedImg = new Image();
                        clonedImg.src = img.src;
                        this.lutPanel.updateLUTThumbnail(lutInfo.id, clonedImg);
                    }
                }
            } catch (err) {
                console.error("Error generating thumbnail for imported LUT:", err);
            }
        });

        // Initialize segmentation state based on current presenter background style
        const presenter = this.stage?.localPresenter;
        if (presenter) {
            this.#updateWidgetSegmentationState(presenter.backgroundStyle);
        }
    }

    /**
     * Set up the tune widget for image correction adjustments.
     * Wires up the TuneFilter to respond to tune panel changes.
     */
    #setupTuneWidget() {
        // Set up tune change callback
        this.lutWidget.onTuneChanged((values) => {
            const presenter = this.stage.localPresenter;
            if (!presenter) return;

            // Find or create TuneFilter
            let tuneFilter = presenter.layer?.videoLayer?.filters?.find(f => f instanceof TuneFilter);

            if (!tuneFilter) {
                tuneFilter = NewFilterWithID(TuneFilter.identifier);
                if (tuneFilter) {
                    // Insert BEFORE LUT filter for correct rendering order:
                    // Camera Feed → TuneFilter → LUTFilter → Output
                    const lutFilter = presenter.layer?.videoLayer?.filters?.find(f => f instanceof LUTFilter);
                    const lutIdx = lutFilter ? presenter.layer?.videoLayer?.filters?.indexOf(lutFilter) : -1;

                    if (lutIdx >= 0) {
                        presenter.layer?.videoLayer?.insertFilterAt(tuneFilter, lutIdx);
                    } else {
                        presenter.layer?.videoLayer?.addFilter(tuneFilter);
                    }
                }
            }

            if (tuneFilter) {
                tuneFilter.setValues(values);
                tuneFilter.enabled = tuneFilter.hasAdjustments();
            }

            // Auto-enable segmentation if alpha mode changed
            this.#updateSegmentationForAlphaMode();
        });

        // Restore saved tune values on initialization
        // TunePanel restores its own state, we just need to apply it to the filter
        const savedValues = this.lutWidget.getTuneValues();
        if (savedValues && (savedValues.exposure !== 0 || savedValues.contrast !== 0 ||
            savedValues.saturation !== 0 || savedValues.temperature !== 0 || savedValues.alphaMode !== 0)) {
            const presenter = this.stage.localPresenter;
            if (presenter) {
                let tuneFilter = presenter.layer?.videoLayer?.filters?.find(f => f instanceof TuneFilter);
                if (!tuneFilter) {
                    tuneFilter = NewFilterWithID(TuneFilter.identifier);
                    if (tuneFilter) {
                        // Insert BEFORE LUT filter
                        const lutFilter = presenter.layer?.videoLayer?.filters?.find(f => f instanceof LUTFilter);
                        const lutIdx = lutFilter ? presenter.layer?.videoLayer?.filters?.indexOf(lutFilter) : -1;

                        if (lutIdx >= 0) {
                            presenter.layer?.videoLayer?.insertFilterAt(tuneFilter, lutIdx);
                        } else {
                            presenter.layer?.videoLayer?.addFilter(tuneFilter);
                        }
                    }
                }
                if (tuneFilter) {
                    tuneFilter.setValues(savedValues);
                    tuneFilter.enabled = true;
                }

                // Update segmentation for alpha mode if needed
                this.#updateSegmentationForAlphaMode();
            }
        }
    }

    /**
     * Create a snapshot with a specific LUT applied for thumbnail preview
     * Uses offscreen WebGL rendering to avoid flashing the main video feed.
     * @param {Object} lutInfo - The LUT info object
     * @param {Object} lutData - The LUT data (3D LUT texture data)
     * @param {HTMLVideoElement|ImageBitmap} videoSource - Video element or captured frame
     * @param {Stage} stage - The stage (used for sizing)
     * @returns {Promise<HTMLImageElement|null>}
     */
    async #createLUTSnapshot(lutInfo, lutData, videoSource, stage) {
        if (!videoSource) {
            return null;
        }

        // Lazily create the offscreen renderer
        if (!this.#lutThumbnailRenderer) {
            const thumbnailScale = 2;
            const stageSize = stage.size;
            this.#lutThumbnailRenderer = new LUTThumbnailRenderer(
                stageSize.width / thumbnailScale,
                stageSize.height / thumbnailScale
            );
        }

        if (!this.#lutThumbnailRenderer.isReady) {
            console.error("LUT thumbnail renderer not ready");
            return null;
        }

        let img = null;
        try {
            // Render with LUT in offscreen context - no flashing!
            const blob = await this.#lutThumbnailRenderer.renderWithLUT(videoSource, lutData);

            if (blob) {
                const url = URL.createObjectURL(blob);
                img = new Image();
                img.src = url;
                await img.decode();
                // Note: Don't revoke the URL here - it's needed for the CSS background-image
                // The URL will be cleaned up when the page unloads or when thumbnails are regenerated
            }
        } catch (err) {
            console.error("Error creating LUT thumbnail snapshot", err);
        }

        return img;
    }

    /**
     * Generate live thumbnails for all LUTs
     * Called when the LUT widget becomes visible and video is available.
     * Captures the video frame once and applies all LUTs to it for efficiency.
     */
    async #generateAllLUTThumbnails() {
        console.log('[LUT Thumbnails] generateAllLUTThumbnails called');

        const presenter = this.stage?.localPresenter;
        if (!presenter?.videoTrackEnabled) {
            console.log('[LUT Thumbnails] No presenter or video track not enabled');
            return;
        }

        // Capture frame from the stage renderer (composited output with background)
        let frameBitmap = null;
        try {
            const renderer = this.stage?.renderer;
            if (!renderer) {
                console.log('[LUT Thumbnails] No stage renderer available');
                return;
            }
            // Use renderer's snapshot method which properly captures the WebGL output
            const blob = await renderer.snapshot();
            if (!blob) {
                console.log('[LUT Thumbnails] Renderer snapshot returned null');
                return;
            }
            frameBitmap = await createImageBitmap(blob);
            console.log('[LUT Thumbnails] Captured frame:', frameBitmap.width, 'x', frameBitmap.height);
        } catch (err) {
            console.error("[LUT Thumbnails] Error capturing video frame:", err);
            return;
        }

        const allLUTs = await LookLUTs.getAllLUTs();
        console.log('[LUT Thumbnails] Found', allLUTs.length, 'LUTs to process');

        for (const lutInfo of allLUTs) {
            // Skip if widget is no longer visible (user closed it)
            if (!this.lutWidget?.isVisible()) {
                break;
            }

            try {
                const lutData = await LookLUTs.getLUTData(lutInfo);
                const img = await this.#createLUTSnapshot(lutInfo, lutData, frameBitmap, this.stage);

                if (img) {
                    this.lutWidget?.updateLUTThumbnail(lutInfo.id, img);
                    // Clone image for panel (if it exists)
                    if (this.lutPanel) {
                        const clonedImg = new Image();
                        clonedImg.src = img.src;
                        this.lutPanel.updateLUTThumbnail(lutInfo.id, clonedImg);
                    }
                }
            } catch (err) {
                console.error(`Error generating thumbnail for LUT ${lutInfo.id}:`, err);
            }
        }

        // Release the captured frame
        if (frameBitmap) {
            frameBitmap.close();
        }
    }

    #getVisibleWidget() {
        const widgets = [this.looksWidget, this.nametagWidget, this.awayWidget, this.enhanceWidget, this.lutWidget];
        return widgets.find((widget) => widget.isVisible());
    }

    #handleCloseWidgetKeyboardEvent() {
        const visibleWidget = this.#getVisibleWidget();
        visibleWidget?.hide();
    }

    /**
     * Public toggle method used by the HybridBridge
     */
    toggleLook() {
        this.#onToggleLook();
    }

    getLooksToggle() {
        return this.controller.getLooksToggle();
    }

    #canToggleLook() {
        // Don't allow toggling looks on/off when in the look catalog or editor
        return this.state == this.#states.IDLE;
    }

    #onToggleLook() {
        if (this.controller.getLooksToggle()) {
            this.#onToggleLookOff();
        } else {
            this.#onToggleLookOn();
        }
    }

    #onToggleLookOn() {
        this.#toggleLookOn(true);
    }

    #toggleLookOn(emitAnalytics = false) {
        if (!this.#canToggleLook()) {
            return;
        }

        if (this.controller.selectedLook == null) {
            Toast.show(LocalizedString("No look selected"));
            return;
        }

        this.controller.toggleLooksOn();
        this.#onLooksEnabledChanged();
        if (emitAnalytics) {
            LooksAnalytics.onToggleLooks(true, this.controller.selectedLook);
        }

        if (this.controller.isAway()) {
            Toast.show(LocalizedString("Looks are not shown when away"));
        }
    }

    #onToggleLookOff() {
        this.#toggleLookOff(true);
    }

    #toggleLookOff(emitAnalytics = false) {
        if (!this.#canToggleLook()) {
            return;
        }
        this.controller.toggleLooksOff();
        this.#onLooksEnabledChanged();
        if (emitAnalytics) {
            LooksAnalytics.onToggleLooks(false, this.controller.selectedLook);
        }
    }

    #onLooksEnabledChanged() {
        const enabled = this.controller.getLooksToggle();
        this.widgetBar.looksEnabled = enabled;
        this.looksWidget.looksEnabled = enabled;
        this.#notifyHybridOfStateChanges();
    }

    toggleNametag() {
        this.#onToggleNameTag();
    }

    isNametagEnabled() {
        return this.controller.nametagVisible;
    }

    #onToggleNameTag() {
        if (this.controller.nametagVisible) {
            this.#onToggleNametagVisible(false);
        } else {
            this.#onToggleNametagVisible(true);
        }
    }

    #onToggleNameTagOn() {
        this.#onToggleNametagVisible(true);
    }

    #onToggleNameTagOff() {
        this.#onToggleNametagVisible(false);
    }

    #canToggleAway() {
        // Don't allow toggling away on/off when in the look catalog or editor
        return this.state == this.#states.IDLE;
    }

    #onToggleAway() {
        if (this.#canToggleAway()) {
            if (this.controller.isCameraEnabled()) {
                this.#onToggleAwayOn();
            } else {
                this.#onToggleAwayOff();
            }
        }
    }

    #onToggleAwayOn() {
        if (this.#canToggleAway()) {
            this.controller.disableCamera();
            LooksAnalytics.onToggleAway(true, this.controller.getSelectedAwayScreen());
        }
    }

    #onToggleAwayOff() {
        if (this.#canToggleAway()) {
            this.controller.enableCamera();
            LooksAnalytics.onToggleAway(false, this.controller.getSelectedAwayScreen());
        }
    }

    #handleToggleAwayKeyboardEvent() {
        this.#onToggleAway();
    }

    toggleFilters() {
        this.#onToggleFilters();
    }

    isFiltersEnabled() {
        return this.#getFiltersEnabled();
    }

    #onToggleEnhance() {
        const enabled = this.#getFiltersEnabled();
        if (enabled) {
            this.#onToggleEnhanceOff();
        } else {
            this.#onToggleEnhanceOn();
        }
    }

    #onToggleEnhanceOn() {
        this.#onToggleFiltersOn();
        LooksAnalytics.onToggleFilters(true);
    }

    #onToggleEnhanceOff() {
        this.#onToggleFiltersOff();
        LooksAnalytics.onToggleFilters(false);
    }

    #onToggleLUT() {
        const enabled = this.#getLUTEnabled();
        if (enabled) {
            this.#onToggleLUTOff();
        } else {
            this.#onToggleLUTOn();
        }
    }

    async #onToggleLUTOn() {
        const presenter = this.stage.localPresenter;
        if (!presenter) return;

        let lutFilter = presenter.layer?.videoLayer?.filters?.find(f => f instanceof LUTFilter);

        // If LUT filter exists and has a LUT loaded, just enable it
        if (lutFilter && lutFilter.hasLUT) {
            lutFilter.enabled = true;
            this.widgetBar.lutEnabled = true;
            return;
        }

        // Try to restore saved LUT selection
        const saved = await this.lutWidget.restoreSavedSelection();
        if (saved) {
            // Create filter if needed
            if (!lutFilter) {
                lutFilter = new LUTFilter();
                presenter.layer?.videoLayer?.addFilter(lutFilter);
            }
            if (lutFilter) {
                lutFilter.setLUT(saved.lutData, saved.lutInfo.id);
                lutFilter.intensity = this.lutWidget.getIntensity();
                lutFilter.enabled = true;
                this.widgetBar.lutEnabled = true;
            }
        }
        // If no saved LUT, do nothing - user needs to select one via the widget panel first
    }

    #onToggleLUTOff() {
        const presenter = this.stage.localPresenter;
        if (!presenter) return;

        const lutFilter = presenter.layer?.videoLayer?.filters?.find(f => f instanceof LUTFilter);
        if (lutFilter) {
            lutFilter.enabled = false;
        }
        this.widgetBar.lutEnabled = false;
    }

    #getLUTEnabled() {
        const presenter = this.stage.localPresenter;
        if (!presenter) return false;

        const lutFilter = presenter.layer?.videoLayer?.filters?.find(f => f instanceof LUTFilter);
        return lutFilter?.enabled && lutFilter?.hasLUT;
    }

    /** Edge Light */

    #edgeLightWindow = null;
    #edgeLightConfig = {
        brightness: 70,
        width: 10,
        colorTemperature: 50
    };

    #onShowEdgeLightWidget() {
        // For now, just toggle the edge light on if not already open
        // In the future, this could show a settings panel
        if (!this.#edgeLightWindow || this.#edgeLightWindow.closed) {
            this.#onToggleEdgeLightOn();
        } else {
            // Bring window to front
            this.#edgeLightWindow.focus();
        }
    }

    #onToggleEdgeLight() {
        const enabled = this.#getEdgeLightEnabled();
        if (enabled) {
            this.#onToggleEdgeLightOff();
        } else {
            this.#onToggleEdgeLightOn();
        }
    }

    #onToggleEdgeLightOn() {
        if (this.#edgeLightWindow && !this.#edgeLightWindow.closed) {
            this.#edgeLightWindow.focus();
            return;
        }

        // Build URL with current config
        const params = new URLSearchParams({
            brightness: this.#edgeLightConfig.brightness,
            width: this.#edgeLightConfig.width,
            temperature: this.#edgeLightConfig.colorTemperature
        });

        // Open the edge light popup window
        const width = 800;
        const height = 600;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;

        this.#edgeLightWindow = window.open(
            `/edge-light/index.html?${params.toString()}`,
            'EdgeLight',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes`
        );

        // Listen for messages from the popup
        if (!this.#edgeLightMessageHandler) {
            this.#edgeLightMessageHandler = this.#handleEdgeLightMessage.bind(this);
            window.addEventListener('message', this.#edgeLightMessageHandler);
        }

        this.widgetBar.edgeLightEnabled = true;
    }

    #onToggleEdgeLightOff() {
        if (this.#edgeLightWindow && !this.#edgeLightWindow.closed) {
            this.#edgeLightWindow.close();
        }
        this.#edgeLightWindow = null;
        this.widgetBar.edgeLightEnabled = false;
    }

    #edgeLightMessageHandler = null;

    #handleEdgeLightMessage(event) {
        if (event.data.type === 'edge-light-closed') {
            this.#edgeLightWindow = null;
            this.widgetBar.edgeLightEnabled = false;
        } else if (event.data.type === 'edge-light-config-changed') {
            this.#edgeLightConfig = { ...event.data.config };
        }
    }

    #getEdgeLightEnabled() {
        return this.#edgeLightWindow && !this.#edgeLightWindow.closed;
    }

    #sendEdgeLightConfig(config) {
        if (this.#edgeLightWindow && !this.#edgeLightWindow.closed) {
            this.#edgeLightWindow.postMessage({
                type: 'edge-light-config',
                config: config
            }, '*');
        }
    }

    /** Coachmarks */

    #initializeHybrid() {
        if (App.isHybrid) {
            const monitor = this.#getSystemVideoEffectsMonitor();
            monitor?.setStatusChangedCallback((status) => this.#systemVideoEffectsChanged(monitor, status));
        }
    }

    #getSystemVideoEffectsMonitor() {
        return App.isHybrid ? gHybrid.systemVideoEffectsMonitor : null;
    }

    /**
     * Called when the macOS system video effects status changes, for example if the user
     * turns on portrait mode or a virtual background.
     * @param {systemVideoEffectsMonitor} monitor
     * @param {systemVideoEffectsMonitor.status} status
     */
    #systemVideoEffectsChanged(monitor, status) {
        // We'll show a warning once per app launch
        if (this.showedSystemVideoEffectsCoachmark) {
            return;
        }

        // See if any of the troublesome effects are enabled
        if (status.isCenterStageEnabled ||
            status.isBackgroundReplacementEnabled ||
            status.isPortraitEffectEnabled) {

            this.showedSystemVideoEffectsCoachmark = true;
            this.#showSystemVideoEffectsCoachmark(() => monitor.showSystemUI());
        }
    }

    #showLaunchCoachmarks(isFirstLaunch, importedDemoLook) {
        // If is the user's first experience with Camera, but they didn't import a demo look,
        // encourage them to create their first look
        if (isFirstLaunch && !importedDemoLook) {
            if (!LooksCoachmarks.hasShownCoachmark(LooksCoachmarks.TrackingKeys.CreateFirstLook)) {
                this.#showCreateFirstLookCoachmarkWhenLoaded();
                return;
            }
        }

        // Otherwise, show them how to use the virtual camera
        // if (!LooksCoachmarks.hasShownCoachmark(LooksCoachmarks.TrackingKeys.VirtualCameraMenu)) {
        //     this.#showVirtualCameraMenuCoachmark();
        //     return;
        // }

        // If we haven't already showed something, show the system video effects warning
        // if necessary
        const monitor = this.#getSystemVideoEffectsMonitor();
        if (monitor) {
            this.#systemVideoEffectsChanged(monitor, monitor.status);
        }
    }

    #showSystemVideoEffectsCoachmark(showSystemUICallback) {
        const defaultsKey = "ignoreSystemVideoEffectsWarning";
        if (SharedUserDefaults.getValueForKey(defaultsKey) === true) {
            return;
        }
        const container = LooksCoachmarks.buildSystemVideoEffectsCoachmark(showSystemUICallback, () => {
            SharedUserDefaults.setValueForKey(true, defaultsKey);
        });
        this.#displayCoachmark(container);

        LooksCoachmarks.setHasShownCoachmark(LooksCoachmarks.TrackingKeys.SystemVideoEffects)
    }

    #showVirtualCameraMenuCoachmark() {
        const container = LooksCoachmarks.buildVirtualCameraMenuCoachmark();
        this.#displayCoachmark(container);

        LooksCoachmarks.setHasShownCoachmark(LooksCoachmarks.TrackingKeys.VirtualCameraMenu)
    }

    virtualCameraDialogOpened() {
        this.#removeCurrentCoachmark();
    }

    #showCreateFirstLookCoachmarkWhenLoaded() {
        // Work around some concurrency issues with the UI being ready
        if (this.#idlePanelLooksListLoaded) {
            this.#showCreateFirstLookCoachmark();
        } else {
            this.#showCreateFirstLookCoachmarkOnIdlePanelLoaded = true;
        }
    }

    #showCreateFirstLookCoachmark() {
        this.#removeCurrentCoachmark();
        const target = this.widgetBar.el.querySelector(`[data-action="${this.#actions.showLooksWidget}"]`);
        const coachmark = LooksCoachmarks.showCreateFirstLookCoachmark(target);
        this.currentCoachmark = coachmark;

        LooksCoachmarks.setHasShownCoachmark(LooksCoachmarks.TrackingKeys.CreateFirstLook);
    }

    #displayCoachmark(container) {
        this.#removeCurrentCoachmark();
        this.currentCoachmark = container;
        LooksCoachmarks.displayCoachmark(container);
    }

    #removeCurrentCoachmark() {
        if (this.currentCoachmark) {
            LooksCoachmarks.removeCoachmark(this.currentCoachmark);
            this.currentCoachmark = null;
        }
    }

    #onVirtualCameraClientsChanged() {
        this.#updateVirtualCameraState();
    }

    #updateVirtualCameraState() {
        // Show or hide the stage based on whether the virtual camera is active
        this.#updateStageVisibility();

        const vcam = gApp.virtualCameraInterface;
        let status = "disconnected";
        let clients = null;
        if (vcam) {
            if (vcam.isVirtualCameraActive()) {
                status = "connected";
                clients = vcam.getVirtualCameraClients();
            } else if (!vcam.isVirtualCameraAvailable()) {
                // Catchall for "not usable right now"
                status = "error";
            }
        }
        this.toolbar.setVirtualCameraStatus(status, clients);
    }

    #onIsVirtualCameraActiveChanged() {
        this.#updateVirtualCameraState();

        if (this.stage.isVirtualCameraActive) {
            this.#displayFirstVirtualCameraConnectionBanner();

            // If the camera is now connected, emit an analytics event
            // to help us understand which looks are being used on calls.
            // The hybrid app emits the camera.app.connected event, but
            // there's no easy way for us to add our properties into that
            // call, so we'll just emit our own event here.
            const look = this.controller.currentLook;
            if (look) {
                LooksAnalytics.onVirtualCameraConnected(look, this.controller.nametagVisible);
            }
        } else {
            this.#hideFirstVirtualCameraConnectionBanner();
        }
    }

    #onShowVirtualCameraMenu() {
        let hybrid = null;
        if (App.isHybrid) {
            hybrid = gHybrid;
        }
        gApp.showVirtualCameraDialog(hybrid);
    }

    /* Notification banner */

    #displayFirstVirtualCameraConnectionBanner() {
        // Only show this once
        const key = "hasShownVirtualCameraBanner";
        if (SharedUserDefaults.getValueForKey(key, false) === true) {
            return;
        }
        SharedUserDefaults.setValueForKey(true, key);

        this.#notificationBanner.displayVirtualCameraNotice();
    }

    #hideFirstVirtualCameraConnectionBanner() {
        this.#notificationBanner.clear();
    }

    /* Hybrid "remote control" functionality */

    #initializeHybridEventHandlers() {
        if (App.isHybrid && gHybrid.eventProxy) {
            gHybrid.eventProxy.setEventEmitterCallback((event) => {
                this.#handleHybridEvent(event);
            });
        }
    }

    #handleHybridEvent(event) {
        // Make sure it's for us
        if (!event?.name?.startsWith("Camera")) {
            return;
        }

        switch (event.name) {
            case "Camera.userToggledLook":
                this.#onToggleLook();
                break;
            case "Camera.userToggledNameTag":
                this.#onToggleNameTag();
                break;
            case "Camera.userToggledAway":
                this.#onToggleAway();
                break;
            case "Camera.userToggledFilter":
                this.#onToggleFilters();
                break;
            default:
                console.log("Unknown hybrid event:", event.name);
                break;
        }
    }

    #notifyHybridOfStateChanges() {
        // Notify the hybrid app when one of our four toggles changes state
        if (App.isHybrid && gHybrid.eventProxy && (getHybridAppVersion() >= "2.6")) {
            gHybrid?.eventProxy?.handleEvent({
                name: "stateUpdate",
                payload: {
                    isLookEnabled: this.controller.getLooksToggle(),
                    isNameTagEnabled: this.controller.getNametagToggle(),
                    isAwayEnabled: this.controller.isAway(),
                    isFilterEnabled: this.filtersEnabled,
                }
            });
        }
    }

    /* Speech Reactions */

    async #onToggleSpeechReactions() {
        const controller = SpeechReactionsController.shared;
        if (!controller) {
            console.error("SpeechReactionsController not initialized");
            return;
        }

        // If model isn't loaded yet, show loading state
        if (!controller.isModelLoaded && !controller.enabled) {
            this.toolbar.speechReactionsLoading = true;

            try {
                await controller.loadModel();
            } catch (err) {
                console.error("Error loading speech model:", err);
                this.toolbar.speechReactionsLoading = false;
                return;
            }

            this.toolbar.speechReactionsLoading = false;
        }

        // Toggle the speech reactions
        controller.toggle();
        this.toolbar.speechReactionsEnabled = controller.enabled;

        // Track analytics
        if (controller.enabled) {
            Analytics.Log("speech_reactions.enabled");
        } else {
            Analytics.Log("speech_reactions.disabled");
        }
    }

    /**
     * Toggle call context (system audio capture) for context-aware GIF suggestions.
     * This captures what others say in video calls to provide smarter reactions.
     */
    #onToggleCallContext() {
        const service = typeof SystemAudioService !== "undefined" ? SystemAudioService.shared : null;
        if (!service) {
            console.warn("SystemAudioService not available");
            return;
        }

        if (!service.isAvailable) {
            console.warn("System audio capture not available on this build");
            return;
        }

        if (service.isCapturing) {
            service.stopCapture();
            SharedUserDefaults.setValueForKey(false, "callContextEnabled");
            this.toolbar.callContextEnabled = false;
            Analytics.Log("call_context.disabled");
        } else {
            const success = service.startCapture();
            if (success) {
                SharedUserDefaults.setValueForKey(true, "callContextEnabled");
                this.toolbar.callContextEnabled = true;
                Analytics.Log("call_context.enabled");
            }
        }
    }

    #setupSpeechReactionsObservers() {
        // Wire up the ReactionsPanel to the SpeechReactionsController
        SpeechReactionsController.shared?.setReactionsPanel?.(this.reactionsPanel);

        // Watch for speech reactions enable/disable
        NotificationCenter.default.addObserver(
            SpeechReactionsController.Notifications.EnabledChanged,
            null,
            (info) => {
                this.toolbar.speechReactionsEnabled = info.enabled;
            },
            this
        );

        // Connect speech suggestions to the reactions panel
        NotificationCenter.default.addObserver(
            SpeechReactionsController.Notifications.SuggestionsAvailable,
            null,
            (info) => {
                if (this.reactionsPanel && info.suggestions) {
                    this.reactionsPanel.showSpeechSuggestions(
                        info.suggestions,
                        info.gifSuggestions || [],
                        info.gifsLoading || false
                    );
                }
            },
            this
        );

        // Handle emoji/text suggestion selection
        this.reactionsPanel?.setSpeechSuggestionCallback?.((suggestion) => {
            SpeechReactionsController.shared?.displaySuggestion(suggestion);
        });

        // Handle GIF suggestion selection
        this.reactionsPanel?.setGifSuggestionCallback?.((gifData) => {
            const gifSuggestion = SpeechReactionsController.shared?.getGifSuggestionById(gifData.giphyId);
            if (gifSuggestion) {
                SpeechReactionsController.shared?.displayGifReaction(gifSuggestion);
            }
        });

        // Watch for system audio capture stopped (e.g., user cancels picker or stops sharing)
        if (typeof SystemAudioService !== "undefined") {
            NotificationCenter.default.addObserver(
                SystemAudioService.Notifications.CaptureStopped,
                null,
                () => {
                    this.toolbar.callContextEnabled = false;
                    SharedUserDefaults.setValueForKey(false, "callContextEnabled");
                },
                this
            );
        }

        // Initialize call context (system audio) if available and previously enabled
        this.#initializeCallContext();
    }

    /**
     * Initialize call context (system audio capture) state.
     * Restores previous state if the feature was enabled before.
     */
    #initializeCallContext() {
        // Update toolbar button visibility based on native bridge availability
        this.toolbar?.updateCallContextVisibility?.();

        // Check if call context was previously enabled
        const wasEnabled = SharedUserDefaults.getValueForKey("callContextEnabled", false);
        if (!wasEnabled) {
            return;
        }

        // Try to restore the enabled state
        const service = typeof SystemAudioService !== "undefined" ? SystemAudioService.shared : null;
        if (service?.isAvailable) {
            const success = service.startCapture();
            if (success) {
                this.toolbar.callContextEnabled = true;
            } else {
                // Failed to start, clear the saved preference
                SharedUserDefaults.setValueForKey(false, "callContextEnabled");
            }
        }
    }

    /* General-purpose plumbing */

    observePropertyChanged(obj, key, val) {
        switch (key) {
            case "videoDevice":
                this.onVideoDeviceChanged();
                break;

            case "videoTrackEnabled":
                this.#onVideoTrackEnabledChanged();
                break;

            case "isVirtualCameraActive":
                this.#onIsVirtualCameraActiveChanged();
                break;

            case "currentLook":
                if (this.pane) {
                    this.#onCurrentLookChanged(val);
                }
                break;

            case "selectedLook":
                if (this.pane) {
                    this.#onSelectedLookChanged(val);
                }
                break;

            case "currentReaction":
                this.#onSelectedReactionChanged();
                break;

            case "room":
            case "rooms":
            case "recentRooms":
                this.#onRoomsChanged();
                break;

            default:
                break;
        }
    }
}
