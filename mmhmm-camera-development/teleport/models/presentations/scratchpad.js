//
//  models/presentations/scratchpad.js
//  mmhmm
//
//  Created by Steve White on 5/11/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

Presentation.ScratchPad = class extends Presentation.Modern {
    constructor(endpoint) {
        var fakeRecord = new CloudyRecord({
            id: Presentation.ScratchPad.PlaceholderID,
            collection: mmhmmAPI.CloudyCollectionTypes.ModernPresentation,
        });
        fakeRecord.encodeProperty("lastViewed", new Date());
        super(endpoint, fakeRecord);
    }
    get canRename() {
        return false;
    }
    get canShare() {
        return false;
    }
    get canDelete() {
        return false;
    }
    get title() {
        return LocalizedString("Scratchpad", "Scratchpad");
    }
    set title(value) {
        // Intentionally discarded.
    }
    decodeFromRecord(record) {
        super.decodeFromRecord(record);
        this.identifier = record.id;
    }
    encodeToRecord(record) {
        super.encodeToRecord(record);
        record.encodeProperty("type", Presentation.ScratchPad.Type);
    }
    async ensurePresentationExists() {
        let task = this._ensurePresentationExistsTask;
        if (task != null) {
            return task;
        }

        if (this.identifier != Presentation.ScratchPad.PlaceholderID) {
            return;
        }

        task = new Promise(async (resolve, reject) => {
            const endpoint = this.endpoint;
            const newID = createUUID();

            const record = new CloudyRecord({
                collection: mmhmmAPI.CloudyCollectionTypes.ModernPresentation,

                id: newID,
                parentId: newID,
                documentId: newID,
                presentationId: newID,
            });
            this.encodeToRecord(record);
            // Change our ID before posting the record, so that when the
            // data store gets a notification about the records, it can
            // resolve them to this instance.
            this.identifier = newID;
            console.info("Creating new scratchpad presentation", record.identifier);

            let response = null;
            try {
                response = await endpoint._postSyncRecord(record);
            }
            catch (err) {
                console.error("Error creating scratchpad presentation", this, record, err);
            }
            finally {
                if (this._ensurePresentationExistsTask == task) {
                    this._ensurePresentationExistsTask = null;
                }
            }

            if (response == null) {
                // Something failed, change our ID back to the placeholder
                // so that we can try to create the presentation again
                this.identifier = Presentation.ScratchPad.PlaceholderID;
            }
            else {
                this.decodeFromRecord(response);
            }
        });
        this._ensurePresentationExistsTask = task;
        return task;
    }
    async reload() {
        if (this.identifier == Presentation.ScratchPad.PlaceholderID) {
            return [];
        }
        const createTask = this._ensurePresentationExistsTask;
        if (createTask != null) {
            await createTask;
        }
        return super.reload();
    }
    async createNewSlideWithObjects(room, presenter, slides = [], onProgress, cancelSignal) {
        await this.ensurePresentationExists();
        return super.createNewSlideWithObjects(room, presenter, slides, onProgress, cancelSignal);
    }
}

Presentation.ScratchPad.Type = "shadow";
Presentation.ScratchPad.PlaceholderID = "00000000-0000-0000-0000-000000000000";
