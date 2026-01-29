//
//  sidebar/looks_pane/editor/layer_options_tint.js
//  mmhmm
//
//  Created by Seth Hitchings on 7/22/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class TintLayerOptions extends LayerOptions {

    #cls = {
        container: "colorpicker__sheet",
    }

    #actions = {
        remove: "remove-presenter-tint",
        eyedropper: "eyedropper",
        searchBrand: "search-brand",
    }

    #sheet;
    #look;
    #changeCallback;
    #searchBrandCallback;
    #removeCallback;

    constructor(look, currentColor, onChange, onRemove, onSearch, onClose) {
        const container = document.createElement("div");
        super(container, onClose);

        this.#look = look;
        this.#changeCallback = onChange;
        this.#searchBrandCallback = onSearch;
        this.#removeCallback = onRemove;

        this.populateContainer(container, look, currentColor);
        this.#setInitialSelection(currentColor);
    }

    populateContainer(container, look, currentColor) {
        const options = [];
        if (this.#removeCallback != null) {
            options.push(this.renderNoneButton(this.#actions.remove));
            options.push(this.renderDivider());
        }

        this.renderPaneAsListWithContents(container, ...options);

        const picker = this.#renderColorPicker(look, currentColor);
        this.optionsContainer.appendChild(picker);
    }

    renderDivider() {
        return `
            <hr class="w-full border-primary m-0"/>
        `;
    }

    #renderColorPicker(look, currentColor) {
        const container = document.createElement("div");
        container.classList.add(this.#cls.container);

        // For now we're abusing the existing ColorPickerSheet modal
        // We use it to render the color picker UI into our toolbar container
        // instead of showing it in a sheet as a modal.

        const forTint = this.#removeCallback != null;

        const solidColors = this.#getSolidColorOptions(look, forTint);
        const gradientColors = this.#getGradientOptions(look, forTint);
        const brandColors = this.#getBrandColorOptions(look, forTint);

        const sheet = new ColorPickerSheet(
            currentColor,
            (newColor) => this.#onChange(newColor),
            solidColors,
            gradientColors,
            brandColors,
            look.brandName,
            look.isBrandEditable(), // includeBrandColors
            !forTint                // includeOpacity
        );
        this.#sheet = sheet;

        container.appendChild(sheet.container);
        return container;
    }

    #getColorOptionsForLook(look) {
        if (look.hasLimitedColorOptions()) {
            return look.getColorOptions();
        } else if (look.hasLimitedTintOptions()) {
            return look.getTintOptions();
        }
        return null;
    }

    #getSolidColorOptions(look, forTint) {
        const limitedOptions = this.#getColorOptionsForLook(look);
        if (limitedOptions != null) {
            if (look.hasFakeBrandData()) {
                // The limited options will be used as brand colors
                return [];
            }
            let options = limitedOptions.filter(o => IsKindOf(o, Paint.Color));
            return options.map(paint => {
                // ColorPickerSheet expects an object with a name and color value
                return {
                    name: "",
                    color: paint.toCSS(true)
                };
            });
        }
        return forTint ? LooksColors.getSolidColorsForTint() : LooksColors.getSolidColorsForNametag();
    }

    #getGradientOptions(look, forTint) {
        const limitedOptions = this.#getColorOptionsForLook(look);
        if (limitedOptions != null) {
            if (look.hasFakeBrandData()) {
                // The limited options will be used as brand colors
                return [];
            }
            let options = limitedOptions.filter(o => !IsKindOf(o, Paint.Color));
            return options.map(paint => {
                // ColorPickerSheet expects an object with a name and paint value
                return {
                    name: "",
                    paint
                };
            });
        }
        // Nametags don't support gradient colors
        return forTint ? LooksColors.getGradientColorsForTint() : null;
    }

    #getBrandColorOptions(look, forTint) {
        return forTint ? LooksColors.brandColorOptionsForTint(look) : LooksColors.brandColorOptionsForNametag(look);
    }

    dismiss() {
        this.#sheet.dismiss();
        super.dismiss();
    }


    /* Event handling */

    handleEvent(evt, button, action) {
        switch (action) {
            case this.#actions.remove:
                this.#onRemove(evt, button);
                break;
            case this.#actions.eyedropper:
                // Ignore it, handled by the ColorPickerSheet
                break;
            case this.#actions.searchBrand:
                this.#onSearchBrand(evt, button);
                break;
            default:
                super.handleEvent(evt, button, action);
        }
    }

    async #onRemove(evt, button) {
        evt.stopPropagation();
        this.selectItem(button);
        this.#sheet.clearSelection();
        await this.#removeCallback(this.#look);
        LooksAnalytics.onRemoveLookLayer(this.#look.identifier, "presenter.backgroundColor");
    }

    async #onChange(paint) {
        this.#changeCallback(paint);
        this.selectItem(null); // Deselect the "none" button
        LooksAnalytics.onChangeLookLayer(this.#look.identifier, "presenter.backgroundColor");
    }

    async #onSearchBrand(evt, button) {
        evt.stopPropagation();
        this.#searchBrandCallback();
    }

    #setInitialSelection(color) {
        if (color == null) {
            this.selectItemByAction(this.#actions.remove);
        }
    }
}

class NametagColorOptions extends TintLayerOptions {
    constructor(look, currentColor, onChange, onRemove, onSearch, onClose, name) {
        super(look, currentColor, onChange, onRemove, onSearch, onClose);
        this.swatchName = name;
    }
}
