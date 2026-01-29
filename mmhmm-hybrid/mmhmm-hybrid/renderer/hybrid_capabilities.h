#pragma once

#include "include/cef_v8.h"
#include "../common/api_version.h"
#include "../common/app_capabilities.h"
#include "../common/app_windows.h"
#include "../common/virtual_camera.h"
#include "../common/titlebar_button.h"
#include "../common/power_monitor.h"
#include "../common/login_item_installer_renderer.h"
#include "../common/window_overlay_renderer.h"
#include "../common/system_video_effects_monitor_renderer.h"
#include "../common/event_proxy_renderer.h"
#include "../common/edge_light_monitor_renderer.h"
#include "../common/cef_process_message_handler.h"
#include "../common/hybrid_object.h"
#include "javascript_callback.h"

#include <optional>

namespace mmhmm {
  /// A hybrid representation of app and device capabilities.
  class HybridCapabilities : public CefV8Handler, public CefProcessMessageHandler {
    typedef std::vector<JavaScriptCallback> JSCallbacks;
    typedef std::vector<JavaScriptCallback> JSCallbackList;
  public:
    explicit HybridCapabilities(CefRefPtr<CefDictionaryValue> dictionary_);

    /// Accessible in V8 as `gHybrid.apiVersion`.
    static const std::string apiVersionAccessorName;
    /// Accessible in V8 as `gHybrid.capabilities`.
    static const std::string appCapabilitiesAccessorName;
    /// Accessible in V8 as `gHybrid.virtualCamera`.
    static const std::string virtualCameraAccessorName;
    /// Accessible in V8 as `gHybrid.windows`.
    static const std::string appWindowsAccessorName;
    /// Accessible in V8 as `gHybrid.powerMonitor`.
    static const std::string powerMonitorAccessorName;

    /// Triggers a JavaScript callback indicating that the
    /// titlebar button has been clicked by the user.
    void ReportTitlebarButtonClicked();

    /// Triggers a JavaScript callback indicating that the
    /// titlebar toolbox button has been clicked by the user.
    void ReportTitlebarToolboxButtonClicked();

    /// Triggers a JavaScript callback indicating that the
    /// titlebar mode selection changed.
    void ReportTitlebarModeSelectionChanged(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context);

    void ReportPowerStateChanged(PowerState state,
                                 CefRefPtr<CefV8Context> context);

    void ReportPowerMethodChanged(PowerMethod method,
                                CefRefPtr<CefV8Context> context);

    void ReportLockStateChanged(LockState state,
                                CefRefPtr<CefV8Context> context);

    /// Triggers a JavaScript callback indicating that the
    /// main app window was hidden.
    [[deprecated("v1.1.0: Use UpdateAppWindowsFromDictionary instead.")]]
    void ReportMainAppWindowWasHidden();

    /// Creates a V8 object representing the ``HybridCapabilities``
    /// state and functions.
    ///
    /// The object is created in and registered for the specified context.
    ///
    /// Given the object is added with the identifier `gHybrid`,
    /// the following hierarchy is made available by this class.
    ///
    /// ```
    /// gHybrid
    /// |
    /// |-- apiVersion
    /// |
    /// |-- capabilities
    /// |   |
    /// |   |-- camera
    /// |   |
    /// |   |-- microphone
    /// |
    /// |-- eventProxy
    /// |
    /// |-- loginItemInstaller
    /// |
    /// |-- powerMonitor
    /// |
    /// |-- systemVideoEffectsMonitor
    /// |
    /// |-- titlebar
    /// |   |
    /// |   |-- toolboxButton
    /// |
    /// |-- virtualCamera
    /// |
    /// |-- windowOverlay
    /// |
    /// |-- windows
    /// |   |
    /// |   |-- main
    /// ```
    ///
    /// - Important: This method must be called on the render process main
    ///              thread for synchronization purposes.
    CefRefPtr<CefV8Value> CreateCefV8ObjectInContext(CefRefPtr<CefV8Context> context);

    /// Unregisters a V8 object representation of ``HybridCapabilities``
    /// for the specified context.
    ///
    /// - Important: This method must be called on the render process main
    ///              thread for synchronization purposes.
    /// - Returns: `true` if context was removed, `false` otherwise.
    bool RemoveCefV8ObjectFromContext(CefRefPtr<CefV8Context> context);

    /// Updates V8 objects representing ``HybridCapabilities`` for all registered contexts.
    ///
    /// - Important: This method must be called on the render process main
    ///              thread for synchronization purposes.
    void UpdateCefV8ObjectFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context);

    /// Updates V8 objects representing ``AppCapabilities`` for all registered contexts.
    ///
    /// - Important: This method must be called on the render process main
    ///              thread for synchronization purposes.
    void UpdateAppCapabilitiesFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context);

    /// Updates V8 objects representing ``AppWindows`` for all registered contexts.
    ///
    /// - Important: This method must be called on the render process main
    ///              thread for synchronization purposes.
    void UpdateAppWindowsFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context);

    /// Updates V8 objects representing ``PowerMonitor`` for all registered
    /// contexts.
    ///
    /// - Important: This method must be called on the render process main
    ///              thread for synchronization purposes.
    void UpdatePowerMonitorFromDictionary(
        CefRefPtr<CefDictionaryValue> dictionary,
        CefRefPtr<CefV8Context> context);

    /// Updates V8 objects representing ``VirtualCamera`` for all registered contexts.
    ///
    /// - Important: This method must be called on the render process main
    ///              thread for synchronization purposes.
    void UpdateVirtualCameraFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context);

    /// Updates V8 objects representing ``Titlebar`` for all registered contexts.
    ///
    /// - Important: This method must be called on the render process main
    ///              thread for synchronization purposes.
    void UpdateTitlebarFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context);

    bool UpdateAppModeInDictionary(AppMode mode);

    bool HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                              CefRefPtr<CefFrame> frame,
                              CefProcessId source_process,
                              CefRefPtr<CefProcessMessage> message) override;

    // CefV8Handler

    /// Handles function calls on `gHybrid`.
    bool Execute(const CefString& name,
                 CefRefPtr<CefV8Value> object,
                 const CefV8ValueList& arguments,
                 CefRefPtr<CefV8Value>& retval,
                 CefString& exception) override;

    /// Handles function calls on `gHybrid.virtualCamera`.
    class VirtualCameraHandler: public CefV8Handler {
    public:
      VirtualCameraHandler(CefRefPtr<HybridCapabilities> delegate)
      : delegate_(delegate) {}
      bool Execute(const CefString& name,
                   CefRefPtr<CefV8Value> object,
                   const CefV8ValueList& arguments,
                   CefRefPtr<CefV8Value>& retval,
                   CefString& exception) override;
      IMPLEMENT_REFCOUNTING(VirtualCameraHandler);
    private:
      CefRefPtr<HybridCapabilities> delegate_;
    };

    /// Handles function calls on `gHybrid.capabilities.camera`.
    class CameraHandler: public CefV8Handler {
    public:
      CameraHandler(CefRefPtr<HybridCapabilities> delegate)
      : delegate_(delegate) {}
      bool Execute(const CefString& name,
                   CefRefPtr<CefV8Value> object,
                   const CefV8ValueList& arguments,
                   CefRefPtr<CefV8Value>& retval,
                   CefString& exception) override;
      IMPLEMENT_REFCOUNTING(CameraHandler);
    private:
      CefRefPtr<HybridCapabilities> delegate_;
    };

    /// Handles function calls on `gHybrid.capabilities.microphone`.
    class MicrophoneHandler: public CefV8Handler {
    public:
      MicrophoneHandler(CefRefPtr<HybridCapabilities> delegate)
      : delegate_(delegate) {}
      bool Execute(const CefString& name,
                   CefRefPtr<CefV8Value> object,
                   const CefV8ValueList& arguments,
                   CefRefPtr<CefV8Value>& retval,
                   CefString& exception) override;
      IMPLEMENT_REFCOUNTING(MicrophoneHandler);
    private:
      CefRefPtr<HybridCapabilities> delegate_;
    };

    /// Handles function calls on `gHybrid.windows.main`.
    class MainWindowHandler: public CefV8Handler {
    public:
      MainWindowHandler(CefRefPtr<HybridCapabilities> delegate)
      : delegate_(delegate) {}
      bool Execute(const CefString& name,
                   CefRefPtr<CefV8Value> object,
                   const CefV8ValueList& arguments,
                   CefRefPtr<CefV8Value>& retval,
                   CefString& exception) override;
      IMPLEMENT_REFCOUNTING(MainWindowHandler);
    private:
      CefRefPtr<HybridCapabilities> delegate_;
    };

    class MainWindowAccessor : public CefV8Accessor {
     public:
      MainWindowAccessor(CefRefPtr<HybridCapabilities> delegate)
      : delegate_(delegate) {}
      bool Get(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               CefRefPtr<CefV8Value>& retval,
               CefString& exception) override;
      bool Set(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               const CefRefPtr<CefV8Value> value,
               CefString& exception) override;
      IMPLEMENT_REFCOUNTING(MainWindowAccessor);
    private:
      CefRefPtr<HybridCapabilities> delegate_;
    };

    class TitlebarAccessor : public CefV8Accessor {
     public:
      TitlebarAccessor(CefRefPtr<HybridCapabilities> delegate)
      : delegate_(delegate) {}
      bool Get(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               CefRefPtr<CefV8Value>& retval,
               CefString& exception) override;
      bool Set(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               const CefRefPtr<CefV8Value> value,
               CefString& exception) override;
      IMPLEMENT_REFCOUNTING(TitlebarAccessor);
    private:
      CefRefPtr<HybridCapabilities> delegate_;
    };

    class ToolboxButtonAccessor : public CefV8Accessor {
     public:
      ToolboxButtonAccessor(CefRefPtr<HybridCapabilities> delegate)
      : delegate_(delegate) {}
      bool Get(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               CefRefPtr<CefV8Value>& retval,
               CefString& exception) override;
      bool Set(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               const CefRefPtr<CefV8Value> value,
               CefString& exception) override;
      IMPLEMENT_REFCOUNTING(ToolboxButtonAccessor);
    private:
      CefRefPtr<HybridCapabilities> delegate_;
    };

    class PowerMonitorAccessor : public CefV8Accessor {
     public:
      PowerMonitorAccessor(CefRefPtr<HybridCapabilities> delegate)
          : delegate_(delegate) {}
      bool Get(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               CefRefPtr<CefV8Value>& retval,
               CefString& exception) override;
      bool Set(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               const CefRefPtr<CefV8Value> value,
               CefString& exception) override;
      IMPLEMENT_REFCOUNTING(PowerMonitorAccessor);

     private:
      CefRefPtr<HybridCapabilities> delegate_;
    };

    // Provide the reference counting implementation for this class.
    IMPLEMENT_REFCOUNTING(HybridCapabilities);
    
  private:
    /// A dictionary representation of the state this class represents.
    ///
    /// Used to create ``HybridCapabilities`` V8 objects.
    CefRefPtr<CefDictionaryValue> dictionary_;

    /// An instance of the ``ApiVersion`` represented as a V8 object.
    mmhmm::ApiVersion api_version_;

    /// An instance of the ``AppCapabilities`` represented as a child object
    /// of a ``HybridCapabilities`` V8 object.
    ///
    /// Used to diff state updates.
    mmhmm::AppCapabilities app_capabilities_;

    /// An instance of the ``AppWindows`` represented as a child object
    /// of a ``HybridCapabilities`` V8 object.
    ///
    /// Used to diff state updates.
    mmhmm::AppWindows app_windows_;

    /// An instance of the ``VirtualCamera`` represented as a child object
    /// of a ``HybridCapabilities`` V8 object.
    ///
    /// Used to diff state updates.
    mmhmm::VirtualCamera virtual_camera_;

    /// An instance of the ``Titlebar``.
    mmhmm::Titlebar titlebar_;

    // An instance of the ``PowerMonitor``.
    mmhmm::PowerMonitor power_monitor_;

    /// JavaScript callbacks registered by V8 clients.
    JSCallbackList callbacks_;

    CefRefPtr<VirtualCameraHandler> virtual_camera_handler_ = new VirtualCameraHandler(this);
    CefRefPtr<CameraHandler> camera_handler_ = new CameraHandler(this);
    CefRefPtr<MicrophoneHandler> microphone_handler_ = new MicrophoneHandler(this);
    CefRefPtr<MainWindowHandler> main_window_handler_ = new MainWindowHandler(this);
    CefRefPtr<MainWindowAccessor> main_window_accessor_ = new MainWindowAccessor(this);
    CefRefPtr<TitlebarAccessor> titlebar_accessor_ = new TitlebarAccessor(this);
    CefRefPtr<ToolboxButtonAccessor> toolbox_button_accessor_ = new ToolboxButtonAccessor(this);
    CefRefPtr<PowerMonitorAccessor> power_monitor_accessor_ =
        new PowerMonitorAccessor(this);

    /// Maps V8 contexts to the ``HybridCapabilities`` V8 object, which was created in that context.
    ///
    /// All V8 objects and child objects are expected to be created on the render process main thread.
    std::map<CefRefPtr<CefV8Context>, CefRefPtr<CefV8Value>> context_object_map_;

    /// Returns a V8 object representing ``ApiVersion``.
    CefRefPtr<CefV8Value> CreateApiVersionV8Object(CefRefPtr<CefV8Context> context);

    /// Returns a V8 object representing ``AppCapabilities``, created from the
    /// specified `dictionary` in the specified `context`.
    CefRefPtr<CefV8Value> CreateAppCapabilitiesV8ObjectFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context);

    /// Returns a V8 object representing ``AppWindows``, created from the
    /// specified `dictionary` in the specified `context`.
    CefRefPtr<CefV8Value> CreateAppWindowsV8ObjectFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context);

    /// Returns a V8 object representing ``PowerMonitor``, created from the
    /// specified `dictionary` in the specified `context`.
    CefRefPtr<CefV8Value> CreatePowerMonitorV8ObjectFromDictionary(
        CefRefPtr<CefDictionaryValue> dictionary,
        CefRefPtr<CefV8Context> context);

    /// Returns a V8 object representing ``VirtualCamera``, created from the
    /// specified `dictionary` in the specified `context`.
    CefRefPtr<CefV8Value> CreateVirtualCameraV8ObjectFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context);

    /// Updates ``AppCapabilities`` V8 child objects representing ``Camera`` or ``Microphone``
    /// for all registered contexts.
    ///
    /// The passed in `context` is used for temporary V8 object creation.
    void UpdateAppCapabilitiesV8ChildObjectWithState(CaptureDeviceState newState,
                                                     std::string childObjectKey,
                                                     std::string childStateObjectKey,
                                                     std::string functionIdentifier,
                                                     CefRefPtr<CefV8Context> currentContext,
                                                     JSCallbacks& outCallbacks);

    /// Updates an ``AppCapabilities`` V8 child object representing ``Camera`` or ``Microphone``
    /// for the specified `context`.
    void UpdateAppCapabilitiesV8ChildObjectWithState(CaptureDeviceState newState,
                                                     std::string childObjectKey,
                                                     std::string childStateObjectKey,
                                                     CefRefPtr<CefV8Context> context);

    /// Updates the ``VirtualCameraState`` V8 child object for the specified `context`.
    void UpdateVirtualCameraState(VirtualCameraState state, CefRefPtr<CefV8Context> context);

    /// Updates the V8 child object representing the ``VirtualCamera`` client list for the specified `context`.
    void UpdateVirtualCameraClients(std::vector<std::string> clients, CefRefPtr<CefV8Context> context);
    
    /// Returns the registered context, which is the same as the specified context.
    ///
    /// This method helps to discover if a context has already been previously registered
    /// as a different context. Different contexts can be identical under the hood.
    CefRefPtr<CefV8Context> RegisteredContextForSameContext(CefRefPtr<CefV8Context> context);

    /// Returns the ``HybridCapabilities`` V8 object, `gHybrid`, which was registered for the specified context.
    CefRefPtr<CefV8Value> HybridCapabilitiesV8ObjectForContext(CefRefPtr<CefV8Context> context);

    /// Returns a child object of the ``HybridCapabilities`` V8 object, which was registered for the specified context.
    ///
    /// Child objects are identified by their respective accessor name.
    CefRefPtr<CefV8Value> HybridCapabilitiesV8ChildObjectForContext(CefRefPtr<CefV8Context> context, std::string accessorName);

    /// Returns the V8 object representing ``AppCapabilities``, which was registered for the specified context.
    CefRefPtr<CefV8Value> AppCapabilitiesV8ObjectForContext(CefRefPtr<CefV8Context> context);

    /// Returns the V8 object representing ``AppWindows``, which was registered for the specified context.
    CefRefPtr<CefV8Value> AppWindowsV8ObjectForContext(CefRefPtr<CefV8Context> context);

    /// Returns the V8 object representing ``VirtualCamera``, which was registered for the specified context.
    CefRefPtr<CefV8Value> VirtualCameraV8ObjectForContext(CefRefPtr<CefV8Context> context);

    /// Returns the V8 object representing ``PowerMonitor``, which was registered for the specified context.
    CefRefPtr<CefV8Value> PowerMonitorV8ObjectForContext(
        CefRefPtr<CefV8Context> context);

    std::vector<CefRefPtr<HybridProjectionObject>> hybrid_objects_;

    /// Executes the functions registered by `gHybrid.windows.mainAppWindow.setIsHiddenChangedCallback`.
    void ExecuteSetMainAppWindowIsHiddenChangedCallbacks(bool isHidden, CefRefPtr<CefV8Context> context);

    /// Handles callback setter functions calls on `gHybrid`.
    bool ExecuteSetCallbackFunction(const CefString& name,
                                    CefRefPtr<CefV8Value> object,
                                    const CefV8ValueList& arguments,
                                    CefRefPtr<CefV8Value>& retval,
                                    CefString& exception);

    /// Retrieves the callback instances for the specified function identifier for all registered contexts.
    JSCallbackList JavaScriptCallbacksForFunctionIdentifier(std::string functionIdentifier);

    /// Removes the callback instances for the specified function identifier for all registered contexts.
    void RemoveJavaScriptCallbacksForFunctionIdentifier(std::string functionIdentifier);

    /// Removes all callback instances for the specified context.
    void RemoveJavaScriptCallbacksForContext(CefRefPtr<CefV8Context> context);
  };
}
