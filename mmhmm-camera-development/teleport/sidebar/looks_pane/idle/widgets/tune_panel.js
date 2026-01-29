//
//  sidebar/looks_pane/idle/widgets/tune_panel.js
//  mmhmm
//
//  Created for image correction support.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Tune Panel - Image correction controls
 *
 * Provides 4 sliders for technical image corrections:
 * - Exposure: Brightness adjustment in EV stops
 * - Contrast: S-curve contrast
 * - Saturation: Color intensity
 * - Temperature: Warm/cool white balance
 *
 * Features:
 * - Sliders display -100 to +100, store -1 to +1 internally
 * - Per-slider reset buttons
 * - Keyboard nudging: Arrow keys ±1, Shift+Arrow ±10
 * - Value display with ± format
 * - Persistence via SharedUserDefaults
 * - Reset All button
 */
class TunePanel {

    #cls = {
        panel: "tune-panel",
        control: "tune-panel__control",
        labelRow: "tune-panel__label-row",
        label: "tune-panel__label",
        value: "tune-panel__value",
        resetSingle: "tune-panel__reset-single",
        slider: "tune-panel__slider",
        resetAll: "tune-panel__reset-all",
        alphaModeSelect: "tune-panel__alpha-mode-select",
        alphaModeWarning: "tune-panel__alpha-mode-warning",
        hidden: "hidden",
    };

    #defaultKeys = {
        exposure: "tuneExposure",
        contrast: "tuneContrast",
        saturation: "tuneSaturation",
        temperature: "tuneTemperature",
        alphaMode: "tuneAlphaMode",
    };

    #controls = [
        { name: "exposure", label: LocalizedString("Exposure") },
        { name: "contrast", label: LocalizedString("Contrast") },
        { name: "saturation", label: LocalizedString("Saturation") },
        { name: "temperature", label: LocalizedString("Temperature") },
    ];

    /**
     * @type {HTMLDivElement}
     */
    #container;

    /**
     * @type {Object}
     */
    #values = {
        exposure: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
        alphaMode: 0,
    };

    /**
     * @type {boolean}
     */
    #isSegmentationActive = false;

    /**
     * @type {Function|null}
     */
    #onTuneChanged = null;

    constructor() {
        this.#container = this.#createContainer();
        this.#render();
        this.#addEventListeners();
        this.#restoreSavedValues();
    }

    get el() {
        return this.#container;
    }

    /* Event handling */

    #addEventListeners() {
        // Slider input events
        this.#container.addEventListener("input", this.#handleInput.bind(this));

        // Click events for reset buttons
        this.#container.addEventListener("click", this.#handleClick.bind(this));

        // Keyboard events for fine control
        this.#container.addEventListener("keydown", this.#handleKeydown.bind(this));

        // Alpha mode select events
        this.#container.addEventListener("change", this.#handleChange.bind(this));
    }

    #handleChange(ev) {
        if (ev.target.matches(`.${this.#cls.alphaModeSelect}`)) {
            this.#handleAlphaModeChange(ev.target);
        }
    }

    #handleAlphaModeChange(select) {
        const value = parseInt(select.value);
        this.#values.alphaMode = value;

        // Update warning visibility
        this.#updateAlphaModeWarning();

        // Save value
        const defaultKey = this.#defaultKeys.alphaMode;
        if (defaultKey) {
            SharedUserDefaults.setValueForKey(value, defaultKey);
        }

        // Notify listeners
        this.#notifyChange();
    }

    #handleInput(ev) {
        if (ev.target.matches(`.${this.#cls.slider}`)) {
            this.#handleSliderChange(ev.target);
        }
    }

    #handleClick(ev) {
        const target = ev.target;

        // Per-slider reset button
        const resetSingle = target.closest(`.${this.#cls.resetSingle}`);
        if (resetSingle) {
            const param = resetSingle.dataset.param;
            this.#resetSingleValue(param);
            return;
        }

        // Reset All button
        const resetAll = target.closest(`.${this.#cls.resetAll}`);
        if (resetAll) {
            this.#resetAllValues();
            return;
        }
    }

    #handleKeydown(ev) {
        if (!ev.target.matches(`.${this.#cls.slider}`)) return;

        const slider = ev.target;
        const step = ev.shiftKey ? 10 : 1;

        if (ev.key === "ArrowRight" || ev.key === "ArrowUp") {
            slider.value = Math.min(100, parseInt(slider.value) + step);
            this.#handleSliderChange(slider);
            ev.preventDefault();
        } else if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") {
            slider.value = Math.max(-100, parseInt(slider.value) - step);
            this.#handleSliderChange(slider);
            ev.preventDefault();
        }
    }

    #handleSliderChange(slider) {
        const name = slider.dataset.slider;
        const displayValue = parseInt(slider.value);

        // Convert display value (-100 to +100) to internal value (-1 to +1)
        const internalValue = displayValue / 100;
        this.#values[name] = internalValue;

        // Update UI
        this.#updateValueDisplay(name, displayValue);
        this.#updateSliderFill(slider, displayValue);
        this.#updateResetButtonVisibility(name, displayValue);

        // Save value
        const defaultKey = this.#defaultKeys[name];
        if (defaultKey) {
            SharedUserDefaults.setValueForKey(internalValue, defaultKey);
        }

        // Notify listeners
        this.#notifyChange();
    }

    /* Public API */

    /**
     * Set callback for tune value changes
     * @param {Function} callback - Called with ({ exposure, contrast, saturation, temperature })
     */
    onTuneChanged(callback) {
        this.#onTuneChanged = callback;
    }

    /**
     * Get current tune values (internal -1 to +1 range)
     * @returns {Object}
     */
    getValues() {
        return { ...this.#values };
    }

    /**
     * Set tune values (internal -1 to +1 range)
     * @param {Object} values
     */
    setValues(values) {
        for (const name of Object.keys(this.#values)) {
            if (values[name] !== undefined) {
                this.#values[name] = values[name];
                this.#updateControlUI(name);
            }
        }
    }

    /**
     * Check if any adjustments have been made
     * @returns {boolean}
     */
    hasAdjustments() {
        return Object.values(this.#values).some(v => v !== 0);
    }

    /**
     * Reset all values to defaults
     */
    reset() {
        this.#resetAllValues();
    }

    /**
     * Set whether segmentation is currently active
     * @param {boolean} active
     */
    setSegmentationActive(active) {
        this.#isSegmentationActive = active;
        this.#updateAlphaModeWarning();
    }

    /**
     * Get current alpha mode
     * @returns {number} 0=All, 1=Foreground, 2=Background
     */
    getAlphaMode() {
        return this.#values.alphaMode;
    }

    /**
     * Set alpha mode
     * @param {number} value 0=All, 1=Foreground, 2=Background
     */
    setAlphaMode(value) {
        this.#values.alphaMode = value;
        const select = this.#container.querySelector(`.${this.#cls.alphaModeSelect}`);
        if (select) {
            select.value = value;
        }
        this.#updateAlphaModeWarning();
    }

    /* UI Construction */

    #createContainer() {
        const container = document.createElement("div");
        container.classList.add(this.#cls.panel);
        return container;
    }

    #render() {
        let html = "";

        // Create slider controls
        for (const control of this.#controls) {
            html += this.#createSliderHTML(control.name, control.label);
        }

        // Add Apply To selector
        html += `
            <div class="${this.#cls.control}">
                <div class="${this.#cls.labelRow}">
                    <span class="${this.#cls.label}">${LocalizedString("Apply To")}</span>
                    <select class="${this.#cls.alphaModeSelect}">
                        <option value="0" selected>${LocalizedString("All")}</option>
                        <option value="1">${LocalizedString("Foreground")}</option>
                        <option value="2">${LocalizedString("Background")}</option>
                    </select>
                </div>
                <div class="${this.#cls.alphaModeWarning} ${this.#cls.hidden}">
                    ${LocalizedString("Segmentation enabled for this mode")}
                </div>
            </div>
        `;

        // Add Reset All button
        html += `
            <button class="${this.#cls.resetAll}">
                ${LocalizedString("Reset All")}
            </button>
        `;

        this.#container.innerHTML = html;
    }

    #createSliderHTML(name, label) {
        return `
            <div class="${this.#cls.control}" data-control="${name}">
                <div class="${this.#cls.labelRow}">
                    <span class="${this.#cls.label}">${label}</span>
                    <span class="${this.#cls.value}" data-value="${name}">0</span>
                    <button class="${this.#cls.resetSingle} ${this.#cls.hidden}"
                            data-param="${name}"
                            title="${LocalizedString("Reset")} ${label}"
                            aria-label="${LocalizedString("Reset")} ${label}">&#x21BA;</button>
                </div>
                <input type="range"
                       class="${this.#cls.slider}"
                       data-slider="${name}"
                       min="-100"
                       max="100"
                       value="0"
                       step="1"
                       aria-label="${label}" />
            </div>
        `;
    }

    /* UI Updates */

    #updateControlUI(name) {
        const internalValue = this.#values[name];
        const displayValue = Math.round(internalValue * 100);

        const slider = this.#container.querySelector(`[data-slider="${name}"]`);
        if (slider) {
            slider.value = displayValue;
            this.#updateSliderFill(slider, displayValue);
        }

        this.#updateValueDisplay(name, displayValue);
        this.#updateResetButtonVisibility(name, displayValue);
    }

    #updateValueDisplay(name, displayValue) {
        const valueEl = this.#container.querySelector(`[data-value="${name}"]`);
        if (valueEl) {
            // Show + prefix for positive values
            const prefix = displayValue > 0 ? "+" : "";
            valueEl.textContent = `${prefix}${displayValue}`;
        }
    }

    #updateSliderFill(slider, displayValue) {
        // Calculate fill percentage from center (50%)
        // -100 = 0%, 0 = 50%, +100 = 100%
        const fillPercent = ((displayValue + 100) / 200) * 100;
        slider.style.setProperty("--fillPercent", `${fillPercent}%`);
    }

    #updateResetButtonVisibility(name, displayValue) {
        const resetBtn = this.#container.querySelector(
            `.${this.#cls.resetSingle}[data-param="${name}"]`
        );
        if (resetBtn) {
            resetBtn.classList.toggle(this.#cls.hidden, displayValue === 0);
        }
    }

    #updateAlphaModeWarning() {
        const info = this.#container.querySelector(`.${this.#cls.alphaModeWarning}`);
        if (info) {
            // Show info when foreground/background mode is selected
            // Segmentation auto-enables for these modes
            const showInfo = this.#values.alphaMode !== 0;
            info.classList.toggle(this.#cls.hidden, !showInfo);
        }
    }

    #resetSingleValue(name) {
        this.#values[name] = 0;
        this.#updateControlUI(name);

        // Save value
        const defaultKey = this.#defaultKeys[name];
        if (defaultKey) {
            SharedUserDefaults.setValueForKey(0, defaultKey);
        }

        // Notify listeners
        this.#notifyChange();
    }

    #resetAllValues() {
        // Reset slider values
        for (const control of this.#controls) {
            this.#values[control.name] = 0;
            this.#updateControlUI(control.name);

            // Save value
            const defaultKey = this.#defaultKeys[control.name];
            if (defaultKey) {
                SharedUserDefaults.setValueForKey(0, defaultKey);
            }
        }

        // Reset alpha mode
        this.#values.alphaMode = 0;
        const alphaModeSelect = this.#container.querySelector(`.${this.#cls.alphaModeSelect}`);
        if (alphaModeSelect) {
            alphaModeSelect.value = 0;
        }
        SharedUserDefaults.setValueForKey(0, this.#defaultKeys.alphaMode);
        this.#updateAlphaModeWarning();

        // Notify listeners
        this.#notifyChange();
    }

    #restoreSavedValues() {
        // Restore slider values
        for (const control of this.#controls) {
            const defaultKey = this.#defaultKeys[control.name];
            if (defaultKey) {
                const savedValue = SharedUserDefaults.getValueForKey(defaultKey, 0);
                this.#values[control.name] = savedValue;
                this.#updateControlUI(control.name);
            }
        }

        // Restore alpha mode
        const savedAlphaMode = SharedUserDefaults.getValueForKey(this.#defaultKeys.alphaMode, 0);
        this.#values.alphaMode = savedAlphaMode;
        const alphaModeSelect = this.#container.querySelector(`.${this.#cls.alphaModeSelect}`);
        if (alphaModeSelect) {
            alphaModeSelect.value = savedAlphaMode;
        }
        this.#updateAlphaModeWarning();
    }

    #notifyChange() {
        if (this.#onTuneChanged) {
            this.#onTuneChanged(this.getValues());
        }
    }
}
