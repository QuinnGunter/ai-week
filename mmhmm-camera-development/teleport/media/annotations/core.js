//
//  media/annotations/core.js
//  mmhmm
//
//  Created by Steve White on 4/9/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

Media.Annotation = class extends Media {
    constructor(identifier, presenterID, style) {
        super(identifier, presenterID);
        this._style = style;
    }
    get style() {
        return this._style;
    }
    get movable() {
        return false;
    }
    newOverlayHelper() {
        return null;
    }
    newAlignmentGrid(size) {
        return null;
    }
    newSidebarPane() {
        return null;
    }
    showEditMenu() {
        // Intentionally blank
    }
    frameForLayer(layer) {
        const stage = this.stage ?? gApp.stage;
        const stageSize = stage?.size ?? Stage.DefaultSize;
        return RectMake(0, 0, stageSize.width, stageSize.height);
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        const style = this.style;
        style.attachToSlide(this);

        if (this.presenterID == stage.localPresenter.identifier) {
            const layer = this.layer;
            layer.userInteractionEnabled = true;
            layer.delegate = style;
            layer.hitTest = (event) => true;
        }

        this.lastTimestamp = stage.timestamp;
    }
    willDetachFromStage(stage) {
        this.style.detachFromSlide(this);
        super.willDetachFromStage(stage);
    }
    render(timestamp) {
        super.render(timestamp);
        this.style.render(timestamp);
    }
    applyEvent(event) {
        super.applyEvent(event);
        this.style.applyEvent(event);
    }
    toJSON() {
        let r = {};
        r.id = this.identifier;
        r.presenter = this.presenterID;
        r.style = this.style.toJSON();
        return r;
    }
}

Media.Annotation.Style = class extends ObservableObject {
    constructor(identifier) {
        super();
        this.identifier = identifier;
    }
    copy() {
        const copy = new this.constructor(this.identifier);
        copy.shortTitle = this.shortTitle;
        copy.longTitle = this.longTitle;
        return copy;
    }
    get icon() {
        throw AbstractError();
    }
    get wantsToTrackMouse() {
        return true;
    }
    applyEvent(event) {
        // Intentionally blank, subclass hook
    }
    toJSON() {
        return { id: this.identifier };
    }

    attachToSlide(slide) {
        this.slide = slide;
    }
    detachFromSlide(slide) {
        this.slide = null;
    }
    render(timestamp) {
        // Intentionally blank, subclass hook
    }

    onPointerEnter() {
        this.cursor = "none";
    }
    onPointerLeave() {
        this.cursor = null;
    }
    onPointerDown(event) {
        // Intentionally blank, subclass hook
    }
    onPointerUp(event) {
        // Intentionally blank, subclass hook
    }
    onPointerMove(event) {
        // Intentionally blank, subclass hook
    }
}

Media.Annotation.Styles = [];

Media.Annotation.StyleWithID = function(identifier) {
    const match = Media.Annotation.Styles.find(style => style.identifier == identifier);
    if (match == null) {
        return null;
    }
    return match.copy();
}

Media.Annotation.Style.Register = function(...args) {
    Media.Annotation.Styles.push(...args);
}
