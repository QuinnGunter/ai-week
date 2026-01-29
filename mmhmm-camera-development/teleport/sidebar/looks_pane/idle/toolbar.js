//
//  sidebar/looks_pane/idle/toolbar.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/21/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * The UI for the application's top toolbar, which contains
 * the account menu and virtual camera status.
 */
class ApplicationToolbar {

    #cls = {
        toolbar: "looks__toolbar",
    };

    #dataAttr = {
    };

    #actions = {
        showAccountMenu: "show-menu",
        showCameraMenu: "show-camera-menu",
        showVirtualCameraMenu: "show-virtual-camera-menu",
        share: "share",
        toggleSpeechReactions: "toggle-speech-reactions",
        toggleCallContext: "toggle-call-context",
    };

    // The root DOM element for this toolbar
    #container;

    constructor() {
        this.#container = this.#createContainer();
        this.#render();
        this.#updateVirtualCameraVisibility();
    }

    get el() {
        return this.#container;
    }

    /* Public API */

    set cameraEnabled(enabled) {
        const button = this.#getCameraMenuButton();
        button.classList.toggle("text-destructive", !enabled);
        button.classList.toggle("icon_toggle_button_active", enabled);
    }

    setVirtualCameraStatus(status, clients) {
        this.#updateVirtualCameraStatus(status, clients);
    }

    set speechReactionsEnabled(enabled) {
        const button = this.#getSpeechReactionsButton();
        if (!button) return;
        button.classList.toggle("icon_toggle_button_active", enabled);
        button.setAttribute("aria-pressed", enabled ? "true" : "false");
    }

    set speechReactionsLoading(loading) {
        const button = this.#getSpeechReactionsButton();
        if (!button) return;
        button.classList.toggle("loading", loading);
    }

    /**
     * Check if call context (system audio) is available via native bridge
     */
    get callContextAvailable() {
        return typeof SystemAudioService !== "undefined"
            && SystemAudioService.shared?.isAvailable === true;
    }

    set callContextEnabled(enabled) {
        const button = this.#getCallContextButton();
        if (!button) return;
        button.classList.toggle("icon_toggle_button_active", enabled);
        button.setAttribute("aria-pressed", enabled ? "true" : "false");
    }

    /**
     * Update the visibility of the call context button based on native bridge availability
     */
    updateCallContextVisibility() {
        const button = this.#getCallContextButton();
        if (!button) return;

        if (this.callContextAvailable) {
            button.classList.remove("hidden");
        } else {
            button.classList.add("hidden");
        }
    }

    /* UI accessors */

    #getCameraMenuButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.showCameraMenu}"]`);
    }

    #getVirtualCameraMenuButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.showVirtualCameraMenu}"]`);
    }

    #getSpeechReactionsButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.toggleSpeechReactions}"]`);
    }

    #getCallContextButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.toggleCallContext}"]`);
    }

    /* UI updates */

    #updateVirtualCameraVisibility() {
        const button = this.#getVirtualCameraMenuButton();

        // Hide this for versions of the hybrid app that
        // still show the native status in the titlebar
        try {
            if (gLocalDeployment !== true && window.hasVirtualCameraToolbarButton !== false) {
                button.classList.add("hidden");
            }
        } catch (err) {
            console.error("Error checking for virtual camera toolbar button visibility:", err);
        }
    }

    #updateVirtualCameraStatus(status, clients) {
        const button = this.#getVirtualCameraMenuButton();
        const statusIcon = button.querySelector("svg");
        const statusText = button.querySelector("span");

        switch (status) {
            case "connected":
                button.dataset.state = "connected";
                statusIcon.replaceWith(AppIcons.VCamConnected())
                statusText.textContent = this.#getConnectedStateMessage(clients);
                // TODO show what we're connected to
                break;
            case "disconnected":
                button.dataset.state = "disconnected";
                statusIcon.replaceWith(AppIcons.VCamDisconnected());
                statusText.textContent = LocalizedString("disconnected");
                break;
            default:
                button.dataset.state = "error";
                statusIcon.replaceWith(AppIcons.VCamDisconnected());
                statusText.textContent = LocalizedString("not available");
                break;
        }
    }

    #getConnectedStateMessage(clients) {
        if (clients && clients.length == 1) {
            return clients[0];
        }
        return LocalizedString("connected");
    }

    /* UI construction */

    #createContainer() {
        const container = document.createElement("div");
        container.classList.add(this.#cls.toolbar);
        return container;
    }

    #render() {
        const container = this.#container;
        container.innerHTML = `
            <div class="w-full flex items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    ${this.#renderAccountMenu()}
                    ${this.#renderCameraMenu()}
                    ${this.#renderSpeechReactionsToggle()}
                    ${this.#renderCallContextToggle()}
                </div>
                <div class="flex items-center gap-4 overflow-hidden">
                    ${this.#renderVirtualCameraStatus()}
                    ${this.#renderShareButton()}
                </div>
            </div>
        `;

        // Update call context button visibility based on native bridge availability
        this.updateCallContextVisibility();
    }

    #renderAccountMenu() {
        return `
            <button
                class="icon-button ghost_button"
                data-id="show-menu"
                data-action="${this.#actions.showAccountMenu}">
                ${AppIcons.Hamburger().outerHTML}
            </button>`;
    }

    #renderCameraMenu() {
        return `
            <div class="flex items-center">
                <button
                    class="ghost_button icon_toggle_button icon_toggle_button_active"
                    data-id="camera" data-action="${this.#actions.showCameraMenu}">

                    <div>
                        <span>${AppIcons.CameraOn().outerHTML}</span>
                        <span>${AppIcons.CameraOff().outerHTML}</span>
                    </div>
                </button>
            </div>
        `;
    }

    #renderShareButton() {
        return `
            <button
                class="ghost_button"
                aria-label="${LocalizedString("Share")}"
                data-action="${this.#actions.share}">
                ${AppIcons.ShareArrow().outerHTML}
            </button>
        `;
    }

    #renderVirtualCameraStatus() {
        return `
            <button
                class="ghost_button gap-2 overflow-hidden"
                aria-label="${LocalizedString("Virtual camera status")}"
                data-action="${this.#actions.showVirtualCameraMenu}">
                ${AppIcons.VCamDisconnected().outerHTML}
                <span class="caption2 text-ellipsis">disconnected</span>
                ${AppIcons.CaretDown().outerHTML}
            </button>
        `;
    }

    #renderSpeechReactionsToggle() {
        return `
            <div class="flex items-center">
                <button
                    class="ghost_button icon_toggle_button speech-reactions-toggle"
                    data-id="speech-reactions"
                    data-action="${this.#actions.toggleSpeechReactions}"
                    data-tippy-content="${LocalizedString("Speech reactions")}"
                    aria-label="${LocalizedString("Toggle speech-triggered reactions")}"
                    aria-pressed="false">
                    <div>
                        <span class="speech-mic-on">${AppIcons.Microphone ? AppIcons.Microphone().outerHTML : this.#renderMicrophoneIcon()}</span>
                        <span class="speech-mic-off">${AppIcons.MicrophoneMuted ? AppIcons.MicrophoneMuted().outerHTML : this.#renderMicrophoneMutedIcon()}</span>
                    </div>
                </button>
            </div>
        `;
    }

    #renderMicrophoneIcon() {
        return `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 1C8.34315 1 7 2.34315 7 4V10C7 11.6569 8.34315 13 10 13C11.6569 13 13 11.6569 13 10V4C13 2.34315 11.6569 1 10 1Z" fill="currentColor"/>
                <path d="M5 8V10C5 12.7614 7.23858 15 10 15C12.7614 15 15 12.7614 15 10V8H17V10C17 13.5265 14.3923 16.4439 11 16.9291V19H9V16.9291C5.60771 16.4439 3 13.5265 3 10V8H5Z" fill="currentColor"/>
            </svg>
        `;
    }

    #renderMicrophoneMutedIcon() {
        return `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 1C8.34315 1 7 2.34315 7 4V10C7 11.6569 8.34315 13 10 13C11.6569 13 13 11.6569 13 10V4C13 2.34315 11.6569 1 10 1Z" fill="currentColor" opacity="0.5"/>
                <path d="M5 8V10C5 12.7614 7.23858 15 10 15C12.7614 15 15 12.7614 15 10V8H17V10C17 13.5265 14.3923 16.4439 11 16.9291V19H9V16.9291C5.60771 16.4439 3 13.5265 3 10V8H5Z" fill="currentColor" opacity="0.5"/>
                <line x1="3" y1="17" x2="17" y2="3" stroke="currentColor" stroke-width="2"/>
            </svg>
        `;
    }

    /**
     * Render the Call Context toggle button.
     * This button is hidden by default and shown only when the native bridge
     * supports system audio capture.
     */
    #renderCallContextToggle() {
        return `
            <div class="flex items-center">
                <button
                    class="ghost_button icon_toggle_button call-context-toggle hidden"
                    data-id="call-context"
                    data-action="${this.#actions.toggleCallContext}"
                    data-tippy-content="${LocalizedString("Call context - listen to call audio for smarter GIF suggestions")}"
                    aria-label="${LocalizedString("Toggle call context for smarter reactions")}"
                    aria-pressed="false">
                    <div>
                        <span class="call-context-on">${this.#renderHeadphonesIcon()}</span>
                        <span class="call-context-off">${this.#renderHeadphonesOffIcon()}</span>
                    </div>
                </button>
            </div>
        `;
    }

    #renderHeadphonesIcon() {
        return `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 12V10C4 6.68629 6.68629 4 10 4C13.3137 4 16 6.68629 16 10V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <rect x="2" y="11" width="4" height="6" rx="1" fill="currentColor"/>
                <rect x="14" y="11" width="4" height="6" rx="1" fill="currentColor"/>
            </svg>
        `;
    }

    #renderHeadphonesOffIcon() {
        return `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 12V10C4 6.68629 6.68629 4 10 4C13.3137 4 16 6.68629 16 10V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
                <rect x="2" y="11" width="4" height="6" rx="1" fill="currentColor" opacity="0.5"/>
                <rect x="14" y="11" width="4" height="6" rx="1" fill="currentColor" opacity="0.5"/>
                <line x1="3" y1="17" x2="17" y2="3" stroke="currentColor" stroke-width="2"/>
            </svg>
        `;
    }

}
