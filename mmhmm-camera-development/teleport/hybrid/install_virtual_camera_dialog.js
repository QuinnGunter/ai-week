//
//  hybrid/install_virtual_camera_dialog.js
//  mmhmm
//
//  Created by Seth Hitchings on 2/4/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Apple doesn't always allow us to deep link to the portion of System Settings
 * where a user enables the virtual camera. This sheet shows instructions to
 * help users when we're in that situation.
 *
 * See https://github.com/All-Turtles/mmhmm-hybrid/issues/1823
 */
class InstallVirtualCameraDialog extends ActionSheet {
    constructor(virtualCamera, installCameraCallback) {
        const container = document.createElement("div");
        super(LocalizedString("Set up Airtime virtual camera"), container, null, true, false, [0, 0], "install_vcam_sheet");
        this.setAllowAutoDismiss();

        this.populateContainer(virtualCamera, installCameraCallback, container);
    }

    populateContainer(virtualCamera, installCameraCallback, container) {
        container.classList.add("column");

        const image = document.createElement("img");
        image.draggable = false;
        image.src = virtualCamera.isMacOSSequoiaOrLater() ?
            "assets/faq/install-camera-mac-sequoia.png":
            "assets/faq/install-camera-mac.png";
            container.appendChild(image);

        const body = document.createElement("div");
        body.classList.add("description");
        container.appendChild(body);

        if (virtualCamera.isMacOSSequoiaOrLater()) {
            body.innerText = LocalizedString("To finish installing the Airtime virtual camera from System Settings:")

            const list = document.createElement("ol");
            container.appendChild(list);

            const steps = [
                LocalizedString("Click the Open System Settings button below"),
                LocalizedString("Scroll down to Camera Extensions"),
                LocalizedString("Click the circled \"i\" icon"),
                LocalizedString("Enable the switch for Airtime"),
            ];

            steps.forEach(step => {
                const li = document.createElement("li");
                li.innerText = step;
                list.appendChild(li);
            });
        } else {
            body.innerText = LocalizedString("To finish installing the Airtime virtual camera from System Settings, click \"Allow\" in Privacy & Security.")
        }

        const learnMore = document.createElement("div");
        learnMore.classList.add("learn_more", "description");
        const message = BetterEnumerateLinkifiedString(
            LocalizedString("Need more help? Visit the <0>Help Center</0>."),
            ["https://help.airtime.com/hc/en-us/articles/14337147742871"]
        );
        learnMore.appendChild(message);
        container.appendChild(learnMore);

        const buttons = document.createElement("div");
        buttons.classList.add("buttons");
        container.appendChild(buttons);

        const done = document.createElement("button");
        done.classList.add("capsule", "secondary");
        done.innerText = LocalizedString("Done");
        done.addEventListener("click", _ => this.doneButtonClicked());
        buttons.appendChild(done);

        const settings = document.createElement("button");
        settings.classList.add("capsule");
        settings.innerText = LocalizedString("Open System Settings");
        settings.addEventListener("click", _ => this.openSystemSettingsButtonClicked(installCameraCallback));
        buttons.appendChild(settings);
    }

    doneButtonClicked() {
        this.dismiss();
    }

    openSystemSettingsButtonClicked(installCameraCallback) {
        installCameraCallback();
    }
}
