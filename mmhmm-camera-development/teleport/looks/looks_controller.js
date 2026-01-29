//
//  looks/looks_controller.js
//  mmhmm
//
//  Created by Seth Hitchings on 3/13/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

// Applied to a slide, determines what kind of slide it is
const LooksContentType = Object.freeze({
    Look: "companion.look",
    Reaction: "companion.reaction",
    AwayScreen: "companion.away",
});

// Applied to a media object, determines how it is used
const LooksMediaType = Object.freeze({
    Logo: "look.logo",
    Pattern: "look.pattern",
    Overlay: "look.overlay",
    EmojiReaction: "reaction.emoji",
});

const LooksLayer = Object.freeze({
    Logo: "logo",
    Tint: "tint",
    Pattern: "pattern",
    Overlay: "overlay",
    Wallpaper: "wallpaper",
});

const LooksReactionLayout = Object.freeze({
    FullScreen: "full-screen",
    OverTheShoulder: "over-the-shoulder",
    SlideMedia: "slide-media",
    SlideAndPresenter: "slide-and-presenter"
});

/**
 * Manages Airtime Camera functionality (but not UI)
 */
class LooksController extends ObservableObject {

    static #looksPresentationName = "Looks";
    static #reactionsPresentationName = "Visuals";

    static #defaultsKeyLooksOn = "looksOn";
    static #defaultsKeySelectedLook = "activeLook";
    static #defaultsKeyAwayScreen = "looksCameraOffReaction";
    static #defaultsKeyAwayScreensAdded = "awayScreensAdded";

    #initializationPromise = null;

    #unauthenticatedLooksPresentation;
    #unauthenticatedReactionsPresentation;

    #stopped = false;
    #stage;
    #reactionOverlayLayer = null;
    #cameraOffOverlayLayer = null;
    #looksTransitionLayer = null;
    #reactionControlsOverlay = null;

    #dataStore;
    #roomsStore;
    #sharing;
    #autoTintGenerator;

    #currentReaction = null;
    #nametagVisible = false;

    /** Whether looks are turned on */
    #looksOn = true;
    /** The currently selected look */
    #selectedLook = null;

    #savedLook;

    #observersRegistered = false;
    #firstUse = null;

    createdLooksPresentation = false;

    /**
     * @param {DataStore} dataStore
     */
    constructor(stage, dataStore, roomsStore) {
        super();

        this.#stage = stage;
        this.#dataStore = dataStore;
        this.#roomsStore = roomsStore;
        this.#autoTintGenerator = new AutomaticColorSelector();
        this.#looksTransitionLayer = this.#createLooksTransitionLayer();
        this.#cameraOffOverlayLayer = this.#createCameraOffLayer();

        // We'll manually post notifications when the current look changes
        this.automaticallyNotifiesObserversOfCurrentLook = false;

        this.#initialize();
    }

    stop() {
        this.#stopped = true;
    }

    setReactionControlsOverlay(overlay) {
        this.#reactionControlsOverlay = overlay;
    }

    /**
     * @returns {boolean} true if this is likely the first time the user has used
     * Airtime Camera. We don't know for sure, because we don't want to wait for
     * the user's presentations to load from the service in order to find out.
     */
    get isFirstUse() {
        if (this.#firstUse != null) {
            return this.#firstUse;
        }
        this.#firstUse = SharedUserDefaults.getValueForKey("hasLaunchedCamera", false) === false;
        if (this.#firstUse) {
            SharedUserDefaults.setValueForKey(true, "hasLaunchedCamera");
        }
        return this.#firstUse;

    }

    get initializationPromise() {
        return this.#initializationPromise;
    }

    async #initialize() {
        this.#initializationPromise = promiseWrapper();
        try {
            await this.#performInitialization();
            this.#initializationPromise.resolve();
        } catch (err) {
            console.error("Error initializing LooksController", err);
            this.#initializationPromise.reject(err);
        }
    }

    async #performInitialization() {
        this.#addFontsLoadedHandler();

        this.#selectedLook = this.#stage.slide;
        this.#setStageDefaults();

        const presenter = this.#stage.localPresenter;
        if (presenter.videoTrackEnabled == false && gApp.paused == false) {
            // set videoTrackEnabled doesn't seem to be idempotent
            presenter.videoTrackEnabled = true;
        }

        if (this.isAuthenticated == false) {
            await this.#setupUnauthenticatedUse();
            return;
        }

        // TODO this seems like a point where we could check whether the
        // presentations were loaded, and if not, show a modal allowing the user to retry
        await this.ensureContentLoaded();

        // Make sure the looks presentation is the active presentation
        const looksPresentation = this.looksPresentation;
        if (!looksPresentation.isActivePresentation) {
            this.#openPresentation(looksPresentation);
        }

        // Restore the last selected look
        const lastSelectedLookId = SharedUserDefaults.getValueForKey(LooksController.#defaultsKeySelectedLook);
        if (this.createdLooksPresentation) {
            this.#setInitialLook();
        } else if (lastSelectedLookId) {
            const look = looksPresentation.slideWithIdentifier(lastSelectedLookId);
            if (look) {
                this.#looksOn = SharedUserDefaults.getValueForKey(LooksController.#defaultsKeyLooksOn, true);
                this.selectedLook = look;
            } else {
                this.selectedLook = looksPresentation.activeSlides[0];
            }
            if (!this.selectedLook) {
                this.#looksOn = false;
            }
        }

        // TODO we should observe stage.slide so that we get updated if something
        // else changes the slide

        NotificationCenter.default.addObserver(
            Presentation.Notifications.SlidesChanged,
            null,
            this.#onPresentationSlidesChanged,
            this
        );
        this.#observersRegistered = true;

        this.#stage.localPresenter.addObserverForProperty(this, "videoTrackEnabled");

        // Observe the presenter's layer in case it changes
        presenter.addObserverForKeyPath(this, "layer.hidden");

        this.#cameraOffOverlayLayer.opacity = 0;
        this.#stage.foregroundLayer.addSublayer(this.#cameraOffOverlayLayer);
        this.#stage.foregroundLayer.addSublayer(this.#looksTransitionLayer);

        this.sharing.refreshContent();
    }

    async destroy() {
        const presenter = this.#stage.localPresenter;

        presenter.removeObserverForProperty(this, "videoTrackEnabled");

        if (this.#observersRegistered) {
            NotificationCenter.default.removeObserver(
                Presentation.Notifications.SlidesChanged,
                null,
                this.#onPresentationSlidesChanged,
                this
            );
            this.#observersRegistered = false;
        }

        // Remove our look from the stage
        this.setCurrentLook(null);
        this.currentReaction = null;

        this.#stage.foregroundLayer.removeSublayer(this.#looksTransitionLayer);
        this.#stage.foregroundLayer.removeSublayer(this.#cameraOffOverlayLayer);
    }

    #addFontsLoadedHandler() {
        document.fonts.addEventListener("loadingdone", (event) => {
            this.#refreshNametag();
        });
        // TODO should we also refresh text media? Probably not, they should do this themselves
    }

    #setInitialLook() {
        // We've just created and populated the user's looks presentation
        // Now put the default look on stage, along with the nametag
        const presentation = this.looksPresentation;
        const looks = presentation.activeSlides;
        const look = looks.length > 0 ? looks[0] : null;
        if (look) {
            this.selectedLook = look;
            this.nametagVisible = true;
        }
    }

    /*
     * Basic look operations
     *
     * There are three core state variables:
     * - looksOn - whether the user wants their look shown on stage
     * - selectedLook - the currently selected look, which may or may not be on stage. Not null.
     * - currentLook - the look currently on stage. May be null.
     */

    toggleLooksOn(skipTransition=false) {
        this.#looksOn = true;
        SharedUserDefaults.setValueForKey(true, LooksController.#defaultsKeyLooksOn);
        this.setCurrentLook(this.#selectedLook, skipTransition);
    }

    toggleLooksOff(skipTransition=false) {
        this.#looksOn = false;
        SharedUserDefaults.setValueForKey(false, LooksController.#defaultsKeyLooksOn);
        this.setCurrentLook(null, skipTransition);
    }

    getLooksToggle() {
        return this.#looksOn === true && this.selectedLook != null;
    }

    get selectedLook() {
        return this.#sanityCheckPresentationContainsSlide(this.#selectedLook, this.looksPresentation);
    }

    set selectedLook(slide) {
        this.#selectedLook = slide;
        SharedUserDefaults.setValueForKey(slide?.identifier, LooksController.#defaultsKeySelectedLook);

        if (this.getLooksToggle()) {
            this.setCurrentLook(slide);
        }
    }

    /**
     * A single function that both toggles looks on (if needed) and selects
     * the given look.
     * @param {Slide.Modern} slide
     */
    selectLookAndToggleOnBypassingTransition(slide) {
        // We duplicate the logic of our settings because we want to first update state,
        // then update the look that's on stage
        this.#selectedLook = slide;
        SharedUserDefaults.setValueForKey(slide?.identifier, LooksController.#defaultsKeySelectedLook);
        this.didChangeValueForProperty(slide, "selectedLook");

        if (!this.#looksOn) {
            this.#looksOn = true;
            SharedUserDefaults.setValueForKey(true, LooksController.#defaultsKeyLooksOn);
        }

        this.setCurrentLook(slide, true);
    }

    get currentLook() {
        const selectedLook = this.#sanityCheckPresentationContainsSlide(this.#selectedLook, this.looksPresentation);
        const activeLook = this.#stage.slide;

        if (selectedLook === activeLook) {
            // This is the expected "looks on" case
            return selectedLook;
        } else if (activeLook == null) {
            // This is the expected "looks off" case
        } else if (gLocalDeployment === true) {
            // This is an unexpected case
            // The activeLook might be a custom reaction...
            console.error("Current look is not selected look", selectedLook, activeLook);
        }

        return null;
    }

    setCurrentLook(slideOrNull, skipTransition=false) {
        if (this.isAway()) {
            return;
        }

        // Always start with the nametag hidden
        // The UI layer will re-enable it if needed
        if (slideOrNull != null) {
            this.#setNametagVisible(slideOrNull, false, true);
        }

        const apply = () => {
            this.#stage.slide = slideOrNull;
            if (slideOrNull) {
                if (slideOrNull.metadata?.autoTint) {
                    this.#updateAutoTint(slideOrNull);
                }
            } else {
                this.#setStageDefaults();
            }
            this.didChangeValueForProperty(slideOrNull, "currentLook");
        };

        if (skipTransition !== true) {
            this.showLookTransitionOverlay(() => apply());
        } else {
            apply();
        }
    }

    lookWithIdentifier(identifier) {
        return this.looksPresentation?.slideWithIdentifier(identifier);
    }

    async #updateAutoTint(slide) {
        const scheme = slide.metadata?.autoTint.scheme;
        if (!scheme) {
            return;
        }

        const slideId = slide.identifier;

        const results = await this.#autoTintGenerator.generateAutomaticPaints();
        if (results?.length == 3) {
            const [_detected, _selected, palettes] = results;
            const palette = palettes.find(p => p.name == scheme);
            if (palette) {
                // Make sure the slide hasn't changed since we started tinting
                if (this.currentLook?.identifier == slideId) {
                    console.log("Auto-tinting with palette", palette);
                    this.#stage.localPresenter.backgroundPaint = palette.paint;

                    // Force persistence now...that works around an issue where the
                    // thumbnail can be updated after the slide is deselected
                    if (slide.needsPersistence) {
                        slide.performPersistence();
                    }
                }
            } else {
                console.error("Unknown auto-tint palette", scheme);
            }
        } else {
            console.error("Error generating auto-tint colors", results);
        }
    }

    async createLook() {
        this.#setStageDefaults();

        const slide = await this.looksPresentation.createNewSlide(LookWallpapers.blackRoom());

        await this.#addNametagToLook(slide, true);
        return slide;
    }

    async revertLook(slide, sharedObject) {
        console.log("Reverting look", slide.identifier, "to", sharedObject.identifier);

        // Import a new copy of the look after the current one
        const presentation = this.looksPresentation;
        const result = await this.sharing.importSharedSlide(sharedObject.identifier,
            presentation.identifier);
        if (!result.successful) {
            ShowAlertView("Error", "An error occurred while reverting the look.");
            console.error("Error reverting look", result.message);
            return result;
        }

        // Add the newly imported look to the presentation
        this.slideWasImported(presentation, result.results);

        // Delete our current copy
        this.deleteLook(slide);
    }

    async duplicateLook(slide) {
        const slides = await slide.presentation.duplicateSlide(slide);
        return slides?.length > 0 ? slides[0] : null;
    }

    deleteLook(slide) {
        if (slide.presentation != this.looksPresentation) {
            // Just a sanity check
            console.error("Attempting to delete a look from the wrong presentation",
                slide.identifier, slide.presentation.identifier, this.looksPresentation.identifier);
            return;
        }
        if (this.currentLook == slide) {
            this.currentReaction = null;
            this.setCurrentLook(null);
        }
        if (this.selectedLook == slide) {
            this.selectedLook = null;
        }
        slide.presentation.deleteSlide(slide);
    }

    #setStageDefaults() {
        // Make sure we have no slide or media on stage
        this.#stage.slide = null;

        // Reset the presenter to defaults
        this.#stage.localPresenter.resetPresenterSettings();
    }

    pinSlide(slide) {
        this.#setSlidePinned(slide, new Date());
    }

    unpinSlide(slide) {
        this.#setSlidePinned(slide, null);
    }

    /**
     * @param {Slide.Modern} slide
     * @param {Date?} pinValue
     */
    #setSlidePinned(slide, pinValue) {
        let metadata = slide.metadata;
        if (!metadata) {
            metadata = {};
            slide.metadata = metadata;
        }
        metadata.pinned = pinValue;
        slide.setObjectNeedsPersistence(slide);
    }

    /**
     * @param {CloudyRecord} record
     */
    #unpinSlideRecord(record) {
        // This is similar to above, but we want to manipulate a slide record
        // before it's been parsed into a slide and added to the presentation
        const metadata = record.decodeProperty("metadata", Object, null);
        if (metadata != null && metadata.pinned != null) {
            delete metadata.pinned;
            record.encodeProperty("metadata", metadata);
            return true;
        }
        return false;
    }

    /* Basic nametag operations */

    canEnableNametags() {
        const reaction = this.currentReaction;
        return (reaction == null) || reaction.worksWithNametags();
    }

    /**
     * Show or hide the name tag that's part of the current look.
     */
    getNametagToggle() {
        return this.#nametagVisible;
    }

    set nametagVisible(visible) {
        const look = this.currentLook;
        this.#setNametagVisible(look, visible);
    }

    #setNametagVisible(slide, visible, skipTransition=false) {
        this.#nametagVisible = visible;

        if (!slide) {
            return;
        }

        const media = slide.getNametagMedia();
        if (visible && media == null) {
            // If this look doesn't have a name tag, add one
            console.log("Adding nametag to look", slide.identifier);
            this.#addNametagToLook(slide);
        } else if (media && media.backgroundLayer) {
            if (skipTransition) {
                media.backgroundLayer.hidden = !visible;
                media.backgroundLayer.opacity = 1;
            } else {
                this.transitionNametagOpacity(media, visible);
            }
        }

        // Ensure the media is on top of the presenter
        if (media && visible && slide == this.currentLook) {
            const preset = slide.getPreset();
            if (preset?.isShowNametagBehindPresenter()) {
                if (media.zIndex >= this.#stage.localPresenter.foregroundZIndex) {
                    media.zIndex = this.#stage.localPresenter.foregroundZIndex - 1;
                }
            } else {
                if (media.zIndex <= this.#stage.localPresenter.foregroundZIndex) {
                    media.zIndex = this.#stage.localPresenter.foregroundZIndex + 1;
                }
            }
        }

        // Make sure our "camera off" overlay is still on top
        this.#updateCameraOverlayZIndex();
    }

    get nametagVisible() {
        if (this.isAway() || this.currentLook == null) {
            return this.#nametagVisible;
        }

        const media = this.currentLook.getNametagMedia();
        if (media == null || media.backgroundLayer == null) {
            return false;
        }
        return media.backgroundLayer.hidden != true;
    }

    transitionNametagOpacity(media, visible) {
        const duration = 300;
        const steps = 25;
        const stepTime = duration / steps;
        let increment = 1 / steps;
        if (!visible) {
            increment = -increment;
        }
        let start = visible ? 0 : 1;
        let end = visible ? 1 : 0;
        let current = start;

        if (this.nametagTransitionInterval != null) {
            window.clearInterval(this.nametagTransitionInterval);
            this.nametagTransitionInterval = null;
        }

        const layer = media.backgroundLayer;
        layer.opacity = start;
        if (visible) {
            layer.hidden = false;
        }

        const interval = window.setInterval(_ => {
            current = current + increment;
            layer.opacity = this.easeOutQuad(current);

            if ((!visible && current <= end) || (visible && current >= end)) {
                if (!visible) {
                    layer.hidden = true;
                }
                window.clearInterval(interval);
                if (this.nametagTransitionInterval == interval) {
                    this.nametagTransitionInterval = null;
                }
            }
        }, stepTime);
        this.nametagTransitionInterval = interval;
    }

    async #addNametagToLook(look, hidden=false, tint=null, style=null) {
        const preset = look.getPreset();
        style = style ?? Media.NameBadge.Styles.Simple;

        const media = new Media.NameBadge();
        media.zIndex = Slide.Modern.DefaultPresenterZIndices.Foreground + 1;

        const variant = style.defaultVariant != null ? style.defaultVariant : 0;
        media.applyStyle(style, variant);

        // Populate the name tags string values, but mark them as templates
        // so that they'll be replaced the first time they're used
        media.template = true;
        media.titleLabel.string = this.#stage.localPresenter.screenName || LocalizedString("Name");
        media.subtitleLabel.string = LocalizedString("Title");

        if (media.backgroundLayer && hidden === true) {
            media.backgroundLayer.hidden = hidden;
        }

        if (preset?.isNametagColorizable()) {
            const paint = tint ?? look.getColorizationColor(this.#stage.localPresenter);
            if (paint) {
                preset.colorizeNametag(paint, media);
            }
        }

        await look.addObjects([media], null, null, false);

        return media;
    }

    #refreshNametag() {
        // Force a refresh of the nametag to ensure that we redraw text once fonts have loaded
        const nametag = this.currentLook?.getNametagMedia();
        nametag?.fontsLoaded();

        // Refresh name tags in use in away screens
        const presentation = this.reactionsPresentation;
        const slides = presentation.activeSlides;
        const awayScreens = slides.filter((slide) => LooksUtils.isAwayScreenReaction(slide));
        awayScreens.forEach((slide) => {
            const nametag = slide.objects.find((obj) => IsKindOf(obj, Media.NameBadge));
            nametag?.fontsLoaded();
        });
    }

    /**
     * Find all Media.NameBadge items on any of the user's looks and return those that aren't
     * based on a built-in style.
     * @returns {[Media.NameBadge]} an array of custom nametag styles
     */
    listCustomNametagStyles() {
        const builtinStyleIds = Object.values(Media.NameBadge.Styles).map((style) => style.id);

        const customNametags = [];

        const slides = this.looksPresentation.activeSlides;
        slides.forEach((slide) => {
            const media = slide.getNametagMedia();
            if (media?.style.id && builtinStyleIds.includes(media.style.id) == false) {
                customNametags.push(media);
                if (!media.name) {
                    media.name = slide.title;
                }
            }
        });

        // De-dupe on the styleId
        const withoutDuplicates = [];
        customNametags.forEach((media) => {
            if (!withoutDuplicates.some((m) => m.style.id == media.style.id)) {
                withoutDuplicates.push(media);
            }
        });

        return withoutDuplicates;
    }

    /* Basic reaction operations */

    get currentReaction() {
        return this.#sanityCheckPresentationContainsSlide(this.#currentReaction, this.reactionsPresentation);
    }

    set currentReaction(slideOrNull) {
        const previous = this.#currentReaction;
        if (previous == slideOrNull) {
            return;
        }

        if (this.isAway()) {
            return;
        }

        this.#setCurrentReaction(slideOrNull);
    }

    #setCurrentReaction(slideOrNull) {
        const previous = this.#currentReaction;
        this.#currentReaction = slideOrNull;

        if (previous) {
            if (this.#stage.slide == previous) {
                // Special case, we put a full reaction slide on stage
                // Remove it by putting the saved look back on stage
                this.setCurrentLook(this.#savedLook, true);
            } else {
                // Unwire persistence
                previous.objects.forEach(obj => {
                    obj.delegate = null;
                });

                // Do this after unwiring persistence; we don't want to send
                // these z-index changes to the server
                this.#removeReactionMediaFromStage(previous);
            }
        }

        if (slideOrNull) {
            this.#addReactionMediaToStage(slideOrNull);

            // Ensure that changes to the reaction persist
            slideOrNull.objects.forEach(obj => {
                obj.delegate = slideOrNull;
            });
        }

    }

    #isCustomReactionLayout(style) {
        return style == LooksReactionLayout.SlideMedia || style == LooksReactionLayout.SlideAndPresenter;
    }

    reactionWithIdentifier(identifier) {
        return this.reactionsPresentation.slideWithIdentifier(identifier);
    }

    async createReaction(media, style=null, position=null, scale=null) {
        if (Object.values(LooksReactionLayout).includes(style) == false) {
            style = LooksReactionLayout.FullScreen;
        }
        if (style == LooksReactionLayout.FullScreen) {
            position = Stage.Object.Anchor.Center;
            scale = 1.0;
        } else {
            if (Object.values(Stage.Object.Anchor).includes(position) == false) {
                position = Stage.Object.Anchor.TopRight;
            }
            if (scale == null || scale < 0.1 || scale > 1.0) {
                scale = 0.4;
            }
        }

        const presentation = this.reactionsPresentation;

        media.anchor = position;
        media.scale = scale;
        media.zIndex = Slide.Modern.DefaultPresenterZIndices.Foreground + 1;

        if (this.#isTextReactionMedia(media)) {
            if (style == LooksReactionLayout.FullScreen) {
                TextReaction.resizeToFullScreen(media, this.#stage.size);
            } else {
                TextReaction.resizeToInset(media);
            }
        }

        const metadata = {
            type: LooksContentType.Reaction,
            style,
        };
        const slide = presentation.newSlideObjectWithMetadata(null, null, metadata, media.title);
        slide.addObjectWithoutPersisting(media);
        presentation.addSlideObject(slide);
        this.#persistNewReaction(slide);
        return slide;
    }

    #persistNewReaction(slide) {
        // We're triggering persistence, but not waiting for it to complete
        // TODO I'd like to get this into a single persistence batch,
        // with the slide, presenter and media all in one request.
        slide.setObjectNeedsPersistence(slide);
        slide.setObjectNeedsPersistence(slide.presenter);
        slide.performPersistence().then(() => {
            const media = slide.objects;
            media.forEach(obj => {
                slide.mediaNeedsPersistence(obj).catch((err) => {
                    // TODO If persistence fails, should we remove this slide from the presentation
                    // and notify the user? We're basically moving from a pessimistic to optimistic model
                    console.error("Error adding media to reaction slide", err);
                });
            });
        }).catch((err) => {
            console.error("Error creating reaction slide", err);
        });
        return slide;
    }

    // Used for drag-and-drop operations
    async createReactionFromDataTransfer(dataTransfer) {
        const media = await this.createMediaFromDataTransfer(dataTransfer);
        if (media != null) {
            return this.createReaction(media);
        }
        return null;
    }

    async createReactionFromClipboardData() {
        const items = await navigator.clipboard.read();

        // Turn the list of items into a list of tasks converting them to blobs
        const tasks = items.map((item) => {
            const types = item.types;
            const supportedType = types.find(type => Media.Files.isSupportedTypeOrExtension(type));
            if (supportedType) {
                return item.getType(supportedType);
            }
        }).filter((tasks) => tasks != null);

        // Wait for the tasks to complete
        const blobs = (await Promise.all(tasks)).filter((blob) => blob != null);

        // Turn the first blob into media and create a reaction from it
        if (blobs.length > 0) {
            const media = await Media.Files.createWithFile(blobs[0]);
            if (media) {
                return this.createReaction(media);
            }
        }
    }

    async duplicateReaction(slide) {
        const slides = await slide.presentation.duplicateSlide(slide);
        return slides?.length > 0 ? slides[0] : null;
    }

    async revertReaction(slide, sharedObject) {
        console.log("Reverting reaction", slide.identifier, "to", sharedObject.identifier);

        // Import a new copy of the reaction after the current one
        const presentation = this.reactionsPresentation;
        const result = await this.sharing.importSharedSlide(sharedObject.identifier,
            presentation.identifier);
        if (!result.successful) {
            ShowAlertView("Error", "An error occurred while reverting the visual.");
            console.error("Error reverting reaction", result.message);
            return result;
        }

        // Add the newly imported reaction to the presentation
        this.slideWasImported(presentation, result.results);

        // Delete our current copy
        this.deleteReaction(slide);
    }

    deleteReaction(slide) {
        if (this.#sanityCheckPresentationContainsSlide(slide, this.reactionsPresentation) == null) {
            return;
        }
        if (this.currentReaction == slide) {
            this.currentReaction = null;
        }
        const awayScreen = this.getSelectedAwayScreen();
        if (awayScreen == slide) {
            SharedUserDefaults.setValueForKey(null, LooksController.#defaultsKeyAwayScreen);
        }
        slide.presentation.deleteSlide(slide);
    }

    deleteCurrentReaction() {
        const slide = this.currentReaction;
        if (slide) {
            this.deleteReaction(slide);
        }
    }

    /* General media operations */

    async createMediaFromDataTransfer(dataTransfer) {
        // See if there are files to be added
        let files = await Media.Files.filesFromDataTransfer(dataTransfer);
        files = files.filter((file) => Media.Files.isImageOrVideoFile(file));
        if (files.length > 0) {
            return Media.Files.createWithFile(files[0]);
        }
        return null;
    }

    /* Stage media manipulation */

    /**
     * Add media from a given slide to the stage without selecting the slide.
     * We use this to add name badge and/or reaction media to the stage while
     * a look slide is selected.
     */
    #addReactionMediaToStage(slide) {
        // This would be easy but for media z ordering
        // The z-index of media on the reaction slide is relative to that slide,
        // not the currently selected look slide, so we need to recalculate the
        // z-index relative to the presenter
        // Luckily, reaction media always goes on top of everything else, so
        // we don't need to fully recalculate the z-index
        const zIndexes = this.#stage.objects.map((object) => object.zIndex || 0);
        const top = Math.max(...zIndexes);

        const currentSlide = this.#stage.slide;

        const style = slide.layout;
        const away = this.isAway();

        // Put a layer of opacity behind the reaction media if needed
        if (away || style == LooksReactionLayout.FullScreen) {
            this.#addReactionOverlay(top + 1);
        } else if (style == LooksReactionLayout.SlideAndPresenter) {
            // We use this slide in its entirety,
            // saving the current look so we can restore it later
            if (currentSlide == null || this.looksPresentation.containsSlide(currentSlide)) {
                this.#savedLook = currentSlide;
                this.setCurrentLook(null, true);
            }
            // this.#selectedLook = slide; // TODO is this bad?
            this.#stage.slide = slide;
            return;
        }

        const toAdd = slide.objects;
        toAdd.forEach((media) => {
            // Keep the media ordering constant relative to other media,
            // and shift it above the look presenter foreground.
            // Save the original z index so we don't increase it every time
            // the name badge is used.
            if (!media.originalZIndex) {
                media.originalZIndex = media.zIndex;
            }
            media.zIndex = top + media.originalZIndex + 2;

            this.#stage.displayMedia(media);
        });

        // Update the on-stage controls for this reaction
        this.#updateReactionControlOverlay(slide, style);

        // Make sure our "camera off" overlay is still on top...
        this.#updateCameraOverlayZIndex();
    }

    #updateReactionControlOverlay(slide, style) {
        // For "normal" reactions (full screen or over-the-shoulder),
        // we show on-stage controls to allow the user to change layouts
        if (!slide) {
            this.#reactionControlsOverlay?.hide();
        } else if (!this.isCameraEnabled()) {
            // The use has their camera off, so we're showing an away screen
            this.#reactionControlsOverlay?.hide();
        } else if (slide.objects.length != 1) {
            this.#reactionControlsOverlay?.hide();
        } else if (style != LooksReactionLayout.FullScreen && style != LooksReactionLayout.OverTheShoulder) {
            this.#reactionControlsOverlay?.hide();
        } else {
            this.#reactionControlsOverlay?.setLayout(style);
            this.#reactionControlsOverlay?.show();
        }
    }

    updateReactionStyle(slide, style) {
        let metadata = slide.metadata;
        if (!metadata) {
            metadata = {};
            slide.metadata = metadata;
        }

        const previousStyle = metadata.style;
        if (previousStyle == style) {
            return;
        }
        metadata.style = style;
        const media = slide.objects[0];

        // TODO Don't allow OTS or FS for reactions with > 1 media...

        const isCurrentReaction = this.currentReaction == slide;
        const isCustomReaction = slide.isCustomReaction();
        const isCustomLayout = this.#isCustomReactionLayout(style);
        const wasCustomLayout = this.#isCustomReactionLayout(previousStyle);
        const isTextReaction = this.#isTextReaction(slide);

        // Save the previous settings so we can restore them later
        // This could be wrong if you then go edit the slide in full mode...?
        if (isCustomReaction && !isCustomLayout && (previousStyle == null || !wasCustomLayout)) {
            metadata.originalFullscreen = media.fullscreen;
            metadata.originalAnchor = media.anchor;
            metadata.originalScale = media.scale;
        }

        if (style == LooksReactionLayout.FullScreen) {
            media.fullscreen = true;
            media.anchor = Stage.Object.Anchor.Center;
            if (isTextReaction) {
                // Resize the text reaction to be larger in full screen
                TextReaction.resizeToFullScreen(media, this.#stage.size);
            }
        } else if (style == LooksReactionLayout.OverTheShoulder) {
            media.fullscreen = false;
            media.anchor = Stage.Object.Anchor.TopRight;
            if (isTextReaction) {
                // Resize the text reaction to be smaller in OTS
                TextReaction.resizeToInset(media);
            } else {
                if (media.scale > 0.8) {
                    media.scale = 0.4;
                }
            }
        } else if (isCustomLayout) {
            // TODO we could simplify this by not allowing custom reactions
            // to use the built-in layouts...

            // Restore settings we may have previously modified
            if (metadata.originalFullscreen) {
                media.fullscreen = metadata.originalFullscreen;
            }
            if (metadata.originalAnchor) {
                media.anchor = metadata.originalAnchor;
            }
            if (metadata.originalScale) {
                media.scale = metadata.originalScale;
            }
        } else {
            console.error("Unknown reaction style", style);
            return;
        }

        if (isCurrentReaction) {
            // Toggle the reaction on and off to update the style
            this.currentReaction = null;
            this.currentReaction = slide;
        }

        // We've made changes that need to be saved
        this.mediaNeedsPersistence(slide, media);
        slide.setObjectNeedsPersistence(slide);
    }

    #isTextReaction(slide) {
        return slide?.objects.length === 1 && this.#isTextReactionMedia(slide.objects[0]);
    }

    #isTextReactionMedia(media) {
        return IsKindOf(media, Media.Text);
    }

    mediaNeedsPersistence(slide, media) {
        if (media.delegate) {
            media.setNeedsPersistence();
        } else {
            slide.mediaNeedsPersistence(media);
        }
    }

    #addReactionOverlay(zIndex) {
        if (!this.#reactionOverlayLayer) {
            this.#createReactionOverlay();
        }
        this.#reactionOverlayLayer.zIndex = zIndex;
        const opacity = this.isAway() ? 1.0 : 0.9;
        this.#reactionOverlayLayer.filters[0].color = [0, 0, 0, opacity];
        this.#stage.foregroundLayer.addSublayer(this.#reactionOverlayLayer);
    }

    #removeReactionOverlay() {
        if (this.#reactionOverlayLayer) {
            this.#stage.foregroundLayer.removeSublayer(this.#reactionOverlayLayer);
        }
    }

    #createReactionOverlay() {
        const layer = new RenderLayer();
        layer.filter = new SolidColorFilter([0, 0, 0, 0.9]);
        layer.userInteractionEnabled = false;

        const stageSize = this.#stage.size;
        layer.size = stageSize;
        layer.position = PointMake(stageSize.width / 2, stageSize.height / 2);

        this.#reactionOverlayLayer = layer;
    }

    #removeReactionMediaFromStage(slide) {
        this.#removeReactionOverlay();
        this.#reactionControlsOverlay?.hide();
        this.#removeMediaFromStage(slide);
    }

    #removeMediaFromStage(slide) {
        const toRemove = slide.objects;
        const mediaOnStage = new Set(this.#stage.media.map((media) => media.identifier));

        toRemove.forEach((media) => {
            if (media.originalZIndex != null) {
                media.zIndex = media.originalZIndex;
                delete media.originalZIndex;
            }
            if (mediaOnStage.has(media.identifier)) {
                this.#stage.removeMedia(media);
            }
        });
    }

    // =========================================================================
    // Temporary Reactions (Speech-triggered)
    // =========================================================================

    #temporaryReactionMedia = null;
    #temporaryReactionTimeout = null;

    /**
     * Display a temporary reaction that auto-hides after a duration.
     * Does not persist the reaction or interrupt user-triggered reactions.
     * @param {Media} media - The media to display (emoji, text, etc.)
     * @param {number} durationMs - Duration to display in milliseconds (default: 3000)
     * @returns {Promise<void>}
     */
    async displayTemporaryReaction(media, durationMs = 3000) {
        // Don't interrupt user-triggered reactions
        if (this.#currentReaction) {
            console.log("Skipping temporary reaction - user reaction is active");
            return;
        }

        // Don't show during away mode
        if (this.isAway()) {
            return;
        }

        // Clear any existing temporary reaction
        this.hideTemporaryReaction();

        // Configure the media for over-the-shoulder display
        media.anchor = Stage.Object.Anchor.TopRight;
        media.scale = media.scale || 0.4;
        media.zIndex = Slide.Modern.DefaultPresenterZIndices.Foreground + 100;

        // Resize text reactions appropriately
        if (this.#isTextReactionMedia(media)) {
            TextReaction.resizeToInset(media);
        }

        // Calculate z-index to be on top
        const zIndexes = this.#stage.objects.map((object) => object.zIndex || 0);
        const top = Math.max(...zIndexes, 0);
        media.zIndex = top + 10;

        // Store reference for cleanup
        this.#temporaryReactionMedia = media;

        // Display on stage
        this.#stage.displayMedia(media);

        // Set auto-hide timeout
        this.#temporaryReactionTimeout = setTimeout(() => {
            this.hideTemporaryReaction();
        }, durationMs);
    }

    /**
     * Hide the current temporary reaction
     */
    hideTemporaryReaction() {
        if (this.#temporaryReactionTimeout) {
            clearTimeout(this.#temporaryReactionTimeout);
            this.#temporaryReactionTimeout = null;
        }

        if (this.#temporaryReactionMedia) {
            this.#stage.removeMedia(this.#temporaryReactionMedia);
            this.#temporaryReactionMedia = null;
        }
    }

    /**
     * Check if a temporary reaction is currently displayed
     * @returns {boolean}
     */
    get hasTemporaryReaction() {
        return this.#temporaryReactionMedia != null;
    }

    /* Data stuff */

    get isAuthenticated() {
        const endpoint = mmhmmAPI.defaultEndpoint();
        return endpoint.isAuthenticated === true;
    }

    async #setupUnauthenticatedUse() {
        await this.#dataStore.initialRefreshPromise;

        this.#unauthenticatedLooksPresentation = new Presentation.AccountLessLooks();
        this.#unauthenticatedReactionsPresentation = new Presentation.AccountLess();

        this.#dataStore.presentations = [
            this.#unauthenticatedLooksPresentation,
            this.#unauthenticatedReactionsPresentation
        ];
    }

    async ensureContentLoaded() {
        const start = Date.now();

        await this.#createPresentationsIfNeeded();

        const presentations = [
            this.looksPresentation,
            this.reactionsPresentation
        ];

        // Wait for our presentations' contents to be loaded
        const promises = presentations.map((p) =>
            p.loaded ? Promise.resolve() : p.reload()
        );
        await Promise.allSettled(promises);

        this.#populateAwayScreensIfNeeded();

        // Preload assets for our looks and visuals
        // so that they'll render faster when selected
        if (this.primedCache !== true) {
            this.precacheSlideAssets(presentations);
            this.primedCache = true;
        }

        const elapsed = Date.now() - start;
        console.debug("Loaded Airtime Camera content in", elapsed, "ms");
    }

    async precacheSlideAssets(presentations) {
        console.log("Precaching assets for looks and visuals");
        const start = Date.now();

        // Precache the assets for all of the slides in our presentations
        // in small batches so that we don't overload Chrome with too many
        // image decode operations
        // See https://github.com/All-Turtles/mmhmm-web/issues/5140
        for (let i  = 0; i < presentations.length; i++) {
            const presentation = presentations[i];
            const slides = presentation.activeSlides;

            const chunkSize = 10;
            for (let j = 0; j < slides.length; j += chunkSize) {
                const chunk = slides.slice(j, j + chunkSize);
                await Promise.allSettled(chunk.map((slide) => slide.loadAssetsIntoCache()));
            }
        }

        const elapsed = Date.now() - start;
        console.debug("Precaching of assets complete in", elapsed, "ms");
    }

    async #createPresentationsIfNeeded() {
        // Wait until we've loaded our cached list of presentations
        // If the presentations already exist, we're all set
        await this.#dataStore.cacheLoadPromise;
        if (this.looksPresentation && this.reactionsPresentation) {
            return;
        }

        // Make sure we've reloaded the user's presentations list from the service,
        // then create the presentations if they still don't exist
        const dataStore = this.#dataStore;
        await dataStore.initialRefreshPromise;

        // First create all of the presentations if needed
        const populateLooks = await this.#createPresentationIfNeeded(
            this.looksPresentation,
            Presentation.Typed.Type.Looks,
            LooksController.#looksPresentationName
        );
        const populateReactions = await this.#createPresentationIfNeeded(
            this.reactionsPresentation,
            Presentation.Typed.Type.Reactions,
            LooksController.#reactionsPresentationName
        );

        this.createdLooksPresentation = populateLooks;

        if (!populateLooks && !populateReactions) {
            return;
        }

        // See if the user had a look shared with them as part of their account creation flow
        const sharing = this.sharing;
        await sharing.loadUser();
        const sharedObjectId = sharing.newUserSharedObjectId;
        let sharedObject = null;
        if (sharedObjectId) {
            const result = await sharing.getExportedObjectMetadata(sharedObjectId);
            if (result.successful) {
                sharedObject = new SharedObject(result.results, sharing);
            } else {
                console.error("Failed to load new user shared object", result.message);
            }
        }

        // Then populate them with default content
        if (populateLooks) {
            await this.#populateDefaultLooks(sharing, sharedObject);
        }

        if (populateReactions) {
            const preferred = this.preferredBuiltinReactions;
            const newUserShare = sharedObject?.type == LooksContentType.Reaction ? sharedObject : null;
            await this.#populateDefaultReactions(
                sharing,
                this.reactionsPresentation,
                preferred,
                newUserShare,
                preferred.length
            );
            this.populateAwayScreens();
        }
    }

    get preferredBuiltinReactions() {
        return [
            "1aa72025-0e7a-41d9-acb9-bc1d68c978ea", // Cookie Monster Hello GIPHY
            "04100d03-6e30-4abd-9f25-cee80eb7cd2a", // Simpson's Chef's kiss
        ];
    }

    /**
     * Create a new presentation if it doesn't already exist.
     * @param {?Presentation.Modern} presentation
     * @param {Presentation.Typed.Type} type
     * @param {string} title
     * @returns {boolean} true if the presentation was created
     */
    async #createPresentationIfNeeded(presentation, type, title) {
        if (!presentation) {
            console.log("Creating presentation", type);
            presentation = await this.#dataStore.createNewPresentation(title, type);
            return true;
        }
        return false;
    }

    async populateDefaultLooks() {
        const sharing = this.sharing;
        this.#populateDefaultLooks(sharing, null);
    }

    async #populateDefaultLooks(sharing, sharedObject) {
        // If the user has a new user look either via sharing or the look builder,
        // we start with that. If not, we start with the Tinted preset.

        // See if the user created a look in the look builder or had a look shared with them
        // as part of creating their account
        const demoLookId = sharing.demoLookId;
        const newUserShare = sharedObject?.type == LooksContentType.Look ? sharedObject : null;

        // If there's a new user share, it's our job to import it
        const presentation = this.looksPresentation;
        if (newUserShare) {
            const result = await sharing.importSharedSlide(newUserShare.identifier, presentation.identifier);
            if (!result.successful) {
                console.error("Error importing new user shared look", result);
            } else {
                this.slideWasImported(presentation, result.results);
                return;
            }
        }

        // If there's a demo look, it will be imported when the LooksSidebarPane initializes,
        // since we do that on every launch, not just the first launch
        if (demoLookId) {
            return;
        }

        // No new user share, no demo look, so populate with a preset look
        const preset = LookPreset.Tinted.Preset;
        const variants = preset.getVariants();
        const variant = variants ? variants[Math.floor(Math.random() * variants.length)] : null;
        await this.createLookFromPreset(preset, variant);
    }

    async #getDefaultReactionsToImport(sharing, preferredBuiltins, newUserShare, targetCount) {
        // Builtin content includes content shared via the user's team user
        const type = LooksContentType.Reaction;
        const builtinResult = await sharing.listBuiltinContent(type);
        const groupResult = await sharing.listGroupContent(type);
        if (!builtinResult.successful || !groupResult.successful) {
            console.error("Error populating default reactions", builtinResult, groupResult);
            return;
        }

        // The builtin list may include records that we have tagged as being for specific
        // email domains. This is a temporary way to preload content into user's accounts
        // for them. Filter thouse out into a separate list.
        let builtinRecords = builtinResult.results;
        const taggedRecords = builtinRecords.filter((r) => r.tags != null && r.tags.startsWith("@"));
        builtinRecords = builtinRecords.filter((r) => r.tags == null || !r.tags.startsWith("@"));

        // Combine those tagged records with any records published to the user's group
        const groupRecords = [
            ...taggedRecords,
            ...groupResult.results
        ];

        // Prioritize up to 2 items that are specially for this user
        // either via our "tags" mechanism or because they're actually in a group
        let toImport = groupRecords.slice(0, 2);

        // If we have a new user share, add it to the front of the list
        if (newUserShare) {
            toImport.unshift(newUserShare);
        }

        // Add the desired number of additional items from the builtin list
        targetCount = targetCount + toImport.length;

        // Fill in with a ranked list of built-in content
        preferredBuiltins.forEach((id) => {
            const record = builtinRecords.find((r) => r.identifier == id);
            if (record) {
                toImport.push(record);
            }
        });

        // Reverse the list - the last item we import will show up at the top of the user's list
        return toImport.slice(0, targetCount).reverse();
    }

    populateDefaultReactions() {
        const toImport = this.preferredBuiltinReactions;
        this.#populateDefaultReactions(
            this.sharing,
            this.reactionsPresentation,
            toImport,
            null,
            toImport.length
        );
    }

    /**
     * Populate a presentation with built-in content.
     * @param {LooksSharing} sharing
     * @param {Presentation.Modern} presentation
     */
    async #populateDefaultReactions(sharing, presentation, preferredBuiltins, newUserShare, targetCount) {

        // The sequential catalog import process is slow, creating a bad first
        // launch experience. Where possible, we'd like to locally create the
        // content instead.

        // Figure out what we need to import from the catalog and do that first
        // We do this sequentially because it's not clearly safe to make concurrent imports
        // to the same presentation
        const toImport = await this.#getDefaultReactionsToImport(sharing, preferredBuiltins, newUserShare, targetCount);
        for (let i = 0; i < toImport.length; i++) {
            const record = toImport[i];
            const result = await sharing.importSharedSlide(
                record.identifier,
                presentation.identifier
            );
            if (!result.successful) {
                console.error("Error importing built-in reactions", result);
            } else {
                this.slideWasImported(presentation, result.results);
            }
        }

        // Now locally create default content that we don't need to go to the catalog for

        const stickers = [
            {
                title: LocalizedString("Thumbs up"),
                url: "assets/looks/reactions/thumbs-up.png",
            },
            {
                title: LocalizedString("Thumbs down"),
                url: "assets/looks/reactions/thumbs-down.png",
            },
            {
                title: LocalizedString("Heart"),
                url: "assets/looks/reactions/heart.png",
            },
            {
                title: LocalizedString("Raised hand"),
                url: "assets/looks/reactions/wave.png",
            },
        ];

        for (let i = 0; i < stickers.length; i++) {
            const sticker = stickers[i];
            const media = LooksUtils.createImageMediaFromURL(sticker.url);
            media.title = sticker.title;
            media.metadata.anchorInset = 0;
            await this.createReaction(media, LooksReactionLayout.OverTheShoulder, Stage.Object.Anchor.TopRight, 0.7);
        }

        // Emoji - laughing face
        const emoji = TextReaction.CreateEmoji("😂");
        emoji.title = LocalizedString("Laughing");
        await this.createReaction(emoji, LooksReactionLayout.OverTheShoulder, Stage.Object.Anchor.TopRight, emoji.scale);

        // Speech bubble - hello
        const bubble = TextReaction.createMediaForTextReaction("classic-thought", LocalizedString("Hello!"), Stage.Object.Anchor.TopRight);
        await this.createReaction(bubble, LooksReactionLayout.OverTheShoulder, Stage.Object.Anchor.TopRight, bubble.scale);
    }

    /**
     * Called when a slide has been imported from the service. Adds the slide into
     * the presentation, making it available to the user.
     * @param {Presentation.Modern} presentation The presentation the slide was imported into
     * @param {CloudyRecord[]} records The records that were imported on the service
     */
    slideWasImported(presentation, records) {
        // We need to separate the slide from the other records that were imported,
        // which includes the slide's media records and potentially a custom room record
        const slideRecord = records.find((r) => r.collection == mmhmmAPI.CloudyCollectionTypes.ModernSlide);
        if (!slideRecord) {
            console.error("Did not file slide in imported records");
            return null;
        }
        slideRecord.children = records.filter((r) => r.parentId == slideRecord.id);

        // If the slide was pinned before being published, unpin it
        // We do this before parsing the record because we want it done
        // before the slide is added to the presentation and the UI list updated...
        // It'd be preferable for the UI to update when the pin state changes,
        // but it wasn't designed that way...
        const wasPinned = this.#unpinSlideRecord(slideRecord);

        // This will decode the slide and add it to the presentation
        console.log("Adding imported slide to presentation", slideRecord.id, presentation.identifier);
        const slide = presentation.decodeSlideFromRecord(slideRecord, true);

        // If we unpinned, we need to persist the change...
        if (slide && wasPinned) {
            slide.setObjectNeedsPersistence(slide);
        }

        // Try to make the assets available to the user right away
        slide?.loadAssetsIntoCache();

        return slide;
    }

    #populateAwayScreensIfNeeded() {
        // We don't need to create the user's reactions presentation,
        // but we want to do a one-time addition of away screens they
        // don't already have as part of launching the away screens feature
        const hasAddedAwayScreens =
            SharedUserDefaults.getValueForKey(LooksController.#defaultsKeyAwayScreensAdded, false);
        if (hasAddedAwayScreens !== true) {
            this.populateAwayScreens(true);
        }
    }

    populateAwayScreens(checkForExisting=false) {
        console.log("Creating away screens");
        SharedUserDefaults.setValueForKey(true, LooksController.#defaultsKeyAwayScreensAdded);

        const stage = this.#stage;
        const presentation = this.reactionsPresentation;
        const slides = AwayScreens.create(stage, presentation);
        slides.forEach((slide) => {
            if (!checkForExisting || !this.#hasAwayScreen(slide)) {
                presentation.addSlideObject(slide);
                this.#persistNewReaction(slide);
            }
        });

        const selected = SharedUserDefaults.getValueForKey(LooksController.#defaultsKeyAwayScreen);
        if (!selected) {
            // Set spotlight as the default away screen
            const slide = slides.find((s) => s.metadata.catalogAwayScreenId == AwayScreens.catalogIds.Spotlight);
            if (slide) {
                SharedUserDefaults.setValueForKey(slide.identifier, LooksController.#defaultsKeyAwayScreen);
            }
        }
    }

    #hasAwayScreen(slide) {
        // See if we have an existing "legacy" away screen from the catalog
        // that matches one of our new built-in away screens that we'd like to add
        const catalogId = slide.metadata?.catalogAwayScreenId;
        if (catalogId) {
            const reactions = this.reactionsPresentation.activeSlides;
            return reactions.some((reaction) => {
                return (reaction.exportDocumentId == catalogId) ||
                    (reaction.metadata?.catalogAwayScreenId == catalogId);
            });
        }
        return false;
    }

    async importDemoLook(demoLookId) {
        const endpoint = mmhmmAPI.defaultEndpoint();
        const demoLookData = await endpoint.getDemoLook(demoLookId).catch((err) => {
            console.error("Error getting demo look data", err);
        });
        if (!demoLookData) {
            return null;
        }

        const configData = await endpoint.getDemoLookJSON(demoLookData.configUrl).catch((err) => {
            console.error("Error getting demo look config data", err);
        });
        if (!configData) {
            return null;
        }

        const presenter = this.#stage.localPresenter;

        // Handle the selected wallpaper
        let wallpaper = null;
        if (configData.wallpaper.custom == true) {
            const blob = await endpoint.getDemoLookBlob(demoLookData.wallpaperUrl).catch((err) => {
                console.error("Error getting demo look wallpaper blob", err);
            });
            if (blob) {
                try {
                    const asset = new LocalAsset({blob});
                    const fingerprint = FingerprintForBlob(blob);
                    asset.fingerprint = fingerprint;
                    const media = new Media.Image(createUUID(), presenter.identifier, asset);
                    wallpaper = await this.controller.createNewRoomFromLocalAsset(media)
                } catch (err) {
                    console.error("Error importing demo look wallpaper", err);
                }
            }
        } else {
            wallpaper = this.#roomsStore.roomWithIdentifier(configData.wallpaper?.id);
        }

        const presentation = this.looksPresentation;
        const look = await presentation.createNewSlide(wallpaper);
        await this.#addNametagToLook(look, true);

        // It'd be nice to do this all off-stage, but that's a little more work
        // when manipulating presenter settings
        this.setCurrentLook(look, true);

        presenter.backgroundStyle = configData.backgroundStyle;
        presenter.shape = configData.shape;
        presenter.scale = configData.scale;
        presenter.backgroundPaint = Paint.FromJSON(configData.backgroundPaint);
        presenter.foregroundZIndex = Slide.Modern.DefaultPresenterZIndices.Foreground;

        // Set the brand
        if (configData.brand) {
            look.rawBrandData = await this.getBrandDataForDomain(configData.brand);
            look.title = look.brandName;
        }
        // Set the preset
        if (configData.presetId) {
            look.setPresetId(configData.presetId);
            if (!look.title) {
                look.title = look.getPresetName();
            }
        }
        // If the look uses explicit color schemes, set the selected scheme
        if (configData.colorScheme) {
            look.setColorOption(configData.colorScheme);
        }
        if (!look.title) {
            look.title = LocalizedString("New look");
        }

        const objects = [];

        // TODO refactor stuff so that importing the demo uses the same
        // layer maniuplation code as the look editor

        const preset = look.getPreset();

        if (configData.pattern) {
            const url = configData.pattern.url;
            // TODO handle custom patterns
            const pattern = LooksUtils.createImageMediaFromURL(url, LooksMediaType.Pattern);
            pattern.scale = 1.0;
            pattern.anchor = Stage.Object.Anchor.None;
            pattern.center = LooksUtils.stageCenterPoint(this.#stage);
            pattern.opacity = configData.pattern.opacity;
            pattern.zIndex = LooksUtils.defaultZIndexForLayer(LooksMediaType.Pattern);
            const patternObject = look.getPatternForMedia(pattern);
            if (patternObject?.isColorizable) {
                LooksUtils.updateColorScheme(look.getColorizationColor(presenter), pattern, preset?.getColorizationCallback());
            }
            objects.push(pattern);
        }

        if (configData.overlay) {
            const url = configData.overlay.url;
            let overlay = null;
            if (url) {
                overlay = LooksUtils.createImageMediaFromURL(url, LooksMediaType.Overlay);
            } else {
                const blob = await endpoint.getDemoLookBlob(demoLookData.frameUrl).catch((err) => {
                    console.error("Error getting demo look overlay blob", err);
                });
                if (blob) {
                    overlay = LooksUtils.createImageMediaFromBlob(blob, LooksMediaType.Overlay);
                }
            }
            if (overlay) {
                overlay.scale = 1.0;
                overlay.anchor = Stage.Object.Anchor.None;
                overlay.center = LooksUtils.stageCenterPoint(this.#stage);
                overlay.opacity = configData.overlay.opacity;
                overlay.zIndex = LooksUtils.defaultZIndexForLayer(LooksMediaType.Overlay);
                const overlayObject = look.getOverlayForMedia(overlay);
                if (overlayObject?.isColorizable) {
                    LooksUtils.updateColorScheme(look.getColorizationColor(presenter), overlay, preset?.getColorizationCallback());
                }
                objects.push(overlay);
            }
        }

        if (configData.logo) {
            const url = configData.logo.url;
            let logo = null;
            if (url) {
                // Don't import the logo layer if it's really meant to be a visual
                const presetLogos = preset?.logoOptions ?? [];
                const isPresetLogo = presetLogos.some((logo) => logo.url == url);
                if (!isPresetLogo || !preset.importLogosAsVisuals) {
                    logo = LooksUtils.createImageMediaFromURL(url, LooksMediaType.Logo);
                }
            } else {
                const blob = await endpoint.getDemoLookBlob(demoLookData.logoUrl).catch((err) => {
                    console.error("Error getting demo look logo blob", err);
                });
                if (blob) {
                    const mimeType = configData.logo.mimeType;
                    if (mimeType && mimeType.toLowerCase() == "image/gif") {
                        logo = LooksUtils.createGIFMediaFromBlob(blob, LooksMediaType.Logo);
                    } else {
                        logo = LooksUtils.createImageMediaFromBlob(blob, LooksMediaType.Logo);
                    }
                }
            }
            if (logo) {
                logo.anchor = configData.logo.anchor;
                if (configData.logo.center) {
                    logo.center = configData.logo.center;
                }
                logo.scale = configData.logo.scale;
                if (logo.anchorInset) {
                    logo.metadata.anchorInset = configData.logo.anchorInset;
                }
                logo.zIndex = LooksUtils.defaultZIndexForLayer(LooksMediaType.Logo);
                if (preset?.isLogoColorizable) {
                    LooksUtils.updateColorScheme(look.getColorizationColor(presenter), logo, preset?.getColorizationCallback());
                }
                objects.push(logo);
            }
        }

        if (objects.length > 0) {
            await look.addObjects(objects, null, null, false).catch(err => {
                console.error("Error adding media to imported demo look", err);
            });
        }

        if (preset?.importLogosAsVisuals) {
            await this.createVisualsForPreset(preset);
        }

        return look;
    }

    async createVisualsForPreset(preset) {
        const logos = preset.logoOptions ?? [];
        for (let i = 0; i < logos.length; i++) {
            const logo = logos[i];
            if (this.#hasVisualWithSourceURL(logo.url)) {
                // We've already got this visual
                continue;
            }
            const media = LooksUtils.createImageMediaFromURL(logo.url);
            media.title = logo.title;
            const style = LooksReactionLayout.OverTheShoulder;
            const anchor = preset.logoAnchor ?? Stage.Object.Anchor.TopLeft;
            const scale = preset.getScaleForVisuals();
            await this.createReaction(media, style, anchor, scale, false).catch((err) => {
                console.error("Error creating visual for preset", err);
            });
        }
    }

    #hasVisualWithSourceURL(url) {
        const presentation = this.reactionsPresentation;
        return presentation.activeSlides.some((slide) => {
            return slide.objects.some((media) => media.metadata?.sourceUrl == url);
        });
    }

    async exportDemoLook() {
        // The service will give us a set of presigned S3 URLs we can write to
        const endpoint = mmhmmAPI.defaultEndpoint();
        const demoLookData = await endpoint.createDemoLook().catch((err) => {
            console.error("Error getting demo look endpoint", err);
        });
        if (!demoLookData) {
            return null;
        }

        const uploadTasks = [];

        // We could persist the look as Cloudy sync records, but since there
        // are only a few properties the user can modify, I think it's easier
        // to just explicitly save what we want to restore. For assets that
        // came from BrandFetch or are built-in, we can just save the URLs.
        // We then need to upload any user-uploaded media assets.
        const look = this.currentLook;
        const presenter = this.#stage.localPresenter;
        const configData = {
            backgroundStyle: presenter.backgroundStyle,
            shape: presenter.shape,
            scale: presenter.scale,
            backgroundPaint: presenter.backgroundPaint,
            brand: look.brandDomain,
            presetId: look.getPresetId(),
        };

        // If the look uses explicit color schemes, save the selected scheme
        if (look.hasLimitedColorOptions()) {
            configData.colorScheme = look.getColorOption();
        }

        const logo = await look.getLogoMedia();
        if (logo) {
            configData.logo = {};
            configData.logo.scale = logo.scale;
            configData.logo.anchor = logo.anchor;
            if (logo.anchor == Stage.Object.Anchor.None) {
                configData.logo.center = logo.center;
            }
            if (logo.metadata?.anchorInset != null) {
                configData.logo.anchorInset = logo.metadata.anchorInset;
            }
            const url = logo.metadata?.sourceUrl;
            if (url) {
                configData.logo.url = url;
            } else if (logo.asset?.blob){
                configData.logo.mimeType = logo.asset.mimeType;
                uploadTasks.push(endpoint.putBlob(logo.asset.blob, demoLookData.logoUrl));
            } else {
                console.error("Logo media does not have a source URL or asset blob", logo);
            }
        }

        const pattern = await look.getPatternMedia();
        if (pattern) {
            configData.pattern = {};
            configData.pattern.opacity = pattern.opacity;
            const url = pattern.metadata?.sourceUrl;
            if (url) {
                configData.pattern.url = url;
            } else {
                // We don't currently support uploading custom patterns
                console.error("Pattern media does not have a source URL", pattern);
            }
        }

        const overlay = await look.getOverlayMedia();
        if (overlay) {
            configData.overlay = {};
            configData.overlay.opacity = overlay.opacity;
            const url = overlay.metadata?.sourceUrl;
            if (url) {
                configData.overlay.url = url;
            } else if (overlay.asset?.blob) {
                uploadTasks.push(endpoint.putBlob(overlay.asset.blob, demoLookData.frameUrl));
            } else {
                console.error("Overlay media does not have a source URL or asset blob", overlay);
            }
        }

        const wallpaper = this.#stage.room;
        configData.wallpaper = {
            id : wallpaper.identifier,
            custom: false,
        };
        if (IsKindOf(wallpaper, CustomRoom) && !wallpaper.isCatalogRoom()) {
            // We need to upload the custom room's background image
            let blob = wallpaper.asset.blob;
            if (!blob) {
                blob = await wallpaper.asset.openAsBlob().catch((err) => {
                    console.error("Error getting custom room background blob", err);
                });
            }
            if (blob) {
                uploadTasks.push(endpoint.putBlob(blob, demoLookData.wallpaperUrl));
                configData.wallpaper.custom = true;
            }
        }

        uploadTasks.push(endpoint.makeRequest("PUT", demoLookData.configUrl, configData));

        let successful = true;
        await Promise.all(uploadTasks).catch((err) => {
            console.error("Error uploading demo look data", err);
            successful = false;
        });

        return successful ? demoLookData.lookId : null;
    }

    removeDemoLook() {
        // Disassociate the demo look from the user so we don't import it repeatedly
        const endpoint = mmhmmAPI.defaultEndpoint();
        endpoint.removeDemoLook().catch((err) => {
            console.error("Error removing demo look", err);
        });
    }

    /* Look presets */

    async createLookFromPresetWithoutPersisting(preset, variant = null) {
        this.#setStageDefaults();

        // Make sure any rooms used by the preset are available in the room store
        preset.registerRooms(this.#roomsStore);
        const room = preset.getRoom(this.#roomsStore, variant);

        // Create the slide but don't persist it yet
        const presentation = this.looksPresentation;
        const presenter = this.#stage.localPresenter;
        const metadata = preset.createMetadata(null, variant);
        const title = variant?.name ?? preset.name ?? "";

        const slide = presentation.newSlideObjectWithMetadata(room, presenter, metadata, title);
        slide.presenter = preset.createPresenter(slide, this.#stage, variant);

        // Pause persistence, then mark the slide and presenter as
        // needing persistence so that when we resume, they'll be saved
        slide.pausePersistence();
        slide.setObjectNeedsPersistence(slide);
        slide.setObjectNeedsPersistence(slide.presenter);

        const domain = variant ? variant.brandDomain : preset.brandDomain;
        if (domain) {
            slide.rawBrandData = await this.getBrandDataForDomain(domain);
        }

        await this.#addPresetMediaToLook(slide, preset, variant);

        // Now add the slide to it's containing presentation
        presentation.addSlideObject(slide);
        return slide;
    }

    /**
     * Create a new look from a preset.
     * @param {LookPreset} preset
     * @param {Object} variant
     * @returns {Slide.Look}
     */
    async createLookFromPreset(preset, variant = null) {
        // TODO this should just call the "without persisting" version,
        // then trigger persistence?
        this.#setStageDefaults();

        // Make sure any rooms used by the preset are available in the room store
        preset.registerRooms(this.#roomsStore);
        const room = preset.getRoom(this.#roomsStore, variant);

        // Create the slide but don't persist it yet
        const presentation = this.looksPresentation;
        const slide = presentation.newSlideObject(room);
        await this.#applyPresetSlideSettingsToLook(slide, preset, variant);

        // Now persist the slide, then add media
        await presentation.addSlideWithObjects(slide);
        await this.#addPresetMediaToLook(slide, preset, variant);
        await slide.performPersistence();
        return slide;
    }

    /**
     * Apply a preset to an existing look. This is used to allow us to
     * take an existing look and apply one of our faux brands to it from
     * the brand search sheet. This flow is an edge case and kludgy.
     * @param {Slide.Look} slide
     * @param {LookPreset} preset
     * @param {Object} variant
     */
    async applyPresetToLook(slide, preset, variant = null) {
        const nametagVisible = this.nametagVisible;
        const oldNametag = slide.getNametagMedia();

        // Make sure any rooms used by the preset are available in the room store
        preset.registerRooms(this.#roomsStore);
        const room = preset.getRoom(this.#roomsStore, variant);

        // Remove the slide's existing media
        slide.deleteObjects(slide.objects);

        await this.#applyPresetSlideSettingsToLook(slide, preset, variant);
        slide.setObjectNeedsPersistence(slide);
        slide.setObjectNeedsPersistence(slide.presenter);

        await this.#addPresetMediaToLook(slide, preset);

        // We need to apply the room and presenter settings
        slide._updatePersistedRoom(room);
        slide._applyPresenterSettings(this.#stage);

        // Make sure the nametag is turned on if necessary, and restore its contents
        this.nametagVisible = nametagVisible;
        if (oldNametag) {
            const nametag = slide.getNametagMedia();
            LooksNameBadgeHandler.updateNameBadgeMediaItemTitle(nametag, oldNametag.titleLabel.string);
            LooksNameBadgeHandler.updateNameBadgeMediaItemSubtitle(nametag, oldNametag.subtitleLabel.string);
        }
    }

    async #applyPresetSlideSettingsToLook(slide, preset, variant) {
        // Intentionally skip the title setter so we don't trigger persistence,
        // since we'll explicitly do that momentarily
        // TODO the lifecycle wasn't set up to work the way we want things to work...
        slide._title = variant?.name ?? preset.name ?? "";
        slide.metadata = preset.createMetadata(slide, variant);
        slide.presenter = preset.createPresenter(slide, this.#stage, variant);

        const domain = variant ? variant.brandDomain : preset.brandDomain;
        if (domain) {
            slide.rawBrandData = await this.getBrandDataForDomain(domain);
        }
    }

    /**
     * Apply a preset to an existing slide.
     * @param {Slide.Look} slide
     * @param {LookPreset} preset
     * @param {Object} variant
     */
    async #addPresetMediaToLook(slide, preset, variant = null) {
        // Add media layers
        const media = await preset.createMedia(this.#stage, variant);
        if (media.length > 0) {
            await slide.addObjects(media, null, null, true);
        }

        // TODO should we move this into the preset's createMedia()
        // so that we do it in one async operation?
        const paint = preset.getColorizationColor(variant);
        const style = variant?.nametagStyle ?? preset.nametagStyle;

        await this.#addNametagToLook(slide, true, paint, style);
        return slide;
    }

    /* Special presentations */

    /**
     * This function was moved out of the PresentationsController as part of
     * removing that class. We probably don't need most of this anymore
     * but it's safest to keep it for now.
     * @param {Presentation.Modern} presentation
     */
    #openPresentation(presentation) {
        const dataStore = this.#dataStore;
        dataStore.activePresentation = presentation;
    }

    /**
     * @returns {?Presentation.Modern}
     */
    get looksPresentation() {
        return this._getTypedPresentation(Presentation.Typed.Type.Looks,
            LooksController.#looksPresentationName);
    }

    /**
     * @returns {?Presentation.Modern}
     */
    get reactionsPresentation() {
        return this._getTypedPresentation(Presentation.Typed.Type.Reactions,
            LooksController.#reactionsPresentationName);
    }

    /**
     * @param {string} type
     * @param {string} title
     * @returns {?Presentation.Modern}
     */
    _getTypedPresentation(type, title) {
        if (this.isAuthenticated == false) {
            return type == Presentation.Typed.Type.Looks ?
                this.#unauthenticatedLooksPresentation :
                this.#unauthenticatedReactionsPresentation;
        }

        const presentations = this.#dataStore.presentations;
        let presentation = presentations.find((p) => p.type == type);

        // For now match on title in addition to type, since we didn't
        // have the "type" concept initially.
        // We can't migrate our internal named special presentations to typed,
        // because a real user could have created a presentation with the same name.
        if (!presentation) {
            presentation = presentations.find((p) => p.title == title);
            if (presentation) {
                // Add a type to the presentation, which is easier said than done...
                this.#migrateLegacyPresentation(presentation, type, title);
            }
        }

        return presentation;
    }

    #migrateLegacyPresentation(presentation, type, title) {
        // Make sure we only migrate a presentation once
        if (this.migratingPresentations?.includes(presentation.identifier)) {
            return;
        }
        if (this.migratingPresentations == null) {
            this.migratingPresentations = [];
        }
        this.migratingPresentations.push(presentation.identifier);

        console.log("Updating presentation type for", title, "to", type);
        const id = presentation.identifier;
        const record = new CloudyRecord({
            collection: mmhmmAPI.CloudyCollectionTypes.ModernPresentation,
            id,
            parentId: id,
            documentId: id,
        });
        presentation.encodeToRecord(record);
        record.encodeProperty("type", type);

        // Persist the change to the presentation, then ask the datastore
        // to refresh the list of presentations, which should result in the
        // presentation being correctly typed
        presentation._postSyncRecords([record]).then(() => {
            this.#dataStore.refreshPresentationsList().catch((err) => {
                console.error("Error refreshing presentations list after migration", err);
            });
        }).catch((err) => {
            console.error("Error updating presentation type", err);
        }).finally(() => {
            this.migratingPresentations = this.migratingPresentations.filter((id) => id != presentation.identifier);
        });
    }

    /**
     * Called when a presentation's slides have changed.
     * @param {Presentation} obj the presentation whose slides changed
     */
    #onPresentationSlidesChanged(_info, _name, obj) {
        if (obj == this.looksPresentation) {
            this.#onLooksSlidesChanged();
        } else if (obj == this.reactionsPresentation) {
            this.#onReactionsSlidesChanged();
        }
    }

    #onLooksSlidesChanged() {
        // The slides in the looks presentation changed
        // Ensure that the current look is still there
        // TODO this should consider the selectedLook
        const currentLook = this.currentLook;
        if (currentLook && !this.#presentationContainsSlide(currentLook, this.looksPresentation)) {
            this.setCurrentLook(null, true);
        } else if (!currentLook) {
            // TODO Force an update - we can't really tell if the current look is null
            // becuase it was before the slides changed, or becuase it was removed
            // from the stage when the slides changed.
            this.didChangeValueForProperty(null, "currentLook");
        }
    }

    #onReactionsSlidesChanged() {
        // The slides in the reactions presentation changed
        // Ensure that the current reaction is still there
        const currentReaction = this.currentReaction;
        if (currentReaction && !this.#presentationContainsSlide(currentReaction, this.reactionsPresentation)) {
            this.currentReaction = null;
        }
    }

    #presentationContainsSlide(slide, presentation) {
        return slide && presentation.containsSlide(slide) && slide.trashed != true;
    }

    #sanityCheckPresentationContainsSlide(slide, presentation) {
        if (slide && slide.presentation !== presentation) {
            console.error("Slide not in expected presentation",
                slide.identifier, presentation?.identifier, presentation?.type);
            return null;
        }
        return slide;
    }

    /* Sharing functionality */

    get sharing() {
        if (!this.#sharing) {
            this.#sharing = new LooksSharing(
                mmhmmAPI.defaultEndpoint(),
                this.looksPresentation,
                this.reactionsPresentation,
                this.#roomsStore
            );
        }
        return this.#sharing;
    }

    /**
     * Used by App to service imports triggered by deep linking.
     */
    async importObject(exportID, type) {
        await this.ensureContentLoaded();

        let presentation = null;
        let title = null;
        switch(type) {
            case LooksContentType.Look:
                title = LocalizedString("Importing look");
                presentation = this.looksPresentation;
                break;
            case LooksContentType.Reaction:
                title = LocalizedString("Importing visual");
                presentation = this.reactionsPresentation;
                break;
            default:
                console.error("Unknown looks object type: ", type);
                return;
        }

        // Show a loading sheet while we import...
        let cancelled = false;
        const sheet = new LoadingSheet(title, "", LocalizedString("Cancel"), 300);
        const button = sheet.actionButton;
        button.classList.add("secondary");
        button.addEventListener("click", _ => cancelled = true);
        sheet.displayAsModal();

        // Import the object
        try {
            const result = await this.sharing.importSharedSlide(exportID, presentation.identifier);
            if (cancelled) {
                return;
            }
            if (!result.successful) {
                // TODO notify the user
                console.error("Error importing looks object", result);
                return;
            }

            // Add the newly imported object to the presentation
            const slide = this.slideWasImported(presentation, result.results);
            LooksAnalytics.onCatalogItemImported(type, result.results);
            if (cancelled) {
                return;
            }

            // We're done importing ... now what?
            if (slide != null) {
                // Select the newly imported object
                this.#selectObjectOfType(slide.identifier, type);
            }
            return slide;
        } catch (err) {
            console.error("Error importing looks object", err);
            // TODO notify the user
        } finally {
            sheet.dismiss();
        }
    }

    #selectObjectOfType(identifier, type) {
        switch(type) {
            case LooksContentType.Look:
                this.selectedLook = this.lookWithIdentifier(identifier);
                break;
            case LooksContentType.Reaction:
                this.currentReaction = this.reactionWithIdentifier(identifier);
                break;
            default:
                console.error("Unknown looks object type: ", type);
        }
    }

    /** Brandfetch-generated looks */

    async getBrandDataForDomain(domain) {
        try {
            return await BrandFetch.getBrandData(domain);
        } catch (err) {
            return null;
        }
    }

    /** "Camera Off" functionality */

    isCameraEnabled() {
        const presenter = this.#stage.localPresenter;
        return presenter.videoTrackEnabled === true;
    }

    isAway() {
        return this.isCameraEnabled() == false;
    }

    enableCamera() {
        const presenter = this.#stage.localPresenter;
        presenter.videoTrackEnabled = true;
    }

    disableCamera() {
        const presenter = this.#stage.localPresenter;
        presenter.videoTrackEnabled = false
    }

    #onVideoTrackEnabledChanged() {
        const presenter = this.#stage.localPresenter;
        if (presenter.videoTrackEnabled && !presenter.layer.hidden) {
            this.#hideAwayScreen();
        } else {
            this.#showAwayScreen();
        }
    }

    /**
     * @param {Slide.Modern} slide must be in the Reactions presentation
     */
    setSelectedAwayScreen(slide) {
        const previous = this.getSelectedAwayScreen();

        if (slide) {
            SharedUserDefaults.setValueForKey(slide.identifier, LooksController.#defaultsKeyAwayScreen);
        } else {
            SharedUserDefaults.removeValueForKey(LooksController.#defaultsKeyAwayScreen);
        }

        // If the camera is off, switch to this reaction
        const presenter = this.#stage.localPresenter;
        if (presenter.videoTrackEnabled) {
            return;
        }

        // We might have been showing the previous reaction; hide it
        if (previous) {
            this.#hideAwayScreen(true);
        }

        // We might have been showing the default overlay layer; hide it
        if (slide && this.#cameraOffOverlayLayer) {
            if (this.cameraOffTransitionInterval) {
                window.clearInterval(this.cameraOffTransitionInterval);
                this.cameraOffTransitionInterval = null;
            }
            this.#cameraOffOverlayLayer.opacity = 0;
        }

        // Show the new reaction
        this.#onVideoTrackEnabledChanged();
    }

    getSelectedAwayScreen() {
        const id = SharedUserDefaults.getValueForKey(LooksController.#defaultsKeyAwayScreen);
        if (id) {
            const reaction = this.reactionsPresentation.slideWithIdentifier(id);
            if (reaction && reaction.trashed != true) {
                if (!reaction.useAsAwayScreen) {
                    // We recently introduced this property; make sure it's set
                    reaction.useAsAwayScreen = true;
                }
                return reaction;
            } else {
                console.error("Selected away screen not found:", id);
            }
        }
        return null;
    }

    #showAwayScreen() {
        if (this.#stopped) {
            return;
        }

        const reaction = this.getSelectedAwayScreen();
        if (reaction) {
            // We have a custom away screen
            this.#setCurrentReaction(reaction);
        } else {
            // Show the default "camera off" overlay
            this.#updateCameraOverlayZIndex();
            this.#setCameraOffOverlayOpacity(true, 0);
        }
    }

    #hideAwayScreen(skipTransition = false) {
        const updateLooksToggle = () => {
            // Ensure toggles are in the correct state; they may
            // have changed while the camera was off
            if (this.getLooksToggle()) {
                this.toggleLooksOn(true);
            } else {
                this.toggleLooksOff(true);
            }
        };

        // See if we have a custom away screen
        const awayScreen = this.getSelectedAwayScreen();
        if (!awayScreen) {
            this.#setCameraOffOverlayOpacity(false, 200);
            updateLooksToggle();
            return;
        }

        // We've got a custom reaction to show when the camera is off
        const apply = () => {
            // Skip the setter; it won't do anything if we're in away mode
            this.#setCurrentReaction(null);
            updateLooksToggle();
        };

        if (skipTransition) {
            apply();
        } else {
            this.showLookTransitionOverlay(() => apply());
        }
    }

    #updateCameraOverlayZIndex() {
        const layer = this.#cameraOffOverlayLayer;
        if (!layer) {
            return;
        }

        const zIndexes = this.#stage.objects.map((object) => object.zIndex || 0);
        zIndexes.push(this.#stage.localPresenter.foregroundZIndex);
        const top = Math.max(...zIndexes);

        layer.zIndex = Math.max(layer.zIndex, top + 1);
    }

    #setCameraOffOverlayOpacity(opaque, duration) {
        const steps = 25;
        const stepTime = duration / steps;
        let increment = 1 / steps;
        if (!opaque) {
            increment = -increment;
        }
        let start = opaque ? 0 : 1;
        let end = opaque ? 1 : 0;
        let current = start;

        if (this.cameraOffTransitionInterval != null) {
            window.clearInterval(this.cameraOffTransitionInterval);
            this.cameraOffTransitionInterval = null;
        }

        const layer = this.#cameraOffOverlayLayer;
        layer.opacity = start;
        this.#stage.foregroundLayer.addSublayer(layer);

        if (duration == 0) {
            layer.opacity = end;
            return;
        }

        const interval = window.setInterval(_ => {
            current = current + increment;
            layer.opacity = this.easeOutCirc(current);

            if ((!opaque && current <= end) || (opaque && current >= end)) {
                window.clearInterval(interval);
                if (this.cameraOffTransitionInterval == interval) {
                    this.cameraOffTransitionInterval = null;
                }
            }
        }, stepTime);
        this.cameraOffTransitionInterval = interval;
    }

    #createCameraOffLayer() {
        const layer = new RenderLayer();
        layer.contentsSrc = "assets/looks/away/brb.png";
        layer.userInteractionEnabled = false;

        const stageSize = this.#stage.size;
        layer.size = stageSize;
        layer.position = PointMake(stageSize.width / 2, stageSize.height / 2);
        layer.zIndex = Slide.Modern.DefaultPresenterZIndices.Foreground + 1000;

        return layer;
    }

    /** Looks Transition layer functionality */

    showLookTransitionOverlay(callback) {
        // Fade in the overlay, then back out
        const duration = 200; // ms
        const steps = 25; // 4% increments (in each direction)
        const stepTime = duration / (steps * 2);
        const ceiling = 0.8;
        let increment = ceiling / steps;
        let t = 0;

        const filter = this.#looksTransitionLayer.filters[0];
        const color = filter.color;

        if (this.looksTransitionInterval != null) {
            window.clearInterval(this.looksTransitionInterval);
            this.looksTransitionInterval = null;
        }
        const interval = window.setInterval(_ => {
            if (t >= ceiling) {
                increment = -increment;
                callback();
            }
            t = t + increment;
            color[3] = this.easeOutCirc(t);
            filter.color = color;

            // Once we're visible again, stop
            if (t <= 0) {
                // Clear this interval
                window.clearInterval(interval);
                if (this.looksTransitionInterval == interval) {
                    this.looksTransitionInterval = null;
                }
            }
        }, stepTime);
        this.looksTransitionInterval = interval;
    }

    #createLooksTransitionLayer() {
        const layer = new RenderLayer();
        layer.addFilter(new SolidColorFilter([0, 0, 0, 0]));
        layer.userInteractionEnabled = false;

        const stageSize = this.#stage.size;
        layer.size = stageSize;
        layer.position = PointMake(stageSize.width / 2, stageSize.height / 2);
        layer.zIndex = Slide.Modern.DefaultPresenterZIndices.Foreground + 1000;

        return layer;
    }

    // https://easings.net/#easeOutQuad
    easeOutQuad(x) {
        return 1 - (1 - x) * (1 - x);
    }

    // https://easings.net/#easeOutCirc
    easeOutCirc(x) {
        return Math.sqrt(1 - Math.pow(x - 1, 2));
    }

    // https://easings.net/#easeOutQuint
    easeOutQuint(x) {
        return 1 - Math.pow(1 - x, 5);
    }

    /** KVO */

    observePropertyChanged(obj, key, val) {
        if (key == "videoTrackEnabled") {
            // This happens immediately when the property changes,
            // which is before the video starts flowing again

            // When the video track is DISABLED, immediately go into away mode
            if (val == false) {
                this.#onVideoTrackEnabledChanged();
            }

            // TODO I think in this case we should show a "camera starting" overlay
            // We'd show that while enabled == true and hidden == true, and
            // remove it when either is false
            // This overlay wouldn't go out over the virtual camera, it would just be
            // for the stage so the user knows what's happening
            // This should happen in the pane, I guess

        } else if (key == "layer.hidden") {
            // This happens when the video has started flowing again

            // When the video track is ENABLED, we wait for the layer to become unhidden
            if (val == false) {
                this.#onVideoTrackEnabledChanged();
            }
        }
    }
}
