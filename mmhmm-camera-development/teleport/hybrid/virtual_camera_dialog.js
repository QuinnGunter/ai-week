//
//  hybrid/virtual_camera_dialog.js
//  mmhmm
//
//  Created by Seth Hitchings on 1/29/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class VirtualCameraDialog extends ActionSheet {
    constructor(gHybrid, virtualCamera, stage) {
        const container = document.createElement("div");
        super("", container, null, true, true, [0, 0], "vcam_education_sheet");
        this.setAllowAutoDismiss();

        this.gHybrid = gHybrid;
        this.virtualCamera = virtualCamera;
        this.stage = stage;

        this.populateContainer(virtualCamera, stage, container);
        this.updateTitle();
        this.setupEventListeners();
    }

    destroy() {
        super.destroy();
        this.removeEventListeners();
        this.callInstructionsPanel.destroy();
    }

    setupEventListeners() {
        this.stage.addObserverForProperty(this, "isVirtualCameraActive");

        NotificationCenter.default.addObserver(
            App.Notifications.VirtualCameraClientsChanged,
            null,
            this.updateTitle,
            this
        );

        NotificationCenter.default.addObserver(
            App.Notifications.VirtualCameraStateChanged,
            null,
            this.updateTitle,
            this
        );
    }

    removeEventListeners() {
        if (this.stage) {
            this.stage.removeObserverForProperty(this, "isVirtualCameraActive");
        }
        NotificationCenter.default.removeObserver(
            App.Notifications.VirtualCameraClientsChanged,
            null,
            this.updateTitle,
            this
        );
        NotificationCenter.default.removeObserver(
            App.Notifications.VirtualCameraStateChanged,
            null,
            this.updateTitle,
            this
        );
    }

    populateContainer(virtualCamera, stage, container) {
        container.classList.add("vcam_education");
        if (isMacOS()) {
            this.sheet.classList.add("macos");
        } else {
            this.sheet.classList.add("windows");
        }
        this.callInstructionsPanel = new CallInstructionsPanel(virtualCamera, stage, container);

        const foregroundSrc = "assets/big-presenter.png";
        const background = RoomsController.shared.roomWithIdentifier("ccd65dc8-18f0-479c-8b6f-bdb8b04e77c5"); // Blue Sky
        this.callInstructionsPanel.setActiveLayout(foregroundSrc, background);
    }

    displayAsModal() {
        super.displayAsModal();
        if (this.gHybrid.onAfterVirtualCameraSupportViewOpened) {
            this.gHybrid.onAfterVirtualCameraSupportViewOpened();
        }
        this.addEventListener("dismiss", () => {
            if (this.gHybrid.onBeforeVirtualCameraSupportViewCloses) {
                this.gHybrid.onBeforeVirtualCameraSupportViewCloses();
            }
        }, {once: true});
    }

    updateTitle() {
        const available = this.virtualCamera.isVirtualCameraAvailable();
        const active = this.virtualCamera.isVirtualCameraActive();

        let title = null;
        if (!available) {
            title = LocalizedString("Set up Airtime virtual camera");
        } else if (!active) {
            title = LocalizedString("Connect Airtime virtual camera");
        } else {
            title = LocalizedString("Airtime virtual camera help");
        }

        this.titlebarTitle = title;
    }

    observePropertyChanged(object, key, value) {
        if (key == "isVirtualCameraActive") {
            this.updateTitle();
        }
    }
}
