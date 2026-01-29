//
//  format_bar.js
//  mmhmm
//
//  Created by Steve White on 11/2/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class TextSlideFormatBar extends ObservableObject {
    constructor(editor, styles, delegate, showRoom=true, variantButtonLabel=null) {
        super();

        this.styles = styles ?? Media.Text.Styles;
        this.extended = true;
        this.showRoomInVariant = showRoom;
        this.variantButtonLabel = variantButtonLabel;

        const container = document.createElement("div");
        container.className = "text_format_bar";

        // This is so we can figure out when the entity overlay
        // hides us.  It'd be nicer to re-work that class
        // to optionally tell one of its bars that its being
        // hidden/shown.  But this was quicker.
        if (this.extended == true) {
            const observer = new MutationObserver(mutations => {
                this._containerWasMutated(mutations);
            });
            observer.observe(container, {
                attributes: true,
            })
            this.observer = observer;
        }

        this.populateContainer(container);
        this.container = container;
        this.editor = editor;
        this.delegate = delegate;
    }
    destroy() {
        const observer = this.observer;
        if (observer != null) {
            observer.disconnect();
            this.observer = null;
        }
        const variantSelector = this.variantSelector;
        if (variantSelector != null) {
            variantSelector.removeObserverForProperty(this, "selectedStyle");
            this.variantSelector = null;
        }
        const familySelector = this.familySelector;
        if (familySelector != null) {
            familySelector.removeObserverForProperty(this, "selectedStyle");
            this.familySelector = null;
        }
        const sizeSelector = this.sizeSelector;
        if (sizeSelector != null) {
            sizeSelector.removeObserverForProperty(this, "selectedSize");
            this.sizeSelector = null;
        }
        this.editor = null;
        this.delegate = null;
    }
    /*
     * Properties
     */
    set editor(anEditorOrNull) {
        const previous = this._editor;
        if (previous != null) {
            previous.removeObserverForProperty(this, "textAlignment");
            previous.removeObserverForProperty(this, "textSize");
            previous.removeObserverForProperty(this, "style");
            previous.removeObserverForProperty(this, "state");
        }

        this._editor = anEditorOrNull;
        if (anEditorOrNull != null) {
            anEditorOrNull.addObserverForProperty(this, "textAlignment");
            anEditorOrNull.addObserverForProperty(this, "textSize");
            anEditorOrNull.addObserverForProperty(this, "style");
            anEditorOrNull.addObserverForProperty(this, "state");
            this.updateAttributeButtons();
            this.updateAlignmentButtons();
            this.updateFamilyAndVariantButtons();
            this.updateFontSizeButton();
        }
    }
    get editor() {
        return this._editor;
    }
    set styles(list) {
        if (list == null) {
            list = [];
        }
        const styles = Array.from(list);
        styles.sort((a, b) => {
            var familyA = a.family;
            var familyB = b.family;
            if (familyA != familyB) {
                return familyA.localeCompare(familyB);
            }

            return a.variant.localeCompare(b.variant);
        });
        this._styles = styles;
    }
    get styles() {
        return this._styles ?? [];
    }
    /*
     * DOM Events
     */
    _containerWasMutated(mutations) {
        const container = this.container;
        if (container.style.display == "none") {
            const menus = [this.familySelector.menu, this.variantSelector.menu, this.sizeSelector.menu];
            menus.forEach(menu => {
                if (menu != null) {
                    menu.dismiss();
                }
            })
        }
    }
    /*
     *
     */
    updateFamilyAndVariantButtons() {
        const style = this.editor.style;
        this.setAttributeButtonsEnabled(style.supportsRTF);

        this.familySelector.selectedStyle = style;
        this.variantSelector.selectedStyle = style;
    }
    updateFontSizeButton() {
        const selector = this.sizeSelector;
        if (selector != null) {
            selector.selectedSize = this.editor.textSize;
        }
    }
    updateAlignmentButtons() {
        const textAlignment = this.editor.textAlignment;
        const alignmentButtons = this.alignmentButtons;
        for (let key in alignmentButtons) {
            const option = alignmentButtons[key];
            const button = option.button;

            button.classList.toggle("selected", key == textAlignment);
        }
    }
    setAttributeButtonsEnabled(enabled) {
        const attributeButtons = this.attributeButtons;
        for (let key in attributeButtons) {
            const option = attributeButtons[key];
            const button = option.button;
            button.disabled = !enabled;
        }
    }
    updateAttributeButtons() {
        const state = this.editor.state;
        const attributeButtons = this.attributeButtons;
        for (let key in attributeButtons) {
            const option = attributeButtons[key];
            const button = option.button;

            button.classList.toggle("selected", state[key] != TextSlideEditor.State.Off);
        }
    }
    _buttonFromEvent(event) {
        let sender = event.srcElement;
        while (sender != null && sender.tagName.toLowerCase() != "button") {
            sender = sender.parentNode;
        }
        return sender;
    }
    textAttributeButtonClicked(event) {
        const sender = this._buttonFromEvent(event);
        if (sender == null) {
            return;
        }

        const attributeButtons = this.attributeButtons;
        for (let key in attributeButtons) {
            const option = attributeButtons[key];
            const button = option.button;
            if (button != sender) {
                continue;
            }
            this.editor.toggleAttribute(key);
        }
    }
    textAlignmentButtonClicked(event) {
        const sender = this._buttonFromEvent(event);
        if (sender == null) {
            return;
        }

        const alignmentButtons = this.alignmentButtons;
        for (let key in alignmentButtons) {
            const option = alignmentButtons[key];
            const button = option.button;
            if (button != sender) {
                continue;
            }
            this.editor.textAlignment = key;
            break;
        }
    }
    newToggleButton() {
        const button = document.createElement("button");
        button.className = "toggle";
        return button;
    }
    populateContainer(container) {
        const styles = this.styles;
        const families = styles.reduce((list,entry) => {
            const family = entry.family;
            if (list.indexOf(family) == -1) {
                list.push(family);
            }
            return list;
        }, []);


        /*
         * Family/Theme button
         */
        const familySelector = new TextSlideFormatBar.FamilyButton(this.styles);
        familySelector.addObserverForProperty(this, "selectedStyle");
        if (families.length > 1) {
            // No point in showing the button if we only
            // have one family.
            container.appendChild(familySelector.button);
        }
        this.familySelector = familySelector;

        /*
         * Variant/Style button
         */
        const variantSelector = new TextSlideFormatBar.VariantButton(this.styles, this.showRoomInVariant, this.variantButtonLabel);
        variantSelector.addObserverForProperty(this, "selectedStyle");
        container.appendChild(variantSelector.button);
        this.variantSelector = variantSelector;

        /*
         * Size button
         */
        const sizeSelector = new TextSlideFormatBar.SizeButton();
        sizeSelector.addObserverForProperty(this, "selectedSize");
        this.sizeSelector = sizeSelector;
        if (this.extended == true) {
            container.appendChild(sizeSelector.button);
        }

        /*
         * Attributes
         */
        const attributes = {};
        attributes[TextSlideEditor.Attribute.Bold] = {
            icon: AppIcons.TextAttributeBold(),
            tooltip: LocalizedString("Bold"),
        };
        attributes[TextSlideEditor.Attribute.Italic] = {
            icon: AppIcons.TextAttributeItalic(),
            tooltip: LocalizedString("Italic"),
        };
        attributes[TextSlideEditor.Attribute.Strikethrough] = {
            icon: AppIcons.TextAttributeStrikethrough(),
            tooltip: LocalizedString("Strikethrough"),
        };
        this.attributeButtons = attributes;

        /*
         * Text alignment
         */
        const alignments = {
            left: {
                icon: AppIcons.TextAlignmentLeft(),
                tooltip: LocalizedString("Left"),
            },
            center: {
                icon: AppIcons.TextAlignmentCenter(),
                tooltip: LocalizedString("Center"),
            },
            right: {
                icon: AppIcons.TextAlignmentRight(),
                tooltip: LocalizedString("Right"),
            },
        };
        this.alignmentButtons = alignments;

        const orderedOptions = [
            attributes[TextSlideEditor.Attribute.Bold],
            attributes[TextSlideEditor.Attribute.Italic],
            attributes[TextSlideEditor.Attribute.Strikethrough],
            alignments.left,
            alignments.center,
            alignments.right,
        ];

        const isOptionIn = function(option, list) {
            for (let key in list) {
                if (list[key] == option) {
                    return true;
                }
            }
            return false;
        }

        orderedOptions.forEach(option => {
            const button = this.newToggleButton();
            container.appendChild(button);

            option.button = button;

            button.title = option.tooltip;
            button.appendChild(option.icon);
            button.addEventListener("click", (evt) => {
                if (isOptionIn(option, attributes) == true) {
                    this.textAttributeButtonClicked(evt);
                }
                else {
                    this.textAlignmentButtonClicked(evt);
                }
            });

        })
    }
    /*
     * KVO
     */
    observePropertyChanged(obj, key, val) {
        const editor = this.editor;
        if (editor == null) {
            return;
        }

        if (obj == this.variantSelector || obj == this.familySelector) {
            this.editor.style = obj.selectedStyle;

            const delegate = this.delegate;
            if (delegate?.formatBarSelectedStyle != null) {
                delegate.formatBarSelectedStyle(this, obj.selectedStyle);
            }
        }
        else if (obj == this.sizeSelector) {
            this.editor.textSize = obj.selectedSize;
            const delegate = this.delegate;
            if (delegate?.formatBarSelectedSize != null) {
                delegate.formatBarSelectedSize(this, obj.selectedSize);
            }
        }
        else if (key == "textAlignment") {
            this.updateAlignmentButtons();
        }
        else if (key == "style") {
            this.updateFamilyAndVariantButtons();
        }
        else if (key == "state") {
            this.updateAttributeButtons();
        }
        else if (key == "textSize") {
            this.updateFontSizeButton();
        }
    }

}

TextSlideFormatBar.DropdownMenu = class extends ObservableObject {
    constructor(elementType = "span") {
        super();

        const button = document.createElement("button");
        this.button = button;

        const label = document.createElement(elementType);
        button.appendChild(label);
        this.label = label;

        const icon = AppIcons.Disclosure();
        icon.setAttributeNS(null, "class", "menuarrow");
        button.appendChild(icon);

        button.addEventListener("click", (event) => {
            this.displayMenu(button, event);
        })
    }
    displayMenu(sender, event) {
        const delegate = this.delegate;

        let menu = this.menu;
        if (menu != null) {
            menu.dismiss();
            return;
        }

        menu = new Menu();
        this.populateMenu(menu);
        menu.addEventListener("dismiss", (event) => {
            if (delegate?.onWillDismissMenu != null) {
                delegate.onWillDismissMenu(menu);
            }

            this.menu = null;
        });

        if (delegate?.onWillDisplayMenu != null) {
            delegate.onWillDisplayMenu(menu);
        }
        menu.displayFrom(sender);
        this.menu = menu;
    }
    populateMenu(menu) {
        // Intentionally blank, subclass hook
    }
}

TextSlideFormatBar.FamilyButton = class extends TextSlideFormatBar.DropdownMenu {
    constructor(styles) {
        super();
        this.styles = styles ?? Media.Text.Styles;
        this.automaticallyNotifiesObserversOfSelectedStyle = false;
    }
    set selectedStyle(style) {
        if (style?.family == this._selectedStyle?.family) {
            return;
        }
        this._selectedStyle = style;
        this.updateListContents();
        this.updateMenuContents();
    }
    get selectedStyle() {
        return this._selectedStyle;
    }
    get families() {
        const families = [];
        this.styles.forEach((aStyle) => {
            const family = aStyle.family;
            if (families.indexOf(family) == -1) {
                families.push(family)
            }
        });
        families.sort((a, b) => a.localeCompare(b));
        return families;
    }
    styleForFamily(family, variant = null) {
        const styles = this.styles.filter(style => style.family == family);
        if (styles.length == 0) {
            console.error("No style for family", family);
            return null;
        }

        if (variant != null) {
            const match = styles.find(style => style.variant == variant);
            if (match != null) {
                return match;
            }
        }
        return styles[0];
    }
    populateMenu(menu) {
        const families = this.families;

        const style = this.selectedStyle;
        const selected = style?.family;
        const variant = style?.variant;

        const menuItems = families.map((family) => {
            const style = this.styleForFamily(family, variant);
            if (style == null) {
                return null;
            }

            const button = menu.addItem(family, () => {
                this.selectedStyle = style;
                this.didChangeValueForProperty(style, "selectedStyle");
            });

            const textAttributes = style.textAttributes;
            button.style.font = textAttributes.font;

            const fontSize = textAttributes.toolbarSize ?? 10;
            button.style.setProperty("font-size", `${fontSize}pt`, "important");
            style.populateFamilyContainer(button);

            const wrapper = document.createElement("span");
            wrapper.className = "icon";
            button.insertBefore(wrapper, button.firstChild);

            if (family == selected) {
                wrapper.appendChild(AppIcons.Checkmark());
            }

            return { family, wrapper, button };
        });
        this.menuItems = menuItems.filter(item => item != null);
        menu.addEventListener("dismiss", this.menuItems = null);
    }
    updateListContents() {
        const selected = this.selectedStyle;
        this.label.innerText = selected.family;
    }
    updateMenuContents() {
        const menuItems = this.menuItems;
        if (menuItems == null) {
            return;
        }

        const selected = this.selectedStyle?.family;
        menuItems.forEach(item => {
            const wrapper = item.wrapper;
            RemoveAllChildrenFrom(wrapper);

            if (item.family == selected) {
                wrapper.appendChild(AppIcons.Checkmark());
            }
        })
    }
}

TextSlideFormatBar.VariantButton = class extends TextSlideFormatBar.DropdownMenu {
    constructor(styles, showRoomBackground=true, title=null) {
        super("div");

        this.automaticallyNotifiesObserversOfSelectedStyle = false;

        this.styles = styles ?? Media.Text.Styles;
        this.showRoomBackground = showRoomBackground;
        this.title = title;
    }
    set selectedStyle(style) {
        if (style?.themeID == this._selectedStyle?.themeID) {
            return;
        }
        this._selectedStyle = style;

        this.updateListContents();
        this.updateMenuContents();
    }
    get selectedStyle() {
        return this._selectedStyle;
    }
    get variants() {
        const selected = this.selectedStyle;
        if (selected == null) {
            return [];
        }

        const family = selected.family;
        const variants = this.styles.filter(style => style.family == family);
        variants.sort((a, b) => {
            const orderA = a.sortOrder;
            const orderB = b.sortOrder;
            if (orderA != null && orderB != null) {
                if (orderA < orderB) return -1;
                if (orderA > orderB) return 1;
                return 0;
            }
            return a.themeID.localeCompare(b.themeID);
        })

        return variants;
    }
    populateMenu(menu) {
        // The grid displaying the variants
        const variantGrid = document.createElement("div");
        variantGrid.classList.add("variant_grid");
        menu.addCustomView(variantGrid);

        // Have to tweak the Menu's element :(
        const variantSheet = variantGrid.parentElement;
        variantSheet.classList.add("variant_grid_sheet");

        const selected = this.selectedStyle;
        // Create buttons for the variants
        const variantsWithButtons = this.variants.map(style => {
            const button = document.createElement("button");
            button.title = style.variant;
            button.classList.add("variant_button");
            this.stylizeVariantContainer(style, button);

            if (style.themeID == selected.themeID) {
                button.classList.add("selected");
            }

            button.addEventListener("click", (event) => {
                this.selectedStyle = style;
                this.didChangeValueForProperty(style, "selectedStyle");
            });

            return {style, button};
        });

        // And add them to the grid
        variantsWithButtons.forEach(entry => variantGrid.appendChild(entry.button));
        this.variantsWithButtons = variantsWithButtons;
    }
    updateMenuContents() {
        if (this.menu == null) {
            // Nothing to do
            return;
        }

        const selected = this.selectedStyle;
        this.variantsWithButtons.forEach(entry => {
            const classList = entry.button.classList;
            if (entry.style == selected) {
                classList.add("selected");
            }
            else {
                classList.remove("selected");
            }
        })
    }
    updateListContents() {
        let preview = this.preview;
        if (preview == null) {
            const container = this.label;

            const title = this.title;
            if (title != null) {
                const element = document.createElement("span");
                element.innerText = title;
                container.parentNode.insertBefore(element, container);
            }

            preview = document.createElement("div");
            container.appendChild(preview);
            this.preview = preview;
        }
        this.stylizeVariantContainer(this.selectedStyle, preview);
    }
    _variantCanvasForStyleWithBackground(style, bgImage) {
        const retina = window.devicePixelRatio;
        // XXX: It'd be swell to not hardcode a size...
        const width = 48 * retina;
        const height = 48 * retina;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width / retina}px`;
        canvas.style.height = `${height / retina}px`;
        canvas.style.position = "absolute";
        canvas.style.top = "0px";
        canvas.style.left = "0px";

        const context = canvas.getContext("2d");

        const iWidth = bgImage.naturalWidth;
        const iHeight = bgImage.naturalHeight;
        const iScale = Math.max(width / iWidth, height / iHeight);
        const iRect = RectMake(0, 0, iWidth * iScale, iHeight * iScale);
        iRect.x = (width - iRect.width) / 2;
        iRect.y = (height - iRect.height) / 2;

        context.drawImage(bgImage,
            0, 0, iWidth, iHeight,
            iRect.x, iRect.y, iRect.width, iRect.height,
        );

        const padding = 4;
        context.translate(padding, padding);
        style.drawPreviewInContext(
            context,
            canvas.width - (padding * 2),
            canvas.height - (padding * 2)
        );

        return canvas;
    }
    stylizeVariantContainer(style, container) {
        const textAttributes = style.textAttributes;
        container.classList.add("textstyle_variant");
        RemoveAllChildrenFrom(container);

        const showRoomBackground = this.showRoomBackground;

        // XXX: Observe stage's room?
        const room = gApp.stage.room;
        if (showRoomBackground != false && room != null && room.thumbnailAsset != null) {
            container.style.backgroundRepeat = "no-repeat";
            container.style.backgroundPosition = "center center";

            const thumbnail = room.thumbnailAsset;
            thumbnail.openAsElement().then(element => {
                let backgroundSize;

                if (style.backgroundIsDynamic != true) {
                    container.style.backgroundImage = `url(${element.src})`;
                    backgroundSize = "cover";
                }
                else {
                    const canvas = this._variantCanvasForStyleWithBackground(style, element);
                    const dataURI = canvas.toDataURL("image/png");
                    container.style.backgroundImage = `url(${dataURI})`;
                    backgroundSize = "contain";
                }

                container.style.setProperty("background-size", backgroundSize, "important");
            });
        }

        const layer = document.createElement("div");
        layer.className = "layer";
        container.appendChild(layer);

        const bgAttrs = style.backgroundAttributes ?? {};
        const fillPaint = bgAttrs.fill;
        if (fillPaint != null) {
            layer.style.background = fillPaint.toCSS(true);
        }

        const text = document.createElement("div");
        layer.appendChild(text);
        text.innerText = "A";
        text.style.color = textAttributes.color;

        style.populatePreviewContainer(container, text);
    }
}

TextSlideFormatBar.SizeButton = class extends TextSlideFormatBar.DropdownMenu {
    constructor() {
        super();

        this.fontSizeOptions = [
            {
                value: Media.Text.Size.Small,
                label: LocalizedString("Small")
            },
            {
                value: Media.Text.Size.Medium,
                label: LocalizedString("Medium")
            },
            {
                value: Media.Text.Size.Large,
                label: LocalizedString("Large")
            },
            {
                value: Media.Text.Size.ExtraLarge,
                label: LocalizedString("X-Large")
            },
        ];

        this.automaticallyNotifiesObserversOfSelectedSize = false;
    }
    set selectedSize(size) {
        if (size == this._selectedSize) {
            return;
        }

        this._selectedSize = size;
        this.updateListContents();
        this.updateMenuContents();
    }
    get selectedSize() {
        return this._selectedSize;
    }
    get selectedOption() {
        const selectedSize = this.selectedSize;
        return this.fontSizeOptions.find(option => option.value == selectedSize);
    }
    populateMenu(menu) {
        const selected = this.selectedSize;

        const items = this.fontSizeOptions.map(option => {
            const button = menu.addItem(option.label, () => {
                const selectedSize = option.value;
                this.selectedSize = selectedSize;
                this.didChangeValueForProperty(selectedSize, "selectedSize");
            });

            const wrapper = document.createElement("span");
            wrapper.className = "icon";
            button.insertBefore(wrapper, button.firstChild);

            if (option.value == selected) {
                wrapper.appendChild(AppIcons.Checkmark());
            }

            return {option, button, wrapper};
        });
        this.menuItems = items;
    }
    updateListContents() {
        this.label.innerText = this.selectedOption.label;
    }
    updateMenuContents() {
        if (this.menu == null) {
            return;
        }

        const selection = this.selectedOption;
        this.menuItems.forEach(item => {
            const wrapper = item.wrapper;
            RemoveAllChildrenFrom(wrapper);

            if (item.option == selection) {
                wrapper.appendChild(AppIcons.Checkmark());
            }
        })
    }
}
