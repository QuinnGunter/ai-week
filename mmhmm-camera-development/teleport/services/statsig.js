//
//  statsig.js
//  mmhmm
//
//  Created by Seth Hitchings on 8/9/2023.
//  Copyright 2023 mmhmm inc. All rights reserved.
//

// A wrapper around the Statsig experimentation service SDK
// See https://docs.statsig.com/client/jsClientSDK
class Statsig {
    static STASIG_OVERRIDE_KEY = "StatsigFeatureFlagOverrides";
    static clientSDKKey = "client-WBzxHK2w6Hk3KfPdhAM2hCNtQI50dsehDNhKjirpg11";
    static statsigClientURL = "https://cdn.jsdelivr.net/npm/statsig-js/build/statsig-prod-web-sdk.min.js";

    // TODO can we lazy load this so we don't load if not needed, e.g. outside demo mode?
    constructor() {
        this.initializedStatsig = false;
        this.statsigOverride = {};
        this.onInitializedPromise = promiseWrapper();
        this.statsigUser = null;

        this.statsigConfigOptions = {
            environment: { tier: this.getTier() },
            disableCurrentPageLogging: true,
            disableErrorLogging: true,
            disableAutoMetricsLogging: true,
        };

        // Normally we don't do anything with Statsig until there's a logged in user
        // However, in the demo app users don't log in, so skip that step
        const promises = [ this.#loadScript() ];
        const requireLogin = !App.isDemo;
        if (requireLogin) {
            promises.push(mmhmmAPI.defaultEndpoint().waitUntilFirstSignIn());
        }

        Promise.all(promises).then(_ => {
            this.#init();
        }).catch(err => {
            console.error("Failed to load Statsig library", err);
            this.onInitializedPromise.reject('Statsig: failed to initialize');
        });
    }

    getTier() {
        // If we're on a non-production backend, use development tier
        const endpoint = mmhmmAPI.defaultEndpoint();
        const environment = endpoint.environment;
        if (environment != null) {
            return ReleaseTrack.DEVELOPMENT;
        }

        // Map release tracks to Statsig environment tiers
        // Statsig has production, staging and development
        const releaseTrack = getReleaseTrack();
        if (releaseTrack == ReleaseTrack.PRODUCTION) {
            return ReleaseTrack.PRODUCTION;
        } else if (releaseTrack == ReleaseTrack.ALPHA) {
            return ReleaseTrack.PRODUCTION;
        } else {
            return ReleaseTrack.DEVELOPMENT;
        }
    }

    /**
     * Initializes overrides configured by TV's Application Settings.
     * Note: Currently used statsig client library is an old one. This does not support `OverrideAdapter` interface
     * present in the new library. So overrides have to be managed by mmhmm.
     * mmhmm TV is on the latest version and implementation is different from this.
     */
    initOverrides() {
        if (this.statsig == null) {
            return;
        }
        try {
            const override = window.localStorage.getItem(Statsig.STASIG_OVERRIDE_KEY);
            if (override) {
                this.statsigOverride = JSON.parse(override)
            }
            Object.keys(this.statsigOverride).forEach((key) => {
                try {
                    if (this.statsig.getFeatureGate(key)) {
                        this.statsig.overrideGate(key, this.statsigOverride[key]);
                    } else {
                        console.log ("Not found " + key);
                    }
                } catch (error) {
                    console.log ("Unable to override" + key);
                }
            });
            /**
             * Remove all the overrides if they are not a part of current override object
             * If this is not done, previously overriden value remains sticky as it gets
             * stored in statsig's own local storage named |STATSIG_LOCAL_STORAGE_INTERNAL_STORE_*|
             */
            let currentOverrides = this.statsig.getAllOverrides()?.gates;
            if (currentOverrides) {
                Object.keys(currentOverrides).forEach((key) => {
                    // Override has been removed
                    if (this.statsigOverride[key] === undefined) {
                        this.statsig.removeOverride(key);
                    }
                });
            }
        } catch (exception) {
            console.log("Unable to initialize", exception);
        }
    }

    /**
     * Returned promise gets resolved only when the initialization is complete.
     * Thus, the initialization is triggered only by the constructor of this class.
     * Everyone else waits for this initialization to get completed before reading the
     * featureGate value.
     * @returns Promise.
     */
    waitUntilInitialized() {
        return this.onInitializedPromise;
    }

    /**
     *
     * @returns Resolved promise if the script is already loaded
     * else unresolved promise that gets resolved after the script is
     * loaded.
     */
    #loadScript() {
        // Ensure that we only try to load the script once
        if (Statsig.loadedScript == true) {
            return Promise.resolve();
        }
        Statsig.loadScript = true;
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.crossOrigin = "anonymous";
            script.addEventListener("load", evt => resolve(evt));
            script.addEventListener("error", evt => reject(evt));
            script.src = Statsig.statsigClientURL;
            document.head.appendChild(script);
        });
    }

    /**
     * Initializes statsig client. Once initialized, feature gates are accessible.
     * @returns none
     */
    async #initClient() {
        this.statsig = window.statsig ? statsig : null;
        if (this.statsig != null) {
            await this.#initStatsigUser();
            // Make sure we weren't destroyed while waiting for our user above
            if (this.statsig == null) {
                return;
            }
            // Tell Statsig what user is logged in
            // This will be updated as authentication changes
            await this.statsig.initialize(Statsig.clientSDKKey, this.statsigUser, this.statsigConfigOptions);
            this.initOverrides();
        }
    }

    /**
     * Initializes statsig client and then authentication listener.
     * Resolves the promise so that all the code that is waiting for
     * feature gates can access the value.
     */
    async #init() {
        await this.#initClient();
        this.#startAuthenticationListener();
        this.initializedStatsig = true;
        this.onInitializedPromise.resolve();
    }

    /**
     *
     */
    destroy() {
        if (this.statsig != null) {
            if (this.initializedStatsig) {
                try {
                    this.statsig.shutdown();
                    this.initializedStatsig = false;
                } catch (error) {
                    console.error("Error shutting down Statsig", error);
                }
            }
            this.statsig = null;

            this.#stopAuthenticationListener();
        }
    }

    /*
     * Auth notifications
     */
    #startAuthenticationListener() {
        const observing = this.observingAuthenticationChanges;
        if (observing == true) {
            return;
        }
        NotificationCenter.default.addObserver(
            mmhmmAPI.Notifications.AuthenticationChanged,
            null,
            this.authenticationChanged,
            this
        );
        this.observingAuthenticationChanges = true;
    }

    /**
     *
     * @returns
     */
    #stopAuthenticationListener() {
        const observing = this.observingAuthenticationChanges;
        if (observing != true) {
            return;
        }
        NotificationCenter.default.removeObserver(
            mmhmmAPI.Notifications.AuthenticationChanged,
            null,
            this.authenticationChanged,
            this
        );
        this.observingAuthenticationChanges = false;
    }

    /**
     * Called when the authentication is changed.
     * This changes the statsig user.
     */
    async authenticationChanged() {
        try {
            await this.#initStatsigUser();
            this.statsig?.updateUser(this.statsigUser);
        } catch (exception) {
            console.log (exception);
        }

    }

    async #initStatsigUser () {
        const endpoint = mmhmmAPI.defaultEndpoint();
        // Statsig requires null rather than undefined
        this.statsigUser = null;
        const { isAuthenticated, user } = endpoint;

        if (!isAuthenticated || !user) {
            this.statsigUser = this.#getStatsigUserAnonymous();
        } else {
            this.statsigUser = await this.#getStatsigUserAuthenticated(user, endpoint);
        }
    }

    #getStatsigUserAnonymous() {
        let anonymousUserId = Cookies.Get("statsig-user-id");
        if (!anonymousUserId && gLocalDeployment) {
            anonymousUserId = createUUID();
        }
        if (anonymousUserId) {
            return {
                userID: anonymousUserId,
                customIDs: {
                    locale: gCurrentLocale || navigator.language,
                }
            };
        }
        return null;
    }

    async #getStatsigUserAuthenticated(user, endpoint) {
        const { experimentId } = await endpoint.getTrackingParameters();
        return {
            userID: user.id,
            customIDs: {
                locale: gCurrentLocale || navigator.language,
                marketing_experiment_id: experimentId,
                mmhmm_user_id: user.id,
            },
            custom: {
                mmhmmTVAlpha: user.mmhmmTVAlpha,
                mmhmmTVBeta: user.mmhmmTVBeta
            },
            privateAttributes: {
                email: user.email
            }
        };
    }

    /*
     * Gates
     *
     * https://docs.statsig.com/feature-flags/working-with
     */
    isFeatureGateEnabled(name) {
        if (!this.statsig || !this.initializedStatsig) {
            return false;
        }
        return this.statsig.checkGate(name);
    }

    /*
     * Experiments
     *
     * https://docs.statsig.com/guides/abn-tests
     */
    getExperiment(name) {
        if (!this.statsig || !this.initializedStatsig) {
            return null;
        }
        return this.statsig.getExperiment(name);
    }

    /*
     * Logging
     *
     * https://docs.statsig.com/guides/logging-events
     */
    logEvent(name, value = null, properties = null) {
        if (!this.statsig || !this.initializedStatsig) {
            return null;
        }
        return this.statsig.logEvent(name, value, properties);
    }
}

Statsig.default = new Statsig();
