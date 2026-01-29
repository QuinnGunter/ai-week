//
//  sidebar/looks_pane/coachmarks.js
//  mmhmm
//
//  Created by Seth Hitchings on 8/4/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LooksCoachmarks {

    static TrackingKeys = {
        VirtualCameraMenu: "showedLooksCoachmark",
        CreateFirstLook: "showedCreateFirstLookCoachmark",
        ReplaceLookLogo: "showedReplaceLookLogoCoachmark",
        SystemVideoEffects: "showedSystemVideoEffectsCoachmark",
    }

    static hasShownCoachmark(key) {
        return SharedUserDefaults.getValueForKey(key) === true;
    }

    static setHasShownCoachmark(key) {
        SharedUserDefaults.setValueForKey(true, key);
    }

    static displayCoachmark(container) {
        document.body.appendChild(container);
    }

    static removeCoachmark(container) {
        if (container?.remove) {
            // Manually placed content - this is a DOM element
            container.remove();
        } else if (container?.destroy) {
            // Tippy content - this is a Tippy instance
            container.destroy();
        }
    }

    static buildVirtualCameraMenuCoachmark() {
        const message = isMacOS()
            ? LocalizedString(
                  "Click on the connection icon in the top right to learn how to use the Airtime virtual camera."
              )
            : LocalizedString(
                  "Click on the connection icon in the top left to learn how to use the Airtime virtual camera."
              );

        const position = isMacOS() ? "top-right" : "top-left";

        return LooksCoachmarks.buildCoachmark(
            LocalizedString("Use Airtime with Zoom and other platforms"),
            message,
            position
        );
    }

    static buildSystemVideoEffectsCoachmark(showSystemUICallback, dontShowAgainCallback) {
        const title = LocalizedString("Video effects enabled");
        const message = LocalizedString("You have macOS video effects enabled, which may interfere with Airtime. Learn more in the <0>Help Center</0>.");
        const linkifiedMessage = BetterEnumerateLinkifiedString(message,
            ["https://help.airtime.com/hc/en-us/articles/35745674120215"]
        );

        const dontShowAgainButton = document.createElement("button");
        dontShowAgainButton.classList.add("coachmark-prev-button");
        dontShowAgainButton.innerText = LocalizedString("Don't show again");

        const settingsButton = document.createElement("button");
        settingsButton.classList.add("coachmark-prev-button");
        settingsButton.innerText = LocalizedString("Settings");

        const coachmark = LooksCoachmarks.buildCoachmark(title, linkifiedMessage, null, [dontShowAgainButton, settingsButton]);
        LooksCoachmarks.attachCloseHandlerToButton(settingsButton, coachmark, showSystemUICallback);
        LooksCoachmarks.attachCloseHandlerToButton(dontShowAgainButton, coachmark, dontShowAgainCallback);
        return coachmark;
    }

    static showCreateFirstLookCoachmark(target) {
        // We use a Tippy instance for this coachmark so that we get positioning for free

        const message = LocalizedString("We added your first look to set the scene. Find more and customize them by clicking on the Looks button.");
        const content = LooksCoachmarks.buildTippyCoachmark(
            LocalizedString("Welcome to Airtime Camera"),
            message
        );

        const props = {
            content,
            placement: "bottom",
            theme: "coachmark",
            interactive: true,
            appendTo: document.body,
            trigger: "manual",
        };

        const instance = tippy(target, props);
        LooksCoachmarks.attachCloseHandler(content, instance);
        instance.show();
        return instance;
    }

    static buildCoachmark(title, message, position, actionButtons) {
        const container = document.createElement("div");
        container.innerHTML = `
            <div class="coachmarks-tour-container top">
                ${position ? `<div class="coachmarks-arrow ${position}"></div>` : ""}
                <div class="coachmark full">
                    <div class="coachmark-content">
                        <p class="title">
                            ${title}
                        </p>
                        <p class="coachmark-message"></p>
                    </div>
                    <div class="coachmark-nav">
                        <div class="coachmark-btns">
                            <button class="coachmark-next-button">
                                ${LocalizedString("OK")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const messageContainer = container.querySelector(".coachmark-message");
        if (IsKindOf(message, String)) {
            messageContainer.innerText = message;
        } else {
            messageContainer.appendChild(message);
        }

        LooksCoachmarks.attachCloseHandler(container, container);

        if (actionButtons) {
            const btnContainer = container.querySelector(".coachmark-btns");
            btnContainer.classList.add("justify-between");
            const child = btnContainer.firstChild;
            actionButtons.forEach(button => btnContainer.insertBefore(button, child));
        }

        return container;
    }

    static buildTippyCoachmark(title, message) {
        const container = document.createElement("div");
        container.classList.add("coachmark", "full");
        container.innerHTML = `
            <div class="coachmark-content">
                ${title ? `<p class="title">
                    ${title}
                </p>` : ""}
                <p>
                    ${message}
                </p>
            </div>
            <div class="coachmark-nav">
                <div class="coachmark-btns">
                    <button class="coachmark-next-button">
                        ${LocalizedString("OK")}
                    </button>
                </div>
            </div>
        `;
        return container;
    }

    static attachCloseHandler(container, coachmark) {
        const closeButton = container.querySelector("button");
        return LooksCoachmarks.attachCloseHandlerToButton(closeButton, coachmark);
    }

    static attachCloseHandlerToButton(button, coachmark, callback) {
        button.addEventListener("click", () => {
            LooksCoachmarks.removeCoachmark(coachmark);
            if (callback) {
                callback();
            }
        });
    }

}
