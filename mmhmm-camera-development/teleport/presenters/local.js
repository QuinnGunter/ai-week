//
//  local.js
//  mmhmm
//
//  Created by Steve White on 7/21/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

/**
 * @extends {Presenter}
 */
class LocalPresenter extends Presenter {
    constructor(wantsLocalInference = true, automaticDevices = true, rendererFPS = 30) {
        // We do this before invoking super, as super will set screenName to null
        // in order to define the property, but our custom setter will end up
        // persisting that: and if we read it after super() we'll get back that null
        var screenName = SharedUserDefaults.getValueForKey("screenName", null);

        super(wantsLocalInference)
        this.screenName = screenName;
        this._rendererFPS = rendererFPS;

        this.app = this.getAppIdentifier();
        var identifier = SharedUserDefaults.getValueForKey("uuid");
        if (identifier == null) {
            identifier = createUUID();
            SharedUserDefaults.setValueForKey(identifier, "uuid");
        }
        this.identifier = identifier;

        this.physicalGreenScreen = SharedUserDefaults.getValueForKey("physicalGreenScreen", false);

        this.cameras = null;
        this.microphones = null;
        this.deviceChangeEnabled = true;

        if (automaticDevices == true) {
            var hardware = AVHardware.shared;
            hardware.addObserverForProperty(this, "cameras");
            hardware.addObserverForProperty(this, "microphones");
            if (hardware.cameras.length > 0 || hardware.microphones.length > 0) {
                this.updateMediaDevices();
            }
        }

        NotificationCenter.default.addObserver(
            mmhmmAPI.Notifications.AuthenticationChanged,
            null,
            this.authenticationChanged,
            this
        );
        if (mmhmmAPI.defaultEndpoint().isAuthenticated == true) {
            this.authenticationChanged();
        }
    }
    restoreUserDefaultValues() {
        this.undoManager?.disableUndoRegistration();

        this.anchor = SharedUserDefaults.getValueForKey("anchor", Stage.Object.Anchor.Center);
        if (this.anchor == Stage.Object.Anchor.None) {
            var center = SharedUserDefaults.getValueForKey("center");
            if (center != null) {
                this.center = center;
            }
            /*
            var rotation = SharedUserDefaults.getValueForKey("rotation");
            if (rotation != null) {
              this.rotation = rotation;
            }
            */
        }

        var scale = SharedUserDefaults.getValueForKey("scale", 0.85);
        if (scale != null) {
            this.scale = clamp(scale, 0.25, 1.0);
        }
        var opacity = SharedUserDefaults.getValueForKey("opacity", 1.0);
        if (opacity != null) {
            this.opacity = clamp(opacity, 0.5, 1.0);
        }

        var backgroundColor = SharedUserDefaults.getValueForKey("backgroundColor", null);

        var shape = SharedUserDefaults.getValueForKey("shape", null);
        var backgroundStyle = SharedUserDefaults.getValueForKey("backgroundStyle", null);
        if (shape == null || backgroundStyle == null) {
            var style = SharedUserDefaults.getValueForKey("style", null);
            var migrated = this.migrateLegacyStyleWithBackgroundColor(style, backgroundColor);
            shape = migrated.shape;
            backgroundStyle = migrated.backgroundStyle;
            backgroundColor = migrated.backgroundColor;
        }

        this.shape = shape;
        this.backgroundStyle = backgroundStyle;
        this.backgroundColor = backgroundColor;

        this.shadowEnabled = SharedUserDefaults.getValueForKey("shadowEnabled", false);
        this.blurAmount = SharedUserDefaults.getValueForKey("blurAmount", this.defaultBlurAmount);

        // We decided not to persist the fullscreen state. Leaving this here to remind us of that.
        // this.fullscreen = SharedUserDefaults.getValueForKey("fullscreen", false);
        // this.enhancement = SharedUserDefaults.getValueForKey("enhancement", 0);

        this.mirrorVideo = SharedUserDefaults.getValueForKey("mirrorVideo", false);
        let cropInsets = SharedUserDefaults.getValueForKey("cropInsets", null);
        if (cropInsets == null) {
            let cameraZoom = SharedUserDefaults.getValueForKey("cameraZoom", null);
            if (cameraZoom != null) {
                SharedUserDefaults.setValueForKey(null, "cameraZoom");
            }
            else {
                cameraZoom = 1.0;
            }
            cropInsets = this.cropInsetsFromCameraZoom(cameraZoom);
            SharedUserDefaults.setValueForKey(cropInsets, "cropInsets");
        }
        this.cropInsets = cropInsets;

        // var effectSettings = SharedUserDefaults.getValueForKey("effect");
        // if (effectSettings != null) {
        //     var id = effectSettings.id;
        //     if (id != null) {
        //         var effect = NewFilterWithID(id, true);
        //         if (effect != null) {
        //             effect.applyEvent(effectSettings);
        //             this.effect = effect;
        //         }
        //     }
        // }

        const chromaFilter = this.chromaFilter;
        let defaultChromaMode = Presenter.ChromaMode.Automatic;
        if (chromaFilter != null) {
            const settings = SharedUserDefaults.getValueForKey("chroma", {});
            const parameters = chromaFilter.parameters;
            for (var key in parameters) {
                var val = settings[key];
                if (val != null && chromaFilter[key] != val) {
                    chromaFilter[key] = val;
                    defaultChromaMode = Presenter.ChromaMode.Manual;
                }
                chromaFilter.addObserverForProperty(this, key);
            }
        }

        this.chromaMode = SharedUserDefaults.getValueForKey("chromaMode", defaultChromaMode);

        const paintJSON = SharedUserDefaults.getValueForKey("backgroundPaint", null);
        let paint = null;
        if (paintJSON != null) {
            paint = Paint.FromJSON(paintJSON);
        }
        else {
            const backgroundColor = SharedUserDefaults.getValueForKey("backgroundColor", null);
            if (backgroundColor != null) {
                paint = new Paint.Color(backgroundColor);
                SharedUserDefaults.setValueForKey(null, "backgroundColor");
            }
        }
        this.backgroundPaint = paint;
        this.undoManager?.enableUndoRegistration();
    }
    resetPresenterSettings() {
        this.backgroundStyle = Presenter.BackgroundStyle.Show;
        this.shape = Presenter.Shape.Rectangle;
        this.resetCropInsets();
        this.anchor = Stage.Object.Anchor.Center;
        this.scale = 1;
        this.backgroundPaint = null;
        this.opacity = 1;
        // this.effect = null;
        // this.enhance = 0;
        this.mirrorVideo = false;
        this.rotation = 0;
        this.gestureRecognizer = null;
    }
    get wantsAcceleratedRendering() {
        return true;
    }
    get usesHybridSegmentation() {
        if (typeof gHybrid != "undefined") {
            var capabilities = gHybrid.capabilities;
            if (capabilities != null) {
                var nativeSeg = capabilities.nativeSeg;
                return !!nativeSeg;
            }
        }
        return false;
    }
    get targetHybridSegmentationMode() {
        if (this.segmentationRequired == true) {
            // Check if we need blur but native blur isn't working
            // In that case, we can't use hybrid segmentation because the camera
            // sends pre-masked video (background RGB is black) which can't be blurred
            if (this.backgroundStyle == Presenter.BackgroundStyle.Blur) {
                const videoTrack = this.videoTrack;
                const settings = videoTrack?.getSettings?.();
                const targetBlur = this.targetHybridBlurMode;
                const nativeBlurWorking = settings?.blurMode === targetBlur;
                if (!nativeBlurWorking && targetBlur !== 'none') {
                    // Native blur not working - don't use silhouette mode
                    // This gives us full video that can be processed with JS blur
                    // (requires JS segmentation which may not be available in hybrid mode)
                    console.warn('[Hybrid] Native blur not working, falling back from silhouette mode');
                    return "none";
                }
            }
            return "silhouette";
        }
        return "none";
    }
    get targetHybridBlurMode() {
        const blurMode = this.backgroundStyle;
        if (blurMode == Presenter.BackgroundStyle.Blur) {
            switch(this.blurAmount) {
                case Presenter.BlurAmount.Small:
                    return "light";
                case Presenter.BlurAmount.Large:
                    return "strong";
                default:
                    return "none";
            }
        }

        return "none";
    }
    get supportsReadWriteShares() {
        return true;
    }
    /**
     * Get a display string indicating the version of the app that the
     * user is running.
     */
    getAppIdentifier() {
        var platform = null;
        if (App.isHybrid) {
            if (navigator.userAgent.indexOf("Windows") != -1) {
                platform = "Windows desktop";
            }
            else {
                platform = "Mac desktop";
            }
        }
        else {
            platform = "Web " + getBrowser();
        }
        var releaseTrack = getReleaseTrack();
        if (releaseTrack != "production") {
            platform = `${platform} ${releaseTrack}`;
        }
        return platform
    }
    /*
     * Media Devices
     */
    set videoTrackEnabled(enabled) {
        super.videoTrackEnabled = enabled;

        var stage = this.stage;
        if (stage == null) {
            return;
        }

        if (enabled == false && this.selected == true) {
            stage.selectedObject = null;
        }
    }
    get videoTrackEnabled() {
        return super.videoTrackEnabled;
    }
    updateMediaDevicesAfterDelay() {
        if (this.updateMediaDevicesTimeout != null) {
            return;
        }
        this.updateMediaDevicesTimeout = window.setTimeout(() => {
            this.updateMediaDevices();
            this.updateMediaDevicesTimeout = null;
        }, 1);
    }
    updateMediaDevices() {
        const hardware = AVHardware.shared;
        const cameras = hardware.cameras;
        this.cameras = cameras;

        const currentCamera = this.videoTrack?.label;

        const preferredDeviceWithKey = function(devices, key, defaultDeviceSelector, currentDeviceLabel) {
            let result = null;

            // If we have a saved user preference and that device exists, use it
            let preferredDeviceInfo = SharedUserDefaults.getValueForKey(key);
            if (preferredDeviceInfo != null) {
                if (preferredDeviceInfo.constructor == String) {
                    preferredDeviceInfo = { id: preferredDeviceInfo };
                }
                result = devices.find(device => device.deviceId == preferredDeviceInfo.id || device.label == preferredDeviceInfo.label);
            }

            // If we don't have a saved user preference but we do have a
            // current input stream, we should continue to use the current device
            if (result == null && currentDeviceLabel) {
                result = devices.find(device => device.label == currentDeviceLabel);
            }

            // If we still haven't found a device, fall back to our default selector
            if (result == null && devices.length > 0) {
                result = devices.find(device => device.label.includes(defaultDeviceSelector));
                if (result == null) {
                    result = devices[0];
                }
            }

            return result;
        }

        const videoDevice = preferredDeviceWithKey(cameras, "videoDevice", "FaceTime", currentCamera);
        this.videoDevice = videoDevice;
        if (videoDevice != null && this.usesHybridSegmentation == true) {
            this.updateVideoTrack();
        }
    }
    deviceWithID(deviceId) {
        var video = this.cameras.find(device => device.deviceId == deviceId);
        if (video != null) {
            return video;
        }
        return this.microphones.find(device => device.deviceId == deviceId);
    }
    cameraWithLabel(label) {
        return this.cameras.find(device => device.label == label);
    }
    _deviceIdResolvingDefaultUsing(device, pool) {
        if (device == null) {
            return null;
        }

        var deviceId = device.deviceId;
        if (deviceId.length == 0) {
            return null;
        }

        if (deviceId != "default" || pool == null || pool.length == 0) {
            return deviceId;
        }

        var groupId = device.groupId;
        if (groupId == null || groupId.length == 0) {
            return deviceId;
        }

        var alternateDevice = pool.find(other => {
            if (other.deviceId == "default") {
                return null;
            }
            return (other.groupId == groupId && other != device)
        });

        if (alternateDevice == null) {
            return deviceId;
        }

        var altId = alternateDevice.deviceId;
        if (altId != null && altId.length > 0) {
            return altId;
        }

        return deviceId;
    }
    get videoDeviceID() {
        return this._deviceIdResolvingDefaultUsing(this.videoDevice, this.cameras);
    }
    get videoDevice() {
        return this._videoDevice;
    }
    set videoDevice(aDevice) {
        var previous = this._videoDevice;

        if (!previous || !aDevice || previous.deviceId != aDevice.deviceId) {
            console.info("set videoDevice: ", { previous: previous, current: aDevice })
        }
        this.firstVideoDevice = (previous == null) || previous.deviceId == '';

        var resolvedDeviceID = this._deviceIdResolvingDefaultUsing(aDevice, this.cameras);
        var needsNewInputStream = true;
        if (this._videoDevice != null && resolvedDeviceID == this.videoDeviceID) {
            needsNewInputStream = false;
        }

        this._videoDevice = aDevice;

        var deviceInfo = null;
        // Don't save a user preference of { deviceId:"", label:"" }
        if (aDevice != null && (aDevice.deviceId || aDevice.label)) {
            deviceInfo = { deviceId: aDevice.deviceId, label: aDevice.label };
        }
        if (deviceInfo != null) {
            SharedUserDefaults.setValueForKey(deviceInfo, "videoDevice");
        }

        if (needsNewInputStream == true) {
            this.requestNewInputStream();
            this.showDeviceChangedToast(LocalizedString("Camera"), previous, aDevice);
        }
    }
    showDeviceChangedToast(deviceType, previousDevice, newDevice) {
        if (previousDevice == null || previousDevice.label == "") {
            return;
        }
        if (newDevice == null || newDevice.label == "") {
            return;
        }
        if (this.stage == null) {
            return;
        }
        Toast.show(LocalizedStringFormat("Camera changed to ${label}", { label: newDevice.label} ));
    }
    async requestNewUserMediaTrackWithConstraints(kind, constraints) {
        var request = {}
        request[kind] = constraints;

        var stream = await navigator.mediaDevices.getUserMedia(request);
        if (stream == null) {
            throw "getUserMedia returned null"
        }
        this._sanitizeInputStream(stream);

        var tracks = stream.getTracks();
        var track = tracks.find(a => a.kind == kind);
        if (track == null) {
            console.error("getUserMedia succeeded, but couldn't not find kind in tracks", kind, tracks);
            throw "Unknown getUserMedia error";
        }
        if (kind == "video" && this.usesHybridSegmentation == true) {
            this.updateVideoTrack();
        }
        return track;
    }
    defaultUserMediaConstraints(deviceId) {
        const preferredResolution = this.preferredResolution;
        const base = {
            width: { ideal: preferredResolution.width },
            height: { ideal: preferredResolution.height },
            frameRate: { ideal: this._rendererFPS },
            aspectRatio: { ideal: preferredResolution.width / preferredResolution.height },
        };

        if (this.usesHybridSegmentation == true) {
            base.segmentationMode = this.targetHybridSegmentationMode;
        }

        if (deviceId != null) {
            base.deviceId = { exact: deviceId };
        }

        return base;
    }
    requestNewInputStream() {
        const timeout = this.inputStreamTimeout;
        if (timeout != null) {
            window.clearTimeout(timeout);
        }

        this.inputStreamTimeout = window.setTimeout(evt => {
            const constraints = {};
            if (this.videoTrackEnabled == true) {
                constraints.video = this.defaultUserMediaConstraints(this.videoDeviceID);
            }

            if (Object.keys(constraints).length > 0) {
                this.getUserMedia(constraints);
            }
        }, 10);
    }
    getUserMedia(constraints, callback) {
        console.info("getUserMedia: ", constraints);
        if (navigator.mediaDevices.getUserMedia == null) {
            ShowBrowserUnsuportedError();
            console.error('Your browser does not support getUserMedia API');
            return;
        }
        navigator.mediaDevices.getUserMedia(constraints).then(evt => {
            this.processUserMediaResponse(evt);
            if (callback != null) {
                callback.apply(this, []);
            }
        }).catch(err => {
            this.handleUserMediaError(err, constraints, callback);
        });
    }

    async handleUserMediaError(err, constraints, callback) {
        console.info("getUserMedia returned error: ", err);
        let retry = false;

        if (typeof OverconstrainedError != "undefined" && err.constructor == OverconstrainedError) {
            // OverconstrainedError could be that the specified device doesn't exist
            // Or it could be that the specified type doesn't exist (e.g. we asked for video
            // and the person doesn't have a camera hooked up)
            const videoConstraint = constraints.video;
            if (videoConstraint != null && videoConstraint.deviceId != null) {
                delete videoConstraint.deviceId;
                retry = true;
            }
        }

        if (retry == false) {
            // We didn't decide to retry with a different set of constraints,
            // but this may be a recoverable error, in which case we'll retry
            // without changing the constraints and without the callback
            // that informs the user that we changed devices.
            const retryRecoverableError = await this.handleMediaDeviceError(err, constraints);
            if (retryRecoverableError == true) {
                this.getUserMedia(constraints);
            } else {
                // getUserMedia failed and we're not going to retry
                // We may still have a videoTrack from the previous videoDevice,
                // but the selected videoDevice will be the new one that failed

                const currentTrack = this.videoTrack;
                const camera = currentTrack ? this.cameraWithLabel(currentTrack.label) : null;
                if (camera && this.videoDevice != camera) {
                    // Set the videoDevice back to the one that's currently in use
                    // since the attempt to change it failed
                    this.videoDevice = camera;
                } else {
                    // We can't find the camera that's currently in use, or there isn't one,
                    // so mute the video track
                    this.videoTrackEnabled = false;
                }
            }
            return;
        }

        this.getUserMedia(constraints, () => {
            if (callback != null) {
                callback();
            }

            // XXX: It'd be nice to ensure this doesn't end up
            // stacking on top of itself, which it does on my
            // Mini that doesn't have a camera plugged in.
            const title = LocalizedString("Camera error");
            const message = LocalizedStringFormat(
                "An unknown error occurred when connecting to your camera. We changed the selected camera to prevent further errors. The underlying error was: ${error}", {error: err.toString()});
            ShowAlertView(title, message);
        });
    }
    processUserMediaResponse(response) {
        console.info("processUserMediaResponse", response);
        const timeout = this.userMediaResponseTimeout;
        if (timeout != null) {
            window.clearTimeout(timeout);
        }

        if (response != null) {
            const videoDevice = this.videoDevice;
            // Firefox will hide the device labels(names) until permissions
            // are granted – but the existing objects won't get updated
            // when that happens, so we need to get new objects...
            if (videoDevice != null && videoDevice.label == "") {
                this.userMediaResponseTimeout = window.setTimeout(evt => {
                    AVHardware.shared.refresh();
                    this.inputStream = response;
                }, 10)
                return;
            }
        }
        this.inputStream = response;

        if (this.usesHybridSegmentation == true) {
            this.updateVideoTrack();
        }
    }
    async handleMediaDeviceError(error, constraints) {
        console.error("handleMediaDeviceError", error, constraints);
        switch (error.name) {
            case "NotAllowedError":
                this.videoTrackEnabled = false;
                ShowAVPermissionError();
                break;
            case "NotFoundError":
            case "NotReadableError":
            default:
                return this.handleRetriableMediaDeviceError(error);
        }
        return false;
    }

    // See https://github.com/All-Turtles/mmhmm-web/issues/5404
    // We've seen that sometimes getUserMedia times out the first time
    // we call it after launching the application. This is likely a
    // bug somewhere in Chromium. We'll allow the user to retry as a workaround.
    async handleRetriableMediaDeviceError(error) {
        const promise = promiseWrapper();

        let dismissOverlay = null;

        // We'll ask the user if they want to retry
        const retryButton = document.createElement("button");
        retryButton.innerText = LocalizedString("Retry");
        retryButton.classList.add("capsule");
        retryButton.addEventListener("click", () => {
            promise.resolve(true);
            dismissOverlay();
        });

        const cancelButton = document.createElement("button");
        cancelButton.innerText = LocalizedString("Cancel");
        cancelButton.classList.add("capsule", "secondary");
        cancelButton.addEventListener("click", () => {
            promise.resolve(false);
            dismissOverlay();
        });

        const errorMsg = error;
        let heading = LocalizedString("Unable to access your camera");
        let message = null;
        switch (error.name) {
            case "NotReadableError":
                if (error.message?.trim()) {
                    heading = error.message.trim();
                }
                message = LocalizedString("Please ensure that the selected camera is not in use by another application, then try again.");
                break;
            case "NotFoundError":
                heading = LocalizedString("Airtime requires a camera");
                message = LocalizedString("Please ensure that your camera is connected and try again.");
                break;
            default:
                // Track this so we can get a handle on how often it's happening
                gSentry.exception(error);
                message = LocalizedStringFormat("An error occurred while accessing your camera: ${errorMsg}", {errorMsg});
        }

        dismissOverlay = ShowAlertView(heading, message, { buttons: [cancelButton, retryButton] });
        return promise;
    }

    set opacity(val) {
        super.opacity = val;
    }
    get opacity() {
        return super.opacity;
    }
    toggleFullscreen() {
        // Override the default behavior of fullscreen
        // so that when we're going from fullscreen to not fullscreen,
        // if that change would have no visible effect because of the
        // presenter's size and position, we change their scale to 0.8
        // This helps avoid button clicks that don't appear to do anything.
        let previousBoundingBox = null;
        if (this.fullscreen == true) {
            // We're leaving fullscreen
            previousBoundingBox = this.layer.boundingBox;
        }

        super.toggleFullscreen();

        if (previousBoundingBox != null) {
            const newBoundingBox = this.layer.boundingBox;

            // Compare the bounding boxes, with a little bit of tolerance
            const tolerance = 5;
            const same = Math.abs(previousBoundingBox.x - newBoundingBox.x) < tolerance &&
                Math.abs(previousBoundingBox.y - newBoundingBox.y) < tolerance &&
                Math.abs(previousBoundingBox.width - newBoundingBox.width) < tolerance &&
                Math.abs(previousBoundingBox.height - newBoundingBox.height) < tolerance;
            if (same) {
                this.scale = 0.8;
            }
        }
    }
    _clampCenterPoint(useSetter) {
        // Override the default behavior of _clampCenterPoint
        // when the actual center isn't used to determine the
        // presenter's location on stage, which is when there's
        // no background or we're full-screen.
        // See https://github.com/All-Turtles/mmhmm-web/issues/2740
        if (this.fullscreen == true) {
            return;
        }
        super._clampCenterPoint(useSetter);
    }
    updateUserInteraction() {
        const foregroundHelper = this.foregroundHelper;
        if (foregroundHelper != null) {
            foregroundHelper.updateUserInteraction();
        }

        var layer = this.layer;
        if (layer == null) {
            return;
        }
        layer.userInteractionEnabled = false;

        var overlayHelper = this.overlayHelper;
        if (overlayHelper != null) {
            overlayHelper.visible = false;
        }
    }
    updateVideoLayerVisibility() {
        super.updateVideoLayerVisibility();
        this.updateUserInteraction();
    }
    /*
     *
     */
    observePropertyChanged(obj, key, value) {
        if (obj == AVHardware.shared) {
            this.updateMediaDevicesAfterDelay();
        }
        else {
            super.observePropertyChanged(obj, key, value);
        }
    }
    /*
     * Properties
     */
    set screenName(value) {
        if (value != null) {
            value = value.trim();
            if (value.length == 0) {
                value = null;
            }
        }
        SharedUserDefaults.setValueForKey(value, "screenName");
        super.screenName = value;
    }
    get screenName() {
        return super.screenName;
    }
    set identifier(value) {
        var previous = this.identifier;
        if (value == previous) {
            return;
        }
        super.identifier = value;
        SharedUserDefaults.setValueForKey(value, "uuid");
    }
    get identifier() {
        return super.identifier;
    }
    /*
     * Hand gestures
     */
    gestureRecognizerUpdatedGesture(recognizer, gesture) {
        var previous = this.gesture;

        if (gesture == previous) {
            return;
        }
        // XXX: compare compare compare
        this.gesture = gesture;
    }
    set gestureRecognizer(aRecognizer) {
        var previous = this._gestureRecognizer;
        if (previous != null) {
            previous.delegate = null;
            this.gesture = null;
        }
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'gestureRecognizer', previous);

        this._gestureRecognizer = aRecognizer;

        if (aRecognizer != null) {
            aRecognizer.delegate = this;
        }
    }
    get gestureRecognizer() {
        return this._gestureRecognizer;
    }
    /*
     * Avatar/screen name updater
     */
    authenticationChanged() {
        var user = mmhmmAPI.defaultEndpoint().user;
        var avatarURL = null;
        if (user != null) {
            this.identifier = user.id;
            if (this.screenName != user.name) {
                this.screenName = user.name;
            }

            var profilePhotoInfo = user.profilePhotoInfo;
            if (profilePhotoInfo != null) {
                var urls = profilePhotoInfo.urls;
                if (urls != null) {
                    var url = urls.thumbnail;
                    if (url != null) {
                        avatarURL = url;
                    }
                }
            }
        }
        if (avatarURL != this.avatarURL) {
            this.avatarURL = avatarURL;
        }
    }
    /*
     *
     */
    toJSON() {
        var r = super.toJSON();
        if (this.physicalGreenScreen == true) {
            r.chroma = this.chromaFilter;
        }
        return r;
    }
    /*
     * Stage related methods
     */
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        this.restoreUserDefaultValues();

        if (stage.selectedObject == null) {
            stage.selectedObject = this;
        }
    }
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);
    }
   newEditMenu() {
        const menu = new Menu();

        const cropItem = menu.addItem(LocalizedString("Adjust crop"), () => {
            this.enterEditMode();
        }, false);
        if (this.editable == false) {
            cropItem.disabled = true;
        }
        menu.addDivider();

        if (gApp.clipboardSupported == true) {
            menu.addItem(LocalizedString("Copy appearance settings"), () => {
                this.writeToClipboard();
            });

            let pasteData = null;
            const pasteItem = menu.addItem(LocalizedString("Paste appearance settings"), () => {
                gApp.processClipboardData(pasteData);
            });
            // Initially disable the menu item as the
            // clipboard read is asynchronous...
            pasteItem.disabled = true;

            menu.addEventListener("willAppear", (event) => {
                gApp.dataFromClipboard().then((data) => {
                    // Intentionally discard presenter records from the data
                    pasteData = { presenterRecords: data.presenterRecords };

                    if (data.presenterRecords.length > 0) {
                        pasteItem.disabled = false;
                    }
                }).catch((error) => {
                    console.error("Error reading from clipboard: ", error);
                })
            }, {once: true});

            menu.addDivider();
        }

        menu.addItem(LocalizedString("Turn off camera"), () => {
            this.videoTrackEnabled = false;
        }, true);

        return menu;
    }
    /*
     * Legacy helpers
     */
    // These exist to:
    // 1) Migrate existing value out of user defaults
    // 2) Support the Hybrid Bridge until it no longer needs camera zoom
    cropInsetsFromCameraZoom(cameraZoom) {
        const scale = 1.0 + ((cameraZoom - 1.0) * 2.0);
        const width = (1.0 / scale);
        const inset = (1.0 - width) / 2;
        return InsetsMake(inset, inset, inset, inset);
    }
    cameraZoomFromCropInsets(cropInsets) {
        if (cropInsets.top != cropInsets.bottom ||
            cropInsets.left != cropInsets.right ||
            cropInsets.top != cropInsets.left)
        {
            // The crop isn't uniform, so it cannot be
            // represented as a legacy camera zoom value
            return 1.0;
        }

        const width = 1.0 - (cropInsets.left * 2);
        const scale = 1.0 + (((1.0 / width) - 1.0) / 2);
        return scale;
    }
}
