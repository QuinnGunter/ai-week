//
//  looks/editor/layer_settings.js
//  mmhmm
//
//  Created by Seth Hitchings on 7/14/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LayerSettings {

    #container;

    constructor(container) {
        this.#container = container;
        container.classList.add("w-full", "p4", "flex", "flex-col", "justify-center",
            "items-center", "text-content-secondary");
    }

    get container() {
        return this.#container;
    }

    /** Lifecyle management */

    destroy() {
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
        return stageContainer.querySelector("#camera_tools_bottom");
    }

    /** UI helpers */

    updateSliderValue(inputName, value) {
        const input = this.container.querySelector(`input[name="${inputName}"]`);

        input.value = value;

        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const val = parseFloat(input.value);
        const percentage = ((val - min) / (max - min)) * 100;
        input.style.setProperty("--fillAmount", `${percentage.toFixed(1)}%`);
    }
}

class LogoLayerSettings extends LayerSettings {

    #dataAttr = {
        logoPosition: "look-logo-position",
        logoScale: "look-logo-scale",
    };

    // The current look whose logo layer settings we're editing
    #look;

    // The current look's logo layer media, if any
    #logoMedia;

    constructor(look) {
        const container = document.createElement("div");
        super(container);

        this.#look = look;

        this.populateContainer(container);
        this.update();
        this.#addObservers();
    }

    async #addObservers() {
        const media = await this.#look.getLogoMedia();
        if (!media) {
            return;
        }
        this.#logoMedia = media;
        media.addObserverForProperty(this, "anchor");
        media.addObserverForProperty(this, "scale");
    }

    #removeObservers() {
        if (this.#logoMedia) {
            this.#logoMedia.removeObserverForProperty(this, "anchor");
            this.#logoMedia.removeObserverForProperty(this, "scale");
            this.#logoMedia = null;
        }
    }

    #refreshObservers(media) {
        if (media != this.#logoMedia) {
            this.#removeObservers();
            if (media) {
                this.#addObservers();
            }
        }
    }

    observePropertyChanged(obj, key, val) {
        if (key == "anchor" || key == "scale") {
            this.update();
        }
    }

    destroy() {
        super.destroy();
        this.#removeObservers(this.#look);
    }

    populateContainer(container) {
        container.innerHTML = `
            <div class="grid grid-cols-2-fit items-center gap-4">
                <label for="${this.#dataAttr.logoPosition}" class="body4">${LocalizedString("Position")}</label>
                ${this.#renderPosition()}

                <label for="${this.#dataAttr.logoScale}" class="body4">${LocalizedString("Size")}</label>
                ${this.#renderScale()}
            </div>
        `;
    }

    #renderPosition() {
        const anchorOptions = LooksUtils.makeAnchorOptions(null, true);
        return `
            <select
                name="${this.#dataAttr.logoPosition}"
                id="${this.#dataAttr.logoPosition}"
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

    #renderScale() {
        return `
            <div class="slider_wrapper">
                <input
                    name="${this.#dataAttr.logoScale}"
                    id="${this.#dataAttr.logoScale}"
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.01"
                    style="--fillAmount: 100%;"
                    class="slider"/>
            </div>
        `;
    }

    /* Event handling */

    /**
     * Triggers an update of the UI when the contents of the logo layer change
     */
    async update() {
        const container = this.container;

        const media = await this.#look.getLogoMedia();
        this.#refreshObservers(media);
        if (!media) {
            container.classList.add("hidden");
            return;
        }

        container.classList.remove("hidden");

        this.#updatePosition(media);
        this.#updateScale(media);
    }

    #updatePosition(media) {
        const anchor = media.anchor;
        const input = this.container.querySelector(
            `select[name="${this.#dataAttr.logoPosition}"]`
        );
        input.value = anchor;
    }

    #updateScale(media) {
        this.updateSliderValue(this.#dataAttr.logoScale, media.scale);
    }
}

class OverlayLayerSettings extends LayerSettings {
    #dataAttr = {
        overlayOpacity: "look-overlay-opacity",
    }

    constructor(look) {
        const container = document.createElement("div");
        super(container);

        this.look = look;

        this.populateContainer(container);
        this.update();
    }

    populateContainer(container) {
        container.innerHTML = `
            <div class="grid grid-cols-2-fit items-center gap-4">
                <label for="${this.#dataAttr.overlayOpacity}" class="body4">${LocalizedString("Opacity")}</label>
                ${this.#renderOpacity()}
            </div>
        `;
    }

    #renderOpacity() {
        return `
            <div class="slider_wrapper">
                <input
                    name="${this.#dataAttr.overlayOpacity}"
                    id="${this.#dataAttr.overlayOpacity}"
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.01"
                    style="--fillAmount: 100%;"
                    class="slider"/>
            </div>
        `;
    }

    /* Event handling */

    /**
     * Triggers an update of the UI when the contents of the overlay layer change
     */
    async update() {
        const container = this.container;

        const look = this.look;
        const media = await look.getOverlayMedia();
        if (!media) {
            container.classList.add("hidden");
            return;
        }

        container.classList.remove("hidden");

        this.#updateOpacity(media);
    }

    async #updateOpacity(media) {
        this.updateSliderValue(this.#dataAttr.overlayOpacity, media.opacity);
    }
}


class PatternLayerSettings extends LayerSettings {

    #dataAttr = {
        patternOpacity: "look-pattern-opacity",
    }

    constructor(look) {
        const container = document.createElement("div");
        super(container);

        this.look = look;

        this.populateContainer(container);
        this.update();
    }

    populateContainer(container) {
        container.innerHTML = `
            <div class="grid grid-cols-2-fit items-center gap-4">
                <label for="${this.#dataAttr.patternOpacity}" class="body4">${LocalizedString("Opacity")}</label>
                ${this.#renderOpacity()}
            </div>
        `;
    }

    #renderOpacity() {
        return `
            <div class="slider_wrapper">
                <input
                    name="${this.#dataAttr.patternOpacity}"
                    id="${this.#dataAttr.patternOpacity}"
                    type="range"
                    min="0.01"
                    max="1"
                    step="0.01"
                    style="--fillAmount: 100%;"
                    class="slider"/>
            </div>
        `;
    }

    /* Event handling */

    /**
     * Triggers an update of the UI when the contents of the pattern layer change
     */
    async update() {
        const container = this.container;

        const look = this.look;
        const media = await look.getPatternMedia();
        if (!media) {
            container.classList.add("hidden");
            return;
        }

        container.classList.remove("hidden");

        this.#updateOpacity(look, media);
    }

    async #updateOpacity(look, media) {
        const value = look.getPatternOpacityForMedia(media);
        this.updateSliderValue(this.#dataAttr.patternOpacity, value);
    }
}
