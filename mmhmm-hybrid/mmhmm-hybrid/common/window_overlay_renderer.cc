#include "window_overlay_renderer.h"
#include "cef_value_utility.h"

namespace mmhmm {
  const std::string WindowOverlayProjection::v8_accessor_name = "windowOverlay";
  const std::string WindowOverlayProjection::V8FunctionNames::drawCursors = "drawCursors";

  bool WindowOverlayProjection::DrawCursors(const CefString& name,
                                            CefRefPtr<CefV8Value> object,
                                            const CefV8ValueList& arguments,
                                            CefRefPtr<CefV8Value>& retval,
                                            CefString& exception) {
    if (name != V8FunctionNames::drawCursors) { return false; }

    if (arguments.size() < 3) {
      exception = "Missing arguments. Pass target ID, cursors object and target string.";
      return true;
    }

    CefRefPtr<CefV8Value> targetID = arguments[0];
    CefRefPtr<CefV8Value> cursors = arguments[1];
    CefRefPtr<CefV8Value> target = arguments[2];

    if (targetID->IsInt() == false) {
      exception = "Invalid argument. Target ID must be an integer.";
      return true;
    } else if (cursors->IsObject() == false) {
      exception = "Invalid argument. Cursors must be an object with layout [{ id: <string>, name: <string>, color: <hex string>, opacity: <number>, x: <number>, y: <number> }, ...].";
      return true;
    } else if (target->IsString() == false) {
      exception = "Invalid argument. Target must be one of ['window', 'screen'].";
      return true;
    }

    auto message = CefProcessMessage::Create(WindowOverlayMessageNames::drawCursors);
    message->GetArgumentList()->SetValue(0, ToIntCefValue(targetID));
    message->GetArgumentList()->SetValue(1, ToCefValue(cursors));
    message->GetArgumentList()->SetValue(2, ToCefValue(target));
    SendProcessMessageToBrowserProcess(message);

    return true;
  }

  bool WindowOverlayProjection::SetDebugIsEnabled(const CefRefPtr<CefV8Value> object,
                                                  const CefRefPtr<CefV8Value> value,
                                                  CefString& exception) {
    if (value->IsBool() == false) {
      exception = "Invalid argument, requires bool.";
      return true;
    }

    auto message = CefProcessMessage::Create(WindowOverlayMessageNames::setDebugIsEnabled);
    message->GetArgumentList()->SetValue(0, ToCefValue(value));
    SendProcessMessageToBrowserProcess(message);

    debugIsEnabled_ = value->GetBoolValue();

    return true;
  }

  bool WindowOverlayProjection::HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                                                     CefRefPtr<CefFrame> frame,
                                                     CefProcessId source_process,
                                                     CefRefPtr<CefProcessMessage> message) {
    return false;
  }

  CefRefPtr<CefV8Value> WindowOverlayProjection::AttachToValueFromDictionary(CefRefPtr<CefV8Value> value,
                                                                             CefRefPtr<CefDictionaryValue> dictionary,
                                                                             CefRefPtr<CefV8Context> context) {
    if (dictionary->HasKey(WindowOverlayKeys::dictionary) == false) {
      DCHECK(false);
      LOG(ERROR) << "Dictionary representation not found.";
      return nullptr;
    }

    if (auto this_dictionary = dictionary->GetDictionary(WindowOverlayKeys::dictionary); this_dictionary != nullptr) {
      FromCefDictionary(this_dictionary);
    } else {
      DCHECK(false);
      LOG(ERROR) << "Dictionary representation is unexpectedly null.";
      return nullptr;
    }

    context->Enter();

    // Create a V8 object representing this class.
    auto this_object = CefV8Value::CreateObject(accessor_, nullptr);
    this_object->SetValue(V8PropertyNames::debugIsEnabled, V8_PROPERTY_ATTRIBUTE_NONE);

    // Attach available functions to this object.
    AddFunctionToObject(this_object, V8FunctionNames::drawCursors, handler_);

    // Attach this object to the passed in object.
    value->SetValue(v8_accessor_name, this_object, V8_PROPERTY_ATTRIBUTE_NONE);

    context->Exit();

    return this_object;
  }

  void WindowOverlayProjection::UpdateStateInDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
  }

  void WindowOverlayProjection::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    // This hybrid object does not have state to update.
  }

  bool WindowOverlayProjection::WindowOverlayHandler::Execute(const CefString& name,
                                                              CefRefPtr<CefV8Value> object,
                                                              const CefV8ValueList& arguments,
                                                              CefRefPtr<CefV8Value>& retval,
                                                              CefString& exception)  {
    if (delegate_->DrawCursors(name, object, arguments, retval, exception)) {
      return true;
    }
    return false;
  }

  const std::string WindowOverlayProjection::V8PropertyNames::debugIsEnabled = "debugIsEnabled";

  bool WindowOverlayProjection::WindowOverlayAccessor::Get(
      const CefString& name,
      const CefRefPtr<CefV8Value> object,
      CefRefPtr<CefV8Value>& retval,
      CefString& exception) {
    if (name == V8PropertyNames::debugIsEnabled) {
      retval = CefV8Value::CreateBool(delegate_->debugIsEnabled_);
      return true;
    }

    return false;
  }

  bool WindowOverlayProjection::WindowOverlayAccessor::Set(
      const CefString& name,
      const CefRefPtr<CefV8Value> object,
      const CefRefPtr<CefV8Value> value,
      CefString& exception) {
    if (name == V8PropertyNames::debugIsEnabled) {
      return delegate_->SetDebugIsEnabled(object, value, exception);
    }

    return false;
  }
}
