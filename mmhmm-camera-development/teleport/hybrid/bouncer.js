//
//  hybrid/bouncer.js
//  mmhmm
//
//  Created by Steve White on 10/14/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

// This is Airtime Camera, so we always bounce - we don't run in the browser
function HandleHybridRedirect() {

    if (App.isHybrid == true) {
        // We're already in the hybrid app, nothing to do
        return false;
    } else if (App.isDemo == true || App.isUserTesting == true) {
        // Demo & user testing mode run in the browser
        return false;
    } else if (isPreviewDeployment()) {
        // Allow the app to run in the browser on preview deploys
        return false;
    } else if (gLocalDeployment) {
        // Allow local development in the browser
        return false;
    }

    ShowHybridRedirect();
    return true;
}

function getUUIDFromURL(parameterName) {
    var currentHash = gLoadURL.hash;
    if (currentHash.length <= 1) {
        return null;
    }

    currentHash = currentHash.substring(1);
    var matches = currentHash.match(new RegExp(`${parameterName}=([0-9a-z-]*)`, "i"));
    if (matches == null || matches.length != 2) {
        return null;
    }

    return matches[1];
}

function GetImportIDFromURL() {
    return getUUIDFromURL("importID");
}

//
// RedirectToHybridApp updates window.location to point at /launch,
// a page on the watch/TV application that will try to open the hybrid
// app, etc.
//
function RedirectToHybridApp() {
    const redirectURL = gLocalDeployment == true ? 'https://app.dev.airtimetools.com/launch' : '/launch';
    window.location = redirectURL;
}

function ShowPageWall(element) {
    var body = document.body;
    var oldClass = body.className;

    var theme = "light";
    if (SystemTheme.shared.dark == true) {
        theme = "dark";
    }
    body.className = theme;
    body.classList.add("page_wall");

    var previousBody = body.cloneNode(true);

    var clearBody = function() {
        RemoveAllChildrenFrom(body);
    };
    clearBody();
    body.appendChild(element);

    var toRemove = function() {
        clearBody();
        body.className = oldClass;
        body.classList.remove("page_wall");
        Array.from(previousBody.childNodes).forEach(node => {
            body.appendChild(node);
        });
    }
    return toRemove;
}

function ShowHybridRedirect() {
    var wrapper = document.createElement("div");
    wrapper.className = "native_bounce";

    const top = document.createElement("div");
    top.className = "top";
    wrapper.appendChild(top);

    const middle = document.createElement("div");
    middle.className = "middle";
    wrapper.appendChild(middle);

    var logo = AppIcons.AirtimeLogo();
    middle.appendChild(logo);

    var header = document.createElement("div");
    header.className = "header";
    header.innerText = LocalizedString("Opening Airtime");
    middle.appendChild(header);

    var message = document.createElement("div");
    message.className = "message";
    message.innerText = LocalizedString("If the app doesn’t open, click the button below");
    middle.appendChild(message);

    let redirectURL = "mmhmm-hybrid:///camera";
    const importID = GetImportIDFromURL();
    if (importID != null) {
        // The import ID might be a camera look and it might be a creator presentation
        // Don't specify which mode/app to launch; let the app decide on launch
        redirectURL += `/import/${importID}`
    }

    var retry = document.createElement("button");
    retry.className = "capsule";
    retry.innerText = LocalizedString("Launch Airtime");
    retry.addEventListener("click", evt => {
        window.location = redirectURL;
    });
    middle.appendChild(retry);

    const bottom = document.createElement("div");
    bottom.className = "bottom";
    wrapper.appendChild(bottom);

    const download = document.createElement("div");
    download.classList.add("message", "secondary");
    download.innerText = LocalizedString("Don't have the Airtime app installed? ");
    bottom.appendChild(download);

    const downloadLink = document.createElement("a");
    downloadLink.classList.add("secondary");
    downloadLink.innerText = LocalizedString("Download now");
    downloadLink.href = "https://www.airtime.com/getting-started";
    bottom.appendChild(downloadLink);

    ShowPageWall(wrapper);
    window.setTimeout(() => {
        retry.click()
    }, 500);
}
