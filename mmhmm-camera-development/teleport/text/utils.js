//
//  utils.js
//  mmhmm
//
//  Created by Steve White on 12/21/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

function TextMetricsInContext2D(string, canvas, requiresLineHeight = false) {
    var metrics = canvas.measureText(string);
    metrics.lineHeight = Math.abs(metrics.actualBoundingBoxDescent) + Math.abs(metrics.actualBoundingBoxAscent);
    if (metrics.fontBoundingBoxDescent != null) {
        metrics.lineHeight = Math.min(metrics.lineHeight, metrics.fontBoundingBoxDescent + metrics.fontBoundingBoxAscent);
    }
    else if (requiresLineHeight == true) {
        var element = TextMetricsInContext2D.element;
        if (element == null) {
            element = document.createElement("div");
            element.style.position = "absolute";
            element.style.top = "0px";
            element.style.left = "0px";
            element.style.zIndex = "-1000";
            element.style.opacity = "0";
            element.style.pointerEvents = "none";
            TextMetricsInContext2D.element = element;
        }
        if (element.parentNode != document.body) {
            document.body.insertBefore(element, document.body.firstElementChild);
        }

        element.style.font = canvas.font;

        RemoveAllChildrenFrom(element);

        var text = document.createTextNode(string);
        element.appendChild(text);

        var range = document.createRange();
        range.selectNodeContents(text);
        var rect = range.getBoundingClientRect();
        metrics.fontBoundingBoxAscent = rect.height;
        metrics.fontBoundingBoxDescent = 0;

        var timer = TextMetricsInContext2D.elementCleanup;
        if (timer != null) {
            window.clearTimeout(timer);
        }

        TextMetricsInContext2D.elementCleanup = window.setTimeout(() => {
            TextMetricsInContext2D.elementCleanup = null;
            if (element.parentNode != null) {
                element.parentNode.removeChild(element);
            }
        }, 500);
    }
    return metrics;
}

// XXX: Would be nice to extend this to enumerate all matches...
function TextLinkExtractor(textString, callback) {
    var linkMatch = textString.match(/(https?:\/\/[^\s]+)/);
    if (linkMatch == null || linkMatch.length != 2) {
        callback(textString, false);
        return;
    }

    var textLink = linkMatch[1];
    var beforeLink = null;
    var afterLink = null;
    var linkOffset = textString.indexOf(textLink);
    if (linkOffset != -1) {
        beforeLink = textString.substring(0, linkOffset);
        afterLink = textString.substring(linkOffset + textLink.length);
    }

    if (beforeLink == null || afterLink == null) {
        console.error("Failed to make sense of link in text", textLink, textString);
        callback(textString, false);
        return;
    }

    if (beforeLink.length > 0) {
        callback(beforeLink, false);
    }
    callback(textLink, true);

    if (afterLink.length > 0) {
        callback(afterLink, false);
    }
}
