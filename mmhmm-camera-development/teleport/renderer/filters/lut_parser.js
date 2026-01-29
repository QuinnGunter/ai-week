//
//  lut_parser.js
//  mmhmm
//
//  Created for LUT color grading support.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Normalized LUT data structure
 * @typedef {Object} LUTData
 * @property {number} size - LUT dimension (typically 17, 33, or 65)
 * @property {string} title - Name from file metadata
 * @property {Float32Array} data - Flattened RGB data [r,g,b,r,g,b,...]
 * @property {number[]} domainMin - Input domain minimum [r,g,b]
 * @property {number[]} domainMax - Input domain maximum [r,g,b]
 */

class LUTParser {
    /**
     * Parse a LUT file and return normalized data
     * @param {File} file - The LUT file to parse
     * @returns {Promise<LUTData>} Parsed LUT data
     */
    static async parse(file) {
        const text = await file.text();
        const extension = file.name.split('.').pop().toLowerCase();

        switch (extension) {
            case 'cube':
                return LUTParser.parseCube(text, file.name);
            case '3dl':
                return LUTParser.parse3DL(text, file.name);
            case 'csp':
                return LUTParser.parseCSP(text, file.name);
            case 'look':
                return LUTParser.parseLOOK(text, file.name);
            default:
                throw new Error(`Unsupported LUT format: ${extension}`);
        }
    }

    /**
     * Parse Adobe/Resolve .cube format
     * @param {string} text - File contents
     * @param {string} filename - Original filename for fallback title
     * @returns {LUTData}
     */
    static parseCube(text, filename = 'Untitled') {
        const lines = text.split(/\r?\n/);

        let title = filename.replace(/\.cube$/i, '');
        let size = 0;
        let domainMin = [0, 0, 0];
        let domainMax = [1, 1, 1];
        const rgbValues = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines and comments
            if (trimmed === '' || trimmed.startsWith('#')) {
                continue;
            }

            // Parse metadata
            if (trimmed.startsWith('TITLE')) {
                const match = trimmed.match(/TITLE\s+"?([^"]+)"?/i);
                if (match) {
                    title = match[1].trim();
                }
                continue;
            }

            if (trimmed.startsWith('LUT_3D_SIZE')) {
                const match = trimmed.match(/LUT_3D_SIZE\s+(\d+)/i);
                if (match) {
                    size = parseInt(match[1], 10);
                }
                continue;
            }

            if (trimmed.startsWith('DOMAIN_MIN')) {
                const match = trimmed.match(/DOMAIN_MIN\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/i);
                if (match) {
                    domainMin = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
                }
                continue;
            }

            if (trimmed.startsWith('DOMAIN_MAX')) {
                const match = trimmed.match(/DOMAIN_MAX\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/i);
                if (match) {
                    domainMax = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
                }
                continue;
            }

            // Parse RGB data - values separated by whitespace
            const values = trimmed.split(/\s+/).map(parseFloat);
            if (values.length >= 3 && !isNaN(values[0])) {
                rgbValues.push(values[0], values[1], values[2]);
            }
        }

        if (size === 0) {
            // Try to infer size from data count
            const entryCount = rgbValues.length / 3;
            size = Math.round(Math.pow(entryCount, 1/3));
        }

        if (size === 0 || rgbValues.length === 0) {
            throw new Error('Invalid .cube file: no valid LUT data found');
        }

        return {
            size,
            title,
            data: new Float32Array(rgbValues),
            domainMin,
            domainMax
        };
    }

    /**
     * Parse Autodesk .3dl format
     * @param {string} text - File contents
     * @param {string} filename - Original filename for fallback title
     * @returns {LUTData}
     */
    static parse3DL(text, filename = 'Untitled') {
        const lines = text.split(/\r?\n/);
        const title = filename.replace(/\.3dl$/i, '');
        const rgbValues = [];
        let size = 0;
        let maxValue = 1023; // Default 10-bit

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines and comments
            if (trimmed === '' || trimmed.startsWith('#')) {
                continue;
            }

            // First line often contains shaper LUT info (skip it)
            // Look for RGB triplets as integers
            const values = trimmed.split(/\s+/).map(v => parseInt(v, 10));

            if (values.length >= 3 && !isNaN(values[0])) {
                // Track max value to determine bit depth
                maxValue = Math.max(maxValue, values[0], values[1], values[2]);
                rgbValues.push(values[0], values[1], values[2]);
            }
        }

        // Normalize based on detected max value
        const normalizer = maxValue > 0 ? maxValue : 1023;
        const normalizedData = new Float32Array(rgbValues.length);
        for (let i = 0; i < rgbValues.length; i++) {
            normalizedData[i] = rgbValues[i] / normalizer;
        }

        // Infer size from data count
        const entryCount = rgbValues.length / 3;
        size = Math.round(Math.pow(entryCount, 1/3));

        if (size === 0 || rgbValues.length === 0) {
            throw new Error('Invalid .3dl file: no valid LUT data found');
        }

        return {
            size,
            title,
            data: normalizedData,
            domainMin: [0, 0, 0],
            domainMax: [1, 1, 1]
        };
    }

    /**
     * Parse Rising Sun Research .csp format
     * @param {string} text - File contents
     * @param {string} filename - Original filename for fallback title
     * @returns {LUTData}
     */
    static parseCSP(text, filename = 'Untitled') {
        const lines = text.split(/\r?\n/);
        const title = filename.replace(/\.csp$/i, '');
        const rgbValues = [];
        let size = 0;
        let inDataSection = false;

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();

            // Skip empty lines
            if (trimmed === '') {
                continue;
            }

            // Check for CSPLUTV100 header
            if (trimmed === 'CSPLUTV100') {
                continue;
            }

            // Check for 3D marker
            if (trimmed === '3D') {
                continue;
            }

            // Look for size line (e.g., "17 17 17")
            const sizeMatch = trimmed.match(/^(\d+)\s+(\d+)\s+(\d+)$/);
            if (sizeMatch && !inDataSection) {
                size = parseInt(sizeMatch[1], 10);
                inDataSection = true;
                continue;
            }

            // Parse RGB data
            if (inDataSection) {
                const values = trimmed.split(/\s+/).map(parseFloat);
                if (values.length >= 3 && !isNaN(values[0])) {
                    rgbValues.push(values[0], values[1], values[2]);
                }
            }
        }

        if (size === 0) {
            const entryCount = rgbValues.length / 3;
            size = Math.round(Math.pow(entryCount, 1/3));
        }

        if (size === 0 || rgbValues.length === 0) {
            throw new Error('Invalid .csp file: no valid LUT data found');
        }

        return {
            size,
            title,
            data: new Float32Array(rgbValues),
            domainMin: [0, 0, 0],
            domainMax: [1, 1, 1]
        };
    }

    /**
     * Parse DaVinci Resolve .look format (XML-based)
     * @param {string} text - File contents
     * @param {string} filename - Original filename for fallback title
     * @returns {LUTData}
     */
    static parseLOOK(text, filename = 'Untitled') {
        let title = filename.replace(/\.look$/i, '');

        // Try to parse as XML
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');

        // Check for parse errors
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Invalid .look file: could not parse XML');
        }

        // Try to find title
        const titleNode = doc.querySelector('LookName') || doc.querySelector('Title');
        if (titleNode && titleNode.textContent) {
            title = titleNode.textContent.trim();
        }

        // Look for embedded LUT data (base64 encoded or inline)
        const lutDataNode = doc.querySelector('LUTData') || doc.querySelector('Data');

        if (!lutDataNode) {
            throw new Error('Invalid .look file: no LUT data found');
        }

        const lutContent = lutDataNode.textContent.trim();

        // Check if it's base64 encoded
        if (lutContent.match(/^[A-Za-z0-9+/=]+$/)) {
            // Decode base64
            const binary = atob(lutContent);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            // Assume 32-bit floats
            const floats = new Float32Array(bytes.buffer);
            const entryCount = floats.length / 3;
            const size = Math.round(Math.pow(entryCount, 1/3));

            return {
                size,
                title,
                data: floats,
                domainMin: [0, 0, 0],
                domainMax: [1, 1, 1]
            };
        }

        // Try parsing as text data
        const values = lutContent.split(/[\s,]+/).map(parseFloat).filter(v => !isNaN(v));

        if (values.length < 3) {
            throw new Error('Invalid .look file: no valid LUT data found');
        }

        const entryCount = values.length / 3;
        const size = Math.round(Math.pow(entryCount, 1/3));

        return {
            size,
            title,
            data: new Float32Array(values),
            domainMin: [0, 0, 0],
            domainMax: [1, 1, 1]
        };
    }

    /**
     * Validate that LUT data is properly formed
     * @param {LUTData} lutData - The parsed LUT data
     * @returns {boolean} True if valid
     */
    static validate(lutData) {
        if (!lutData) return false;
        if (!lutData.size || lutData.size < 2) return false;
        if (!lutData.data || !(lutData.data instanceof Float32Array)) return false;

        const expectedLength = lutData.size * lutData.size * lutData.size * 3;
        if (lutData.data.length !== expectedLength) {
            console.warn(`LUT data length mismatch: expected ${expectedLength}, got ${lutData.data.length}`);
            return false;
        }

        return true;
    }

    /**
     * Get supported file extensions
     * @returns {string[]}
     */
    static get supportedExtensions() {
        return ['cube', '3dl', 'csp', 'look'];
    }

    /**
     * Check if a file is a supported LUT format
     * @param {File|string} fileOrName - File object or filename
     * @returns {boolean}
     */
    static isSupported(fileOrName) {
        const name = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
        const ext = name.split('.').pop().toLowerCase();
        return LUTParser.supportedExtensions.includes(ext);
    }
}
