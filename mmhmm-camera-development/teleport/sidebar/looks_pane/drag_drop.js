//
//  sidebar/looks_pane/drag_drop.js
//  mmhmm
//
//  Created by Seth Hitchings on 3/5/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LooksDragDropHandler {

    #cls = {
        dropZone: "looks-drop-zone",
        dragging: `dragging`
    };

    #onDragOverBound = this.#onDragOver.bind(this);
    #onDragLeaveBound = this.#onDragLeave.bind(this);
    #onDropBound = this.#onDrop.bind(this);

    /**
     * @param {Element} target the element that can be dropped onto
     * @param {Function} callback the function to call when a drop occurs
     * @param {String} label the label to show in the drop zone when dragging over
     */
    constructor(target, callback, label) {
        this.target = target;
        this.callback = callback;
        this.label = label;
    }

    /**
     * Enable drag & drop support by adding event listeners to the target element.
     */
    enable() {
        this.#addDragAndDropHandlers();
    }

    /**
     * Disable drag & drop support by removing event listeners from the target element.
     */
    disable() {
        this.#removeDragAndDropHandlers();
    }

    #getDragDropTarget() {
        return this.target;
    }

    #addDragAndDropHandlers() {
        const target = this.#getDragDropTarget();
        target.addEventListener("dragover", this.#onDragOverBound);
        target.addEventListener("dragleave", this.#onDragLeaveBound);
        target.addEventListener("drop", this.#onDropBound);
        target.appendChild(this.#createDropZone());
    }

    #removeDragAndDropHandlers() {
        const target = this.#getDragDropTarget();
        target.removeEventListener("dragover", this.#onDragOverBound);
        target.removeEventListener("dragleave", this.#onDragLeaveBound);
        target.removeEventListener("drop", this.#onDropBound);
        target.querySelector(this.#cls.dropZone)?.remove();
    }

    #createDropZone() {
        const dropZone = document.createElement("div");
        dropZone.className = this.#cls.dropZone;

        const target = document.createElement("div");
        target.className = "looks-drop-target";
        target.appendChild(AppIcons.DragAndDropTarget());

        if (this.label) {
            const label = document.createElement("span");
            label.innerText = this.label;
            target.appendChild(label);
        }

        dropZone.appendChild(target);

        return dropZone;
    }

    #onDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        const target = this.#getDragDropTarget();
        target.classList.add(this.#cls.dragging);
    }

    #onDragLeave(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        const target = this.#getDragDropTarget();
        target.classList.remove(this.#cls.dragging);
    }

    #onDrop(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        const target = this.#getDragDropTarget();
        target.classList.remove(this.#cls.dragging);

        if (evt.dataTransfer && this.callback) {
            this.callback(evt.dataTransfer);
        }
    }
}
