//
//  sidebar/looks_pane/idle/widgets/name_tag_widget.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/22/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * The idle panel widget for updating name tags.
 */
class NameTagWidget {

    #cls = {
        widget: "looks-widget",
        helpCard: "help-card",
    };

    #attr = {
        nameBadgeTitle: "name-badge-title",
        nameBadgeSubtitle: "name-badge-subtitle",
        helpCard: "help-card",
    }

    #dataAttr = {
    };

    #actions = {
        close: "close-widget",
        toggleOn: "toggle-nametag-on",
        toggleOff: "toggle-nametag-off",
        closeHelpCard: "close-help-card",
    };

    #defaultKeyDismissedHelpCard = "dismissedNametagHelpCard";

    // The root DOM element for this widget
    #container;

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

    setNametagEnabled(enabled) {
        this.#updateToggleButtonsState(enabled);
        this.#setWidgetActive(enabled);
    }

    /**
     * @param {Media.NameBadge} media
     */
    setNametag(media) {
        this.#updateTitleInput(media?.titleLabel.string);
        this.#updateSubtitleInput(media?.subtitleLabel.string);
    }

    /* UI accessors */

    #getOnButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.toggleOn}"]`);
    }

    #getOffButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.toggleOff}"]`);
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

    #updateTitleInput(title) {
        this.#updateInputValue(this.#attr.nameBadgeTitle, title);
    }

    #updateSubtitleInput(subtitle) {
        this.#updateInputValue(this.#attr.nameBadgeSubtitle, subtitle);
    }

    #updateInputValue(name, value) {
        const input = this.#container.querySelector(`input[name="${name}"]`);
        input.value = value ?? "";
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
                        <div class="round">${AppIcons.NameTagOn().outerHTML}</div>
                    </div>
                    ${LocalizedString("Name tag")}
                </div>
                ${this.#renderCloseButton()}
            </div>

            ${this.#renderOnOffToggle()}

            <div class="w-full flex flex-col gap-4 overflow-auto-y">
                ${this.#renderTextInputs()}
                ${this.#renderHelpCard()}
                ${this.#renderKeyboardShortcutHint()}
            </div>
        `;
    }

    #renderOnOffToggle() {
        return `
            <div class="toggle-button w-full text-content-primary gap-2">
                <button data-action="${this.#actions.toggleOn}" class="">${LocalizedString("On")}</button>
                <button data-action="${this.#actions.toggleOff}" class="">${LocalizedString("Off")}</button>
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

    #renderTextInputs() {
        return `
            <div class="w-full flex flex-col gap-2">
                <span class="text-content-primary">${LocalizedString("Text")}</span>
                ${this.#renderTextInput(this.#attr.nameBadgeTitle, "Big text")}
                ${this.#renderTextInput(this.#attr.nameBadgeSubtitle, "Small text")}
            </div>
        `;
    }

    #renderTextInput(name, label) {
        return `
            <input
                type="text"
                name="${name}"
                aria-label="${label}"
                class="w-full caption1"
                autocomplete="off"
                spellcheck="false" />
        `;
    }

    #renderHelpCard() {
        if (this.#hasDismissedHelpCard()) {
            return "";
        }
        return `
            <div data-id="${this.#dataAttr.helpCard}"
                class="${this.#cls.helpCard} text-content-tertiary body-small">

                <span class="p-1">
                    ${LocalizedString("Name tags let you add text to your video. Each look has a matching name tag style that can be customized by editing the look.")}
                </span>

                <button class="ghost_button" data-action="${this.#actions.closeHelpCard}">
                    ${AppIcons.Close().outerHTML}
                </button>
        </div>
        `;
    }

    #renderKeyboardShortcutHint() {
        return `
            <div class="w-full flex justify-end items-center gap-2 text-content-secondary caption1">
                <span class="keycap">N</span>
                ${LocalizedString("toggle name tag")}
            </div>
        `;
    }

}
