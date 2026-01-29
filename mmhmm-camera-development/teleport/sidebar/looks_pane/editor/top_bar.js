//
//  looks/editor/top_bar.js
//  mmhmm
//
//  Created by Seth Hitchings on 7/24/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LookEditorTopBar {

    #dataAttr = {
        catalog: "look-catalog",
        editor: "look-editor",
        title: "look-title",
        titleEditor: "look-title-editor"
    }

    #actions = {
        editTitle: "edit-look-title",
        contextMenu: "show-look-editor-context-menu",
        shareDemoLook: "share-demo-look",
        searchBrand: "search-brand",
        showDemoCameraMenu: "show-demo-camera-menu",
        editPreset: "edit-preset",
        editLook: "edit-look"
    }

    #container;
    #look;
    #disabled = false;

    constructor() {
        const container = document.createElement("div");
        this.#container = container;
        container.classList.add("w-full", "flex", "gap-4", "justify-between", "items-center", "text-content-secondary");

        this.#addEventListeners();
    }

    get container() {
        return this.#container;
    }

    setLook(look) {
        this.#look = look;
        this.populateContainer(look);
        this.addEventListeners = false;
    }

    selectedCameraChanged() {
        this.populateContainer(this.#look);
    }

    enterTitleEditor() {
        this.#onEnterTitleEditMode();
    }

    populateContainer(look) {
        if (App.isDemo) {
            this.#populateContainerDemo(look);
        } else {
            this.#populateContainerApp(look);
        }
        if (this.disabled) {
            this.#updateDisabledState();
        }
    }

    #populateContainerApp(look) {
        const title = look?.title ?? LocalizedString("New look");

        this.container.innerHTML = `
            <div
                data-id="${this.#dataAttr.catalog}"
                class="${look ? "" : "hidden"} w-full flex gap-4 justify-between items-center">
                ${this.#renderCustomizeButton()}
            </div>
            <div
                data-id="${this.#dataAttr.editor}"
                class="w-full flex gap-4 justify-between items-center">
                <div class="flex items-center justify-between gap-4 body4">
                    <div
                        data-id="${this.#dataAttr.title}"
                        data-action="${this.#actions.editTitle}"
                        class="text-ellipsis w-full">
                        ${title}
                    </div>
                    <div
                        data-id="${this.#dataAttr.titleEditor}"
                        class="w-full hidden">
                        <input
                            name="${this.#dataAttr.titleEditor}"
                            type="text"
                            autocomplete="off"
                            spellcheck="false"
                            value="${title}">
                        </input>
                    </div>
                    <button data-action="${this.#actions.contextMenu}" class="alt-icon-button">
                        ${AppIcons.Ellipsis().outerHTML}
                    </button>
                </div>

                ${this.#renderBrandButton(look)}
            </div>
        `;
    }

    #populateContainerDemo(look) {
        this.container.innerHTML = `
            <div class="flex items-center gap-4">
                ${this.#renderCustomizeButton()}
                ${this.#renderBrandButton(look)}
            </div>

            <div class="flex items-center gap-4">
                ${this.#renderCameraButton()}
                ${this.#renderShareButton()}
            </div>
        `;
    }

    #renderCameraButton() {
        const currentDevice = gApp.stage.localPresenter.videoDevice?.label ?? LocalizedString("Select camera");

        return `
            <button
                class="grid-cols-3-fit px-4 gap-4 caption2 justify-start items-center secondary-button"
                data-action="${this.#actions.showDemoCameraMenu}">

                ${AppIcons.Camera().outerHTML}

                <div class="w-full text-ellipsis">${currentDevice}</div>

                ${AppIcons.CaretDown().outerHTML}
            </button>
        `;
    }

    #renderShareButton() {
        return `
            <button
                class="grid-cols-2-fit px-4 gap-2 caption2 justify-start items-center secondary-button"
                data-action="${this.#actions.shareDemoLook}">

                ${AppIcons.ShareArrow().outerHTML}

                <div class="w-full text-ellipsis">${LocalizedString("Share")}</div>

            </button>
        `;
    }

    #renderBrandButton(look) {
        if (look && !look.isBrandEditable()) {
            return "";
        }

        const hasBrand = look?.hasBrandData();
        return `
            <button
                class="grid-cols-2-fit px-4 gap-2 caption2 justify-start items-center secondary-button"
                data-action="${this.#actions.searchBrand}">

                ${hasBrand ? this.renderBrandLogo(look) : AppIcons.Plus().outerHTML}

                <div class="w-full text-ellipsis">${hasBrand ? LocalizedString("Change brand") : LocalizedString("Add a brand")}</div>

            </button>
        `;
    }

    #renderCustomizeButton() {
        const action = App.isDemo ? this.#actions.editPreset : this.#actions.editLook;
        return `
            <button
                class="grid-cols-2-fit px-4 gap-2 caption2 justify-start items-center secondary-button"
                data-action="${action}">

                ${AppIcons.SettingsSliders().outerHTML}

                <div class="w-full text-ellipsis">${LocalizedString("Customize this look")}</div>

            </button>
        `;
    }

    renderBrandLogo(look) {
        const url = look.brandIconUrl;
        return `<img class="w-4 border-radius-0-5" src="${url ?? ThumbnailStorage.AssetMissing}" />`
    }

    set disabled(value) {
        this.#disabled = !!value;
        this.#updateDisabledState();
    }

    get disabled() {
        return this.#disabled;
    }

    #updateDisabledState() {
        const buttons = this.container.querySelectorAll("button");
        buttons.forEach(button => button.disabled = this.disabled);
    }

    getTitleLabel() {
        return this.container.querySelector(`[data-id="${this.#dataAttr.title}"]`);
    }

    getTitleEditor() {
        return this.container.querySelector(`[data-id="${this.#dataAttr.titleEditor}"]`);
    }

    /** Lifecyle management */

    destroy() {
    }

    display() {
        this.getParentElement().replaceChildren(this.#container);
    }

    dismiss() {
        this.getParentElement().replaceChildren();
        this.destroy();
    }

    getParentElement() {
        const stageContainer = document.getElementById("app").closest(".split_view");
        return stageContainer.querySelector("#camera_tools_top");
    }

    /** Event handling */

    #addEventListeners() {
        this.container.addEventListener("click", (evt) => this.#onClick(evt));
    }

    #onClick(evt) {
        const element = evt.target.closest("[data-action]");
        if (!element) {
            return;
        }

        if (element.dataset.action === this.#actions.editTitle) {
            evt.stopPropagation();
            this.#onEnterTitleEditMode();
        }
    }

    #onEnterTitleEditMode() {
        const title = this.getTitleLabel();
        title.classList.add("hidden");

        const titleEditor = this.getTitleEditor();
        titleEditor.classList.remove("hidden");

        const input = titleEditor.querySelector("input");
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);

        if (this.addedEventListeners === true) {
            return;
        }
        this.addedEventListeners = true;

        input.addEventListener("blur", () => {
            this.#onExitTitleEditMode();
        });

        input.addEventListener("keydown", (evt) => {
            if (evt.key === "Enter") {
                evt.stopPropagation();
                this.#onSaveTitleChanges();
            } else if (evt.key === "Escape") {
                evt.stopPropagation();
                this.#onDiscardTitleChanges();
            }
        });
    }

    #onExitTitleEditMode() {
        const title = this.getTitleLabel();
        const titleEditor = this.getTitleEditor();
        const input = titleEditor.querySelector("input");

        // Update the title label with the input value
        // The actual persistence of the title change will be handled by the LooksSidebarPane
        const newTitle = input.value.trim() || LocalizedString("New look");
        title.innerText = newTitle;

        titleEditor.classList.add("hidden");
        title.classList.remove("hidden");
    }

    #onDiscardTitleChanges() {
        // Get the original title from the label...
        const title = this.getTitleLabel();
        const titleEditor = this.getTitleEditor();
        const input = titleEditor.querySelector("input");
        input.value = title.innerText.trim();
        this.#onExitTitleEditMode();

        // Ensure that this is propagated to the LooksSidebarPane so we persist the change
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    #onSaveTitleChanges() {
        this.#onExitTitleEditMode();
    }
}
