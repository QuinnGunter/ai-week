//
//  tune.js
//  mmhmm
//
//  Created for image correction support.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Tune Filter for image correction adjustments
 *
 * Provides technical image corrections (exposure, contrast, saturation, temperature)
 * that work separately from creative LUT color grading. Applied BEFORE LUT in the
 * rendering pipeline: Camera Feed → TuneFilter → LUTFilter → Output
 *
 * Algorithms based on industry standards:
 * - Exposure: EV stops (photography standard)
 * - Contrast: S-curve around midpoint
 * - Saturation: Luminance-preserving blend (WCAG Rec. 709)
 * - Temperature: Kelvin white balance (Tanner Helland algorithm)
 *
 * References:
 * - https://tsev.dev/posts/2020-06-19-colour-correction-with-webgl/
 * - https://help.pixera.one/en_US/glsl-effects/colortemperatureglsl
 */
class TuneFilter extends RenderFilter {
    /**
     * @override
     */
    constructor() {
        const fragment = `
precision mediump float;

varying vec2 v_texcoord;
uniform sampler2D u_texture;
uniform lowp float u_opacity;
uniform lowp float u_exposure;
uniform lowp float u_contrast;
uniform lowp float u_saturation;
uniform lowp float u_temperature;
uniform int u_alphaMode;

// WCAG luminosity factors (Rec. 709)
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

// Exposure: EV stops (-1 = halve, +1 = double brightness)
vec3 applyExposure(vec3 c, float ev) {
    return c * pow(2.0, ev);
}

// Contrast: S-curve around 0.5 midpoint
vec3 applyContrast(vec3 c, float k) {
    return 0.5 + (1.0 + k) * (c - 0.5);
}

// Saturation: Luminance-preserving blend to grayscale
vec3 applySaturation(vec3 c, float s) {
    vec3 grayscale = vec3(dot(c, LUMA));
    return mix(grayscale, c, 1.0 + s);
}

// Temperature: Kelvin-based white balance shift
// Based on Tanner Helland's algorithm via Pixera/Blender
vec3 colorTemperatureToRGB(float temp) {
    mat3 m = (temp <= 6500.0) ?
        mat3(vec3(0.0, -2902.1955373783176, -8257.7997278925690),
             vec3(0.0, 1669.5803561666639, 2575.2827530017594),
             vec3(1.0, 1.3302673723350029, 1.8993753891711275)) :
        mat3(vec3(1745.0425298314172, 1216.6168361476490, -8257.7997278925690),
             vec3(-2666.3474220535695, -2173.1012343082230, 2575.2827530017594),
             vec3(0.55995389139931482, 0.70381203140554553, 1.8993753891711275));
    return clamp(vec3(m[0] / (vec3(clamp(temp, 1000.0, 40000.0)) + m[1]) + m[2]), 0.0, 1.0);
}

// Apply temperature adjustment
// Maps slider (-1 to +1) to Kelvin (9000K to 4000K)
// Negative = cooler (blue), Positive = warmer (orange)
vec3 applyTemperature(vec3 c, float t) {
    float kelvin = 6500.0 - t * 2500.0;
    vec3 whiteBalance = colorTemperatureToRGB(kelvin);
    // Multiply by inverse of white point to shift colors
    return c * (vec3(1.0) / whiteBalance);
}

void main() {
    vec4 color = texture2D(u_texture, v_texcoord);

    if (color.a < 0.01) {
        discard;
    }

    vec3 original = color.rgb;
    vec3 rgb = color.rgb;

    // Apply corrections in order: exposure → contrast → saturation → temperature
    rgb = applyExposure(rgb, u_exposure);
    rgb = applyContrast(rgb, u_contrast);
    rgb = applySaturation(rgb, u_saturation);
    rgb = applyTemperature(rgb, u_temperature);

    // Clamp to valid range
    rgb = clamp(rgb, 0.0, 1.0);

    // Alpha-aware blend
    float blendAmount = 1.0;
    if (u_alphaMode == 1) {
        // Foreground: apply effect only where alpha is high (person)
        blendAmount = smoothstep(0.4, 0.6, color.a);
    } else if (u_alphaMode == 2) {
        // Background: apply effect only where alpha is low (background)
        blendAmount = 1.0 - smoothstep(0.4, 0.6, color.a);
    }
    // u_alphaMode == 0: All - full effect (default)

    rgb = mix(original, rgb, blendAmount);

    gl_FragColor = vec4(rgb, color.a * u_opacity);
}
        `;

        const parameters = {
            exposure: {
                type: "slider",
                min: -1,
                max: 1,
                default: 0,
                title: LocalizedString("Exposure")
            },
            contrast: {
                type: "slider",
                min: -1,
                max: 1,
                default: 0,
                title: LocalizedString("Contrast")
            },
            saturation: {
                type: "slider",
                min: -1,
                max: 1,
                default: 0,
                title: LocalizedString("Saturation")
            },
            temperature: {
                type: "slider",
                min: -1,
                max: 1,
                default: 0,
                title: LocalizedString("Temperature")
            }
        };

        super(
            fragment,
            ["u_texture", "u_opacity", "u_exposure", "u_contrast", "u_saturation", "u_temperature", "u_alphaMode"],
            parameters
        );
        this.modifiesContents = true;

        // Initialize parameters to defaults
        this.exposure = 0;
        this.contrast = 0;
        this.saturation = 0;
        this.temperature = 0;
        this.alphaMode = 0;  // 0=All, 1=Foreground, 2=Background
    }

    /**
     * Prepare uniforms for rendering
     * @override
     */
    prepare(gl, program) {
        gl.uniform1f(program.uniforms.u_exposure, this.exposure);
        gl.uniform1f(program.uniforms.u_contrast, this.contrast);
        gl.uniform1f(program.uniforms.u_saturation, this.saturation);
        gl.uniform1f(program.uniforms.u_temperature, this.temperature);
        gl.uniform1i(program.uniforms.u_alphaMode, this.alphaMode);
    }

    /**
     * Check if any adjustments have been made
     * @returns {boolean}
     */
    hasAdjustments() {
        return this.exposure !== 0 ||
               this.contrast !== 0 ||
               this.saturation !== 0 ||
               this.temperature !== 0 ||
               this.alphaMode !== 0;
    }

    /**
     * Reset all adjustments to defaults
     */
    reset() {
        this.exposure = 0;
        this.contrast = 0;
        this.saturation = 0;
        this.temperature = 0;
        this.alphaMode = 0;
    }

    /**
     * Set all values at once
     * @param {Object} values - Object with exposure, contrast, saturation, temperature
     */
    setValues(values) {
        if (values.exposure !== undefined) this.exposure = values.exposure;
        if (values.contrast !== undefined) this.contrast = values.contrast;
        if (values.saturation !== undefined) this.saturation = values.saturation;
        if (values.temperature !== undefined) this.temperature = values.temperature;
        if (values.alphaMode !== undefined) this.alphaMode = values.alphaMode;
    }

    /**
     * Get all current values
     * @returns {Object}
     */
    getValues() {
        return {
            exposure: this.exposure,
            contrast: this.contrast,
            saturation: this.saturation,
            temperature: this.temperature,
            alphaMode: this.alphaMode
        };
    }
}

TuneFilter.identifier = "b4e8c912-3d56-4a7f-9c1b-2e8f6d4a5b3c";
