//
//  commerce/daily_trial.js
//  mmhmm
//
//  Created by Seth Hitchings on 5/12/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Represents the state of the user's daily free trial.
 * Wraps up some logic for making use of the server-side
 * daily free trial state.
 */
class DailyFreeTrial {

    #state = null;

    /**
     * @param {Object} response the server response from mmhmmAPI.getDailyTrialState
     */
    constructor(response) {
        this.#state = this.#parseResponse(response);
    }

    /**
     * @param {Object} response the server response from mmhmmAPI.getDailyTrialState
     */
    #parseResponse(response) {
        const now = Date.now();

        let serverNow = new Date();
        if (response.now != null && response.now != "0001-01-01T00:00:00Z") {
            serverNow = new Date(response.now);
        }

        const skew = now - serverNow.getTime();

        return {
            started: this.#deskew(response.started, skew),
            expires: this.#deskew(response.expires, skew),
            nextStart: this.#deskew(response.next_start, skew),
        };
    }

    #deskew(date, skew) {
        const parsed = new Date(date);
        return new Date(parsed.getTime() + skew);
    }

    /**
     * @returns {Date} the timestamp when the user's daily free trial ends.
     */
    trialExpires() {
        const { expires } = this.#state;

        // If the user has never interacted with daily trials before,
        // the times will be empty/zero timestamps
        if (expires.getTime() == 0) {
            return new Date();
        }

        return expires;
    }

    /**
     * @returns {Date} the timestamp when the user can next start a daily free trial.
     */
    getCooldownEndTime() {
        const { nextStart } = this.#state;

        // If the user has never interacted with daily trials before,
        // the times will be empty/zero timestamps
        if (nextStart.getTime() == 0) {
            return new Date();
        }

        return nextStart;
    }

    /**
     * @returns {boolean} whether the user currently has an active daily free trial.
     */
    hasActiveDailyTrial() {
        const now = new Date();
        const expires = this.trialExpires();
        return now < expires;
    }

    /**
     * @returns {boolean} whether the user can start a new daily free trial.
     */
    canActivateDailyTrial() {
        const now = new Date();
        const nextStart = this.getCooldownEndTime();
        return now >= nextStart;
    }

}
