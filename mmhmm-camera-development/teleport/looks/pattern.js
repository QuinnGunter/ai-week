//
//  looks/pattern.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/7/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LookPattern {

    #colorizable = false;

    constructor(title, fileNameKey, maxOpacity, fingerprint, directory = "assets/looks/patterns") {
        this.title = title;
        this.directory = directory;
        this.fileNameKey = fileNameKey;
        this.defaultOpacity = 0.5;
        this.maxOpacity = maxOpacity;
        this.fingerprint = fingerprint;
        this.previousFingerprints = [];
    }

    get thumbnailUrl() {
        // For colorizable SVGs, just use the asset
        if (this.isColorizable) {
            return this.assetUrl;
        }
        return `${this.directory}/${this.fileNameKey}-thumb.png`;
    }

    get assetUrl() {
        const suffix = this.isColorizable ? "svg" : "png";
        return `${this.directory}/${this.fileNameKey}.${suffix}`;
    }

    setPreviousFingerprints(fingerprints) {
        // A set of fingerprints that have previously been used for this overlay
        // We need this because we sometimes change the asset associated with the
        // overlay, but want to continue to show the overlay as selected)
        this.previousFingerprints = fingerprints ?? [];
        return this;
    }

    /**
     * @param {string} fingerprint
     * @returns {boolean}
     */
    matchesFingerprint(fingerprint) {
        return this.fingerprint == fingerprint ||
            (this.previousFingerprints && this.previousFingerprints.some(p => p == fingerprint));
    }

    /**
     * @param {Number} opacity
     * @returns {LookPattern}
     */
    setDefaultOpacity(opacity) {
        this.defaultOpacity = opacity;
        return this;
    }

    /**
     * Customize a desired opacity value for a given pattern.
     * See https://github.com/All-Turtles/mmhmm-web/issues/5351 for details.
     *
     * @param {Number} opacity an opacity value between 0 and 1
     * @returns {Number} the opacity value between 0 and 1 to use for the pattern media
     */
    toMediaOpacity(opacity) {
        // Given a desired opacity like 1, return a pattern-specific opacity like 0.5
        return opacity * this.maxOpacity;
    }

    toPatternOpacity(opacity) {
        // Given a pattern specific opacity like 0.5, return a concrete opacity like 1
        return opacity / this.maxOpacity;
    }

    /**
     * @param {boolean} colorizable
     * @returns {LookPattern}
     */
    setColorizable(colorizable) {
        this.#colorizable = colorizable;
        return this;
    }

    /**
     * @returns {boolean}
     */
    get isColorizable() {
        return this.#colorizable;
    }
}
