#pragma once

#include <map>
#include <string>
#include "include/cef_base.h"
#include "include/cef_values.h"
#include "nlohmann/json.hpp"
#include "shared_mini_remote_manager.h"

namespace client {
    class RootWindow;
}

class CefBrowser;

class SharedMiniRemoteManagerImpl : public SharedMiniRemoteManager {
 public:
   SharedMiniRemoteManagerImpl();
  ~SharedMiniRemoteManagerImpl();

  void Initialize();
  bool ExecuteJavascriptOnWebApp(const std::string javascript);
  bool OnPropertyChange(CefString& action, CefRefPtr<CefValue> value);
  void OnNativeCallbackRequest(CefString& context, CefString& jsonValues);
  bool ExecuteJavascriptOnMiniRemote(const std::string javascript);
  void OnOpen(int browser_id);
  void OnClose();

  bool UpdateState(CefString& action,
                   CefRefPtr<CefValue> value,
                   nlohmann::json& json_obj);

  void GetSpeakerNotes(const std::string& slide_id);
  void SetSpeakerNotes(const std::string& slide_id, const std::string& notes);
  void SetMinimumMiniRemoteSize(int width, int height);
  void AdjustHeight(int height);
  bool IsOpen() const;
  void SetState(int font_size, bool notes_expanded);
  void OnSaveState(int font_size, bool notes_expanded);
  void OnShowMiniRemote();
  void OnHideMiniRemote();

  private:
  std::string CreatePropertyUpdateScript(const std::string& properties_to_update);
  scoped_refptr<client::RootWindow> GetMiniRemoteWindow();
  CefRefPtr<CefBrowser> GetWebAppBrowser();
  CefRefPtr<CefBrowser> GetMiniRemoteBrowser();

 private:
  bool is_open_ = false;
  int mini_remote_browser_id_ = -1;
  nlohmann::json state_;
};
