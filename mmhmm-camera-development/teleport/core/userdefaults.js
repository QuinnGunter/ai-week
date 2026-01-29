//
//  userdefaults.js
//  mmhmm
//
//  Created by Steve White on 8/5/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class UserDefaults {

    static LocalStorageKey = "camera-defaults";
    static CreatorLocalStorageKey = "defaults";

    constructor() {
        let defaults = null;
        try {
            defaults = window.localStorage.getItem(UserDefaults.LocalStorageKey);
            if (defaults == null) {
                // In September 2025 we're migrating to separate defaults entries
                // for Camera and Creator. If we don't have a Camera entry, see if we
                // have a Creator entry. If so, migrate it.
                defaults = window.localStorage.getItem(UserDefaults.CreatorLocalStorageKey);
            }
        } catch (err) {
            console.error("Error reading defaults", err);
        }
        if (defaults != null) {
            try {
                defaults = JSON.parse(defaults);
                this.defaults = Object.assign({}, defaults);
            } catch (err) {
                console.error("Error decoding string", err, defaults);
            }
        }
        if (this.defaults == null) {
            this.defaults = {};
        }
    }

    persist() {
        try {
            window.localStorage.setItem(UserDefaults.LocalStorageKey, JSON.stringify(this.defaults));
        } catch (err) {
            gSentry.exception(err);
            console.error("Error saving defaults", err);
        }
    }

    _persistAfterDelay() {
        if (this.timeout == null) {
            this.timeout = window.setTimeout((evt) => {
                this.timeout = null;
                this.persist();
            }, 1000);
        }
    }

    removeValueForKey(key) {
        const defaults = this.defaults;
        if (key in defaults) {
            delete defaults[key];
            this._persistAfterDelay();
        }
    }

    setValueForKey(value, key) {
        const defaults = this.defaults;
        if (defaults[key] == value) {
            return;
        }
        defaults[key] = value;
        this._persistAfterDelay();
    }

    getValueForKey(key, defaultValue) {
        let val = this.defaults[key];
        if (val == null) {
            val = defaultValue;
        }
        return val;
    }

}

const SharedUserDefaults = new UserDefaults();

UserDefaults.Notifications = Object.freeze({
    DefaultChanged: "UserDefaults.DefaultChanged",
});
