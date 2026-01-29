//
//  rooms.js
//  mmhmm
//
//  Created by Steve White on 7/29/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class Room extends Stage.Object {
    constructor(identifier, title, thumbnailSrc) {
        super(identifier);
        this.title = title;
        this.hidden = false;
        this.autoShowSettings = false;
        this.initiatedByPresenterID = null;

        // Convert the thumbnailSrc into an asset
        if (thumbnailSrc != null) {
            if (thumbnailSrc.indexOf("/") == -1) {
                thumbnailSrc = Room.assetBaseURL + thumbnailSrc;
            }
            this.thumbnailAsset = new LocalAsset({contentURL: thumbnailSrc});
        }

        this.toolbarButtons = [];
    }
    get properties() {
        return {};
    }
    get movable() {
        return false;
    }
    get isSupportedOnBrowser() {
        return true;
    }
    /*
     * These are invoked by the Stage
     */
    newLayer(stageSize) {
        const layer = super.newLayer(stageSize);
        layer.opaque = true;
        return layer;
    }
    didDetachFromStage(stage) {
        super.didDetachFromStage(stage);

        delete this.appliedPlacement;
        delete this.placementAnimation;

        this.initiatedByPresenterID = null;
    }
    stageWillDismissMedia(stage, slide) {
        // Intentionally blank, subclass hook
    }
    stageWillPresentMedia(stage, slide) {
        // Intentionally blank, subclass hook
    }
    render(timestamp) {
        var placementHelper = this.placementHelper;
        if (placementHelper != null) {
            var finished = placementHelper.stepAnimation(timestamp);
            if (finished == true) {
                delete this.placementHelper;
            }
        }
    }
    /*
     * Event helpers
     */
    applyEvent(event, sender) {
        // Subclass hook
    }
    toJSON() {
        var r = { id: this.identifier };
        var queue = this.queue;
        if (queue != null) {
            queue.forEach(entry => Object.assign(r, entry));
            this.queue = null;
        }
        return r;
    }
    toMedia() {
        var state = this.toJSON();
        var id = state.id;
        delete state.id;
        return {
            id: id,
            state: state
        };
    }
    /*
     * Thumbnails
     */
    async thumbnail() {
        return this.thumbnailForCurrentState();
    }
    async thumbnailForCurrentState() {
        return this.thumbnailForState(this.toJSON());
    }
    async thumbnailForState(state) {
        // In the base class nothing varies by state
        // Subclasses can override thumbnailForState
        // to return a state-specific thumbnail
        var asset = this.thumbnailAsset;
        if (asset != null) {
            return asset.openAsElement();
        }
        console.error("thumbnailAsset is null!", this);
        return null;
    }
    _postThumbnailChangedNotification() {
        NotificationCenter.default.postNotification(
            Room.Notifications.ThumbnailChanged,
            this,
            null
        );
    }
}

Room.Notifications = Object.freeze({
    SettingsChanged: "RoomSettingsChanged",
    ThumbnailChanged: "RoomThumbnailChanged",
});

Room.assetBaseURL = "assets/rooms/";
