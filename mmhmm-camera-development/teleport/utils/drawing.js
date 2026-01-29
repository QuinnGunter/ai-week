//
//  utils/drawing.js
//  mmhmm
//
//  Created by Steve White on 2/26/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//
function ImageBlobWithOptionsUsingCommands(options, commands) {
    return new Promise(async (resolve, reject) => {
        var canvas = null;
        var size = options.size;
        if (size == null || isNaN(size.width) || size.width <= 0 || isNaN(size.height) || size.height <= 0) {
            console.error("Supplied invalid size: ", JSON.stringify(size));
            debugger;
            reject();
            return;
        }

        if (window.OffscreenCanvas != null) {
            try {
                canvas = new OffscreenCanvas(size.width, size.height);
            } catch (err) {
                console.error("Error creating OffscreenCanvas: ", err, size);
                reject(err);
                return;
            }
        }
        else {
            canvas = document.createElement("canvas");
            canvas.width = size.width;
            canvas.height = size.height;
            // TODO (eslint, debugging, no-constant-condition): make a debug flag
            /* eslint-disable no-constant-condition */
            if (false) {
                canvas.style.position = "absolute";
                canvas.style.zIndex = 1 << 20;
                canvas.style.top = "0px";
                canvas.style.left = "0px";
                canvas.style.width = size.width + "px";
                canvas.style.height = size.height + "px";
                document.body.appendChild(canvas);
            }
            /* eslint-enable no-constant-condition */
        }

        var context = canvas.getContext("2d");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        var loader = async function(source) {
            var tagName = source.tagName;
            if (tagName != null) {
                tagName = tagName.toLowerCase();
            }

            if (tagName == "img" || tagName == "video") {
                return source;
            }
            else if (tagName == "svg") {
                var xml = new XMLSerializer().serializeToString(source);
                var base64 = 'data:image/svg+xml;base64,' + btoa(xml);
                const image = new Image();
                image.src = base64;
                await image.decode();
                return image;
            }
            else if (source.constructor == String || source.constructor == URL) {
                const image = new Image();
                image.src = source;
                image.crossOrigin = "anonymous";
                try {
                    await image.decode();
                }
                catch (err) {
                    console.error("Error loading source string: ", source, err);
                    throw err;
                }
                return image;
            }
            else if (source.constructor == Blob) {
                var url = URL.createObjectURL(source);
                const image = new Image();
                image.src = url;
                try {
                    await image.decode();
                    return image;
                }
                catch (err) {
                    console.error("Error loading source blob: ", source, err);
                    throw err;
                }
                finally {
                    URL.revokeObjectURL(url);
                }
            }
            else {
                console.error("unsupported type: ", source);
                debugger;
                return null;
            }
        }

        try {
            const success = await commands(context, loader);
            if (success == false) {
                reject();
            }
        } catch (err) {
            reject(err);
            return;
        }

        if (canvas.convertToBlob != null) {
            try {
                var blob = await canvas.convertToBlob(options);
                resolve(blob);
            }
            catch (err) {
                console.error("convertToBlob returned error", err);
                reject(err);
            }
            return;
        }

        try {
            canvas.toBlob((blob) => {
                if (blob != null) {
                    resolve(blob);
                }
                else {
                    reject();
                }
            }, options.mime, options.quality);
        }
        catch (err) {
            reject(err);
        }
    })
}
