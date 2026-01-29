//
//  toolbox_handler.h
//  mmhmm
//
//  Created by Robert Jamieson on 04/10/2025.
//

#pragma once

#include "include/cef_v8.h"

namespace mmhmm {
class ToolboxHandler : public CefV8Handler {
 public:
  static const std::string ChangeAppModeFunctionName;
  ToolboxHandler() {}

  virtual bool Execute(const CefString& name,
                       CefRefPtr<CefV8Value> object,
                       const CefV8ValueList& arguments,
                       CefRefPtr<CefV8Value>& retval,
                       CefString& exception) override;

 private:
  IMPLEMENT_REFCOUNTING(ToolboxHandler);
};
}  // namespace mmhmm
