//
//  sidebar/looks_pane/settings_panel_presets.js
//  mmhmm
//
//  Created by Seth Hitchings on 9/25/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LookPresetsPanel {

    #cls = {
        container: "looks-presets",
        presetButton: "look-preset",
        loadingOverlay: "loading-overlay",
        blank: "blank"
    };

    #actions = {
        selectPreset: "select-preset",
        importLook: "import-look",
    };

    #dataAttr = {
        groupCatalog: "group-catalog",
        internalCatalog: "internal-catalog",
        publicCatalog: "public-catalog",
        typeCatalog: "catalog-item"
    }

    #container = null;
    #presets = LookPresets.All();
    #catalogStore = null;

    constructor() {
        this.#container = this.#createContainer();
        this.#render();
    }

    get el() {
        return this.#container;
    }

    /* Public API */

    setSharing(sharing) {
        // When the sharing context changes we re-render the UI
        this.#catalogStore = new LooksCatalogStore(sharing);
        this.#render();
    }

    sharedObjectsChanged() {
        // When the shared objects change we re-render the UI
        this.#render();
    }

    setPresets(presets) {
        // When the list of presets changes we re-render the UI
        this.#presets = presets;
        this.#render();
    }

    getSelectedItemId() {
        const button = this.#getSelectedOption();
        return button?.dataset.id;
    }

    getSelectedVariantId() {
        const button = this.#getSelectedOption();
        return button?.dataset.variant;
    }

    setSelectedItemId(id, variantId = null) {
        this.#updateSelected(id, variantId);
    }

    /* UI accessors */

    #getGroupCatalogContainer() {
        return this.#container.querySelector(`[data-id='${this.#dataAttr.groupCatalog}']`);
    }

    #getInternalCatalogContainer() {
        return this.#container.querySelector(`[data-id='${this.#dataAttr.internalCatalog}']`);
    }

    #getPublicCatalogContainer() {
        return this.#container.querySelector(`[data-id='${this.#dataAttr.publicCatalog}']`);
    }

    /* UI updates */

    #updateSelected(id, variant) {
        const previousSelection = this.#getSelectedOption();

        const buttons = this.#container.querySelectorAll(`button.${this.#cls.presetButton}`);
        buttons.forEach(button => {
            if (button.dataset.id == id && button.dataset.variant == variant) {
                button.setAttribute("aria-selected", "true");
            } else {
                button.removeAttribute("aria-selected");
            }
        });

        // If this is the initial selection, scroll it into view
        if (previousSelection == null) {
            const currentSelection = this.#getSelectedOption();
            currentSelection?.scrollIntoView(false);
        }
    }

    async #populateCatalog() {
        const store = this.#catalogStore;
        if (!store) {
            return;
        }

        // We'll show one category for the group the user's in (if any)
        // and another for everything else (public content)
        await this.#populateGroupCatalogItems(store);
        await this.#populatePublicCatalogItems(store);
    }

    async #populateGroupCatalogItems(store) {
        if (store.isInGroup()) {
            const result = await store.listGroupContent(LooksContentType.Look);
            if (result.successful) {
                const items = result.results;

                // Parse out sub-groups based on tags
                // This really just helps us with seeing our big catalog of internal looks,
                // normal users wouldn't have any of these
                const untagged = items.filter(item => item.tags == null);
                const tagged = items.filter(item => item.tags != null);
                const groups = [...new Set(tagged.map(item => item.tags))];

                const container = this.#getGroupCatalogContainer();
                container.innerHTML = this.#renderCatalogItems(store.getGroupName(), untagged);
                this.#populateCatalogItemThumbnails(container, untagged);

                const internalContainer = this.#getInternalCatalogContainer();
                internalContainer.innerHTML =
                    groups.map(groupName => {
                        const groupItems = tagged.filter(item => item.tags == groupName);
                        let title = groupName.startsWith("@") ? groupName.slice(1) : groupName;
                        return this.#renderCatalogItems(title, groupItems);
                    }).join("");
                this.#populateCatalogItemThumbnails(internalContainer, tagged);

                tippy(container.querySelectorAll("[data-tippy-content]"));
            }
        }
    }

    async #populatePublicCatalogItems(store) {
        const result = await store.listBuiltInContent(LooksContentType.Look);
        if (result.successful) {
            let items = result.results;

            // Hide legacy catalog looks that have been replaced by presets
            const omittedTitleTerms = [
                "Lumon",
                "glow",
                "Pattern",
                // "Angles",
                // "Paint",
                // "Hex"
            ];

            items = items.filter(item => {
                return !item.isGlobalExport ||
                    !item.title ||
                    !omittedTitleTerms.some(term => item.title.includes(term));
            });

            const container = this.#getPublicCatalogContainer();
            container.innerHTML = this.#renderCatalogItems(LocalizedString("More looks"), items);
            this.#populateCatalogItemThumbnails(container, items);
            tippy(container.querySelectorAll("[data-tippy-content]"));
        }
    }

    async #populateCatalogItemThumbnails(container, items) {
        items.forEach((item) => this.#populateCatalogItemThumbnail(container, item));
    }

    async #populateCatalogItemThumbnail(container, item) {
        const img = container.querySelector(`button[data-id='${item.identifier}'] img`);
        const url = await item.getThumbnailURL();
        img.src = url;
    }

    /*
     * UI construction
     */

    #createContainer() {
        const container = document.createElement("div");
        container.classList.add(this.#cls.container);
        if (!App.isDemo) {
            container.classList.add("h-full", "scroll-container");
        }
        return container;
    }

    #render() {
        if (App.isDemo) {
            this.#container.innerHTML = `
                <div class="flex flex-col">
                    ${this.#renderHeader()}
                    <div class="px-4 pt-4">
                        ${this.#renderBlankPreset()}
                    </div>
                    ${this.#renderPresets()}
                </div>
            `;
        } else {
            this.#container.innerHTML =
                this.#renderBlankPreset() +
                this.#renderGroupCatalog() +
                this.#renderPresets() +
                this.#renderPublicCatalog() +
                this.#renderInternalCatalog();
            this.#populateCatalog();
        }

        tippy(this.#container.querySelectorAll("[data-tippy-content]"));
    }

    #renderHeader() {
        return `
            <div class="w-full text-center p5 border-bottom">
                <div class="subtitle2">${LocalizedString("Choose a look to try on")}</div>
            </div>
        `;
    }

    #renderGroupCatalog() {
        return `<div data-id="${this.#dataAttr.groupCatalog}" class="flex flex-col w-full"></div>`;
    }

    #renderInternalCatalog() {
        return `<div data-id="${this.#dataAttr.internalCatalog}" class="flex flex-col w-full"></div>`;
    }

    #renderPublicCatalog() {
        return `<div data-id="${this.#dataAttr.publicCatalog}" class="flex flex-col w-full"></div>`;
    }

    #renderPresets() {
        const padding = App.isDemo ? "px-4 pb-4" : "";
        const presets = this.#presets.filter(preset => preset != LookPresets.Blank);
        return `
            <div class="flex flex-col w-full ${padding}">
                ${presets.map(preset => this.#renderPreset(preset)).join("")}
            </div>
        `;
    }

    #renderPreset(preset) {
        if (preset.hasVariants()) {
            // Allow the preset to specify "variants" - different combinations of its layer options
            // We'll specify the variant ID as a data attribute and load that variant when selected
            return this.#renderPresetWithVariants(preset);
        }

        return `
            <div class="flex flex-col">
                <button class="${this.#cls.presetButton}" data-action="${this.#actions.selectPreset}" data-id="${preset.id}">
                    <img class="w-full object-cover landscape" src="${preset.thumbnailUrl}" draggable=false />
                    <div class="${this.#cls.loadingOverlay}">
                        <div class="loader" />
                    </div>
                </button>
                <div class="w-full text-center caption2">${preset.name}</div>
            </div>
        `;
    }

    #renderPresetWithVariants(preset) {
        const variants = preset.getVariants();
        return `
            ${this.#renderCategoryName(preset.name)}
            <div class="grid grid-cols-2">
                ${variants.map(variant => this.#renderPresetVariant(preset, variant)).join("")}
            </div>`;
    }

    #renderCategoryName(name) {
        return `<div class="flex justify-start w-full caption2 pt-4 pb-2">${name}</div>`;
    }

    #renderPresetVariant(preset, variant) {
        if (preset == LookPresets.Branded && !variant.brandDomain) {
            return this.#renderCreateYourOwnBrandedLook(preset, variant);
        }

        const thumbnailUrl = variant.thumbnailUrl || preset.thumbnailUrl;

        return `
            <div class="flex flex-col gap-1">
                <button class="${this.#cls.presetButton}"
                        data-action="${this.#actions.selectPreset}"
                        data-id="${preset.id}"
                        data-variant="${variant.id}"
                        ${variant.name ? `data-tippy-content="${variant.name}"` : ""} >
                    <img class="w-full object-cover landscape" src="${thumbnailUrl}" draggable=false />
                    <div class="${this.#cls.loadingOverlay}">
                        <div class="loader" />
                    </div>
                </button>
            </div>
        `;
    }

    #renderCreateYourOwnBrandedLook(preset, variant) {
        return `
            <div class="flex flex-col gap-1">
                <button class="${this.#cls.presetButton} ${this.#cls.blank}"
                        data-action="${this.#actions.selectPreset}"
                        data-id="${preset.id}"
                        data-variant="${variant.id}"
                        ${variant.name ? `data-tippy-content="${variant.name}"` : ""} >
                    ${AppIcons.Plus().outerHTML}
                    <div class="${this.#cls.loadingOverlay}">
                        <div class="loader" />
                    </div>
                </button>
            </div>
        `;
    }

    #renderBlankPreset() {
        const preset = LookPresets.Blank;
        return `
            <button
                class="p-3 flex items-center gap-4 button-default text-content-primary fill-primary ${this.#cls.blank}"
                data-action="${this.#actions.selectPreset}"
                data-id="${preset.id}">
                ${AppIcons.Plus().outerHTML}
                ${LocalizedString("Create your own")}
            </button>
        `;
    }

    #renderCatalogItems(categoryName, items) {
        if (!items || items.length == 0) {
            return "";
        }
        return `
            ${this.#renderCategoryName(categoryName)}
            <div class="grid grid-cols-2 gap-2">
                ${items.map(item => this.#renderCatalogItem(item)).join("")}
            </div>`;
    }

    #renderCatalogItem(item) {
        return `
            <div class="flex flex-col gap-1">
                <button class="${this.#cls.presetButton}"
                        data-action="${this.#actions.importLook}"
                        data-id="${item.identifier}"
                        data-type="${this.#dataAttr.typeCatalog}"
                        data-can-delete="${item.canDelete}"
                        ${item.title ? `data-tippy-content="${item.title}"` : ""} >
                    <img class="w-full object-cover landscape" draggable=false />
                    <div class="${this.#cls.loadingOverlay}">
                        <div class="loader" />
                    </div>
                </button>
            </div>
        `;
    }

    /* Selection */

    #getSelectedOption() {
        return this.#container.querySelector(`button.${this.#cls.presetButton}[aria-selected="true"]`);
    }

    /* Loading state */

    showLoadingState(id, variantId) {
        const buttons = this.#container.querySelectorAll("button");
        buttons.forEach(button => button.disabled = true);

        const presetButtons = this.#container.querySelectorAll(`button[data-id='${id}']`);
        const button = Array.from(presetButtons).find(b => b.dataset.variant == variantId);
        button?.classList.add("loading");
    }

    hideLoadingState() {
        const buttons = this.#container.querySelectorAll("button");
        buttons.forEach(button => button.disabled = false);

        const button = this.#container.querySelector("button.loading");
        button?.classList.remove("loading");
    }
}
