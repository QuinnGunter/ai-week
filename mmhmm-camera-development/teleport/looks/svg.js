//
//  looks/svg.js
//  mmhmm
//
//  Created by Seth Hitchings on 9/30/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LooksSVGUtils {

    /**
     * Loads the SVG's contents from the specified URL as text.
     * @param {string} url - The URL of the SVG file.
     * @returns {Promise<string|null>} A promise that resolves to a string or null if an error occurs.
     */
    static async loadSvgText(url) {
        return LooksSVGUtils.loadSvg(url).then(response => response.text().catch(err => {
            console.error("Error loading SVG text", err);
            return null;
        }));
    }

    /**
     * Loads an SVG's contents from the specified URL as a blob.
     * @param {string} url - The URL of the SVG file.
     * @returns {Promise<Blob|null>} A promise that resolves to a blob or null if an error occurs.
     */
    static async loadSvgBlob(url) {
        return LooksSVGUtils.loadSvg(url).then(response => response.blob().catch(err => {
            console.error("Error loading SVG blob", err);
            return null;
        }));
    }

    /**
     * Loads an SVG's contents from the specified URL.
     * @param {string} url - The URL of the SVG file.
     * @returns {Promise<Response|null>} A promise that resolves to a Response object or null if an error occurs.
     */
    static async loadSvg(url) {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    console.error("Failed to load SVG, response status not OK", response.status);
                    return null;
                }
                return response;
            }).catch(err => {
                console.error("Error loading SVG", err);
                return null;
            });
    }

    /**
     * Replaces colors in the provided SVG's style rules based on the provided color scheme.
     * @param {String} svgText
     * @param {Object} colorScheme
     * @returns {String}
     */
    static replaceColor(svgText, colorScheme) {
        let svgElement = null;

        // We could just do some text find & replace on the svgText, but that seems fragile
        // Instead, we'll use CSSOM to find and mutate the styles we need to change
        try {
            const parser = new DOMParser();
            const svgDocument = parser.parseFromString(svgText, "image/svg+xml");
            svgElement = svgDocument.documentElement;

            // Temporarily attach the SVG to the DOM so that we can walk its styles
            svgElement.style.display = "none";
            document.body.appendChild(svgElement);

            // Find the stylesheet that applies to this SVG
            const sheet = Array.from(document.styleSheets).find(s => s.ownerNode.tagName.toLowerCase() === "style" && svgElement.contains(s.ownerNode));
            if (!sheet) {
                console.warn("No stylesheet found for SVG");
                return svgText;
            }

            // Update the stroke and/or fill colors for any styles that match the color scheme
            // I tried to do this by simply updating the styles directly, but in Safari
            // this didn't work correctly. Instead of trusting the CSSOM to sync back to the stylesheet,
            // we rebuild the stylesheet text and write it back to the <style> element.
            const updatedStyles = [];
            for (let i = 0; i < sheet.cssRules.length; i++) {
                const rule = sheet.cssRules[i];

                // We define our custom properties in the :root selector
                if (rule.selectorText == ":root") {
                    updatedStyles.push(":root {");

                    const style = rule.style;
                    for (let j = 0; j < style.length; j++) {
                        const key = style[j];
                        if (key.startsWith("--")) {
                            const property = key.substring(2); // Remove the leading --
                            if (colorScheme[property]) {
                                updatedStyles.push(`  ${key}: ${colorScheme[property]};`);
                                continue;
                            }
                        }

                        // Keep other properties as-is
                        updatedStyles.push(`  ${key}: ${style.getPropertyValue(key)};`);
                    }

                    // updatedStyles.push("}");
                } else {
                    // Keep this rule as-is
                    updatedStyles.push(rule.cssText);
                }
            }

            // Browsers don't typically sync CSSOM -> style.textContent
            // so we rebuild the textual CSS and write it back into the <style> element
            const cssText = updatedStyles.join("\n");
            sheet.ownerNode.textContent = cssText;

            // Serialize the modified SVG back to a string
            const serializer = new XMLSerializer();
            const updatedSvgText = serializer.serializeToString(svgElement);
            return updatedSvgText;
        } catch (error) {
            // Return the original as a fallback
            console.error("Failed to replace colors in SVG", error);
            return svgText;
        } finally {
            if (svgElement && svgElement.parentNode) {
                // Remove the SVG from the DOM
                document.body.removeChild(svgElement);
            }
        }
    }

    /**
     * Loads the provided SVG text as an HTMLImageElement.
     * @param {String} svgText
     * @returns {Promise<HTMLImageElement>}
     */
    static async loadSvgAsImage(svgText) {
        // Create an object URL for the SVG text
        const svgBlob = new Blob([svgText], {type: "image/svg+xml"});
        const url = URL.createObjectURL(svgBlob);

        const promise = promiseWrapper();

        // Create an image element and load the SVG
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = url;
        image.decode().then(() => {
            promise.resolve(image);
        }).catch(err => {
            promise.reject(err);
        }).finally(() => {
            URL.revokeObjectURL(url);
        });
        return promise;
    }
}
