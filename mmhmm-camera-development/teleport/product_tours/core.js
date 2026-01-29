//
//  core.js
//  mmhmm
//
//  Created by Justin Juno on 02/13/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

class ProductTour {
    constructor(icon, title, description) {
        this.icon = icon;
        this.title = title;
        this.description = description;

        this.showToursSheetOnCompletion = false;

        let inProductTour = false;
        this.inProductTour = inProductTour;

        let activeCoachmark = 0;
        this.activeCoachmark = activeCoachmark;

        let coachmarks = [];
        this.coachmarks = coachmarks;

        this.container = null;

        let wrapper = document.body;
        this.wrapper = wrapper;
    }

    showToursMenuOnCompletion() {
        return true;
    }

    isAuthenticated() {
        var endpoint = mmhmmAPI.defaultEndpoint();
        return endpoint.isAuthenticated;
    }

    startProductTour(tourCompletedCallback) {
        // Create and append the tour container to hold coachmarks.
        let tourContainer = document.createElement("div");
        tourContainer.className = "coachmarks-tour-container";
        this.container = tourContainer;
        this.wrapper.appendChild(tourContainer);

        // Update the product tour state and show the first coachmark.
        this.inProductTour = true;
        this.activeCoachmark = 0;
        this.tourCompletedCallback = tourCompletedCallback;
        this.revealCoachmarkAtIndex(this.activeCoachmark);

        // Add event listener to reposition coachmarks when window is resized.
        this.addResizeListener();
    }

    endProductTour() {
        this.stopPreviousValidityTests();

        // Remove the tour container and children.
        let tourContainer = this.container;
        if (tourContainer != null) {
            tourContainer.remove();
            tourContainer = null;
        }

        // Return the product tour to its default state.
        this.inProductTour = false;
        this.activeCoachmark = 0;
        this.coachmarks = [];
        this.tourCompletedCallback = null;

        // Clean up and remove event listeners.
        this.removeResizeListener();
    }

    addCoachmarksToProductTour(coachmarks) {
        if (coachmarks.length === 0) {
            throw new Error("No coachmarks have been provided to this product tour.");
        }
        this.coachmarks = coachmarks;
    }

    displayCoachmark(coachmark) {
        // Create coachmark element and render instructions, plus navigation buttons.
        let coachMarkIndexString = "";
        if (this.coachmarks.length > 1) {
            coachMarkIndexString = `${this.activeCoachmark + 1}/${this.coachmarks.length}`;
        }
        let addCloseButton = false;
        let lastCoachmark = this.activeCoachmark == this.coachmarks.length - 1;
        if (
            !coachmark.buttonsNotToRender?.includes("close") &&
            (coachmark.buttonsNotToRender?.includes("next") || this.coachmarks.length > 1 && !lastCoachmark)
        ) {
            addCloseButton = true;
        }
        let callbacks = {
            tour_completed_callback: _ => this.tourCompletedCallback(),
            coachmarks_have_previous_buttons: _ => this.coachmarksHavePreviousButtons(),
            decrement_active_coachmark: _ => this.decrementActiveCoachmark(),
            increment_active_coachmark: _ => this.incrementActiveCoachmark(),
        }
        let coachmarkManager = new TourPopover(this.container, coachmark, coachMarkIndexString, addCloseButton, lastCoachmark, callbacks);
        coachmarkManager.createCoachmark(this.activeCoachmark);
        coachmarkManager.renderCoachmark();
        this.updateZIndex();
        this.startValidityTestsForCoachmark(coachmark);
    }

    renderCoachmark(coachmark) {
        if (!coachmark) {
            throw new Error("A coachmark hasn't been provided to render.");
        }
        this.stopPreviousValidityTests();
        this.executeBeforeShow()
            .then(waitFunction(330))
            .then(async () => {
                if (this.skipCoachmark(coachmark)) {
                    this.coachmarkBecameInvalid(coachmark)
                } else {
                    this.displayCoachmark(coachmark);
                }
            })
            .catch(err => {
                console.error("Error revealing coachmark target", err);
                this.tourCompletedCallback(true);
            });
    }

    removeCoachmarkElements = () => {
        // Remove active coachmark from the tour container.
        let tourContainer = this.container;
        RemoveAllChildrenFrom(tourContainer);
    }

    reRevealCoachmarkAtIndex = debounce(() => {
        this.revealCoachmarkAtIndex(this.activeCoachmark, true)
    }, 500)

    revealCoachmarkAtIndex(index, isResizeEvent = false) {
        this.removeCoachmarkElements();

        // Ensure the index is valid
        index = clamp(index, 0, this.coachmarks.length - 1);

        this.activeCoachmark = index;
        let coachmark = this.coachmarks[index];
        this.renderCoachmark(coachmark);

        if (isResizeEvent == false) {
            Analytics.Log("tours.step.click", {
                tour_name: this.constructor.name,
                step: index,
            });
        }
    }

    updateZIndex() {
        // Make sure that we're on top of the stack
        var zIndex = GetWindowMaxZIndex(document.body);
        var current = this.container.style.zIndex;
        if (zIndex > current) {
            this.container.style.zIndex = zIndex + 100;
        }
    }

    incrementActiveCoachmark() {
        if (this.activeCoachmark == this.coachmarks.length - 1) {
            this.tourCompletedCallback();
        }
        else {
            this.revealCoachmarkAtIndex(this.activeCoachmark + 1);
        }
    }

    decrementActiveCoachmark() {
        this.revealCoachmarkAtIndex(this.activeCoachmark - 1);
    }

    async executeBeforeShow() {
        // Run beforeShow function if provided to bring target elements into dom.
        let coachmark = this.coachmarks[this.activeCoachmark];
        await coachmark.beforeShow?.();
    }

    addResizeListener() {
        if (!this.inProductTour) { return; }

        window.addEventListener("resize", this.removeCoachmarkElements);
        window.addEventListener("resize", this.reRevealCoachmarkAtIndex);
    }

    removeResizeListener() {
        window.removeEventListener("resize", this.removeCoachmarkElements);
        window.removeEventListener("resize", this.reRevealCoachmarkAtIndex);
    }

    //
    // Validity tests
    //
    stopPreviousValidityTests() {
        let coachmarkCleanup = this.coachmarkCleanup;
        if (coachmarkCleanup != null) {
            coachmarkCleanup.forEach((entry) => {
                let {
                    target,
                    property,
                    observer
                } = entry;
                if (target instanceof Function) {
                    target = target();
                }
                target.removeObserverForProperty(observer, property);
            });
        }
        this.coachmarkCleanup = null;
    }

    skipCoachmark (coachmark) {
        const { validity = [] } = coachmark;

        return !validity
            .filter((test) => test.skipWhenInvalid)
            .every(this.coachmarkValidityTest);
    }

    startValidityTestsForCoachmark(coachmark) {
        this.stopPreviousValidityTests();

        const coachmarkCleanup = [];
        const { validity = [] } = coachmark;

        validity.forEach((test) => {
            let { target, property, predicate, advanceToNext } = test;

            if (target instanceof Function) {
                target = target();
            }

            const observer = (obj, key, val) => {
                const current = obj[key];
                const offset = predicate(target, current, false);

                switch (offset) {
                    case false:
                        !advanceToNext && this.coachmarkBecameInvalid(coachmark);
                        advanceToNext && this.incrementActiveCoachmark();
                        break;
                    case 1:
                        advanceToNext && this.incrementActiveCoachmark();
                        break;
                    case -1:
                        advanceToNext && this.decrementActiveCoachmark();
                        break;
                    case true:
                    case 0:
                }
            };

            coachmarkCleanup.push({
                target: target,
                property: property,
                observer: observer,
            });

            target.addObserverForProperty(observer, property);
        });

        this.coachmarkCleanup = coachmarkCleanup;
    }

    coachmarkBecameInvalid(invalidCoachmark) {
        //console.log("A coachmark became invalid", invalidCoachmark);
        let all = this.coachmarks;
        let current = this.activeCoachmark;
        //console.log("current index is: ", current);
        if (all[current] != invalidCoachmark) {
            console.error("Non-current coachmark became invalid?", invalidCoachmark, current);
            return;
        }

        let testAndRevealCoachmarkAtIndex = (index) => {
            let coachmark = all[index];
            let coachmarkIsValid = this.isCoachmarkPresentlyValid(coachmark);
            //console.log("testing coachmark", index, coachmark, coachmarkIsValid);
            if (coachmarkIsValid == true) {
                //console.log("The coachmark is valid, so revealing it");
                this.revealCoachmarkAtIndex(index);
            }
            return coachmarkIsValid;
        };

        // Walk forwards through the coachmarks, in case they jumped some steps
        // (e.g. on step 1 of rooms where it points at the tab, they clicked on
        // a category and are now in step 3)
        for (let index = current + 1; index < all.length; index += 1) {
            if (testAndRevealCoachmarkAtIndex(index) == true) {
                return;
            }
        }

        // But maybe they went backwards, e.g. on step 3 of rooms, they clicked
        // the back button
        for (let index = current - 1; index >= 0; index -= 1) {
            if (testAndRevealCoachmarkAtIndex(index) == true) {
                return;
            }
        }

        // There's nothing they can do in the current state; advance to the next coachmark
        //console.log("No valid coachmarks, advancing to the next...");
        this.incrementActiveCoachmark();
    }

    isCoachmarkPresentlyValid({ validity = [] }) {
        return validity.every(this.coachmarkValidityTest);
    }

    coachmarkValidityTest ({ target, property, predicate }) {
        if (target instanceof Function) {
            target = target();
        }

        let value = target[property];
        return predicate(target, value, true);
    }

    coachmarksHavePreviousButtons() {
        return true;
    }
}
