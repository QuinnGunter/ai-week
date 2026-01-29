/**
 * Edge Light Overlay Controller
 *
 * Manages the edge light overlay window, receiving configuration
 * updates from the browser process and updating the CSS custom
 * properties to control the glow effect.
 */

class EdgeLightController {
    /**
     * Default configuration values
     */
    static Defaults = {
        isEnabled: false,
        brightness: 0.7,      // 0.0 to 1.0
        width: 0.1,           // 0.01 to 0.30 (percentage as decimal)
        colorTemperature: 0.5 // 0.0 (warm) to 1.0 (cool)
    };

    /**
     * Color temperature presets
     * Maps temperature value (0.0 to 1.0) to RGB color
     */
    static TemperatureColors = {
        warm: { r: 255, g: 197, b: 143 },    // Candlelight warm (2700K)
        neutral: { r: 255, g: 250, b: 244 }, // Neutral white (4000K)
        cool: { r: 230, g: 240, b: 255 }     // Daylight cool (6500K)
    };

    #config;
    #overlay;

    constructor() {
        this.#config = { ...EdgeLightController.Defaults };
        this.#overlay = document.querySelector('.edge-light-overlay');

        this.#parseURLParameters();
        this.#setupMessageListener();
        this.#applyConfiguration();
    }

    /**
     * Parse URL parameters for initial configuration
     * e.g., ?brightness=0.7&width=0.1&temp=0.5&enabled=true
     */
    #parseURLParameters() {
        const params = new URLSearchParams(window.location.search);

        if (params.has('enabled')) {
            this.#config.isEnabled = params.get('enabled') === 'true';
        }
        if (params.has('brightness')) {
            this.#config.brightness = this.#clamp(parseFloat(params.get('brightness')), 0, 1);
        }
        if (params.has('width')) {
            this.#config.width = this.#clamp(parseFloat(params.get('width')), 0.01, 0.30);
        }
        if (params.has('temp')) {
            this.#config.colorTemperature = this.#clamp(parseFloat(params.get('temp')), 0, 1);
        }
    }

    /**
     * Set up listener for postMessage updates from browser process
     */
    #setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'edgeLightConfig') {
                this.updateConfiguration(event.data.config);
            }
        });

        // Also expose a global function for CEF to call directly
        window.updateEdgeLightConfig = (config) => {
            this.updateConfiguration(config);
        };
    }

    /**
     * Update configuration from external source
     * @param {Object} config - Partial or full configuration object
     */
    updateConfiguration(config) {
        if (config.isEnabled !== undefined) {
            this.#config.isEnabled = config.isEnabled;
        }
        if (config.brightness !== undefined) {
            this.#config.brightness = this.#clamp(config.brightness, 0, 1);
        }
        if (config.width !== undefined) {
            this.#config.width = this.#clamp(config.width, 0.01, 0.30);
        }
        if (config.colorTemperature !== undefined) {
            this.#config.colorTemperature = this.#clamp(config.colorTemperature, 0, 1);
        }

        this.#applyConfiguration();
    }

    /**
     * Apply current configuration to CSS custom properties
     */
    #applyConfiguration() {
        const root = document.documentElement;

        // Set brightness (opacity)
        root.style.setProperty('--edge-brightness', this.#config.brightness);

        // Set width as percentage
        root.style.setProperty('--edge-width', `${this.#config.width * 100}%`);

        // Calculate and set color based on temperature
        const color = this.#calculateColorFromTemperature(this.#config.colorTemperature);
        root.style.setProperty('--edge-color', `rgb(${color.r}, ${color.g}, ${color.b})`);
        root.style.setProperty(
            '--edge-color-with-brightness',
            `rgba(${color.r}, ${color.g}, ${color.b}, ${this.#config.brightness})`
        );

        // Toggle enabled/disabled state
        if (this.#overlay) {
            this.#overlay.classList.toggle('enabled', this.#config.isEnabled);
            this.#overlay.classList.toggle('disabled', !this.#config.isEnabled);
        }
    }

    /**
     * Calculate RGB color from temperature value
     * Interpolates between warm, neutral, and cool colors
     * @param {number} temp - Temperature value from 0.0 (warm) to 1.0 (cool)
     * @returns {Object} RGB color object
     */
    #calculateColorFromTemperature(temp) {
        const { warm, neutral, cool } = EdgeLightController.TemperatureColors;

        if (temp <= 0.5) {
            // Interpolate between warm and neutral (0.0 to 0.5)
            const t = temp * 2;
            return {
                r: Math.round(warm.r + (neutral.r - warm.r) * t),
                g: Math.round(warm.g + (neutral.g - warm.g) * t),
                b: Math.round(warm.b + (neutral.b - warm.b) * t)
            };
        } else {
            // Interpolate between neutral and cool (0.5 to 1.0)
            const t = (temp - 0.5) * 2;
            return {
                r: Math.round(neutral.r + (cool.r - neutral.r) * t),
                g: Math.round(neutral.g + (cool.g - neutral.g) * t),
                b: Math.round(neutral.b + (cool.b - neutral.b) * t)
            };
        }
    }

    /**
     * Clamp a value between min and max
     */
    #clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    getConfiguration() {
        return { ...this.#config };
    }

    /**
     * Set enabled state
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.#config.isEnabled = enabled;
        this.#applyConfiguration();
    }

    /**
     * Set brightness
     * @param {number} brightness - 0.0 to 1.0
     */
    setBrightness(brightness) {
        this.#config.brightness = this.#clamp(brightness, 0, 1);
        this.#applyConfiguration();
    }

    /**
     * Set width
     * @param {number} width - 0.01 to 0.30
     */
    setWidth(width) {
        this.#config.width = this.#clamp(width, 0.01, 0.30);
        this.#applyConfiguration();
    }

    /**
     * Set color temperature
     * @param {number} temperature - 0.0 (warm) to 1.0 (cool)
     */
    setColorTemperature(temperature) {
        this.#config.colorTemperature = this.#clamp(temperature, 0, 1);
        this.#applyConfiguration();
    }
}

// Initialize controller when DOM is ready
let edgeLightController;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        edgeLightController = new EdgeLightController();
    });
} else {
    edgeLightController = new EdgeLightController();
}
