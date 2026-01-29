//
//  sidebar/looks_pane/idle/widgets/looks_widget.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/22/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * The idle panel widget for selecting a recent look.
 */
class LooksWidget {

    #cls = {
        widget: "looks-widget",
        helpCard: "help-card",
    };

    #dataAttr = {
        recentLooks: "recent-looks",

        looksToolbarTitle: "looks-toolbar-title",
        looksToolbarEdit: "looks-toolbar-edit",
        looksToolbarPin: "looks-toolbar-pin",
        looksToolbarDelete: "looks-toolbar-delete",
        helpCard: "help-card",
    };

    #actions = {
        editLook: "edit-look",
        pinLook: "pin-look",
        unpinLook: "unpin-look",
        deleteLook: "delete-look",
        close: "close-widget",
        selectItem: "select-item",
        createBlankLook: "create-blank-look",
        showLooksCatalog: "show-looks-catalog",
        toggleOn: "toggle-look-on",
        toggleOff: "toggle-look-off",
        closeHelpCard: "close-help-card",
    };

    #dataTypes = {
        look: "look"
    };

    #defaultKeyDismissedHelpCard = "dismissedLooksHelpCard";

    // The root DOM element for this toolbar
    #container;

    #noLookLabel = LocalizedString("No look");

    /**
     * @type {Promise<void>|null}
     */
    #looksChangedPromise = null;

    /**
     * @type {Slide.Look|null}
     */
    #selectedLook = null;

    constructor() {
        this.#container = this.#createContainer();
        this.#render();
        this.#addEventListeners();
    }

    get el() {
        return this.#container;
    }

    /* Event handling */

    #addEventListeners() {
        const handlers = {
            [this.#actions.close]: () => this.hide(),
            [this.#actions.closeHelpCard]: () => this.#onCloseHelpCard(),
        };
        const handler = this.#createClickHandler(handlers);
        this.#container.addEventListener("click", handler);
    }

    #createClickHandler(handlers) {
        return (ev) => {
            const item = ev.target.closest("[data-action]");
            if (!item) return;

            const action = item.dataset.action;
            const handler = handlers[action];

            if (handler) {
                ev.stopPropagation();
                handler(item.dataset, ev);
            }
        };
    }

    #onCloseHelpCard() {
        const helpCard = this.#getHelpCard();
        helpCard.remove();

        SharedUserDefaults.setValueForKey(true, this.#defaultKeyDismissedHelpCard);
    }

    #hasDismissedHelpCard() {
        return SharedUserDefaults.getValueForKey(this.#defaultKeyDismissedHelpCard, false) === true;
    }

    /* Public API */

    isVisible() {
        return !this.#container.classList.contains("hidden");
    }

    show() {
        this.#container.classList.remove("hidden");
    }

    hide() {
        this.#container.classList.add("hidden");
    }

    set looksEnabled(enabled) {
        this.#updateButtonStates(enabled);
        this.#updateToggleButtonsState(enabled);
        this.#setWidgetActive(enabled);
    }

    async looksChanged(slides) {
        // Make sure we serialize multiple requests to rerender the list
        if (this.#looksChangedPromise != null) {
            await this.#looksChangedPromise;
        }
        this.#looksChangedPromise = this.#updateRecentLookButtons(slides);
        await this.#looksChangedPromise;
        this.#looksChangedPromise = null;
        this.#updatePinButtonPinnedState();
    }

    selectLook(look) {
        this.#selectedLook = look;
        this.#updateSelectedLookTitle(look.title);
        this.#updateRecentLookSelection(look);
    }

    unselectLook() {
        this.#selectedLook = null;
        this.#updateSelectedLookTitle(this.#noLookLabel);
        this.#updateRecentLookSelection();
        this.looksEnabled = false;
    }

    updateTitle(look) {
        this.#updateLookTitle(look);
    }

    updateLookThumbnail(look, img = null) {
        this.#updateRecentLookThumbnail(look, img);
    }

    /* Data helpers */


    /* UI accessors */

    #getLooksToolbarTitle() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.looksToolbarTitle}"]`);
    }

    #getDeleteLookButton() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.looksToolbarDelete}"]`);
    }

    #getEditLookButton() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.looksToolbarEdit}"]`);
    }

    #getPinLookButton() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.looksToolbarPin}"]`);
    }

    #getOnButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.toggleOn}"]`);
    }

    #getOffButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.toggleOff}"]`);
    }

    #getRecentLooksContainer() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.recentLooks}"]`);
    }

    #getHelpCard() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.helpCard}"]`);
    }

    /* UI updates */

    #setWidgetActive(active) {
        this.#container.classList.toggle("active-widget", active);
    }

    #updateToggleButtonsState(enabled) {
        this.#getOnButton().setAttribute("aria-selected", enabled ? "true" : "false");
        this.#getOffButton().setAttribute("aria-selected", !enabled ? "true" : "false");
    }

    #updateButtonStates(enabled) {
        this.#updateEditButtonState(enabled);
        this.#updateDeleteButtonState(enabled);
        this.#updatePinButtonState(enabled);
        this.#updatePinButtonPinnedState();
    }

    #updateEditButtonState(enabled) {
        const button = this.#getEditLookButton();
        button.disabled = !enabled;
    }

    #updateDeleteButtonState(enabled) {
        const button = this.#getDeleteLookButton();
        button.disabled = !enabled;
    }

    #updatePinButtonState(enabled) {
        const button = this.#getPinLookButton();
        button.disabled = !enabled;
    }

    #updatePinButtonPinnedState() {
        const button = this.#getPinLookButton();
        const pinned = this.#selectedLook?.pinned === true;
        if (pinned) {
            button.dataset.action = this.#actions.unpinLook;
            button.innerHTML = AppIcons.FilledPin().outerHTML;
            button._tippy?.setContent(LocalizedString("Unpin selected look"));
        } else {
            button.dataset.action = this.#actions.pinLook;
            button.innerHTML = AppIcons.EmptyPin().outerHTML;
            button._tippy?.setContent(LocalizedString("Pin selected look"));
        }
    }

    #updateLookTitle(look) {
        if (this.#selectedLook?.identifier === look.identifier) {
            this.#updateSelectedLookTitle(look.title);
        }
    }

    #updateSelectedLookTitle(title) {
        this.#getLooksToolbarTitle().innerText = title || String.fromCharCode(160);
    }

    async #updateRecentLookThumbnail(slide, img = null) {
        const button = this.#container.querySelector(`.recent-look-button[data-id="${slide.identifier}"]`);
        if (!button) {
            return;
        }
        if (!img) {
            try {
                img = await slide.thumbnail();
            } catch (err) {
                console.error("Error loading look thumbnail", err);
                return;
            }
        }
        if (img) {
            img.draggable = false;
            button.replaceChildren(img);
        }
    }

    #updateRecentLookButtons(looks) {
        // Re-use buttons that already exist
        // Add those that don't exist yet
        const buttons = Array.from(this.#container.querySelectorAll(".recent-look-button"));
        const buttonIds = new Set(buttons.map((button) => button.dataset.id));

        // Remove all buttons. Later we'll re-add the ones we want to keep
        buttons.forEach(button => button.remove());

        // Make new buttons as needed
        const toAdd = looks.filter(look => !buttonIds.has(look.identifier));
        toAdd.forEach((look) => {
            buttons.push(this.#renderRecentLookButton(look));
        });

        // Re-add the updated list of buttons
        const container = this.#getRecentLooksContainer();
        LooksUtils.sortSlidesList(looks).forEach((look) => {
            const button = buttons.find((btn) => btn.dataset.id === look.identifier);
            container.appendChild(button);
        });
    }

    /* UI construction */

    #createContainer() {
        const container = document.createElement("div");
        container.classList.add(this.#cls.widget, "hidden");
        return container;
    }

    #render() {
        const container = this.#container;
        container.innerHTML = `
            <div class="w-full h-4-5 flex items-center gap-4 justify-between fill-primary">
                <div class="flex items-center gap-4 overflow-hidden text-content-primary body2">
                    <div class="indicator">
                        <div class="round">${AppIcons.Looks().outerHTML}</div>
                    </div>
                    ${LocalizedString("Look")}
                    <div data-id="${this.#dataAttr.looksToolbarTitle}" class="text-ellipsis text-content-tertiary">
                        ${this.#noLookLabel}
                    </div>
                </div>
                <div class="items-center gap-4">
                    ${this.#renderCloseButton()}
                </div>
            </div>

            ${this.#renderToolbar()}

            <div class="w-full flex flex-col gap-4 overflow-auto-y">
                ${this.#renderRecentLooks()}
                ${this.#renderHelpCard()}
            </div>

            ${this.#renderMoreLooksButton()}
        `;

        tippy(container.querySelectorAll("[data-tippy-content]"));
    }

    #renderOnOffToggle() {
        return `
            <div class="toggle-button text-content-primary gap-2">
                <button data-action="${this.#actions.toggleOn}" class="">${LocalizedString("On")}</button>
                <button data-action="${this.#actions.toggleOff}" class="">${LocalizedString("Off")}</button>
            </div>
        `;
    }

    #renderToolbar() {
        return `
            <div class="w-full flex items-center justify-between">
                ${this.#renderOnOffToggle()}
                <div class="flex gap-4 items-center">
                    ${this.#renderEditButton()}
                    ${this.#renderPinButton()}
                    ${this.#renderDeleteButton()}
                </div>
            </div>
        `;
    }

    #renderEditButton() {
        return `
            <button
                disabled
                data-id="${this.#dataAttr.looksToolbarEdit}"
                data-action="${this.#actions.editLook}"
                aria-label="${LocalizedString("Edit look")}"
                class="ghost_button">
                <div class="flex items-center gap-2">
                    <span class="body2 nowrap text-action-primary">${LocalizedString("Edit")}</span>
                </div>
            </button>
        `;
    }

    #renderPinButton() {
        return `
            <button
                disabled
                data-id="${this.#dataAttr.looksToolbarPin}"
                data-action="${this.#actions.pinLook}"
                aria-label="${LocalizedString("Pin look")}"
                data-tippy-content="${LocalizedString("Pin look")}"
                class="ghost_button">
                ${AppIcons.FilledPin().outerHTML}
            </button>
        `;
    }

    #renderDeleteButton() {
        return `
            <button
                disabled
                data-id="${this.#dataAttr.looksToolbarDelete}"
                data-action="${this.#actions.deleteLook}"
                aria-label="${LocalizedString("Delete look")}"
                data-tippy-content="${LocalizedString("Delete look")}"
                class="ghost_button">
                ${AppIcons.TrashCan().outerHTML}
            </button>
        `;
    }

    #renderRecentLooks() {
        return `
            <div data-id="${this.#dataAttr.recentLooks}" class="w-full grid gap-4 p-1">
            </div>
        `;
    }

    #renderCloseButton() {
        return `
            <button
                class="icon-button"
                aria-label="${LocalizedString("Close")}"
                data-action="${this.#actions.close}">
                ${AppIcons.Close().outerHTML}
            </button>`;
    }

    #renderRecentLookButton(look) {
        const button = document.createElement("button");
        button.classList.add("recent-look-button");
        button.dataset.action = this.#actions.selectItem;
        button.dataset.type = this.#dataTypes.look;
        button.dataset.id = look.identifier;

        const selected = this.#selectedLook?.identifier == look.identifier;
        button.setAttribute("aria-selected", selected);

        look.thumbnail().then((img) => {
            // Make sure the button's look didn't change while we were loading the thumbnail
            if (button.dataset.id == look.identifier) {
                img.draggable = false;
                button.replaceChildren(img);
            }
        }).catch((err) => {
            console.error("Error loading look thumbnail", err);
            if (button.dataset.id == look.identifier) {
                button.replaceChildren();
            }
        });

        return button;
    }

    #renderHelpCard() {
        if (this.#hasDismissedHelpCard()) {
            return "";
        }
        return `
            <div data-id="${this.#dataAttr.helpCard}"
                class="${this.#cls.helpCard} text-content-tertiary body-small">

                <span class="p-1">
                    ${LocalizedString("Looks let you customize your video so you can show up just the way you want. Browse the catalog to find a starting point, then customize it to make it your own.")}
                </span>

                <button class="ghost_button" data-action="${this.#actions.closeHelpCard}">
                    ${AppIcons.Close().outerHTML}
                </button>
        </div>
        `;
    }

    #renderMoreLooksButton() {
        return `
            <button
                class="capsule secondary w-full justify-start overflow-hidden"
                aria-label="${LocalizedString("Get more looks")}"
                data-action="${this.#actions.showLooksCatalog}">
                ${AppIcons.LooksCatalog().outerHTML}
                <span class="text-ellipsis">${LocalizedString("Get looks")}</span>
            </button>
        `;
    }

    /* Selection */

    #updateRecentLookSelection(slide) {
        this.#selectRecentLook(slide ? slide.identifier : null);
    }

    #selectRecentLook(id) {
        const buttons = this.#container.querySelectorAll(".recent-look-button");
        buttons.forEach((button) => {
            if (button.dataset.id === id) {
                button.setAttribute("aria-selected", "true");
            } else {
                button.removeAttribute("aria-selected");
            }
        });
    }

}

