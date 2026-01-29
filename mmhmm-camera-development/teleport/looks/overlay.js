//
//  looks/overlay.js
//  mmhmm
//
//  Created by Seth Hitchings on 6/26/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LookOverlay {

    #colorizable = false;

    constructor(title, fileNameKey, fingerprint, directory = "assets/looks/frames") {
        this.title = title;
        this.directory = directory;
        this.fileNameKey = fileNameKey;
        this.defaultOpacity = 1.0;
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

    setDefaultOpacity(opacity) {
        this.defaultOpacity = opacity;
        return this;
    }

    setColorizable(colorizable) {
        this.#colorizable = colorizable;
        return this;
    }

    get isColorizable() {
        return this.#colorizable;
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
}
