//
//  media/text/styles/core.js
//  mmhmm
//
//  Created by Steve White on 2/23/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

Media.Text.Style = class extends ObservableObject {
    constructor(family, variant, themeID, parameters) {
        super();

        this.family = family;
        this.variant = variant;
        this.themeID = themeID;
        this.minimumSize = null;
        Object.assign(this, parameters);
    }
    clone() {
        var props = Object.assign({}, this);
        props.backgroundAttributes = Object.assign({}, props.backgroundAttributes);
        props.textAttributes = Object.assign({}, props.textAttributes);
        const linkAttributes = props.linkAttributes;
        if (linkAttributes != null) {
            props.linkAttributes = Object.assign({}, linkAttributes);
        }

        var r = new this.constructor();
        Object.assign(r, props);
        return r;
    }
    get defaultContentSize() {
        // Roughy approximation of .Square at 70% scale
        return SizeMake(806, 756);
    }
    get supportsRTF() {
        return true;
    }
    get supportsCornerRadius() {
        return true;
    }
    set contentInsets(val) {
        this._contentInsets = InsetsCopy(val);
    }
    get contentInsets() {
        return InsetsCopy(this._contentInsets);
    }
    async loadAssetsIntoCache() {
        var textAttributes = this.textAttributes;
        var font = textAttributes.font;
        if (font.load != null) {
            return font.load();
        }
        return Promise.resolve();
    }
    minimumCharacterSizeForSize(sizeEnum) {
        var pointSize = this.sizes[sizeEnum] ?? 72;
        return pointSize * 1.25;
    }
    minimumContentSizeForSize(sizeEnum) {
        const charSize = this.minimumCharacterSizeForSize(sizeEnum);

        const insets = InsetsCopy(this.contentInsets);
        if (this.insetsAreProportional == true) {
            insets.left = Math.floor(insets.left * charSize);
            insets.right = Math.ceil(insets.right * charSize);
            insets.top = Math.floor(insets.top * charSize);
            insets.bottom = Math.ceil(insets.bottom * charSize);
        }

        const bgInset = this.backgroundInset ?? 0;
        const size = SizeMake(
            charSize + (insets.left + insets.right) + (bgInset * 2),
            charSize + (insets.top + insets.bottom) + (bgInset * 2),
        );
        return size;
    }
    pointSizeForSize(sizeEnum) {
        var sizes = this.sizes ?? {};
        var size = sizes[sizeEnum];
        if (size == null) {
            size = sizes[Media.Text.Size.Large];
            if (size == null) {
                size = 96;
            }
        }
        return size;
    }
    getLinkAttributes() {
        var linkAttributes = this.linkAttributes;
        if (linkAttributes == null) {
            linkAttributes.color = Color(0.259, 0.204, 0.949, 1);
            linkAttributes.underline = true;
        }
        return linkAttributes;
    }
    drawInContext(context, width, height, mediaCornerRadius) {
        const attrs = this.backgroundAttributes ?? {};

        let path = null;
        const strokeWidth = attrs.strokeWidth;
        if (strokeWidth != null) {
            context.lineWidth = strokeWidth;

            var styleCornerRadius = this.cornerRadius;
            if (styleCornerRadius != null || mediaCornerRadius != null) {
                var pathRect = RectMake(strokeWidth / 2, strokeWidth / 2, width - strokeWidth, height - strokeWidth);
                var radius = null;
                if (mediaCornerRadius != null) {
                    radius = (Math.min(pathRect.width, pathRect.height) / 2) * mediaCornerRadius;
                }
                else {
                    radius = styleCornerRadius;
                }
                path = NewRoundRectPathForRectWithRadius(pathRect, radius);
            }
        }

        const fillPaint = attrs.fill;
        if (fillPaint != null) {
            fillPaint.fillInContext(context, SizeMake(width, height), path);
        }

        const strokePaint = attrs.stroke;
        if (strokePaint != null) {
            strokePaint.strokeInContext(context, SizeMake(width, height), path);
        }
    }
    valueForKeyPath(keyPath) {
        const comps = keyPath.split(".");
        const numComps = comps.length;
        let current = this;
        for (let compIdx=0; compIdx<numComps; compIdx+=1) {
            const key = comps[compIdx];
            const next = current[key];
            if (compIdx + 1 == numComps) {
                return next;
            }
            current = next;
        }
    }
    setValueForKeyPath(value, keyPath) {
        const comps = keyPath.split(".");
        const numComps = comps.length;
        let current = this;
        for (let compIdx=0; compIdx<numComps; compIdx+=1) {
            const key = comps[compIdx];
            if (compIdx + 1 == numComps) {
                current[key] = value;
                return;
            }
            const next = current[key];
            current = next;
        }
    }
    drawPreviewInContext(context, width, height) {
        return this.drawInContext(context, width, height);
    }
    populatePreviewContainer(container) {
        // Intentionally blank, subclass hook
    }
    populateEditorContainer(container) {
        // Intentionally blank, subclass hook
    }
    populateFamilyContainer(container) {
        // Intentionally blank, subclass hook
    }
    async preprocessThumbnailInContext(context, loader, width, height) {
        this.drawInContext(context, width, height);
    }
    async postprocessThumbnailInContext(context, loader, width, height) {
        // Intentionally blank, subclass hook
    }
    encodeToRecord(record) {
        // Intentionally blank, subclass hook
    }
    decodeFromRecord(record) {
        // Intentionally blank, subclass hook
    }
}

