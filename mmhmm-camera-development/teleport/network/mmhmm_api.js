//
//  mmhmm_api.js
//  mmhmm
//
//  Created by Steve White on 1/27/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class mmhmmAPI {
    constructor(environment) {
        this.environment = environment;

        if (environment == "dev" && getReleaseTrack() == "development") {
            this.expiration = 30;
        }

        // Create a URLBuilder instance for this API endpoint
        this.urlBuilder = new URLBuilder(environment, {
            hostname: gLocalDeployment !== true && window && window.location.hostname
        });

        //
        // Setup the baseURL as a r/o property
        //
        let env = this.environment;
        let baseURL = this.urlBuilder.getAPIBaseURL();
        Object.defineProperty(this, 'baseURL', {
            value: baseURL,
            writable: false
        });

        //
        // Setup the client ID as a r/o property
        //
        var hash = function(str) {
            var hash = 0,
                i, chr;
            if (str.length === 0) return hash;
            for (i = 0; i < str.length; i++) {
                chr = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0;
            }
            return hash;
        }

        var code = null;
        var isHybrid = App.isHybrid;

        if (env != null) {
            // Lightly obfsucate environment names and client ids
            var val = hash(env);
            if (val == 109757182) { // stage
                if (isHybrid == true) {
                    // 513aj4nhr51dim8bv5t6gkkkjf
                    code = [46435, 46019, 60009, 61137, 62059, 45513, 59867, 47301, 63083, 62573, 59351, 60375, 60109];
                }
                else {
                    // 5asd4dsr6pjr2if7adgf18a4mm
                    code = [46531, 62409, 46281, 62437, 46817, 60133, 45779, 58991, 57801, 59341, 45425, 57705, 60891];
                }
            }
            else if (val == 99349) { // dev
                if (isHybrid == true) {
                    // 23ti9943p0nn8u32cu81mvlrk5
                    code = [45671, 62675, 47475, 46183, 61537, 61149, 47339, 45925, 58347, 47203, 60909, 60645, 60267];
                }
                else {
                    // 6qtrrql5jtnofng1of9182u8f9
                    code = [46819, 62693, 62179, 60523, 60137, 61151, 59101, 59235, 61389, 47459, 47205, 62833, 58995];
                }
            } else if (env == "development-seth") {
                // For development of https://github.com/All-Turtles/mmhmm-web/issues/4221
                // This code shouldn't ever go into development, alpha or production
                // 56lbqpaflb3t8sobigisn5nqan
                code = [46445, 60613, 61921, 57805, 60613, 46057, 47335, 61381, 59855, 59879, 61035, 61155, 57821];
            } else if (env.startsWith("development-")) {
                code = localStorage.getItem("clientID");
            }
        }
        if (code == null) {
            if (isHybrid == true) {
                // 75jgadkhgbnrbcrhe0bs1cqrk4
                code = [46955, 60111, 57801, 60369, 59333, 61157, 58055, 62161, 58721, 58087, 45511, 61925, 60265];
            }
            else {
                // 5jfpvljsqjsvtqmdk685fh59e1
                code = [46549, 59105, 63193, 60135, 61909, 62445, 62691, 60873, 60269, 47211, 59089, 46451, 58723];
            }
        }

        var unpacker = function(values) {
            var result = "";
            for (var idx = 0; idx < values.length; idx += 1) {
                var short = values[idx];
                var high = (short >> 8) & 0x7f;
                result += String.fromCharCode(high);
                if ((short & 0xff) != 0xff) {
                    var low = (short & 0xff) >> 1;
                    result += String.fromCharCode(low);
                }
            }
            return result;
        }

        Object.defineProperty(this, 'clientID', {
            value: Array.isArray(code) ? unpacker(code) : code,
            writable: false,
            enumerable: false
        });

        // This is used only in local development to point the app
        // at a personal backend environment where the clientID makes
        // use of a secretHash.
        if (gLocalDeployment == true) {
            const secretHash = localStorage.getItem("secretHash");
            if (secretHash != null) {
                Object.defineProperty(this, 'secretHash', {
                    value: secretHash,
                    writable: false,
                    enumerable: false
                });
            }
        }

        var anonymousUserID = SharedUserDefaults.getValueForKey("mmhmmTVUserID");
        if (anonymousUserID == null) {
            function chr4() {
                return Math.random().toString(16).slice(-4)
            }

            anonymousUserID = `anon${Date.now()}-${chr4() + chr4()}`;
            SharedUserDefaults.setValueForKey(anonymousUserID, "mmhmmTVUserID");
        }

        Object.defineProperty(this, 'anonymousUserID', {
            value: anonymousUserID,
            writable: false,
            enumerable: false
        });

        // Storing window allows for refocusing it on any "Sign in" button click
        // instead of opening the new window & resetting the state
        this.signInWindow = null
    }

    signOut() {
        this.accessToken = null;
        this.updateAccessTokenCookies(null);
        this.me = undefined;
    }
    signOutOfBrowser() {
        // Used when we're in a hybrid app and the user logged in via a browser.
        // To ensure they get fully logged out, open the browser and log them out
        // there as well.
        window.open(this.getSignInAppURL("logout"), "_blank");
    }
    get maximumFileSize() {
        if (this.isAuthenticated == true) {
            return 10 * 1024 * 1024;
        }
        return 1024 * 1024;
    }
    get enablePreviewFeatures() {
        if (gLocalDeployment == true) {
            return true;
        }
        if (this.environment != null) {
            return true;
        }

        var url = new URL(window.location);
        var pathComponents = url.pathComponents.filter(item => item != "talk" && item != "index.html");
        if (pathComponents.length > 0) {
            return true;
        }

        var user = this.user;
        return (user != null && user.employee == true);
    }
    /*
     * Network helpers
     */
    get jsonMimeType() {
        return 'application/json';
    }
    makeRequest(method, url, body, accessToken, options, headers = {}) {
        if (options == null) {
            options = {};
        }
        if (url == null || url.length == 0) {
            console.error("Supplied invalid url", url);
            debugger;
        }
        return new Promise((resolve, reject) => {
            var request = new XMLHttpRequest();

            request.addEventListener("error", evt => {
                reject(new TypeError("The network request failed"));
            });
            request.addEventListener("load", evt => {
                if (options.responseType == null) {
                    resolve(request);
                    return;
                }

                var statusCode = request.status;
                if (statusCode == 404) {
                    // The service used to return 200 with {Message: "..."}
                    // It stopped doing so which upsets a fair amount of code
                    // So we'll synthesize things if this was a request to our
                    // sync services
                    var responseURL = new URL(request.responseURL);
                    if (responseURL.origin == this.baseURL) {
                        var path = responseURL.pathname;
                        if (path.startsWith(this.cloudyBaseURI) == true) {
                            resolve({Message: mmhmmAPI.NotFoundErrorMessage});
                            return;
                        }
                    }
                }

                resolve(request.response);
            });
            if (url[0] == '/') {
                url = this.baseURL + url;
            }
            request.open(method, url);

            if (accessToken != null) {
                request.setRequestHeader("Authorization", "Bearer " + accessToken.idToken);
            }

            for (var key in headers) {
                if (key == "host") {
                    continue;
                }
                request.setRequestHeader(key, headers[key]);
            }

            if ('cancelSignal' in options) {
                var signal = options.cancelSignal;
                delete options.cancelSignal;

                if (signal != null) {
                    if (signal.aborted == true) {
                        reject("Cancelled");
                        return;
                    }

                    signal.addEventListener("abort", () => {
                        request.abort();
                        reject("Cancelled");
                    }, {once: true});
                }
            }

            for (let key in options) {
                var val = options[key];
                var target = request;
                var dotIndex = -1;
                while ((dotIndex = key.indexOf(".")) != -1) {
                    var subkey = key.substring(0, dotIndex);
                    target = target[subkey];
                    // TODO (eslint): use a different variable name for the second key
                    key = key.substring(dotIndex + 1);
                }
                target[key] = val;
            }

            if (body != null) {
                var data = null;
                var contentType = null;
                var jsonMimeType = this.jsonMimeType;
                if (body.constructor == Object && (options.contentType == jsonMimeType || body.type == null)) {
                    data = JSON.stringify(body);
                    contentType = jsonMimeType;
                }
                else {
                    data = body;
                    contentType = options.contentType || body.type || "application/octet-stream";
                }

                request.setRequestHeader("Content-Type", contentType);
                request.send(data);
            }
            else {
                request.send();
            }
        });
    }
    async makeAuthenticatedRequest(method, url, body, options, retry = true, headers = {}) {
        const authFailureMessages = [
            "The incoming token has expired",
            "Unauthorized"
        ];

        const accessToken = await this.getAccessToken();
        try {
            const response = await this.makeRequest(method, url, body, accessToken, options, headers);
            if (response == null || options == null) {
                return response;
            }
            const responseType = options.responseType;
            if (responseType == null || responseType.toLowerCase() != "json") {
                return response;
            }
            const message = this.getResponseErrorMessage(response);
            const isAuthFailure = message != null && authFailureMessages.indexOf(message) != -1;
            if (isAuthFailure == false || retry == false) {
                return response;
            }
        } catch (err) {
            if (retry == false) {
                throw err;
            }
        }

        const newToken = await this.refreshToken(accessToken);
        if (newToken == null) {
            throw new Error("Error refreshing tokens");
        }

        return this.makeAuthenticatedRequest(method, url, body, options, false, headers);
    }
    async getAuthenticatedJSON(uri, params) {
        if (params == null) {
            params = {};
        }
        let first = true;
        for (var key in params) {
            if (first == true) {
                uri += "?";
                first = false;
            }
            else {
                uri += "&";
            }
            uri += escape(key) + "=";
            const value = params[key];
            if (value != null) {
                uri += escape(value);
            }
        }
        return this.makeAuthenticatedRequest("GET", uri, null, {responseType: "json"});
    }
    async postAuthenticatedJSON(uri, body, options={}) {
        if (options == null) {
            options = {};
        }
        options.contentType = this.jsonMimeType;
        options.responseType = "json";
        return this.makeAuthenticatedRequest("POST", uri, body, options);
    }
    async patchAuthenticatedJSON(uri, body) {
        return this.makeAuthenticatedRequest("PATCH", uri, body, {responseType: "json"});
    }
    async makePublicRequest(method, url, body, options) {
        return this.makeRequest(method, url, body, null, options);
    }
    async putBlob(blob, url, options) {
        return this.makeRequest("PUT", url, blob, null, options);
    }
    /*
     * General helpers
     */
    get isAuthenticated() {
        return (this.accessToken != null);
    }
    get user() {
        const accessToken = this.accessToken;
        if (accessToken == null) {
            return {
                id: this.anonymousUserID
            };
        }
        return accessToken.user;
    }

    // PART OF THE RETURNED DATA
    // "hasSubscription": false,
    // "freeTrial": true,
    // "freeTrialEnd": "2024-06-07T15:26:17.529845Z",
    // "business": false,
    async getMe(forceRefresh) {
        await this.waitUntilFirstSignIn();

        if (!this.me || forceRefresh) {
            this.me = await this.getAuthenticatedJSON(this.baseURL +
                "/users/me?includeBusinessPermissions=true");
        }

        // overrides for testing
        const {
            has_purchased_camera: hasPurchasedCamera,
            account_created: created,
            business_account: business,
            free_trial: freeTrial,
            free_trial_end: freeTrialEnd,
            has_subscription: hasSubscription,
            trial_group,
        } = Flags.getConfig();

        return {
            ...this.me,
            ...pickBy({
                business,
                created,
                freeTrial,
                freeTrialEnd,
                hasSubscription,
                trial_group,
                hasPurchasedCamera,
            }, (([key, value]) => value !== undefined)),
        };
    }

    async getCommerceCatalog() {
        const response = await this.getAuthenticatedJSON(this.baseURL + "/subscription/catalog");
        const errorMessage = this.getResponseErrorMessage(response);
        if (response == null || response.currency == null || errorMessage != null) {
            throw new Error(`Server returned unexpected response: ${errorMessage}`);
        }
        return response;
    }

    async getDailyTrialState() {
        const response = await this.getAuthenticatedJSON(this.baseURL + "/users/me/timelimitedtrial");
        const errorMessage = this.getResponseErrorMessage(response);
        if (response == null || errorMessage != null) {
            throw new Error(`Server returned unexpected response: ${errorMessage}`);
        }
        return response;
    }

    async activateDailyTrial(duration, cooldown) {
        const body = {};
        if (this.environment != null) {
            // In non-production environments, we can override the duration and cooldown
            if (duration) {
                body.durationInSeconds = duration;
            }
            if (cooldown) {
                body.coolOffInSeconds = cooldown;
            }
        }

        const response = await this.postAuthenticatedJSON(this.baseURL + "/users/me/timelimitedtrial", body);
        const errorMessage = this.getResponseErrorMessage(response);
        if (response == null || errorMessage != null) {
            throw new Error(`Server returned unexpected response: ${errorMessage}`);
        }
        return response;
    }

    /*
        {
            "utm_campaign": "s2_sig_block",
            "utm_content": "somecontent",
            "utm_medium": "email",
            "utm_source": "signatureblock",
            "utm_term": "term123",
            "msclkid": "click",
            "experimentId": "6a2a74ac-a082-41da-acab-8c85cee62c9b" // statsig user id
        }
    */
    async getTrackingParameters () {
        const me = await this.getMe();

        return me.trackingParameters;
    }

    getAccountSettingsURL() {
        return this.urlBuilder.getAccountURL();
    }
    getManageSubscriptionURL() {
        return this.urlBuilder.getAccountURL("/subscription");
    }
    getAccountUpgradeURL() {
        return this.urlBuilder.getAccountURL("/choose-plan");
    }
    getManageWorkgroupURL() {
        return this.urlBuilder.getAccountURL("/workgroup/members");
    }
    getManageBusinessURL() {
        return this.urlBuilder.getAccountURL("/team/members");
    }
    async getAuthenticatedLinks() {
        return this.getAuthenticatedJSON("/users/me/webapp/links");
    }
    async getSyncSubscriptionInfo() {
        return this.postAuthenticatedJSON(
            "/users/me/sync/config/subscription", {
                accessToken: this.accessToken.accessToken
            },
        );
    }
    newWebsocketURL() {
        const wsUrl = this.urlBuilder.getWebSocketURL();
        return `${wsUrl}?token=${this.accessToken.idToken}`;
    }
    /*
     * Access tokens
     */
    async refreshToken(token) {
        if (token == null) {
            console.error("Can't refresh a null token");
            return null;
        }

        // See if we're already in the midst of a refresh
        let refreshing = this.refreshing;
        if (refreshing != null) {
            if (refreshing.promise == null) {
                refreshing.promise = new Promise((resolve, reject) => {
                    refreshing.resolve = resolve;
                    refreshing.reject = reject;
                })
            }
            return refreshing.promise;
        }

        const refreshURL = "/auth/tokens/refresh";
        const body = {
            refreshToken: token.refreshToken,
            clientID: this.clientID,
            secretHash: this.secretHash || "",
        };

        refreshing = {};
        this.refreshing = refreshing;

        let request = null;
        try {
            console.log("Refreshing access token...");
            request = await this.makeRequest("POST", refreshURL, body, {responseType: 'json'});
        } catch (err) {
            if (refreshing?.reject) {
                refreshing.reject(err);
            }
            throw err;
        } finally {
            this.refreshing = null;
        }

        let newToken = null;
        try {
            newToken = this.processAuthRequest(request);
            console.log("Refreshed access token, expires at", newToken.expires?.toISOString());
            if (refreshing?.resolve) {
                refreshing.resolve(newToken);
            }
        } catch (err) {
            if (refreshing?.reject) {
                refreshing?.reject(err);
            }
            throw err;
        }

        return newToken;
    }
    async getAccessToken() {
        let token = this.accessToken;
        if (token == null) {
            return null;
        }

        const expires = token.expires;
        // If the token is about to expire in 25 seconds, refresh it.
        if (expires != null && expires < Date.now() + 25000) { // ms
            const newToken = await this.refreshToken(token);
            if (newToken == null) {
                return null;
            }
            token = newToken;
        }
        return token;
    }
    // currently this is just used to detect first sign
    // in the future if we need something fancier we could
    // just delete the _signedInPromise property on logout
    waitUntilFirstSignIn () {
        return this._signedInPromise ||= promiseWrapper();
    }
    setAccessToken(accessToken) {
        if (accessToken != null) {
            if (typeof accessToken.expires == "string") {
                accessToken.expires = new Date(accessToken.expires);
            }
            this.waitUntilFirstSignIn().resolve();
        }

        this.accessToken = accessToken;

        NotificationCenter.default.postNotification(
            mmhmmAPI.Notifications.AuthenticationChanged,
            this,
            {}
        );
        this.updateAccessTokenCookies(accessToken);
    }
    async restoreAccessToken(accessToken) {
        if (accessToken == null) {
            mmhmmAPI.signOutOfEndpoint(this);
            return;
        }
        this.accessToken = accessToken;
        if (accessToken.user.id != null) {
            // We don't want to post this if we don't know
            // the user ID, as many things listen for this
            // and either expect no token, or a full token
            NotificationCenter.default.postNotification(
                mmhmmAPI.Notifications.AuthenticationChanged,
                this,
                {}
            );
        }

        // Force a re-fresh of credentials
        let refreshed = null;
        try {
            refreshed = await this.getAccessToken();
        } catch (err) {
            mmhmmAPI.signOutOfEndpoint(this);
            throw err;
        }
        return refreshed;
    }
    updateAccessTokenCookies(accessToken) {
        CognitoCookies.shared.setCookiesFromAccount(accessToken, this.clientID);
    }
    /*
     * Authentication helpers
     */
    processAuthRequest(request, isHandoff = false) {
        const response = request.response;
        if (response == null) {
            this.setAccessToken(null);
            throw new Error(`Server returned no response (code ${request.status})`);
        }

        let payload = null;
        if (typeof response != 'string') {
            payload = response;
        }
        else {
            try {
                payload = JSON.parse(response);
            }
            catch (err) {
                gSentry.exception(err);
                this.setAccessToken(null);
                console.error("Failed to parse handoff response", err);
                throw new Error("Failed to parse authentication response");
            }
        }

        if (payload.code != null) {
            this.setAccessToken(null);
            throw new Error(payload.message || payload.code);
        }

        if (Math.floor(request.status / 100) != 2) {
            this.setAccessToken(null);
            console.error("Unexpected status for authentication request", request.status);
            throw new Error(`Server returned unexpected response (code ${request.status})`);
        }

        const expiresIn = payload.expiresIn;
        if (expiresIn != null) {
            const expires = new Date();
            expires.setSeconds(expires.getSeconds() + expiresIn);
            payload.expires = expires;
        }

        if (payload.refreshToken == null) {
            const previous = this.accessToken;
            if (previous == null) {
                console.error("Server response did not include `refreshToken` and the previous token doesn't either");
            }
            else {
                payload.refreshToken = previous.refreshToken;
            }
        }

        this.setAccessToken(payload);

        // If the payload was generated by exchanging a handoff token for auth tokens,
        // refresh the token to work around a server-side bug.
        // See https://github.com/All-Turtles/mmhmm-web/issues/3073
        if (isHandoff) {
            return this.refreshToken(payload);
        }

        return payload;
    }
    async performAuthenticationHandoff(token) {
        var handoffURL = "/auth/tokens/handoff";

        var body = {
            token: token,
            clientId: this.clientID,
            secretHash: "",
        }

        var request = await this.makeRequest("POST", handoffURL, body, {responseType: 'json'});
        var result = await this.processAuthRequest(request, true);
        Analytics.Log('user.signin');
        return result;
    }

    /**
     * This is required for the Desktop app automated test for generating
     * the handoff token. This should not be used for any other purpose.
     * @returns JSON containing `token` or empty
     */
    async generateHandoff(token) {
        var handoffURL = `${this.baseURL}/users/me/handoff`;
        let tokenHandoff = await this.makeRequest("POST", handoffURL, null, null, {responseType: "json"}, {'Authorization': `Bearer ${token}`});
        return tokenHandoff;
    }

    async _openSignInWindow(lastPathComponent) {
        return new Promise((resolve, reject) => {
            var childCheckingInterval = null;
            var cleanup = null;

            if (this.signInWindow) {
                this.signInWindow.focus()
                return
            }

            var handleSharedAccountCookie = (id, account) => {
                var accessToken = {
                    expiresIn: 0,
                    expires: new Date(0),

                    accessToken: account.accessToken,
                    idToken: account.idToken,
                    refreshToken: account.refreshToken,

                    user: {
                        id: id
                    }
                };

                this.restoreAccessToken(accessToken).then(token => {
                    resolve(token);
                    Analytics.Log('user.signin');
                }).catch(err => {
                    console.error("getAccessToken error", err);
                    reject(err);
                })
            };

            var handleHandoffToken = (token) => {
                this.performAuthenticationHandoff(token).then(result => {
                    var endpoints = mmhmmAPI.endpoints;
                    if (endpoints == null) {
                        endpoints = [];
                        mmhmmAPI.endpoints = endpoints;
                    }
                    if (endpoints.indexOf(this) == -1) {
                        endpoints.push(this);
                    }

                    resolve(result);
                }).catch(err => {
                    reject(err);
                });
            };

            var handleChildWindowData = (data) => {
                var accounts = data.accounts;
                var lastAccountUUID = data.lastAccountUUID;
                if (accounts != null && lastAccountUUID != null) {
                    var account = accounts[lastAccountUUID];
                    if (account == null) {
                        console.error("Could not find last account in accounts", lastAccountUUID, accounts);
                        reject("Unknown authentication browser error");
                        return false;
                    }
                    handleSharedAccountCookie(lastAccountUUID, account);
                    return true;
                }

                var token = data.token;
                if (token == null) {
                    console.error("Failed to get a token from child window", data);
                    reject("Unknown authentication browser error");
                    return false;
                }

                handleHandoffToken(token);
                return true;
            };

            //
            // Handler to get the token from the popup window
            //
            var windowMessage = (event) => {
                var source = event.source;
                if (this.signInWindow == null || source == this.signInWindow) {
                    window.removeEventListener("message", windowMessage);
                }

                if (source != this.signInWindow) {
                    return;
                }
                if (childCheckingInterval != null) {
                    window.clearInterval(childCheckingInterval);
                }
                source.close();
                cleanup();

                var data = event.data;
                handleChildWindowData(data);
            };

            window.addEventListener("message", windowMessage);

            //
            // But if the sign in/up requires email verification, that
            // will likely open in a new window/tab, so we won't get
            // a message posted... so listen for some storage events
            //
            var storageHandler = (event) => {
                if (event.storageArea != window.localStorage) {
                    return;
                }

                if (event.key != 'params') {
                    return;
                }
                var data = null;
                try {
                    var params = event.newValue;
                    console.log("params is: ", params);
                    data = JSON.parse(params);
                }
                catch (err) {
                    gSentry.exception(err);
                    console.error("failed to parse ", event, err);
                }

                if (data != null) {
                    var success = handleChildWindowData(data);
                    if (success == true) {
                        if (this.signInWindow != null) {
                            this.signInWindow.close();
                            this.signInWindow = null;
                        }
                    }
                }

                cleanup();
                window.localStorage.removeItem(event.key);
            };
            window.addEventListener('storage', storageHandler);

            //
            // Helper for removing the message + storage event listeners
            //
            cleanup = () => {
                window.removeEventListener("message", windowMessage);
                window.removeEventListener('storage', storageHandler);
                window.clearInterval(childCheckingInterval);
            };

            //
            // Window options (popup, 640x480, centered within the current window)
            //
            var options = {
                popup: "yes",
                width: 820,
                height: 710,
            };
            options.left = window.screenLeft + ((window.innerWidth - options.width) / 2);
            options.top = window.screenTop + ((window.innerHeight - options.height) / 2);

            var optionStr = "";
            for (var key in options) {
                optionStr += "," + key + "=" + options[key];
            }
            optionStr = optionStr.substring(1);

            //
            // Open it...
            //
            var authURL = this.getSignInAppURL(lastPathComponent);
            this.signInWindow = window.open(authURL, null, optionStr)
            childCheckingInterval = window.setInterval(() => {
                if (this.signInWindow != null && (this.signInWindow.window == null || this.signInWindow.closed == true)) {
                    resolve(null);
                    this.signInWindow = null;
                    cleanup();
                    window.clearInterval(childCheckingInterval);
                    childCheckingInterval = null;
                }
            }, 1000);
        });
    }
    getSignInAppURL(lastPathComponent) {
        var platform = null;
        if (App.isHybrid == true) {
            if (navigator.platform.startsWith("Mac") == true) {
                platform = "mac-hybrid";
            }
            else {
                platform = "windows-hybrid";
            }
        }
        if (platform == null) {
            platform = "ooo-web-tv";
        }

        const locale = LocaleToURLPrefix(gCurrentLocale);
        return this.urlBuilder.getSignInURL(platform, lastPathComponent, locale);
    }
    async performCreateAccount() {
        return this._openSignInWindow("sign-up")
    }
    async performAuthentication() {
        return this._openSignInWindow("sign-in")
    }
    /*
     * Cloudy sync helpers
     */
    timeForSyncEvent() {
        // Round down the milliseconds due to:
        // ClientError: clientUpdatedTime is set to a future time (clientUpdatedTimeMilliseconds - clientNowMilliseconds == 1650906909004 - 1650906909000 == 4)
        var now = Date.now();
        now = Math.floor(now / 1000) * 1000;
        return new Date(now);
    }
    encodedValueForDate(date) {
        var value = date.toJSON();
        return value.replace(/\.[0-9]{3}Z$/, "Z");
    }
    get cloudyBaseURI() {
        return "/users/me/sync";
    }
    async syncRecordWithID(identifier) {
        // The service should have a GET /sync/records/:id endpoint, but ...
        var uri = `${this.cloudyBaseURI}/records/ids?include_trashed=true`;
        var request = {
            ids: [identifier],
        }
        var result = await this.postAuthenticatedJSON(uri, request);

        if (result != null && result.records != null && result.records.length == 1) {
            result = result.records[0];
            if (result != null && result.id == identifier) {
                return new CloudyRecord(result);
            }
        }

        if (result != null && result.Message != null) {
            throw result.Message;
        }

        throw "Server returned unexpected response";
    }
    async _getSyncRecordFrom(serviceLocation, includeTrashed = false) { // Singular, record
        let result = null;

        const params = {};
        const expiration = this.expiration;
        if (expiration != null) {
            params.expiration = expiration;
        }

        let url = null;

        if (serviceLocation.startsWith("pagePresentation") == true) {
            const records = await this._getV2SyncRecordsFrom(serviceLocation, includeTrashed, params);
            result = { records };
            url = new URL(serviceLocation, this.baseURL);
        }
        else {
            if (includeTrashed == true) {
                params.include_trashed = true;
            }
            var uri = `${this.cloudyBaseURI}/${serviceLocation}`;
            result = await this.getAuthenticatedJSON(uri, params);

            url = new URL(uri, this.baseURL);
        }

        var recordID = url.lastPathComponent;
        if (result != null) {
            // Unlike historical /:type/:uuid endpoints that just returned
            // a single record, /pagePresentations/:uuid returns the record
            // and all its children.  So check for .records on the result,
            // and if it exists try to find the requested record
            if (result.records != null) {
                result = result.records.find(record => record.id == recordID);
            }

            if (result != null && result.id == recordID) {
                return new CloudyRecord(result);
            }
            else if (result != null && result.Message != null) {
                throw result.Message;
            }
        }

        throw "Server returned unexpected response";
    }
    async _getV2SyncRecordsFrom(endpoint, includedDeleted = false, params = {}) { // Plural, records
        const baseUrl = this.urlBuilder.getAPIV2BaseURL();
        const url = `${baseUrl}/v2/sync/${endpoint}`;
        return this._getSyncRecordsFrom(url, includedDeleted, params);
    }
    async _getSyncRecordsFrom(endpoint, includedDeleted = false, params = {}) { // Plural, records
        var uri = null;
        if (endpoint[0] == "/" || endpoint.startsWith("http") == true) {
            uri = endpoint;
        }
        else {
            uri = `${this.cloudyBaseURI}/${endpoint}`;
        }

        var expiration = this.expiration;
        if (expiration != null) {
            params.expiration = expiration;
        }
        var results = await this.getAuthenticatedJSON(uri, params);
        if (results == null) {
            console.error("No response for uri: ", uri)
            throw "Invalid response from server";
        }

        var records = results.records;
        if (records == null) {
            console.error("uri response did not return records", uri, results);
            var error = new Error(results.Message ?? "Invalid response from server");
            error.response = results;
            throw error;
        }

        records = records.map(record => new CloudyRecord(record));

        var nextPageToken = results.nextPageToken;
        if (nextPageToken != null && nextPageToken != "" && nextPageToken != params.nextPageToken) {
            params.nextPageToken = nextPageToken;
            var nextPage = await this._getSyncRecordsFrom(endpoint, includedDeleted, params);
            records.push(...nextPage);
        }

        if (includedDeleted == true) {
            return records;
        }

        var nonDeleted = records.filter(record => {
            if (record.deleted == true) {
                return false;
            }
            if (record.decodeProperty("trashed", Boolean) == true) {
                return false;
            }
            return true;
        });
        return nonDeleted;
    }
    _newSyncRecord(collection, itemID, parentID, timestamp, properties) {
        var userID = this.user.id;

        var record = new CloudyRecord({
            collection: collection,
            id: itemID,
            properties: {},

            documentId: parentID,
            presentationId: parentID,
            parentId: parentID,

            createdAt: timestamp,
            updatedAt: timestamp,

            ownerUserId: userID,
            sharedWith: null,
            version: 1,
            deleted: false,

            assetReferences: [],
        });

        for (var key in properties) {
            var value = properties[key];
            record.encodeProperty(key, value);
        }

        return record;
    }
    async _postSyncRecords(records, cancelSignal) {
        var timestamp = this.timeForSyncEvent();

        var results = [];
        const batchSize = 20;
        for (var offset = 0; offset < records.length; offset += batchSize) {
            var slice = records.slice(offset, offset + batchSize);
            var body = {
                now: timestamp,
                records: slice,
            };

            var response = await this.postAuthenticatedJSON(
                `${this.cloudyBaseURI}/records`,
                body,
                { cancelSignal: cancelSignal }
            );

            if (response == null) {
                throw "Server returned unexpected response";
            }

            var serverResults = response.results;
            if (serverResults == null) {
                let error = new Error("Server response did not include `results`");
                error.response = response;
                throw error;
            }
            if (serverResults.length != slice.length) {
                console.error("serverResults: ", serverResults);
                let error = new Error("Server results has invalid length");
                error.response = response;
                throw error;
            }

            results = results.concat(serverResults);
        }

        for (var idx = 0; idx < results.length; idx += 1) {
            var result = results[idx];
            var status = result.status;
            if (status == null) {
                console.error("No status on result?", result);
            }
            else if (status.success != true) {
                console.error("Non-true success in status of result: ", result);
            }

            var record = result.record;
            if (record != null) {
                result.record = new CloudyRecord(record);
            }
        }

        this._postNotificationsForResults(results);

        return results;
    }
    _postNotificationsForResults(results) {
        const notifToCollectionMap = {
            [mmhmmAPI.Notifications.RoomsChanged]: [
                mmhmmAPI.CloudyCollectionTypes.Room
            ],
            [mmhmmAPI.Notifications.PresentationsChanged]: [
                mmhmmAPI.CloudyCollectionTypes.ModernPresentation,
                mmhmmAPI.CloudyCollectionTypes.LegacyPresentation
            ],
        }

        for (let notification in notifToCollectionMap) {
            const collections = notifToCollectionMap[notification];
            const matches = results.filter(result => {
                const collection = result.record?.collection;
                return collections.includes(collection);
            });
            if (matches.length > 0) {
                const records = matches.map(result => result.record);
                NotificationCenter.default.postNotification(
                    notification,
                    this,
                    { records: records }
                );
            }
        }
    }
    deleteAllTrashedRecords(records) {
        var trashedIDs = records.filter(record => {
            if (record == null) {
                return false;
            }
            var trashed = record.decodeProperty("trashed", Boolean);
            return (trashed == true);
        }).map(record => record.id);

        if (trashedIDs.length == 0) {
            return;
        }

        var expunge = {
            ids: trashedIDs
        }
        this.postAuthenticatedJSON(
                    `${this.cloudyBaseURI}/trash/delete/records`,
                    expunge,
        ).catch(err => {
            console.error("Error deleting trashed records: ", trashedIDs, err)
        });
    }
    async _postSyncRecord(record, cancelSignal) {
        var results = await this._postSyncRecords([record], cancelSignal);

        var result = results[0];

        var status = result.status;
        if (status == null) {
            console.error("no status on: ", result);
            throw "Server response did not inclue `status`"
        }

        if (status.success != true) {
            console.error("sync error message: ", status.errorMessage);
            throw "The server operation was unsuccessful";
        }
        return result.record;
    }
    async _deleteSyncRecord(record) {
        var results = await this._deleteSyncRecords([record]);
        return results[0];
    }
    async _deleteSyncRecords(records) {
        return this._setTrashedValueOnSyncRecords(true, records);
    }
    async _undeleteSyncRecords(records) {
        return this._setTrashedValueOnSyncRecords(false, records);
    }
    async _setTrashedValueOnSyncRecords(trashedValue, records) {
        records.forEach(record => record.encodeProperty("trashed", trashedValue));
        return this._postSyncRecords(records);
    }

    /* Cloudy record import/export/sharing stuff */

    /**
     * Export a slide for sharing.
     * @param {Slide.Modern} slide The slide.
     * @param {Presentation.Typed.Type} type The type of slide.
     * @param {Boolean} shareWithTeam Whether to share the slide with the user's team.
     * @param {?String} title The title for the exported slide. If null, the slide's title is used.
     * @returns {Object} the response from the server
     */
    async exportSlide(slide, type, shareWithTeam, title=null, tag=null) {
        const body = {
            includeThumbnails: true,
            title: title || slide.title,
            type: type,
            isGroupExport: shareWithTeam,
        };
        if (tag != null) {
            body.tags = tag;
        }
        const response = await this.postAuthenticatedJSON(
            `${this.cloudyBaseURI}/export/page/${slide.identifier}`,
            JSON.stringify(body)
        );
        var errorMessage = this.getResponseErrorMessage(response);
        if (errorMessage != null) {
            throw new Error(errorMessage);
        }
        return response;
    }

    async updateExportedObject(exportIdentifier, type, shareWithTeam, title=null, tag=null) {
        const path = `${this.cloudyBaseURI}/export/${exportIdentifier}`;
        const body = {
            includeThumbnails: true,
            type,
            isGroupExport: shareWithTeam,
        };
        if (tag != null) {
            body.tags = tag;
        }
        if (title != null) {
            body.title = title;
        }
        const response = await this.postAuthenticatedJSON(path, JSON.stringify(body));
        const errorMessage = this.getResponseErrorMessage(response);
        if (errorMessage != null) {
            throw new Error(errorMessage);
        }
        return response;
    }

    /**
     * Used to upload thumbnails for slides after creating a new export of
     * either a presentation or individual slide.
     * @param {Slide.Modern[]} slides the slides to thumbnail.
     * @param {String[]} uploadUrls the upload URLs returned by the service.
     * @param {?Blob[]} blobs the optional blobs to upload. If omitted,
     * the slide's thumbnail will be used.
     */
    async uploadThumbnailsForExport(slides, uploadUrls, blobs=null) {
        // There should be one thumbnail URL per slide, but everything is async,
        // so that's not guaranteed. Upload as many as we can.
        const count = Math.min(slides.length, uploadUrls.length);
        slides = slides.slice(0, count);
        uploadUrls = uploadUrls.slice(0, count);

        // Upload each thumbnail asynchronously
        const tasks = [];
        for (let i = 0; i < count; i++) {
            const blob = blobs != null ? blobs[i] : null;
            tasks.push(this.uploadThumbnailForExport(slides[i], uploadUrls[i], blob, 3));
        }

        // Return a promise that resolves if all tasks resolved,
        // or rejects if any task rejected
        return Promise.all(tasks);
    }

    async uploadThumbnailForExport(slide, uploadURL, blobOrNull, attempts) {
        var blob = blobOrNull ?? await slide.thumbnailBlob();
        if (blob == null) {
            console.error("No thumbnail for slide", slide.identifier);
            return;
        }

        // Return a promise that tries up to attempts times to upload the thumbnail
        // before rejecting
        return new Promise(async (resolve, reject) => {
            for (let i = 0; i < attempts; i++) {
                try {
                    var result = await this.putBlob(blob, uploadURL);
                    if (result != null && result.status != null && result.status >= 200 && result.status <= 300) {
                        resolve();
                        return;
                    }
                } catch (err) {
                    // Ignore it; we'll fail after our retries are up
                }
            }

            // We didn't successfully complete an upload
            reject();
        });
    }

    /**
     * Delete a previously created export, which could be a presentation or single slide.
     * @param {String} exportIdentifier The identifier of the export.
     */
    async deleteExportedObject(exportIdentifier) {
        var path = `${this.cloudyBaseURI}/export/${exportIdentifier}`;
        return this.makeAuthenticatedRequest("DELETE", path, {}, {responseType: "json"});

        // TODO throw an exception on error
    }
    /**
     * List all of the previously created exports in the user's account, including
     * presentations and single slides.
     * @returns {[Object]} An array of exported record metadata.
     */
    async listExportedObjects() {
        const response = await this.getAuthenticatedJSON(`${this.cloudyBaseURI}/export`);
        return response.exports;
    }
    /**
     * List all of the previously created exports available to the user via their membership
     * in a team (workgroup or mmhmm business account) or because we published them to our
     * "global catalog". The results include presentations and single slides.
     * @returns {[Object]} An array of exported record metadata.
     */
    async listAvailablePublishedObjects() {
        const response = await this.getAuthenticatedJSON(`${this.cloudyBaseURI}/export?groupOwned=true`);
        return response.exports;
    }
    /**
     * Get the metadata for a previously exported record, which could be a presentation or single slide.
     * @param {String} exportIdentifier
     * @returns {Object} The metadata for the exported record.
     */
    async getExportedObjectMetadata(exportIdentifier) {
        return this.getAuthenticatedJSON(`/public/sync/export/${exportIdentifier}`);
    }
    async updateExportedPresentationTitle(exportIdentifier, title) {
        var path = `${this.cloudyBaseURI}/export/${exportIdentifier}`;
        var body = { title };
        var response = await this.makeAuthenticatedRequest("PATCH", path, body, {responseType: "json"});
        var errorMessage = this.getResponseErrorMessage(response);
        if (errorMessage != null) {
            throw new Error(errorMessage);
        }
    }
    /**
     * Import a previously exported record, which could be a presentation or single slide.
     * The record being imported does not need to be owned by the user.
     * @param {String} exportIdentifier
     * @param {?String} presentationID The optional identifier of the presentation to import the record into.
     * This is ignored when importing presentations, and used when importing slides.
     * @param {?String} insertAfterId The optional identifier of the slide to insert the imported slide after.
     * This is ignored when importing presentations, and used when importing slides.
     * @returns {[CloudyRecord]} The imported record and its children.
     */
    async importExportedObject(exportIdentifier, presentationID = null, insertAfterId = null) {
        const body = {};
        if (presentationID != null) {
            body.presentationId = presentationID;
        }
        if (insertAfterId != null) {
            body.insertAfterId = insertAfterId;
        }
        var response = await this.postAuthenticatedJSON(
            `${this.cloudyBaseURI}/import/${exportIdentifier}`, body
        );
        if (response.records != null) {
            return response.records.map(record => new CloudyRecord(record));
        }
        var errorMessage = this.getResponseErrorMessage(response);
        if (errorMessage != null) {
            throw new Error(errorMessage);
        }
        else {
            throw new Error();
        }
    }
    /*
     * Cloudy blobs
     */
    async _uploadBlobsForCloudyRecords(blobs, serverRecords, onProgress, cancelSignal=null) {
        var blobsAndAssets = [];
        var totalUploadSize = 0;

        var allAssets = serverRecords
            .flatMap(record => record.assetReferences ?? [])
            .filter(asset => asset != null);

        for (var fingerprint in blobs) {
            var asset = allAssets.find(asset => asset.fingerprint == fingerprint);
            if (asset == null) {
                console.error("Could not find asset with fingerprint in records", fingerprint, serverRecords);
                continue;
            }
            if (asset.uploaded == true) {
                // Already uploaded, nothing to do
                continue;
            }

            var initiateUploadUrl = asset.initiateUploadUrl;
            if (initiateUploadUrl == null) {
                console.error("No `initiateUploadUrl` in assetReference of response", asset);
                gSentry.message("No `initiateUploadUrl` in assetReference of response");
                return;
            }

            var blob = blobs[fingerprint];
            blobsAndAssets.push({
                blob: blob,
                asset: asset
            });

            totalUploadSize += blob.size;
        }

        if (blobsAndAssets.length == 0) {
            return serverRecords;
        }

        var bytesSent = 0;
        for (var idx=0; idx<blobsAndAssets.length; idx+=1) {
            const {blob,asset} = blobsAndAssets[idx];

            const initiateUploadUrl = asset.initiateUploadUrl;
            var uploadResponse = await this.postAuthenticatedJSON(
                initiateUploadUrl,
                { contentType: blob.type, cancelSignal: cancelSignal },
            );

            var etags = {};
            var parts = uploadResponse.parts;
            var bytesTotal = blob.size;
            for (var key in parts) {
                var upload = parts[key];
                var start = upload.byteRangeStart;
                var end = start + upload.byteRangeLength;

                var lastBytesSent = 0;
                var options = {
                    cancelSignal: cancelSignal,
                    "upload.onprogress": (evt) => {
                        var change = evt.loaded - lastBytesSent;
                        lastBytesSent = evt.loaded;
                        bytesSent += change;

                        if (onProgress != null) {
                            onProgress(bytesSent / totalUploadSize);
                        }
                    }
                };

                var request = await this.makePublicRequest(
                    "PUT",
                    upload.url,
                    blob.slice(start, end),
                    options
                );

                var etag = request.getResponseHeader("ETag");
                etags[key] = etag;
            }

            var completeUploadUrl = uploadResponse.completeUploadUrl;
            if (completeUploadUrl == null) {
                console.error("no completeUploadUrl in uploadResponse?", uploadResponse);
            }
            else {
                // We don't use the cancelSignal here because it would be nice
                // to mark the asset as being completed...
                var completedUpload = await this.makeAuthenticatedRequest(
                    "PUT",
                    uploadResponse.completeUploadUrl,
                    { etags: etags },
                    { responseType: 'json' },
                );

                // Not sure what completedUpload would return on error
                // It just returns {} on success.
            }

            // This is just to re-assure the rest of the app.
            // There is not a need to send this back to the server
            asset.uploaded = true;
            asset.uploadedAt = this.timeForSyncEvent();
            await this.getPresignedDownloadUrlForAsset(asset);
            asset.blob = blob;
        }

        return serverRecords;
    }
    async getPresignedDownloadUrlForAsset(asset) {
        if (asset.presignedDownloadUrl == null &&
            asset.uploaded == true &&
            asset.downloadUrl != null)
        {
            var request = await this.makeAuthenticatedRequest("GET", asset.downloadUrl, null);
            var response = request.responseText;
            if (response.startsWith('"') == true) {
                response = JSON.parse(response);
            }
            asset.presignedDownloadUrl = response;
        }
    }
    /*
     *
     */
    async _resolveDownloadUrlsForRecords(records) {
        var numRecords = records.length;
        for (var recordIdx = 0; recordIdx < numRecords; recordIdx += 1) {
            var record = records[recordIdx];

            // While cloudy record has a helper for this, it returns
            // a CloudyAsset, and we'd like to modify the asset entry
            // on the record
            var assetWithFingerprint = function(fingerprint) {
                return record.assetReferences.find(asset => asset.fingerprint == fingerprint);
            }

            // Some times the app fails to upload a thumbnail – this needs to be fixed
            // but until then, allow those w/o thumbnails to be used, if they have content
            var fingerprintKeys = ["thumbnailAssetFingerprint", "contentAssetFingerprint", "maskAssetFingerprint"];
            for (var keyIdx = 0; keyIdx < fingerprintKeys.length; keyIdx += 1) {
                var assetFingerprint = record.decodeProperty(fingerprintKeys[keyIdx], String, null);
                if (assetFingerprint == null) {
                    continue;
                }

                var asset = assetWithFingerprint(assetFingerprint);
                if (asset.presignedDownloadUrl != null) {
                    break;
                }

                try {
                    var presignedDownloadUrl = await this.getAuthenticatedJSON(asset.downloadUrl);
                    asset.presignedDownloadUrl = presignedDownloadUrl;
                    break;
                }
                catch (err) {
                    console.error("Error resolving asset: ", asset, err);
                }
            }
        }
    }
    _filterListSyncRecords(records) {
        // Because this is /sync/records, the service returns deleted
        // records which are of no use to us.
        const mediaOrBridge = records.filter(record => (record.deleted == false))
            .map(record => new CloudyRecord(record));

        const knownClassIdentifiers = [];
        for (let key in Media) {
            const identifier = Media[key].ClassIdentifier;
            if (identifier != null && knownClassIdentifiers.includes(identifier) == false) {
                knownClassIdentifiers.push(identifier);
            }
        }

        // Also returns titlecard bridge.
        // This is because contentAssetFingerprint is non-null for those records.
        return mediaOrBridge.filter(record => {
            var type = record.decodeProperty("type", String);
            if (type == "presenter") {
                // Because this is /sync/records, the service is returning
                // records that are of absolutely no use to us.
                return false;
            }

            var contentAssetFingerprint = record.decodeProperty("contentAssetFingerprint", String, null);
            if (contentAssetFingerprint != null) {
                return true;
            }
            switch (type) {
                case Media.Image.ClassIdentifier:
                case Media.BasicVideo.ClassIdentifier:
                case Media.Audio.ClassIdentifier:
                case Media.GIF.ClassIdentifier:
                case "gif":
                    // These need content assets.
                    return false;
                case Media.Placeholder.ClassIdentifier:
                    // This isn't useful
                    return false;
                case Media.Text.ClassIdentifier: {
                    const media = record.decodeProperty("content", Object);
                    return (media?.template != true);
                }
                default:
                    // This is probably a windowRecorder, screenRecorder, or captureDevice
                    return knownClassIdentifiers.includes(type);
            }
        });
    }
    async *enumerateSyncRecordsOfType(type, include_trashed = true) {
        const params = {
            presignedURLs: true,
            include_trashed: include_trashed,
        };
        for await (let response of this.enumerateSyncRecords(type, params)) {
            const records = response.records;

            // Filter out media that isn't useful
            var filteredRecords = this._filterListSyncRecords(records);

            // The callback may be given an empty array, because the records were
            // deleted, or we de-duped them.... while we could skip the callback
            // in this scenario, it seems nice to give the caller an opportunity
            // to cancel us.
            yield filteredRecords;
        }
    }
    async *enumerateSyncRecords(type, params={}) {
        let baseURI = `${this.cloudyBaseURI}/records`;
        if (type != null) {
            baseURI += `/${type}`;
        }

        let query = new URLSearchParams(params);

        let finished = false;
        let pageToken = null;
        while (finished != true) {
            let pageURI = baseURI;
            if (pageToken != null) {
                query.set("nextPageToken", pageToken);
            }
            pageURI += "?" + query.toString();

            const response = await this.getAuthenticatedJSON(pageURI);

            yield response;

            const nextPageToken = response.nextPageToken;
            if (nextPageToken == null || nextPageToken == "" || nextPageToken == pageToken) {
                finished = true;
            }

            pageToken = nextPageToken;
        }
    }

    /*
     * Cloudy presentations
     */
    async listPresentations() {
        return this._getV2SyncRecordsFrom('pagePresentations', false);
    }
    //
    //
    //
    async updatePropertiesOfRecordAtLocation(updatedProps, serviceLocation) {
        var record = await this._getSyncRecordFrom(serviceLocation);
        var updatedAssetFingerprint = false;
        for (var key in updatedProps) {
            var value = updatedProps[key];
            record.encodeProperty(key, value);
            if (key.endsWith("AssetFingerprint") == true) {
                updatedAssetFingerprint = true;
            }
        }

        var result = await this._postSyncRecord(record);

        if (updatedAssetFingerprint == true) {
            await this._resolveDownloadUrlsForRecords([result]);
        }

        return result;
    }
    async deleteRecordAtLocation(serviceLocation) {
        var record = await this._getSyncRecordFrom(serviceLocation);
        return this._deleteSyncRecords([record]);
    }
    async undeleteRecordAtLocation(serviceLocation) {
        var record = await this._getSyncRecordFrom(serviceLocation, true);
        return this._undeleteSyncRecords([record]);
    }
    /*
     * Create a new presentation and return the cloudy record.
     * @param {string} named - The name of the presentation.
     * @param {string} type - The optional type of the presentation,
     * used for Presentation.Typed.
     * @param {Date} lastViewed - An optional timestamp.
     */
    async createNewPresentation(named, type = null, lastViewed = null) {
        const id = createUUID();
        const timestamp = lastViewed || this.timeForSyncEvent();

        const properties = {
            lastViewed: timestamp,
            name: named
        };

        if (type != null) {
            properties.type = type;
        }

        const presentation = this._newSyncRecord(
            mmhmmAPI.CloudyCollectionTypes.ModernPresentation,
            id,
            id, // parent ID, presentations are their own parents??
            timestamp,
            properties
        );

        return this._postSyncRecord(presentation);
    }
    /*
     * Room helpers
     */
    async retrieveRoomCatalog() {
        var roomCatalog = this._roomCatalog;
        if (roomCatalog != null) {
            return roomCatalog;
        }
        var url = "/rooms";
        if (gCurrentLocale != null) {
            // Request a localized catalog
            url += "?locale=" + gCurrentLocale;
        }
        roomCatalog = await this.getAuthenticatedJSON(url);
        if (roomCatalog != null) {
            this._roomCatalog = roomCatalog;
        }
        return roomCatalog;
    }
    async roomCatalogEntryWithID(id, bypassLoad = false) {
        var roomCatalog = null;
        if (bypassLoad != true) {
            roomCatalog = await this.retrieveRoomCatalog();
        }
        else {
            roomCatalog = this._roomCatalog;
        }

        if (roomCatalog == null) {
            return null;
        }
        var rooms = roomCatalog.rooms;
        if (rooms == null) {
            return null;
        }
        id = id.toLowerCase();
        return rooms.find(a => a.id == id);
    }
    async retrieveCustomRooms() {
        return this._getSyncRecordsFrom('rooms');
    }
    async customRoomWithID(roomID, includeTrashed=false) {
        var endpoint = `rooms/${roomID}`;
        return this._getSyncRecordFrom(endpoint, includeTrashed);
    }
    async deleteCustomRoom(room) {
        var serverRoom = await this.customRoomWithID(room.identifier);
        if (serverRoom == null) {
            return;
        }
        return this._deleteSyncRecords([serverRoom]);
    }
    async undeleteCustomRoom(room) {
        var serverRoom = await this.customRoomWithID(room.identifier, true);
        if (serverRoom == null) {
            return;
        }
        return this._undeleteSyncRecords([serverRoom]);
    }
    async updateCustomRoom(room) {
        var serverRoom = await this.customRoomWithID(room.identifier);
        if (serverRoom == null) {
            return false;
        }

        var changed = false;
        var localProps = room.toCloudy();
        for (var key in localProps) {
            var value = localProps[key];
            if (serverRoom.encodeProperty(key, value) == true) {
                changed = true;
            }
        }

        // Historically custom rooms didn't support thumnbnails on the
        // service.  This was added in ~ March 2023.  We'll upload
        // thumbnails for rooms created before this time...
        var thumbnailAsset = room.thumbnailAsset;
        var thumbnailAssetFingerprint = null;
        var blob = null;
        if (thumbnailAsset != null) {
            thumbnailAssetFingerprint = thumbnailAsset.fingerprint;
            if (thumbnailAssetFingerprint == null) {
                blob = await thumbnailAsset.openAsBlob();
                if (blob != null) {
                    thumbnailAssetFingerprint = await FingerprintForBlob(blob);
                }
            }
        }

        if (serverRoom.decodeProperty("thumbnailAssetFingerprint", String, null) != thumbnailAssetFingerprint) {
            serverRoom.encodeProperty("thumbnailAssetFingerprint", thumbnailAssetFingerprint);
            changed = true;
        }
        else if (serverRoom.decodeAssetReference(this, {fingerprint: thumbnailAssetFingerprint}, true) == null) {
            changed = true;
        }

        try {
            if (changed == false) {
                return serverRoom;
            }

            var record = await this._postSyncRecord(serverRoom);
            if (blob == null) {
                return record;
            }

            var fingerprintAndBlob = {};
            fingerprintAndBlob[thumbnailAssetFingerprint] = blob;
            console.log("will upload: ", fingerprintAndBlob);

            var records = await this._uploadBlobsForCloudyRecords(fingerprintAndBlob, [record], null);
            if (records.length == 1) {
                return records[0];
            }
        }
        finally {
            if (blob != null) {
                thumbnailAsset.close();
            }
        }
    }
    async addCustomRoom(room, cancelSignal=null, onProgress=null) {
        const identifier = room.identifier;
        const timestamp = this.timeForSyncEvent();

        const props = room.toCloudy();

        const blobs = {};
        let asset = null;

        if (props.catalogueIdentifier == null) {
            asset = room.asset;
            if (asset == null) {
                console.error("Can't save a custom room w/o a catalog ID or asset!", room);
                return null;
            }

            const assetPropertyMap = {
                backgroundAssetFingerprint: asset,
            }

            const thumbnailAsset = room.thumbnailAsset;
            if (thumbnailAsset != null) {
                assetPropertyMap.thumbnailAssetFingerprint = thumbnailAsset;
            }

            for (let propName in assetPropertyMap) {
                const asset = assetPropertyMap[propName];
                if (IsKindOf(asset, LocalAsset) == false) {
                    console.error("Unexpected asset type", asset);
                }

                const blob = await asset.openAsBlob();
                const fingerprint = await FingerprintForBlob(blob);
                blobs[fingerprint] = blob;
                props[propName] = fingerprint;
            }
        }

        let title = props.title;
        if (title != null) {
            title = title.trim();
            if (title.length > 0) {
                props.title = title;
            }
        }

        const roomRecord = this._newSyncRecord(
            mmhmmAPI.CloudyCollectionTypes.Room,
            identifier, // itemID
            identifier, // parentID
            timestamp,
            props
        );
        if (asset == null) {
            delete roomRecord.assetReferences;
        }

        let serverRecord = null;
        try {
            serverRecord = await this._postSyncRecord(roomRecord, cancelSignal);
            if (asset == null) {
                return serverRecord;
            }

            const records = await this._uploadBlobsForCloudyRecords(blobs, [serverRecord], onProgress, cancelSignal);
            if (records.length == 1) {
                return records[0];
            }
            return null;
        }
        catch (err) {
            if (serverRecord != null) {
                // If we got a record back from posting, then presumably this error
                // occurred while uploading the blob.  This record is useless without
                // the blob, so go ahead and delete it.  Otherwise we'll get this
                // record back in the future, but won't have the asset, and will
                // have to filter those out.
                this._deleteSyncRecord(serverRecord);
            }
            throw err;
        }
        finally {
            if (asset != null) {
                asset.close();
            }
        }
    }

    /*
     * Cognito / S3 Pre-signed URL helpers
     */
    async newPreSignedURL(s3info, method = "PUT", filename) {
        let bucketName = s3info.bucketName;
        let keyPrefix = s3info.keyPrefix;
        let clientRegion = s3info.region;

        if (keyPrefix.endsWith("/") == true) {
            keyPrefix = keyPrefix.substring(0, keyPrefix.length - 1);
        }

        if (keyPrefix.startsWith("/") == true) {
            keyPrefix = keyPrefix.substring(1);
        }
        if (filename.startsWith(keyPrefix) == true) {
            filename = filename.substring(keyPrefix.length);
        }
        if (filename.startsWith("/") == true) {
            filename = filename.substring(1);
        }

        let path = keyPrefix + "/" + filename;
        let host = bucketName + ".s3." + clientRegion + ".amazonaws.com";
        let url = new URL("https://" + host + "/" + path);

        let credentials = s3info.credentials;
        let result = await MakePresignedRequest(
            bucketName,
            clientRegion,
            credentials.accessKeyId ?? credentials.AccessKeyId,
            credentials.secretAccessKey ?? credentials.SecretAccessKey,
            credentials.sessionToken ?? credentials.SessionToken,
            url,
            method,
            3600
        );
        let query = result.query;
        for (var key in query) {
            url.searchParams.set(key, query[key]);
        }
        return {url, headers: result.headers};
    }
    /*
     * mmhmm TV helpers
     */
    makeVideoAPIURL(videoID, needsAuthentication) {
        if (videoID == null) {
            console.error("Can't make a URL without a videoID");
            return null;
        }

        var videoURL = "";
        if (needsAuthentication == true) {
            videoURL += "/users/me/"
        }
        else {
            videoURL += "/public/"
        }
        videoURL += "playback/";
        videoURL += videoID;
        videoURL += "/view";
        return videoURL;
    }
    async retrieveVideoData(videoID) {
        if (videoID == null) {
            console.error("Can't request video data w/o an ID");
            debugger;
            return null;
        }

        var accessToken = await this.getAccessToken();
        var apiURL = this.makeVideoAPIURL(videoID, (accessToken != null));
        var request = await this.makeRequest("GET", apiURL, null, accessToken);

        //
        // Check status code, handle errors
        //
        var status = request.status;
        if (Math.floor(status / 100) == 2) {
            var response = request.response;
            var payload = null;
            try {
                payload = JSON.parse(response);
            }
            catch (err) {
                gSentry.exception(err);
                console.error("Error parsing manifest response", err);
                throw "An unknown error occurred trying to parse the Airtime video response.";
            }

            if (payload.playbackStatus != "READY") {
                throw "It doesn't appear the Airtime video link is ready for viewing yet.";
            }

            return payload;
        }

        var reauth = false;

        if (status == 401 && accessToken != null) {
            // 401 appears to mean the auth token is expired,
            // so for now we'll just ask for a new one and try again
            reauth = true;
        }
        else if (status == 404) {
            // 404 could mean the video doesn't exist
            // but it could also mean we're not properly authenticated
            if (accessToken != null) {
                throw "The requested video may not exist or is unavailable for your account.";
            }
            else {
                reauth = true;
            }
        }

        if (reauth == false) {
            throw "An unknown error " + request.status + " occurred trying to load Airtime video.";
        }

        try {
            var result = await this.performAuthentication();
            if (result == null) {
                // Person probably closed the child window
                return null;
            }

            return await this.retrieveVideoData(videoID);
        }
        catch (err) {
            gSentry.exception(err);
            console.error("Caught ", err);
            // intentionally blank
        }

        throw "An unknown error occurred trying to authenticate.";
    }
    async retrieveVideoManifest(videoID) {
        var accessToken = await this.getAccessToken();
        var apiURL = this.makeVideoAPIURL(videoID, (accessToken != null));
        var manifestURL = apiURL + "/manifest";

        var payload = await this.makeRequest("GET", manifestURL, null, accessToken, {responseType: 'json'});

        var manifest = payload.manifest.map(a => {
            var thumbnail = null;
            var thumbnails = a.thumbnails;
            if (thumbnails != null && thumbnails.length > 0) {
                thumbnail = thumbnails[0];
            }
            return {
                title: a.title,
                instance: a.instance,
                timestamp: a.timestamp,
                thumbnail: thumbnail,
            }
        });
        return manifest;
    }
    async logVideoAnalyticsEvent(videoID, eventType, playbackStartTime, videoDuration, playbackSpeed, playbackProgress) {
        var accessToken = await this.getAccessToken();
        var timestamp = Date.now();

        var analyticsURL = this.getAnalyticsURLForVideo(videoID);
        var body = {
            start_timestamp: playbackStartTime,
            events: [
                {
                    type: eventType,
                    duration: videoDuration,
                    speed: playbackSpeed,
                    progress: playbackProgress,
                    timestamp: timestamp,
            }, ],
        };
        if (this.isAuthenticated == false) {
            body.anonymous_viewer_id = this.user.id;
        }

        return this.makeRequest("PUT", analyticsURL, body, accessToken);
    }
    getAnalyticsURLForVideo(videoID) {
        var analyticsURL = "";
        if (this.isAuthenticated == true) {
            analyticsURL += "/users/me/"
        }
        else {
            analyticsURL += "/public/";
        }
        analyticsURL += "playback/";
        analyticsURL += videoID;
        analyticsURL += "/event/capture";
        return analyticsURL;
    }

    /**
     * Calls the sync import file endpoint (/users/me/sync/records/import/file) to retrieve S3 upload information.
     *
     * @param {String=} presentationID If specified, the presentation where the imported files will be stored.
     *                                 When unspecified a new presentation is created.
     * @param {String=} insertAfterID If a presentation is specified, the imported slides will be inserted after
     *                                the slide with this ID.  If unspecified, the imported slides are inserted
     *                                at the end of the presentation.
     *
     * @returns {s3info} S3 upload information
     */
    async initiateFileImport(presentationID, insertAfterID) {
        let uri = `${this.cloudyBaseURI}/records/import/file?`;
        uri += "type=" + mmhmmAPI.CloudyCollectionTypes.ModernPresentation;
        uri += "&userId=" + this.user.id;

        if (presentationID != null) {
            uri += "&presentationId="+presentationID;
            if (insertAfterID != null) {
                uri += "&insertAfterId="+insertAfterID;
            }
        }

        var s3info = await this.makeAuthenticatedRequest("POST", uri, null, {responseType: "json"});
        return s3info;
    }

    async getIDToken() {
        // getAccessToken refreshes the token if necessary.
        await this.getAccessToken();
        if (this.accessToken) {
            return this.accessToken.idToken;
        } else {
            return null;
        }
    }

    getResponseErrorMessage(response) {
        if (response == null) {
            return null;
        } else if (response.Message != null) {
            return response.Message;
        } else if (response.message != null) {
            return response.message;
        }
        return null;
    }

    getOrigin() {
        return this.urlBuilder.getOrigin();
    }

    // Prototyping functionality only!
    // This code should never be deployed to development, alpha or production
    async createUser(email, password) {
        if (this.environment != "development-seth") {
            throw new Error("This function is for development only");
        }

        const url = `${this.baseURL}/auth/users`;
        const body = {
            email,
            password,
            clientId: this.clientID,
        };

        const result = await this.makeRequest("POST", url, body, null, {});
        const payload = this.processAuthRequest(result, false);
        console.log("Created new user", payload.user.id)
    }

    // Prototyping functionality only!
    // This code should never be deployed to development, alpha or production
    async signIn(email, password) {
        if (this.environment != "development-seth") {
            throw new Error("This function is for development only");
        }

        const url = `${this.baseURL}/auth/tokens`;
        const body = {
            email,
            password,
            clientId: this.clientID,
        };

        const result = await this.makeRequest("POST", url, body, null, {});
        const payload = this.processAuthRequest(result, false);
        console.log("Signed in as user", payload.user.id)
    }

    async createDemoLook() {
        const uri = "/public/looks";
        return this.makePublicRequest("POST", uri, null, {responseType: 'json'})
    }

    async getDemoLook(id) {
        const uri = `/public/looks/${id}`;
        return this.makePublicRequest("GET", uri, null, {responseType: 'json'})
    }

    async getDemoLookJSON(url) {
        return this.makePublicRequest("GET", url, null, {responseType: 'json'});
    }

    async getDemoLookBlob(url) {
        const response = await fetch(url);
        return response.blob();
    }

    async removeDemoLook() {
        // Patch the user to unset the demo look field
        const body = {
            unclaimedLookId: "",
        };
        this.patchAuthenticatedJSON("/users/me", body);
    }
}

mmhmmAPI.Notifications = Object.freeze({
    AuthenticationChanged: "mmhmmAPI.AuthenticationChanged",
    PresentationsChanged: "mmhmmAPI.PresentationsChanged",
    RoomsChanged: "mmhmmAPI.RoomsChanged"
});

mmhmmAPI.TalkChannelAdmitStatus = Object.freeze({
    None: 0,
    Waiting: 1,
    Admitted: 2,
    Denied: 3
});

mmhmmAPI.CloudyCollectionTypes = Object.freeze({
    Room: "room",
    // Current
    ModernPresentation: "pagePresentation",
    ModernSlide: "page",
    Media: "media",
    Bridge: "bridge",
    Presenter: "presenter",
    // Legacy
    LegacySlide: "slide",
    LegacyPresentation: "presentation",
    Scene: "scene",
});

mmhmmAPI.signOutOfEndpoint = function(endpoint, userInitiated = false) {
    var endpoints = this.endpoints;
    if (endpoints == null) {
        return;
    }
    var index = endpoints.indexOf(endpoint);
    if (index != -1) {
        endpoints.splice(index, 1);
    }
    endpoint.signOut();
    Analytics.Log("user.signout");

    NotificationCenter.default.postNotification(
        mmhmmAPI.Notifications.AuthenticationChanged,
        this,
        { userInitiated }
    );
}

mmhmmAPI.getAuthenticatedEndpoint = function() {
    var endpoints = this.endpoints;
    if (endpoints == null) {
        return null;
    }
    return endpoints.find(endpoint => endpoint.isAuthenticated);
}

mmhmmAPI.getEndpointForEnvironment = function(env) {
    var endpoints = this.endpoints;
    if (endpoints == null) {
        endpoints = [];
        this.endpoints = endpoints;
    }

    var endpoint = endpoints.find(a => a.environment == env);
    if (endpoint == null) {
        endpoint = new mmhmmAPI(env);
        endpoints.push(endpoint);
    }
    return endpoint;
}

mmhmmAPI.defaultEndpoint = function() {
    var defaultEnvironment = null;
    if ('defaultEnvironment' in this) {
        defaultEnvironment = this.defaultEnvironment;
    }
    else {
        const environmentOverride = localStorage.getItem("environment");
        const hostname = window.location.hostname;
        const isLocalhost = hostname == "localhost";

        if (isLocalhost && environmentOverride) {
            // A developer chose the environment to use explicitly
            defaultEnvironment = environmentOverride;
        }
        else if (isLocalhost) {
            defaultEnvironment = "dev";
        }
        else if (hostname.endsWith("-mmhmm.vercel.app")) {
            // Vercel preview deploys always go against dev
            defaultEnvironment = "dev";
        }
        else if (hostname == "dev.airtimetools.com" || hostname == "dev.airtime.com") {
            // Handle the Camera demo running on the dev deploy of the marketing website
            defaultEnvironment = "dev";
        }
        else {
            // Handle mmhmm.app domains: ooo[-environment].mmhmm.app
            const matches = hostname.match(/^[a-z0-9]*-([a-z]*)\.mmhmm.app$/);
            if (matches != null && matches.length > 0) {
                defaultEnvironment = matches[1];
            } else {
                // Handle airtimetools.com domains: app[.environment].airtimetools.com
                const matches = hostname.match(/^app\.([a-z]*)\.airtimetools\.com$/);
                if (matches != null && matches.length > 0) {
                    defaultEnvironment = matches[1];
                }
                // Production has no env-specific subdomain so defaultEnvironment is null
            }
        }
        this.defaultEnvironment = defaultEnvironment;
    }
    return mmhmmAPI.getEndpointForEnvironment(defaultEnvironment);
}

mmhmmAPI.NotFoundErrorMessage = "An item with the specified identifier could not be found";
