#include "mini_remote_handler.h"

namespace mmhmm
{
  bool MiniRemoteHandler::Execute(const CefString& name,
    CefRefPtr<CefV8Value> object,
    const CefV8ValueList& arguments,
    CefRefPtr<CefV8Value>& retval,
    CefString& exception) {

    auto context = CefV8Context::GetCurrentContext();
    if (!context) {
      return false;
    }

    auto browser = CefV8Context::GetCurrentContext()->GetBrowser();
    if (!browser) {
      return false;
    }

    CefRefPtr<CefProcessMessage> message;

    if (name == "sendMmhmmControlMessage") {

      auto json_message = arguments[0].get()->GetStringValue();
      message = CefProcessMessage::Create("sendMmhmmControlMessage");
      auto args = message->GetArgumentList();
      args->SetString(0, json_message);

    }
    else if (name == "miniRemoteOpen") {

      message = CefProcessMessage::Create("miniRemoteOpen");
      auto args = message->GetArgumentList();
      // Grab the browser id so we can route messages from the main app to the mini remote
      // Although there is one browser process, each renderer has a browser instance it is tied to.
      auto browser_id = browser->GetIdentifier();
      args->SetInt(0, browser_id);
    }
    else if (name == "miniRemoteClosed") {

      message = CefProcessMessage::Create("miniRemoteClosed");
      auto args = message->GetArgumentList();
    }
    else if (name == "miniRemoteSaveState") {

      message = CefProcessMessage::Create("miniRemoteSaveState");
      auto args = message->GetArgumentList();
      auto font_size = arguments[0].get()->GetDoubleValue();
      args->SetInt(0, font_size);
      auto notes_expanded = arguments[1].get()->GetBoolValue();
      args->SetBool(1, notes_expanded);
    }
    else if (name == "getSpeakerNotes") {

      message = CefProcessMessage::Create("getSpeakerNotes");
      auto args = message->GetArgumentList();
      args->SetString(0, arguments[0]->GetStringValue());
    }
    else if (name == "setSpeakerNotes") {

      message = CefProcessMessage::Create("setSpeakerNotes");
      auto args = message->GetArgumentList();
      args->SetString(0, arguments[0]->GetStringValue());
      args->SetString(1, arguments[1]->GetStringValue());
    }
    else if (name == "setMinimumMiniRemoteSize") {

      message = CefProcessMessage::Create("setMinimumMiniRemoteSize");
      auto args = message->GetArgumentList();
      args->SetInt(0, arguments[0]->GetIntValue());
      args->SetInt(1, arguments[1]->GetIntValue());
    }
    else if (name == "adjustHeight") {
      
      message = CefProcessMessage::Create("adjustHeight");
      auto args = message->GetArgumentList();
      args->SetInt(0, arguments[0]->GetIntValue());
    }
    else if (name == "notifyToggleBroadcastMode") {
      message = CefProcessMessage::Create("toggleBroadcastMode");
    }

    if (message) {
      browser->GetMainFrame()->SendProcessMessage(PID_BROWSER, message);
      return true;
    }
    else {
      return false;
    }
  }
}

