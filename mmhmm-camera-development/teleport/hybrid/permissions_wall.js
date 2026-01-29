//
//  hybrid/permissions_pane.js
//  mmhmm
//
//  Created by Seth Hitchings on 1/16/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * A full screen modal that requires the user to grant camera permissions
 * before continuing. Used only in the hybrid application.
 */
class DevicePermissionsWall extends HybridWall {

    /**
     * @param {App} delegate an instance of App, aka gApp.
     */
    constructor(delegate, hybridInterface) {
        const container = document.createElement("div");
        super(container);

        this.cameraRow = null;
        this.virtualCameraRow = null;

        this.delegate = delegate;
        this.hybridInterface = hybridInterface;
        this.virtualCamera = new VirtualCameraInterface(hybridInterface);
        this.buildUI(container);
    }

    show(onDismiss) {
        this.startListeners();
        super.show(onDismiss);
    }

    dismiss() {
        this.stopListeners();
        super.dismiss();
    }

    startListeners() {
        // We don't use this wall in the browser, but this functionality is helpful for development
        if (App.isHybrid) {
            const hybrid = this.hybridInterface;
            hybrid.capabilities.camera.setAuthorizationChangeCallback(_ => this.updateDeviceStates());
            hybrid.virtualCamera.setStateChangeCallback(_ => this.updateVirtualCameraState());
        }

        this.updateDeviceStates();
        this.updateVirtualCameraState();
    }

    stopListeners() {
        if (App.isHybrid) {
            const hybrid = this.hybridInterface;
            hybrid.capabilities.camera.setAuthorizationChangeCallback(null);
            hybrid.virtualCamera.setStateChangeCallback(null);
        }
    }

    async updateDeviceStates() {
        let camera = false;

        if (App.isHybrid) {
            camera = this.delegate.isHybridCameraAuthorized();
        } else {
            // We don't use this wall in the browser, but this functionality is helpful for development
            camera = await navigator.permissions.query({name: "camera"});
        }

        this.cameraRow.classList.toggle("allowed", camera);

        this.continueButton.disabled = !camera;
    }

    updateVirtualCameraState() {
        let state = this.virtualCamera.virtualCameraState;
        console.log("Virtual camera state changed to", state);

        // Work around #5119, in which we get an error state when first checking
        // In every case we've seen, attempting to install the virtual camera works,
        // and the install request seems to cure the mistaken error state and set it
        // back to "notInstalled". Do this only once.
        if (state == VirtualCameraState.error && this.ignoredInitialError !== true) {
            state = VirtualCameraState.notInstalled;
            this.ignoredInitialError = true;
            console.log("Ignoring initial error state for virtual camera");
        }

        const installed = state == VirtualCameraState.installed;
        const installing = state == VirtualCameraState.installing;
        const installable =
            state == VirtualCameraState.notInstalled ||
            state == VirtualCameraState.awaitingUserApproval ||
            state == VirtualCameraState.uninstalling;

        this.virtualCameraRow.classList.toggle("allowed", installed);

        // If the camera is installing, show a spinner instead of the "enable" button
        this.virtualCameraRow.classList.toggle("installing", installing);

        // If the camera isn't installable, we show a warning dialog instead of the "enable" button
        this.virtualCameraRow.classList.toggle("notInstallable", !installed && !installing && !installable);

        this.virtualCameraStatusTextElement.innerText = this.virtualCamera.descriptionForState(state);

        if (installed && this.installCameraSheet) {
            this.installCameraSheet.dismiss();
        }

        if (installed) {
            this.continueButton.innerText = LocalizedString("Continue");
        }
    }

    /** UI construction */

    buildUI(container) {
        container.classList.add("devices");

        container.appendChild(this.buildBody());
        container.appendChild(this.buildFooter());
    }

    buildBody() {
        const content = document.createElement("div");
        content.classList.add("content");

        const header = document.createElement("div");
        header.classList.add("title");
        header.innerText = LocalizedString("Set up Airtime Camera");
        content.appendChild(header);

        const permissions = document.createElement("div");
        permissions.classList.add("permissions");
        content.appendChild(permissions);

        permissions.appendChild(this.buildPermissionsHeading(LocalizedString("Required")));
        permissions.appendChild(this.buildCameraRow());

        permissions.appendChild(this.buildPermissionsHeading(LocalizedString("Optional")));
        permissions.appendChild(this.buildVirtualCameraRow());

        return content;
    }

    buildPermissionsHeading(label) {
        const heading = document.createElement("div");
        heading.classList.add("heading");
        heading.innerText = label;
        return heading;
    }

    buildCameraRow() {
        this.cameraRow = this.buildDeviceRow("camera",
            LocalizedString("Access to your camera"),
            AppIcons.CameraOn(),
            () => this.allowCameraButtonClicked()
        );
        return this.cameraRow;
    }

    buildDeviceRow(type, label, icon, action) {
        const row = document.createElement("div");
        row.classList.add("row", type);

        row.appendChild(icon);

        const text = document.createElement("div");
        text.classList.add("type");
        text.innerText = label;
        row.appendChild(text);

        const button = document.createElement("button");
        button.classList.add("capsule");
        button.innerText = LocalizedString("Allow");
        button.addEventListener("click", _ => action());
        row.appendChild(button);

        const complete = AppIcons.StepComplete();
        complete.setAttributeNS(null, "class", "complete");
        row.appendChild(complete);

        return row;
    }

    buildVirtualCameraRow() {
        const row = document.createElement("div");
        row.classList.add("row", "virtual-camera");
        this.virtualCameraRow = row;

        const left = document.createElement("div");
        left.classList.add("left");
        row.appendChild(left);

        const top = document.createElement("div");
        top.classList.add("top");
        left.appendChild(top);

        top.appendChild(AppIcons.Settings());

        const msg = document.createElement("div");
        msg.innerText = isMacOS() ? LocalizedString("Enable the Airtime camera") : LocalizedString("Install the Airtime camera");
        top.appendChild(msg);

        const bottom = document.createElement("div");
        bottom.classList.add("bottom");
        this.virtualCameraStatusTextElement = bottom;
        left.appendChild(bottom);

        const button = document.createElement("button");
        button.classList.add("capsule");
        button.innerText = isMacOS() ? LocalizedString("Enable") : LocalizedString("Install");
        button.addEventListener("click", _ => this.enableVirtualCameraButtonClicked());
        row.appendChild(button);

        const complete = AppIcons.StepComplete();
        complete.setAttributeNS(null, "class", "complete");
        row.appendChild(complete);

        const error = AppIcons.Warning();
        error.setAttributeNS(null, "class", "error");
        row.appendChild(error);

        const spinner = document.createElement("span");
        spinner.classList.add("loader");
        row.appendChild(spinner);

        return row;
    }

    buildFooter() {
        const footer = document.createElement("div");
        footer.classList.add("footer");

        const continueButton = document.createElement("button");
        continueButton.classList.add("capsule");
        continueButton.innerText = isMacOS() ? LocalizedString("Continue") : LocalizedString("Skip");
        continueButton.addEventListener("click", _ => {
            this.dismiss();
        });
        this.continueButton = continueButton;
        footer.appendChild(continueButton);

        return footer;
    }

    /* Action handlers */

    enableVirtualCameraButtonClicked() {
        const install  = () => {
            const virtualCamera = this.virtualCamera;
            const state = virtualCamera.virtualCameraState;
            virtualCamera.installVirtualCamera();
            Analytics.Log("button.click", {
                action: "install virtual camera",
                state,
            });
        }

        if (this.virtualCamera.requiresInstallationInstructions()) {
            const sheet = new InstallVirtualCameraDialog(this.virtualCamera, install);
            sheet.displayAsModal();
            sheet.addEventListener("dismiss", _ => this.installCameraSheet = null);
            this.installCameraSheet = sheet;
        } else {
            install();
        }
    }

    allowCameraButtonClicked() {
        this.hybridInterface.capabilities.camera.authorize();
        Analytics.Log("button.click", {action: "authorize camera"});
    }
}
