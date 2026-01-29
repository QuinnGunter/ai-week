//
//  media/mediastreams/camera.js
//  mmhmm
//
//  Created by Steve White on 08/05/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

Media.Camera = class extends Media.LocalMediaStream {
    constructor(identifier, presenterID, localMediaStream, deviceId, deviceName) {
        super(identifier, presenterID, localMediaStream);
        this.deviceId = deviceId;
        this.deviceName = deviceName;
    }
    get editorClass() {
        return Media.Camera.Editor;
    }
    async restoreMediaStreamOnStage(stage) {
        const deviceId = this.deviceId;
        const deviceName = this.deviceName;
        if (deviceId == null && deviceName == null) {
            return null;
        }

        const cameras = AVHardware.shared.cameras;
        const selected = cameras.find(camera => {
            if (deviceId != null && deviceId == camera.deviceId) {
                return camera;
            }
            if (deviceName != null && deviceName == camera.label) {
                return camera;
            }
        });

        if (selected == null) {
            return null;
        }

        const constraints = stage.localPresenter.defaultUserMediaConstraints(deviceId);

        try {
            return await navigator.mediaDevices.getUserMedia({video: constraints});
        }
        catch (err) {
            console.error("getUserMedia returned: ", constraints, err);
        }
        return null;
    }
    disconnectedOverlayStrings() {
        return {
            title: LocalizedString("Camera unavailable"),
            message: LocalizedString("The connection to this camera was lost."),
            edit: LocalizedString("Select camera"),
            remove: LocalizedString("Remove camera")
        };
    }
    _addLocalMediaStreamTrack(aMediaStreamTrack, eventListener) {
        // In the hybrid app, make sure we're not segmenting the video track
        if (App.isHybrid) {
            aMediaStreamTrack.applyConstraints({ advanced: [ { segmentationMode: "none" } ] });
        }

        super._addLocalMediaStreamTrack(aMediaStreamTrack, eventListener);
    }
    async isReadyToThumbnail() {
        var ready = await super.isReadyToThumbnail();
        if (ready == true) {
            return true;
        }
        var deviceId = this.deviceId;
        if (deviceId == null) {
            return false;
        }
        return ThumbnailStorage.shared.has(deviceId);
    }
    async generateThumbnail() {
        var thumbnail = await super.generateThumbnail();
        var deviceId = this.deviceId;

        // If MediaStream class made a thumbnail...
        if (thumbnail != null) {
            // Cache it for future use
            if (deviceId != null) {
                ThumbnailStorage.shared.put(thumbnail, deviceId);
            }
            // And return it
            return thumbnail;
        }

        // If MediaStream couldn't and we know the deviceId,
        // we might be able to fetch it out of cache
        if (deviceId == null) {
            return null;
        }
        return ThumbnailStorage.shared.get(deviceId);
    }
    encodeToModernRecord(record) {
        super.encodeToModernRecord(record);
        record.encodeProperty("type", "captureDevice");
    }
    decodeMediaContent(media) {
        var success = super.decodeMediaContent(media);
        if (success == false) {
            return false;
        }
        this.deviceId = media.deviceID;
        this.deviceName = media.deviceName;
        this.title = media.title;
        return true;
    }
    encodeMediaContent() {
        var media = super.encodeMediaContent();
        media.deviceID = this.deviceId;
        media.deviceName = this.deviceName;
        media.title = this.title; // XXX: hmm
        return media;
    }
}

Object.defineProperty(Media.Camera, "ClassIdentifier", {
    value: "captureDevice",
    writable: false
});

Object.defineProperty(Media.Camera, "Title", {
    value: LocalizedString("Camera"),
    writable: false
});

Media.Camera.Editor = class {
    constructor(media) {
        this.media = media;
    }
    displayFrom(sender) {
        Media.Camera.RequestNew().then(updated => {
            if (updated == null) {
                return;
            }
            var media = this.media;
            media.mediaSource = updated.mediaSource;
            media.mediaSourceId = updated.mediaSourceId;
            media.title = updated.title;
            media.videoTrack = updated.videoTrack;
            media.thumbnailAsset = null;
            media.hideDisconnectedOverlay();

            media.invalidateThumbnail();
        }).finally(() => {
            var onDismiss = this.onDismiss;
            if (onDismiss != null) {
                onDismiss();
            }
        })
    }
}

Media.Camera.RequestNew = async function(evt) {
    return new Promise((resolve, reject) => {
        const sheet = new OptionListSheet(LocalizedString("Select camera"));
        sheet.cancelButton.addEventListener("click", () => {
            sheet.dismiss();
            resolve(null);
        }, {once: true});
        sheet.actionButton.innerText = LocalizedString("Use camera");

        const localPresenter = gApp.localPresenter;
        sheet.actionButton.addEventListener("click", () => {
            sheet.dismiss();
            const selectedOption = sheet.selectedOption;
            if (selectedOption == null) {
                resolve(null);
                return;
            }

            const deviceId = selectedOption.value;
            if (deviceId == null) {
                resolve(null);
                return;
            }

            var deviceName = selectedOption.innerText;

            var constraints = localPresenter.defaultUserMediaConstraints(deviceId);
            navigator.mediaDevices.getUserMedia({video: constraints}).then(stream => {
                let media = null;
                if (stream != null) {
                    media = new Media.Camera(createUUID(), localPresenter.identifier, stream, deviceId, deviceName);
                    media.title = deviceName;
                }
                resolve(media);
            }).catch(error => {
                console.error("error: ", error);
            });

        }, {once: true});

        const cameras = AVHardware.shared.cameras;
        const filtered = cameras.filter(device => {
            if (device == localPresenter.videoDevice) {
                return false;
            }
            if (device.label.toLowerCase().startsWith("mmhmm") == true ||
                device.label.toLowerCase().startsWith("airtime") == true) {
                return false;
            }
            return true;
        })

        if (filtered.length == 0) {
            ShowAlertView(
                LocalizedString("Camera slide"),
                LocalizedString("No additional cameras were detected. Plug in another camera and try again.")
            );
            return;
        }
        const sorted = filtered.sort((a, b) => a.label.localeCompare(b.label));
        sorted.forEach(presentation => {
            sheet.addOption(presentation.label, presentation.deviceId);
        });
        sheet.displayAsModal();
    })
}
