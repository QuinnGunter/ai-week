//
//  hybrid/virtual_camera.js
//  mmhmm
//
//  Created by Seth Hitchings on 1/29/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * This class wraps up as much as possible of the logic for interacting with the
 * virtual camera management APIs provided to the web application by the our native app
 * (the hybrid app).
 *
 * Note that this class doesn't interact with the actual virtual camera exposed by
 * window.MmhmmCamera; we only deal with the camera management APIs.
 *
 * Most of these APIs are provided via the gHybrid global that the native app
 * injects into the web app's JavaScript context. By wrapping this, we centralize
 * the logic for interacting with gHybrid and make it easier to mock out for testing
 * and in-browser development.
 */
class VirtualCameraInterface {

    /**
     * @param {Object} hybridInterface The gHybrid global injected by the native app.
     * @param {Stage} stage The app's stage instance, or null if there is not stage.
     */
    constructor(hybridInterface, stage = null) {
        this.hybridInterface = hybridInterface;
        this.stage = stage;
    }

    initializeCallbacks(titlebarClickHandler) {
        const hybrid = this.hybridInterface;

        // Post a notification when the set of connected virtual camera clients changes
        // Older versions of the hybrid app didn't have a virtualCamera object, so we need to check for it
        if (hybrid.virtualCamera && hybrid.virtualCamera.setClientsChangeCallback) {
            hybrid.virtualCamera.setClientsChangeCallback(_ => {
                NotificationCenter.default.postNotification(App.Notifications.VirtualCameraClientsChanged, this);
            });
        }

        // Post a notification when the virtual camera install state changes
        if (hybrid.virtualCamera && hybrid.virtualCamera.setStateChangeCallback) {
            hybrid.virtualCamera.setStateChangeCallback(_ => {
                NotificationCenter.default.postNotification(App.Notifications.VirtualCameraStateChanged, this);
            });
        }

        // Call our callback when the virtual camera titlebar button is clicked
        if (hybrid.setTitlebarButtonClickedCallback) {
            hybrid.setTitlebarButtonClickedCallback(_ => titlebarClickHandler());
        }
    }

    static getVirtualCameraState(hybridInterface) {
        if (!hybridInterface || hybridInterface.apiVersion == null || hybridInterface.virtualCamera == null) {
            // Older versions of the hybrid app didn't have a virtualCamera object
            // In those versions, the native code ensures that the camera is available before
            // allowing the app to launch, so we can assume it's installed
            return VirtualCameraState.installed;
        }
        return hybridInterface.virtualCamera.state.description;
    }

    static isVirtualCameraInstalled(hybridInterface) {
        const state = VirtualCameraInterface.getVirtualCameraState(hybridInterface);
        return state == VirtualCameraState.installed;
    }

    /**
     * Get the current state of the virtual camera.
     * @returns {VirtualCameraState} a string enum value representing the current state of the virtual camera.
     */
    get virtualCameraState() {
        return VirtualCameraInterface.getVirtualCameraState(this.hybridInterface);
    }

    /**
     * Check whether the virtual camera is installed and ready for use.
     * @returns {boolean} true if the virtual camera is available
     */
    isVirtualCameraAvailable() {
        return this.virtualCameraState == VirtualCameraState.installed;
    }

    /**
     * Check whether the virtual camera is active, i.e., whether the web app
     * is actively feeding frames to the camera. The hybrid app starts this
     * stream when a virtual camera client connects and stops it when there
     * are no more clients connected.
     *
     * @returns {boolean} true if the virtual camera is active
     */
    isVirtualCameraActive() {
        if (this.stage) {
            return this.stage.isVirtualCameraActive;
        }
        return false;
    }

    getVirtualCameraClients() {
        return this.hybridInterface.virtualCamera?.clients || [];
    }

    /**
     * A helper function to get the operating system version number.
     *
     * @returns String, e.g. "15.3" or null if we're not in a version of the hybrid app
     * that exposes this information.
     */
    getOSVersion() {
        // Newer hybrid apps expose this data
        let osVersion = this.hybridInterface.capabilities?.hardwareInfo?.osVersion;
        if (!osVersion && typeof gHybridHardwareInfo != "undefined") {
            // Older hybrid apps expose this data
            osVersion = gHybridHardwareInfo.osVersion;
        }
        return osVersion;
    }

    /**
     * See https://github.com/All-Turtles/mmhmm-hybrid/issues/1823#issuecomment-2631984297
     * If a user clicks the "install" button but doesn't complete the process,
     * then tries again, some versions of macOS silently ignore the subsequent attempts.
     * To help them, we'll show some help content.
     */
    requiresInstallationInstructions() {
        if (!isMacOS()) {
            return false;
        }

        const state = this.virtualCameraState;
        if (state != VirtualCameraState.awaitingUserApproval) {
            // state will be notInstalled before the first attempt
            // and awaitingUserApproval after the first attempt
            return false;
        }

        const osVersion = this.getOSVersion();
        if (osVersion && osVersion <= "14.7.3" || osVersion >= "15.3") {
            return true;
        }

        return false;
    }

    /**
     * A helper function to check whether we're on macOS 15 or later.
     * Apple changed the location of system extension permissions in
     * Sequoia, so we vary our user instructions based on OS version.
     */
    isMacOSSequoiaOrLater() {
        if (isMacOS()) {
            const osVersion = this.getOSVersion();
            if (osVersion && osVersion >= "15.0") {
                return true;
            }
        }
        return false;
    }

    /**
     * Ask the native app to install the virtual camera.
     */
    installVirtualCamera() {
        const hybrid = this.hybridInterface;
        const state = this.virtualCameraState;
        if (state == VirtualCameraState.awaitingUserApproval) {
            // macOS has two subtly different states that we don't expose to the user
            console.log("Calling virtualCamera.authorize");
            hybrid.virtualCamera.authorize();
            this.installLoginItem();
        } else {
            console.log("Calling virtualCamera.install")
            hybrid.virtualCamera.install();
            this.installLoginItem();
        }
    }

    /**
     * Ask the native app to install the macOS login item. This gives us a persistent
     * helper process that's always running in the background, even if the app isn't running.
     */
    installLoginItem() {
        if (!isMacOS()) {
            return;
        }

        const hybrid = this.hybridInterface;
        const installer = hybrid.loginItemInstaller;
        if (!installer) {
            return;
        }

        if (installer.status != "notInstalled") {
            console.log("Skipping login item installation, state is", installer.status);
            return;
        }

        console.log("Calling loginItemInstaller.install");
        installer.install();
    }

    /**
     * Ask the native app to reboot the computer to complete the virtual camera installation.
     */
    requestReboot() {
        console.log("Calling gHybrid.requestReboot");
        this.hybridInterface.requestReboot();
    }

    /**
     * @returns {string} a UI string for the current state of the virtual camera
     */
    descriptionForCurrentState() {
        return this.descriptionForState(this.virtualCameraState);
    }

    /**
     * @param {VirtualCameraState} state the state to describe
     * @returns {string} a UI string for the given VirtualCameraState.
     */
    descriptionForState(state) {
        switch (state) {
            case VirtualCameraState.notInstallable:
                return LocalizedString("In order to install the Airtime virtual camera, the Airtime application must be moved to your computer's Applications folder.");
            case VirtualCameraState.notInstalled:
            case VirtualCameraState.awaitingUserApproval:
            case VirtualCameraState.installing:
            case VirtualCameraState.installed:
            case VirtualCameraState.uninstalling:
                return isMacOS() ?
                    LocalizedString("To use Airtime with Zoom and other apps you need to enable the Airtime virtual camera in System Settings.") :
                    LocalizedString("To use Airtime with Zoom and other apps you need to install the Airtime virtual camera.");
            case VirtualCameraState.needsUpdate:
                return LocalizedString("The Airtime virtual camera needs to be updated.");
            case VirtualCameraState.needsReboot:
                return LocalizedString("You need to reboot your computer to complete the installation of the Airtime virtual camera.");
            case VirtualCameraState.error:
                return LocalizedStringFormat("An unknown error occurred while installing the Airtime virtual camera. Please contact customer support.");
            default:
                console.error("Unexpected virtual camera state: " + state);
                return "";
        }
    }
}
