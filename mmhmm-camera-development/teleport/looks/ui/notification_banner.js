//
//  looks/ui/notification_banner.js
//  mmhmm
//
//  Created by Seth Hitchings on December 15, 2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LooksNotificationBanner {

    #cls = {
        container: "looks-banner",
        banner: "banner",
    };

    #actions = {
        close: "close",
    };

    #container = null;

    constructor () {
        this.#createContainer();
        this.#addEventListeners();
    }

    /* Public API */

    displayVirtualCameraNotice() {
        this.#renderVirtualCameraNotice();
        this.#setHidden(false);
    }

    clear() {
        this.#container.replaceChildren();
        this.#setHidden(true);
    }

    /* Event handling */

    #addEventListeners() {
        const handlers = {
            [this.#actions.close]: () => this.#onClose(),
        };
        const handler = this.#createClickHandler(handlers);
        this.#container.addEventListener("click", handler);
    }

    #createClickHandler(handlers) {
        return (ev) => {
            const item = ev.target.closest("[data-action]");
            if (!item) {
                return;
            }

            const action = item.dataset.action;
            const handler = handlers[action];
            if (handler) {
                ev.stopPropagation();
                handler(item.dataset, ev);
            }
        };
    }

    #onClose() {
        this.clear();
    }

    /* UI accessors */

    getParentElement() {
        return document.getElementById("notifications-banner");
    }

    /* UI updates */

    #setHidden(hidden) {
        this.#container.classList.toggle("hidden", hidden);
    }

    /* UI construction */
    #createContainer() {
        const parent = this.getParentElement();
        let container = parent?.querySelector(`${`.${this.#cls.container}`}`);
        if (parent && !container) {
            // Our container doesn't exist yet; create it and attach it
            // to the notifications area
            container = document.createElement("div");
            container.classList.add(this.#cls.container, this.#cls.banner, "hidden");

            // We take precedence over other banners
            parent.prepend(container);
        }
        this.#container = container;
    }

    #renderVirtualCameraNotice() {
        const container = this.#container;
        container.innerHTML = `
            <div class="flex items-start justify-between gap-4">

                <div class="flex items-start gap-4 fill-primary">
                    <div class="pt-4 pl-4">
                        ${AppIcons.InfoCircle().outerHTML}
                    </div>

                    <span class="body-medium text-content-primary py-4">
                        ${LocalizedString("Video may look mirrored in other apps.")}
                        <a href="https://help.airtime.com/hc/en-us/articles/33869324680087" target="_blank">
                            ${LocalizedString("Learn more")}
                        </a>
                    </span>
                </div>

                <div class="p2">
                    <button
                        class="ghost_button"
                        aria-label="${LocalizedString("Close")}"
                        data-action="${this.#actions.close}">
                        ${AppIcons.Close().outerHTML}
                    </button>
                </div>
            </div>
        `;
    }


}
