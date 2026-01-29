//
//  avhardware.js
//  mmhmm
//
//  Created by Steve White on 8/22/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class AVHardware extends ObservableObject {
    constructor() {
        super();

        this.automaticallyNotifiesObserversOfCameras = false;
        this.automaticallyNotifiesObserversOfSpeakers = false;
        this.automaticallyNotifiesObserversOfMicrophones = false;

        var mediaDevices = navigator.mediaDevices;
        if (mediaDevices == null) {
            return;
        }

        this.refresh();

        mediaDevices.addEventListener("devicechange", evt => {
            this.refresh();
        });
    }
    async refresh() {
        var devices = null;
        try {
            devices = await navigator.mediaDevices.enumerateDevices();
        }
        catch (err) {
            console.error("enumerateDevices threw: ", err);
            devices = [];
        }

        devices = devices.filter(dev => {
            return (dev.label.toLowerCase().startsWith("mmhmm") == false) &&
                   (dev.label.toLowerCase().startsWith("airtime") == false);
        });

        var differs = (a, b) => {
            // The InputDeviceInfo may pass some equality tests
            // but the properties on the objects differ...
            var jsonA = a.map(a => a.toJSON());
            var jsonB = b.map(b => b.toJSON());
            return (EqualObjects(jsonA, jsonB) == false);
        }

        var speakers = devices.filter(dev => dev.kind == "audiooutput");
        var changes = {};
        if (differs(speakers, this.speakers) == true) {
            changes.speakers = speakers;
        }
        this._speakers = speakers;

        var microphones = devices.filter(dev => dev.kind == "audioinput");
        if (differs(microphones, this.microphones) == true) {
            changes.microphones = microphones;
        }
        this._microphones = microphones;

        var cameras = devices.filter(dev => dev.kind == "videoinput");
        if (differs(cameras, this.cameras) == true) {
            changes.cameras = cameras;
        }
        this._cameras = cameras;

        for (var key in changes) {
            this.didChangeValueForProperty(changes[key], key);
        }
    }
    get microphones() {
        return Array.from(this._microphones ?? []);
    }
    get speakers() {
        return Array.from(this._speakers ?? []);
    }
    get cameras() {
        return Array.from(this._cameras ?? []);
    }
}

AVHardware.supported = (navigator.mediaDevices != null);
AVHardware.shared = new AVHardware();
