//
//  sidebar/looks_pane/reaction_settings_panel_v2.js
//  mmhmm
//
//  Created by Cristiano Oliveira on 3/20/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class ReactionSettingsPanel {
    static id = "reactions-settings-panel";

    #cls = {
        active: "active",
        panel: "looks__panel"
    };

    #dataAttr = {
        container: "reactions-settings-panel",
        panels: "tab-panels",
        panelContainer: "looks-settings",
        stylePanel: "style-panel",
        virtualPanel: "virtual-panel",
        overlayPanel: "overlay-panel",
        reactionScale: "reaction-scale"
    };

    /**
     * these actions get handled by the parent
     */
    #actions = {
        backToIdle: "back-to-idle",
    };

    #activeTab = ReactionSettingsPanel.tabIds.STYLE;

    // NOTE: the id for each tab must match the prefix for the corresponding panel, e.g: "looks" -> "looks-panel"
    static tabIds = {
        STYLE: "style"
    };

    constructor() {
        this.container = this.#createContainer();
        this.render();
        this.setActiveTab(this.#activeTab);
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
        container.dataset.id = ReactionSettingsPanel.id;
        container.dataset.panel = "";
        return container;
    }

    setActiveTab(id) {
        this.#activeTab = id;

        // add inert to inactive panels to prevent them from being focusable
        this.container.querySelectorAll("[data-panel]").forEach((el) => {
            if (el.dataset.id !== `${id}-panel`) {
                el.setAttribute("inert", "");
            } else {
                el.removeAttribute("inert");
            }
        });
    }

    renderHeader() {
        const header = document.createElement("header");
        header.className = "looks__tabs_header";

        header.innerHTML = `
        <div class="flex items-center justify-between gap-4">
            <button
                class="breadcrumb text-button body2 flex items-center gap-4"
                data-action="${this.#actions.backToIdle}">
                <span class="rotate-90">
                    ${AppIcons.Disclosure().outerHTML}
                </span>
               ${LocalizedString("Edit visual")}
            </button>
        </div>
        `;

        return header;
    }

    #renderPanel(id) {
        const panel = document.createElement("div");
        panel.classList = "scroll-container";
        panel.dataset.id = id;
        panel.dataset.panel = "";
        return panel;
    }

    /**
     * Called when we've triggered a change that requires a UI update
     */
    reactionLayoutChanged(positionAndSizeEnabled, anchorValue, scaleValue) {
        // When the layout changes, update position & size
        // TODO the layouts are currently encapsulated in looks_pane,
        // it'd be nice if they weren't leaked here...

        const position = this.container.querySelector(`select[name="reaction-layout"]`);
        if (position) {
            position.disabled = !positionAndSizeEnabled;
        }

        const scale = this.container.querySelector(
            `input[name="${this.#dataAttr.reactionScale}"]`
        );

        if (scale) {
            scale.disabled = !positionAndSizeEnabled;
        }

        if (position && scale && positionAndSizeEnabled) {
            Array.from(position.options).forEach((option) => {
                option.selected = option.value == anchorValue;
            });
            scale.value = scaleValue;
        }
    }

    updateStyleTab(reaction, options, includePosition, anchorValue, scaleValue) {
        const el = document.createElement("div");
        el.classList = "grid gap-8 p5";

        // If a reaction slide has a Media.NameBadge, we let you change its two strings
        // Otherwise we let you change the first two text media
        const textMedia = reaction.objects.filter((media) => IsKindOf(media, Media.Text));
        const nametagMedia = reaction.objects.filter((media) =>
            IsKindOf(media, Media.NameBadge)
        );

        let textInputs = [];
        if (nametagMedia.length > 0) {
            const media = nametagMedia[0];
            textInputs.push({
                id: media.identifier,
                key: "titleLabel",
                value: media.titleLabel.string
            });

            // Kludge: we have some custom name tags where we set the font size to 0
            // to hide the subtitle line
            if (media.subtitleLabel.font.size > 0) {
                textInputs.push({
                    id: media.identifier,
                    key: "subtitleLabel",
                    value: media.subtitleLabel.string
                });
            }
        } else {
            textInputs = textMedia.slice(0, 2).map((media) => {
                return {
                    id: media.identifier,
                    value: media.attributedString
                };
            });
        }

        let html = `
            <div class="grid-cols-2 gap-4 grid">

            ${textInputs
                .map((item, index) => {
                    const num = textInputs.length > 1 ? index + 1 : "";
                    return `
                    <label class="caption1 text-content-primary" for="edit-reaction-text"${index}>${LocalizedString("Content")} ${num}</label>

                    <input
                    name="edit-text-media"
                    data-id="${item.id}"
                    data-key="${item.key}"
                    id="edit-reaction-text-${index}"
                    type="text"
                    value="${item.value}" /> `;
                })
                .join("")}

            <label for="edit-reaction-title" class="caption1 text-content-primary">${LocalizedString("Label")}</label>
            <input
                id="edit-reaction-title"
                value="${reaction.title ?? ""}"
                name="reaction-name"
                type="text"
                class="h-full flex-auto caption1 py-1"/>
        `;

        if (options.length > 0) {
            html += this.#renderStyle(options);
        }

        if (includePosition) {
            html += this.#renderPosition(LooksUtils.makeAnchorOptions(anchorValue));
        }

        if (scaleValue !== null) {
            html += this.#renderScaleSlider(scaleValue);
        }

        html += `
            </div>

            <div class="grid grid-cols-2 gap-4">
                <button
                    class="flex-1 py-2 px-4 secondary-button caption2 flex items-center gap-4"
                    class="w-full"
                    data-action="duplicate-reaction"
                >
                    ${LocalizedString("Duplicate")}
                </button>

                <button
                    class="flex-1 py-2 px-4 secondary-button caption2 flex items-center gap-4 text-destructive"
                    class="w-full"
                    data-action="delete-reaction"
                >
                    ${LocalizedString("Delete")}
                </button>
            </div>
        `;

        el.innerHTML = html;

        this.container
            .querySelector(`[data-id="${this.#dataAttr.stylePanel}"]`)
            .replaceChildren(el);
    }

    #renderStyle(options) {
        if (options.length == 0) {
            return "";
        }

        return `
        <label for="edit-reaction-style" class="caption1 text-content-primary">${LocalizedString("Show")}</label>
            <select
                class="h-6 w-full caption1"
                name="edit-reaction-style" >
                ${options
                    .map(
                        ({ value, label, selected }) =>
                            `<option
                                ${selected ? "selected" : ""}
                                value="${value}">${label}
                            </option>`
                    )
                    .join("")}
            </select>
        `;
    }

    #renderPosition(anchorOptions) {
        return `
            <label for="reaction-layout" class="caption1 text-content-primary">${LocalizedString("Position")}</label>
            <select
                name="reaction-layout"
                class="h-full flex-auto caption1 py-1">
                ${anchorOptions
                    .map(
                        ({ value, label, selected }) => `
                    <option ${selected ? "selected" : ""} value="${value}">${label}</option>
                `
                    )
                    .join("")}
            </select>
        `;
    }

    updateReactionScale(scale) {
        const input = this.container.querySelector(
            `input[name="${this.#dataAttr.reactionScale}"]`
        );

        input.value = scale;
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const val = parseFloat(input.value);
        const percentage = ((val - min) / (max - min)) * 100;
        input.style.setProperty("--fillAmount", `${percentage.toFixed(1)}%`);
    }

    #renderScaleSlider(scale) {
        const min = 0.1;
        const max = 1;
        scale = clamp(scale, min, max);
        const val = parseFloat(scale);
        const percentage = ((val - min) / (max - min)) * 100;
        const fillAmount = `${percentage.toFixed(1)}%`;

        return `
            <label for="${this.#dataAttr.reactionScale}" class="caption1 text-content-primary">${LocalizedString("Size")}</label>
            <div class="slider_wrapper">
                <input
                    id="${this.#dataAttr.reactionScale}"
                    name="${this.#dataAttr.reactionScale}"
                    type="range"
                    min="${min}"
                    max="${max}"
                    step="0.01"
                    value="${scale}"
                    style="--fillAmount: ${fillAmount};"
                    class="slider"/>
            </div>
        `;
    }

    render() {
        const panel = document.createElement("div");
        panel.dataset.id = "panel";

        this.header = this.renderHeader();
        panel.appendChild(this.header);

        this.body = document.createElement("section");
        this.body.dataset.id = this.#dataAttr.panels;
        this.body.dataset.state = this.#activeTab;

        this.body.appendChild(this.#renderPanel(this.#dataAttr.stylePanel));

        panel.appendChild(this.body);

        const panelContainer = document.createElement("div");
        panelContainer.className = "p4 flex flex-col flex-1";
        panelContainer.appendChild(panel);

        this.container.appendChild(panelContainer);
    }
}
