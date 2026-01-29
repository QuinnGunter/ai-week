//
//  looks/editor/layer_options.js
//  mmhmm
//
//  Created by Seth Hitchings on 6/26/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Base class for a UI panel / toolbar that shows a set of options
 * for contents of a given layer of a look.
 *
 * Behaves like an ActionSheet - created on demand, destroyed
 * when dismissed. Unlike an ActionSheet, this is not modal.
 */
class LayerOptions {

    #actions = {
        close: "close",
    }

    #cls = {
        custom: "layer-option-custom",
        panel: "look-editor-panel",
        row: "layer-option-row",
        hasBackground: "has-background",
    };

    #dataAttr = {
        options: "layer-options",
    };

    #container;
    #closeCallback;
    #clickHandler;

    constructor(container, closeCallback) {
        this.#container = container;
        this.#closeCallback = closeCallback;
        this.addEventListeners();
    }

    /** Lifecyle management */

    addEventListeners() {
        this.#clickHandler = this.#handleClick.bind(this);
        this.#container.addEventListener("click", this.#clickHandler);
    }

    removeEventListeners() {
        if (this.#clickHandler) {
            this.#container.removeEventListener("click", this.#clickHandler);
            this.#clickHandler = null;
        }
    }

    destroy() {
        this.removeEventListeners();
    }

    display() {
        this.#getParentElement().replaceChildren(this.#container);
    }

    dismiss() {
        this.#getParentElement().replaceChildren();
        this.destroy();
    }

    #getParentElement() {
        const stageContainer = document.getElementById("app").closest(".split_view");
        return stageContainer.querySelector("#camera_tools_left");
    }

    /* UI creation */

    get container() {
        return this.#container;
    }

    get optionsContainer() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.options}"]`);
    }

    /**
     * @param {HTMLElement} container
     * @param {String[]} contents
     */
    renderPaneAsListWithContents(container, ...contents) {
        container.classList.add(this.#cls.panel, "h-full", "p-0", "pb-4");
        container.innerHTML = `
            ${this.renderHeader()}
            <div data-id="${this.#dataAttr.options}" class="flex flex-col gap-4 py-4 overflow-scroll-y text-content-primary caption2">
                ${contents.join("")}
            </div>
        `;
        this.addTooltips(container);
    }

    addTooltips(container) {
        tippy(container.querySelectorAll("button[data-tippy-content]"));
    }

    renderHeader() {
        return `
            <button
                class="icon-button close-panel"
                data-action="close"
                >
                ${AppIcons.CaretLeft().outerHTML}
            </button>
        `;
    }

    renderRow(content) {
        return `
            <div class="${this.#cls.row} w-full flex flex-col gap-1 justify-center items-center p-0">
                ${content}
            </div>
        `;
    }

    renderRowWithButton(title, action, id, content, showLabel=true, classList="p-0") {
        return this.renderRow(this.renderButtonContents(
            title,
            action,
            id,
            content,
            showLabel,
            classList
        ));
    }

    renderButtonContents(title, action, id, content, showLabel=true, classList="p-0") {
        return `
            <div class="layer-button-wrapper">
                <button
                    class="icon-button image-button ${classList} landscape"
                    data-action="${action}"
                    ${id ? `data-id="${id}"` : ""}
                    ${title ? `data-tippy-content="${title}"` : ""}
                    >
                    ${content}
                </button>
            </div>

            ${!showLabel || !title ? "" : `
            <span class="w-full text-center text-ellipsis caption3" title="${title}">${title}</span>
            `}
        `;
    }

    // It's silly to do this two ways, but...
    createNewRowElementWithButton(title, action, id, content, showLabel=true, padding="p-0") {
        const newRow = document.createElement("div");
        newRow.innerHTML = this.renderButtonContents(
            title,
            action,
            id,
            content,
            showLabel,
            padding
        );
        return newRow;
    }

    renderNoneButton(action) {
        return this.renderRowWithButton(
            LocalizedString("None"),
            action,
            null,
            AppIcons.CircleSlash().outerHTML,
            false);
    }

    renderUploadButton(action) {
        return this.renderRowWithButton(
            LocalizedString("Upload"),
            action,
            null,
            AppIcons.UploadArrow().outerHTML,
            false);
    }

    renderSearchButton(action) {
        return this.renderRowWithButton(
            LocalizedString("Search"),
            action,
            null,
            AppIcons.MagnifyingGlass().outerHTML,
            false);
    }

    replaceImageWithThumbnail(img, imgPromise) {
        imgPromise.then((thumbnail) => {
            if (thumbnail) {
                thumbnail.draggable = false;
                img.replaceWith(thumbnail);
            }
        }).catch((error) => {
            console.error("Failed to load thumbnail:", error);
        });
    }

    async addCustomButton(uploadAction, currentAction, padding = "p-0") {
        const media = await this.getCustomMedia();
        if (media) {
            this.replaceCustomButton(media, uploadAction, currentAction, padding);
        }
    }

    removeCustomButton() {
        const existing = this.container.querySelector(`.${this.#cls.custom}`);
        existing?.remove();
    }

    /**
     * @param {Media.Image} media
     */
    replaceCustomButton(media, uploadAction, currentAction, padding = "p-0") {
        // Remove the existing custom option
        this.removeCustomButton();

        // Now create a new row to replace it
        // We'll insert it after the upload button
        const uploadButton = this.container.querySelector(`[data-action="${uploadAction}"]`);
        const uploadRow = uploadButton.closest(".layer-option-row");

        // Create a new row for the custom option
        const newRow = this.createNewRowElementWithButton(
            LocalizedString("Current"),
            currentAction,
            null,
            `<img src="${ThumbnailStorage.AssetMissing}" draggable="false"></img>`,
            false,
            `${this.#cls.hasBackground} ${padding}`
        );
        newRow.className = uploadRow.className; // This is kludgy...
        newRow.classList.add(this.#cls.custom);
        uploadRow.insertAdjacentElement("afterend", newRow);

        // Select the new row
        this.selectItem(newRow.querySelector("button"));

        // Replace the placeholder image with the real one
        const img = newRow.querySelector("img");
        this.replaceImageWithThumbnail(img, media.thumbnailAsElement());
    }

    /* Selection */

    selectItem(item) {
        // Deselect the currently selected item
        const selected = this.#container.querySelector("[aria-selected='true']");
        selected?.removeAttribute("aria-selected");

        // Select the new item
        item?.setAttribute("aria-selected", "true");
    }

    selectItemByAction(action) {
        const item = this.#container.querySelector(`[data-action="${action}"]`);
        if (item) {
            this.selectItem(item);
        }
    }

    selectItemById(id) {
        const item = this.getItemById(id);
        if (item) {
            this.selectItem(item);
        }
    }

    getItemById(id) {
        return this.#container.querySelector(`[data-id="${id}"]`);
    }

    /**
     * Given a media item and a set of built-in options, find the
     * item's asset fingerprint.
     */
    findItemId(media, options) {
        if (media.asset.fingerprint) {
            const match = options.find(option => option.matchesFingerprint(media.asset.fingerprint));
            if (match) {
                return match.fingerprint;
            }
        } else if (media.asset.contentURL){
            // Match on the URL if no fingerprint is available yet
            return LooksUtils.matchAssetByContentURL(media.asset, options)?.fingerprint;
        }
        return null;
    }

    /* Event handling */

    #handleClick(evt) {
        const item = evt.target.closest("[data-action]");
        if (!item) {
            return;
        }
        const action = item.dataset.action;
        this.handleEvent(evt, item, action);
    }

    handleEvent(evt, item, action) {
        switch (action) {
            case this.#actions.close:
                evt.stopPropagation();
                this.#closeCallback();
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }

}

class LogoLayerOptions extends LayerOptions {

    #actions = {
        search: "search-brand",
        select: "select-logo",
        upload: "upload-logo",
        remove: "remove-logo",
        current: "current-logo",
    }

    #cls = {
        hasBackground: "has-background",
    }

    #look;
    #searchCallback;
    #removeCallback;
    #changeCallback;

    constructor(look, onSearch, onRemove, onChange, onClose) {
        const container = document.createElement("div");
        super(container, onClose);

        this.#look = look;
        this.#searchCallback = onSearch;
        this.#removeCallback = onRemove;
        this.#changeCallback = onChange;

        this.populateContainer(container);

        this.#setInitialSelection();
        this.addCustomButton(this.#actions.upload, this.#actions.current, "p-2");
    }

    populateContainer(container) {
        const look = this.#look;

        const contents = [
            this.renderNoneButton(this.#actions.remove),
        ];
        if (look.isBrandEditable()) {
            contents.push(this.renderSearchButton(this.#actions.search));
        }
        contents.push(this.renderUploadButton(this.#actions.upload));
        contents.push(this.#renderLogoOptions());

        this.renderPaneAsListWithContents(container, ...contents);
    }

    async getCustomMedia() {
        // See if the look has a logo that isn't one of the brand logo URLs
        const look = this.#look;
        const media = await look.getLogoMedia();
        if (!media) {
            return null;
        }

        // When we create a logo from a URL, we store that URL in the metadata
        const url = media.metadata?.sourceUrl;
        const logoUrls = this.#look.getLogoOptions();
        if (!url || !logoUrls.includes(url)) {
            return media;
        }

        return null;
    }

    #renderLogoOptions() {
        const urls = this.#look.getLogoOptions();
        return urls.map((url, index) => this.#renderLogoOption(url, index)).join("");
    }

    #renderLogoOption(url, index) {
        return this.renderRowWithButton(
            null,
            this.#actions.select,
            url,
            `<img class="" src="${url}"></img>`,
            false,
            `p-2 ${this.#cls.hasBackground}`
        );
    }

    /* Event handling */

    handleEvent(evt, button, action) {
        switch (action) {
            case this.#actions.search:
                this.#onSearch(evt, button);
                break;
            case this.#actions.select:
                this.#onSelect(evt, button);
                break;
            case this.#actions.upload:
                this.#onUpload(evt);
                break;
            case this.#actions.remove:
                this.#onRemove(evt, button);
                break;
            case this.#actions.current:
                // Do nothing
                break;
            default:
                super.handleEvent(evt, button, action);
        }
    }

    async #onSearch(evt, button) {
        evt.stopPropagation();
        this.#searchCallback();
        LooksAnalytics.onSearchLookLayer(this.#look.identifier, LooksMediaType.Logo);
    }

    async #onSelect(evt, button) {
        evt.stopPropagation();

        const url = button.dataset.id;

        this.selectItem(button);
        const media = await this.#changeCallback(this.#look, url);
        if (media) {
            this.removeCustomButton();
        }
        LooksAnalytics.onChangeLookLayer(this.#look.identifier, LooksMediaType.Logo);
    }

    async #onRemove(evt, button) {
        evt.stopPropagation();

        this.selectItem(button);
        await this.#removeCallback(this.#look);
        this.removeCustomButton();
        LooksAnalytics.onRemoveLookLayer(this.#look.identifier, LooksMediaType.Logo);
    }

    async #onUpload(evt) {
        evt.stopPropagation();

        const media = await this.#changeCallback(this.#look);
        if (media) {
            this.replaceCustomButton(media, this.#actions.upload, this.#actions.current, "p-0");
            LooksAnalytics.onUploadLookLayer(this.#look.identifier, LooksMediaType.Logo);
        }
    }

    async #setInitialSelection() {
        const look = this.#look;
        const media = await look.getLogoMedia();
        if (media && media.metadata?.sourceUrl) {
            this.selectItemById(media.metadata.sourceUrl);
        } else {
            // If no media is set, select the "None" button
            this.selectItemByAction(this.#actions.remove);
        }
    }

}

class OverlayLayerOptions extends LayerOptions {

    #actions = {
        select: "select-overlay",
        upload: "upload-overlay",
        remove: "remove-overlay",
        current: "current-overlay",
    }

    #cls = {
        hasBackground: "has-background",
    }

    #look;
    #removeCallback;
    #changeCallback;

    constructor(look, onRemove, onChange, onClose) {
        const container = document.createElement("div");
        super(container, onClose);

        this.#look = look;
        this.#removeCallback = onRemove;
        this.#changeCallback = onChange;

        this.populateContainer(container);

        this.#setInitialSelection();
        this.addCustomButton(this.#actions.upload, this.#actions.current);
    }

    populateContainer(container) {
        const look = this.#look;
        let contents = [];

        contents.push(this.renderNoneButton(this.#actions.remove));
        if (look.isCustomOverlayEnabled()) {
            contents.push(this.renderUploadButton(this.#actions.upload));
        }
        contents.push(this.#renderOverlayOptions());

        this.renderPaneAsListWithContents(container, ...contents);
    }

    async getCustomMedia() {
        // See if the look has an overlay that isn't one of our built-in options
        const look = this.#look;
        const media = await look.getOverlayMedia();
        if (!media || !media.asset) {
            return null;
        }

        // See if the current overlay is one of our built-in options
        const id = this.findItemId(media, this.#getOverlayOptions());
        const match = this.#getOverlayOptionById(id);
        if (match == null) {
            return media;
        }

        return null;
    }

    #renderOverlayOptions() {
        const options = this.#getOverlayOptions();
        return options.map((option) => this.#renderOverlay(option)).join("");
    }

    #renderOverlay(option) {
        return this.renderRowWithButton(
            option.title,
            this.#actions.select,
            option.fingerprint,
            `<img class="" src="${option.thumbnailUrl}"></img>`,
            false,
            `${this.#cls.hasBackground} p-0`
        );
    }

    /* Event handling */

    handleEvent(evt, button, action) {
        switch (action) {
            case this.#actions.select:
                this.#onSelect(evt, button);
                break;
            case this.#actions.upload:
                this.#onUpload(evt);
                break;
            case this.#actions.remove:
                this.#onRemove(evt, button);
                break;
            case this.#actions.current:
                // Do nothing
                break;
            default:
                super.handleEvent(evt, button, action);
        }
    }

    async #onSelect(evt, button) {
        evt.stopPropagation();

        const id = button.dataset.id;
        const option = this.#getOverlayOptionById(id);

        this.selectItem(button);
        const media = await this.#changeCallback(this.#look, option);
        if (media) {
            this.removeCustomButton();
        }
        LooksAnalytics.onChangeLookLayer(this.#look.identifier, LooksMediaType.Overlay, option?.fileNameKey);
    }

    async #onRemove(evt, button) {
        evt.stopPropagation();

        this.selectItem(button);
        await this.#removeCallback(this.#look);
        this.removeCustomButton();
        LooksAnalytics.onRemoveLookLayer(this.#look.identifier, LooksMediaType.Overlay);
    }

    async #onUpload(evt) {
        evt.stopPropagation();

        const media = await this.#changeCallback(this.#look);
        if (media) {
            // Add the new media to our list
            // Remove the old "custom" logo if there is one
            this.replaceCustomButton(media, this.#actions.upload, this.#actions.current);
            LooksAnalytics.onUploadLookLayer(this.#look.identifier, LooksMediaType.Overlay);
        }
    }

    /* Helpers */

    async #setInitialSelection() {
        const look = this.#look;
        const media = await look.getOverlayMedia();
        if (media && media.asset) {
            const id = this.findItemId(media, this.#getOverlayOptions());
            if (id) {
                this.selectItemById(id);
            }
        } else {
            // If no media is set, select the "None" button
            this.selectItemByAction(this.#actions.remove);
        }
    }

    #getOverlayOptions() {
        return this.#look.getOverlayOptions();
    }

    #getOverlayOptionById(id) {
        return this.#getOverlayOptions().find((option) => option.fingerprint === id);
    }
}

class PatternLayerOptions extends LayerOptions {

    #actions = {
        select: "select-pattern",
        upload: "upload-pattern",
        remove: "remove-pattern",
        current: "current-pattern",
    }

    #cls = {
        hasBackground: "has-background",
    }

    #look;
    #removeCallback;
    #changeCallback;

    constructor(look, onRemove, onChange, onClose) {
        const container = document.createElement("div");
        super(container, onClose);

        this.#look = look;
        this.#removeCallback = onRemove;
        this.#changeCallback = onChange;

        this.populateContainer(container);

        this.#setInitialSelection();
        this.addCustomButton(this.#actions.upload, this.#actions.current);
    }

    populateContainer(container) {
        const look = this.#look;
        let contents = [];

        contents.push(this.renderNoneButton(this.#actions.remove));
        if (look.isCustomPatternEnabled()) {
            contents.push(this.renderUploadButton(this.#actions.upload));
        }
        contents.push(this.#renderPatternOptions());

        this.renderPaneAsListWithContents(container, ...contents);
    }

    async getCustomMedia() {
        // See if the look has a pattern that isn't one of our built-in options
        const look = this.#look;
        const media = await look.getPatternMedia();
        if (!media || !media.asset) {
            return null;
        }

        // See if the current pattern is one of our built-in options
        const id = this.findItemId(media, this.#getPatternOptions());
        const match = this.#getPatternOptionById(id);
        if (match == null) {
            return media;
        }

        return null;
    }

    #renderPatternOptions() {
        const options = this.#getPatternOptions();
        return options.map((option) => this.#renderPattern(option)).join("");
    }

    /**
     * @param {LookPattern} pattern
     */
    #renderPattern(pattern) {
        return this.renderRowWithButton(
            pattern.title,
            this.#actions.select,
            pattern.fingerprint,
            `<img class="" src="${pattern.thumbnailUrl}"></img>`,
            false,
            `${this.#cls.hasBackground} p-0`
        );
    }

    /* Event handling */

    handleEvent(evt, button, action) {
        switch (action) {
            case this.#actions.select:
                this.#onSelect(evt, button);
                break;
            case this.#actions.upload:
                this.#onUpload(evt);
                break;
            case this.#actions.remove:
                this.#onRemove(evt, button);
                break;
            case this.#actions.current:
                // Do nothing
                break;
            default:
                super.handleEvent(evt, button, action);
        }
    }

    async #onSelect(evt, button) {
        evt.stopPropagation();

        const id = button.dataset.id;
        const option = this.#getPatternOptionById(id);

        this.selectItem(button);
        const media = await this.#changeCallback(this.#look, option);
        if (media) {
            this.removeCustomButton();
        }
        LooksAnalytics.onChangeLookLayer(this.#look.identifier, LooksMediaType.Pattern, option?.fileNameKey);
    }

    async #onRemove(evt, button) {
        evt.stopPropagation();

        this.selectItem(button);
        await this.#removeCallback(this.#look);
        this.removeCustomButton();
        LooksAnalytics.onRemoveLookLayer(this.#look.identifier, LooksMediaType.Pattern);
    }

    async #onUpload(evt) {
        evt.stopPropagation();
        const media = await this.#changeCallback(this.#look);
        if (media) {
            // Add the new media to our list
            // Remove the old "custom" media if there is one
            this.replaceCustomButton(media, this.#actions.upload, this.#actions.current);
            LooksAnalytics.onUploadLookLayer(this.#look.identifier, LooksMediaType.Pattern);
        }
    }

    /* Helpers */

    async #setInitialSelection() {
        const look = this.#look;
        const media = await look.getPatternMedia();
        let id = null;
        if (media && media.asset) {
            const pattern = look.getPatternForMedia(media);
            if (pattern) {
                id = pattern.fingerprint;
                this.selectItemById(id);
            } else {
                console.warn("No matching pattern found for media");
            }
        } else {
            // If no media is set, select the "None" button
            this.selectItemByAction(this.#actions.remove);
        }
    }

    #getPatternOptions() {
        return this.#look.getPatternOptions();
    }

    #getPatternOptionById(id) {
        return this.#getPatternOptions().find((option) => option.fingerprint === id);
    }

}
