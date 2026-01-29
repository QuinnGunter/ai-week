//
//  utils/screenlock.js
//  mmhmm
//
//  Created by Steve White on 3/14/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

class ScreenLock {
    constructor() {
        this.activeLocks = 0;
    }
    //
    // Public methods
    //
    disableScreenLock() {
        this.activeLocks += 1;
        if (this.activeLocks > 1) {
            // This isn't the first person to ask for a lock,
            // so we don't have any work to do
            return;
        }

        if (navigator.wakeLock == null) {
            // The browser doesn't support the API, so we
            // don't have anything to do
            return;
        }

        this._startVisibilityListener();

        var lock = this.lock;
        if (lock == null) {
            // Lock should always be null in this state, but...
            this._requestNewLock();
        }
    }
    enableScreenLock() {
        this.activeLocks -= 1;
        this.activeLocks = Math.max(this.activeLocks, 0);

        if (this.activeLocks > 0) {
            return;
        }

        this._stopVisibilityListener();

        var lock = this.lock;
        if (lock == null) {
            return;
        }
        this.lock = null;

        lock.release().catch(err => {
            console.error("error releasing lock: ", err);
        });
    }
    //
    // Private methods
    //
    _startVisibilityListener() {
        var visibilityListener = this.visibilityListener;
        if (visibilityListener != null) {
            return;
        }
        visibilityListener = (event) => this._handleVisibilityChangeEvent(event);
        this.visibilityListener = visibilityListener;
        document.addEventListener("visibilitychange", visibilityListener);
    }
    _stopVisibilityListener() {
        var visibilityListener = this.visibilityListener;
        if (visibilityListener == null) {
            return;
        }
        document.removeEventListener("visibilitychange", visibilityListener);
        this.visibilityListener = null;
    }
    _handleVisibilityChangeEvent(event) {
        if (document.visibilityState != "visible") {
            return;
        }
        if (this.lock != null) {
            return;
        }
        this._requestNewLock();
    }
    _handleLockReleaseEvent(event) {
        if (this.activeLocks <= 0) {
            // Nothing in the app is interested in locking
            // the screen anymore, so we can bail out
            return;
        }
        this.lock = null;
        this._requestNewLock();
    }
    async _requestNewLock() {
        if (document.visibilityState == "hidden") {
            // We'll fail to obtain a lock if the app is hidden
            // Hopefully our visibilitychange listener will fire
            // and when we're no longer hidden, we'll request a new
            // lock
            return;
        }

        var lock = null;
        try {
            lock = await navigator.wakeLock.request("screen");
        }
        catch (err) {
            console.error("wakeLockAPI request error: ", err);
        }

        if (lock == null) {
            return;
        }

        lock.addEventListener("release", evt => {
            this._handleLockReleaseEvent(evt);
        }, {once: true})
        this.lock = lock;
    }
}

ScreenLock.shared = new ScreenLock();
