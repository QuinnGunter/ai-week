//
//  js_callback_handler.cc
//  mmhmm-hybrid
//
//  Created by Martin Pilkington on 15/06/2023.
//

#include "js_callback_handler.h"

namespace mmhmm {

  void CefV8ArrayToListValue(CefRefPtr<CefV8Value> source,
                             CefRefPtr<CefListValue> target) {
    assert(source->IsArray());

    int arg_length = source->GetArrayLength();
    if (arg_length == 0)
      return;

    target->SetSize(arg_length);

    for (int i = 0; i < arg_length; ++i) {
      CefRefPtr<CefV8Value> value = source->GetValue(i);
      if (value->IsBool()) {
        target->SetBool(i, value->GetBoolValue());
      } else if (value->IsInt() || value->IsUInt()) {
        target->SetInt(i, value->GetIntValue());
      } else if (value->IsDouble()) {
        target->SetDouble(i, value->GetDoubleValue());
      } else if (value->IsNull()) {
        target->SetNull(i);
      } else if (value->IsString() || value->IsDate()) {
        target->SetString(i, value->GetStringValue());
      }
    }
  }

  bool JSCallbackHandler::Execute(const CefString &name,
                                  CefRefPtr<CefV8Value> object,
                                  const CefV8ValueList &arguments,
                                  CefRefPtr<CefV8Value> &retval,
                                  CefString &exception) {

    CefRefPtr<CefProcessMessage> msg;
    if (name == "mmhmm_nativeCallback") {
      CefString context = arguments[0].get()->GetStringValue();
      CefString valueJSON = arguments[1].get()->GetStringValue();

      msg = CefProcessMessage::Create("nativeCallback");
      CefRefPtr<CefListValue> args = msg->GetArgumentList();
      args->SetString(0, context);
      args->SetString(1, valueJSON);
    } else if (name == "mmhmm_propertyChanged") {
      CefString key = arguments[0].get()->GetStringValue();

      CefRefPtr<CefV8Value> v8Value = arguments[1].get();

      CefRefPtr<CefValue> value = CefValue::Create();
      if (v8Value->IsInt()) {
        value->SetInt(v8Value->GetIntValue());
      } if (v8Value->IsBool()) {
        value->SetBool(v8Value->GetBoolValue());
      } if (v8Value->IsString()) {
        value->SetString(v8Value->GetStringValue());
      } if (v8Value->IsDouble()) {
        value->SetDouble(v8Value->GetDoubleValue());
      }

      msg = CefProcessMessage::Create("propertyChanged");
      CefRefPtr<CefListValue> args = msg->GetArgumentList();
      args->SetString(0, key);
      args->SetValue(1, value);
    } else if (name == "mmhmm_initialized") {
      CefString build = arguments[0].get()->GetValue("build")->GetStringValue();
      CefString theme = arguments[0].get()->GetValue("theme")->GetStringValue();
      CefString release_track = arguments[0].get()->GetValue("releaseTrack")->GetStringValue();
      auto features_list = CefListValue::Create();
      if (arguments[0].get()->HasValue("features")) {
        CefV8ArrayToListValue(
                              arguments[0].get()->GetValue("features"),
                              features_list);
      }

      msg = CefProcessMessage::Create("bridgeInitialized");
      CefRefPtr<CefListValue> args = msg->GetArgumentList();
      args->SetString(0, build);
      args->SetString(1, theme);
      args->SetString(2, release_track);
      args->SetList(3, features_list);
    }
    else if (name == "mmhmm_showRemote") {
      auto visible = arguments[0].get()->GetBoolValue();

      if (visible) {
        msg = CefProcessMessage::Create("showMiniRemote");
      }
      else {
        msg = CefProcessMessage::Create("hideMiniRemote");
      }
    }
    else if (name == "mmhmm_enterBroadcastMode") {
      auto enter_broadcast_mode = arguments[0].get()->GetBoolValue();

      if (enter_broadcast_mode) {
        msg = CefProcessMessage::Create("enterBroadcastMode");
      }
      else {
        msg = CefProcessMessage::Create("exitBroadcastMode");
      }
    }
    else if (name == "mmhmm_isStageRendering") {
      auto is_rendering = arguments[0].get()->GetBoolValue();

      if (is_rendering) {
        msg = CefProcessMessage::Create("stageRenderingStarted");
      }
      else {
        msg = CefProcessMessage::Create("stageRenderingStopped");
      }
    } else if (name == "resizeTo") {
      if (arguments.size() == 2 && arguments[0]->IsInt() &&
          arguments[1]->IsInt()) {

        auto width = arguments[0].get()->GetIntValue();
        auto height = arguments[1].get()->GetIntValue();

        msg = CefProcessMessage::Create("resizeTo");
        CefRefPtr<CefListValue> args = msg->GetArgumentList();
        args->SetInt(0, width);
        args->SetInt(1, height);
      }
    } else if (name == "setMinimumSize") {
      if (arguments.size() == 2 && arguments[0]->IsInt() &&
          arguments[1]->IsInt()) {

        auto width = arguments[0].get()->GetIntValue();
        auto height = arguments[1].get()->GetIntValue();

        msg = CefProcessMessage::Create("setMinimumSize");
        CefRefPtr<CefListValue> args = msg->GetArgumentList();
        args->SetInt(0, width);
        args->SetInt(1, height);
      }
    } else if (name == "setMaximumSize") {
      if (arguments.size() == 2 && arguments[0]->IsInt() &&
          arguments[1]->IsInt()) {

        auto width = arguments[0].get()->GetIntValue();
        auto height = arguments[1].get()->GetIntValue();

        msg = CefProcessMessage::Create("setMaximumSize");
        CefRefPtr<CefListValue> args = msg->GetArgumentList();
        args->SetInt(0, width);
        args->SetInt(1, height);
      }
    } else if (name == "omitInScreenShares") {
      if (arguments.size() == 1 && arguments[0]->IsBool()) {
        auto omit = arguments[0].get()->GetBoolValue();

        msg = CefProcessMessage::Create("omitInScreenShares");
        CefRefPtr<CefListValue> args = msg->GetArgumentList();
        args->SetBool(0, omit);
      } else {
        exception = "Invalid argument. Expected a boolean.";
      }
    }

    if (msg == nullptr) {
      return false;
    }

    CefRefPtr<CefBrowser> browser = CefV8Context::GetCurrentContext()->GetBrowser();
    browser->GetMainFrame()->SendProcessMessage(PID_BROWSER, msg);
    return true;
  }
}


