//
//  sidebar/looks_pane/idle/widgets/lut_widget.js
//  mmhmm
//
//  Created for LUT color grading support.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * The idle panel widget for LUT color grading and image tuning.
 * Allows users to select and apply color grade LUTs to their video feed,
 * and adjust image correction parameters (exposure, contrast, saturation, temperature).
 *
 * Contains two tabs:
 * - LUTs: Creative color grading
 * - Tune: Technical image corrections
 */
class LUTWidget {

    #cls = {
        widget: "looks-widget",
        card: "lut-widget__card",
        cardSelected: "lut-widget__card--selected",
        cardThumbnail: "lut-widget__card-thumbnail",
        cardTitle: "lut-widget__card-title",
        cardDelete: "lut-widget__card-delete",
        grid: "lut-widget__grid",
        slider: "lut-widget__slider",
        tabs: "lut-widget__tabs",
        tab: "lut-widget__tab",
        tabActive: "lut-widget__tab--active",
        tabContent: "lut-widget__tab-content",
        hidden: "hidden",
    };

    #dataAttr = {
        grid: "lut-grid",
        intensitySlider: "intensity-slider",
        intensityValue: "intensity-value",
        intensitySection: "intensity-section",
        tabContent: "tab-content",
        tuneContainer: "tune-container",
        alphaModeSelect: "alpha-mode-select",
        alphaModeWarning: "alpha-mode-warning",
    };

    #actions = {
        close: "close-widget",
        selectLUT: "select-lut",
        deleteLUT: "delete-lut",
        importLUT: "import-lut",
        switchTab: "switch-tab",
    };

    #defaultKeySelectedLUT = "selectedLUTId";
    #defaultKeyLUTIntensity = "lutIntensity";
    #defaultKeyLUTAlphaMode = "lutAlphaMode";

    /**
     * @type {HTMLDivElement}
     */
    #container;

    /**
     * @type {string|null}
     */
    #selectedLUTId = null;

    /**
     * @type {number}
     */
    #selectedAlphaMode = 0;

    /**
     * @type {boolean}
     */
    #isSegmentationActive = false;

    /**
     * @type {Array<LUTInfo>}
     */
    #luts = [];

    /**
     * @type {'luts'|'tune'}
     */
    #currentTab = "luts";

    /**
     * @type {TunePanel|null}
     */
    #tunePanel = null;

    /**
     * @type {Function|null}
     */
    #onLUTSelected = null;

    /**
     * @type {Function|null}
     */
    #onIntensityChanged = null;

    /**
     * @type {Function|null}
     */
    #onLUTImported = null;

    /**
     * @type {Function|null}
     */
    #onTuneChanged = null;

    /**
     * @type {Function|null}
     */
    #onAlphaModeChanged = null;

    constructor() {
        this.#container = this.#createContainer();
        this.#render();
        this.#setupTunePanel();
        this.#addEventListeners();
        this.#loadLUTs();

        // Restore saved state
        this.#selectedLUTId = SharedUserDefaults.getValueForKey(this.#defaultKeySelectedLUT, null);
    }

    get el() {
        return this.#container;
    }

    /* Event handling */

    #addEventListeners() {
        // Click handler
        this.#container.addEventListener("click", this.#handleClick.bind(this));

        // Intensity slider
        const slider = this.#getIntensitySlider();
        if (slider) {
            slider.addEventListener("input", this.#handleIntensityChange.bind(this));
        }

        // Alpha mode select
        const alphaModeSelect = this.#container.querySelector(`[data-id="${this.#dataAttr.alphaModeSelect}"]`);
        if (alphaModeSelect) {
            alphaModeSelect.addEventListener("change", this.#handleAlphaModeChange.bind(this));
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

        // Close button
        const closeBtn = target.closest(`[data-action="${this.#actions.close}"]`);
        if (closeBtn) {
            this.hide();
            return;
        }

        // Tab switch
        const tabBtn = target.closest(`[data-action="${this.#actions.switchTab}"]`);
        if (tabBtn) {
            const tab = tabBtn.dataset.tab;
            this.#switchTab(tab);
            return;
        }

        // Delete button
        const deleteBtn = target.closest(`[data-action="${this.#actions.deleteLUT}"]`);
        if (deleteBtn) {
            ev.stopPropagation();
            const lutId = deleteBtn.dataset.lutId;
            this.#handleDeleteLUT(lutId);
            return;
        }

        // LUT card selection
        const card = target.closest(`[data-action="${this.#actions.selectLUT}"]`);
        if (card) {
            const lutId = card.dataset.lutId || null;
            this.#selectLUT(lutId);
            return;
        }

        // Import button
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

        // Save the value
        SharedUserDefaults.setValueForKey(value, this.#defaultKeyLUTIntensity);

        if (this.#onIntensityChanged) {
            this.#onIntensityChanged(value);
        }
    }

    #handleAlphaModeChange(ev) {
        const value = parseInt(ev.target.value);
        this.#selectedAlphaMode = value;

        // Save the value
        SharedUserDefaults.setValueForKey(value, this.#defaultKeyLUTAlphaMode);

        // Update warning visibility
        this.#updateAlphaModeWarning();

        if (this.#onAlphaModeChanged) {
            this.#onAlphaModeChanged(value);
        }
    }

    #handleDragOver(ev) {
        ev.preventDefault();
        this.#container.classList.add("drop-active");
    }

    #handleDragLeave(ev) {
        if (!this.#container.contains(ev.relatedTarget)) {
            this.#container.classList.remove("drop-active");
        }
    }

    async #handleDrop(ev) {
        ev.preventDefault();
        this.#container.classList.remove("drop-active");

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
        ev.target.value = "";
    }

    async #handleDeleteLUT(lutId) {
        if (!lutId) return;

        const success = await LookLUTs.deleteLUT(lutId);
        if (success) {
            if (this.#selectedLUTId === lutId) {
                await this.#selectLUT(null);
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
                    await this.#selectLUT(lutInfo.id);
                    // Notify listeners about the new LUT for thumbnail generation
                    if (this.#onLUTImported) {
                        this.#onLUTImported(lutInfo);
                    }
                } catch (err) {
                    console.error("Failed to import LUT:", err);
                }
            }
        }
    }

    async #selectLUT(lutId) {
        console.log('[LUTWidget] selectLUT:', { lutId });
        this.#selectedLUTId = lutId;
        this.#updateSelection();
        this.#updateIntensitySectionVisibility();

        // Save the selection
        SharedUserDefaults.setValueForKey(lutId, this.#defaultKeySelectedLUT);

        if (this.#onLUTSelected) {
            if (!lutId) {
                this.#onLUTSelected(null, null);
            } else {
                const lutInfo = await LookLUTs.getLUTInfo(lutId);
                if (lutInfo) {
                    const lutData = await LookLUTs.getLUTData(lutInfo);
                    this.#onLUTSelected(lutInfo, lutData);
                }
            }
        }
    }

    #switchTab(tab) {
        if (tab === this.#currentTab) return;

        this.#currentTab = tab;
        this.#updateTabUI();
    }

    /* Public API */

    isVisible() {
        return !this.#container.classList.contains(this.#cls.hidden);
    }

    show() {
        this.#container.classList.remove(this.#cls.hidden);
    }

    hide() {
        this.#container.classList.add(this.#cls.hidden);
    }

    /**
     * Set callback for LUT selection changes
     * @param {Function} callback - Called with (lutInfo, lutData)
     */
    onLUTSelected(callback) {
        this.#onLUTSelected = callback;
    }

    /**
     * Set callback for intensity changes
     * @param {Function} callback - Called with (intensity)
     */
    onIntensityChanged(callback) {
        this.#onIntensityChanged = callback;
    }

    /**
     * Set callback for when a LUT is imported
     * @param {Function} callback - Called with (lutInfo)
     */
    onLUTImported(callback) {
        this.#onLUTImported = callback;
    }

    /**
     * Set callback for tune value changes
     * @param {Function} callback - Called with ({ exposure, contrast, saturation, temperature })
     */
    onTuneChanged(callback) {
        this.#onTuneChanged = callback;
    }

    /**
     * Set callback for alpha mode changes
     * @param {Function} callback - Called with (alphaMode: 0|1|2)
     */
    onAlphaModeChanged(callback) {
        this.#onAlphaModeChanged = callback;
    }

    /**
     * Get current alpha mode
     * @returns {number} 0=All, 1=Foreground, 2=Background
     */
    getAlphaMode() {
        return this.#selectedAlphaMode;
    }

    /**
     * Set alpha mode
     * @param {number} value 0=All, 1=Foreground, 2=Background
     */
    setAlphaMode(value) {
        this.#selectedAlphaMode = value;
        const select = this.#container.querySelector(`[data-id="${this.#dataAttr.alphaModeSelect}"]`);
        if (select) {
            select.value = value;
        }
        this.#updateAlphaModeWarning();
    }

    /**
     * Set whether segmentation is currently active
     * @param {boolean} active
     */
    setSegmentationActive(active) {
        this.#isSegmentationActive = active;
        this.#updateAlphaModeWarning();

        // Also update the TunePanel
        if (this.#tunePanel) {
            this.#tunePanel.setSegmentationActive(active);
        }
    }

    /**
     * Get current selected LUT ID
     * @returns {string|null}
     */
    getSelectedLUTId() {
        return this.#selectedLUTId;
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
     * @param {number} value
     */
    setIntensity(value) {
        const slider = this.#getIntensitySlider();
        if (slider) {
            slider.value = value;
            slider.style.setProperty('--fillAmount', `${value * 100}%`);
        }
        this.#updateIntensityValue(value);
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
     * Restore saved LUT selection
     * @returns {Promise<{lutInfo, lutData}|null>}
     */
    async restoreSavedSelection() {
        const savedLUTId = SharedUserDefaults.getValueForKey(this.#defaultKeySelectedLUT, null);
        const savedIntensity = SharedUserDefaults.getValueForKey(this.#defaultKeyLUTIntensity, 1.0);
        const savedAlphaMode = SharedUserDefaults.getValueForKey(this.#defaultKeyLUTAlphaMode, 0);

        console.log('[LUTWidget] restoreSavedSelection started:', { savedLUTId, savedIntensity, savedAlphaMode });

        this.setIntensity(savedIntensity);
        this.setAlphaMode(savedAlphaMode);

        if (savedLUTId) {
            const lutInfo = await LookLUTs.getLUTInfo(savedLUTId);
            console.log('[LUTWidget] getLUTInfo result:', { found: !!lutInfo });

            if (lutInfo) {
                this.#selectedLUTId = savedLUTId;
                this.#updateSelection();
                this.#updateIntensitySectionVisibility();
                const lutData = await LookLUTs.getLUTData(lutInfo);
                console.log('[LUTWidget] restoreSavedSelection complete:', {
                    lutId: savedLUTId,
                    alphaMode: savedAlphaMode,
                    hasLutData: !!lutData
                });
                return { lutInfo, lutData, alphaMode: savedAlphaMode };
            }
        }

        console.log('[LUTWidget] restoreSavedSelection: No saved LUT');
        return null;
    }

    /**
     * Get current tune values
     * @returns {Object}
     */
    getTuneValues() {
        return this.#tunePanel ? this.#tunePanel.getValues() : { exposure: 0, contrast: 0, saturation: 0, temperature: 0 };
    }

    /**
     * Check if tune panel has any adjustments
     * @returns {boolean}
     */
    hasTuneAdjustments() {
        return this.#tunePanel ? this.#tunePanel.hasAdjustments() : false;
    }

    /**
     * Reset tune values
     */
    resetTune() {
        if (this.#tunePanel) {
            this.#tunePanel.reset();
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
        container.classList.add(this.#cls.widget, this.#cls.hidden);
        container.dataset.id = "lut-widget";
        return container;
    }

    #render() {
        const extensions = LookLUTs.supportedExtensions.map(e => `.${e}`).join(",");

        this.#container.innerHTML = `
            <div class="w-full h-4-5 flex items-center gap-4 justify-between fill-primary">
                <div class="flex items-center gap-4 overflow-hidden text-content-primary body2">
                    <div class="indicator">
                        <div class="round">${AppIcons.SettingsSliders().outerHTML}</div>
                    </div>
                    ${LocalizedString("Color Grades")}
                </div>
                <div class="flex items-center gap-1">
                    <button
                        class="icon-button ${this.#currentTab === 'tune' ? this.#cls.hidden : ''}"
                        aria-label="${LocalizedString("Import")}"
                        data-action="${this.#actions.importLUT}"
                        data-id="import-btn">
                        ${AppIcons.Plus().outerHTML}
                    </button>
                    <button
                        class="icon-button"
                        aria-label="${LocalizedString("Close")}"
                        data-action="${this.#actions.close}">
                        ${AppIcons.Close().outerHTML}
                    </button>
                </div>
            </div>

            <div class="${this.#cls.tabs}">
                <button class="${this.#cls.tab} ${this.#currentTab === 'luts' ? this.#cls.tabActive : ''}"
                        data-action="${this.#actions.switchTab}"
                        data-tab="luts">
                    ${LocalizedString("LUTs")}
                </button>
                <button class="${this.#cls.tab} ${this.#currentTab === 'tune' ? this.#cls.tabActive : ''}"
                        data-action="${this.#actions.switchTab}"
                        data-tab="tune">
                    ${LocalizedString("Tune")}
                </button>
            </div>

            <div class="${this.#cls.tabContent}" data-${this.#dataAttr.tabContent}="luts">
                <div class="flex flex-col gap-1 w-full ${this.#cls.hidden}" data-id="${this.#dataAttr.intensitySection}">
                    <div class="flex justify-between items-center">
                        <span class="text-xs text-secondary">${LocalizedString("Intensity")}</span>
                        <span class="text-xs text-secondary" data-id="${this.#dataAttr.intensityValue}">100%</span>
                    </div>
                    <input
                        type="range"
                        class="${this.#cls.slider}"
                        data-id="${this.#dataAttr.intensitySlider}"
                        min="0"
                        max="1"
                        step="0.01"
                        value="1"
                    />

                    <div class="flex justify-between items-center mt-2">
                        <span class="text-xs text-secondary">${LocalizedString("Apply To")}</span>
                        <select class="select text-xs" data-id="${this.#dataAttr.alphaModeSelect}">
                            <option value="0" selected>${LocalizedString("All")}</option>
                            <option value="1">${LocalizedString("Foreground")}</option>
                            <option value="2">${LocalizedString("Background")}</option>
                        </select>
                    </div>
                    <div class="text-xs text-secondary ${this.#cls.hidden}" data-id="${this.#dataAttr.alphaModeWarning}">
                        ${LocalizedString("Segmentation enabled for this mode")}
                    </div>
                </div>

                <div class="${this.#cls.grid}" data-id="${this.#dataAttr.grid}">
                    <!-- LUT cards rendered here -->
                </div>
            </div>

            <div class="${this.#cls.tabContent} ${this.#cls.hidden}" data-${this.#dataAttr.tabContent}="tune">
                <div data-id="${this.#dataAttr.tuneContainer}">
                    <!-- TunePanel inserted here -->
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

    #setupTunePanel() {
        // Create TunePanel instance
        this.#tunePanel = new TunePanel();

        // Insert into container
        const tuneContainer = this.#container.querySelector(`[data-id="${this.#dataAttr.tuneContainer}"]`);
        if (tuneContainer) {
            tuneContainer.appendChild(this.#tunePanel.el);
        }

        // Wire up callback
        this.#tunePanel.onTuneChanged((values) => {
            if (this.#onTuneChanged) {
                this.#onTuneChanged(values);
            }
        });
    }

    #renderGrid() {
        const grid = this.#container.querySelector(`[data-id="${this.#dataAttr.grid}"]`);
        if (!grid) return;

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

        const thumbnail = document.createElement("div");
        thumbnail.classList.add(this.#cls.cardThumbnail);
        thumbnail.dataset.lutId = lutId || "";
        if (thumbnailUrl) {
            thumbnail.style.backgroundImage = `url(${thumbnailUrl})`;
        } else if (!lutId) {
            thumbnail.innerHTML = `<span class="icon icon-cancel"></span>`;
        } else {
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
    }

    #updateIntensitySectionVisibility() {
        const section = this.#container.querySelector(`[data-id="${this.#dataAttr.intensitySection}"]`);
        if (section) {
            section.classList.toggle(this.#cls.hidden, !this.#selectedLUTId);
        }
    }

    #updateIntensityValue(value) {
        const valueEl = this.#container.querySelector(`[data-id="${this.#dataAttr.intensityValue}"]`);
        if (valueEl) {
            valueEl.textContent = `${Math.round(value * 100)}%`;
        }
    }

    #updateAlphaModeWarning() {
        const info = this.#container.querySelector(`[data-id="${this.#dataAttr.alphaModeWarning}"]`);
        if (info) {
            // Show info when foreground/background mode is selected
            // Segmentation auto-enables for these modes
            const showInfo = this.#selectedAlphaMode !== 0;
            info.classList.toggle(this.#cls.hidden, !showInfo);
        }
    }

    #updateTabUI() {
        // Update tab buttons
        const tabBtns = this.#container.querySelectorAll(`.${this.#cls.tab}`);
        for (const btn of tabBtns) {
            const isActive = btn.dataset.tab === this.#currentTab;
            btn.classList.toggle(this.#cls.tabActive, isActive);
        }

        // Update tab content visibility
        const tabContents = this.#container.querySelectorAll(`.${this.#cls.tabContent}`);
        for (const content of tabContents) {
            const contentTab = content.dataset.tabContent;
            const isActive = contentTab === this.#currentTab;
            content.classList.toggle(this.#cls.hidden, !isActive);
        }

        // Show/hide import button based on tab
        const importBtn = this.#container.querySelector('[data-id="import-btn"]');
        if (importBtn) {
            importBtn.classList.toggle(this.#cls.hidden, this.#currentTab === 'tune');
        }
    }

    /* UI Accessors */

    #getIntensitySlider() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.intensitySlider}"]`);
    }
}
