//
//  floating_nav_handler.h
//  mmhmm
//
//  Floating Camera Nav handler for CEF V8 bindings
//

#pragma once

#include "include/cef_v8.h"

namespace mmhmm {

class FloatingNavHandler : public CefV8Handler {
 public:
  static const std::string LaunchFloatingNavFunctionName;
  static const std::string FloatingNavReadyFunctionName;
  static const std::string LaunchScreenRecorderFunctionName;

  FloatingNavHandler() {}

  virtual bool Execute(const CefString& name,
                       CefRefPtr<CefV8Value> object,
                       const CefV8ValueList& arguments,
                       CefRefPtr<CefV8Value>& retval,
                       CefString& exception) override;

 private:
  IMPLEMENT_REFCOUNTING(FloatingNavHandler);
};

}  // namespace mmhmm
