//
//  reaction_overlay.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/7/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class ReactionOverlay {

    #onToggleLayout;
    #onClose;
    #onEdit;
    #container;

    constructor(onToggleLayout, onClose, onEdit) {
        this.#onToggleLayout = onToggleLayout;
        this.#onClose = onClose;
        this.#onEdit = onEdit;
        this.#container = document.createElement("div");
        this.#populateContainer();
        this.hide();
    }

    destroy() {
        this.#container.remove();
    }

    attachTo(parent) {
        if (this.#container.parentElement != parent) {
            parent.appendChild(this.#container);
        }
    }

    detach() {
        if (this.#container.parentElement) {
            this.#container.remove();
        }
    }

    show() {
        this.#container.classList.remove("hidden");
    }

    hide() {
        this.#container.classList.add("hidden");
    }

    setLayout(layout) {
        this.#onLayoutChanged(layout);
    }

    #populateContainer() {
        const container = this.#container;
        container.classList.add("reaction_overlay", "w-full", "h-full", "flex", "gap-4", "justify-center", "items-center");

        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("buttons", "flex", "gap-4");
        container.appendChild(buttonContainer);

        const toggleButton = document.createElement("button");
        toggleButton.classList.add("layout", LooksReactionLayout.OverTheShoulder);

        // Show both buttons; one will be hidden by CSS based on the current layout
        const collapse = AppIcons.Collapse();
        collapse.setAttributeNS(null, "class", "collapse");
        toggleButton.appendChild(collapse);

        const expand = AppIcons.Expand();
        expand.setAttributeNS(null, "class", "expand");
        toggleButton.appendChild(expand);

        toggleButton.addEventListener("click", () => this.#onToggleLayoutButtonClicked(toggleButton));
        buttonContainer.appendChild(toggleButton);

        const editButton = document.createElement("button");
        editButton.appendChild(AppIcons.SettingsSliders());
        editButton.addEventListener("click", () => this.#onEditButtonClicked(editButton));
        buttonContainer.appendChild(editButton);

        const closeButton = document.createElement("button");
        closeButton.appendChild(AppIcons.Close());
        closeButton.addEventListener("click", () => this.#onCloseButtonClicked(closeButton));
        buttonContainer.appendChild(closeButton);
    }

    #onToggleLayoutButtonClicked(button) {
        button.disabled = true;
        setTimeout(() => button.disabled = false, 500);
        this.#onToggleLayout();
    }

    #onCloseButtonClicked(button) {
        button.disabled = true;
        setTimeout(() => button.disabled = false, 500);
        this.#onClose();
    }

    #onEditButtonClicked(button) {
        button.disabled = true;
        setTimeout(() => button.disabled = false, 500);
        this.#onEdit();
    }

    #onLayoutChanged(layout) {
        const button = this.#container.querySelector("button.layout");
        if (layout === LooksReactionLayout.FullScreen) {
            button.classList.remove(LooksReactionLayout.OverTheShoulder);
            button.classList.add(LooksReactionLayout.FullScreen);
        } else {
            button.classList.remove(LooksReactionLayout.FullScreen);
            button.classList.add(LooksReactionLayout.OverTheShoulder);
        }
    }
}
