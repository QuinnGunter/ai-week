//
// mmhmm Windows
// Copyright � 2020-2024 mmhmm, inc. All rights reserved.
//
#pragma once

#include "include/cef_v8.h"

namespace mmhmm {
class StreamDeckHandler : public CefV8Handler {
 public:
  StreamDeckHandler() {}

  virtual bool Execute(const CefString& name,
                       CefRefPtr<CefV8Value> object,
                       const CefV8ValueList& arguments,
                       CefRefPtr<CefV8Value>& retval,
                       CefString& exception) override;

 private:
  IMPLEMENT_REFCOUNTING(StreamDeckHandler);
};
}  // namespace mmhmm

