//
//  models/pages/modern/page.js
//  mmhmm
//
//  Created by Steve White on 2/24/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Slide.Modern = class extends Slide {
    constructor(endpoint, record) {
        super();
        this.endpoint = endpoint;
        this._objects = [];
        this.remotePresenters = {};
        this.decodeFromRecord(record);
    }
    destroy() {
        var stage = this.stage;
        if (stage != null && stage.slide == this) {
            stage.slide = null;
        }
        // XXX: stop listening for slide thumbnails?
    }
    //
    // Properties
    //
    get speakerNotes() {
        return this._speakerNotes;
    }
    set speakerNotes(notes) {
        var previous = this._speakerNotes;
        if (previous == notes) {
            return;
        }
        if (notes == null) {
            // Special case when notes is null but previous wasn't,
            // to ensure that we send a value to the service when
            // performing persistence
            notes = "";
        }
        this._speakerNotes = notes;
        this.setObjectNeedsPersistence(this);
    }
    get title() {
        return this._title;
    }
    set title(title) {
        const previous = this._title;
        if (previous == title) {
            return;
        }
        this._title = title || "";
        this.setObjectNeedsPersistence(this);
    }

    //
    // Service helpers
    //
    get serviceLocator() {
        return `pagePresentations/${this.documentID}/pages/${this.identifier}`;
    }
    async _postSyncRecords(records, cancelSignal) {
        if (records == null || records.length == 0) {
            console.error("_postSyncRecords supplied with no records", records);
            return;
        }

        let queue = this._postQueue;
        if (queue == null) {
            queue = new SerializedQueue();
            this._postQueue = queue;
        }

        const promise = promiseWrapper();
        queue.add(() => {
            if (cancelSignal?.aborted == true) {
                promise.reject();
                return;
            }

            return this.endpoint._postSyncRecords(records, cancelSignal).then(results => {
                promise.resolve(results);
            }).catch(err => {
                promise.reject(err);
            });
        });
        return promise;
    }
    async reload() {
        let task = this._reloadTask;
        if (task != null) {
            return task;
        }

        task = new Promise(async (resolve, reject) => {
            try {
                const records = await this.endpoint._getSyncRecordsFrom(this.serviceLocator + "/full");

                const slide = records.find(record => record.id == this.identifier);
                const children = records.filter(record => record != slide);
                slide.children = children;
                this.decodeFromRecord(slide);
                resolve();
            }
            catch (err) {
                reject(err);
            }
        }).finally(() => {
            this._reloadTask = null;
        });
        this._reloadTask = task;
        return task;
    }
    decodeFromRecord(record) {
        this._decoding = true;
        try {
            this.identifier = record.id;
            this.documentID = record.documentId;
            this.ownerAccountID = record.ownerUserId;

            this.created = record.createdAt != null ? new Date(record.createdAt) : new Date();
            this.updated = record.updatedAt != null ? new Date(record.updatedAt) : new Date();

            // If this slide was created by importing a shared document,
            // this will be the document we imported from. This may be a
            // presentation ID, or it may be a slide ID, depending on which
            // was shared.
            const exportDocumentId = record.exportDocumentId;
            if (exportDocumentId != null) {
                this.exportDocumentId = exportDocumentId;
            }

            // If this slide was created by importing a shared document,
            // this will be the ID of the share (the export)
            const exportId = record.exportId;
            if (exportId != null) {
                this.exportId = exportId;
            }

            var title = record.decodeProperty("name", String, null);
            if (title != null && title.length == 0) {
                title = null;
            }
            this.title = title;
            this.sortIndex = record.decodeProperty("sortIndex", SlideSortKey);
            this.roomState = record.decodeProperty("room", Object, null);
            this.speakerNotes  = record.decodeProperty("speakerNotes", String, null);
            this.trashed = record.decodeProperty("trashed", Boolean);
            this.metadata = record.decodeProperty("metadata", Object, null);

            var children = record.children;
            if (children != null) {
                children.forEach(cRecord => {
                    try {
                        this.decodeChildFromRecord(cRecord);
                    }
                    catch (err) {
                        console.error("Error processing child record", err, cRecord, this);
                    }
                })
            }
        }
        finally {
            this._decoding = false;
        }

        this.migrateLegacyFieldsFromRecord(record);
    }

    migrateLegacyFieldsFromRecord(record) {
        const presenter = this.presenter;
        if (presenter != null) {
            // December 2024 introduced two z-index for presenters
            // One for the background, and one for the foreground.
            // See if the record has a foreground z-index and if not
            // assign it

            let presenterZ = presenter.decodeProperty("zIndex", Number, 1000);
            const content = presenter.decodeProperty("content", Object, {});
            if (content.foregroundZIndex == null) {
                // Assign the presenter's foreground to be directly above the background
                content.foregroundZIndex = presenterZ + 1;
                presenter.encodeProperty("content", content);
                this.setObjectNeedsPersistence(presenter);

                // Ensure media that was above the presenter continues to be
                // by shifting it +1 (otherwise one piece of media may occupy
                // the same z-index as the new presenter foreground value)
                this.objects.forEach(obj => {
                    if (obj.zIndex > presenterZ) {
                        obj.zIndex += 1;
                    }
                })
            }
        }

        // annotationStyle was previously stored on the Slide record
        // with the change to storing multiple Presenter records per Slide
        // this no longer makes sense:  If one presenter enabled it,
        // all presenters would switch to it next time the slide is loaded
        // Migrate legacy records over to the local presenter record
        const annotationStyle = record.decodeProperty("annotationStyle", String, null);
        if (annotationStyle != null && presenter != null) {
            const content = presenter.decodeProperty("content", Object, {});
            content.annotationStyle = annotationStyle;
            presenter.encodeProperty("content", content);
            this.setObjectNeedsPersistence(presenter);
            // Flag ourself as needing persistence which will remove the
            // old annotationStyle field
            this.setObjectNeedsPersistence(this);
        }

        // The backgroundHidden feature has been removed
        // If it is still turned on for an old slide, we need to
        // migrate by setting the slide's presenter settings accordingly
        const backgroundHidden = record.decodeProperty("backgroundHidden", Boolean, false);
        if (backgroundHidden == true && presenter != null) {
            const content = presenter.decodeProperty("content", Object, {});
            content.backgroundStyle = Presenter.BackgroundStyle.Show;
            content.shape = Presenter.Shape.Rectangle;
            delete content.style;
            presenter.encodeProperty("content", content);

            presenter.encodeProperty("fullscreen", true);
            presenter.encodeProperty("zIndex", 0);

            // Flag the slide record itself as needing persistence
            // so that we can remove the legacy backgroundHidden bit
            this.setObjectNeedsPersistence(this);
            this.setObjectNeedsPersistence(presenter);
        }

        // Historically there was a checkbox to move all media above presenters,
        // or to move all presenters above media.
        // This has been changed to allow more granular z-index control.
        // But we'll need to migrate over the existing checkbox value to
        // ensure things look right for legacy slides.
        var mediaOverPresenters = record.decodeProperty("mediaOverPresenters", Boolean, null);
        if (mediaOverPresenters != null) {
            console.info("Migrating legacy mediaOverPresenters on slide", this)
            var objects = this.objects;
            objects.sort((a, b) => {
                var zA = a.zIndex;
                var zB = b.zIndex;
                if (zA < zB) return -1;
                if (zA > zB) return 1;
                return 0;
            })

            var presenters = [this.presenter, ...Object.values(this.remotePresenters)].filter(obj => obj != null);
            if (mediaOverPresenters == true) {
                objects.unshift(...presenters);
            }
            else {
                objects.push(...presenters);
            }
            objects.forEach((obj, idx) => {
                if (IsKindOf(obj, CloudyRecord) == true) {
                    let zIndex = idx;
                    if (mediaOverPresenters == false) {
                        zIndex += Slide.Modern.DefaultPresenterZIndex;
                    }
                    obj.encodeProperty("zIndex", zIndex);
                    // XXX: This won't be sufficient for remote presenters :(
                    this.setObjectNeedsPersistence(obj);
                }
                else {
                    if (obj.zIndex != idx) {
                        obj.zIndex = idx;
                        this.mediaNeedsPersistence(obj);
                    }
                }
            })

            // Need to flag the slide record itself as needing persistence
            // so that we can remove the legacy mediaOverPresenters bit
            this.setObjectNeedsPersistence(this);
        }
    }
    decodeChildFromRecord(record, fromDecodeOperation=true) {
        var deleted = (record.deleted == true || record.decodeProperty("trashed", Boolean) == true);
        if (record.decodeProperty("type", String) == "presenter") {
            if (this.isRecordForLocalPresenter(record) == true) {
                this.presenter = record;
            }
            else {
                const presenterId = record.decodeProperty("presenterId", String);
                this.remotePresenters[presenterId] = record;
            }
            return;
        }

        var mediaID = record.id;
        var media = this.objectWithIdentifier(mediaID);
        if (deleted == true) {
            if (media != null) {
                this._objectWasRemoved(media);
            }
            return;
        }

        var endpoint = this.endpoint;
        if (media != null) {
            media.decodeFromModernRecord(record, endpoint);
        }
        else {
            media = Media.FromModernRecord(record, endpoint);
            if (media == null) {
                console.error("Unable to create media from record", record);
                return;
            }
            this._objectWasAdded(media, fromDecodeOperation);
        }
    }
    encodeToRecord(record) {
        if (record != null) {
            record.collection = mmhmmAPI.CloudyCollectionTypes.ModernSlide;
        }
        else {
            record = new CloudyRecord({
                collection: mmhmmAPI.CloudyCollectionTypes.ModernSlide,
            })
        }

        record.id = this.identifier;
        record.parentId = this.documentID;
        record.documentId = this.documentID;
        record.schemaVersion = 1;

        record.encodeProperty("name", this.title);
        record.encodeProperty("sortIndex", this.sortIndex);
        record.encodeProperty("room", this.roomState);
        record.encodeProperty("speakerNotes", this.speakerNotes);
        record.encodeProperty("trashed", this.trashed);
        if (this.metadata != null) {
            record.encodeProperty("metadata", this.metadata);
        }

        // Ensure old legacy fields are cleared
        record.encodeProperty("thumbnailAssetFingerprint", null);
        record.encodeProperty("annotationStyle", null, true);
        record.encodeProperty("mediaOverPresenters", null, true);
        record.encodeProperty("backgroundHidden", null, true);

        return record;
    }
    _newMediaRecord(recordID = null) {
        if (recordID == null) {
            recordID = createUUID();
        }
        var media = new CloudyRecord({
            collection: mmhmmAPI.CloudyCollectionTypes.Media,
            id: recordID,
            parentId: this.identifier,
            documentId: this.documentID,
            presentationId: this.documentID,
        });
        media.schemaVersion = 1;
        return media;
    }
    newRecordForPresenter(presenter, assignZIndex=true) {
        var record = this._newMediaRecord();
        if (assignZIndex == true) {
            presenter.zIndex = this.zIndexForNewObject(presenter);
        }
        presenter.encodeToModernRecord(record);
        return record;
    }
    isRecordForLocalPresenter(record) {
        const presenterID = record.decodeProperty("presenterId", String, null);
        return (presenterID == null);
    }
    hasRecordForPresenter(presenter) {
        const pid = presenter?.identifier;
        if (this.remotePresenters[pid] != null) {
            return true;
        }
        if (IsKindOf(presenter, LocalPresenter) == true &&
            this.presenter != null)
        {
            return true;
        }
        return false;
    }
    async newRecordForMedia(media, existingRecord = false) {
        var recordID = (existingRecord ? null : media.identifier);
        var record = this._newMediaRecord(recordID);
        media.encodeToModernRecord(record);

        var assetMap = {}

        var thumbnailAsset = media.thumbnailAsset;
        if (thumbnailAsset != null) {
            assetMap.thumbnailAsset = thumbnailAsset;
        }

        var asset = media.getAssetForCloudy();
        if (asset != null) {
            assetMap.contentAsset = asset;
        }

        var maskAsset = media.maskAsset;
        if (maskAsset != null) {
            assetMap.maskAsset = maskAsset;
        }

        if (Object.keys(assetMap).length == 0) {
            return record;
        }

        record.__assetsAndBlobs = [];

        for (var key in assetMap) {
            const asset = assetMap[key];

            var blob = null;
            var fingerprint = null;

            if (IsKindOf(asset, CloudyAsset) == true) {
                fingerprint = asset.fingerprint;
            }
            else {
                blob = await asset.openAsBlob();
                if (blob == null) {
                    throw "Couldn't find a blob/file on asset"
                }
                if (asset.blob == null) {
                    asset.blob = blob;
                }
                fingerprint = asset.fingerprint;
                if (fingerprint == null) {
                    fingerprint = await FingerprintForBlob(blob);
                    asset.fingerprint = fingerprint;
                }
            }
            record.encodeProperty(key + "Fingerprint", fingerprint);

            // XXX: come up with a better system...
            record.__assetsAndBlobs.push({
                asset: asset,
                fingerprint: fingerprint,
                blob: blob
            });
        }

        return record;
    }
    get hash() {
        // TODO does this need to respect useBackground?
        let str = `${this.identifier}`
        this.objects.forEach(object => {
            str += object.hash;
        });

        const room = this.roomState;
        if (room != null) {
            str += JSON.stringify(room);
        }

        const presenter = this.presenter;
        if (presenter != null) {
            for (let key in presenter.properties) {
                str += key + JSON.stringify(presenter.decodeProperty(key, Object));
            }
        }
        return cyrb53(str);
    }
    //
    // Settings copying
    //
    copyRoomSettingsFrom(otherSlide, invalidateThumbnail = true) {
        // Copy over room settings

        var applySettings = (room) => {
            var pRoom = this.roomState;

            var dirty = false;

            if (room != null && EqualObjects(pRoom, room) == false) {
                this.roomState = DeepCopy(room);
                dirty = true;
            }

            if (dirty == true) {
                this.appUndoManager?.registerUndoWithTargetBlock(this, () => applySettings(pRoom));

                this.setObjectNeedsPersistence(this);
                if (invalidateThumbnail == true) {
                    this.invalidateThumbnail();
                }
            }
            return dirty;
        }

        return applySettings(otherSlide.roomState);
    }
    copyPresenterSettingsFrom(otherSlide, invalidateThumbnail = true) {
        // Deal with copying the presenter
        var theirPresenter = otherSlide.presenter;
        if (theirPresenter == null) {
            return false;
        }

        var copyRecord = (record) => {
            var copy = record.copy();
            copy.id = createUUID();
            copy.parentId = this.identifier;
            copy.documentId = this.documentID;
            copy.presentationId = this.documentID;
            return copy;
        }

        var applySettings = (settings, theirRemotes) => {
            var ourPresenter = this.presenter;
            var previous = ourPresenter?.copy() ?? {};

            var updated = false;
            if (ourPresenter != null) {
                updated = ourPresenter.copyPropertiesFrom(settings);
            }
            else {
                // We don't have a presenter record, so we can just
                // copy theirs and use it
                var copy = copyRecord(settings);
                this.presenter = copy;
                updated = true;
            }

            var ourRemotes = this.remotePresenters;
            var previousRemotes = {};

            for (var presenterID in theirRemotes) {
                var ours = ourRemotes[presenterID];
                previousRemotes[presenterID] = ours.copy();

                var theirs = theirRemotes[presenterID];
                if (theirs.equals(ours) == false) {
                    ourRemotes[presenterID] = copyRecord(theirs);
                    updated = true;
                }
            }

            if (updated == true) {
                this.appUndoManager?.registerUndoWithTargetBlock(this, () => applySettings(previous, previousRemotes));

                this.setObjectNeedsPersistence(this.presenter);
                if (invalidateThumbnail == true) {
                    this.invalidateThumbnail();
                }
            }

            return updated;
        }

        return applySettings(theirPresenter, otherSlide.remotePresenters);
    }
    copyMediaSettingsFrom(otherSlide, invalidateThumbnail = true) {
        // If each slide only has one media, copy the media settings
        var ourMedia = this.objects;
        var theirMedia = otherSlide.objects;
        if (ourMedia.length != 1 || theirMedia.length != 1) {
            return false;
        }

        var applySettings = (settings) => {
            var previous = ourMedia[0].copy();

            var mediaDirty = ourMedia[0].copySettingsFrom(settings);
            if (mediaDirty == true) {
                // The media won't persist itself if it's not on stage, see
                // https://github.com/All-Turtles/mmhmm-web/issues/2068
                this.mediaNeedsPersistence(ourMedia[0]);
                if (invalidateThumbnail == true) {
                    this.invalidateThumbnail();
                }

                this.appUndoManager?.registerUndoWithTargetBlock(this, () => applySettings(previous));
            }
            return mediaDirty;
        }

        return applySettings(theirMedia[0]);
    }
    copySettingsFrom(otherSlide) {
        var dirty = false;

        this.appUndoManager?.beginUndoGrouping();
        dirty |= this.copyRoomSettingsFrom(otherSlide, false);
        dirty |= this.copyPresenterSettingsFrom(otherSlide, false);
        dirty |= this.copyMediaSettingsFrom(otherSlide, false);
        this.appUndoManager?.endUndoGrouping();

        if (dirty == true) {
            this.invalidateThumbnail();
        }
    }
    //
    // Slide helpers
    //
    set objects(list) {
        if (list == null) {
            list = [];
        }
        this._objects = Array.from(list);
    }
    get objects() {
        const objects = this._objects;
        if (objects == null) {
            return [];
        }
        return Array.from(objects);
    }
    get presenters() {
        const results = [];
        const presenter = this.presenter;
        if (presenter != null) {
            results.push(presenter);
        }
        results.push(...Object.values(this.remotePresenters));
        return results;
    }
    zIndexForNewObject(object) {
        const isPresenter = IsKindOf(object, Presenter);
        const presenters = this.presenters.map(record => record.decodeProperty("zIndex", Number, 0));
        if (presenters.length == 0 && isPresenter == false) {
            presenters.push(Slide.Modern.DefaultPresenterZIndices.Foreground);
        }

        const objects = this.objects.map(object => object.zIndex);

        let zIndices = objects.concat(presenters);
        zIndices.sort((a, b) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        })

        if (isPresenter == false) {
            zIndices = zIndices.filter(zIndex => zIndex < Slide.Modern.DefaultPresenterZIndices.Foreground);
        }

        const count = zIndices.length;
        if (count == 0) {
            return 0;
        }

        return zIndices[count - 1] + 1;
    }
    //
    // Thumbnails...
    //
    /*
     * @returns {HTMLElement=}
     */
    async thumbnail() {
        return ThumbnailStorage.shared.get(this);
    }
    async thumbnailBlob() {
        return ThumbnailStorage.shared.get(this, {decode: false});
    }
    invalidateThumbnail() {
        var invalidateDelay = this._invalidateThumbnailDelay;
        if (invalidateDelay != null) {
            window.clearTimeout(invalidateDelay);
        }

        invalidateDelay = window.setTimeout(() => {
            ThumbnailStorage.shared.delete(this);
            this.invalidateDelay = null;

            NotificationCenter.default.postNotification(
                Slide.Notifications.ThumbnailUpdated,
                this,
                {}
            );
        }, 10);

        this._invalidateThumbnailDelay = invalidateDelay;
    }
    mediaThumbnailUpdated(userInfo, name, object) {
        if (this._isKnownObject(object) == false) {
            return;
        }
        this.invalidateThumbnail();
    }
    //
    // Room helpers
    //
    roomWithIdentifier(roomID) {
        return RoomsController.shared.roomWithIdentifier(roomID);
    }
    get defaultRoom() {
        return RoomsController.shared.defaultRoom;
    }
    //
    // Stage helpers
    //
    async loadAssetsIntoCache() {
        var promise = this._loadAssetsIntoCachePromise;
        if (promise != null) {
            return promise;
        }

        var objects = this.objects;

        var roomState = this.roomState;
        var roomID = roomState?.id;
        if (roomID != null) {
            var room = this.roomWithIdentifier(roomID);
            if (room != null) {
                objects.push(room);
            }
        }

        var promises = objects.map(obj => obj.loadAssetsIntoCache());
        promise = Promise.allSettled(promises).then(() => this._loadAssetsIntoCachePromise = null);
        this._loadAssetsIntoCachePromise = promise;
        return promise;
    }
    attachToStage(stage) {
        super.attachToStage(stage);
        NotificationCenter.default.addObserver(
            Media.Notifications.ThumbnailUpdated,
            null,
            this.mediaThumbnailUpdated,
            this
        );
        this._activeNotifications = true;

        this.objects.forEach(obj => {
            obj.delegate = this;
        });

        this._applyPresenterSettings(stage);
        this._startPresenterObservation(stage);

        this._applyRoomSettings(stage);
        this._startRoomObservation(stage);
    }
    detachFromStage(stage) {
        super.detachFromStage(stage);
        if (this._activeNotifications == true) {
            NotificationCenter.default.removeObserver(
                Media.Notifications.ThumbnailUpdated,
                null,
                this.mediaThumbnailUpdated,
                this
            );
            this._activeNotifications = null;
        }

        this.objects.forEach(obj => {
            if (obj.needsPersistence == true) {
                obj.performPersistence();
            }
            obj.delegate = null;
        });

        this._stopRoomObservation(stage);
        this._stopPresenterObservation(stage);

        if (this._needsPersistenceTimeout != null) {
            this.performPersistence();
        }

        this.removedObjectIDs = null;
    }
    //
    // Media delegates
    //
    _isKnownObject(object) {
        var match = this.objectWithIdentifier(object.identifier);
        return (match != null);
    }
    async mediaNeedsPersistence(media) {
        // Ensure we know about the slide
        if (this._isKnownObject(media) == false) {
            console.error("mediaNeedsPersistence invoked with slide we're unaware of", media, this.objects);
            return Promise.resolve();
        }

        return this.newRecordForMedia(media, true).then(record => {
            //console.log("will update media using record", media, record);
            this.invalidateThumbnail();
            return this._postMediaRecords([media], [record]);
        });
    }
    mediaWasDeleted(records) {
        // Called when media are deleted via the media library
        // At this point they've already been purged from the service
        records.forEach(record => {
            var object = this.objectWithIdentifier(record.id);
            if (object != null) {
                this._objectWasRemoved(object);
            }
        });
    }
    mediaWasClosed(media) {
        var stage = this.stage;

        // Ensure we know about the slide
        var match = this.objectWithIdentifier(media.identifier);
        if (match == null) {
            // If we don't have a match, its either in error... or its
            // because a remote party added the slide, and since we don't
            // add them to our slides, we just need to hide it.
            // Here's hoping its generally the latter...
            if (stage != null) {
                stage.removeMedia(media);
            }
            return;
        }

        this.deleteObjects([media]);
    }
    //
    // Persistence
    //
    get needsPersistence() {
        var needsPersistence = this._needsPersistence;
        return (needsPersistence != null && needsPersistence.length > 0);
    }
    setObjectNeedsPersistence(object) {
        if (this.applyingEvent == true) {
            return;
        }
        if (object == this && this._decoding == true) {
            return;
        }

        var needsPersistence = this._needsPersistence;
        if (needsPersistence == null) {
            needsPersistence = [];
            this._needsPersistence = needsPersistence;
        }
        if (needsPersistence.indexOf(object) == -1) {
            needsPersistence.push(object);
        }

        this._startNeedsPersistenceTimeout();
    }
    async performPersistence() {
        // TODO prevent concurrent calls
        this._stopNeedsPersistenceTimeout();

        var needsPersistence = this._needsPersistence;
        if (needsPersistence == null || needsPersistence.length == 0) {
            return;
        }
        this._needsPersistence = [];

        var shouldInvalidateThumbnail = false;
        var records = needsPersistence.map(object => {
            if (object == this) {
                // Presumably because our room changed
                // Or some stage specific value (e.g. ???)
                return this.encodeToRecord();
            }
            else if (IsKindOf(object, Presenter) == true) {
                // Our presenter changed something important
                var record = this.presenter;
                if (record != null) {
                    object.encodeToModernRecord(record);
                }
                else {
                    record = this.newRecordForPresenter(object);
                    this.presenter = record;
                }
                shouldInvalidateThumbnail = true;
                return record;
            }
            else if (IsKindOf(object, CloudyRecord) == true) {
                // this is probably the presenter as well
                shouldInvalidateThumbnail = true;
                return object;
            }
            else {
                // XXX: presumably a slide in the future
                console.error("unhandled", object);
                debugger;
                shouldInvalidateThumbnail = true;
                return null;
            }
        }).filter(record => record != null);

        if (records.length == 0) {
            return;
        }

        if (shouldInvalidateThumbnail == true) {
            this.invalidateThumbnail();
        }

        //console.info("will update records: ", records, needsPersistence);

        return this._postSyncRecords(records).then(results => {
            this._processPersistenceResults(results);
        }).catch(err => {
            console.error("error updating records: ", err, records);
        })
    }
    _processPersistenceResults(results) {
        var records = results.map(result => {
            var status = result.status;
            if (status == null || status.success == false) {
                return null;
            }
            return result.record;
        })
        //console.info("updated records: ", results, records);

        if (records.length != results.length) {
            console.error("Mismatched records vs result lengths", records, results);
        }

        // Helper for handling the slide record, which *should* be us.
        var handlePageRecord = (record) => {
            if (record.id != this.identifier) {
                console.error("Got a page record that doesn't match IDs", this, record);
                return;
            }
            this.updated = new Date(record.updatedAt);
            // No other post-processing is required for slides
        }

        // Helper for handling Media records.
        // Presently just assumes it'll be the local presenter
        var handleMediaRecord = (record) => {
            if (record.decodeProperty("type", String) == "presenter") {
                // XXX: The record might be out of date at this point
                // how can we tell if its safe to process??
                if (this.isRecordForLocalPresenter(record) == true) {
                    this.presenter = record;
                    //console.log("updating local presenter record", record);
                }
            }
        }

        records.forEach(record => {
            var collection = record.collection;
            if (collection == mmhmmAPI.CloudyCollectionTypes.ModernSlide) {
                handlePageRecord(record);
            }
            else if (collection == mmhmmAPI.CloudyCollectionTypes.Media) {
                handleMediaRecord(record);
            }
            else {
                console.error("unexpected collection on record: ", record);
            }
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
        const persistenceTimeout = 3000; // ms

        this._needsPersistenceTimeout = window.setTimeout(() => {
            this.performPersistence();
        }, persistenceTimeout);
    }
    async prepareForDuplication() {
        var tasks = [];

        if (this.needsPersistence == true) {
            tasks.push(this.performPersistence());
        }

        var mTasks = this.objects.map(media => media.prepareForDuplication());
        tasks = tasks.concat(mTasks);

        return Promise.all(tasks);
    }
    //
    // Presenter Settings
    //
    _applyPresenterSettings(stage) {
        var localPresenter = stage.localPresenter;
        if (localPresenter == null) {
            return;
        }

        var presenter = this.presenter;
        if (presenter != null) {
            localPresenter.decodeFromModernRecord(presenter);
        }
        else {
            // We may not have had settings remembered yet, so
            // we'll remember the current state of the presenter
            this.presenter = this.newRecordForPresenter(localPresenter);
            this.setObjectNeedsPersistence(this.presenter);
        }
    }

    _observationKeysForPresenter(presenter) {
        const keys = presenter.mediaKeys();
        const additional = ["gestureRecognizer", "annotationStyle", "foregroundZIndex"];
        additional.forEach(addKey => {
            if (keys.includes(addKey) == false) {
                keys.push(addKey);
            }
        });
        return keys;
    }

    _startPresenterObservation(stage) {
        if (this._observingPresenter == true) {
            return;
        }
        this._observingPresenter = true;

        var localPresenter = stage.localPresenter;
        var presenterRecord = this.presenter;
        if (presenterRecord == null) {
            // If we were created with "use settings" turned off,
            // and then "use settings" is turned on and this slide
            // is viewed, it won't have a presenter record, so
            // this will fill it in with the current state...
            this.presenter = this.newRecordForPresenter(localPresenter);
            this.setObjectNeedsPersistence(this.presenter);
        }

        this._observationKeysForPresenter(localPresenter).forEach(key => {
            localPresenter.addObserverForProperty(this, key);
        });
        this.localPresenterEffect = localPresenter.effect;
    }
    _stopPresenterObservation(stage) {
        if (this._observingPresenter != true) {
            return;
        }
        this._observingPresenter = false;

        var presenter = stage.localPresenter;
        this._observationKeysForPresenter(presenter).forEach(key => {
            presenter.removeObserverForProperty(this, key);
        })
        this.localPresenterEffect = null;
    }
    set localPresenterEffect(effectOrNull) {
        var previous = this._localPresenterEffect;
        if (previous != null) {
            var params = previous.parameters;
            for (var key in params) {
                previous.removeObserverForProperty(this, key);
            }
        }

        this._localPresenterEffect = effectOrNull;

        if (effectOrNull != null) {
            const params = effectOrNull.parameters;
            for (const key in params) {
                effectOrNull.addObserverForProperty(this, key);
            }
        }
    }
    get localPresenterEffect() {
        return this._localPresenterEffect;
    }
    //
    // Room settings
    //
    _applyRoomSettings(stage) {
        var roomState = this.roomState;
        var room = stage.room;
        if (roomState == null) {
            // We may not have had settings remembered yet, so
            // we'll remember the current state of the room
            this._updatePersistedRoom(room);
            return;
        }

        var roomID = roomState.id;
        // Make a copy so we can mutate it and the room can too...
        var state = Object.assign({}, roomState.state);

        // Is the room current on stage?
        if (room?.identifier != roomID) {
            // No, so try and retrieve it
            room = this.roomWithIdentifier(roomID);
            if (room == null) {
                console.error("Could not find room with ID: ", roomID);
                room = this.defaultRoom;
            }
            // And make it the stage's room
            stage.room = room;
        }
        else {
            // As we're already in the room, we don't want it jumping
            // around: the playback of video/shader should be continuous
            // so delete currentTime or iTime.
            // XXX: we shouldn't have to have this knowledge...
            delete state.currentTime;
            var shader = state.shader;
            if (shader != null) {
                delete shader.time;
            }
        }

        if (Object.keys(state).length > 0) {
            room.applyEvent(state);
        }
    }
    _startRoomObservation(stage) {
        if (this._observingRoom == true) {
            return;
        }
        this._observingRoom = true;

        stage.addObserverForProperty(this, "room");

        if (this.roomState == null) {
            this._updatePersistedRoom(stage.room);
        }

        NotificationCenter.default.addObserver(
            Room.Notifications.SettingsChanged,
            null,
            this.roomSettingsChanged,
            this
        );
    }
    _stopRoomObservation(stage) {
        if (this._observingRoom != true) {
            return;
        }
        this._observingRoom = false;

        stage.removeObserverForProperty(this, "room");
        NotificationCenter.default.removeObserver(
            Room.Notifications.SettingsChanged,
            null,
            this.roomSettingsChanged,
            this
        );

    }
    roomSettingsChanged(info, name, object) {
        var stage = this.stage;
        if (stage == null || stage.slide != this) {
            // Well something went wrong...
            return;
        }

        var updatedRoom = object;
        var ourRoom = this.roomState;
        if (ourRoom != null && updatedRoom.identifier == ourRoom.id) {
            this._updatePersistedRoom(updatedRoom);
        }
    }
    _stateForRoom(room) {
        if (room == null) {
            return null;
        }
        return JSON.parse(JSON.stringify(room.toMedia()));
    }
    doesRoomRequireImport(room) {
        return RoomsController.shared.doesRoomRequireImport(room);
    }
    _updatePersistedRoom(room) {
        if (room == null) {
            room = this.defaultRoom;
        }

        const state = this._stateForRoom(room);
        if (EqualObjects(state, this.roomState) == true) {
            return;
        }
        this.roomState = state;
        this.invalidateThumbnail();

        if (this.doesRoomRequireImport(room) == false) {
            this.setObjectNeedsPersistence(this);
            return;
        }

        const switchToLocalRoom = (localRoom) => {
            const state = this.roomState;
            if (state.id != room.identifier) {
                // The room we started uploading is no longer
                // associated with this slide. Bail.
                return;
            }
            // We can keep the rest of the state, but need to
            // switch the room to point at our account's copy
            state.id = localRoom.identifier;
            this.setObjectNeedsPersistence(this);

            // If we're still on stage, switch the room over
            // to our copy so that if any changes are made
            // to it we can hopefully avoid this routine
            const stage = this.stage;
            if (stage != null && stage.room == room) {
                stage.room = localRoom;
            }
        };

        // Import is smart enough to only import the once...
        RoomsController.shared.importExternalAccountRoom(room).then((localRoom) => {
            const asset = localRoom.asset;
            if (asset == null) {
                switchToLocalRoom(localRoom);
                return;
            }

            // Ensure the asset is opened so we can send out a contentURL
            asset.open().then(() => {
                switchToLocalRoom(localRoom);
            }).catch((err) => {
                console.error("Error opening asset for imported room", localRoom, asset, err);
            }).finally(() => {
                asset.close();
            })
        })
    }
    //
    // Stage, Room & Presenter observation
    //
    _roomSettingsValueChanged() {
        this.invalidateThumbnail();

        var stage = this.stage;
        if (stage == null) {
            return;
        }


        this._applyRoomSettings(stage);
        this._startRoomObservation(stage);
    }
    _presenterSettingsValueChanged() {
        this.invalidateThumbnail();

        var stage = this.stage;
        if (stage == null) {
            return;
        }

        this._applyPresenterSettings(stage);
        this._startPresenterObservation(stage);
    }
    observePropertyChanged(obj, key, val) {
        if (key == "room") {
            this._updatePersistedRoom(val);
        }
        else {
            var record = this.presenter;
            if (record == null) {
                return;
            }

            if (obj == this.localPresenterEffect) {
                // We can't persist the effect – we need to
                // find the local presenter and flag that
                // as needing persistence instead.
                obj = null;
                var stage = this.stage;
                if (stage != null) {
                    obj = stage.localPresenter;
                }
                if (obj == null) {
                    return;
                }
            }
            else {
                if (key == "effect") {
                    this.localPresenterEffect = obj.effect;
                }
            }

            this.setObjectNeedsPersistence(obj);
        }
    }
    //
    // Media add/remove/replace helpers
    //
    _objectWasAdded(obj, fromDecodeOperation) {
        var objects = this.objects;
        if (objects.indexOf(obj) != -1) {
            return;
        }

        objects.push(obj);
        this.objects = objects;

        if (fromDecodeOperation != true) {
            this.invalidateThumbnail();
        }

        // If we're not currently on the stage, we can
        // add the object and move on
        var stage = this.stage;
        if (stage == null || stage.slide != this) {
            return;
        }

        obj.delegate = this;
        stage.displayMedia(obj);
    }
    _objectWasRemoved(obj) {
        var objects = this.objects;
        var objIdx = objects.indexOf(obj);
        if (objIdx == -1) {
            return;
        }

        obj.delegate = null;
        objects.splice(objIdx, 1);
        this.objects = objects;

        var removedObjectIDs = this.removedObjectIDs;
        if (removedObjectIDs == null) {
            removedObjectIDs = [];
            this.removedObjectIDs = removedObjectIDs;
        }
        removedObjectIDs.push(obj.identifier);

        this.invalidateThumbnail();

        var stage = this.stage;
        if (stage != null && stage.slide == this) {
            stage.removeMedia(obj);
        }
    }
    _assetsNeedingUploadInRecords(records) {
        return records.flatMap(record => {
            if (record == null) {
                return [];
            }
            var assetReferences = record.assetReferences;
            if (assetReferences == null || assetReferences.length == 0) {
                return [];
            }
            return assetReferences.filter(ref => (ref != null && ref.uploaded != true));
        });
    }
    _assetWithFingerprintInObjects(fingerprint, objects) {
        var numObjects = objects.length;
        for (var objectIdx=0; objectIdx<numObjects; objectIdx+=1) {
            var object = objects[objectIdx];
            if (object == null) {
                continue;
            }
            var assets = object.assets ?? [];
            var thumbnail = object.thumbnailAsset;
            if (thumbnail != null) {
                assets.push(thumbnail);
            }

            var numAssets = assets.length;
            for (var assetIdx=0; assetIdx<numAssets; assetIdx+=1) {
                var asset = assets[assetIdx];
                if (asset != null && asset.fingerprint == fingerprint) {
                    return asset;
                }
            }
        }
        return null;
    }
    async _postMediaRecords(objects, records, onProgress, cancelSignal) {
        // The records may have captured blobs we need to upload.
        // Retrieve them now
        var blobs = {};
        var assetsToClose = [];
        records.forEach(record => {
            var assetsAndBlobs = record.__assetsAndBlobs;
            if (assetsAndBlobs != null) {
                assetsAndBlobs.forEach(entry => {
                    blobs[entry.fingerprint] = entry.blob;
                    // XXX: Given we didn't *open* this,
                    // why are we then *closing* it??
                    //assetsToClose.push(entry.asset);
                })
            }
        })

        var closeBlobs = function() {
            assetsToClose.forEach(asset => asset.close());
        }

        // Upload the media records
        var endpoint = this.endpoint;
        var results = null;
        try {
            results = await this._postSyncRecords(records, cancelSignal);
            // XXX: check statuses?
            results = results.map(result => result.record);
        }
        catch (err) {
            if (cancelSignal?.aborted != true) {
                console.error("Error uploading media records: ", objects, records, err);
            }
            closeBlobs();
            throw err;
        }

        // We may have uploaded media whose assets already existed in the account
        // Ensure those assets have a presignedDownloadUrl set before we add
        // the media to the stage, to ensure there is a valid URL to share on the
        // call.
        var assetsToOpen = results.flatMap(record => {
            var assetRefs = record?.assetReferences ?? [];
            return assetRefs.filter(ref => {
                return (ref.uploaded == true && ref.presignedDownloadUrl == null);
            })
        });
        var tasks = assetsToOpen.map(asset => {
            return endpoint.getPresignedDownloadUrlForAsset(asset);
        })
        await Promise.all(tasks);

        // If we have blobs, upload them now.
        if (Object.keys(blobs).length > 0) {
            // Get all of the server asset references that need upload
            var assetsToUpload = this._assetsNeedingUploadInRecords(results);

            // For those assets, if we don't have a local blob for them,
            // create an async task where we will create the blob.
            var downloadTasks = assetsToUpload.map(ref => {
                var fingerprint = ref.fingerprint;
                var blob = blobs[fingerprint];
                if (blob != null) {
                    return Promise.resolve();
                }
                var asset = this._assetWithFingerprintInObjects(fingerprint, objects);
                if (asset == null) {
                    return Promise.resolve();
                }

                // If we .open() a cloudy asset we just get a url and need to close it.
                // If we .openAsBlob() we don't need to close it??
                // The asset system needs to be revisited...
                return asset.openAsBlob().then(blob => {
                    if (blob != null) {
                        blobs[fingerprint] = blob;
                        //assetsToClose.push(asset);
                    }
                });
            })

            // Wait for any outstanding download tasks to finish
            await Promise.all(downloadTasks);

            // And now we can upload everything to the service.
            try {
                results = await endpoint._uploadBlobsForCloudyRecords(blobs, results, onProgress, cancelSignal);
            }
            catch (err) {
                if (cancelSignal?.aborted != true) {
                    console.error("error uploading slide blobs", blobs, results, err);
                }
                throw err;
            }
            finally {
                closeBlobs();
            }
        }

        var removedObjectIDs = this.removedObjectIDs;
        objects = [];

        // This will then ensure the objects are up to date..
        results.forEach(record => {
            var recordID = record.id;
            if (removedObjectIDs != null && removedObjectIDs.indexOf(recordID) != -1) {
                // The recore was likely deleted between when we posted the
                // record and finished uploading the blob.
                return;
            }

            var obj = this.objectWithIdentifier(recordID);
            if (record.deleted == true ||
                record.decodeProperty("trashed", Boolean) == true)
            {
                if (obj != null) {
                    this._objectWasRemoved(obj);
                }
                return;
            }

            if (obj == null) {
                obj = objects.find(obj => obj.identifier == recordID);
                if (obj != null) {
                    // We just posted this, so it likely has a LocalAsset that
                    // is difficult to share on a call.  Provided we uploaded
                    // a blob for the file, replace the contentAsset with
                    // the CloudyAsset which is easier to share on a call
                    // given it has an https URL we can share.
                    var contentAssetFingerprint = record.decodeProperty("contentAssetFingerprint", String, null);
                    if (contentAssetFingerprint != null) {
                        obj.asset = record.decodeAssetReference(endpoint, {fingerprint: contentAssetFingerprint}, true);
                    }

                    this._objectWasAdded(obj, false);
                }
            }
            if (obj != null) {
                objects.push(obj);
            }
            this.decodeChildFromRecord(record);
        });

        return objects;
    }
    async _setTrashedValueOnObjects(trashed, listOfObjects) {
        if (trashed == true) {
            listOfObjects.forEach(obj => {
                const currentObj = this.objectWithIdentifier(obj.identifier);
                if (currentObj != null) {
                    this._objectWasRemoved(currentObj);
                }
            });
        }

        const records = listOfObjects.map(object => {
            var record = this._newMediaRecord(object.identifier);
            object.encodeToModernRecord(record);
            record.encodeProperty("trashed", trashed);
            return record;
        });

        try {
            const response = await this._postSyncRecords(records);
            if (trashed == false) {
                response.forEach(item => {
                    const record = item.record;
                    if (record != null) {
                        this.decodeChildFromRecord(record, false);
                    }
                })
            }
        }
        catch (error) {
            console.error("error updating media trashed properties", error, records, listOfObjects, this);
            if (trashed == true) {
                listOfObjects.forEach(obj => {
                    this._objectWasAdded(obj, false);
                })
            }
        }
    }
    undeleteObjects(listOfObjects) {
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'deleteObjects', listOfObjects);
        this._setTrashedValueOnObjects(false, listOfObjects);
    }
    deleteObjects(listOfObjects) {
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'undeleteObjects', listOfObjects);
        this._setTrashedValueOnObjects(true, listOfObjects);
    }
    addObjectWithoutPersisting(object) {
        const existing = this.objectWithIdentifier(object.identifier);
        if (existing != null) {
            return;
        }
        this._objectWasAdded(object, false);
    }
    async addObjects(objects, onProgress, cancelSignal, assignZIndex=true, addToUndoManager=true) {
        const undoManager = (addToUndoManager ? this.undoManager : null);
        const undoEntry = undoManager?.registerUndoWithTargetBlock(this, () => this.deleteObjects(objects));

        let removedObjectIDs = this.removedObjectIDs;
        if (removedObjectIDs == null) {
            removedObjectIDs = [];
        }

        objects.forEach((media, idx) => {
            const id = media.identifier;
            const removedIdx = removedObjectIDs.indexOf(id);
            if (removedIdx != -1) {
                removedObjectIDs.splice(removedIdx, 1);
            }

            if (assignZIndex == true) {
                media.zIndex = this.zIndexForNewObject(media);
            }

            if (this.doesAddingObjectRequireUpload(media) == false) {
                // This is safe to display right now, as
                // there isn't an asset to worry about sharing
                // on calls
                this._objectWasAdded(media, false);
            }
        });

        // Might be nice to upload them one at a time
        // Fudge the progress
        // And then if some, but not all fail, we still
        // display those that succeeded


        // newRecordForMedia is asynchronous due to blob fingerprinting...
        const promises = objects.map(obj => this.newRecordForMedia(obj));
        const records = await Promise.all(promises);

        records.forEach(record => record.encodeProperty("trashed", false));

        try {
            await this._postMediaRecords(objects, records, onProgress, cancelSignal);
        } catch (err) {
            if (undoEntry != null) {
                undoManager.removeEntry(undoEntry);
            }
            this.endpoint._deleteSyncRecords(records);
            throw err;
        }

        this.invalidateThumbnail();

        return this;
    }
    async replaceObject(toRemove, toAdd, copySettings=true, onProgress, cancelSignal) {
        var undo = this.undoManager;
        var result = null;
        try {
            // The remove and add methods will attempt to add things to the undo manager
            // We do not want these as if an error occurs before both complete those
            // actions aren't helpful.  So we'll discard them here...
            undo?.disableUndoRegistration();

            // XXX: error handling
            if (copySettings == true) {
                toAdd.copySettingsFrom(toRemove);
            }

            this.mediaWasClosed(toRemove);
            toAdd.zIndex = toRemove.zIndex;

            const assignZIndices = false;
            result = await this.addObjects([toAdd], onProgress, cancelSignal, assignZIndices);

            // And if we made it here both operations were successful and we'll
            // register a new action to reverse the replacement.
            undo?.enableUndoRegistration();
            undo?.registerUndoWithTargetSlotArguments(this, 'replaceObject', toAdd, toRemove, false);
        }
        catch (err) {
            // XXX: Should this always add it back?
            // e.g. assume mediaWasClosed() was successful, but then addObjects hit a network issue
            // We'll land here with a networking error, but the user won't have cancelled, so
            // they'll be in a state where the media was removed and can't be brought back...
            if (cancelSignal?.aborted == false) {
                undo?.enableUndoRegistration();
            }
            else {
                // If this replacement was cancelled, we need to restore
                // the item that was removed.
                // No progress, no signal, just add the item back and re-enable undo.
                this.addObjects([toRemove], null, null, false).finally(() => {
                    undo?.enableUndoRegistration();
                });
            }
            throw err;
        }

        return result;
    }
    /*
     * Teleport
     */
    applyEvent(event, sender) {
        super.applyEvent(event, sender);

        const action = event?.action;
        if (action == "speakerNotes") {
            this.speakerNotes = event.value;
        }
        else if (action == "remove-children") {
            const objectIDs = event.value;
            objectIDs.forEach(objectID => {
                const object = this.objectWithIdentifier(objectID);
                if (object != null) {
                    this._objectWasRemoved(object);
                }
            })
        }
        else if (action == "copy-settings") {
            const data = event.value;
            this.applyCopySettingsEvent(data.type, data.source);
        }
    }
    applyCopySettingsEvent(action, sourceID) {
        const presentation = this.presentation;
        if (presentation == null) {
            return;
        }

        const source = presentation.slideWithIdentifier(sourceID);
        if (source == null) {
            console.error("Couldn't find slide with ID", this, presentation, sourceID);
            return;
        }

        switch (action) {
            case "room":
                this.copyRoomSettingsFrom(source);
                break;
            case "presenter":
                this.copyPresenterSettingsFrom(source);
                break;
            case "media":
                this.copyMediaSettingsFrom(source);
                break;
            case "all":
                this.copySettingsFrom(source);
                break;
        }
    }
}

Slide.Modern.DefaultPresenterZIndices = Object.freeze({
    Background: 0,
    Foreground: 10000,
});
