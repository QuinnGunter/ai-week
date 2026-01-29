//
//  sidebar/looks_pane/idle/widgets/enhance_widget.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/23/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * The idle panel widget for presenter enhancement filters.
 */
class EnhanceWidget {

    #cls = {
        widget: "looks-widget",
        helpCard: "help-card",
    };

    #attr = {
    }

    #dataAttr = {
        enhancement: "enhancement",
        complements: "complements",
        helpCard: "help-card",
    };

    #actions = {
        close: "close-widget",
        toggleOn: "toggle-enhance-on",
        toggleOff: "toggle-enhance-off",
        closeHelpCard: "close-help-card",
    };

    #defaultKeyDismissedHelpCard = "dismissedFiltersHelpCard";

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

    setEnhancementValue(value) {
        this.#updateEnhancementSlider(value);
    }

    setComplementsValue(value) {
        this.#updateComplementsSlider(value);
    }

    setEnhanceEnabled(enabled) {
        this.#setWidgetActive(enabled);
        this.#updateToggleButtonsState(enabled);
        this.#setSlidersEnabled(enabled);
    }

    /* UI accessors */

    #getOnButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.toggleOn}"]`);
    }

    #getOffButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.toggleOff}"]`);
    }

    #getSlider(name) {
        return this.#container.querySelector(`input[name="${name}"]`);
    }

    #getSliders() {
        return this.#container.querySelectorAll(`input[type="range"]`);
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

    #updateEnhancementSlider(value) {
        this.#updateSliderValue(this.#dataAttr.enhancement, value);
    }

    #updateComplementsSlider(value) {
        this.#updateSliderValue(this.#dataAttr.complements, value);
    }

    #updateSliderValue(name, value) {
        const input = this.#getSlider(name);

        input.value = value;
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const val = parseFloat(input.value);
        const percentage = ((val - min) / (max - min)) * 100;
        input.style.setProperty("--fillAmount", `${percentage.toFixed(1)}%`);
    }

    #setSlidersEnabled(enabled) {
        this.#getSliders().forEach((slider) => slider.disabled = !enabled);
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
                        <div class="round">${AppIcons.Filters().outerHTML}</div>
                    </div>
                    ${LocalizedString("Filters")}
                </div>
                ${this.#renderCloseButton()}
            </div>

            ${this.#renderOnOffToggle()}

            <div class="w-full flex flex-col gap-4 overflow-auto-y">
                ${this.#renderSliders()}
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

    #renderSliders() {
        return `
            <div class="w-full grid grid-cols-2-left-fit row-gap-6 col-gap-20 py-4">
                <label for="${this.#dataAttr.enhancement}" class="caption1 text-content-primary">${LocalizedString("Quality")}</label>
                ${this.#renderSlider(this.#dataAttr.enhancement)}

                <label for="${this.#dataAttr.complements}" class="caption1 text-content-primary">${LocalizedString("Color")}</label>
                ${this.#renderSlider(this.#dataAttr.complements)}
            </div>
        `;
    }

    #renderSlider(name) {
        return `
            <div class="slider_wrapper">
                <input
                    id="${name}"
                    name="${name}"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value="0.4"
                    class="slider"/>
            </div>
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
                    ${LocalizedString("Preview feature: Filters let you modify how you look in your video. The current options are a sneak peek at what's coming soon!")}
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
                <span class="keycap">F</span>
                ${LocalizedString("toggle filters")}
            </div>
        `;
    }
}
