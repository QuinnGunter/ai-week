//
//  sidebar/looks_pane/looks_panel.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/17/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * A bridge between the main app and the LooksPresetsPanel,
 * which allows the user to browser our catalog of looks and
 * create new looks to add to their list.
 */
class LooksListPanel {
    static id = "looks-list-panel";

    #cls = {
        panel: "looks__panel",
        header: "looks__tabs_header",
        footer: "looks__tabs_footer",
    };

    #actions = {
        cancel: "cancel-select-look",
        ok: "save-look-changes",
    };

    #dataAttr = {
        panels: "tab-panels",
        catalogPanel: "catalog-panel"
    };

    static tabIds = {
        CATALOG: "catalog"
    }

    #container = null;
    #catalogPanelContainer = null;

    #handleClick = null;

    constructor() {
        this.#render();
        this.#addEventListeners();
    }

    get el() {
        return this.#container;
    }

    /** Event handling */

    #addEventListeners() {
        const handlers = {};
        this.#handleClick = this.#createClickHandler(handlers);
        this.#container.addEventListener("click", this.#handleClick);
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
            } else if (action === this.#actions.selectItem) {
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

    /** Catalog management */

    setCatalogPanel(el) {
        this.#catalogPanelContainer = el;
        this.#container
            .querySelector(`[data-id="${this.#dataAttr.catalogPanel}"]`)
            .replaceChildren(el);
    }

    /** UI rendering */

    #render() {
        const container = document.createElement("div");
        container.classList.add(this.#cls.panel);
        container.dataset.id = LooksListPanel.id;
        container.dataset.panel = "";
        this.#container = container;

        container.appendChild(this.#renderHeader());
        container.appendChild(this.#renderBody());
        container.appendChild(this.#renderFooter());
    }

    #renderHeader() {
        const header = document.createElement("header");
        header.classList.add(this.#cls.header);

        header.innerHTML = `
            <div class="flex gap-4 items-center">
                <button class="icon-button back-button" data-action="${this.#actions.cancel}">
                    ${AppIcons.CaretLeft().outerHTML}
                </button>
                <span class="heading-medium">${LocalizedString("Looks catalog")}</span>
            </div>
        `;

        return header;
    }

    #renderBody() {
        const body = document.createElement("section");
        body.dataset.id = this.#dataAttr.panels;
        body.dataset.state = LooksListPanel.tabIds.CATALOG;

        body.appendChild(this.#renderCatalogPanel());

        return body;
    }

    #renderCatalogPanel() {
        const el = this.#renderListPanel(this.#dataAttr.catalogPanel);
        el.appendChild(this.#renderList(this.#dataAttr.catalogPanel));
        return el;
    }

    #renderListPanel(id) {
        const panel = document.createElement("div");
        panel.dataset.id = id;
        panel.dataset.panel = "";
        return panel;
    }

    #renderList(id) {
        // listContainer used for scrolling with padding
        const listContainer = document.createElement("div");
        listContainer.dataset.contents = id;
        listContainer.classList.add("scroll-container", "h-full");
        listContainer.tabIndex = -1;

        const list = document.createElement("ul");
        list.dataset.list = "";
        list.className = GridCard.cls.list;
        listContainer.appendChild(list);

        return listContainer;
    }

    #renderFooter() {
        const footer = document.createElement("section");
        footer.classList.add(this.#cls.footer);

        footer.innerHTML = `
            <div class="w-full p4 grid grid-cols-2 items-center gap-4 border-primary border-top">
                <button
                    class="py-2 px-4 secondary-button body2 flex items-center gap-4"
                    data-action="${this.#actions.cancel}">
                    ${LocalizedString("Cancel")}
                </button>
                <button
                    class="py-2 px-4 primary-button body2 flex items-center gap-4"
                    data-action="${this.#actions.ok}">
                    ${LocalizedString("Use this look")}
                </button>
            </div>
        `;
        return footer;
    }
}
