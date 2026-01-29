//
//  sidebar/looks_pane/settings_panel_overlay.js
//  mmhmm
//
//  Created by Cristiano Oliveira on 1/28/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * TODO remove Media.Text support now that we have Media.NameBadge
 */
class LookNameBadgeSettings {
    #cls = {
        container: "looks__name-badge-settings"
    };

    #attr = {
        nameBadgeTextLayout: "name-badge-text-layout",
        nameBadgeLayout: "name-badge-layout",
        nameBadgeTitle: "name-badge-title",
        nameBadgeSubtitle: "name-badge-subtitle",
        nameBadgeThumbnail: "name-badge-thumbnail",
        nameBadgeStyleName: "name-badge-style-name",
        toggleNametagVisible: "toggle-nametag-visible",
        nameBadgeColors: "name-badge-colors",
        fontFamilyLabel: "font-family-label"
    };

    #actions = {
        showBadgeStyles: "show-name-badge-styles",
        showColorPicker: "show-color-picker",
        selectNametagStyle: "select-name-badge",
        showFontMenu: "show-font-menu",
        revertNametagColors: "revert-name-badge-colors"
    };

    #selector = {
        badgeTitle: `input[name=${this.#attr.nameBadgeTitle}]`,
        badgeSubtitle: `input[name=${this.#attr.nameBadgeSubtitle}]`,
        badgeThumbnail: `[data-id=${this.#attr.nameBadgeThumbnail}]`,
        badgeStyleName: `[data-id=${this.#attr.nameBadgeStyleName}]`,
        badgeColors: `[data-id=${this.#attr.nameBadgeColors}]`,
        toggleNametagVisible: `input[name=${this.#attr.toggleNametagVisible}]`
    };

    #currentLook = null;
    #nametagStyleSheet = null;

    /**
     * @param {function} onChange - triggered when user changes a setting
     *
     */
    constructor() {
        this.container = this.#createContainer();
        this.render();
    }

    destroy() {}

    #createContainer() {
        const container = document.createElement("div");
        container.className = this.#cls.container;
        return container;
    }

    /**
     * Returns the container for external use.
     */
    get el() {
        return this.container;
    }

    /**
     * Update the currently selected look, which contains the nametag.
     * @param {Slide.Modern} slide the currently selected look
     */
    setLook(slide) {
        this.#currentLook = slide;
        this.updateInputs(slide);
        this.updateThumbnail(slide);
    }

    get nametagVisible() {
        return this.container.querySelector(this.#selector.toggleNametagVisible).checked;
    }

    set nametagVisible(visible) {
        this.container.querySelector(this.#selector.toggleNametagVisible).checked =
            visible;
    }

    /**
     * Updates the color swatches for the name tag.
     *
     * @param {Media.NameBadge} media
     */
    updateColorSwatches(media) {
        const container = this.container.querySelector(this.#selector.badgeColors);

        // Render one swatch per color in the color scheme
        const variables = media.variables ?? {};
        const keys = Object.keys(variables).filter((key) =>
            IsKindOf(variables[key], Paint.Color)
        );

        container.innerHTML = `
            ${keys
                .map((key) => {
                    // Color is an instance of Paint.Color
                    const color = variables[key];
                    return `<button
                    aria-label="color picker for ${key}"
                    data-name="${key}"
                    data-action=${this.#actions.showColorPicker}
                    data-color="${color.toCSS(true)}"
                    class="color_picker"
                    style="background-color: ${color.toCSS(true)};">
                </button>`;
                })
                .join("\n")}


            ${this.#renderRevertColorsButton(media)}
        `;
    }

    #renderRevertColorsButton(media) {
        // If the user has modified the colors, show a button to revert to defaults
        const defaults = media.style.variables;
        if (defaults == null) {
            return "";
        }

        const variables = media.variables;
        const hasModifiedColors = Object.keys(defaults).some((key) => {
            const variable = variables[key];
            const defaultVariable = defaults[key];
            // Only compare Paint objects, which have a toCSS method
            if (defaultVariable.toCSS != null) {
                return !defaultVariable.equals(variable);
            }
            return false;
        });

        return `
        <button
            data-action="${this.#actions.revertNametagColors}"
            ${hasModifiedColors ? "" : "disabled"}
            class="secondary-button caption1 m-left-auto">
                ${LocalizedString("Defaults")}
        </button>
        `;
    }

    #enableRevertButton() {
        const button = this.container.querySelector(
            `button[data-action=${this.#actions.revertNametagColors}]`
        );
        button.disabled = false;
    }

    /**
     * Update text inputs and color swatches for the current nametag
     */
    updateInputs(look) {
        const media = look.getNametagMedia();
        if (media == null) {
            return;
        }

        let fontFamily = LooksNameBadgeHandler.getFontFamily(media);
        // check if we're using a custom font
        if (Media.Text.Style.IsFontFamilyFromAsset(fontFamily, media.fontAsset)) {
            fontFamily = LocalizedString("Custom");
        }

        this.#updateTitleInput(media.titleLabel.string);
        this.#updateSubtitleInput(media.subtitleLabel.string);
        this.#updatePositionOptions(media);
        this.updateColorSwatches(media);
        this.updateSelectedFont(fontFamily);
    }

    /**
     * @param {String} fontFamily the name of the font family or "Custom"
     */
    updateSelectedFont(fontFamily) {
        this.container.querySelector(
            `[data-id="${this.#attr.fontFamilyLabel}"]`
        ).innerText = fontFamily;
    }

    #updateTitleInput(value) {
        const titleInput = this.container.querySelector(this.#selector.badgeTitle);
        titleInput.value = value;
    }

    #updateSubtitleInput(value) {
        const subtitleInput = this.container.querySelector(this.#selector.badgeSubtitle);
        subtitleInput.value = value;
    }

    colorSwatchChanged(name, newColor) {
        this.#updateColorSwatch(name, newColor.value);
        this.updateThumbnail(this.#currentLook);
        this.#enableRevertButton();
    }

    /**
     * @param {String} name the name of the color in the color scheme that we're updating
     */
    getSwatchColor(name) {
        const foreground = this.container.querySelector(`[data-name="${name}"]`);
        const color = foreground.dataset.color;
        return {
            value: color,
            rgba: ColorPickerSheet.extractRGBA(color)
        };
    }

    #updateColorSwatch(name, color) {
        const el = this.container.querySelector(`[data-name="${name}"]`);
        if (el) {
            el.style.backgroundColor = color;
            el.dataset.color = color;
        }
    }

    /* Show which color swatch is currently being edited */

    clearSelection() {
        this.setEditingColorSwatch(null);
    }

    setEditingColorSwatch(name) {
        const current = this.container.querySelector(".color_picker.selected");
        if (current) {
            current.classList.remove("selected");
        }

        const el = this.container.querySelector(`[data-name="${name}"]`);
        if (el) {
            el.classList.add("selected");
        }
    }

    /**
     * We show an actionsheet that allows the user to select a different nametag style.
     *
     * @param {HTMLElement} target
     * @param {Object[]} styleOptions - the options the user can choose from
     * @param {function} onChangeStyle - callback to update the style
     */
    showNametagStylesSheet(target, styleOptions, onChangeStyle) {
        if (this.#nametagStyleSheet) {
            this.#nametagStyleSheet.dismiss();
            return;
        }

        const container = document.createElement("div");
        container.className = "p4";

        const header = this.#getInputValue(this.#attr.nameBadgeTitle);
        const subheader = this.#getInputValue(this.#attr.nameBadgeSubtitle);

        const currentMedia = this.#currentLook.getNametagMedia();
        const selectedStyle = currentMedia?.style.id;
        const sheet = new NametagGridSheet(
            container,
            selectedStyle,
            styleOptions,
            header,
            subheader
        );

        const handleClick = (ev) => {
            const item = ev.target.closest("[data-action]");
            if (!item) {
                return;
            }

            const { id, action } = item.dataset;
            if (action === this.#actions.selectNametagStyle) {
                onChangeStyle(id);
                this.updateInputs(this.#currentLook);

                // TODO I'm not sure why this is needed, but it seems to be
                // TODO we need this to bubble up the change to the idle panel
                setTimeout((_) => this.updateThumbnail(this.#currentLook), 100);

                sheet.dismiss();
            }
        };

        sheet.addEventListener("dismiss", () => {
            this.#nametagStyleSheet = null;
            container.removeEventListener("click", handleClick);
        });

        container.addEventListener("click", handleClick);
        sheet.displayFrom(target);

        this.#nametagStyleSheet = sheet;
    }

    /**
     * @param {Slide.Modern} item
     */
    async updateThumbnail(slide) {
        const oldImg = this.container.querySelector(
            this.#selector.badgeThumbnail + " img"
        );

        const media = slide.getNametagMedia();
        let newImg = null;
        let title = "";
        if (media == null) {
            newImg = document.createElement("img");
            newImg.src = ThumbnailStorage.AssetMissing;
            newImg.draggable = false;
        } else {
            newImg = await LookNameBadgeSettings.thumbnailForNametagMedia(media);
            title = media.style.name || slide.title;
        }

        if (oldImg) {
            oldImg.parentElement?.replaceChild(newImg, oldImg);
        } else {
            this.container
                .querySelector(this.#selector.badgeThumbnail)
                .appendChild(newImg);
        }

        // Update the title of the selected style
        const titleEl = this.container.querySelector(this.#selector.badgeStyleName);
        titleEl.innerText = title;
    }

    renderNameTagStyleOptions() {
        return `
        <button
            data-action="${this.#actions.showBadgeStyles}"
            class="flex justify-between secondary-button h-6 body2 py-2 px-4 w-full gap-2">
                <div class="${GridCard.cls.thumbnail}" data-id="${this.#attr.nameBadgeThumbnail}"></div>
                <span data-id="${this.#attr.nameBadgeStyleName}" class="text-ellipsis"></span>
                <div class="w-3">
                    ${AppIcons.Disclosure().outerHTML}
                </div>
        </button>
        `;
    }

    renderTextOption(config) {
        const { label, name, placeholder } = config;

        return `
            <strong class="text-content-tertiary body4 text-ellipsis">${label}</strong>

            <input
                aria-label="${label}"
                name="${name}"
                placeholder="${placeholder}"
                autocomplete="off"
                spellcheck="false"
                type="text"
                class="h-full flex-auto caption1 py-1"/>
        `;
    }

    renderNameTagContentOptions() {
        return `
            <div class="grid grid-cols-2-fit items-center gap-4">
                ${this.renderTextOption({
                    name: this.#attr.nameBadgeTitle,
                    label: LocalizedString("Big text"),
                    placeholder: LocalizedString("Name...")
                })}

                ${this.renderTextOption({
                    name: this.#attr.nameBadgeSubtitle,
                    label: LocalizedString("Small text"),
                    placeholder: LocalizedString("Title...")
                })}
            </div>
        `;
    }

    #getInputValue(name) {
        const input = this.container.querySelector(`input[name=${name}]`);
        return input ? input.value : "";
    }

    #updatePositionOptions(media) {
        const style = media.style;

        // Some of our custom nametags (LVMH2) don't allow variants
        if (this.#isCustomNametag(media)) {
            const variants = style?.variants ?? [];
            if (variants.length == 1 && isUUID(variants[0].id)) {
                // This was made by us as a backwards compatibility measure
                this.#createPositionOptionsForCustomNametag(media);
            }
        }

        // If there's nothing to choose, hide the selector
        if (style.variants?.length <= 1) {
            this.#updatePositionSelector(true);
            return;
        }

        const variants = style.variants;
        const selectedId = media.style.variants[media.style.selectedVariant].id;

        // Otherwise, update the selector with the variants
        const options = variants.map((variant) => {
            return {
                value: variant.id,
                label: variant.name,
                selected: variant.id === selectedId
            };
        });

        this.#updatePositionSelector(false, options);
    }

    #isCustomNametag(media) {
        return Media.NameBadge.StyleWithID(media.style.id) == null;
    }

    /**
     * @param {Media.NameBadge} media
     */
    #createPositionOptionsForCustomNametag(media) {
        // Media.NameBadge that weren't created from a built-in style
        // didn't originally have variants. Allow some basic positioning options.

        const style = media.style;
        if (style.variants?.length > 1) {
            console.error("Can't add variants to name tag that already has them", media);
            return;
        }

        // Create a set of variables to store the left/right padding
        const variables = media.variables;
        variables.padding =
            media.left ??
            media.right ??
            media.metadata?.padding?.horizontal ??
            media.bottom;
        media.variables = variables;

        // Create a set of simple hardcoded position variants
        const variants = [];
        variants.push({
            id: "left",
            name: LocalizedString("Left"),
            left: "$padding",
            right: null
        });
        if (media.top == null || media.bottom == null) {
            variants.push({
                id: "center",
                name: LocalizedString("Center"),
                left: null,
                right: null
            });
        }
        variants.push({
            id: "right",
            name: LocalizedString("Right"),
            left: null,
            right: "$padding"
        });

        let selectedVariant = 0;
        if (media.left != null && media.right == null) {
            selectedVariant = 0;
        } else if (media.left == null && media.right == null) {
            selectedVariant = 1;
        } else {
            selectedVariant = variants.length - 1;
        }

        // Set the variants on the style, where they will be persisted
        style.variants = variants;
        style.selectedVariant = selectedVariant;
        media.style = style;
    }

    #updatePositionSelector(hidden, options) {
        const input = this.container.querySelector(
            `select[name=${this.#attr.nameBadgeLayout}]`
        );

        const container = input.parentElement;
        container.classList.toggle("hidden", hidden);

        const label = container.previousElementSibling;
        if (label) {
            label.classList.toggle("hidden", hidden);
        }

        if (!hidden) {
            input.innerHTML = `${options
                .map(
                    ({ value, label, selected }) =>
                        `<option
                            ${selected ? "selected" : ""}
                            value="${value}">${label}
                        </option>`
                )
                .join("")}`;
        }
    }

    renderNameTagPositionOptions() {
        return `
        <div class="">
            <select
                aria-label="${LocalizedString("Position")}"
                name="${this.#attr.nameBadgeLayout}"
                class="h-6 w-full caption1">
            </select>
        </div>`;
    }

    /**
     * @param {HTMLElement} sender - the element that triggered the font menu
     * @param {Array<{ value: string, label: string, className?: string, selected?: boolean }>} options
     * @param {function(string): void} onChange - callback when a font is selected
     */
    showFontMenu(sender, options, onChange) {
        const menu = new Menu();
        menu.list.container.classList.add("looks-font-selector");

        // className here is used for font-family classname
        options.forEach(
            ({
                value,
                label,
                icon,
                action,
                style,
                className,
                selected,
                divider,
                defaultFamily
            }) => {
                if (action) {
                    const buttonHtml = `
                    <span class="icon">${icon.outerHTML}</span>
                    <div class="caption2 text-ellipsis font-menu-item flex items-center gap-2">
                        ${label}
                    </div>
                `;
                    const button = menu.addItem(label, () => action());
                    button.innerHTML = buttonHtml;
                    return;
                }

                if (divider == true) {
                    menu.addDivider();
                    return;
                }

                const styleAttribute = style ? `style="${style}"` : "";

                const buttonHtml = `
                <span class="icon ${selected ? "" : "hidden"}">${AppIcons.CheckmarkAlt().outerHTML}</span>
                <div ${styleAttribute} class="${className ?? ""} caption1 text-ellipsis font-menu-item flex items-center gap-2" data-value="${value}">
                    ${label}
                </div>
                ${defaultFamily ? `<span style="margin-left:auto" class="caption1 text-ellipsis text-content-secondary">${LocalizedString("Default")}</span>` : ""}
            `;

                const button = menu.addItem(
                    label,
                    () => {
                        onChange(value);
                    },
                    false
                );

                button.innerHTML = buttonHtml;
            }
        );

        menu.displayFrom(sender.target, sender);
    }

    #renderFontSelector() {
        return `
        <div class="namebadge__font-selector">
            <button
                data-action="${this.#actions.showFontMenu}"
                class="h-6 py-2 px-4 secondary-button caption1"
                >
                <div class="flex items-center gap-4">
                    <span
                    data-id="${this.#attr.fontFamilyLabel}"
                    class="flex-1 text-ellipsis">${LocalizedString("Choose Font")}</span>
                </div>

                <div class="w-3">
                    ${AppIcons.Disclosure().outerHTML}
                </div>
            </button>
        </div> `;
    }

    renderToggleIcon = ({ icon, label, checked, name }) => {
        return `
        <label
            title="${label}"
            class="toggle-icon-checkbox outline-button px-5 py-4 h-full">
            <input
                name="${name}"
                type="checkbox"
                ${checked ? "checked" : ""}
                class="hidden-checkbox" />

            <span class="toggle-icon-wrapper flex items-center gap-2">
                <span class="svg">${icon}</span>
            </span>
        </label>
        `;
    };

    render() {
        this.container.innerHTML = `
                <div class="flex flex-1 flex-col gap-4 overflow-hidden" >

                    <div class="flex justify-between items-center gap-4">
                        <strong class="text-content-primary body3">${LocalizedString("Content")}</strong>

                        <div class="flex items-center gap-4">
                            <label class="toggle-icon-checkbox secondary-button h-6 w-8">
                                <input
                                    aria-label="${LocalizedString("Toggle name badge")}"
                                    name="${this.#attr.toggleNametagVisible}"
                                    type="checkbox"
                                    class="hidden-checkbox" />
                                <span class="toggle-icon-wrapper flex items-center gap-2">
                                    <span class="svg-on w-4">
                                        ${AppIcons.EyeFillOn().outerHTML}
                                    </span>
                                    <span class="svg-off w-4">
                                        ${AppIcons.EyeFillOff().outerHTML}
                                    </span>
                                </span>
                            </label>
                        </div>
                    </div>

                    <div class="grid gap-4">
                        ${this.renderNameTagContentOptions()}
                    </div>

                    <hr class="w-full border-primary my-4"/>

                    <div class="namebadge__style_settings flex flex-col items-left gap-4">
                        <strong class="text-content-primary body3">${LocalizedString("Style")}</strong>
                        ${this.renderNameTagStyleOptions()}
                    </div>

                    <div class="grid grid-cols-2 items-center gap-4 ">
                        <strong class="text-content-tertiary body4">${LocalizedString("Layout")}</strong>
                        ${this.renderNameTagPositionOptions()}
                    </div>

                    <div class="grid grid-cols-2 items-center gap-4 ">
                        <strong class="text-content-tertiary body4">${LocalizedString("Font")}</strong>
                        ${this.#renderFontSelector()}
                    </div>

                    <div class="grid grid-cols-2 items-center gap-4 ">
                        <strong class="text-content-tertiary body4">${LocalizedString("Colors")}</strong>
                        <div class="flex gap-2 items-center" data-id="${this.#attr.nameBadgeColors}"></div>
                    </div>

                </div>

            </div>
        `;
    }

    /**
     * Given a Media.NameBadge.Style, generate a thumbnail.
     * @param {Media.NameBadge.Style} style
     * @returns Image
     */
    static async thumbnailForNametagStyle(style, header = null, subheader = null) {
        const media = new Media.NameBadge();
        const variant = style.defaultVariant != null ? style.defaultVariant : 0;
        media.applyStyle(style, variant);

        media.titleLabel.string = header || LocalizedString("Name");
        media.subtitleLabel.string = subheader || LocalizedString("Title");

        return LookNameBadgeSettings.thumbnailForNametagMedia(media);
    }

    /**
     * @param {Media.NameBadge} media
     * @returns {Promise<Image>}
     */
    static async thumbnailForNametagMedia(media) {
        const blob = await media.generateThumbnail();
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.draggable = false;
        img.dataset.type = "nametag";
        img.src = url;
        img.decode().finally(() => URL.revokeObjectURL(url));
        return img;
    }

    static async nametagThumbnailForLook(slide) {
        const media = slide.getNametagMedia();
        if (media) {
            return LookNameBadgeSettings.thumbnailForNametagMedia(media);
        }
        const img = new Image();
        img.src = ThumbnailStorage.AssetMissing;
        img.draggable = false;
        return img;
    }
}

// TODO I think we should consider replacing this with something that extends our existing "Menu" class
class NametagGridSheet extends ActionSheet {
    static cls = {
        container: "namebadge__grid-sheet"
    };

    #actions = {
        selectNameBadge: "select-name-badge"
    };

    constructor(container, selectedStyleId, styleOptions, header, subheader) {
        super(null, container, 240, false, true, [0, 0], NametagGridSheet.cls.container);

        this.populateContainer(
            container,
            selectedStyleId,
            styleOptions,
            header,
            subheader
        );
    }

    displayFrom(target) {
        super.displayFrom(target);

        const selected = this.contents.querySelector(`[aria-selected="true"]`);
        selected?.scrollIntoView();
    }

    /**
     * @param {HTMLElement} container
     * @param {String} activeStyleId
     */
    populateContainer(container, selectedStyleId, styles, header, subheader) {
        // Sort the styles by name
        styles.sort((a, b) => {
            const nameA = a.name || LocalizedString("Custom");
            const nameB = b.name || LocalizedString("Custom");
            return nameA.localeCompare(nameB);
        });

        container.innerHTML = `
            <ul data-list class="flex flex-col gap-2 m-0 p-0 list-none w-full">
                ${styles
                    .map((s) =>
                        this.renderItem(s, this.#idForObject(s) === selectedStyleId)
                    )
                    .join("")}
            </ul>`;

        container.querySelectorAll(`.${GridCard.cls.thumbnail}`).forEach((el, i) => {
            this.#thumbnailForNametag(styles[i], header, subheader).then((img) => {
                img.draggable = false;
                el.replaceChildren(img);
            });
        });
    }

    /**
     * Media.NameBadge has styleId, Media.NameBadge.Style has id. Allow matching on either.
     */
    #idForObject(styleOrMedia) {
        return styleOrMedia.style?.id ?? styleOrMedia.id;
    }

    async #thumbnailForNametag(styleOrMedia, header, subheader) {
        if (IsKindOf(styleOrMedia, Media.NameBadge)) {
            return LookNameBadgeSettings.thumbnailForNametagMedia(styleOrMedia);
        } else {
            return LookNameBadgeSettings.thumbnailForNametagStyle(
                styleOrMedia,
                header,
                subheader
            );
        }
    }

    renderItem(style, isSelected) {
        return `
            <li
                data-action="${this.#actions.selectNameBadge}"
                data-id="${this.#idForObject(style)}"
                class="${GridCard.cls.listItem} ${GridCard.cls.listItemVisible} w-full">

                <button
                    ${isSelected ? ' aria-selected="true" ' : ""}
                    class="${GridCard.cls.thumbnailBtn}">
                    <div class="${GridCard.cls.thumbnail}">
                        <img src="${ThumbnailStorage.AssetMissing}" />
                    </div>
                    <div class="text-ellipsis">
                        ${style.name || LocalizedString("Custom")}
                    </div>
                    ${AppIcons.CheckmarkAlt().outerHTML}
                </button>

            </li>
        `;
    }
}
