//
//  files.js
//  mmhmm
//
//  Created by Steve White on 12/22/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class FileStorageResolver {
    constructor(store) {
        this.store = store;
    }
    async resolve(key) {
        throw "Subclass responsibility";
    }
}

class FileStorage {
    constructor(name, resolver, onOpen) {
        this.name = name;
        if (resolver == null) {
            this.resolver = null;
        }
        else {
            this.resolver = new resolver(this);
        }

        this.open = false;
        this.preOpenQueue = [];

        caches.open(name).then(cache => {
            this.cache = cache;
            this.open = true;

            this.preOpenQueue.forEach(entry => {
                var method = entry.method;
                var args = entry.arguments;
                this[method].apply(this, args).then(result => {
                    entry.resolve(result);
                }).catch(err => {
                    entry.reject(err);
                })
            });
            this.preOpenQueue = null;

            this._deleteExpiredItems();
            if (onOpen != null) {
                onOpen();
            }
        })
    }
    _enqueuePreOpenCall(method, ...args) {
        var entry = {};
        entry.method = method;
        entry.arguments = args;
        var promise = new Promise((resolve, reject) => {
            entry.resolve = resolve;
            entry.reject = reject;
        });
        entry.promise = promise;
        this.preOpenQueue.push(entry);
        return promise;
    }
    /*
     * Public methods
     */
    async delete(key) {
        if (key == null) {
            throw "Can't delete without a key";
        }
        if (this.open == false) {
            return this._enqueuePreOpenCall("delete", key);
        }
        var request = await this._requestForKey(key);
        return await this.cache.delete(request);
    }
    async put(blob, key, duration) {
        if (blob == null) {
            throw "Can't put without a blob";
        }

        if (this.open == false) {
            return this._enqueuePreOpenCall("put", blob, key, duration);
        }

        if (blob.constructor != File && blob.constructor != Blob) {
            var converted = this.encodeObjectToBlob(blob);
            if (converted == null) {
                console.error("Failed to convert blob: ", blob);
                return null;
            }
            blob = converted;
        }

        if (key == null) {
            key = await this._hashForBlob(blob);
        }
        var request = await this._requestForKey(key);
        var options = {
            headers: {
                'Content-Type': blob.type,
                'Content-Length': blob.size,
            }
        }
        if (duration != null) {
            options.headers["x-ooo-Expires"] = (Date.now() + duration);
        }

        if (IsKindOf(request, Request) == true) {
            // Copy over other headers
            var headers = request.headers;
            var entries = headers.entries();
            var entry = null;
            do {
                entry = entries.next();
                if (entry != null) {
                    var value = entry.value;
                    if (value != null) {
                        options.headers[value[0]] = value[1];
                    }
                }
            } while (entry != null && entry.done != true);
        }

        var response = new Response(blob, options);
        try {
            await this.cache.put(request, response);
        }
        catch (err) {
            console.error("Error put'ing data in cache", request, response, err);
            if (err.name != "QuotaExceededError") {
                return null;
            }
            console.info("Will clear cache storage and try again");
            navigator.storage.estimate().then(estimate => {
                console.log("Storage usage", estimate);
            });
            await this._clear();
            try {
                await this.cache.put(request, response);
            }
            catch (err) {
                console.error("Error put'ing data in cache (after clear())", request, response, err);
                return null;
            }
        }
        return key;
    }
    async get(key, options) {
        if (key == null) {
            throw "Can't get without a key";
        }
        if (this.open == false) {
            return this._enqueuePreOpenCall("get", key, options);
        }
        options = Object.assign({
            decode: true,
            request: true,
        }, options);

        var decodeBlob = options.decode;
        var requestIfNotFound = options.request;

        var request = await this._requestForKey(key);
        var response = await this.cache.match(request, {});
        if (this._isValidResponseForRequest(response, request) == true) {
            return await this._blobFromResponse(response, decodeBlob, key);
        }

        var resolver = this.resolver;
        if (requestIfNotFound == false || resolver == null) {
            return null;
        }

        var blob = await resolver.resolve(key);
        if (blob == null) {
            return null;
        }
        var skipPut = await this.has(key);
        if (skipPut == false) {
            this.put(blob, key).then(key => {});
        }
        if (decodeBlob == false || blob.constructor != Blob) {
            return blob;
        }
        return await this.decodeObjectFromBlob(blob, key);
    }
    async has(key) {
        if (key == null) {
            throw "Can't has without a key";
        }
        if (this.open == false) {
            return this._enqueuePreOpenCall("has", key);
        }

        var request = await this._requestForKey(key);
        var response = await this.cache.keys(request, {});
        if (response == null || response.length == 0) {
            return false;
        }
        return this._isValidResponseForRequest(response[0], request);
    }
    _isValidResponseForRequest(response, request) {
        if (response == null) {
            return false;
        }

        if (IsKindOf(request, Request) == false) {
            return true;
        }

        var requestedTag = request.headers.get("etag");
        if (requestedTag == null) {
            return true;
        }

        var responseTag = response.headers.get("etag");
        return (requestedTag == responseTag);
    }
    encodeObjectToBlob(object) {
        var contents = null;
        var type = null;
        if (object.constructor == String) {
            contents = object;
            type = "text/plain"
        }
        else {
            contents = JSON.stringify(object);
            type = "application/json";
        }
        if (contents == null) {
            console.error("Unsupported object type: ", object);
            return null;
        }
        return new Blob([contents], { type: type });
    }
    async decodeObjectFromBlob(blob, key) {
        var type = blob.type;
        if (type.startsWith("image") == true) {
            if (IsKindOf(key, Slide.Modern) == true ||
                IsKindOf(key, Presentation.Modern) == true ||
                IsKindOf(key, LocalAsset) == true)
            {
                return this._imageFromBlob(blob);
            }
        }
        else if (type == "text/plain" || type == "application/json") {
            return this._stringFromBlob(blob);
        }

        return blob;
    }
    async _imageFromBlob(blob) {
        return new Promise((resolve, reject) => {
            var image = new Image();
            var url = URL.createObjectURL(blob);
            image.src = url;
            image.decode()
                .then(() => resolve(image))
                .catch(reject)
                .finally(() => URL.revokeObjectURL(url));
        })
    }
    async _stringFromBlob(blob) {
        const string = await blob.text();
        if (blob.type == "application/json") {
            return JSON.parse(string);
        }
        return string;
    }
    /*
     * Private helper methods
     */
    async _hashForBuffer(buffer) {
        var digest = await crypto.subtle.digest('SHA-256', buffer);
        return DigestToHexString(digest);
    }
    async _hashForBlob(blob) {
        var buffer = await blob.arrayBuffer();
        return this._hashForBuffer(buffer);
    }
    async _requestForKey(key) {
        return window.location.origin + "/" + this.name + "/" + key;
    }
    async _blobFromResponse(response, decodeBlob, key) {
        var blob = await response.blob();
        if (decodeBlob == true) {
            return await this.decodeObjectFromBlob(blob, key);
        }
        return blob;
    }
    _deleteExpiredItems() {
        var cache = this.cache;
        cache.keys().then(requests => {
            requests.forEach(request => {
                cache.match(request).then(response => {
                    var headers = response?.headers;
                    if (headers == null) {
                        return;
                    }
                    var expires = headers.get("x-ooo-Expires");
                    if (typeof expires == "string") {
                        expires = parseInt(expires);
                    }
                    if (expires == null || expires > Date.now()) {
                        return;
                    }
                    var url = new URL(request.url);
                    var path = url.pathname;
                    var pathComps = path.split("/");
                    var key = pathComps[pathComps.length - 1];
                    this.delete(key)
                });
            })
        });
    }
    async _clear() {
        var cache = this.cache;
        var keys = await cache.keys();
        var promises = [];
        for (const key of keys) {
            promises.push(cache.delete(key));
        }
        await Promise.all(promises);
    }
    async _count() {
        var cache = this.cache;
        var keys = await cache.keys();
        return keys.length;
    }
    async _size() {
        var cache = this.cache;
        var keys = await cache.keys();
        var size = 0;

        for (const key of keys) {
            var response = await cache.match(key);
            var responseSize = parseInt(response.headers.get("content-length"));
            if (typeof responseSize == 'number' && isNaN(responseSize) == false) {
                size += responseSize;
            }
        }
        return size;
    }
}
