//
//  cloudy_asset.js
//  mmhmm
//
//  Created by Steve White on 4/15/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class CloudyAsset extends LocalAsset {
    constructor(endpoint, assetRefs, assetFingerprint = null, parentID) {
        if (assetRefs == null || assetRefs.length == 0) {
            throw new Error("Can't make asset without assetRefs");
        }

        let asset = null;
        if (assetFingerprint != null) {
            asset = assetRefs.find(a => a.fingerprint == assetFingerprint);
        }
        else {
            asset = assetRefs.find(a => a.downloadUrl != null);
        }

        if (asset == null || asset.downloadUrl == null) {
            console.error("Did not found an asset with a downloadUrl in", assetRefs);
            throw new Error("Did not found an asset with a downloadUrl");
        }

        super({contentURL: null});
        this.endpoint = endpoint;
        this.openCount = 0;
        this.downloadURL = asset.downloadUrl;
        this.fingerprint = asset.fingerprint;
        this.uploaded = asset.uploaded;
        this.ref = asset;
        this.parentID = parentID;

        const blob = asset.blob;
        if (blob != null && EqualObjects(blob, {}) == false) {
            this.blob = blob;
        }

        const presignedDownloadUrl = asset.presignedDownloadUrl;
        if (presignedDownloadUrl != null) {
            this.contentURL = new URL(presignedDownloadUrl);
        }
    }
    get mimeType() {
        const getMimeTypeFromURL = function(url) {
            if (url == null) {
                return null;
            }
            const filename = url.lastPathComponent;
            const comps = filename.split(".");
            const count = comps.length;
            if (count == 0) {
                return null;
            }

            const mime = Media.Files.mimeTypeForExtension(comps[0]);
            if (mime != null) {
                return mime;
            }
            return Media.Files.mimeTypeForExtension(comps[count - 1]);
        }

        const mime = getMimeTypeFromURL(this.contentURL);
        if (mime != null) {
            return mime;
        }

        const downloadURL = new URL(this.downloadURL);
        return getMimeTypeFromURL(downloadURL);
    }
    async identifyMimeTypeFromBlob() {
        // If we've made it here we probably have "bin" in our fingerprint
        // It isn't straight forward to update a fingerprint on the service
        // without having to re-upload the content.  Hopefully there aren't
        // many of these in the wild. To avoid having to frequently download
        // blobs and peek at bytes, we'll try to cache things in UserDefaults
        const fingerprintMap = SharedUserDefaults.getValueForKey("fingerprints", {});
        let mapped = fingerprintMap[this.fingerprint];
        if (mapped != null) {
            return mapped;
        }

        mapped = await super.identifyMimeTypeFromBlob();
        if (mapped != null && mapped.length > 0) {
            fingerprintMap[this.fingerprint] = mapped;
            SharedUserDefaults.setValueForKey(fingerprintMap, "fingerprints");
        }

        return mapped;
    }
    async openAsBlob() {
        // Ensure open gets invoked so we have a valid contentURL
        // for teleport
        const url = await this.open();

        // The above open call incremented openCount
        // So we close here to decrement it back
        this.close();

        // But if we have a blob, then go ahead and use it
        if (this.blob != null) {
            return super.openAsBlob();
        }

        // Otherwise continue with the content url.
        return super.blobFromContentURL(url);
    }
    async open() {
        this.openCount += 1;

        // We always need to ensure we have a contentURL
        // for Teleport purposes
        let contentURL = null;
        if (this.hasContentURLExpired() == true) {
            contentURL = await this._refreshContentURL();
        } else {
            contentURL = this.contentURL;
        }

        if (contentURL != null) {
            const expires = this._expirationTimeFromURL(contentURL);
            if (expires != null && this.refreshTimer == null && this.openCount > 0) {
                const delta = expires.getTime() - Date.now();
                this.startRefreshTimer(delta);
            }
        }

        // But if we have a blob, we can use that locally
        if (this.blob != null) {
            return super.open();
        }

        return contentURL.toString();
    }
    close() {
        let openCount = this.openCount;
        openCount -= 1;
        if (openCount < 0) {
            console.error("Unbalanced open/close calls on asset", this);
            debugger;
            openCount = 0;
        }
        this.openCount = openCount;
        if (openCount == 0) {
            this.stopRefreshTimer();
        }

        if (this.blob != null) {
            return super.close();
        }
    }
    hasContentURLExpired() {
        const contentURL = this.contentURL;
        if (contentURL == null) {
            return true;
        }

        const expires = this._expirationTimeFromURL(contentURL);
        if (expires == null) {
            return false;
        }

        if (expires.getTime() < Date.now()) {
            return true;
        }

        return false;
    }
    async _refreshContentURL() {
        if (this.requesting != null) {
            return await this.requesting;
        }

        const downloadURL = this.downloadURL;
        if (downloadURL == null) {
            throw new Error("Can't open without a downloadURL");
        }

        const endpoint = this.endpoint;
        if (endpoint == null) {
            throw new Error("Can't open without an endpoint");
        }

        const promise = promiseWrapper();
        this.requesting = promise;

        // Attach a catch here so that if nobody else awaits the promise,
        // there's something handling rejections and we don't get unhandled
        // promise rejection errors in Sentry.
        promise.catch(err => {
            console.error("Error refreshing content URL", err);
        });

        let contentURL = null;
        try {
            const response = await endpoint.makeAuthenticatedRequest("GET", downloadURL);
            contentURL = this._parseContentURLResponse(response);
        } catch (err) {
            promise.reject(err);
            throw err;
        } finally {
            this.requesting = null;
        }

        if (contentURL != null) {
            const expires = this._expirationTimeFromURL(contentURL);
            if (expires != null && expires.getTime() < Date.now()) {
                console.error("Server returned an expired url?", downloadURL, contentURL);
            }
        }
        this.contentURL = contentURL;
        promise.resolve(contentURL);
        return contentURL;
    }
    _parseContentURLResponse(response) {
        if (response == null) {
            throw new Error("Bad response from server");
        }

        const code = Math.floor(response.status / 100);
        if (code != 2 && code != 3) {
            throw new Error("Invalid response from server: " + response.status);
        }

        let assetURL = response.responseText;
        if (assetURL.startsWith('"') == true) {
            assetURL = JSON.parse(assetURL);
        }

        return new URL(assetURL);
    }
    _parseAmazonDate(amazonDate) {
        // e.g. X-Amz-Date: 20220222T213351Z
        const matches = amazonDate.match(/^([0-9][0-9][0-9][0-9])([0-9][0-9])([0-9][0-9])T([0-9][0-9])([0-9][0-9])([0-9][0-9])Z/);
        if (matches == null) {
            console.error("Failed to parse", amazonDate);
            return null;
        }
        if (matches.length != 7) {
            console.error("Unexpected match results for date", amazonDate, matches);
            return null;
        }
        const dayComponents = [matches[1], matches[2], matches[3]];
        const timeComponents = [matches[4], matches[5], matches[6]];
        const isoString = dayComponents.join("-") + "T" + timeComponents.join(":") + "Z";
        const result = new Date(isoString);
        if (result != null && isNaN(result.getTime()) == false) {
            return result;
        }
        console.error("Error parsing amazon date", amazonDate, isoString);
        return null;
    }
    _expirationTimeFromURL(url) {
        const searchParams = url.searchParams;

        // new CloudFront setup
        const expires = searchParams.get("Expires");
        if (expires != null) {
            const timestamp = parseInt(expires);
            if (timestamp == null || isNaN(timestamp) == true) {
                console.error("Failed to parse expires: ", expires);
                return null;
            }
            return new Date(timestamp * 1000);
        }

        // Legacy S3 setup
        const amazonDate = searchParams.get("X-Amz-Date");
        const amazonExpires = searchParams.get("X-Amz-Expires");
        if (amazonDate == null || amazonExpires == null) {
            return null;
        }

        const baseDate = this._parseAmazonDate(amazonDate);
        if (baseDate == null) {
            console.error("Failed to parse date: ", amazonDate);
            return null;
        }

        const secondsToLive = parseInt(amazonExpires);
        if (secondsToLive == null || isNaN(secondsToLive) == true) {
            console.error("Failed to parse expires: ", amazonExpires);
            return null;
        }

        const timeInMS = baseDate.getTime() + (secondsToLive * 1000);
        const expirationTime = new Date(timeInMS);
        if (expirationTime == null) {
            console.error("Weird result from timeInMS", timeInMS, Date.now());
            return null;
        }
        return expirationTime;
    }
    startRefreshTimer(delta) {
        if (delta < 0) {
            console.error("bad delta supplied", delta);
            return;
        }

        this.stopRefreshTimer();
        this.refreshTimer = window.setTimeout(() => {
            this._refreshTimerFired();
        }, delta);
    }
    _refreshTimerFired() {
        const previous = this.contentURL;

        this._refreshContentURL().then(current => {
            NotificationCenter.default.postNotification(
                CloudyAsset.Notifications.RefreshedURL,
                this,
                { previousURL: previous, currentURL: current }
            );
        }).catch(err => {
            console.error("Error refreshing content URL", this);
        });
    }
    stopRefreshTimer() {
        const refreshTimer = this.refreshTimer;
        if (refreshTimer != null) {
            window.clearTimeout(refreshTimer);
            this.refreshTimer = null;
        }
    }
    toJSON() {
        const r = super.toJSON();
        r.downloadURL = this.downloadURL;
        return r;
    }
}

CloudyAsset.Notifications = Object.freeze({
    RefreshedURL: 'CloudyAsset.Notifications.RefreshedURL',
});

class RoomCatalogAsset extends CloudyAsset {
    constructor(roomRecord, contentURL, isThumbnail) {
        const endpoint = mmhmmAPI.defaultEndpoint();
        const assetRef = {
            downloadUrl: `${endpoint.baseURL}/rooms/${roomRecord.id}`,
            presignedDownloadUrl: contentURL
        };
        super(endpoint, [assetRef]);
        this.isThumbnail = isThumbnail;
    }
    _parseContentURLResponse(response) {
        if (response == null) {
            throw new Error("Bad response from server");
        }

        const code = Math.floor(response.status / 100);
        if (code != 2 && code != 3) {
            throw new Error("Invalid response from server: " + response.status);
        }

        const record = JSON.parse(response.responseText);

        const success = this.updateUsingRecord(record);
        if (success == false) {
            throw new Error("Error updating asset from record");
        }

        NotificationCenter.default.postNotification(
            RoomCatalogAsset.Notifications.Expired,
            this,
            {record: record}
        );

        return this.contentURL;
    }
    updateUsingRecord(roomRecord) {
        // This asset may store a room catalog entry's full or thumbnail asset
        if (this.isThumbnail) {
            return this.updateUsingThumbnailUrl(roomRecord);
        }
        else {
            return this.updateUsingBackgroundFile(roomRecord);
        }
    }
    updateUsingBackgroundFile(roomRecord) {
        const backgroundFile = roomRecord.backgroundFile;
        if (backgroundFile == null) {
            console.error("No backgroundFile in room record", roomRecord);
            return false;
        }

        const backgroundMediaUrl = backgroundFile.backgroundMediaUrl;
        if (backgroundMediaUrl == null) {
            console.error("No backgroundMediaUrl in backgroundFile", backgroundFile);
            return false;
        }

        this.updateUsingUrl(roomRecord.id, backgroundMediaUrl);
        return true;
    }
    updateUsingThumbnailUrl(roomRecord) {
        const thumbnailUrl = roomRecord.thumbnailUrl;
        if (thumbnailUrl == null) {
            console.error("No thumbnailUrl in room record", roomRecord);
            return false;
        }

        this.updateUsingUrl(roomRecord.id, thumbnailUrl);
        return true;
    }
    updateUsingUrl(id, url) {
        const endpoint = this.endpoint;
        this.downloadURL = `${endpoint.baseURL}/rooms/${id}`;
        this.contentURL = new URL(url);
    }
}

RoomCatalogAsset.Notifications = Object.freeze({
    Expired: "RoomCatalogAssetExpired"
});
