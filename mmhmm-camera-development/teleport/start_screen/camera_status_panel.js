//
//  start_screen/camera_status_panel.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/16/2024
//  Copyright 2024 mmhmm inc. All rights reserved.
//

class VirtualCameraStatusPanel {

    /**
     * @param {VirtalCameraInterface} virtualCamera the app's virtual camera interface instance.
     * @param {Stage} stage the app's stage instance.
     * @param {Element} container the DOM element to attach ourselves to.
     */
    constructor(virtualCamera, stage, container) {
        this.virtualCamera = virtualCamera;
        this.stage = stage;
        this.container = container;

        stage.addObserverForProperty(this, "isVirtualCameraActive");

        NotificationCenter.default.addObserver(
            App.Notifications.VirtualCameraClientsChanged,
            null,
            this.virtualCameraClientsChanged,
            this
        );

        NotificationCenter.default.addObserver(
            App.Notifications.VirtualCameraStateChanged,
            null,
            this.virtualCameraStateChanged,
            this
        );

        this.buildUI();
        this.updateVirtualCameraState();
    }

    destroy() {
        NotificationCenter.default.removeObserver(
            App.Notifications.VirtualCameraClientsChanged,
            null,
            this.virtualCameraClientsChanged,
            this
        );
        NotificationCenter.default.removeObserver(
            App.Notifications.VirtualCameraStateChanged,
            null,
            this.virtualCameraStateChanged,
            this
        );
        if (this.stage) {
            this.stage.removeObserverForProperty(this, "isVirtualCameraActive");
            this.stage = null;
        }
    }

    /*
     * UI construction
     */

    buildUI() {
        const container = this.container;

        const top = document.createElement("div");
        top.classList.add("row", "top");

        container.appendChild(this.buildIndicator());
        container.appendChild(this.buildMessage());

        return;
    }

    /**
     * The graphical indication of the camera status.
     */
    buildIndicator() {
        const container = document.createElement("div");
        container.classList.add("indicator");

        /* Selected layout preview */
        const left = document.createElement("div");
        left.classList.add("left");
        left.appendChild(document.createElement("div"));
        container.appendChild(left);

        const connector = document.createElement("div");
        connector.classList.add("connector");
        container.appendChild(connector);

        /* Connection state indicator */
        const center = document.createElement("div");
        center.classList.add("center");
        container.appendChild(center);

        const disconnected = document.createElement("div");
        disconnected.classList.add("disconnected");
        disconnected.appendChild(AppIcons.VCamDisconnected());
        center.appendChild(disconnected);

        const connected = document.createElement("div");
        connected.classList.add("connected");
        connected.appendChild(AppIcons.VCamConnectedArrow());
        center.appendChild(connected);

        const disabled = document.createElement("div");
        disabled.classList.add("disabled");
        disabled.appendChild(AppIcons.VCamDisabled());
        center.appendChild(disabled);

        container.appendChild(connector.cloneNode());

        /* Call video preview */
        const right = document.createElement("div");
        right.classList.add("right");
        right.appendChild(document.createElement("div"));
        container.appendChild(right);

        return container;
    }

    /**
     * The textual indicator of the camera status.
     */
    buildMessage() {
        const container = document.createElement("div");
        container.classList.add("row", "message");

        const label = document.createElement("span");
        label.innerText = LocalizedString("Airtime virtual camera: ");
        container.appendChild(label);

        const disconnected = document.createElement("span");
        disconnected.classList.add("disconnected");
        disconnected.innerText = LocalizedString("not connected");
        container.appendChild(disconnected);

        const connected = document.createElement("span");
        connected.classList.add("connected");
        connected.innerText = LocalizedString("connected");
        container.appendChild(connected);

        const disabled = document.createElement("span");
        disabled.classList.add("disabled");
        disabled.innerText = LocalizedString("disabled");
        container.appendChild(disabled);

        return container;
    }

    /*
     * Event handling
     */

    setActiveSlide(slide) {
        const source = this.container.querySelector(".indicator .left > div");
        const dest = this.container.querySelector(".indicator .right > div");

        ThumbnailStorage.shared.get(slide).then(thumbnail => {
            source.replaceChildren(thumbnail);
        });
        ThumbnailStorage.shared.get(slide).then(thumbnail => {
            dest.replaceChildren(thumbnail);
        });
    }

    /**
     * @param {String} foregroundSrc The src URL for the presenter foreground image, e.g. silhouette.
     * @param {Room} background The virtual background.
     */
    setActiveLayout(foregroundSrc, background) {
        const source = this.container.querySelector(".indicator .left > div");
        const dest = this.container.querySelector(".indicator .right > div");

        const newSourceBg = document.createElement("img");
        newSourceBg.draggable = false;
        const newDestBg = document.createElement("img");
        newDestBg.draggable = false;
        ThumbnailStorage.shared.get(background).then(blob => {
            const url = URL.createObjectURL(blob);
            newSourceBg.src = url;
            newDestBg.src = url;
            Promise.all([newSourceBg.decode(), newDestBg.decode()]).finally(_ => URL.revokeObjectURL(url));
        }).catch(err => {
            console.error("Error loading background", err);
        });

        const newSourceFg = document.createElement("img");
        newSourceFg.draggable = false;
        newSourceFg.src = foregroundSrc;
        const newDestFg = document.createElement("img");
        newDestFg.draggable = false;
        newDestFg.src = foregroundSrc;

        source.replaceChildren(newSourceBg, newSourceFg);
        dest.replaceChildren(newDestBg, newDestFg);
    }

    observePropertyChanged(obj, key, val) {
        if (key == "isVirtualCameraActive") {
            this.updateVirtualCameraState();
        }
    }

    virtualCameraClientsChanged() {
        this.updateVirtualCameraState();
    }

    virtualCameraStateChanged() {
        this.updateVirtualCameraState();
    }

    updateVirtualCameraState() {
        const cameraAvailable = this.virtualCamera.isVirtualCameraAvailable();
        const cameraActive = this.virtualCamera.isVirtualCameraActive();

        const container = this.container;
        if (!cameraAvailable) {
            container.classList.remove("connected", "disconnected");
            container.classList.add("disabled");
        } else if (cameraActive) {
            container.classList.remove("disconnected", "disabled");
            container.classList.add("connected");
        } else {
            container.classList.remove("connected", "disabled");
            container.classList.add("disconnected");
        }
    }
}
