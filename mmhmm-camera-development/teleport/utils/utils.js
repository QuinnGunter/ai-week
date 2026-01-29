//
//  utils.js
//  mmhmm
//
//  Created by Steve White on 7/28/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

// Given an ISO-formatted date string like "2024-01-31",
// return a localized human readable string like
// "January 31, 2024". If no locale is passed, gCurrentLocale
// is used.
function FormatDate(isoDate, locale) {
    if (locale == null) {
        locale = gCurrentLocale;
    }

    const format = isoDate + " 00:00:00";
    const date = new Date(format);
    if (isNaN(date.getTime()) == true) {
        console.error("Failed to parse format: ", isoDate, format);
        return isoDate;
    }

    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function FormatSeconds(seconds, forceHourDisplay) {
    var hours = Math.floor(seconds / 3600);
    seconds -= (hours * 3600);

    var minutes = Math.floor(seconds / 60);
    seconds -= (minutes * 60);

    function PaddedString(num) {
        var str = num.toString();
        if (str.length == 1) {
            str = "0" + str;
        }
        return str;
    }

    var result = "";
    if (hours > 0 || forceHourDisplay == true) {
        result += PaddedString(hours);
        result += ":";
    }

    result += PaddedString(minutes);

    result += ":";
    result += PaddedString(seconds);

    return result;
}

function BetterEnumerateLinkifiedString(string, links) {
    const container = document.createElement("div");

    EnumerateLinkifiedString(string, (tagNum, text) => {
        var textNode = document.createTextNode(text);
        if (tagNum == -1) {
            container.appendChild(textNode);
        }
        else {
            var link = document.createElement("a");
            link.target = "_blank";
            link.href = links[tagNum];

            link.appendChild(textNode);
            container.appendChild(link);
        }
    });

    return container;
}

function EnumerateLinkifiedString(string, callback) {
    var index = 0;

    while (index < string.length) {
        var lt = string.indexOf("<", index);
        if (lt == -1) {
            break;
        }
        var gt = string.indexOf(">", lt);
        if (gt == -1) {
            break;
        }
        var num = string.substring(lt + 1, gt);
        if (parseInt(num).toString() != num) {
            console.info("malformed tag? ", num);
            callback(-1, string.substring(index, lt));
            index = lt + 1;
            continue;
        }

        var closeTag = `</${num}>`;
        var closeTagIndex = string.indexOf(closeTag, gt);
        var nextIndex = null;
        if (closeTagIndex == -1) {
            nextIndex = gt;
            callback(-1, string.substring(index, nextIndex));
            index = nextIndex;
            continue;
        }
        else {
            nextIndex = closeTagIndex + closeTag.length;
        }

        if (index != lt) {
            callback(-1, string.substring(index, lt));
        }
        callback(parseInt(num), string.substring(gt + 1, closeTagIndex));
        index = nextIndex;
    }
    if (index < string.length) {
        callback(-1, string.substring(index));
    }
}

function newElementForBoldTagsInString (string) {
    var result = document.createElement("span");
    EnumerateLinkifiedString(string, (tagNum, text) => {
        if (tagNum != 0) {
            result.appendChild(document.createTextNode(text));
        }
        else {
            var bold = document.createElement("b");
            bold.innerText = text;
            result.appendChild(bold);
        }
    });
    return result;
}

function ElementsFromLinkifiedString(string, actions) {
    var elements = [];
    EnumerateLinkifiedString(string, (tagNum, text) => {
        if (tagNum == -1 || actions[tagNum] == null) {
            elements.push(document.createTextNode(text));
            return;
        }

        var link = document.createElement("a");
        link.className = "action";
        link.innerText = text;
        link.addEventListener("click", evt => {
            actions[tagNum](evt);
            evt.preventDefault();
        })
        elements.push(link);
    });
    return elements;
}

function DigestToHexString(digest) {
    var bytes = new Uint8Array(digest);
    var hash = "";
    bytes.forEach(byte => {
        var hex = byte.toString(16);
        if (hex.length == 1) hash += "0";
        hash += hex;
    });
    return hash;
}


function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function lerp(a, b, t) {
    return ((a) + (((b) - (a)) * t));
}

function random(min, max) {
    if (max == null) {
        max = min;
        min = 0;
    }
    return min + (Math.random() * (max - min));
}

function randomI(min, max) {
    return Math.round(random(min, max));
}

function round_up(a, b) {
    return (((a) + (b) - 1) & ~((b) - 1));
}

function IsKindOf(obj, cls) {
    var target = obj;
    while (target != null) {
        if (target.constructor == cls) {
            return true;
        }
        if (target.prototype != null) {
            target = target.prototype;
        }
        else if (target.__proto__ != null) {
            target = target.__proto__;
        }
        else {
            target = null;
        }
    }
    return false;
}

function groupArrayBy(array, propertyName) {
    var map = {};
    array.forEach(item => {
        var key = item[propertyName];
        var entry = map[key];
        if (entry == null) {
            entry = [];
            map[key] = entry;
        }
        entry.push(item);
    });
    return map;
}

// Park-Miller-Carta Pseudo-Random Number Generator
// https://www.firstpr.com.au/dsp/rand31/
class PRNG {
    constructor(seed) {
        if (seed == null) {
            seed = Math.floor(Math.random() * 0x7FFFFFFF);
        }
        seed = seed % 0x7FFFFFFF;
        if (seed < 0) {
            seed += 0x7FFFFFFF;
        }
        this.seed = seed;
    }
    randomI(min, max) {
        var range = max - min;
        return min + (this.next() % range);
    }
    next() {
        var seed = this.seed * 16807 % 0x7FFFFFFF;
        this.seed = seed;
        return seed;
    }
    toJSON() {
        return { seed: this.seed };
    }
}

Object.defineProperty(URL.prototype, "pathExtension", {
    get: function () {
        var path = this.pathname;
        var lastDotIndex = path.lastIndexOf(".");
        if (lastDotIndex == -1) {
            return ""
        }
        return path.substring(lastDotIndex + 1).toLowerCase();
    }
});

Object.defineProperty(URL.prototype, "pathComponents", {
    get: function () {
        var path = this.pathname;
        var components = path.split("/");
        if (components.length > 0) {
            return components.slice(1);
        }
        return [];
    }
});

Object.defineProperty(URL.prototype, "lastPathComponent", {
    get: function () {
        var components = this.pathComponents;
        if (components.length > 0) {
            return components[components.length - 1];
        }
        return "";
    }
});

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
    if (window.crypto?.randomUUID != null) {
        return crypto.randomUUID();
    }

    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function isUUID(val) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(val);
}

// Almost certainly overkill but used to add continuity
// when assigning default avatars to users.
function hashString(string) {
    if (string == null) {
        return 0;
    }
    if (typeof string != "string") {
        string = string.toString();
    }
    var hash = 0,
        i, chr;
    if (string.length === 0) return hash;
    for (i = 0; i < string.length; i++) {
        chr = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function setFeatureFlagEnabled(flagName, enabled) {
    const flags = getFeatureFlags();
    flags[flagName] = !!enabled;
    localStorage.setItem("FeatureFlags", JSON.stringify(flags));
}

function isFeatureFlagEnabled (flagName) {
    const flags = getFeatureFlags();
    return flags[flagName] === true;
}

function getFeatureFlags() {
    let flags = {};
    const flagsData = localStorage.getItem("FeatureFlags");
    if (flagsData) {
        try {
            flags = JSON.parse(flagsData);
        } catch (err) {
            console.error("Failed to parse feature flags", err);
        }
    }
    return flags;
}

function saveVideoBlobToComputer(videoBlob) {
    // test routine to download video blobs as webm.
    var filename = "File.webm";
    var url = URL.createObjectURL(videoBlob);
    var a = document.createElement('a');
    document.body.appendChild(a);
    a.style = 'display: none';
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

/**
 * Show a modal dialog enumarating all of our app icons.
 * For development purposes only.
 */
function launchAllIcons () {
    if (gLocalDeployment) {
        const sheet = new AllIcons();
        sheet.displayAsModal();
    }
}

function actionBarButtonWithTag (tag) {
    const option = gApp.actionBar.options.find(opt => opt.tag.toLowerCase() == tag.toLowerCase());
    return option?.button;
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const waitFunction = (ms) => () => wait(ms);

function debounce (func, delay) {
    let timeout;
    const debounced = function () {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, arguments), delay);
    };
    debounced.cancel = function () {
        clearTimeout(timeout);
    };
    return debounced;
}

function throttle(func, time) {
    let throttled = false;
    return function () {
        if (throttled) { return; }

        func.apply(this, arguments);
        throttled = true;
        setTimeout(() => throttled = false, time);
    }
}

// Returns "Today", "Yesterday" or a locale-specific date string like "05/14/2023"
function getRelativeDateString(date) {
    if (date == null || date.getTime() == 0) {
        return LocalizedString("Never");
    }
    var text = date.toLocaleDateString();
    var now = new Date();
    if (text == now.toLocaleDateString()) {
        return LocalizedString("Today");
    }
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (text == yesterday.toLocaleDateString()) {
        return LocalizedString("Yesterday");
    }
    return text;
}

// this comes from keymaster.js
const MODIFIER_KEY_MAP = {
    '⇧': '⇧', shift: '⇧',
    '⌥': '⌥', alt: '⌥', option: '⌥',
    '⌃': '⌃', ctrl: '⌃', control: '⌃',
    '⌘': '⌘', cmd: '⌘', command: '⌘',
};

// This function checks whether an event matches a given combination
// example combinations: 'ctrl+shift+z', '⌘+⇧+z'
function eventKeysMatch (event, keyCombination) {
    const { altKey, ctrlKey, key, metaKey, shiftKey, type } = event

    if (type !== 'keydown') { return false; }

    const mappedKeys = keyCombination.toLowerCase().split('+').map(key => MODIFIER_KEY_MAP[key] || key);

    return (
        mappedKeys.includes('⌥') === altKey &&
        mappedKeys.includes('⌘') === metaKey &&
        mappedKeys.includes('⇧') === shiftKey &&
        mappedKeys.includes('⌃') === ctrlKey &&
        mappedKeys.includes(key.toLowerCase())
    );
}

// returns the number of days until the given date
// this may need to be modified if we care if the date is in the middle of a day
function daysUntil (date) {
    const diff = new Date(date) - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function newIconButton (name, icon, showLabel, action, context, classes = [], left = true) {
    const button = document.createElement("button");
    button.className = "icon";
    button.title = name;
    button.appendChild(icon);
    if (showLabel == true) {
        let label = document.createElement("span");
        label.innerText = name;
        if (left) {
            button.appendChild(label);
        } else {
            button.prepend(label);
        }
    }
    if (action != null) {
        button.addEventListener("click", evt => {
            action.call(context, button, evt);
        });
    }

    button.classList.add(...classes);

    return button;
}

function newCapsuleButton(name, action) {
    const button = document.createElement("button");
    button.className = "capsule";
    button.innerText = name;
    if (action) {
        button.addEventListener("click", evt => action(button, evt));
    }
    return button;
}

function openLink(link) {
    window.open(MakeLocalizedURL(link), "_blank");
}

function timeUntilMidnight () {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow - now;
}

// returns a new object with only the properties that pass the predicate
function pickBy(obj, predicate) {
    return Object.fromEntries(Object.entries(obj).filter(predicate));
}

const rootMeanSquare = function (samples) {
    const sumSq = samples.reduce((sumSq, sample) => sumSq + sample * sample, 0);
    return Math.sqrt(sumSq / samples.length);
}

function createHtmlElement (template) {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(template, "text/html");
    return htmlDoc.body.firstChild;
}

function createSvgElement (template) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(template, "image/svg+xml");
    return svgDoc.documentElement;
}
