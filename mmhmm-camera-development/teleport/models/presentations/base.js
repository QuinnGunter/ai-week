//
//  presentation.js
//  mmhmm
//
//  Created by Steve White on 4/15/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class Presentation extends ObservableObject {
    constructor(endpoint, cloudyObj) {
        super();

        this.endpoint = endpoint;
        this.identifier = cloudyObj.id;
        if (this.identifier == null) {
            console.error("Can't create a presentation w/o an identifier", cloudyObj);
            return null;
        }

        this.decodeFromRecord(cloudyObj);

        this._loaded = false;
        this.automaticallyNotifiesObserversOfLoaded = false;

        this._loading = false;
        this.automaticallyNotifiesObserversOfLoading = false;

        this.automaticallyNotifiesObserversOfPresenter = false;
    }
    destroy() {
        this.slides.forEach(slide => slide.destroy());
    }
    get canRename() {
        return true;
    }
    get canShare() {
        return true;
    }
    get canDelete() {
        return true;
    }
    get canDuplicate() {
        return true;
    }
    get presenter() {
        const stage = gApp?.stage;
        if (stage == null) {
            return null;
        }
        const ownerAccountID = this.ownerAccountID;
        if (ownerAccountID == null) {
            return stage.localPresenter;
        }
        return stage.presenterWithID(ownerAccountID);
    }
    get documentID() {
        return this.identifier;
    }
    //
    // Cloudy helpers
    //
    get serviceLocator() {
        throw AbstractError();
    }
    decodeFromRecord(record) {
        this.created = new Date(record.createdAt);
        this.updated = new Date(record.updatedAt);
        this.lastViewed = record.decodeProperty("lastViewed", Date, new Date(0));

        var title = record.decodeProperty("name", String).trim();
        if (title.length == 0) {
            title = LocalizedString("Untitled presentation");
        }
        this.title = title;

        this.hidden = record.decodeProperty("hidden", Boolean);
        this.isWelcomePresentation = record.decodeProperty("welcome", Boolean);

        this.ownerAccountID = record.ownerUserId ?? this.endpoint?.user?.id;
    }
    encodeToRecord(record) {
        record.encodeProperty("name", this.title);
        record.encodeProperty("lastViewed", this.lastViewed);
        record.encodeProperty("hidden", this.hidden);
        if (this.isWelcomePresentation == true) {
            record.encodeProperty("welcome", true);
        }

        record.encodeProperty("thumbnailAssetFingerprint", null);
    }
    async _postSyncRecords(records, cancelSignal) {
        return this.endpoint._postSyncRecords(records, cancelSignal);
    }
    //
    // Local data helpers
    //
    get stage() {
        return gApp.stage;
    }
    get dataStore() {
        return gApp.dataStore;
    }
    get undoManager() {
        return gApp.undoManager;
    }
    localPresentationWithID(presentationID) {
        var result = this.dataStore.presentationWithID(presentationID);
        if (result == null) {
            console.error("Could not find presentation with ID in data store", presentationID, this.dataStore);
        }
        return result;
    }
    //
    // Slides and media
    //
    getSlideCount(includeTrashed = false) {
        let slides = this.slides;
        if (includeTrashed == false) {
            slides = slides.filter(slide => slide.trashed == false);
        }
        return slides.length;
    }
    get slides() {
        var value = this._slides;
        if (value == null) {
            return [];
        }
        return Array.from(this._slides);
    }
    set slides(value) {
        this._setSlidesAndNotify(value, true);
    }
    get activeSlides() {
        return this.slides.filter(slide => slide.trashed != true);
    }
    containsSlide(slide) {
        return (this.slideWithIdentifier(slide?.identifier) != null);
    }
    _setSlidesAndNotify(theSlides, notify = false) {
        if (theSlides == null) {
            theSlides = [];
        }
        var slides = Array.from(theSlides);
        this._sortChildren(slides);
        this._slides = slides;
        if (notify == true) {
            this._postSlidesChangedNotification();
        }

        if (slides.length > 0) {
            slides[0].loadAssetsIntoCache();
        }

        this._updateThumbnailSlideID();
    }
    _updateThumbnailSlideID() {
        // Find the first non-trashed slide
        const activeSlides = this.slides.filter(slide => slide.trashed !== true);
        this.thumbnailSlideID = activeSlides[0]?.identifier;
    }
    slideWithIdentifier(slideID) {
        return this.slides.find(slide => slide.identifier == slideID);
    }
    get isActivePresentation() {
        return (this.dataStore.activePresentation == this);
    }
    _sortChildren(children) {
        var sorter = (a, b) => {
            var sortA = a.sortIndex;
            var sortB = b.sortIndex;
            if (sortA != null && sortB != null) {
                return sortA.compare(sortB);
            }
            if (sortA != null) {
                return -1;
            }
            if (sortB != null) {
                return 1;
            }

            var slides = this.slides;
            sortA = slides.indexOf(a);
            sortB = slides.indexOf(b);

            if (sortA < sortB) {
                return -1;
            }
            else if (sortA > sortB) {
                return 1;
            }
            return 0;
        };
        return children.sort(sorter);
    }
    slideContainingMedia(media) {
        return this.slides.find(slide => slide.containsMedia(media));
    }
    /*
     * (Re-)loading
     */
    get loaded() {
        return this._loaded;
    }
    get loading() {
        return this._loading;
    }
    async reload() {
        var reloadTask = this._reloadTask;
        if (reloadTask != null) {
            return reloadTask;
        }

        this._loading = true;
        this.didChangeValueForProperty(true, "loading");

        reloadTask = this._refreshServerContent();
        this._reloadTask = reloadTask;

        var slides = null;
        try {
            slides = await reloadTask;
        }
        catch (err) {
            gSentry.exception(err);
            throw err
        }
        finally {
            if (reloadTask == this._reloadTask) {
                this._reloadTask = null;
            }

            this._loaded = true;
            this.didChangeValueForProperty(true, "loaded");

            this._loading = false;
            this.didChangeValueForProperty(false, "loading");
        }

        return this.slides;
    }
    async _reloadIfActive() {
        var dataStore = this.dataStore;
        if (this == dataStore.activePresentation) {
            return this.reload();
        }
    }
    //
    // Updated and correct methods...
    //
    newSortIndexForSlide() {
        var maxSortIndex = new SlideSortKey(0);
        this.slides.forEach(slide => {
            var sortIndex = slide.sortIndex;
            if (sortIndex != null && sortIndex.compare(maxSortIndex) == 1) {
                maxSortIndex = sortIndex;
            }
        });
        return new SlideSortKey(maxSortIndex.components[0] + 1000);
    }
    newSortIndexForInsertingAfterSlide(slide) {
        var pool = this.slides.map(slide => slide.sortIndex);
        pool.sort((a, b) => a.compare(b));

        var left = slide.sortIndex;
        var leftIdx = pool.indexOf(left);
        if (leftIdx == -1 || leftIdx + 1 == pool.length) {
            return this.newSortIndexForSlide();
        }
        var right = pool[leftIdx + 1];

        return SlideSortKey.newUniqueValueBetween(
            left,
            right,
            pool,
        );
    }
    async changePropertyValue(property, value) {
        const previous = this[property];

        this[property] = value;

        try {
            await this.endpoint.updatePropertiesOfRecordAtLocation(
                { [property]: value },
                this.serviceLocator
            );
        }
        catch (err) {
            console.error("Error updating property on presentation", this, property, value, err);
            gSentry.exception(err);

            this[property] = previous;
            throw err;
        }
    }
    async _setTrashedValueOnSlides(trashed, listOfSlides, completion) {
        // XXX: would be nice to use updatePropertiesOfSlides()
        // as that could send changes out via Teleport...

        const stage = this.stage;
        const selection = stage.slide;

        const serverUpdates = {};
        listOfSlides.forEach(slide => {
            if (slide.trashed == trashed) {
                // Nothing to do
                return;
            }

            // Update the local object so it will appear/disappear from slide tray
            slide.trashed = trashed;
            // Denote the change to tell the server about
            serverUpdates[slide.identifier] = { trashed };

            // If its deleted and its the selection, clear the selection
            if (trashed == true && selection == slide) {
                stage.slide = null;
            }
        });

        this._postSlidesChangedNotification();
        this._updateThumbnailSlideID();

        let error = null;
        try {
            await this.updatePropertiesOfSlides(serverUpdates);
        }
        catch (err) {
            error = err;

            // There was an error, so
            for (let slideID in serverUpdates) {
                const trashed = serverUpdates[slideID];
                const slide = listOfSlides.find(slide => slide.identifier == slideID);
                // Restore the local object's flag so it will appear/disappear from slide tray
                slide.trashed = !serverUpdates[slideID];
                // If it was the selected slide, re-select it?
                if (slide == selection && stage.slide == null) {
                    stage.slide = slide;
                }
            }

            this._postSlidesChangedNotification();
            this._updateThumbnailSlideID();
        }

        if (completion != null) {
            completion(error);
        }
    }
    undeleteSlides(listOfSlides, completion) {
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'deleteSlides', listOfSlides);
        this._setTrashedValueOnSlides(false, listOfSlides, completion);
    }
    deleteSlides(listOfSlides, completion) {
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'undeleteSlides', listOfSlides);
        this._setTrashedValueOnSlides(true, listOfSlides, completion);
    }
    deleteSlide(slide, completion) {
        return this.deleteSlides([slide], completion);
    }
    /**
     * @return {Promise}
     */
    setSlideSiblings(slideID, previousID, nextID) {
        var slides = this.slides;
        if (slides.length <= 1) {
            // Nothing to do...
            return;
        }

        var slideIDs = slides.map(a => a.identifier);
        var currentIndex = slideIDs.indexOf(slideID);
        // Ensure we know of this slide...
        if (currentIndex == -1) {
            console.error("Couldn't find slide ID in slides", slideID, slides);
            return;
        }

        var oldPreviousID = null;
        var oldNextID = null;
        if (currentIndex > 0) {
            oldPreviousID = slideIDs[currentIndex - 1];
        }
        if (currentIndex + 1 < slideIDs.length) {
            oldNextID = slideIDs[currentIndex + 1];
        }
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'setSlideSiblings', slideID, oldPreviousID, oldNextID);

        //
        // Find all known sort indices for this presentation
        //
        var slideSortIndices = slides.map(a => a.sortIndex);
        slideSortIndices.sort((a, b) => a.compare(b));


        //
        // Find the slides involved with the move
        //
        var slideToMove = slides[currentIndex];
        var previousSlide = null;
        if (previousID != null) {
            const slideIndex = slideIDs.indexOf(previousID);
            if (slideIndex != -1) {
                previousSlide = slides[slideIndex];
            }
        }

        var nextSlide = null;
        if (nextID != null) {
            const slideIndex = slideIDs.indexOf(nextID);
            if (slideIndex != -1) {
                nextSlide = slides[slideIndex];
            }
        }

        if (previousSlide == null && nextSlide == null) {
            console.error("Couldn't find sibling slide(s) using: ", {previousID, nextID, slideIDs});
            return;
        }


        //
        // Perform the move
        //
        var targetIndex = null;
        var serverUpdates = {};

        if (nextSlide == null) {
            // This is the easiet – there is no slide to the right so we just append
            targetIndex = this.newSortIndexForSlide();
        }

        else if (previousSlide == null) {
            // We're moving to the head of the list, which seems simple,
            // but if there is already a slide there, we may need to move it too
            // to avoid us having a negative index
            var firstComponents = slideSortIndices[0].components;
            var targetComponents = [];
            for (var idx=0; idx<firstComponents.length; idx+=1) {
                var component = firstComponents[idx];
                if (component > 1) {
                    targetComponents.push(Math.floor(component / 2));
                    break;
                }
                else if (component == 1) {
                    targetComponents.push(0);
                    targetComponents.push(1000);
                    break;
                }
                targetComponents.push(0);
            }
            if (EqualObjects(targetComponents, firstComponents) == true) {
                targetComponents.push(1000);
            }
            targetIndex = new SlideSortKey(targetComponents);
        }

        if (targetIndex == null) {
            // If we've made it here we need to make a sandwich
            var movingIndex = slideToMove.sortIndex;
            var reduced = slideSortIndices.filter(key => (key.equals(movingIndex) == false));
            targetIndex = SlideSortKey.newUniqueValueBetween(
                previousSlide ? previousSlide.sortIndex : null,
                nextSlide ? nextSlide.sortIndex : null,
                reduced
            );
        }

        if (targetIndex != null) {
            if (targetIndex.equals(slideToMove.sortIndex) == false) {
                serverUpdates[slideToMove.identifier] = {sortIndex: targetIndex.toString()};
                slideToMove.sortIndex = targetIndex;
            }
        }

        if (Object.keys(serverUpdates).length == 0) {
            console.info("nothing changed??");
            return;
        }

        // Force an update...
        this.slides = this._sortChildren(this.slides);
        this.updatePropertiesOfSlides(serverUpdates);
    }
    async updatePropertiesOfSlides(serverUpdates) {
        // serverUpdates = hash array {uuid: {updates}}
        var slideIDs = Object.keys(serverUpdates);
        if (slideIDs.length == 0) {
            return;
        }

        const records = slideIDs.map(slideID => {
            const slide = this.slideWithIdentifier(slideID);
            if (slide == null) {
                return null;
            }

            // Ask the slide to encode itself
            const record = slide.encodeToRecord();

            // Apply the desired changes to the record
            const updates = serverUpdates[slideID];
            for (let key in updates) {
                record.encodeProperty(key, updates[key]);
            }

            return record;
        }).filter(record => record != null);

        try {
            await this._postSyncRecords(records);
        }
        catch (err) {
            console.error("error updating properties of slides", serverUpdates, err);
        }
    }
    async duplicateSlide(slide, slideCreatedCallback = null) {
        throw AbstractError();
    }
    async copySlideToPresentation(slide, presentation) {
        throw AbstractError();
    }
    doesAddingObjectRequireUpload(object) {
        var asset = object.getAssetForCloudy();
        if (asset == null) {
            return false;
        }
        if (IsKindOf(object, Media.Drawing) == true ||
            IsKindOf(object, Media.mmhmmTV) == true)
        {
            // Drawing slides are < 1KB in initial state
            // mmhmmTV slides don't really require their thumbnails
            // to be uploaded
            return false;
        }
        // If we're duplicating a slide that already exists on the
        // server, we won't need to upload it...
        if (IsKindOf(asset, CloudyAsset) == true && asset.uploaded == true) {
            return false;
        }
        // GIPHY slides would have assets, but they won't have
        // a file or blob... in theory anyway.
        return (asset.file != null || asset.blob != null);
    }
    doesAddingObjectsRequireUpload(objects) {
        var any = objects.find(obj => this.doesAddingObjectRequireUpload(obj));
        return (any != null);
    }
    /*
     * Sort comparisons
     */
    static compareDates(dateA, dateB) {
        if (dateA == null) {
            dateA = new Date(0);
        }

        if (dateB == null) {
            dateB = new Date(0);
        }

        var timeA = dateA.getTime();
        var timeB = dateB.getTime();
        if (timeA < timeB) {
            return 1;
        }
        else if (timeA > timeB) {
            return -1;
        }
        return 0;
    }
    compareDateCreated(otherPresentation) {
        const result = Presentation.compareDates(this.created, otherPresentation.created);
        if (result != 0) {
            return result;
        }
        return this.identifier.localeCompare(otherPresentation.identifier);
    }
    compareLastViewed(otherPresentation) {
        const result = Presentation.compareDates(this.lastViewed, otherPresentation.lastViewed);
        if (result != 0) {
            return result;
        }
        return this.identifier.localeCompare(otherPresentation.identifier);
    }
    compareTitle(otherPresentation, comparator) {
        var ours = this.title;
        var theirs = otherPresentation.title;
        if (comparator != null) {
            return comparator.compare(ours, theirs);
        }
        return ours.localeCompare(theirs);
    }
    /*
     * Notifications
     */
    _postSlidesChangedNotification() {
        NotificationCenter.default.postNotification(
            Presentation.Notifications.SlidesChanged,
            this,
            {}
        );
    }
    /*
     * Teleport
     */
    applyEvent(event, sender) {
        const updates = event?.value;
        if (updates == null) {
            return;
        }

        const title = updates.name;
        if (title != null) {
            this.title = title;
        }

        const slides = updates.slides;
        if (slides != null) {
            for (let slideID in slides) {
                const props = slides[slideID];
                const slide = this.slideWithIdentifier(slideID);
                if (slide == null) {
                    continue;
                }

                slide.applyEvent(props, sender);
            }

            // XXX: We could be more intelligent about these:
            // Updates may have changed the sort order
            this.slides = this._sortChildren(this.slides);
            // Updates may have changed what slide is our thumbnail
            this._updateThumbnailSlideID();
        }
    }
}

Presentation.Notifications = Object.freeze({
    SlidesChanged: "Presentation.SlidesChanged",
});
