//
//  segmentation_panel_handler.cc
//  mmhmm
//
//  Created by Jakub Gluszkiewicz on 27/02/2025.
//

#include "segmentation_panel_handler.h"

namespace mmhmm {
bool SegmentationPanelHandler::Execute(const CefString& name,
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
  
  if (name == "segmentationPanelCreated") {
    message = CefProcessMessage::Create("segmentationPanelCreated");
    auto args = message->GetArgumentList();
    auto browser_id = browser->GetIdentifier();
    args->SetInt(0, browser_id);
  } else if (name == "segmentationPanelDataChanged") {
    auto config_json = arguments[0].get()->GetStringValue();
    message = CefProcessMessage::Create("segmentationPanelDataChanged");
    auto args = message->GetArgumentList();
    args->SetString(0, config_json);
  }
  
  browser->GetMainFrame()->SendProcessMessage(PID_BROWSER, message);
  
  return false;
}
}
