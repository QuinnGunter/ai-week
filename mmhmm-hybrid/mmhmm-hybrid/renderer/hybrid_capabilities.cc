#include "hybrid_capabilities.h"

#include "../common/cef_value_utility.h"
#include "../common/v8_utility.h"
#include "include/wrapper/cef_helpers.h"

#include <algorithm>

namespace mmhmm {
  const std::string HybridCapabilities::apiVersionAccessorName = "apiVersion";
  const std::string HybridCapabilities::appCapabilitiesAccessorName = "capabilities";
  const std::string HybridCapabilities::virtualCameraAccessorName = "virtualCamera";
  const std::string HybridCapabilities::appWindowsAccessorName = "windows";
  const std::string HybridCapabilities::powerMonitorAccessorName = "powerMonitor";

  /// Function identifiers exposed as JavaScript API on various child objects.
  namespace FunctionIdentifier {
    const std::string setAuthorizationChangeCallback = "setAuthorizationChangeCallback";
    const std::string setStateChangeCallback = "setStateChangeCallback";
    const std::string setTitlebarButtonClickedCallback = "setTitlebarButtonClickedCallback";
    const std::string setTitlebarToolboxButtonClickedCallback = "setTitlebarToolboxButtonClickedCallback";
    const std::string setTitlebarModeSelectionChangedCallback = "setTitlebarModeSelectionChangedCallback";
    const std::string setMainAppWindowIsHiddenChangedCallback = "setIsHiddenChangedCallback";
    const std::string setClientsChangeCallback = "setClientsChangeCallback";
    const std::string authorize = "authorize";
    const std::string install = "install";
    const std::string uninstall = "uninstall";
    const std::string requestRelaunch = "requestRelaunch";
    const std::string requestReboot = "requestReboot";
    const std::string virtualCameraSupportViewDidAppear = "onAfterVirtualCameraSupportViewOpened";
    const std::string virtualCameraSupportViewWillDisappear = "onBeforeVirtualCameraSupportViewCloses";
    const std::string resizeTo = "resizeTo";
    const std::string setPowerStateChangedCallback = "setPowerStateChangedCallback";
    const std::string setPowerMethodChangedCallback = "setPowerMethodChangedCallback";
    const std::string setLockStateChangedCallback = "setLockStateChangedCallback";

    // Deprecated, use `gHybrid.windows.mainAppWindow.setIsHiddenChangedCallback` instead.
    const std::string setMainAppWindowWasHiddenCallback = "setMainAppWindowWasHiddenCallback";

    /// Internal identifiers used to reference the same function identifiers on different objects.
    namespace Internal {
      const std::string setCameraAuthorizationChangeCallback = setAuthorizationChangeCallback + "Camera";
      const std::string setMicrophoneAuthorizationChangeCallback = setAuthorizationChangeCallback + "Microphone";
    }
  }

  HybridCapabilities::HybridCapabilities(CefRefPtr<CefDictionaryValue> dictionary_)
  : dictionary_(dictionary_->Copy(false)) {
    auto login_item_installer = CefRefPtr<LoginItemInstallerProjection> { new LoginItemInstallerProjection };
    hybrid_objects_.push_back(std::move(login_item_installer));
    auto window_overlay = CefRefPtr<WindowOverlayProjection> { new WindowOverlayProjection };
    hybrid_objects_.push_back(std::move(window_overlay));
    auto system_video_effects_monitor = CefRefPtr<SystemVideoEffectsMonitorProjection> { new SystemVideoEffectsMonitorProjection };
    hybrid_objects_.push_back(std::move(system_video_effects_monitor));
    auto event_proxy = CefRefPtr<EventProxyProjection> { new EventProxyProjection };
    hybrid_objects_.push_back(std::move(event_proxy));
    auto edge_light_monitor = CefRefPtr<EdgeLightMonitorProjection> { new EdgeLightMonitorProjection };
    hybrid_objects_.push_back(std::move(edge_light_monitor));

  }

  void HybridCapabilities::ReportTitlebarButtonClicked() {
    auto callbacks = JavaScriptCallbacksForFunctionIdentifier(FunctionIdentifier::setTitlebarButtonClickedCallback);
    if (callbacks.empty()) {
      return;
    }

    for (auto callback : callbacks) {
      callback.Execute();
    }
  }

  void HybridCapabilities::ReportTitlebarToolboxButtonClicked() {
    auto callbacks = JavaScriptCallbacksForFunctionIdentifier(FunctionIdentifier::setTitlebarToolboxButtonClickedCallback);
    if (callbacks.empty()) {
      return;
    }

    for (auto callback : callbacks) {
      callback.Execute();
    }
  }

  void HybridCapabilities::ReportMainAppWindowWasHidden() {
    auto callbacks = JavaScriptCallbacksForFunctionIdentifier(FunctionIdentifier::setMainAppWindowWasHiddenCallback);
    if (callbacks.empty()) {
      return;
    }

    for (auto callback : callbacks) {
      callback.Execute();
    }
  }

  void HybridCapabilities::ReportTitlebarModeSelectionChanged(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context) {
    auto maybeMode = mmhmm::AppModeFromCefDictionary(dictionary);
    DCHECK(maybeMode.has_value());
    auto mode = maybeMode.value();

    auto callbacks = JavaScriptCallbacksForFunctionIdentifier(FunctionIdentifier::setTitlebarModeSelectionChangedCallback);
    if (callbacks.empty()) {
      return;
    }

    for (auto callback : callbacks) {
      context->Enter();
      auto stringValue = CefV8Value::CreateString(mmhmm::StringForAppMode(mode));
      context->Exit();
      callback.arguments.push_back(stringValue);
      callback.Execute();
    }
  }

  void HybridCapabilities::ReportPowerStateChanged(
      PowerState state,
      CefRefPtr<CefV8Context> context) {
    auto callbacks = JavaScriptCallbacksForFunctionIdentifier(
        FunctionIdentifier::setPowerStateChangedCallback);
    if (callbacks.empty()) {
      return;
    }

    for (auto& callback : callbacks) {
      context->Enter();
      auto stringValue =
          CefV8Value::CreateString(mmhmm::PowerStateToString(state));
      context->Exit();
      callback.arguments.push_back(stringValue);
      callback.Execute();
    }
  }

  void HybridCapabilities::ReportPowerMethodChanged(
      PowerMethod method,
      CefRefPtr<CefV8Context> context) {
    auto callbacks = JavaScriptCallbacksForFunctionIdentifier(
        FunctionIdentifier::setPowerMethodChangedCallback);
    if (callbacks.empty()) {
      return;
    }

    for (auto& callback : callbacks) {
      context->Enter();
      auto stringValue =
          CefV8Value::CreateString(mmhmm::PowerMethodToString(method));
      context->Exit();
      callback.arguments.push_back(stringValue);
      callback.Execute();
    }
  }

  void HybridCapabilities::ReportLockStateChanged(
      LockState state,
      CefRefPtr<CefV8Context> context) {
    auto callbacks = JavaScriptCallbacksForFunctionIdentifier(
        FunctionIdentifier::setLockStateChangedCallback);
    if (callbacks.empty()) {
      return;
    }

    for (auto& callback : callbacks) {
      context->Enter();
      auto stringValue =
          CefV8Value::CreateString(mmhmm::LockStateToString(state));
      context->Exit();
      callback.arguments.push_back(stringValue);
      callback.Execute();
    }
  }

  CefRefPtr<CefV8Value> HybridCapabilities::CreateCefV8ObjectInContext(CefRefPtr<CefV8Context> context) {
    CEF_REQUIRE_RENDERER_THREAD();

    if (auto object = HybridCapabilitiesV8ObjectForContext(context); object != nullptr) {
      DLOG(INFO) << "CEFV8 object exists for context: " << context;
      return object;
    }

    DLOG(INFO) << "Creating CEFV8 object in context: " << context;

    auto object = CefV8Value::CreateObject(nullptr, nullptr);

    if (dictionary_ == nullptr) {
      DCHECK(false);
      return object;
    }

    if (auto apiVersion = CreateApiVersionV8Object(context); apiVersion != nullptr) {
      object->SetValue(apiVersionAccessorName, apiVersion, V8_PROPERTY_ATTRIBUTE_NONE);
    }

    if (dictionary_->HasKey(mmhmm::AppCapabilities::dictionaryKey)) {
      auto appCapabilitiesDictionary = dictionary_->GetDictionary(mmhmm::AppCapabilities::dictionaryKey);
      if (auto appCapabilities = CreateAppCapabilitiesV8ObjectFromDictionary(appCapabilitiesDictionary, context); appCapabilities != nullptr) {
        object->SetValue(appCapabilitiesAccessorName, appCapabilities, V8_PROPERTY_ATTRIBUTE_NONE);
      }
    }

    if (dictionary_->HasKey(mmhmm::AppWindows::dictionaryKey)) {
      auto appWindowsDictionary = dictionary_->GetDictionary(mmhmm::AppWindows::dictionaryKey);
      if (auto appWindows = CreateAppWindowsV8ObjectFromDictionary(appWindowsDictionary, context); appWindows != nullptr) {
        object->SetValue(appWindowsAccessorName, appWindows, V8_PROPERTY_ATTRIBUTE_NONE);
      }
    }

    if (dictionary_->HasKey(mmhmm::VirtualCamera::dictionaryKey)) {
      auto virtualCameraDictionary = dictionary_->GetDictionary(mmhmm::VirtualCamera::dictionaryKey);
      if (auto virtualCamera = CreateVirtualCameraV8ObjectFromDictionary(virtualCameraDictionary, context); virtualCamera != nullptr) {
        object->SetValue(virtualCameraAccessorName, virtualCamera, V8_PROPERTY_ATTRIBUTE_NONE);
      }
    }

    if (dictionary_->HasKey(mmhmm::PowerMonitor::dictionaryKey)) {
      auto powerMonitorDictionary =
          dictionary_->GetDictionary(mmhmm::PowerMonitor::dictionaryKey);
      if (auto powerMonitor = CreatePowerMonitorV8ObjectFromDictionary(
              powerMonitorDictionary, context);
          powerMonitor != nullptr) {
        object->SetValue(powerMonitorAccessorName, powerMonitor,
                         V8_PROPERTY_ATTRIBUTE_NONE);
      }
    }

    AddFunctionToObject(object, FunctionIdentifier::setTitlebarButtonClickedCallback, this);
    AddFunctionToObject(object, FunctionIdentifier::setTitlebarToolboxButtonClickedCallback, this);
    AddFunctionToObject(object, FunctionIdentifier::setTitlebarModeSelectionChangedCallback, this);
    AddFunctionToObject(object, FunctionIdentifier::setMainAppWindowWasHiddenCallback, this);
    AddFunctionToObject(object, FunctionIdentifier::requestRelaunch, this);
    AddFunctionToObject(object, FunctionIdentifier::requestReboot, this);
    AddFunctionToObject(object, FunctionIdentifier::virtualCameraSupportViewDidAppear, this);
    AddFunctionToObject(object, FunctionIdentifier::virtualCameraSupportViewWillDisappear, this);
    AddFunctionToObject(object, FunctionIdentifier::setPowerMethodChangedCallback, this);
    AddFunctionToObject(object, FunctionIdentifier::setPowerStateChangedCallback, this);
    AddFunctionToObject(object, FunctionIdentifier::setLockStateChangedCallback, this);


    if (dictionary_->HasKey(mmhmm::Titlebar::dictionaryKey)) {
      auto titlebarDictionary =
          dictionary_->GetDictionary(mmhmm::Titlebar::dictionaryKey);
      titlebar_ = Titlebar {titlebarDictionary};
    }

    // Create titlebar V8 object
    auto titlebar = CefV8Value::CreateObject(titlebar_accessor_, nullptr);
    titlebar->SetValue(mmhmm::Titlebar::appModeKey, V8_PROPERTY_ATTRIBUTE_NONE);

    // Create toolbox button V8 object
    auto toolbox_button = CefV8Value::CreateObject(toolbox_button_accessor_, nullptr);
    toolbox_button->SetValue(mmhmm::ToolboxButton::isEnabledKey, V8_PROPERTY_ATTRIBUTE_NONE);
    toolbox_button->SetValue(mmhmm::ToolboxButton::tooltipKey, V8_PROPERTY_ATTRIBUTE_NONE);
    toolbox_button->SetValue(mmhmm::ToolboxButton::infoKey, V8_PROPERTY_ATTRIBUTE_NONE);

    // Add toolbox button V8 object to titlebar V8 object
    titlebar->SetValue(mmhmm::ToolboxButton::dictionaryKey, toolbox_button, V8_PROPERTY_ATTRIBUTE_NONE);

    // Add titlebar V8 object to gHybrid V8 object
    object->SetValue(mmhmm::Titlebar::dictionaryKey, titlebar, V8_PROPERTY_ATTRIBUTE_NONE);

    // Attach hybrid objects
    for (auto hybrid_object : hybrid_objects_) {
      hybrid_object->AttachToValueFromDictionary(object, dictionary_, context);
    }

    context_object_map_[context] = object;

    return object;
  }

  bool HybridCapabilities::RemoveCefV8ObjectFromContext(CefRefPtr<CefV8Context> context) {
    CEF_REQUIRE_RENDERER_THREAD();

    CefRefPtr<CefV8Context> contextToErase = context;
    if (auto registeredContext = RegisteredContextForSameContext(context); registeredContext != nullptr) {
      contextToErase = registeredContext;
    }

    RemoveJavaScriptCallbacksForContext(context);

    return context_object_map_.erase(contextToErase) > 0;
  }

  // MARK: - API Version

  CefRefPtr<CefV8Value> HybridCapabilities::CreateApiVersionV8Object(CefRefPtr<CefV8Context> context) {
    context->Enter();
    auto api_version_dictionary = api_version_.ToCefDictionary();
    auto api_version_v8 = ToCEFV8Object(api_version_dictionary);
    context->Exit();
    return api_version_v8;
  }

  // MARK: - App Capabilities

  CefRefPtr<CefV8Value> HybridCapabilities::CreateAppCapabilitiesV8ObjectFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context) {
    auto app_capabilities = AppCapabilities();
    app_capabilities.FromCefDictionary(dictionary);
    app_capabilities_ = app_capabilities;

    context->Enter();

    auto app_capabilities_v8 = ToCEFV8Object(dictionary);
    if (app_capabilities_v8 == nullptr) {
      DCHECK(false);
      context->Exit();
      return nullptr;
    }

    if (auto camera = app_capabilities_v8->GetValue(mmhmm::Camera::dictionaryKey); camera != nullptr) {
      AddFunctionToObject(camera, FunctionIdentifier::setAuthorizationChangeCallback, camera_handler_);
      AddFunctionToObject(camera, FunctionIdentifier::authorize, camera_handler_);
    }
    if (auto microphone = app_capabilities_v8->GetValue(mmhmm::Microphone::dictionaryKey); microphone != nullptr) {
      AddFunctionToObject(microphone, FunctionIdentifier::setAuthorizationChangeCallback, microphone_handler_);
      AddFunctionToObject(microphone, FunctionIdentifier::authorize, microphone_handler_);
    }

    context->Exit();

    return app_capabilities_v8;
  }

  void HybridCapabilities::UpdateCefV8ObjectFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context) {
    if (dictionary->HasKey(mmhmm::AppCapabilities::dictionaryKey);
        auto appCapabilitiesDictionary = dictionary->GetDictionary(mmhmm::AppCapabilities::dictionaryKey)) {
      UpdateAppCapabilitiesFromDictionary(appCapabilitiesDictionary, context);
    }
    if (dictionary->HasKey(mmhmm::AppWindows::dictionaryKey);
        auto appWindowsDictionary = dictionary->GetDictionary(mmhmm::AppWindows::dictionaryKey)) {
      UpdateAppWindowsFromDictionary(appWindowsDictionary, context);
    }
    if (dictionary->HasKey(mmhmm::VirtualCamera::dictionaryKey);
        auto virtualCameraDictionary = dictionary->GetDictionary(mmhmm::VirtualCamera::dictionaryKey)) {
      UpdateVirtualCameraFromDictionary(virtualCameraDictionary, context);
    }
    if (dictionary->HasKey(mmhmm::Titlebar::dictionaryKey);
        auto titlebarDictionary = dictionary->GetDictionary(mmhmm::Titlebar::dictionaryKey)) {
      UpdateTitlebarFromDictionary(titlebarDictionary, context);
    }
    if (dictionary->HasKey(mmhmm::PowerMonitor::dictionaryKey);
        auto powerMonitorDictionary =
            dictionary->GetDictionary(mmhmm::PowerMonitor::dictionaryKey)) {
      UpdatePowerMonitorFromDictionary(powerMonitorDictionary, context);
    }
  }

  void HybridCapabilities::UpdateAppCapabilitiesFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context) {
    CEF_REQUIRE_RENDERER_THREAD();

    auto app_capabilities = AppCapabilities();
    app_capabilities.FromCefDictionary(dictionary);

    if (dictionary_->HasKey(mmhmm::AppCapabilities::dictionaryKey)) {
      dictionary_->Remove(mmhmm::AppCapabilities::dictionaryKey);
    }
    dictionary_->SetDictionary(mmhmm::AppCapabilities::dictionaryKey, dictionary);

    JSCallbacks callbacks {};

    if (auto newState = app_capabilities.camera.state; newState != app_capabilities_.camera.state) {
      UpdateAppCapabilitiesV8ChildObjectWithState(newState,
                                                  mmhmm::Camera::dictionaryKey,
                                                  mmhmm::CaptureDeviceState::dictionaryKey,
                                                  FunctionIdentifier::Internal::setCameraAuthorizationChangeCallback,
                                                  context,
                                                  callbacks);
    }

    if (auto newState = app_capabilities.microphone.state; newState != app_capabilities_.microphone.state) {
      UpdateAppCapabilitiesV8ChildObjectWithState(newState,
                                                  mmhmm::Microphone::dictionaryKey,
                                                  mmhmm::CaptureDeviceState::dictionaryKey,
                                                  FunctionIdentifier::Internal::setMicrophoneAuthorizationChangeCallback,
                                                  context,
                                                  callbacks);
    }

    app_capabilities_ = app_capabilities;

    // Execute all collected callback functions after the updated state has been set
    for (auto callbackFunction : callbacks) {
      callbackFunction.Execute();
    }
  }

  void HybridCapabilities::UpdateAppCapabilitiesV8ChildObjectWithState(CaptureDeviceState newState,
                                                                       std::string childObjectKey,
                                                                       std::string childStateObjectKey,
                                                                       std::string functionIdentifier,
                                                                       CefRefPtr<CefV8Context> currentContext,
                                                                       JSCallbacks& outCallbacks) {
    for (auto contextObjectPair : context_object_map_) {
      auto context = contextObjectPair.first;
      context->Enter();
      UpdateAppCapabilitiesV8ChildObjectWithState(newState,
                                                  childObjectKey,
                                                  childStateObjectKey,
                                                  context);
      context->Exit();
    }

    auto callbacks = JavaScriptCallbacksForFunctionIdentifier(functionIdentifier);
    if (callbacks.empty()) { return; }

    for (auto callback : callbacks) {
      currentContext->Enter();
      auto newValue = ToCEFV8Object(newState.ToCefDictionary());
      currentContext->Exit();
      callback.arguments.push_back(newValue);
      outCallbacks.emplace_back(callback);
    }
  }

  void HybridCapabilities::UpdateAppCapabilitiesV8ChildObjectWithState(CaptureDeviceState newState,
                                                                       std::string childObjectKey,
                                                                       std::string childStateObjectKey,
                                                                       CefRefPtr<CefV8Context> context) {
    auto app_capabilities_v8 = AppCapabilitiesV8ObjectForContext(context);
    if (app_capabilities_v8 == nullptr) { return; }

    auto object = app_capabilities_v8->GetValue(childObjectKey);
    if (object == nullptr) { return; }

    if (object->HasValue(childStateObjectKey)) {
      object->DeleteValue(childStateObjectKey);
    }

    auto newValue = ToCEFV8Object(newState.ToCefDictionary());
    if (newValue == nullptr) { return; }

    object->SetValue(childStateObjectKey, newValue, V8_PROPERTY_ATTRIBUTE_NONE);
  }

  // MARK: - App Windows

  CefRefPtr<CefV8Value> HybridCapabilities::CreateAppWindowsV8ObjectFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context) {
    auto app_windows = AppWindows { dictionary };
    app_windows_ = app_windows;

    context->Enter();

    auto app_windows_v8 = ToCEFV8Object(dictionary);
    if (app_windows_v8 == nullptr) {
      DCHECK(false);
      context->Exit();
      return nullptr;
    }

    if (auto main_app_window_v8 = app_windows_v8->GetValue(mmhmm::MainAppWindow::dictionaryKey); main_app_window_v8 != nullptr) {
      // This is far from straightforward, but because the main app window V8 object needs to register
      // `MainWindowAccessor` to allow its `isFloating` property to become settable, the whole V8 object
      // must be replaced with a new instance which was created with the accessor.
      //
      // TODO: Investigate, if this back and forth can be avoided by creating the object with the accessor
      // initially and not deleting anything from the V8 object hierarchy. This would require that a
      // `CefV8Accessor` responding to a property name on a V8 object can co-exist with a V8 child object
      // created for the same property name. Given that `CefV8Accessor`'s `Get` and `Set` methods can
      // respond with `true` or `false` indicating if they handled a property name, this seems likely to
      // be a supported mechanism.

      app_windows_v8->DeleteValue(mmhmm::MainAppWindow::dictionaryKey);

      main_app_window_v8 = CefV8Value::CreateObject(main_window_accessor_, nullptr);
      main_app_window_v8->SetValue(mmhmm::MainAppWindow::isFloatingKey, V8_PROPERTY_ATTRIBUTE_NONE);
      main_app_window_v8->SetValue(mmhmm::MainAppWindow::isHiddenKey, V8_PROPERTY_ATTRIBUTE_NONE);
      AddFunctionToObject(main_app_window_v8, FunctionIdentifier::resizeTo, main_window_handler_);
      AddFunctionToObject(main_app_window_v8, FunctionIdentifier::setMainAppWindowIsHiddenChangedCallback, main_window_handler_);

      app_windows_v8->SetValue(mmhmm::MainAppWindow::dictionaryKey, main_app_window_v8, V8_PROPERTY_ATTRIBUTE_NONE);
    }

    context->Exit();

    return app_windows_v8;
  }

  void HybridCapabilities::UpdateAppWindowsFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context) {
    CEF_REQUIRE_RENDERER_THREAD();

    auto app_windows = AppWindows { dictionary };

    if (dictionary_->HasKey(mmhmm::AppWindows::dictionaryKey)) {
      dictionary_->Remove(mmhmm::AppWindows::dictionaryKey);
    }
    dictionary_->SetDictionary(mmhmm::AppWindows::dictionaryKey, dictionary);

    if (app_windows.mainAppWindow.isHidden != app_windows_.mainAppWindow.isHidden) {
      ExecuteSetMainAppWindowIsHiddenChangedCallbacks(app_windows.mainAppWindow.isHidden, context);
    }

    app_windows_ = app_windows;
  }

  void HybridCapabilities::ExecuteSetMainAppWindowIsHiddenChangedCallbacks(bool isHidden, CefRefPtr<CefV8Context> context) {
    auto callbacks = JavaScriptCallbacksForFunctionIdentifier(FunctionIdentifier::setMainAppWindowIsHiddenChangedCallback);
    if (callbacks.empty()) {
      return;
    }

    for (auto callback : callbacks) {
      context->Enter();
      auto boolValue = CefV8Value::CreateBool(isHidden);
      context->Exit();
      callback.arguments.push_back(boolValue);
      callback.Execute();
    }

    if (isHidden) {
#ifdef __APPLE__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
#else
#pragma warning(suppress : 4996)
#endif
      ReportMainAppWindowWasHidden();
#ifdef __APPLE__
#pragma clang diagnostic pop
#endif
    }
  }

  // MARK: - Virtual Camera

  CefRefPtr<CefV8Value> HybridCapabilities::CreateVirtualCameraV8ObjectFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context) {
    auto virtual_camera = VirtualCamera();
    virtual_camera.FromCefDictionary(dictionary);
    virtual_camera_ = virtual_camera;

    context->Enter();

    auto virtual_camera_v8 = ToCEFV8Object(dictionary);
    if (virtual_camera_v8 == nullptr) {
      DCHECK(false);
      context->Exit();
      return nullptr;
    }

    AddFunctionToObject(virtual_camera_v8, FunctionIdentifier::setStateChangeCallback, virtual_camera_handler_);
    AddFunctionToObject(virtual_camera_v8, FunctionIdentifier::setClientsChangeCallback, virtual_camera_handler_);
    AddFunctionToObject(virtual_camera_v8, FunctionIdentifier::install, virtual_camera_handler_);
    AddFunctionToObject(virtual_camera_v8, FunctionIdentifier::uninstall, virtual_camera_handler_);
    AddFunctionToObject(virtual_camera_v8, FunctionIdentifier::authorize, virtual_camera_handler_);

    context->Exit();

    return virtual_camera_v8;
  }

  void HybridCapabilities::UpdateVirtualCameraFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> currentContext) {
    CEF_REQUIRE_RENDERER_THREAD();

    auto virtual_camera = VirtualCamera();
    virtual_camera.FromCefDictionary(dictionary);

    if (dictionary_->HasKey(mmhmm::VirtualCamera::dictionaryKey)) {
      dictionary_->Remove(mmhmm::VirtualCamera::dictionaryKey);
    }
    dictionary_->SetDictionary(mmhmm::VirtualCamera::dictionaryKey, dictionary);

    JSCallbacks callbacks {};
    if (auto newState = virtual_camera.state; newState != virtual_camera_.state) {
      for (auto contextObjectPair : context_object_map_) {
        auto context = contextObjectPair.first;
        context->Enter();
        UpdateVirtualCameraState(newState, context);
        context->Exit();
      }

      if (auto registeredCallbacks = JavaScriptCallbacksForFunctionIdentifier(FunctionIdentifier::setStateChangeCallback); registeredCallbacks.empty() == false) {
        for (auto callback : registeredCallbacks) {
          currentContext->Enter();
          auto newStateValue = ToCEFV8Object(newState.ToCefDictionary());
          currentContext->Exit();
          callback.arguments.push_back(newStateValue);
          callbacks.emplace_back(callback);
        }
      }
    }

    if (auto newClients = virtual_camera.clients; newClients != virtual_camera_.clients) {
      for (auto contextObjectPair : context_object_map_) {
        auto context = contextObjectPair.first;
        context->Enter();
        UpdateVirtualCameraClients(newClients, context);
        context->Exit();
      }

      if (auto registeredCallbacks = JavaScriptCallbacksForFunctionIdentifier(FunctionIdentifier::setClientsChangeCallback); registeredCallbacks.empty() == false) {
        for (auto callback : registeredCallbacks) {
          currentContext->Enter();
          auto newValue = ToCEFV8Array(ToCefListValue(newClients));
          currentContext->Exit();
          callback.arguments.push_back(newValue);
          callbacks.emplace_back(callback);
        }
      }
    }

    virtual_camera_ = virtual_camera;

    // Execute all collected callback functions after the updated state has been set
    for (auto callbackFunction : callbacks) {
      callbackFunction.Execute();
    }
  }

  void HybridCapabilities::UpdateVirtualCameraState(VirtualCameraState state, CefRefPtr<CefV8Context> context) {
    auto virtual_camera_v8 = VirtualCameraV8ObjectForContext(context);
    if (virtual_camera_v8 == nullptr) {
      return;
    }

    if (virtual_camera_v8->HasValue(mmhmm::VirtualCameraState::dictionaryKey)) {
      virtual_camera_v8->DeleteValue(mmhmm::VirtualCameraState::dictionaryKey);
    }

    auto newStateValue = ToCEFV8Object(state.ToCefDictionary());
    virtual_camera_v8->SetValue(mmhmm::VirtualCameraState::dictionaryKey, newStateValue, V8_PROPERTY_ATTRIBUTE_NONE);
  }

  void HybridCapabilities::UpdateVirtualCameraClients(std::vector<std::string> clients, CefRefPtr<CefV8Context> context) {
    auto virtual_camera_v8 = VirtualCameraV8ObjectForContext(context);
    if (virtual_camera_v8 == nullptr) {
      return;
    }

    if (virtual_camera_v8->HasValue(mmhmm::VirtualCamera::clientsKey)) {
      virtual_camera_v8->DeleteValue(mmhmm::VirtualCamera::clientsKey);
    }
    auto newValue = ToCEFV8Array(ToCefListValue(clients));
    virtual_camera_v8->SetValue(mmhmm::VirtualCamera::clientsKey, newValue, V8_PROPERTY_ATTRIBUTE_NONE);
  }

  // MARK: - Titlebar

  void HybridCapabilities::UpdateTitlebarFromDictionary(CefRefPtr<CefDictionaryValue> dictionary, CefRefPtr<CefV8Context> context) {
    CEF_REQUIRE_RENDERER_THREAD();

    auto titlebar = Titlebar { dictionary };

    if (dictionary_->HasKey(mmhmm::Titlebar::dictionaryKey)) {
      dictionary_->Remove(mmhmm::Titlebar::dictionaryKey);
    }
    dictionary_->SetDictionary(mmhmm::Titlebar::dictionaryKey, dictionary);

    titlebar_ = titlebar;
  }

  bool HybridCapabilities::UpdateAppModeInDictionary(AppMode mode) {
    if (!dictionary_->HasKey(mmhmm::Titlebar::dictionaryKey)) {
      return false;
    }
    auto titlebar = dictionary_->GetDictionary(mmhmm::Titlebar::dictionaryKey);
    if (!titlebar->HasKey(Titlebar::appModeKey)) {
      return false;
    }
    auto mode_int = static_cast<int>(mode);
    return titlebar->SetInt(Titlebar::appModeKey, mode_int);
  }

  // MARK: - Power Monitor

  CefRefPtr<CefV8Value>
  HybridCapabilities::CreatePowerMonitorV8ObjectFromDictionary(
      CefRefPtr<CefDictionaryValue> dictionary,
      CefRefPtr<CefV8Context> context) {
    auto power_monitor = PowerMonitor{dictionary};
    power_monitor_ = power_monitor;

    context->Enter();

    auto power_monitor_v8 = ToCEFV8Object(dictionary);
    if (power_monitor_v8 == nullptr) {
      DCHECK(false);
      context->Exit();
      return nullptr;
    }

    power_monitor_v8 =
        CefV8Value::CreateObject(power_monitor_accessor_, nullptr);
    power_monitor_v8->SetValue(mmhmm::PowerMonitor::powerMethodKey,
                               V8_PROPERTY_ATTRIBUTE_NONE);
    power_monitor_v8->SetValue(mmhmm::PowerMonitor::powerStateKey,
                               V8_PROPERTY_ATTRIBUTE_NONE);
    power_monitor_v8->SetValue(mmhmm::PowerMonitor::lockStateKey,
                               V8_PROPERTY_ATTRIBUTE_NONE);

    context->Exit();

    return power_monitor_v8;
  }

  void HybridCapabilities::UpdatePowerMonitorFromDictionary(
      CefRefPtr<CefDictionaryValue> dictionary,
      CefRefPtr<CefV8Context> context) {
    CEF_REQUIRE_RENDERER_THREAD();

    auto power_monitor = PowerMonitor{dictionary};

    if (dictionary_->HasKey(mmhmm::PowerMonitor::dictionaryKey)) {
      dictionary_->Remove(mmhmm::PowerMonitor::dictionaryKey);
    }
    dictionary_->SetDictionary(mmhmm::PowerMonitor::dictionaryKey, dictionary);

    if (power_monitor.powerMethod != power_monitor_.powerMethod) {
      ReportPowerMethodChanged(power_monitor.powerMethod, context);
    }

    if (power_monitor.powerState != power_monitor_.powerState) {
      ReportPowerStateChanged(power_monitor.powerState, context);
    }

    if (power_monitor.lockState != power_monitor_.lockState) {
      ReportLockStateChanged(power_monitor.lockState, context);
    }
    power_monitor_ = power_monitor;
  }

  // MARK: - V8 Helpers

  CefRefPtr<CefV8Context> HybridCapabilities::RegisteredContextForSameContext(CefRefPtr<CefV8Context> context) {
    const auto objectContextPair = std::find_if(context_object_map_.begin(), context_object_map_.end(), [&context](const auto& element) {
      auto existingContext = element.first;
      return existingContext->IsSame(context);
       }
    );

    if (objectContextPair != context_object_map_.end()) {
      auto existingContext = objectContextPair->first;
      return existingContext;
    } else {
      return nullptr;
    }
  }

  CefRefPtr<CefV8Value> HybridCapabilities::HybridCapabilitiesV8ObjectForContext(CefRefPtr<CefV8Context> context) {
    const auto objectContextPair = std::find_if(context_object_map_.begin(), context_object_map_.end(), [&context](const auto& element) {
      auto existingContext = element.first;
      return existingContext->IsSame(context);
    });

    if (objectContextPair != context_object_map_.end()) {
      return objectContextPair->second;
    } else {
      return nullptr;
    }
  }

  CefRefPtr<CefV8Value> HybridCapabilities::HybridCapabilitiesV8ChildObjectForContext(CefRefPtr<CefV8Context> context, std::string accessorName) {
    auto hybridCapabilitiesObject = HybridCapabilitiesV8ObjectForContext(context);
    if (hybridCapabilitiesObject->HasValue(accessorName)) {
      return hybridCapabilitiesObject->GetValue(accessorName);
    } else {
      return nullptr;
    }
  }

  CefRefPtr<CefV8Value> HybridCapabilities::AppCapabilitiesV8ObjectForContext(CefRefPtr<CefV8Context> context) {
    return HybridCapabilitiesV8ChildObjectForContext(context, appCapabilitiesAccessorName);
  }

  CefRefPtr<CefV8Value> HybridCapabilities::AppWindowsV8ObjectForContext(CefRefPtr<CefV8Context> context) {
    return HybridCapabilitiesV8ChildObjectForContext(context, appWindowsAccessorName);
  }

  CefRefPtr<CefV8Value> HybridCapabilities::VirtualCameraV8ObjectForContext(CefRefPtr<CefV8Context> context) {
    return HybridCapabilitiesV8ChildObjectForContext(context, virtualCameraAccessorName);
  }

  CefRefPtr<CefV8Value> HybridCapabilities::PowerMonitorV8ObjectForContext(
      CefRefPtr<CefV8Context> context) {
    return HybridCapabilitiesV8ChildObjectForContext(context,
                                                     powerMonitorAccessorName);
  }

  HybridCapabilities::JSCallbackList HybridCapabilities::JavaScriptCallbacksForFunctionIdentifier(std::string functionIdentifier) {
    JSCallbackList filteredCallbacks;
    std::copy_if (callbacks_.begin(), callbacks_.end(), std::back_inserter(filteredCallbacks), [&functionIdentifier](JavaScriptCallback callback) {
      return callback.name == functionIdentifier;
    });
    return filteredCallbacks;
  }

  void HybridCapabilities::RemoveJavaScriptCallbacksForFunctionIdentifier(std::string functionIdentifier) {
    callbacks_.erase(
                     std::remove_if(callbacks_.begin(), callbacks_.end(), [&functionIdentifier](auto callback) {
                       return callback.name == functionIdentifier;
                     }),
                     callbacks_.end());
  }

  void HybridCapabilities::RemoveJavaScriptCallbacksForContext(CefRefPtr<CefV8Context> context) {
    callbacks_.erase(
                     std::remove_if(callbacks_.begin(), callbacks_.end(), [&context](auto callback) {
                       return callback.context->IsSame(context);
                     }),
                     callbacks_.end());
  }

  bool HybridCapabilities::HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                                                CefRefPtr<CefFrame> frame,
                                                CefProcessId source_process,
                                                CefRefPtr<CefProcessMessage> message) {
    for (auto hybrid_object : hybrid_objects_) {
      if (hybrid_object->HandleProcessMessage(browser, frame, source_process, message)) {
        hybrid_object->UpdateStateInDictionary(dictionary_);
        return true;
      }
    }

    return false;
  }

  // MARK: - V8 Function Handlers

  bool HybridCapabilities::ExecuteSetCallbackFunction(const CefString& name,
                                                      CefRefPtr<CefV8Value> object,
                                                      const CefV8ValueList& arguments,
                                                      CefRefPtr<CefV8Value>& retval,
                                                      CefString& exception) {
    if (arguments.empty()) {
      exception = "Missing argument. Pass a value.";
      return true;
    }

    CefRefPtr<CefV8Value> callback = arguments[0];

    if (callback->IsFunction()) {
      JavaScriptCallback jsCallback { name, callback, CefV8Context::GetCurrentContext(), nullptr, {} };
      callbacks_.emplace_back(jsCallback);
    } else if (callback->IsNull()) {
      RemoveJavaScriptCallbacksForFunctionIdentifier(name);
    } else {
      exception = "Invalid argument. Pass a function or null.";
    }

    return true;
  }

  bool HybridCapabilities::Execute(const CefString& name,
                                   CefRefPtr<CefV8Value> object,
                                   const CefV8ValueList& arguments,
                                   CefRefPtr<CefV8Value>& retval,
                                   CefString& exception) {
    if (name == FunctionIdentifier::setTitlebarButtonClickedCallback) {
      return ExecuteSetCallbackFunction(name, object, arguments, retval, exception);
    } else if (name == FunctionIdentifier::setTitlebarToolboxButtonClickedCallback) {
      return ExecuteSetCallbackFunction(name, object, arguments, retval, exception);
    } else if (name == FunctionIdentifier::setTitlebarModeSelectionChangedCallback) {
      return ExecuteSetCallbackFunction(name, object, arguments, retval, exception);
    } else if (name == FunctionIdentifier::setMainAppWindowWasHiddenCallback) {
      return ExecuteSetCallbackFunction(name, object, arguments, retval, exception);
    } else if (name == FunctionIdentifier::requestRelaunch) {
      app_capabilities_.RequestRelaunch();
      return true;
    } else if (name == FunctionIdentifier::requestReboot) {
      app_capabilities_.RequestReboot();
      return true;
    } else if ( name == FunctionIdentifier::virtualCameraSupportViewDidAppear) {
      titlebar_.titlebarButton.ReportVirtualCameraSupportViewDidAppear();
      return true;
    } else if ( name == FunctionIdentifier::virtualCameraSupportViewWillDisappear) {
      titlebar_.titlebarButton.ReportVirtualCameraSupportViewWillDisappear();
      return true;
    } else if (name == FunctionIdentifier::setPowerMethodChangedCallback) {
      return ExecuteSetCallbackFunction(name, object, arguments, retval,
                                        exception);
    } else if (name == FunctionIdentifier::setPowerStateChangedCallback) {
      return ExecuteSetCallbackFunction(name, object, arguments, retval,
                                        exception);
    } else if (name == FunctionIdentifier::setLockStateChangedCallback) {
      return ExecuteSetCallbackFunction(name, object, arguments, retval,
                                        exception);
    }
    return false;
  }

  bool HybridCapabilities::VirtualCameraHandler::Execute(const CefString& name,
                                                         CefRefPtr<CefV8Value> object,
                                                         const CefV8ValueList& arguments,
                                                         CefRefPtr<CefV8Value>& retval,
                                                         CefString& exception) {
    if (name == FunctionIdentifier::setStateChangeCallback ||
        name == FunctionIdentifier::setClientsChangeCallback) {
      return delegate_->ExecuteSetCallbackFunction(name, object, arguments, retval, exception);
    } else if (name == FunctionIdentifier::authorize) {
      delegate_->virtual_camera_.Authorize();
      return true;
    } else if (name == FunctionIdentifier::install) {
      delegate_->virtual_camera_.Install();
      return true;
    } else if (name == FunctionIdentifier::uninstall) {
      delegate_->virtual_camera_.Uninstall();
      return true;
    }

    return false;
  }

  bool HybridCapabilities::CameraHandler::Execute(const CefString& name,
                                                  CefRefPtr<CefV8Value> object,
                                                  const CefV8ValueList& arguments,
                                                  CefRefPtr<CefV8Value>& retval,
                                                  CefString& exception) {
    if (name == FunctionIdentifier::setAuthorizationChangeCallback) {
      return delegate_->ExecuteSetCallbackFunction(FunctionIdentifier::Internal::setCameraAuthorizationChangeCallback, object, arguments, retval, exception);
    } else if (name == FunctionIdentifier::authorize) {
      delegate_->app_capabilities_.camera.Authorize();
      return true;
    }

    return false;
  }

  bool HybridCapabilities::MicrophoneHandler::Execute(const CefString& name,
                                                  CefRefPtr<CefV8Value> object,
                                                  const CefV8ValueList& arguments,
                                                  CefRefPtr<CefV8Value>& retval,
                                                  CefString& exception) {
    if (name == FunctionIdentifier::setAuthorizationChangeCallback) {
      return delegate_->ExecuteSetCallbackFunction(FunctionIdentifier::Internal::setMicrophoneAuthorizationChangeCallback, object, arguments, retval, exception);
    } else if (name == FunctionIdentifier::authorize) {
      delegate_->app_capabilities_.microphone.Authorize();
      return true;
    }

    return false;
  }

  bool HybridCapabilities::MainWindowHandler::Execute(const CefString& name,
                                                      CefRefPtr<CefV8Value> object,
                                                      const CefV8ValueList& arguments,
                                                      CefRefPtr<CefV8Value>& retval,
                                                      CefString& exception) {
    if (name == FunctionIdentifier::resizeTo) {
      if (arguments.size() < 2) {
        exception = "Missing arguments. Pass two values.";
        return true;
      }

      CefRefPtr<CefV8Value> widthValue = arguments[0];
      CefRefPtr<CefV8Value> heightValue = arguments[1];

      if (widthValue->IsInt() && heightValue->IsInt()) {
        int width = arguments[0].get()->GetIntValue();
        int height = arguments[1].get()->GetIntValue();
        CefSize size { width, height };
        delegate_->app_windows_.mainAppWindow.ResizeTo(size);
      } else {
        exception = "Invalid arguments. Pass two integers.";
      }

      return true;
    } else if (name == FunctionIdentifier::setMainAppWindowIsHiddenChangedCallback) {
      return delegate_->ExecuteSetCallbackFunction(name, object, arguments, retval, exception);
    }

    return false;
  }

  bool HybridCapabilities::MainWindowAccessor::Get(const CefString& name,
                                                   const CefRefPtr<CefV8Value> object,
                                                   CefRefPtr<CefV8Value>& retval,
                                                   CefString& exception) {
    if (name == mmhmm::MainAppWindow::isFloatingKey) {
      retval = CefV8Value::CreateBool(delegate_->app_windows_.mainAppWindow.isFloating);
      return true;
    }
    if (name == mmhmm::MainAppWindow::isHiddenKey) {
      retval = CefV8Value::CreateBool(delegate_->app_windows_.mainAppWindow.isHidden);
      return true;
    }
    return false;
  }

  bool HybridCapabilities::MainWindowAccessor::Set(const CefString& name,
                                                   const CefRefPtr<CefV8Value> object,
                                                   const CefRefPtr<CefV8Value> value,
                                                   CefString& exception) {
    if (name == mmhmm::MainAppWindow::isFloatingKey && value->IsBool()) {
      bool isFloating = value->GetBoolValue();
      delegate_->app_windows_.mainAppWindow.isFloating = isFloating;
      delegate_->app_windows_.mainAppWindow.SetIsFloatingTo(isFloating);
      return true;
    }
    if (name == mmhmm::MainAppWindow::isHiddenKey && value->IsBool()) {
      bool isHidden = value->GetBoolValue();
      delegate_->app_windows_.mainAppWindow.isHidden = isHidden;
      delegate_->app_windows_.mainAppWindow.SetIsHiddenTo(isHidden);
      return true;
    }
    return false;
  }

  bool HybridCapabilities::TitlebarAccessor::Get(const CefString& name,
                                                   const CefRefPtr<CefV8Value> object,
                                                   CefRefPtr<CefV8Value>& retval,
                                                   CefString& exception) {
    if (name == mmhmm::Titlebar::appModeKey) {
      auto appMode = delegate_->titlebar_.appMode;
      retval = CefV8Value::CreateString(mmhmm::StringForAppMode(appMode));
      return true;
    }
    return false;
  }

  bool HybridCapabilities::TitlebarAccessor::Set(const CefString& name,
                                                   const CefRefPtr<CefV8Value> object,
                                                   const CefRefPtr<CefV8Value> value,
                                                   CefString& exception) {
    if (name == mmhmm::Titlebar::appModeKey && value->IsString()) {
      auto appModeString = value->GetStringValue();
      auto maybeMode = mmhmm::AppModeFromString(appModeString);
      if (maybeMode.has_value()) {
        auto appMode = maybeMode.value();
        delegate_->UpdateAppModeInDictionary(appMode);
        delegate_->titlebar_.appMode = appMode;
        delegate_->titlebar_.SendTitlebarUpdate();
        // TODO: Redundant with the above, can be removed at a later time.
        delegate_->titlebar_.AppModeChanged(appMode);
      }
      return true;
    }
    return false;
  }

  bool HybridCapabilities::ToolboxButtonAccessor::Get(const CefString& name,
                                                   const CefRefPtr<CefV8Value> object,
                                                   CefRefPtr<CefV8Value>& retval,
                                                   CefString& exception) {
    if (name == mmhmm::ToolboxButton::isEnabledKey) {
      auto isEnabled = delegate_->titlebar_.toolboxButton.isEnabled;
      retval = CefV8Value::CreateBool(isEnabled);
      return true;
    } else if (name == mmhmm::ToolboxButton::tooltipKey) {
      auto tooltip = delegate_->titlebar_.toolboxButton.tooltip;
      retval = CefV8Value::CreateString(tooltip);
      return true;
    } else if (name == mmhmm::ToolboxButton::infoKey) {
      auto info = delegate_->titlebar_.toolboxButton.info;
      retval = CefV8Value::CreateString(info);
      return true;
    }
    return false;
  }

  bool HybridCapabilities::ToolboxButtonAccessor::Set(const CefString& name,
                                                   const CefRefPtr<CefV8Value> object,
                                                   const CefRefPtr<CefV8Value> value,
                                                   CefString& exception) {
    if (name == mmhmm::ToolboxButton::isEnabledKey && value->IsBool()) {
      auto isEnabled = value->GetBoolValue();
      delegate_->titlebar_.toolboxButton.isEnabled = isEnabled;
      delegate_->titlebar_.SendTitlebarUpdate();
      return true;
    } else if (name == mmhmm::ToolboxButton::tooltipKey && value->IsString()) {
      auto tooltip = value->GetStringValue();
      delegate_->titlebar_.toolboxButton.tooltip = tooltip;
      delegate_->titlebar_.SendTitlebarUpdate();
      return true;
    } else if (name == mmhmm::ToolboxButton::infoKey && value->IsString()) {
      auto info = value->GetStringValue();
      delegate_->titlebar_.toolboxButton.info = info;
      delegate_->titlebar_.SendTitlebarUpdate();
      return true;
    }
    return false;
  }

  bool HybridCapabilities::PowerMonitorAccessor::Get(
      const CefString& name,
      const CefRefPtr<CefV8Value> object,
      CefRefPtr<CefV8Value>& retval,
      CefString& exception) {
    if (name == mmhmm::PowerMonitor::powerMethodKey) {
      retval = CefV8Value::CreateString(
          PowerMethodToString(delegate_->power_monitor_.powerMethod));
      return true;
    }
    if (name == mmhmm::PowerMonitor::powerStateKey) {
      retval = CefV8Value::CreateString(
          PowerStateToString(delegate_->power_monitor_.powerState));
      return true;
    }
    if (name == mmhmm::PowerMonitor::lockStateKey) {
      retval = CefV8Value::CreateString(
          LockStateToString(delegate_->power_monitor_.lockState));
      return true;
    }

    return false;
  }

  bool HybridCapabilities::PowerMonitorAccessor::Set(
      const CefString& name,
      const CefRefPtr<CefV8Value> object,
      const CefRefPtr<CefV8Value> value,
      CefString& exception) {
    return false;
  }
  }
