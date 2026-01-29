//
//  floating_nav_handler.cc
//  mmhmm
//
//  Floating Camera Nav handler for CEF V8 bindings
//

#include "floating_nav_handler.h"

#include "../common/v8_utility.h"

namespace mmhmm {

const std::string FloatingNavHandler::LaunchFloatingNavFunctionName = "launchFloatingNav";
const std::string FloatingNavHandler::FloatingNavReadyFunctionName = "floatingNavReady";
const std::string FloatingNavHandler::LaunchScreenRecorderFunctionName = "launchScreenRecorder";

bool FloatingNavHandler::Execute(const CefString& name,
                                  CefRefPtr<CefV8Value> object,
                                  const CefV8ValueList& arguments,
                                  CefRefPtr<CefV8Value>& retval,
                                  CefString& exception) {
  if (name == LaunchFloatingNavFunctionName) {
    // Send message to browser process to launch floating nav window
    auto message = CefProcessMessage::Create("launchFloatingNav");
    SendProcessMessageToCurrentV8ContextBrowser(message);
    return true;
  }

  if (name == FloatingNavReadyFunctionName) {
    // Notify browser process that floating nav is ready
    auto message = CefProcessMessage::Create("floatingNavReady");
    SendProcessMessageToCurrentV8ContextBrowser(message);
    return true;
  }

  if (name == LaunchScreenRecorderFunctionName) {
    // Send message to browser process to launch screen recorder
    auto message = CefProcessMessage::Create("launchScreenRecorder");
    SendProcessMessageToCurrentV8ContextBrowser(message);
    return true;
  }

  return false;
}

}  // namespace mmhmm
