//
//  cloudy_record.js
//  mmhmm
//
//  Created by Steve White on 2/8/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

class CloudyRecord {
    constructor(record, timestamp) {
        Object.assign(this, record);

        if (timestamp != null) {
            this.__timestamp = this.stringifyDate(timestamp);
        }

        const collectionTypes = mmhmmAPI.CloudyCollectionTypes;
        const legacyTypes = [
            collectionTypes.LegacySlide, collectionTypes.LegacyPresentation,
            collectionTypes.Scene, collectionTypes.Room,
        ];
        this.__legacy = (legacyTypes.indexOf(this.collection) != -1);
    }
    copy() {
        var record = DeepCopy(this);
        var copyTime = this.stringifyDate(new Date());
        var properties = record.properties;
        for (var key in properties) {
            var val = properties[key];
            delete val.serverUpdatedTime;
            val.clientUpdatedTime = copyTime;
        }
        return new CloudyRecord(record);
    }
    copyPropertiesFrom(other) {
        var ours = this.properties;
        var theirs = other.properties;
        var changed = false;
        for (var key in ours) {
            var theirVal = theirs[key];
            if (theirVal == null) {
                delete ours[key];
                changed = true;
                continue;
            }
            changed |= this.encodeProperty(key, theirVal.value);
        }
        return !!changed;
    }
    equals(other) {
        if (IsKindOf(other, CloudyRecord) == false) {
            return false;
        }

        var keyFilter = (key) => {
            if (key.startsWith("__") == true) {
                return false;
            }
            else if (key == "clientUpdatedTime" ||
                     key == "serverUpdatedTime")
            {
                return false;
            }
            return true;
        };

        return EqualObjects(this, other, keyFilter);
    }
    /*
     * Assets
     */
    encodeAssetReference(asset, key) {
        if (asset == null) {
            this.encodeProperty(key + "AssetFingerprint", null, true);
            return;
        }

        var assetReferences = this.assetReferences;
        if (assetReferences == null) {
            assetReferences = [];
            this.assetReferences = assetReferences;
        }

        var fingerprint = asset.fingerprint;
        var match = assetReferences.find(ref => ref.fingerprint == fingerprint);
        if (match != null) {
            return;
        }

        var assetRef = asset.ref;
        if (assetRef != null) {
            assetReferences.push(asset.ref);
        }
        else {
            // XXX: should we push a fake thing here??
        }

        this.encodeProperty(key + "AssetFingerprint", fingerprint);
    }
    decodeAssetReference(endpoint, {key, fingerprint}, requireUploaded=false) {
        // XXX: should endpoint just be passed in the constructor?
        var assetRefs = this.assetReferences;
        if (assetRefs == null) {
            return;
        }

        if (key != null) {
            var propName = key + "AssetFingerprint";
            fingerprint = this.decodeProperty(propName, String, null);
            if (fingerprint == null) {
                return null;
            }
        }

        if (fingerprint != null && requireUploaded == true) {
            var match = assetRefs.find(ref => ref.fingerprint == fingerprint);
            if (match == null && requireUploaded == true) {
                // Due to a bug on 2014-01-12, records came down with an empty assetReferences set
                // If we were able to decode a fingerprint out of the properties and we don't
                // have assetReferences, create a dummy record to allow things to work as expected
                const downloadUrl = new URL(`/users/${endpoint.user.id}/sync/assets/${fingerprint}`, endpoint.baseURL);
                match = {
                    fingerprint: fingerprint,
                    uploaded: true,
                    downloadUrl: downloadUrl.toString(),
                };
                assetRefs.push(match);
            }
            if (match.uploaded == false) {
                gSentry.messageWithContext(`Found matching ${key} asset, but uploaded is false`, this.id, { fingerprint });
            }
            if (match == null || match.uploaded == false) {
                return null;
            }
        }

        try {
            return new CloudyAsset(endpoint, assetRefs, fingerprint, this.id);
        }
        catch (err) {
            console.error("Couldn't parse asset refs: ", assetRefs, err);
            return null;
        }
    }
    /*
     * Properties
     */
    stringifyDate(date) {
        return date.toJSON().replace(/\.[0-9]{3}Z$/, "Z");
    }
    encodeProperty(key, value, force = false) {
        var encoded = null;

        if (value != null) {
            var valueType = value.constructor;
            if (valueType == Date) {
                value = this.stringifyDate(value);
            }
            else if (valueType == SlideSortKey) {
                value = value.toJSON();
            }
            else if (this.__legacy == true && (valueType == Array || valueType == Object)) {
                value = JSON.stringify(value);
            }
            encoded = value;
        }

        var properties = this.properties;
        if (properties == null) {
            properties = {};
            this.properties = properties;
        }

        if (force != true && properties[key] == null && value == null) {
            // Nothing to do: server doesn't know the value,
            // and we don't have a value to tell it
            return false;
        }
        if (properties[key] != null) {
            var unchanged = true;
            var existingVal = properties[key].value;
            if (this.__legacy == true) {
                unchanged = (existingVal == encoded);
            }
            else {
                unchanged = EqualObjects(existingVal, encoded);
            }
            if (unchanged == true) {
                // Nothing to do: The value hasn't changed
                return false;
            }
        }

        var timestamp = this.__timestamp;
        if (timestamp == null) {
            var now = Date.now();
            // Round down the milliseconds due to:
            // ClientError: clientUpdatedTime is set to a future time (clientUpdatedTimeMilliseconds - clientNowMilliseconds == 1650906909004 - 1650906909000 == 4)
            var rounded = Math.floor(now / 1000) * 1000;
            timestamp = this.stringifyDate(new Date(rounded));
            this.__timestamp = timestamp;
        }

        // How would we delete a value?
        // can we just delete properties[key] ??
        // send it without a value entry?
        var entry = { clientUpdatedTime: this.__timestamp };
        if (force == true || encoded != null) {
            entry.value = encoded;
        }
        properties[key] = entry;
        return true;
    }
    decodeValue(key, type, defaultValue = undefined) {
        return this._decodeFrom(this, key, type, defaultValue);
    }
    decodeProperty(key, type, defaultValue = undefined) {
        return this._decodeFrom(this.properties, key, type, defaultValue);
    }
    _decodeFrom(source, key, type, defaultValue = undefined) {
        var defaultReturnValue = function() {
            if (typeof defaultValue != 'undefined') {
                return defaultValue;
            }
            return new type();
        }

        if (source == null) {
            return defaultReturnValue();
        }

        var val = source[key];
        if (val == null) {
            return defaultReturnValue();
        }
        if (source != this) {
            val = val.value;
        }
        if (val == null) {
            return defaultReturnValue();
        }

        if (type == String) {
            if (typeof val == 'string') {
                return val;
            }
            return defaultReturnValue();
        }
        else if (type == Number) {
            if (typeof val == 'number') {
                return val;
            }
            return defaultReturnValue();
        }
        else if (type == SlideSortKey || type == Date) {
            // Early versions of the web app JSON encoded the date string
            // Fix that if we still encounter it, which seems exceedingly
            // unlikely, but...
            // And something is currently double encoding the slide sort keys..
            if (val[0] == '"') {
                val = JSON.parse(val);
            }

            if (type == SlideSortKey) {
                return new SlideSortKey(val);
            }

            var date = new Date(val);
            // Don't return invalid Dates...
            if (isNaN(date.getSeconds()) == true) {
                date = new Date(0);
            }
            return date;
        }
        else if (this.__legacy == false) {
            if (val.constructor == Array) {
                return Array.from(val);
            }
            else if (val.constructor == Object) {
                return Object.assign({}, val);
            }
            return val;
        }
        return JSON.parse(val);
    }
    hasProperty(named) {
        return this.properties?.hasOwnProperty(named) ?? false;
    }
    toLocalJSON() {
        var r = {};
        for (var key in this) {
            if (key.startsWith("__") == true) {
                continue;
            }
            var val = this[key];
            if (val != null && val.constructor == Date) {
                val = this.stringifyDate(val);
            }
            r[key] = val;
        }
        return r;
    }
    toJSON() {
        const json = this.toLocalJSON();
        const badKeys = [
            "assetReferences", "collectionSortKey", "collectionStatusSortKey",
            "deletionBucket", "version"
        ];
        badKeys.forEach(key => delete json[key]);

        const properties = this.properties;
        for (let key in properties) {
            const value = properties[key];
            delete value.serverUpdatedTime;
        }

        return json;
    }
}
