//
//  preset.js
//  mmhmm
//
//  Created by Seth Hitchings on 9/3/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Defines a hardcoded look that can be created in the user's account.
 *
 * A preset consists of:
 * - Initial values for each of the layers of a look
 * - Whether or not each layer is editable by the user
 * - If the layer is editable, whether there is a custom list of options
 *   available for that layer's contents
 */
class LookPreset {

    #initialEditorLayer = null;

    #brandEditable = true;
    #shapeEditable = true;
    #styleEditable = true;
    #logoEditable = true;
    #tintEditable = true;
    #patternEditable = true;
    #overlayEditable = true;
    #wallpaperEditable = true;

    #wallpaperNoneEnabled = true;

    #customPatternEnabled = true;
    #customOverlayEnabled = true;
    #customWallpaperEnabled = true;

    #logoColorizable = false;
    #colorizationCallback = null; // Colorize media
    #tintColorCallback = null; // Get tint for color scheme

    #nametagColorizable = false;
    #nametagColorizationCallback = null;
    #nametagBehindPresenter = false;
    #nametagVisibleByDefault = false;

    #importLogosAsVisuals = false;
    #scaleForVisuals = 0.4;

    #variants = null;

    /**
     * @param {String} id
     */
    constructor(id, name) {
        this.id = id;
        this.name = name;

        // Set defaults for fields that must have a non-null value
        this.shape = "none";
        this.style = Presenter.BackgroundStyle.Show;
    }

    /**
     * For compatiblity with the legacy CatalogLooks class.
     * @returns {String}
     */
    get identifier() {
        return this.id;
    }

    /**
     * For compatiblity with the legacy CatalogLooks class.
     * @returns {String}
     */
    get title() {
        return this.name;
    }

    /* Variants */

    addVariant(variant) {
        if (this.#variants == null) {
            this.#variants = [];
        }
        this.#variants.push(variant);
        return this;
    }

    hasVariants() {
        return this.#variants != null && this.#variants.length > 0;
    }

    getVariants() {
        return this.#variants ?? [];
    }

    getVariantWithId(id) {
        const variants = this.#variants || [];
        return variants.find(variant => variant.id === id);
    }

    /** Stuff related to name tags */

    /**
     * @param {Object} style
     * @returns {LookPreset}
     */
    setNametagStyle(style) {
        this.nametagStyle = style;
        return this;
    }

    /**
     * @param {Object[]} options
     * @returns {LookPreset}
     */
    setNametagStyleOptions(options) {
        this.nametagStyleOptions = options;
        return this;
    }

    /**
     * @returns {Object[] | null}
     */
    getNametagStyleOptions() {
        return this.nametagStyleOptions;
    }

    /**
     * @returns {boolean}
     */
    hasLimitedNametagStyleOptions() {
        return this.nametagStyleOptions?.length > 0;
    }

    /**
     * @param {Boolean} colorizable
     * @returns {LookPreset}
     */
    setNametagColorizable(colorizable) {
        this.#nametagColorizable = colorizable;
        return this;
    }

    /**
     * @returns {Boolean}
     */
    isNametagColorizable() {
        return this.#nametagColorizable == true;
    }

    /**
     * @param {boolean} visible
     * @returns {LookPreset}
     */
    setNametagVisibleByDefault(visible) {
        this.#nametagVisibleByDefault = visible;
        return this;
    }

    /**
     * @returns {boolean}
     */
    isNametagVisibleByDefault() {
        return this.#nametagVisibleByDefault === true;
    }

    setDefaultNametagValues(values) {
        this.defaultNametagValues = values;
        return this;
    }

    /**
     * @param {boolean} value
     * @returns {LookPreset}
     */
    setShowNametagBehindPresenter(value) {
        this.#nametagBehindPresenter = value;
        return this;
    }

    /**
     * @returns {boolean}
     */
    isShowNametagBehindPresenter() {
        return this.#nametagBehindPresenter === true;
    }

    /* Setters for the contents of the layers that make up the look */

    /**
     * @returns {LookPreset}
     */
    setAutomaticallyEnterEditor() {
        this.automaticallyEnterEditor = true;
        return this;
    }

    /**
     * @param {LooksLayer} layer
     * @returns {LookPreset}
     */
    setInitialEditorLayer(layer) {
        this.#initialEditorLayer = layer;
        return this;
    }

    /**
     * @returns {LooksLayer | null}
     */
    getInitialEditorLayer() {
        return this.#initialEditorLayer;
    }

    /**
     * @param {Paint} tint
     * @returns {LookPreset}
     */
    setTint(tint) {
        this.tint = tint;
        return this;
    }

    /**
     * @param {Presenter.Shape} shape
     * @returns {LookPreset}
     */
    setShape(shape) {
        this.shape = shape;
        return this;
    }

    /**
     * @param {Presenter.BackgroundStyle} style
     * @returns {LookPreset}
     */
    setBackgroundStyle(style) {
        this.style = style;
        return this;
    }

    /**
     * @param {String} logo URL
     * @returns {LookPreset}
     */
    setLogo(logo) {
        this.logo = logo;
        return this;
    }

    /**
     * @param {Stage.Object.Anchor} anchor
     * @returns {LookPreset}
     */
    setLogoAnchor(anchor) {
        this.logoAnchor = anchor;
        return this;
    }

    /**
     * @param {Number} inset
     * @returns {LookPreset}
     */
    setAnchorInset(inset) {
        this.anchorInset = inset;
        return this;
    }

    /**
     * @param {{x:number, y:number}} centerPoint
     * @returns {LookPreset}
     */
    setLogoCenter(centerPoint) {
        this.logoPosition = centerPoint;
        return this;
    }

    /**
     * @param {Number} scale
     * @returns {LookPreset}
     */
    setLogoScale(scale) {
        this.logoScale = scale;
        return this;
    }

    /**
     * @param {LookPattern} pattern
     * @returns {LookPreset}
     */
    setPattern(pattern) {
        this.pattern = pattern;
        return this;
    }

    /**
     * @param {LookOverlay} overlay
     * @returns {LookPreset}
     */
    setOverlay(overlay) {
        this.overlay = overlay;
        return this;
    }

    /**
     * @param {String} wallpaper the room UUID
     * @returns {LookPreset}
     */
    setWallpaper(wallpaper) {
        this.wallpaper = wallpaper;
        return this;
    }

    /**
     * @param {String} brandDomain
     * @returns {LookPreset}
     */
    setBrandDomain(brandDomain) {
        this.brandDomain = brandDomain;
        return this;
    }

    /**
     * @param {Object} data
     * @returns {LookPreset}
     */
    setFakeBrandData(data) {
        this.fakeBrandData = data;
        return this;
    }

    /* Functions related to whether a given layer is editable in the look */

    /**
     * @returns {boolean}
     */
    isShapeEditable() {
        return !!this.#shapeEditable;
    }

    /**
     * @param {boolean} editable
     * @returns {LookPreset}
     */
    setShapeEditable(editable) {
        this.#shapeEditable = editable;
        return this;
    }

    /**
     * @returns {boolean}
     */
    isBackgroundStyleEditable() {
        return !!this.#styleEditable;
    }

    /**
     * @param {boolean} editable
     * @returns {LookPreset}
     */
    setBackgroundStyleEditable(editable) {
        this.#styleEditable = editable;
        return this;
    }

    /**
     * @returns {boolean}
     */
    isLogoEditable() {
        return !!this.#logoEditable;
    }

    /**
     * @param {boolean} editable
     * @returns {LookPreset}
     */
    setLogoEditable(editable) {
        this.#logoEditable = editable;
        return this;
    }

    /**
     * @returns {boolean}
     */
    isTintEditable() {
        return !!this.#tintEditable;
    }

    /**
     * @param {boolean} editable
     * @returns {LookPreset}
     */
    setTintEditable(editable) {
        this.#tintEditable = editable;
        return this;
    }

    /**
     * @returns {boolean}
     */
    isPatternEditable() {
        return !!this.#patternEditable;
    }

    /**
     * @param {boolean} editable
     * @returns {LookPreset}
     */
    setPatternEditable(editable) {
        this.#patternEditable = editable;
        return this;
    }

    /**
     * @param {boolean} enabled
     * @returns {LookPreset}
     */
    setCustomPatternEnabled(enabled) {
        this.#customPatternEnabled = enabled;
        return this;
    }

    /**
     * @returns {boolean}
     */
    isCustomPatternEnabled() {
        return this.#customPatternEnabled;
    }

    /**
     * @returns {boolean}
     */
    isOverlayEditable() {
        return !!this.#overlayEditable;
    }

    /**
     * @param {boolean} editable
     * @returns {LookPreset}
     */
    setOverlayEditable(editable) {
        this.#overlayEditable = editable;
        return this;
    }

    /**
     * @param {boolean} enabled
     * @returns {LookPreset}
     */
    setCustomOverlayEnabled(enabled) {
        this.#customOverlayEnabled = enabled;
        return this;
    }

    /**
     * @returns {boolean}
     */
    isCustomOverlayEnabled() {
        return this.#customOverlayEnabled;
    }

    /**
     * @returns {boolean}
     */
    isWallpaperEditable() {
        return !!this.#wallpaperEditable;
    }

    /**
     * @param {boolean} editable
     * @returns {LookPreset}
     */
    setWallpaperEditable(editable) {
        this.#wallpaperEditable = editable;
        return this;
    }

    /**
     * @param {boolean} enabled
     * @returns {LookPreset}
     */
    setWallpaperNoneEnabled(enabled) {
        this.#wallpaperNoneEnabled = enabled;
        return this;
    }

    /**
     * @returns {boolean}
     */
    isWallpaperNoneEnabled() {
        return this.#wallpaperNoneEnabled;
    }

    /**
     * @param {boolean} enabled
     * @returns {LookPreset}
     */
    setCustomWallpaperEnabled(enabled) {
        this.#customWallpaperEnabled = enabled;
        return this;
    }

    /**
     * @returns {boolean}
     */
    isCustomWallpaperEnabled() {
        return this.#customWallpaperEnabled;
    }

    /* Setters for available options for a given layer of the look */

    /**
     * @param {Object[]} options logo options, each with a url and title property
     * @returns {LookPreset}
     */
    setLogoOptions(options) {
        this.logoOptions = options;
        return this;
    }

    /**
     * @param {boolean} colorizable
     * @returns {LookPreset}
     */
    setLogoColorizable(colorizable) {
        this.#logoColorizable = colorizable;
        return this;
    }

    /**
     * @returns {boolean}
     */
    get isLogoColorizable() {
        return this.#logoColorizable;
    }

    /**
     * @param {Function(String, Object)} callback
     * @returns {LookPreset}
     */
    setColorizationCallback(callback) {
        this.#colorizationCallback = callback;
        return this;
    }

    /**
     * @returns {Function(String, Object) | null}
     */
    getColorizationCallback() {
        return this.#colorizationCallback;
    }

    setTintColorCallback(callback) {
        this.#tintColorCallback = callback;
        return this;
    }

    getTintColorCallback() {
        return this.#tintColorCallback;
    }

    /**
     * @param {Function(String)} callback
     * @returns {LookPreset}
     */
    setNametagColorizationCallback(callback) {
        this.#nametagColorizationCallback = callback;
        return this;
    }

    /**
     * @returns {Function(String) | null}
     */
    getNametagColorizationCallback() {
        return this.#nametagColorizationCallback;
    }

    /**
     * @param {Media.NameBadge} nametag
     * @returns {boolean}
     */
    shouldColorizeNametag(nametag) {
        return nametag != null &&
            this.isNametagColorizable() &&
            nametag.style.id == this.nametagStyle?.id;
    }

    /**
     * @param {Paint} paint
     * @param {Media.NameBadge} nametag
     */
    colorizeNametag(paint, nametag) {
        if (this.shouldColorizeNametag(nametag)) {
            // If we have a custom nametag colorization callback, invoke it
            // Otherwise we set the primary name tag color to the tint color
            const callback = this.getNametagColorizationCallback();
            if (callback) {
                callback(paint, nametag);
            } else {
                const color = LooksColors.primaryColorFromPaint(paint);
                LooksNameBadgeHandler.updateNameBadgeMediaColor(nametag, "primary", color);
            }
        }
    }

    /**
     * @param {boolean} importAsVisuals
     * @returns {LookPreset}
     */
    setImportLogosAsVisuals(importAsVisuals) {
        this.#importLogosAsVisuals = importAsVisuals;
        return this;
    }

    /**
     * @return {boolean}
     */
    get importLogosAsVisuals() {
        return this.#importLogosAsVisuals;
    }

    /**
     * @param {Number} scale
     * @returns {LookPreset}
     */
    setScaleForVisuals(scale) {
        this.#scaleForVisuals = scale;
        return this;
    }

    /**
     * @returns {Number}
     */
    getScaleForVisuals() {
        return this.#scaleForVisuals;
    }

    /**
     * @param {Paint[]} options tint options
     * @returns {LookPreset}
     */
    setTintOptions(options) {
        this.tintOptions = options;
        return this;
    }

    /**
     * @returns {Paint[] | null}
     */
    getTintOptions() {
        return this.tintOptions;
    }

    /**
     * @returns {boolean}
     */
    hasLimitedTintOptions() {
        return this.tintOptions?.length > 0;
    }

    /**
     * Color options is like tint options, but not tightly coupled
     * to the presenter background paint layer (aka tint). This allows
     * use to expose a color scheme that doesn't modify the presenter
     * tint but does colorize other elements.
     *
     * You can't have both - a preset either uses tintOptions or colorOptions.
     *
     * @param {Paint[]} options color options
     * @returns {LookPreset}
     */
    setColorOptions(options) {
        this.colorOptions = options;
        return this;
    }

    /**
     * @returns {Paint[] | null}
     */
    getColorOptions() {
        return this.colorOptions;
    }

    /**
     * Sets the default color (see setColorOptions above).
     * @param {Paint} tint
     * @returns {LookPreset}
     */
    setColor(color) {
        this.color = color;
        return this;
    }

    /**
     * @returns {Paint | null}
     */
    getColor() {
        return this.color;
    }

    /**
     * @returns {boolean}
     */
    hasLimitedColorOptions() {
        return this.colorOptions?.length > 0;
    }

    /**
     * @param {LookPattern[]} options
     * @returns {LookPreset}
     */
    setPatternOptions(options) {
        this.patternOptions = options;
        return this;
    }

    /**
     * @returns {LookPattern[] | null}
     */
    getPatternOptions() {
        return this.patternOptions;
    }

    /**
     * @returns {boolean}
     */
    hasLimitedPatternOptions() {
        return this.patternOptions?.length > 0;
    }

    /**
     * @param {LookOverlay[]} options
     * @returns {LookPreset}
     */
    setOverlayOptions(options) {
        this.overlayOptions = options;
        return this;
    }

    /**
     * @returns {LookOverlay[] | null}
     */
    getOverlayOptions() {
        return this.overlayOptions;
    }

    /**
     * @returns {boolean}
     */
    hasLimitedOverlayOptions() {
        return this.overlayOptions?.length > 0;
    }

    /**
     * @param {String[]} options wallpaper IDs
     * @returns {LookPreset}
     */
    setWallpaperOptions(options) {
        this.wallpaperOptions = options;
        return this;
    }

    /**
     * @returns {boolean}
     */
    hasLimitedWallpaperOptions() {
        return this.wallpaperOptions?.length > 0;
    }

    /**
     * @returns {String[]} room IDs
     */
    getWallpaperOptions() {
        if (this.wallpaperOptions == null) {
            return [];
        }

        // Each option may be a simple room ID, or may be an object with a room ID and CDN ID
        return this.wallpaperOptions.map(option => {
            if (typeof(option) === "string") {
                return option;
            } else if (typeof(option) === "object") {
                return option.id;
            }
        }).filter(id => id != null);
    }

    /**
     * @param {Boolean} editable
     * @returns {LookPreset}
     */
    setBrandEditable(editable) {
        this.#brandEditable = editable;
        return this;
    }

    /**
     * @returns {Boolean}
     */
    isBrandEditable() {
        return this.#brandEditable;
    }

    setPresenterEffect(effect) {
        this.presenterEffect = effect;
        return this;
    }

    /* Functions for managing custom layer names */

    getLogoLayerTitle() {
        return this.logoLayerTitle;
    }

    setLogoLayerTitle(title) {
        this.logoLayerTitle = title;
        return this;
    }

    getTintLayerTitle() {
        return this.tintLayerTitle;
    }

    setTintLayerTitle(title) {
        this.tintLayerTitle = title;
        return this;
    }

    getPatternLayerTitle() {
        return this.patternLayerTitle;
    }

    setPatternLayerTitle(title) {
        this.patternLayerTitle = title;
        return this;
    }

    getOverlayLayerTitle() {
        return this.overlayLayerTitle;
    }

    setOverlayLayerTitle(title) {
        this.overlayLayerTitle = title;
        return this;
    }

    getWallpaperLayerTitle() {
        return this.wallpaperLayerTitle;
    }

    setWallpaperLayerTitle(title) {
        this.wallpaperLayerTitle = title;
        return this;
    }

    /**
     * @param {String} url
     * @returns {LookPreset}
     */
    setThumbnailUrl(url) {
        this._thumbnailUrl = url;
        return this;
    }

    /**
     * @returns {String}
     */
    get thumbnailUrl() {
        if (this._thumbnailUrl) {
            return this._thumbnailUrl;
        }
        return `assets/looks/presets/${this.id}.png`;
    }

    /**
     * For compatiblity with the legacy CatalogLooks class.
     */
    async getThumbnailURL() {
        return this.thumbnailUrl;
    }

    /* Functions that create the contents of a given layer of the look */

    /**
     * @param {Look} slide
     * @param {Object} variant
     * @returns {Object}
     */
    createMetadata(slide, variant = null) {
        const existing = slide?.metadata ?? {};
        const toAdd = {
            preset: {
                id: this.id,
            }
        }
        if (variant) {
            toAdd.preset.variant = variant.id;
        }

        // Which color scheme was selected?
        const paint = variant?.color || this.color;
        if (paint) {
            const colorScheme = LooksColors.primaryColorFromPaint(paint);
            toAdd.colorScheme = colorScheme;
        }

        Object.assign(existing, toAdd);
        return existing;
    }

    registerRooms(roomStore) {
        const wallpaperOptions = this.wallpaperOptions ?? [];
        wallpaperOptions.forEach((option) => roomStore.cdnRoomWithIdentifier(option));
    }

    getRoom(roomStore, variant = null) {
        let room = null;
        if (variant && Object.keys(variant).includes("wallpaper")) {
            room = roomStore.roomWithIdentifier(variant.wallpaper);
        } else if (this.wallpaper) {
            room = roomStore.roomWithIdentifier(this.wallpaper);
        }
        if (!room) {
            // If we didn't find a room, fall back to the default black room
            room = LookWallpapers.blackRoom();
        }
        return room;
    }

    /**
     * @param {Slide.Look} slide
     * @param {Stage} stage
     * @returns {CloudyRecord}
     */
    createPresenter(slide, stage, variant = null) {
        const localPresenter = stage.localPresenter;

        let tint = null;
        if (variant && Object.keys(variant).includes("tint")) {
            tint = variant.tint;
        } else {
            tint = this.tint;
        }

        // Override just the settings we want
        const content = localPresenter.encodeMediaContent();
        content.foregroundZIndex = Slide.Modern.DefaultPresenterZIndices.Foreground;
        content.shape = this.shape;
        content.backgroundStyle = variant?.backgroundStyle ?? this.style;
        content.backgroundPaint = tint?.toJSON();

        const presenterMediaRecord = slide.presenter ?? slide.newRecordForPresenter(localPresenter);
        presenterMediaRecord.encodeProperty("content", content);

        if (this.presenterEffect) {
            presenterMediaRecord.encodeProperty("filter", this.presenterEffect.toMedia());
        }

        // If the shape isn't "none", we need to apply the min scale
        if (this.shape == Presenter.Shape.Circle || this.shape == Presenter.Shape.Polygon) {
            presenterMediaRecord.encodeProperty("scale", LooksUtils.minPresenterScale());
        } else if (this.shape != "none") {
            // TODO this should all be handled inside Look, we're duplicating
            // part of the logic from LooksPane...
            console.error("Unexpected presenter shape:", this.shape);
        }

        return presenterMediaRecord;
    }

    async createMedia(stage, variant = null) {
        // Add media, in order of lowest to highest z-index
        const media = [];
        media.push(this.#createPattern(stage, variant));
        media.push(this.#createOverlay(stage, variant));

        try {
            media.push(await this.#createLogo(stage, variant));
        } catch (err) {
            console.error("Error creating logo", err);
        }

        return media.filter(m => m != null);
    }

    /**
     * TODO creation should be in the Look class, look.addLogo(), look.replaceLogo(), look.removeLogo()
     * @returns {Media|null}
     */
    async #createLogo(stage, variant = null) {
        let url = null;
        if (variant && Object.keys(variant).includes("logo")) {
            url = variant.logo;
        } else {
            url = this.logo;
        }
        if (!url) {
            return null;
        }
        const color = this.getColorizationColor(variant);
        return this.createLogoMedia(stage, url, color);
    }

    async createLogoMedia(stage, url, color) {
        const logoMedia = LooksUtils.createImageMediaFromURL(url, LooksMediaType.Logo);

        if (this.logoPosition) {
            // Sometimes we explicitly position the logo instead of anchoring it
            logoMedia.anchor = Stage.Object.Anchor.None;
            logoMedia.center = LooksUtils.normalizeMediaPosition(stage, this.logoPosition);
        } else {
            logoMedia.anchor = this.logoAnchor ?? Stage.Object.Anchor.TopLeft;
        }
        try {
            logoMedia.scale = await this.scaleForLogo(logoMedia);
        } catch (err) {
            console.error("Error calculating logo scale:", err);
        }
        if (this.anchorInset != null) {
            logoMedia.metadata.anchorInset = this.anchorInset;
        }

        if (color && this.isLogoColorizable) {
            LooksUtils.updateColorScheme(color, logoMedia, this.#colorizationCallback);
        }

        return logoMedia;
    }

    async scaleForLogo(media) {
        if (this.logoScale != null) {
            if (this.logoScale == 0) {
                // A scale of 0 means "natural size"
                return await LooksUtils.naturalSizeScaleForLogo(media);
            } else {
                return this.logoScale;
            }
        } else {
            return await LooksUtils.calculateScaleForLogo(media, SizeMake(400, 400));
        }
    }

    /**
     * @param {Stage} stage
     * @returns {Media|null}
     */
    #createPattern(stage, variant = null) {
        let pattern = null;
        if (variant && Object.keys(variant).includes("pattern")) {
            pattern = variant.pattern;
        } else {
            pattern = this.pattern;
        }
        if (!pattern) {
            return null;
        }

        const patternMedia = LooksUtils.createImageMediaFromURL(pattern.assetUrl, LooksMediaType.Pattern);
        patternMedia.anchor = Stage.Object.Anchor.None;
        patternMedia.scale = 1.0;
        patternMedia.center = LooksUtils.stageCenterPoint(stage);
        patternMedia.opacity = pattern.toMediaOpacity(pattern.defaultOpacity);

        const color = this.getColorizationColor(variant);
        if (color && pattern.isColorizable) {
            LooksUtils.updateColorScheme(color, patternMedia, this.#colorizationCallback);
        }

        return patternMedia;
    }

    #createOverlay(stage, variant = null) {
        let overlay = null;
        if (variant && Object.keys(variant).includes("overlay")) {
            overlay = variant.overlay;
        } else {
            overlay = this.overlay;
        }
        if (!overlay) {
            return null;
        }

        const overlayMedia = LooksUtils.createImageMediaFromURL(overlay.assetUrl, LooksMediaType.Overlay);
        overlayMedia.anchor = Stage.Object.Anchor.None;
        overlayMedia.scale = 1.0;
        overlayMedia.center = LooksUtils.stageCenterPoint(stage);

        const opacity = variant?.overlayOpacity ?? overlay.defaultOpacity ?? 1.0;
        overlayMedia.opacity = opacity;

        const color = this.getColorizationColor(variant);
        if (color && overlay.isColorizable) {
            LooksUtils.updateColorScheme(color, overlayMedia, this.#colorizationCallback);
        }

        return overlayMedia;
    }

    getColorizationColor(variant = null) {
        // Does this preset use explicit color schemes?
        if (this.hasLimitedColorOptions()) {
            return variant?.color || this.color;
        }

        // Nope, fall back to keying colorization off of tint
        return variant?.tint || this.tint;
    }

}
