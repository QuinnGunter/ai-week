//
// mmhmm Windows
// Copyright © 2020-2023 mmhmm, inc. All rights reserved.
//
#pragma once

#include "include/cef_v8.h"

namespace mmhmm
{
  class MiniRemoteHandler : public CefV8Handler {
  public:
    MiniRemoteHandler(){}

    virtual bool Execute(const CefString& name,
      CefRefPtr<CefV8Value> object,
      const CefV8ValueList& arguments,
      CefRefPtr<CefV8Value>& retval,
      CefString& exception) override;

  private:
    IMPLEMENT_REFCOUNTING(MiniRemoteHandler);
  };
}

