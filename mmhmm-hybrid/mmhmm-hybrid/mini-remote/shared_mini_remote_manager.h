#pragma once

#include <string>
#include "include/cef_base.h"
#include "include/cef_values.h"

namespace client {
  class RootWindow;
}

class CefBrowser;

class SharedMiniRemoteManager {
public:
  virtual void Initialize() = 0;
  virtual bool ExecuteJavascriptOnWebApp(const std::string javascript)  = 0;
  virtual bool OnPropertyChange(CefString& action, CefRefPtr<CefValue> value) = 0;
  virtual void OnNativeCallbackRequest(CefString& context, CefString& jsonValues) = 0;
  virtual bool ExecuteJavascriptOnMiniRemote(const std::string javascript) = 0;
  virtual void OnOpen(int browser_id) = 0;
  virtual void OnClose() = 0;
  virtual void GetSpeakerNotes(const std::string& slide_id) = 0;
  virtual void SetSpeakerNotes(const std::string& slide_id, const std::string& notes) = 0;
  virtual void SetMinimumMiniRemoteSize(int width, int height) = 0;
  virtual void AdjustHeight(int height) = 0;
  virtual bool IsOpen() const = 0;
  virtual void SetState(int font_size, bool notes_expanded) = 0;
  virtual void OnSaveState(int font_size, bool notes_expanded) = 0;
  virtual void OnShowMiniRemote() = 0;
  virtual void OnHideMiniRemote() = 0;
};

