//
//  errors.js
//  mmhmm
//
//  Created by Steve White on 10/7/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

function ShowFatalError(title, body, includeDownload = true) {
    Analytics.Log("app.error.fatal");

    var parent = document.getElementById("container");

    Array.from(parent.childNodes).forEach(elem => {
        parent.removeChild(elem);
    });

    var container = document.createElement("div");
    container.className = "fatal_error";
    var footer = document.getElementById("footer");
    if (footer != null) {
        parent.insertBefore(container, footer);
    }
    else {
        parent.appendChild(container);
    }

    var dialog = document.createElement("span");
    dialog.className = "dialog";
    container.appendChild(dialog);

    var iconWrapper = document.createElement("div");
    iconWrapper.className = "icon";
    var icon = AppIcons.AirtimeLogo();
    iconWrapper.appendChild(icon);
    dialog.appendChild(iconWrapper);

    var titleElem = document.createElement("div");
    titleElem.className = "title";
    titleElem.innerText = title;
    dialog.appendChild(titleElem);

    var bodyElem = document.createElement("div");
    bodyElem.className = "body";
    bodyElem.innerHTML = body;
    dialog.appendChild(bodyElem);

    if (includeDownload == true && App.isHybrid == false) {
        var footerElem = document.createElement("div");
        footerElem.className = "footer";
        dialog.appendChild(footerElem);

        var footerText = document.createElement("p");
        footerText.innerText = LocalizedString("For the best experience download the Airtime desktop app.");
        footerElem.appendChild(footerText);

        var button = document.createElement("button");
        button.className = "capsule";
        button.innerText = LocalizedString("Download");
        footerElem.appendChild(button);

        button.addEventListener("click", (evt) => {
            window.open('https://www.airtime.com/download', '_blank');
        });
    }

    var header = document.getElementById("header");
    if (header != null) {
        var toRemove = Array.from(header.childNodes).filter(a => a.tagName != "svg");
        toRemove.forEach(element => header.removeChild(element));

        const title = document.createElement("div");
        title.className = "title";
        title.innerText = "OOOps!";
        header.appendChild(title);
    }

    var helpElem = document.createElement("div");
    helpElem.className = "error_help";
    helpElem.appendChild(AppIcons.HelpLive());
    var helpLabel = document.createElement("span");
    helpLabel.innerText = LocalizedString("Get help");
    helpElem.appendChild(helpLabel);
    parent.appendChild(helpElem);
    helpElem.addEventListener("click", (evt) => {
        window.open("https://help.airtime.com/hc/en-us", "_blank");
    });

    if (gApp != null) {
        gApp.stop();
    }
}

const DimmingNotifications = Object.freeze({
    WillShow: "DimmingNotifications.WillShow",
    WillHide: "DimmingNotifications.WillHide",
})

// TODO: move this out of errors
function ShowFullPageOverlay(overlay, onBackgroundClick = null) {
    if (overlay == null) {
        console.error("overlay is null, refusing to display");
        return;
    }

    var keyboardObserver = {
        handleKeyboardEvent: (event) => { return true; }
    };

    var zIndex = GetWindowMaxZIndex();

    overlay.style.opacity = 0.0;
    overlay.style.zIndex = zIndex + 1;
    overlay.style.setProperty("--scale", "1.1");

    var dimmer = null;
    var cleanup = null;

    var orderOut = (event) => {
        gApp.unregisterKeyboardObserver(keyboardObserver);

        NotificationCenter.default.postNotification(
            DimmingNotifications.WillHide,
            dimmer,
            {}
        );

        if (cleanup != null) {
            cleanup();
            cleanup = null;
        }

        if (document.visibilityState == "hidden") {
            // ISSUE #779
            // Crude fix for transition events not
            // firing when the page is hidden. We'll
            // just remove the elements w/o a transition.
            dimmer.parentNode.removeChild(dimmer);
            overlay.parentNode.removeChild(overlay);
            return;
        }

        var addTransitionEndHandler = function(element) {
            var handler = evt => {
                if (evt.target != element) {
                    return;
                }
                if (element.parentNode != null) {
                    element.parentNode.removeChild(element);
                }
                element.removeEventListener("transitionend", element);
            };
            element.addEventListener("transitionend", handler);

            // Ensure that if transitionend doesn't fire we remove
            // the elements from the DOM, since the dimmer will
            // be blocking the entire app UI.
            window.setTimeout(() => {
                if (element.parentNode != null) {
                    element.parentNode.removeChild(element);
                }
            }, 1000);
        }

        addTransitionEndHandler(dimmer);
        dimmer.style.opacity = 0.0;

        addTransitionEndHandler(overlay);
        overlay.style.opacity = 0.0;
        overlay.style.setProperty("--scale", "0.9");
    };

    var orderIn = (event) => {
        dimmer.style.opacity = 1.0;
        overlay.style.opacity = 1.0;
        overlay.style.setProperty("--scale", "1.0");
    }

    /*
     * Setup the dimming overlay
     */
    dimmer = document.createElement("div");
    dimmer.className = "dimming_overlay";
    dimmer.style.opacity = 0.0;
    dimmer.style.zIndex = zIndex;
    if (onBackgroundClick != null) {
        var clickListener = evt => {
            if (evt.target == dimmer) {
                onBackgroundClick(evt)
            }
        };
        dimmer.addEventListener("click", clickListener);
        cleanup = function() {
            dimmer.removeEventListener("click", clickListener);
        }
    }

    gApp.registerKeyboardObserver(keyboardObserver);
    NotificationCenter.default.postNotification(
        DimmingNotifications.WillShow,
        dimmer,
        {}
    );

    // Timeout is because the transitions don't always
    // seem to show on insertions...
    OnChildAppended(document.body, overlay, () => {
        window.setTimeout((event) => orderIn(event), 33);
    });

    // Everything is setup...
    document.body.appendChild(dimmer);
    document.body.appendChild(overlay);
    return orderOut;
}

function ShowAlertView(title, body, options = {}) {
    var dialog = document.createElement("div");
    dialog.className = "alert_view";

    var icon = options.icon;
    if (icon == null) {
        icon = AppIcons.Warning();
    }
    dialog.appendChild(icon);

    var titleElem = document.createElement("div");
    titleElem.className = "title";
    titleElem.innerText = title;
    dialog.appendChild(titleElem);

    var bodyElem = document.createElement("div");
    bodyElem.className = "body";
    if (body == null) {
        body = "";
    }
    else if (body.constructor != String) {
        body = body.toString();
    }
    bodyElem.innerHTML = body.replace(/\n/g, "<br/>");
    dialog.appendChild(bodyElem);

    var buttons = options.buttons;
    var close = null;
    if (buttons == null) {
        var buttonTitle = options.buttonTitle;
        if (buttonTitle == null) {
            buttonTitle = LocalizedString("Close");
        }
        close = document.createElement("button");
        close.className = "capsule";
        close.innerText = buttonTitle;
        if (options.action != null) {
            close.addEventListener("click", options.action);
        }
        buttons = [close];
    }

    var justify = null;
    if (buttons.length <= 1) {
        justify = "space-around";
    }
    else {
        justify = "flex-end";
    }

    var footerElem = document.createElement("div");
    footerElem.className = "dialog-footer"
    footerElem.style.justifyContent = justify;

    buttons.forEach((button, index) => {
        footerElem.appendChild(button);
        if (index > 0) {
            button.style.marginLeft = "16px";
        }
    })
    dialog.appendChild(footerElem);

    var clickToDismiss = options.clickToDismiss;
    var dismissOverlay = null;
    var onBackgroundClick = null;
    if (clickToDismiss == true) {
        onBackgroundClick = () => {
            dismissOverlay();
        }
    }

    dismissOverlay = ShowFullPageOverlay(dialog, onBackgroundClick);
    if (close != null) {
        close.addEventListener("click", dismissOverlay, {once: true});
    }

    return dismissOverlay;
}

function ShowBrowserUnsuportedError(msg) {
    ShowFatalError(LocalizedString("Browser not supported"), msg + " " + GetRecommendedBrowsersString());
}

function ShowAVPermissionError() {
    ShowAlertView(
        LocalizedString("Airtime can\u2019t access your camera"),
        LocalizedString("Your browser does not have permission to access the camera. This may require changes to either browser settings or system settings."));
}

function IsSupportedBrowser() {
    var vendor = navigator.vendor;
    if (vendor != null && vendor.startsWith("Apple") == true) {
        if (IsWasmSimdSupported() == false) {
            return false;
        }

        var version = navigator.appVersion;
        if (version != null) {
            // Safari 15.0 has broken webGL video srcObject textures
            // TODO (eslint, no-useless-escape): check this regex.
            /* eslint-disable no-useless-escape */
            var matches = navigator.appVersion.match(/Version\/([0-9\.]*)/);
            /* eslint-enable no-useless-escape */
            if (matches != null && matches.length == 2) {
                version = parseFloat(matches[1]);
                if (Math.floor(version) == 15 && version < 15.1) {
                    return false;
                }
            }
        }
    }
    return true;
}

function IsWasmSimdSupported() {
    if (window.WebAssembly == null || WebAssembly.validate == null) {
        return false;
    }

    const simd = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01,
      0x60, 0x00, 0x01, 0x7b, 0x03, 0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01,
      0x08, 0x00, 0x41, 0x00, 0xfd, 0x0f, 0xfd, 0x62, 0x0b, 0x00, 0x0a,
      0x04, 0x6e, 0x61, 0x6d, 0x65, 0x02, 0x03, 0x01, 0x00, 0x00,
    ]);

    return WebAssembly.validate(simd);
}

function IsWebGLSupported() {
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("webgl");
    return (context != null);
}

function AreMediaDevicesAvailable() {
    return (navigator.mediaDevices != null && navigator.mediaDevices.getUserMedia != null);
}

function GetRecommendedBrowsersString() {
    var recommendedBrowsers = [
        { title: "Google Chrome", link: "https://google.com/chrome" },
        { title: "Microsoft Edge", link: "https://microsoft.com/edge" },
        { title: "Mozilla Firefox", link: "https://www.mozilla.org/firefox" },
    ];

    var string = LocalizedString("We recommend using one of the following browsers (in no order of preference): ");
    while (recommendedBrowsers.length > 0) {
        var index = randomI(0, recommendedBrowsers.length - 1);
        var browser = recommendedBrowsers[index];
        recommendedBrowsers.splice(index, 1);
        var title = browser.title;
        var link = browser.link;

        // Yes, a simple:
        //     string += "<a href='"+link+"'>"+title+"</a>";
        // would've worked. Just future proofing it
        // against random things (url encoding, entities in titles, etc)
        var anchor = document.createElement("a");
        anchor.href = link;
        anchor.innerText = title;
        string += anchor.outerHTML;

        switch (recommendedBrowsers.length) {
            case 0:
                string += ".";
                break;
            case 1:
                string += ", or ";
                break;
            default:
                string += ", ";
                break;
        }
    }
    return string;
}

function IsMobileBrowser() {
    var platform = getNavigatorPlatform();
    if (platform != null) {
        if (platform == "iPhone" || platform == "iPad") {
            // Thanks Apple, that was easy
            // iPhone holds true for iPod touch too
            return true;
        }
    }

    var userAgentData = navigator.userAgentData;
    if (userAgentData != null && userAgentData.platform == "Android") {
        return true;
    }

    var maxTouchPoints = navigator.maxTouchPoints;
    if (maxTouchPoints == null || maxTouchPoints == 0) {
        // iPad, iPod and iPhone report 5
        // android 11 reports 5
        // desktop Safari+Edge+Chrome report 0
        return false;
    }
    else if (maxTouchPoints > 0) {
        // Treat any Apple touch device as mobile
        // iPad claims to be "MacIntel"
        if (platform != null && platform == "MacIntel") {
            return true;
        }
    }

    if (navigator.plugins != null && navigator.plugins.length == 0) {
        // iPad, iPod and iPhone report 0
        // Seth's iPads report 5
        // android 11 reports 0
        // desktop Safari reports 1, Edge+Chrome report 5
        return true;
    }

    return false;
}

function IsSupportedMobileBrowser() {
    return isIOS() || isAndroid();
}

function BrowserHasFatalError() {
    if (IsMobileBrowser() == true) {
        ShowFatalError(LocalizedString("Try again from your computer"),
            LocalizedString("Sorry, Airtime doesn't work on mobile devices. Please try again on a Mac or Windows computer."), false);
        return true;
    }
    if (IsSupportedBrowser() == false) {
        ShowFatalError(LocalizedString("Browser not supported"), LocalizedString("An up-to-date browser is required to use Airtime web. ") + GetRecommendedBrowsersString());
        return true;
    }
    if (IsWebGLSupported() == false) {
        ShowFatalError(LocalizedString("WebGL is required to run Airtime"), LocalizedString("Airtime requires WebGL to be enabled in your browser."));
        return true;
    }
    if (AreMediaDevicesAvailable() == false) {
        ShowBrowserUnsuportedError(LocalizedString("Your browser does not appear to support web cameras or microphones."));
        return true;
    }
    return false;
}
