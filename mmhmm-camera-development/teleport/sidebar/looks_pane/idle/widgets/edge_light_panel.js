//
//  sidebar/looks_pane/idle/widgets/edge_light_panel.js
//  mmhmm
//
//  Created for Edge Light feature support.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Edge Light Panel - Virtual ring light controls
 *
 * Provides controls for the Edge Light feature:
 * - Toggle: Master on/off switch
 * - Brightness slider: 0-100%
 * - Width slider: 1-30%
 * - Temperature slider: Warm to Cool
 * - Checkbox: Auto-brightness (auto-enable in low light)
 *
 * Features:
 * - Sliders display percentage values
 * - Per-slider reset buttons
 * - Keyboard nudging: Arrow keys for fine control
 * - Persistence via gHybrid.edgeLight API
 * - Reset All button
 */
class EdgeLightPanel {

    #cls = {
        panel: "edge-light-panel",
        header: "edge-light-panel__header",
        toggle: "edge-light-panel__toggle",
        toggleLabel: "edge-light-panel__toggle-label",
        toggleSwitch: "edge-light-panel__toggle-switch",
        control: "edge-light-panel__control",
        labelRow: "edge-light-panel__label-row",
        label: "edge-light-panel__label",
        value: "edge-light-panel__value",
        resetSingle: "edge-light-panel__reset-single",
        slider: "edge-light-panel__slider",
        checkbox: "edge-light-panel__checkbox",
        checkboxLabel: "edge-light-panel__checkbox-label",
        resetAll: "edge-light-panel__reset-all",
        hidden: "hidden",
        disabled: "disabled",
    };

    #defaultValues = {
        isEnabled: false,
        brightness: 70,      // Display as 0-100
        width: 10,           // Display as 1-30
        colorTemperature: 50 // Display as 0-100 (warm to cool)
    };

    #controls = [
        { name: "brightness", label: LocalizedString("Brightness"), min: 0, max: 100, unit: "%" },
        { name: "width", label: LocalizedString("Width"), min: 1, max: 30, unit: "%" },
        { name: "colorTemperature", label: LocalizedString("Temperature"), min: 0, max: 100, unit: "", warmLabel: LocalizedString("Warm"), coolLabel: LocalizedString("Cool") },
    ];

    /**
     * @type {HTMLDivElement}
     */
    #container;

    /**
     * @type {Object}
     */
    #values = {
        isEnabled: false,
        brightness: 70,
        width: 10,
        colorTemperature: 50,
        autoBrightness: false,
    };

    /**
     * @type {Function|null}
     */
    #onEdgeLightChanged = null;

    constructor() {
        this.#container = this.#createContainer();
        this.#render();
        this.#addEventListeners();
        this.#restoreSavedValues();
        this.#setupConfigurationCallback();
    }

    get el() {
        return this.#container;
    }

    /* Event handling */

    #addEventListeners() {
        // Slider input events
        this.#container.addEventListener("input", this.#handleInput.bind(this));

        // Click events for reset buttons and toggle
        this.#container.addEventListener("click", this.#handleClick.bind(this));

        // Keyboard events for fine control
        this.#container.addEventListener("keydown", this.#handleKeydown.bind(this));

        // Change events for checkboxes
        this.#container.addEventListener("change", this.#handleChange.bind(this));
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

        // Main toggle switch
        const toggleSwitch = target.closest(`.${this.#cls.toggleSwitch}`);
        if (toggleSwitch) {
            this.#toggleEnabled();
            return;
        }
    }

    #handleChange(ev) {
        // Auto-brightness checkbox
        if (ev.target.matches(`.${this.#cls.checkbox}`)) {
            this.#values.autoBrightness = ev.target.checked;
            this.#sendAutoBrightnessToNative();
            this.#notifyChange();
        }
    }

    #handleKeydown(ev) {
        if (!ev.target.matches(`.${this.#cls.slider}`)) return;

        const slider = ev.target;
        const step = ev.shiftKey ? 10 : 1;
        const min = parseInt(slider.min);
        const max = parseInt(slider.max);

        if (ev.key === "ArrowRight" || ev.key === "ArrowUp") {
            slider.value = Math.min(max, parseInt(slider.value) + step);
            this.#handleSliderChange(slider);
            ev.preventDefault();
        } else if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") {
            slider.value = Math.max(min, parseInt(slider.value) - step);
            this.#handleSliderChange(slider);
            ev.preventDefault();
        }
    }

    #handleSliderChange(slider) {
        const name = slider.dataset.slider;
        const displayValue = parseInt(slider.value);
        this.#values[name] = displayValue;

        // Update UI
        this.#updateValueDisplay(name, displayValue);
        this.#updateSliderFill(slider);
        this.#updateResetButtonVisibility(name);

        // Send to native
        this.#sendValueToNative(name);

        // Notify listeners
        this.#notifyChange();
    }

    /* Public API */

    /**
     * Set callback for edge light value changes
     * @param {Function} callback - Called with edge light configuration
     */
    onEdgeLightChanged(callback) {
        this.#onEdgeLightChanged = callback;
    }

    /**
     * Get current values
     * @returns {Object}
     */
    getValues() {
        return { ...this.#values };
    }

    /**
     * Set values from configuration
     * @param {Object} config
     */
    setValues(config) {
        if (config.isEnabled !== undefined) {
            this.#values.isEnabled = config.isEnabled;
            this.#updateToggleUI();
        }
        if (config.brightness !== undefined) {
            // Convert internal value (0-1) to display value (0-100)
            this.#values.brightness = Math.round(config.brightness * 100);
            this.#updateControlUI("brightness");
        }
        if (config.width !== undefined) {
            // Convert internal value (0.01-0.30) to display value (1-30)
            this.#values.width = Math.round(config.width * 100);
            this.#updateControlUI("width");
        }
        if (config.colorTemperature !== undefined) {
            // Convert internal value (0-1) to display value (0-100)
            this.#values.colorTemperature = Math.round(config.colorTemperature * 100);
            this.#updateControlUI("colorTemperature");
        }
        if (config.autoBrightness !== undefined) {
            this.#values.autoBrightness = config.autoBrightness;
            this.#updateAutoBrightnessUI();
        }
        this.#updateControlsEnabledState();
    }

    /**
     * Check if edge light is enabled
     * @returns {boolean}
     */
    get isEnabled() {
        return this.#values.isEnabled;
    }

    /**
     * Reset all values to defaults
     */
    reset() {
        this.#resetAllValues();
    }

    /* Native communication */

    #setupConfigurationCallback() {
        if (typeof gHybrid !== "undefined" && gHybrid.edgeLight) {
            gHybrid.edgeLight.setConfigurationChangedCallback((config) => {
                this.setValues(config);
            });
        }
    }

    #restoreSavedValues() {
        if (typeof gHybrid !== "undefined" && gHybrid.edgeLight && gHybrid.edgeLight.configuration) {
            const config = gHybrid.edgeLight.configuration;
            this.setValues(config);
        }
    }

    #sendValueToNative(name) {
        if (typeof gHybrid === "undefined" || !gHybrid.edgeLight) return;

        const value = this.#values[name];

        switch (name) {
            case "brightness":
                // Convert display value (0-100) to internal value (0-1)
                gHybrid.edgeLight.setBrightness(value / 100);
                break;
            case "width":
                // Convert display value (1-30) to internal value (0.01-0.30)
                gHybrid.edgeLight.setWidth(value / 100);
                break;
            case "colorTemperature":
                // Convert display value (0-100) to internal value (0-1)
                gHybrid.edgeLight.setColorTemperature(value / 100);
                break;
        }
    }

    #sendEnabledToNative() {
        if (typeof gHybrid !== "undefined" && gHybrid.edgeLight) {
            gHybrid.edgeLight.setEnabled(this.#values.isEnabled);
        }
    }

    #sendAutoBrightnessToNative() {
        if (typeof gHybrid !== "undefined" && gHybrid.edgeLight) {
            gHybrid.edgeLight.setAutoBrightness(this.#values.autoBrightness);
        }
    }

    /* UI Construction */

    #createContainer() {
        const container = document.createElement("div");
        container.classList.add(this.#cls.panel);
        return container;
    }

    #render() {
        let html = "";

        // Header with toggle
        html += this.#createToggleHTML();

        // Create slider controls
        for (const control of this.#controls) {
            html += this.#createSliderHTML(control);
        }

        // Auto-brightness checkbox
        html += this.#createCheckboxHTML();

        // Add Reset All button
        html += `
            <button class="${this.#cls.resetAll}">
                ${LocalizedString("Reset All")}
            </button>
        `;

        this.#container.innerHTML = html;
    }

    #createToggleHTML() {
        return `
            <div class="${this.#cls.header}">
                <div class="${this.#cls.toggle}">
                    <span class="${this.#cls.toggleLabel}">${LocalizedString("Edge Light")}</span>
                    <button class="${this.#cls.toggleSwitch}"
                            data-enabled="false"
                            aria-label="${LocalizedString("Toggle Edge Light")}">
                        ${AppIcons.ToggleSwitchOff().outerHTML}
                    </button>
                </div>
            </div>
        `;
    }

    #createSliderHTML(control) {
        const defaultValue = this.#defaultValues[control.name] || 0;
        const temperatureLabels = control.warmLabel && control.coolLabel ? `
            <div class="edge-light-panel__temp-labels">
                <span>${control.warmLabel}</span>
                <span>${control.coolLabel}</span>
            </div>
        ` : "";

        return `
            <div class="${this.#cls.control}" data-control="${control.name}">
                <div class="${this.#cls.labelRow}">
                    <span class="${this.#cls.label}">${control.label}</span>
                    <span class="${this.#cls.value}" data-value="${control.name}">${defaultValue}${control.unit}</span>
                    <button class="${this.#cls.resetSingle} ${this.#cls.hidden}"
                            data-param="${control.name}"
                            title="${LocalizedString("Reset")} ${control.label}"
                            aria-label="${LocalizedString("Reset")} ${control.label}">&#x21BA;</button>
                </div>
                <input type="range"
                       class="${this.#cls.slider}"
                       data-slider="${control.name}"
                       min="${control.min}"
                       max="${control.max}"
                       value="${defaultValue}"
                       step="1"
                       aria-label="${control.label}" />
                ${temperatureLabels}
            </div>
        `;
    }

    #createCheckboxHTML() {
        return `
            <div class="${this.#cls.control}">
                <label class="${this.#cls.checkboxLabel}">
                    <input type="checkbox"
                           class="${this.#cls.checkbox}"
                           aria-label="${LocalizedString("Auto-brightness")}" />
                    <span>${LocalizedString("Auto-enable in low light")}</span>
                </label>
            </div>
        `;
    }

    /* UI Updates */

    #toggleEnabled() {
        this.#values.isEnabled = !this.#values.isEnabled;
        this.#updateToggleUI();
        this.#updateControlsEnabledState();
        this.#sendEnabledToNative();
        this.#notifyChange();
    }

    #updateToggleUI() {
        const toggleSwitch = this.#container.querySelector(`.${this.#cls.toggleSwitch}`);
        if (toggleSwitch) {
            toggleSwitch.dataset.enabled = this.#values.isEnabled.toString();
            toggleSwitch.innerHTML = this.#values.isEnabled
                ? AppIcons.ToggleSwitchOn().outerHTML
                : AppIcons.ToggleSwitchOff().outerHTML;
        }
    }

    #updateControlsEnabledState() {
        const controls = this.#container.querySelectorAll(`.${this.#cls.control}`);
        controls.forEach(control => {
            control.classList.toggle(this.#cls.disabled, !this.#values.isEnabled);
        });

        const sliders = this.#container.querySelectorAll(`.${this.#cls.slider}`);
        sliders.forEach(slider => {
            slider.disabled = !this.#values.isEnabled;
        });

        const checkbox = this.#container.querySelector(`.${this.#cls.checkbox}`);
        if (checkbox) {
            checkbox.disabled = !this.#values.isEnabled;
        }

        const resetAll = this.#container.querySelector(`.${this.#cls.resetAll}`);
        if (resetAll) {
            resetAll.disabled = !this.#values.isEnabled;
        }
    }

    #updateControlUI(name) {
        const displayValue = this.#values[name];
        const control = this.#controls.find(c => c.name === name);
        const unit = control ? control.unit : "";

        const slider = this.#container.querySelector(`[data-slider="${name}"]`);
        if (slider) {
            slider.value = displayValue;
            this.#updateSliderFill(slider);
        }

        this.#updateValueDisplay(name, displayValue, unit);
        this.#updateResetButtonVisibility(name);
    }

    #updateValueDisplay(name, displayValue, unit) {
        const control = this.#controls.find(c => c.name === name);
        const actualUnit = unit !== undefined ? unit : (control ? control.unit : "");

        const valueEl = this.#container.querySelector(`[data-value="${name}"]`);
        if (valueEl) {
            valueEl.textContent = `${displayValue}${actualUnit}`;
        }
    }

    #updateSliderFill(slider) {
        const min = parseInt(slider.min);
        const max = parseInt(slider.max);
        const value = parseInt(slider.value);
        const fillPercent = ((value - min) / (max - min)) * 100;
        slider.style.setProperty("--fillPercent", `${fillPercent}%`);
    }

    #updateResetButtonVisibility(name) {
        const defaultValue = this.#defaultValues[name];
        const currentValue = this.#values[name];
        const resetBtn = this.#container.querySelector(
            `.${this.#cls.resetSingle}[data-param="${name}"]`
        );
        if (resetBtn) {
            resetBtn.classList.toggle(this.#cls.hidden, currentValue === defaultValue);
        }
    }

    #updateAutoBrightnessUI() {
        const checkbox = this.#container.querySelector(`.${this.#cls.checkbox}`);
        if (checkbox) {
            checkbox.checked = this.#values.autoBrightness;
        }
    }

    #resetSingleValue(name) {
        const defaultValue = this.#defaultValues[name];
        if (defaultValue !== undefined) {
            this.#values[name] = defaultValue;
            this.#updateControlUI(name);
            this.#sendValueToNative(name);
            this.#notifyChange();
        }
    }

    #resetAllValues() {
        for (const name of Object.keys(this.#defaultValues)) {
            if (name !== "isEnabled") {
                this.#values[name] = this.#defaultValues[name];
                this.#updateControlUI(name);
                this.#sendValueToNative(name);
            }
        }
        this.#notifyChange();
    }

    #notifyChange() {
        if (this.#onEdgeLightChanged) {
            this.#onEdgeLightChanged(this.getValues());
        }
    }
}
