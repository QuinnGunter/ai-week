#include "edge_light_monitor.h"

namespace mmhmm {

CefRefPtr<CefDictionaryValue> ToCefDictionary(EdgeLightConfiguration config) {
    auto dictionary = CefDictionaryValue::Create();
    dictionary->SetBool(EdgeLightMonitorKeys::isEnabled, config.isEnabled);
    dictionary->SetDouble(EdgeLightMonitorKeys::brightness, config.brightness);
    dictionary->SetDouble(EdgeLightMonitorKeys::width, config.width);
    dictionary->SetDouble(EdgeLightMonitorKeys::colorTemperature, config.colorTemperature);
    dictionary->SetBool(EdgeLightMonitorKeys::autoBrightness, config.autoBrightness);
    return dictionary;
}

std::optional<EdgeLightConfiguration> EdgeLightConfigurationFromCefDictionary(
    CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) {
        return std::nullopt;
    }

    EdgeLightConfiguration config;

    if (dictionary->HasKey(EdgeLightMonitorKeys::isEnabled)) {
        config.isEnabled = dictionary->GetBool(EdgeLightMonitorKeys::isEnabled);
    }
    if (dictionary->HasKey(EdgeLightMonitorKeys::brightness)) {
        config.brightness = dictionary->GetDouble(EdgeLightMonitorKeys::brightness);
    }
    if (dictionary->HasKey(EdgeLightMonitorKeys::width)) {
        config.width = dictionary->GetDouble(EdgeLightMonitorKeys::width);
    }
    if (dictionary->HasKey(EdgeLightMonitorKeys::colorTemperature)) {
        config.colorTemperature = dictionary->GetDouble(EdgeLightMonitorKeys::colorTemperature);
    }
    if (dictionary->HasKey(EdgeLightMonitorKeys::autoBrightness)) {
        config.autoBrightness = dictionary->GetBool(EdgeLightMonitorKeys::autoBrightness);
    }

    return config;
}

}  // namespace mmhmm

namespace mmhmm {

const std::string EdgeLightMonitorKeys::dictionary = "EdgeLight.Key.State";
const std::string EdgeLightMonitorKeys::configuration = "EdgeLight.Key.Configuration";
const std::string EdgeLightMonitorKeys::isEnabled = "isEnabled";
const std::string EdgeLightMonitorKeys::brightness = "brightness";
const std::string EdgeLightMonitorKeys::width = "width";
const std::string EdgeLightMonitorKeys::colorTemperature = "colorTemperature";
const std::string EdgeLightMonitorKeys::autoBrightness = "autoBrightness";

const std::string EdgeLightMonitorMessageNames::configurationUpdate = "EdgeLight.Message.ConfigurationUpdate";
const std::string EdgeLightMonitorMessageNames::setEnabled = "EdgeLight.Message.SetEnabled";
const std::string EdgeLightMonitorMessageNames::setBrightness = "EdgeLight.Message.SetBrightness";
const std::string EdgeLightMonitorMessageNames::setWidth = "EdgeLight.Message.SetWidth";
const std::string EdgeLightMonitorMessageNames::setColorTemperature = "EdgeLight.Message.SetColorTemperature";
const std::string EdgeLightMonitorMessageNames::setAutoBrightness = "EdgeLight.Message.SetAutoBrightness";

}  // namespace mmhmm
