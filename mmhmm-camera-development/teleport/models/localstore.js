//
//  localstore.js
//  mmhmm
//
//  Created by Steve White on 7/25/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

class LocalStore {
    constructor() {
        this.backend = new FileStorage("local", null);

        NotificationCenter.default.addObserver(
            mmhmmAPI.Notifications.RoomsChanged,
            null,
            this.handleCustomRoomsChanged,
            this
        );

        NotificationCenter.default.addObserver(
            mmhmmAPI.Notifications.PresentationsChanged,
            null,
            this.handlePresentationsChanged,
            this
        );

        NotificationCenter.default.addObserver(
            CloudyAsset.Notifications.RefreshedURL,
            null,
            this.handleAssetRefreshed,
            this
        );
    }
    async _get(key) {
        return this.backend.get(key);
    }
    async _set(key, value) {
        if (value == null) {
            return this.backend.delete(key);
        }
        else {
            return this.backend.put(value, key);
        }
    }
    _handleRecordsChangeFor(records, key) {
        this._get(key).then(cached => {
            if (cached == null) {
                cached = [];
            }

            let persist = false;
            records.forEach(record => {
                const deleted = (
                    (record.deleted == true) ||
                    (record.decodeProperty("trashed", Boolean) == true)
                );

                const id = record.id;
                const entry = cached.find(entry => entry.id == id);

                // We want to make sure that asset references are persisted,
                // so use toLocalJSON instead of default stringification
                const json = record.toLocalJSON();

                if (entry != null) {
                    if (deleted == false && EqualObjects(json, entry) == true) {
                        return;
                    }

                    const index = cached.indexOf(entry);
                    cached.splice(index, 1);
                }

                if (deleted != true) {
                    cached.push(json);
                }
                persist = true;
            });

            if (persist == true) {
                this._set(key, cached);
            }
        });
    }

    handleAssetRefreshed(userInfo, notifName, object) {
        const asset = object;
        const parentID = asset?.parentID;
        const fingerprint = asset?.fingerprint;
        const currentURL = userInfo?.currentURL;
        if (parentID == null || fingerprint == null || currentURL == null) {
            return;
        }

        // Presently the only thing we cache that has assets are custom rooms
        this.getCustomRooms().then(list => {
            const parent = list.find(entry => entry.id == parentID);
            if (parent == null) {
                return;
            }
            const assetRefs = parent.assetReferences;
            if (assetRefs == null) {
                return;
            }
            const match = assetRefs.find(ref => ref.fingerprint == fingerprint);
            if (match == null) {
                return;
            }
            match.presignedDownloadUrl = currentURL;
            this.setCustomRooms(list);
        })
    }

    async getPresentations() {
        return this._get(LocalStore.Files.Presentations);
    }
    async setPresentations(list) {
        return this._set(LocalStore.Files.Presentations, list);
    }
    handlePresentationsChanged(userInfo) {
        const records = userInfo.records;
        this._handleRecordsChangeFor(records, LocalStore.Files.Presentations);
    }

    async getCustomRooms() {
        return this._get(LocalStore.Files.CustomRooms);
    }
    async setCustomRooms(list) {
        return this._set(LocalStore.Files.CustomRooms, list);
    }
    handleCustomRoomsChanged(userInfo) {
        const records = userInfo.records;
        this._handleRecordsChangeFor(records, LocalStore.Files.CustomRooms);
    }

    async getRoomCatalog() {
        return this._get(LocalStore.Files.CatalogRooms);
    }
    async setRoomCatalog(list) {
        return this._set(LocalStore.Files.CatalogRooms, list);
    }

    async getVideos() {
        return this._get(LocalStore.Files.Videos);
    }
    async setVideos(list) {
        return this._set(LocalStore.Files.Videos, list);
    }

    async getInterviews() {
        return this._get(LocalStore.Files.Interviews);
    }
    async setInterviews(list) {
        return this._set(LocalStore.Files.Interviews, list);
    }
}

LocalStore.Files = Object.freeze({
    Presentations: "/presentations/list.json",

    Videos: "/videos/list.json",

    CustomRooms: "rooms/custom.json",
    CatalogRooms: "rooms/catalog.json",

    Interviews: "/interviews/list.json",
})
