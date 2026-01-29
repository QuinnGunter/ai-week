#include "system_video_effects_monitor_renderer.h"
#include "cef_value_utility.h"

namespace mmhmm {
  SystemVideoEffectsStatus SystemVideoEffectsMonitorProjection::GetStatus() const {
    return status_;
  }

  void SystemVideoEffectsMonitorProjection::ShowSystemUI() const {
    auto message = CefProcessMessage::Create(SystemVideoEffectsMonitorMessageNames::showSystemUI);
    SendProcessMessageToBrowserProcess(message);
  }
}

namespace mmhmm {
  const std::string SystemVideoEffectsMonitorProjection::v8_accessor_name = "systemVideoEffectsMonitor";
  const std::string SystemVideoEffectsMonitorProjection::V8PropertyNames::status = "status";
  const std::string SystemVideoEffectsMonitorProjection::V8FunctionNames::setStatusChangedCallback = "setStatusChangedCallback";
  const std::string SystemVideoEffectsMonitorProjection::V8FunctionNames::showSystemUI = "showSystemUI";

  CefRefPtr<CefV8Value> CreateSystemVideoEffectsStatusCefV8Value(SystemVideoEffectsStatus status) {
    CefRefPtr<CefV8Value> obj = CefV8Value::CreateObject(nullptr, nullptr);

    obj->SetValue(SystemVideoEffectsMonitorKeys::isPortraitEffectEnabled,
                  CefV8Value::CreateBool(status.isPortraitEffectEnabled),
                  V8_PROPERTY_ATTRIBUTE_NONE);

    obj->SetValue(SystemVideoEffectsMonitorKeys::isCenterStageEnabled,
                  CefV8Value::CreateBool(status.isCenterStageEnabled),
                  V8_PROPERTY_ATTRIBUTE_NONE);

    obj->SetValue(SystemVideoEffectsMonitorKeys::isStudioLightEnabled,
                  CefV8Value::CreateBool(status.isStudioLightEnabled),
                  V8_PROPERTY_ATTRIBUTE_NONE);

    obj->SetValue(SystemVideoEffectsMonitorKeys::isBackgroundReplacementEnabled,
                  CefV8Value::CreateBool(status.isBackgroundReplacementEnabled),
                  V8_PROPERTY_ATTRIBUTE_NONE);

    obj->SetValue(SystemVideoEffectsMonitorKeys::reactionEffectGesturesEnabled,
                  CefV8Value::CreateBool(status.reactionEffectGesturesEnabled),
                  V8_PROPERTY_ATTRIBUTE_NONE);

    return obj;
  }

  bool SystemVideoEffectsMonitorProjection::SystemVideoEffectsMonitorAccessor::Get(
                                                                                   const CefString& name,
                                                                                   const CefRefPtr<CefV8Value> object,
                                                                                   CefRefPtr<CefV8Value>& retval,
                                                                                   CefString& exception) {
    if (name == V8PropertyNames::status) {
      retval = CreateSystemVideoEffectsStatusCefV8Value(delegate_->GetStatus());
      return true;
    }

    return false;
  }

  bool SystemVideoEffectsMonitorProjection::SystemVideoEffectsMonitorAccessor::Set(
                                                                                   const CefString& name,
                                                                                   const CefRefPtr<CefV8Value> object,
                                                                                   const CefRefPtr<CefV8Value> value,
                                                                                   CefString& exception) {
    return false;
  }

  bool SystemVideoEffectsMonitorProjection::SystemVideoEffectsMonitorHandler::Execute(const CefString& name,
                                                                                      CefRefPtr<CefV8Value> object,
                                                                                      const CefV8ValueList& arguments,
                                                                                      CefRefPtr<CefV8Value>& retval,
                                                                                      CefString& exception) {
    if (name == V8FunctionNames::setStatusChangedCallback) {
      return delegate_->SetCallbackFunction(name, object, arguments, retval, exception);
    } else if (name == V8FunctionNames::showSystemUI) {
      delegate_->ShowSystemUI();
      return true;
    }

    return false;
  }
}

namespace mmhmm {
  CefRefPtr<CefV8Value> SystemVideoEffectsMonitorProjection::AttachToValueFromDictionary(CefRefPtr<CefV8Value> value,
                                                                                         CefRefPtr<CefDictionaryValue> dictionary,
                                                                                         CefRefPtr<CefV8Context> context) {
    if (dictionary->HasKey(SystemVideoEffectsMonitorKeys::dictionary) == false) {
      return nullptr;
    }

    if (auto this_dictionary = dictionary->GetDictionary(SystemVideoEffectsMonitorKeys::dictionary); this_dictionary != nullptr) {
      FromCefDictionary(this_dictionary);
    } else {
      DCHECK(false);
      LOG(ERROR) << "Dictionary representation is unexpectedly null.";
      return nullptr;
    }

    context->Enter();

    // Create a V8 object representing this class.
    auto this_object = CefV8Value::CreateObject(accessor_, nullptr);
    this_object->SetValue(V8PropertyNames::status, V8_PROPERTY_ATTRIBUTE_NONE);

    // Attach available functions to this object.
    AddFunctionToObject(this_object, V8FunctionNames::setStatusChangedCallback, handler_);
    AddFunctionToObject(this_object, V8FunctionNames::showSystemUI, handler_);

    // Attach this object to the passed in object.
    value->SetValue(v8_accessor_name, this_object, V8_PROPERTY_ATTRIBUTE_NONE);

    context->Exit();

    return this_object;
  }

  void SystemVideoEffectsMonitorProjection::UpdateStateInDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (dictionary->HasKey(SystemVideoEffectsMonitorKeys::dictionary) == false) {
      DCHECK(false);
      LOG(ERROR) << "Dictionary representation is unexpectedly null.";
      return;
    }

    auto this_dictionary = CefDictionaryValue::Create();
    this_dictionary->SetDictionary(SystemVideoEffectsMonitorKeys::status, ToCefDictionary(status_));
    dictionary->Remove(SystemVideoEffectsMonitorKeys::dictionary);
    dictionary->SetDictionary(SystemVideoEffectsMonitorKeys::dictionary, this_dictionary);
  }

  void SystemVideoEffectsMonitorProjection::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) {
      DCHECK(false);
      LOG(ERROR) << "Failed to update from empty dictionary representation.";
      return;
    }

    if (dictionary->HasKey(SystemVideoEffectsMonitorKeys::status) == false) {
      DCHECK(false);
      LOG(ERROR) << "Dictionary representation does not contain status key.";
      return;
    }

    auto statusDictionary = dictionary->GetDictionary(SystemVideoEffectsMonitorKeys::status);
    if (auto maybeStatus = SystemVideoEffectsStatusFromCefDictionary(statusDictionary); maybeStatus.has_value()) {
       status_ = maybeStatus.value();
     } else {
       DCHECK(false);
     }
  }

  bool SystemVideoEffectsMonitorProjection::HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                                                                 CefRefPtr<CefFrame> frame,
                                                                 CefProcessId source_process,
                                                                 CefRefPtr<CefProcessMessage> message) {
    if (message->GetName() == SystemVideoEffectsMonitorMessageNames::stateUpdate) {
      auto args = message->GetArgumentList();
      auto dictionary = args->GetDictionary(0);
      FromCefDictionary(dictionary);

      CefRefPtr<CefListValue> arguments = CefListValue::Create();
      arguments->SetDictionary(0, ToCefDictionary(GetStatus()));
      ExecuteCallbacksWithArgumentsForFunctionName(V8FunctionNames::setStatusChangedCallback, arguments);
      return true;
    } else {
      return false;
    }
  }
}
