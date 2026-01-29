//
//  segmentation_panel_handler.h
//  mmhmm
//
//  Created by Jakub Gluszkiewicz on 27/02/2025.
//

#pragma once

#include "include/cef_v8.h"

namespace mmhmm {
class SegmentationPanelHandler : public CefV8Handler {
 public:
  SegmentationPanelHandler() {}

  virtual bool Execute(const CefString& name,
                       CefRefPtr<CefV8Value> object,
                       const CefV8ValueList& arguments,
                       CefRefPtr<CefV8Value>& retval,
                       CefString& exception) override;

 private:
  IMPLEMENT_REFCOUNTING(SegmentationPanelHandler);
};
}
