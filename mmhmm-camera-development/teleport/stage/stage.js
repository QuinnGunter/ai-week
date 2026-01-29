//
//  stage.js
//  mmhmm
//
//  Created by Steve White on 7/12/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

/**
 * @extends {ObservableObject}
 */
class Stage extends ObservableObject {
    constructor(canvas, resolution = Stage.Resolution.High, interactive = true) {
        super();

        var renderer = new Renderer(canvas);
        this.renderer = renderer;
        this.canvas = canvas;

        this.automaticallyNotifiesObserversOfPresenters = false;
        this.automaticallyNotifiesObserversOfRoom = false;
        this.automaticallyNotifiesObserversOfSlide = false;
        this.automaticallyNotifiesObserversOfEffect = false;
        this.automaticallyNotifiesObserversOfMedia = false;
        this.automaticallyNotifiesObserversOfCanvasWindowScale = false;
        this.automaticallyNotifiesObserversOfIsVirtualCameraActive = false;

        var rootLayer = renderer.rootLayer;

        var makeLayer = function() {
            var layer = new RenderLayer();
            layer.frame = rootLayer.frame;
            layer.userInteractionEnabled = true;
            rootLayer.addSublayer(layer);
            return layer;
        }

        var foregroundLayer = makeLayer();
        this.foregroundLayer = foregroundLayer;

        this.annotationsLayer = makeLayer();
        this.annotationsLayer.zIndex = 10;
        this.annotationsLayer.hidden = true;

        this.overlay = document.getElementById("stage_overlay");
        if (this.overlay != null) {
            this.overlayResizeObserver = new ResizeObserver(entries => {
                this.didChangeValueForProperty(null, "canvasWindowScale");
            });
            this.overlayResizeObserver.observe(this.overlay);
        }

        this._audioElements = [];
        this.automaticallyNotifiesObserversOfAudioElements = false;
        this.automaticallyNotifiesObserversOfCanvasWindowScale = false;

        if (interactive == true) {
            this.eventHandler = new Stage.EventHandler(this);
        }

        this.resolution = SharedUserDefaults.getValueForKey(Stage.PreferenceKeys.Resolution, resolution);

        this._slide = null;
        this._media = [];

        if (App.isHybrid == true) {
            this.setupVirtualCamera(window.MmhmmCamera);
        }
    }
    destroy() {

        this.room = null;
        this.slide = null;
        this.presenters.forEach(presenter => {
            this.removePresenter(presenter, "destroyed");
        });

        // The canvas will have a frozen frame at this point
        // So we'll swap it out with an empty canvas to get
        // it back into a transparent state
        var oldCanvas = this.canvas;
        var newCanvas = oldCanvas.cloneNode();
        oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);

        var eventHandler = this.eventHandler;
        if (eventHandler != null) {
            eventHandler.destroy();
            eventHandler = null;
        }
        var overlayResizeObserver = this.overlayResizeObserver;
        if (overlayResizeObserver != null) {
            overlayResizeObserver.disconnect();
            this.overlayResizeObserver = null;
        }
    }
    /*
     * Hybrid app virtual camera
     */
    setupVirtualCamera(camera) {
        if (camera == null || this.vcam != null) {
            return;
        }

        // Connect canvas capture stream to virtual cam
        this.startVirtualCamera();

        // Parse the virtual camera connect/disconnect data the hybrid app gives us
        // into properties that we want to include in analytics events
        let connectTime = null;
        var getAnalyticsProperties = (userInfoString, isConnect) => {
            var userInfo = null;
            if (userInfoString.constructor == Object) {
                userInfo = userInfoString;
            }
            else if (userInfoString.constructor == String) {
                try {
                    userInfo = JSON.parse(userInfoString);
                } catch (e) {
                    // TODO (eslint, no-empty): add comment explaining why this is empty
                }
            }

            let properties = {};
            if (userInfo != null && userInfo.appID != null) {
                properties.bundle_id = userInfo.appID;
            }

            if (isConnect) {
                connectTime = connectTime || Date.now();
            } else if (connectTime) {
                properties.duration = (Date.now() - connectTime) / 1000;
                connectTime = null;
            }

            return properties;
        };

        // Setup virtual camera consumer notifications
        // The ConsumerConnected and ConsumerDisconnected events are sent by the hybrid app
        // and are deprecated - the hybrid app now make its own calls directly to Mixpanel to
        // track virtual camera analytics.
        NotificationCenter.default.addObserver("VirtualCamera.ConsumerConnected", null, (userInfo) => {
            Analytics.Log("camera.app.connected", getAnalyticsProperties(userInfo, true));
            window.setTimeout(() => {
                this.didChangeValueForProperty(this.isVirtualCameraActive, "isVirtualCameraActive");
            }, 100);
        })
        NotificationCenter.default.addObserver("VirtualCamera.ConsumerDisconnected", null, (userInfo) => {
            Analytics.Log("camera.app.disconnected", getAnalyticsProperties(userInfo, false));
            window.setTimeout(() => {
                this.didChangeValueForProperty(this.isVirtualCameraActive, "isVirtualCameraActive");
            }, 100);
        });
        // The CameraActive event is new as of September 2024 and allows us to know when the
        // camera's state may have changed.
        NotificationCenter.default.addObserver("VirtualCamera.CameraActive", null, () => {
            window.setTimeout(() => {
                this.didChangeValueForProperty(this.isVirtualCameraActive, "isVirtualCameraActive");
            }, 100);
        });
    }
    startVirtualCamera(resolution) {
        if (window.MmhmmCamera == null) {
            return;
        }

        if (resolution != null) {
            var normal = Stage.DefaultSize;
            var scaleX = normal.width / resolution.width;
            var scaleY = normal.height / resolution.height;
            if (scaleX != scaleY) {
                console.error("Cannot support resolution, must be a uniform scale of", resolution, normal);
            }
            else if (scaleX < 1) {
                console.error("Refusing to apply upscale resolution", resolution);
            }
            else if (scaleX >= 1) {
                var renderer = this.renderer;
                if (scaleX != renderer.scale || SizeEquals(resolution, renderer.size) == false) {
                    console.info("Applying scale / resolution", scaleX, resolution);
                    renderer.size = resolution;
                    renderer.scale = scaleX;
                }
            }
        }

        var stream = this.canvas.captureStream();
        var vcam = this.vcam;
        if (vcam == null) {
            vcam = new MmhmmCamera(stream);
            this.vcam = vcam;
        }
        else {
            this.stopVirtualCamera();

            var track = stream.getVideoTracks()[0];
            vcam.stream.addTrack(track);
        }

        vcam.start();
        ScreenLock.shared.disableScreenLock();
    }
    stopVirtualCamera() {
        var vcam = this.vcam;
        if (vcam == null) {
            return;
        }
        if (vcam.state != 'inactive') {
            vcam.stop();
        }

        var stream = vcam.stream;
        if (stream != null) {
            var tracks = stream.getTracks();
            tracks.forEach(track => {
                track.stop();
                stream.removeTrack(track);
            });
        }
        ScreenLock.shared.enableScreenLock();
    }
    get isVirtualCameraActive() {
        const state = this.vcam?.state;
        return state == "active" || state == "streaming";
    }
    /**
     * @type {RenderLayer}
     * @readonly
     */
    get rootLayer() {
        return this.renderer.rootLayer;
    }
    /*
     * Effect
     */
    /** @type {RenderFilter} */
    set effect(anEffect) {
        if (anEffect == this._effect) {
            return;
        }
        this._effect = anEffect;
        this.rootLayer.filter = anEffect;
        this.didChangeValueForProperty(anEffect, "effect");
    }
    get effect() {
        return this._effect;
    }
    /*
     * Annotations
     */
    /** @type {[Media.Annotation]=} */
    set annotations(objects) {
        if (objects == null) {
            objects = [];
        }

        const superlayer = this.annotationsLayer;
        superlayer.hidden = (objects.length == 0);

        const previous = this.annotations;
        const removed = previous.filter(obj => objects.includes(obj) == false);
        removed.forEach(obj => {
            const layer = obj.layer;
            obj.willDetachFromStage(this);
            superlayer.removeSublayer(layer);
            obj.didDetachFromStage(this);
        });

        const added = objects.filter(obj => previous.includes(obj) == false);
        added.forEach(obj => {
            obj.willAttachToStage(this);
            superlayer.addSublayer(obj.layer);
            obj.didAttachToStage(this);
        });

        this._annotations = objects;
        if (added.length > 0 || removed.length > 0) {
            this.didChangeValueForProperty(this.annotations, "annotations");
        }
    }
    get annotations() {
        return Array.from(this._annotations ?? []);
    }
    presenterChangedAnnotation(presenter, current) {
        const annotations = this.annotations;

        const previous = this.annotations.find(annotation => annotation.presenterID == presenter.identifier);
        if (previous != null) {
            const index = annotations.indexOf(previous);
            if (index != -1) {
                annotations.splice(index, 1);
            }
        }

        if (current != null) {
            annotations.push(current);
        }

        this.annotations = annotations;
    }
    /*
     * Stage controls(overlay)
     */
    get controlsOwner() {
        var controls = this.controls;
        if (controls == null) {
            return null;
        }

        var media = this.media.find(obj => obj.controls == controls);
        if (media != null) {
            return media;
        }

        var room = this.room;
        if (room != null && room.controls == controls) {
            return room;
        }
        return null;
    }
    set controls(controls) {
        var previous = this._controls;
        if (previous == controls) {
            return;
        }

        var overlay = this.overlay;
        if (previous != null) {
            if (previous.parentNode == overlay) {
                overlay.removeChild(previous);
            }
        }
        this._controls = controls;
        if (controls != null) {
            if (controls.parentNode != overlay) {
                overlay.appendChild(controls);
            }

            controls.style.pointerEvents = "initial";
            controls.style.transition = "opacity 0.33s ease-out";
            controls.style.position = "absolute";
            this.updateControlsVisibility();
        }
    }
    get controls() {
        return this._controls;
    }
    updateControlsVisibility() {
        var controls = this.controls;
        if (controls == null) {
            return;
        }

        var owner = this.controlsOwner;
        var selection = this.selectedObject;

        var opacity = 0;
        if (owner == selection || IsKindOf(owner, Room) && selection == null) {
            opacity = 1;
        }
        controls.style.opacity = opacity;
    }

    /*
     * Room aka Background
     */
    /** @type {Room} */
    set room(aRoom) {
        var previous = this._room;
        if (previous == aRoom) {
            return;
        }
        if (previous != null) {
            this.undoManager?.registerUndoWithTargetSlotArguments(this, 'room', previous);
        }
        this._updateRoom(aRoom);
    }
    /**
     * Update the currently selected room.
     * Removes the previous room from the stage, if present, and
     * puts the new room on stage.
     */
    _updateRoom(aRoom) {
        var rootLayer = this.rootLayer;

        var previous = this._room;
        if (previous == this.selectedObject) {
            this.selectedObject = null;
        }
        this._room = aRoom;

        if (previous != null && previous.stage != null) {
            if (this.controls == previous.controls) {
                this.controls = null;
            }

            var audioElement = previous.audioElement;
            if (audioElement != null) {
                this._removeAudioElement(audioElement);
            }

            try {
                previous.willDetachFromStage(this);
            }
            catch (err) {
                console.error("willDetachFromStage on room threw", previous, err);
                gSentry.exception(err);
            }

            var layer = previous.layer;
            if (layer != null) {
                rootLayer.removeSublayer(layer);
            }

            previous.didDetachFromStage(this);
        }

        if (aRoom == null) {
            this.media = [];
        }

        if (aRoom != null) {
            // XXX: this does not feel right here....
            if (aRoom.restorable != false) {
                SharedUserDefaults.setValueForKey(aRoom.identifier, "room");
            }
        }

        if (aRoom != null) {
            aRoom.loading = true;
            aRoom.willAttachToStage(this);
            aRoom.loading = false;

            const audioElement = aRoom.audioElement;
            if (audioElement != null) {
                this._addAudioElement(audioElement);
            }

            const layer = aRoom.layer;
            if (layer != null) {
                var size = this.size;
                var fullFrame = RectMake(0, 0, size.width, size.height);
                layer.frame = fullFrame;
                layer.zIndex = -1;
                rootLayer.addSublayer(layer);
            }
            if (this.controls == null) {
                this.controls = aRoom.controls;
            }
            aRoom.didAttachToStage(this);

            this.media.forEach(obj => {
                aRoom.stageWillPresentMedia(this, obj);
            })
        }
        this.didChangeValueForProperty(aRoom, "room");
    }
    get room() {
        return this._room;
    }
    /*
     * Slides
     */
    set slide(slideOrNull) {
        var previous = this._slide;
        if (previous == slideOrNull) {
            return;
        }

        this.undoManager?.disableUndoRegistration();

        if (previous != null) {
            // Media won't persist itself if its parent slide isn't on stage,
            // so remove the media from the stage before the slide is removed from the stage.
            // See https://github.com/All-Turtles/mmhmm-web/issues/2282

            // It seems like maybe the logic for adding/removing media from the stage
            // should all live inside of the slide's attachToStage / detachToStage, since
            // all media lives in slides at this point?
            this.media = [];
            previous.detachFromStage(this);
        }
        this._slide = slideOrNull;
        this.didChangeValueForProperty(slideOrNull, "slide");

        previous?.didDetachFromStage(this);

        try {
            if (slideOrNull == null) {
                this.media = [];
            }
            else {
                slideOrNull.attachToStage(this);
                const media = slideOrNull.objects;
                this.media = media;
            }
        }
        finally {
            this.undoManager?.enableUndoRegistration();
        }
    }
    get slide() {
        return this._slide;
    }
    /*
     * Media
     */
    /** @type {[Media]=} */
    set media(listOfMedia) {
        if (listOfMedia == null) {
            listOfMedia = [];
        }

        var room = this.room;

        var foregroundLayer = this.foregroundLayer;
        var previous = this._media;
        var current = Array.from(listOfMedia);

        // Need to compare identifiers instead of objects
        var added = current.filter(media => {
            var mediaID = media.identifier;
            var match = previous.find(obj => obj.identifier == mediaID);
            return (match == null);
        });
        var removed = previous.filter(media => {
            var mediaID = media.identifier;
            var match = current.find(obj => obj.identifier == mediaID);
            return (match == null);
        });

        if (added.length == 0 && removed.length == 0) {
            return;
        }

        var selectedObject = this.selectedObject;

        // enumerate removed
        removed.forEach(previous => {
            var controls = previous.controls;
            if (controls == this.controls) {
                this.controls = null;
            }

            var audioElement = previous.audioElement;
            if (audioElement != null) {
                this._removeAudioElement(audioElement);
            }

            var layer = previous.layer;
            if (layer != null) {
                foregroundLayer.removeSublayer(layer);
            }

            var overlay = previous.overlay;
            if (overlay != null && overlay.parentNode == this.overlay) {
                this.overlay.removeChild(overlay);
            }

            if (previous == selectedObject) {
                this.selectedObject = null;
                selectedObject = null;
            }

            previous.willDetachFromStage(this);


            if (room != null) {
                room.stageWillDismissMedia(this, previous);
            }

            previous.didDetachFromStage(this);
        })

        this._media = current;

        // enumerate added
        var controls = null;
        added.forEach(object => {
            controls = object.controls;
            object.willAttachToStage(this);

            var layer = object.layer;
            if (layer != null) {
                foregroundLayer.addSublayer(layer);
            }

            var overlay = object.overlay;
            if (overlay != null) {
                this.overlay.appendChild(overlay);
            }

            if (room != null) {
                room.stageWillPresentMedia(this, object);
            }

            object.didAttachToStage(this);
        });

        if (controls == null) {
            // No added media came with controls
            // A removed media might've removed its controls
            // So search the current media to see...
            var mediaWithControls = current.find(a => a.controls != null);
            if (mediaWithControls != null) {
                controls = mediaWithControls.controls;
            }

            if (controls == null && room != null) {
                controls = room.controls;
            }
        }
        if (controls != this.controls) {
            this.controls = controls;
        }

        //
        this.didChangeValueForProperty(current, "media");

        // We do this last so that if somebody is notified
        // about the change to audioElements and immediately
        // queries objectContainingAudioElement, they will
        // get a result.
        added.forEach(object => {
            var audioElement = object.audioElement;
            if (audioElement != null) {
                this._addAudioElement(audioElement);
            }

        })
    }
    get media() {
        return Array.from(this._media);
    }
    /**
     * @param {Media} object The media to remove
     */
    removeMedia(object) {
        var media = this.media;
        var index = media.indexOf(object);
        if (index == -1) {
            var matchedByID = media.find(other => other.identifier == object.identifier);
            if (matchedByID != null) {
                index = media.indexOf(matchedByID);
            }
        }

        if (index != -1) {
            media.splice(index, 1);
            this.media = media;
        }
        else {
            console.error("Asked to remove media we don't know about", object);
            var layer = object.layer;
            console.info("The media has layer: ", layer);
            if (layer != null) {
                var superlayer = layer.superlayer;
                if (superlayer != null) {
                    console.info("Removing media layer from it's superlayer", layer, layer.superlayer);
                    superlayer.removeSublayer(layer);
                }
            }
        }
    }
    /**
     * @param {Media} object The media to display
     */
    displayMedia(object) {
        var media = this.media;
        var match = media.find(obj => obj == object || obj.identifier == object.identifier);
        if (match != null) {
            return;
        }
        media.push(object);
        this.media = media;
    }
    /** @property {Stage.Object=} */
    set selectedObject(objectOrNull) {
        var previous = this._selectedObject;
        if (objectOrNull != null) {
            if (this.media.indexOf(objectOrNull) == -1 && this.presenters.indexOf(objectOrNull) == -1) {
                // Can't select objects that aren't part of the stage.
                // This may happen during undo as it'll try to select something
                // before invoking the undo action (e.g. restoring deleted media)
                objectOrNull = null;
            }
        }

        if (previous == objectOrNull) {
            return;
        }
        if (previous != null) {
            previous.selected = false;
        }
        this._selectedObject = objectOrNull;
        if (objectOrNull != null) {
            objectOrNull.selected = true;
            // The person won't be able to interact with the selection with the
            // annotation active, so clear it.
            this.localPresenter.annotationStyle = null;
        }
        this.updateControlsVisibility();
    }
    get selectedObject() {
        return this._selectedObject;
    }
    /*
     * Audio Elements
     */
    /** @property {[HTMLMediaElement]} [contents] */
    get audioElements() {
        return Array.from(this._audioElements);
    }
    /** @private */
    _addAudioElement(element) {
        if (element == null) {
            return;
        }
        var audioElements = this._audioElements;
        var index = audioElements.indexOf(element);
        if (index == -1) {
            audioElements.push(element);
            this.didChangeValueForProperty(null, "audioElements");
            AudioOutput.shared.addMediaElement(element);
        }
    }
    /** @private */
    _removeAudioElement(element) {
        if (element == null) {
            return;
        }
        var audioElements = this._audioElements;
        var index = audioElements.indexOf(element);
        if (index != -1) {
            audioElements.splice(index, 1);
            this.didChangeValueForProperty(null, "audioElements");
            AudioOutput.shared.removeMediaElement(element);
        }
    }
    /**
     * @param {HTMLMediaElement} element The element in question
     * @return {Room|Media|Presenter|null}
     */
    objectContainingAudioElement(element) {
        var room = this.room;
        if (room != null && room.audioElement == element) {
            return room;
        }
        var presenter = this.presenters.find(presenter => presenter.audioElement == element);
        if (presenter != null) {
            return presenter;
        }
        var media = this.media.find(obj => obj.audioElement == element);
        if (media != null) {
            return media;
        }
        return null;
    }
    objectResponsibleForLayer(layer) {
        return this.objects.find(obj => {
            const oLayer = obj.layer;
            if (oLayer == null) {
                return false;
            }
            return oLayer.isAncestorOfLayer(layer);
        });
    }
    /*
     * Object z-ordering
     */
   /**
    * @type {[Stage.Object]}
    */
    get objects() {
        const presenters = this.presenters;
        const objects = [...presenters, ...this.media];
        objects.sort((a,b) => {
            var zA = a.zIndex;
            var zB = b.zIndex;
            if (zA < zB) return -1;
            if (zA > zB) return 1;
            return 0;
        });

        const room = this.room;
        if (room != null) {
            objects.unshift(room);
        }
        presenters.forEach(presenter => {
            objects.push(...presenter.childObjects);
        });
        return objects;
    }
    objectsBehind(object) {
        const objects = this.objects;

        const objIdx = objects.indexOf(object);
        if (objIdx <= 0) {
            return [];
        }

        const beneath = objects.slice(0, objIdx);

        const box1 = object.layer.boundingBox;

        return beneath.filter(object => {
            const layer = object.layer;
            if (layer == null || layer.userInteractionEnabled == false) {
                return false;
            }
            const box2 = layer.boundingBox;
            const intersection = RectIntersection(box1, box2);
            return (intersection.width > 0 && intersection.height > 0);
        });
    }
    /*
     * @param {Presenter|Media} object The object whose z-ordering is affected
     */
    sendObjectToBack(object) {
        this._setObjectZPositionOffset(object, -2);
    }
    canSendObjectToBack(object) {
        return this.canLowerObject(object);
    }
    /*
     * @param {Presenter|Media} object The object whose z-ordering is affected
     */
    bringObjectToFront(object) {
        this._setObjectZPositionOffset(object, 2);
    }
    canBringObjectToFront(object) {
        return this.canRaiseObject(object);
    }
    /*
     * @param {Presenter|Media} object The object whose z-ordering is affected
     */
    raiseObject(object) {
        this._setObjectZPositionOffset(object, 1);
    }
    canRaiseObject(object) {
        const above = this._objectsRelativeTo(object, 1);
        return (above.length > 0);
    }
    /*
     * @param {Presenter|Media} object The object whose z-ordering is affected
     */
    lowerObject(object) {
        this._setObjectZPositionOffset(object, -1);
    }
    canLowerObject(object) {
        const beneath = this._objectsRelativeTo(object, -1);
        return (beneath.length > 0);
    }
    /** @private */
    _objectsRelativeTo(object, direction) {
        const all = this.foregroundObjects;
        const position = all.indexOf(object);
        if (position == -1) {
            return [];
        }

        let slice = null;
        if (direction == -1) {
            slice = all.slice(0, position);
        }
        else {
            slice = all.slice(position + 1);
        }

        const children = object.childObjects ?? [];
        return slice.filter(obj => children.includes(obj) == false);
    }
    /** @type {[Stage.Object]} */
    get foregroundObjects() {
        const sublayers = this.foregroundLayer.sublayers;
        const objects = sublayers.map(layer => this.objectResponsibleForLayer(layer))
                                 .filter(obj => obj != null);
        objects.sort((a, b) => {
            const zA = a.zIndex;
            const zB = b.zIndex;
            if (zA < zB) return -1;
            if (zA > zB) return 1;
            return 0;
        })
        return objects;
    }
    /** @private */
    _setObjectZPositionOffset(object, offset) {
        const allObjects = this.foregroundObjects;

        const childObjects = object.childObjects ?? [];
        const middle = [object, ...childObjects];

        let beneath = null;
        let above = null;
        if (offset < -1) {
            // Move `object` to bottom
            beneath = [];
            above = allObjects.filter(obj => middle.includes(obj) == false);
        }
        else if (offset > 1) {
            // Move `object` to bottom
            beneath = allObjects.filter(obj => middle.includes(obj) == false);
            above = [];
        }
        else {
            beneath = this._objectsRelativeTo(object, -1);
            above = this._objectsRelativeTo(object, 1);
            if (offset == -1) {
                // Move `object` down one
                if (beneath.length > 0) {
                    above.unshift(beneath.pop());
                }
            }
            else {
                // Move `object` up one
                if (above.length > 0) {
                    beneath.push(above.shift());
                }
            }
        }

        const ordered = [...beneath, ...middle, ...above];
        const undo = this.undoManager;
        undo?.beginUndoGrouping();

        // We'd like to try and maintain the absurdly high z-index
        // that presenter foregroundss start with, that so added
        // media continues appearing beneath it.
        // If the top of the z-order contains presenters, note that,
        // and we can add in the absurdly high value when we assign z-indices.
        let presentersOffset = -1;
        for (let idx=ordered.length-1; idx>=0; idx-=1) {
            if (IsKindOf(ordered[idx], Presenter.Foreground) == true) {
                presentersOffset = idx;
             }
             else {
                 break;
             }
         }

         ordered.forEach((obj, idx) => {
             let zIndex = idx;
             if (presentersOffset != -1 && idx >= presentersOffset) {
                 zIndex += Slide.Modern.DefaultPresenterZIndices.Foreground;
             }
             obj.zIndex = zIndex;
         });

         undo?.endUndoGrouping();
    }

    /*
     * KVO
     */
    observePropertyChanged(obj, key, val) {
        if (key == "annotation") {
            this.presenterChangedAnnotation(obj, val);
        }
    }
    /*
     * Teleport
     */
    eventKeys() {
        return ["effect", "media"];
    }
    toJSON() {
        var r = {
            slide: this.slide,
            effect: this.effect,
            room: this.room,
        };
        return r;
    }
    /*
     * Presenters
     */
    /**
     * @type {LocalPresenter}
     */
    get localPresenter() {
        return this._localPresenter;
    }
    set localPresenter(aPresenter) {
        var old = this._localPresenter;
        if (old != null) {
            this.removePresenter(old);
        }
        this._localPresenter = aPresenter;
        if (aPresenter != null) {
            this.addPresenter(aPresenter);
        }
    }
    /**
     * @type {[Presenter]=}
     * @readonly
     */
    get presenters() {
        var presenters = this._presenters;
        if (presenters == null) {
            presenters = [];
        }
        return presenters;
    }
    /**
     * @param {Presenter} aPresenter A presenter to add to the stage
     */
    addPresenter(aPresenter) {
        // TODO refactor this to use a single presenter
        var presenters = this.presenters;
        if (presenters.indexOf(aPresenter) == -1) {
            aPresenter.willAttachToStage(this);

            presenters.push(aPresenter);
            this._presenters = presenters;

            this.presenterChangedAnnotation(aPresenter, aPresenter.annotation);
            aPresenter.addObserverForProperty(this, "annotation");

            this.didChangeValueForProperty(presenters, "presenters");

            var overlay = aPresenter.overlay;
            if (overlay != null && overlay.parentNode != this.overlay) {
                this.overlay.appendChild(overlay);
            }

            aPresenter.didAttachToStage(this);
        }

        this.foregroundLayer.addSublayer(aPresenter.layer)
    }
    /**
     * @param {Presenter} aPresenter A presenter to add to the stage
     * @param {string=} reason Optional reason the presenter is being removed
     */
    removePresenter(aPresenter, reason) {
        if (aPresenter == this.selectedObject) {
            this.selectedObject = null;
        }

        var presenters = this.presenters;
        var idx = presenters.indexOf(aPresenter);
        if (idx != -1) {
            this.foregroundLayer.removeSublayer(aPresenter.layer)

            aPresenter.willDetachFromStage(this);

            this.presenterChangedAnnotation(aPresenter, null);
            aPresenter.removeObserverForProperty(this, "annotation");

            var overlay = aPresenter.overlay;
            if (overlay != null && overlay.parentNode == this.overlay) {
                this.overlay.removeChild(overlay);
            }

            presenters.splice(idx, 1);
            this._presenters = presenters;
            this.didChangeValueForProperty(presenters, "presenters");

            aPresenter.didDetachFromStage(this);
        }

        this.annotations = this.annotations.filter(obj => obj.presenterID != aPresenter.identifier);
    }
    /**
     * @param {UUID} presenterID The UUID of the presenter to find
     * @return {Presenter=}
     */
    presenterWithID(presenterID) {
        return this.presenters.find(aPresenter => aPresenter.identifier == presenterID);
    }
    /*
     * Layout helpers
     */
    /**
     * @type {Size}
     * @readonly
     */
    get size() {
        var renderer = this.renderer;
        var size = renderer.size;
        var scale = renderer.scale;
        if (scale != null && scale != 1) {
            size.width *= scale;
            size.height *= scale;
        }
        return size;
    }
    preferredSizeFor(element) {
        var width = element.videoWidth;
        var height = element.videoHeight;
        if (width == null || height == null) {
            width = element.naturalWidth;
            height = element.naturalHeight;
        }
        if (width == null || height == null) {
            width = element.width;
            height = element.height;
        }
        if (width == null || height == null) {
            return SizeMake(0, 0);
        }
        var canvasW = this.canvas.width;
        var canvasH = this.canvas.height;
        var scale = Math.min(width / canvasW, height / canvasH);
        var result = SizeMake(width / scale, height / scale);
        return result;
    }
    preferredFrameFor(element) {
        var size = this.preferredSizeFor(element);
        var canvasW = this.canvas.width;
        var canvasH = this.canvas.height;
        return RectMake((canvasW - size.width) / 2, (canvasH - size.height) / 2, size.width, size.height);
    }
    /** @private */
    get canvasWindowScale() {
        var canvas = this.canvas;
        var canvasBox = canvas.getBoundingClientRect();
        var stageSize = this.size;
        var scale = Math.min(canvasBox.width / stageSize.width, canvasBox.height / stageSize.height);
        return scale;
    }
    /*
     *
     */
    /** @type {StageResolution} */
    set resolution(aResolutionValue) {
        var size = SizeCopy(Stage.DefaultSize);
        var scale = null;
        switch (aResolutionValue) {
            default:
                aResolutionValue = Stage.Resolution.High;
                // Intentionally fallthrough
            case Stage.Resolution.High:
                scale = 1.0;
                break;
            case Stage.Resolution.Medium:
                scale = 1.5;
                break;
            case Stage.Resolution.Low:
                scale = 2.0;
                break;
            case Stage.Resolution.VeryLow:
                scale = 3.0;
                break;
        }
        size.width = size.width / scale;
        size.height = size.height / scale;
        this.renderer.size = size;
        this.renderer.scale = scale;
        this._resolution = aResolutionValue;
    }
    get resolution() {
        return this._resolution;
    }

    render(timestamp) {
        const renderer = this.renderer;

        const room = this.room;
        if (room != null) {
            room.render(timestamp);
        }

        const media = this.media;
        const numMedia = media.length;
        for (let objectIdx = 0; objectIdx < numMedia; objectIdx++) {
            media[objectIdx].render(timestamp);
        }

        const presenters = this.presenters;
        const numPresenters = presenters.length;
        for (let idx = 0; idx < numPresenters; idx += 1) {
            presenters[idx].render(timestamp);
        }

        const annotations = this.annotations;
        const numAnnotations = annotations.length;
        for (let idx = 0; idx < numAnnotations; idx += 1) {
            annotations[idx].render(timestamp);
        }

        renderer.render(timestamp);
        this.lastTimestamp = timestamp;
    }
    pauseAVMedia() {
        var layerEnumerator = (layer) => {
            var results = [];
            var object = this.objectResponsibleForLayer(layer);
            if (this.presenters.includes(object) == true) {
                return results;
            }

            var contents = layer.contents;
            if (contents != null && contents.tagName == "VIDEO") {
                results.push(layer);
            }

            var subcontents = layer.sublayers.flatMap(sublayer => layerEnumerator(sublayer));
            if (subcontents.length > 0) {
                results = results.concat(subcontents);
            }
            return results;
        };

        var avLayers = layerEnumerator(this.renderer.rootLayer);
        var avObjects = this.media.filter(media => media.audioElement != null);
        var room = this.room;
        if (room?.audioElement != null) {
            avObjects.push(room);
        }

        var elements = [];
        avLayers.forEach(layer => {
            var contents = layer.contents;
            if (contents.paused == false) {
                elements.push(contents);
            }
        });
        avObjects.forEach(media => {
            var element = media.audioElement;
            if (element.paused == false && elements.indexOf(element) == -1) {
                elements.push(element)
            }
        });

        elements.forEach(element => {
            element.pause();
        })
        this._pausedElements = elements;
    }
    resumeAVMedia() {
        var elements = this._pausedElements;
        if (elements != null) {
            elements.forEach(element => element.play());
        }

        delete this._pausedElements;
    }
}

Stage.DefaultSize = Object.freeze(SizeMake(1920, 1080));

/*
 * @enum {StageResolution}
 */
Stage.Resolution = Object.freeze({
    High: "high",
    Medium: "medium",
    Low: "low",
    VeryLow: "verylow",
});

Stage.PreferenceKeys = Object.freeze({
    Resolution: "stageResolution",
})
