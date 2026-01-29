//
//  websocket.js
//  mmhmm
//
//  Created by Seth Hitchings on 2/14/2024.
//  Copyright 2024 mmhmm inc. All rights reserved.
//

// An abstract class for handling WebSocket connections to the mmhmm service
class AbstractWebSocket extends EventTarget {
    constructor(endpoint) {
        super();
        this.endpoint = endpoint;
    }

    destroy() {
        this.disconnectWebSocket();
    }

    async connectWebSocket() {
        var websocket = this.websocket;
        if (websocket != null) {
            console.error("Already have a websocket!");
            return;
        }

        return new Promise(async (resolve, reject) => {
            let webSocketURL = await this.endpoint.newWebsocketURL();
            websocket = new WebSocket(webSocketURL.toString());
            this.websocket = websocket;

            websocket.onerror = (event) => {
                if (this.websocket) { // cleared during .disconnectWebSocket()
                    console.error("WebSocket error", event);
                    reject();
                }
            };
            websocket.onclose = (event) => {
                var code = event.code;
                if (this.websocket == null || // cleared during .disconnectWebSocket()
                    code == null ||
                    code == 1000 || // Normal
                    code == 1005) // No Status Received
                {
                    // Don't reject the connection promise if the consumer
                    // intentionally disconnected already
                    resolve();
                    console.log("WebSocket closed", code);
                } else {
                    reject();
                    console.error("WebSocket abnormally closed: ", code);
                }
            };
            websocket.onopen = (event) => {
                console.info("WebSocket connected");
                resolve();
            }
            websocket.onmessage = (event) => {
                var data = event.data;
                var payload = null;
                try {
                    payload = JSON.parse(data);
                } catch (err) {
                    console.error("error parsing data as JSON: ", data, err);
                }
                if (payload == null) {
                    console.error("Failed to convert data to JSON", data);
                    return;
                }
                this.handleWebSocketPayload(payload);
            };
        });
    }

    disconnectWebSocket() {
        var websocket = this.websocket;
        if (websocket == null) {
            return;
        }
        this.websocket = null;
        try {
            websocket.close();
        } catch (err) {
            console.error("websocket.close threw: ", err, websocket);
        }
    }

    // To be overridden by subclasses
    handleWebSocketPayload(payload) {
    }
}
