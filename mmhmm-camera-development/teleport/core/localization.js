//
//  localization.js
//  mmhmm
//
//  Created by Steve White on 2/3/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

const LocalizedTable = {};

function LocalizedString(key, defValue) {
    var val = LocalizedTable[key];
    if (val != null) {
        return val;
    }
    if (defValue != null) {
        return defValue;
    }
    return key;
}

function LocalizedStringFormat(key, ...args) {
    var defValue = null;
    if (args.length == 2) {
        defValue = args.shift();
    }
    var replacements = args.shift();

    var str = LocalizedString(key, defValue);

    return str.replace(/\${([a-zA-Z0-9]*)}/g, function(full, partial) {
        var replace = replacements[partial];
        if (replace == null) {
            replace = "";
        }
        return replace;
    });
}

var gCurrentLocale = null;

function LocaleURLMap() {
    return {
        "ja": "ja-JP",
        "de": "de-DE",
        "es-419": "es-LA",
        "en": "en-US",
        "fr": "fr-FR",
        "it": "it-IT",
        "pt-BR": "pt-BR",
    };
}

function LocaleFromURLPrefix(prefix) {
    var map = LocaleURLMap();
    return map[prefix];
}

function LocaleToURLPrefix(locale) {
    var map = LocaleURLMap();
    for (var key in map) {
        if (map[key] == locale) {
            return key;
        }
    }
    return null;
}

function MakeLocalizedURL(inputURL, targetLocale) {
    if (inputURL == null) {
        return null;
    }

    if (inputURL.constructor != URL) {
        inputURL = new URL(inputURL);
    }

    var pathComponents = inputURL.pathComponents;

    if (gLocalDeployment == true) {
        inputURL.searchParams.delete("locale");
    }
    else {
        var map = LocaleURLMap();
        for (var locale in map) {
            if (pathComponents[0] == locale) {
                pathComponents.splice(0, 1);
                break;
            }
        }
    }

    if (targetLocale == null) {
        targetLocale = LocaleToURLPrefix(gCurrentLocale);
    }

    if (targetLocale != null && targetLocale != "en") {
        if (gLocalDeployment == true && inputURL.hostname == "localhost") {
            inputURL.searchParams.set("locale", LocaleFromURLPrefix(targetLocale));
        }
        else {
            pathComponents.splice(0, 0, targetLocale);
        }
    }
    inputURL.pathname = "/" + pathComponents.join("/");
    return inputURL.toString();
}

function PreferredLocales() {
    var result = new Set();

    var cookie = Cookies.Get("locale");
    if (cookie != null) {
        result.add(cookie);
    }

    var url = new URL(document.location);
    var locale = url.searchParams.get("locale");
    result.add(locale);

    var pathComponents = url.pathname.split("/");
    if (pathComponents != null && pathComponents.length > 1) {
        var first = pathComponents[1];
        result.add(LocaleFromURLPrefix(first));
    }

    result.add(navigator.language);
    result.add("en-US");

    return Array.from(result).filter(entry => entry != null && entry.length > 0);
}

function MakeLocalizedTable(localizations) {
    const valuesForLocale = (key) => {
        if (key == null) {
            return null;
        }
        key = key.trim();
        if (key.length == 0) {
            return null;
        }
        var result = localizations[key];
        if (result != null) {
            return result;
        }
        return Object.keys(localizations).find(a => a.startsWith(locale));
    };

    var values = null;
    var locale = null;
    var locales = PreferredLocales();
    for (var idx = 0; idx < locales.length; idx += 1) {
        locale = locales[idx];
        values = valuesForLocale(locale);
        if (values != null) {
            break;
        }
    }

    if (values != null) {
        localizations.__keys.forEach((key, idx) => {
            LocalizedTable[key] = values[idx];
        });
        gCurrentLocale = locale;
    }
}

if (gLocalDeployment == true) {
    var locales = PreferredLocales().filter(locale => locale != "en-US");
    if (locales.length == 0) {
        gCurrentLocale = "en-US";
    }
    else {
        var request = new XMLHttpRequest();
        request.open("GET", `localizations/${locales[0]}/strings.json`, false);
        request.send();

        if (request.status == 200) {
            var localizations = JSON.parse(request.responseText);
            for (var key in localizations) {
                LocalizedTable[key] = localizations[key];
            }
            gCurrentLocale = locales[0];
        }
    }
}
