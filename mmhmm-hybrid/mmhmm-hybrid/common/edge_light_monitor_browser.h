#pragma once

#include "edge_light_monitor.h"
#include "include/cef_process_message.h"
#include "common/hybrid_object.h"

namespace mmhmm {

/**
 * Browser-process implementation of the Edge Light monitor.
 *
 * Responsible for:
 * - Managing the CEF edge light overlay window
 * - Persisting configuration to user defaults
 * - Handling IPC messages from renderer process
 * - Sending configuration updates to the edge light window
 */
class EdgeLightMonitor : public HybridNativeObject {
public:
    EdgeLightMonitor();
    ~EdgeLightMonitor() override = default;

    /**
     * Get the current configuration.
     */
    EdgeLightConfiguration GetConfiguration() const;

    /**
     * Set the full configuration.
     */
    void SetConfiguration(EdgeLightConfiguration config);

    /**
     * Set individual configuration properties.
     */
    void SetEnabled(bool enabled);
    void SetBrightness(double brightness);
    void SetWidth(double width);
    void SetColorTemperature(double temperature);
    void SetAutoBrightness(bool autoBrightness);

    /**
     * Report state update to renderer process.
     */
    void ReportStateUpdate() const override;

    /**
     * Handle messages from renderer process.
     */
    bool HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                              CefRefPtr<CefFrame> frame,
                              CefProcessId source_process,
                              CefRefPtr<CefProcessMessage> message) override;

    /**
     * Add this object's state to a dictionary for initial renderer setup.
     */
    bool AddToDictionary(CefRefPtr<CefDictionaryValue> dictionary) const override;

private:
    EdgeLightConfiguration configuration_;

    /**
     * Create a configuration update message for IPC.
     */
    CefRefPtr<CefProcessMessage> CreateConfigurationUpdateMessage() const;

    /**
     * Convert current state to CEF dictionary.
     */
    CefRefPtr<CefDictionaryValue> ToCefDictionary() const;

    /**
     * Persist configuration to user defaults.
     */
    void SaveConfiguration() const;

    /**
     * Load configuration from user defaults.
     */
    void LoadConfiguration();

    /**
     * Update the edge light overlay window with current configuration.
     */
    void UpdateEdgeLightWindow() const;

    /**
     * Show or hide the edge light overlay window.
     */
    void ShowEdgeLightWindow(bool show) const;

    // Provide the reference counting implementation for this class.
    IMPLEMENT_REFCOUNTING(EdgeLightMonitor);
};

}  // namespace mmhmm
