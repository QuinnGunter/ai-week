//
//  Created by Seth Hitchings on 7/24/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class WallpaperLayerOptions extends LayerOptions {

    #cls = {

    }

    #dataAttr = {
        categorySelector: "wallpaper-category-selector",
        optionsContainer: "wallpaper-options-container",
    }

    #actions = {
        select: "select-look-wallpaper",
        upload: "upload-look-wallpaper",
        remove: "remove-look-wallpaper",
    }

    #look;
    #roomStore;
    #changeCallback;
    #uploadCallback;
    #currentSelectionId;

    constructor(look, currentWallpaper, roomStore, onChange, onUpload, onClose) {
        const container = document.createElement("div");
        super(container, onClose);

        this.#look = look;
        this.#roomStore = roomStore;
        this.#changeCallback = onChange;
        this.#uploadCallback = onUpload;
        this.#currentSelectionId = currentWallpaper.identifier;

        this.populateContainer(container);
        this.#addEventListeners(container);
        this.#setInitialSelection(currentWallpaper);
    }

    populateContainer(container) {
        const look = this.#look;
        let contents = [];

        if (look.hasLimitedWallpaperOptions()) {
            if (look.isWallpaperNoneEnabled()) {
                contents.push(this.renderNoneButton(this.#actions.remove));
            }
            contents.push(this.#renderOptionsContainer());
        } else {
            contents.push(this.#renderCategorySelector());
            if (look.isWallpaperNoneEnabled()) {
                contents.push(this.renderNoneButton(this.#actions.remove));
            }
            if (!App.isDemo && look.isCustomWallpaperEnabled()) {
                contents.push(this.renderUploadButton(this.#actions.upload));
            }
            contents.push(this.#renderOptionsContainer());
        }

        this.renderPaneAsListWithContents(container, ...contents);
    }

    #renderCategorySelector() {
        const customCategory = RoomsController.shared.customRooms;

        // Hide empty categories (except for custom)
        const categories = RoomsController.shared.categories.filter(c => {
            if (c.identifier == customCategory.identifier) {
                // No custom wallpapers in demo mode
                return !App.isDemo;
            }
            return !c.hidden && c.roomCount > 0;
        });

        // Sort the categories with custom at the top, then alphabetically
        categories.sort((a, b) => {
            if (a.identifier === customCategory.identifier) return -1;
            if (b.identifier === customCategory.identifier) return 1;
            return a.title.localeCompare(b.title);
        });

        if (!App.isDemo) {
            // Add a divider after the custom category
            categories.splice(1, 0, { divider: true });
        }

        return `
            <div class="">
                <select name="${this.#dataAttr.categorySelector}">
                    ${categories.map(category => {
                        if (category.divider) {
                            return `<hr/>`;
                        }
                        return `<option value="${category.identifier}">${category.title}</option>`;
                    }).join("")}
                </select>
            </div>
        `;
    }

    #renderCategory(categoryId, selectedRoomId) {
        const category = this.#roomStore.categoryWithIdentifier(categoryId);
        let rooms = category.rooms;

        const customCategory = this.#roomStore.customRooms;
        if (category.identifier === customCategory.identifier) {
            // Built-in and catalog rooms don't have a created date,
            // but custom rooms uploaded by the user do. We want to
            // sort by creation date descending.
            const withCreated = rooms.filter(room => room.model?.created);
            withCreated.sort((a, b) => b.model.created - a.model.created);

            const withoutCreated = rooms.filter(room => !room.model?.created);
            rooms = withCreated.concat(withoutCreated);
        }

        this.#renderRoomList(rooms, selectedRoomId);
    }

    #renderRoomList(rooms, selectedRoomId) {
        const container = this.container.querySelector(`[data-id="${this.#dataAttr.optionsContainer}"]`);

        // First render the list, without images
        container.innerHTML = rooms.map(room => this.#renderWallpaper(room)).join("");

        // Set the selection state
        this.selectItemById(selectedRoomId);

        // Now add in the thumbnails async
        this.#renderThumbnailImages(container, rooms);

        // And tooltips
        this.addTooltips(container);
    }

    #renderLimitedOptionsList(rooms, selectedRoomId) {
        // Map room IDs to rooms
        rooms = rooms.map(room => this.#roomStore.roomWithIdentifier(room)).filter(r => r != null);
        this.#renderRoomList(rooms, selectedRoomId);
    }

    #renderWallpaper(room) {
        return this.renderRowWithButton(
            room.title,
            this.#actions.select,
            room.identifier,
            `<img src="${ThumbnailStorage.AssetMissing}"></img>`,
            false,
            "p-0"
        );
    }

    #renderThumbnailImages(container, rooms) {
        rooms.forEach((room) => {
            room.thumbnail().then((thumbnail) => {
                const placeholder = container.querySelector(`[data-id="${room.identifier}"] img`);
                if (placeholder) {
                    thumbnail.draggable = false;
                    placeholder.replaceWith(thumbnail);
                }
            }).catch((err) => {
                console.error("Error loading thumbnail for room", room, err);
            });
        });
    }

    #renderOptionsContainer() {
        return `
            <div class="flex flex-col gap-4" data-id="${this.#dataAttr.optionsContainer}">
            </div>
        `;
    }

    #setInitialSelection(currentWallpaper) {
        const roomStore = this.#roomStore;
        const look = this.#look;

        // If the look has a fixed set of wallpaper options, only render those
        if (look.hasLimitedWallpaperOptions()) {
            const rooms = look.getWallpaperOptions().map(id => roomStore.roomWithIdentifier(id)).filter(r => r != null);
            this.#renderRoomList(rooms, currentWallpaper.identifier);
            return;
        }

        // A room can be in more than one category, so
        // find the first category in which the room appears...
        const category = roomStore.categories.find(c => c.containsRoom(currentWallpaper));
        this.#renderCategory(category.identifier, currentWallpaper.identifier);

        // Select this category in the selector
        this.#setCategorySelectorValue(category.identifier);
    }

    #setCategorySelectorValue(categoryId) {
        const categorySelector = this.container.querySelector(`select[name="${this.#dataAttr.categorySelector}"]`);
        if (categorySelector) {
            categorySelector.value = categoryId;
        }
    }

    #setSelectedWallpaper(id) {
        const container = this.container.querySelector(`[data-id="${this.#dataAttr.optionsContainer}"]`);

        const currentSelection = container.querySelector("[aria-selected='true']");
        if (currentSelection) {
            currentSelection.removeAttribute("aria-selected");
        }

        const selected = container.querySelector(`[data-id="${id}"]`);
        if (selected) {
            selected.setAttribute("aria-selected", "true");
        }
    }

    /* Event handling */

    #addEventListeners(container) {
        const categorySelector = container.querySelector(`select[name="${this.#dataAttr.categorySelector}"]`);
        categorySelector?.addEventListener("change", (evt) => this.#onCategoryChange(evt));
    }

    handleEvent(evt, button, action) {
        switch (action) {
            case this.#actions.select:
                this.#onSelect(evt, button);
                break;
            case this.#actions.upload:
                this.#onUpload(evt);
                break;
            case this.#actions.remove:
                this.#onRemove(evt);
                break;
            default:
                super.handleEvent(evt, button, action);
                break;
        }
    }

    #onSelect(evt, button) {
        evt.stopPropagation();
        const id = button.dataset.id;
        this.#currentSelectionId = id;
        this.#changeCallback(id);
        this.#setSelectedWallpaper(id);
        LooksAnalytics.onChangeLookLayer(this.#look.identifier, "look.wallpaper", id);
    }

    async #onUpload(evt) {
        if (App.isDemo) {
            return;
        }

        evt.stopPropagation();
        const newRoom = await this.#uploadCallback(evt);

        // Refresh the list to show the new room
        if (newRoom) {
            const custom = RoomsController.shared.customRooms;
            this.#setCategorySelectorValue(custom.identifier);
            this.#renderCategory(custom.identifier, newRoom.identifier);
            LooksAnalytics.onUploadLookLayer(this.#look.identifier, "look.wallpaper");
        }
    }

    #onRemove(evt) {
        evt.stopPropagation();
        this.#changeCallback(LookWallpapers.Black)
        LooksAnalytics.onRemoveLookLayer(this.#look.identifier, "look.wallpaper");
    }

    #onCategoryChange(evt) {
        evt.stopPropagation();
        const id = evt.target.value;
        this.#renderCategory(id, this.#currentSelectionId);
    }

}
