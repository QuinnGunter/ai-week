//
//  teleport/media/core.js
//  mmhmm
//
//  Created by Steve White on 12/16/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class Media extends Stage.Object {
    // The presenterID is stored to:
    // 1) Destroy the slide when the presenter disconnects
    // 2) Camera slides need to know to only operate when
    //    the presenter is the local presenter
    constructor(identifier, presenterID) {
        if (presenterID == null) {
            var localPresenter = gApp.localPresenter;
            if (localPresenter != null) {
                presenterID = localPresenter.identifier;
            }
            if (presenterID == null) {
                console.log("no local presenter");
                console.trace();
                presenterID = createUUID();
            }
        }
        if (identifier == null) {
            identifier = createUUID();
        }

        super(identifier);
        this.presenterID = presenterID;

        this._scale = 0.7;
        this._zIndex = 0;
        this._anchor = Stage.Object.Anchor.TopRight;
        this._center = PointZero();

        // Disables the mic/camera toolbar buttons
        this.avControlsDisabled = false;

        this.automaticallyNotifiesObserversOfCornerRadius = false;

        // Define for KVO purposes
        this.effect = null;
    }

    get movable() {
        // In Airtime Camera, logos are manually positionable
        // Everything else is not
        const metadata = this.metadata;
        if (metadata && metadata.type == LooksMediaType.Logo) {
            return true;
        }
        return false;
    }

    copy() {
        var r = new this.constructor(createUUID(), this.presenterID, this.type);
        var record = new CloudyRecord({ collection: mmhmmAPI.CloudyCollectionTypes.Media });
        this.encodeToModernRecord(record);
        const endpoint = this.delegate?.endpoint ?? mmhmmAPI.defaultEndpoint();
        r.decodeFromModernRecord(record, endpoint);
        if ('asset' in this) {
            r.asset = this.asset;
        }
        if ('thumbnailAsset' in this) {
            r.thumbnailAsset = this.thumbnailAsset;
        }
        if ('maskAsset' in this) {
            r.maskAsset = this.maskAsset;
        }
        r.title = this.title;
        return r;
    }
    copySettingsFrom(otherSlide) {
        var dirty = false;

        if (this.scale != otherSlide.scale) {
            this.scale = otherSlide.scale;
            this.dirty = true;
        }
        if (this.anchor != otherSlide.anchor) {
            this.anchor = otherSlide.anchor;
            dirty = true;
        }
        if (this.center != otherSlide.center) {
            this.center = otherSlide.center;
            dirty = true;
        }
        if (this.effect != otherSlide.effect) {
            this.effect = otherSlide.effect;
            dirty = true;
        }
        if (this.fullscreen != otherSlide.fullscreen) {
            this.fullscreen = otherSlide.fullscreen;
            dirty = true;
        }
        if (this.zIndex != otherSlide.zIndex) {
            this.zIndex = otherSlide.zIndex;
            dirty = true;
        }

        return dirty;
    }
    get hash() {
        var str = `${this.identifier}${this.scale}${this.anchor}${this.center.x}${this.center.y}${this.fullscreen}`;
        var asset = this.asset;
        if (asset != null) {
            var fingerprint = asset.fingerprint;
            if (fingerprint != null) {
                str += fingerprint;
            }
        }
        return cyrb53(str);
    }
    get classIdentifierForTeleport() {
        return this.classIdentifier;
    }
    get croppable() {
        return false;
    }
    get belongsToLocalPresenter() {
        var stage = this.stage ?? gApp.stage;
        var localPresenter = stage.localPresenter;
        return (this.presenterID == localPresenter.identifier);
    }
    get editorClass() {
        return null;
    }
    get assets() {
        return [
            this.asset,
            this.maskAsset,
        ].filter(asset => asset != null);
    }
    get classTitle() {
        return this.constructor.Title;
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        const layer = this.layer;
        if (layer != null) {
            layer.zIndex = this.zIndex;
            layer.cornerRadius = this.cornerRadius;
            layer.opacity = this.opacity;

            const effect = this.effect;
            if (effect != null) {
                layer.addFilter(effect);
            }
        }

        this.resizeLayer();

        var maskAsset = this.maskAsset;
        if (maskAsset != null) {
            maskAsset.open().then(mask => {
                this.applyMaskToLayer(mask);
            })
        }
    }
    willDetachFromStage(stage) {
        super.willDetachFromStage(stage);

        this.layer = null;

        this.resolvePendingThumbnailRequest(null, new TypeError("Slide was unloaded"));

        if (this.needsPersistence == true) {
            this.performPersistence();
        }

        var maskAsset = this.maskAsset;
        if (maskAsset != null) {
            maskAsset.close();
        }
    }
    newSidebarPane() {
        return new Media.SidebarPane(this);
    }
    /*
     * Overlay
     */
    newOverlayHelper() {
        return new Media.Overlay(this);
    }
    closeButtonWasClicked(event) {
        var delegate = this.delegate;
        if (delegate != null) {
            delegate.mediaWasClosed(this);
            return;
        }

        var stage = this.stage;
        if (stage != null) {
            stage.removeMedia(this);
        }
    }
    /*
     * Layer sizing
     */
    resizeLayer() {
        const layer = this.layer;
        const stageSize = this.stage.size;
        const contentSize = layer.naturalSize;

        const scale = Math.min(stageSize.width / contentSize.width, stageSize.height / contentSize.height);
        layer.position = PointMake(stageSize.width / 2, stageSize.height / 2);
        layer.size = SizeMake(contentSize.width * scale, contentSize.height * scale);

        this._cropInsetsChanged();
        this.updateLayerTransform(layer);

        const onResizePromise = this.onResizePromise;
        if (onResizePromise != null) {
            onResizePromise.resolve();
            this.onResizePromise = null;
        }
    }
    async getContentSize() {
        // This method is only used by the legacy importer, so
        // subclasses can cut some corners: safe to assume
        // assets are cloudy assets, etc
        return this.layer?.naturalSize;
    }
    async applyLegacyStudioInsets() {
        var insets = this.studioInsets;
        if (insets == null) {
            return;
        }
        delete this.studioInsets;

        var contentSize = null;
        try {
            contentSize = await this.getContentSize();
        }
        catch (err) {
            console.error("getContentSize threw: ", this, err);
        }
        if (contentSize == null) {
            return;
        }
        var stageSize = gApp.stage.size;

        // The media may be need to be scaled up to fill the stage
        var scaleUp = Math.min(
            stageSize.width / contentSize.width,
            stageSize.height / contentSize.height,
        );

        var scaledUpContentSize = SizeMake(
            contentSize.width * scaleUp,
            contentSize.height * scaleUp,
        )

        // Insets are fractional, convert to pixels
        var top = insets.top * stageSize.height;
        var left = insets.left * stageSize.width;
        var bottom = stageSize.height - (insets.bottom * stageSize.height);
        var right = stageSize.width - (insets.right * stageSize.width);

        var insetFrame = RectMake(
            left,
            top,
            right - left,
            bottom - top
        );

        // Now figure out how to scale the content into the inset frame
        var scale = Math.min(
            insetFrame.width / scaledUpContentSize.width,
            insetFrame.height / scaledUpContentSize.height,
        );

        var scaledContentSize = SizeMake(
            scaledUpContentSize.width * scale,
            scaledUpContentSize.height * scale
        );

        // Horizontal alignment is left aligned when the mid point is < stage mid point
        // Otherwise right aligned
        var center = PointZero();
        if (RectGetMidX(insetFrame) < stageSize.width / 2) {
            center.x = RectGetMinX(insetFrame) + (scaledContentSize.width / 2);
        }
        else {
            center.x = RectGetMaxX(insetFrame) - (scaledContentSize.width / 2);
        }

        // Vertical alignment appears to always be top aligned
        center.y = RectGetMinY(insetFrame) + (scaledContentSize.height / 2);

        this.center = center;
        this.scale = scale;
        this.anchor = Stage.Object.Anchor.None;

        if (insets.fullscreen != null) {
            this.fullscreen = insets.fullscreen;
        }
        else {
            this.fullscreen = false;
        }
    }
    /*
     * Masking
     */
    applyMaskToLayer(mask) {
        var layer = this.layer;
        if (layer == null) {
            return;
        }

        if (mask == null) {
            layer.mask = null;
        }
        else if (mask.constructor == String || mask.constructor == URL) {
            var image = new Image();
            image.crossOrigin = "anonymous";
            image.src = mask;
            image.decode().then(() => {
                layer.mask = image;
            })
        }
        else {
            console.error("Unhandled mask", mask);
        }
    }
    /*
     * Properties
     */
    set effect(anEffect) {
        var previous = this._effect;
        if (anEffect == previous) {
            return;
        }

        this._effect = anEffect;
        this.setNeedsPersistence();

        var layer = this.layer;
        if (layer != null) {
            var filters = layer.filters || [];
            if (previous != null) {
                layer.removeFilter(previous);
            }
            if (anEffect != null) {
                layer.addFilter(anEffect);
            }
            layer.filters = filters;
        }
    }
    get effect() {
        return this._effect;
    }
    set title(aTitle) {
        this._title = aTitle;
    }
    get title() {
        return this._title;
    }
    set cornerRadius(value) {
        const cornerRadius = clamp(value, 0.0, 1.0);
        const previous = this.cornerRadius;
        if (cornerRadius == previous) {
            return;
        }
        this._cornerRadius = cornerRadius;
        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'cornerRadius', previous);
        this.didChangeValueForProperty(cornerRadius, "cornerRadius");

        const layer = this.layer;
        if (layer != null) {
            layer.cornerRadius = cornerRadius;
        }
    }
    get cornerRadius() {
        return this._cornerRadius ?? 0;
    }
    /*
     * Actions
     */
    get supportsCopyPaste() {
        return gApp.clipboardSupported;
    }
    newEditMenu() {
        const menu = new Menu();

        if (this.croppable == true) {
            const cropItem = menu.addItem(LocalizedString("Adjust crop"), () => {
                this.enterEditMode();
            }, false);
            if (this.editable == false) {
                cropItem.disabled = true;
            }
            menu.addDivider();
        }

        if (this.supportsCopyPaste == true) {
            menu.addItem(LocalizedString("Copy"), () => {
                this.writeToClipboard();
            });
        }

        let pasteData = null;
        const pasteItem = menu.addItem(LocalizedString("Paste"), () => {
            gApp.processClipboardData(pasteData);
        });
        // Initially disable the menu item as the
        // clipboard read is asynchronous...
        pasteItem.disabled = true;

        // newEditMenu may be invoked w/o being shown, e.g. to see if it
        // has any contents.  So defer reading the clipboard until we
        // know the menu will be shown.
        menu.addEventListener("willAppear", (event) => {
            gApp.dataFromClipboard().then((data) => {
                // Intentionally discard presenter records from the data
                pasteData = { mediaObjects: data.mediaObjects };

                if (data.mediaObjects.length > 0) {
                    pasteItem.disabled = false;
                }
            }).catch((error) => {
                console.error("Error reading from clipboard: ", error);
            })
        }, {once: true});

        return menu;
    }
    _displayDialogOfClass(dialogClass) {
        let dialog = this.activeDialog;
        if (dialog != null) {
            dialog.dismiss();
            return;
        }

        dialog = new dialogClass(this);
        if (dialog.onDismiss != null) {
            this.dialog = dialog;

            dialog.addEventListener("dismiss", () => {
                if (dialog == this.dialog) {
                    this.dialog = null;
                }
            }, {once: true});
        }

        if (dialog.displayAsModal != null) {
            dialog.displayAsModal();
        }
    }
    displayContentsEditor() {
        const editorClass = this.editorClass;
        if (editorClass != null) {
            this._displayDialogOfClass(editorClass)
        }
    }
    /*
     *
     */
    didChangeValueForProperty(value, property) {
        super.didChangeValueForProperty(value, property);

        const keys = [
            "zIndex", "scale", "opacity", "rotation", "center",
            "anchor", "fullscreen", "cropInsets", "cornerRadius"
        ];
        if (keys.indexOf(property) != -1) {
            this.setNeedsPersistence();
        }
    }
    /*
     * Alignment grids for movable slides
     */
    get anchorInset() {
        if (this.metadata?.anchorInset != null) {
            return this.metadata.anchorInset;
        }
        return 90;
    }
    newAlignmentGrid(size) {
        return new AlignmentGrid(size.width, size.height, this.anchorInset);
    }
    /*
     * Thumbnail helpers
     */
    resolvePendingThumbnailRequest(result, error) {
        var request = this.thumbnailRequest;
        if (request == null) {
            return;
        }
        if (result != null) {
            request.resolve(result);
        }
        else {
            request.reject(error);
        }
        delete this.thumbnailRequest;
    }
    async handlePendingThumbnailRequest() {
        if (this.thumbnailRequest == null || this.isReadyToThumbnail() == false) {
            return;
        }

        try {
            var thumbnail = await this.generateThumbnail();
            // XXX: Update thumbnailAsset if we're in a modern page?
            this.resolvePendingThumbnailRequest(thumbnail, null);
        } catch (err) {
            this.resolvePendingThumbnailRequest(null, err);
        }
    }
    async isReadyToThumbnail() {
        return true;
    }
    async generateThumbnail() {
        throw AbstractError();
    }
    async thumbnailAsElement() {
        let thumbnailImg = null;
        const asset = this.thumbnailAsset;
        if (asset != null) {
            thumbnailImg = await asset.openAsElement();
        }

        if (thumbnailImg == null) {
            const thumbnail = await this.thumbnail();
            thumbnailImg = new Image();
            thumbnailImg.crossOrigin = "anonymous";

            let url = null;
            let revoke = false;
            if (IsKindOf(thumbnail, Blob)) {
                url = URL.createObjectURL(thumbnail);
                revoke = true;
            }
            else {
                url = thumbnail;
            }
            thumbnailImg.src = url;

            try {
                await thumbnailImg.decode();
            }
            catch (err) {
                console.error("Error decoding image", thumbnailImg.cloneNode(), err);
                thumbnailImg.src = ThumbnailStorage.AssetMissing;
                await thumbnailImg.decode();
            }
            finally {
                if (revoke == true) {
                    URL.revokeObjectURL(url);
                }
            }
        }

        return thumbnailImg;
    }
    async thumbnail() {
        var thumbnailAsset = this.thumbnailAsset;
        if (thumbnailAsset != null) {
            return new Promise((resolve, reject) => {
                thumbnailAsset.open().then(opened => {
                    resolve(opened);
                    thumbnailAsset.close();
                }).catch(err => {
                    console.error("error opening thumbnail asset", thumbnailAsset, err);
                    reject(err);
                })
            })
        }

        var ready = await this.isReadyToThumbnail();
        if (ready == false) {
            var request = this.thumbnailRequest;
            if (request != null) {
                return request.promise;
            }
            request = {};
            request.promise = new Promise((resolve, reject) => {
                request.resolve = resolve;
                request.reject = reject;
            });
            this.thumbnailRequest = request;
            return request.promise;
        }

        try {
            var thumbnail = await this.generateThumbnail();
            this.resolvePendingThumbnailRequest(thumbnail, null);
            return thumbnail
        }
        catch (err) {
            gSentry.exception(err);
            this.resolvePendingThumbnailRequest(null, err);
            throw err;
        }
    }
    invalidateThumbnail() {
        this.thumbnailAsset = null;

        ThumbnailStorage.shared.delete(this).then(() => {
            NotificationCenter.default.postNotification(
                Media.Notifications.ThumbnailUpdated,
                this,
                {}
            );
        })
    }
    /*
     * Persistence helpers
     */
    setNeedsPersistence() {
        if (this._decoding == true) {
            // We're decoding properties and don't need
            // to persist them back to the service
            return;
        }

        var delegate = this.delegate;
        if (delegate == null || delegate.mediaNeedsPersistence == null) {
            // We shouldn't get into this state anymore, but play it safe...
            this._needsPersistence = false;
            return;
        }

        if (this.applyingEvent == true) {
            // Whatever changed happened due to a message received
            // through Teleport. Presumably the initiator persisted
            // it.

            // The Slide's thumbnail is only updated after Media persists
            // (indicating a change to layout/etc).  Since we're not
            // persisting, the Slide ends up showing a stale thumbnail.
            // This feels gross but for proof of concept...
            if (delegate?.invalidateThumbnail != null) {
                delegate.invalidateThumbnail();
            }
            return;
        }

        this._needsPersistence = true;
        this._stopNeedsPersistenceTimeout();
        this._startNeedsPersistenceTimeout();
    }
    get needsPersistence() {
        return this._needsPersistence;
    }
    get isPersisting() {
        return this._persistenceTask != null;
    }
    prepareForPersistence() {
        this._stopNeedsPersistenceTimeout();
        this._needsPersistence = false;
    }
    async performPersistence() {
        const delegate = this.delegate;
        if (delegate != null && delegate.canPersist() !== true) {
            if (delegate.setObjectWillPersist != null) {
                delegate.setObjectWillPersist(this);
            }
            return null;
        }

        this.prepareForPersistence();

        let task = null;
        if (delegate != null) {
            task = delegate.mediaNeedsPersistence(this);
            if (task != null) {
                // Keep track of our in-progress persistence task
                // so that any other code that needs to ensure we're
                // fully persisted has something to wait for
                this._persistenceTask = task;
                task.catch(err => {
                    // Ensure that there's a catch handler attached to the task
                    // so that unhandled rejections don't occur. Actually handling
                    // the error is the responsibility of the caller.
                }).finally(_ => {
                    this._persistenceTask = null;
                });
            }
        }

        this._needsPersistence = false;
        return task;
    }
    _stopNeedsPersistenceTimeout() {
        var timeout = this._needsPersistenceTimeout;
        if (timeout != null) {
            window.clearTimeout(timeout);
            this._needsPersistenceTimeout = null;
        }
    }
    _startNeedsPersistenceTimeout() {
        this._stopNeedsPersistenceTimeout();
        this._needsPersistenceTimeout = window.setTimeout(() => {
            if (this.isPersisting) {
                // If we're already in the middle of a persistence task, wait for it to finish
                this._startNeedsPersistenceTimeout();
            } else {
                this.performPersistence();
            }
        }, 3000);

        // Let our slide know we have changes coming
        if (this.delegate?.setObjectWillPersist != null) {
            this.delegate.setObjectWillPersist(this);
        }
    }
    async prepareForDuplication() {
        var task = null;
        if (this.needsPersistence == true) {
            task = this.performPersistence();
        }
        else if (this._persistenceTask != null) {
            task = this._persistenceTask;
        }
        if (task != null) {
            return task;
        }

        // No work to be done; return a Promise that resolves immediately
        return Promise.resolve();
    }
    /*
     * Cloudy helpers
     */
    getAssetForCloudy() {
        return this.asset;
    }
    _decodeCommonRecordFields(record) {
        this.created = new Date(record.createdAt);
        this.updated = new Date(record.updatedAt);
        this.title = record.decodeProperty("name", String, null);
    }
    decodeFromModernRecord(record, endpoint) {
        if (this.needsPersistence == true) {
            // We'd like to avoid clobbering pending data...
            return true;
        }

        this._decoding = true;
        var success = super.decodeFromModernRecord(record, endpoint);
        if (success == true) {
            this._decodeCommonRecordFields(record);

            this.cornerRadius = record.decodeProperty("cornerRadius", Number, 0.0);
            this.thumbnailAsset = record.decodeAssetReference(endpoint, {key: "thumbnail"}, true);
            this.maskAsset = record.decodeAssetReference(endpoint, {key: "mask"}, true);
        }

        this._decoding = false;
        return success;
    }
    encodeToModernRecord(record) {
        super.encodeToModernRecord(record);

        record.encodeAssetReference(this.asset, "content");
        record.encodeAssetReference(this.thumbnailAsset, "thumbnail");
        record.encodeAssetReference(this.maskAsset, "mask");
        record.encodeProperty("cornerRadius", this.cornerRadius);
    }
    encodeMediaContent() {
        const content = super.encodeMediaContent();
        content.metadata = this.metadata || {};
        return content;
    }
    decodeMediaContent(content) {
        const success = super.decodeMediaContent(content);
        if (success) {
            this.metadata = content.metadata;
        }
        return success;
    }
    /*
     * Network helpers
     */
    toJSON() {
        var record = super.toJSON();
        record.type = this.classIdentifierForTeleport;
        record.presenter = this.presenterID;

        var maskAsset = this.maskAsset;
        if (maskAsset != null) {
            record.mask = maskAsset;
        }
        return record;
    }
    applyEvent(event, sender) {
        super.applyEvent(event, sender);
        if (event == null) {
            return;
        }

        var mask = event.mask;
        if (mask != null) {
            var maskAsset = new LocalAsset(mask);
            if (maskAsset != null) {
                this.maskAsset = maskAsset;
            }
        }
    }
}

Media.ClassWithIdentifier = function(identifier) {
    for (var key in Media) {
        var cls = Media[key];
        if (cls.ClassIdentifier == identifier) {
            return cls;
        }
    }
    return null;
}

Media.Notifications = Object.freeze({
    ThumbnailUpdated: "Media.ThumbnailUpdated"
});
