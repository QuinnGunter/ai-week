//
//  hybrid/bridge.js
//  mmhmm
//
//  Created by Seth Hitchings on 6/16/2023.
//  Copyright 2023 mmhmm inc. All rights reserved.
//

// HybridBridge exposes a bi-directional API between the mmhmm desktop
// native application and the mmhmm web application. The API allows the
// desktop application to get and set values in the web application, for
// example checking or changing the local presenter's mask style. It also
// allows the desktop application to execute commands in the web
// application, for example changing to the next or previous slide.
//
// In addition to getting and setting values and executing commands, the
// bridge observes property change notifications for the properties that
// it exposes to the native application. When one of those properties
// changes, the bridge calls a native module to notify the native application
// of the change.
var HybridBridge = {
    initialize() {
        if (this.initialized == true) {
            return;
        }
        this.initialized = true;

        this.thumbnailTasks = {};

        this._propertyNameMap = {};

        // Set up the properties that we monitor
        // We'll notify the native application when they change

        var localPresenter = this._localPresenter;
        var stage = this._stage;

        // Handle the legacy Presenter.style property
        this._propertyNameMap["presenter_mask"] = "presenter_mask";

        this._observeMappedProperty(localPresenter, "backgroundStyle", "presenter_background_style");
        this._observeMappedProperty(localPresenter, "shape", "presenter_shape");
        this._observeMappedProperty(localPresenter, "opacity", "presenter_opacity");
        this._observeMappedProperty(localPresenter, "rotation", "presenter_rotation");
        this._observeMappedProperty(localPresenter, "scale", "presenter_scale");
        this._observeMappedProperty(localPresenter, "fullscreen", "presenter_fullScreen");
        this._observeMappedProperty(localPresenter, "mirrorVideo", "presenter_mirrorVideo");
        this._observeMappedProperty(localPresenter, "enhancement", "presenter_enhancement");
        this._observeMappedProperty(localPresenter, "effect", "presenter_effect");
        this._observeMappedProperty(localPresenter, "cropInsets", "crop_insets");
        this._observeMappedProperty(localPresenter, "videoTrackEnabled", "camera_enabled");

        // Overload some Creator actions to work in Camera
        const looksController = this.looksController;
        const looksPane = this.looksPane;
        // Use the BigHands action to control name tag on/off
        this._observeMappedProperty(looksController, "nametagVisible", "bigHands_enabled");
        // Use the Microphone action to control filters on/off
        this._observeMappedProperty(looksPane, "filtersEnabled", "microphone_enabled");

        // We don't have recording, so tell the hybrid app we're not recording
        this._propertyNameMap["isRecording"] = "isRecording";
        this._notifyPropertyChanged("isRecording", false);

        // Slides...

        // We map stage.slide to multiple derived properties
        var props = ["current_slide_preview", "next_slide_preview", "has_previous_slide",
            "has_current_slide", "has_next_slide", "slide_identifier", "slide_status"];
        props.forEach(prop => this._propertyNameMap[prop] = prop);
        this._observeMappedProperty(stage, "slide", "slide_selected");

        // Should we send updated thumbnails to the hybrid app each time they change?
        // This is conditional so that we don't incur the overhead of retrieving and encoding
        // the thumbnail images if nobody is using them.
        if (this.enableSlideThumbnailNotificationsOnInitialize === true) {
            this.enableSlideThumbnailNotifications(true);
            delete this.enableSlideThumbnailNotificationsOnInitialize;
        } else {
            this.sendSlideThumbnailNotifications = false;
        }

        // Watch for authentication changes
        this._propertyNameMap["userId"] = "userId";
        this._propertyNameMap["userEmail"] = "userEmail";
        this._startAuthenticationListener();
        this._notifyAuthenticationChanged();

        this._propertyNameMap["theme"] = "theme";
        this._startThemeListener();

        // We're done. Notify the hybrid app that everything is ready to use.
        this._notifyInitializationComplete();
    },

    _notifyInitializationComplete() {
        if (window.mmhmm_initialized != null) {

            const features = [
                "web_mini_remote"
            ];

            window.mmhmm_initialized({
                build: (typeof gAppBuild != "undefined") ? gAppBuild : "dev",
                theme: gApp.theme,
                releaseTrack: getReleaseTrack(),
                features,
            });
        }
    },

    _startSlideThumbnailObservation() {
        NotificationCenter.default.addObserver(
            Slide.Notifications.ThumbnailUpdated,
            null,
            this._slideThumbnailUpdated,
            this
        );

        NotificationCenter.default.addObserver(
            Presentation.Notifications.SlidesChanged,
            null,
            this._presentationChangedSlides,
            this
        );
    },
    _stopSlideThumbnailObservation() {
        NotificationCenter.default.removeObserver(
            Slide.Notifications.ThumbnailUpdated,
            null,
            this._slideThumbnailUpdated,
            this
        );

        NotificationCenter.default.removeObserver(
            Presentation.Notifications.SlidesChanged,
            null,
            this._presentationChangedSlides,
            this
        );
    },
    _startAuthenticationListener() {
        var authListener = this.authListener;
        if (authListener != null) {
            return;
        }
        authListener = () => this._notifyAuthenticationChanged();
        NotificationCenter.default.addObserver(
            mmhmmAPI.Notifications.AuthenticationChanged,
            null,
            authListener
        );
        this.authListener = authListener;
    },
    _stopAuthenticationListener() {
        var authListener = this.authListener;
        if (authListener == null) {
            return;
        }
        NotificationCenter.default.removeObserver(
            mmhmmAPI.Notifications.AuthenticationChanged,
            null,
            authListener
        );
        this.authListener = null;
    },
    _notifyAuthenticationChanged() {
        this._notifyPropertyChanged("userId", this.userId);
        this._notifyPropertyChanged("userEmail", this.userEmail);
    },
    _startThemeListener() {
        let themeListener = this.themeListener;
        if (themeListener != null) {
            return;
        }
        themeListener = () => this._notifyThemeChanged();
        NotificationCenter.default.addObserver(
            App.Notifications.ThemeChanged,
            null,
            themeListener
        );
        this.themeListener = themeListener;
    },
    _stopThemeListener() {
        let themeListener = this.themeListener;
        if (themeListener == null) {
            return;
        }
        NotificationCenter.default.removeObserver(
            App.Notifications.ThemeChanged,
            null,
            themeListener
        );
        this.themeListener = null;
    },
    _notifyThemeChanged() {
        this._notifyPropertyChanged("theme", gApp.theme);
    },

    /*
     * Properties - internal use only
     */
    get looksPane() {
        return gApp.looksUI;
    },
    get looksController() {
        return gApp.looks;
    },
    get _stage() {
        return gApp.stage;
    },
    get _localPresenter() {
        return gApp.localPresenter;
    },
    get _currentPresenterEffect() {
        return this._localPresenter?.effect;
    },
    get _roomController() {
        return gApp.rooms;
    },
    get _isPaywalled() {
        return gApp.commerce.isCurrentlyPaywalled();
    },
    get _allowPresenterSettingsChanges() {
        return !this._isPaywalled;
    },
    get _allowSlideSelectionChanges() {
        return false;
    },
    get _currentPresentation() {
        return gApp.dataStore?.activePresentation;
    },
    get _user() {
        const endpoint = mmhmmAPI.defaultEndpoint();
        return endpoint.isAuthenticated ? endpoint.user : null;
    },

    /*
     * Functions to show/hide parts of the application
     */
    displayReleaseNotes() {
        gApp.displayReleaseNotes();
    },

    /*
     * User-related commands and properties
     */
    get userId() {
       return this._user?.id;
    },

    get userEmail() {
        return this._user?.email;
    },

    get audioDevice() {
        return null;
    },

    get videoDevice() {
        return this._localPresenter?.videoDevice?.label;
    },

    /*
     * Slide-related commands and properties
     */
    set slide_selected(selected) {
        this._validateBoolean(selected, "slide selected");
        if (this.slide_selected != selected) {
            // Repurpose this to toggle looks on/off
            this.looksPane.toggleLook();
        }
    },
    get slide_selected() {
        // Repurpose this to toggle looks on/off
        return this.looksPane.getLooksToggle();
    },
    get slide_identifier() {
        // Get the identifier of the currently selected slide
        var slide = this._stage.slide;
        if (slide == null) {
            return null;
        }
        return slide.identifier;
    },
    getSpeakerNotes(slideIdentifier) {
        // Get the Speaker Notes for the slide with the given identifier
        // If that slide is not in the currently selected presentation, throw an error
        let slide = this._getSlideWithIdentifier(slideIdentifier);
        if (slide) {
            let notes = slide.speakerNotes;
            return notes ? notes : "";
        }
        throw new Error("Unknown slide identifier");
    },
    setSpeakerNotes(slideIdentifier, notes) {
        // Temporary workaround for https://github.com/All-Turtles/mmhmm-web/issues/4515
        // If we're using the new web-based remote control, the native code
        // should never be setting speaker notes, so just ignore it.
        if (App.isHybrid && gHybrid.capabilities.supportsWebMiniRemote == true) {
            return;
        }

        // Set the Speaker Notes for the slide with the given identifier
        // If that slide is not in the currently selected presentation, throw an error
        var slide = this._getSlideWithIdentifier(slideIdentifier);
        if (!slide) {
            throw new Error("Unknown slide identifier");
        }

        const previousNotes = slide.speakerNotes || "";

        if (previousNotes === notes) {
            // NOTES NOT CHANGED
            return;
        }

        const newLength = notes?.length || 0;

        if (!previousNotes) {
            // NEW NOTES
            Analytics.Log("remote.slide-notes.add-text", {
                slide_id: slideIdentifier,
            });
        } else {
            // NOTES MODIFIED
            Analytics.Log("remote.slides-notes.change-text", {
                slide_id: slideIdentifier,
                size: {
                    "-1": "smaller",
                    "0": "no-change",
                    "1": "larger",
                }[Math.sign(newLength - previousNotes.length)],
            });
        }

        slide.speakerNotes = notes;
    },
    _getSlideWithIdentifier(identifier) {
        var presentation = this._currentPresentation;
        return presentation?.slideWithIdentifier(identifier);
    },
    enableSlideThumbnailNotifications(enable) {
        if (this.initialized != true) {
            // The hybrid app called enableSlideNotifications before
            // HybridBridge.initialize was called.
            // Defer thumbnail initialization to bridge initialization.
            if (enable) {
                this.enableSlideThumbnailNotificationsOnInitialize = true;
            }
            return;
        }

        // If true, we'll send updated slide thumbnails to the hybrid app
        // each time the current/next slide thumbnail changes
        if (this.sendSlideThumbnailNotifications == enable) {
            return;
        }

        this.sendSlideThumbnailNotifications = enable;
        if (enable == true) {
            this._notifySlideThumbnails();
            this._notifySlideStatus();
            this._startSlideThumbnailObservation();
        }
        else {
            this._stopSlideThumbnailObservation();
        }
    },
    set remote_visible(shown) {
        // Called by the hybrid app to notify us that the mini remote has been shown or hidden
        if (shown) {
            Analytics.Log("remote.open");
        } else {
            Analytics.Log("remote.close");
        }
    },
    // mmhmm_showRemote is a function that is injected by the desktop app
    canShowMiniRemote() {
        return false;
    },
    showMiniRemote () {
        return;
    },
    get slide_status() {
        return "";
    },
    get _current_slide() {
        return gApp.stage.slide;
    },
    get current_slide_preview() {
        return this._thumbnailForSlide(this._current_slide);
    },
    selectNextSlide() {
        // Intentionally disabled in Camera
    },
    get next_slide_preview() {
        return null;
    },
    selectPreviousSlide() {
        // Intentionally disabled in Camera
    },
    get previous_slide_preview() {
        return null;
    },
    async _thumbnailForSlide(slide) {
        return new Promise((resolve, reject) => {
            if (slide == null || slide.thumbnailBlob == null) {
                resolve(null);
                return;
            }
            this._blobToDataURL(slide.thumbnailBlob()).then(dataURL => {
                resolve(dataURL);
            })
        })
    },

    /*
     * Recording-related commands and properties
     * These are ignored since we're in Camera
     */
    startOrResumeRecording() {
    },
    pauseRecording() {
    },
    toggleRecording() {
    },
    markRecordingChapter() {
    },
    /**
     * Whether the recorder is currently active.
     * Returns false if the current recording session
     * is paused.
     *
     * @returns {bool}
     */
    get isRecording() {
        return false;
    },

    /*
     * Properties - exposed to the native application
     */

    // TODO properties to consider
    // - presenter anchor position (expose fixed positions, or any point?)

    /**
     * Legacy presenter properties
     */
    set presenter_mask(maskStyle) {
        // Presenter mask is a legacy setting that has been removed
        // Do our best to map the old values to the new ones
        // Based on Presenter.migrateLegacyStyleWithBackgroundColor

        if (!this._allowPresenterSettingsChanges) {
            return;
        }

        let shape = null;
        let backgroundStyle = null;
        switch(maskStyle) {
            case "silhouette":
                shape = Presenter.Shape.Rectangle;
                backgroundStyle = Presenter.BackgroundStyle.Hide;
                break;
            case "circle":
                shape = Presenter.Shape.Circle;
                if (this._localPresenter.backgroundStyle == Presenter.BackgroundStyle.Hide) {
                    backgroundStyle = Presenter.BackgroundStyle.Show;
                }
                break;
            case "rectangle":
                shape = Presenter.Shape.Rectangle;
                if (this._localPresenter.backgroundStyle == Presenter.BackgroundStyle.Hide) {
                    backgroundStyle = Presenter.BackgroundStyle.Show;
                }
                break;
            default:
                throw new Error("Invalid mask style: " + maskStyle);
        }

        this._localPresenter.shape = shape;
        if (backgroundStyle != null) {
            this._localPresenter.backgroundStyle = backgroundStyle;
        }
    },
    get presenter_mask() {
        const shape = this._localPresenter.shape;
        const backgroundStyle = this._localPresenter.backgroundStyle;
        if (shape != Presenter.Shape.Rectangle) {
            // The Stream Deck doesn't know about hexagon, so just return circle for non-rectangles
            return "circle";
        } else if (backgroundStyle == Presenter.BackgroundStyle.Hide) {
            return "silhouette";
        } else {
            return "rectangle";
        }
    },
    _notifyPresenterMaskStyleChanged() {
        // Convert the current backgroundStyle & shape to a legacy mask style
        // for consumers still using the old presenter stuff
        this._notifyPropertyChanged("presenter_mask", this.presenter_mask);
    },

    /**
     * Presenter properties
     */
    set presenter_background_style(style) {
        if (!this._allowPresenterSettingsChanges) {
            return;
        }
        if (!Object.values(Presenter.BackgroundStyle).includes(style)) {
            throw new Error("Invalid presenter background style: " + style);
        }
        this._localPresenter.backgroundStyle = style;
    },
    get presenter_background_style() {
        return this._localPresenter.backgroundStyle;
    },
    set presenter_shape(shape) {
        if (!this._allowPresenterSettingsChanges) {
            return;
        }
        if (!Object.values(Presenter.Shape).includes(shape)) {
            throw new Error("Invalid presenter shape: " + shape);
        }
        this._localPresenter.shape = shape;
    },
    get presenter_shape() {
        return this._localPresenter.shape;
    },
    set presenter_opacity(opacity) {
        if (!this._allowPresenterSettingsChanges) {
            return;
        }
        this._validateNumber(opacity, 0.0, 1.0, "presenter opacity");
        this._localPresenter.opacity = opacity;
    },
    get presenter_opacity() {
        return this._localPresenter.opacity;
    },

    set presenter_rotation(rotation) {
        if (!this._allowPresenterSettingsChanges) {
            return;
        }
        this._validateNumber(rotation, 0, 360, "presenter rotation");
        this._localPresenter.rotation = rotation;
    },
    get presenter_rotation() {
        return this._localPresenter.rotation;
    },

    set presenter_scale(scale) {
        if (!this._allowPresenterSettingsChanges) {
            return;
        }
        this._validateNumber(scale, 0.0, 1.0, "presenter scale");
        this._localPresenter.scale = scale;
    },
    get presenter_scale() {
        return this._localPresenter.scale;
    },

    set presenter_fullScreen(fullScreen) {
        if (!this._allowPresenterSettingsChanges) {
            return;
        }
        this._validateBoolean(fullScreen, "presenter full screen");
        this._localPresenter.fullscreen = fullScreen;
    },
    get presenter_fullScreen() {
        return this._localPresenter.fullscreen;
    },

    set presenter_mirrorVideo(mirror) {
        this._validateBoolean(mirror, "presenter mirror video");
        this._localPresenter.mirrorVideo = mirror;
    },
    get presenter_mirrorVideo() {
        return this._localPresenter.mirrorVideo;
    },

    set presenter_enhancement(enhancement) {
        if (!this._allowPresenterSettingsChanges) {
            return;
        }
        this._validateNumber(enhancement, 0.0, 1.0, "presenter enhancement");
        this._localPresenter.enhancement = enhancement;
    },
    get presenter_enhancement() {
        return this._localPresenter.enhancement;
    },

    set presenter_effect(identifier) {
        if (!this._allowPresenterSettingsChanges) {
            return;
        }
        if (identifier == null) {
            this._localPresenter.effect = null;
            return;
        }

        var effect = NewFilterWithID(identifier);
        if (effect == null) {
            throw new Error("Invalid effect identifier: " + identifier);
        }
        this._localPresenter.effect = effect;
    },
    get presenter_effect() {
        var effect = this._localPresenter.effect;
        if (effect != null) {
            return effect.identifier;
        }
        return null;
    },
    /* Get a map of localized effect title to effect UUID */
    get presenter_effects() {
        var registry = PresenterFilterRegistry();
        var effects = {};
        registry.forEach(effect => {
            if (effect.appearancePane) {
                effects[effect.title] = effect.class.identifier;
            }
        });
        return effects;
    },
    /*
     * For the currently selected effect, get the current parameter value, normalized to a scale of 0-1
     * Works for effects with a single configurable parameter of type "range"
     */
    get presenter_effect_value() {
        var {effect, key} = this._currentEffectAndParameterKey();
        if (effect == null || key == null) {
            return 0;
        }

        var parameter = effect.parameters[key];
        var range = parameter.max - parameter.min;
        var currentValue = effect[key];
        return (currentValue - parameter.min) / range;
    },
    /*
     * For the currently selected effect, set the current parameter value, normalized to a scale of 0-1
     * Works for effects with a single configurable parameter of type "range"
     */
    set presenter_effect_value(value) {
        if (!this._allowPresenterSettingsChanges) {
            return;
        }
        this._validateNumber(value, 0, 1, "presenter effect value");

        var {effect, key} = this._currentEffectAndParameterKey();
        if (effect == null || key == null) {
            return;
        }

        var parameter = effect.parameters[key];
        var range = parameter.max - parameter.min;
        var newValue = (value * range) + parameter.min;
        effect[key] = newValue;
    },
    _currentEffectAndParameterKey() {
        var result = {};

        var effect = this._currentPresenterEffect;
        if (effect != null) {
            var key = this._configurableParameterForEffect(effect);
            if (key != null) {
                result = {effect, key};
            }
        }

        return result;
    },
    _configurableParameterForEffect(effect) {
        if (effect == null) {
            return null;
        }
        var parameters = effect.parameters;
        var configurableKeys = [];
        for (var key in parameters) {
            var parameter = parameters[key];
            if (parameter.configurable != false && parameter.type == "range") {
                configurableKeys.push(key);
            }
        }
        if (configurableKeys.length != 1) {
            return null;
        }
        return configurableKeys[0];
    },
    _observePresenterEffectParameter() {
        var previous = this._effectUnderObservation;
        if (previous != null) {
            var previousKey = this._configurableParameterForEffect(previous);
            if (previousKey != null) {
                delete this._propertyNameMap[previousKey];
                previous.removeObserverForProperty(this, previousKey);
                this._effectUnderObservation = null;
            }
        }

        var effect = this._currentPresenterEffect;
        var key = this._configurableParameterForEffect(effect);
        if (key != null) {
            this._propertyNameMap[key] = "presenter_effect_value";
            effect.addObserverForProperty(this, key);
            this._effectUnderObservation = effect;

            // Emit an initial value for the new effect's configurable parameter
            this.observePropertyChanged(effect, key, effect[key]);
        }
    },

    set camera_zoom(zoom) {
        // Intentionally blank
    },
    get camera_zoom() {
        return 1.0;
    },

    set crop_insets(insets) {
        if (!this._allowPresenterSettingsChanges) {
            return;
        }
        this._validateNumber(insets.top, 0, 1, "crop insets top");
        this._validateNumber(insets.left, 0, 1, "crop insets left");
        this._validateNumber(insets.bottom, 0, 1, "crop insets bottom");
        this._validateNumber(insets.right, 0, 1, "crop insets right");

        this._localPresenter.cropInsets = insets;
    },
    get crop_insets() {
        return this._localPresenter.cropInsets ?? InsetsZero();
    },

    set camera_enabled(enabled) {
        this._validateBoolean(enabled, "camera enabled");
        this._localPresenter.videoTrackEnabled = enabled;
    },
    get camera_enabled() {
        return this._localPresenter.videoTrackEnabled;
    },

    set microphone_enabled(enabled) {
        // Overload this to toggle filters on/off
        this._validateBoolean(enabled, "microphone enabled");
        if (this.microphone_enabled != enabled) {
            this.looksPane.toggleFilters();
        }

    },
    get microphone_enabled() {
        // Overload this to indicate whether filters are on/off
        return this.looksPane.isFiltersEnabled();
    },

    set bigHands_enabled(enabled) {
        // Overload this to toggle name tag on/off
        this._validateBoolean(enabled, "bigHands enabled");
        if (this.bigHands_enabled != enabled) {
            this.looksPane.toggleNametag();
        }
    },
    get bigHands_enabled() {
        // Overload this to indicate whether name tag is on/off
        return this.looksPane.isNametagEnabled();
    },

    /*
     * Backgrounds / rooms
     */
    /** Get an array of all rooms */
    get rooms() {
        var controller = this._roomController;
        var categories = controller.categories;

        var results = {};

        categories.forEach(category => {
            var categoryTitle = category.title;

            var rooms = category.rooms;
            rooms.forEach(room => {
                var identifier = room.identifier;
                var result = results[identifier];
                if (result == null) {
                    result = {
                        identifier,
                        title: room.title,
                        categories: [],
                    }
                    results[identifier] = result;
                }
                result.categories.push(categoryTitle);
            });
        });

        return Object.values(results);
    },
    /** An array of rooms to be cycled through in "demo mode" */
    get demo_rooms() {
        var controller = this._roomController;
        var ids = [
            "4416c7e6-5d15-46e1-ace7-7a9b540fc5d6", // News Anchor
            "7b383c50-6f35-46d7-986f-f704b64afd86", // White Shelves
            "23940e80-5d06-4c04-b86a-9851ec78ccf9", // Paper world
            "f218f172-964e-471d-8a30-07a02d3ae851", // Japanese fall garden
            "a13b8ac7-9855-44de-813b-b852fa220bba", // Cerulean Circles
            "a9be64d6-2b9f-4e5c-a100-aff209be6818", // Cabin
            "15bb5152-2a24-453a-ba16-2d2f2c030cbd", // Spring Blossoms View
            "3d9488e4-44ca-4372-8b5d-ac599256f0e0", // Miami Nights
            "94f78750-3a76-4f33-a27b-5f72e883a8eb", // Ripple
            "8a57c1fb-ee9b-413e-90b8-c2a058dd5bff", // Board Room Screen
        ];

        var results = [];
        ids.forEach(id => {
            var room = controller.roomWithIdentifier(id);
            if (room == null) {
                console.error("Unknown demo room", id);
                return;
            }
            results.push({
                identifier: room.identifier,
                title: room.title,
            });
        });

        return results;
    },
    set room(identifier) {
        // Overload this to set the current look
        this.look = identifier;
    },
    /** Returns a Promise */
    get room() {
        // Overload this to return the current look
        return this.look;
    },
    roomWithIdentifier(identifier) {
        // Overload this to get a look by identifier
        return this.lookWithIdentifier(identifier);
    },
    set room_hidden(hidden) {
        // This feature has been removed
        // We could fake it by changing both background style and fullscreen, but
        // it's probably better to just expose those features directly
    },
    get room_hidden() {
        return false;
    },

    /* Looks */
    get look() {
        const look = this.looksController.currentLook;
        return this._resultForSlide(look);
    },
    set look(identifier) {
        if (this._isPaywalled) {
            return;
        }
        if (identifier == null) {
            throw new Error("Invalid look identifier: null");
        }
        const look = this.looksController.lookWithIdentifier(identifier);
        if (look == null) {
            throw new Error("Unknown look identifier: " + identifier);
        }
        this.looksController.selectedLook = look;
    },
    lookWithIdentifier(identifier) {
        const look = this.looksController.lookWithIdentifier(identifier);
        return this._resultForSlide(look);
    },

    /*
        Visuals / reactions
     */
    get visual() {
        const reaction = this.looksController.currentReaction;
        return this._resultForReaction(reaction);
    },
    async toggleVisual(identifier) {
        if (this._isPaywalled) {
            return;
        }
        if (identifier == null) {
            throw new Error("Invalid visual identifier: null");
        }
        const reaction = this.looksController.reactionWithIdentifier(identifier);
        if (!reaction) {
            throw new Error("Unknown visual identifier: " + identifier);
        }
        const currentReaction = this.looksController.currentReaction;
        if (currentReaction?.identifier === reaction.identifier) {
            // If this reaction is already selected, deselect it
            this.looksController.currentReaction = null;
        } else {
            // If this reaction isn't already selected, select it
            this.looksController.currentReaction = reaction;
        }
    },

    /*
     * Media
     */
    /**
     * Get the ID and a thumbnail for the media item that's currently on stage,
     * or null if there is no media on stage. If there is a slide on stage and
     * it contains more than one media item, return the selected media item,
     * or null if none is selected.
     *
     * Only file-based media (image, video, GIF, etc) are included.
     */
    get media() {
        // Override this to let the user select a visual
        return this.visual;
    },
    _isAssignableMedia(media) {
        if (IsKindOf(media, Media.mmhmmTV)) {
            return false;
        }
        return IsKindOf(media, Media.BasicVideo) ||
            IsKindOf(media, Media.Image) ||
            IsKindOf(media, Media.GIF);
    },
    async toggleMedia(identifier) {
        return this.toggleVisual(identifier);
    },
    _getMatchingMediaFromStage(mediaToFind) {
        // Check whether there is a media object on stage that has the same contents
        // as the provided media record. In practice, this means looking for a media
        // item whose underlying asset has the same fingerprint. This won't match
        // media types that don't use an asset, such as text or screen share media.
        var fingerprintToFind = mediaToFind.asset?.fingerprint;
        if (fingerprintToFind == null) {
            return null;
        }

        let media = this._stage.media;
        return media.find(aMedia => {
            return fingerprintToFind == aMedia.asset?.fingerprint;
        });
    },
    async _resultForReaction(reaction) {
        // If the reaction has exactly one media item, return its thumbnail
        if (reaction?.objects?.length == 1) {
            const mediaResult = await this._resultForMedia(reaction.objects[0]);
            if (mediaResult != null) {
                return {
                    identifier: reaction.identifier,
                    thumbnail: mediaResult.thumbnail,
                };
            } else {
                return {
                    identifier: reaction.identifier,
                };
            }
        }

        return this._resultForSlide(reaction);
    },
    async _resultForSlide(slide) {
        return new Promise(async (resolve, reject) => {
            if (slide == null) {
                resolve(null);
                return;
            }

            const result = {
                identifier: slide.identifier,
                title: slide.title,
            }

            const thumbnail = await slide.thumbnailBlob();
            if (IsKindOf(thumbnail, Blob)) {
                this._blobToDataURL(thumbnail).then(dataURL => {
                    result.thumbnail = dataURL;
                    resolve(result);
                });
            } else {
                console.error("slide.thumbnail returned unexpected type", thumbnail);
                resolve(result);
            }
        });
    },
    async _resultForMedia(media) {
        return new Promise(async (resolve, reject) => {
            if (media == null) {
                resolve(null);
                return;
            }

            var result = {
                identifier: media.identifier,
            }

            // TODO refactor this so that we can call media.thumbnailBlob
            var thumbnailAsset = media.thumbnailAsset;
            if (thumbnailAsset != null) {
                this._blobToDataURL(thumbnailAsset.openAsBlob()).then(dataURL => {
                    result.thumbnail = dataURL;
                    resolve(result);
                }).catch(err => {
                    console.error("Error loading media thumbnail asset", err);
                    resolve(result);
                })
                return;
            }

            // No asset...
            var thumbnail = await media.thumbnail();
            if (IsKindOf(thumbnail, Blob)) {
                this._blobToDataURL(thumbnail).then(dataURL => {
                    result.thumbnail = dataURL;
                    resolve(result);
                });
            } else {
                console.error("media.thumbnail returned unexpected type", thumbnail);
                resolve(result);
            }
        })
    },

    /*
     * Internal helpers
     */
    async _resultForRoom(room) {
        return new Promise((resolve, reject) => {
            if (room == null) {
                resolve(null);
            }

            var result = {};
            result.identifier = room.identifier;
            result.title = room.title;

            // If the room has a thumbnail asset, load it and
            // convert it into a data:// URL so that we can pass
            // the full thumbnail image back to the caller
            var asset = room.thumbnailAsset;
            if (asset == null) {
                resolve(result);
            }

            this._blobToDataURL(asset.openAsBlob()).then(dataURL => {
                result.thumbnail = dataURL;
                resolve(result);
            });
        });
    },

    /*
     * Given a Promise that returns a Blob, return a new Promise
     * that resolves with a data URL containing that blob's contents.
     */
    async _blobToDataURL(promiseOrBlob) {
        return new Promise(async (resolve, reject) => {
            var blob = promiseOrBlob;
            if (IsKindOf(promiseOrBlob, Promise)) {
                blob = await promiseOrBlob;
            }
            if (blob != null) {
                var reader = new FileReader();
                reader.onload = evt => {
                    resolve(reader.result);
                };
                reader.error = evt => {
                    resolve(null);
                }
                reader.readAsDataURL(blob);
            }
            else {
                resolve(null);
            }
        });
    },

    _validateNumber(value, min, max, name) {
        if (Number.isFinite(value) == false) {
            throw new Error("Invalid " + name + " type: " + value);
        }
        if (value < min || value > max) {
            throw new Error("Invalid " + name + " value: " + value);
        }
    },

    _validateBoolean(value, name) {
        if (typeof(value) != "boolean") {
            throw new Error("Invalid " + name + " type: " + value);
        }
    },

    /*
     * Notifications set TO the native application when one of our
     * monitored properties changes.
     */
    _notifyPropertyChanged(key, val) {
        if (window.mmhmm_propertyChanged != null) {
            var mappedKey = this._propertyNameMap[key];
            if (mappedKey == null) {
                console.error("Unmapped property", key);
                return;
            }
            window.mmhmm_propertyChanged(mappedKey, val);
        }
    },
    _observeMappedProperty(object, propertyName, mappedName) {
        object.addObserverForProperty(this, propertyName);

        // Map between the name we use for a property (e.g. "style") and the
        // name we expose to the native application (e.g. presenter_mask).
        this._propertyNameMap[propertyName] = mappedName;

        // Notify the hybrid application of the initial state of the property
        this.observePropertyChanged(object, propertyName, object[propertyName]);
    },

    /*
     * We have more than one property tied to the current slide,
     * so it gets special handling.
     */
    async _slideChanged(slide) {
        // slide is the current value of stage.slide

        // This slide may not exist in the selected presentation
        // e.g. because the person is on a call and a remote party is
        // sharing one of their own slides.  In this case we'll treat
        // it as no slide being selected (as this reflects how it
        // appears in the app's built in slide tray)
        const presentation = this._currentPresentation;
        if (presentation == null || presentation.slides.includes(slide) == false) {
            slide = null;
        }

        // slide_selected
        // Map stage.slide to a boolean indicating whether there's a slide selected
        const selected = (slide != null);
        this._notifyPropertyChanged("slide", selected);

        // slide_identifier
        // Map stage.slide to the current slide's unique ID
        const identifier = slide?.identifier;
        this._notifyPropertyChanged("slide_identifier", identifier);

        // Slide thumbnails
        this._notifySlideThumbnails();

        // Slide list title, e.g. "Slide 3 of 5"
        this._notifySlideStatus();

        // Whether there is a previous or next slide
        this._notifyHasSlides();
    },
    async _notifySlideThumbnails() {
        if (this.sendSlideThumbnailNotifications != true) {
            return;
        }
        this._notifySlideThumbnail("current_slide_preview");
        this._notifySlideThumbnail("next_slide_preview");
    },
    async _notifySlideThumbnail(key) {
        if (this.initialized != true) {
            return;
        }

        // If we're already working on a thumbnail request for this key,
        // cancel it
        var task = this.thumbnailTasks[key];
        if (task != null) {
            task.cancelled = true;
        }

        // Add a new task that can be cancelled later
        task = {
            key: key,
            promise: this[key],
            cancelled: false,
        };
        this.thumbnailTasks[key] = task;

        // Generate the thumbnail and notify
        task.promise.then(thumbnail => {
            if (task.cancelled == true) {
                return;
            }
            this.thumbnailTasks[task.key] = null;
            this._notifyPropertyChanged(task.key, thumbnail || "");
        });
    },
    _notifySlideStatus() {
        if (this.sendSlideThumbnailNotifications != true) {
            return;
        }
        this._notifyPropertyChanged("slide_status", this.slide_status);
    },
    _notifyHasSlides() {
        var slide = this._current_slide;
        this._notifyPropertyChanged("has_current_slide", slide != null);
        this._notifyPropertyChanged("has_previous_slide", false);
        this._notifyPropertyChanged("has_next_slide", false);
    },

    /*
     * KVO
     */
    observePropertyChanged(obj, key, val) {
        // Some property values get transformed before we send them on to the hybrid app
        if (obj != null && obj == this._effectUnderObservation) {
            // Normalize the effect parameter value to our 0-1 range
            val = this.presenter_effect_value;
        }
        else if (key == "effect") {
            // Map to the effect's UUID
            if (val != null) {
                val = val.identifier;
            }
            // The effect changed; set up observation of its configurable parameter
            this._observePresenterEffectParameter();
        }
        else if (key == "slide") {
            this._slideChanged(val);
            return;
        } else if (key == "backgroundStyle" || key == "shape") {
            // Notify consumers still using the legacy presenter "style" property
            this._notifyPresenterMaskStyleChanged();
        }
        this._notifyPropertyChanged(key, val);
    },

    _slideThumbnailUpdated(info, name, object) {
        if (object == null || this.sendSlideThumbnailNotifications != true) {
            return;
        }

        // See if the slide that changed is one of prev/current/next
        var identifier = object.identifier;
        var labels = ["current", "next"];

        for (var i = 0; i < labels.length; i++) {
            var label = labels[i];
            var slide = this[`_${label}_slide`];

            if (slide != null && slide.identifier == identifier) {
                // This is the one that changed
                var property = `${label}_slide_preview`;
                this._notifySlideThumbnail(property);
                break;
            }
        }
    },

    _presentationChangedSlides(info, name, object) {
        // The current slide list changed
        // Rather than figuring out what changed, just update all three thumbnails
        this._notifySlideThumbnails();
        this._notifySlideStatus();
        this._notifyHasSlides();
    }
}
