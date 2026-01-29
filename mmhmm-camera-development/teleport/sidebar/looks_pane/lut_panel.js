//
//  sidebar/looks_pane/lut_panel.js
//  mmhmm
//
//  Created for LUT color grading support.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * LUT Panel - UI for selecting and managing color grade LUTs
 *
 * Displays a grid of available LUTs (built-in and user-imported)
 * with intensity slider and import functionality.
 */
class LUTPanel {

    static id = "lut-panel";

    #cls = {
        panel: "lut-panel",
        header: "lut-panel__header",
        grid: "lut-panel__grid",
        card: "lut-panel__card",
        cardSelected: "lut-panel__card--selected",
        cardBuiltIn: "lut-panel__card--builtin",
        cardUser: "lut-panel__card--user",
        cardNone: "lut-panel__card--none",
        cardThumbnail: "lut-panel__card-thumbnail",
        cardTitle: "lut-panel__card-title",
        cardDelete: "lut-panel__card-delete",
        intensitySection: "lut-panel__intensity",
        importSection: "lut-panel__import",
        dropZone: "lut-panel__drop-zone",
        dropZoneActive: "lut-panel__drop-zone--active",
        slider: "lut-panel__slider",
        hidden: "hidden",
    };

    #dataAttr = {
        header: "header",
        grid: "grid",
        intensitySection: "intensity-section",
        intensitySlider: "intensity-slider",
        intensityValue: "intensity-value",
        importSection: "import-section",
    };

    #actions = {
        selectLUT: "select-lut",
        deleteLUT: "delete-lut",
        importLUT: "import-lut",
        intensityChange: "intensity-change",
    };

    /**
     * @type {HTMLDivElement}
     */
    #container;

    /**
     * @type {LUTFilter|null}
     */
    #filter = null;

    /**
     * @type {string|null}
     */
    #selectedLUTId = null;

    /**
     * @type {Array<LUTInfo>}
     */
    #luts = [];

    /**
     * @type {Function|null}
     */
    #onLUTChange = null;

    /**
     * @type {Function|null}
     */
    #onIntensityChange = null;

    constructor() {
        this.#container = this.#createContainer();
        this.#render();
        this.#addEventListeners();
        this.#loadLUTs();
    }

    get el() {
        return this.#container;
    }

    /* Public API */

    /**
     * Set the LUT filter instance to control
     * @param {LUTFilter} filter
     */
    setFilter(filter) {
        this.#filter = filter;
        if (filter) {
            this.#selectedLUTId = filter.lutId;
            this.#updateIntensitySlider(filter.intensity);
            this.#updateSelection();
        }
    }

    /**
     * Set callback for LUT selection changes
     * @param {Function} callback - Called with (lutInfo, lutData)
     */
    onLUTChange(callback) {
        this.#onLUTChange = callback;
    }

    /**
     * Set callback for intensity changes
     * @param {Function} callback - Called with (intensity)
     */
    onIntensityChange(callback) {
        this.#onIntensityChange = callback;
    }

    /**
     * Refresh the LUT list
     */
    async refresh() {
        await this.#loadLUTs();
    }

    /**
     * Update a LUT card's thumbnail with a live preview image
     * @param {string} lutId - The LUT ID to update
     * @param {HTMLImageElement} img - The thumbnail image
     */
    updateLUTThumbnail(lutId, img) {
        if (!lutId || !img) return;

        const thumbnail = this.#container.querySelector(
            `.${this.#cls.cardThumbnail}[data-lut-id="${lutId}"]`
        );
        if (thumbnail) {
            thumbnail.innerHTML = '';
            thumbnail.style.backgroundImage = `url(${img.src})`;
        }
    }

    /**
     * Select a LUT by ID
     * @param {string|null} lutId
     */
    async selectLUT(lutId) {
        this.#selectedLUTId = lutId;
        this.#updateSelection();

        if (!lutId) {
            if (this.#onLUTChange) {
                this.#onLUTChange(null, null);
            }
            return;
        }

        const lutInfo = await LookLUTs.getLUTInfo(lutId);
        if (lutInfo) {
            const lutData = await LookLUTs.getLUTData(lutInfo);
            if (this.#onLUTChange) {
                this.#onLUTChange(lutInfo, lutData);
            }
        }
    }

    /**
     * Get current intensity value
     * @returns {number}
     */
    getIntensity() {
        const slider = this.#getIntensitySlider();
        return slider ? parseFloat(slider.value) : 1.0;
    }

    /**
     * Set intensity value
     * @param {number} value - 0 to 1
     */
    setIntensity(value) {
        this.#updateIntensitySlider(value);
    }

    /* Event Handling */

    #addEventListeners() {
        // Click handler for cards
        this.#container.addEventListener("click", this.#handleClick.bind(this));

        // Intensity slider
        const slider = this.#getIntensitySlider();
        if (slider) {
            slider.addEventListener("input", this.#handleIntensityChange.bind(this));
        }

        // Drag and drop
        this.#container.addEventListener("dragover", this.#handleDragOver.bind(this));
        this.#container.addEventListener("dragleave", this.#handleDragLeave.bind(this));
        this.#container.addEventListener("drop", this.#handleDrop.bind(this));

        // File input
        const fileInput = this.#container.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener("change", this.#handleFileSelect.bind(this));
        }
    }

    #handleClick(ev) {
        const target = ev.target;

        // Check for delete button
        const deleteBtn = target.closest(`[data-action="${this.#actions.deleteLUT}"]`);
        if (deleteBtn) {
            ev.stopPropagation();
            const lutId = deleteBtn.dataset.lutId;
            this.#handleDeleteLUT(lutId);
            return;
        }

        // Check for LUT card selection
        const card = target.closest(`[data-action="${this.#actions.selectLUT}"]`);
        if (card) {
            const lutId = card.dataset.lutId || null;
            this.selectLUT(lutId);
            return;
        }

        // Check for import button
        const importBtn = target.closest(`[data-action="${this.#actions.importLUT}"]`);
        if (importBtn) {
            this.#triggerFileInput();
            return;
        }
    }

    #handleIntensityChange(ev) {
        const value = parseFloat(ev.target.value);
        ev.target.style.setProperty('--fillAmount', `${value * 100}%`);
        this.#updateIntensityValue(value);

        if (this.#onIntensityChange) {
            this.#onIntensityChange(value);
        }
    }

    #handleDragOver(ev) {
        ev.preventDefault();
        const dropZone = this.#container.querySelector(`.${this.#cls.dropZone}`);
        if (dropZone) {
            dropZone.classList.add(this.#cls.dropZoneActive);
        }
    }

    #handleDragLeave(ev) {
        const dropZone = this.#container.querySelector(`.${this.#cls.dropZone}`);
        if (dropZone && !dropZone.contains(ev.relatedTarget)) {
            dropZone.classList.remove(this.#cls.dropZoneActive);
        }
    }

    async #handleDrop(ev) {
        ev.preventDefault();
        const dropZone = this.#container.querySelector(`.${this.#cls.dropZone}`);
        if (dropZone) {
            dropZone.classList.remove(this.#cls.dropZoneActive);
        }

        const files = ev.dataTransfer?.files;
        if (files && files.length > 0) {
            await this.#importFiles(files);
        }
    }

    async #handleFileSelect(ev) {
        const files = ev.target.files;
        if (files && files.length > 0) {
            await this.#importFiles(files);
        }
        // Reset the input so the same file can be selected again
        ev.target.value = "";
    }

    async #handleDeleteLUT(lutId) {
        if (!lutId) return;

        const success = await LookLUTs.deleteLUT(lutId);
        if (success) {
            // If we deleted the selected LUT, clear selection
            if (this.#selectedLUTId === lutId) {
                await this.selectLUT(null);
            }
            await this.#loadLUTs();
        }
    }

    #triggerFileInput() {
        const fileInput = this.#container.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.click();
        }
    }

    async #importFiles(files) {
        for (const file of files) {
            if (LookLUTs.isSupported(file)) {
                try {
                    const lutInfo = await LookLUTs.importLUT(file);
                    await this.#loadLUTs();
                    // Select the newly imported LUT
                    await this.selectLUT(lutInfo.id);
                } catch (err) {
                    console.error("Failed to import LUT:", err);
                }
            }
        }
    }

    /* Data Loading */

    async #loadLUTs() {
        this.#luts = await LookLUTs.getAllLUTs();
        this.#renderGrid();
        this.#updateSelection();
    }

    /* UI Construction */

    #createContainer() {
        const container = document.createElement("div");
        container.classList.add(this.#cls.panel);
        container.dataset.id = LUTPanel.id;
        return container;
    }

    #render() {
        const extensions = LookLUTs.supportedExtensions.map(e => `.${e}`).join(",");

        this.#container.innerHTML = `
            <div class="${this.#cls.header}" data-id="${this.#dataAttr.header}">
                <span class="text-sm font-medium">${LocalizedString("Color Grades")}</span>
                <button class="ghost_button" data-action="${this.#actions.importLUT}">
                    <span class="icon icon-plus"></span>
                    ${LocalizedString("Import")}
                </button>
            </div>

            <div class="${this.#cls.intensitySection}" data-id="${this.#dataAttr.intensitySection}">
                <label class="text-xs text-secondary">
                    ${LocalizedString("Intensity")}
                    <span data-id="${this.#dataAttr.intensityValue}">100%</span>
                </label>
                <input
                    type="range"
                    class="${this.#cls.slider}"
                    data-id="${this.#dataAttr.intensitySlider}"
                    min="0"
                    max="1"
                    step="0.01"
                    value="1"
                />
            </div>

            <div class="${this.#cls.dropZone}">
                <div class="${this.#cls.grid}" data-id="${this.#dataAttr.grid}">
                    <!-- LUT cards rendered here -->
                </div>
                <div class="drop-overlay">
                    <span class="icon icon-upload"></span>
                    <span>${LocalizedString("Drop LUT file here")}</span>
                </div>
            </div>

            <input
                type="file"
                accept="${extensions}"
                multiple
                class="${this.#cls.hidden}"
            />
        `;
    }

    #renderGrid() {
        const grid = this.#container.querySelector(`[data-id="${this.#dataAttr.grid}"]`);
        if (!grid) return;

        // Clear existing cards
        grid.innerHTML = "";

        // Add "None" option
        const noneCard = this.#createCard(null, LocalizedString("None"), null, false);
        grid.appendChild(noneCard);

        // Add LUT cards
        for (const lut of this.#luts) {
            const card = this.#createCard(lut.id, lut.title, lut.thumbnailUrl, !lut.isBuiltIn);
            grid.appendChild(card);
        }
    }

    #createCard(lutId, title, thumbnailUrl, canDelete) {
        const card = document.createElement("div");
        card.classList.add(this.#cls.card);
        card.dataset.action = this.#actions.selectLUT;
        card.dataset.lutId = lutId || "";

        if (!lutId) {
            card.classList.add(this.#cls.cardNone);
        }

        const thumbnail = document.createElement("div");
        thumbnail.classList.add(this.#cls.cardThumbnail);
        thumbnail.dataset.lutId = lutId || "";
        if (thumbnailUrl) {
            thumbnail.style.backgroundImage = `url(${thumbnailUrl})`;
        } else if (!lutId) {
            thumbnail.innerHTML = `<span class="icon icon-cancel"></span>`;
        } else {
            // Placeholder for LUTs without thumbnails
            thumbnail.innerHTML = `<span class="icon icon-color-palette"></span>`;
        }
        card.appendChild(thumbnail);

        const titleEl = document.createElement("span");
        titleEl.classList.add(this.#cls.cardTitle);
        titleEl.textContent = title;
        card.appendChild(titleEl);

        if (canDelete) {
            const deleteBtn = document.createElement("button");
            deleteBtn.classList.add(this.#cls.cardDelete);
            deleteBtn.dataset.action = this.#actions.deleteLUT;
            deleteBtn.dataset.lutId = lutId;
            deleteBtn.innerHTML = `<span class="icon icon-trash"></span>`;
            deleteBtn.title = LocalizedString("Delete");
            card.appendChild(deleteBtn);
        }

        return card;
    }

    /* UI Updates */

    #updateSelection() {
        const cards = this.#container.querySelectorAll(`.${this.#cls.card}`);
        for (const card of cards) {
            const cardLutId = card.dataset.lutId || null;
            const isSelected = cardLutId === this.#selectedLUTId || (!cardLutId && !this.#selectedLUTId);
            card.classList.toggle(this.#cls.cardSelected, isSelected);
        }

        // Show/hide intensity section based on selection
        const intensitySection = this.#container.querySelector(`[data-id="${this.#dataAttr.intensitySection}"]`);
        if (intensitySection) {
            intensitySection.classList.toggle(this.#cls.hidden, !this.#selectedLUTId);
        }
    }

    #updateIntensitySlider(value) {
        const slider = this.#getIntensitySlider();
        if (slider) {
            slider.value = value;
            slider.style.setProperty('--fillAmount', `${value * 100}%`);
        }
        this.#updateIntensityValue(value);
    }

    #updateIntensityValue(value) {
        const valueEl = this.#container.querySelector(`[data-id="${this.#dataAttr.intensityValue}"]`);
        if (valueEl) {
            valueEl.textContent = `${Math.round(value * 100)}%`;
        }
    }

    /* UI Accessors */

    #getIntensitySlider() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.intensitySlider}"]`);
    }
}
