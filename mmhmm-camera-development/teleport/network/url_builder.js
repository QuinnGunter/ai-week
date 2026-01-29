//
//  url_builder.js
//  mmhmm
//
//  Created on 3/28/2025.
//  Copyright © 2025 mmhmm, inc. All rights reserved.
//

/**
 * Helper class for constructing uniform URLs across our various app domains,
 * environments and platforms.

 */
class URLBuilder {
    /**
     * Creates a URL builder for the given environment
     * @param {string|null} environment - The environment (dev, stage, null for prod)
     * @param {Object} options - Optional configuration
     * @param {boolean} options.isAirtime - Direct override for domain type
     * @param {string} options.hostname - Hostname to use for domain detection
     */
    constructor(environment, options = {}) {
        this.environment = environment;

        // Allow direct override
        if (options.isAirtime !== undefined) {
            this.isAirtime = options.isAirtime;
        } else if (options.hostname) {
            // Use hostname to determine domain pattern
            this.isAirtime = options.hostname.includes("airtimetools.com");
        } else {
            // Default to airtimetools.com if no hostname provided
            this.isAirtime = true;
        }

        // Base domain for all URLs
        this.domain = this.isAirtime ? "airtimetools.com" : "mmhmm.app";
    }

    /**
     * Helper to build urls using the URL class
     * @param {Object} options - URL building options
     * @param {string} options.hostname - Hostname (e.g., 'signin.mmhmm.app', 'ooo.mmhmm.app')
     * @param {string} options.protocol - Protocol (e.g., 'https', 'wss')
     * @param {string[]} options.pathSegments - Path segments to include
     * @param {Object} options.searchParams - Query parameters
     * @returns {string} The constructed URL
     * @private
     */
    _buildURL({ hostname, protocol = "https", pathSegments = [], searchParams = {} }) {
        const env = this.environment;

        // Create proper URL object
        const url = new URL(`${protocol}://${hostname}/`);

        // Add path segments
        if (pathSegments.length > 0) {
            url.pathname += pathSegments.filter(Boolean).join("/");
        }

        // Add query parameters
        Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, value);
            }
        });

        return url.toString();
    }

    /**
     * Builds a hostname with the correct format based on the domain pattern
     * @param {string|null} env - The environment (dev, stage, null for prod)
     * @param {string} subdomain - The subdomain to use (default: "app" for airtimetools.com, "ooo" for mmhmm.app)
     * @returns {string} The formatted hostname
     * @private
     */
    _buildHostname(env, subdomain = this.isAirtime ? "app" : "ooo") {
        let hostname;

        if (this.isAirtime) {
            // For airtimetools.com: subdomain[.env].airtimetools.com
            hostname = `${subdomain}${env ? "." + env : ""}.${this.domain}`;
        } else {
            // For mmhmm.app style:
            hostname = `${subdomain}${env ? "-" + env : ""}.${this.domain}`;
        }
        return hostname;
    }

    /**
     * Builds an API hostname with the correct format
     * @param {string|null} env - The environment (dev, stage, null for prod)
     * @returns {string} The formatted API hostname
     * @private
     */
    _buildApiHostname(env) {
        // TODO: we continue to use mmhmm.app domains for APIs until we fully transition
        return `${env ? env + "-" : ""}api.mmhmm.app`;
    }

    /**
     * Builds a WebSocket hostname with the correct format
     * @param {string|null} env - The environment (dev, stage, null for prod)
     * @returns {string} The formatted WebSocket hostname
     * @private
     */
    _buildWsHostname(env) {
        // TODO: we continue to use mmhmm.app domains for APIs until we fully transition
        return `${env ? env + "-" : ""}ws.mmhmm.app`;
    }

    /**
     * Builds an API v2 hostname with the correct format
     * @param {string|null} env - The environment (dev, stage, null for prod)
     * @returns {string} The formatted API v2 hostname
     * @private
     */
    _buildApiV2Hostname(env) {
        // TODO: we continue to use mmhmm.app domains for APIs until we fully transition
        return `api.${env ?? "prod"}.cloud.mmhmm.app`;
    }

    /**
     * Builds the hostname for our public facing help center.
     * @returns {string} The formatted Help Center hostname
     */
    _buildHelpCenterHostname() {
        return "help.airtime.com";
    }

    /**
     * Builds the hostname for our community website.
     * @returns {string} The formatted Community hostname
     */
    _buildCommunityHostname() {
        return "community.airtime.com";
    }

    /**
     * Generate authentication URL
     * @param {string} platform - The platform identifier (mac-hybrid, windows-hybrid, etc.)
     * @param {string} lastPathComponent - Optional path component (sign-in, sign-up, etc.)
     * @param {string} locale - Optional locale for the URL
     * @returns {string} The URL
     */
    getSignInURL(platform, lastPathComponent, locale) {
        let pathSegments = [];

        if (locale) {
            pathSegments.push(locale);
        }

        pathSegments.push(platform);

        if (lastPathComponent) {
            pathSegments.push(lastPathComponent);
        }

        const subdomain = this.isAirtime ? "signin.app" : "signin.ooo";
        return this._buildURL({
            hostname: this._buildHostname(this.environment, subdomain),
            pathSegments,
            searchParams: {
                utm_content: "camera"
            }
        });
    }

    /**
     * Generate URL for account settings
     * @param {string} path - Optional sub-path to append
     * @returns {string} The URL
     */
    getAccountURL(path = "") {
        const pathSegments = ["account"];

        if (path) {
            // Remove leading slash if present
            path = path.startsWith("/") ? path.substring(1) : path;
            pathSegments.push(path);
        }

        return this._buildURL({
            hostname: this._buildHostname(this.environment),
            pathSegments
        });
    }

    /**
     * Generate URL for video playback
     * @param {string} videoID - The video ID
     * @returns {string} The URL
     */
    getVideoURL(videoID) {
        return this._buildURL({
            hostname: this._buildHostname(this.environment),
            pathSegments: [videoID]
        });
    }

    /**
     * Generate URL for our "Learn" tutorial videos
     * @returns {string} The URL
     */
    getTutorialVideosURL() {
        return this._buildURL({
            hostname: this._buildHostname(this.environment),
            pathSegments: ["learn"]
        });
    }

    /**
     * Generate URL for sharing a copy of a presentation
     * @param {string} exportId - the ID of the exported presentation
     * @returns {string} The URL
     */
    getPresentationShareURL(exportId) {
        return this._buildURL({
            hostname: this._buildHostname(this.environment),
            pathSegments: ["presentation", exportId]
        });
    }

    /**
     * Generate URL for sharing a copy of a slide
     * @param {string} exportId - the ID of the exported slide
     * @returns {string} The URL
     */
    getSlideShareURL(exportId) {
        return this._buildURL({
            hostname: this._buildHostname(this.environment),
            pathSegments: ["look", exportId]
        });
    }

    /**
     * Generate a URL for storing a look created in the Camera demo app
     * @param {String} id
     * @returns {string} The URL
     */
    getBuildALookURL(id) {
        return this._buildURL({
            hostname: this._buildHostname(this.environment),
            pathSegments: ["build-a-look"],
            searchParams: id ? { lookId: id } : {},
        });
    }

    /**
     * Generate URL for the help center homepage
     * @returns {string} The URL
     */
    getHelpCenterBaseURL() {
        return this._buildURL({
            hostname: this._buildHelpCenterHostname(),
            pathSegments: ["hc", "en-us"]
        });
    }

    /**
     * Generate the URL for our "contact us" support page.
     * @returns {string} The URL
     */
    getContactSupportURL() {
        return this._buildURL({
            hostname: this._buildHelpCenterHostname(),
            pathSegments: ["hc", "en-us", "requests", "new"]
        });
    }

    /**
     * Generate the URL for our "community" website.
     * @returns {string} The URL
     */
    getCommunityBaseURL() {
        return this._buildURL({
            hostname: this._buildCommunityHostname(),
            pathSegments: ["c", "start-here"]
        });
    }

    /**
     * Generate WebSocket URL
     * @param {Object} options - Additional WebSocket options
     * @param {string} options.token - Token for authentication
     * @returns {string} The URL
     */
    getWebSocketURL(options = {}) {
        return this._buildURL({
            protocol: "wss",
            hostname: this._buildWsHostname(this.environment),
            searchParams: options
        });
    }

    /**
     * Generate API URL
     * @returns {string} The URL
     */
    getAPIBaseURL() {
        return `https://${this._buildApiHostname(this.environment)}`;
    }

    /**
     * Generate API v2 URL
     * @returns {string} The URL
     */
    getAPIV2BaseURL() {
        return `https://${this._buildApiV2Hostname(this.environment)}`;
    }

    /**
     * Generate origin URL for cross-domain communication
     * This is used primarily for iframe communication
     * @returns {string} The origin URL
     */
    getOrigin() {
        return `https://${this._buildHostname(this.environment)}`;
    }
}
