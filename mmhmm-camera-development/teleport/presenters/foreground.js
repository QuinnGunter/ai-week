//
//  presenter/foreground.js
//  mmhmm
//
//  Created by Steve White on 12/05/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

Presenter.Foreground = class extends Stage.Object {
    newLayer() {
        const layer = new PresenterLayer();
        layer.opaque = false;
        layer.delegate = this.presenter;
        layer.userInteractionEnabled = true;
        layer.userInteractionEnabledWhenHidden = false;
        return layer;
    }
    updateUserInteraction() {
        const layer = this.layer;
        if (layer == null) {
            return;
        }
        layer.userInteractionEnabled = false;
    }
    get movable() {
        return false;
    }
    set presenter(obj) {
        const previous = this._presenter;
        if (previous != null) {
            this.destroyLayerBindings();
            this.presenterProxy = null;
        }
        this._presenter = obj;
        if (obj != null) {
            // The video layer will want a Presenter object
            // We need to intercept a few lookups that aren't
            // applicable for the foreground layer.
            this.presenterProxy = new Proxy(obj, {
                get: (target, prop, receiver) => {
                    if (prop == "backgroundStyle") {
                        return Presenter.BackgroundStyle.Hide;
                    }
                    else if (prop == "backgroundPaint") {
                        return null;
                    }
                    return target[prop];
                }
            });

            if (this.layer != null) {
                this.createLayerBindings();
            }
        }
        const layer = this.layer;
        if (layer != null) {
            layer.delegate = obj;
        }
    }
    get presenter() {
        return this._presenter;
    }
    set zIndex(val) {
        const previous = super.zIndex;
        if (val == previous) {
            return;
        }
        super.zIndex = val;
        this.zIndicesChanged();
    }
    get zIndex() {
        return super.zIndex;
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        const fgLayer = stage.foregroundLayer;
        fgLayer.addObserverForProperty(this, "sublayers");
        fgLayer.addSublayer(this.layer);
        this.createLayerBindings();
    }
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);

        const fgLayer = stage.foregroundLayer;
        fgLayer.removeObserverForProperty(this, "sublayers");
        fgLayer.removeSublayer(this.layer);
        this.destroyLayerBindings();
    }
    createLayerBindings() {
        this.destroyLayerBindings();

        const presenter = this.presenter;
        const layer = this.layer;
        layer.videoLayer.presenter = this.presenterProxy;

        const properties = [
            {
                theirs: presenter.layer,
                ours: layer,
                properties: [
                    // Positioning
                    "frame", "transform",
                    // Visibility
                    "opacity", "hidden"
                ],
            },
            {
                theirs: presenter.layer.videoLayer,
                ours: layer.videoLayer,
                properties: [
                    // Mirroring & crop
                    "contentRect", "frame",
                    // Video frame
                    "contents", "contentsNeedUpdate",
                    // Virtual greenscreen silhouette
                    "mask", "maskNeedsUpdate"
                ],
            },
            {
                theirs: presenter.layer.gestureLayer,
                ours: layer.gestureLayer,
                properties: [
                    "gesture",
                ],
            },
        ];

        const bindings = properties.flatMap(entry => {
            const us = entry.ours;
            const them = entry.theirs;
            return entry.properties.map(prop => {
                return them.bind(prop, us, prop);
            })
        });

        this.bindings = bindings;
    }
    destroyLayerBindings() {
        const bindings = this.bindings ?? [];
        bindings.forEach(func => func());
        this.bindings = null;
    }
    zIndicesChanged() {
        // We would like to disable ourselves if there is nothing
        // between us and the background
        const stage = this.stage;
        if (stage == null) {
            return;
        }

        let hideOurLayer = false;
        if (this.presenter.videoTrackEnabled == false) {
            hideOurLayer = true;
        }
        else {
            const objects = stage.foregroundObjects;

            const fgIndex = objects.indexOf(this);
            const bgIndex = objects.indexOf(this.presenter);
            if (fgIndex < bgIndex) {
                // XXX
            }

            hideOurLayer = (fgIndex - 1 == bgIndex);
        }

        this.layer.hidden = hideOurLayer;
    }
    observePropertyChanged(obj, key, val) {
        if (key == "sublayers") {
            this.zIndicesChanged();
        }
        else {
            super.observePropertyChanged(obj, key, val);
        }
    }
}
