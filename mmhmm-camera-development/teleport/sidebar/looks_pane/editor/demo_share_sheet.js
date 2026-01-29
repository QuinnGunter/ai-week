//
//  looks/editor/demo_share_sheet.js
//  mmhmm
//
//  Created by Seth Hitchings on 8/11/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * A modal that allows a user to copy the URL of an Airtime Camera
 * demo look, e.g. https://www.airtime.com/camera?lookId=foo
 */
class ShareDemoLookSheet extends ActionSheet {

    #actions = {
        close: "close",
        copyLink: "copy-link"
    };

    #dataAttr = {
        link: "link"
    };

    #callLink = null;
    #container = null;

    constructor() {
        const container = document.createElement('div');
        super(null, container, 360, false, true);
        this.#container = container;
        this.#populateContainer(container);
    }

    /**
     * We start out with loading state while the link is being generated.
     * @param {HTMLDivElement} container
     */
    #populateContainer(container) {
        container.classList.add("flex", "flex-col", "items-center", "p5");
        container.innerHTML = `
            <div class="w-full flex justify-end">
                <button data-action="${this.#actions.close}" class="alt-icon-button">
                    ${AppIcons.Close().outerHTML}
                </button>
            </div>

            <div class="heading6">
                ${LocalizedString("Share your look")}</div>
            </div>

            <div class="mt-1 caption2">
                ${LocalizedString("Anyone with the link can get a copy of this look to try out and customize.")}
            </div>

            <div class="w-full flex items-center gap-4 mt-6 caption2">

                <div data-id="${this.#dataAttr.link}" style="user-select: all"
                    class="flex flex-grow items-center bg-tertiary bordered border-quaternary border-radius-1-5 text-ellipsis p2 h-7">
                </div>

                <button disabled
                    data-action=${this.#actions.copyLink}
                    class="secondary-button grid-cols-2-fit items-center gap-2 flex-no-shrink">
                    <span class="loader" style="width:16px;height:16px;"></span>
                    ${LocalizedString("Saving...")}
                </button>

            </div>
        `;

        const closeButton = container.querySelector(`[data-action="${this.#actions.close}"]`);
        closeButton.addEventListener("click", () => this.dismiss());
    }

    #getCopyButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.copyLink}"]`);
    }

    /**
     * When the shareable link is ready, this is called to update the UI and
     * enable to copy action.
     * @param {String} link
     */
    setShareLink(link) {
        this.#callLink = link;

        const linkContainer = this.#container.querySelector(`[data-id="${this.#dataAttr.link}"]`);
        linkContainer.innerText = link;

        const button = this.#getCopyButton();
        button.disabled = false;
        button.innerHTML = `
            ${AppIcons.LinkGenerating().outerHTML}
            <span>${LocalizedString("Copy link")}</span>
        `;
        button.addEventListener("click", () => this.#onCopyButtonClicked());
    }

    #onCopyButtonClicked() {
        navigator.clipboard.writeText(this.#callLink);

        const button = this.#getCopyButton();
        button.disabled = true;

        // Set the button width to prevent it from resizing when the text changes
        button.style.width = `${button.offsetWidth}px`;

        const text = button.querySelector("span");
        text.innerText = LocalizedString("Copied");

        setTimeout(() => {
            button.disabled = false;
            text.innerText = LocalizedString("Copy link");
            button.style.width = "";
        }, 2000);
    }

}
