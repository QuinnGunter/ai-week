//
//  platform.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/20/2023.
//  Copyright 2023 mmhmm inc. All rights reserved.
//


// Get a descriptive string identifying the application
// and platform we're running on.
function getAppAndPlatformString() {

    // Returns something like "Windows desktop 1.1 production/4c6cb65" or
    //                        "Web Chrome Windows alpha/4c6cb65"

    // Identify the browser we're running in
    var result = null;
    if (App.isHybrid) {
        if (isWindows()) {
            result = "Windows desktop";
        }
        else {
            result = "Mac desktop";
        }
    }
    else {
        result = `Web ${getBrowser()} ${getPlatform()}`;
    }

    // For our own hybrid apps, identify the hybrid app version
    if (App.isHybrid) {
        result = `${result} ${getHybridAppVersion()}`
    }

    var build = "local";
    if (typeof gAppBuild != "undefined") {
        build = gAppBuild;
    }

    // Identify the web app version
    result = `${result} ${getReleaseTrack()}/${build}`

    return result;
}

// Get a string indicating the version of the hybrid app that
// we're running inside of.
function getHybridAppVersion() {
    // We should inject this directly in the future, but for now...
    // See https://github.com/All-Turtles/mmhmm-hybrid/issues/396
    if (App.isHybrid == true) {
        var userAgent = navigator.userAgent;

        // TODO (eslint, no-useless-escape): check this regex.
        // add comment showing what this is intended to match
        /* eslint-disable no-useless-escape */
        var comps = userAgent.match(/Airtime\/([0-9\.]+)/)
        /* eslint-disable no-useless-escape */

        if (comps != null && comps.length == 2) {
            return comps[1];
        }
    }
    return "";
}

const ReleaseTrack = {
    PRODUCTION: "production",
    ALPHA: "alpha",
    DEVELOPMENT: "development",
    LOCAL: "local",
}

// Get a string indicating the release track of the web application,
// e.g. "development" or "alpha" or "production".
function getReleaseTrack() {
    if (gLocalDeployment == true) {
        return ReleaseTrack.LOCAL
    }

    // The app might not be fully initialized yet, so don't rely on gLoadURL
    var url = (typeof gLoadURL != 'undefined' && gLoadURL) ? gLoadURL : new URL(window.location);
    var pathComponents = url.pathname.split("/");
    var page = pathComponents.pop();

    // /camera/index.html
    // /camera/camera_demo.html
    // /camera/alpha/index.html
    // /camera/hotfix/20230307/index.html

    if (page.endsWith(".html")) {
        page = pathComponents.pop();
    }
    if (page == "camera" || page == "camera-build-look") {
        return ReleaseTrack.PRODUCTION;
    }
    return page;
}

/**
 * Test whether the app is running from an internal preview deploy.
 * @returns {boolean}
 */
function isPreviewDeployment() {
    const regex = /\/preview\/[0-9]+\//;

    const url = (typeof gLoadURL != 'undefined' && gLoadURL) ? gLoadURL : new URL(window.location);
    const path = url.pathname;
    return regex.test(path);
}

const Browser = {
    CHROME: "chrome",
    FIREFOX: "firefox",
    SAFARI: "safari",
    EDGE: "edge",
    BRAVE: "brave"
};

function getBrowser() {
    if (window.navigator.userAgent.toLowerCase().indexOf(Browser.CHROME) !== -1) {
        return Browser.CHROME;
    }
    else if (window.navigator.userAgent.toLowerCase().indexOf(Browser.FIREFOX) !== -1) {
        return Browser.FIREFOX;
    }
    else if (window.navigator.userAgent.toLowerCase().indexOf(Browser.SAFARI) !== -1) {
        return Browser.SAFARI;
    }
    else if (window.navigator.userAgent.toLowerCase().indexOf(Browser.EDGE) !== -1) {
        return Browser.EDGE;
    }
    else if (window.navigator.userAgent.toLowerCase().indexOf(Browser.BRAVE) !== -1) {
        return Browser.BRAVE;
    }
    return "";
}

function isSafari() {
    return getBrowser() === Browser.SAFARI;
}

function isFirefox() {
    return getBrowser() === Browser.FIREFOX;
}

const Platform = {
    MACOS: "macOS",
    WINDOWS: "Windows",
    IOS: "iOS",
    ANDROID: "Android",
    LINUX: "Linux"
}

function getPlatform() {
    if (isMacOS()) {
        return Platform.MACOS;
    }
    else if (isWindows()) {
        return Platform.WINDOWS;
    }
    else if (isIOS()) {
        return Platform.IOS;
    }
    else if (isAndroid()) {
        return Platform.ANDROID;
    } else if (isLinux()) {
        return Platform.LINUX;
    }
    return "";
}

function getNavigatorPlatform() {
    var platform = navigator.platform;
    if (gLocalDeployment == true) {
        // Allows for testing while developing locally
        platform = SharedUserDefaults.getValueForKey("platform", platform);
    }
    return platform;
}

function getUserAgentDataPlatform() {
    var userAgentData = navigator.userAgentData;
    if (userAgentData != null && userAgentData.platform != null) {
        return userAgentData.platform;
    }
    return "";
}

function isIOS() {
    return isIPhone() || isIPad();
}

function isIPhone() {
    var platform = getNavigatorPlatform();
    if (platform != null && platform == "iPhone") {
        return true;
    }
    return false;
}

function isIPad() {
    var platform = getNavigatorPlatform();
    if (platform != null) {
        if (platform == "iPad") {
            // Some mobile Safari instances (older hardware?) and Chrome on iPad use "iPad"
            return true;
        }
        else if (platform == "MacIntel") {
           // A "Mac" with a touch UI is an iPad...
            return navigator.maxTouchPoints != null && navigator.maxTouchPoints > 0;
        }
    }

    return false;
}

function isAndroid() {
    var userAgentData = navigator.userAgentData;
    if (userAgentData != null && userAgentData.platform == "Android") {
        return true;
    }
    return false;
}

function isLinux() {
    return navigator.userAgent.toLowerCase().includes("linux");
}

function isWindows() {
    // Not every browser implements userAgentData
    var platform = getUserAgentDataPlatform();
    if (platform == "Windows") {
        return true;
    }

    platform = getNavigatorPlatform();
    if (platform == "Win32") {
        return true;
    }

    // Fall back to the user agent
    var userAgent = navigator.userAgent;
    return userAgent.indexOf("Windows") != -1;
}

function isMacOS() {
    // Not every browser implements userAgentData
    var platform = getUserAgentDataPlatform();
    if (platform == "macOS") {
        return true;
    }

    platform = getNavigatorPlatform();
    var userAgent = navigator.userAgent;

    if (platform == "MacIntel" || userAgent.indexOf("Macintosh") != -1) {
        // A "Mac" with a touch UI is an iPad...
        return navigator.maxTouchPoints != null && navigator.maxTouchPoints < 1;
    }

    return false;
}
