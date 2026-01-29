#include "event_proxy_renderer.h"
#include "cef_value_utility.h"
#include "v8_utility.h"

namespace mmhmm {
  const std::string EventProxyProjection::v8_accessor_name = "eventProxy";
  const std::string EventProxyProjection::V8FunctionNames::handleEvent = "handleEvent";
  const std::string EventProxyProjection::V8FunctionNames::setEventEmitterCallback = "setEventEmitterCallback";

  bool EventProxyProjection::HandleEvent(const CefString& name,
                                         CefRefPtr<CefV8Value> object,
                                         const CefV8ValueList& arguments,
                                         CefRefPtr<CefV8Value>& retval,
                                         CefString& exception) {
    if (name != V8FunctionNames::handleEvent) {
      return false;
    }

    // Validate arguments
    if (arguments.size() != 1) {
      exception = "Incorrect argument count. Pass an object of the form { \"name\": \"foo\", \"payload\": { ... } }.";
      return true;
    }

    CefRefPtr<CefV8Value> eventV8 = arguments[0];
    if (!eventV8->IsObject() || eventV8->IsNull()) {
      exception = "Invalid argument. Payload must be an object of the form { \"name\": \"foo\", \"payload\": { ... } }.";
      return true;
    }

    // Create process message
    auto message = CefProcessMessage::Create(EventProxyMessageNames::handleEvent);
    auto arguments_list = message->GetArgumentList();

    // Build event dictionary
    auto eventDictionary = CefDictionaryValue::Create();

    // Convert payload to CEF value
    auto payloadCef = ToCefValue(eventV8);
    if (payloadCef && payloadCef->GetType() == VTYPE_DICTIONARY) {
      eventDictionary->SetDictionary(EventProxyKeys::eventPayload, payloadCef->GetDictionary());
    } else {
      DCHECK(false);
      eventDictionary->SetDictionary(EventProxyKeys::eventPayload, CefDictionaryValue::Create());
    }

    // Add to message arguments at index 0
    arguments_list->SetDictionary(0, eventDictionary);

    // Send to browser process
    SendProcessMessageToBrowserProcess(message);

    return true;
  }

  bool EventProxyProjection::SetEventEmitterCallback(const CefRefPtr<CefV8Value> object,
                                                     const CefRefPtr<CefV8Value> value,
                                                     CefString& exception) {
    CefV8ValueList arguments;
    arguments.push_back(value);
    CefRefPtr<CefV8Value> retval;

    return SetCallbackFunction(V8FunctionNames::setEventEmitterCallback,
                               object,
                               arguments,
                               retval,
                               exception);
  }

  bool EventProxyProjection::HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                                                  CefRefPtr<CefFrame> frame,
                                                  CefProcessId source_process,
                                                  CefRefPtr<CefProcessMessage> message) {
    if (message->GetName() == EventProxyMessageNames::emitEvent) {
      HandleEmitEventMessage(message);
      return true;
    }
    return false;
  }

  CefRefPtr<CefV8Value> EventProxyProjection::AttachToValueFromDictionary(CefRefPtr<CefV8Value> value,
                                                                          CefRefPtr<CefDictionaryValue> dictionary,
                                                                          CefRefPtr<CefV8Context> context) {
    // Check for dictionary key (should exist but be empty for stateless EventProxy)
    if (dictionary->HasKey(EventProxyKeys::dictionary) == false) {
      DCHECK(false);
      LOG(ERROR) << "EventProxy dictionary representation not found.";
      return nullptr;
    }

    // Extract and process dictionary (no-op for stateless)
    if (auto this_dictionary = dictionary->GetDictionary(EventProxyKeys::dictionary); this_dictionary != nullptr) {
      FromCefDictionary(this_dictionary);
    } else {
      DCHECK(false);
      LOG(ERROR) << "EventProxy dictionary representation is unexpectedly null.";
      return nullptr;
    }

    context->Enter();

    // Create a V8 object representing EventProxy
    auto this_object = CefV8Value::CreateObject(accessor_, nullptr);

    // Attach functions to the object
    AddFunctionToObject(this_object, V8FunctionNames::handleEvent, handler_);
    AddFunctionToObject(this_object, V8FunctionNames::setEventEmitterCallback, handler_);

    // Attach this object to the passed in parent object
    value->SetValue(v8_accessor_name, this_object, V8_PROPERTY_ATTRIBUTE_NONE);

    context->Exit();

    return this_object;
  }

  void EventProxyProjection::UpdateStateInDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    // No-op: EventProxy is stateless
  }

  void EventProxyProjection::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    // No-op: EventProxy is stateless
  }

  void EventProxyProjection::HandleEmitEventMessage(CefRefPtr<CefProcessMessage> message) {
    auto arguments = message->GetArgumentList();

    // Validate argument count
    if (arguments->GetSize() != 1) {
      DCHECK(false);
      LOG(ERROR) << "EventProxy: Unexpected argument count: " << arguments->GetSize();
      return;
    }

    // Get event dictionary from arguments
    auto eventDictionary = arguments->GetDictionary(0);
    if (!eventDictionary) {
      DCHECK(false);
      LOG(ERROR) << "EventProxy: Event dictionary is null";
      return;
    }

    auto callbackArguments = CefListValue::Create();
    callbackArguments->SetDictionary(0, eventDictionary);

    ExecuteCallbacksWithArgumentsForFunctionName(V8FunctionNames::setEventEmitterCallback,
                                                 callbackArguments);
  }

  bool EventProxyProjection::EventProxyHandler::Execute(const CefString& name,
                                                        CefRefPtr<CefV8Value> object,
                                                        const CefV8ValueList& arguments,
                                                        CefRefPtr<CefV8Value>& retval,
                                                        CefString& exception) {
    if (name == V8FunctionNames::handleEvent) {
      return delegate_->HandleEvent(name, object, arguments, retval, exception);
    }

    if (name == V8FunctionNames::setEventEmitterCallback) {
      // For setEventEmitterCallback, we expect one argument (the callback function)
      if (arguments.size() < 1) {
        exception = "Missing argument. Pass a callback function or null.";
        return true;
      }
      return delegate_->SetEventEmitterCallback(object, arguments[0], exception);
    }

    return false;
  }

  bool EventProxyProjection::EventProxyAccessor::Get(const CefString& name,
                                                     const CefRefPtr<CefV8Value> object,
                                                     CefRefPtr<CefV8Value>& retval,
                                                     CefString& exception) {
    // No properties to get - EventProxy only has functions
    return false;
  }

  bool EventProxyProjection::EventProxyAccessor::Set(const CefString& name,
                                                     const CefRefPtr<CefV8Value> object,
                                                     const CefRefPtr<CefV8Value> value,
                                                     CefString& exception) {
    // No properties to set - EventProxy only has functions
    return false;
  }
}
