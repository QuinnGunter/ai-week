//
//  media/namebadge/media.js
//  mmhmm
//
//  Created by Steve White on 3/11/25.
//  Copyright © 2025 mmhmm, inc. All rights reserved.
//

Media.NameBadge = class extends Media {
    constructor(identifier, presenterID) {
        super(identifier, presenterID);

        this.backgroundLayer = new Media.NameBadge.BackgroundLayer();
        this.titleLabel = new Media.NameBadge.TextLayer();
        this.subtitleLabel = new Media.NameBadge.TextLayer(true);
    }

    static FontConfig = [
        {
            label: LocalizedString("Archivo Black"),
            value: "Archivo Black",
            className: "archivo-black-regular",
        },
        {
            label: LocalizedString("Bebas Neue"),
            value: "Bebas Neue",
            className: "bebas-neue-regular",
        },
        {
            label: LocalizedString("Dune Rise"),
            value: "Dune Rise",
            className: "dune-rise",
        },
        {
            label: LocalizedString("Jacquard"),
            value: "Jacquard",
            className: "jacquard-regular",
        },
        {
            label: LocalizedString("Figtree"),
            value: "Figtree",
            className: "figtree-900",
        },
        {
            label: LocalizedString("Figtree Italic"),
            value: "Figtree Italic",
            className: "figtree-900-italic",
        },
        {
            label: LocalizedString("IBM Plex Mono"),
            value: "IBM Plex Mono",
            className: "ibm-plex-mono-regular",
        },
        {
            label: LocalizedString("Instrument Serif"),
            value: "Instrument Serif",
            className: "instrument-serif-regular",
        },
        {
            label: LocalizedString("Inter"),
            value: "Inter",
            className: "inter-regular",
        },
        {
            label: LocalizedString("Libre Bodoni Italic"),
            value: "Libre Bodoni Italic",
            className: "libre-bodoni-italic",
        },
        {
            label: LocalizedString("Michroma Regular"),
            value: "Michroma Regular",
            className: "michroma-regular",
        },
        {
            label: LocalizedString("Montagu Slab SemiBold"),
            value: "Montagu Slab SemiBold",
            className: "montagu-slab-semibold",
        },
        {
            label: LocalizedString("Oswald"),
            value: "Oswald",
            className: "oswald-regular",
        },
        {
            label: LocalizedString("Roboto Serif"),
            value: "Roboto Serif",
            className: "roboto-serif-light",
        },
        {
            label: LocalizedString("Rubik"),
            value: "Rubik",
            className: "rubik-bold",
        },
        {
            label: LocalizedString("Source Serif Black"),
            value: "Source Serif Black",
            className: "source-serif-black",
        }
    ];

    get movable() {
        return false;
    }
    get resizable() {
        return false;
    }
    get preserveAspectRatio() {
        return true;
    }
    get croppable() {
        return false;
    }
    get editable() {
        return false;
    }
    get assets() {
        const assets = super.assets;
        const fontAsset = this.fontAsset;
        if (fontAsset != null) {
            assets.push(fontAsset);
        }
        return assets;
    }
    _updateContentsSource(previousURL, currentURL) {
        super._updateContentsSource(previousURL, currentURL);
        // Our font asset may have updated its url (expired, etc)
        // do we need to do anything?
    }

    setFullscreenAnimated(fullscreen, animated) {
        // Intentionally blank - we don't support fullscreen
    }

    onMouseClick(event) {
        if (App.isDemo) {
            const sheet = new NametagFieldsSheet(this.titleLabel.string, this.subtitleLabel.string);
            sheet.titleInput.addEventListener("input", () => {
                // By going through the helper we save the user's defaults for next time
                LooksNameBadgeHandler.updateNameBadgeMediaTitle(this, sheet.titleInput.value);
            });
            sheet.subtitleInput.addEventListener("input", () => {
                LooksNameBadgeHandler.updateNameBadgeMediaSubtitle(this, sheet.subtitleInput.value);
            });
            sheet.displayAsModal();
            sheet.addEventListener("dismiss", () => {
                if (this.stage && this.stage.selectedObject == this) {
                    this.stage.selectedObject = null;
                }
            });
        }
    }

    newLayer(stageSize) {
        const layer = this.backgroundLayer;

        // In the look builder / demo mode, clicking on the name badge on stage
        // allows you to change the strings
        layer.userInteractionEnabled = App.isDemo;
        layer.delegate = this;

        const titleLabel = this.titleLabel;
        layer.addSublayer(titleLabel);
        this.titleLabel = titleLabel;

        const subtitleLabel = this.subtitleLabel;
        layer.addSublayer(subtitleLabel);
        this.subtitleLabel = subtitleLabel;

        return layer;
    }

    layoutLayerWithContentSize(contentSize, maxSize) {
        const frame = RectZero();

        const left = this.left;
        const right = this.right;
        const top = this.top;
        const bottom = this.bottom;

        // Width sizing
        if ((left != null && left >= 0) && (right != null && right >= 0)) {
            frame.width = maxSize.width - right - left;
        }
        else {
            frame.width = contentSize.width;
        }

        // Height sizing
        if ((top != null && top >= 0) && (bottom != null && bottom >= 0)) {
            frame.height = maxSize.height - bottom - top;
        }
        else {
            frame.height = contentSize.height;
        }

        // X axis placement
        if (left == null && right == null) {
            frame.x = (maxSize.width / 2) - (frame.width / 2);
        }
        else if (left != null && left >= 0) {
            frame.x = left;
        }
        else if (right != null && right >= 0) {
            frame.x = maxSize.width - right - frame.width;
        }

        // Y axis placement
        if (top == null && bottom == null) {
            frame.y = (maxSize.height / 2) - (frame.height / 2);
        }
        else if (top != null && top >= 0) {
            frame.y = top;
        }
        else if (bottom != null && bottom >= 0) {
            frame.y = maxSize.height - bottom - frame.height;
        }

        this.backgroundLayer.frame = RectIntegral(frame);
        return frame;
    }

    async getContentSize() {
        if (this.layer != null) {
            return super.getContentSize();
        }

        const layer = this.newLayer(Stage.DefaultSize);

        this.layer = layer;
        this.resizeLayer();
        this.layer = null;

        const size = layer.naturalSize;

        layer.removeSublayer(this.titleLabel);
        layer.removeSublayer(this.subtitleLabel);
        return size;
    }
    // Necessary for thumbnails...
    frameForLayer() {
        if (this.stage == null) {
            this.resizeLayer();
        }
        return this.backgroundLayer.frame;
    }
    async generateThumbnail() {
        if (this.stage == null) {
            this.resizeLayer();
        }

        const background = this.backgroundLayer;
        const layerSize = background.size;

        const scale = 4;
        const thumbSize = SizeMake(
            layerSize.width / scale,
            layerSize.height / scale
        );

        const options = {
            size: thumbSize,
            type: "image/png"
        };

        return ImageBlobWithOptionsUsingCommands(options, async (context, loader) => {
            context.scale(1.0 / scale, 1.0 / scale);

            background.drawInContext(context, layerSize.width, layerSize.height);

            const title = this.titleLabel;
            const titleFrame = title.frame;
            context.save();
            context.translate(titleFrame.x, titleFrame.y);
            title.drawInContext(context, titleFrame.width, titleFrame.height);
            context.restore();

            const subtitle = this.subtitleLabel;
            if (subtitle.hidden == false) {
                const subtitleFrame = subtitle.frame;
                context.save();
                context.translate(subtitleFrame.x, subtitleFrame.y);
                subtitle.drawInContext(context, subtitleFrame.width, subtitleFrame.height);
                context.restore();
            }

            // Ensure that thumbnailing doesn't interfere with on-stage display
            background.setNeedsDisplay();
            title.setNeedsLayout();
            subtitle.setNeedsLayout();
        });
    }

    resizeLayer() {
        const maxSize = this.stage?.size ?? Stage.DefaultSize;

        const maxLabelSize = SizeCopy(maxSize);
        const maxWidth = this.maxWidth;
        if (maxWidth != null) {
            maxLabelSize.width = Math.min(maxLabelSize.width, maxWidth);
        }

        const titleLabel = this.titleLabel;
        const titleSize = titleLabel.sizeThatFits(maxLabelSize);
        const titleMargin = titleLabel.margin;
        titleLabel.size = titleSize;

        const subtitleLabel = this.subtitleLabel;
        const subtitleSize = subtitleLabel.sizeThatFits(maxLabelSize);
        const subtitleMargin = subtitleLabel.margin;
        subtitleLabel.size = subtitleSize;

        const titleWidth = (
            titleSize.width +
            (titleLabel.left ?? 0) + (titleLabel.right ?? 0) +
            (titleMargin.left ?? 0) + (titleMargin.right ?? 0)
        );
        const titleHeight = (
            titleSize.height +
            (titleLabel.top ?? 0) + (titleLabel.bottom ?? 0) +
            (titleMargin.top ?? 0) + (titleMargin.bottom ?? 0)
        );

        const subtitleWidth = (
            subtitleSize.width +
            (subtitleLabel.left ?? 0) + (subtitleLabel.right ?? 0) +
            (subtitleMargin.left ?? 0) + (subtitleMargin.right ?? 0)
        );
        const subtitleHeight = (
            subtitleSize.height +
            (subtitleLabel.top ?? 0) + (subtitleLabel.bottom ?? 0) +
            (subtitleMargin.top ?? 0) + (subtitleMargin.bottom ?? 0)
        );

        const maxLabelWidth = Math.max(titleWidth, subtitleWidth);
        const combinedLabelHeight = titleHeight + subtitleHeight;

        const ourFrame = this.layoutLayerWithContentSize(SizeMake(maxLabelWidth, combinedLabelHeight), maxSize);
        const sizes = Media.NameBadge.Sizing;

        const box = RectZero();
        box.width = maxLabelWidth;
        box.height = combinedLabelHeight;
        box.x = (ourFrame.width - box.width) / 2;
        box.y = (ourFrame.height - box.height) / 2;

        [titleLabel, subtitleLabel].forEach((label) => {
            const frame = label.frame;

            const top = label.top;
            const left = label.left;
            const bottom = label.bottom;
            const right = label.right;

            if (left == null && right == null) {
                // centered.
                frame.x = RectGetMinX(box) + ((RectGetWidth(box) - RectGetWidth(frame)) / 2);
            }
            else if ((left != null && left >= 0) && (right != null && right >= 0)) {
                // stretch to fill
                frame.x = left;
                frame.width = RectGetWidth(ourFrame) - right - RectGetMinX(frame);
            }
            else if (left != null && left >= 0) {
                // left aligned
                frame.x = left;
            }
            else if (right != null && right >= 0) {
                // right aligned
                frame.x = RectGetWidth(ourFrame) - right - RectGetWidth(frame);
            }

            if (top == null && bottom == null) {
                // centered.
                frame.y = RectGetMinX(box) + ((RectGetHeight(box) - RectGetHeight(frame)) / 2);
            }
            else if ((top != null && top >= 0) && (bottom != null && bottom >= 0)) {
                // stretch to fill
                frame.y = top;
                frame.height = RectGetHeight(ourFrame) - bottom - RectGetMinY(frame);
            }
            else if (top != null && top >= 0) {
                // top aligned
                frame.y = RectGetMinY(box) + top;
            }
            else if (bottom != null && bottom >= 0) {
                // bottom aligned
                frame.y = RectGetMaxY(box) - bottom - RectGetHeight(frame);
            }

            label.frame = RectIntegral(frame);
        });
    }

    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        if (this.style == null) {
            const styles = Media.NameBadge.Styles;
            const keys = Object.keys(styles);
            const first = keys[0];
            this._decoding = true;
            this.applyStyle(styles[first], styles[first].defaultVariant);
            this._decoding = false;
        }

        [this.titleLabel, this.subtitleLabel].forEach(layer => {
            const properties = ['string'];
            properties.forEach(prop => {
                layer.addObserverForProperty(this, prop);
            });

            // Ensure that each layer is drawn at least once
            layer.setNeedsDisplay();
        })

        this.fontAssetChanged();
    }
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);

        [this.titleLabel, this.subtitleLabel].forEach(layer => {
            const properties = ['string'];
            properties.forEach(prop => {
                layer.removeObserverForProperty(this, prop);
            });
        })
    }
    render(timestamp) {
        super.render(timestamp);

        const titleLabel = this.titleLabel;
        const subtitleLabel = this.subtitleLabel;
        const needsLayout = (titleLabel.needsLayout || subtitleLabel.needsLayout);
        if (needsLayout == true) {
            this.resizeLayer();
        }
        const backgroundLayer = this.backgroundLayer;
        if (backgroundLayer.needsDisplay == true) {
            backgroundLayer.draw();
        }
        if (titleLabel.needsDisplay == true) {
            titleLabel.draw();
        }
        if (subtitleLabel.needsDisplay == true) {
            subtitleLabel.draw();
        }
    }

    fontsLoaded() {
        this.titleLabel.setNeedsLayout();
        this.subtitleLabel.setNeedsLayout();
    }

    /**
     * Used to keep track of whether our string values were user-set.
     * @param {Boolean} val
     */
    set template(val) {
        const previous = this._template;
        if (val == previous) {
            return;
        }
        this._template = val;
    }
    get template() {
        return this._template === true;
    }

    set metadata(metadata) {
        if (EqualObjects(metadata, this._metadata)) {
            return;
        }
        this._metadata = metadata;
        this.setNeedsPersistence();
    }

    get metadata() {
        if (this._metadata == null) {
            return null;
        }
        return DeepCopy(this._metadata);
    }

    set fontAsset(anAssetOrNull) {
        const previous = this._fontAsset;
        if (previous?.fingerprint == anAssetOrNull?.fingerprint) {
            // Fingerprint hasn't changed, but we may have gone from
            // a LocalAsset to a CloudyAsset due to an upload
            if (previous?.constructor == anAssetOrNull?.constructor) {
                return;
            }
        }

        this._fontAsset = anAssetOrNull;
        this.didChangeValueForProperty(anAssetOrNull, "fontAsset");

        this.setNeedsPersistence();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'fontAsset', previous);
        if (this.stage != null) {
            this.fontAssetChanged();
        }
    }
    get fontAsset() {
        return this._fontAsset;
    }

    fontAssetChanged() {
        const fontAsset = this.fontAsset;
        if (fontAsset == null) {
            return;
        }

        // Ensure that our font is registered, making it available for us
        const blob = this.getCachedElementForAsset(fontAsset);
        Media.Text.Style.FontFaceForAsset(fontAsset, blob).then(fontFace => {
            if (fontFace == null) {
                console.error("Failed to load font face for asset", fontAsset);
                return;
            }

            if (this.variables.fontFace == null) {
                // For backwards compability, before we introduced variables.fontFace...
                this.variables.fontFace = fontFace;
                const style = this.style;
                style.base.title.fontFace = "$fontFace";
                style.base.subtitle.fontFace = "$fontFace";
                this.setNeedsPersistence();
                this._rebuildLayerStyling();
            } else if (Media.Text.Style.IsFontFamilyFromAsset(this.variables.fontFace, this.fontAsset)) {
                // If we're currently using the custom font re-render,
                // since it may not have been loaded when we first rendered
                this.titleLabel.setNeedsLayout();
                this.subtitleLabel.setNeedsLayout();
            }
        }).catch(error => {
            console.error("Failed to load font face for asset", fontAsset, error);
        });
    }

    set maxWidth(number) {
        const previous = this._maxWidth;
        if (number == previous) {
            return;
        }
        this._maxWidth = number;
        this.setNeedsPersistence();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'maxWidth', previous);

        if (this.layer != null) {
            this.resizeLayer();
        }
    }
    get maxWidth() {
        return this._maxWidth;
    }

    set top(top) {
        const previous = this._top;
        if (top == previous) {
            return;
        }

        this._top = top;
        this.setNeedsPersistence();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'top', previous);

        if (this.layer != null) {
            this.resizeLayer();
        }
    }
    get top() {
        return this._top;
    }
    set left(left) {
        const previous = this._left;
        if (left == previous) {
            return;
        }

        this._left = left;
        this.setNeedsPersistence();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'left', previous);

        if (this.layer != null) {
            this.resizeLayer();
        }
    }
    get left() {
        return this._left;
    }
    set bottom(bottom) {
        const previous = this._bottom;
        if (bottom == previous) {
            return;
        }

        this._bottom = bottom;
        this.setNeedsPersistence();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'bottom', previous);

        if (this.layer != null) {
            this.resizeLayer();
        }
    }
    get bottom() {
        return this._bottom;
    }
    set right(right) {
        const previous = this._right;
        if (right == previous) {
            return;
        }

        this._right = right;
        this.setNeedsPersistence();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'right', previous);

        if (this.layer != null) {
            this.resizeLayer();
        }
    }
    get right() {
        return this._right;
    }

    set style(obj) {
        const previous = this._style;
        if (EqualObjects(obj, previous) == true) {
            return;
        }

        this._style = obj;
        this.setNeedsPersistence();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'style', previous);
        this._rebuildLayerStyling();
    }
    get style() {
        return this._style;
    }
    set variables(obj) {
        const previous = this._variables;
        if (previous == obj) {
            return;
        }

        if (previous != null) {
            Object.keys(previous).forEach(prop => {
                previous.removeObserverForProperty(this, prop)
            })
        }

        this._variables = obj;
        if (obj != null) {
            Object.keys(obj).forEach(prop => {
                obj.addObserverForProperty(this, prop)
            })
        }

        this.setNeedsPersistence();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'variables', previous);
        this._rebuildLayerStyling();
    }
    get variables() {
        return this._variables;
    }

    _rebuildLayerStyling() {
        const variables = this.variables;
        const style = this.style;

        let base = style.base;
        let overrides = style.variants[style.selectedVariant];
        if (variables != null) {
            base = variables.resolve(base);
            overrides = variables.resolve(overrides);
        }

        const layoutProps = ["top", "left", "bottom", "right", "maxWidth"];
        layoutProps.forEach(prop => {
            let value = null;
            if (prop in overrides) {
                value = overrides[prop];
            }
            else if (prop in base) {
                value = base[prop];
            }
            this[prop] = value;
        })

        const children = {
            'title': this.titleLabel,
            'subtitle': this.subtitleLabel,
            'background': this.backgroundLayer,
        };

        for (let key in children) {
            const obj = children[key];
            const settings = {};

            obj.codingProperties.forEach(prop => settings[prop] = null);
            Object.assign(settings, base[key]);
            Object.assign(settings, overrides[key]);

            if ('string' in obj) {
                settings.string = obj.string;
            }
            obj.decodeFrom(settings);
        }
    }

    applyStyle(style, variantNum) {
        this.undoManager?.beginUndoGrouping();

        const settings = style.base;
        const changingStyle = (style.id != this?.style?.id);
        this.style = {
            id: style.id,
            name: style.name,
            base: settings,
            selectedVariant: variantNum,
            variants: style.variants,

            // Save the original variables so that we can reset to them later
            variables: style.variables,
        };

        let variables = this.variables;
        if (changingStyle == true || variables == null) {
            variables = new Media.NameBadge.Variables(style.variables ?? {});
        }
        this.variables = variables;

        // XXX: What to do about the fontAsset / fontFace?

        this.undoManager?.endUndoGrouping();
    }

    restoreDefaultColors() {
        const defaults = this.style.variables;
        if (defaults) {
            // Start with the current variables
            const newVariables = Object.assign({}, this.variables);

            // Reset any Paint values
            Object.keys(defaults).forEach(key => {
                const val = defaults[key];
                if (val.toCSS != null) {
                    newVariables[key] = val;
                }
            });
            this.variables = new Media.NameBadge.Variables(newVariables);
        }
    }

    observePropertyChanged(obj, key, val) {
        const titleLabel = this.titleLabel;
        const subtitleLabel = this.subtitleLabel;
        if (obj == titleLabel || obj == subtitleLabel) {
            let sender;
            if (obj == titleLabel) {
                sender = "title";
            }
            else if (obj == subtitleLabel) {
                sender = "subtitle";
            }
            else {
                return;
            }

            this.setNeedsPersistence();
        }
        else if (obj == this.variables) {
            // XXX: Probably send a message out teleport
            this._rebuildLayerStyling();
        }
        else {
            super.observePropertyChanged(obj, key, val);
        }
    }
    /*
     *
     */
    toJSON() {
        var r = super.toJSON();

        r.style = this.style;
        r.variables = this.variables;
        r.title = this.titleLabel.string;
        r.subtitle = this.subtitleLabel.string;

        return r;
    }
    applyEvent(event, sender) {
        super.applyEvent(event, sender);
        if (event == null) {
            return;
        }

        const style = event.style;
        if (style != null) {
            this.applyStyle(style, 0);
        }
        if ('variables' in event) {
            // XXX: might need to handle individual change?
            const variables = event.variables ?? {};
            this.variables = new Media.NameBadge.Variables(variables);
        }

        if ('title' in event) {
            this.titleLabel.string = event.title;
        }
        if ('subtitle' in event) {
            this.subtitleLabel.string = event.subtitle;
        }
    }
    /** Ensure that Paint and FontFace objects are correctly encoded */
    encodeVariables(variables) {
        const results = {};
        Object.keys(variables).forEach(key => {
            const val = variables[key];
            if (IsKindOf(val, FontFace)) {
                results[key] = val.family;
            } else if (val?.toJSON != null) {
                results[key] = val.toJSON();
            } else {
                results[key] = val;
            }
        });
        return results;
    }
    decodeVariables(variables) {
        const result = {};
        Object.keys(variables).forEach(key => {
            const val = variables[key];
            const paint = Paint.FromJSON(val);
            if (paint != null) {
                // If it's an encoded Paint, decode it
                result[key] = paint;
            } else {
                // Otherwise, just use the value
                result[key] = val;
            }
        });
        return result;
    }
    // Jump through some hoops to encode Paint and FontFace objects correctly
    encodeStyle(style) {
        const result = {};
        Object.keys(style).forEach(key => {
            result[key] = style[key];
        });
        result.variables = this.encodeVariables(style.variables);
        return result;
    }
    encodeMediaContent() {
        const media = super.encodeMediaContent();
        media.style = this.encodeStyle(this.style);
        media.variables = this.encodeVariables(this.variables);
        media.title = this.titleLabel.string;
        media.subtitle = this.subtitleLabel.string;
        media.template = this.template;
        return media;
    }
    decodeMediaContent(media) {
        const success = super.decodeMediaContent(media);

        let style = media.style;
        if (style != null) {
            style.variables = this.decodeVariables(media.style.variables ?? {});
        }
        let variables = this.decodeVariables(media.variables ?? {});

        if (style == null) {
            const styleId = media.styleId ?? createUUID();
            const builtin = Media.NameBadge.StyleWithID(styleId);
            variables = builtin?.variables ?? {};

            // TODO for builtin styles, should we just use the style
            // and not manually recreate it here?
            style = {
                id: styleId,
                name: media.name,
                base: {
                    top: media.top,
                    left: media.left,
                    bottom: media.bottom,
                    right: media.right,
                    maxWidth: media.maxWidth,
                    title: media.title,
                    subtitle: media.subtitle,
                    background: media.background
                },
                selectedVariant: 0,
                variants: [ {
                    id: media.styleVariantId ?? createUUID()
                }],
                variables: {},
            }

            if (builtin) {
                style.variants = builtin.variants;
                const index = builtin.variants.findIndex(v => v.id == media.styleVariantId);
                if (index >= 0) {
                    style.selectedVariant = index;
                }
            }

            media.title = style.base.title.string;
            media.subtitle = style.base.subtitle.string;
            media.template = style.base.title.template === true;
        }

        this.applyStyle(style, style.selectedVariant);
        this.variables = new Media.NameBadge.Variables(variables);

        this.titleLabel.string = media.title;
        this.subtitleLabel.string = media.subtitle;

        if (media.template != null) {
            this.template = media.template;
        }

        return success;
    }
    decodeFromModernRecord(record, endpoint) {
        super.decodeFromModernRecord(record, endpoint);
        this.fontAsset = record.decodeAssetReference(endpoint, {key: "content"});
    }
    encodeToModernRecord(record) {
        super.encodeToModernRecord(record);

        const fontAsset = this.fontAsset;
        record.encodeAssetReference(this.fontAsset, 'content');

        // This seems like it wouldn't be necessary, but
        // Media has never had an asset that could change
        // after creation...
        if (IsKindOf(fontAsset, LocalAsset) == true) {
            if (record.__assetsAndBlobs == null) {
                record.__assetsAndBlobs = [];
            }
            record.__assetsAndBlobs.push({
                asset: fontAsset,
                fingerprint: fontAsset.fingerprint,
                blob: fontAsset.blob
            });
        }
    }
    //
    // Drag & Drop
    //
    onDragOver(event) {
        // Ideally we could read the event to see if this is
        // a supported type.  However for woff2 files, the
        // type is an empty string. We can't access the file
        // name until the drop completes...
        this.onPointerEnter(event);
        this.overlayHelper.overlay.classList.add("dragging");
    }
    onDragLeave(event) {
        this.onPointerLeave(event);
        this.overlayHelper.overlay.classList.remove("dragging");
    }
    onDrop(event) {
        const xfer = event.dataTransfer;
        if (xfer != null) {
            const files = Array.from(xfer.files ?? []);
            const fontFile = files.find(file => file.name.endsWith("woff2"));
            if (fontFile != null) {
                this.onUseUploadedFont(fontFile);
                return true;
            }
        }
        return false;
    }

    /**
     * @param {string} fontFile
     * @returns {Promise<FontAsset>}
     */
    async onUseUploadedFont(fontFile) {
        const asset = new LocalAsset({ blob: fontFile, mimeType: "font/woff2" });
        const fingerprint = await FingerprintForBlob(fontFile);

        // Save the asset
        asset.fingerprint = fingerprint;
        this.fontAsset = asset;

        // Use this as our font face
        this.variables.fontFace = Media.Text.Style.FontNameFromFontAsset(asset);

        return this.fontAsset;
    }
}

Object.defineProperty(Media.NameBadge, "ClassIdentifier", {
    value: "nameBadge",
    writable: false
});

Object.defineProperty(Media.NameBadge, "Title", {
    value: LocalizedString("Name Tag"),
    writable: false
});
