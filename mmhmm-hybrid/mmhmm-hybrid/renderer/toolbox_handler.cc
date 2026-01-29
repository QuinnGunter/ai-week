//
//  toolbox_handler.cc
//  mmhmm
//
//  Created by Robert Jamieson on 04/10/2025.
//

#include "toolbox_handler.h"

#include "../common/v8_utility.h"
#include "../messages/toolbox/ChangeAppMode.h"


namespace mmhmm {
using namespace Messages;
const std::string ToolboxHandler::ChangeAppModeFunctionName = "changeAppMode";

bool ToolboxHandler::Execute(const CefString& name,
                             CefRefPtr<CefV8Value> object,
                             const CefV8ValueList& arguments,
                             CefRefPtr<CefV8Value>& retval,
                             CefString& exception) {
  if (name == ChangeAppModeFunctionName) {
    std::string error_message;
    auto changeAppModeMessage = ChangeAppMode::Make(arguments, error_message);
    if (changeAppModeMessage.has_value()) {
      SendProcessMessageToCurrentV8ContextBrowser(
          changeAppModeMessage.value()->ToProcessMessage());
    } else {
      exception = error_message;
    }
    return true;
  }
 
  return false;
}
}  // namespace mmhmm
