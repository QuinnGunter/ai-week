//
//  models/slides/look.js
//  mmhmm
//
//  Created by Seth Hitchings on 7/15/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * A subclass of Slide.Modern that represents a Look in the Camera app.
 */
Slide.Look = class extends Slide.Modern {

    #hasBeenPersisted = true;
    #isTemporaryCatalogLook = false;
    #persistencePaused = false;

    constructor(endpoint, record) {
        super(endpoint, record);
    }

    /* Metadata manipulation */

    #setMetadataValue(key, val) {
        if (this.metadata == null) {
            this.metadata = {};
        }
        this.metadata[key] = val;
        this.setObjectNeedsPersistence(this);
    }

    get pinned() {
        return this.metadata?.pinned != null;
    }

    /* Catalog functionality */

    lookCameFromShare() {
        // Did this look get created as a result of importing a shared object?
        return this.exportDocumentId != null;
    }

    /*
        Media layer functionality

        In addition to presenter and wallpaper settings,
        looks are comprised of three optional media layers:

        - Pattern layer - a transparent PNG that goes at the bottom of the z-index
        - Overlay layer - a transparent PNG that goes above the pattern
        - Logo layer - a transparent PNG that goes above the overlay and
          behind the presenter foreground

        This code manages these layers.
     */

    /**
     * @returns {Media.NameBadge | undefined}
     */
    getNametagMedia() {
        const objects = this.objects ?? [];
        return objects.find(obj => IsKindOf(obj, Media.NameBadge));
    }

    /**
     * @param {LooksMediaType} type
     * @returns {Media.Image | Media.GIF | undefined}
     */
    async getLayerMedia(type) {
        switch (type) {
            case LooksMediaType.Logo:
                return this.getLogoMedia();
            case LooksMediaType.Pattern:
                return this.getPatternMedia();
            case LooksMediaType.Overlay:
                return this.getOverlayMedia();
            default:
                return this.#getMediaByType(type);
        }
    }

    /**
     * @returns {Media.Image | Media.GIF | undefined}
     */
    async getLogoMedia() {
        const match = this.#getMediaByType(LooksMediaType.Logo);
        if (match) {
            return match;
        }

        // See if there's a legacy piece of media that isn't 16:9
        // This isn't a perfect test, but hopefully it's relatively effective
        const media = this.objects ?? [];
        for (const obj of media) {
            if ((IsKindOf(obj, Media.Image) || IsKindOf(obj, Media.GIF)) && !obj.metadata?.type) {
                const size = await obj.getContentSize();
                if (size && (size.width != 1920 || size.height != 1080)) {
                    return obj;
                }
            }
        }

        return null;
    }

    /**
     * @returns {Media.Image | undefined}
     */
    async getPatternMedia() {
        const match = this.#getMediaByType(LooksMediaType.Pattern);
        if (match) {
            return match;
        }
        return this.#findUntypedPatternMedia();
    }

    /**
     * @param {Media.Image | undefined} media
     * @returns {LookPattern | undefined}
     */
    getPatternForMedia(media) {
        const fingerprint = media?.asset?.fingerprint;
        const patternOptions = this.getPatternOptions();
        if (fingerprint) {
            return patternOptions.find(option => option.matchesFingerprint(fingerprint));
        }
        return LooksUtils.matchAssetByContentURL(media?.asset, patternOptions);
    }

    /**
     * @param {Media.Image | undefined} media
     * @returns {string | undefined}
     */
    getThumbnailUrlForPattern(media) {
        const pattern = this.getPatternForMedia(media);
        return pattern?.thumbnailUrl;
    }

    /**
     * @param {Media.Image | undefined} media
     * @param {Number} opacity
     * @returns {Number}
     */
    getMediaOpacityForPattern(media, opacity) {
        // Each pattern has its own custom opacity range.
        const pattern = this.getPatternForMedia(media);
        if (!pattern) {
            return opacity;
        }
        return pattern.toMediaOpacity(opacity);
    }

    /**
     * @param {LookPattern | undefined} pattern
     * @returns {Number}
     */
    getDefaultOpacityForPattern(pattern) {
        return pattern?.defaultOpacity ?? 0.5;
    }

    /**
     * @param {Media.Image | undefined} media
     * @returns {Number}
     */
    getPatternOpacityForMedia(media) {
        const pattern = this.getPatternForMedia(media);
        if (!pattern) {
            return media.opacity;
        }
        return pattern.toPatternOpacity(media.opacity);
    }

    /**
     * @returns {Media.Image | undefined}
     */
    async getOverlayMedia() {
        const match = this.#getMediaByType(LooksMediaType.Overlay);
        if (match) {
            return match;
        }

        // See if there's a legacy piece of media that isn't a pattern and is 1920x1080
        const pattern = this.#findUntypedPatternMedia();

        const media = (this.objects ?? []).filter(obj => !obj.metadata?.type);
        for (const obj of media) {
            if (obj != pattern && IsKindOf(obj, Media.Image)) {
                const size = await obj.getContentSize();
                if (size && size.width == 1920 && size.height == 1080) {
                    return obj;
                }
            }
        }

        return null;
    }

    /**
     * @param {Media.Image | undefined} media
     * @returns {LookOverlay | undefined}
     */
    getOverlayForMedia(media) {
        const fingerprint = media?.asset?.fingerprint;
        const overlayOptions = this.getOverlayOptions();
        if (fingerprint) {
            return overlayOptions.find(option => option.matchesFingerprint(fingerprint));
        }
        return LooksUtils.matchAssetByContentURL(media?.asset, overlayOptions);
    }

    #findUntypedPatternMedia() {
        const patternFingerprints = LookPatterns.All.map(option => option.fingerprint);
        let objects = this.objects ?? [];
        objects = objects.filter(obj => !obj.metadata?.type);
        return objects.find(obj => {
            return IsKindOf(obj, Media.Image) && patternFingerprints.includes(obj.asset?.fingerprint);
        });
    }

    /**
     * @param {LooksMediaType} type
     * @returns {Media | undefined}
     */
    #getMediaByType(type) {
        return this.objects.find(obj => obj.metadata?.type === type);
    }

    /* Look editor settings functionality */

    getPreset() {
        const presetId = this.metadata?.preset?.id;
        if (!presetId) {
            return null;
        }
        return LookPresets.presetWithId(presetId);
    }

    /**
     * @returns {boolean}
     */
    hasPreset() {
        return !!this.getPreset();
    }

    /**
     * @returns {string | null}
     */
    getPresetName() {
        return this.getPreset()?.name;
    }

    /**
     * @returns {string | null}
     */
    getPresetId() {
        return this.getPreset()?.id ?? null;
    }

    /**
     * @param {string} id
     */
    setPresetId(id) {
        this.#setMetadataValue("preset", { id });
    }

    /**
     * @returns {string | null}
     */
    getPresetVariantId() {
        return this.metadata?.preset?.variant ?? null;
    }

    /**
     * @returns {LooksLayer | null}
     */
    getInitialEditorLayer() {
        return this.getPreset()?.getInitialEditorLayer() ?? null;
    }

    /**
     * @returns {boolean}
     */
    isBrandEditable() {
        return this.getPreset()?.isBrandEditable() ?? true;
    }

    /**
     * @returns {boolean}
     */
    isShapeEditable() {
        return this.getPreset()?.isShapeEditable() ?? true;
    }

    /**
     * @returns {boolean}
     */
    isBackgroundStyleEditable() {
        return this.getPreset()?.isBackgroundStyleEditable() ?? true;
    }

    /**
     * @returns {boolean}
     */
    hasLimitedNametagStyleOptions() {
        return this.getPreset()?.hasLimitedNametagStyleOptions() ?? false;
    }

    /**
     * @returns {Object[] | null}
     */
    getNametagStyleOptions() {
        return this.getPreset()?.getNametagStyleOptions();
    }

    /**
     * @returns {boolean}
     */
    isLogoEditable() {
        return this.getPreset()?.isLogoEditable() ?? true;
    }

    /**
     * @returns {string[]}
     */
    getLogoOptions() {
        const brandOptions = this.brandLogoUrls;
        const logoOptions = (this.getPreset()?.logoOptions ?? []).map(option => option.url);
        return [...brandOptions, ...logoOptions];
    }

    /**
     * @returns {string}
     */
    getCustomLogoLayerTitle() {
        return this.getPreset()?.getLogoLayerTitle();
    }

    /**
     * @returns {boolean}
     */
    isTintEditable() {
        return this.getPreset()?.isTintEditable() ?? true;
    }

    /**
     * @returns {boolean}
     */
    hasLimitedTintOptions() {
        return this.getPreset()?.hasLimitedTintOptions() ?? false;
    }

    /**
     * @returns {Paint[] | null}
     */
    getTintOptions() {
        return this.getPreset()?.getTintOptions();
    }

    /**
     * @returns {boolean}
     */
    hasLimitedColorOptions() {
        return this.getPreset()?.hasLimitedColorOptions() ?? false;
    }

    /**
     * @returns {boolean}
     */
    isColorEditable() {
        // Does this look use explicit color schemes?
        return this.getPreset()?.hasLimitedColorOptions() ?? true;
    }

    /**
     * @returns {Paint[] | null}
     */
    getColorOptions() {
        return this.getPreset()?.getColorOptions();
    }

    /**
     * @returns {string | null}
     */
    getColorOption() {
        return this.metadata?.colorScheme;
    }

    /**
     * Get the color that should be used to colorize this look's layers.
     * @param {Presenter.Local} presenter
     * @returns {Paint | null}
     */
    getColorizationColor(presenter) {
        // Does this preset use explicit color schemes?
        if (this.hasLimitedColorOptions()) {
            const color = this.getColorOption();
            return color ? LooksColors.solidPaintForColor(color) : null;
        }

        // Nope, fall back to keying colorization off of tint
        return presenter.backgroundPaint;
    }

    /**
     * Given the selected color scheme, get the presenter background tint.
     * @param {string} colorOption hex color
     * @returns {Paint | null}
     */
    getTintColorForColorScheme(colorOption) {
        const callback = this.getPreset()?.getTintColorCallback();
        if (callback) {
            const tint = callback(colorOption);
            if (typeof tint === "string") {
                return LooksColors.solidPaintForColor(tint);
            }
            return tint;
        }
        return null;
    }

    /**
     * @param {string} value the selected hex color
     */
    setColorOption(value) {
        this.#setMetadataValue("colorScheme", value);
    }

    /**
     * @returns {string}
     */
    getCustomTintLayerTitle() {
        return this.getPreset()?.getTintLayerTitle();
    }

    /**
     * @returns {boolean}
     */
    isPatternEditable() {
        return this.getPreset()?.isPatternEditable() ?? true;
    }

    /**
     * @returns {boolean}
     */
    hasLimitedPatternOptions() {
        return this.getPreset()?.hasLimitedPatternOptions() ?? false;
    }

    /**
     * @returns {LookPattern[]}
     */
    getPatternOptions() {
        return this.getPreset()?.getPatternOptions() ?? LookPatterns.All;
    }

    /**
     * @returns {boolean}
     */
    isCustomPatternEnabled() {
        return this.getPreset()?.isCustomPatternEnabled() ?? true;
    }

    /**
     * @returns {string}
     */
    getCustomPatternLayerTitle() {
        return this.getPreset()?.getPatternLayerTitle();
    }

    /**
     * @returns {boolean}
     */
    isOverlayEditable() {
        return this.getPreset()?.isOverlayEditable() ?? true;
    }

    /**
     * @returns {boolean}
     */
    hasLimitedOverlayOptions() {
        return this.getPreset()?.hasLimitedOverlayOptions() ?? false;
    }

    /**
     * @returns {LookOverlay[]}
     */
    getOverlayOptions() {
        return this.getPreset()?.getOverlayOptions() ?? LookOverlays.All;
    }

    /**
     * @returns {boolean}
     */
    isCustomOverlayEnabled() {
        return this.getPreset()?.isCustomOverlayEnabled() ?? true;
    }

    /**
     * @returns {string}
     */
    getCustomOverlayLayerTitle() {
        return this.getPreset()?.getOverlayLayerTitle();
    }

    /**
     * @returns {boolean}
     */
    isWallpaperEditable() {
        return this.getPreset()?.isWallpaperEditable() ?? true;
    }

    /**
     * @returns {boolean}
     */
    hasLimitedWallpaperOptions() {
        return this.getPreset()?.hasLimitedWallpaperOptions() ?? false;
    }

    /**
     * @returns {string[] | null}
     */
    getWallpaperOptions() {
        return this.getPreset()?.getWallpaperOptions();
    }

    /**
     * @returns {boolean}
     */
    isCustomWallpaperEnabled() {
        return this.getPreset()?.isCustomWallpaperEnabled() ?? true;
    }

    /**
     * @returns {boolean}
     */
    isWallpaperNoneEnabled() {
        return this.getPreset()?.isWallpaperNoneEnabled() ?? true;
    }

    /**
     * @returns {string}
     */
    getCustomWallpaperLayerTitle() {
        return this.getPreset()?.getWallpaperLayerTitle();
    }

    /* Brand functionality */

    /**
     * Get the parsed brand data for this look.
     * It'd be nice to move to returning an instance of a BrandData class...
     * This is the brand data returned by BrandFetch.parseBrandData().
     * @returns {Object | null}
     */
    get brandData() {
        if (this.rawBrandData) {
            // We now store the raw brand data and parse it as needed
            return BrandFetch.parseBrandData(this.rawBrandData);
        } else {
            // We used to store the parsed brand data
            return this.metadata?.brandData;
        }
    }

    /**
     * Get the unparsed brand data for this look.
     * This is the raw data returned by BrandFetch.getBrandData().
     * @returns {Object | null}
     */
    get rawBrandData() {
        return this.metadata?.brand;
    }

    /**
     * Set the raw brand data for this look.
     * This should be the raw data returned by BrandFetch.getBrandData().
     * @param {Object} data - The raw brand data.
     */
    set rawBrandData(data) {
        this.#setMetadataValue("brand", data);
    }

    hasRealBrandData() {
        return this.brandData != null;
    }

    hasBrandData() {
        return this.hasRealBrandData() || this.hasFakeBrandData();
    }

    get fakeBrandData() {
        return this.getPreset()?.fakeBrandData;
    }

    hasFakeBrandData() {
        return this.fakeBrandData != null;
    }

    get brandName() {
        return this.brandData?.name ?? this.fakeBrandData?.name;
    }

    get brandDomain() {
        return this.brandData?.domain;
    }

    /**
     * Get the preferred brand logo PNG URL for this look.
     * @returns {string | null}
     */
    get primaryBrandLogoUrl() {
        const brandData = this.brandData;
        if (!brandData) {
            return null;
        }

        const logoData = brandData.images?.wordmark || brandData.images?.brandmark;
        return logoData?.png;
    }

    /**
     * Get the preferred brand logo SVG URL for this look.
     * @returns {string | null}
     */
    get primaryBrandLogoSvgUrl() {
        const brandData = this.brandData;
        if (!brandData) {
            return null;
        }

        const logoData = brandData.images?.wordmark || brandData.images?.brandmark;
        return logoData?.svg;
    }

    /**
     * Get the brand icon URL for this look. This should be just the brandmark,
     * not a wordmark.
     * @returns {string | null}
     */
    get brandIconUrl() {
        const brandData = this.brandData;
        if (!brandData) {
            const fakeBrandData = this.fakeBrandData;
            return fakeBrandData?.iconUrl ?? null;
        }

        const brandmark = brandData.images?.brandmark;
        const icon = brandData.images?.icon;

        return brandmark?.png ||
               brandmark?.jpg ||
               icon?.png ||
               icon?.jpg;
    }

    get brandLogoUrls() {
        const brandData = this.brandData;
        return brandData?.images?.all?.raster ?? // We store URLs in the 'raster' array now
            brandData?.images?.all?.png ??       // Old, for backwards compatibility
            [];
    }

    get primaryBrandColor() {
        return this.brandData?.colors?.brand;
    }

    get brandColors() {
        return this.brandData?.colors?.all ?? [];
    }

    /* Persistence functionality */

    // We'd like to be able to modify a slide, including adding and removing objects,
    // without persisting the changes to the service. This means we don't post sync records
    // and we don't upload assets, but we do mutate our local state so that the changes appear
    // on the stage.

    set persistencePaused(value) {
        this.#persistencePaused = value === true;
    }

    get persistencePaused() {
        return this.#persistencePaused === true;
    }

    set hasBeenPersisted(value) {
        this.#hasBeenPersisted = value === true;
    }

    get hasBeenPersisted() {
        return this.#hasBeenPersisted === true;
    }

    // Catalog looks are imported server-side, so we can't let users
    // "try them on" without persisting them. However, we want to
    // clean them up if the user ultimately doesn't choose to use them.
    // This flag indicates that a look was imported from the catalog,
    // but the user hasn't yet chosen to save it aka use it.

    get temporaryCatalogLook() {
        return this.#isTemporaryCatalogLook === true;
    }

    set temporaryCatalogLook(value) {
        this.#isTemporaryCatalogLook = value === true;
    }

    /**
     * Used by child media objects to determine if persistence is paused.
     */
    canPersist() {
        return !this.persistencePaused;
    }

    /**
     *
     *
     * Pausing persistence ensures that our "needsPersistence" system won't actually persist
     * anything, but we'll have enough local state to be able to persist later.
     */
    pausePersistence() {
        if (this.persistencePaused) {
            console.error("Sync is already paused for slide", this.identifier);
            return;
        }
        console.log("Pausing sync for slide", this.identifier);
        this.persistencePaused = true;
    }

    /**
     * Un-paused persistence and persist any pending local changes.
     * The returned promise resolves when all persistence is complete.
     */
    async resumePersistence() {
        if (!this.persistencePaused) {
            console.error("Sync is not paused for slide", this.identifier);
            return;
        }

        console.log("Resuming sync for slide", this.identifier);
        this.persistencePaused = false;

        // Persist ourself
        await this.performPersistence();
        if (!this.#hasBeenPersisted) {
            this.#hasBeenPersisted = true;
            this.presentation._postSlidesChangedNotification();
        }

        // Persist our media
        const tasks = this.objects.map(obj => {
            if (obj.needsPersistence) {
                console.log("Persisting slide media", obj);
                return obj.performPersistence().catch(err => {
                    console.error("Failed to persist media", err);
                });
            }
            return Promise.resolve();
        });

        // TODO handle errors
        await Promise.allSettled(tasks);

        // Trash removed media
        const removedObjects = this.removedObjects;
        if (removedObjects) {
            this.removedObjects = null;
            console.log("Trashing removed slide media", removedObjects);
            await this._setTrashedValueOnObjects(true, removedObjects).catch(err => {
                console.error("Failed to trash removed slide media", err);
            });
        }
    }

    /**
     * Check if the slide has local changes that need to be persisted.
     * @returns {boolean} true if the slide has local changes that need to be persisted
     */
    hasLocalChanges() {
        // We've never been persisted
        if (!this.hasBeenPersisted) {
            return true;
        }

        // The slide itself (presenter, room, title, etc) may have local changes
        if (this.needsPersistence) {
            return true;
        }

        // One or more media objects may have been removed
        if (this.removedObjects && this.removedObjects.length > 0) {
            return true;
        }

        // One or more media objects may have been added or have local changes
        return this.objects.some(obj => obj.needsPersistence);
    }

    /**
     * Rollback any pending local changes and revert to the last persisted state
     * of the slide. The returned promise resolves when the rollback is complete.
     */
    async rollbackLocalChanges() {
        if (!this.persistencePaused) {
            console.error("Sync is not paused for slide", this.identifier);
            return;
        }

        this.persistencePaused = false;
        this.removedObjects = null;

        if (!this.hasLocalChanges()) {
            console.log("No local changes to rollback for slide", this.identifier);
            return;
        }

        console.log("Rolling back unsaved changes for slide", this.identifier);

        // Reload doesn't handle local children that aren't in the service list,
        // so we do it ourselves here by clearing the local list. It will be
        // repopulated by the reload.
        const objects = this.objects;
        objects.forEach(obj => {
            if (IsKindOf(obj, Media.NameBadge)) {
                // Don't remove the name tag, since the user can't remove it from the look
                // and we don't want it becoming visible when it's restored during reload
                if (obj.needsPersistence) {
                    // Clear the needsPersistence flag so that service changes will
                    // overwrite the local changes
                    obj._needsPersistence = false;
                }
            } else {
                this._objectWasRemoved(obj)
            }
        });
        await this.reload();

        // It also doesn't seem to be restoring our presenter settings?
        this._presenterSettingsValueChanged();
        this._roomSettingsValueChanged();
    }

    /**
     * Override addObjects to special case persistence being paused.
     */
    addObjects(objects, onProgress, cancelSignal, assignZIndex=true, addtoUndoManager=true) {
        if (!this.persistencePaused) {
            return super.addObjects(objects, onProgress, cancelSignal, assignZIndex, addtoUndoManager);
        }

        objects.forEach((media) => {
            if (assignZIndex) {
                media.zIndex = this.zIndexForNewObject(media);
            }
            this._objectWasAdded(media, false);

            if (media.delegate) {
                media.setNeedsPersistence();
            } else {
                // We're not on stage, so our media will refuse to persist
                // itself. Force it manually.
                // TODO revisit this, we shouldn't have to force it.
                media._needsPersistence = true;
            }
        });

        this.#notifyLocalChanges();
    }

    /**
     * Override deleteObjects to special case persistence being paused.
     */
    deleteObjects(objects) {
        if (!this.persistencePaused) {
            return super.deleteObjects(objects);
        }

        // It'd be nice to detect objects that were never persisted in the first place
        // and skip creating them on the service in a trashed state.
        let removedObjects = this.removedObjects;
        if (removedObjects == null) {
            removedObjects = [];
            this.removedObjects = removedObjects;
        }

        objects.forEach(obj => {
            const currentObj = this.objectWithIdentifier(obj.identifier);
            if (currentObj != null) {
                this._objectWasRemoved(currentObj);
                removedObjects.push(currentObj);
            }
        });

        this.#notifyLocalChanges();
    }

    /**
     * Override _startNeedsPersistenceTimeout to special case persistence being paused.
     */
    _startNeedsPersistenceTimeout() {
        if (this.persistencePaused) {
            this.#notifyLocalChanges();
            return;
        }
        super._startNeedsPersistenceTimeout();
    }

    /**
     * For now, simply used to ensure we know when we have local changes.
     */
    setObjectWillPersist(object) {
        if (this.persistencePaused) {
            this.#notifyLocalChanges();
        }
    }

    /**
     * If we have unsync'd local changes, notify observers.
     */
    #notifyLocalChanges() {
        this.didChangeValueForProperty(this.hasLocalChanges(), "hasLocalChanges");
    }

    /**
     * Override didDetachFromStage to special case simply deleting ourselves
     * if we've never been persisted.
     */
    didDetachFromStage(stage) {
        super.didDetachFromStage(stage);

        if (this.hasBeenPersisted) {
            return;
        }

        const presentation = this.presentation;
        const slides = presentation.slides;
        const index = slides.indexOf(this);
        if (index !== -1) {
            slides.splice(index, 1);
            presentation.slides = slides;
        }
    }

}
