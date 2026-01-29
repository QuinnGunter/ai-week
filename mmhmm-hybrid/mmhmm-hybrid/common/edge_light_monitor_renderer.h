#pragma once

#include "edge_light_monitor.h"
#include "include/cef_process_message.h"
#include "include/cef_v8.h"
#include "common/hybrid_object.h"

namespace mmhmm {

/**
 * Renderer-process projection of the Edge Light monitor.
 *
 * Exposes the gHybrid.edgeLight JavaScript API:
 * - gHybrid.edgeLight.configuration (read-only property)
 * - gHybrid.edgeLight.setEnabled(bool)
 * - gHybrid.edgeLight.setBrightness(number)
 * - gHybrid.edgeLight.setWidth(number)
 * - gHybrid.edgeLight.setColorTemperature(number)
 * - gHybrid.edgeLight.setAutoBrightness(bool)
 * - gHybrid.edgeLight.setConfigurationChangedCallback(callback)
 */
class EdgeLightMonitorProjection : public HybridProjectionObject {
public:
    EdgeLightConfiguration GetConfiguration() const;

    /**
     * Handle IPC messages from browser process.
     */
    bool HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                              CefRefPtr<CefFrame> frame,
                              CefProcessId source_process,
                              CefRefPtr<CefProcessMessage> message) override;

    /**
     * Attach V8 object to parent object and initialize from dictionary.
     */
    CefRefPtr<CefV8Value> AttachToValueFromDictionary(
        CefRefPtr<CefV8Value> value,
        CefRefPtr<CefDictionaryValue> dictionary,
        CefRefPtr<CefV8Context> context) override;

    /**
     * Update state in dictionary (for state synchronization).
     */
    void UpdateStateInDictionary(CefRefPtr<CefDictionaryValue> dictionary) override;

private:
    EdgeLightConfiguration configuration_;

    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);

    // V8 property accessor for configuration property
    class EdgeLightMonitorAccessor : public CefV8Accessor {
    public:
        EdgeLightMonitorAccessor(CefRefPtr<EdgeLightMonitorProjection> delegate)
            : delegate_(delegate) {}

        bool Get(const CefString& name,
                 const CefRefPtr<CefV8Value> object,
                 CefRefPtr<CefV8Value>& retval,
                 CefString& exception) override;

        bool Set(const CefString& name,
                 const CefRefPtr<CefV8Value> object,
                 const CefRefPtr<CefV8Value> value,
                 CefString& exception) override;

        IMPLEMENT_REFCOUNTING(EdgeLightMonitorAccessor);

    private:
        CefRefPtr<EdgeLightMonitorProjection> delegate_;
    };

    CefRefPtr<EdgeLightMonitorAccessor> accessor_ =
        new EdgeLightMonitorAccessor(this);

    // V8 function handler for setXxx methods
    class EdgeLightMonitorHandler : public CefV8Handler {
    public:
        EdgeLightMonitorHandler(CefRefPtr<EdgeLightMonitorProjection> delegate)
            : delegate_(delegate) {}

        bool Execute(const CefString& name,
                     CefRefPtr<CefV8Value> object,
                     const CefV8ValueList& arguments,
                     CefRefPtr<CefV8Value>& retval,
                     CefString& exception) override;

        IMPLEMENT_REFCOUNTING(EdgeLightMonitorHandler);

    private:
        CefRefPtr<EdgeLightMonitorProjection> delegate_;
    };

    CefRefPtr<EdgeLightMonitorHandler> handler_ =
        new EdgeLightMonitorHandler(this);

    // V8 object accessor name
    static const std::string v8_accessor_name;

    // V8 property names
    struct V8PropertyNames {
        static const std::string configuration;
    };

    // V8 function names
    struct V8FunctionNames {
        static const std::string setEnabled;
        static const std::string setBrightness;
        static const std::string setWidth;
        static const std::string setColorTemperature;
        static const std::string setAutoBrightness;
        static const std::string setConfigurationChangedCallback;
    };

    IMPLEMENT_REFCOUNTING(EdgeLightMonitorProjection);
};

}  // namespace mmhmm
