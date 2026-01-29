//
//  misc.js
//  mmhmm
//
//  Created by Steve White on 11/7/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

function EqualObjects(objA, objB, keyFilter = null) {
    if (objA == objB) {
        return true;
    }

    if (objA == null || objB == null) {
        // They couldn't both be null due to the above check
        return false;
    }

    var typeA = objA.constructor;
    if (typeA != objB.constructor) {
        return false;
    }

    if (objA.constructor == String || objA.constructor == Number || objA.constructor == Boolean) {
        return (objA == objB);
    }
    else if (typeA == Array) {
        if (objA.length != objB.length) {
            return false;
        }
        for (var idx = 0; idx < objA.length; idx += 1) {
            if (EqualObjects(objA[idx], objB[idx], keyFilter) == false) {
                return false;
            }
        }
        return true;
    }
    else if (objA.constructor == objB.constructor && objA.equals != null) {
        return objA.equals(objB);
    }
    else {
        var keysA = Object.keys(objA).sort();
        var keysB = Object.keys(objB).sort();
        if (keyFilter != null) {
            keysA = keysA.filter(keyFilter);
            keysB = keysA.filter(keyFilter);
        }
        if (EqualObjects(keysA, keysB) == false) {
            return false;
        }
        for (var keyIdx = 0; keyIdx < keysA.length; keyIdx += 1) {
            var key = keysA[keyIdx];
            if (EqualObjects(objA[key], objB[key], keyFilter) == false) {
                return false;
            }
        }
        return true;
    }
}

function DeepCopy(object) {
    if (typeof structuredClone == 'function') {
        return structuredClone(object);
    }

    var type = object.constructor;
    if (type == Array) {
        var len = object.length;
        const r = new Array(len);
        for (var i = 0; i < len; i++) {
            r[i] = DeepCopy(object[i]);
        }
        return r;
    }
    // XXX: what about typed arrays: (u)int(8|16|32)array, etc.
    else if (type == Object) {
        const r = {};
        r.__proto__ = object.__proto__;
        var keys = Object.keys(object);
        for (var key in keys) {
            r[key] = DeepCopy(object[key]);
        }
        return r;
    }
    else if (type == Date) {
        return new Date(object.getTime());
    }
    // presumably a string, number, etc
    return object;
}
