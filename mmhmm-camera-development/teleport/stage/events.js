//
//  stage/events.js
//  mmhmm
//
//  Created by Steve White on 12/27/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

/**
 * @typedef {Object} StageEvent
 * @property {Point} point
 * @property {bool} ctrlKey
 * @property {bool} shiftKey
 * @property {bool} metaKey
 * @property {bool} altKey
 * @property {number} timestamp
 * @property {MouseEvent|PointerEvent|GestureEvent|WheelEvent} domEvent
 */

Stage.EventHandler = class extends ObservableObject {
    constructor(stage) {
        super();

        this.automaticallyNotifiesObserversOfMouseOverTarget = false;
        this.currentDropTarget = null;

        this.setupCanvasEventListeners();
        this.startDocumentEventListeners();
        this.startKeyboardObserver();

        this.stage = stage;
    }
    destroy() {
        this.stage = null;
        this.stopDocumentEventListeners();
        this.stopKeyboardObserver();
    }

    /**
     * @private
     */
    setupCanvasEventListeners() {
        if (this.eventListeners != null) {
            return;
        }

        var eventListeners = {};
        this.eventListeners = eventListeners;

        eventListeners.wheel = (evt) => {
            evt.preventDefault();
            this.onMouseWheel(evt);
        }

        var useTouchEvents = false;
        var vendor = navigator.vendor;
        if (vendor != null && vendor.startsWith("Apple") == true) {
            var maxTouchPoints = navigator.maxTouchPoints;
            if (window.TouchEvent != null && maxTouchPoints != null && maxTouchPoints > 0) {
                useTouchEvents = true;
            }
        }

        if (useTouchEvents == true) {
            eventListeners.touchstart = (evt) => {
                this.canvas.focus();
                evt.preventDefault();
                this.onMouseDown(evt);
            };
            eventListeners.touchend = (evt) => {
                evt.preventDefault();
                this.onMouseUp(evt);
            };
            eventListeners.touchmove = (evt) => {
                evt.preventDefault();
                this.onMouseMove(evt);
            };

            eventListeners.touchcancel = (evt) => {
                this.onMouseUp(evt);
            }
        }
        else if ('onpointerdown' in window) {
            eventListeners.pointerdown = (evt) => {
                this.canvas.focus();
                this.canvas.setPointerCapture(evt.pointerId);
                this.onMouseDown(evt);
            };
            eventListeners.pointerup = (evt) => {
                evt.preventDefault();
                this.onMouseUp(evt);
            };
            eventListeners.pointermove = (evt) => {
                evt.preventDefault();
                this.onMouseMove(evt);
            };

            eventListeners.lostpointercapture = (evt) => {
                this.onMouseUp(evt);
            }
        }
        else {
            eventListeners.mousedown = (evt) => {
                this.canvas.focus();
                this.onMouseDown(evt);
            }
            eventListeners.mouseup = (evt) => {
                evt.preventDefault();
                this.onMouseUp(evt);
            }
            eventListeners.mousemove = (evt) => {
                evt.preventDefault();
                this.onMouseMove(evt);
            };
        }

        /*
         * Mouse overs for desktop
         */
        eventListeners.mouseover = (evt) => {
            this.onMouseOver(evt);
        };
        eventListeners.mouseout = (evt) => {
            this.onMouseOut(evt);
        };
        eventListeners.click = (evt) => {
            this.onMouseClick(evt);
        };
        eventListeners.dblclick = (evt) => {
            this.onMouseDoubleClick(evt);
        };

        /*
         * Gestures when in Safari/WebKit
         */
        eventListeners.gesturestart = (evt) => {
            evt.preventDefault();
            this.onGestureStart(evt);
        };
        eventListeners.gesturechange = (evt) => {
            evt.preventDefault();
            this.onGestureChange(evt);
        };
        eventListeners.gestureend = (evt) => {
            evt.preventDefault();
            this.onGestureEnd(evt);
        };

        eventListeners.contextmenu = (evt) => {
            this.handleContextMenu(evt);
        }
    }
    startDocumentEventListeners() {
        var clickListener = this.clickListener;
        if (clickListener != null) {
            return;
        }
        clickListener = (evt) => {
            this.handleGlobalClickEvent(evt);
        };
        this.clickListener = clickListener;
        document.body.addEventListener("click", clickListener);
    }
    stopDocumentEventListeners() {
        var clickListener = this.clickListener;
        if (clickListener == null) {
            return;
        }
        document.body.removeEventListener("click", clickListener);
        this.clickListener = null;
    }
    handleGlobalClickEvent(event) {
        var target = event.target;
        if (target == null || target.tagName != "DIV") {
            return;
        }

        var stage = this.stage;
        if (stage == null || stage.selectedObject == null) {
            return;
        }

        var allowedAncestors = [
            document.getElementById("workspace")?.parentNode,
            NavigationBar.shared.container,
            gApp.toolbar.container
        ];

        var match = allowedAncestors.find(elem => IsAncestorOf(elem, target));
        if (match == null) {
            // Bail, this doesn't belong to an allowed ancestor.
            return;
        }

        var disallowedAncestors = [
            document.getElementById("stage_wrapper"),
            gApp.slideTray?.container,
        ];
        match = disallowedAncestors.find(elem => IsAncestorOf(elem, target));
        if (match != null) {
            // Bail, this belongs to a disallowed ancestor
            return;
        }

        // Clear the stage's selection
        stage.selectedObject = null;
    }
    startKeyboardObserver() {
        gApp.registerKeyboardObserver(this);
    }
    stopKeyboardObserver() {
        gApp.unregisterKeyboardObserver(this);
    }
    handleKeyboardEvent(event, isApplePlatform) {
        const stage = this.stage;
        const selection = stage?.selectedObject;
        if (selection == null) {
            return false;
        }
        switch (event.code) {
            case "Escape":
                if (event.type == "keyup") {
                    stage.selectedObject = null;
                }
                return true;
            case "Enter":
            case "Return":
                if (selection.editable == true && selection.editing == false) {
                    if (event.type == "keyup") {
                        selection.enterEditMode();
                    }
                    return true;
                }
                return false;
            default:
                return false;
        }
    }

    /*
     * Properties
     */
    set stage(object) {
        var previous = this._stage;
        if (previous == object) {
            return;
        }
        if (previous != null) {
            previous.removeObserverForProperty(this, "canvas");
            previous.foregroundLayer.removeObserverForProperty(this, "sublayers");
            previous.annotationsLayer.removeObserverForProperty(this, "sublayers");
        }
        this._stage = object;

        var canvas = null;
        if (object != null) {
            object.addObserverForProperty(this, "canvas");
            object.foregroundLayer.addObserverForProperty(this, "sublayers");
            object.annotationsLayer.addObserverForProperty(this, "sublayers");
            canvas = object.canvas;
        }
        this.canvas = canvas;
        this.updateCandidateLayers();
    }
    get stage() {
        return this._stage;
    }
    set canvas(object) {
        var previous = this._canvas;
        if (previous == object) {
            return;
        }

        var eventListeners = this.eventListeners;
        if (previous != null) {
            for (const key in eventListeners) {
                previous.removeEventListener(key, eventListeners[key]);
            }
        }
        this._canvas = object;
        if (object != null) {
            for (const key in eventListeners) {
                object.addEventListener(key, eventListeners[key]);
            }
        }
    }
    get canvas() {
        return this._canvas;
    }
   /**
    * @private
    * @type {Stage.Object=}
    */
   set mouseOverTarget(object) {
       var previous = this._mouseOverTarget;
       if (object == previous) {
           return;
       }

       if (previous != null) {
           if ('cursor' in previous) {
               previous.removeObserverForProperty(this, "cursor");
           }
           if (previous.onPointerLeave != null) {
               previous.onPointerLeave();
           }
       }

       this._mouseOverTarget = object;
       this.didChangeValueForProperty(object, "mouseOverTarget");

       if (object != null) {
           if ('cursor' in object) {
               object.addObserverForProperty(this, "cursor");
           }
           if (object.onPointerEnter != null) {
               object.onPointerEnter();
           }
       }
       this.updateMouseOverCursor();
   }
   get mouseOverTarget() {
       return this._mouseOverTarget;
   }
   set candidateLayers(layerList) {
       var previous = this._candidateLayers ?? [];
       var current = layerList ?? [];

       var removed = previous.filter(layer => current.indexOf(layer) == -1);
       removed.forEach(layer => {
           layer.removeObserverForProperty(this, "transform");
           layer.removeObserverForProperty(this, "hidden");
           layer.removeObserverForProperty(this, "userInteractionEnabled");
       })

       var added = current.filter(layer => previous.indexOf(layer) == -1);
       added.forEach(layer => {
           layer.addObserverForProperty(this, "transform");
           layer.addObserverForProperty(this, "hidden");
           layer.addObserverForProperty(this, "userInteractionEnabled");
       });
       this._candidateLayers = current;
   }
   get candidateLayers() {
       return this._candidateLayers;
   }
    /*
     * KVO
     */
    observePropertyChanged(obj, key, val) {
        if (key == "sublayers") {
            this.updateCandidateLayers();
        }
        else if (key == "canvas") {
            this.canvas = obj.canvas;
        }
        else if (key == "cursor") {
            this.updateMouseOverCursor();
        }
        else if (key == "transform" || key == "hidden" || key == "userInteractionEnabled") {
            this.updateMouseOverTarget(this.lastMouseAppEvent);
        }
    }
    /*
     *
     */
    stageObjectForEvent(appEvent) {
        // All the known layers that can be interacted with
        var layers = this._candidateLayers;
        if (layers == null || layers.length == 0) {
            return null;
        }

        var point = appEvent.point;
        // Find all of the layers that are currently under the mouse
        var candidate = layers.find(layer => {
            if (layer.userInteractionEnabled == false) {
                return false;
            }

            if (layer.hidden == true || layer.opacity <= 0) {
                if (layer.userInteractionEnabledWhenHidden != true) {
                    return false;
                }
            }
            return layer.containsPoint(point);
        });

        return candidate?.delegate;
    }
    updateMouseOverTarget(appEvent) {
        if (this._activeMouseTarget != null) {
            // We're in the middle of a drag, discard this
            return;
        }

        this.lastMouseAppEvent = appEvent;

        if (appEvent == null) {
            this.mouseOverTarget = null;
            return;
        }

        var candidate = this.stageObjectForEvent(appEvent);
        var mouseOverTarget = this.mouseOverTarget;
        if (mouseOverTarget != candidate) {
            this.mouseOverTarget = candidate;
        }
    }

    updateMouseOverCursor() {
        var cursor = null;
        var target = this._mouseOverTarget;
        if (target != null) {
            cursor = target.cursor;
        }
        this.canvas.style.cursor = (cursor ? cursor : "");
    }

    updateCandidateLayers() {
        var interactable = [];

        var addSublayersOf = function(parent) {
            var layers = parent.sublayers.filter(layer => {
                var delegate = layer.delegate;
                if (delegate == null) {
                    return false;
                }

                if (delegate.onPointerEnter == null && delegate.onPointerLeave == null) {
                    return false;
                }
                return true;
            }).reverse();
            interactable = layers.concat(interactable);
        }

        var stage = this.stage;
        addSublayersOf(stage.foregroundLayer);
        addSublayersOf(stage.annotationsLayer);

        this.candidateLayers = interactable;
    }
    /*
     * DOM Events
     */
    /**
     * @param {MouseEvent} domEvent The browser's event
     */
    onMouseOver(domEvent) {
        // We only want to update mouse over targets when hovering
        if (domEvent.buttons > 0) {
            return;
        }

        var appEvent = this.appEventFromDOM(domEvent);
        this.updateMouseOverTarget(appEvent);
    }
    /**
     * @param {MouseEvent} event The browser's event
     */
    onMouseOut(domEvent) {
        // We only want to update mouse over targets when hovering
        if (domEvent.buttons > 0) {
            return;
        }
        this.updateMouseOverTarget(null);
    }
    /**
     * @param {MouseEvent} domEvent The browser's event
     */
    onMouseClick(domEvent) {
        if (this._mouseHasMovedSignificantly == true) {
            return;
        }
        var selectedObject = this.stage.selectedObject;
        if (selectedObject != null && selectedObject.onMouseClick != null) {
            var appEvent = this.appEventFromDOM(domEvent, selectedObject.layer);
            selectedObject.onMouseClick(appEvent, domEvent);
        }
    }
    /**
     * @param {MouseEvent} domEvent The browser's event
     */
    onMouseDoubleClick(domEvent) {
        if (this._mouseHasMovedSignificantly == true) {
            return;
        }
        var selectedObject = this.stage.selectedObject;
        if (selectedObject != null && selectedObject.onMouseDoubleClick != null) {
            var appEvent = this.appEventFromDOM(domEvent, selectedObject.layer);
            selectedObject.onMouseDoubleClick(appEvent, domEvent);
        }
    }
    /** Drag & drop events are proxied to us by app.js, which implements full-window handlers */
    onDragOver(domEvent) {
        let currentDropTarget = this.currentDropTarget;
        const targetObject = this._getDragDropTargetObject(domEvent);

        // Clear the current target if it's not the same as the new target
        if (currentDropTarget && (targetObject != currentDropTarget)) {
            this._clearDragDropTargetObject(domEvent);
        }
        if (targetObject && targetObject.onDragOver) {
            targetObject.onDragOver(domEvent);
            this.currentDropTarget = targetObject;
        }
    }
    onDragLeave(domEvent) {
        this._clearDragDropTargetObject(domEvent);
    }
    /**
     * See if the stage wants to handle a drop event.
     * @param {Event} domEvent
     * @returns {boolean} True if the stage handled the drop event
     */
    onDrop(domEvent) {
        this._clearDragDropTargetObject(domEvent);
        const targetObject = this._getDragDropTargetObject(domEvent);
        if (targetObject && targetObject.onDrop) {
            return targetObject.onDrop(domEvent);
        }
        return false;
    }
    _getDragDropTargetObject(event) {
        return this.stageObjectForEvent(this.appEventFromDOM(event));
    }
    _clearDragDropTargetObject(event) {
        if (this.currentDropTarget) {
            this.currentDropTarget.onDragLeave(event);
            this.currentDropTarget = null;
        }
    }
    _convertPointToLayer(point, layer) {
        var parents = [layer];
        var superlayer = layer;
        while ((superlayer = superlayer.superlayer) != null) {
            parents.push(superlayer);
        }
        parents.reverse();

        parents.forEach(layer => {
            var bbox = layer.boundingBox;
            point.x -= bbox.x;
            point.y -= bbox.y;
        })

        return point;
    }
    /**
     * @param {PointerEvent} event The browser's event
     * @param {RenderLayer?} layer A layer to make the point relative to
     * @return {StageEvent}
     */
    appEventFromDOM(event, layer) {
        var canvas = this.canvas;

        var renderer = this.stage.renderer;
        var scale = renderer.scale;
        var size = renderer.size;

        var stageW = size.width * scale;
        var stageH = size.height * scale;

        var actualW = canvas.clientWidth;
        var actualH = canvas.clientHeight;

        var point = null;
        if (window.TouchEvent != null && event instanceof TouchEvent) {
            var touches = event.touches;
            if (touches.length == 0) {
                touches = event.changedTouches;
            }
            var touch = touches[0];
            point = PointMake(
                (touch.clientX / actualW) * stageW,
                (touch.clientY / actualH) * stageH,
            );
        }
        else {
            point = PointMake(
                (event.offsetX / actualW) * stageW,
                (event.offsetY / actualH) * stageH,
            );
        }

        if (layer != null) {
            point = this._convertPointToLayer(point, layer);
        }

        return {
            point: point,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            pressure: 1,
            timestamp: event.timeStamp,
            domEvent: event,
        };
    }
    /**
     * @param {PointerEvent} domEvent The browser's event
     */
    onMouseDown(domEvent) {
        var appEvent = this.appEventFromDOM(domEvent);
        var stage = this.stage;

        var selectedObject = stage.selectedObject;
        var target = null;

        if (selectedObject != null &&
            // Both of these are kludges...
            (selectedObject.editing == true || domEvent.altKey == true))
        {
            if (selectedObject.layer.containsPoint(appEvent.point) == true) {
                target = selectedObject;
            }
        }

        if (target == null) {
            target = this.stageObjectForEvent(appEvent);
        }

        if (target != stage.selectedObject) {
            stage.selectedObject = target;
        }
        this.mouseOverTarget = target;

        if (target != null) {
            target.onPointerDown(appEvent);
        }

        this._activeMouseTarget = target;
        this._mouseDownPoint = appEvent.point;
        this._mouseHasMovedSignificantly = false;
    }
    /**
     * @param {PointerEvent} domEvent The browser's event
     */
    onMouseMove(domEvent) {
        var appEvent = this.appEventFromDOM(domEvent);

        let target = null;

        // We only want to update mouse over targets when hovering
        if (domEvent.buttons == 0) {
            this.updateMouseOverTarget(appEvent);

            const mouseOverTarget = this.mouseOverTarget;
            if (mouseOverTarget == null || mouseOverTarget.wantsToTrackMouse != true) {
                return;
            }
            target = mouseOverTarget;
        }
        else {
            target = this._activeMouseTarget;
        }

        if (this._mouseHasMovedSignificantly == false) {
            var curMousePoint = appEvent.point;
            var initialPoint = this._mouseDownPoint;
            var delta = PointMake(
                curMousePoint.x - initialPoint.x,
                curMousePoint.y - initialPoint.y,
            );
            if (Math.abs(delta.x) >= 5 || Math.abs(delta.y) >= 5) {
                this._mouseHasMovedSignificantly = true;
            }
        }

        if (target != null) {
            target.onPointerMove(appEvent);
        }
    }
    /**
     * @param {PointerEvent} domEvent The browser's event
     */
    onMouseUp(domEvent) {
        var appEvent = this.appEventFromDOM(domEvent);
        var target = this._activeMouseTarget;
        if (target != null) {
            if (target.onPointerUp != null) {
                target.onPointerUp(appEvent);
            }
            this._activeMouseTarget = null;
        }

        this.updateMouseOverTarget(appEvent);
    }
    objectForWheelOrGestureEvent() {
        var selection = this.stage.selectedObject;
        if (selection == null || selection.layer.userInteractionEnabled == false) {
            return null;
        }
        return selection;
    }
    /**
     * @param {WheelEvent} evt The browser's event
     */
    onMouseWheel(event) {
        var selection = this.objectForWheelOrGestureEvent();
        if (selection == null || selection.onMouseWheel == null) {
            return;
        }

        if (this.hasInvokedMouseWheelStart != true) {
            selection.onMouseWheelStart(event);
            this.hasInvokedMouseWheelStart = true;
        }

        selection.onMouseWheel(event);

        var mouseWheelEndTimer = this.mouseWheelEndTimer;
        if (mouseWheelEndTimer != null) {
            window.clearTimeout(mouseWheelEndTimer);
        }
        this.mouseWheelEndTimer = window.setTimeout(() => {
            selection.onMouseWheelEnd(event);
            this.hasInvokedMouseWheelStart = false;
            this.mouseWheelEndTimer = null;
        }, 500)
    }
    /**
     * @param {GestureEvent} event The browser's event
     */
    onGestureStart(event) {
        var selection = this.objectForWheelOrGestureEvent();
        if (selection != null && selection.onGestureStart != null) {
            selection.onGestureStart(event);
        }
    }
    /**
     * @param {GestureEvent} event The browser's event
     */
    onGestureChange(event) {
        var selection = this.objectForWheelOrGestureEvent();
        if (selection != null && selection.onGestureChange != null) {
            selection.onGestureChange(event);
        }
    }
    /**
     * @param {GestureEvent} event The browser's event
     */
    onGestureEnd(event) {
        var selection = this.objectForWheelOrGestureEvent();
        if (selection != null && selection.onGestureEnd != null) {
            selection.onGestureEnd(event);
        }
    }
    /**
     * @param {PointerEvent} event The browser's event
     */
    handleContextMenu(domEvent) {
        var appEvent = this.appEventFromDOM(domEvent);
        var target = this.stageObjectForEvent(appEvent);
        if (target != null) {
            var success = target.showEditMenu(null, domEvent, appEvent);
            if (success == true) {
                domEvent.preventDefault();
            }
        }
    }
}
