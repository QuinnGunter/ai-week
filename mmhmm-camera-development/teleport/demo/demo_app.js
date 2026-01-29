//
//  demo/demo_app.js
//  mmhmm
//
//  Created by Seth Hitchings on 7/30/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Customizes behavior of the application when running the Airtime Camera
 * demo that's embedded in the marketing website. In this mode there is no
 * logged in user and we're not running inside the hybrid application, we're
 * in the browser.
 */
class DemoApp extends App {

    /**
     * These are postMessage events that the demo app will send to the parent window.
     */
    static statusEvents = {
        LOADED: "look.demo.loaded", /* The app is loaded and waiting for camera permission */
        READY: "look.demo.ready", /* The app is ready to use, camera permission granted */
        CAMERA_PERMISSION_DENIED: "look.demo.permission.denied",
        SAVE_DEMO_LOOK: "look.demo.use.look",
        DEMO_LOOK_SAVED: "look.demo.use.look.complete",
    }

    // These two conditions must be met for the app to be ready for user interaction
    #cameraPermissionGranted = false;
    #cameraAppReady = false;

    // On Safari we need to poll for camera permission changes
    #permissionCheckInterval = null;

    constructor() {
        super();

        // TODO customize analytics
    }

    initialize() {
        super.initialize();
        this.#sendStatusEvent(DemoApp.statusEvents.LOADED);
        this.#startCameraPermissionChecking();
    }

    async #startCameraPermissionChecking() {
        const status = await this.#checkCameraPermission();
        console.log(`Camera permission status is ${status.state}`);

        // Safari doesn't seem to support the "change" event, so we'll poll
        // https://developer.apple.com/forums/thread/757353
        if (!isSafari()) {
            status.addEventListener("change", () => this.#onCameraPermissionStatusChange(status));
        }  else {
            this.#permissionCheckInterval = setInterval(() => {
                this.#checkCameraPermission();
            }, 500);
        }
    }

    #clearPermissionCheckInterval() {
        if (this.#permissionCheckInterval) {
            clearInterval(this.#permissionCheckInterval);
            this.#permissionCheckInterval = null;
        }
    }

    async #checkCameraPermission() {
        return navigator.permissions.query({ name: "camera" }).then(status => {
            this.#onCameraPermissionStatusChange(status);
            return status;
        }).catch(err => {
            console.error("Error checking camera permission:", err);
            // Treat this as though the user denied permission
            this.#onCameraPermissionDenied();
        });
    }

    #onCameraPermissionStatusChange(status) {
        if (status.state === "granted") {
            this.#onCameraPermissionGranted();
            this.#clearPermissionCheckInterval();
        } else if (status.state === "denied") {
            this.#onCameraPermissionDenied();
            this.#clearPermissionCheckInterval();
        }

        // A Safari quirk: Safari gives the user three options:
        // "Allow" - we get a status change to "granted"
        // "Never for This Website" - we get a status change to "denied"
        // "Don't Allow" - we get no status change, the status remains "prompt"
        //     even though the user has made a decision
    }

    #onCameraPermissionGranted() {
        this.#cameraPermissionGranted = true;

        // The camera is ready; if the app is fully loaded, we can proceed
        if (this.#cameraAppReady) {
            this.#sendStatusEvent(DemoApp.statusEvents.READY);
            console.log("Camera permission granted, demo app is ready.");
        } else {
            console.log("Camera permission granted, waiting for demo app to be ready...");
        }

        LooksAnalytics.onDemoCameraPermissionGranted();
    }

    #onCameraPermissionDenied() {
        this.#cameraPermissionGranted = false;
        this.#sendStatusEvent(DemoApp.statusEvents.CAMERA_PERMISSION_DENIED);
        console.log("Camera permission denied");
        LooksAnalytics.onDemoCameraPermissionDenied();
    }

    onAppReady() {
        this.#cameraAppReady = true;

        // If the camera permission is already granted, we can proceed
        if (this.#cameraPermissionGranted) {
            this.#sendStatusEvent(DemoApp.statusEvents.READY);
        } else {
            console.log("Demo app loaded, waiting for camera permission...");
        }
    }

    onSaveDemoLook() {
        this.#sendStatusEvent(DemoApp.statusEvents.SAVE_DEMO_LOOK);
    }

    onDemoLookSaved(id) {
        this.#sendStatusEvent(DemoApp.statusEvents.DEMO_LOOK_SAVED, {
            id,
            mpId: Analytics.GetDistinctID(),
        });

        // If we're not on the website (i.e. if this is a standalone build we're testing),
        // do the redirect manually. Normally the website does this part.
        if (!RunningInIframe()) {
            const url = mmhmmAPI.defaultEndpoint().urlBuilder.getBuildALookURL(id);
            window.location.href = url;
        }
    }

    #sendStatusEvent(status, data = {}) {
        // TODO figure out the necessary origin value
        const message = { event: status };
        Object.assign(message, data);
        window.parent.postMessage(message);
    }

    get requiresAuthentication() {
        // The demo app does not require authentication
        return false;
    }

    get requiresDevicePermissions() {
        // Don't show the device permissions wall in the demo app,
        // permissions will be taken care of by the marketing website
        return false;
    }

    get userPreferredTheme() {
        return "light";
    }

    restoreAuthentication() {
        // No logged-in state for demo mode
        return null;
    }

    configureStageResolution(stage) {
        // Run at a low resolution to improve performance in the browser
        stage.resolution = Stage.Resolution.High;
    }

    setupHashChangeListener() {
        // Don't listen for call links, etc
        return;
    }

    async showReleaseNotesIfNeeded() {
        return;
    }
}

// Set a property so that other code can easily check if we're in the demo app
// Remove "camera-demo.html" once we've migrated to the new naming convention
Object.defineProperty(App, 'isDemo', {
    value: window.location.pathname.endsWith("camera_demo.html") || window.location.pathname.endsWith("camera-demo.html"),
    writable: false
});
