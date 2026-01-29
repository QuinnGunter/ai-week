#include "event_proxy_browser.h"
#include "cef_value_utility.h"
#include "dictionary_utils.h"

#if defined(OS_MACOSX)
#include "LoggerTrampoline.h"
#include "Airtime-Swift-Wrapper.h"
#elif defined(OS_WIN)
#include "../browser/main_context.h"
#endif

namespace mmhmm {
  void EventProxy::EmitEvent(const std::string& eventName, CefRefPtr<CefDictionaryValue> payload) {
    auto message = CreateEmitEventMessage(eventName, payload);
    SendProcessMessageToRendererProcess(message);
  }

  void EventProxy::EmitEventInBrowser(const std::string& eventName, CefRefPtr<CefDictionaryValue> payload, int browserId) {
    auto message = CreateEmitEventMessage(eventName, payload);
    SendProcessMessageToBrowser(message, browserId);
  }

  void EventProxy::ReportStateUpdate() const {
    // No-op implementation - EventProxy is stateless
  }

  bool EventProxy::HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                                        CefRefPtr<CefFrame> frame,
                                        CefProcessId source_process,
                                        CefRefPtr<CefProcessMessage> message) {
    if (message->GetName() == EventProxyMessageNames::handleEvent) {
      HandleEventFromRenderer(message, browser->GetIdentifier());
      return true;
    }
    return false;
  }

  bool EventProxy::AddToDictionary(CefRefPtr<CefDictionaryValue> dictionary) const {
    return dictionary->SetDictionary(EventProxyKeys::dictionary, ToCefDictionary());
  }

  CefRefPtr<CefProcessMessage> EventProxy::CreateEmitEventMessage(const std::string& eventName,
                                                                  CefRefPtr<CefDictionaryValue> payload) const {
    auto message = CefProcessMessage::Create(EventProxyMessageNames::emitEvent);
    auto arguments = message->GetArgumentList();

    // Build event dictionary
    auto eventDictionary = CefDictionaryValue::Create();
    eventDictionary->SetString(EventProxyKeys::eventName, eventName);
    eventDictionary->SetDictionary(EventProxyKeys::eventPayload, payload);

    // Add to message arguments at index 0
    arguments->SetDictionary(0, eventDictionary);

    return message;
  }

  CefRefPtr<CefDictionaryValue> EventProxy::ToCefDictionary() const {
    // Return empty dictionary - EventProxy is stateless
    return CefDictionaryValue::Create();
  }

  void EventProxy::HandleEventFromRenderer(CefRefPtr<CefProcessMessage> message, int browserID) {
    auto arguments = message->GetArgumentList();

    // Validate argument count
    if (arguments->GetSize() != 1) {
      DCHECK(false);
#if defined(OS_MACOSX)
      std::stringstream msg;
      msg << "EventProxy: Unexpected argument count: " << arguments->GetSize();
      NativeLogger::LogMessage(msg.str(), LOGSEVERITY_ERROR, __PRETTY_FUNCTION__);
#endif
      return;
    }

    // Get event dictionary from arguments
    auto eventDictionary = arguments->GetDictionary(0);
    if (!eventDictionary) {
      DCHECK(false);
#if defined(OS_MACOSX)
      NativeLogger::LogMessage("EventProxy: Event dictionary is null", LOGSEVERITY_ERROR, __PRETTY_FUNCTION__);
#endif
      return;
    }

    auto eventPayload = ToJsonDictionary(
        eventDictionary->GetValue(EventProxyKeys::eventPayload));
#if defined (OS_MAC)

    Airtime::EventProxyBridge::handleEvent(eventPayload, browserID);
#else
    MainContext::Get()->GetApplicationContext()->HandleIncomingEvent(eventPayload, browserID);
#endif
  }
}
