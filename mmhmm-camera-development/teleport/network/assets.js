//
//  slide_assets.js
//  mmhmm
//
//  Created by Steve White on 02/22/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class LocalAsset {
    constructor({file, blob, fingerprint, contentURL, mimeType}) {
        if (file == null && blob == null && fingerprint == null && contentURL == null) {
            return null;
        }

        if (file != null && blob == null) {
            blob = file;
        }
        this.blob = blob;
        this.fingerprint = fingerprint;
        this._openCount = 0;

        if (contentURL != null && contentURL.constructor == String) {
            if (contentURL.indexOf("://") == -1) {
                // Handle relative URLs
                contentURL = new URL(contentURL, window.location);
            }
            else {
                contentURL = new URL(contentURL);
            }
        }
        this.contentURL = contentURL;
        this._mimeType = mimeType;
    }
    get mimeType() {
        var blob = this.blob;
        if (blob != null) {
            return blob.type;
        }
        var contentURL = this.contentURL;
        if (contentURL == null) {
            return null;
        }

        var filename = contentURL.lastPathComponent;
        var dotIndex = filename.lastIndexOf(".");
        if (dotIndex != -1) {
            const extension = filename.substring(dotIndex + 1);
            const mime = Media.Files.mimeTypeForExtension(extension);
            if (mime != null) {
                return mime;
            }
        }
        dotIndex = filename.indexOf(".");
        if (dotIndex != -1) {
            const extension = filename.substring(0, dotIndex);
            const mime = Media.Files.mimeTypeForExtension(extension);
            if (mime != null) {
                return mime;
            }
        }
        return this._mimeType;
    }
    async blobFromContentURL(contentURL, headers={}) {
        return new Promise((resolve, reject) => {
            var request = new XMLHttpRequest();
            request.open("GET", contentURL.toString());
            request.responseType = "blob";
            request.addEventListener("load", evt => {
                resolve(request.response);
            });
            request.addEventListener("error", evt => {
                console.error("blobFromContentURL XHR failed with error: ", evt);
                var err = new TypeError("LocalAsset XMLHTTPRequest failed to load");
                reject(err);
            });
            for (let key in headers) {
                const val = headers[key];
                request.setRequestHeader(key, val);
            }

            request.send();
        })
    }
    async openAsBlob(allowExternalLoads = false) {
        var blob = this.blob;
        if (blob == null) {
            blob = this.file;
        }
        if (blob != null) {
            return blob;
        }

        var contentURL = this.contentURL;
        if (contentURL != null) {
            if (allowExternalLoads == false) {
                // XXX: what do we do here??
            }
            return this.blobFromContentURL(contentURL);
        }

        return null;
    }
    async open() {
        let objectURL = this.objectURL;
        if (objectURL != null) {
            this._openCount += 1;
            return objectURL;
        }

        const blob = this.blob ?? this.file;
        if (blob != null) {
            if (blob.size < 512 && blob.type.startsWith("image/") == true) {
                const buffer = await blob.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                let chars = new String();
                for (let idx=0; idx<bytes.length ;idx++) {
                    chars += String.fromCharCode(bytes[idx])
                }
                const b64 = `data:${blob.type};base64,${btoa(chars)}`
                return b64;
            }
            objectURL = URL.createObjectURL(blob);
            this.objectURL = objectURL;
            this._openCount += 1;
            return objectURL;
        }

        const contentURL = this.contentURL;
        if (contentURL != null) {
            return contentURL.toString();
        }

        return null;
    }
    async identifyMimeTypeFromBlob() {
        let identifyingTask = this._identifyingTask;
        if (identifyingTask != null) {
            return identifyingTask;
        }

        const bytesFromString = function(string) {
            return string.split("").map(char => char.charCodeAt(0));
        };
        const types = [
            { mime: "image/png",   offset: 1, value: bytesFromString("PNG") },
            { mime: "image/jpeg",  offset: 0, value: [0xff,0xd8,0xfe] },

            // Do not reduce this to just `ftyp` as otherwise it could flag
            // heic files as videos.
            { mime: "video/mp4",   offset: 4, value: bytesFromString("ftypmp42") },
            { mime: "video/mp4",   offset: 4, value: bytesFromString("ftypisom") },
            { mime: "video/mp4",   offset: 4, value: bytesFromString("ftypqt  ") },

            { mime: "audio/wav",   offset: 0, value: bytesFromString("RIFF") },
            // Probably not true if the file doesn't have ID3 headers, but
            // surely most mp3s have them....
            { mime: "audio/mp3",   offset: 0, value: bytesFromString("ID3"),  },

            // Given this is primarily to identify assets stored in cloudy that
            // have a bin extension / application/octet-stream mime, we shouldn't
            // encounter PDFs or HEICs or whatnot. Storing heic here to remind me
            // that they also start with `ftyp` hence the multiple variations about
            // for videos.
            //{ mime: "image/heic",  offset: 4, value: bytesFromString("ftypheic") },
            //{ mime: "application/pdf",  offset: 0, value: bytesFromString("%PDF-"),  },
        ];

        this._identifyingTask = new Promise(async (resolve, reject) => {
            let blob = this.blob ?? this.file;
            if (blob == null) {
                const contentURL = await this.open();
                if (contentURL != null) {
                    const headers = {
                        "Content-Range": "bytes 0-128"
                    };

                    try {
                        blob = await this.blobFromContentURL(contentURL, headers);
                    }
                    catch (err) {
                        reject(err);
                        return;
                    }
                }
            }

            if (blob == null) {
                resolve(null);
                return;
            }

            const buffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const match = types.find(type => {
                const expected = type.value;
                const data =  bytes.subarray(type.offset, type.offset + expected.length);
                for (let idx=0; idx<expected.length; idx+=1) {
                    if (data[idx] != expected[idx]) {
                        return false;
                    }
                }
                return true;
            })

            resolve(match?.mime);
        });
        return this._identifyingTask.finally(() => {
            this._identifyingTask = null;
        })
    }
    async openAsElement() {
        var mimeType = this.mimeType;
        if (mimeType == null) {
            mimeType = await this.identifyMimeTypeFromBlob();
            if (mimeType == null) {
                throw "Cannot open unknown type as element"
            }
            else {
                this._mimeType = mimeType;
            }
        }

        var opened = await this.open();
        var elementPromise = new Promise((resolve, reject) => {
            if (mimeType.startsWith("image") == true) {
                var image = new Image();
                image.crossOrigin = "anonymous";
                image.src = opened;
                image.decode().then(() => resolve(image)).catch(reject);
                return;
            }

            var avTagName = null;
            if (mimeType.startsWith("video") == true) {
                avTagName = "video";
            }
            else if (mimeType.startsWith("audio") == true) {
                avTagName = "audio";
            }
            else if (mimeType.startsWith("font") == true) {
                this.openAsBlob().then(resolve).catch(reject);
                return;
            }
            else {
                throw `Don't know how to load ${mimeType}`
            }

            var element = document.createElement(avTagName);
            element.addEventListener("loadeddata", evt => {
                element.addEventListener("seeked", evt => {
                    // See autplay comments below
                    element.pause();
                    resolve(element);
                }, {once: true});
                element.currentTime = 1/30;
            }, {once: true});

            element.addEventListener("error", evt => {
                reject(element.error);
            }, {once: true});

            element.crossOrigin = "anonymous";
            element.src = opened;
        })

        try {
            return await elementPromise;
        }
        finally {
            this.close();
        }
    }
    close() {
        var objectURL = this.objectURL;
        if (objectURL != null) {
            this._openCount -= 1;
            if (this._openCount == 0) {
                URL.revokeObjectURL(objectURL);
                this.objectURL = null;
            }
        }
    }
    toJSON() {
        var r = {};

        var mimeType = this.mimeType;
        if (mimeType != null) {
            r.mimeType = mimeType;
        }

        var contentURL = this.contentURL;
        if (contentURL != null) {
            r.contentURL = contentURL;
        }

        var fingerprint = this.fingerprint;
        if (fingerprint != null) {
            r.fingerprint = fingerprint;
        }
        return r;
    }
}

class PlaceholderAsset extends LocalAsset {
    constructor(transparent) {
        var pngBase64 = null;
        if (transparent == true) {
            pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        }
        else {
            pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
        }
        var decoded = atob(pngBase64);
        var binary = new Uint8Array(decoded.length);
        for (var idx = 0; idx < decoded.length; idx += 1) {
            binary[idx] = decoded.charCodeAt(idx);
        }
        var options = {
            blob: new Blob([binary], {
                type: "image/png"
            })
        };
        super(options);
    }
}

class CanvasBackedAsset extends LocalAsset {
    constructor(canvas, mimeType = "image/png") {
        super({});
        this.canvas = canvas;
        this.mimeType = mimeType;
    }
    set mimeType(value) {
        this._mimeType = value;
    }
    get mimeType() {
        return this._mimeType;
    }
    _willCaptureCanvas() {
        // intentionally blank, subclass hook
    }
    async openAsBlob() {
        var mimeType = this.mimeType;
        var canvas = this.canvas;
        var task = null;
        if (canvas.convertToBlob != null) {
            task = canvas.convertToBlob({type: mimeType});
        }
        else {
            task = new Promise((resolve, reject) => {
                try {
                    this._willCaptureCanvas();
                    canvas.toBlob(function(blob) {
                        resolve(blob);
                    }, mimeType);
                }
                catch (err) {
                    gSentry.exception(err);
                    reject(err);
                }
            });
        }

        var blob = await task;
        this.fingerprint = await FingerprintForBlob(blob);
        return blob;
    }
    async open() { // returns a URL...
        return new Promise((resolve, reject) => {
            this._willCaptureCanvas();

            var mimeType = this.mimeType;
            var canvas = this.canvas;

            // canvas might be an OffscreenCanvas...
            if (window.OffscreenCanvas != null) {
                this.openAsBlob().then(blob => {
                    var reader = new FileReader();
                    reader.onload = evt => {
                        resolve(reader.result);
                    };
                    reader.readAsDataURL(blob);
                });
            }
            else {
                // It's a HTMLCanvasElement
                var dataURI = canvas.toDataURL(mimeType);
                resolve(dataURI);
            }
        });
    }
}
