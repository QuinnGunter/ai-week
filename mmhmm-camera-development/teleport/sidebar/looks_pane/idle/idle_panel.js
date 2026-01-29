//
//  sidebar/looks_pane/idle/idle_panel.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/21/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * The UI for the default state of the Camera application,
 * which shows core controls and the user's list of visuals.
 */
class IdlePanel {

    static id = "looks-idle-panel";

    #cls = {
        panel: "looks__panel",
    };

    #dataAttr = {
        toolbar: "toolbar",
        content: "content",
        widgetBar: "widget-bar",
        reactionsPanel: "reactions-panel",
    };

    #actions = {

    };

    // Our subcomponents
    #toolbar;
    #widgetBar;
    #reactionsPanel;

    // The root DOM element for this panel
    #container;

    constructor() {
        this.#container = this.#createContainer();
        this.#render();
        this.#addEventListeners();
    }

    get el() {
        return this.#container;
    }

    /* Public API - UI subcomponents */

    setToolbar(toolbar) {
        this.#toolbar = toolbar;
        this.#getToolbarContainer().replaceChildren(toolbar.el);
    }

    setWidgetBar(widgetBar) {
        this.#widgetBar = widgetBar;
        this.#getWidgetBarContainer().replaceChildren(widgetBar.el);
    }

    setReactionsPanel(reactionsPanel) {
        // Clean up the old panel to prevent memory leaks
        this.#reactionsPanel?.destroy?.();

        this.#reactionsPanel = reactionsPanel;
        this.#getReactionsPanelContainer().replaceChildren(reactionsPanel.el);
    }

    addWidget(el) {
        this.#getContentContainer().appendChild(el);
    }

    /* Public API - data/state updates */


    /* Event handling */

    #addEventListeners() {
    }

    /* UI accessors */

    #getToolbarContainer() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.toolbar}"]`);
    }

    #getContentContainer() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.content}"]`);
    }

    #getWidgetBarContainer() {
        return this.#getContentContainer().querySelector(`[data-id="${this.#dataAttr.widgetBar}"]`);
    }

    #getReactionsPanelContainer() {
        return this.#getContentContainer().querySelector(`[data-id="${this.#dataAttr.reactionsPanel}"]`);
    }

    /* UI construction */

    #createContainer() {
        const container = document.createElement("div");
        container.classList.add(this.#cls.panel);
        container.dataset.id = IdlePanel.id;
        container.dataset.panel = "";
        return container;
    }

    #render() {

        // Create the basic structure of the panel
        // We'll later attach our subcomponents
        const container = this.#container;
        container.innerHTML = `
            <div data-id="${this.#dataAttr.toolbar}"></div>
            <div class="relative flex flex-col w-full h-full overflow-hidden" data-id="${this.#dataAttr.content}">
                <div data-id="${this.#dataAttr.widgetBar}"></div>
                <div class="h-full overflow-hidden" data-id="${this.#dataAttr.reactionsPanel}"></div>
            </div>
        `;
    }
}
