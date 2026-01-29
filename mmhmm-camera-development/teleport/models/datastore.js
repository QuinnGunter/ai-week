//
//  presentation_list.js
//  mmhmm
//
//  Created by Steve White on 9/9/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

const PresentationSort = {
    Viewed: 1,
    Name: 2,
    Created: 3,
};

class DataStore extends ObservableObject {
    constructor(endpoint, cacheStore) {
        super();

        this.endpoint = endpoint;
        this.cacheStore = cacheStore;

        // Track the user ID so we can tell when sign out/in
        // events happened.
        var accountID = null;
        if (endpoint.isAuthenticated == false) {
            cacheStore.setPresentations(null);
        }
        else {
            accountID = endpoint.user.id;
        }
        this.lastAccountID = accountID;

        // Define properties for KVO purposes
        this._presentations = [];
        this._activePresentation = null;
        this.automaticallyNotifiesObserversOfActivePresentation = false;

        NotificationCenter.default.addObserver(
            mmhmmAPI.Notifications.PresentationsChanged,
            null,
            this.handlePresentationsChanged,
            this
        );

        this.cacheLoadPromise = promiseWrapper();
        this.initialRefreshPromise = promiseWrapper();
        this.initialRefreshComplete = false;
        this.refreshingPresentationsList = false;
        cacheStore.getPresentations().then(list => {
            if (list != null) {
                var records = list.map(encoded => new CloudyRecord(encoded));
                records = records.filter(record => record.ownerUserId == accountID);

                try {
                    this.processPresentationList(records, true);
                }
                catch (err) {
                    console.error("processPresentationList (cached) threw: ", list, err);
                }
            }
            this.cacheLoadPromise.resolve();
        }).finally(() => {
            this.refreshPresentationsList().then(_ => {
                this.initialRefreshComplete = true;
                this.initialRefreshPromise.resolve();
            });

            NotificationCenter.default.addObserver(
                mmhmmAPI.Notifications.AuthenticationChanged,
                null,
                this.handleAuthenticationChanged,
                this
            );
        })


        if (endpoint.isAuthenticated == true) {
            this.startWebSocketClient();
        }
    }
    /*
     * Presentations
     */
    async refreshPresentationsList(clearExistingRecords = false) {
        if (this.refreshingPresentationsList == true) {
            return;
        }
        this.refreshingPresentationsList = true;

        if (clearExistingRecords == true) {
            console.log("Clearing existing presentations list");
            this.presentations = [];
        }

        const endpoint = this.endpoint;
        const hasValidAuth = (endpoint != null && endpoint.isAuthenticated == true);
        let records = null;

        if (hasValidAuth == true) {
            try {
                records = await endpoint.listPresentations();
            } catch (err) {
                console.error("listPresentations threw: ", err);
                gSentry.exception(err);

                if (!clearExistingRecords) {
                    // A routine failure to refresh the list
                    // can just be ignored
                    this.refreshingPresentationsList = false;
                    return;
                }
            }

            if (records != null) {
                this.cacheStore.setPresentations(records);
            }
        }

        try {
            if (records == null) {
                records = [];
            }

            this.processPresentationList(records, false);
        }
        finally {
            this.refreshingPresentationsList = false;
        }
    }
    processPresentationList(records, fromCache=false) {
        var endpoint = this.endpoint;
        var userID = null;
        var scratchPad = this.scratchPadPresentation;

        //
        // Handle the special scratch pad presentation
        //
        if (endpoint != null && endpoint.isAuthenticated == true) {
            userID = endpoint.user.id;
            if (IsKindOf(scratchPad, Presentation.ScratchPad) == false) {
                scratchPad = new Presentation.ScratchPad(endpoint);
            }
        }
        else {
            if (IsKindOf(scratchPad, Presentation.AccountLess) == false) {
                scratchPad = new Presentation.AccountLess();
            }
        }

        if (scratchPad != this.scratchPadPresentation) {
            this.scratchPadPresentation = scratchPad;
        }

        //
        // Process the records
        //
        var current = [];
        if (records == null) {
            records = []
        }
        const scratchpads = [];
        records.forEach(record => {
            var id = record.id;
            if (id == userID) {
                // This is the legacy shadow presentation which
                // we no longer have any interest in.
                // It would be nice to delete it, but we cannot do
                // that until pages has been deployed everywhere,
                // otherwise we'll break the pre-pages app.
                return;
            }

            var type = record.decodeProperty("type", String, null);
            if (type == Presentation.ScratchPad.Type) {
                scratchpads.push(record);
                return;
            }

            if (record.decodeProperty("hidden", Boolean) == true) {
                // Historically hidden was only used when the welcome presentation
                // was "deleted", so that the app could still see it and know not
                // to re-recreate it.
                // With the welcome presentation feature being removed from the app,
                // it is now safe to delete it from the service.
                if (record.decodeProperty("welcome", Boolean) == true) {
                    console.info("Deleting hidden welcome presentation: ", record);
                    endpoint._deleteSyncRecord(record);
                }
                // There isn't any point to keeping any hidden presentations
                // in our list: We don't let people un-hide them, and it just
                // complicates code elsewhere that has to know to filter them
                // out.  So we'll always bail here when its set to hidden.
                return;
            }


            var presentation = this.presentationWithID(id);
            if (presentation != null && (type == null || type == presentation.type)) {
                presentation.decodeFromRecord(record);
            }
            else {
                presentation = this._newObjectForPresentation(record, endpoint);
            }
            if (presentation != null) {
                current.push(presentation);
            }
        })

        // We have a bug that can lead to a user having multiple scratchpad
        // presentations. We only show one, so it ends up as a form of data
        // loss - the user has hidden presentations that may contain real
        // content. For now, let's just get a handle on the scope of the problem.
        // This isn't important for Camera, so it's been removed here
        // if (scratchpads.length > 1) {
        //     console.error(`Found multiple scratchpad presentations: ${scratchpads.length}`);
        //     gSentry.message(`Found multiple scratchpad presentations: ${scratchpads.length}`);
        // }

        // Choose the most recently updated scratchpad from the list we found
        const scratchpadRecord = this.findMostRecentlyUpdatedRecord(scratchpads);
        if (scratchpadRecord != null) {
            scratchPad.decodeFromRecord(scratchpadRecord);
        }

        // Now that we've processed all of our presentations, make
        // sure that the scratchpad is persisted. If was already persisted,
        // it will have been associated with a Cloudy record above...
        if (fromCache == false && IsKindOf(scratchPad, Presentation.ScratchPad)) {
            scratchPad.ensurePresentationExists();
        }

        // XXX we could observe presentation's titles and lastViewed
        // and automatically update those on the server...
        // would need to track when a presentation is removed so we
        // could remove ourselves as an observer...

        //
        // Handle the remaining presentations
        //
        var sorted = this.sortPresentationsList(current);
        var existing = this.presentations;

        var orderUnchanged = EqualObjects(sorted, existing);
        if (orderUnchanged == false) {
            this.presentations = sorted;
        }

        this._ensureValidActivePresentationExists();
    }
    /**
     * We have a bug that results in the user having multiple scratchpad presentations.
     * When we encounter this, we want to deterministically select one of them to be
     * the active scratchpad.
     * @param {[CloudyRecord]} records
     * @returns {?CloudyRecord}
     */
    findMostRecentlyUpdatedRecord(records) {
        // Sort by last updated, descending
        records.sort((a, b) => {
            const result = Presentation.compareDates(new Date(a.updatedAt), new Date(b.updatedAt));
            if (result != 0) {
                return result;
            }
            return a.id.localeCompare(b.id);
        });
        return records[0] || null;
    }
    sortPresentationsList(presentations) {
        if (presentations == null) {
            return [];
        }

        var sorted = Array.from(presentations);
        var sortType = this.presentationSortType;
        if (sortType == PresentationSort.Name) {
            var comparator = new Intl.Collator([], { numeric: true,  usage: 'sort', sensitivity: 'base' })
            sorted.sort((a, b) => {
                return a.compareTitle(b, comparator);
            });
        }
        else {
            sorted.sort((a, b) => {
                if (sortType == PresentationSort.Viewed) {
                    return a.compareLastViewed(b);
                }
                else {
                    return a.compareDateCreated(b);
                }
            });
        }
        return sorted;
    }
    resortPresentationsList() {
        var presentations = this.presentations;
        var sorted = this.sortPresentationsList(presentations);
        this.presentations = sorted;
    }
    async _updatePresentationPropertyAndResort(aPresentation, property, newValue, sortWhenType) {
        // We can't update the scratchpad if it hasn't been created yet
        if (aPresentation.identifier == Presentation.ScratchPad.PlaceholderID) {
            return;
        }

        const sortIfNecessary = () => {
            if (this.presentationSortType == sortWhenType) {
                this.presentations = this.sortPresentationsList(this.presentations);
            }
        };

        // Apply the value and re-sort
        aPresentation[property] = newValue;
        sortIfNecessary();

        // Persist the new value
        aPresentation.changePropertyValue(property, newValue).catch(err => {
            // If it failed, the presentation will roll back the value
            // and we may need to re-sort
            sortIfNecessary();
        })
    }
    /*
     * Public presentation methods
     */
    get presentationSortType() {
        const defaultSort = PresentationSort.Viewed;
        const value = SharedUserDefaults.getValueForKey("presentationSort", defaultSort);
        // Ensure the value is valid
        for (let key in PresentationSort) {
            if (value == PresentationSort[key]) {
                return value;
            }
        }
        return defaultSort;
    }
    set presentationSortType(value) {
        var current = this.presentationSortType;
        if (current == value) {
            return;
        }
        SharedUserDefaults.setValueForKey(value, "presentationSort");
        this.presentations = this.sortPresentationsList(this.presentations);
    }
    set presentations(list) {
        var previous = this._presentations ?? [];

        var removed = previous.filter(entry => list.indexOf(entry) == -1);
        removed.forEach(presentation => {
            presentation.destroy();
        })

        var sorted = this.sortPresentationsList(list);
        this._presentations = Array.from(sorted);

        var activePresentation = this.activePresentation;
        if (activePresentation == null ||
            (this.isScratchPadPresentation(activePresentation) == false && removed.indexOf(activePresentation) != -1))
        {
            this._ensureValidActivePresentationExists();
        }
    }
    get presentations() {
        return Array.from(this._presentations);
    }
    /**
     * Get the list of presentations that should be visible to the user in our various
     * list views, drop-downs, etc. This excludes all presentations with the "hidden" flag
     * set to true. The special Looks/video companion presentations are excluded unless
     * preview features are enabled. The Scratchpad presentation is excluded.
     * @returns {[Presentation]}
     */
    get visiblePresentations() {
        let presentations = this.presentations.filter(p => p.hidden == false);
        const user = mmhmmAPI.defaultEndpoint().user;
        if (user == null || user.employee != true) {
            // Only internal users should see the special Looks presentations
            presentations = presentations.filter(presentation => !presentation.type?.startsWith("companion."));
        }
        return presentations;
    }
    set scratchPadPresentation(object) {
        const previous = this._scratchPadPresentation;
        if (previous == object) {
            return;
        }
        if (previous != null) {
            previous.destroy();
        }
        this._scratchPadPresentation = object;
    }
    get scratchPadPresentation() {
        return this._scratchPadPresentation;
    }
    get looksPresentation() {
        const presentations = this.presentations;
        let match = presentations.find((p) => p.type == Presentation.Typed.Type.Looks);

        // For internal users who used the app before we had typed presentations, match on name
        if (match == null && this.endpoint?.enablePreviewFeatures == true) {
            match = presentations.find((p) => p.title == "Looks");
        }

        return match;
    }

    set activePresentation(object) {
        if (object == null) {
            object = this.scratchPadPresentation;
        }
        const previous = this._activePresentation;
        if (object == previous) {
            return;
        }
        this._activePresentation = object;
        this.didChangeValueForProperty(object, "activePresentation");
    }
    get activePresentation() {
        return this._activePresentation;
    }
    get defaultPresentation() {
        const lastSelected = this.lastSelectedPresentation;
        if (lastSelected) {
            return lastSelected;
        }
        if (this.scratchPadPresentation) {
            return this.scratchPadPresentation;
        }
        return this.presentations[0] || null;
    }

    // The last presentation that the user intentionally selected,
    // which may be different from the active presentation
    set lastSelectedPresentation(object) {
        this._lastSelectedPresentation = object;
    }
    get lastSelectedPresentation() {
        return this._lastSelectedPresentation || this.activePresentation;
    }
    updateLastSelectedPresentation(object) {
        if (IsKindOf(object, Presentation.Typed) == true) {
            return;
        }
        var lastID = SharedUserDefaults.getValueForKey(DataStore.UserDefaultKeys.ActivePresentation);
        var thisID = (object ? object.identifier : null);
        if (lastID != thisID) {
            SharedUserDefaults.setValueForKey(thisID, DataStore.UserDefaultKeys.ActivePresentation);
        }
        this.lastSelectedPresentation = object;
    }
    isScratchPadPresentation(aPresentation) {
        return (aPresentation != null && aPresentation == this.scratchPadPresentation);
    }
    presentationWithID(presentationID) {
        const presentations = [...this.presentations, this.scratchPadPresentation];

        const match = presentations.find(preso => (preso != null && preso.identifier == presentationID));
        if (match != null) {
            if (match.hidden == true) {
                return null;
            }
            return match;
        }
        return null;
    }
    presentationContainingMedia(media) {
        const presentations = [...this.presentations, this.scratchPadPresentation];
        return presentations.find(presentation => presentation != null && presentation.slideContainingMedia(media) != null);
    }
    async updatePresentationLastViewed(aPresentation, lastViewed) {
        const previous = aPresentation.lastViewed;
        aPresentation.lastViewed = lastViewed;

        try {
            return this._updatePresentationPropertyAndResort(aPresentation, 'lastViewed', lastViewed, PresentationSort.Viewed);
        }
        catch (err) {
            aPresentation.lastViewed = previous;
        }
    }
    async renamePresentation(aPresentation, newName) {
        var previous = aPresentation.title;
        aPresentation.title = newName;

        try {
            const result = this._updatePresentationPropertyAndResort(aPresentation, 'name', newName, PresentationSort.Name);
            Analytics.Log("presentation.renamed", { presentation_id: aPresentation.identifier });
            return result;
        }
        catch (err) {
            aPresentation.title = previous;
        }
    }
    async createNewPresentation(named, type = null, analyticsProperties = null, lastViewed = null) {
        var endpoint = this.endpoint;
        if (endpoint == null || endpoint.isAuthenticated == false) {
            console.error("Cannot create a new presentation without an endpoint");
            return;
        }

        var record = await endpoint.createNewPresentation(named, type, lastViewed);

        const props = analyticsProperties || {};
        props.presentation_id = record.id;
        Analytics.Log("presentation.created", props);

        var presentations = this.presentations;

        // WebSocket or notifications may have already created the local record.
        var presentation = presentations.find(preso => preso.identifier == record.id);
        if (presentation == null) {
            // We didn't find it on the WebSocket, so create local
            // object, add it to the list, keep it sorted.
            presentation = this._newObjectForPresentation(record, endpoint);
            if (presentation != null) {
                presentations.push(presentation);
                this.presentations = presentations;
            }
        }

        return presentation;
    }
    _ensureValidActivePresentationExists() {
        // Ensure the active presentation still exists
        var activePresentation = this.activePresentation;
        if (activePresentation != null &&
            this.presentationWithID(activePresentation.identifier) != null)
        {
            // We're in good shape
            return;
        }

        // Keep track of the last presentation that the user manually selected
        var lastActiveID = SharedUserDefaults.getValueForKey(DataStore.UserDefaultKeys.ActivePresentation);
        if (lastActiveID != null) {
            const presentation = this.presentationWithID(lastActiveID);
            if (presentation != null) {
                this.lastSelectedPresentation = presentation;
                this.activePresentation = presentation;
                return;
            }
        }

        // Fall back to the scratch pad
        if (this.scratchPadPresentation != null) {
            this.activePresentation = this.scratchPadPresentation;
            return;
        }

        console.error("No scratchpad?");

        // If we made it here, they don't have any presentations, so we'll
        // forcibly create one for them...
        var endpoint = this.endpoint;
        if (endpoint == null || endpoint.isAuthenticated == false) {
            const presentation = new Presentation.AccountLess();
            this.scratchPadPresentation = presentation;
            this.activePresentation = presentation;
            return;
        }

        if (this.refreshingPresentationsList == true) {
            return;
        }

        this.activePresentation = this.scratchPadPresentation;
    }
    _populatePresentationThumbnails() {
        const presentations = this.presentations.filter(presentation => {
            return (
                presentation.hasThumbnailSlideID != true &&
                presentation.fetchingThumbnailSlideID != true
            );
        });
        if (presentations.length == 0) {
            return;
        }

        let queue = this._presentationThumbnailQueue;
        if (queue == null) {
            queue = new SerializedQueue();
            this._presentationThumbnailQueue = queue;
        }

        presentations.forEach(presentation => {
            // We set this to true so we can exclude it
            // if this method is re-invoked before the
            // task has executed.
            presentation.fetchingThumbnailSlideID = true;

            // This ends up being the only thing needed.
            // reload() will cause it to pull slides down
            // setting the array of slides will cause it
            // to update the thumbnail slide id
            // And if that value has changed, it'll cause
            // the presentation to persist itself.
            queue.add(() => {
                return presentation.reload().finally(() => {
                    delete presentation.fetchingThumbnailSlideID;
                });
            })
        })
    }
    canDeletePresentation(aPresentation) {
        if (this.isScratchPadPresentation(aPresentation) == true) {
            return false;
        }
        return true;
    }
    async undeletePresentation(aPresentation) {
        var presentations = this.presentations;
        var index = presentations.indexOf(aPresentation);
        if (index == -1) {
            presentations.push(index, 1);
            this.presentations = presentations;
        }

        var presentationID = aPresentation.identifier;
        Analytics.Log('presentation.undeleted', {presentation_id: presentationID})

        var endpoint = this.endpoint;
        if (endpoint == null || endpoint.isAuthenticated == false) {
            return;
        }

        try {
            const result = await endpoint.undeleteRecordAtLocation(aPresentation.serviceLocator);
            if (result?.length != 1 || result[0].status.success != true) {
                throw new Error("The network request failed");
            }
        }
        catch (err) {
            console.error("Error undeleting presentation: ", err, aPresentation);
            gSentry.exception(err);

            presentations = this.presentations;
            index = presentations.indexOf(aPresentation);
            if (index != -1) {
                presentations.splice(index, 1);
                this.presentations = presentations;
            }
            throw err;
        }

        this._ensureValidActivePresentationExists();
    }
    async deletePresentation(aPresentation) {
        if (this.canDeletePresentation(aPresentation) == false) {
            console.error("Cannot delete the requested presentation", aPresentation);
            return;
        }

        var presentations = this.presentations;
        var index = presentations.indexOf(aPresentation);
        if (index != -1) {
            presentations.splice(index, 1);
            this.presentations = presentations;
        }

        if (aPresentation == this.lastSelectedPresentation) {
            this.updateLastSelectedPresentation(null);
        }

        var presentationID = aPresentation.identifier;
        Analytics.Log('presentation.deleted', {presentation_id: presentationID})

        var endpoint = this.endpoint;
        if (endpoint == null || endpoint.isAuthenticated == false) {
            return;
        }

        try {
            const result = await endpoint.deleteRecordAtLocation(aPresentation.serviceLocator);
            if (result?.length != 1 || result[0].status.success != true) {
                throw new Error("The network request failed");
            }

            var targets = [aPresentation];
            if (aPresentation.loaded == true) {
                aPresentation.slides.forEach(slide => {
                    targets.push(slide);

                    // XXX: It would be nice to remove room changes
                    // from the undo history, but since the rooms
                    // are shared instances, we'd risk clobbering
                    // room changes that weren't related to this
                    // presentation...
                    slide.objects.forEach(obj => {
                        targets.push(obj);
                    })
                })
            }

            targets.forEach(target => {
                gApp.undoManager?.removeAllActionsWithTarget(target);
            })
        }
        catch (err) {
            console.error("Error deleting presentation: ", err, aPresentation);
            gSentry.exception(err);
            if (index != -1) {
                const presentations = this.presentations;
                presentations.push(aPresentation);
                this.presentations = presentations;
            }
            throw err;
        }

        this._ensureValidActivePresentationExists();
    }
    async handleMediaDeleted(records) {
        // Called when media are deleted via the media library
        // At this point they've already been purged from the service

        // Notify each presentation
        var mediaByPresentation = groupArrayBy(records, "presentationId");
        Object.entries(mediaByPresentation).forEach(entry => {
            const [presentationId, recordsForPresentation] = entry;
            var presentation = this.presentationWithID(presentationId);
            if (presentation == null) {
                return;
            }
            presentation.mediaWasDeleted(recordsForPresentation);
        });
    }
    /*
     *
     */
    handlePresentationUpdateRecord(updatedRecord) {
        var recordWasDeleted = (
            (updatedRecord.deleted == true) ||
            (updatedRecord.decodeProperty("trashed", Boolean) == true) ||
            (updatedRecord.hidden == true)
        );

        var id = updatedRecord.id;
        var presentation = this.presentationWithID(id);
        if (recordWasDeleted == true) {
            if (presentation != null) {
                var presentations = this.presentations;
                var index = presentations.indexOf(presentation);
                if (index != -1) {
                    presentations.splice(index, 1);
                    this.presentations = presentations;
                }
            }
            return presentation;
        }

        if (presentation != null) {
            presentation.decodeFromRecord(updatedRecord);
            this.resortPresentationsList();
            return presentation;
        }

        presentation = this._newObjectForPresentation(updatedRecord, this.endpoint);
        if (presentation != null) {
            const presentations = this.presentations;
            presentations.push(presentation);
            this.presentations = presentations;
        }
        return presentation;
    }
    _newObjectForPresentation(record, endpoint) {
        if (record.collection == mmhmmAPI.CloudyCollectionTypes.ModernPresentation) {
            const type = record.decodeProperty("type", String, null);
            if (type != null && type != Presentation.ScratchPad.Type) {
                return new Presentation.Typed(endpoint, record, type);
            }
            return new Presentation.Modern(endpoint, record);
        }
        return null;
    }
    handleWebSocketMessage(message) {
        var type = message.type;
        if (type == "ka" || type == "start_ack" || type == "connection_ack") {
            return;
        }
        else if (type == "connection_error") {
            this.startWebSocketClient();
        }
        else if (type != "data") {
            console.log("unknown message type: ", type);
            return;
        }

        var payload = message.payload;
        if (payload == null) {
            console.log("no payload in message?", message);
            return;
        }

        var data = payload.data;
        if (data == null) {
            var errors = payload.errors;
            if (errors != null && errors.length > 0) {
                var unauthed = errors.find(error => error.errorType == "UnauthorizedException");
                if (unauthed != null) {
                    this.startWebSocketClient();
                    return;
                }
            }
            console.log("no data in payload?", payload);
            return;
        }

        var updatedRecord = data.updatedRecord;
        if (updatedRecord == null) {
            console.log("no updatedRecord in data?", data);
            return;
        }

        var collection = updatedRecord.collection;
        if (collection == null) {
            console.log("no collection in updatedRecord?", updatedRecord);
            return;
        }

        var propertiesString = updatedRecord.propertiesString;
        if (updatedRecord.properties == null && propertiesString != null) {
            updatedRecord.properties = JSON.parse(propertiesString);
        }

        // We create this after the above to ensure properties exists
        var record = new CloudyRecord(updatedRecord);

        if (collection == "presentation") {
            this.handlePresentationUpdateRecord(record);
        }
        else if (collection == "room") {
            RoomsController.shared.processCustomRoomUpdate(record, this.endpoint);
        }
        else if (collection == "slide") {
            var documentId = updatedRecord.documentId;
            var presentation = this.presentationWithID(documentId);
            if (presentation != null) {
                presentation.updateSlideUsingSlideRecord(record);
            }
        }
    }
    startWebSocketClient() {
        // Temporarily disabled until server-side "conflict resolution"
        // issues are resolved.
        return;
        /* eslint-disable no-unreachable */
        this.stopWebSocketClient();

        var endpoint = this.endpoint;
        endpoint.getSyncSubscriptionInfo().then(response => {
            var client = new WebSocket(response.url, response.subprotocols);
            this.webSocketClient = client;

            client.onmessage = (evt => {
                this.handleWebSocketMessage(JSON.parse(evt.data));
            });

            client.onopen = (evt => {
                client.send(JSON.stringify({type: "connection_init"}));
                var startMessage = response.startMessage;
                if (startMessage != null) {
                    client.send(JSON.stringify(startMessage));
                }
            });

            client.onerror = (evt => {
                console.log("cloudy websocket error: ", evt);
            });

            client.onclose = (evt => {
                console.log("cloudy websocket close: ", evt);
                if (this.webSocketClient == null) {
                    // We stopped it, so ensure we don't restart it
                    return;
                }
            });
            /* eslint-enable no-unreachable */
        });
    }
    stopWebSocketClient() {
        var client = this.webSocketClient;
        if (client != null) {
            this.webSocketClient = null;
            client.close();
        }
    }
    /*
     * Presentation import/export - templates
     */
    async importPresentation(exportIdentifier) {
        var endpoint = this.endpoint;
        if (endpoint == null || endpoint.isAuthenticated == false) {
            const sheet = new SignInSheet(LocalizedString("Account Required"), 320);
            sheet.displayAsModal();
            return null;
        }

        // Show a loading sheet while we import...
        var cancelled = false;
        const sheet = new LoadingSheet(
            LocalizedString("Importing presentation"),
            "",
            LocalizedString("Cancel"));
        var button = sheet.actionButton;
        button.classList.add("secondary");
        button.addEventListener("click", _ => {
            cancelled = true;
        });
        sheet.displayAsModal();

        endpoint.importExportedObject(exportIdentifier)
            .then(records => {
                if (cancelled == true) {
                    return;
                }

                // Find the newly-created presentation record
                var presentationRecords = records.filter(record => record.collection == mmhmmAPI.CloudyCollectionTypes.ModernPresentation);
                if (presentationRecords.length < 1) {
                    console.error("No presentation record after successful import", records);
                    ShowAlertView(
                        LocalizedString("Presentation Error"),
                        LocalizedStringFormat("An error occurred while importing the presentation")
                    );
                    return;
                }
                var record = presentationRecords[0];

                // Add any newly-created custom roms
                var controller = RoomsController.shared;
                var roomRecords = records.filter(record => record.collection == mmhmmAPI.CloudyCollectionTypes.Room);
                controller.addCustomRoomsFromImport(roomRecords, endpoint);

                // Do a sanity check and ensure all the rooms referenced by
                // the slides exist.  If we find one that doesn't exist, then
                // force the rooms controller to reload and hope that'll find it
                var slideRecords = records.filter(record => record.collection == mmhmmAPI.CloudyCollectionTypes.ModernSlide);
                var usedRoomIDs = new Set();
                var refreshRoomsCatalog = false;
                slideRecords.forEach(record => {
                    var room = record.decodeProperty("room", {});
                    var roomID = room?.id;
                    if (roomID != null && usedRoomIDs.has(roomID) == false) {
                        usedRoomIDs.add(roomID);

                        var existingRoom = controller.roomWithIdentifier(roomID);
                        if (existingRoom == null) {
                            refreshRoomsCatalog = true;
                        }
                    }
                })

                if (refreshRoomsCatalog == true) {
                    RoomsController.shared.reloadCustomRooms(endpoint);
                }

                // Make the new presentation the active presentation
                var presentation = this.presentationWithID(record.id);
                if (presentation == null) {
                    // We haven't loaded this presentation yet; use the record to add it to our list
                    presentation = this._newObjectForPresentation(record, endpoint);
                    if (presentation != null) {
                        var presentations = this.presentations;
                        presentations.push(presentation);
                        this.presentations = presentations;

                        NotificationCenter.default.postNotification(
                            mmhmmAPI.Notifications.PresentationsChanged,
                            this,
                            { records: [ record ]}
                        );
                    }
                }
                if (presentation != null && cancelled != true) {
                    this.activePresentation = presentation;
                }

                Analytics.Log("presentation.import", {
                    share_id: Analytics.AnonymizeID(exportIdentifier),
                })
            })
            .catch(err => {
                var errorMessage = err.message;
                if (errorMessage == mmhmmAPI.NotFoundErrorMessage) {
                    errorMessage = LocalizedString("We couldn't find that presentation link. It may have been deleted.")
                } else if (errorMessage != null) {
                    errorMessage = LocalizedStringFormat("An error occurred while importing the presentation: ${errorMessage}", {errorMessage});
                } else {
                    errorMessage = LocalizedString("An error occurred while importing the presentation");
                }
                ShowAlertView(LocalizedString("Import Error"), errorMessage);
            })
            .finally(_ => {
                if (cancelled != true) {
                    sheet.dismiss();
                }
            });
    }
    /*
     * Notifications
     */
    handlePresentationsChanged(userInfo) {
        if (userInfo == null || userInfo.records == null) {
            return this.refreshPresentationsList();
        }
        userInfo.records.forEach(record => {
            this.handlePresentationUpdateRecord(record);
        })
    }
    handleAuthenticationChanged(userInfo, notifName, object) {
        var endpoint = this.endpoint;
        if (endpoint == null) {
            endpoint = object;
            this.endpoint = object;
        }
        var userID = null;
        var user = endpoint.user;
        if (endpoint.isAuthenticated == true && user != null) {
            userID = user.id;
        }

        if (userID == null || userID != this.lastAccountID) {
            this.cacheStore.setPresentations(null);
        }

        if (userID == null) {
            this.endpoint = null;
        }

        if (userID == this.lastAccountID) {
            this.presentations.forEach(presentation => {
                presentation.endpoint = endpoint;
            })
            let scratchPadPresentation = this.scratchPadPresentation;
            if (scratchPadPresentation != null) {
                scratchPadPresentation.endpoint = endpoint;
            }
        }
        else {
            this.lastAccountID = userID;

            let scratchPadPresentation = null;
            if (userID == null) {
                scratchPadPresentation = new Presentation.AccountLess();
            }
            else {
                scratchPadPresentation = new Presentation.ScratchPad(endpoint);
            }
            this.scratchPadPresentation = scratchPadPresentation;

            this.refreshPresentationsList(true);
            this.stopWebSocketClient();
            if (userID != null) {
                this.startWebSocketClient();
            }
        }
    }
    get presentationSortTypes() {
        return [
            {
                id: PresentationSort.Name.toString(),
                label: LocalizedString("Sort by Name"),
            },
            {
                id: PresentationSort.Viewed.toString(),
                label: LocalizedString("Sort by Last Viewed"),
            },
            {
                id: PresentationSort.Created.toString(),
                label: LocalizedString("Sort by Date Created"),
            },
        ]
    }

}

DataStore.UserDefaultKeys = Object.freeze({
    ActivePresentation: "activePresentation",
});
