//
//  sidebar/looks_pane/idle/widget_bar.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/21/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * The UI for the application's collection of widgets
 * that sit below the stage and above the reactions list.
 */
class WidgetBar {

    #actions = {
        toggleLook: "toggle-look",
        showLooksWidget: "show-looks-widget",

        toggleNameTag: "toggle-name-tag",
        showNameTagWidget: "show-nametag-widget",

        toggleAway: "toggle-away",
        showAwayWidget: "show-away-widget",

        toggleEnhance: "toggle-enhance",
        showEnhanceWidget: "show-enhance-widget",

        toggleLUT: "toggle-lut",
        showLUTWidget: "show-lut-widget",

        toggleEdgeLight: "toggle-edge-light",
        showEdgeLightWidget: "show-edge-light-widget",
    };

    /**
     * The root DOM element for the widget bar
     * @type {HTMLElement}
     */
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
        const handlers = {};
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
            } else if (action.startsWith("toggle-")) {
                // Prevent double-clicks from registering as two single clicks
                if (!item.disabled) {
                    item.disabled = true;
                    setTimeout(() => {
                        item.disabled = false;
                    }, 400);
                }
            }
        };
    }

    /* Public API */

    set looksEnabled(enabled) {
        this.#setButtonActive(this.#getLookButton(), enabled);
    }

    get looksEnabled() {
        return this.#isButtonActive(this.#getLookButton());
    }

    set nametagEnabled(enabled) {
        this.#setButtonActive(this.#getNameTagButton(), enabled);
    }

    get nametagEnabled() {
        return this.#isButtonActive(this.#getNameTagButton());
    }

    set awayEnabled(enabled) {
        this.#setButtonActive(this.#getAwayButton(), enabled);
    }

    get awayEnabled() {
        return this.#isButtonActive(this.#getAwayButton());
    }

    set enhanceEnabled(enabled) {
        this.#setButtonActive(this.#getEnhanceButton(), enabled);
    }

    get enhanceEnabled() {
        return this.#isButtonActive(this.#getEnhanceButton());
    }

    set lutEnabled(enabled) {
        console.log('[WidgetBar] set lutEnabled:', enabled);
        this.#setButtonActive(this.#getLUTButton(), enabled);
    }

    get lutEnabled() {
        return this.#isButtonActive(this.#getLUTButton());
    }

    set edgeLightEnabled(enabled) {
        this.#setButtonActive(this.#getEdgeLightButton(), enabled);
    }

    get edgeLightEnabled() {
        return this.#isButtonActive(this.#getEdgeLightButton());
    }

    /* Data helpers */


    /* UI accessors */

    #getLookButton() {
        return this.#getButtonForAction(this.#actions.toggleLook);
    }

    #getNameTagButton() {
        return this.#getButtonForAction(this.#actions.toggleNameTag);
    }

    #getAwayButton() {
        return this.#getButtonForAction(this.#actions.toggleAway);
    }

    #getEnhanceButton() {
        return this.#getButtonForAction(this.#actions.toggleEnhance);
    }

    #getLUTButton() {
        return this.#getButtonForAction(this.#actions.toggleLUT);
    }

    #getEdgeLightButton() {
        return this.#getButtonForAction(this.#actions.toggleEdgeLight);
    }

    #getButtonForAction(action) {
        return this.#container.querySelector(`.widget-button:has([data-action="${action}"])`);
    }

    /* UI updates */

    #isButtonActive(button) {
        return button.classList.contains("active-widget");
    }

    #setButtonActive(button, active) {
        button.classList.toggle("active-widget", active);
    }

    /* UI construction */

    #createContainer() {
        const container = document.createElement("div");
        container.classList.add("grid", "grid-cols-2", "p4", "gap-3", "w-full");
        return container;
    }

    #render() {
        const buttons = [
            {
                icon: AppIcons.Looks(),
                title: LocalizedString("Looks"),
                primaryAction: this.#actions.toggleLook,
                secondaryAction: this.#actions.showLooksWidget,
            },
            {
                icon: AppIcons.NameTagOn(),
                title: LocalizedString("Name tag"),
                primaryAction: this.#actions.toggleNameTag,
                secondaryAction: this.#actions.showNameTagWidget,
            },
            {
                icon: AppIcons.CameraOff(),
                title: LocalizedString("Away"),
                primaryAction: this.#actions.toggleAway,
                secondaryAction: this.#actions.showAwayWidget,
                classes: "destructive"
            },
            {
                icon: AppIcons.Filters(),
                title: LocalizedString("Filters"),
                primaryAction: this.#actions.toggleEnhance,
                secondaryAction: this.#actions.showEnhanceWidget,
            },
            {
                icon: AppIcons.SettingsSliders(),
                title: LocalizedString("Color Grades"),
                primaryAction: this.#actions.toggleLUT,
                secondaryAction: this.#actions.showLUTWidget,
            },
            {
                icon: AppIcons.EdgeLight(),
                title: LocalizedString("Edge Light"),
                primaryAction: this.#actions.toggleEdgeLight,
                secondaryAction: this.#actions.showEdgeLightWidget,
            }
        ]

        this.#container.innerHTML = `
            ${buttons.map((button) => this.#renderWidgetButton(
                button.icon,
                button.title,
                button.primaryAction,
                button.secondaryAction,
                button.classes)
            ).join("")}
        `;
    }

    #renderWidgetButton(icon, title, toggleAction, openWidgetAction, classes = "") {
        return `
            <div class="widget-button overflow-hidden ${classes}">
                <button class="left overflow-hidden" data-action="${openWidgetAction}">
                    <div class="indicator overflow-hidden">
                        <div class="round">${icon.outerHTML}</div>
                        <span class="w-full text-ellipsis">${title}</span>
                    </div>
                </button>
                <button class="right" data-action="${toggleAction}">
                    ${AppIcons.ToggleSwitchOff().outerHTML}
                </button>
            </div>
        `;
    }

}
