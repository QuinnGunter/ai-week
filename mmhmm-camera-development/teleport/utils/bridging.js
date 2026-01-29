//
//  bridging.js
//  mmhmm
//
//  Created by Steve White on 12/14/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

// This file is only intended for use in a browser.
// For native platforms, this should not be used,
// and these functions should be exposed to the JS VM
// to return native suitable objects


// Colors and Fonts are primarily used with a 2d drawing context
// (e.g. CanvasRenderingContext2D on a browser) and a native
// platform should implement these functions with that in mind:
// Apple platforms would likely use a CGContextRef to
// implement the 2d drawing primitives, so the objects
// returned here should be suitable for use with a CGContextRef
// e.g. Color could return NSColor/UIColor/CGColorRef
//      Font could return NSFont/UIFont/CGFontRef/CTFontRef

//
// Colors
//
function Color(red, green, blue, alpha) {
    red = clamp(red, 0.0, 1.0);
    green = clamp(green, 0.0, 1.0);
    blue = clamp(blue, 0.0, 1.0);

    var r = Math.round(red * 255);
    var g = Math.round(green * 255);
    var b = Math.round(blue * 255);

    if (alpha == null) alpha = 1.0;
    alpha = clamp(alpha, 0.0, 1.0);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ColorWithWhite(white, alpha) {
    return Color(white, white, white, alpha);
}

function ColorGetComponents(color) {
    // This is gross, but Color() needs to return a String
    // to work in a CanvasRenderingContext2D:
    //
    // I tried to return an object with a toString function,
    // but that didn't work for fillStyle/shadowColor/etc.
    //
    // And Strings in JS apparently aren't objects, so
    // trying to add a property to what Color() returned failed.
    //
    // So ugly imprecise regexp to try and get the components back out...
    // TODO (eslint, no-useless-escape): check this regex.
    /* eslint-disable no-useless-escape */
    var matches = color.match(/^[^0-9]*([0-9]*)[^0-9]*([0-9]*)[^0-9]*([0-9]*)[^0-9]*([0-9\.]*).*$/);
    /* eslint-enable no-useless-escape */
    if (matches != null && matches.length == 5) {
        return [parseInt(matches[1]) / 255, parseInt(matches[2]) / 255, parseInt(matches[3]) / 255, parseFloat(matches[4])];
    }
    return [0, 0, 0, 0];
}

function ColorHexToRGB(hex, alpha) {
    if (hex.startsWith("#") == true) {
        hex = hex.substring(1);
    }
    var rgb = [
        parseInt(hex.substring(0, 2), 16) / 255.0,
        parseInt(hex.substring(2, 4), 16) / 255.0,
        parseInt(hex.substring(4, 6), 16) / 255.0,
    ];
    if (hex.length == 8) {
        rgb.push(parseInt(hex.substring(6, 8), 16) / 255.0);
    } else if (alpha != null) {
        rgb.push(alpha);
    }
    return rgb;
}

function ColorRGBAToHex(rgba) {
    if (rgba.length < 3) {
        return null;
    }
    const r = Math.round(clamp(rgba[0], 0.0, 1.0) * 255);
    const g = Math.round(clamp(rgba[1], 0.0, 1.0) * 255);
    const b = Math.round(clamp(rgba[2], 0.0, 1.0) * 255);
    let hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    if (rgba.length >= 4 && rgba[3] != 1.0) {
        const a = Math.round(clamp(rgba[3], 0.0, 1.0) * 255);
        hex += a.toString(16).padStart(2, "0");
    }
    return hex;
}
