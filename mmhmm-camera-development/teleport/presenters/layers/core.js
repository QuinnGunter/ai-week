//
//  core.js
//  mmhmm
//
//  Created by Steve White on 1/14/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class PresenterLayer extends RenderLayer {
    constructor() {
        super();
        this.frame = RectMake(0, 0, 1920, 1080);
        this.userInteractionEnabledWhenHidden = true;

        this.videoLayer = new PresenterVideoLayer();
        this.videoLayer.userInteractionEnabled = true;
        this.addSublayer(this.videoLayer);

        this.gestureLayer = new PresenterGestureLayer();
        this.gestureLayer.hidden = true;
        this.addSublayer(this.gestureLayer);
    }
    set presenter(obj) {
        const previous = this.presenter;
        if (obj == previous) {
            return;
        }
        if (previous != null) {
            previous.removeObserverForProperty(this, "shape");
            previous.removeObserverForProperty(this, "polygonSides");
        }
        this._presenter = obj;
        this.videoLayer.presenter = obj;
        if (obj != null) {
            obj.addObserverForProperty(this, "shape");
            obj.addObserverForProperty(this, "polygonSides");
            this._presenterShapeChanged();
        }
    }
    get presenter() {
        return this._presenter;
    }
    get naturalSize() {
        return this.videoLayer?.contents?.size ?? Stage.DefaultSize;
    }
    set userInteractionEnabledWhenHidden(val) {
        this._userInteractionEnabledWhenHidden = !!val;
    }
    get userInteractionEnabledWhenHidden() {
        return this._userInteractionEnabledWhenHidden ?? true;
    }
    set shadowEnabled(val) {
        const shadowEnabled = !!val;
        if (shadowEnabled == this.shadowEnabled) {
            return;
        }
        this._shadowEnabled = shadowEnabled;

        if (shadowEnabled == false) {
            const shadowLayer = this.shadowLayer;
            if (shadowLayer != null) {
                this.removeSublayer(shadowLayer);
                this.shadowLayer = null;
            }
        }
        else {
            let shadowLayer = this.shadowLayer;
            if (shadowLayer == null) {
                shadowLayer = new PresenterShadowLayer();
                shadowLayer.frame = shadowLayer.frameFromSize(this.size);
                this.insertSublayerBefore(shadowLayer, this.sublayers[0]);
                this.shadowLayer = shadowLayer;
                this._presenterShapeChanged();
            }
        }
    }
    get shadowEnabled() {
        return this._shadowEnabled ?? false;
    }
    set size(val) {
        super.size = val;
        const shadowLayer = this.shadowLayer;
        if (shadowLayer != null) {
            const frame = shadowLayer.frameFromSize(val);
            shadowLayer.frame = frame;
        }
    }
    get size() {
        return super.size;
    }
    _presenterShapeChanged() {
        const shadowLayer = this.shadowLayer;
        if (shadowLayer != null) {
            shadowLayer.shape = this.presenter?.shape ?? Presenter.Shape.Rectangle;
            shadowLayer.polygonSides = this.presenter?.polygonSides ?? 6;
        }
    }
    observePropertyChanged(obj, key, val) {
        if (key == "shape" || key == "polygonSides") {
            this._presenterShapeChanged();
        }
    }
}
