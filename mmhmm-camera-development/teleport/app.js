//
//  app.js
//  mmhmm
//
//  Created by Steve White on 7/28/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class App extends ObservableObject {
    constructor() {
        super();
        this.restoreSelectedTheme();
        this.insideAirlock = false;
        Analytics.OnLoad();
    }
    get userPreferredThemeCookieName() {
        return "chakra-ui-color-mode";
    }
    get legacyUserPreferredThemeCookieName() {
        return "selectedTheme";
    }
    get userPreferredTheme() {
        var current = Cookies.Get(this.userPreferredThemeCookieName);
        if (current != null) {
            if (this.validThemes.indexOf(current) != -1) {
                return current;
            }
            return "system";
        }

        var legacy = Cookies.Get(this.legacyUserPreferredThemeCookieName);
        if (legacy != null) {
            legacy = legacy.replace(/%22/g, "");
            var legacyMap = {
                "darkTheme": "dark",
                "lightTheme": "light",
                "systemTheme": "system",
            }

            var mapped = legacyMap[legacy];
            if (mapped != null) {
                return mapped;
            }
        }

        return "system";
    }
    get validThemes() {
        return ["dark", "light", "system"];
    }
    set userPreferredTheme(value) {
        var valid = this.validThemes;
        if (valid.indexOf(value) == -1) {
            console.error("invalid theme value: ", value);
            return;
        }

        // Purge the legacy cookie so we don't get confused in the future
        Cookies.Delete(this.legacyUserPreferredThemeCookieName);

        // Write the new value
        Cookies.Set(this.userPreferredThemeCookieName, value);

        this.updateApplicationTheme();
    }
    restoreSelectedTheme() {
        this.updateApplicationTheme();
        NotificationCenter.default.addObserver(
            SystemTheme.Notifications.Changed,
            null,
            () => {
                this.updateApplicationTheme();
            },
        );
    }
    updateApplicationTheme() {
        let value = this.userPreferredTheme || "system";

        if (value == "system") {
            if (SystemTheme.shared.dark == true) {
                value = "dark"
            }
            else {
                value = "light"
            }
        }

        var body = document.body;
        const lightMode = value == "light"
        body.classList.toggle("light", lightMode);
        body.classList.toggle("dark", !lightMode);

        this.theme = value
        NotificationCenter.default.postNotification(App.Notifications.ThemeChanged, this, {theme: value});
    }
    get requiresDevicePermissions() {
        // devicePermissionWallDisplayOverride is used by Desktop app test to not display the permission wall.
        // Clicking on `Allow` shows OS dialog that can not be responded to in CI environment.
        if (!App.isHybrid || typeof gHybrid == "undefined" || gHybrid.apiVersion == null || this.devicePermissionWallDisplayOverride) {
            // We don't show the device permissions wall in the browser or older hybrid versions
            return false;
        }

        // Don't ask for virtual camera installation repeatedly
        const needsVirtualCamera = (this.devicePermissionsWallComplete != true && !this.isHybridVirtualCameraInstalled());
        const needsCamera = !this.isHybridCameraAuthorized();
        return needsCamera || needsVirtualCamera;
    }
    isHybridCameraAuthorized() {
        return this.isHybridDeviceAuthorized(gHybrid.capabilities?.camera);
    }
    isHybridMicrophoneAuthorized() {
        return this.isHybridDeviceAuthorized(gHybrid.capabilities?.microphone);
    }
    isHybridVirtualCameraInstalled() {
        return VirtualCameraInterface.isVirtualCameraInstalled(gHybrid);
    }
    isHybridDeviceAuthorized(device) {
        if (!device) {
            // Older versions of the hybrid app won't expose this information to us
            // In that case, the hybrid app doesn't let us launch without permission, so assume we have it
            return true;
        }
        return device.authorization.description == "authorized";
    }
    showDevicePermissionsWall() {
        const hybrid = (typeof gHybrid != "undefined") ? gHybrid : {};
        const wall = new DevicePermissionsWall(this, hybrid);
        wall.show(_ => {
            this.devicePermissionsWallComplete = true;
            this.initialize()
        });
    }
    get requiresAuthentication() {
        return true;
    }
    showAuthenticationRequiredWall() {
        const wall = new LoginWall();
        wall.show(_ => {
            // Give enough time for other notification observers
            // to process the auth notification.  This is primarily
            // so that the local presenter will grab the avatarURL
            // and we'll have it when we go to setup the top bar...
            window.setTimeout(() => {
                this.initialize();
            }, 10);
        });
    }
    initialize() {
        // This needs to be called once per page load
        if (window.hasVirtualCameraToolbarButton == null) {
            if (window.injectHybridPropertyDefinitions != null) {
                window.injectHybridPropertyDefinitions();
            }
        }

        NotificationCenter.default.addObserver(
            mmhmmAPI.Notifications.AuthenticationChanged,
            null,
            this.onAuthenticationChanged,
            this
        );

        const endpoint = mmhmmAPI.defaultEndpoint();
        let restoredAuth;
        if (endpoint.isAuthenticated == true) {
            restoredAuth = true;
        } else {
            // TODO I think we should wait for restoreAuthentication to refresh
            // the user's token before proceeding, but making this function async
            // probably takes some careful testing, so for now...
            restoredAuth = this.restoreAuthentication(endpoint);
        }

        if (this.requiresAuthentication == true && restoredAuth == false) {
            console.log("Showing login wall");
            this.showAuthenticationRequiredWall();
            Analytics.Log("application.authentication_required");
            return;
        }

        if (this.requiresDevicePermissions) {
            console.log("Showing device permissions wall");
            this.showDevicePermissionsWall();
            Analytics.Log("application.device_permissions_required");
            return;
        }

        var pageURL = new URL(window.location);
        var searchParams = pageURL.searchParams;

        // Mock toolbar since it's referenced throughout the codebase
        this.toolbar = {};

        // Allow the framerate to be changed
        var fps = searchParams.get("fps");
        if (fps != null) {
            searchParams.delete("fps")
            fps = parseInt(fps);
            if (isNaN(fps) == false) {
                SharedUserDefaults.setValueForKey(fps, "fps");
            }
        }

        var frameRate = SharedUserDefaults.getValueForKey("fps", 30);
        if (typeof frameRate != "number") {
            frameRate = parseInt(frameRate);
        }

        frameRate = clamp(frameRate, 15, 60);
        this.frameInterval = Math.round((1 / frameRate) * 1000);
        if (frameRate != 30) {
            console.log(`Creating LocalPresenter class with frame rate: ${frameRate}`);
        }

        // Setup the local presenter
        var localPresenter = new LocalPresenter(true, true, frameRate);
        this.localPresenter = localPresenter;
        // Add observers to persist presenter changes
        var keys = localPresenter.persistenceKeys();
        keys.forEach(key => localPresenter.addObserverForProperty(this, key));

        this.localStore = new LocalStore();

        // Setup the stage
        var stage = new Stage(document.getElementById("stage"));
        stage.localPresenter = localPresenter;
        this.stage = stage;
        this.configureStageResolution(stage, searchParams);
        this.initializeRooms();
        this.requestRender(); // Start the render loop

        // DataStore caches some service information, manages presentations, etc
        this.dataStore = new DataStore(endpoint, this.localStore);
        this.dataStore.addObserverForProperty(this, "activePresentation");

        // DOM event listeners
        this.setupFocusRestorer();
        this.setupDocumentVisibilityHandlers();
        this.setupDocumentDragDropHandlers();
        this.setupKeyboardListeners();

        // LooksController manages Camera functionality
        this.looks = new LooksController(this.stage, this.dataStore, this.rooms);

        // Manages the avatar menu
        this.accountUI = new AccountUI();

        // Manages the undo/redo state
        this.setupUndoManager();

        // Application UI, contains everything but the stage and notification banner
        this.tours = new ToursControl();
        this.looksUI = new LooksSidebarPane(this.looks, this.stage, this.dataStore, this.rooms, this.accountUI, this.tours, this.undoManager);

        // Manages free trials and such
        this.commerce = new CommerceController(stage, localPresenter, this.accountUI);

        // Initialize speech reactions (connects to LooksController for auto-display)
        this.initializeSpeechReactions();

        // If we've removed any query params from the
        // given URL, update the address bar to reflect
        // that
        var currentURL = pageURL.toString();
        if (currentURL != window.location.toString()) {
            window.history.replaceState(
                {},
                "",
                currentURL,
            );
        }

        if (App.isHybrid == true) {
            this.initializeHybrid(gHybrid);
        }

        this.stopped = false;
        this.paused = false;
        this.addDefaultBeforeUnloadHandler();

        let analyticsProperties = {};
        if (typeof gHybridHardwareInfo != "undefined") {
            if (gHybridHardwareInfo.segmentation) {
                analyticsProperties.segmentation = gHybridHardwareInfo.segmentation;
            }
            analyticsProperties.osVersion = gHybridHardwareInfo.osVersion;
            analyticsProperties.cpuArch = gHybridHardwareInfo.cpuArch;
            analyticsProperties.cpuCores = gHybridHardwareInfo.cpuCores;
            analyticsProperties.gpuName = gHybridHardwareInfo.gpuName;
            analyticsProperties.memory = gHybridHardwareInfo.memory;
        }
        if (this.virtualCameraInterface != null) {
            analyticsProperties.virtualCameraState = this.virtualCameraInterface.virtualCameraState;
        }

        this.updateWindowIsFloating();

        Analytics.Log("application.launch", analyticsProperties);

        this.setupHashChangeListener();
        this.prefetchAssets();

        this.showReleaseNotesIfNeeded();

        // Store a default indicating that subsequent launches aren't the first launch
        SharedUserDefaults.setValueForKey(true, "hasLaunchedApp");
    }

    getAssetsToPrefetch() {
        const presets = LookPresets.All();

        // Find all of the overlays we might use
        const overlays = [];
        overlays.push(...LookOverlays.All);
        presets.forEach(preset => overlays.push(...(preset.getOverlayOptions() ?? [])));

        // Find all of the patterns we might use
        const patterns = [];
        patterns.push(...LookPatterns.All);
        presets.forEach(preset => patterns.push(...(preset.getPatternOptions() ?? [])));

        // Collect all of the asset URLs from our patterns and overlays
        const assetUrls = [];
        overlays.forEach(overlay => assetUrls.push(overlay.assetUrl, overlay.thumbnailUrl));
        patterns.forEach(pattern => assetUrls.push(pattern.assetUrl, pattern.thumbnailUrl));

        if (App.isDemo) {
            LookWallpapers.All().forEach(w => assetUrls.push(LookWallpapers.assetUrlForRoomIdentifier(w)));
        }

        // Remove nulls and duplicates
        const uniqueAssetUrls = Array.from(new Set(assetUrls.filter(url => url != null)));

        const imageExtensions = Media.Files.imageExtensions();
        const urls = uniqueAssetUrls.filter((url) => {
            // Only prefetch images, not videos
            const pos = url.lastIndexOf(".");
            if (pos == -1) {
                return true;
            }
            const ext = url.substring(pos + 1).toLowerCase();
            return imageExtensions.includes(ext);
        });

        // Add assets used by text reactions
        const textMediaAssets = [
            "https://app.airtimetools.com/talk/assets/cutout/fire/static.jpg",
            "https://app.airtimetools.com/talk/assets/cutout/fire/video.mp4",
            "https://app.airtimetools.com/talk/assets/cutout/fireworks/static.jpg",
            "https://app.airtimetools.com/talk/assets/cutout/fireworks/video.mp4",
            "assets/fonts/BeniBlack.woff2",
            "assets/fonts/KomikaHand.woff2",
            "assets/fonts/KomikaHand-Bold.woff2",
        ];
        urls.push(...textMediaAssets);

        return urls;
    }

    prefetchAssets() {
        // Set up prefetch links for common look assets, starting with overlays & patterns to start
        // This tells the browser that we're likely to need these resources soon, so it can load them
        // but with a low priority.

        // Safari doesn't support prefetch, and warns about preloading unused assets if we use preload
        if (isSafari()) {
            return;
        }

        const assetUrls = this.getAssetsToPrefetch();
        assetUrls.forEach(url => {
            const link = document.createElement("link");
            link.rel = "prefetch";
            link.as = "image";
            link.href = url;
            document.head.appendChild(link);
        });
    }

    /**
     * Initialize speech-triggered reactions feature.
     * Connects SpeechReactionsController to LooksController for auto-display.
     */
    initializeSpeechReactions() {
        // Skip in demo mode
        if (App.isDemo) {
            return;
        }

        // Wire up the SpeechReactionsController to LooksController
        const speechController = SpeechReactionsController.shared;
        if (speechController && this.looks) {
            speechController.setLooksController(this.looks);

            // If the user had speech reactions enabled before, restore that state
            // Note: The model will be loaded on first toggle, not at startup
            if (speechController.enabled) {
                // Re-enable to trigger the start flow
                speechController.enable();
            }
        }

        console.log("Speech reactions initialized");
    }

    cameraPreferencesUpdated() {
        const looksPane = this.looksUI;
        if (looksPane) {
            looksPane.preferencesChanged();
        }
        this.updateWindowIsFloating();
     }

    /**
     * We float our main window when the virtual camera is active
     */
    updateWindowIsFloating() {
        if (App.isHybrid && gHybrid.windows) {
            let float = false;
            let pref = SharedUserDefaults.getValueForKey("miniFloatWindow", "no");
            if (pref == "auto") {
                float = this.virtualCameraInterface.isVirtualCameraActive();
            } else if (pref == "yes") {
                float = true;
            } else if (pref == "no") {
                float = false;
            }
            gHybrid.windows.mainAppWindow.isFloating = float;
        }
    }

    /**
     * Initialize functionality that's specific to the hybrid app.
     * @param {Object} hybrid the global gHybrid object injected by the native app.
     */
    initializeHybrid(hybrid) {
        HybridBridge.initialize();

        if (window.mmhmm_isStageRendering) {
            window.mmhmm_isStageRendering(true);
        }

        const virtualCameraInterface = new VirtualCameraInterface(hybrid, this.stage);
        virtualCameraInterface.initializeCallbacks(_ => this.showVirtualCameraDialog(hybrid));
        this.virtualCameraInterface = virtualCameraInterface;

        this.stage.addObserverForProperty(this, "isVirtualCameraActive");
    }

    showVirtualCameraDialog(hybrid) {
        if (this.virtualCameraDialog) {
            this.virtualCameraDialog.dismiss();
            return;
        }
        let virtualCameraInterface = this.virtualCameraInterface;
        if (gLocalDeployment) {
            hybrid = {
                virtualCamera: {
                    state: {
                        description: VirtualCameraState.installed
                    },
                },
            };
            virtualCameraInterface = new VirtualCameraInterface(hybrid, this.stage);
        }
        const sheet = new VirtualCameraDialog(hybrid, virtualCameraInterface, this.stage);
        sheet.addEventListener("dismiss", () => {
            // Older versions of the hybrid app don't have this API
            if (hybrid.onBeforeVirtualCameraSupportViewCloses) {
                hybrid.onBeforeVirtualCameraSupportViewCloses();
            }
            this.virtualCameraDialog = null;
        });
        sheet.displayAsModal();
        if (hybrid.onAfterVirtualCameraSupportViewOpened) {
            hybrid.onAfterVirtualCameraSupportViewOpened();
        }
        this.virtualCameraDialog = sheet;

        // TODO we should more loosely couple this
        this.looksUI?.virtualCameraDialogOpened();

        Analytics.Log("application.element_clicked", {
            component: "titlebar",
            element: "virtual_camera"
        });
    }

    setupHashChangeListener() {
        // Listen for window hash changes, see if an import ID was added
        const handleLocationHash = () => {
            const hashComponents = this.windowHashComponents;
            const importID = hashComponents.importID;
            if (importID != null) {
                this.handleImportHashCode(importID);
            }
        };

        window.addEventListener("hashchange", (evt) => handleLocationHash());
        handleLocationHash();
    }

    // Returns true if we showed a dialog, otherwise false
    async showReleaseNotesIfNeeded() {
        const firstLaunch = !SharedUserDefaults.getValueForKey("hasLaunchedApp");
        if (firstLaunch) {
            // We don't need to show new users the current version
            // of the release notes - they're new to the product.
            SharedUserDefaults.setValueForKey(ReleaseNotes.getLatestKey(), "lastReleaseNotes");
            return;
        }

        // See if the hybrid app version has changed
        // if (App.isHybrid == true) {
        //     var hybridVersion = getHybridAppVersion();
        //     var lastHybridVersion = SharedUserDefaults.getValueForKey("hybridAppVersion", null);
        //     if (hybridVersion != null && hybridVersion != lastHybridVersion) {
        //         SharedUserDefaults.setValueForKey(hybridVersion, "hybridAppVersion");
        //         await this.displayReleaseNotes();
        //         return true;
        //     }
        // }

        // See if we've shown the user this version of the release notes
        var current = ReleaseNotes.getLatestKey();
        var lastSeen = SharedUserDefaults.getValueForKey("lastReleaseNotes", null);
        if (lastSeen != current) {
            await this.displayReleaseNotes();
            return true;
        }

        return false;
    }

    async displayReleaseNotes() {
        if (this.releaseNotesSheet) {
            return;
        }
        const promise = promiseWrapper();
        const sheet = new ReleaseNotesSheet(this.looksUI);
        sheet.addEventListener("dismiss", _ => {
            this.releaseNotesSheet = null;
            promise.resolve();
        });
        sheet.displayAsModal();
        this.releaseNotesSheet = sheet;
        return promise;
    }

    handleImportHashCode(exportID) {
        if (this.dataStore == null || this.looks == null) {
            // We're probably just launching and haven't fully initialized yet
            // We'll try again once we're fully initialized
            return false;
        }

        // Remove the import ID from the current window URL
        this.clearLocationHash()

        const endpoint = mmhmmAPI.defaultEndpoint();
        if (!endpoint.isAuthenticated) {
            const sheet = new SignInSheet(LocalizedString("Account Required"), 320);
            sheet.displayAsModal();
            return false;
        }

        this.performImport(exportID);
        return true;
    }

    async performImport(exportID) {
        // Find out what kind of content we're importing
        try {
            const endpoint = mmhmmAPI.defaultEndpoint();
            const metadata = await endpoint.getExportedObjectMetadata(exportID);
            if (!metadata?.id) {
                throw new Error("Requested export ID not found");
            }
            if (metadata.type == null || metadata.type == "presentation") {
                // We don't deal with presentations in Camera
                console.log("Ignoring import of presentation in Camera app");
            } else if (Object.values(LooksContentType).includes(metadata.type)) {
                this.looks.importObject(exportID, metadata.type);
            } else {
                throw new Error(`Unknown import type: ${metadata.type}`);
            }
        } catch (err) {
            // TODO user-visible error messaging
            console.error("Error loading export metadata", err);
        }
    }

    setupUndoManager() {
        const manager = new UndoManager();
        this.undoManager = manager;
        this.stage.undoManager = manager;

        // Clear undo state on account sign in/out
        // as most of the actions won't be able to
        // work due to that change.
        const getUserID = function() {
            return mmhmmAPI.defaultEndpoint().user?.id;
        }
        let lastUserID = getUserID();
        NotificationCenter.default.addObserver(
            mmhmmAPI.Notifications.AuthenticationChanged,
            null,
            () => {
                var userID = getUserID();
                if (userID != lastUserID) {
                    manager.removeAllActions();
                    lastUserID = userID;
                }
            }
        );

       const buttonGroup = document.createElement("div");
       buttonGroup.className = "button_group";

        // Undo/redo is weird for editing text media, as we don't
        // capture the text manipulation.  So for now hide the buttons...
        const updateVisibility = () => {
            const media = this.stage.media;
            const text = media.filter(media => IsKindOf(media, Media.Text));
            const editing = text.filter(media => media.editing);

            let display = "";
            if (editing.length > 0) {
                display = "none";
            }
            buttonGroup.style.display = display;
        }
        NotificationCenter.default.addObserver(
            Media.Text.Notifications.DidBeginEditing,
            null,
            updateVisibility
        );
        NotificationCenter.default.addObserver(
            Media.Text.Notifications.DidEndEditing,
            null,
            updateVisibility
        );
    }

    configureStageResolution(stage, searchParams) {
        var resolution = searchParams.get("resolution");
        if (resolution != null && resolution != "") {
            var valid = false;
            for (var key in Stage.Resolution) {
                var value = Stage.Resolution[key];
                if (resolution == value) {
                    valid = true;
                    break;
                }
            }
            if (valid == true) {
                console.info("Using resolution: ", resolution);
                stage.resolution = resolution;
                return;
            }
        }

        // XXX: Temporarily ignore hardware info until
        // the hybrid app can deal with stage resolution
        // changes in the virtual camera
        return;
        /* eslint-disable no-unreachable */
        if (typeof gHybridHardwareInfo == 'undefined') {
            return;
        }

        var hardwareInfo = gHybridHardwareInfo;

        var gpuName = hardwareInfo.gpuName;
        if (gpuName == null) {
            return;
        }

        if (gpuName.startsWith("Intel") == false || gpuName.indexOf("UHD") == -1) {
            return;
        }

        var cpuCores = hardwareInfo.cpuCores;
        resolution = null;
        if (cpuCores <= 4) {
            resolution = Stage.Resolution.Low;
        }
        else {
            resolution = Stage.Resolution.Medium;
        }

        console.info("Using resolution: ", resolution);
        stage.resolution = resolution;
        /* eslint-enable no-unreachable */
    }

    /* Authentication */

    restoreAuthentication(endpoint) {
        var restoredAuth = false;

        var pageURL = new URL(window.location);
        var searchParams = pageURL.searchParams;
        var token = searchParams.get("token");
        if (token != null) {
            searchParams.delete("token");
            window.history.replaceState(
                {},
                "",
                pageURL.toString(),
            );

            restoredAuth = true;
            this.handleHandoffToken(token, endpoint);
        }
        else {
            try {
                restoredAuth = this.restoreAuthenticationFromCookies(endpoint);
            } catch (err) {
                gSentry.exception(err);
                console.error("Error restoring cookie auth", err);
            }
        }
        return restoredAuth;
    }
    async handleHandoffToken(token, endpoint) {
        endpoint.performAuthenticationHandoff(token).catch(err => {
            console.error("Error processing handoff token: ", err);
            gSentry.exception(err);

            this.restoreAuthenticationFromCookies().catch(err => {
                gSentry.exception(err);
                console.error("Error restoring cookie auth", err);
            });
        });
    }
    restoreAuthenticationFromCookies(endpoint) {
        const { lastAccountUUID, accounts } = this.accountsFromCookie();

        let account = null;
        if (lastAccountUUID != null && accounts[lastAccountUUID] != null) {
            account = accounts[lastAccountUUID];
        } else {
            const uuids = Object.keys(accounts);
            if (uuids.length > 0) {
                account = accounts[uuids[0]];
            }
        }

        if (account == null) {
            return false;
        }

        const token = this.accessTokenFromCookieAccount(account);
        if (token == null) {
            return false;
        }

        endpoint.restoreAccessToken(token).catch(err => {
            console.error("Error restoring access token", err);
        });
        return true;
    }
    accountsFromCookie() {
        return CognitoCookies.shared.getAccountsFromCookies();
    }
    accessTokenFromCookieAccount(account) {
        var accessToken = {
            expiresIn: 0,
            expires: new Date(0),

            accessToken: account.accessToken,
            idToken: account.idToken,
            refreshToken: account.refreshToken,

            user: {}
        };

        var userData = account.userData;
        if (userData != null) {
            var user = accessToken.user;

            user.id = userData.Username;

            var attrs = userData.UserAttributes;
            if (attrs != null) {
                attrs.forEach(pair => {
                    var key = pair.Name;
                    var value = pair.Value;
                    if (key == "email") {
                        user.email = value;
                    } else if (key == "mmhmmTVAlpha") {
                        user.mmhmmTVAlpha = value;
                    } else if (key == "mmhmmTVBeta") {
                        user.mmhmmTVBeta = value;
                    }
                })
            }
        }

        return accessToken;
    }
    onAuthenticationChanged(info) {
        const endpoint = mmhmmAPI.defaultEndpoint();
        if (endpoint.isAuthenticated == false) {
            console.log("User signed out");
            this.onSignOut(info?.userInitiated === true);
        } else if (endpoint.user.id != this.authenticatedUserId) {
            console.log("Authenticated as " + endpoint.user.id);
            this.authenticatedUserId = endpoint.user.id;
        }
    }
    onSignOut(userInitiated) {
        if (!this.requiresAuthentication) {
            return;
        } else if (userInitiated) {
            // Reloading the app will cause us to show our page wall
            window.location.reload();
        } else if (this.showingSignoutAlert !== true) {
            // If the user didn't explicitly log out, let them know what's happening
            gSentry.message("User signed out unexpectedly");
            this.showingSignoutAlert = true;
            ShowAlertView(
                LocalizedString("You have been signed out"),
                LocalizedString("Please sign back in to continue using Airtime Camera"),
                { action: () => window.location.reload() }
            );
        }
    }

    get windowHashComponents() {
        var hash = window.location.hash;
        var components = hash.split(/[#&]/g).filter(a => a.length > 0).map(a => a.split("="));
        var results = {};
        components.forEach(pair => {
            var key = pair[0];
            var value = pair[1];
            results[key] = value;
        })
        return results;
    }
    initializeRooms() {
        var rooms = RoomsController.shared;
        this.rooms = rooms;
        rooms.restore(this.localStore);
    }
    registerCustomBeforeUnloadHandler(handler) {
        if (!this.isCustomBeforeUnloadHandlerSupported()) {
            return;
        }
        // Remove our default handler and add a custom handler
        // We only support one custom handler at a time so they don't conflict
        if (this.beforeUnloadHandler != null) {
            window.removeEventListener("beforeunload", this.beforeUnloadHandler);
            this.beforeUnloadHandler = null;
        }
        if (this.customBeforeUnloadHandler != null) {
            window.removeEventListener("beforeunload", this.customBeforeUnloadHandler);
            this.customBeforeUnloadHandler = null;
        }
        this.customBeforeUnloadHandler = handler;
        window.addEventListener("beforeunload", this.customBeforeUnloadHandler);
    }
    removeCustomBeforeUnloadHandler() {
        // Remove the custom handler and restore the default one
        if (this.customBeforeUnloadHandler != null) {
            window.removeEventListener("beforeunload", this.customBeforeUnloadHandler);
            this.customBeforeUnloadHandler = null;

            this.beforeUnloadHandler = this.beforeUnload.bind(this);
            window.addEventListener("beforeunload", this.beforeUnloadHandler);
        }
    }
    isCustomBeforeUnloadHandlerSupported() {
        if (!App.isHybrid) {
            return true;
        }
        // Check if we're in a sufficiently recent hybrid app
        return gHybrid.apiVersion && gHybrid.apiVersion.major >= 1 && gHybrid.apiVersion.minor >= 9;
    }
    addDefaultBeforeUnloadHandler() {
        if (this.beforeUnloadHandler == null) {
            this.beforeUnloadHandler = this.beforeUnload.bind(this);
            window.addEventListener("beforeunload", this.beforeUnloadHandler);
        }
    }
    beforeUnload() {
        this.stopped = true;
        this.looks.stop();

        const presenter = this.localPresenter;
        if (presenter != null) {
            // Turn off camera
            presenter.videoTrackEnabled = false;
            presenter.removeSegmenter();
        }

        const stage = this.stage;
        if (stage != null) {
            // Ensure slides stop playing
            stage.slide = null;
            // Ensure rooms stop playing
            stage.room = new SolidColorRoom("00000000-0000-0000-0000-000000000000", "Black", null, "#000000");
            // Flush the canvas
            stage.render(this.lastRenderTime, true, true);
        }

        SharedUserDefaults.persist();
        Statsig.default.destroy();
    }
    stop() {
        this.beforeUnload();
    }

    /**
     * pauseRendering(): Pauses the rendering by returning from requestAnimationFrame
     * in the next render cycle.
     */
    pauseRendering() {
        if (this.paused == true) {
            return;
        }
        this.paused = true;
        console.log("Pausing rendering");

        // Save the enabled state of the camera & microphone, then disable them
        let localPresenter = this.localPresenter;
        this.savedPresenterState = {
            videoTrackEnabled: localPresenter.videoTrackEnabled,
        };

        localPresenter.videoTrackEnabled = false;

        // Perform one last render. This way the user doesn't have to stare at themselves
        // frozen on stage in the background.
        this.render(this.lastRenderTime + this.frameInterval, true, false);
        this.stage.pauseAVMedia();

        // Notify the hybrid application that we've stopped rendering
        if (window.mmhmm_isStageRendering) {
            window.mmhmm_isStageRendering(false);
        }
    }

    /**
     * resumeRendering(): Resumes rendering by calling requestRender(). this.paused is set to false
     * before calling it.
     */
    resumeRendering() {
        if (this.paused == false) {
            return;
        }
        this.paused = false;
        console.log("Resumed rendering");

        // Restore the camera & microphone state
        let savedPresenterState = this.savedPresenterState;
        this.savedPresenterState = null;

        let localPresenter = this.localPresenter;
        if (savedPresenterState?.videoTrackEnabled != null) {
            localPresenter.videoTrackEnabled = savedPresenterState.videoTrackEnabled;
        }

        this.stage.resumeAVMedia();
        this.requestRender();

        // Notify the hybrid application that we've started rendering
        if (window.mmhmm_isStageRendering) {
            window.mmhmm_isStageRendering(true);
        }
    }

    /*
     * Helpers for driving the render loop
     */
    render(time, fullStage, localPresenter) {
        if (this.lastRenderTime == null) {
            this.lastRenderTime = 0;
        }

        if (time - this.lastRenderTime >= this.frameInterval /*ms*/ ) {
            this.lastRenderTime = time;
            if (fullStage == true || localPresenter == true) {
                this.localPresenter.prepareForNextFrame(time);
            }
            if (fullStage == true) {
                if (this.frameCounter) {
                    this.frameCounter.increment();
                }
                this.stage.render(time);
            }
        }
    }
    requestRender(forcibly = false) {
        window.requestAnimationFrame(time => {
            var stopped = this.stopped;
            var paused = this.paused;
            if ((stopped == true || paused == true) && forcibly == false) {
                return;
            }
            if (forcibly == true) {
                this.lastRenderTime = 0;
            }
            this.render(time, true, true);

            if (stopped == false) {
                this.requestRender();
            }
        });
    }

    get renderTargets() {
        const windowHidden = this.windowHidden;
        let renderFullStage = true;
        let renderLocalPresenter = true;
        if (windowHidden == true) {
            // This is to ensure the hybrid's virtual
            // camera is always fed. It'd be nice to
            // avoid doing this when we know nothing
            // is consuming the camera, but we don't
            // have that information yet.
            if (App.isHybrid == false) {
                renderFullStage = false;
            }
            renderLocalPresenter = false;
        }
        return {
            fullStage: renderFullStage,
            localPresenter: renderLocalPresenter
        };
    }
    /*
     *
     */
    setupDocumentVisibilityHandlers() {
        document.addEventListener("visibilitychange", () => {
            // If we're on a call and in virtual green screen,
            // we render a masked image into a separate GL
            // context and send that out the wire.
            // If the page loses focus, the requestAnimationFrame
            // that drives that won't fire.  So we listen for
            // window blur/focus events, and start a manual timer
            // to keep that network stream flowing
            if (document.visibilityState === "hidden") {
                this.windowHidden = true;
                if (this.heartbeat == null) {
                    this.heartbeat = new Worker("workers/workerHeartbeat.js");
                    var time = this.lastRenderTime;
                    this.heartbeat.onmessage = (msg) => {
                        if (this.stopped == true) {
                            return;
                        }
                        var { fullStage, localPresenter } = this.renderTargets;
                        if (fullStage == true || localPresenter === true) {
                            time += msg.data;
                            this.render(time, fullStage, localPresenter);
                        }
                    };
                    this.heartbeat.postMessage(`Start`);
                }
            }
            else {
                this.windowHidden = false;
                if (this.heartbeat != null) {
                    this.heartbeat.postMessage(`Closing`);
                    this.heartbeat.terminate();
                    this.heartbeat = null;
                }
            }
        });
    }
    setupDocumentDragDropHandlers() {
        var dragDropElement = document.getElementById("container");
        if (dragDropElement == null) {
            dragDropElement = document.body;
        }
        this.dragDropElement = dragDropElement;

        dragDropElement.addEventListener('dragover', (evt) => {
            evt.stopPropagation();
            evt.preventDefault();
            this.onDragDropOver(evt);
        });

        dragDropElement.addEventListener('dragleave', (evt) => {
            evt.stopPropagation();
            evt.preventDefault();
            this.onDragDropLeave(evt);
        });

        dragDropElement.addEventListener('drop', (evt) => {
            evt.stopPropagation();
            evt.preventDefault();
            this.onDragDropDrop(evt);
        });
    }
    onDragDropLeave(event) {
        if (IsDescendentOf(event.target, this.stage.canvas)) {
            this.stage.eventHandler.onDragLeave(event);
        }
        this.dragDropElement.style.cursor = "";
    }
    onDragDropOver(event) {
        if (IsDescendentOf(event.target, this.stage.canvas)) {
            this.stage.eventHandler.onDragOver(event);
        }
        this.dragDropElement.style.cursor = "not-allowed";
    }
    onDragDropDrop(event) {
        this.dragDropElement.style.cursor = "";
        return;
    }
    /*
     *
     */
    observePropertyChanged(obj, key, val) {
        if (obj == this.localPresenter) {
            SharedUserDefaults.setValueForKey(val, key)
        }
        else if (key == "activePresentation") {
            this.stage.presentation = this.dataStore.activePresentation;
        }
        else if (key == "isVirtualCameraActive") {
            this.updateWindowIsFloating();
        }
    }
    /*
     *
     */
    async cloudyRecordFromClipboardBlob(blob) {
        const text = await blob.text();
        const json = JSON.parse(text);
        return new CloudyRecord(json);
    }
    async dataFromClipboard(checkPermissions=true) {
        const result = {
            mediaObjects: [],
            presenterRecords: []
        };

        if (checkPermissions == true) {
            const vendor = navigator.vendor;
            if (vendor != "" && vendor.startsWith("Apple") == false) {
                // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API
                // The clipboard-read and clipboard-write permissions are not supported
                // (and not planned to be supported) by Firefox or Safari.
                const permission = await navigator.permissions.query({name: "clipboard-read"});
                if (permission == null || permission.state != "granted") {
                    console.info("unexpected clipboard permissions: ", permission);
                    return result;
                }
            }
        }

        const items = await navigator.clipboard.read();

        // Chromium/blink allows us to put any type on the clipboard,
        // so long as the type is prefixed with `web `.
        // This tests for that and removes it.
        const typeFixer = function(type) {
            if (type.startsWith("web ") == true) {
                return type.substring(4);
            }
            return type;
        }

        // Turn the list of items into a list of tasks converting them to blobs
        const tasks = items.map((item) => {
            const types = item.types;
            let supportedType = types.find(type => typeFixer(type) == Stage.Object.ClipboardType);
            if (supportedType == null) {
                supportedType = types.find(type => Media.Files.isSupportedTypeOrExtension(type));
            }

            if (supportedType == null) {
                return null;
            }

            return item.getType(supportedType);
        }).filter((task) => task != null);

        // Wait for the tasks to complete
        const blobs = (await Promise.all(tasks)).filter((blob) => blob != null);

        // Some things may be encoded Cloudy records. We'll need to convert
        const recordBlobs = blobs.filter((blob) => typeFixer(blob.type) == Stage.Object.ClipboardType);
        // Others are likely just pure files
        const fileBlobs = blobs.filter((blob) => recordBlobs.indexOf(blob) == -1);

        // For the records, we need to convert the blob into JSON, which is asynchronous
        const recordTasks = recordBlobs.map((blob) => this.cloudyRecordFromClipboardBlob(blob));
        const records = await Promise.all(recordTasks);

        // Sanity check for the future where we might put who knows, Room records, on the clipboard
        const validRecords = records.filter((record) =>
            record.collection == mmhmmAPI.CloudyCollectionTypes.Media
        );

        // Presenter records and slide media records need to be handled different
        const presenterRecords = validRecords.filter((record) =>
            record.decodeProperty("type", String) == "presenter"
        );
        const mediaRecords = validRecords.filter((record) => presenterRecords.indexOf(record) == -1);

        // Convert media records into Media objects
        const mediaObjects = mediaRecords.map((record) => {
            var endpoint = mmhmmAPI.defaultEndpoint();
            return Media.FromModernRecord(record, endpoint).copy();
        });

        // Convert the file blobs into Media objects too
        const fileObjects = await Media.Files.createWithFiles(fileBlobs);
        mediaObjects.push(...fileObjects);

        // And return what we've found.
        result.mediaObjects = mediaObjects;
        result.presenterRecords = presenterRecords;
        return result;
    }
    async processClipboardData(data) {
        let medias = data.mediaObjects ?? [];
        let presenters = data.presenterRecords ?? [];
        if (presenters.length > 0) {
            presenters.forEach((record) => {
                this.localPresenter.decodeFromModernRecord(record)
            });
        }

        const mediaCount = medias.length;
        if (mediaCount > 0) {
            if (mediaCount == 1) {
                const selection = this.stage.selectedObject;
                if (IsKindOf(selection, Media) == true) {
                    const replacer = new Media.Replacer(selection);
                    replacer.replaceMediaWith(medias[0]);
                    return;
                }
            }

            this.addMediaToCurrentSlide(medias);
        }
    }
    get clipboardSupported() {
        if (window.ClipboardItem == null) {
            return false;
        }
        const vendor = navigator.vendor;
        if (vendor == "" || vendor.startsWith("Apple") == true) {
            return false;
        }
        return true;
    }
    dimmingNotificationShown() {
        this.dimmingNotificationVisible = true;
    }
    dimmingNotificationHidden() {
        this.dimmingNotificationVisible = false;
    }
    setupKeyboardListeners() {
        document.addEventListener("keydown", event => {
            this._handleKeyboardEvent(event);
        })
        document.addEventListener("keyup", event => {
            this._handleKeyboardEvent(event);
        })
    }
    get keyboardObservers() {
        let observers = this._keyboardObservers;
        if (observers == null) {
            observers = [];
            this._keyboardObservers = observers;
        }
        return observers;
    }
    _handleKeyboardEvent(event) {
        var activeElement = document.activeElement;
        if (activeElement != null) {
            const ignorables = [
                "SELECT", "INPUT", "TEXTAREA", "BUTTON"
            ];
            if (ignorables.indexOf(activeElement.tagName) != -1) {
                return;
            }
            if (this.keyboardObserversDisabled > 0) {
                return;
            }
        }

        var observers = this.keyboardObservers;
        var numObservers = observers.length;
        for (var observerIdx = numObservers - 1; observerIdx >= 0; observerIdx -= 1) {
            var observer = observers[observerIdx];
            if (observer.handleKeyboardEvent(event, this.isApplePlatform) == true) {
                return;
            }
        }

        this._unhandledKeyboardEvent(event);
    }
    get isApplePlatform() {
        var result = this._isApplePlatform;
        if (result == null) {
            result = navigator.platform.startsWith("Mac");
            this._isApplePlatform = result;
        }
        return result;
    }
    _unhandledKeyboardEvent(event) {
        if (event.type != "keyup") {
            return;
        }

        var stage = this.stage;
        var media = stage.selectedObject;
        var slide = stage.slide;

        var key = event.code;
        var handled = false;

        if (key == "Backspace" || key == "Delete") {
            if (media != null) {
                if (media.closeButtonWasClicked != null) {
                    media.closeButtonWasClicked(event);
                    handled = true;
                }
            }
            else if (slide != null) {
                var slideTray = this.slideTray;
                if (slideTray.containsSlide(slide) == true) {
                    slideTray.showDeleteSlideConfirmation(slide);
                    handled = true;
                }
            }
        }

        if (handled == true) {
            event.stopPropagation();
            event.preventDefault();
        }
    }
    disableKeyboardObservers() {
        var keyboardObserversDisabled = this.keyboardObserversDisabled ?? 0;
        keyboardObserversDisabled += 1;
        this.keyboardObserversDisabled = keyboardObserversDisabled;
    }
    enableKeyboardObservers() {
        var keyboardObserversDisabled = this.keyboardObserversDisabled;
        keyboardObserversDisabled -= 1;
        this.keyboardObserversDisabled = keyboardObserversDisabled;
    }
    registerKeyboardObserver(observer) {
        var observers = this.keyboardObservers;
        if (observers.indexOf(observer) != -1) {
            console.error("Double registering a keyboard observer??", observer, observers);
        }
        observers.push(observer);
    }
    unregisterKeyboardObserver(observer) {
        var observers = this.keyboardObservers;
        var index = observers.indexOf(observer);
        if (index == -1) {
            console.error("Could not find observer in registered observers", observer, observers);
        }
        else {
            observers.splice(index, 1);
        }
    }
    /*
     * Slide -> presentation helpers
     */
    addMediaToCurrentSlide(media) {
        if (media == null || media.length == 0) {
            return;
        }

        var slide = this.stage.slide;
        if (slide != null) {
            return this._addMediaUsing(media, slide, async (onProgress, cancelSignal) => {
                return slide.addObjects(media, onProgress, cancelSignal);
            });
        }

        var dataStore = this.dataStore;
        var presentation = dataStore.activePresentation ?? dataStore.scratchPadPresentation;

        return this._addMediaUsing(media, presentation, async (onProgress, cancelSignal) => {
            return presentation.createNewSlideWithObjects(null, null, media, onProgress, cancelSignal);
        })
    }
    _addMediaUsing(media, destination, toAdd) {
        if (media == null || media.length == 0) {
            return;
        }

        var isUploadRequired = destination.doesAddingObjectsRequireUpload(media);
        var isSlideDestination = IsKindOf(destination, Slide);
        var cancelController = new AbortController();

        // Handler when the upload completes, manages removing items if cancelled,
        // otherwise showing new slides if they were created.
        var onUploaded = (results) => {
            if (IsKindOf(results, Array) == false) {
                results = [results];
            }

            if (cancelController.signal.aborted == true) {
                if (isSlideDestination == true) {
                    destination.deleteObjects(media);
                }
                else {
                    destination.deleteSlides(results);
                }
                return;
            }

            if (isSlideDestination == true) {
                // Presumably you can't add to a slide unless
                // its visible, in which case we assume its
                // taken care of things
                return;
            }

            var validItem = results.find(item => item != null);
            if (IsKindOf(validItem, Slide) == true) {
                this.stage.slide = validItem;
                this.slideTray.scrollSlideIntoViewIfAppropriate(validItem);
            }
            else {
                console.error("need to handle ", validItem, results.length);
                debugger;
            }
        };

        if (isUploadRequired == false) {
            toAdd().then(onUploaded).catch(err => {
                media.forEach((elem) => {
                    console.error("Error adding media to destination",elem?.identifier, destination?.identifier, err);
                })
            });
            return;
        }

        // Try to prevent tab/window closure while uploading
        var beforeUnloadHandler = (evt) => {
            evt.returnValue = LocalizedString("Are you sure you want to leave the page? The upload is still in progress");
        };
        window.addEventListener("beforeunload", beforeUnloadHandler);

        var removeUnloadHandler = () => {
            if (beforeUnloadHandler != null) {
                window.removeEventListener("beforeunload", beforeUnloadHandler);
                beforeUnloadHandler = null;
            }
        }

        // Progress sheet to show
        var sheet = this.newUploadProgressSheet(media.length, isSlideDestination, () => {
            cancelController.abort();
        });
        sheet.displayAsModal();

        // Perform the upload
        toAdd((progress) => {
            sheet.progressIndicator.value = progress * 100;
        }, cancelController.signal).then(success => {
            sheet.dismiss();
            onUploaded(success);
        }).catch(err => {
            sheet.dismiss(true);

            if (cancelController.signal.aborted == false) {
                console.error("presentation.addSlides returned error", err);

                var errorMessage = err.toString();
                ShowAlertView(
                    LocalizedString("Upload error"),
                    LocalizedStringFormat("An unknown error occurred during upload: ${errorMessage}", {errorMessage})
                )
            }
        }).finally(() => {
            removeUnloadHandler();
        });
    }
    newUploadProgressSheet(numItems, destIsSlide, onCancel) {
        //
        // Dialog messaging
        //
        var message = null;
        if (numItems == 1) {
            message = LocalizedString("Uploading file…");
        }
        else {
            message = LocalizedString("Uploading files…");
        }

        var title = null;
        if (destIsSlide == true) {
            title = message;
            message = null;
        }
        else {
            if (numItems == 1) {
                title = LocalizedString("New Slide");
            }
            else {
                title = LocalizedString("New Slides");
            }
        }

        //
        // The dialog itself
        //
        var sheet = new ProgressSheet(title, false);
        if (message != null) {
            sheet.messageLabel.innerText = message;
        }

        if (onCancel != null) {
            sheet.addButton(LocalizedString("Cancel"), "secondary", evt => {
                sheet.dismiss();
                onCancel();
            })
        }

        return sheet;
    }
    /*
     *
     */
    setupFocusRestorer() {
        document.body.addEventListener("mouseup", evt => {
            var activeElement = document.activeElement;
            if (activeElement != null && activeElement.tagName == "BUTTON") {
                activeElement.blur();
            }
        })
    }

    clearLocationHash() {
        const url = new URL(window.location.href);
        url.hash = '';
        const newUrl = url.href;

        // Replace url with existing url without hashes
        window.history.replaceState({}, '', newUrl)
    }

    /**
     * Centralizes the logic for determining whether the user might be presenting
     * to a third party. We define presenting as the virtual camera being active.
     */
    get isPresenting() {
        return this.stage.isVirtualCameraActive;
    }
}

Object.defineProperty(App, 'isHybrid', {
    value: (window.MmhmmCamera != null),
    writable: false
});

Object.defineProperty(App, 'isUserTesting', {
    value: ((window.self !== window.parent) && window.parent.toSmallWindow != null && window.parent.toLargeWindow != null),
    writable: false
});

App.Notifications = Object.freeze({
    ThemeChanged: "ThemeChanged",
    VirtualCameraClientsChanged: "VirtualCamera.ClientsChanged",
    VirtualCameraStateChanged: "VirtualCamera.StateChanged",
    HybridAppWindowHidden: "HybridAppWindowHidden",
    HybridAppWindowUnhidden: "HybridAppWindowUnhidden",
});

if ("serviceWorker" in navigator) {
  // Register a service worker hosted at the root of the
  // site using the default scope.
  navigator.serviceWorker.register("./cacher.js", {updateViaCache: "none"}).then(
    (registration) => {
        if (gLocalDeployment == true) {
            registration.update();
        }
    },
    (error) => {
      console.error(`Service worker registration failed: ${error}`);
    },
  );
}
