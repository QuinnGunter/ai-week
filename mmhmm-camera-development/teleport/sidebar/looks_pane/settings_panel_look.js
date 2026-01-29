//
//  sidebar/looks_pane/settings_panel_look.js
//  mmhmm
//
//  Created by Seth Hitchings on 6/18/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LookSettings {

    #cls = {
        container: "looks-settings",
        hasBackground: "has-background",
    };

    #dataAttr = {
        presetTitle: "presetTitle",
        layerPreset: "preset",
        layerBackgroundStyle: "backgroundStyle",
        layerShape: "shape",
        layerLogo: "logo",
        layerTint: "tint",
        layerPattern: "pattern",
        layerOverlay: "overlay",
        layerWallpaper: "wallpaper",
        layerTitle: "layerTitle",
    };

    #actions = {
        returnToPresetsList: "return-to-presets-list",

        setPresenterBackgroundStyle: "set-presenter-background-style",
        setPresenterShape: "set-presenter-shape",
        editPresenterTint: "edit-presenter-tint",

        updateLogoLayerContents: "update-logo-layer-contents",
        updatePatternLayerContents: "update-pattern-layer-contents",
        updateOverlayLayerContents: "update-overlay-layer-contents",
        updateWallpaperLayerContents: "update-wallpaper-layer-contents",
    };

    #layerNames = {
        backgroundStyle: LocalizedString("Background"),
        shape: LocalizedString("Shape"),
        logo: LocalizedString("Logo"),
        tint: LocalizedString("Tint"),
        overlay: LocalizedString("Frame"),
        pattern: LocalizedString("Pattern"),
        wallpaper: LocalizedString("Wallpaper"),
    }

    #stage;
    #look;
    #container;
    #enablePresets = false;

    #updateWallpaperPromise = null;

    /**
     * @param {Stage} stage
     */
    constructor(stage) {
        this.#stage = stage;
        this.#addObservers();
        this.#container = this.#createContainer();
        this.#render();
        this.updatePresenterSettings();
    }

    set enablePresets(value) {
        if (value == this.#enablePresets) {
            return;
        }
        this.#enablePresets = value;
        this.#render();
    }

    destroy() {
        if (this.#stage) {
            const stage = this.#stage;
            stage.removeObserverForProperty(this, "room");

            const presenter = stage.localPresenter;
            presenter.removeObserverForProperty(this, "backgroundStyle");
            presenter.removeObserverForProperty(this, "shape");
            presenter.removeObserverForProperty(this, "scale");
            presenter.removeObserverForProperty(this, "cropInsets");
            presenter.removeObserverForProperty(this, "backgroundPaint");

            this.#stage = null;
        }
    }

    #addObservers() {
        // We haven't used observers in looks UI panes - refresh logic is driven by the LooksPane
        // However, I don't know how to get the lifecycle correct on presenter changes right now.
        // When we get a "slideChanged" notification, the presenter hasn't been updated yet,
        // so for now let's do it the old way.

        const stage = this.#stage;
        stage.addObserverForProperty(this, "room");

        const presenter = stage.localPresenter;
        presenter.addObserverForProperty(this, "backgroundStyle");
        presenter.addObserverForProperty(this, "shape");
        presenter.addObserverForProperty(this, "scale");
        presenter.addObserverForProperty(this, "cropInsets");
        presenter.addObserverForProperty(this, "backgroundPaint");
    }

    /*
     * UI & rendering
     */

    #createContainer() {
        const container = document.createElement("div");
        container.classList.add(this.#cls.container);
        return container;
    }

    get el() {
        return this.#container;
    }

    getAllLayerRows() {
        return this.#container.querySelectorAll("[data-layer]");
    }

    getLayerRow(layerId) {
        return this.#container.querySelector(`[data-layer="${layerId}"]`);
    }

    #render() {
        this.#container.innerHTML = `
            <div class="flex flex-col">
                ${this.#renderLayers()}
            </div>
        `;
    }

    #renderBackgroundSelector() {

        // Use shorter words in demo mode; the UI is more space constrained
        const visibleTitle = App.isDemo ? LocalizedString("On") : LocalizedString("Visible");
        const blurredTitle = LocalizedString("Blurred");
        const hiddenTitle = App.isDemo ? LocalizedString("Off") : LocalizedString("Hidden");

        const styles = [
            { "title": visibleTitle, value: Presenter.BackgroundStyle.Show },
            { "title": blurredTitle, value: Presenter.BackgroundStyle.Blur },
            { "title": hiddenTitle,  value: Presenter.BackgroundStyle.Hide },
        ];

        return `
                <div
                    data-layer="${this.#dataAttr.layerBackgroundStyle}"
                    class="flex flex-col py-4 px-5 gap-2 w-full border-bottom">

                    <strong class="text-content-primary body4">${this.#layerNames.backgroundStyle}</strong>

                    <div class="grid grid-cols-3 gap-1 p-1 bg-primary border-radius-1-5">
                        ${styles.map(style => `
                            <button
                                class="segmented-button px-5"
                                data-action="${this.#actions.setPresenterBackgroundStyle}"
                                data-value="${style.value}">
                                <span class="text-content-tertiary caption2">${style.title}</span>
                            </button>
                        `).join("")}
                    </div>

                </div>
        `;
    }

    #renderShapeSelector() {

        const shapes = [
            { "title": LocalizedString("None"),      value: "none",                    icon: AppIcons.CircleSlash(), },
            { "title": LocalizedString("Rectangle"), value: Presenter.Shape.Rectangle, icon: AppIcons.PresenterShapeRectangle(), },
            { "title": LocalizedString("Circle"),    value: Presenter.Shape.Circle,    icon: AppIcons.PresenterShapeCircle(), },
            { "title": LocalizedString("Hexagon"),   value: Presenter.Shape.Polygon,   icon: AppIcons.PresenterShapeHexagon(), },
        ];

        return `
                <div
                    data-layer="${this.#dataAttr.layerShape}"
                    class="flex flex-col py-4 px-5 gap-2 w-full border-bottom">

                    <strong class="text-content-primary body4">${this.#layerNames.shape}</strong>

                    <div class="grid grid-cols-4 gap-1 p-1 bg-primary border-radius-1-5">
                        ${shapes.map(shape => `
                            <button
                                class="segmented-button px-5"
                                data-action="${this.#actions.setPresenterShape}"
                                data-value="${shape.value}">
                                ${shape.icon.outerHTML}
                            </button>
                        `).join("")}
                    </div>

                </div>
        `;
    }

    #renderLayers() {
        return `
                <div class="flex flex-col items-center">
                    ${this.#renderPresetSelector()}
                    ${this.#renderBackgroundSelector()}
                    ${this.#renderShapeSelector()}
                    ${this.#renderLogoLayer()}
                    ${this.#renderPresenterTint()}
                    ${this.#renderOverlayLayer()}
                    ${this.#renderPatternLayer()}
                    ${this.#renderWallpaperLayer()}
                </div>
        `;
    }

    #renderPresetSelector() {
        if (!this.#enablePresets) {
            return "";
        }

        return `
            <div
                data-layer="${this.#dataAttr.layerPreset}"
                data-action="${this.#actions.returnToPresetsList}"
                class="look-layer flex justify-between items-center py-4 px-5 gap-2 w-full border-bottom text-content-primary ">

                <div class="flex gap-2 caption2 justify-start items-center">
                    ${AppIcons.CaretLeft().outerHTML}
                    <strong class="body4">${LocalizedString("All Looks")}</strong>
                </div>

                <div data-id="${this.#dataAttr.presetTitle}" class="caption1"></div>
            </div>
        `;
    }

    #renderLogoLayer() {
        return this.#renderLayerRow(
            this.#layerNames.logo,
            this.#dataAttr.layerLogo,
            this.#actions.updateLogoLayerContents
        );
    }


    #renderPresenterTint() {
        return this.#renderLayerRow(
            this.#layerNames.tint,
            this.#dataAttr.layerTint,
            this.#actions.editPresenterTint
        );
    }

    #renderOverlayLayer() {
        return this.#renderLayerRow(
            this.#layerNames.overlay,
            this.#dataAttr.layerOverlay,
            this.#actions.updateOverlayLayerContents
        );
    }

    #renderPatternLayer() {
        return this.#renderLayerRow(
            this.#layerNames.pattern,
            this.#dataAttr.layerPattern,
            this.#actions.updatePatternLayerContents
        );
    }

    #renderWallpaperLayer() {
        return this.#renderLayerRow(
            this.#layerNames.wallpaper,
            this.#dataAttr.layerWallpaper,
            this.#actions.updateWallpaperLayerContents
        );
    }

    #renderLayerRow(title, layerId, contentsAction) {
        return `
                    <div data-layer="${layerId}" data-action="${contentsAction}"
                        class="look-layer flex flex-row justify-between items-center py-4 px-5 gap-8 w-full border-bottom">
                        <strong class="text-content-primary body4" data-id="${this.#dataAttr.layerTitle}">${title}</strong>
                        ${this.#renderLayerContentsButton()}
                    </div>
        `;
    }

    #renderLayerContentsButton() {
        return `
                    <button
                        class="icon-button landscape no-hover caption2 text-content-tertiary">
                        ${LocalizedString("Add")}
                    </button>`;
    }

    /*
     * Selection
     */

    clearSelection() {
        this.#selectLayerRow(null);
    }

    setEditingLogo() {
        this.#selectLayerRowByLayerId(this.#dataAttr.layerLogo);
    }

    setEditingTint() {
        this.#selectLayerRowByLayerId(this.#dataAttr.layerTint);
    }

    setEditingPattern() {
        this.#selectLayerRowByLayerId(this.#dataAttr.layerPattern);
    }

    setEditingOverlay() {
        this.#selectLayerRowByLayerId(this.#dataAttr.layerOverlay);
    }

    setEditingWallpaper() {
        this.#selectLayerRowByLayerId(this.#dataAttr.layerWallpaper);
    }

    #selectLayerRowByLayerId(layerId) {
        this.#selectLayerRow(this.getLayerRow(layerId));
    }

    #selectLayerRow(element) {
        const rows = this.#container.querySelectorAll(".look-layer");
        rows.forEach(row => {
            if (row === element) {
                row.setAttribute("aria-selected", "true");
            } else {
                row.removeAttribute("aria-selected");
            }
        });
    }

    /*
     * Actions & events
     */

    slideChanged(slide) {
        this.#look = slide;
        if (slide) {
            this.updateLayerContents(slide);
        }
        this.#updateEnabledLayers(slide);
        this.#updateLayerTitles(slide);
    }

    #updateEnabledLayers(slide) {
        this.#updateLayerEnabled(this.#dataAttr.layerPreset, this.#enablePresets && slide.hasPreset());
        this.#updateLayerEnabled(this.#dataAttr.layerBackgroundStyle, slide.isBackgroundStyleEditable());
        this.#updateLayerEnabled(this.#dataAttr.layerShape, slide.isShapeEditable());
        this.#updateLayerEnabled(this.#dataAttr.layerLogo, slide.isLogoEditable());

        const enableColor = slide.isTintEditable() || slide.isColorEditable();
        this.#updateLayerEnabled(this.#dataAttr.layerTint, enableColor);

        this.#updateLayerEnabled(this.#dataAttr.layerOverlay, slide.isOverlayEditable());
        this.#updateLayerEnabled(this.#dataAttr.layerPattern, slide.isPatternEditable());
        this.#updateLayerEnabled(this.#dataAttr.layerWallpaper, slide.isWallpaperEditable());
    }

    #updateLayerEnabled(layerId, enabled) {
        const layer = this.getLayerRow(layerId);
        layer?.classList.toggle("hidden", !enabled);
    }

    #updateLayerTitles(slide) {
        this.#updateLayerTitle(this.#dataAttr.layerLogo, slide.getCustomLogoLayerTitle() ?? this.#layerNames.logo);
        this.#updateLayerTitle(this.#dataAttr.layerTint, slide.getCustomTintLayerTitle() ?? this.#layerNames.tint);
        this.#updateLayerTitle(this.#dataAttr.layerOverlay, slide.getCustomOverlayLayerTitle() ?? this.#layerNames.overlay);
        this.#updateLayerTitle(this.#dataAttr.layerPattern, slide.getCustomPatternLayerTitle() ?? this.#layerNames.pattern);
        this.#updateLayerTitle(this.#dataAttr.layerWallpaper, slide.getCustomWallpaperLayerTitle() ?? this.#layerNames.wallpaper);
    }

    #updateLayerTitle(layerId, title) {
        const layerRow = this.getLayerRow(layerId);
        const titleElement = layerRow?.querySelector(`[data-id="${this.#dataAttr.layerTitle}"]`);
        titleElement.innerText = title;
    }

    updatePresenterSettings() {
        const presenter = this.#stage.localPresenter;
        this.#updatePresenterBackgroundStyle(presenter.backgroundStyle);
        this.#updatePresenterShape(presenter);
        this.#updatePresenterTint(presenter.backgroundPaint);
    }

    #updatePresenterBackgroundStyle(style) {
        this.#updateSelectedButtonInToggleGroup(this.#actions.setPresenterBackgroundStyle, style);
    }

    #updatePresenterShape(presenter) {
        // We need to handle the "none" case specially, since it's not actually a Presenter.Shape value
        let shape = presenter.shape;
        if (LooksUtils.isShapeNone(presenter)) {
            shape = "none";
        }
        this.#updateSelectedButtonInToggleGroup(this.#actions.setPresenterShape, shape);
    }

    #updateColorScheme(slide) {
        // Historically the user picked from a preset's list of color scheme options
        // by selecting a tint. We then colorized other items based on the tint.
        // However, sometimes we want to expose color schemes but not actually
        // tint the presenter background.
        if (!slide.hasLimitedColorOptions()) {
            return;
        }
        const color = slide.getColorOption();
        const paint = color ? LooksColors.solidPaintForColor(color) : null;
        this.#updateColorLayer(paint);
    }

    #updatePresenterTint(paint) {
        const slide = this.#look;
        if (slide && slide.hasLimitedColorOptions()) {
            // The current look uses color schemes, not presenter tint
            return;
        }
        this.#updateColorLayer(paint);
    }

    #updateColorLayer(paint) {
        const layerRow = this.getLayerRow(this.#dataAttr.layerTint);
        const tintButton = layerRow.querySelector("button");
        if (paint) {
            tintButton.style.background = paint.toCSS(false);
            tintButton.replaceChildren();
        } else {
            tintButton.style.background = null;
            tintButton.innerText = LocalizedString("Add");
        }
    }

    async updateLayerContents(slide) {
        this.#updateColorScheme(slide);
        this.#updatePreset(slide);
        return Promise.all([
            this.#updateLayerPreview(slide, this.#dataAttr.layerLogo, LooksMediaType.Logo, true),
            this.#updateLayerPreview(slide, this.#dataAttr.layerOverlay, LooksMediaType.Overlay),
            this.#updateLayerPreview(slide, this.#dataAttr.layerPattern, LooksMediaType.Pattern),
        ]);
    }

    #updatePreset(slide) {
        const presetRow = this.getLayerRow(this.#dataAttr.layerPreset);
        const titleElement = presetRow?.querySelector(`[data-id="${this.#dataAttr.presetTitle}"]`);
        if (titleElement) {
            titleElement.innerText = slide.getPresetName() ?? "";
        }
    }

    async #updateLayerPreview(slide, layerId, type, padding = false) {
        const layerRow = this.getLayerRow(layerId);
        const layerButton = layerRow.querySelector("button");

        const media = await slide?.getLayerMedia(type);
        if (media) {
            layerButton.classList.add(this.#cls.hasBackground);
            let thumbnailUrl = null;
            if (type == LooksMediaType.Pattern) {
                thumbnailUrl = slide.getThumbnailUrlForPattern(media);
            } else if (type == LooksMediaType.Overlay) {
                thumbnailUrl = LooksUtils.thumbnailUrlForOverlay(media);
            }
            if (thumbnailUrl) {
                this.#replaceButtonImageWithImage(layerButton, thumbnailUrl);
            } else {
                await this.#replaceButtonImageWithThumbnail(layerButton, media.thumbnailAsElement(), padding);
            }
        } else {
            layerButton.innerText = LocalizedString("Add")
            layerButton.classList.remove("image-button", "p-0");
            layerButton.classList.remove(this.#cls.hasBackground);
        }
    }

    #replaceButtonImageWithImage(button, url) {
        const img = document.createElement("img");
        img.draggable = false;
        img.style.objectFit = "cover";
        img.src = url;

        button.classList.add("image-button", "p-0")
        button.replaceChildren(img);
    }

    async #replaceButtonImageWithThumbnail(button, thumbnailPromise, padding = false) {
        // Swap in a placeholder, then replace that with the real thumbnail once it's loaded
        const img = document.createElement("img");
        img.draggable = false;
        img.src = ThumbnailStorage.AssetMissing;
        button.replaceChildren(img);
        button.classList.add("image-button");

        if (padding) {
            button.classList.add("p-2");
            button.classList.remove("p-0");
        } else  {
            button.classList.remove("p-2");
            button.classList.add("p-0");
        }

        if (thumbnailPromise) {
            try {
                const thumbnail = await thumbnailPromise;
                if (!thumbnailPromise.cancelled) {
                    thumbnail.draggable = false;
                    thumbnail.classList.add("fit-container");
                    button.replaceChildren(thumbnail);
                }
            } catch (err) {
                console.error("Failed to load thumbnail", err);
            }
        }
    }

    async #updateWallpaperLayerActions(room) {
        if (this.#updateWallpaperPromise) {
            this.#updateWallpaperPromise.cancelled = true;
            this.#updateWallpaperPromise = null;
        }

        const layerRow = this.getLayerRow(this.#dataAttr.layerWallpaper);
        const button = layerRow.querySelector("button");
        const promise = room?.thumbnail();
        if (promise) {
            this.#updateWallpaperPromise = promise;
            promise.then(thumbnail => {
                this.#updateWallpaperPromise = null;
                if (!promise.cancelled) {
                    thumbnail.style.objectFit = "cover";
                }
            });
        }
        this.#replaceButtonImageWithThumbnail(button, promise);
    }

    /**
     * Update which button is selected in a toggle group.
     * @param {String} action The action that the buttons are associated with.
     * @param {String} value The value that should be selected.
     */
    #updateSelectedButtonInToggleGroup(action, value) {
        const buttons = this.#container.querySelectorAll(
            `[data-action="${action}"]`
        );
        buttons.forEach(button => {
            if (button.dataset.value === value) {
                button.setAttribute("aria-selected", "true");
            } else {
                button.removeAttribute("aria-selected");
            }
        });
    }

    /* KVO */

    observePropertyChanged(obj, key, val) {
        if (IsKindOf(obj, LocalPresenter)) {
            const presenter = obj;
            if (key === "backgroundStyle") {
                this.#updatePresenterBackgroundStyle(presenter.backgroundStyle);
            } else if (key === "shape") {
                this.#updatePresenterShape(presenter);
            } else if (key === "scale") {
                this.#updatePresenterShape(presenter);
            } else if (key === "cropInsets") {
                this.#updatePresenterShape(presenter);
            } else if (key === "backgroundPaint") {
                this.#updatePresenterTint(presenter.backgroundPaint);
            }
        } else if (key === "room") {
            this.#updateWallpaperLayerActions(val);
        }
    }
}

