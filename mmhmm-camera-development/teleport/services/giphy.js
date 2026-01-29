//
//  giphy.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/4/2023.
//  Copyright 2023 mmhmm inc. All rights reserved.
//

// Client functionality for accessing the GIPHY API
// and converting GIPHY results into Media objects

class GIPHYClient {

    // TODO look into the Emoji endpoint, too

    static ContentType = Object.freeze({
        Sticker: "sticker",
        GIF: "gif"
    });

    constructor() {
        this.pendingRequests = [];
    }

    // Convert a GIPHY API response record into an mmhmm Media item
    newMediaForItem(item) {
        const contentURL = this.contentURLForItem(item);
        const type = this.mimeTypeForItem(item);
        if (type == null || contentURL == null) {
            return;
        }

        const asset = new LocalAsset({ contentURL: contentURL });
        const mediaID = createUUID();
        const presenterID = gApp.localPresenter.identifier;

        let media = null;
        if (type.startsWith("video/") == true) {
            media = new Media.BasicVideo(mediaID, presenterID, asset);
            media.hideControls = true;
        } else if (type == "image/gif") {
            media = new Media.GIF(mediaID, presenterID, asset);
        } else if (type.startsWith("image/") == true) {
            // TODO we don't currently have renderer support for animated webp
            media = new Media.Image(mediaID, presenterID, asset);
        }

        if (media != null) {
            media.title = item.title;
            media.metadata = {
                giphyID: item.id,
                searchTerm: this.searchText
            };
        }

        return media;
    }

    mimeTypeForItem(item) {
        if (item.type == GIPHYClient.ContentType.Sticker) {
            return this.mimeTypeForSticker(item);
        }
        return this.mimeTypeForGIF(item);
    }

    mimeTypeForGIF(item) {
        const images = item.images;
        const original = images.original;
        const mp4 = original.mp4;
        if (mp4 != null) {
            return "video/mp4";
        } else {
            const url = original.url;
            if (url != null) {
                return "image/gif";
            }
        }
        return null;
    }

    mimeTypeForSticker(item) {
        const images = item.images;
        const original = images.original;
        const webp = original.webp;
        if (webp != null) {
            return "image/webp";
        }

        const url = original.url;
        if (url != null) {
            debugger;
            return "image/gif";
        }
        return null;
    }

    contentURLForItem(item) {
        // See https://developers.giphy.com/docs/optional-settings/#rendition-guide
        // for information on the different image formats available
        if (item.type == GIPHYClient.ContentType.Sticker) {
            return this.contentURLForSticker(item);
        }
        return this.contentURLForGIF(item);
    }

    contentURLForGIF(item) {
        // Return the mp4 URL for GIFs
        const images = item.images;
        const original = images.original;
        const mp4 = original.mp4;
        if (mp4 != null) {
            return mp4;
        }

        const url = original.url;
        if (url != null) {
            return url;
        }
        return null;
    }

    contentURLForSticker(item) {
        // Return the webp URL for stickers
        const images = item.images;
        const original = images.original;
        const webp = original.webp;
        if (webp != null) {
            return webp;
        }

        const url = original.url;
        if (url != null) {
            return url;
        }
        return null;
    }

    async getByID(id) {
        // The GET endpoint is the same for GIFs and stickers
        // The returned "data" object is a single GIPHY record
        return this._performRequest(`v1/gifs/${id}`);
    }

    /**
     * @param {string[]} ids
     */
    async getByIDs(ids) {
        return this._performRequest("v1/gifs", {
            ids: ids.join(",")
        });
    }

    async searchGIFs(query, limit = 50) {
        return this.search(query, "gifs", limit);
    }

    async searchStickers(query, limit = 50) {
        return this.search(query, "stickers", limit);
    }

    async search(query, type, limit) {
        // The returned "data" object is an array of GIPHY records
        var params = this.defaultSearchParams;
        params["limit"] = limit;
        params["q"] = query;
        return this._performRequest(`v1/${type}/search`, params);
    }

    async trendingGIFS() {
        return this.trending("gifs");
    }

    async trendingStickers() {
        return this.trending("stickers");
    }

    async trending(type) {
        // The returned "data" object is an array of GIPHY records
        return this._performRequest(`/v1/${type}/trending`, this.defaultSearchParams);
    }

    get defaultSearchParams() {
        return {
            limit: 50,
            offset: 0
        };
    }

    async _performRequest(endpoint, params = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL("https://api.giphy.com");
            url.pathname = endpoint;

            const searchParams = url.searchParams;
            searchParams["random_id"] = this.anonymousID;
            searchParams["rating"] = "pg";

            for (let key in params) {
                searchParams.set(key, params[key]);
            }

            const others = this.extraParameters;
            for (let key in others) {
                searchParams.set(key, others[key]);
            }

            const request = new XMLHttpRequest();
            request.open("GET", url.toString());
            request.addEventListener("load", (evt) => {
                const response = request.response;
                if (response == null) {
                    reject("Received empty response from GIPHY");
                    return;
                }
                const meta = response.meta;
                if (meta == null || meta.status != 200) {
                    reject("Received unsuccessful response from GIPHY");
                    return;
                }
                this._removePendingRequest(request);
                resolve(response.data);
            });
            request.addEventListener("error", (evt) => {
                this._removePendingRequest(request);
                reject("Received XHR error from GIPHY", evt);
            });
            request.addEventListener("abort", (evt) => {
                // The request was cancelled, probably because a new one was started
                // We don't treat this as an error
                this._removePendingRequest(request);
                resolve(null);
            });
            request.responseType = "json";
            request.send();

            // Keep track of this request so that we can cancel it later
            this.pendingRequests.push(request);
        });
    }

    _removePendingRequest(aRequest) {
        var current = this.pendingRequests;
        var filtered = current.filter((request) => request != aRequest);
        this.pendingRequests = filtered;
    }

    cancelPendingRequests() {
        var current = this.pendingRequests;
        this.pendingRequests = [];
        current.forEach((request) => request.abort());
    }

    sendAnalytics(item) {
        var entry = item?.analytics?.onclick;
        if (entry == null) {
            return;
        }
        var endpoint = entry.url;
        if (endpoint == null) {
            console.error("No `url` on GIPHY analytics entry", entry);
            return;
        }

        var url = new URL(endpoint);
        var searchParams = url.searchParams;
        searchParams.set("random_id", this.anonymousID);
        searchParams.set("ts", Date.now());

        var request = new XMLHttpRequest();
        request.open("GET", url.toString());
        request.send();
    }

    get anonymousID() {
        var anonymousID = this._anonymousID;
        if (anonymousID != null) {
            return anonymousID;
        }

        anonymousID = SharedUserDefaults.getValueForKey("giphyID");
        if (anonymousID == null) {
            anonymousID = createUUID().replace(/-/g, "");
            SharedUserDefaults.setValueForKey(anonymousID, "giphyID");
        }
        this._anonymousID = anonymousID;

        return anonymousID;
    }

    get extraParameters() {
        var unpacker = function (input) {
            var result = "";
            var fcc = result.constructor.fromCharCode;
            for (var idx = 0; idx < input.length; idx += 4) {
                var short = parseInt(input.substring(idx, idx + 4), 16);
                var mask = 0xff;
                var high = (short >> 8) & 0x7f;
                result += fcc(high);
                if ((short & mask) != mask) {
                    var low = (short & mask) >> 1;
                    result += fcc(low);
                }
            }
            return result;
        };

        var others = {
            e1e1e9bfebcbf9ff:
                "e4d5b987d599c5c5b68ff4d7faf3e4e5b969d6a3d199d0a3f9cfeacfb4dfc5ad"
        };

        var unpacked = {};
        for (var key in others) {
            unpacked[unpacker(key)] = unpacker(others[key]);
        }
        return unpacked;
    }
}
