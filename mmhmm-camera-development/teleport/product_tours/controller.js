//
//  tours_control.js
//  mmhmm
//
//  Created by Justin Juno on 02/07/2023.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

class ToursControl {
    constructor() {
        this.enabled = true;

        this.demoCallID = null;
        this.showedDemoOffer = false;
        this.clickedDemoOffer = false;

        NotificationCenter.default.addObserver(App.Notifications.HybridAppWindowHidden,
            null, this.hideContent, this);

        // Don't let the user be in a tour while in the airlock
        gApp.addObserverForProperty(this, "insideAirlock");
    }

    getTours() {
        return {
            buttonOptions: [
            ],
            listOptions: [
            ],
        }
    }

    observePropertyChanged(obj, key, val) {
        if (key == "insideAirlock") {
            this.handleAirlockStateChange(val);
        }
    }

    handleAirlockStateChange(insideAirlock) {
        if (insideAirlock) {
            this.hideContent();
        }
    }

    hideContent() {
        // End an active tour if there is one
        this.endTour(false);
    }

    showOnFirstLaunch() {
        return false;
    }

    startTourIfUnseen(tourClass) {
        if (!this.hasViewedTour(tourClass) ) {
            this.startTour(new tourClass());
            return true;
        }
        return false;
    }

    startTour(tour, reopenQuickTours = true) {
        if (this.activeTour != null) {
            console.error("Starting a tour while another is active!")
            this.endTour(false);
        }

        this.activeTour = tour;

        tour.startProductTour((fullyCompleted = true) => {
            this.endTour(fullyCompleted && reopenQuickTours);
        });

        this.trackTourView(tour);
        Analytics.Log("tours.start", {
            tour_name: tour.constructor.name
        });
    }

    async endTour() {
        let activeTour = this.activeTour;
        if (activeTour == null) {
            return;
        }

        activeTour.endProductTour();
        this.activeTour = null;
        Analytics.Log("tours.complete", {
            tour_name: activeTour.constructor.name
        });
    }

    trackTourView(tour) {
        let viewedTours = SharedUserDefaults.getValueForKey("viewedTours");
        if (viewedTours == null) {
            viewedTours = [];
        }
        let tourClassName = tour.constructor.name;
        if (!viewedTours.includes(tourClassName)) {
            viewedTours.push(tourClassName);
        }
        SharedUserDefaults.setValueForKey(DeepCopy(viewedTours), "viewedTours");
    }

    hasViewedTour(tour) {
        const name = typeof tour == 'object' ? tour.constructor.name : tour.name;
        const viewedTours = SharedUserDefaults.getValueForKey("viewedTours");
        return viewedTours && viewedTours.includes(name);
    }
}
