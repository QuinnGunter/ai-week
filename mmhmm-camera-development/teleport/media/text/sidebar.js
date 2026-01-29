//
//  media/text/sidebar.js
//  mmhmm
//
//  Created by Steve White on 3/6/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

Media.Text.SidebarPane = class extends Media.SidebarPane {
    // Text is a little goofy in that while editing, the
    // changes don't propagate out the network, and that
    // changes from the network don't propagate into the editor
    // This means we'll need to alter what we talk to -
    // the media or its editor
    set target(object) {
        const previous = this._target;
        if (previous == object) {
            return;
        }
        if (previous != null) {
            previous.removeObserverForProperty(this, "textAlignment");
            previous.removeObserverForProperty(this, "textSize");
            previous.removeObserverForProperty(this, "style");
            if (IsKindOf(previous, TextSlideEditor) == true) {
                previous.removeObserverForProperty(this, "state");
            }
            else {
                previous.removeObserverForProperty(this, "attributedString");
            }
        }
        this._target = object;
        if (object != null) {
            object.addObserverForProperty(this, "textAlignment");
            object.addObserverForProperty(this, "textSize");
            object.addObserverForProperty(this, "style");
            if (IsKindOf(object, TextSlideEditor) == true) {
                object.addObserverForProperty(this, "state");
            }
            else {
                object.addObserverForProperty(this, "attributedString");
            }
        }
        this.targetHasChanged();
    }
    get target() {
        return this._target;
    }
    //
    // Media.SidebarPane overrides
    //
    attachTo(parentElement) {
        super.attachTo(parentElement);

        const media = this.media;
        media.addObserverForProperty(this, "editor");

        this.target = media.editor ?? media;
    }
    removeFrom(parentElement) {
        super.removeFrom(parentElement);

        const media = this.media;
        media.removeObserverForProperty(this, "editor");
        this.target = null;

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
    }
    populateContents(container) {
        this.addThemesToContainer(container);
        this.addVariantsToContainer(container);
        this.addFontSizeToContainer(container);
        this.addFormatsToContainer(container);
        super.populateContents(container);
    }
    //
    // UI Construction
    //
    addThemesToContainer(container) {
        const row = document.createElement("div");
        row.classList.add("text_format_bar", "row");
        container.appendChild(row);

        const label = document.createElement("label");
        label.innerText = LocalizedString("Theme");
        row.appendChild(label);

        const selector = new TextSlideFormatBar.FamilyButton();
        row.appendChild(selector.button);
        selector.addObserverForProperty(this, "selectedStyle");
        this.familySelector = selector;
    }
    addVariantsToContainer(container) {
        const row = document.createElement("div");
        row.classList.add("text_format_bar", "row")
        container.appendChild(row);

        const label = document.createElement("label");
        label.innerText = LocalizedString("Color");
        row.appendChild(label);

        const selector = new TextSlideFormatBar.VariantButton();
        selector.addObserverForProperty(this, "selectedStyle");
        row.appendChild(selector.button);

        this.variantSelector = selector;
    }
    addFontSizeToContainer(container) {
        const row = document.createElement("div");
        row.classList.add("text_format_bar", "row")
        container.appendChild(row);

        const label = document.createElement("label");
        label.innerText = LocalizedString("Size");
        row.appendChild(label);

        const selector = new TextSlideFormatBar.SizeButton();
        selector.addObserverForProperty(this, "selectedSize");
        row.appendChild(selector.button);
        this.sizeSelector = selector;
    }
    addFormatsToContainer(container) {
        const row = document.createElement("div");
        row.classList.add("text_format_bar");
        row.style.display = "flex";
        row.style.flexDirection = "row";
        container.appendChild(row);

        //
        // Attributes
        //
        const attributes = [
            { element: null, title: LocalizedString("Bold"), icon: AppIcons.TextAttributeBold(), value: TextSlideEditor.Attribute.Bold },
            { element: null, title: LocalizedString("Italic"), icon: AppIcons.TextAttributeItalic(), value: TextSlideEditor.Attribute.Italic },
            { element: null, title: LocalizedString("Strikethrough"), icon: AppIcons.TextAttributeStrikethrough(), value: TextSlideEditor.Attribute.Strikethrough },
        ];
        attributes.forEach(attribute => {
            const button = document.createElement("button");
            button.classList.add("toggle");
            button.title = attribute.title;
            button.appendChild(attribute.icon);
            button.addEventListener("click", (event) => this.toggleAttribute(attribute.value));
            row.appendChild(button);
            attribute.element = button;
        });
        this.attributes = attributes;

        //
        // Alignments
        //
        const alignments = [
            { element: null, title: LocalizedString("Left"), icon: AppIcons.TextAlignmentLeft(), value: AdvancedTextLayer.HorizontalAlignment.Left },
            { element: null, title: LocalizedString("Center"), icon: AppIcons.TextAlignmentCenter(), value: AdvancedTextLayer.HorizontalAlignment.Center },
            { element: null, title: LocalizedString("Right"), icon: AppIcons.TextAlignmentRight(), value: AdvancedTextLayer.HorizontalAlignment.Right },
        ];
        alignments.forEach(alignment => {
            const button = document.createElement("button");
            button.classList.add("toggle");
            button.title = alignment.title;
            button.appendChild(alignment.icon);
            button.addEventListener("click", (event) => this.setAlignment(alignment.value));
            row.appendChild(button);
            alignment.element = button;
        });
        this.alignments = alignments;
    }
    //
    // UI state updating
    //
    updateSelectedAlignment(target) {
        const alignments = this.alignments;
        if (alignments == null) {
            return;
        }

        const selection = (
            target.textAlignment ??
            target.style.textAttributes?.alignment ??
            AdvancedTextLayer.HorizontalAlignment.Left
        );
        alignments.forEach(alignment => {
            const classList = alignment.element?.classList;
            if (classList == null) {
                return;
            }

            if (alignment.value == selection) {
                classList.add("selected");
            }
            else {
                classList.remove("selected");
            }
        })
    }
    updateSelectedAttributes(target) {
        const attributes = this.attributes;
        if (attributes == null) {
            return;
        }

        let attrState;
        if (IsKindOf(target, TextSlideEditor) == true) {
            attrState = target.state;
        }
        else {
            attrState = this._stateFromAttributedString(target.attributedString);
        }

        attributes.forEach(attr => {
            const element = attr.element;
            if (attrState[attr.value] == "off") {
                element.classList.remove("selected");
            }
            else {
                element.classList.add("selected");
            }
        })
    }
    updateSelectedSize(target) {
        const selector = this.sizeSelector;
        if (selector != null) {
            const textSize = target.textSize ?? Media.Text.Size.Medium;
            selector.selectedSize = textSize;
        }
    }
    updateStyleDependencies(target) {
        const style = target.style;
        const cornerRadiusSlider = (this.sliders ?? []).find(a => a.key == "cornerRadius");
        if (cornerRadiusSlider != null) {
            cornerRadiusSlider.container.style.display = (style.supportsCornerRadius ? "" : "none");
        }

        const familySelector = this.familySelector;
        if (familySelector != null) {
            familySelector.selectedStyle = style;
        }
        const variantSelector = this.variantSelector;
        if (variantSelector != null) {
            variantSelector.selectedStyle = style;
        }
    }
    targetHasChanged() {
        const target = this.target;
        if (target == null) {
            return;
        }

        this.updateSelectedAlignment(target);
        this.updateSelectedSize(target);
        this.updateSelectedAttributes(target);
        this.updateStyleDependencies(target);
    }
    //
    // Actions
    //
    setAlignment(textAlignment) {
        this.target.textAlignment = textAlignment;
    }
    toggleAttribute(attribute) {
        const target = this.target;
        if (IsKindOf(target, TextSlideEditor) == true) {
            target.toggleAttribute(attribute);
        }
        else {
            const attributedString = target.attributedString;
            const state = this._stateFromAttributedString(attributedString);
            const removeAttribute = (state[attribute] == "on");

            let reformatted = new AttributedString();
            attributedString.enumerate((offset, text, attrs) => {
                let newAttrs = Object.assign({}, attrs);
                if (removeAttribute == true) {
                    delete newAttrs[attribute];
                }
                else {
                    newAttrs[attribute] = true;
                }
                reformatted.appendStringWithAttributes(text, newAttrs);
            })
            target.attributedString = reformatted;
        }
    }
    //
    // Helpers
    //
    _stateFromAttributedString(attributedString) {
        const state = {
            [TextSlideEditor.Attribute.Bold]: 0,
            [TextSlideEditor.Attribute.Italic]: 0,
            [TextSlideEditor.Attribute.Underline]: 0,
            [TextSlideEditor.Attribute.Strikethrough]: 0
        };

        let count = 0;
        attributedString.enumerate((offset, text, attrs) => {
            count += 1;
            for (const key in state) {
                if (attrs[key] == true) {
                    state[key] += 1;
                }
            }
        });
        for (const key in state) {
            const attrCount = state[key];
            let named;
            if (attrCount == 0) {
                named = "off";
            }
            else if (attrCount == count) {
                named = "on";
            }
            else {
                named = "mixed"
            }
            state[key] = named;
        }
        return state;
    }
    themes() {
        const families = [];
        Media.Text.Styles.forEach(style => {
            const family = style.family;
            if (families.indexOf(family) == -1) {
                families.push(family);
            }
        });
        return families;
    }
    variantsForTheme(themeName) {
        const variants = [];
        Media.Text.Styles.forEach(style => {
            if (style.family == themeName) {
                variants.push(style);
            }
        });
        return variants;
    }
    //
    // KVO
    //
    observePropertyChanged(obj, key, val) {
        if (obj == this.variantSelector || obj == this.familySelector) {
            this.media.formatBarSelectedStyle(this, obj.selectedStyle);
        }
        else if (obj == this.sizeSelector) {
            this.media.formatBarSelectedSize(this, obj.selectedSize);
        }
        else if (key == "editor") {
            const media = this.media;
            this.target = media.editor ?? media;
        }
        else if (key == "textAlignment") {
            this.updateSelectedAlignment(obj);
        }
        else if (key == "textSize") {
            this.updateSelectedSize(obj);
        }
        else if (key == "style") {
            this.updateStyleDependencies(obj);
        }
        else if (key == "attributedString" || key == "state") {
            this.updateSelectedAttributes(obj);
        }
    }
}
