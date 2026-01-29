//
//  sidebar/looks_pane/color_picker_sheet.js
//  mmhmm
//
//  Created by Cristiano Oliveira on 1/28/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//
//  - Uses Pickr.js to render a color picker
//  - Uses EyeDroppper API to pick colors from the screen

class ColorPickerSheet extends ActionSheet {
    static cls = {
        container: "colorpicker__sheet"
    };

    #maxCustomColors = 16;

    // default intial value, will get overriden
    #color = {
        value: "rgba(255, 255, 255, 1.0)",
        rgba: { r: 255, g: 255, b: 255, a: 1.0 }
    };

    #actions = {
        addColor: "add-color",
        setColor: "set-color",
        removeColor: "remove-color",
        searchBrand: "search-brand",
        eyedropper: "eyedropper"
    };

    #handleClick;

    #attr = {
        addColorBtn: "colorpicker__add_color",
        eyeDropperBtn: "colorpicker__eyedropper"
    };

    #customColorsKey = "nametagCustomColors";

    /**
     * Extracts RGBA values from an rgba() string.
     *
     * @param {string} rgbaString - The rgba color string (e.g., "rgba(255, 255, 255, 1.0)").
     * @returns {{ r: number, g: number, b: number, a: number }} - An object with RGBA components.
     */
    static extractRGBA(rgbaString) {
        if (rgbaString.startsWith("#")) {
            return ColorPickerSheet.extractHex(rgbaString);
        }

        // Handle rgb and rgba colors, allowing decimals in r, g, b, and a
        const match = rgbaString.match(
            /rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),?\s*([\d.]+)?\s*\)/
        );

        if (!match) {
            console.error("Invalid rgba/rgb string format:", rgbaString);
            // setting a default value to avoid breaking the app
            return {
                r: 255,
                g: 255,
                b: 255,
                a: 1.0
            };
        }

        return {
            r: parseFloat(match[1]),
            g: parseFloat(match[2]),
            b: parseFloat(match[3]),
            a: match[4] !== undefined ? parseFloat(match[4]) : 1.0
        };
    }

    /**
     * Extracts RGBA values from a hex color string.
     * @param {string} hexColorString - The hex color string (e.g., "#FFFFFF").
     * @returns {{ r: number, g: number, b: number, a: number }} - An object with RGBA components.
     */
    static extractHex(hexColorString) {
        const result = {
            r: parseInt(hexColorString.substring(1, 3), 16),
            g: parseInt(hexColorString.substring(3, 5), 16),
            b: parseInt(hexColorString.substring(5, 7), 16)
        };

        if (hexColorString.length === 9) {
            result.a = parseInt(hexColorString.substring(7, 9), 16) / 255;
        } else {
            result.a = 1.0;
        }

        return result;
    }

    /**
     * @param {{ r: number, g: number, b: number, a: number }} - An object with RGBA components.
     * @returns {string} - The rgba color string (e.g., "rgba(255, 255, 255, 1.0)").
     */
    static toRgba(components) {
        const result = `rgba(${components.r}, ${components.g}, ${components.b}, ${components.a})`;
        return ColorPickerSheet.normalizeRgba(result);
    }

    /**
     * Pickr uses floating point values for rgba, which can cause with our `Media` items
     *
     * Converts 'rgba(0, 240.34872135503153, 255, 1)' to: 'rgba(0, 240, 255, 1.0)'
     */
    static normalizeRgba(rgbaStr) {
        if (rgbaStr.includes("gradient")) {
            return rgbaStr; // don't normalize gradients
        }

        const match = rgbaStr.match(/rgba?\(([^)]+)\)/);
        if (!match) return rgbaStr;

        const [r, g, b, a = 1] = match[1].split(",").map((v) => v.trim());
        const rInt = Math.round(parseFloat(r));
        const gInt = Math.round(parseFloat(g));
        const bInt = Math.round(parseFloat(b));
        const aFloat = parseFloat(a).toFixed(1);

        return `rgba(${rInt}, ${gInt}, ${bInt}, ${aFloat})`;
    }

    #includeBrandColors = true;
    #includeOpacity = true;

    /**
     * Updates the colors of a container and calls the onChange callback.
     *
     * @param {{value: string, rgba: array }} currentColor
     * @param {(string)} onChange - A callback function that receives the updated colors.
     */
    constructor(currentColor, onChange, solidOptions, gradientOptions, brandOptions, brandName, includeBrandColors, includeOpacity) {
        const container = document.createElement("div");
        super(
            null,
            container,
            "fit-content",
            false,
            true,
            [0, 0],
            ColorPickerSheet.cls.container
        );

        this.container = container;
        this.brandName = brandName;
        this.onChange = onChange;
        this.#includeBrandColors = includeBrandColors;
        this.#includeOpacity = includeOpacity;

        this.brandColors = brandOptions;
        this.solidColors = solidOptions;
        this.gradientColors = gradientOptions;

        if (currentColor) {
            if (!currentColor.rgba && !currentColor.value.includes("gradient")) {
                currentColor.rgba = ColorPickerSheet.extractRGBA(currentColor.value);
            }
            this.#color = currentColor;
            this.#addInitialColorToCustomColors(currentColor);
        }

        this.render();
        this.#addEventListeners();
        this.#attachCustomColorPicker();

        if (currentColor) {
            this.#selectSwatch();
        }
    }

    get el() {
        return this.container;
    }

    /**
     * Set the initially selected swatch when the sheet is loaded.
     */
    #selectSwatch() {
        const currentColor = this.color;

        const swatches = Array.from(this.container.querySelectorAll("[data-color]"));
        const swatch = swatches.find((el) => {
            const swatchColor = el.dataset.color;
            if (currentColor.value.includes("gradient") || swatchColor.includes("gradient")) {
                return swatchColor === currentColor.value;
            } else {
                // Compare numbers so that 1 and 1.0 match
                const swatchRgba = ColorPickerSheet.extractRGBA(swatchColor);
                const colorRgba = currentColor.rgba;
                return (
                    swatchRgba.r === colorRgba.r &&
                    swatchRgba.g === colorRgba.g &&
                    swatchRgba.b === colorRgba.b &&
                    swatchRgba.a === colorRgba.a
                );
            }
        });

        if (swatch) {
            // set it as selected
            this.#setSelectedSwatch(swatch.dataset.color);

            // update the color
            this.#updateSelectedSwatch(currentColor.value);
        }
    }

    #addEventListeners() {
        const handlers = {
            [this.#actions.setColor]: ({ color }, evt, button) => this.#setColor(color, button),
            [this.#actions.removeColor]: () => this.#removeColor(),
            [this.#actions.addColor]: (_, evt) => {  evt.stopPropagation(); /* Handled by Pickr */ },
        };

        this.#handleClick = this.#createClickHandler(handlers);
        this.container.addEventListener("click", this.#handleClick);
    }

    #removeEventListeners() {
        this.container.removeEventListener("click", this.#handleClick);
    }

    destroy() {
        this.#removeEventListeners();
        if (this.pickr) {
            this.pickr.destroyAndRemove();
            this.pickr = null;
        }
    }

    get color() {
        return this.#color;
    }

    clearSelection() {
        // Deselect all swatches
        this.container.querySelectorAll("[data-color]").forEach((el) => {
            el.parentElement.classList.remove("selected");
            el.setAttribute("aria-selected", false);
        });
    }

    #setSelectedSwatch(color, button = null) {
        this.container.querySelectorAll("[data-color]").forEach((el) => {
            el.parentElement.classList.remove("selected");
            el.setAttribute("aria-selected", false);
        });

        const swatchEl = button ?? this.container.querySelector(`[data-color="${color}"]`);

        swatchEl?.setAttribute("aria-selected", true);
        swatchEl?.parentElement?.classList.add("selected");

        // Deselect the "None" button if it was selected
        const noneButton = this.container.querySelector(
            `[data-action="${this.#actions.removeColor}"]`
        );
        if (noneButton) {
            noneButton.setAttribute("aria-selected", false);
            noneButton.parentElement.classList.remove("selected");
        }
    }

    #selectNoneButton() {
        this.clearSelection();

        // Select the "None" button
        const noneButton = this.container.querySelector(
            `[data-action="${this.#actions.removeColor}"]`
        );
        noneButton.setAttribute("aria-selected", true);
        noneButton.parentElement.classList.add("selected");
    }

    /**
     * @param {string} color - The color to set.
     */
    #setColor(color, button) {
        if (color.includes("gradient")) {
            this.#color = {
                value: color,
                paint: this.#getPaintForGradient(color),
            };
        } else {
            const newColor = { value: color };
            newColor.rgba = ColorPickerSheet.extractRGBA(color);
            newColor.paint = this.#getPaintForSolid(newColor.rgba);
            this.#color = newColor;
        }

        this.onChange(this.#color);
        this.#setSelectedSwatch(color, button);
    }

    #removeColor() {
        this.onChange(null);
        this.#selectNoneButton();
    }

    #getPaintForSolid(rgba) {
        return new Paint.Color([
            rgba.r / 255,
            rgba.g / 255,
            rgba.b / 255,
            rgba.a || 1
        ]);
    }

    #getPaintForGradient(color) {
        // Find the built-in gradient that matches the color
        const builtIn = this.gradientColors.find(
            (gradient) => gradient.paint.toCSS(true) === color
        );
        if (builtIn) {
            return builtIn.paint;
        }
        return this.#cssGradientToPaint(color);
    }

    #cssGradientToPaint(gradientString) {
        // We'll support a simple linear gradient like those we create for branded looks
        // Extract the two RGBA values
        const rgbaRegex = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/g;
        const matches = [];

        let match;
        while ((match = rgbaRegex.exec(gradientString)) !== null) {
            const r = parseInt(match[1], 10) / 255;
            const g = parseInt(match[2], 10) / 255;
            const b = parseInt(match[3], 10) / 255;
            const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
            matches.push([ r, g, b, a]);
        }

        if (matches.length != 2) {
            console.error("Expected two RGBA colors in gradient string", gradientString);
            return null;
        }

        const paint = new Paint.LinearGradient();
        paint.addStopAt(matches[0], 0.5, 0.0)
        paint.addStopAt(matches[1], 0.5, 1.0);

        return paint;
    }

    /**
     * We're changing the color of the selected swatch
     * @param {string} color -
     */
    #updateSelectedSwatch(color) {
        const selectedSwatch = this.container.querySelector("[aria-selected='true']");

        if (selectedSwatch) {
            selectedSwatch.dataset.color = color;
            selectedSwatch.style.background = color;
        }
    }

    #createClickHandler(handlers) {
        return (ev) => {
            const item = ev.target.closest("[data-action]");
            if (!item) return;

            const action = item.dataset.action;
            const handler = handlers[action];

            if (handler) {
                ev.stopPropagation();
                handler(item.dataset, ev, item);
            }
        };
    }

    #addCustomColorSwatch(color) {
        const list = this.container.querySelector("[data-custom-swatches]");
        const count = list.childElementCount;

        const customSwatchLI = document.createElement("li");
        customSwatchLI.innerHTML = this.renderColorSwatch({
            color,
            name: `Custom Color: ${color}`
        });

        if (count >= this.#maxCustomColors) {
            list.removeChild(list.lastElementChild);
        }

        const listArray = Array.from(list.children);
        const firstSwatch = listArray.find(el => el.querySelector("button").classList.contains("icon-button") == false);
        if (firstSwatch) {
            firstSwatch.insertAdjacentElement("beforebegin", customSwatchLI);
        } else {
            list.append(customSwatchLI);
        }
    }

    #hasCustomColor(color) {
        const colors = this.#getCustomColors();
        return Boolean(colors.find((c) => ColorPickerSheet.normalizeRgba(c) === color));
    }

    #resetCustomColors() {
        SharedUserDefaults.setValueForKey([], this.#customColorsKey);
    }

    #replaceCustomColor(oldColor, newColor) {
        const colors = this.#getCustomColors();
        const index = colors.findIndex((c) => c === oldColor);

        if (index !== -1) {
            colors[index] = newColor;
            SharedUserDefaults.setValueForKey(colors, this.#customColorsKey);
        }
    }

    /**
     * Add color to custom swatches and store it in SharedUserDefaults
     * @param {string} color - rgba color string
     */
    #storeCustomColor(color) {
        let colors = this.#getCustomColors();

        if (colors.length >= this.#maxCustomColors) {
            colors = colors.slice(0, this.#maxCustomColors - 1);
        }

        colors.unshift(color);
        SharedUserDefaults.setValueForKey(colors, this.#customColorsKey);
    }

    #getCustomColors() {
        const colors = SharedUserDefaults.getValueForKey(this.#customColorsKey) || [];

        return colors.slice(0, this.#maxCustomColors);
    }

    // If the initial color that we're changing is not one from our
    // list, include it in the custom colors
    #addInitialColorToCustomColors(initialColor) {
        let colorString = null;

        if (initialColor.value.includes("gradient")) {
            const paint = initialColor.paint;
            colorString = paint.toCSS(true);
            if (this.gradientColors.some((g) => g.paint.toCSS(true) === colorString)) {
                return;
            } else if (this.brandColors?.some((c) => c.toCSS(true) === colorString)) {
                return;
            }
        } else {
            colorString = ColorPickerSheet.toRgba(initialColor.rgba);
            if (this.solidColors.some((c) => c.color === colorString)) {
                return;
            } else if (this.brandColors?.some((c) => ColorPickerSheet.normalizeRgba(c.toCSS(true)) === colorString)) {
                return;
            }
        }

        // It's not a built-in color; see if it's already in our custom list
        const customColors = this.#getCustomColors();
        if (!customColors.includes(colorString)) {
            this.#storeCustomColor(colorString);
        }
    }

    /**
     * Attached `Pickr` to the color picker button.
     * The button will trigger a color picker modal to show when clicked.
     */
    #attachCustomColorPicker() {
        // use this element as a button to trigger the color picker
        const el = this.container.querySelector(
            `[data-action="${this.#actions.addColor}"]`
        );

        const pickr = Pickr.create({
            el,
            theme: "nano",
            useAsButton: true,
            defaultRepresentation: "hex",
            components: {
                // Main components
                preview: true,
                opacity: this.#includeOpacity,
                hue: true,
                // Input / output Options
                interaction: {
                    hex: false,
                    rgba: false,
                    input: true,
                    clear: false,
                    save: true,
                    cancel: true,
                }
            }
        });

        pickr.on("show", () => {
            // stop action sheet from listening to clicks to avoid hiding it when clicking on the color picker
            this.stopClickListener();

            // put it above the action sheet - can't do this with css
            const zIndex = GetWindowMaxZIndex();
            pickr.getRoot().app.style.zIndex = zIndex + 1;

            // Set the initial color to the current selection
            const color = this.color;
            this.lastPickrColor = color;
            if (color.paint) {
                pickr.setColor(LooksColors.primaryColorFromPaint(color.paint), true);
            } else if (color.value.includes("gradient") == false) {
                pickr.setColor(color.value, true);
            }
        });

        // The user changed the color in the color picker, but hasn't saved it yet
        // We'll update our color so that the user gets a preview live on stage
        pickr.on("change", (pickrColor) => {
            if (!pickrColor) {
                return;
            }
            // TODO Opacity doesn't seem to have any effect on the stage...?
            const color = pickrColor.toRGBA().toString();
            const normalizedColor = ColorPickerSheet.normalizeRgba(color);
            this.#setColor(normalizedColor);
        });

        pickr.on("save", (pickrColor) => {
            // lack of `pickrColor` means the user clicked on `clear`
            if (pickrColor) {
                const color = pickrColor.toRGBA().toString();
                const normalizedColor = ColorPickerSheet.normalizeRgba(color);

                if (!this.#hasCustomColor(normalizedColor)) {
                    this.#storeCustomColor(normalizedColor);
                    this.#addCustomColorSwatch(normalizedColor);
                }

                this.#setColor(normalizedColor);
            }

            pickr.hide();
        });

        pickr.on("cancel", () => {
            // Reset back to the color that was selected when the color picker was opened
            const lastColor = this.lastPickrColor;
            if (lastColor) {
                this.#setColor(lastColor.value);
                this.lastPickrColor = null;
            }
            pickr.hide();
        });

        pickr.on("hide", () => {
            // after hiding the color picker
            // let action sheet close when clicking outside of it
            if (this.visible === true) {
                this.startClickListener();
            }
        });

        const eyedropperButton = this.container.querySelector(
            '[data-action="eyedropper"]'
        );

        if (!("EyeDropper" in window)) {
            eyedropperButton.disabled = true;
        } else {
            const eyeDropper = new EyeDropper();

            eyedropperButton.addEventListener("click", async () => {
                try {
                    const result = await eyeDropper.open();
                    pickr.setColor(result.sRGBHex);
                } catch (err) {
                    console.debug("Eyedropper cancelled or failed:", err);
                }
            });
        }

        this.pickr = pickr;
    }

    /**
     * Renders a color swatch button for the color picker.
     * @param {Object} colorObj - The color object.
     * @param {string} colorObj.color - The color value in RGBA format.
     * @param {string} colorObj.name - The name of the color.
     */
    renderColorSwatch({ color, name = "" }) {
        const normalizedColor = ColorPickerSheet.normalizeRgba(color);

        return `
            <button
            data-color="${normalizedColor}"
            data-action="${this.#actions.setColor}"
            aria-label="${name}"
            style="background: ${normalizedColor};"></button>
        `;
    }

    render() {
        const cols = "grid-cols-3";

        this.container.innerHTML = `
            <div class="py-4 grid gap-8">

                <div class="gap-4 grid">
                    ${this.#renderBrandColors(cols)}
                    ${this.#renderGradientColors(cols)}
                    ${this.#renderSolidColors(cols)}
                    ${this.renderCustomColors(cols)}
                </div>

            </div>`;

        tippy(this.container.querySelectorAll("[data-tippy-content]"));

        return this.container;
    }

    #renderSolidColors(columnsClass) {
        if (!this.solidColors?.length) {
            return "";
        }

        return `<div class="flex justify-between items-center">
                    <strong class="caption1">${LocalizedString("Solid")}</strong>
                </div>
                <ul class="grid ${columnsClass} gap-2 m-0 p-0 list-none">
                    ${this.solidColors
                        .map(
                            ({ color, name }) => `
                        <li>
                            ${this.renderColorSwatch({ color, name })}
                        </li>
                    `
                        )
                        .join("")}
                </ul>
                <hr class="w-full border-primary m-0"/>`;
    }

    #renderGradientColors(columnsClass) {
        if (!this.gradientColors?.length) {
            return "";
        }

        return `<div class="flex justify-between items-center">
                    <strong class="caption1">${LocalizedString("Gradient")}</strong>
                </div>
                <ul class="grid ${columnsClass} gap-2 m-0 p-0 list-none">
                    ${this.gradientColors
                        .map(
                            ({ paint, name }) => `
                        <li>
                            ${this.renderColorSwatch({ color: paint.toCSS(true), name })}
                        </li>
                    `
                        )
                        .join("")}
                </ul>

                <hr class="w-full border-primary m-0"/>`;
    }

    #renderBrandColors(columnsClass) {
        if (!this.#includeBrandColors) {
            return "";
        }

        if (!this.brandColors?.length) {
            return this.renderAddBrand(columnsClass);
        }

        return `
                    <div class="flex justify-between items-center w-full" style="min-width: 0px">
                        <strong class="caption1 text-ellipsis"
                            ${this.brandName ? `data-tippy-content="${this.brandName}` : ""}">
                            ${this.brandName ?? LocalizedString("Brand")}
                        </strong>
                    </div>
                    <ul class="grid ${columnsClass} gap-2 m-0 p-0 list-none">
                        ${this.renderSearchBrand(true)}

                        ${this.brandColors
                            .map((paint) => `
                                <li>
                                    ${this.renderColorSwatch({ color: paint.toCSS(true) })}
                                </li>
                            `)
                            .join("")}
                    </ul>
                    <hr class="w-full border-primary m-0"/>
        `;
    }

    renderAddBrand(columnsClass) {
        return `
            <div class="flex justify-between items-center w-full" style="min-width: 0px">
                <strong class="caption1 text-ellipsis">
                    ${LocalizedString("Add brand colors")}
                </strong>
            </div>

            <ul class="grid ${columnsClass} gap-2 m-0 p-0 list-none">
                ${this.renderSearchBrand(false)}
            </ul>
            <hr class="w-full border-primary m-0"/>
        `;
    }

    renderSearchBrand(hasBrand) {
        return `
            <li>
                <button
                    class="icon-button ${this.#attr.eyeDropperBtn}"
                    data-action="${this.#actions.searchBrand}"
                    data-tippy-content="${hasBrand ?
                        LocalizedString("Change brand") :
                        LocalizedString("Search brand")
                    }">
                    ${AppIcons.MagnifyingGlass().outerHTML}
                </button>
            </li>
        `;
    }

    renderCustomColors(columnsClass) {
        let customColors = this.#getCustomColors(this.color);
        if (!this.gradientColors) {
            customColors = customColors.filter((c) => !c.includes("gradient"));
        }

        if (!this.#includeOpacity) {
            // Filter out any colors that are not fully opaque
            customColors = customColors.filter((c) => {
                const rgba = ColorPickerSheet.extractRGBA(c);
                return rgba.a === 1.0;
            });
        }

        return `
                    <div class="flex justify-between items-center">
                        <strong class="caption1">${LocalizedString("Custom")}</strong>
                    </div>

                    <ul data-custom-swatches class="grid ${columnsClass} gap-2 m-0 p-0 list-none">

                        <li>
                            <button
                                class="icon-button ${this.#attr.eyeDropperBtn}"
                                data-action="${this.#actions.eyedropper}">
                                ${AppIcons.EyeDropper().outerHTML}
                            </button>
                        </li>

                        <li>
                            <button
                                data-action="${this.#actions.addColor}"
                                aria-label="${LocalizedString("add new color")}"
                                class="${this.#attr.addColorBtn} icon-button">
                                ${AppIcons.Plus().outerHTML}
                            </button>
                        </li>

                    ${customColors
                            .map(
                                (color, index) => `
                            <li>
                                ${this.renderColorSwatch({ color, name: `Custom Color: ${index + 1}` })}
                            </li>
                        `
                            )
                            .join("")}
                    </ul>`
    }

    renderNone() {
        return `
            <li>
                <button
                    class="icon-button"
                    data-action="${this.#actions.removeColor}"
                    aria-label="${LocalizedString("None")}"
                    style="border-radius: var(--size-1); width: unset; height: unset">
                    ${AppIcons.CircleSlash().outerHTML}
                </button>
            </li>
        `;
    }
}
