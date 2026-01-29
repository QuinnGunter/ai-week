//
//  media/sidebar.js
//  mmhmm
//
//  Created by Steve White on 3/6/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

Media.SidebarPane = class extends SidebarPane {
    constructor(media) {
        super(null, media.identifier);
        this.media = media;
        this.cleanupFunctions = [];
    }
    detachFrom(parentElement) {
        super.detachFrom(parentElement);

        const menus = [this.sizeMenu, this.replaceMenu];
        menus.forEach((menu) => {
            if (menu != null) {
                menu.dismiss();
            }
        });
        this.cleanupFunctions.forEach(func => func());
        this.cleanupFunctions = [];
    }
    _createSlider(slider) {
        const sliderContainer = document.createElement("div");
        sliderContainer.className = "sidebar-container"
        sliderContainer.id = `slider-${slider.key}`;

        const label = document.createElement("label");
        label.className = "label";
        label.innerText = slider.title;
        sliderContainer.appendChild(label);

        const wrapper = document.createElement("div");
        wrapper.className = "slider_wrapper";
        wrapper.style.setProperty("--slider-length", "100%");
        sliderContainer.appendChild(wrapper);

        const control = document.createElement("input");
        control.type = "range";
        control.min = slider.min;
        control.max = slider.max;
        control.id = slider.key;
        wrapper.appendChild(control);
        label.setAttribute("for", control.id);

        slider.container = sliderContainer;
        slider.control = control;
        this._updateSliderValue(slider);

        control.addEventListener("mousedown", evt => {
            this.media.controlWillStartTracking(control, slider.key);
        });

        control.addEventListener("mouseup", evt => {
            this.media.controlDidEndTracking(control, slider.key);
        });

        control.addEventListener("change", evt => {
            var analytics = slider.analytics;
            if (analytics != null) {
                Analytics.Log(analytics);
            }
        });

        control.addEventListener("input", evt => {
            let value = parseInt(control.value);
            if (slider.fractional == true) {
                value = value / slider.max;

            }
            const media = this.media;
            media[slider.key] = value;
            UpdateStyledSliderFillAmount(control);
        })

        return sliderContainer;
    }
    _updateSliderValue(slider, value) {
        if (value == null) {
            value = this.media[slider.key];
        }
        if (slider.fractional == true) {
            value *= slider.max;
        }

        const control = slider.control;
        control.value = value;
        UpdateStyledSliderFillAmount(control);
    }
    populateContents(container) {
        const fade = {
            title: LocalizedString("Fade"),
            key: "opacity",
            min: 0,
            max: 100,
            fractional: true,
            analytics: "render.camera.opacity"
        };
        const radius = {
            title: LocalizedString("Corner radius"),
            key: "cornerRadius",
            min: 0,
            max: 100,
            fractional: true,
            analytics: "render.camera.cornerRadius"
        };

        this.sliders = [ fade, radius ];

        this.sliders.forEach(slider => {
            const element = this._createSlider(slider);
            container.appendChild(element);

            const observer = (obj, key, val) => {
                this._updateSliderValue(slider, val);
            }
            this.media.addObserverForProperty(observer, slider.key)
            this.cleanupFunctions.push(() => {
                this.media.removeObserverForProperty(observer, slider.key)
            })
        });
    }
    populateLayout(container) {
        const ordering = document.createElement("div");
        ordering.classList.add("zorder");
        container.appendChild(ordering);

        gApp.registerKeyboardObserver(this);
        this.altKeyPressed = false;

        const options = [
            {
                icon: AppIcons.ZIndexRaise(),
                title: LocalizedString("Forward"),
                altTitle: LocalizedString("Front"),
                analyticsKey: "forward",
                altAnalyticsKey: "front",
                action: (stage, object, altFunc) => altFunc ? stage.bringObjectToFront(object) : stage.raiseObject(object),
                canPerform: (stage, object, altFunc) => altFunc ? stage.canBringObjectToFront(object) : stage.canRaiseObject(object),
                button: null,
            },
            {
                icon: AppIcons.ZIndexLower(),
                title: LocalizedString("Backward"),
                altTitle: LocalizedString("Back"),
                analyticsKey: "backward",
                altAnalyticsKey: "back",
                action: (stage, object, altFunc) => altFunc ? stage.sendObjectToBack(object) : stage.lowerObject(object),
                canPerform: (stage, object, altFunc) => altFunc ? stage.canSendObjectToBack(object) : stage.canLowerObject(object),
                button: null,
            },
        ];

        options.forEach(entry => {
            const button = document.createElement("button");
            button.classList.add("capsule", "secondary");
            button.addEventListener("click", (event) => {
                const media = this.media;
                const isAlt = !!this.altKeyPressed;
                entry.action(media.stage, media, isAlt);
                Analytics.Log("render.zindex.changed", {action: isAlt ? entry.altAnalyticsKey : entry.analyticsKey});
            });
            ordering.appendChild(button);
            entry.button = button;

            button.appendChild(entry.icon);

            button.title = entry.title;
        });

        this.layoutOptions = options;
    }

    populateSizePresets(container) {
        const layoutProperties = document.createElement("div");
        layoutProperties.classList.add("layout");
        container.appendChild(layoutProperties);

        this.populateSizeButton(layoutProperties);

        this.updateLayoutControls();

        // Update z-index enabled states when the stage changes
        const stage = this.media.stage;
        const observer = () => this.updateLayoutControls();
        stage.addObserverForKeyPath(observer, "foregroundLayer.sublayers");
        this.cleanupFunctions.push(() => {
            stage.removeObserverForKeyPath(observer, "foregroundLayer.sublayers");
            gApp.unregisterKeyboardObserver(this);
        });

        // Replace button
        this.populateReplaceButton(layoutProperties);

        // Remove button
        const remove = document.createElement("button");
        remove.classList.add("capsule","secondary","remove");
        remove.innerText = LocalizedString("Remove from slide");
        remove.addEventListener("click", (event) => {
            this.media.closeButtonWasClicked(event);
        });
        layoutProperties.appendChild(remove);
    }

    populateReplaceButton(container) {
        const replace = document.createElement("button");
        replace.classList.add("capsule","secondary","replace");
        replace.innerText = LocalizedString("Replace contents");
        replace.addEventListener("click", (event) => {
            this.displayReplaceMenu(replace, event);
            Analytics.Log("media.replace.click", {
                source: "sidebar",
                media_type: this.media.classTitle,
            });
        });
        container.appendChild(replace);
    }

    handleKeyboardEvent(event, isApplePlatform) {
        const altKeyPressed = (event.altKey == true && event.type == "keydown");
        if (altKeyPressed != this.altKeyPressed) {
            this.altKeyPressed = altKeyPressed;
            this.updateLayoutControls();
        }
        return false;
    }

    updateLayoutControls() {
        const options = this.layoutOptions;
        if (options == null) {
            return;
        }
        const media = this.media;
        const altKeyPressed = !!this.altKeyPressed;
        options.forEach(entry => {
            const canPerform = entry.canPerform(media.stage, media, altKeyPressed);

            const title = (altKeyPressed ? entry.altTitle : entry.title);

            const button = entry.button;
            button.title = title;
            button.disabled = !canPerform;
        });
    }

    populateSizeButton(container) {
        const media = this.media;

        if (media.croppable == true) {
            const uncrop = document.createElement("button");
            uncrop.classList.add("capsule", "secondary");
            uncrop.innerText = LocalizedString("Reset crop");

            uncrop.addEventListener("click", (event) => {
                this.media.resetCropInsets();
            });

            const updateDisabled = () => {
                uncrop.disabled = (InsetsEqual(media.cropInsets, InsetsZero()));
            };

            media.addObserverForProperty(updateDisabled, "cropInsets");
            this.cleanupFunctions.push(() => {
                media.removeObserverForProperty(updateDisabled, "cropInsets");
            })
            updateDisabled();

            container.appendChild(uncrop);
        }

        if (media.croppable == true || media.preserveAspectRatio == false) {
            this.populateResizeGrid(container);
        }
        else {
            const size = document.createElement("button");
            size.classList.add("capsule", "secondary");
            size.innerText = LocalizedString("Fullscreen");

            size.addEventListener("click", (event) => {
                this.media.toggleFullscreen();
            });
            container.appendChild(size);
        }
    }
    populateResizeGrid(container) {
        const grid = document.createElement("div");
        grid.classList.add("resize_grid");
        container.appendChild(grid);

        const media = this.media;
        const rebuildOptions = () => {
            RemoveAllChildrenFrom(grid);

            const options = media.sizeOptions();
            const previewScale = 15;
            options.forEach(option => {
                const button = document.createElement("button");
                button.addEventListener("click", (event) => {
                    media.undoManager?.beginUndoGrouping();
                    media.applySizeOption(option);
                    media.undoManager?.endUndoGrouping();
                });
                grid.appendChild(button);

                let preview = media.previewForSizeOption(option, previewScale);
                button.appendChild(preview);

                const label = document.createElement("div");
                label.classList.add("label");
                label.innerText = option.label;
                button.appendChild(label);
            });
        }
        rebuildOptions();

        // Some media can change their display (e.g. text, whiteboard,
        // presenter styles).  Listen for changes to those properties
        // so we can update the preview
        const propsForRefresh = media.propertiesAffectingSizeOptionPreview();
        let propTimeout = null;
        this.cleanupFunctions.push(() => {
            if (propTimeout != null) {
                window.clearTimeout(propTimeout);
                propTimeout = null;
            }
        })

        const propObserver = (obj, key, val) => {
            // Several properties may change at once.  We'll wait a 1/0th
            // of a second for things to settle.
            if (propTimeout != null) {
                window.clearTimeout(propTimeout);
            }
            let delay = 100;
            if (media.mouseHasMoved == true || media.handleIsTracking == true) {
                delay = 1000;
            }
            propTimeout = window.setTimeout(rebuildOptions, delay);
        };

        propsForRefresh.forEach(prop => {
            media.addObserverForProperty(propObserver, prop);
            this.cleanupFunctions.push(() => {
                media.removeObserverForProperty(propObserver, prop);
            })
        })

        const stage = media.stage;
        const stageProps = ["room"];
        stageProps.forEach(prop => {
            stage.addObserverForProperty(rebuildOptions, prop);
            this.cleanupFunctions.push(() => {
                stage.removeObserverForProperty(rebuildOptions, prop);
            })
        })

        if (IsKindOf(media, Media.Text) == false) {
            // For text media, `propsForRefresh` is sufficient
            // For other medias, listen for their thumbnail updated
            // notifications and rebuild the grid
            NotificationCenter.default.addObserver(
                Media.Notifications.ThumbnailUpdated,
                media,
                rebuildOptions,
            );
            NotificationCenter.default.addObserver(
                Room.Notifications.ThumbnailChanged,
                null,
                rebuildOptions,
            );

            this.cleanupFunctions.push(() => {
                NotificationCenter.default.removeObserver(
                    Media.Notifications.ThumbnailUpdated,
                    media,
                    rebuildOptions,
                );
                NotificationCenter.default.removeObserver(
                    Room.Notifications.ThumbnailChanged,
                    null,
                    rebuildOptions,
                );
            });
        }
    }
    populateContentEditor(container) {
        // Subclass hook, intentionally blank
   }
    populateHeader(container) {
        const header = document.createElement("div");
        header.classList.add("header");
        container.appendChild(header);

        const label = document.createElement("label");
        label.innerText = this.media.classTitle;
        header.appendChild(label);

        this.populateLayout(header);

        const close = document.createElement("button");
        close.appendChild(AppIcons.Close());
        close.addEventListener("click", (event) => {
            const media = this.media;
            if (media.stage?.selectedObject == media) {
                media.stage.selectedObject = null;
            }
        });
        header.appendChild(close);
    }
    populateContainer(container) {
        this.populateHeader(container);

        this.populateContentEditor(container);

        this.populateContents(container);
        this.populateSizePresets(container);
    }
    createNewPane() {
        const container = document.createElement("div");
        container.classList.add("media");
        this.populateContainer(container);
        return container;
    }
    //
    // Actions
    //
    displayReplaceMenu(sender, event) {
        let menu = this.replaceMenu;
        if (menu != null) {
            menu.dismiss();
            return;
        }

        // Create the menu
        menu = new ReplaceMenu(this.media);
        menu.addEventListener("dismiss", (event) => {
            this.replaceMenu = null;
        });
        this.replaceMenu = menu;

        // And display the menu
        menu.displayFrom(sender, null);
    }
}
