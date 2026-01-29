//
//  media/text/media.js
//  mmhmm
//
//  Created by Steve White on 12/21/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

Media.Text = class extends Media {
    constructor(identifier, presenterID) {
        super(identifier, presenterID);

        this.aspectRatio = Media.Text.AspectRatio.Square;
        this.textSize = Media.Text.Size.Medium;

        this.automaticallyNotifiesObserversOfStyle = false;
        this.automaticallyNotifiesObserversOfTextAlignment = false;
        this.automaticallyNotifiesObserversOfTextSize = false;
        this.automaticallyNotifiesObserversOfTextPadding = false;
        this.automaticallyNotifiesObserversOfAttributedString = false;
        this.automaticallyNotifiesObserversOfContentSize = false;
        this.automaticallyNotifiesObserversOfEditorDirty = false;
        this.automaticallyNotifiesObserversOfEditing = false;
    }
    copySettingsFrom(other) {
        var dirty = super.copySettingsFrom(other);
        if (IsKindOf(other, Media.Text) == false) {
            return dirty;
        }

        if (this.textAlignment != other.textAlignment) {
            this.textAlignment = other.textAlignment;
            dirty = true;
        }
        if (this.textSize != other.textSize) {
            this.textSize = other.textSize;
            dirty = true;
        }
        if (this.aspectRatio != other.aspectRatio) {
            this.aspectRatio = other.aspectRatio;
            dirty = true;
        }
        if (this.contentSize != other.contentSize) {
            this.contentSize = other.contentSize;
            dirty = true;
        }

        if (this.style.themeID != other.style.themeID) {
            this.style = other.style.clone();
            dirty = true;
        }
        else {
            var ours = {};
            this.style.encodeToRecord(ours);

            var theirs = {};
            other.style.encodeToRecord(theirs);

            if (EqualObjects(ours, theirs) == false) {
                this.style.decodeFromRecord(theirs);
                dirty = true;
            }
        }
        return true;
    }
    get croppable() {
        return false;
    }
    get editable() {
        return true;
    }
    get availableStyles() {
        return Media.Text.Styles;
    }
    get assets() {
        const assets = super.assets;
        const fontAsset = this.fontAsset;
        if (fontAsset != null) {
            assets.push(fontAsset);
        }
        return assets;
    }
    /*
     * Sync properties
     */
    set attributedString(anAttributedString) {
        const previous = this._attributedString;
        if (anAttributedString.equals(previous) == true) {
            return;
        }

        this._attributedString = anAttributedString;
        this.didChangeValueForProperty(anAttributedString, "attributedString");

        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'attributedString', previous);

        this.setNeedsPersistence();
        this.invalidateAttributedString();
    }
    get attributedString() {
        return this._attributedString;
    }
    set style(aStyleObj) {
        const previous = this._style;
        if (EqualObjects(aStyleObj, previous) == true) {
            return;
        }

        this._style = aStyleObj;
        this.didChangeValueForProperty(aStyleObj, "style");

        const undoManager = this.undoManager;
        if (undoManager != null) {
            undoManager.beginUndoGrouping();
            undoManager.registerUndoWithTargetSlotArguments(this, 'style', previous);
        }

        if (aStyleObj?.supportsCornerRadius != true) {
            this.cornerRadius = 0;
        }

        // Style resets any overrides that were picked.
        this.backgroundColor = null;
        this.foregroundColor = null;

        // It seems cruel to remove a custom font or padding
        // just because somebody picked a color preset
        // So we'll keep them until they pick
        // a different theme family..
        if (previous?.family == aStyleObj?.family) {
            // Need to re-apply the overrides to our copy of the style.
            if (this.fontAsset != null) {
                this.fontAssetChanged();
            }
            if (this.textPadding != null) {
                this._textPaddingChanged();
            }
        }
        else {
            this.fontAsset = null;
            this.textPadding = null;
        }

        if (undoManager != null) {
            undoManager.endUndoGrouping();
        }

        var bgInset = aStyleObj?.backgroundInset ?? 0;
        var contentInsets = InsetsMake(bgInset, bgInset, bgInset, bgInset);
        this.contentInsets = contentInsets;
        this._updateMinimumSize();

        this.setNeedsPersistence();

        this.updateBackgroundLayer();
        this.updateForegroundFilter();
        this.invalidateAttributedString();
    }
    get style() {
        return this._style;
    }

    set textAlignment(value) {
        const options = Object.values(AdvancedTextLayer.HorizontalAlignment);
        if (value != null && options.indexOf(value) == -1) {
            console.error("invalid textAlignment supplied: ", value, options);
            return;
        }
        const previous = this._textAlignment;
        if (value == previous) {
            return;
        }

        this._textAlignment = value;
        this.didChangeValueForProperty(value, "textAlignment");

        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'textAlignment', previous);
        this.setNeedsPersistence();

        // Feels gross to invalidate the entire thing
        this.invalidateAttributedString();
    }
    get textAlignment() {
        return this._textAlignment;
    }

    set textSize(value) {
        this._setTextSize(value);
    }

    setTextSizeWithoutResizing(value) {
        this._setTextSize(value, false);
    }

    _setTextSize(value, resize=true) {
        var options = Object.values(Media.Text.Size);
        if (value != null && options.indexOf(value) == -1) {
            console.error("invalid textSize supplied: ", value, options);
            return;
        }
        const previous = this._textSize;
        if (value == previous) {
            return;
        }

        this._textSize = value;
        this.didChangeValueForProperty(value, "textSize");

        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'textSize', previous);
        this.setNeedsPersistence();

        if (resize) {
            this._updateMinimumSize();
        }
        this.invalidateAttributedString();
    }
    get textSize() {
        return this._textSize;
    }

    set aspectRatio(value) {
        var options = Object.values(Media.Text.AspectRatio);
        if (options.indexOf(value) == -1) {
            console.error("invalid aspectRatio supplied: ", value, options);
            return;
        }
        var previous = this._aspectRatio;
        if (previous == value) {
            return;
        }

        this._aspectRatio = value;

        var layer = this.layer;
        if (layer != null) {
            if (value == Media.Text.AspectRatio.Square) {
                layer.frame = this.frameForStage(this.stage ?? gApp.stage);
            }
            else {
                layer.transform = Transform3DIdentity();
            }
        }

        this.setNeedsPersistence();
        this.updateLayerTransform();
    }
    get aspectRatio() {
        return this._aspectRatio ?? Media.Text.AspectRatio.Square;
    }
    set contentSize(value) {
        var contentSize = SizeCopy(value);
        var minimumSize = this.minimumSize;
        if (minimumSize != null) {
            contentSize.width = Math.max(contentSize.width, minimumSize.width);
            contentSize.height = Math.max(contentSize.height, minimumSize.height);
        }

        var previous = this.contentSize;
        if (SizeEquals(contentSize, previous) == true) {
            return;
        }

        this._contentSize = contentSize;
        this.didChangeValueForProperty(contentSize, "contentSize");

        this.setNeedsPersistence();
        this.updateLayerTransform();
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'contentSize', previous);
    }
    get contentSize() {
        const contentSize = this._contentSize;
        if (contentSize != null) {
            return SizeCopy(contentSize);
        }

        const defaultSize = this.style?.defaultContentSize ?? SizeMake(800, 600);
        this._contentSize = defaultSize;
        return defaultSize;
    }
    _updateMinimumSize() {
        this.minimumSize = this.style?.minimumContentSizeForSize(this.textSize);
    }
    set minimumSize(val) {
        if (EqualObjects(val, this._minimumSize) == true) {
            return;
        }
        this._minimumSize = val;

        if (val != null) {
            var contentSize = this.contentSize
            if (val.width > contentSize.width || val.height > contentSize.height) {
                contentSize.width = Math.max(contentSize.width, val.width);
                contentSize.height = Math.max(contentSize.height, val.height);
                this.contentSize = contentSize;
            }
        }
    }
    get minimumSize() {
        return this._minimumSize;
    }
    set scale(value) {
        super.scale = value;
        if (this.editor != null) {
            this.updateInlineEditorScale();
        }
    }
    get scale() {
        return super.scale;
    }
    set cornerRadius(val) {
        super.cornerRadius = val;
        const layer = this.layer;

        this.updateBackgroundLayer();
        this.updateTextLayer();
        this.updateEditorCornerRadius();

        this.invalidateAttributedString();
    }
    get cornerRadius() {
        return super.cornerRadius;
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
        this.fontAssetChanged();
    }
    get fontAsset() {
        return this._fontAsset;
    }

    /** @type {(Paint.Color|Paint.LinearGradient|Paint.RadialGradient)=} */
    set backgroundColor(aColorOrNull) {
        const previous = this._backgroundColor;
        if (EqualObjects(previous, aColorOrNull) == true) {
            return;
        }

        let backgroundColor = null;
        if (aColorOrNull != null) {
            backgroundColor = aColorOrNull.copy();
        }

        this._backgroundColor = backgroundColor;
        this.didChangeValueForProperty(backgroundColor, "backgroundColor");
        this.setNeedsPersistence();

        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'backgroundColor', previous);

        this._setStyleOverrideForKeyPath(backgroundColor, 'backgroundAttributes.fill');
        this.updateBackgroundLayer(true);
    }
    get backgroundColor() {
        return this._backgroundColor;
    }

    /** @type {String=} */
    // This needs to be a valid css style string
    // e.g. #ff00ff, rgb(255,0,255), rgba(255,0,255,1.0)
    // Would be nice to switch this over to Paint objects too
    // but gradients pose a problem for editing...
    set foregroundColor(aColorOrNull) {
        const previous = this._foregroundColor;
        if (EqualObjects(previous, aColorOrNull) == true) {
            return;
        }

        const foregroundColor = aColorOrNull;
        this._foregroundColor = foregroundColor;
        this.didChangeValueForProperty(foregroundColor, "foregroundColor");
        this.setNeedsPersistence();

        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'foregroundColor', previous);

        this._setStyleOverrideForKeyPath(foregroundColor, 'textAttributes.color');
        this.invalidateAttributedString();
    }
    get foregroundColor() {
        return this._foregroundColor;
    }

    /**
     * Override the text padding associated with this object's style.
     * @param {?Object} valueOrNull an Inset object, or null to reset to the style's default
     */
    set textPadding(valueOrNull) {
        const previous = this._textPadding;
        if (EqualObjects(previous, valueOrNull) == true) {
            return;
        }

        const textPadding = valueOrNull;
        this._textPadding = textPadding;
        this.didChangeValueForProperty(textPadding, "textPadding");
        this.setNeedsPersistence();

        this.undoManager?.registerUndoWithTargetSlotArguments(this, "textPadding", previous);
        this._textPaddingChanged();
    }
    get textPadding() {
        return this._textPadding;
    }
    _textPaddingChanged() {
        // The style calls them "contentInsets", but that means something else for stage objects
        this._setStyleOverrideForKeyPath(this.textPadding, "contentInsets");
        this._updateMinimumSize();
        this.updateBackgroundLayer(true);
    }

    fontAssetChanged() {
        const invalidateIfVisible = () => {
            if (this.stage != null) {
                this.invalidateAttributedString();
            }
        }

        const fontAsset = this.fontAsset;
        if (fontAsset == null) {
            this._setStyleOverrideForKeyPath(null, "textAttributes.font");
            invalidateIfVisible();
        }
        else {
            const blob = this.getCachedElementForAsset(fontAsset);
            Media.Text.Style.FontFaceForAsset(fontAsset, blob).then(fontFace => {
                if (fontFace == null) {
                    console.error("Failed to load font face for asset", fontAsset);
                    return;
                }

                const font = new Font({family: fontFace});
                this._setStyleOverrideForKeyPath(font, "textAttributes.font");
                invalidateIfVisible();
            })
        }
    }

    _setStyleOverrideForKeyPath(value, keypath) {
        const style = this.style;
        if (value == null) {
            const template = Media.Text.StyleWithThemeID(style.themeID);
            value = template.valueForKeyPath(keypath);
        }
        style.setValueForKeyPath(value, keypath);
    }
    /*
     *
     */
    get hash() {
        var str = `${super.hash}`;
        var style = this.style;
        if (style != null) {
            str += style.identifier;
        }
        var aspectRatio = this.aspectRatio;
        if (aspectRatio != null) {
            str += aspectRatio;
        }
        var contentSize = this.contentSize;
        if (contentSize != null) {
            str += contentSize.width;
            str += contentSize.height;
        }
        var textAlignment = this.textAlignment;
        if (textAlignment != null) {
            str += textAlignment;
        }
        var attributedString = this.attributedString;
        if (attributedString != null) {
            str += JSON.stringify(attributedString);
        }
        if (this.placeholder == true) {
            str += gCurrentLocale;
        }
        return cyrb53(str);
    }
    async loadAssetsIntoCache() {
        return this.style.loadAssetsIntoCache();
    }
    /*
     * Sizing
     */
    get preserveAspectRatio() {
        return (this.aspectRatio != Media.Text.AspectRatio.Custom);
    }
    contentSizeForLayer(layer, stage) {
        if (this.aspectRatio != Media.Text.AspectRatio.Custom) {
            return super.contentSizeForLayer(layer, stage);
        }
        return this.contentSize;
    }
    updateLayerTransform() {
        var layer = this.layer;
        if (layer == null) {
            return;
        }

        var oldSize = layer.size;
        var newSize = null;

        if (this.aspectRatio != Media.Text.AspectRatio.Custom) {
            super.updateLayerTransform();
            newSize = layer.size;
        }
        else {
            newSize = this.contentSizeForLayer();
            if (SizeEquals(newSize, layer.size) == false) {
                this.setNeedsDisplay();
                layer.size = newSize;
            }

            layer.frame = this.frameForLayer(layer);
        }

        if (oldSize.width != newSize.width || oldSize.height != newSize.height) {
            this.setNeedsDisplay();
            this.updateEditorSize();
        }
    }
    invalidateAttributedString() {
        var textLayer = this.textLayer;
        if (textLayer != null) {
            textLayer.attributedString = null;
            this.setNeedsDisplay();
        }
    }
    setNeedsDisplay() {
        this._needsDisplay = true;
    }
    frameForStage(stage) {
        // This is only correct for .Square aspect ratio...
        var stageSize = stage.size;
        var size = SizeMake(stageSize.width * 0.6, stageSize.height);
        return RectMake(
            (stageSize.width - size.width) / 2,
            (stageSize.height - size.height) / 2,
            size.width,
            size.height,
        );
    }
    async getContentSize() {
        if (this.aspectRatio == Media.Text.AspectRatio.Custom) {
            return this.contentSize;
        }

        // While studio slides support other sizes, the web doesn't yet...
        // Only valid for .Square
        return SizeMake(1080, 1080);
    }
    /*
     *
     */
    newLayer(stageSize) {
        return new Media.Text.Layer(stageSize, this.style);
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);
        // Define this early for KVO
        this.editor = null;

        Media.Text.RegisterInstance(this);

        var background = this.layer;
        if (this.placeholder == true) {
            background.hidden = true;
            background.userInteractionEnabled = false;
        }
        this.updateBackgroundLayer();

        var textLayer = background.textLayer;
        textLayer.userInteractionEnabled = true;
        textLayer.delegate = this;
        this.textLayer = textLayer;
        this.updateForegroundFilter();
        this.updateTextLayer(textLayer);

        if (this.aspectRatio != Media.Text.AspectRatio.Custom) {
            var frame = this.frameForStage(stage);
            background.frame = frame;
            textLayer.frame = RectMake(0, 0, frame.width, frame.height);
        }

        this.updateLayerTransform();
        stage.addObserverForProperty(this, "canvasWindowScale");
    }
    didAttachToStage(stage) {
        super.didAttachToStage(stage);

        if (this.editOnDisplay == true) {
            this.enterEditMode();
        }
    }
    willDetachFromStage(stage) {
        // Do this before calling super.willDetachFromStage,
        // because doing so might update some of our persistent
        // fields, and super.willDetachFromStage triggers persistence
        if (this.editor != null) {
            this.exitEditMode();
        }

        super.willDetachFromStage(stage);

        this.textLayer = null;
        delete this._needsDisplay;
        delete this.editOnDisplay;

        stage.removeObserverForProperty(this, "canvasWindowScale");

        var sizeMenu = this.sizeMenu;
        if (sizeMenu != null) {
            sizeMenu.dismiss();
        }

        Media.Text.UnregisterInstance(this);
    }
    newSidebarPane() {
        return new Media.Text.SidebarPane(this);
    }
    async drawSizeOptionPreviewInContext(option, context, width, height) {
        const stageSize = SizeMake(width, height);

        const layer = new Media.Text.Layer(this.contentSize, this.style);
        layer.cornerRadius = this.cornerRadius;

        let text = null;
        const editor = this.editor;
        if (editor != null) {
            text = editor.attributedString;
        }
        this.updateTextLayer(layer.textLayer, text);

        // Supply a fake object to apply the size to
        const fake = {
            anchor: Stage.Object.Anchor.Center,
            layer: layer,
            stage: {
                size: stageSize
            },
        };

        this.applySizeOption(option, fake);

        const contentSize = fake.contentSize;
        layer.size = contentSize;

        context.translate(
            (stageSize.width - contentSize.width) / 2,
            (stageSize.height - contentSize.height) / 2,
        );

        const loader = async function(src) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = src;
            await img.decode();
            return img;
        }

        layer.drawStandaloneImageInContext(context, loader);
    }
    applySizeOption(option, target) {
        if (target == null) {
            target = this;
        }

        const stage = target.stage;
        if (stage == null) {
            return;
        }

        const stageSize = stage.size;
        const style = this.style;
        const bgInset = style.backgroundInset ?? 0;

        let contentSize = SizeMake(
            stageSize.width + (bgInset * 2),
            stageSize.height + (bgInset * 2)
        );

        if (option.aspect == "fill") {
            // Nothing to do, contentSize is already the stage size
        }
        else {
            const ratio = option.ratio;
            const layer = target.layer;
            const textLayer = layer.textLayer;

            let textSize = null;

            if (ratio != null) {
                let lastCharWrapped = null;

                for (let height=contentSize.height; height>100; height-=100) {
                    const width = height / ratio;
                    const contentSize = SizeMake(Math.ceil(width), Math.ceil(height));
                    const test = layer.textLayerSizeForContentSize(contentSize);
                    const {size, fits, wrappedOnCharacter} = textLayer.fullSizeThatFits(test);
                    if (fits == false || (lastCharWrapped != null && wrappedOnCharacter != lastCharWrapped)) {
                        break;
                    }
                    textSize = test;
                    lastCharWrapped = wrappedOnCharacter;
                }
            }
            else if (option.sizeToFit == true) {
                const maxContentSize = SizeMake(layer.size.width, contentSize.height);
                const maxTextSize = layer.textLayerSizeForContentSize(maxContentSize);

                const size = textLayer.sizeThatFits(maxTextSize);
                textSize = SizeCopy(size);
            }
            else if (option.sizeToFitWidth == true) {
                // Only adjust the width of the current target size
                const maxContentSize = SizeMake(Math.min(option.maxWidth, contentSize.width), layer.size.height);
                const maxTextSize = layer.textLayerSizeForContentSize(maxContentSize);

                const size = textLayer.sizeThatFits(maxTextSize);

                // Don't change the height, we're only trying to change the width
                size.height = textLayer.size.height;

                textSize = SizeCopy(size);
            }

            if (textSize != null) {
                const insets = InsetsCopy(style.contentInsets);
                if (style.insetsAreProportional == true) {
                    const width = textSize.width;
                    insets.left = Math.floor(insets.left * width);
                    insets.right = Math.ceil(insets.right * width);

                    const height = textSize.height;
                    insets.top = Math.floor(insets.top * height);
                    insets.bottom = Math.ceil(insets.bottom * height);
                }

                contentSize = SizeCopy(textSize);
                contentSize.width += insets.left + insets.right + (bgInset * 2);
                contentSize.height += insets.top + insets.bottom + (bgInset * 2);

                const minimumSize = style.minimumContentSizeForSize(this.textSize);
                contentSize.width = Math.max(minimumSize.width, contentSize.width);
                contentSize.height = Math.max(minimumSize.height, contentSize.height);
            }
        }

        const previousSize = target.contentSize;
        target.contentSize = contentSize;

        if (option.sizeToFitWidth == true && option.anchor != null) {
            // This option allows us to leave the top-left, center, or top-right position
            // of the target unchanged without having the target anchored to a fixed position
            // on stage, because those anchors also imply a y position, but we don't want to
            // modify that.

            // TODO bounds checking - don't place the media off stage...
            const changeInWidth = (contentSize.width - previousSize.width) / 2;
            const newCenter = target.center;
            if (option.anchor == "l") {
                newCenter.x = target.center.x + changeInWidth;
            } else if (option.anchor == "c") {
                newCenter.x = target.center.x;
            } else if (option.anchor == "r") {
                newCenter.x = target.center.x - changeInWidth;
            }

            target.center = newCenter;
        }
        else if (target.anchor == Stage.Object.Anchor.None) {
            const center = target.center;
            let halfWidth = (contentSize.width / 2);
            if (center.x - halfWidth < 0) {
                center.x = halfWidth;
            }
            else if (center.x + halfWidth > stageSize.width) {
                center.x = stageSize.width - halfWidth;
            }
            let halfHeight = (contentSize.height / 2);
            if (center.y - halfHeight < 0) {
                center.y = halfHeight;
            }
            else if (center.y + halfHeight > stageSize.height) {
                center.y = stageSize.height - halfHeight;
            }
            target.center = center;
        }
    }
    sizeOptions() {
        let options = super.sizeOptions();
        // The 16:9 ratio and fill stage end up doing the same
        // thing, and always would until we support non-16:9 stages
        // so filter one of them out.
        options = options.filter(opt => opt.ratio != 9.0 / 16.0);

        if (this.style.shape != AdvancedTextLayer.Shape.Ellipse) {
            options.push({
                sizeToFit: true,
                label: LocalizedString("Fit to text")
            });
        }

        return options;
    }
    propertiesAffectingSizeOptionPreview() {
        return [ "attributedString", "textAlignment", "style", "textSize", "contentSize", "editorDirty" ];
    }
    /*
     * Inline editing
     */
    newOverlayHelper() {
        var overlayHelper = super.newOverlayHelper();
        if (overlayHelper == null) {
            return overlayHelper;
        }

        var editContentsButton = Stage.Object.Overlay.NewButton(
            LocalizedString("Edit"),
            null,
            evt => this.editContentsButtonWasClicked(editContentsButton, evt)
        );

        var topCenterBar = overlayHelper.buttonBarAtPosition(Stage.Object.Overlay.Position.TopCenter);
        if (topCenterBar == null) {
            topCenterBar = Stage.Object.Overlay.NewButtonBar([editContentsButton]);
            overlayHelper.setButtonBarAtPosition(topCenterBar, Stage.Object.Overlay.Position.TopCenter)
        }
        else {
            var firstChild = topCenterBar.firstChild;
            if (firstChild != null) {
                topCenterBar.insertBefore(editContentsButton, firstChild);
            }
            else {
                topCenterBar.appendChild(editContentsButton);
            }
        }
        return overlayHelper;
    }
    editContentsButtonWasClicked(button, event) {
        this.enterEditMode();
    }
    get editing() {
        return (this.editor != null);
    }
    set editor(val) {
        this._editor = val;
        this.didChangeValueForProperty(val != null, "editing");
    }
    get editor() {
        return this._editor;
    }
    enterEditMode() {
        var stage = this.stage;
        if (stage.selectedObject != this) {
            stage.selectedObject = this;
        }

        // Copy all of the overlay buttons to restore later
        // And remove them from the overlay
        var overlayHelper = this.overlayHelper;
        var oldButtonBars = {};
        for (var key in Stage.Object.Overlay.Position) {
            var position = Stage.Object.Overlay.Position[key];
            var buttonBar = overlayHelper.buttonBarAtPosition(position);
            if (buttonBar != null) {
                oldButtonBars[position] = buttonBar;
                overlayHelper.setButtonBarAtPosition(null, position);
            }
        }
        this.oldButtonBars = oldButtonBars;

        // Create the editor
        var editor = new TextSlideEditor(this.editorContentSize, 1);
        editor.style = this.style;
        editor.attributedString = this.attributedString;
        editor.textAlignment = this.textAlignment;
        editor.textSize = this.textSize;
        editor.cornerRadius = this.cornerRadius;
        editor.delegate = this;
        editor.registerHotKey('s', () => this.exitEditMode());
        editor.media = this;
        this.editor = editor;

        // Add the editor to the overlay...
        var editContainer = editor.container;
        this.updateInlineEditorScale();
        overlayHelper.overlay.insertBefore(editContainer, overlayHelper.frame.nextSibling);

        // Hide our text so it isn't stacked with the DOM text
        const layer = this.layer;
        layer.hidden = true;
        layer.userInteractionEnabledWhenHidden = true;

        editor.selectAll();
        editor.focus();

        NotificationCenter.default.postNotification(Media.Text.Notifications.DidBeginEditing, this, {});
        NotificationCenter.default.addObserver(
            TextSlideEditor.Notifications.ContentsChanged,
            editor,
            this.textEditorContentsChanged,
            this
        );
        NotificationCenter.default.addObserver(
            Media.Text.Notifications.DidBeginEditing,
            null,
            this.textMediaBeganEditing,
            this
        );
        gApp.disableKeyboardObservers();
        this.undoManager?.beginUndoGrouping();
    }
    get editorContentSize() {
        var contentSize = null;
        if (this.aspectRatio != Media.Text.AspectRatio.Custom) {
            var frame = this.frameForStage(gApp.stage);
            contentSize = SizeMake(frame.width, frame.height);
        }
        else {
            contentSize = this.contentSize;

            var bgInset = (this.style?.backgroundInset ?? 0) * 2;
            contentSize.width -= bgInset;
            contentSize.height -= bgInset;
        }
        return contentSize;
    }
    updateEditorSize() {
        var editor = this.editor;
        if (editor != null) {
            editor.size = this.editorContentSize;
        }
    }
    updateEditorCornerRadius() {
        var editor = this.editor;
        if (editor != null) {
            editor.cornerRadius = this.cornerRadius;
        }
    }
    textMediaBeganEditing(info, name, object) {
        if (object != this && this.editor != null) {
            this.exitEditMode();
        }
    }
    editorChangedHeight(editor, oldHeight, newHeight) {
        if (this.aspectRatio != Media.Text.AspectRatio.Custom) {
            return;
        }

        const stageSize = this.stage.size;
        const bgInset = this.style?.backgroundInset ?? 0;
        oldHeight = Math.min(oldHeight + (bgInset * 2), stageSize.height);
        newHeight = Math.min(newHeight + (bgInset * 2), stageSize.height);

        let contentSize = this.contentSize;

        if (newHeight > oldHeight && newHeight > contentSize.height) {
            contentSize.height = newHeight;
        }
        else if (oldHeight == contentSize.height) {
            contentSize.height = newHeight;
        }
        else {
            return;
        }

        this.contentSize = contentSize;
    }
    formatBarSelectedSize(formatBar, size) {
        this.minimumSize = this.style.minimumContentSizeForSize(size);
        this.textSize = size;

        const editor = this.editor;
        if (editor != null) {
            editor.textSize = size;
        }
        SharedUserDefaults.setValueForKey(size, "textSize");
    }
    formatBarSelectedStyle(formatBar, style) {
        const previous = this.style;

        const undoManager = this.undoManager;

        undoManager?.beginUndoGrouping();
        // Our contentSize includes the style's background inset
        let contentSize = this.contentSize;

        // Remove the previous style's inset
        const oldInsets = this.contentInsets;
        contentSize.width -= (oldInsets.left + oldInsets.right);
        contentSize.height -= (oldInsets.top + oldInsets.bottom);

        // If the styles were bubbles, try to
        // persist things like the angle by
        // asking the old to encode itself
        // and the new to decode from that
        const state = {};
        if (previous != null) {
            previous.encodeToRecord(state);
        }

        const clone = style.clone();
        clone.decodeFromRecord(state);

        // Then update the style
        const editor = this.editor;
        if (editor != null) {
            editor.style = clone;
        }

        this.style = clone;

        // And apply its insets back to our size
        const newInsets = this.contentInsets;
        contentSize.width += (newInsets.left + newInsets.right);
        contentSize.height += (newInsets.top + newInsets.bottom);

        // And the end result is we should be sized the same
        // even if we went to/from styles w/o insets and those with.
        this.contentSize = contentSize;

        SharedUserDefaults.setValueForKey(clone.themeID, "textTheme");
        undoManager?.endUndoGrouping();
    }
    exitEditMode() {
        if (this.editOnDisplay != null) {
            this.editOnDisplay = false;
        }

        var layer = this.layer;
        if (layer != null) {
            layer.hidden = false;
            layer.userInteractionEnabledWhenHidden = false;
        }

        var textLayer = this.textLayer;
        // We might not have a layer if the person is
        // navigating away.
        if (textLayer != null) {
            // The renderer runs at 30fps, and the DOM
            // likely runs at 60fps.  There will be a gap
            // between when the renderer re-renders with the
            // unhidden layer, and when the editor is removed
            // from the overlay.  Try to bridge this gap by
            // requesting a render immediately.
            gApp.requestRender(true);
        }

        var editor = this.editor;
        // Update local state to reflect the editor
        if (editor != null) {
            if (this.template == true) {
                this.template = false;
            }

            this.style = editor.style;
            this.attributedString = editor.attributedString;
            this.textAlignment = editor.textAlignment;
            this.textSize = editor.textSize;

            this.editor = null;

            // Remove the editor from the overlay
            var editContainer = editor.container;
            if (editContainer.parentElement != null) {
                editContainer.parentElement.removeChild(editContainer);
            }

            // And destroy it
            editor.destroy();
        }

        // Overlay goes back to only showing on mouse over
        var overlayHelper = this.overlayHelper;
        if (overlayHelper != null) {
            overlayHelper.alwaysVisible = false;

            // Remove the format bar from the overlay
            overlayHelper.setButtonBarAtPosition(null, Stage.Object.Overlay.Position.BottomCenter);

            // Restore all the old button bars
            var oldButtonBars = this.oldButtonBars;
            for (var position in oldButtonBars) {
                var buttonBar = oldButtonBars[position];
                overlayHelper.setButtonBarAtPosition(buttonBar, position);
            }
        }

        NotificationCenter.default.postNotification(Media.Text.Notifications.DidEndEditing, this, {});
        NotificationCenter.default.removeObserver(
            Media.Text.Notifications.DidBeginEditing,
            null,
            this.textMediaBeganEditing,
            this
        );
        NotificationCenter.default.removeObserver(
            TextSlideEditor.Notifications.ContentsChanged,
            editor,
            this.textEditorContentsChanged,
            this
        );
        gApp.enableKeyboardObservers();
        this.undoManager?.endUndoGrouping();
    }
    textEditorContentsChanged() {
        // We don't want to update the size option previews on each
        // keystroke, so we'll wait until the changes stop for a second
        // before updating
        const delay = this._editorDirtyDelay;
        if (delay != null) {
            window.clearTimeout(delay);
        }

        this._editorDirtyDelay = window.setTimeout(() => {
            this.didChangeValueForProperty(true, "editorDirty");
        }, 1000);
    }
    set placeholder(value) {
        this._placeholder = value;
        var layer = this.layer;
        if (layer != null) {
            layer.userInteractionEnabled = !value;
            layer.hidden = value;
        }
    }
    get placeholder() {
        return this._placeholder;
    }
    updateInlineEditorScale() {
        let scale = this.stage.canvasWindowScale;
        if (this.aspectRatio != Media.Text.AspectRatio.Custom) {
            scale *= this.scale;
        }

        const editor = this.editor;
        editor.setContainerScale(scale);
    }
    /*
     * KVO
     */
    observePropertyChanged(obj, key, val) {
        if (key == "canvasWindowScale") {
            var editor = this.editor;
            if (editor != null) {
                this.updateInlineEditorScale();
            }
        }
        else {
            super.observePropertyChanged(obj, key, val);
        }
    }
    /*
     * Drawing
     */
    render(time) {
        super.render(time);
        if (this._needsDisplay == false) {
            return;
        }
        this._needsDisplay = false;

        var textLayer = this.textLayer;
        if (textLayer == null) {
            return;
        }

        if (textLayer.attributedString == null) {
            this.updateTextLayer(textLayer);
        }

        this.layer.draw();
    }
    updateBackgroundLayer(forceRedraw=false) {
        var background = this.layer;
        if (background == null) {
            return;
        }

        if (forceRedraw == true) {
            // The layer's style setter will bail
            // if the objects are the same.
            // The layer could observe its style's
            // backgroundAttributes.fill or something
            background.style = null;
        }
        background.style = this.style;
        background.cornerRadius = this.cornerRadius;
        if (forceRedraw == true) {
            this.setNeedsDisplay();
        }
    }
    updateForegroundFilter(layer) {
        if (layer == null) {
            layer = this.textLayer;
            if (layer == null) {
                return;
            }
        }

        var style = this.style;
        var filterInfo = style.filter;

        var filters = [];
        if (filterInfo != null) {
            var filter = Media.Text.ReusableFilterWithInfo(filterInfo);
            if (filter != null) {
                filters.push(filter);
            }
        }

        layer.filters = filters;
    }
    updateTextLayer(textLayer, attributedString) {
        if (textLayer == null) {
            textLayer = this.textLayer;
        }

        if (textLayer == null) {
            if (this.stage != null) {
                console.error("no text layer found")
            }
            return;
        }

        textLayer.cornerRadius = this.cornerRadius;

        if (attributedString == null) {
            attributedString = this.attributedString;
        }

        const style = this.style;
        if (attributedString == null || style == null) {
            textLayer.attributedString = new AttributedString();
            return;
        }

        const isCustomSize = (this.aspectRatio == Media.Text.AspectRatio.Custom);
        const textSize = this.textSize;

        const stylizedString = attributedString.copy();
        stylizedString.enumerate((offset, string, attributes) => {
            var styleAttrs = null;

            if (attributes.header == true) {
                styleAttrs = style.headerAttributes;
            }
            else {
                styleAttrs = style.bodyAttributes;
            }

            if (styleAttrs == null) {
                styleAttrs = style.textAttributes;
            }

            if (attributes.link != null) {
                var linkAttributes = style.linkAttributes;
                if (linkAttributes == null) {
                    linkAttributes = {
                        color: Color(0.259, 0.204, 0.949, 1),
                        underline: true,
                    };
                }

                styleAttrs = Object.assign({}, styleAttrs);
                styleAttrs = Object.assign(styleAttrs, linkAttributes);
            }

            var font = styleAttrs.font;
            if (font != null) {
                var size = style.pointSizeForSize(textSize);
                if (size != font.size) {
                    font = font.copy();
                    font.size = size;
                }

                if (font != styleAttrs.font) {
                    styleAttrs.font = font;
                }
            }

            Object.assign(attributes, styleAttrs);

            if (isCustomSize == true) {
                attributes.letterSpacing = 1.0;
            }
        });

        let textAlignment = this.textAlignment;
        if (textAlignment == null) {
            const textAttributes = style.textAttributes;
            if (textAttributes != null) {
                textAlignment = textAttributes.alignment;
            }
            if (textAlignment == null) {
                textAlignment = AdvancedTextLayer.HorizontalAlignment.Left;
            }
        }
        textLayer.style = style;
        textLayer.horizontalAlignment = textAlignment;
        textLayer.attributedString = stylizedString;
    }
    /*
     *
     */
    // This weird method is used by the editor...
    updateContents() {
        var textLayer = this.textLayer;
        if (textLayer != null) {
            textLayer.style = this.style;
            this.updateTextLayer(textLayer);
        }
        this.setNeedsPersistence();
    }
    prepareForPersistence() {
        super.prepareForPersistence();
        this.invalidateThumbnail();
    }
    /*
     *
     */
    async generateThumbnail() {
        let layerSize = null;
        if (this.aspectRatio == Media.Text.AspectRatio.Custom) {
            layerSize = this.contentSizeForLayer();
        }
        else {
            const frame = this.frameForStage(gApp.stage);
            layerSize = SizeMake(frame.width, frame.height);
        }

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

            let layer = this.layer;
            if (layer == null) {
                layer = new Media.Text.Layer(layerSize, this.style);
                this.updateTextLayer(layer.textLayer);
            }

            await layer.drawStandaloneImageInContext(context, loader);
        });
    }
    /*
     * Pointer handlers for link clicking
     */
    handleMouseClick(event) {
        const textLayer = this.textLayer;
        const frame = textLayer.frame;
        const point = PointCopy(event.point);
        point.x -= frame.x;
        point.y -= frame.y;

        const attributes = textLayer.attributesAtPoint(point);
        if (attributes == null || attributes.link == null) {
            return;
        }

        let textLink = attributes.link;
        // See https://github.com/All-Turtles/mmhmm-web/issues/2111
        textLink = textLink.replaceAll("'", "%27");

        if (gLocalDeployment == false) {
            // Route outbound links through our link sanitizer
            var url = new URL("/leave-airtime", window.location);
            var qs = url.searchParams;
            qs.set("uri", textLink);
            qs.set("type", "MEDIA_ID");
            qs.set("value", this.identifier);
            textLink = url.toString();
        }
        window.open(textLink, "_blank");
    }
    onMouseClick(event) {
        if (this.editing == true) {
            return;
        }
        var clickTester = this.clickTester;
        if (clickTester != null) {
            window.clearTimeout(clickTester);
        }
        this.clickTester = window.setTimeout(() => {
            this.clickTester = null;
            this.handleMouseClick(event);
        }, 100);
    }
    onMouseDoubleClick(event) {
        var clickTester = this.clickTester;
        if (clickTester != null) {
            window.clearTimeout(clickTester);
            this.clickTester = null;
        }

        super.onMouseDoubleClick(event);
    }
    onPointerDown(event) {
        var layer = this.layer;
        if (layer.isPointInTail(event.point) == false) {
            super.onPointerDown(event);
            return;
        }
        var overlayHelper = this.overlayHelper;
        if (overlayHelper != null) {
            overlayHelper.buttonBarsVisible = false;
            overlayHelper.dragHandlesVisible = false;
        }

        this.draggingTail = true;
        this.undoManager?.beginUndoGrouping();
    }
    onPointerMove(event) {
        if (this.draggingTail != true) {
            return super.onPointerMove(event);
        }
        var layer = this.layer;
        var frame = layer.frame;
        var center = PointMake(
            RectGetMidX(frame),
            RectGetMidY(frame)
        );

        var point = event.point;

        var radians = Math.atan2(point.y - center.y, point.x - center.x);
        var angle = Math.round(radiansToDegrees(radians)) % 360;
        if (angle < 0) {
            angle += 360;
        }

        var setAngle = (angle) => {
            var style = this.style;
            var previous = style.angle;
            this.undoManager?.registerUndoWithTargetBlock(this, () => setAngle(previous));
            style.angle = angle;

            this.setNeedsPersistence();
            layer.backgroundLayer.draw();
        }
        setAngle(angle);
    }
    onPointerUp(event) {
        if (this.draggingTail != true) {
            return super.onPointerUp(event);
        }
        this.draggingTail = false;
        var overlayHelper = this.overlayHelper;
        if (overlayHelper != null) {
            overlayHelper.buttonBarsVisible = true;
            overlayHelper.dragHandlesVisible = true;
        }
        this.undoManager?.endUndoGrouping();
    }
    /*
     * Cloudy helpers
     */
    decodeFromModernRecord(record, endpoint) {
        super.decodeFromModernRecord(record, endpoint);
        this.decodeAssetReferences(record, endpoint);
    }

    decodeAssetReferences(record, endpoint) {
        this.fontAsset = record.decodeAssetReference(endpoint, {key: "content"});
    }
    decodeMediaContent(media) {
        const success = super.decodeMediaContent(media);
        if (success == false) {
            return false;
        }

        this.aspectRatio = media.aspectRatio ?? Media.Text.AspectRatio.Square;
        this.textAlignment = media.textAlignment;
        this.textSize = media.textSize ?? Media.Text.Size.Medium;

        // Style is mostly easy...
        const themeID = media.theme ?? Media.Text.Style.Default.themeID;

        let style = this.style;
        if (themeID != style?.themeID) {
            style = Media.Text.StyleWithThemeID(themeID, this.availableStyles);
            if (style == null) {
                style = Media.Text.Style.Default;
            }
            style = style.clone();
            this.style = style;
        }

        const themeState = media.themeState ?? {};
        style.decodeFromRecord(themeState);

        let backgroundColor = media.backgroundColor;
        if (backgroundColor != null) {
            backgroundColor = Paint.FromJSON(backgroundColor);
        }
        this.backgroundColor = backgroundColor;

        const foregroundColor = media.foregroundColor;
        if (foregroundColor == null || IsKindOf(foregroundColor, String) == true) {
            this.foregroundColor = foregroundColor;
        }

        const textPadding = media.textPadding;
        if (textPadding != null) {
            this.textPadding = textPadding;
        }

        this.contentSize = media.contentSize ?? style.defaultContentSize;

        // The attributed string itself
        let attributedString = null;
        const template = media.template;
        if (template == true) {
            attributedString = new AttributedString(LocalizedString("Text Placeholder"));
            this.template = true;
        }
        else {
            const jsonAttributedString = media.attributedString;
            if (jsonAttributedString != null) {
                attributedString = AttributedString.newFromJSON(jsonAttributedString);
            }
        }

        if (attributedString == null) {
            attributedString = new AttributedString();
        }

        if (attributedString.equals(this.attributedString) == false) {
            this.attributedString = attributedString;
        }

        return true;
    }
    _linkifyStringIntoTextWithAttributes(textString, attributedString, attributes) {
        TextLinkExtractor(textString, (text, isLink) => {
            var attrs = Object.assign({}, attributes);
            if (isLink == true) {
                attrs.link = text;
            }
            attributedString.appendStringWithAttributes(text, attrs);
        })
    }
    encodeMediaContent() {
        const media = super.encodeMediaContent();
        media.aspectRatio = this.aspectRatio;
        media.contentSize = this.contentSize;
        media.textSize = this.textSize;

        let style = this.style;
        if (style == null) {
            style = Media.Text.Style.Default;
        }

        const themeState = {};
        style.encodeToRecord(themeState);

        media.theme = style.themeID;
        media.themeState = themeState;

        media.attributedString = this.attributedString.toJSON();
        media.textAlignment = this.textAlignment;

        media.backgroundColor = this.backgroundColor?.toJSON();
        media.foregroundColor = this.foregroundColor;
        media.textPadding = this.textPadding;

        const template = this.template;
        if (template != null) {
            media.template = template;
        }

        return media;
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
    /*
     * Teleport helpers
     */
    toJSON() {
        var r = super.toJSON();

        var style = this.style;
        var themeState = {};
        style.encodeToRecord(themeState);

        r.theme = style.themeID;
        r.themeState = themeState;

        r.aspectRatio = this.aspectRatio;
        r.contentSize = this.contentSize;
        r.textAlignment = this.textAlignment;
        r.textSize = this.textSize;
        r.backgroundColor = this.backgroundColor;
        r.foregroundColor = this.foregroundColor;
        r.textPadding = this.textPadding;

        var attributedString = this.attributedString;
        r.attributedString = attributedString;

        var editOnDisplay = this.editOnDisplay;
        if (editOnDisplay != null) {
            r.placeholder = editOnDisplay;
        }

        r.fontAsset = this.fontAsset;

        return r;
    }
    applyEvent(event, sender) {
        super.applyEvent(event, sender);
        if (event == null) {
            return;
        }

        if ('attributedString' in event) {
            if (this.template == true) {
                this.template = false;
            }

            var attributedString = AttributedString.newFromJSON(event.attributedString);
            this.attributedString = attributedString;
        }

        if ('theme' in event) {
            var style = Media.Text.StyleWithThemeID(event.theme);
            if (style != null) {
                this.style = style.clone();
            }
        }

        var themeState = event.themeState;
        if (themeState != null) {
            this.style.decodeFromRecord(themeState);
            this.setNeedsDisplay();
            this.setNeedsPersistence();
        }

        if ('foregroundColor' in event) {
            this.foregroundColor = event.foregroundColor;
        }
        if ('backgroundColor' in event) {
            let backgroundColor = event.backgroundColor;
            if (backgroundColor != null) {
                backgroundColor = Paint.FromJSON(backgroundColor);
            }
            this.backgroundColor = backgroundColor;
        }

        if ('textPadding' in event) {
            this.textPadding = event.textPadding;
        }

        var aspectRatio = event.aspectRatio;
        if (aspectRatio != null) {
            this.aspectRatio = aspectRatio;
        }

        var contentSize = event.contentSize;
        if (contentSize != null) {
            this.contentSize = contentSize;
        }

        var textAlignment = event.textAlignment;
        if (textAlignment != null) {
            this.textAlignment = textAlignment;
        }

        var textSize = event.textSize;
        if (textSize != null) {
            this.textSize = textSize;
        }

        var placeholder = event.placeholder;
        if (placeholder != null) {
            this.placeholder = !!placeholder;
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
                const asset = new LocalAsset({blob: fontFile, mimeType: "font/woff2"});
                FingerprintForBlob(fontFile).then(fingerprint => {
                    asset.fingerprint = fingerprint;
                    this.fontAsset = asset;
                })
                return true;
            }
        }
        return false;
    }
}

Media.Text.Instances = [];
Media.Text.RegisterInstance = function(media) {
    var instances = Media.Text.Instances;
    if (instances.indexOf(media) == -1) {
        instances.push(media);
    }
}

Media.Text.UnregisterInstance = function(media) {
    var instances = Media.Text.Instances;
    var index = instances.indexOf(media);
    if (index != -1) {
        instances.splice(index, 1)
    }
}

Media.Text.ReusableFilterWithInfo = function(filterInfo) {
    var type = filterInfo.type;
    var props = filterInfo.properties;

    var instances = Media.Text.Instances;
    for (var instanceIdx = 0; instanceIdx < instances.length; instanceIdx += 1) {
        var media = instances[instanceIdx];
        var textLayer = media.textLayer;
        if (textLayer == null) {
            continue;
        }
        var filters = textLayer.filters;
        for (var filterIdx = 0; filterIdx < filters.length; filterIdx += 1) {
            const filter = filters[filterIdx];
            if (IsKindOf(filter, type) == false) {
                continue;
            }
            var match = true;
            for (var key in props) {
                if (filter[key] != props[key]) {
                    match = false;
                    break;
                }
            }
            if (match == true) {
                return filter;
            }
        }
    }

    const filter = new type();
    for (const key in props) {
        filter[key] = props[key];
    }
    return filter;
}

Object.defineProperty(Media.Text, "ClassIdentifier", {
    value: "text",
    writable: false
});

Object.defineProperty(Media.Text, "Title", {
    value: LocalizedString("Text"),
    writable: false
});

Media.Text.Notifications = Object.freeze({
    DidBeginEditing: "beganEditing",
    DidEndEditing: "endEditing",
});

Media.Text.AspectRatio = Object.freeze({
    Square: "square",
    Custom: "custom"
});

Media.Text.Size = Object.freeze({
    Small: "small",
    Medium: "medium",
    Large: "large",
    ExtraLarge: "extralarge",
    Enormous: "enormous",
});

Media.Text.Create = function(sender, editing=true) {
    var contents = new AttributedString(LocalizedString("Hello!"), {});

    var style = null;
    var themeID = SharedUserDefaults.getValueForKey("textTheme");
    if (themeID != null) {
        style = Media.Text.StyleWithThemeID(themeID);
    }
    if (style == null) {
        style = Media.Text.Style.Default;
    }

    var slide = new Media.Text();
    slide.attributedString = contents;
    slide.aspectRatio = Media.Text.AspectRatio.Custom;
    slide.editOnDisplay = editing;
    slide.style = style.clone();

    var size = SharedUserDefaults.getValueForKey("textSize");
    if (size != null) {
        slide.textSize = size;
    }

    Analytics.Log("presentation.slides.added.text");

    return slide;
}
