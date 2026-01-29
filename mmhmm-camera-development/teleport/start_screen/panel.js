//
//  start_screen/panel.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/6/2024.
//  Copyright 2024 mmhmm inc. All rights reserved.
//

/**
 * Abstract base class for panels of the StartSheet.
 */
class StartScreenPanel extends ObservableObject {

    constructor(delegate, className) {
        super();

        const panel = document.createElement("div");
        panel.classList.add("panel", "column", className);
        this.panel = panel;

        this.delegate = delegate;

        this.hidden = false;
    }

    destroy() {
        // Subclasses should override this method to clean up as needed
    }

    show() {
        this.panel.classList.remove("hidden");
        this.hidden = false;
    }

    hide() {
        this.panel.classList.add("hidden");
        this.hidden = true;
    }

    get title() {
        // Subclasses should override this method to return the title of the panel
        return null;
    }

    /**
     * Create a new action button element.
     *
     * @param {SVGSVGElement} icon The button's icon
     * @param {String} title The button's title
     * @param {String} description The description text that sits below the button
     * @param {Function} action The action to be executed when the button is clicked
     * @param {String} className The class name to be added to the container element
     * @returns {HTMLDivElement} The action button element
     */
    createActionButton(icon, title, description, action, className = null) {
        const container = document.createElement("div");
        container.classList.add("column", "action");
        if (className) {
            container.classList.add(className);
        }

        const button = document.createElement("button");
        button.classList.add("capsule", "secondary", "column", "action");
        button.addEventListener("click", _ => action());
        container.append(button);

        const iconWrapper = document.createElement("div");
        iconWrapper.classList.add("icon");
        iconWrapper.appendChild(icon);
        button.appendChild(iconWrapper);

        if (title) {
            button.appendChild(document.createTextNode(title));
        }

        const desc = document.createElement("div");
        desc.classList.add("description");
        desc.innerText = description;
        container.appendChild(desc);

        return container;
    }
}
