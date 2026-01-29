//
//  tooltip.js
//  mmhmm
//
//  Created by Seth Hitchings on 4/17/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

// Configure and add convenience methods for tippy.js

tippy.setDefaultProps({
    animation: "scale",
    delay: [300, 0],
    // inertia: true, // add spring effect
    duration: 100 // transition duration
    // scale and opacity start points are in `tooltip/scale.css`
});

/**
 * Add or update a tooltip for an element.
 * @param {HTMLElement} element the element to attach the tooltip to
 * @param {string} content the content to show in the tooltip
 */
function addTooltip(element, content) {
    const instance = element._tippy;
    if (instance) {
        instance.setContent(content);
    } else {
        tippy(element, { content });
    }
}
