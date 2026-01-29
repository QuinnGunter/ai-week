#include "stream_deck_handler.h"

namespace mmhmm {
bool StreamDeckHandler::Execute(const CefString& name,
                                CefRefPtr<CefV8Value> object,
                                const CefV8ValueList& arguments,
                                CefRefPtr<CefV8Value>& retval,
                                CefString& exception) {
  if (name == "streamDeckPromptAskChanged") {
    auto context = CefV8Context::GetCurrentContext();
    if (!context) {
      return false;
    }

    auto browser = CefV8Context::GetCurrentContext()->GetBrowser();
    if (!browser) {
      return false;
    }

    CefRefPtr<CefProcessMessage> message;
    auto ask_again = arguments[0].get()->GetBoolValue();
    message = CefProcessMessage::Create("streamDeckPromptAskChanged");
    auto args = message->GetArgumentList();
    args->SetBool(0, ask_again);
    browser->GetMainFrame()->SendProcessMessage(PID_BROWSER, message);
  }
  return false;
}
}  // namespace mmhmm
