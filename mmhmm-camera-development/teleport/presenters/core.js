//
//  presenter.js
//  mmhmm
//
//  Created by Steve White on 7/21/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

/**
 * @extends {ObservableObject}
 */
class Presenter extends Stage.Object {
    constructor(wantsLocalInference = false) {
        super(null);

        var videoProvider = this.newVideoProvider();
        videoProvider.addObserverForProperty(this, "size");
        videoProvider.addObserverForProperty(this, "active");
        this.videoProvider = videoProvider;

        this.maskerNeedsRender = false;
        this.segmentationRequired = false;
        this.forceSegmentationForAlpha = false;

        this.automaticallyNotifiesObserversOfOutputVideoTrack = false;
        this.automaticallyNotifiesObserversOfAnnotationStyle = false;
        this.automaticallyNotifiesObserversOfBackgroundStyle = false;
        this.automaticallyNotifiesObserversOfShape = false;
        this.automaticallyNotifiesObserversOfEffect = false;
        this.automaticallyNotifiesObserversOfBackgroundPaint = false;
        this.automaticallyNotifiesObserversOfPolygonSides = false;
        this.automaticallyNotifiesObserversOfCanEnableShadow = false;
        this.automaticallyNotifiesObserversOfShadowEnabled = false;
        this.index = 0;
        this.greenScreenEstimationRequested = false;
        this.greenScreenInitialEstimation = false;

        this.chromaFilter = new ChromaFilter();
        this.wantsHybridBlur = false;

        // wantsLocalInference will be true for the local presenter,
        // it's our job to mask them when necessary
        if (wantsLocalInference == false) {
            this.wantsLocalGestureRecognizer = false;
            this.wantsLocalSegmentation = false;
            this.videoProvider.shouldProvideBuffer = false;
        }
        else {
            this.wantsLocalGestureRecognizer = true;

            if (this.usesHybridSegmentation == true) {
                this.videoProvider.shouldProvideBuffer = false;
                this.wantsLocalSegmentation = false;
            }
            else {
                this.wantsLocalSegmentation = true;
                this.videoProvider.shouldProvideBuffer = true;
                this.createSegmenter();
            }

            // if not Safari then create Worker for access to green screen parameters estimation
            if (this.segmenter === undefined && navigator.vendor.startsWith("Apple") != true) {
                this.segmenter = new WorkerSegmenter();
            }

            this.masker = new PresenterMasker(this);
        }

        this._backgroundStyle = this.defaultBackgroundStyle;
        this._shape = this.defaultShape;
        this._physicalGreenScreen = true;
        this._videoTrackEnabled = true;
        this._anchor = Stage.Object.Anchor.Center;
        this._scale = 0.8;
        // By default full frame video is being sent through WebRTC, this turns on reduced frame
        //this._usingReducedVideoFrame = true;
        this.gesture = null;
        this.annotation = null;

        this.updateVideoLayerVisibility();
        this.updateVideoLayerSize();

        this._screenName = null;
        this.app = null;
        this.networkQualityLevel = 5;
    }
    createSegmenter() {
        if (this.segmenter == null) {
            this.segmenter = new WorkerSegmenter();
        }
        return this.segmenter;
    }
    removeSegmenter() {
        var segmenter = this.segmenter;
        if (segmenter != null) {
            segmenter.destroy();
            this.segmenter = null;
        }
    }
    destroy() {
        this.removeSegmenter();
        this.inputStream = null;
        var masker = this.masker;
        if (masker != null) {
            masker.destroy();
            this.masker = null;
        }

        this.videoProvider = null;
    }
    get wantsAcceleratedRendering() {
        return false;
    }
    get usesHybridSegmentation() {
        return false;
    }
    get usesHybridBlur() {
        return this.wantsHybridBlur;
    }
    get croppable() {
        return (this.shape == Presenter.Shape.Rectangle);
    }
    newVideoProvider() {
        if (this.wantsAcceleratedRendering == true) {
            if (PresenterVideoWebCodecsProvider.supported == true) {
                return new PresenterVideoWebCodecsProvider();
            }
        }
        return new PresenterVideoElementProvider();
    }
    /** @type {PresenterVideoProvider=} */
    set videoProvider(aVideoProviderOrNull) {
        var previous = this._videoProvider;
        if (previous == aVideoProviderOrNull) {
            return;
        }

        var layer = this.layer;
        var masker = this.masker;

        if (previous != null) {
            previous.destroy();

            previous.removeObserverForProperty(this, "active");
            previous.removeObserverForProperty(this, "size");

            if (layer != null) {
                layer.videoLayer.contents = null;
            }
            if (masker != null) {
                masker.videoProvider = null;
            }
        }
        this._videoProvider = aVideoProviderOrNull;

        if (aVideoProviderOrNull == null) {
            this.videoReady = false;
            this.updateVideoLayerVisibility();
            return;
        }

        aVideoProviderOrNull.addObserverForProperty(this, "active");
        aVideoProviderOrNull.addObserverForProperty(this, "size");

        if (layer != null) {
            layer.videoLayer.contents = aVideoProviderOrNull.renderable;
            this._rebuildContentRect(); // otherwise we lose mirroring

            this.videoProviderChangedActive(aVideoProviderOrNull);
            this.updateVideoLayerSize();
        }
        if (masker != null) {
            // XXX: this would need to update layers and stuff :(
            masker.videoProvider = aVideoProviderOrNull;
        }
    }
    get videoProvider() {
        return this._videoProvider;
    }
    /*
     * Stage.Object overrides
     */
    newLayer() {
        return new PresenterLayer();
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        const foreground = this.createForegroundHelper(false);
        if (foreground != null) {
            foreground.willAttachToStage(this.stage);
        }

        const layer = this.layer;
        layer.presenter = this;

        const videoLayer = layer.videoLayer;
        videoLayer.contents = this.videoProvider.renderable;

        this._rebuildContentRect();
        this.updateVideoLayerSize();
        this.updateLayerTransform();
        this.updateLayerShadow();
    }
    didAttachToStage(stage) {
        super.didAttachToStage(stage);
        const foreground = this.foregroundHelper;
        if (foreground != null) {
            foreground.didAttachToStage(stage);
        }
    }
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);

        const layer = this.layer;
        layer.presenter = null;

        const videoLayer = layer.videoLayer;
        videoLayer.contents = null;

        const foreground = this.foregroundHelper;
        if (foreground != null) {
            foreground.willDetachFromStage(stage);
        }
    }
    didDetachFromStage(stage) {
        const foreground = this.foregroundHelper;
        if (foreground != null) {
            foreground.didDetachFromStage(stage);
            this.destroyForegroundHelper(false);
        }
    }
    createForegroundHelper(invokeAttachMethods=true) {
        this.destroyForegroundHelper(invokeAttachMethods);

        const foreground = new Presenter.Foreground();
        this.foregroundHelper = foreground;

        foreground.presenter = this;
        foreground.zIndex = this.foregroundZIndex;
        foreground.addObserverForProperty(this, "zIndex");
        foreground.addObserverForKeyPath(this, "layer.hidden");

        if (invokeAttachMethods == true) {
            const stage = this.stage;
            if (stage != null) {
                foreground.willAttachToStage(stage);
                foreground.didAttachToStage(stage);
            }
        }
        return foreground;
    }
    destroyForegroundHelper(invokeDetachMethods=true) {
        const foreground = this.foregroundHelper;
        if (foreground != null) {
            const layer = foreground.layer;
            if (layer != null && layer.superlayer != null) {
                layer.superlayer.removeSublayer(layer);
            }
            foreground.removeObserverForProperty(this, "zIndex");
            foreground.removeObserverForKeyPath(this, "layer.hidden");
            foreground.presenter = null;

            if (invokeDetachMethods == true) {
                const stage = foreground.stage;
                if (stage != null) {
                    foreground.willDetachFromStage(stage);
                    foreground.didDetachFromStage(stage);
                }
            }
            this.foregroundHelper = null;
        }
    }
    newOverlayHelper() {
        var overlayHelper = new Presenter.Overlay(this);

        var sizeButton = this.newSizeButton();
        this.sizeButton = sizeButton;
        var editButton = Stage.Object.Overlay.NewButton(
            LocalizedString("More..."),
            null,
            evt => {
                this.showEditMenu(editButton, evt);
            },
        );

        var topRightBar = Stage.Object.Overlay.NewButtonBar([sizeButton, editButton]);
        overlayHelper.setButtonBarAtPosition(topRightBar, Stage.Object.Overlay.Position.TopCenter);
        return overlayHelper;
    }
    newSizeButton() {
        var sizeButton = Stage.Object.Overlay.NewButton(
            LocalizedString("Fullscreen"),
            (this.fullscreen ? AppIcons.Collapse() : AppIcons.Expand()),
            evt => {
                this.toggleFullscreen();
                Analytics.Log("render.presenter.fullscreen", {value: this.fullscreen});
            },
        );
        return sizeButton;
    }
    /**
     * @type {Size}
     * @readonly
     */
    get preferredResolution() {
        var stage = this.stage;
        if (stage == null) {
            stage = gApp.stage;
        }
        if (stage != null) {
            return stage.size;
        }
        return Stage.DefaultSize;
    }
    /** @private */
    updateVideoLayerVisibility() {
        var videoEnabled = false;
        if (IsKindOf(this, LocalPresenter) == true) {
            videoEnabled = this.videoTrackEnabled;
        }
        else {
            videoEnabled = this.hasVideoTrack;
        }

        var videoReady = this.videoReady;

        var layer = this.layer;
        if (layer != null) {
            var hidden = (videoReady != true || videoEnabled != true);
            layer.hidden = hidden;

            var overlayHelper = this.overlayHelper;
            if (overlayHelper != null) {
                var overlayVisible = false;

                if (hidden == false && this.stage?.selectedObject == this) {
                    overlayVisible = true;
                }

                overlayHelper.visible = overlayVisible;
                overlayHelper.buttonBarsVisible = overlayVisible;
                overlayHelper.dragHandlesVisible = overlayVisible;
            }
        }
    }
    get canEnableShadow() {
        return (this.effect == null) && (
            this.backgroundStyle != Presenter.BackgroundStyle.Hide ||
            this.backgroundPaint != null
        );
    }
    set shadowEnabled(val) {
        const shadowEnabled = !!val;
        if (shadowEnabled == this.shadowEnabled) {
            return;
        }
        this._shadowEnabled = shadowEnabled;
        this.didChangeValueForProperty(shadowEnabled, "shadowEnabled");
        this.updateLayerShadow();
    }
    get shadowEnabled() {
        return this._shadowEnabled ?? false;
    }
    /** @private */
    updateLayerShadow() {
        this.didChangeValueForProperty(this.canEnableShadow, "canEnableShadow");

        const shadowEnabled = (
            this.canEnableShadow == true &&
            this.shadowEnabled == true
        );

        const layer = this.layer;
        if (layer != null) {
            layer.shadowEnabled = shadowEnabled;
        }
    }
    /** @private */
    updateVideoLayerSize() {
        const layer = this.layer;
        if (layer == null) {
            return;
        }

        const naturalSize = this.getScaledCameraSize();
        const stageSize = this.stage.size;

        // Set the video layer's size to match the camera
        const videoLayer = layer.videoLayer;

        let displaySize;
        let videoSize = null;
        const shape = this.shape;
        if (shape == Presenter.Shape.Circle) {
            var length = Math.min(naturalSize.width, naturalSize.height);
            displaySize = SizeMake(length, length);
            videoSize = naturalSize;
        }
        else if (shape == Presenter.Shape.Polygon) {
            var numberOfSides = this.polygonSides;
            var radius = Polygon.RadiusForNGonOfHeight(numberOfSides, naturalSize.height);
            var center = PointMake(naturalSize.width / 2, radius);
            var pgon = Polygon.NewNGon(numberOfSides, center, radius);
            var bbox = RectIntegral(pgon.boundingBox);
            displaySize = SizeMake(RectGetWidth(bbox), RectGetHeight(bbox));
            videoSize = naturalSize;
        }
        else {
            const cropInsets = this.cropInsets;
            displaySize = SizeMake(
                naturalSize.width * (1.0 - (cropInsets.left + cropInsets.right)),
                naturalSize.height * (1.0 - (cropInsets.top + cropInsets.bottom))
            );
        }

        // Center the presenter layer within the stage
        layer.position = PointMake(stageSize.width / 2, stageSize.height / 2);
        // Size the presenter layer
        layer.size = displaySize;

        // Center the video layer within the presenter layer
        videoLayer.position = PointMake(displaySize.width / 2, displaySize.height / 2);
        videoLayer.size = videoSize ?? displaySize;
    }
    getScaledCameraSize() {
        var provider = this.videoProvider;
        var stage = this.stage;
        if (provider == null || stage == null) {
            return Stage.DefaultSize;
        }

        var stageSize = stage.size;
        var videoSize = provider.size;
        if (SizeEquals(videoSize, SizeZero()) == true) {
            videoSize = stageSize;
        }

        var aspectFitScale = Math.min(
            stageSize.width / videoSize.width,
            stageSize.height / videoSize.height
        );

        return SizeMake(videoSize.width * aspectFitScale, videoSize.height * aspectFitScale);
    }
    //
    // PresenterVideoProvider observations
    //
    videoProviderChangedActive(provider) {
        if (provider == null) {
            provider = this.videoProvider;
        }

        var videoReady = provider.active;
        this.videoReady = videoReady;

        this.updateVideoLayerVisibility();
    }
    /*
     * Properties
     */
    /** @type {Presenter.BackgroundStyle} */
    set backgroundStyle(value) {
        let backgroundStyle = value;
        if (Object.values(Presenter.BackgroundStyle).includes(backgroundStyle) == false) {
            backgroundStyle = this.defaultBackgroundStyle;
        }
        const previous = this.backgroundStyle;
        if (backgroundStyle == previous) {
            return;
        }
        this._backgroundStyle = backgroundStyle;
        this.undoManager?.registerUndoWithTargetSlotArguments(this, "backgroundStyle", previous);
        this.didChangeValueForProperty(backgroundStyle, "backgroundStyle");

        this.segmentationRequirementsChanged();
        this.updateLayerShadow();
    }
    get backgroundStyle() {
        return this._backgroundStyle ?? this.defaultBackgroundStyle;
    }
    get defaultBackgroundStyle() {
        return Presenter.BackgroundStyle.Show;
    }
    /** @type {Presenter.Shape} */
    set shape(value) {
        let shape = value;
        if (Object.values(Presenter.Shape).includes(shape) == false) {
            shape = this.defaultShape;
        }
        const previous = this.shape;
        if (shape == previous) {
            return;
        }

        this._shape = shape;
        this.undoManager?.registerUndoWithTargetSlotArguments(this, "shape", previous);
        this.didChangeValueForProperty(shape, "shape");
        this.didChangeValueForProperty(this.croppable, "croppable");

        // Changing to/from circle causes a change in the size of the layer
        this.updateVideoLayerSize();
        this.updateLayerTransform();
        this.updateLayerShadow();
        // Changing to/from a croppable style needs the content rect rebuilt
        this._rebuildContentRect();
    }
    get shape() {
        return this._shape ?? this.defaultShape;
    }
    get defaultShape() {
        return Presenter.Shape.Rectangle;
    }
    set polygonSides(val) {
        const polygonSides = clamp(val, 3, 10);
        const previous = this.polygonSides;
        if (polygonSides == previous) {
            return;
        }
        this._polygonSides = polygonSides;
        this.didChangeValueForProperty(this.polygonSides, "polygonSides");

        // Changing to/from circle causes a change in the size of the layer
        this.updateVideoLayerSize();
    }
    get polygonSides() {
        return this._polygonSides ?? 6;
    }
    set blurAmount(value) {
        let blurAmount = value;
        if (Object.values(Presenter.BlurAmount).includes(blurAmount) == false) {
            blurAmount = this.defaultBlurAmount;
        }
        const previous = this.blurAmount;
        if (blurAmount == previous) {
            return;
        }

        this._blurAmount = blurAmount;
        this.undoManager?.registerUndoWithTargetSlotArguments(this, "blurAmount", previous);
        // Hybrid requires refreshing constraints to reflect new blur amount.
        this.updateVideoTrack();
    }
    get blurAmount() {
        return this._blurAmount ?? this.defaultBlurAmount;
    }
    get defaultBlurAmount() {
        return Presenter.BlurAmount.Small;
    }
    /** @type {Presenter.ChromaMode} */
    set chromaMode(value) {
        if (Object.values(Presenter.ChromaMode).indexOf(value) == -1) {
            console.error("Invalid chromaMode supplied: ", value);
            return;
        }
        const previous = this._chromaMode;
        if (value == previous) {
            return;
        }

        this._chromaMode = value;
        this._nextChromaEstimate = null;
        if (this._chromaMode ?? Presenter.ChromaMode.Automatic) {
            this.greenScreenInitialEstimation = true;
        }
        // This will cancel or request a green screen estimate
        // depending on overall settings (physical, chromaMode, etc)
        this.updateGreenScreenEstimationRequested();
    }
    get chromaMode() {
        return this._chromaMode ?? Presenter.ChromaMode.Automatic;
    }
    /** @type {bool} */
    set physicalGreenScreen(value) {
        value = !!value;
        if (value == this._physicalGreenScreen) {
            return;
        }

        this._physicalGreenScreen = value;

        this.segmentationRequirementsChanged();
        // This will cancel or request a green screen estimate
        // depending on overall settings (physical, chromaMode, etc)
        this.updateGreenScreenEstimationRequested();
        this.greenScreenInitialEstimation = true;
        this.didChangeValueForProperty(this.backgroundStyle, "backgroundStyle");
    }
    get physicalGreenScreen() {
        return this._physicalGreenScreen;
    }
    /** @type {string=} */
    set screenName(value) {
        this._screenName = value;
    }
    get screenName() {
        return this._screenName;
    }
    /** @type {[Stage.Object]} */
    get childObjects() {
        return [this.annotation, this.foregroundHelper].filter(obj => obj != null);
    }
    /*
     * Input Tracks & Streams
     */
    updateLocalTracks() {
        let videoTrack = null;
        let inputStream = this.inputStream;

        if (inputStream != null) {
            const videoTracks = inputStream.getVideoTracks();
            if (videoTracks.length > 0) {
                videoTrack = videoTracks[0];
            }
        }

        this.videoTrack = videoTrack;
    }
    _sanitizeInputStream(anInputStream) {
        if (anInputStream == null) {
            return;
        }

        var tracks = anInputStream.getTracks();
        if (tracks == null) {
            return;
        }

        var invalid = tracks.filter(track => {
            if (track == null) {
                return true;
            }
            var label = track.label;
            if (label != null) {
                if (label.toLowerCase().indexOf("mmhmm") != -1 || label.toLowerCase().indexOf("airtime") != -1) {
                    return true;
                }
            }
            return false;
        })

        if (invalid.length > 0) {
            console.info("Removing invalid tracks: ", invalid);

            invalid.forEach(track => {
                track.stop();
                anInputStream.removeTrack(track);
            })
        }
    }
    /** @type {MediaStream=} */
    get inputStream() {
        return this._inputStream;
    }
    set inputStream(anInputStream) {
        var previous = this._inputStream;
        if (previous == anInputStream) {
            return;
        }

        var previousTracks = null;
        if (previous != null) {
            previousTracks = previous.getTracks();
        }

        // Before updating the instance variable, if its a valid stream
        // ensure its not pointing at any mmhmm devices.  If it is,
        // stop those tracks and remove them from the stream.
        if (anInputStream != null) {
            var currentTracks = anInputStream.getTracks() ?? [];

            if (previousTracks != null) {
                var removed = previousTracks.filter(track => currentTracks.indexOf(track) == -1);
                removed.forEach(track => track.stop());
            }
            this._sanitizeInputStream(anInputStream);
        }

        this._inputStream = anInputStream;

        this.updateLocalTracks();
    }
    _dummyTrackForDeviceOfKind(device, kind) {
        var track = {
            getConstraints: function () { return null },
            kind: kind,
        };
        if (device != null) {
            track.label = device.label;
        }
        return track;
    }
    /** @type {MediaStreamTrack=} */
    get videoTrack() {
        return this._videoTrack;
    }
    set videoTrack(aVideoTrack) {
        console.info("Presenter set videoTrack: ", aVideoTrack);
        this._videoTrack = aVideoTrack;

        if (aVideoTrack != null) {
            aVideoTrack.enabled = this.videoTrackEnabled;
            aVideoTrack.addEventListener("ended", (event) => {
                if (this.videoTrack == event.target) {
                    console.info("video track ended", event, this);
                    this.videoTrackEnabled = false;
                }
            })

            aVideoTrack.addEventListener("unmute", (event) => {
                // On a Mac in the hybrid app, after the screensaver activates
                // after some interval, the built-in FaceTime camera is shut off
                // That generates a mute event.  When the screensaver is unlocked,
                // the track unmutes itself and renders fine, reports the expected
                // constraints, but has lost the native segmentation.
                // So nudge things to try and get the constraints re-applied.
                this.updateVideoTrack(true);
            });
        }

        var videoProvider = this.videoProvider;
        if (videoProvider != null) {
            videoProvider.videoTrack = aVideoTrack;
        }

        this.updateOutputVideoTrack();
        if (aVideoTrack != null) {
            // Update information if this track supports native blur
            this.updateNativeBlurSupport();
            // Now that we have a video track, we need to
            // schedule a green screen estimate if other
            // settings dictate (physical green screen, chromaMode)
            this.updateGreenScreenEstimationRequestedAfterDelay();
        }
    }
    updateNativeBlurSupport() {
        if (this.videoTrack == null || this.videoTrack.getCapabilities == null) {
            return;
        }

        const capabilities = this.videoTrack.getCapabilities();

        // Check if blurMode is available as a constraint
        if (capabilities.blurMode) {
            this.wantsHybridBlur = true;
        } else {
            this.wantsHybridBlur = false;
        }
    }
    /** @type {bool} */
    get videoTrackEnabled() {
        return this._videoTrackEnabled;
    }
    set videoTrackEnabled(enabled) {
        this._videoTrackEnabled = enabled;

        var track = this.videoTrack;
        if (enabled == false) {
            this._disableMediaStreamTrack(track);
            this.updateOutputVideoTrack();
            // Normally this would happen in set videoTrack()
            // but we don't null out the track because we'd
            // like to refer to it later when we try to enable
            // it.
            this.videoProvider.videoTrack = null;
            return;
        }

        if (track == null) {
            track = this._dummyTrackForDeviceOfKind(this.videoDevice, "video");
        }

        this._enableMediaStreamTrack(track).then(track => {
            this.videoTrack = track;
            this.updateVideoTrack();
        }).catch(err => {
            console.error("enabling video track returned error", err);
            this.requestNewInputStream();
        });
    }
    async _disableMediaStreamTrack(track) {
        if (track == null) {
            return;
        }

        track.stop();

        var inputStream = this.inputStream;
        if (inputStream == null) {
            return;
        }

        var tracks = inputStream.getTracks();
        if (tracks != null && tracks.indexOf(track) != -1) {
            inputStream.removeTrack(track);
        }
    }
    async _enableMediaStreamTrack(track) {
        if (track == null) {
            return;
        }

        let newTrack = null;
        if (track.readyState == 'live') {
            if (track.enabled == false) {
                track.enabled = true;
            }
            newTrack = track;
        }
        else {
            let constraints = track.getConstraints();
            let needNewConstraints = false;
            if (constraints == null) {
                needNewConstraints = true;
            } else {
                const numConstraints = Object.keys(constraints).length;
                if (numConstraints == 0) {
                    needNewConstraints = true;
                } else if (numConstraints == 1 && constraints.advanced != null) {
                    needNewConstraints = true;
                }
            }

            if (needNewConstraints == true && track.kind == "video") {
                const device = this.videoDevice;
                let deviceId = null;
                if (device != null && device.label == track.label) {
                    deviceId = device.deviceId;
                }

                const newConstraints = this.defaultUserMediaConstraints(deviceId);
                if (constraints != null) {
                    constraints = Object.assign(constraints, newConstraints);
                } else {
                    constraints = newConstraints;
                }
            }

            newTrack = await this.requestNewUserMediaTrackWithConstraints(track.kind, constraints);
        }


        var inputStream = this.inputStream;
        if (newTrack != null && inputStream != null) {
            inputStream.addTrack(newTrack);
        }
        return newTrack;
    }
    /*
     * Output Tracks (for Teleport)
     */
    /**
     * @type {MediaStreamTrack=}
     * @readonly
     */
    get outputVideoTrack() {
        if (this.videoTrackEnabled == false) {
            return null;
        }
        if (this.shouldUseMaskerOutput == true) {
            return this.masker.outputTrack;
        }
        return this.videoTrack;
    }
    get shouldUseMaskerOutput() {
        return this._shouldUseMaskerOutput;
    }
    styleRequiresMasking() {
        if (this.physicalGreenScreen == true) {
            // The other end can de-chroma it
            return false;
        }
        if (this.backgroundPaint == null && this.backgroundStyle == Presenter.BackgroundStyle.Show) {
            // We're revealing the full camera frame without tinting it
            // so we can send it as-is
            return false;
        }
        // Everything else needs the masker, as it needs the segmentation mask data:
        // Hidden bg w/o a color needs to replace the background with a fake green screen
        // Shown bg with a color needs to tint the background locally with the mask data
        // Blurred bg needs to blur the background locally with the mask data
        return true;
    }
    updateOutputVideoTrack() {
        // TODO The Mac app now sends BGRA most of the time
        //      Check the video track format and see if we need to to bother masking
        if (this._usingReducedVideoFrame === true || // So that the output video can be scaled
            this.styleRequiresMasking() == true ||   // We likely need to paint a fake greenscreen
            this.usesHybridSegmentation == true)     // On Mac the video comes through as NV12A which confuses WebRTC
        {
            this._shouldUseMaskerOutput = true;
        }
        else {
            this._shouldUseMaskerOutput = false;
        }

        this.didChangeValueForProperty(null, "outputVideoTrack");
    }
    /*
     * Functions
     */
    /**
     * @private
     */
    /** @private */
    updateVideoTrack(forcibly = false) {
        if (this.usesHybridSegmentation == false) {
            return;
        }

        if (this.videoTrackEnabled == false) {
            return;
        }

        const videoTrack = this.videoTrack;
        if (videoTrack == null) {
            // We were probably invoked too early
            return;
        }

        let constraints = null;
        if (forcibly == true) {
            constraints = {};
        }
        else {
            constraints = videoTrack.getConstraints();
        }

        const { targetHybridSegmentationMode: wantedSegmentationMode, targetHybridBlurMode: wantedBlurMode } = this;

        let needSegmentationUpdate = true;
        let needBlurModeUpdate = true;

        if (constraints.advanced) {
            needSegmentationUpdate = !constraints.advanced.some(entry => entry.segmentationMode === wantedSegmentationMode);
            needBlurModeUpdate = !constraints.advanced.some(entry => entry.blurMode === wantedBlurMode);
        }

        // If constraints are up-to-date, return early
        if (!needBlurModeUpdate && !needSegmentationUpdate) return;

        // New constraints with only the necessary updates
        const newConstraints = { advanced: [] };

        if (needSegmentationUpdate) {
            newConstraints.advanced.push({ segmentationMode: wantedSegmentationMode });
        }

        if (needBlurModeUpdate) {
            newConstraints.advanced.push({ blurMode: wantedBlurMode });
        }

        videoTrack.applyConstraints(newConstraints).catch(err => {
            console.error("Error applying video track constraints", newConstraints, err);
        })
    }
    // Often times when a camera is first connected to, the initial
    // frames are black or dimmed.  This waits a second before invoking
    // updateGreenScreenEstimationRequested in hopes that the video will
    // be stable by then.
    updateGreenScreenEstimationRequestedAfterDelay() {
        let requestTimeout = this.greenScreenEstimationRequestTimeout;
        if (requestTimeout != null) {
            window.clearTimeout(requestTimeout);
        }
        requestTimeout = window.setTimeout(() => {
            if (this.chromaMode == Presenter.ChromaMode.Automatic) {
                this.greenScreenInitialEstimation = true;
            }
            this.updateGreenScreenEstimationRequested();
            this.greenScreenEstimationRequestTimeout = null;
        }, 1000);
        this.greenScreenEstimationRequestTimeout = requestTimeout;
    }
    /*
     The green screen parameters will be estimated for the next frame.
     The parameters will be immediately applied to the chromaFilter.
     */
    updateGreenScreenEstimationRequested() {
        this.stopGreenScreenEstimationTimer();

        if (this.physicalGreenScreen == true &&
            this.chromaMode == Presenter.ChromaMode.Automatic &&
            this.canEstimateGreenScreen == true) {
            this.greenScreenEstimationRequested = true;
        }
        else {
            this.greenScreenEstimationRequested = false;
            this.greenScreenInitialEstimation = false;
        }
    }
    startGreenScreenEstimationTimerIfNecessary() {
        this.stopGreenScreenEstimationTimer();
        if (this.physicalGreenScreen == false ||
            this.canEstimateGreenScreen == false ||
            this.chromaMode != Presenter.ChromaMode.Automatic)
        {
            return;
        }

        this.greenScreenEstimationTimer = window.setTimeout(() => {
            this.updateGreenScreenEstimationRequested();
        }, 60000); // 60s, 1m
    }
    stopGreenScreenEstimationTimer() {
        const greenScreenEstimationTimer = this.greenScreenEstimationTimer;
        if (greenScreenEstimationTimer != null) {
            window.clearTimeout(greenScreenEstimationTimer);
            this.greenScreenEstimationTimer = null;
        }
    }
    get canEstimateGreenScreen() {
        return this.segmenter?.canEstimateGreenScreen ?? false;
    }

    segmentationRequirementsChanged() {
        let segmentationRequired = false;
        if (this.physicalGreenScreen == false) {
            if (this.backgroundStyle != Presenter.BackgroundStyle.Show) {
                // Hide and Blur absolutely need segmentation
                segmentationRequired = true;
            }
            else if (this.backgroundPaint != null) {
                // Show with a paint needs it
                segmentationRequired = true;
            }
            else if (this.forceSegmentationForAlpha == true) {
                // LUT/Tune alpha mode needs segmentation for foreground/background targeting
                segmentationRequired = true;
            }
            else {
                const fgHidden = this.foregroundHelper?.layer?.hidden ?? true;
                if (fgHidden == false) {
                    // If we're showing the background and not painting it
                    // then we only need it if there is media sandwiched
                    // between the background and foreground
                    segmentationRequired = true;
                }
            }
        }

        this.segmentationRequired = segmentationRequired;

        // For the hybrid app, we need to update the constraints on the video
        // to turn segmentation on/off
        this.updateVideoTrack();
        // If we're on a call, the PresenterMasker may be needed / no longer needed
        // so we need to update the track we feed into WebRTC
        this.updateOutputVideoTrack();
    }

    /**
     * Check if we need JS segmentation fallback in hybrid mode.
     * Returns true when forceSegmentationForAlpha is needed but camera doesn't provide segmentation.
     */
    needsJSSegmentationFallback() {
        if (this.forceSegmentationForAlpha == false) {
            return false;
        }
        if (this.usesHybridSegmentation == false) {
            return false;
        }
        // Check if camera is actually providing segmentation
        const settings = this.videoTrack?.getSettings?.();
        return settings?.segmentationMode !== 'silhouette';
    }

    prepareForNextFrame(timestamp) {
        if (this.videoReady == false) {
            return;
        }

        var videoProvider = this.videoProvider;
        if (videoProvider == null) {
            return;
        }

        var contentsNeedUpdate = videoProvider.render(timestamp);
        if (contentsNeedUpdate == false) {
            return;
        }

        var renderable = videoProvider.renderable;

        var videoLayer = this.layer.videoLayer;
        var previousRenderable = videoLayer.contents;
        // If there is a new renderable then we can safely close video frame of the old one.
        // For Windows when frames are I420 there can only be 2 video frames open so in
        // order to get 30 fps frame-rate we need to close the old one as fast as possible.
        if (renderable != previousRenderable) {
            videoProvider.detachFrame(previousRenderable);
        }

        if (this.wantsLocalGestureRecognizer == true) {
            var gestureRecognizer = this.gestureRecognizer;
            if (gestureRecognizer != null) {
                videoProvider.protect(renderable);
                gestureRecognizer.render(renderable, timestamp).finally(() => {
                    videoProvider.unprotect(renderable);
                });
            }
        }

        var wantsLocalSegmentation = this.wantsLocalSegmentation;

        var usingVirtualGreenscreen = this.segmentationRequired;
        var maskerNeedsRender = (
            this.maskerNeedsRender && this.shouldUseMaskerOutput
        );

        if (this.greenScreenEstimationRequested === true)
        {
            const canProvideBuffer = videoProvider.canProvideBuffer;
            if (canProvideBuffer == true && videoProvider.shouldProvideBuffer === false) {
                videoProvider.shouldProvideBuffer = true;
            }
            else {
                if (canProvideBuffer == true && renderable.layout == null) {
                    console.info("Green screen estimate waiting for renderable buffer");
                }
                else {
                    this.greenScreenEstimationRequested = false;
                    this.segmenter.estimateGreen(renderable, timestamp, this.greenScreenInitialEstimation, this.cropInsets).then(params => {
                        // Seglib returned estimation results and condifence. We should react to those values.
                        // Any score below 50% should be considered as not valid.
                        if (params.result.confidence < 50.0) {
                            // In case it was initial estimation, show prompt and stop auto-adjust.
                            if (params.result.session_start === true) {
                                console.error(`Can't start auto-adjust session due to low scoring: ${params.result.confidence}`);
                                this.chromaMode = Presenter.ChromaMode.Manual;
                                ShowAlertView(
                                    LocalizedString("Green screen"),
                                    LocalizedString('We were unable to automatically adjust settings for your green screen. Please visit our <a href="https://help.airtime.com/hc/articles/360052332593" target="_blank">help center</a> for more information.')
                                );
                            } else {
                                // In case it was another estimation during auto-adjust session, we should
                                // just ignore this estimation to not interrupt User experience.
                                // We will evaluate next estimation according to schedule.
                                console.info(`Skipping auto-adjust re-estimation due to low scoring: ${params.result.confidence}`);
                                this.startGreenScreenEstimationTimerIfNecessary();
                            }
                        }
                        else {
                            const newKeyRGB = [params.colors.red, params.colors.green, params.colors.blue];
                            newKeyRGB[0] /= 255.0;
                            newKeyRGB[1] /= 255.0;
                            newKeyRGB[2] /= 255.0;
                            this.chromaFilter.keyRGB = newKeyRGB;
                            this.chromaFilter.rangeLow = params.thresholds.lower / 255.0;
                            this.chromaFilter.rangeHigh = params.thresholds.upper / 255.0;

                            // If we're in automatic mode, setup a timer to periodically
                            // update the estimation.
                            this.startGreenScreenEstimationTimerIfNecessary();
                        }
                    })
                    .catch(err => {
                        console.error("Green screen estimation failed", err);
                    })
                    this.greenScreenInitialEstimation = false;
                }
            }
        }

        // If we don't need local segmentation,
        // render the renderable as-is
        if (usingVirtualGreenscreen == false ||
            wantsLocalSegmentation == false)
        {
            const shouldProvideBuffer = (
                // respect green estimation request
                this.greenScreenEstimationRequested ||
                // For the hybrid apps, the browser will premultiply the alpha
                // when converting from NV12/I420, which breaks the new background
                // hidden mode.  So we need to request copying into a local buffer
                // where we can manually perform the conversion to keep the data
                // we need.
                // TODO: we need to figure out z-index in the new world
                (this.backgroundHidden == true && this.usesHybridSegmentation == true)
            );
            this.videoProvider.shouldProvideBuffer = shouldProvideBuffer;

            if (renderable != videoLayer.contents) {
                videoLayer._setContentsAddingListener(renderable, false);
            }
            else {
                videoLayer.contentsNeedUpdate = true;
            }
            // For Windows hybrid builds, segmentation is done
            // natively, but we may need to feed the masker
            // for WebRTC
            if (maskerNeedsRender == true) {
                var useScale = 1.0;
                if (this._usingReducedVideoFrame === true) {
                    useScale = this.scale;
                }
                this.masker.render(renderable, null, useScale);
            }
            return;
        }
        this.videoProvider.shouldProvideBuffer = true;
        videoProvider.protect(renderable);

        var segmenter = this.segmenter;
        if (segmenter == null) {
            segmenter = this.createSegmenter();
        }
        segmenter.render(renderable, timestamp).then(mask => {
            var usingVirtualGreenscreen = this.segmentationRequired;
            if (mask == null || usingVirtualGreenscreen == false) {
                if (renderable.destroy != null) {
                    renderable.destroy();
                }
                return;
            }

            var videoLayer = this.layer.videoLayer;
            if (renderable != videoLayer.contents) {
                videoLayer._setContentsAddingListener(renderable, false);
            }
            else {
                videoLayer.contentsNeedUpdate = true;
            }

            videoLayer.mask = mask;
            videoLayer.maskNeedsUpdate = true;

            if (maskerNeedsRender == true) {
                var useScale = 1.0;
                if (this._usingReducedVideoFrame === true) {
                    useScale = this.scale;
                }
                this.masker.render(renderable, mask, useScale);
            }
        }).catch(err => {
            // Should these errors be reported? they'd flood things...
            if (renderable.destroy != null) {
                renderable.destroy();
            }
        }).finally(() => {
            videoProvider.unprotect(renderable);
        });
    }
    naturalSizeForLayer(layer) {
        return layer.size;
    }
    /** @private */
    _rebuildContentRect() {
        const layer = this.layer;
        if (layer == null) {
            return;
        }

        layer.videoLayer.contentRect = this.contentRectFromCropInsets();
    }
    contentRectFromCropInsets() {
        let contentRect = super.contentRectFromCropInsets();
        if (this.mirrorVideo == true) {
            contentRect.width = -contentRect.width;
            contentRect.x = 1.0 - contentRect.x;
        }
        return contentRect;
    }
    _cropInsetsChanged() {
        this.updateVideoLayerSize();
        this.updateLayerTransform();
        this._rebuildContentRect();
    }
    /*
     * Properties
     */
    willChangeEffect() {
        var previous = this.effect;
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'effect', previous);
        if (previous != null) {
            var params = previous.parameters;
            if (params != null) {
                for (var key in params) {
                    previous.removeObserverForProperty(this, key);
                }
            }
        }
    }
    didChangeEffect() {
        var effect = this.effect;
        if (effect != null) {
            var params = effect.parameters;
            if (params != null) {
                for (var key in params) {
                    effect.addObserverForProperty(this, key);
                }
            }
        }
    }
    /** @type {RenderFilter=} */
    set effect(anEffect) {
        var previous = this._effect;
        if (previous?.identifier == anEffect?.identifier) {
            return;
        }

        this.willChangeEffect();
        this._effect = anEffect;
        this.didChangeEffect();

        var layer = this.layer.videoLayer;
        var filters = layer.filters;
        if (filters == null) {
            filters = [];
        }
        if (previous != null) {
            var index = filters.indexOf(previous);
            if (index != null) {
                filters.splice(index, 1);
            }
        }

        if (anEffect != null) {
            filters.push(anEffect);
        }
        layer.filters = filters;
        this.didChangeValueForProperty(this.effect, "effect");
        this.updateLayerShadow();
    }
    get effect() {
        return this._effect;
    }
    /** @type {number} */
    set enhancement(anEnhancementValue) {
        var enhancement = clamp(anEnhancementValue, 0.0, 1.0);
        var previous = this._enhancement;
        if (previous == enhancement) {
            return;
        }

        this._enhancement = enhancement;
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'enhancement', previous);
    }
    get enhancement() {
        return this._enhancement ?? 0;
    }
    set backgroundPaint(value) {
        var previous = this._backgroundPaint;
        if (EqualObjects(value, previous) == true) {
            return;
        }

        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'backgroundPaint', previous);
        this._backgroundPaint = value;

        this.didChangeValueForProperty(this.backgroundPaint, "backgroundPaint");

        this.segmentationRequirementsChanged();
        this.updateLayerShadow();
    }
    get backgroundPaint() {
        return this._backgroundPaint;
    }
    /** @type {bool} */
    set mirrorVideo(aMirrorValue) {
        aMirrorValue = !!aMirrorValue;
        var previous = this._mirrorVideo;
        if (aMirrorValue == this._mirrorVideo) {
            return;
        }
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'mirrorVideo', previous);
        this._mirrorVideo = aMirrorValue;
        this._rebuildContentRect();
    }
    get mirrorVideo() {
        return (this._mirrorVideo ?? false);
    }
    /** @type {number} */
    set zIndex(val) {
        const previous = this.zIndex;
        if (previous == val) {
            return;
        }
        super.zIndex = val;
        this.zIndicesChanged();
    }
    get zIndex() {
        return super.zIndex ?? Slide.Modern.DefaultPresenterZIndices.Background;
    }
    /** @type {number} */
    set foregroundZIndex(val) {
        const previous = this.foregroundZIndex;
        if (previous == val) {
            return;
        }

        this._foregroundZIndex = val;
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'foregroundZIndex', previous);
        const foregroundHelper = this.foregroundHelper;
        if (foregroundHelper != null) {
            foregroundHelper.zIndex = val;
        }
        this.zIndicesChanged();
    }
    get foregroundZIndex() {
        return this._foregroundZIndex ?? Slide.Modern.DefaultPresenterZIndices.Foreground;
    }
    zIndicesChanged() {
        const fg = this.foregroundZIndex;
        const bg = this.zIndex;
        if (bg > fg) {
            this.zIndex = fg;
            this.foregroundZIndex = fg + 1;
        }
    }
    /** @type {Object<string,any>=} */
    set gesture(aGesture) {
        this._gesture = aGesture;
        this._updateGestureLayer();
    }
    get gesture() {
        return this._gesture;
    }
    _updateGestureLayer() {
        var layer = this.layer;
        if (layer == null) {
            return;
        }

        var gestureLayer = layer.gestureLayer;
        var gesture = this.gesture;
        if (gesture == null) {
            gestureLayer.gesture = null;
            gestureLayer.hidden = true;
        }
        else {
            if (gestureLayer.gesture == null) {
                gestureLayer.hidden = false;
            }
            gestureLayer.gesture = gesture;
        }
    }
    /** @type {Media.Annotation.Style=} */
    set annotationStyle(anAnnotationStyle) {
        const previous = this._annotationStyle;
        if (previous == anAnnotationStyle) {
            return;
        }
        this._annotationStyle = anAnnotationStyle;

        let annotation = null;
        if (anAnnotationStyle != null) {
            const styleObj = Media.Annotation.StyleWithID(anAnnotationStyle);
            if (styleObj == null) {
                console.error("Couldn't find annotation with id: ", anAnnotationStyle);
            }
            else {
                annotation = new Media.Annotation(createUUID(), this.identifier, styleObj);
            }
        }
        this.annotation = annotation;

        this.didChangeValueForProperty(anAnnotationStyle, "annotationStyle");
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'annotationStyle', previous);
    }
    get annotationStyle() {
        return this._annotationStyle;
    }
    /*
     * Events
     */
    addPointerEventListener(listener) {
        var peListeners = this.peListeners;
        if (peListeners == null) {
            peListeners = [];
            this.peListeners = peListeners;
        }
        peListeners.push(listener);
    }
    removePointerEventListener(listener) {
        var peListeners = this.peListeners;
        if (peListeners != null) {
            var index = peListeners.indexOf(listener);
            if (index != -1) {
                peListeners.splice(index, 1);
            }
            if (peListeners.length == 0) {
                this.peListeners = null;
            }
        }
    }
    handleWillBeginTracking(handle) {
        super.handleWillBeginTracking(handle);

        const peListeners = this.peListeners;
        if (peListeners != null) {
            const event = {};
            peListeners.forEach(listener => listener.onPointerDown(event));
        }
    }
    handleWillEndTracking(handle) {
        super.handleWillEndTracking(handle);

        const peListeners = this.peListeners;
        if (peListeners != null) {
            const event = {};
            peListeners.forEach(listener => listener.onPointerUp(event));
        }
    }
    /*
     * @param {StageEvent} event
     */
    onPointerDown(event) {
        super.onPointerDown(event);

        var peListeners = this.peListeners;
        if (peListeners != null) {
            peListeners.forEach(listener => listener.onPointerDown(event));
        }
    }
    /*
     * @param {StageEvent} event
     */
    onPointerMove(event) {
        super.onPointerMove(event);

        var peListeners = this.peListeners;
        if (peListeners != null) {
            peListeners.forEach(listener => listener.onPointerMove(event));
        }
    }
    /*
     * @param {StageEvent} event
     */
    onPointerUp(event) {
        super.onPointerUp(event);

        var peListeners = this.peListeners;
        if (peListeners != null) {
            peListeners.forEach(listener => listener.onPointerUp(event));
        }
    }
    /*
     * @param {StageEvent} event
     */
    onMouseWheel(event) {
        if (event.ctrlKey == false) {
            var deltaY = event.deltaY / Stage.Object.MouseWheelDivisor;
            this.opacity += deltaY;
        }
        else {
            super.onMouseWheel(event);
        }
    }
    /*
     * Alignment grids for moving
     */
    newAlignmentGrid(size) {
        const anchorInset = 0;
        return new AlignmentGrid(size.width, size.height, anchorInset);
    }
    /*
     * KVO
     */
    observePropertyChanged(obj, key, val) {
        if (obj == this.videoProvider) {
            if (key == "active") {
                this.videoProviderChangedActive(obj);
            }
            else if (key == "size") {
                this.updateVideoLayerSize(obj);
            }
        }
        else if (obj == this.foregroundHelper) {
            if (key == "zIndex") {
                this.foregroundZIndex = obj.zIndex;
            }
            else {
                this.segmentationRequirementsChanged();
            }
        }
        else if (obj == this.effect) {
            // Do nothing. We used to persist effect settings in defaults,
            // but that's now handled at the application layer, not the
            // presenter layer.
            return;
        } else if (obj == this.chromaFilter) {
            var effect = {};
            effect[key] = val;
            effect.id = obj.identifier;

            // Crude hack to get effect settings to persist
            // in the user defaults cookie...
            key = "chroma";
            obj = obj.toJSON();

            SharedUserDefaults.setValueForKey(obj, key)
        }
        else {
            super.observePropertyChanged(obj, key, val);
        }
    }
    /*
     *
     */
    mediaKeys() {
        return [
            "effect", "backgroundStyle", "shape", "anchor", "center",
            "fullscreen", "opacity", "scale", "rotation", "enhancement",
            "backgroundPaint", "cropInsets", "zIndex", "blurAmount",
            "shadowEnabled"
        ];
    }
    persistenceKeys(forEventKeys=false) {
        // We don't want to persist zIndex... but eventKeys needs it...
        var keys = this.mediaKeys();
        if (forEventKeys != true) {
            const keysToRemove = ["fullscreen", "zIndex"];
            keysToRemove.forEach(key => {
                const index = keys.indexOf(key);
                if (index != -1) {
                    keys.splice(index, 1);
                }
            })
        }

        keys = keys.concat([
            "mirrorVideo", "physicalGreenScreen",
            "screenName", "chromaMode",
        ]);

        return keys;
    }
    eventKeys() {
        return this.persistenceKeys(true).concat([
            "gesture", "avatarURL", "index", "app", "annotationStyle"
        ]);
    }
    /**
     * @param {Object<string,any>} event The network event to apply
     * @param {UUID=} sender The initiator/sender of the event
     */
    applyEvent(event, sender) {
        var valid = this.eventKeys();
        for (var key in event) {
            var val = event[key];
            if (key == "chroma") {
                this.chromaFilter.applyEvent(val);
                continue;
            }
            else if (key == "backgroundColor") {
                // Legacy inter-op
                if (val == null) {
                    this.backgroundPaint = null;
                }
                else {
                    this.backgroundPaint = new Paint.Color(val);
                }
                continue;
            }
            else if (key == "backgroundPaint") {
                if (val != null) {
                    val = Paint.FromJSON(val);
                }
                this.backgroundPaint = val;
                continue;
            }

            if (valid.indexOf(key) == -1) {
                continue;
            }

            if (key == "effect") {
                debugger;
                if (val != null) {
                    var id = val.id;
                    if (id != null && this.effect != null && id == this.effect.identifier) {
                        this.effect.applyEvent(val);
                        continue;
                    }
                    var effect = NewFilterWithID(id);
                    if (effect == null) {
                        console.error("Unable to get a filter with the id: ", id);
                        val = null;
                    }
                    else {
                        effect.applyEvent(val);
                        val = effect;
                    }
                }
            }
            this[key] = val;
        }
    }
    toJSON() {
        var result = {};
        var keys = this.eventKeys();
        for (var idx = 0; idx < keys.length; idx += 1) {
            var key = keys[idx];
            var val = this[key];
            if (key == "effect" && val != null) {
                val = val.toJSON();
            }
            result[key] = val;
        }
        return result;
    }
    /*
     * Cloudy
     */
    migrateLegacyStyleWithBackgroundColor(style, backgroundColor) {
        let shape = null;
        let backgroundStyle = null;
        switch (style) {
            case 'silhouette':
                shape = Presenter.Shape.Rectangle;
                backgroundStyle = Presenter.BackgroundStyle.Hide;
                backgroundColor = null;
                break;
            case 'circle':
                shape = Presenter.Shape.Circle;
                backgroundStyle = (backgroundColor == null ?
                    Presenter.BackgroundStyle.Show :
                    Presenter.BackgroundStyle.Hide
                );
                break;
            case 'rectangle':
            default:
                shape = Presenter.Shape.Rectangle;
                backgroundStyle = (backgroundColor == null ?
                    Presenter.BackgroundStyle.Show :
                    Presenter.BackgroundStyle.Hide
                );
                break;
        }
        return { shape, backgroundStyle, backgroundColor };
    }
    decodeMediaContent(content) {
        const success = super.decodeMediaContent(content);
        if (success == false) {
            return false;
        }

        const foregroundZIndex = content.foregroundZIndex;
        if (foregroundZIndex != null) {
            this.foregroundZIndex = foregroundZIndex;
        }

        var backgroundColor = content.backgroundColor;

        var shape = content.shape;
        var backgroundStyle = content.backgroundStyle;
        if (shape == null || backgroundStyle == null) {
            var migrated = this.migrateLegacyStyleWithBackgroundColor(content.style, backgroundColor);
            shape = migrated.shape;
            backgroundStyle = migrated.backgroundStyle;
            backgroundColor = migrated.backgroundColor;
        }

        this.shape = shape;
        this.backgroundStyle = backgroundStyle;
        this.blurAmount = content.blurAmount ?? this.defaultBlurAmount;

        const style = content.style;
        if (style != null) {
            this.style = style;
        }

        // null is a valid background color (no color), so always set
        // this.backgroundColor even if content.backgroundColor is null
        const paintJSON = content.backgroundPaint;
        let backgroundPaint = null;
        if (paintJSON != null) {
            backgroundPaint = Paint.FromJSON(paintJSON);
        }
        else {
            const backgroundColor = content.backgroundColor;
            if (backgroundColor != null) {
                backgroundPaint = new Paint.Color(backgroundColor);
            }
        }
        this.backgroundPaint = backgroundPaint;

        // No BigHands in Camera
        this.gestureRecognizer = null;

        this.shadowEnabled = !!content.shadowEnabled;

        this.annotationStyle = content.annotationStyle;
        return true;
    }
    decodeFromModernRecord(record, endpoint) {
        var success = super.decodeFromModernRecord(record, endpoint);
        if (success == false) {
            return false;
        }

        // Check for legacy bits to migrate
        var offset = record.decodeProperty("offset", Object, null);
        var anchorPoint = record.decodeProperty("anchorPoint", Object, null);
        if (offset == null && anchorPoint == null) {
            // Nothing to do
            return true;
        }

        // And the corresponding new bits
        var anchor = record.decodeProperty("anchor", Object, null);
        var center = record.decodeProperty("center", Object, null);
        if (center != null && anchor != null) {
            // Seems like they've already been migrated
            return true;
        }

        // Anchor nearly maps from point to enum
        if (anchorPoint != null) {
            anchor = Stage.Object.AnchorForPoint(anchorPoint);
        }
        else {
            anchor = null;
        }

        if (offset != null) {
            if (anchorPoint != null) {
                // Except that the "none" anchor was represented by 0.5 x 0.5
                // Which we use to represent center anchor.  So check
                // the center-offset, and if its not zero then switch to no anchor
                if (PointEquals(offset, PointZero()) != true &&
                    PointEquals(anchorPoint, PointMake(0.5, 0.5)) == true)
                {
                    anchor = Stage.Object.Anchor.None;
                }
            }

            // We may not have a layer to consult with for size
            // And the old centers were based on 1080p, so use that..
            var size = Stage.DefaultSize;
            var half = SizeMake(size.width / 2, size.height / 2);
            this.center = PointMake(offset.x - half.width, offset.y - half.height);
        }

        if (anchor != null) {
            this.anchor = anchor;
        }
        return true;
    }
    encodeToModernRecord(record) {
        var id = record.id;
        super.encodeToModernRecord(record);
        record.id = id;
        record.encodeProperty("anchorPoint", null);
        record.encodeProperty("offset", null);
    }
    encodeMediaContent() {
        var content = super.encodeMediaContent();
        content.local = true;
        content.bigHands = (this.gestureRecognizer != null);
        content.faceTracking = false;
        content.shape = this.shape;
        content.backgroundStyle = this.backgroundStyle;
        content.backgroundPaint = this.backgroundPaint?.toJSON();
        content.annotationStyle = this.annotationStyle;
        content.foregroundZIndex = this.foregroundZIndex;
        content.blurAmount = this.blurAmount;
        content.shadowEnabled = this.shadowEnabled;
        return content;
    }
    /*
     * Avatars
     */
    /** @type {string=} */
    set avatarURL(anAvatarURL) {
        this._avatarURL = anAvatarURL;
    }
    get avatarURL() {
        var avatarURL = this._avatarURL;
        if (avatarURL != null) {
            return avatarURL;
        }

        var identifier = this.identifier;
        if (identifier == null) {
            identifier = "";
        }

        return "assets/avatars/avatar-generic-thumbnail.png";
    }
}

/** @enum */
Presenter.BackgroundStyle = Object.freeze({
    Show: 'show',
    Hide: 'hide',
    Blur: 'blur',
});

/** @enum */
Presenter.BlurAmount = Object.freeze({
    Small: 'small',
    Large: 'large',
});

/** @enum */
Presenter.Shape = Object.freeze({
    Circle: 'circle',
    Rectangle: 'rectangle',
    Polygon: 'polygon',
});

/** @enum */
Presenter.ChromaMode = Object.freeze({
    Manual: 'manual',
    Automatic: 'automatic'
});

Object.defineProperty(Presenter, "ClassIdentifier", {
    value: "presenter",
    writable: false
});

Object.defineProperty(Presenter, "Title", {
    value: LocalizedString("Presenter"),
    writable: false
});
