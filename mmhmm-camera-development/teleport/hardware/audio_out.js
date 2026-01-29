//
//  audio_out.js
//  mmhmm
//
//  Created by Steve White on 7/11/21.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class AudioOutput extends ObservableObject {
    constructor() {
        super();

        this._sinkId = SharedUserDefaults.getValueForKey("audioSinkId", "default");
        this._devices = [];
        this._elements = [];

        this.automaticallyNotifiesObserversOfDevices = false;
        this.automaticallyNotifiesObserversOfSinkId = false;

        var mediaDevices = navigator.mediaDevices;
        if (mediaDevices == null) {
            this.supported = false;
            return;
        }

        if (HTMLMediaElement.prototype.setSinkId == null) {
            this.supported = false;
            return;
        }

        this.supported = true;

        var hardware = AVHardware.shared;
        hardware.addObserverForProperty(this, "speakers");
        if (hardware.speakers.length > 0) {
            this._refreshDeviceList();
        }
    }
    //
    // Public methods
    //
    addMediaElement(element) {
        if (element == null) {
            console.error("addMediaElement given null element");
            return;
        }
        if (element.setSinkId == null) {
            return;
        }

        var elements = this._elements;
        if (elements.indexOf(element) != -1) {
            // We already know about this element...
            return;
        }
        elements.push(element);

        // For some reason, some sources don't play to the selected
        // sink unless they've already loaded some data.
        // So if the element isn't in a good ready state, we'll
        // wait for it to load and then set the sink
        var setIt = () => {
            element.setSinkId(this.sinkId).catch(err => {
                console.info("setSinkId on element threw", element, err);
            });
        }

        if (element.readyState >= HTMLMediaElement.HAVE_METADATA) {
            setIt();
        }
        else {
            element.addEventListener("loadeddata", setIt, {once: true});
        }
    }
    removeMediaElement(element) {
        var index = this._elements.indexOf(element);
        if (index != -1) {
            this._elements.splice(index, 1);
        }
    }
    get devices() {
        return Array.from(this._devices);
    }
    get sinkId() {
        return this._sinkId;
    }
    setSinkId(sinkId) {
        this._sinkId = sinkId ?? "default";

        this._updateMediaElementsSink(sinkId);

        this.didChangeValueForProperty(this._sinkId, "sinkId");
        SharedUserDefaults.setValueForKey(this._sinkId, "audioSinkId");
    }
    //
    // Private methods
    //
    _updateMediaElementsSink(sinkId) {
        this._elements.forEach(element => {
            element.setSinkId(sinkId).catch(err => {
                console.info("setSinkId on element threw", element, err);
            });
        })
    }
    _refreshDeviceList() {
        var speakers = AVHardware.shared.speakers;
        this._devices = speakers;
        this.didChangeValueForProperty(this.devices, "devices");

        var selected = speakers.find(dev => dev.deviceId == this.sinkId);
        if (selected != null) {
            return;
        }

        var defaultDev = speakers.find(dev => dev.deviceId == "default");
        if (defaultDev == null && speakers.length > 0) {
            defaultDev = speakers[0];
        }

        var sinkId = null;
        if (defaultDev != null) {
            sinkId = defaultDev.deviceId;
        }
        else {
            sinkId = "";
        }
        this.setSinkId(sinkId);
        this._sinkId = sinkId;
    }
    observePropertyChanged(obj, key, val) {
        this._refreshDeviceList();
    }
}

AudioOutput.shared = new AudioOutput();
