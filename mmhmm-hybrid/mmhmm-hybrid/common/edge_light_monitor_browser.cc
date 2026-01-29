#include "edge_light_monitor_browser.h"

namespace mmhmm {

EdgeLightMonitor::EdgeLightMonitor() {
    LoadConfiguration();
}

EdgeLightConfiguration EdgeLightMonitor::GetConfiguration() const {
    return configuration_;
}

void EdgeLightMonitor::SetConfiguration(EdgeLightConfiguration config) {
    if (configuration_ != config) {
        configuration_ = config;
        SaveConfiguration();
        UpdateEdgeLightWindow();
        ReportStateUpdate();
    }
}

void EdgeLightMonitor::SetEnabled(bool enabled) {
    if (configuration_.isEnabled != enabled) {
        configuration_.isEnabled = enabled;
        SaveConfiguration();
        ShowEdgeLightWindow(enabled);
        UpdateEdgeLightWindow();
        ReportStateUpdate();
    }
}

void EdgeLightMonitor::SetBrightness(double brightness) {
    // Clamp to valid range
    brightness = std::max(0.0, std::min(1.0, brightness));
    if (configuration_.brightness != brightness) {
        configuration_.brightness = brightness;
        SaveConfiguration();
        UpdateEdgeLightWindow();
        ReportStateUpdate();
    }
}

void EdgeLightMonitor::SetWidth(double width) {
    // Clamp to valid range (1% to 30%)
    width = std::max(0.01, std::min(0.30, width));
    if (configuration_.width != width) {
        configuration_.width = width;
        SaveConfiguration();
        UpdateEdgeLightWindow();
        ReportStateUpdate();
    }
}

void EdgeLightMonitor::SetColorTemperature(double temperature) {
    // Clamp to valid range
    temperature = std::max(0.0, std::min(1.0, temperature));
    if (configuration_.colorTemperature != temperature) {
        configuration_.colorTemperature = temperature;
        SaveConfiguration();
        UpdateEdgeLightWindow();
        ReportStateUpdate();
    }
}

void EdgeLightMonitor::SetAutoBrightness(bool autoBrightness) {
    if (configuration_.autoBrightness != autoBrightness) {
        configuration_.autoBrightness = autoBrightness;
        SaveConfiguration();
        ReportStateUpdate();
    }
}

void EdgeLightMonitor::ReportStateUpdate() const {
    auto message = CreateConfigurationUpdateMessage();
    SendProcessMessageToRendererProcess(message);
}

bool EdgeLightMonitor::AddToDictionary(CefRefPtr<CefDictionaryValue> dictionary) const {
    return dictionary->SetDictionary(EdgeLightMonitorKeys::dictionary, ToCefDictionary());
}

bool EdgeLightMonitor::HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                                            CefRefPtr<CefFrame> frame,
                                            CefProcessId source_process,
                                            CefRefPtr<CefProcessMessage> message) {
    const auto& name = message->GetName();
    auto args = message->GetArgumentList();

    if (name == EdgeLightMonitorMessageNames::setEnabled) {
        if (args->GetSize() >= 1 && args->GetType(0) == VTYPE_BOOL) {
            SetEnabled(args->GetBool(0));
        }
        return true;
    }

    if (name == EdgeLightMonitorMessageNames::setBrightness) {
        if (args->GetSize() >= 1 && args->GetType(0) == VTYPE_DOUBLE) {
            SetBrightness(args->GetDouble(0));
        }
        return true;
    }

    if (name == EdgeLightMonitorMessageNames::setWidth) {
        if (args->GetSize() >= 1 && args->GetType(0) == VTYPE_DOUBLE) {
            SetWidth(args->GetDouble(0));
        }
        return true;
    }

    if (name == EdgeLightMonitorMessageNames::setColorTemperature) {
        if (args->GetSize() >= 1 && args->GetType(0) == VTYPE_DOUBLE) {
            SetColorTemperature(args->GetDouble(0));
        }
        return true;
    }

    if (name == EdgeLightMonitorMessageNames::setAutoBrightness) {
        if (args->GetSize() >= 1 && args->GetType(0) == VTYPE_BOOL) {
            SetAutoBrightness(args->GetBool(0));
        }
        return true;
    }

    return false;
}

CefRefPtr<CefProcessMessage> EdgeLightMonitor::CreateConfigurationUpdateMessage() const {
    CefRefPtr<CefProcessMessage> message =
        CefProcessMessage::Create(EdgeLightMonitorMessageNames::configurationUpdate);
    auto args = message->GetArgumentList();
    args->SetDictionary(0, ToCefDictionary());
    return message;
}

CefRefPtr<CefDictionaryValue> EdgeLightMonitor::ToCefDictionary() const {
    auto dictionary = CefDictionaryValue::Create();
    dictionary->SetDictionary(EdgeLightMonitorKeys::configuration,
                              mmhmm::ToCefDictionary(configuration_));
    return dictionary;
}

void EdgeLightMonitor::SaveConfiguration() const {
    // TODO: Implement persistence via platform-specific user defaults
    // This would typically call into Swift/Objective-C on macOS or
    // Windows registry/settings on Windows
}

void EdgeLightMonitor::LoadConfiguration() {
    // TODO: Implement loading from platform-specific user defaults
    // For now, use default configuration
    configuration_ = EdgeLightConfiguration();
}

void EdgeLightMonitor::UpdateEdgeLightWindow() const {
    // TODO: Send configuration update to the edge light CEF window
    // This would execute JavaScript in the edge light window to update
    // the CSS custom properties
}

void EdgeLightMonitor::ShowEdgeLightWindow(bool show) const {
    // TODO: Show or hide the edge light CEF window
    // This would create/show or hide the borderless overlay window
}

}  // namespace mmhmm
