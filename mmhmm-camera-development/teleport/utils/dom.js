//
//  utils_dom.js
//  mmhmm
//
//  Created by Steve White on 9/17/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

function AddClassNameToElement(name, elem) {
    elem.classList.add(name);
}

function RemoveClassNameFromElement(name, elem) {
    elem.classList.remove(name);
}

function GetWindowMaxZIndex(target) {
    /*
        var targetParent = target;
        while (targetParent != null && targetParent != document.body) {
            var optZIndex = window.getComputedStyle(targetParent).zIndex;
            if (optZIndex != "auto") {
                optZIndex = parseInt(optZIndex);
                if (isNaN(optZIndex) == false) {
                    zIndex = Math.max(zIndex, optZIndex + 1);
                }
            }
            targetParent = targetParent.parentNode;
        }
    */

    var zIndex = 100;

    var rootElements = Array.from(document.body.childNodes).filter(child => {
        return (child.nodeType == Element.ELEMENT_NODE);
    });

    rootElements.forEach(child => {
        var style = window.getComputedStyle(child);
        var childZIndex = parseInt(style.zIndex);
        if (isNaN(childZIndex) == false) {
            zIndex = Math.max(zIndex, childZIndex);
        }
    })
    return zIndex;
}

function LabelForElement(element) {
    return Array.from(document.getElementsByTagName("label")).find(a => a.getAttribute("for") == element.id)
}

function FirstAncestorWithTagName(descendent, tagName) {
    tagName = tagName.toUpperCase();
    while (descendent != null && descendent.tagName != tagName) {
        descendent = descendent.parentNode;
    }
    return descendent;
}

function FirstAncestorWithParent(descendent, parent) {
    while (descendent != null && descendent.parentNode != parent) {
        descendent = descendent.parentNode;
    }
    return descendent;
}

function IsDescendentOf(element, parent) {
    if (!element|| !parent) { return false; }

    return parent.contains(element);
}

function IsAncestorOf(element, child) {
    return IsDescendentOf(child, element)
}

function RemoveAllChildrenFrom(node) {
    node.replaceChildren();
}

// Register a callback function to be invoked when child
// is appended as a direct child of parent in the DOM.
// Returns a handle to the MutationObserver.
function OnChildAppended(parent, child, callback) {
    return CreateMutationObserver(parent, false, callback, (mutation) => {
        for (const node of mutation.addedNodes) {
            if (node == child) {
                return true;
            }
        }
        return false;
    });
}

// Register a callback function to be invoked when child
// is removed as a direct child of parent in the DOM.
// Returns a handle to the MutationObserver.
function OnChildRemoved(parent, child, callback) {
    return CreateMutationObserver(parent, false, callback, (mutation) => {
        for (const node of mutation.removedNodes) {
            if (node == child) {
                return true;
            }
        }
        return false;
    });
}

// Register a callback function to be invoked when node is removed from the document.
// Returns a handle to the MutationObserver.
function OnRemovedFromDocument(node, callback) {
    return CreateMutationObserver(document, true, callback, (mutation) => {
        for (const removedNode of mutation.removedNodes) {
            if (removedNode.contains(node)) {
                return true;
            }
        }
        return false;
    });
}

function OnAddedToDocument(node, callback) {
    return CreateMutationObserver(document, true, callback, (mutation) => {
        for (const addedNode of mutation.addedNodes) {
            if (addedNode.contains(node)) {
                return true;
            }
        }
        return false;
    });
}

function CreateMutationObserver(parent, subtree, callback, test) {
    const observer = new MutationObserver((mutations, currentObserver) => {
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                if (test(mutation) == true) {
                    // If we find a match, disconnect the observer
                    // so that the callback is only invoked once,
                    // then invoke the callback
                    currentObserver.disconnect();
                    callback();
                    return;
                }
            }
        }
    });
    observer.observe(parent, {
        attributes: false,
        childList: true,
        subtree: subtree,
    });
    return observer;
}

function RunningInIframe() {
    return window.self !== window.top;
}
