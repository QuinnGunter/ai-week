//
//  widgets/full_screen_modal.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/1/2024
//  Copyright 2024 mmhmm inc. All rights reserved.
//

/**
 * An ActionSheet that takes up the full screen. It is comprised of a header and a body area.
 * The header contains a title and a close button. The body contains the contents which are
 * defined by the subclass.
 */

class FullScreenModal extends ActionSheet {

    /**
     * @param {String?} title The title of the modal, which will be displayed in the header.
     * @param {HTMLElement} contents The contents of the modal, which will be appended to the body area.
     * @param {String} className The class name to apply to the parent ActionSheet container.
     */
    constructor(title, contents, className, closable = true) {
        const container = document.createElement("div");
        container.classList.add("full_screen_modal_container");
        super(null, container, null, false, false, [0, 0], "full_screen_modal");
        this.sheet.classList.add(className);

        this.buildLayout(container, title, contents, closable);
    }

    buildLayout(container, title, contents, closable) {
        if (title != null || closable) {
            container.appendChild(this.buildHeader(title, closable));
        }

        const body = document.createElement("div");
        body.classList.add("body");
        body.appendChild(contents);

        container.appendChild(body);
    }

    buildHeader(title, closable) {
        const header = document.createElement("div");
        header.classList.add("header");
        this.header = header;

        const left = document.createElement("div");
        left.classList.add("left");
        header.appendChild(left);
        this.left = left;

        const center = document.createElement("div");
        center.classList.add("center");
        header.appendChild(center);

        const titleElement = document.createElement("div");
        titleElement.classList.add("title");
        if (title) {
            titleElement.innerText = title;
        }
        center.appendChild(titleElement);
        this.titleElement = titleElement;
        this.center = center;

        const right = document.createElement("div");
        right.classList.add("right");
        header.appendChild(right);

        if (closable) {
            const closeButton = document.createElement("button");
            closeButton.classList.add("capsule", "secondary", "close");
            closeButton.title = LocalizedString("Close");
            closeButton.appendChild(AppIcons.Close());
            closeButton.addEventListener("click", evt => this.closeButtonClicked());
            right.appendChild(closeButton);
        }

        return header;
    }

    get leftHeaderContainer() {
        return this.header?.querySelector(".left");
    }

    get centerHeaderContainer() {
        return this.header?.querySelector(".center");
    }

    get rightHeaderContainer() {
        return this.header?.querySelector(".right");
    }

    /** Override the core ActionSheet titlebar functionality. */
    get _titlebarTitleElement() {
        return this.titleElement;
    }

    /*
     * Event handlers
     */

    closeButtonClicked() {
        this.dismiss();
    }
}
