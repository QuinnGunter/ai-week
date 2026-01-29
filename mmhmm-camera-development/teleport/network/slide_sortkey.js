//
//  slide_sortkey.js
//  mmhmm
//
//  Created by Steve White on 7/29/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class SlideSortKey {
    constructor(value) {
        var components = null;
        if (value != null) {
            if (value.constructor == Array) {
                components = value;
            }
            else if (value.constructor == Number) {
                components = [value];
            }
            else if (value.constructor == String && value.length > 0) {
                components = value.split(":").map(a => {
                    var num = parseInt(a);
                    if (isNaN(num) == false) {
                        return num;
                    }
                    return 0;
                });
            }
        }
        if (components == null) {
            components = [1]
        }
        this.components = components;
    }
    newValueByAdding(value) {
        var components = new Array();
        var needsAppend = true;
        var index = 0;
        while (index < this.components.length) {
            var current = this.components[index];

            if (current + value >= 1) {
                components.push(current + value);
                needsAppend = false;
                break;
            }
            components.push(current);
            index += 1;
        }
        if (needsAppend == true) {
            components.push(1000);
        }
        return new SlideSortKey(components);
    }
    equals(other) {
        return (this.compare(other) == 0);
    }
    compare(other) {
        if (other.constructor != SlideSortKey) {
            return -1;
        }
        var index = 0;
        var compsA = this.components;
        var countA = compsA.length;
        var compsB = other.components;
        var countB = compsB.length;

        // TODO (eslint, no-constant-condition): add comment
        /* eslint-disable no-constant-condition */
        while (true) {
            if (index >= countA || index >= countB) {
                if (countA < countB) {
                    return -1;
                }
                else if (countA > countB) {
                    return 1;
                }
                return 0;
            }

            var valA = compsA[index];
            var valB = compsB[index];
            if (valA < valB) {
                return -1;
            }
            else if (valA > valB) {
                return 1;
            }
            else {
                index += 1;
            }
        }
        /* eslint-enable no-constant-condition */
    }
    toString() {
        const pad = function(number) {
            var str = number.toString();
            while (str.length < 8) {
                str = "0" + str;
            }
            return str;
        }

        return this.components.map(a => pad(a)).join(":");
    }
    toJSON() {
        return this.toString();
    }
}

SlideSortKey.newValueBetween = function(leftSortKey, rightSortKey) {
    var index = 0;
    var compsA = leftSortKey.components;
    var countA = compsA.length;
    var compsB = rightSortKey.components;
    var countB = compsB.length;
    while (index < countA && index < countB) {
        var valA = compsA[index];
        var valB = compsB[index];
        var diff = Math.abs(valA - valB);
        if (diff <= 1) {
            index += 1;
            continue;
        }

        const insert = compsA.slice(0, index);
        const newVal = Math.min(valA, valB) + Math.round(diff / 2);
        insert.push(newVal);
        return new SlideSortKey(insert);
    }

    let insert = null;
    const minValue = 1;
    const maxValue = 100000000;

    if (countA < countB) {
        var lastB = compsB[index];
        if (lastB > minValue) {
            insert = compsB.slice(0, index);
            const newVal = minValue + (lastB / 2.0);
            insert.push(Math.round(newVal));
        }
    }
    else if (countA > countB) {
        var lastA = compsA[index];
        if (lastA < maxValue) {
            insert = compsA.slice(0, index);
            var newVal = lastA + ((maxValue - lastA) / 2.0);
            insert.push(Math.round(newVal));
        }
    }

    if (insert == null) {
        var source = null;
        if (countA < countB) {
            source = compsB;
        }
        else if (countA > countB) {
            source = compsA;
        }
        else {
            if (compsA[countA - 1] < compsB[countB - 1]) {
                source = compsA;
            }
            else {
                source = compsB;
            }
        }
        insert = Array.from(source);
        insert.push(maxValue / 2);
    }

    return new SlideSortKey(insert);
}

SlideSortKey.newUniqueValueBetween = function(leftKey, rightKey, pool, attempt = 0) {
    var newKey = null;
    if (leftKey != null && rightKey != null) {
        newKey = SlideSortKey.newValueBetween(leftKey, rightKey);
    }
    else if (leftKey != null) {
        newKey = leftKey.newValueByAdding(1);
    }
    else if (rightKey != null) {
        // XXX: would need to ensure this doesn't result in a negative index
        newKey = rightKey.newValueByAdding(-1);
    }
    else {
        return new SlideSortKey(0xdeadbeef);
    }

    var match = pool.find(otherKey => otherKey.equals(newKey));
    if (match == null) {
        return newKey;
    }

    if (attempt >= 10) {
        console.error("this is becoming too much of a challenge");
        debugger;
        return null;
    }

    if (leftKey != null) {
        return SlideSortKey.newUniqueValueBetween(leftKey, newKey, pool, attempt + 1);
    }
    else {
        return SlideSortKey.newUniqueValueBetween(newKey, rightKey, pool, attempt + 1);
    }

}
