//
//  hybrid/cookie.js
//  mmhmm
//
//  Created by Seth Hitchings on 9/26/2023.
//  Copyright 2023 mmhmm inc. All rights reserved.
//

function HasDesktopInstalledCookie() {
    var cookies = document.cookie.split(";").map(a => a.trim());
    var hybridInstalled = cookies.find(a => a == "mmhmm.desktop.installed=true");
    return hybridInstalled != null;
}

function SetDesktopInstalledCookie() {
    if (HasDesktopInstalledCookie()) {
        // If the cookie is already present, leave it be...
        return;
    }

    // Write the cookie at the apex domain; it's used across subdomains
    var domain = "airtimetools.com";
    if (gLocalDeployment == true) {
        domain = "localhost";
    }

    var oneYearFromNow = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));

    var hybridInstalled = `mmhmm.desktop.installed=true;domain=${domain};path=/;expires=${oneYearFromNow.toUTCString()};secure;`
    document.cookie = hybridInstalled;
}
