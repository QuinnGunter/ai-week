//
//  button_bar.js
//  mmhmm
//
//  Created by Seth Hitchings on 5/22/2024.
//  Copyright 2024 mmhmm inc. All rights reserved.
//

/**
 * A 3-column horizontal bar that contains buttons. Used for the top and bottom bars of the UI.
 * Different components of the application add their buttons to the appropriate column.
 */
class ButtonBar {

    constructor(containerId) {
        this.containerId = containerId;

        const container = document.getElementById(containerId);
        container.classList.remove("hidden");
        this.container = container;

        this.leftContainer = container.querySelector(".left");
        this.centerContainer = container.querySelector(".center");
        this.rightContainer = container.querySelector(".right");
    }

    set hidden(val) {
        if (val) {
            this.container.classList.add("hidden");
        } else {
            this.container.classList.remove("hidden");
        }
    }

    get hidden() {
        return this.container.classList.contains("hidden");
    }

    /*
     * set*Buttons - replace all existing buttons with new ones
     */

    setLeftButtons(someButtons) {
        this._setButtonsInContainer(someButtons, this.leftContainer);
    }

    getLeftButtons() {
        return this._buttonsInContainer(this.leftContainer);
    }

    setCenterButtons(someButtons) {
        this._setButtonsInContainer(someButtons, this.centerContainer);
    }

    getCenterButtons() {
        return this._buttonsInContainer(this.centerContainer);
    }

    setRightButtons(someButtons) {
        this._setButtonsInContainer(someButtons, this.rightContainer);
    }

    getRightButtons() {
        return this._buttonsInContainer(this.rightContainer);
    }

    _setButtonsInContainer(someButtons, container) {
        RemoveAllChildrenFrom(container);
        if (someButtons?.length > 0) {
            this._unwrapButtons(someButtons).forEach(button => container.appendChild(button));
        }
    }

    _buttonsInContainer(container) {
        return Array.from(container.childNodes).filter((node) => node.nodeType == Node.ELEMENT_NODE);
    }

    /*
     * update*Buttons - replace some existing buttons with new ones
     */

    updateLeftButtons(previousButtons, newButtons) {
        this._updateButtonsInContainer(previousButtons, newButtons, this.leftContainer);
    }

    updateCenterButtons(previousButtons, newButtons) {
        this._updateButtonsInContainer(previousButtons, newButtons, this.centerContainer);
    }

    updateRightButtons(previousButtons, newButtons) {
        this._updateButtonsInContainer(previousButtons, newButtons, this.rightContainer);
    }

    _updateButtonsInContainer(previousButtons, newButtons, container) {
        if (previousButtons) {
            this._unwrapButtons(previousButtons).forEach(button => container.removeChild(button));
        }

        if (newButtons) {
            this._unwrapButtons(newButtons).forEach(button => {
                container.prepend(button);
            });
        }
    }

    /*
     * prepend*Buttons - add some buttons to the beginning of a set of existing buttons
     */

    prependToLeftButtons(someButtons) {
        this._prependButtonsInContainer(someButtons, this.leftContainer);
    }

    prependToCenterButtons(someButtons) {
        this._prependButtonsInContainer(someButtons, this.centerContainer);
    }

    prependToRightButtons(someButtons) {
        this._prependButtonsInContainer(someButtons, this.rightContainer);
    }

    _prependButtonsInContainer(someButtons, container) {
        this._unwrapButtons(someButtons).forEach(button => {
            if (!container.contains(button)) {
                container.prepend(button);
            }
        });
    }

    /*
     * Misc internal functions
     */

    /**
     * A buttons array may be actual DOM elements, or may be classes that manage those DOM
     * elements. Convert the arrary into an array of DOM elements.
     */
    _unwrapButtons(someButtons) {
        return someButtons.map(aButton => aButton.container || aButton);
    }

}
