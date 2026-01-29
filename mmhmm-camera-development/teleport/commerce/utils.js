//
//  commerce/utils.js
//  mmhmm
//
//  Created by Seth Hitchings on 5/13/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class CommerceUtils {

    static controlGroup = "TGCTRL"; // Control group
    static messageGroup = "TGUPDT"; // Free trial messaging, but no paywalls
    static paywallGroup = "TGCSEQ"; // Free trial messaging with paywalls

    static get paywallsLaunchDate() {
        return new Date("2025-04-23T20:00:00Z");
    }

    static get trialStatusLaunchDate() {
        return new Date("2025-02-28T00:00:00Z");
    }

    static hasIndividualSubscription(user) {
        return user.hasSubscription;
    }

    static hasTeamsSubscription(user) {
        return user.business && !user.workgroup;
    }

    static hasPurchasedCamera(user) {
        return user.hasPurchasedCamera === true;
    }

    /**
     * Check whether a user has an active paid subscription.
     * @param {Object} user
     * @returns {boolean}
     */
    static hasSubscription(user) {
        // "hasSubscription" indicates that the user is paying directly, as an individual.
        // "business" will be true for users who are in a workgroup OR a team;
        // a user will never be in both a workgroup AND a team.
        // Workgroup users aren't paying and should see the banner.
        return CommerceUtils.hasIndividualSubscription(user) || CommerceUtils.hasTeamsSubscription(user);
    }

    /**
     * Check whether a user has a currently active new user free trial.
     * @param {Object} user
     * @returns {boolean}
     */
    static hasActiveNewUserTrial(user) {
        return user.freeTrial === true;
    }

    /**
     * Check whether a user's last payment attempt failed.
     * @param {Object} user
     * @returns {boolean}
     */
    static subscriptionRequiresAttention(user) {
        return user.subscriptionRequiresAttention === true || CommerceUtils.getTestFlag("payment_failed") != null;
    }

    static async openManagePaymentMethodLink(analyticsElement) {
        CommerceAnalytics.onManagePaymentMethodClicked(analyticsElement);

        const endpoint = mmhmmAPI.defaultEndpoint();
        let url = endpoint.getManageSubscriptionURL();
        if (App.isHybrid) {
            const linkWithHandoff = await CommerceUtils.getAuthenticatedLink(endpoint, "manageAccountUrl");
            if (linkWithHandoff) {
                url = linkWithHandoff;
            }
        }
        openLink(url);
    }

    static async openBuyNowLink(analyticsElement) {
        const endpoint = mmhmmAPI.defaultEndpoint();

        const hasNewUserTrial = CommerceUtils.hasActiveNewUserTrial(endpoint.me ?? {});
        CommerceAnalytics.onBuyNowButtonClicked(analyticsElement, hasNewUserTrial);

        let url = endpoint.getAccountUpgradeURL();
        if (App.isHybrid) {
            const linkWithHandoff = await CommerceUtils.getAuthenticatedLink(endpoint, "choosePlanUpgradeUrl");
            if (linkWithHandoff) {
                url = linkWithHandoff;
            }
        }
        openLink(url);
    }

    /**
     * Get a link with a handoff token so the user doesn't have to log in again.
     */
    static async getAuthenticatedLink(endpoint, linkName) {
        try {
            const links = await endpoint.getAuthenticatedLinks();
            if (links && links[linkName]) {
                return links[linkName];
            }
        } catch (err) {
            console.error("Error getting authenticated links", err);
        }
        return null;
    }

    static formatMonthlyPrice(annualPrice, displayPrice, currencySymbol) {
        let monthlyPrice = Math.round(annualPrice / 12);

        return CommerceUtils.formatPrice(monthlyPrice, displayPrice, currencySymbol);
    }

    static formatPrice(price, displayPrice, currencySymbol) {
        // The prices are always in the smallest denomination possible, e.g
        // cents. In some currencies we show a larger denomination, e.g.
        // dollars. In others, e.g. Yen, that's not a thing.
        if (displayPrice.indexOf(".") > -1) {
            const remainder = price % 100;
            if (remainder > 0) {
                price = (price / 100).toFixed(2);
            } else {
                price = Math.round(price / 100);
            }
        }

        return `${currencySymbol}${Intl.NumberFormat().format(price)}`;
    }

    /**
     * See if we should enable URL flags for testing.
     * Flags are enabled if the release track isn't production
     * or the backend environment is not production.
     */
    static #enableTestFlags() {
        return getReleaseTrack() !== ReleaseTrack.PRODUCTION ||
            mmhmmAPI.defaultEndpoint().environment != null;
    }

    static getTestFlag(name) {
        if (this.#enableTestFlags()) {
            return Flags.getConfig()[name];
        }
        return null;
    }

    static getNumericTestFlagValue(name, defaultValue) {
        const flag = this.getTestFlag(name);
        if (flag != null) {
            const value = parseInt(flag, 10);
            if (!isNaN(value)) {
                return value;
            }
        }
        return defaultValue;
    }
}
