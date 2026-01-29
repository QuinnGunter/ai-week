#pragma once

#include "include/internal/cef_ptr.h"
#include "include/cef_values.h"

#include <optional>
#include <string>

namespace mmhmm {

/**
 * Edge Light configuration settings.
 *
 * Controls the appearance and behavior of the edge light overlay
 * that illuminates screen borders as a virtual ring light.
 */
struct EdgeLightConfiguration {
    bool isEnabled = false;           // Master on/off state
    double brightness = 0.7;          // 0.0 to 1.0 (display as 0-100%)
    double width = 0.1;               // 0.01 to 0.30 (display as 1-30%)
    double colorTemperature = 0.5;    // 0.0 (warm) to 1.0 (cool)
    bool autoBrightness = false;      // Auto-adjust based on ambient light

    bool operator==(const EdgeLightConfiguration& other) const {
        return isEnabled == other.isEnabled &&
               brightness == other.brightness &&
               width == other.width &&
               colorTemperature == other.colorTemperature &&
               autoBrightness == other.autoBrightness;
    }

    bool operator!=(const EdgeLightConfiguration& other) const {
        return !(*this == other);
    }
};

/**
 * Convert EdgeLightConfiguration to a CEF dictionary for IPC.
 */
CefRefPtr<CefDictionaryValue> ToCefDictionary(EdgeLightConfiguration config);

/**
 * Create EdgeLightConfiguration from a CEF dictionary.
 */
std::optional<EdgeLightConfiguration> EdgeLightConfigurationFromCefDictionary(
    CefRefPtr<CefDictionaryValue> dictionary);

/**
 * Keys for EdgeLightConfiguration dictionary representation.
 */
struct EdgeLightMonitorKeys {
    static const std::string dictionary;
    static const std::string configuration;
    static const std::string isEnabled;
    static const std::string brightness;
    static const std::string width;
    static const std::string colorTemperature;
    static const std::string autoBrightness;
};

/**
 * Message names for edge light IPC between browser and renderer processes.
 */
struct EdgeLightMonitorMessageNames {
    static const std::string configurationUpdate;
    static const std::string setEnabled;
    static const std::string setBrightness;
    static const std::string setWidth;
    static const std::string setColorTemperature;
    static const std::string setAutoBrightness;
};

}  // namespace mmhmm
