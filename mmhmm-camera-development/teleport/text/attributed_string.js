//
//  attributed_string.js
//  mmhmm
//
//  Created by Steve White on 12/21/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

/**
 * @callback AttributedStringEnumerator
 * @param {number} offset The offset in the string
 * @param {string} string The string at the current offset
 * @param {Object<string, any>} attributes The attributes at the current offset
 * @return {bool} false to stop enumerating, true to continue enumerating
 */

/**
 * @constructor
 */
class AttributedString {
    /**
     * @param {string} string The string value
     * @param {Object<string,any>} attributes The attributes value
     * @return {AttributedString}
     */
    constructor(string, attributes) {
        this._strings = [];
        this._attributes = [];
        // Kludge for compatibility with the voting room.
        if (string != null) {
            this.appendStringWithAttributes(string, attributes || {});
        }
    }
    copy() {
        var copy = new AttributedString();
        copy._attributes = this._attributes.map(attrs => Object.assign({}, attrs))
        copy._strings = this._strings.map(string => new String(string));
        return copy;
    }
    trim() {
        var strings = this._strings;
        var count = strings.length;
        if (count > 0) {
            var first = strings[0].trimStart();
            if (first.length > 0) {
                strings[0] = first;
            }
            else {
                strings.splice(0, 1);
                this._attributes.splice(0, 1);
                count--;
            }
        }

        if (count > 1) {
            var last = strings[count - 1].trimEnd();
            if (last.length > 0) {
                strings[count - 1] = last;
            }
            else {
                strings.splice(count - 1, 1);
                this._attributes.splice(count - 1, 1);
                count--;
            }
        }
    }
    toUpperCase() {
        var copy = this.copy();
        copy._strings = copy._strings.map(a => a.toUpperCase());
        return copy;
    }
    toLowerCase() {
        var copy = this.copy();
        copy._strings = copy._strings.map(a => a.toLowerCase());
        return copy;
    }
    equals(other) {
        if (IsKindOf(other, AttributedString) == false) {
            return false;
        }

        if (EqualObjects(this._strings, other._strings) == false) {
            return false;
        }

        if (EqualObjects(this._attributes, other._attributes) == false) {
            return false;
        }
        return true;
    }
    /**
     * @param {AttributedString} string The string value
     */
    appendAttributedString(attrString) {
        attrString._strings.forEach(string => this._strings.push(string));
        attrString._attributes.forEach(attributes => this._attributes.push(attributes));
    }
    /**
     * @param {string} string The string value
     * @param {Object<string,any>} attributes The attributes value
     */
    appendStringWithAttributes(string, attributes) {
        if (string == null || string.length == 0) {
            return;
        }

        if (attributes == null) {
            attributes = {};
        }

        var ourAttributes = this._attributes;
        if (ourAttributes.length > 0) {
            var lastIndex = ourAttributes.length - 1;
            var lastAttributes = ourAttributes[lastIndex];
            if (EqualObjects(lastAttributes, attributes) == true) {
                this._strings[lastIndex] += string;
                return;
            }
        }

        this._strings.push(string);
        this._attributes.push(attributes);
    }
    /**
     * @readonly
     * @type {number}
     */
    get length() {
        return this._strings.reduce((acc, cur) => acc += cur.length, 0);
    }
    /** @private */
    _dataAtIndex(index) {
        if (index < 0 || index >= this.length) {
            return null;
        }
        var result = null;
        this.enumerate((offset, string, attributes) => {
            if (index >= offset + string.length) {
                return true;
            }
            result = {
                string: string,
                attributes: attributes,
                offset: offset,
            };
            return false;
        });
        return result;
    }
    /**
     * @param {AttributedStringEnumerator} callback The callback function, return true to continue enumerating, false to stop
     */
    enumerate(callback) {
        var offset = 0;
        var strings = this._strings;
        for (var index = 0; index < strings.length; index += 1) {
            var string = this._strings[index];
            var attributes = this._attributes[index];
            var cont = callback(offset, string, attributes ?? {});
            if (cont == false) {
                break;
            }
            offset += string.length;
        }
    }
    /**
     * @param {number} index The index value
     * @return {string|null} The character or null if the index is invalid
     */
    characterAtIndex(index) {
        var data = this._dataAtIndex(index);
        if (data == null) {
            return null;
        }
        return data.string[index - data.offset];
    }
    /**
     * @param {number} index The index value
     * @return {Object<string,Object>|null} The attributes or null if the index is invalid
     */
    attributesAtIndex(index) {
        var data = this._dataAtIndex(index);
        if (data == null) {
            return null;
        }
        return data.attributes;
    }
    toString() {
        var r = "";
        this.enumerate((offset, string, attributes) => {
            r += string;
        })
        return r;
    }
    toJSON() {
        return {
            strings: this._strings,
            attributes: this._attributes
        }
    }
}

AttributedString.newFromJSON = function(json) {
    var strings = json.strings ?? [];
    var attributes = json.attributes ?? [];
    if (attributes.length != strings.length) {
        console.error("malformed attributed string json: ", json);
        while (attributes.length > strings.length) {
            attributes.pop();
        }
        while (attributes.length < strings.length) {
            attributes.push({});
        }
    }
    var result = new AttributedString();
    result._strings = strings.map(string => string ?? "");
    result._attributes = attributes.map(attrs => attrs ?? {});
    return result;
}
