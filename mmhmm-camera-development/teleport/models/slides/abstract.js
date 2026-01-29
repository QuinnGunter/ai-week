//
//  models/pages/abstract.js
//  mmhmm
//
//  Created by Steve White on 2/24/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

class Slide extends ObservableObject {
    destroy() {
        // Intentionally blank, subclass hook
    }
    get dataStore() {
        return gApp.dataStore;
    }
    get undoManager() {
        return this.stage?.undoManager;
    }
    get appUndoManager() {
        return gApp.undoManager;
    }
    get presentation() {
        const documentID = this.documentID;
        const dataStore = this.dataStore;

        const presentation = dataStore?.presentationWithID(documentID);
        if (presentation != null) {
            return presentation;
        }

        const active = dataStore?.activePresentation;
        if (active?.identifier == documentID) {
            return active;
        }

        console.error("Couldn't retrieve presentation ", this.identifier, documentID);
        return null;
    }
    attachToStage(stage) {
        this.stage = stage;
    }
    detachFromStage(stage) {
        this.stage = null;
    }
    didDetachFromStage(stage) {
        // Intentionally blank, subclass hook
    }
    async loadAssetsIntoCache() {
        // Intentionally blank, subclass hook
    }
    async reload() {
        // Intentionally blank, subclass hook
    }
    objectWithIdentifier(objectID) {
        return this.objects.find(obj => obj.identifier == objectID);
    }
    doesAddingObjectRequireUpload(object) {
        let presentation = this.presentation;
        if (presentation != null) {
            return presentation.doesAddingObjectRequireUpload(object);
        }

        throw AbstractError();
    }
    doesAddingObjectsRequireUpload(objects) {
        var any = objects.find(obj => this.doesAddingObjectRequireUpload(obj));
        return (any != null);
    }
    canPersist() {
        return true;
    }
    hasRecordForPresenter(presenter) {
        return false;
    }
    containsMedia(media) {
        return this.objects.includes(media);
    }
    /*
     * Teleport
     */
    toJSON() {
        const id = this.identifier ?? createUUID();

        // Presenter ID is included because historically some
        // slides (now media) couldn't be displayed once
        // the presenter left the call (e.g. screen share)
        // and this was used to remove them from the stage
        const presenterID = this.ownerAccountID;

        // documentID is mostly a safety check so that
        // slides aren't created in a presentation that
        // isn't active.
        const documentID = this.documentID;
        const sortIndex = this.sortIndex;

        const r = { id, presenterID, documentID, sortIndex };
        const sourceID = this.sourceID;
        if (sourceID != null) {
            r.sourceID = sourceID;
        }
        return r;
    }
    applyEvent(event, sender) {
        const sortIndex = event?.sortIndex;
        if (sortIndex != null) {
            this.sortIndex = new SlideSortKey(sortIndex);
        }

        const trashed = event?.trashed;
        if (trashed != null) {
            this.trashed = trashed;
            if (trashed == true) {
                const undo = this.undoManager ?? this.appUndoManager;
                undo.removeAllActionsWithTarget(this);
                this.objects.forEach(obj => {
                    undo.removeAllActionsWithTarget(obj);
                })
            }
        }
    }
}

Slide.Notifications = Object.freeze({
    ThumbnailUpdated: "Slide.ThumbnailUpdated"
});
