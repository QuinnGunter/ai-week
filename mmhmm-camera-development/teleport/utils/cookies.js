//
//  utils/cookies.js
//  mmhmm
//
//  Created by Steve White on 9/10/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

const Cookies = {
    Get: function(name) {
        var cookies = document.cookie.split(";").map(a => a.trim());
        var cookie = cookies.find(a => a.startsWith(name));
        if (cookie == null) {
            return null;
        }
        var kvEquals = cookie.indexOf("=");
        if (kvEquals == -1) {
            console.error("Error parsing theme cookie", cookie);
            return null;
        }

        var value = cookie.substring(kvEquals + 1);
        return value;
    },
    Delete: function(name) {
        var distantPast = new Date(0);
        var purgeCookie = `${name}=;path=/;domain=${window.location.hostname};expires=${distantPast.toUTCString()}`;
        document.cookie = purgeCookie;
    },
    Set: function(name, value) {
        // Purge the current cookie to ensure the subsequent write is fine
        Cookies.Delete(name);

        var oneYearFromNow = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));
        var themeCookieVal = `${name}=${value};path=/;expires=${oneYearFromNow.toUTCString()}`;
        document.cookie = themeCookieVal;
    },
};
