//
//  commerce/controller.js
//  mmhmm
//
//  Created by Seth Hitchings on 5/13/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Implements free trial and paywall logic for the application.
 *
 * Airtime users get a free trial of the application when they create
 * their account. After that, they can use Airtime Camera for free,
 * but must subscribe to continue using Airtime Creator. If they do not
 * subscribe, they can use Creator for one hour out of every 12 hours.
 *
 * As such, there are two concepts of "free trial":
 * - The new user free trial, currently 14 days long
 * - The daily free trial, currently one hour out of every 12 hours
 *
 * The authoritative state for both of these trials is managed on the service.
 */
class CommerceController {
    static ONE_MINUTE = 60 * 1000;
    static ONE_HOUR = 60 * 60 * 1000;

    // Objects we retrieve from the service
    #user = null;
    #dailyTrial = null;
    #commerceCatalog = null;

    // Dependencies that are injected via our constructor
    #stage = null;
    #localPresenter = null;
    #accountUI = null;

    // Internal state
    #paywallSheet = null;
    #dailyTrialTimeout = null;
    #gracePeriodInterval = null;
    #refreshing = false;

    constructor(stage, localPresenter, accountUI) {
        this.#stage = stage;
        this.#localPresenter = localPresenter;
        this.#accountUI = accountUI;

        gApp.registerKeyboardObserver(this);

        NotificationCenter.default.addObserver(
            mmhmmAPI.Notifications.AuthenticationChanged,
            null,
            debounce(() => this.onAuthenticationChanged(), 500)
        );

        NotificationCenter.default.addObserver(
            NotificationCenter.AT_MIDNIGHT,
            null,
            this.onMidnight,
            this,
        );

        NotificationCenter.default.addObserver(
            NotificationCenter.FOCUS_IN,
            null,
            throttle(() => this.onApplicationGainedFocus(), CommerceController.ONE_MINUTE),
            this,
        );
    }

    destroy() {
        gApp.unregisterKeyboardObserver(this);

        this.#user = null;
        this.#dailyTrial = null;
        this.#commerceCatalog = null;

        this.#stage = null;
        this.#localPresenter = null;

        this.#refreshing = false;
        this.#dismissPaywall();
        this.#clearDailyTrialTimeout();
        this.#clearGracePeriodInterval();
    }

    /**
     * Check whether paywalls should be enforced. The paywall sheet is modal
     * and will block the user from interacting with the user interface, but
     * other inputs such as keyboard shortcuts and the HybridBridge also
     * need to be blocked.
     *
     * @returns {boolean} true if use of the application should be blocked because of paywalls
     */
    isCurrentlyPaywalled() {
        return this.#paywallSheet != null;
    }

    /**
     * Intercept and block keyboard events if the user is paywalled.
     */
    handleKeyboardEvent() {
        return this.isCurrentlyPaywalled();
    }

    /* Notification handlers */

    onAuthenticationChanged() {
        this.#trace("Authentication changed");
        this.#refresh(true);
    }

    /**
     * Force refresh our state in case the user upgraded to a paid subscription.
     */
    async onApplicationGainedFocus() {
        this.#trace("Application gained focus");
        this.#refresh(true);
    }

    /**
     * Refresh our state at the end of each day. The service tells us if the
     * user has an active new user free trial, and that trial might
     * have expired at the end of the day.
     */
    async onMidnight() {
        this.#trace("It's midnight");
        this.#refresh();
    }

    /**
     * Called when the user's hour-long daily free trial ends.
     */
    #onDailyTrialEnded() {
        // Check to see if you're on a call, etc
        if (!this.#shouldEndDailyTrial()) {
            this.#trace("Entering daily trial grace period");
            this.#startGracePeriodInterval();
            return;
        }

        CommerceAnalytics.onEndDailyTrial();
        this.#trace("Daily trial ended");
        this.#refresh();
    }

    /**
     * If the user has the virtual camera connected or is editing a look,
     * we will be nice and not end their daily trial abruptly.
     * Instead, we will wait until they are done with whatever
     * they're doing.
     *
     * @returns {boolean} true if the daily trial should end
     */
    #shouldEndDailyTrial() {
        const app = gApp;
        return app.isPresenting == false && app.looksUI.isLookEditorOpen() == false;
    }

    /**
     * When the user is in the grace period at the end of their daily free
     * trial, check every 5 seconds to see if the we should continue to
     * extend the grace period. This is a bit crude, but simpler than
     * adding listeners for all the various things that can cause the user
     * to be eligible for the grace period.
     */
    #startGracePeriodInterval() {
        this.#gracePeriodInterval = window.setInterval(() => {
            if (this.#shouldEndDailyTrial()) {
                console.log("Grace period ended");
                this.#clearGracePeriodInterval();
                this.#onDailyTrialEnded();
            }
        }, 5000);
    }

    #clearGracePeriodInterval() {
        if (this.#gracePeriodInterval) {
            window.clearInterval(this.#gracePeriodInterval);
            this.#gracePeriodInterval = null;
        }
    }

    #isInGracePeriod() {
        return this.#gracePeriodInterval != null;
    }

    get endpoint() {
        return mmhmmAPI.defaultEndpoint();
    }

    get isAuthenticated() {
        return this.endpoint.isAuthenticated;
    }

    async #getUser(forceRefresh = false) {
        if (!this.isAuthenticated) {
            return null;
        }
        if (this.#user == null) {
            try {
                this.#user = await this.endpoint.getMe(forceRefresh);
            } catch (err) {
                console.error("Error loading user", err);
            }
        }
        return this.#user;
    }

    /**
     * Check whether paywalls should be applied to a user. Checks whether the
     * user was created after we launched paywalls, whether they're on an active
     * new user free trial, and whether they have a subscription.
     *
     * @param {Object} user
     * @returns {boolean} true if the user should be subject to the hour-per-day paywall.
     */
    #shouldEnforcePaywalls(user) {
        const created = new Date(user.created);
        if (!CommerceUtils.getTestFlag("ignore_user_created") && created < CommerceUtils.paywallsLaunchDate) {
            return false;
        }

        if (!CommerceUtils.getTestFlag("ignore_camera_purchase") && CommerceUtils.hasPurchasedCamera(user)) {
            return false;
        }

        if (!CommerceUtils.getTestFlag("ignore_subscription") && CommerceUtils.hasSubscription(user)) {
            this.#trace("User has a subscription");
            return false;
        }

        if (!CommerceUtils.getTestFlag("ignore_new_user_trial") && CommerceUtils.hasActiveNewUserTrial(user)) {
            this.#trace("User has an active new user trial");
            return false;
        }

        // if (!CommerceUtils.getTestFlag("ignore_paywall_group") && user.trial_group != CommerceUtils.paywallGroup) {
        //     this.#trace("User is not in the paywall group");
        //     return false;
        // }

        return true;
    }

    async #getDailyTrial() {
        if (!this.isAuthenticated) {
            return null;
        }
        if (this.#dailyTrial == null) {
            try {
                const response = await this.endpoint.getDailyTrialState();
                this.#dailyTrial = new DailyFreeTrial(response);
            } catch (err) {
                console.error("Error getting daily trial state", err);
            }
        }
        return this.#dailyTrial;
    }

    async #getCommerceCatalog() {
        if (!this.isAuthenticated) {
            return null;
        }
        if (this.#commerceCatalog == null) {
            try {
                this.#commerceCatalog = await this.endpoint.getCommerceCatalog();
            } catch (err) {
                console.error("Error getting commerce catalog", err);
            }
        }
        return this.#commerceCatalog;
    }

    async #getPrices() {
        const commerceCatalog = await this.#getCommerceCatalog();
        if (commerceCatalog == null) {
            // Fall back to USD prices...
            return {
                monthly: "$10",
                camera: "$20"
            };
        }

        const currency = commerceCatalog.currency.symbol;

        const annualPlan = commerceCatalog.annualPlan;
        const monthly = CommerceUtils.formatMonthlyPrice(annualPlan.price, annualPlan.displayPrice, currency);

        const cameraPlan = commerceCatalog.cameraProduct;
        const camera = CommerceUtils.formatPrice(cameraPlan.price, cameraPlan.displayPrice, currency);

        return { monthly, camera };
    }

    /**
     *
     */
    async #refresh(force = false) {
        if (this.#refreshing) {
            this.#trace("Already refreshing");
            return;
        }
        this.#refreshing = true;

        if (force) {
            this.#user = null;
            this.#dailyTrial = null;
        }

        try {
            const trialPromise = this.#getDailyTrial();
            let trial = null;

            let showPaywall = false;
            let clearDailyTrial = true;

            // Determine whether we should show the paywall
            const user = await this.#getUser(force);
            this.#updateAnalytics(user);
            if (!user) {
                this.#trace("User not authenticated");
            } else if (!this.#shouldEnforcePaywalls(user)) {
                this.#trace("Paywalls not enforced");
            } else {
                trial = await trialPromise;
                if (trial == null) {
                    // For now, we fail nicely...
                    this.#trace("Error getting daily trial state");
                } else if (trial.hasActiveDailyTrial()) {
                    this.#trace("User has an active daily trial");
                    clearDailyTrial = false;
                    this.#startDailyTrialTimeout(trial);
                } else if (this.#isInGracePeriod()) {
                    clearDailyTrial = false;
                    this.#trace("User is in the grace period");
                } else {
                    showPaywall = true;
                }
            }

            this.#refreshNotificationBanner();

            if (!showPaywall) {
                // We don't need to show paywalls. If the paywall is visible,
                // dismiss it.
                this.#dismissPaywall();
                if (clearDailyTrial) {
                    this.#clearDailyTrialTimeout();
                    this.#clearGracePeriodInterval();
                }
                return;
            }

            const { monthly, camera } = await this.#getPrices();
            this.#showPaywall(user, trial, monthly, camera);
        } finally {
            this.#refreshing = false;
        }
    }

    #updateAnalytics(user) {
        // Update a super property indicating whether the user is:
        // - anonymous, new user trial, free, paid camera, paid subscription, teams
        let value = "";

        if (!user) {
            value = "anonymous";
        } else if (CommerceUtils.hasTeamsSubscription(user)) {
            value = "business";
        } else if (CommerceUtils.hasIndividualSubscription(user)) {
            value = "subscription";
        } else if (CommerceUtils.hasPurchasedCamera(user)) {
            value = "one-time purchase";
        } else if (CommerceUtils.hasActiveNewUserTrial(user)) {
            value = "new user trial";
        } else {
            value = "free";
        }

        Analytics.AuxiliaryProps.commerce_status = value;
    }

    #showPaywall(user, trial, monthlyPrice, cameraPrice) {
        if (this.#paywallSheet != null) {
            this.#trace("Paywall already visible");
            return;
        }

        this.#trace("Showing paywall");

        // When you're paywalled, we just pass through the presenter video
        this.#setStageDefaults();

        const paymentFailed = CommerceUtils.subscriptionRequiresAttention(user);

        const paywall = new PaywallSheet(trial, monthlyPrice, cameraPrice, paymentFailed,
            () => this.#onBuyOrUpdateSubscription(paymentFailed),
            () => this.#onActivateDailyTrial(),
            () => this.#onSignOut()
        );

        paywall.addEventListener("dismiss", () => {
            this.#paywallSheet = null;
            CommerceAnalytics.onPaywallDismissed();
        });
        paywall.displayAsModal();
        this.#paywallSheet = paywall;

        CommerceAnalytics.onPaywallShown(trial.canActivateDailyTrial());
    }

    #dismissPaywall() {
        if (this.#paywallSheet) {
            this.#trace("Dismissing paywall");
            this.#paywallSheet.dismiss();
        }
    }

    #setStageDefaults() {
        this.#stage.slide = null;
        this.#localPresenter.resetPresenterSettings();
    }

    async #onBuyOrUpdateSubscription(paymentFailed) {
        if (paymentFailed) {
            CommerceUtils.openManagePaymentMethodLink("paywall");
        } else {
            CommerceUtils.openBuyNowLink("paywall");
        }
    }

    async #onActivateDailyTrial() {
        try {
            const endpoint = this.endpoint;
            const dev = endpoint.environment == "dev";

            // Override the default duration and cooldown in dev to make testing easier
            const duration = dev ? CommerceUtils.getNumericTestFlagValue("daily_trial_duration", 10) : null;
            const cooldown = dev ? CommerceUtils.getNumericTestFlagValue("daily_trial_cooldown", 20) : null;

            const response = await endpoint.activateDailyTrial(duration, cooldown);
            this.#dailyTrial = new DailyFreeTrial(response);

            this.#refreshNotificationBanner();
            this.#dismissPaywall();
            this.#startDailyTrialTimeout(this.#dailyTrial);

            CommerceAnalytics.onStartDailyTrial(60);
        } catch (err) {
            console.error("Error activating daily trial", err);
            ShowAlertView(
                LocalizedString("Error"),
                LocalizedString("There was an error activating your trial. Please try again.")
            );
        }
    }

    #startDailyTrialTimeout(trial) {
        this.#clearDailyTrialTimeout();

        const expires = trial.trialExpires();
        const delta = expires.getTime() - Date.now();
        this.#trace("Starting daily trial timeout", delta);
        this.#dailyTrialTimeout = window.setTimeout(() => this.#onDailyTrialEnded(), delta);
    }

    #clearDailyTrialTimeout() {
        if (this.#dailyTrialTimeout) {
            this.#trace("Clearing daily trial timeout");
            window.clearTimeout(this.#dailyTrialTimeout);
            this.#dailyTrialTimeout = null;
        }
    }

    async #refreshNotificationBanner() {
        if (!this.#isInGracePeriod()) {
            const user = await this.#getUser();
            const dailyTrial = await this.#getDailyTrial();
            NotificationBanner.shared.refresh(user, dailyTrial);
        }
    }

    #onSignOut() {
        this.#accountUI.signOut(this.endpoint);
    }

    #trace(message, ...args) {
        const isProdService = this.endpoint.environment == null;
        const isProdReleaseTrack = getReleaseTrack() == ReleaseTrack.PRODUCTION;
        if (!isProdService || !isProdReleaseTrack) {
            console.debug(message, ...args);
        }
    }

}
