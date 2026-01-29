//
//  sidebar/looks_pane/settings_panel.js
//  mmhmm
//
//  Created by Cristiano Oliveira on 3/20/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LookSettingsPanel {
    static id = "looks-settings-panel";

    #cls = {
        active: "active",
        indicator: "nav__indicator",
        panel: "looks__panel"
    };

    #dataAttr = {
        panels: "tab-panels",
        panelContainer: "looks-settings",
        stylePanel: "style-panel",
        nameTagPanel: "nametag-panel",
        presetPanel: "presets-panel"
    };

    /**
     * these actions get handled by the parent
     */
    #actions = {
        saveChanges: "save-look-changes",
        discardChanges: "discard-look-changes",
        selectTab: "select-tab",
        saveDemoLook: "save-demo-look",
    };

    #handleClick;

    #activeTab = LookSettingsPanel.tabIds.STYLE;

    // NOTE: the id for each tab must match the prefix for the corresponding panel, e.g: "looks" -> "looks-panel"
    static tabIds = {
        STYLE: "style",
        NAMETAG: "nametag",
        PRESET: "presets"
    };

    #tabs = [
        { id: LookSettingsPanel.tabIds.STYLE, name: LocalizedString("Look") },
        { id: LookSettingsPanel.tabIds.NAMETAG, name: LocalizedString("Name tag") },
        { id: LookSettingsPanel.tabIds.PRESET, name: LocalizedString("Presets") }
    ];

    #demoCTA;
    #look;

    constructor() {
        this.container = this.#createContainer();
        this.render();
        this.#addEventListeners();
        this.setActiveTab(this.#activeTab);
    }

    set demoCTA(text) {
        this.#demoCTA = text;
        if (text) {
            this.updateDemoFooterCTA(text);
        }
    }

    setLook(slide) {
        const previous = this.#look;

        if (slide != previous) {
            this.#look = slide;
            if (previous) {
                previous.removeObserverForProperty(this, "hasLocalChanges");
            }
            if (slide) {
                slide.addObserverForProperty(this, "hasLocalChanges");
            }
        }

        this.#setSaveButtonEnabled(slide?.hasLocalChanges());
    }

    #setSaveButtonEnabled(enabled) {
        if (!App.isDemo) {
            const button = this.container.querySelector(`[data-action="${this.#actions.saveChanges}"]`);
            button.disabled = !enabled;
        }
    }

    /**
     * Returns the container for external use.
     */
    get el() {
        return this.container;
    }

    #createContainer() {
        const container = document.createElement("div");
        container.className = this.#cls.panel;
        container.dataset.id = LookSettingsPanel.id;
        container.dataset.panel = "";
        return container;
    }

    #createClickHandler(handlers) {
        return (ev) => {
            const item = ev.target.closest("[data-action]");
            if (!item) return;

            const action = item.dataset.action;
            const handler = handlers[action];

            if (handler) {
                // We want to allow the event to bubble up
                // so the looks pane knows we're changing tabs
                // ev.stopPropagation();
                handler(item.dataset, ev);
            }
        };
    }

    #onTabClick(id, evt) {
        const activeTabId = this.#activeTab;
        if (activeTabId != id) {
            this.setActiveTab(id);
        } else {
            // We don't want the looks panel to see this event, since it has no effect
            evt.stopPropagation();
        }
    }

    isLookTabActive() {
        return this.#activeTab === LookSettingsPanel.tabIds.STYLE;
    }

    isNametagTabActive() {
        return this.#activeTab === LookSettingsPanel.tabIds.NAMETAG;
    }

    setActiveTab(id) {
        this.#activeTab = id;

        const activeTab = this.container.querySelector(`[data-id="${id}"]`);

        this.container.querySelectorAll(`.${this.#cls.active}`).forEach((el) => {
            el.classList.remove(this.#cls.active);
        });

        this.container
            .querySelector(`[data-id="${id}"]`)
            ?.parentElement.classList.add(this.#cls.active);

        // add inert to inactive panels to prevent them from being focusable
        this.container.querySelectorAll("[data-panel]").forEach((el) => {
            if (el.dataset.id !== `${id}-panel`) {
                el.setAttribute("inert", "");
            } else {
                el.removeAttribute("inert");
            }
        });

        this.#moveTabIndicator(activeTab);

        this.container.querySelector(`[data-id=${this.#dataAttr.panels}]`).dataset.state =
            id;
    }

    /**
     * @param {HTMLElement} activeTab
     */
    #moveTabIndicator(activeTab) {
        const tabs = Array.from(
            this.container.querySelectorAll(`[data-action="${this.#actions.selectTab}"]`)
        );

        const activeIndex = tabs.indexOf(activeTab);

        const indicator = this.container.querySelector(`.${this.#cls.indicator}`);
        if (indicator) {
            indicator.style.transform = `translateX(${activeIndex * 100}%)`;
        }
    }

    #addEventListeners() {
        const handlers = {
            [this.#actions.selectTab]: ({ id }, evt) => this.#onTabClick(id, evt),
        };

        this.#handleClick = this.#createClickHandler(handlers);
        this.container.addEventListener("click", this.#handleClick);
    }

    renderTabs() {
        const tabs = document.createElement("div");
        tabs.classList.add("looks__tabs_header");
        tabs.innerHTML = `
            <div class="flex gap-4 items-center">
                <button class="icon-button back-button" data-action="${this.#actions.discardChanges}">
                    ${AppIcons.CaretLeft().outerHTML}
                </button>
                <span class="text-content-primary heading-medium">${LocalizedString("Edit look")}</span>
            </div>
        `;
        return tabs;
    }

    renderHeader() {
        // Presets never appears as a tab in the editor
        const tabs = this.#tabs.filter(tab => tab.id !== LookSettingsPanel.tabIds.PRESET);

        const indicatorWidth = `${100 / tabs.length}%`;
        const header = document.createElement("header");
        header.className = "looks__tabs_header";

        header.innerHTML = `
        <nav>
            <ul>
                ${tabs
                    .map(
                        (tab) =>
                            `<li
                            class="${this.#activeTab === tab.id ? this.#cls.active : ""}">
                            <button data-action="${this.#actions.selectTab}" data-id="${tab.id}" class="body2">
                                <span>${tab.name}</span>
                            </button>
                    </li>`
                    )
                    .join("")}
            </ul>

            <div
                class="nav__indicator"
                style="width: ${indicatorWidth};">
                <div></div>
            </div>
        </nav>
        `;

        return header;
    }

    renderFooter() {
        if (App.isDemo === true) {
            return this.renderDemoFooter();
        }

        const footer = document.createElement("section");
        footer.className = "looks__tabs_footer";

        footer.innerHTML = `
            <div class="w-full p4 grid grid-cols-2 items-center gap-4 border-primary border-top">
                <button
                    class="py-2 px-4 secondary-button body2 flex items-center gap-4"
                    data-action="${this.#actions.discardChanges}">
                    ${LocalizedString("Cancel")}
                </button>
                <button
                    class="py-2 px-4 primary-button body2 flex items-center gap-4"
                    data-action="${this.#actions.saveChanges}">
                    ${LocalizedString("Save")}
                </button>
            </div>
        `;
        return footer;
    }

    updateDemoFooterCTA(cta) {
        const button = this.container.querySelector(`[data-action="${this.#actions.saveDemoLook}"]`);
        if (button) {
            button.innerText = cta;
        }
    }

    setDemoFooterCTADisabled(value) {
        const button = this.container.querySelector(`[data-action="${this.#actions.saveDemoLook}"]`);
        if (button) {
            button.disabled = !!value;
        }
    }

    renderDemoFooter() {
        const footer = document.createElement("section");
        footer.className = "looks__tabs_footer";

        const cta = this.#demoCTA ?? LocalizedString("Launch the app");

        // TODO break after text if we need to break
        footer.innerHTML = `
            <div class="w-full p4 grid grid-cols-1 items-center gap-4 border-primary border-top">
                <div class="flex justify-center items-center gap-3 caption1">
                    ${LocalizedString("To use this look on")}
                    <img src="assets/looks/platforms/zoom.png" />
                    <img src="assets/looks/platforms/teams.png" />
                    <img src="assets/looks/platforms/webex.png" />
                    <img src="assets/looks/platforms/meet.png" />
                </div>
                <button
                    class="py-2 px-4 primary-button body2 flex items-center gap-4"
                    data-action="${this.#actions.saveDemoLook}">
                    ${cta}
                </button>
            </div>
        `;
        return footer;
    }

    setStyleTab(el) {
        this.container
            .querySelector(`[data-id="${this.#dataAttr.stylePanel}"]`)
            .replaceChildren(el);
    }

    setNameTagTab(el) {
        this.container
            .querySelector(`[data-id="${this.#dataAttr.nameTagPanel}"]`)
            .replaceChildren(el);
    }

    setPresetsTab(el) {
        this.container
            .querySelector(`[data-id="${this.#dataAttr.presetPanel}"]`)
            .replaceChildren(el);
    }

    #renderPanel(id) {
        const panel = document.createElement("div");
        panel.classList = "scroll-container";
        panel.dataset.id = id;
        panel.dataset.panel = "";
        return panel;
    }

    render() {
        const panel = document.createElement("div");
        panel.dataset.id = "panel";

        if (!App.isDemo) {
            panel.appendChild(this.renderTabs());
        }

        this.header = this.renderHeader();
        panel.appendChild(this.header);

        this.body = document.createElement("section");
        this.body.dataset.id = this.#dataAttr.panels;
        this.body.dataset.state = this.#activeTab;

        this.body.appendChild(this.#renderPanel(this.#dataAttr.stylePanel));
        this.body.appendChild(this.#renderPanel(this.#dataAttr.nameTagPanel));
        this.body.appendChild(this.#renderPanel(this.#dataAttr.presetPanel));

        panel.appendChild(this.body);

        panel.appendChild(this.renderFooter());

        const panelContainer = document.createElement("div");
        panelContainer.className = "p4 flex flex-col flex-1";
        panelContainer.appendChild(panel);

        this.container.appendChild(panelContainer);
    }

    /* KVO */

    observePropertyChanged(obj, key, val) {
        if (key == "hasLocalChanges") {
            this.#hasLocalChangesChanged(val);
        }
    }

    #hasLocalChangesChanged(hasChanges) {
        this.#setSaveButtonEnabled(hasChanges);
    }
}
