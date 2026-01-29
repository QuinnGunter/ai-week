//
//  looks/luts.js
//  mmhmm
//
//  Created for LUT color grading support.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * LUT (Look-Up Table) information object
 * @typedef {Object} LUTInfo
 * @property {string} id - Unique identifier
 * @property {string} title - Display name
 * @property {string} thumbnailUrl - URL for preview thumbnail
 * @property {boolean} isBuiltIn - Whether this is a bundled LUT
 * @property {string} [fingerprint] - Content hash for caching
 */

/**
 * Storage and management for LUT color grades
 *
 * Handles both built-in preset LUTs and user-imported LUTs.
 * Uses FileStorage (Cache API) for persistence.
 */
class LookLUTs {
    static #STORAGE_NAME = "luts-v1";
    static #storage = null;
    static #userLUTsCache = null;
    static #lutDataCache = new Map();

    /**
     * Built-in LUT presets
     */
    static BuiltIn = {
        BlueArchitecture: {
            id: "builtin-blue-architecture",
            title: LocalizedString("Blue Architecture"),
            filename: "BlueArchitecture.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        },
        BlueHour: {
            id: "builtin-blue-hour",
            title: LocalizedString("Blue Hour"),
            filename: "BlueHour.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        },
        ColdChrome: {
            id: "builtin-cold-chrome",
            title: LocalizedString("Cold Chrome"),
            filename: "ColdChrome.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        },
        CrispAutumn: {
            id: "builtin-crisp-autumn",
            title: LocalizedString("Crisp Autumn"),
            filename: "CrispAutumn.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        },
        DarkAndSomber: {
            id: "builtin-dark-and-somber",
            title: LocalizedString("Dark and Somber"),
            filename: "DarkAndSomber.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        },
        HardBoost: {
            id: "builtin-hard-boost",
            title: LocalizedString("Hard Boost"),
            filename: "HardBoost.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        },
        LongBeachMorning: {
            id: "builtin-long-beach-morning",
            title: LocalizedString("Long Beach Morning"),
            filename: "LongBeachMorning.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        },
        LushGreen: {
            id: "builtin-lush-green",
            title: LocalizedString("Lush Green"),
            filename: "LushGreen.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        },
        MagicHour: {
            id: "builtin-magic-hour",
            title: LocalizedString("Magic Hour"),
            filename: "MagicHour.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        },
        NaturalBoost: {
            id: "builtin-natural-boost",
            title: LocalizedString("Natural Boost"),
            filename: "NaturalBoost.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        },
        OrangeAndBlue: {
            id: "builtin-orange-and-blue",
            title: LocalizedString("Orange and Blue"),
            filename: "OrangeAndBlue.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        },
        SoftBlackAndWhite: {
            id: "builtin-soft-black-and-white",
            title: LocalizedString("Soft Black and White"),
            filename: "SoftBlackAndWhite.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        },
        Waves: {
            id: "builtin-waves",
            title: LocalizedString("Waves"),
            filename: "Waves.cube",
            thumbnailUrl: null,
            isBuiltIn: true
        }
    };

    /**
     * Initialize the storage system
     * @private
     */
    static #initStorage() {
        if (LookLUTs.#storage === null) {
            LookLUTs.#storage = new FileStorage(LookLUTs.#STORAGE_NAME, null, () => {
                LookLUTs.#userLUTsCache = null; // Invalidate cache when storage opens
            });
        }
        return LookLUTs.#storage;
    }

    /**
     * Get all built-in LUTs
     * @returns {LUTInfo[]}
     */
    static getBuiltInLUTs() {
        return Object.values(LookLUTs.BuiltIn);
    }

    /**
     * Get all user-imported LUTs
     * @returns {Promise<LUTInfo[]>}
     */
    static async getUserLUTs() {
        if (LookLUTs.#userLUTsCache !== null) {
            return LookLUTs.#userLUTsCache;
        }

        const storage = LookLUTs.#initStorage();
        const metaList = await storage.get("user-luts-index", { request: false });

        if (metaList === null) {
            LookLUTs.#userLUTsCache = [];
            return [];
        }

        LookLUTs.#userLUTsCache = metaList;
        return metaList;
    }

    /**
     * Get all LUTs (built-in + user)
     * @returns {Promise<LUTInfo[]>}
     */
    static async getAllLUTs() {
        const builtIn = LookLUTs.getBuiltInLUTs();
        const user = await LookLUTs.getUserLUTs();
        return [...builtIn, ...user];
    }

    /**
     * Find a LUT by ID
     * @param {string} lutId
     * @returns {Promise<LUTInfo|null>}
     */
    static async getLUTInfo(lutId) {
        if (!lutId) return null;

        // Check built-in first
        const builtIn = Object.values(LookLUTs.BuiltIn).find(l => l.id === lutId);
        if (builtIn) return builtIn;

        // Check user LUTs
        const userLUTs = await LookLUTs.getUserLUTs();
        return userLUTs.find(l => l.id === lutId) || null;
    }

    /**
     * Import a LUT file
     * @param {File} file - The LUT file to import
     * @returns {Promise<LUTInfo>} The imported LUT info
     */
    static async importLUT(file) {
        // Parse the LUT file
        const lutData = await LUTParser.parse(file);

        if (!LUTParser.validate(lutData)) {
            throw new Error("Invalid LUT data");
        }

        const storage = LookLUTs.#initStorage();

        // Generate unique ID
        const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Store the LUT data
        const dataKey = `${id}-data`;
        const dataBlob = new Blob([lutData.data.buffer], { type: "application/octet-stream" });
        await storage.put(dataBlob, dataKey);

        // Create metadata
        const lutInfo = {
            id,
            title: lutData.title || file.name.replace(/\.[^.]+$/, ''),
            size: lutData.size,
            thumbnailUrl: null, // Could generate thumbnail later
            isBuiltIn: false,
            fingerprint: await LookLUTs.#hashData(lutData.data),
            domainMin: lutData.domainMin,
            domainMax: lutData.domainMax,
            importedAt: Date.now()
        };

        // Store metadata
        const metaKey = `${id}-meta`;
        await storage.put(lutInfo, metaKey);

        // Update index
        const userLUTs = await LookLUTs.getUserLUTs();
        userLUTs.push(lutInfo);
        await storage.put(userLUTs, "user-luts-index");

        // Invalidate cache
        LookLUTs.#userLUTsCache = userLUTs;

        return lutInfo;
    }

    /**
     * Load LUT data for a given LUT info
     * @param {LUTInfo} lutInfo
     * @returns {Promise<LUTData>}
     */
    static async getLUTData(lutInfo) {
        if (!lutInfo) return null;

        // Check cache first
        const cacheKey = lutInfo.id;
        if (LookLUTs.#lutDataCache.has(cacheKey)) {
            return LookLUTs.#lutDataCache.get(cacheKey);
        }

        let lutData;

        if (lutInfo.isBuiltIn) {
            // Load from bundled assets
            const assetPath = `assets/luts/${lutInfo.filename}`;
            const response = await fetch(assetPath);

            if (!response.ok) {
                throw new Error(`Failed to load built-in LUT: ${lutInfo.filename}`);
            }

            const text = await response.text();
            lutData = LUTParser.parseCube(text, lutInfo.title);
        } else {
            // Load from storage
            const storage = LookLUTs.#initStorage();
            const dataKey = `${lutInfo.id}-data`;
            const blob = await storage.get(dataKey, { decode: false, request: false });

            if (blob === null) {
                throw new Error(`LUT data not found: ${lutInfo.id}`);
            }

            const buffer = await blob.arrayBuffer();
            const data = new Float32Array(buffer);

            // Reconstruct LUT data
            const entryCount = data.length / 3;
            const size = lutInfo.size || Math.round(Math.pow(entryCount, 1/3));

            lutData = {
                size,
                title: lutInfo.title,
                data,
                domainMin: lutInfo.domainMin || [0, 0, 0],
                domainMax: lutInfo.domainMax || [1, 1, 1]
            };
        }

        // Cache the loaded data
        LookLUTs.#lutDataCache.set(cacheKey, lutData);

        return lutData;
    }

    /**
     * Delete a user-imported LUT
     * @param {string} lutId
     * @returns {Promise<boolean>}
     */
    static async deleteLUT(lutId) {
        // Can't delete built-in LUTs
        const lutInfo = await LookLUTs.getLUTInfo(lutId);
        if (!lutInfo || lutInfo.isBuiltIn) {
            return false;
        }

        const storage = LookLUTs.#initStorage();

        // Delete data and metadata
        await storage.delete(`${lutId}-data`);
        await storage.delete(`${lutId}-meta`);

        // Update index
        const userLUTs = await LookLUTs.getUserLUTs();
        const index = userLUTs.findIndex(l => l.id === lutId);
        if (index !== -1) {
            userLUTs.splice(index, 1);
            await storage.put(userLUTs, "user-luts-index");
            LookLUTs.#userLUTsCache = userLUTs;
        }

        // Clear from cache
        LookLUTs.#lutDataCache.delete(lutId);

        return true;
    }

    /**
     * Clear the LUT data cache
     */
    static clearCache() {
        LookLUTs.#lutDataCache.clear();
        LookLUTs.#userLUTsCache = null;
    }

    /**
     * Generate a hash for LUT data
     * @private
     */
    static async #hashData(data) {
        const buffer = data.buffer;
        const hash = await crypto.subtle.digest('SHA-256', buffer);
        return DigestToHexString(hash);
    }

    /**
     * Get supported file extensions for import
     * @returns {string[]}
     */
    static get supportedExtensions() {
        return LUTParser.supportedExtensions;
    }

    /**
     * Check if a file is a supported LUT format
     * @param {File|string} fileOrName
     * @returns {boolean}
     */
    static isSupported(fileOrName) {
        return LUTParser.isSupported(fileOrName);
    }
}

// Convenience reference for All built-in LUTs
LookLUTs.AllBuiltIn = Object.values(LookLUTs.BuiltIn);
