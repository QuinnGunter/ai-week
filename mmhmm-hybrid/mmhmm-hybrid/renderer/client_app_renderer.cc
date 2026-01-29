// Copyright (c) 2013 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#include "client_app_renderer.h"

#include "include/base/cef_logging.h"

namespace client {

ClientAppRenderer::ClientAppRenderer() {
  CreateDelegates(delegates_);
  screenshareHandler_ = new mmhmm::ScreenShareHandler();
  hybridBridgeHandler_ = new mmhmm::JSCallbackHandler();
  mini_remote_handler_ = new mmhmm::MiniRemoteHandler();
  segmentation_panel_handler_ = new mmhmm::SegmentationPanelHandler();
  toolbox_handler_ = new mmhmm::ToolboxHandler();
  floating_nav_handler_ = new mmhmm::FloatingNavHandler();
#if defined (OS_WIN)
  stream_deck_handler_ = new mmhmm::StreamDeckHandler();
#endif
}

void ClientAppRenderer::OnWebKitInitialized() {
  DelegateSet::iterator it = delegates_.begin();
  for (; it != delegates_.end(); ++it)
    (*it)->OnWebKitInitialized(this);
}

void ClientAppRenderer::OnBrowserCreated(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefDictionaryValue> extra_info) {
  DelegateSet::iterator it = delegates_.begin();

  DLOG(INFO) << "Browser created.";

  if (extra_info != nullptr && hybrid_capabilities_ == nullptr) {
    hybrid_capabilities_ = new mmhmm::HybridCapabilities(extra_info);
  } else if (extra_info == nullptr) {
    LOG(ERROR) << "Extra info dictionary is null.";
  }

  for (; it != delegates_.end(); ++it)
    (*it)->OnBrowserCreated(this, browser, extra_info);
}

void ClientAppRenderer::OnBrowserDestroyed(CefRefPtr<CefBrowser> browser) {
  DLOG(INFO) << "Browser destroyed.";

  DelegateSet::iterator it = delegates_.begin();
  for (; it != delegates_.end(); ++it)
    (*it)->OnBrowserDestroyed(this, browser);
}

CefRefPtr<CefLoadHandler> ClientAppRenderer::GetLoadHandler() {
  CefRefPtr<CefLoadHandler> load_handler;
  DelegateSet::iterator it = delegates_.begin();
  for (; it != delegates_.end() && !load_handler.get(); ++it)
    load_handler = (*it)->GetLoadHandler(this);

  return load_handler;
}

void ClientAppRenderer::OnContextCreated(CefRefPtr<CefBrowser> browser,
                                         CefRefPtr<CefFrame> frame,
                                         CefRefPtr<CefV8Context> context) {
  DLOG(INFO) << "Created context " << context << " for frame " << frame->GetIdentifier() << " " << frame->GetURL();

  DelegateSet::iterator it = delegates_.begin();
  for (; it != delegates_.end(); ++it)
    (*it)->OnContextCreated(this, browser, frame, context);

  //Get the window context
  CefRefPtr<CefV8Value> window = context->GetGlobal();
  // Create an instance of the screenshare CefV8Handler object.
  // Create the "getScreenshareMedia" function.
  CefRefPtr<CefV8Value> func = CefV8Value::CreateFunction("getScreenshareMedia", screenshareHandler_);
  // Add the "getScreenshareMedia" function to the "window" object.
  window->SetValue("getScreenshareMedia", func, V8_PROPERTY_ATTRIBUTE_NONE);


  CefRefPtr<CefV8Value> func2 = CefV8Value::CreateFunction("enumerateScreenshareMedia", screenshareHandler_);
  // Add the "enumerateScreenshareMedia" function to the "window" object.
  window->SetValue("enumerateScreenshareMedia", func2, V8_PROPERTY_ATTRIBUTE_NONE);

  CefRefPtr<CefV8Value> func3 = CefV8Value::CreateFunction("screenshareMediaSelected", screenshareHandler_);
  // Add the "screenshareMediaSelected" function to the "window" object.
  window->SetValue("screenshareMediaSelected", func3, V8_PROPERTY_ATTRIBUTE_NONE);

  auto on_send_mmhmm_control_message = CefV8Value::CreateFunction(
      "sendMmhmmControlMessage", mini_remote_handler_);
  window->SetValue("sendMmhmmControlMessage", on_send_mmhmm_control_message,
                   V8_PROPERTY_ATTRIBUTE_NONE);

  auto mini_remote_closed =
      CefV8Value::CreateFunction(
      "miniRemoteClosed", mini_remote_handler_);
  window->SetValue("miniRemoteClosed", mini_remote_closed,
                   V8_PROPERTY_ATTRIBUTE_NONE);

  auto mini_remote_open =
      CefV8Value::CreateFunction("miniRemoteOpen", mini_remote_handler_);
  window->SetValue("miniRemoteOpen", mini_remote_open,
                   V8_PROPERTY_ATTRIBUTE_NONE);

  auto mini_remote_save_state =
      CefV8Value::CreateFunction(
          "miniRemoteSaveState", mini_remote_handler_);
  window->SetValue("miniRemoteSaveState", mini_remote_save_state,
      V8_PROPERTY_ATTRIBUTE_NONE);

  auto get_speaker_notes =
      CefV8Value::CreateFunction("getSpeakerNotes", mini_remote_handler_);
  window->SetValue("getSpeakerNotes", get_speaker_notes,
      V8_PROPERTY_ATTRIBUTE_NONE);

  auto set_speaker_notes =
      CefV8Value::CreateFunction("setSpeakerNotes", mini_remote_handler_);
  window->SetValue("setSpeakerNotes", set_speaker_notes,
      V8_PROPERTY_ATTRIBUTE_NONE);

  auto set_minimum_mini_remote_size =
      CefV8Value::CreateFunction("setMinimumMiniRemoteSize", mini_remote_handler_);
  window->SetValue("setMinimumMiniRemoteSize", set_minimum_mini_remote_size,
      V8_PROPERTY_ATTRIBUTE_NONE);

  auto adjust_height =
      CefV8Value::CreateFunction("adjustHeight", mini_remote_handler_);
  window->SetValue("adjustHeight", adjust_height,
      V8_PROPERTY_ATTRIBUTE_NONE);

  auto toggle_broadcast_mode =
    CefV8Value::CreateFunction(
      "notifyToggleBroadcastMode", mini_remote_handler_);
  window->SetValue("notifyToggleBroadcastMode", toggle_broadcast_mode,
    V8_PROPERTY_ATTRIBUTE_NONE);

  auto hybrid_capabilities_v8 = hybrid_capabilities_->CreateCefV8ObjectInContext(context);
  window->SetValue("gHybrid", hybrid_capabilities_v8, static_cast<cef_v8_propertyattribute_t>(
    V8_PROPERTY_ATTRIBUTE_READONLY | V8_PROPERTY_ATTRIBUTE_DONTENUM | V8_PROPERTY_ATTRIBUTE_DONTDELETE));

  //Add hybrid bridge callbacks
  CefRefPtr<CefV8Value> initializeFunc = CefV8Value::CreateFunction("mmhmm_initialized", hybridBridgeHandler_);
  window->SetValue("mmhmm_initialized", initializeFunc, V8_PROPERTY_ATTRIBUTE_NONE);

  CefRefPtr<CefV8Value> callbackFunc = CefV8Value::CreateFunction("mmhmm_nativeCallback", hybridBridgeHandler_);
  window->SetValue("mmhmm_nativeCallback", callbackFunc, V8_PROPERTY_ATTRIBUTE_NONE);

  CefRefPtr<CefV8Value> propertyChangedFunc = CefV8Value::CreateFunction("mmhmm_propertyChanged", hybridBridgeHandler_);
  window->SetValue("mmhmm_propertyChanged", propertyChangedFunc, V8_PROPERTY_ATTRIBUTE_NONE);

  CefRefPtr<CefV8Value> showRemoteFunc = CefV8Value::CreateFunction("mmhmm_showRemote", hybridBridgeHandler_);
  window->SetValue("mmhmm_showRemote", showRemoteFunc, V8_PROPERTY_ATTRIBUTE_NONE);

  CefRefPtr<CefV8Value> isStageRenderingFunc = CefV8Value::CreateFunction("mmhmm_isStageRendering", hybridBridgeHandler_);
  window->SetValue("mmhmm_isStageRendering", isStageRenderingFunc, V8_PROPERTY_ATTRIBUTE_NONE);

  CefRefPtr<CefV8Value> resizeToFunc = CefV8Value::CreateFunction(
      "resizeTo", hybridBridgeHandler_);
  window->SetValue("resizeTo", resizeToFunc,
                   V8_PROPERTY_ATTRIBUTE_NONE);

  CefRefPtr<CefV8Value> setMinimumSizeFunc =
      CefV8Value::CreateFunction("setMinimumSize", hybridBridgeHandler_);
  window->SetValue("setMinimumSize", setMinimumSizeFunc, V8_PROPERTY_ATTRIBUTE_NONE);

  auto segmentationPanelCreatedFunc = CefV8Value::CreateFunction("segmentationPanelCreated", segmentation_panel_handler_);
  window->SetValue("segmentationPanelCreated", segmentationPanelCreatedFunc, V8_PROPERTY_ATTRIBUTE_NONE);
  
  auto segmentationPanelDataChangedFunc = CefV8Value::CreateFunction("segmentationPanelDataChanged", segmentation_panel_handler_);
  window->SetValue("segmentationPanelDataChanged", segmentationPanelDataChangedFunc, V8_PROPERTY_ATTRIBUTE_NONE);
  
  CefRefPtr<CefV8Value> setMaximumSizeFunc =
      CefV8Value::CreateFunction("setMaximumSize", hybridBridgeHandler_);
  window->SetValue("setMaximumSize", setMaximumSizeFunc, V8_PROPERTY_ATTRIBUTE_NONE);

  CefRefPtr<CefV8Value> omitInScreenSharesFunc =
      CefV8Value::CreateFunction("omitInScreenShares", hybridBridgeHandler_);
  window->SetValue("omitInScreenShares", omitInScreenSharesFunc, V8_PROPERTY_ATTRIBUTE_NONE);

  auto changeAppModeFunction =
      CefV8Value::CreateFunction(mmhmm::ToolboxHandler::ChangeAppModeFunctionName, toolbox_handler_);
  window->SetValue(mmhmm::ToolboxHandler::ChangeAppModeFunctionName,
                   changeAppModeFunction,
                   V8_PROPERTY_ATTRIBUTE_NONE);

  // Floating Nav functions
  auto launchFloatingNavFunction =
      CefV8Value::CreateFunction(mmhmm::FloatingNavHandler::LaunchFloatingNavFunctionName, floating_nav_handler_);
  window->SetValue(mmhmm::FloatingNavHandler::LaunchFloatingNavFunctionName,
                   launchFloatingNavFunction,
                   V8_PROPERTY_ATTRIBUTE_NONE);

  auto floatingNavReadyFunction =
      CefV8Value::CreateFunction(mmhmm::FloatingNavHandler::FloatingNavReadyFunctionName, floating_nav_handler_);
  window->SetValue(mmhmm::FloatingNavHandler::FloatingNavReadyFunctionName,
                   floatingNavReadyFunction,
                   V8_PROPERTY_ATTRIBUTE_NONE);

  auto launchScreenRecorderFunction =
      CefV8Value::CreateFunction(mmhmm::FloatingNavHandler::LaunchScreenRecorderFunctionName, floating_nav_handler_);
  window->SetValue(mmhmm::FloatingNavHandler::LaunchScreenRecorderFunctionName,
                   launchScreenRecorderFunction,
                   V8_PROPERTY_ATTRIBUTE_NONE);

#if defined (OS_WIN)
  auto streamDeckPromptAskChangedFunc = CefV8Value::CreateFunction("streamDeckPromptAskChanged", stream_deck_handler_);
  window->SetValue("streamDeckPromptAskChanged", streamDeckPromptAskChangedFunc, V8_PROPERTY_ATTRIBUTE_NONE);
#endif

  //Enable only for mac until we have a feature flag system
#if defined (OS_MAC)
  CefRefPtr<CefV8Value> enterBroadcastModeFunc = CefV8Value::CreateFunction("mmhmm_enterBroadcastMode", hybridBridgeHandler_);
  window->SetValue("mmhmm_enterBroadcastMode", enterBroadcastModeFunc, V8_PROPERTY_ATTRIBUTE_NONE);
#endif
}

void ClientAppRenderer::OnContextReleased(CefRefPtr<CefBrowser> browser,
                                          CefRefPtr<CefFrame> frame,
                                          CefRefPtr<CefV8Context> context) {
  DLOG(INFO) << "Released context " << context << " for frame " << frame->GetIdentifier() << " " << frame->GetURL();

  hybrid_capabilities_->RemoveCefV8ObjectFromContext(context);

  DelegateSet::iterator it = delegates_.begin();
  for (; it != delegates_.end(); ++it)
    (*it)->OnContextReleased(this, browser, frame, context);
}

void ClientAppRenderer::OnUncaughtException(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefRefPtr<CefV8Context> context,
    CefRefPtr<CefV8Exception> exception,
    CefRefPtr<CefV8StackTrace> stackTrace) {
  DelegateSet::iterator it = delegates_.begin();
  for (; it != delegates_.end(); ++it) {
    (*it)->OnUncaughtException(this, browser, frame, context, exception,
                               stackTrace);
  }
}

void ClientAppRenderer::OnFocusedNodeChanged(CefRefPtr<CefBrowser> browser,
                                             CefRefPtr<CefFrame> frame,
                                             CefRefPtr<CefDOMNode> node) {
  DelegateSet::iterator it = delegates_.begin();
  for (; it != delegates_.end(); ++it)
    (*it)->OnFocusedNodeChanged(this, browser, frame, node);
}

bool ClientAppRenderer::OnProcessMessageReceived(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefProcessId source_process,
    CefRefPtr<CefProcessMessage> message) {
  DCHECK_EQ(source_process, PID_BROWSER);

  bool handled = false;

  const std::string& message_name = message->GetName();
  if (message_name == "login_message") {
    auto args = message->GetArgumentList();
    auto token = args->GetString(0);
    auto jsCode = L"mmhmmAPI.defaultEndpoint().performAuthenticationHandoff('" +
                  token.ToWString() + L"');";
    frame->ExecuteJavaScript(jsCode, frame->GetURL(), 0);
    return true;
  } else if (message_name == "launch_url") {
    auto args = message->GetArgumentList();
    auto url = args->GetString(0);
    auto window_features = args->GetString(1);
    auto jsCode = L"window.open('" + url.ToWString() + L"', '_blank', '" +
                  window_features.ToWString() + L"');";
    frame->ExecuteJavaScript(jsCode, frame->GetURL(), 0);
    return true;
  } else if (message_name == "join_meeting_message") {
    auto args = message->GetArgumentList();
    auto url = args->GetString(0).ToString();
    std::string meeting_id{"#talkID=" + url};

    auto jsCode =
        "window.location.assign(document.location.origin + "
        "document.location.pathname + '" +
        meeting_id + "');";
    frame->ExecuteJavaScript(jsCode, frame->GetURL(), 0);
    return true;
  } else if (message_name == "import_template_message") {
    auto args = message->GetArgumentList();
    auto template_id = args->GetString(0).ToString();
    std::string import_params{"#importID=" + template_id};

    auto jsCode =
        "window.location.assign(document.location.origin + "
        "document.location.pathname + '" +
        import_params + "');";
    frame->ExecuteJavaScript(jsCode, frame->GetURL(), 0);
    return true;
  } else if (message_name == "camera_app_connected") {
    auto args = message->GetArgumentList();
    std::string json = args->GetString(0);
    const bool is_first = args->GetBool(1);

    if (is_first) {
      frame->ExecuteJavaScript("gApp.stage.startVirtualCamera()",
                               frame->GetURL(), 0);

      auto javascript{
          "NotificationCenter.default.postNotification('VirtualCamera."
          "CameraActive', null);"};
      frame->ExecuteJavaScript(javascript, frame->GetURL(), 0);
    }
    return true;
  } else if (message_name == "camera_app_disconnected") {
    auto args = message->GetArgumentList();
    std::string json = args->GetString(0);
    const bool is_last = args->GetBool(1);

    if (is_last) {
      frame->ExecuteJavaScript("gApp.stage.stopVirtualCamera()",
                               frame->GetURL(), 0);

      auto javascript{
          "NotificationCenter.default.postNotification('VirtualCamera."
          "CameraActive', null);"};
      frame->ExecuteJavaScript(javascript, frame->GetURL(), 0);
    }
    return true;
  } else if (message_name == "getScreenshareMedia_success") {
    auto args = message->GetArgumentList();
    auto success = args->GetBool(0);
    auto messageId = args->GetInt(1);

    if (screenshareHandler_->callbackFunctions_.find(messageId) == screenshareHandler_->callbackFunctions_.end()) {
      //key doesn't exist
      return false;
    }

    auto callbackHandler = screenshareHandler_->callbackFunctions_.at(messageId);
    screenshareHandler_->callbackFunctions_.erase(messageId);

    auto context = std::get<0>(callbackHandler);
    auto callback = success ? std::get<1>(callbackHandler) : std::get<2>(callbackHandler);
    CefV8ValueList returnArgs;

    context->Enter();

    if (success)
    {
      auto type = args->GetString(2);
      auto id = args->GetString(3);
      auto title = args->GetString(4);
      auto processName = args->GetString(5);
      returnArgs.push_back(CefV8Value::CreateString(type));
      returnArgs.push_back(CefV8Value::CreateString(id));
      returnArgs.push_back(CefV8Value::CreateString(title));
      returnArgs.push_back(CefV8Value::CreateString(processName));

      if (args->GetSize() > 6) {
        auto streamConfig = args->GetString(6);
        if (!streamConfig.empty()) {
          DLOG(INFO) << "CEF Renderer: Screen share config received: " << streamConfig.ToString();
          returnArgs.push_back(CefV8Value::CreateString(streamConfig));
        }
      }
    } else {
      std::string errorMessage = "Unknown error";
      if (args->GetSize() >= 4) {
        errorMessage = args->GetString(3);
      }
      returnArgs.push_back(CefV8Value::CreateString(errorMessage));
    }

    if (!callback->ExecuteFunctionWithContext(context, nullptr , returnArgs))
    {
      mmhmm::LogException(callback);
    }

    context->Exit();

    return true;
  } else if (message_name == "enumerateScreenshareMedia_success") {
    auto args = message->GetArgumentList();


    auto success = args->GetBool(0);
    auto messageId = args->GetInt(1);

    if (success)
    {
      if (screenshareHandler_->callbackFunctions_.find(messageId) == screenshareHandler_->callbackFunctions_.end()) {
        //key doesn't exist
        return false;
      }

      auto callbackHandler = screenshareHandler_->callbackFunctions_.at(messageId);
      auto context = std::get<0>(callbackHandler);
      auto callbackSuccess = std::get<1>(callbackHandler);

      context->Enter();

      CefV8ValueList returnArgs;

      auto array = CefV8Value::CreateArray((int)args->GetSize() - 2);
      auto jsonObj = args->GetDictionary(4);

      for (int i = 0; i < ((int)args->GetSize()) -2; i++)
      {
        auto screenShareItem = CefV8Value::CreateObject(nullptr, nullptr);

        auto dict = args->GetDictionary((size_t)i + 2);

        screenShareItem->SetValue("id", CefV8Value::CreateString(dict->GetString("id")), V8_PROPERTY_ATTRIBUTE_NONE);
        screenShareItem->SetValue("preview", CefV8Value::CreateString(dict->GetString("preview")), V8_PROPERTY_ATTRIBUTE_NONE);
        screenShareItem->SetValue("title", CefV8Value::CreateString(dict->GetString("title")), V8_PROPERTY_ATTRIBUTE_NONE);
        screenShareItem->SetValue("type", CefV8Value::CreateString(dict->GetString("type")), V8_PROPERTY_ATTRIBUTE_NONE);
        screenShareItem->SetValue("processName", CefV8Value::CreateString(dict->GetString("processName")), V8_PROPERTY_ATTRIBUTE_NONE);

        array->SetValue(i, screenShareItem);
      }

      returnArgs.push_back(array);


      screenshareHandler_->callbackFunctions_.erase(messageId);
      if (callbackSuccess->ExecuteFunctionWithContext(context, nullptr, returnArgs))
      {
      }

      context->Exit();
    }

    return true;
  } else if (message->GetName() == "updateGHybrid") {
    auto args = message->GetArgumentList();
    auto dict = args->GetDictionary(0);
    hybrid_capabilities_->UpdateCefV8ObjectFromDictionary(dict, frame->GetV8Context());
  } else if (message->GetName() == "reportAppCapabilities") {
    auto args = message->GetArgumentList();
    auto dict = args->GetDictionary(0);
    hybrid_capabilities_->UpdateAppCapabilitiesFromDictionary(dict, frame->GetV8Context());
  } else if (message->GetName() == "reportAppWindows") {
    auto args = message->GetArgumentList();
    auto dict = args->GetDictionary(0);
    hybrid_capabilities_->UpdateAppWindowsFromDictionary(dict, frame->GetV8Context());
  } else if (message->GetName() == "reportVirtualCamera") {
    auto args = message->GetArgumentList();
    auto dict = args->GetDictionary(0);
    hybrid_capabilities_->UpdateVirtualCameraFromDictionary(dict, frame->GetV8Context());
  } else if (message->GetName() == "reportPowerMonitor") {
    auto args = message->GetArgumentList();
    auto dict = args->GetDictionary(0);
    hybrid_capabilities_->UpdatePowerMonitorFromDictionary(
        dict, frame->GetV8Context());
  } else if (message->GetName() == "reportTitlebarButtonClicked") {
    hybrid_capabilities_->ReportTitlebarButtonClicked();
  } else if (message->GetName() == "reportTitlebarToolboxButtonClicked") {
    hybrid_capabilities_->ReportTitlebarToolboxButtonClicked();
  } else if (message->GetName() == "reportTitlebarModeSelectionChanged") {
    auto args = message->GetArgumentList();
    auto dict = args->GetDictionary(0);
    hybrid_capabilities_->ReportTitlebarModeSelectionChanged(dict, frame->GetV8Context());
  } else if (message->GetName() == "reportWebAppCallbackData") {
    auto args = message->GetArgumentList();
    auto dict = args->GetDictionary(0);
    auto dataString = dict->GetString("callbackData");
    auto fragmentString = dict->GetString("fragmentData");
    auto jsCode = "HandleCallbackData('" + dataString.ToString() + "', '" + fragmentString.ToString() + "');";
    frame->ExecuteJavaScript(jsCode, frame->GetURL(), 0);
  } else if (message->GetName() == "execute_javascript") {
    auto args = message->GetArgumentList();
    std::string jsCode = args->GetString(0);

    frame->ExecuteJavaScript(jsCode, frame->GetURL(), 0);
    return true;
  } 
  else if (message_name == "launch_recording_for_edit_message") {
    auto args = message->GetArgumentList();
    auto recording_id = args->GetString(0).ToString();
    auto launch_recording_params{"#recordingId=" + recording_id};

    auto javascript_reload_script =
        "window.location.assign(document.location.origin + "
        "document.location.pathname + '" +
        launch_recording_params + "');";
    frame->ExecuteJavaScript(javascript_reload_script, frame->GetURL(), 0);
    return true;
  } else if (message->GetName() == "mini_remote_property_update") {
    auto args = message->GetArgumentList();
    std::string json = args->GetString(0);
    frame->ExecuteJavaScript(json, frame->GetURL(), 0);
  } else {
    if (hybrid_capabilities_->HandleProcessMessage(browser, frame, source_process, message)) {
      return true;
    }
  }

  DelegateSet::iterator it = delegates_.begin();
  for (; it != delegates_.end() && !handled; ++it) {
    handled = (*it)->OnProcessMessageReceived(this, browser, frame,
                                              source_process, message);
  }

  return handled;
}

}  // namespace client
