//
//  media/placeholder.js
//  mmhmm
//
//  Created by Steve White on 4/18/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

Media.Placeholder = class extends Media {
    constructor(identifier, presenterID) {
        super(identifier, presenterID);
        this.replaceMenu = null;
    }
    copySettingsFrom(other) {
        let dirty = super.copySettingsFrom(other);
        if (IsKindOf(other, Media.Placeholder) == false) {
            return dirty;
        }
        if (this.contentSize != other.contentSize) {
            this.contentSize = other.contentSize;
            dirty = true;
        }
        return dirty;
    }
    get preserveAspectRatio() {
        return false;
    }
    get croppable() {
        return false;
    }
    set contentSize(value) {
        const previous = this._contentSize;
        if (SizeEquals(previous, value) == true) {
            return;
        }
        this._contentSize = SizeCopy(value);
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'contentSize', previous);
        this.updateLayerTransform();
    }
    get contentSize() {
        return this._contentSize;
    }
    get scale() {
        return 1;
    }
    set scale(value) {
        // Ignore it
    }
    sizeOptions() {
        // Since we have no natural size, "fit" doesn't make sense
        let options = super.sizeOptions();
        return options.filter(opt => opt.aspect != "fit");
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
        let targetSize = null;

        if (option.aspect == "fill" || option.aspect == "fit") {
            // Since we have no natural size, fit and fill do the same thing - fill the slide
            targetSize = stageSize;
            target.anchor = Stage.Object.Anchor.Center;
            target.scale = 1;
        } else if (option.ratio != null) {
            // Try to grow the current rect to the desired aspect ratio by holding one
            // dimension's size constant and increasing the size of the other dimension
            // If that won't fit on stage, decrease the size of one dimension instead

            const currentSize = target.layer.naturalSize;
            const currentRatio = currentSize.height / currentSize.width;
            const canGrowWidth = currentSize.height / option.ratio <= stageSize.width;
            const canGrowHeight = currentSize.width * option.ratio <= stageSize.height;

            if (currentRatio == option.ratio) {
                // We're already at the correct aspect ratio
                targetSize = currentSize;
            } else if ((currentRatio > option.ratio && canGrowWidth) || !canGrowHeight) {
                // Change the width
                targetSize = SizeMake(currentSize.height / option.ratio, currentSize.height);
            } else {
                // Change the height
                targetSize = SizeMake(currentSize.width, currentSize.width * option.ratio);
            }
        }

        target.contentSize = targetSize;
        target._clampCenterPoint(true);
    }
    async drawSizeOptionPreviewInContext(option, context, width, height) {
        const stageSize = SizeMake(width, height);

        const layer = this.layer;
        const naturalSize = layer.naturalSize;

        // Supply a fake object to apply the size to
        let fake = {
            layer: {
                naturalSize: naturalSize,
            },
            stage: {
                size: stageSize
            },
            scale: 0.7,
            cropInsets: InsetsZero(),
            _clampCenterPoint: () => {},
        };

        // Get the desired size in the fake object
        this.applySizeOption(option, fake);
        const targetSize = fake.contentSize;

        // Scale it up
        const scale = Math.min(stageSize.width / targetSize.width, stageSize.height / targetSize.height) * fake.scale;

        // Center it
        const dest = RectMake(
            (stageSize.width - (targetSize.width * scale)) / 2,
            (stageSize.height - (targetSize.height * scale)) / 2,
            targetSize.width * scale,
            targetSize.height * scale
        );

        // Draw a rect of the desired size
        try {
            context.fillStyle = "rgba(0, 0, 0, 0.66)";
            context.fillRect(dest.x, dest.y, dest.width, dest.height);
        } catch (err) {
            console.error("Error drawing placeholder media size option", err);
        }
    }
    contentSizeForLayer() {
        return this.contentSize;
    }
    updateLayerTransform() {
        const layer = this.layer;
        if (layer != null) {
            layer.frame = this.frameForLayer(layer);
        }
    }
    newLayer(stageSize) {
        const layer = new Media.Placeholder.Layer();
        layer.frame = RectMake(0, 0, stageSize.width, stageSize.height);
        return layer;
    }
    newOverlayHelper() {
        const overlayHelper = super.newOverlayHelper();
        if (!overlayHelper) {
            return null;
        }

        // Add a drag & drop overlay
        const dropZone = document.createElement("div");
        dropZone.className = "drop-zone";
        overlayHelper.overlay.appendChild(dropZone);

        const replaceButton = Stage.Object.Overlay.NewButton(
            LocalizedString("Replace..."),
            null,
            evt => this.replaceButtonClicked(replaceButton, evt),
        );

        var topCenterBar = overlayHelper.buttonBarAtPosition(Stage.Object.Overlay.Position.TopCenter);
        if (!topCenterBar) {
            const topCenterBar = Stage.Object.Overlay.NewButtonBar([replaceButton]);
            overlayHelper.setButtonBarAtPosition(topCenterBar, Stage.Object.Overlay.Position.TopCenter);
        } else {
            var firstChild = topCenterBar.firstChild;
            if (firstChild != null) {
                topCenterBar.replaceChild(replaceButton, firstChild);
            } else {
                topCenterBar.appendChild(replaceButton);
            }
        }

        return overlayHelper;
    }
    newSidebarPane() {
        return new Media.Placeholder.SidebarPane(this);
    }
    replaceButtonClicked(sender, event) {
        let menu = this.replaceMenu;
        if (menu) {
            menu.dismiss();
            return;
        }
        menu = new ReplaceMenu(this);
        menu.addEventListener("dismiss", _ => this.replaceMenu = null);
        this.replaceMenu = menu;
        menu.displayFrom(sender, event);
        Analytics.Log("media.replace.click", {
            source: "overlay",
            media_type: this.classTitle,
        });
    }
    onMouseDoubleClick(event) {
        // Do nothing, placeholder media cannot be edited in Camera
    }
    onDragOver(event) {
        this.onPointerEnter(event);
        this.overlayHelper.overlay.classList.add("dragging");
    }
    onDragLeave(event) {
        this.onPointerLeave(event);
        this.overlayHelper.overlay.classList.remove("dragging");
    }
    onDrop(event) {
        if (event.dataTransfer) {
            Media.Files.createMediaWithDataTransfer(event.dataTransfer).then((medias) => {
                if (medias && medias.length > 0) {
                    const replacer = new Media.Replacer(this);
                    replacer.replaceMediaWith(medias[0]);
                }
            });
            return true;
        }
        return false;
    }
    async generateThumbnail() {
        let layerSize = this.contentSize;
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

            context.fillStyle = "rgba(0, 0, 0, 0.66)";
            context.fillRect(0, 0, layerSize.width, layerSize.height);
        });
    }
    decodeMediaContent(media) {
        super.decodeMediaContent(media);
        this.contentSize = media.contentSize;
    }
    encodeMediaContent() {
        const media = super.encodeMediaContent();
        media.contentSize = this.contentSize;
        return media;
    }
    toJSON() {
        const r = super.toJSON();
        r.contentSize = this.contentSize;
        return r;
    }
    applyEvent(event, sender) {
        super.applyEvent(event, sender);

        const contentSize = event.contentSize;
        if (contentSize != null) {
            this.contentSize = contentSize;
        }
    }
}

Media.Placeholder.Layer = class extends RenderLayer {
    constructor() {
        super();

        const bgLayer = new RenderLayer();
        bgLayer.filter = new SolidColorFilter([0, 0, 0, 0.66]);
        bgLayer.userInteractionEnabled = true;
        this.addSublayer(bgLayer);
        this.backgroundLayer = bgLayer;

        const iconLayer = new RenderLayer();
        iconLayer.contentsSrc = "assets/icons/placeholder.png";
        this.addSublayer(iconLayer);
        this.iconLayer = iconLayer;
    }
    set size(value) {
        super.size = value;
        this.layoutSublayers();
    }
    get size() {
        return super.size;
    }
    layoutSublayers() {
        const size = this.size;
        if (SizeEquals(size, SizeZero()) == true) {
            return;
        }

        const backgroundLayer = this.backgroundLayer;
        backgroundLayer.frame = RectMake(0, 0, size.width, size.height);

        const iconLayer = this.iconLayer;
        const iconSize = 128;
        const iconInset = 8;

        const shortEdge = Math.min(size.width, size.height);
        const scaledIconSize = Math.min(iconSize, shortEdge - (iconInset * 2));

        iconLayer.frame = RectMake(
            (size.width - scaledIconSize) / 2,
            (size.height - scaledIconSize) / 2,
            scaledIconSize,
            scaledIconSize
        );
    }
}

Object.defineProperty(Media.Placeholder, "ClassIdentifier", {
    value: "placeholder",
    writable: false
});

Object.defineProperty(Media.Placeholder, "Title", {
    value: LocalizedString("Placeholder"),
    writable: false
});

Media.Placeholder.SidebarPane = class extends Media.SidebarPane {
    populateContents(container) {
        // Intentionally blank
    }
}
