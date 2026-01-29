#pragma once

#include "system_video_effects_monitor.h"
#include "include/cef_process_message.h"
#include "include/cef_v8.h"
#include "common/hybrid_object.h"

namespace mmhmm {
  class SystemVideoEffectsMonitorProjection: public HybridProjectionObject {
  public:
    SystemVideoEffectsStatus GetStatus() const;
    void ShowSystemUI() const;

    bool HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                              CefRefPtr<CefFrame> frame,
                              CefProcessId source_process,
                              CefRefPtr<CefProcessMessage> message) override;

    CefRefPtr<CefV8Value> AttachToValueFromDictionary(CefRefPtr<CefV8Value> value,
                                                      CefRefPtr<CefDictionaryValue> dictionary,
                                                      CefRefPtr<CefV8Context> context) override;

    void UpdateStateInDictionary(CefRefPtr<CefDictionaryValue> dictionary) override;
  private:
    SystemVideoEffectsStatus status_ {};

    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);

    class SystemVideoEffectsMonitorAccessor : public CefV8Accessor {
     public:
      SystemVideoEffectsMonitorAccessor(CefRefPtr<SystemVideoEffectsMonitorProjection> delegate)
          : delegate_(delegate) {}
      bool Get(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               CefRefPtr<CefV8Value>& retval,
               CefString& exception) override;
      bool Set(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               const CefRefPtr<CefV8Value> value,
               CefString& exception) override;
      IMPLEMENT_REFCOUNTING(SystemVideoEffectsMonitorAccessor);

     private:
      CefRefPtr<SystemVideoEffectsMonitorProjection> delegate_;
    };

    /// V8 property accessor. Used by renderer process.
    CefRefPtr<SystemVideoEffectsMonitorAccessor> accessor_ = new SystemVideoEffectsMonitorAccessor(this);

    class SystemVideoEffectsMonitorHandler: public CefV8Handler {
    public:
      SystemVideoEffectsMonitorHandler(CefRefPtr<SystemVideoEffectsMonitorProjection> delegate)
      : delegate_(delegate) {}
      bool Execute(const CefString& name,
                   CefRefPtr<CefV8Value> object,
                   const CefV8ValueList& arguments,
                   CefRefPtr<CefV8Value>& retval,
                   CefString& exception) override;
      IMPLEMENT_REFCOUNTING(SystemVideoEffectsMonitorHandler);
    private:
      CefRefPtr<SystemVideoEffectsMonitorProjection> delegate_;
    };

    /// V8 function handler. Used by renderer process.
    CefRefPtr<SystemVideoEffectsMonitorHandler> handler_ = new SystemVideoEffectsMonitorHandler(this);

    /// The name of the V8 object representation of this class when set as a child of another V8 object.
    static const std::string v8_accessor_name;

    struct V8PropertyNames {
      static const std::string status;
    };

    struct V8FunctionNames {
      static const std::string setStatusChangedCallback;
      static const std::string showSystemUI;
    };

    // Provide the reference counting implementation for this class.
    IMPLEMENT_REFCOUNTING(SystemVideoEffectsMonitorProjection);
  };
}
