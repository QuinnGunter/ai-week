//
// mmhmm Windows
// Copyright © 2020-2022 mmhmm, inc. All rights reserved.
//
#pragma once

#include "include/cef_v8.h"

namespace mmhmm
{
  class ScreenShareHandler : public CefV8Handler {
  public:
    ScreenShareHandler(){}

    virtual bool Execute(const CefString& name,
      CefRefPtr<CefV8Value> object,
      const CefV8ValueList& arguments,
      CefRefPtr<CefV8Value>& retval,
      CefString& exception) override;

    std::map<int, std::tuple<CefRefPtr<CefV8Context>, CefRefPtr<CefV8Value>, CefRefPtr<CefV8Value>>> callbackFunctions_;

  private:
    IMPLEMENT_REFCOUNTING(ScreenShareHandler);
    int counter_ = 0;
  };
}

