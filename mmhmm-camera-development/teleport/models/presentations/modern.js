//
//  models/presentations/pages.js
//  mmhmm
//
//  Created by Steve White on 2/24/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Presentation.Modern = class extends Presentation {
    constructor(endpoint, cloudyObj) {
        super(endpoint, cloudyObj);
    }
    get serviceLocator() {
        return `pagePresentations/${this.identifier}`;
    }
    /*
     * Service helpers
     */
    decodeFromRecord(record) {
        this._decoding = true;
        super.decodeFromRecord(record);

        this.hasThumbnailSlideID = record.hasProperty("thumbnailSlideID");
        if (this.hasThumbnailSlideID == true) {
            this.thumbnailSlideID = record.decodeProperty("thumbnailSlideID", String, null);
        }
        this._decoding = false;
    }
    encodeToRecord(record) {
        super.encodeToRecord(record);
        record.schemaVersion = 1;

        // Early on in pages we'd persist settings.  We no longer
        // use these and we'd like to ensure the legacy data
        // gets purged
        record.encodeProperty("settings", null, true);

        record.encodeProperty("thumbnailSlideID", this.thumbnailSlideID, true); // true to force null values through
    }
    /*
     * Properties
     */
    set thumbnailSlideID(slideID) {
        // We don't want to update properties if there aren't any changes
        // But if we haven't seen a thumbnail slide id before, our value
        // is null.  And if the value to set is null, then we'd end up
        // bailing out.  We need to persist this initial null to the service
        // so that in the future we'll know that the null value was intentional
        if (slideID == this._thumbnailSlideID && this.hasThumbnailSlideID == true) {
            return;
        }
        this._thumbnailSlideID = slideID;
        this.hasThumbnailSlideID = true;
        this.setNeedsPersistence();
    }
    get thumbnailSlideID() {
        return this._thumbnailSlideID;
    }
    /*
     * Persistence
     */
    setNeedsPersistence() {
        if (this._decoding == true) {
            return;
        }

        this._needsPersistence = true;
        this._stopNeedsPersistenceTimeout();
        this._startNeedsPersistenceTimeout();
    }
    get needsPersistence() {
        return this._needsPersistence;
    }
    performPersistence() {
        this._stopNeedsPersistenceTimeout();
        this._needsPersistence = false;

        var ourID = this.identifier;
        var record = new CloudyRecord({
            collection: mmhmmAPI.CloudyCollectionTypes.ModernPresentation,
            id: ourID,
            parentId: ourID,
            documentId: ourID,
        })
        this.encodeToRecord(record);

        this._postSyncRecords([record]).then(response => {
            if (response == null || response.length != 1) {
                console.error("Unexpected response updating presentation", this, record, response);
                return;
            }
            var result = response[0];
            var status = result.status;
            if (status == null || status.success != true) {
                console.error("Bad status updating presentation", this, record, response);
                return;
            }

            var record = result.record;
            if (record == null) {
                console.error("No record in response?", this, record, response);
                return;
            }

            this.decodeFromRecord(record);
        }).catch(err => {
            console.error("Error persisting presentation", this, record, err);
        })
    }
    _stopNeedsPersistenceTimeout() {
        var timeout = this._needsPersistenceTimeout;
        if (timeout != null) {
            window.clearTimeout(timeout);
            this._needsPersistenceTimeout = null;
        }
    }
    _startNeedsPersistenceTimeout() {
        this._stopNeedsPersistenceTimeout();
        this._needsPersistenceTimeout = window.setTimeout(() => {
            this._needsPersistenceTimeout = null;
            this.performPersistence();
        }, 3000);
    }
    /*
     * Presentation overrides
     */
    serviceLocationForSlideWithID(slideID) {
        return `${this.serviceLocator}/pages/${slideID}/full`;
    }
    async _retrieveSyncRecords() {
        return this.endpoint._getV2SyncRecordsFrom(this.serviceLocator);
    }
    async _refreshServerContent() {
        var records = await this._retrieveSyncRecords();

        var ourRecord = records.find(record => record.id == this.identifier);
        if (ourRecord != null) {
            this.decodeFromRecord(ourRecord);
        }

        var slideRecords = records.filter(record => record.collection == mmhmmAPI.CloudyCollectionTypes.ModernSlide);
        var mediaRecords = records.filter(record => record.collection == mmhmmAPI.CloudyCollectionTypes.Media);

        var slides = slideRecords.map(pRecord => {
            var slideID = pRecord.id;
            pRecord.children = mediaRecords.filter(record => record.parentId == slideID);

            return this.decodeSlideFromRecord(pRecord, false);
        })

        this.slides = slides;

        return slides;
    }
    // Could be use for the sync websocket/etc.
    decodeSlideFromRecord(record, addToSlides = true) {
        var deleted = (record.deleted == true || record.decodeProperty("trashed", Boolean) == true);

        var slide = this.slideWithIdentifier(record.id);
        if (deleted == true) {
            if (slide != null) {
                const slides = this.slides;
                var slideIdx = slides.indexOf(slide);
                if (slideIdx != null) {
                    slides.splice(slideIdx, 1);
                    this.slides = slides;
                }
            }
            return;
        }

        if (slide != null) {
            const before = slide.hash;
            slide.decodeFromRecord(record);
            const after = slide.hash;
            if (before != after && slide.invalidateThumbnail != null) {
                slide.invalidateThumbnail();
            }
        }
        else {
            slide = this.newSlideForRecord(record);
            if (addToSlides == true) {
                const slides = this.slides;
                slides.push(slide);
                this.slides = slides;
            }
        }

        return slide;
    }
    newSlideForRecord(record) {
        return new Slide.Modern(this.endpoint, record);
    }
    //
    // Slide & media creation
    //
    newSlideObject(room, presenter) {
        var docID = this.identifier;
        var pageID = createUUID();

        var record = new CloudyRecord({
            collection: mmhmmAPI.CloudyCollectionTypes.ModernSlide,
            id: pageID,
            parentId: docID,
            documentId: docID,
            presentationId: docID,
            ownerUserId: this.ownerAccountID,
        });

        var slide = this.newSlideForRecord(record);
        if (room != null) {
            slide.roomState = slide._stateForRoom(room);
        }
        if (presenter != null) {
            slide.presenter = slide.newRecordForPresenter(presenter);
        }
        return slide;
    }
    // Creates a new blank slide without saving it to the service
    newSlideObjectWithMetadata(room, presenter, metadata, title) {
        const stage = this.stage;
        room = room ?? stage.room;
        presenter = presenter ?? stage.localPresenter;

        // Create the new slide
        const slide = this.newSlideObject(room, presenter);
        slide.metadata = metadata;

        // Bypass the setter; it triggers persistence
        if (title) {
            slide._title = title;
        }

        // Sort the slide into a sensible location
        slide.sortIndex = this.newSortIndexForSlide();

        // Mark that the slide has never been persisted
        slide.hasBeenPersisted = false;

        return slide;
    }
    addSlideObject(slide) {
        const slides = this.slides;
        slides.push(slide);
        this.slides = slides;
    }
    // Creates an empty slide
    async createNewSlide(room, presenter) {
        return this.createNewSlideWithObjects(room, presenter);
    }
    // Creates a single slide with many objects
    async createNewSlideWithObjects(room, presenter, objects = [], onProgress, cancelSignal, assignZ=true, metadata=null) {
        const slide = this.newSlideObjectWithMetadata(room, presenter, metadata);
        this.addSlideObject(slide);
        return this.addSlideWithObjects(slide, objects, onProgress, cancelSignal, null, assignZ);
    }
    // Completes the creation process for a new slide that hasn't been persisted yet
    async addSlideWithObjects(slide, objects, onProgress, cancelSignal, analyticsProperties, assignZ=true) {
        if (objects == null) {
            objects = [];
        }

        // TODO sortIndex and adding the slide are redundant and need to be refactored
        if (this.containsSlide(slide) == false) {
            slide.sortIndex = this.newSortIndexForSlide();

            const slides = this.slides;
            slides.push(slide);
            this.slides = slides;
        }

        var undo = this.undoManager;
        var undone = false;
        var undoEntry = undo?.registerUndoWithTargetBlock(this, () => {
            var match = this.slides.find(aSlide => aSlide.identifier == slide.identifier);
            if (match != null) {
                this.deleteSlides([match]);
            }
            undone = true;
        });

        // The records we need to upload
        var records = [];
        var slideRecord = slide.encodeToRecord();
        records.push(slideRecord);

        // Create a record for the presenter
        var presenterRecord = slide.presenter;
        if (presenterRecord != null) {
            records.push(presenterRecord);
        }

        // Helper for removing the slide on error
        var serverRecords = [];
        var rollback = () => {
            var slides = this.slides;
            var slideIdx = slides.indexOf(slide);
            if (slideIdx != -1) {
                slides.splice(slideIdx, 1);
                this.slides = slides;
            }
            if (this.isActivePresentation == true) {
                var stage = this.stage;
                if (stage.slide == slide) {
                    stage.slide = null;
                }
            }
            if (undoEntry != null) {
                undo.removeEntry(undoEntry);
            }
            this.endpoint._deleteSyncRecords(serverRecords);
        }

        try {
            // Upload slide records
            var results = await this._postSyncRecords(records, cancelSignal);
            results.forEach(result => {
                var record = result.record;
                serverRecords.push(record);

                // XXX: Check the result.status ??
                if (record.collection == mmhmmAPI.CloudyCollectionTypes.ModernSlide) {
                    slide.decodeFromRecord(record);
                }
                else {
                    slide.decodeChildFromRecord(record);
                }
            })

            const props = analyticsProperties || {};
            props.presentation_id = this.identifier;
            Analytics.Log("presentation.slides.added", props);

            // Then upload the objects...
            if (objects.length == 0) {
                if (onProgress != null) {
                    onProgress(1.0);
                }
            }
            else {
                // We can't group undo manager calls here due to potential network latency
                // If we don't group them, then two undo entries will be created
                // (1. Add Slide, 2. Add Objects to Slide)
                // So we disable adding to undo inside addObjects, which leaves us with
                // the single action.
                const addToUndo = false;
                var result = await slide.addObjects(objects, onProgress, cancelSignal, assignZ, addToUndo).catch(err => {
                    if (cancelSignal?.aborted != true) {
                        console.error("error adding objects to slide", objects, slide, err);
                    }
                    rollback();
                    throw err;
                })
                return result;
            }
        }
        catch (err) {
            rollback();
            if (cancelSignal?.aborted != true) {
                console.error("caught error: ", err);
            }
            throw err;
        }
        if (undone == true) {
            return null;
        }
        console.log("returning slide: ", slide);
        return slide;
    }
    mediaWasDeleted(records) {
        // Notify each slide
        var mediaBySlide = groupArrayBy(records, "parentId");
        Object.entries(mediaBySlide).forEach(entry => {
            const [slideId, recordsForSlide] = entry;
            var slide = this.slideWithIdentifier(slideId);
            if (slide == null) {
                return;
            }
            slide.mediaWasDeleted(recordsForSlide);
        });
    }
    async deleteSlide(slide) {
        // Ensure we know of the slide
        const knownSlide = this.slideWithIdentifier(slide.identifier);
        if (knownSlide == null) {
            throw "Asked to delete a slide we don't contain";
        }

        return super.deleteSlide(knownSlide);
    }
    //
    // Duplicate/copy/move
    //
    async prepareForDuplication(slides) {
        if (slides == null) {
            slides = this.slides;
        }
        var tasks = slides.map(slide => slide.prepareForDuplication());
        return Promise.all(tasks);
    }
    async recordsForSlidesWithIDs(slideIDs) {
        const numSlides = slideIDs.length;
        if (numSlides == 0) {
            return [];
        }
        else if (numSlides == 1) {
            const locator = this.serviceLocationForSlideWithID(slideIDs[0]);
            return this.endpoint._getSyncRecordsFrom(locator);
        }

        var records = await this._retrieveSyncRecords();
        return records.filter(record => {
            if (slideIDs.indexOf(record.id) != -1) {
                return record;
            }
            else if (slideIDs.indexOf(record.parentId) != -1) {
                return record;
            }
            return null;
        });
    }
    async recordsForCopyingSlides(slides) {
        const slideIDs = slides.map(slide => slide.identifier);
        const allRecords = await this.recordsForSlidesWithIDs(slideIDs);

        const results = {};

        // Get only the slide records, being careful to preserve the original ordering
        slides.forEach(slide => {
            const slideID = slide.identifier;

            var slideRecord = allRecords.find(record => record.id == slideID);
            if (slideRecord == null) {
                console.error("Couldn't find slide with ID", slide.identifier);
            }
            else {
                results[slide.identifier] = {
                    parent: slideRecord,
                    children: allRecords.filter(record => record.parentId == slideID)
                };
            }
        });

        for (let oldSlideID in results) {
            const newID = createUUID();

            const entry = results[oldSlideID];
            entry.parent.id = newID;
            entry.children.forEach(child => {
                child.id = createUUID();
                child.parentId = newID;
            })
        }

        return results;
    }
    async duplicateSlide(slide, slideCreatedCallback = null) {
        return this.copySlideToPresentation(slide, this, slideCreatedCallback);
    }
    async copySlideToPresentation(slide, presentation, slideCreatedCallback = null) {
        return this.copySlidesToPresentation([slide], presentation, slideCreatedCallback);
    }
    async copySlidesToPresentation(slides, presentation, slideCreatedCallback = null, afterPreparedCallback = null, addToUndo = true) {
        // Ensure the slides and their media have fully persisted
        // as we're getting their records back from the service
        await this.prepareForDuplication(slides);

        // Grab the records for the slides and their media
        var recordMap = await this.recordsForCopyingSlides(slides, true);
        var records = [];
        for (var oldSlideID in recordMap) {
            var entry = recordMap[oldSlideID];
            records.push(entry.parent);
            records.push(...entry.children);
        }

        // Assign the destination presentation ID to the records
        var presentationID = presentation.identifier;
        records.forEach(record => {
            record.documentId = presentationID;
            record.ownerUserId = presentation.ownerAccountID;
            if (record.collection == mmhmmAPI.CloudyCollectionTypes.ModernSlide) {
                record.parentId = presentationID;
            }
        })

        var slideIDs = records.filter(record => record.collection == mmhmmAPI.CloudyCollectionTypes.ModernSlide)
                              .map(record => record.id);
        const undoManager = (addToUndo ? this.undoManager : null);
        undoManager?.registerUndoWithTargetBlock(this, () => {
            var slides = presentation.slides.filter(slide => slideIDs.indexOf(slide.identifier) != -1);
            presentation.deleteSlides(slides);
        });

        if (afterPreparedCallback != null) {
            afterPreparedCallback();
        }

        // Figure out the starting source index where the slides will appear
        var sortIndex = null;
        if (presentation == this) {
            sortIndex = this.newSortIndexForInsertingAfterSlide(slides[0]);
        }
        if (sortIndex == null) {
            const selectedSlide = this.stage.slide;
            if (selectedSlide != null && presentation.containsSlide(selectedSlide)) {
                sortIndex = presentation.newSortIndexForInsertingAfterSlide(selectedSlide);
            } else {
                sortIndex = presentation.newSortIndexForSlide();
            }
        }

        // What we can add to the above to keep getting unique sort indices...
        var sortIndexComponents = new Array(sortIndex.components.length);
        sortIndexComponents.fill(0);
        sortIndexComponents.push(1000);

        // Apply sort indices to all of the slide records
        var slideRecords = records.filter(record => record.collection == mmhmmAPI.CloudyCollectionTypes.ModernSlide);
        slideRecords.forEach(record => {
            record.encodeProperty("sortIndex", sortIndex);
            if (sortIndex != null) {
                sortIndex = sortIndex.newValueByAdding(sortIndexComponents);
            }
        })

        var optimisticallyAdded = false;
        if (presentation == this || presentation.loaded == true) {
            // We know the presentation isn't legacy due to method entry check
            // We know duplicating a slide is generally safe since it should already be uploaded
            // Waiting for the records to post is s-l-o-w, which makes duplicating slides feel broken
            // So, we'll go ahead and create a new Slide object for the records
            // and immediately make it visible
            slideRecords.forEach(record => {
                var recordID = record.id;
                record.children = records.filter(other => other.parentId == recordID);

                // We don't need to tell the presentation to add the decoded object,
                // because its decodeSlideFromRecord will do that automatically...
                var newSlide = presentation.decodeSlideFromRecord(record);
                if (slideCreatedCallback != null) {
                    for (let oldSlideID in recordMap) {
                        if (recordMap[oldSlideID].parent.id == newSlide.identifier) {
                            newSlide.sourceID = oldSlideID;
                        }
                    }
                    slideCreatedCallback(newSlide);
                }
                delete record.children; // service endpoint will get upset.
            });

            optimisticallyAdded = true;
        }

        var results = [];
        try {
            await presentation._postSyncRecords(records);

            for (let oldSlideID in recordMap) {
                const entry = recordMap[oldSlideID];
                const slide = presentation.slideWithIdentifier(entry.parent.id);
                if (slide != null) {
                    results.push(slide);
                }
            }
        }
        catch (err) {
            console.error("error copying slides", err, slides, records, presentation);
            if (optimisticallyAdded == true) {
                // There was an error, so rollback our optimism
                records.forEach(record => record.deleted == true);
                slideRecords.forEach(record => {
                    presentation.decodeSlideFromRecord(record);
                });
            }
        }

        if (optimisticallyAdded == false) {
            presentation._reloadIfActive();
        }

        Analytics.Log("presentation.slides.copied", {presentation_id: this.identifier});

        return results;
    }
    async getSlideForThumbnail() {
        // Are we loaded?
        if (this.loaded == true) {
            // Yes, then this is quite easy.
            return this.slides.filter(slide => slide.trashed !== true)[0];
        }

        // Are we already fetching data from the service?
        let thumbnailSignal = this._thumbnailBusySignal;
        if (thumbnailSignal != null) {
            // Yes, wait for that to complete
            await thumbnailSignal;
        }

        thumbnailSignal = promiseWrapper();
        this._thumbnailBusySignal = thumbnailSignal;

        // We're not loaded. Do we know the ID of our first slide?
        const thumbnailSlideID = this.thumbnailSlideID;
        if (thumbnailSlideID != null) {
            // While we may not be loaded, we may have already fetched it
            // and stored it in our list of slides
            let slide = this.slides.find(slide => slide.identifier == thumbnailSlideID);
            if (slide != null) {
                thumbnailSignal.resolve();
                this._thumbnailBusySignal = null;
                return slide;
            }

            // We need to request the records that are needed to
            // reconstruct the slide
            // XXX: Would be nice to not have to know /pages/:id here.
            const key = this.serviceLocationForSlideWithID(thumbnailSlideID);
            try {
                const records = await this.endpoint._getSyncRecordsFrom(key);
                const page = records.find(record => record.collection == mmhmmAPI.CloudyCollectionTypes.ModernSlide);
                page.children = records.filter(record => record != page);
                // decode will add it to the presentation so it'll exist next time
                slide = this.decodeSlideFromRecord(page);
                if (slide != null) {
                    thumbnailSignal.resolve();
                    this._thumbnailBusySignal = null;
                    return slide;
                }
            }
            catch (err) {
                console.error("Error retrieving sync record: ", key, err)
            }
        }

        // Either we don't know our first slide's ID, or something failed
        // with the network.  Try to forcibly load the entire presentation
        try {
            await this.reload();
        }
        finally {
            thumbnailSignal.resolve();
            this._thumbnailBusySignal = null;
        }

        // We're now in a loaded state.. if we have slides use the first one
        const slide = this.slides[0];
        if (slide != null) {
            // Persist the ID to expedite the process in the future
            this.thumbnailSlideID = slide.identifier;
        }

        return slide;
    }
}
