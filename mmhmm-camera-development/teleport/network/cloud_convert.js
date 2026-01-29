//
//  cloud_convert.js
//  mmhmm
//
//  Created by Steve White on 5/16/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class CloudConverter {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
    cancel() {
        this.cancelled = true;

        var request = this.request;
        if (request != null) {
            request.abort();
            this.request = null;
        }
        this.disconnectWebSocket();
        this.stopConvertTimer();

        if (this.resolve != null) {
            this.resolve(null);
        }
    }
    /*
     *
     */
    _failWithReason(reason) {
        if (this.reject != null) {
            this.reject(reason);
            this.reject = null;
        }
        this.resolve = null;
        this.cancel();
    }
    /*
     * WebSocket related
     */
    async finalizeConversion() {
        const recap = this.conversionRecap;
        const body = this.conversionComplete;
        if (recap == null || body == null) {
            // The order in which the server sends this isn't consistent
            // So we try to wait for both...
            //
            // But if there is an error, we'll never see the recap.
            if (body?.status != "failed") {
                return;
            }
        }

        this.disconnectWebSocket();
        this.conversionRecap = null;
        this.conversionComplete = null;

        console.info("handleImportComplete", body);
        var id = body.id;
        if (id != this.conversionID) {
            console.info("ignoring because the conversion IDs differ", id, this.conversionID);
            return;
        }

        var documentID = body.documentID ?? body.documentId;
        if (!this.isMatchingDocumentID(documentID)) {
            console.error("unknown document ID in payload body", documentID, this.documentID);
            this._failWithReason("Unknown document ID in payload body");
            return;
        }

        this.stopConvertTimer();

        var status = body.status;
        if (status != "success") {
            console.error("bad status in payload body", status, body);

            if (status == "failed") {
                // See if we can find a useful error message to show the user
                var errorMessage = null;
                if (body.error != null) {
                    errorMessage = body.error.message;
                }
                if (errorMessage != null) {
                    this._failWithReason(errorMessage);
                    return;
                }
            }

            this._failWithReason("File import completed with error");
            return;
        }

        const recordsAdded = recap.recordsAdded;
        let slideIDs = null;
        if (recordsAdded != null) {
            slideIDs = recordsAdded.filter(entry => entry.collectionType == mmhmmAPI.CloudyCollectionTypes.ModernSlide)
                                   .map(entry => entry.id);
        }
        // the import process created a pagePresentation and has already stored it, all its records,
        // and all its assets in AWS
        this.resolve({documentID, slideIDs});
        this.resolve = null;
    }
    async handleImportRecap(body) {
        this.conversionRecap = body;
        return this.finalizeConversion();
    }
    async handleImportComplete(body) {
        this.conversionComplete = body;
        return this.finalizeConversion();
    }
    handleImportConversionProgress(body) {
        console.info("handleImportConversionProgress", body);
        var id = body.id;
        if (id != this.conversionID) {
            console.info("ignoring because the conversion IDs differ", id, this.conversionID);
            return;
        }

        this.timeElapsed = Number.parseFloat(body.timeElapsed);
        this.timeEstimated = Number.parseFloat(body.timeRemaining);
        // enable this when convert time estimation is better
        //this.startConvertTimer();
    }
    handleImportSyncProgress(body) {
        var documentID = body.documentId;
        if (!this.isMatchingDocumentID(documentID)) {
            console.info("ignoring because the document IDs differ", documentID, this.documentID);
            return;
        }

        this.stopConvertTimer();

        if (this.onProgress != null) {
            var total = Number.parseFloat(body.recordsTotal);
            var created = Number.parseFloat(body.recordsCreated);
            var progress = (created / total).toFixed(2);
            this.onProgress(CloudConverter.ProgressType.Create, progress);
        }
    }
    handleWebSocketPayload(payload) {
        const type = payload.type;
        const body = payload.body ?? {};
        switch (type) {
            case "file-import-conversion-progress":
                this.handleImportConversionProgress(body);
                break;
            case "file-import-sync-progress":
                this.handleImportSyncProgress(body);
                break;
            case "file-import-complete":
                this.handleImportComplete(body);
                break;
            case "file-import-recap":
                this.handleImportRecap(body);
                break;
            case "sync-record-update":
                // These seem to contain a Cloudy media reference
                // It seems safe to ignore these
                break;
            default:
                console.error("Unknown type in payload", type, payload);
                return;
        }
    }
    connectToWebSocketURL(webSocketURL) {
        console.info("connectToWebSocketURL");
        var websocket = this.websocket;
        if (websocket != null) {
            console.error("Already have a websocket!");
            return;
        }

        websocket = new WebSocket(webSocketURL.toString());
        this.websocket = websocket;

        websocket.onerror = (event) => {
            if (this.cancelled != true) {
                console.error("WebSocket error", event);
                this._failWithReason("WebSocket error")
            }
        };
        websocket.onclose = (event) => {
            var code = event.code;
            if (this.websocket == null || // cleared during .disconnect()
                code == null ||
                code == 1000 || // Normal
                code == 1005) // No Status Received
            {
                return;
            }
            this._failWithReason("WebSocket abnormally closed: " + code)
        };
        websocket.onopen = (event) => {
            console.info("WebSocket connected");
        }
        websocket.onmessage = (event) => {
            var data = event.data;
            var payload = null;
            try {
                payload = JSON.parse(data);
            }
            catch (err) {
                console.error("error parsing data as JSON: ", data, err);
            }

            if (payload == null) {
                console.error("Failed to convert data to JSON", data);
                return;
            }
            this.handleWebSocketPayload(payload);
        };
    }
    disconnectWebSocket() {
        var websocket = this.websocket;
        console.info("disconnectWebSocket", websocket)
        if (websocket == null) {
            return;
        }

        this.websocket = null;
        try {
            websocket.close();
        }
        catch (err) {
            console.error("websocket.close threw: ", err, websocket);
        }
    }

    isMatchingDocumentID(documentID) {
        return documentID == this.documentID;
    }

    startConvertTimer() {
        var timer = this.timer;
        if (timer == null) {
            this.timer = window.setInterval(() => this.convertTimerFired(), 1000);
            this.timeStarted = Date.now();
        }
    }
    stopConvertTimer() {
        var timer = this.timer;
        if (timer != null) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
    }
    convertTimerFired() {
        var timeDelta = Date.now() - this.timeStarted;
        timeDelta += this.timeElapsed;
        var progress = (timeDelta / this.timeEstimated).toFixed(2);
        if (this.onProgress != null) {
            this.onProgress(CloudConverter.ProgressType.Waiting, progress);
        }

        if (this.timeElapsed >= this.timeEstimated) {
            this.stopConvertTimer();
        }
    }

    /*
     * Public method
     */
    async convertFile(file, presentationID=null, insertAfterID=null, onProgress) {
        var endpoint = this.endpoint;
        this.onProgress = onProgress;

        var verboseLog = false;
        if (gLocalDeployment == true) {
            verboseLog = true;
        }

        // Get the destination s3 info
        var s3info = null;
        try {
            s3info = await endpoint.initiateFileImport(presentationID, insertAfterID);
            this.s3info = s3info;
            this.conversionID = s3info.id;
            this.documentID = s3info.documentID;
            if (verboseLog == true) {
                console.info("s3info is: ", s3info);
            }
        }
        catch (e) {
            this.reject("Error initiating file import")
            console.error("initiate file import error: ", e)
        }

        // Make a presigned S3 request to upload the file
        var encodedFilename = encodeURIComponent(file.name)
        encodedFilename = encodedFilename.replace(/[~!'()]/g, function(c) {
            // #518 - encodeURIComponent doesn't encode all reserved characters
            // There's some trial and error here to figure out what S3 wants escaped
            return '%' + c.charCodeAt(0).toString(16);
        });
        // S3 doesn't seem to like asterisks
        encodedFilename = encodedFilename.replaceAll('*', '')
        var presigned = await endpoint.newPreSignedURL(s3info, "PUT", encodedFilename);
        if (verboseLog == true) {
            console.info("presigned is: ", presigned);
        }

        // Connect to the websocket server now to ensure we
        // get all the conversion messages
        var wsURL = await endpoint.newWebsocketURL();
        this.connectToWebSocketURL(wsURL);

        // Manually make the request so that we can properly cancel it
        var promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });

        var request = new XMLHttpRequest();
        request.open("PUT", presigned.url);

        request.addEventListener("error", evt => {
            this.disconnectWebSocket();
            this.stopConvertTimer();
            this.request = null;
            if (this.cancelled == true) {
                return;
            }
            else {
                this.reject("Unknown XHR error")
                console.error("XHR error: ", evt)
            }
        });
        request.addEventListener("load", evt => {
            this.request = null;
            if (verboseLog == true) {
                console.info("request finished uploading", evt);
            }
            var responseText = request.responseText;
            if (responseText == "") {
                if (onProgress != null) {
                    onProgress(CloudConverter.ProgressType.Waiting, Infinity);
                }
                return;
            }
            this.disconnectWebSocket();
            this.stopConvertTimer();
            console.error("Unexpected response from server: ", responseText);
            this.reject("Unexpected response from XHR");
        });

        var totalUploadSize = file.size;
        var lastBytesSent = 0;
        var bytesSent = 0;
        request.upload.onprogress = evt => {
            var change = evt.loaded - lastBytesSent;
            lastBytesSent = evt.loaded;
            bytesSent += change;
            if (onProgress != null) {
                onProgress(CloudConverter.ProgressType.Upload, bytesSent / totalUploadSize);
            }
        };
        this.request = request;
        request.setRequestHeader("Content-Type", file.type ?? "application/octet-stream");
        request.send(file);

        return promise;
    }
}

CloudConverter.ProgressType = Object.freeze({
    Upload: "upload",
    Waiting: "wait",
    Download: "download",
    Create: "create"
});
