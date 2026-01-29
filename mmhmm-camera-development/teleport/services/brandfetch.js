//
//  brandfetch.js
//  mmhmm
//
//  Created by Seth Hitchings on 5/5/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

// A wrapper around the BrandFetch API, which allows us to fetch
// basic brand data like name, logo, color and font for a given domain.
// See https://docs.brandfetch.com/reference/brand-api
class BrandFetch {

    static clientID = "1tdFD3GfG8FxN1H8DsguigXtGLJEDtJv2pX7Pmz0Y6I=";
    static minimimQualityScore = 0.4;

    static async searchBrand(query) {
        const url = `https://api.brandfetch.io/v2/search/${encodeURIComponent(query)}?c=${BrandFetch.clientID}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error fetching brand search results: ${response.status}`);
            }
            const results = await response.json();
            return results.filter(result => result.qualityScore && result.qualityScore >= BrandFetch.minimimQualityScore);
        } catch (error) {
            console.error('Error fetching brand search results:', error);
            throw error;
        }
    }

    static async getBrandData(domain) {
        const url = `https://api.brandfetch.io/v2/brands/${domain}`;
        const headers = {
            Authorization: `Bearer ${BrandFetch.clientID}`,
        };

        try {
            const response = await fetch(url, { headers });
            if (!response.ok) {
                throw new Error(`Error fetching brand data: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching brand data:', error);
            throw error;
        }
    }

    static parseBrandData(data) {
        // Ignore NSFW brands and low-quality data
        const score = data.qualityScore ?? 0;
        if (data.isNsfw === true || score < BrandFetch.minimimQualityScore) {
            return null;
        }

        return {
            name: data.name,
            domain: data.domain,
            images: BrandFetch.parseLogos(data.logos || []),
            colors: BrandFetch.parseColors(data.colors || []),
        };
    }

    static parseLogos(logos) {
        // The "logo" type seems to represent the word mark + brand mark lockup
        // The "symbol" type seems to represent the brand mark
        // The "icon" type generally seems to include a background; we aren't using this
        // I've also seen "other" contining a word mark
        return {
            wordmark : BrandFetch.getLogosOfType(logos, "logo"),
            brandmark : BrandFetch.getLogosOfType(logos, "symbol"),
            icon: BrandFetch.getLogosOfType(logos, "icon"),
            all: {
                svg: BrandFetch.getAllLogosOfFormat(logos, "svg"),
                raster: BrandFetch.getAllRasterLogos(logos),
            },
        };
    }

    static getAllRasterLogos(logos) {
        const urls = [];

        // We only one URL for each logo
        // Prefer PNG, but fall back to JPEG if PNGs are not available
        logos.forEach((logo) => {
            const url = BrandFetch.getAssetUrl(logo, "png") ?? BrandFetch.getAssetUrl(logo, "jpeg");
            if (url) {
                urls.push(url);
            }
        });

        return urls;
    }

    static getAllLogosOfFormat(logos, format) {
        const urls = [];

        logos.forEach((logo) => {
            const url = BrandFetch.getAssetUrl(logo, format);
            if (url) {
                urls.push(url);
            }
        });

        return urls;
    }

    static getLogosOfType(logos, type) {
        // Choose one from the set of logos of the given type
        // Many brands seem to have just one, but some have both "dark" and "light" versions
        // We prefer light
        const logosOfType = logos.filter((logo) => logo.type == type);
        let logo = logosOfType.find((logo) => logo.theme == "light");
        if (!logo) {
            logo = logosOfType.find((logo) => logo.theme == "dark");
        }
        return {
            png : BrandFetch.getAssetUrl(logo, "png"),
            svg: BrandFetch.getAssetUrl(logo, "svg"),
            jpg: BrandFetch.getAssetUrl(logo, "jpeg"),
            theme: logo?.theme,
        }
    }

    static getAssetUrl(item, format) {
        if (!item || !item.formats || item.formats.length === 0) {
            return null;
        }

        let images = item.formats.filter((itemFormat) => itemFormat.format === format);
        if (images.length > 1) {
            // If there's more than one image of this format,
            // prefer the first with a transparent background
            const transparent = images.filter((format) => format.background === "transparent");
            if (transparent.length > 0) {
                images = transparent;
            }
        }
        if (images.length > 0) {
            return images[0].src;
        }

        return null;
    }

    static parseColors(colors) {
        // Color types include "dark", "light", "accent" and "brand"
        // The most interesting color is usually the "accent"
        // I've seen multiple "brand" colors

        let brand = null;
        const brandColors = colors.filter((color) => color.type === "brand");
        if (brandColors.length > 0) {
            brand = brandColors[0].hex;
        }

        let accent = null;
        const accentColors = colors.filter((color) => color.type === "accent");
        if (accentColors.length > 0) {
            if (brand == null) {
                // If we don't have a brand color, use the first accent color
                brand = accentColors[0].hex;
            } else {
                accent = accentColors[0].hex;
            }
        }

        return {
            brand,
            accent,
            all: colors.map((color) => color.hex),
        };
    }

}
