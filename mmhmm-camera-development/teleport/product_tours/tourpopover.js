//
//  tourpopover.js
//  mmhmm
//
//  Created by Amol Ghode on 3/4/25.
//  Copyright © 2025 mmhmm, inc. All rights reserved.
//
class TourPopover {
    constructor(floaterContainer, floaterInfo, sequenceString = "", addCloseButton = false, isLastCoachMark = false, callbacks = {}) {
        this.floaterContainer = floaterContainer;
        this.floaterInfo = floaterInfo;
        this.sequenceString = sequenceString;
        this.addCloseButton = addCloseButton;
        this.isLastCoachMark = isLastCoachMark;
        this.callbacks = callbacks;
        this.coachMarkDOM = null;
    }

    /**
     * Prepares instruction in the floater element. It could be tool tip text.
     * @returns dom for floater element instruction.
     */
    prepareFloaterText() {
        let floaterInfo = this.floaterInfo;
        let floaterElInstructions = document.createElement("p");
        let instructions = floaterInfo.instructions;
        let instructionsValue = null;
        if (instructions != null) {
            if (instructions.constructor == Function) {
                instructionsValue = instructions();
            }
            else {
                instructionsValue = instructions;
            }
        }

        if (instructionsValue == null) {
            console.error("No instruction/text provided", floaterInfo);
        }
        else if (instructionsValue.constructor == String) {
            floaterElInstructions.innerText = instructionsValue;
        }
        else if (instructionsValue.nodeType == Node.ELEMENT_NODE) {
            floaterElInstructions.appendChild(instructionsValue);
        }
        return floaterElInstructions;
    }

    /**
     * Creates a coachmark
     * @returns
     */
    createCoachmark(coachmarkIndex) {
        let coachmark = this.floaterInfo;
        let coachmarkEl = document.createElement("div");
        coachmarkEl.className = "coachmark";
        if ("coachmarkClass" in coachmark) {
            let c = coachmark.coachmarkClass;
            if (!Array.isArray(c)) {
                c = [c];
            }
            coachmarkEl.classList.add(...c);
        }

        let coachmarkElContent = document.createElement("div");
        coachmarkElContent.className = "coachmark-content";

        let coachmarkElInstructions = this.prepareFloaterText();

        coachmarkElContent.appendChild(coachmarkElInstructions);
        coachmarkEl.appendChild(coachmarkElContent);

        // Set up the "close" button
        if (this.addCloseButton) {
            let closeButton = document.createElement("button");
            closeButton.className = "coachmark-close-button";
            closeButton.title = LocalizedString("Close");
            let closeIcon = AppIcons.Close();
            closeButton.appendChild(closeIcon);
            closeButton.addEventListener("click", () => {
                if (this.callbacks.tour_completed_callback) {
                    this.callbacks.tour_completed_callback();
                }
            }, { once: true });
            coachmarkElContent.appendChild(closeButton);
        }

        let coachmarkElNav = document.createElement("div");
        coachmarkElNav.className = "coachmark-nav";
        coachmarkEl.appendChild(coachmarkElNav);

        // Add wrapper for "previous/ next" buttons
        let coachmarkButtons = document.createElement("div");
        coachmarkButtons.className = "coachmark-btns";
        coachmarkElNav.appendChild(coachmarkButtons);

        // Set up the "previous" button
        if (
            !coachmark.buttonsNotToRender?.includes("previous") &&
            this.callbacks.coachmarks_have_previous_buttons()
        ) {
            let previousButton = null;
            if ("getPreviousButton" in coachmark) {
                previousButton = coachmark.getPreviousButton();
            }
            else if (coachmarkIndex > 0) {
                previousButton = document.createElement("button");
                previousButton.className = "coachmark-prev-button";
                previousButton.innerText = LocalizedString("Previous");
                previousButton.addEventListener("click", () =>
                    this.callbacks?.decrement_active_coachmark()
                );
            }
            if (previousButton != null) {
                coachmarkButtons.appendChild(previousButton);
            }
        }

        // Add the coachmark count if there is more than one coachmark.
        if (this.sequenceString != "") {
            let coachmarkElCount = document.createElement("p");
            coachmarkElCount.className = "coachmark-content-count";
            coachmarkElCount.innerText = this.sequenceString;
            coachmarkButtons.appendChild(coachmarkElCount);
        }

        // Set up the "next" button
        if (!coachmark.buttonsNotToRender?.includes("next")) {
            let nextButton = null;
            if ("getNextButton" in coachmark) {
                nextButton = coachmark.getNextButton();
            }
            else {
                nextButton = document.createElement("button");
                nextButton.className = "coachmark-next-button";
                if (this.isLastCoachMark) {
                    nextButton.innerText = LocalizedString("Done");
                }
                else {
                    nextButton.innerText = LocalizedString("Next");
                }
                nextButton.addEventListener("click", () => {
                    this.callbacks.increment_active_coachmark()
                });
            }
            coachmarkButtons.appendChild(nextButton);
        }
        this.coachMarkDOM = coachmarkEl;
        return coachmarkEl;
    }

    /**
     * Renders a coach mark
     */
    renderCoachmark() {
        // Create arrow element if the position is not innertopleft
        let coachMarkContainer = this.floaterContainer;
        let coachedElement = this.floaterInfo.element();
        let position = this.floaterInfo.position;
        let coachMark = this.coachMarkDOM;
        let addArrow = true;
        let arrowElement = null;

        if (Object.keys(this.floaterInfo).includes("arrow")) {
            addArrow = this.floaterInfo.arrow;
        }
        let finalPosition = "top";
        if (typeof position == 'function') {
            finalPosition = position();
        } else if (position) {
            finalPosition = position;
        }
        if (!coachedElement) {
            /**
             * If the coached element is not found because it has been moved around
             * or recently it has been removed,display non arrow coachmark on stage.
             */
            coachedElement = gApp.stage.canvas;
            finalPosition = "top";
            addArrow = false;
        }
        if (addArrow) {
            arrowElement = document.createElement("div");
            arrowElement.className = "coachmarks-arrow";
            coachMarkContainer.appendChild(arrowElement);
        }
        Popover.setPopover(coachedElement, coachMarkContainer, arrowElement, finalPosition);
        coachMarkContainer.appendChild(coachMark);
    }
}
