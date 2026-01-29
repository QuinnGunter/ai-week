#include "screen_share_handler.h"
#include "common/v8_utility.h"

namespace mmhmm
{
   bool ScreenShareHandler::Execute(const CefString& name,
    CefRefPtr<CefV8Value> object,
    const CefV8ValueList& arguments,
    CefRefPtr<CefV8Value>& retval,
    CefString& exception) {
    if (name == "getScreenshareMedia") {

      bool listScreens = arguments[0].get()->GetBoolValue();
      bool listWindows = arguments[1].get()->GetBoolValue();

      CefRefPtr<CefV8Value> callbackSuccess = arguments[2];
      CefRefPtr<CefV8Value> callbackFailure = arguments[3];

      callbackFunctions_.emplace(++counter_, std::tuple<CefRefPtr<CefV8Context>, CefRefPtr<CefV8Value>, CefRefPtr<CefV8Value>>(CefV8Context::GetCurrentContext(), callbackSuccess, callbackFailure));

      bool activateSelectedTarget = GetBoolArgumentAtIndexOr(arguments, 4, false);
      bool presentPickerV2 = GetBoolArgumentAtIndexOr(arguments, 5, false);

      CefRefPtr<CefProcessMessage> msg = CefProcessMessage::Create("getScreenshareMedia");
      CefRefPtr<CefListValue> args = msg->GetArgumentList();
      args->SetInt(0, counter_);
      args->SetBool(1, listScreens);
      args->SetBool(2, listWindows);
      args->SetBool(3, activateSelectedTarget);
      args->SetBool(4, presentPickerV2);
      CefRefPtr<CefBrowser> browser = CefV8Context::GetCurrentContext()->GetBrowser();
      browser->GetMainFrame()->SendProcessMessage(PID_BROWSER, msg);

      return true;
    }
    else if (name == "enumerateScreenshareMedia")
    {
      bool listScreens = arguments[0].get()->GetBoolValue();
      bool listWindows = arguments[1].get()->GetBoolValue();

      CefRefPtr<CefV8Value> callbackSuccess = arguments[2];
      CefRefPtr<CefV8Value> callbackFailure = arguments[3];

      callbackFunctions_.emplace(++counter_, std::tuple<CefRefPtr<CefV8Context>, CefRefPtr<CefV8Value>, CefRefPtr<CefV8Value>>(CefV8Context::GetCurrentContext(), callbackSuccess, callbackFailure));

      CefRefPtr<CefProcessMessage> msg = CefProcessMessage::Create("enumerateScreenshareMedia");
      CefRefPtr<CefListValue> args = msg->GetArgumentList();
      args->SetInt(0, counter_);
      args->SetBool(1, listScreens);
      args->SetBool(2, listWindows);
      CefRefPtr<CefBrowser> browser = CefV8Context::GetCurrentContext()->GetBrowser();
      browser->GetMainFrame()->SendProcessMessage(PID_BROWSER, msg);

      return true;
    }
    else if (name == "screenshareMediaSelected")
    {
      auto messageId = arguments[0].get()->GetIntValue();
      auto id = arguments[1].get()->GetStringValue();
      auto title = arguments[2].get()->GetStringValue();
      auto processName = arguments[3].get()->GetStringValue();


      CefRefPtr<CefProcessMessage> msg = CefProcessMessage::Create("screenshareMediaSelected");
      CefRefPtr<CefListValue> args = msg->GetArgumentList();
      args->SetInt(0, messageId);
      args->SetString(1, id);
      args->SetString(2, title);
      args->SetString(3, processName);
      CefRefPtr<CefBrowser> browser = CefV8Context::GetCurrentContext()->GetBrowser();
      browser->GetMainFrame()->SendProcessMessage(PID_BROWSER, msg);

      return true;
    }

    // Function does not exist.
    return false;
  }
}

