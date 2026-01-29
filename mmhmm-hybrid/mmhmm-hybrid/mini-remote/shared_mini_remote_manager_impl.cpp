#include "shared_mini_remote_manager_impl.h"
#include "../browser/main_context.h"
#include "../SdMessageSink.h"
#include "../browser/client_prefs.h"
#include "../browser/main_context.h"
#include "../common/urls.h"

SharedMiniRemoteManagerImpl::SharedMiniRemoteManagerImpl() {
}

SharedMiniRemoteManagerImpl::~SharedMiniRemoteManagerImpl() {

}

void SharedMiniRemoteManagerImpl::OnOpen(int browser_id) {
  is_open_ = true;
  mini_remote_browser_id_ = browser_id;
  int font_size = 0;
  bool notes_expanded;


  if (client::prefs::LoadMiniRemoteState(font_size, notes_expanded)) {
    SetState(font_size, notes_expanded);
  }

  Initialize();

  // set initial state
  ExecuteJavascriptOnMiniRemote(CreatePropertyUpdateScript(state_.dump()));
}

void SharedMiniRemoteManagerImpl::Initialize() {

  ExecuteJavascriptOnWebApp(
    "HybridBridge.enableSlideThumbnailNotifications(true);"
    "HybridBridge.remote_visible = true;");

}

void SharedMiniRemoteManagerImpl::SetState(int font_size, bool notes_expanded) {
    if (font_size > 0) {
        std::stringstream javascript;
        javascript << "setState(";
        javascript << font_size;
        javascript << ",";
        javascript << notes_expanded;
        javascript << "); ";


        ExecuteJavascriptOnMiniRemote(javascript.str());
    }
}

std::string SharedMiniRemoteManagerImpl::CreatePropertyUpdateScript(const std::string& properties_to_update) {
    std::ostringstream javascript;
    javascript << "updateProperty('";
    javascript << properties_to_update;
    javascript << "');";
    return javascript.str();
}


CefRefPtr<CefBrowser> SharedMiniRemoteManagerImpl::GetWebAppBrowser() {

  auto* context = client::MainContext::Get();

  if (not context)
    return nullptr;

  auto* window_manager =
      client::MainContext::Get()->GetRootWindowManager();

  if (not window_manager)
    return nullptr;

  auto web_app_window =
      client::MainContext::Get()->GetRootWindowManager()->GetRootWindow();

  if (not web_app_window)
      return nullptr;

  return web_app_window->GetBrowser();
  
}

CefRefPtr<CefBrowser> SharedMiniRemoteManagerImpl::GetMiniRemoteBrowser() {

  if (not is_open_ || (mini_remote_browser_id_ < 0))
    return nullptr;

  auto mini_remote_window = GetMiniRemoteWindow();
  if (not mini_remote_window)
      return nullptr;

  return mini_remote_window->GetBrowser();
}

void SharedMiniRemoteManagerImpl::OnClose() {
  is_open_ = false;
  mini_remote_browser_id_ = -1;
}

void SharedMiniRemoteManagerImpl::OnSaveState(int font_size, bool notes_expanded) {
    client::prefs::SaveMiniRemoteState(font_size, notes_expanded);
}

bool SharedMiniRemoteManagerImpl::ExecuteJavascriptOnWebApp(
    const std::string javascript) {

  auto web_app = GetWebAppBrowser();

  if (web_app != nullptr) {
    const auto initial_message = CefProcessMessage::Create(SD_CEF_MESSAGE_NAME);
    const auto args = initial_message->GetArgumentList();
    args->SetString(0, javascript);

    web_app->GetMainFrame()->SendProcessMessage(PID_RENDERER, initial_message);
    return true;
  }

  return false;
}

bool SharedMiniRemoteManagerImpl::OnPropertyChange(CefString& action,
                                         CefRefPtr<CefValue> value) {
  nlohmann::json property_change_json;
  if (UpdateState(action, value, property_change_json)) {
      //merge with current state
    state_.update(property_change_json);

    return ExecuteJavascriptOnMiniRemote(CreatePropertyUpdateScript(state_.dump()));
  }

  return false;
}

bool SharedMiniRemoteManagerImpl::ExecuteJavascriptOnMiniRemote(std::string javascript) {

  auto mini_remote = GetMiniRemoteBrowser();

  if (mini_remote != nullptr) {
    auto property_update_message =
        CefProcessMessage::Create("mini_remote_property_update");
    const auto args = property_update_message->GetArgumentList();
    args->SetString(0, javascript);

    mini_remote->GetMainFrame()->SendProcessMessage(PID_RENDERER,
                                                    property_update_message);
    return true;
  }

  return false;
}

bool SharedMiniRemoteManagerImpl::UpdateState(CefString& action,
    CefRefPtr<CefValue> value,
    nlohmann::json& json_obj) {

  std::string property_name = action.ToString();

  if (property_name.empty())
    return false;

  switch (value->GetType()) {
    case VTYPE_INVALID:
#if DEBUG
      sdLog() << "Invalid data type for key: " << action;
#endif
      return false;
    case VTYPE_BOOL:
      json_obj[property_name] = value->GetBool();
      break;
    case VTYPE_STRING: {
      json_obj[property_name] = value->GetString().ToString();
    } break;
    case VTYPE_DOUBLE: {
      json_obj[property_name] = value->GetDouble();
    } break;
    case VTYPE_INT: {
      json_obj[property_name] = value->GetInt();
    } break;
    case VTYPE_DICTIONARY:
    case VTYPE_BINARY:
    case VTYPE_LIST:
    case VTYPE_NULL:
    default:
#if DEBUG
      sdLog() << "Unhandled data type for key: " << action << " Type: " << value->GetType();
#endif
      return false;
  }

  return true;
}

void SharedMiniRemoteManagerImpl::GetSpeakerNotes(const std::string& slide_id) {

    std::ostringstream javascript;
    javascript << "async function mmhmm_runNative() { function execute() { "
        "return HybridBridge.getSpeakerNotes(\"";
    javascript << slide_id;
    javascript << "\") } ";
    javascript << "var returnValue = await execute();window.mmhmm_nativeCallback(";
    javascript << "\"";
    javascript << "getSpeakerNotes";
    javascript << "\", JSON.stringify(returnValue)); } mmhmm_runNative();";

    ExecuteJavascriptOnWebApp(javascript.str());
}

void SharedMiniRemoteManagerImpl::SetSpeakerNotes(const std::string& slide_id, const std::string& notes) {

    std::ostringstream javascript;
    javascript << "async function mmhmm_runNative() { function execute() { "
        "return HybridBridge.setSpeakerNotes(\"";
    javascript << slide_id;
    javascript << "\" , ";
    javascript << notes;
    javascript << ") } ";
    javascript << "var returnValue = await execute();window.mmhmm_nativeCallback(";
    javascript << "\"";
    javascript << "setSpeakerNotes";
    javascript << "\", JSON.stringify(returnValue)); } mmhmm_runNative();";

    ExecuteJavascriptOnWebApp(javascript.str());
}

void SharedMiniRemoteManagerImpl::OnNativeCallbackRequest(CefString& context, CefString& jsonValues) {
    std::ostringstream javascript;
    javascript << "onNativeResponse(\"";
    javascript << context.ToString();
    javascript << "\" , ";
    javascript << jsonValues.ToString();
    javascript << ");";

    ExecuteJavascriptOnMiniRemote(javascript.str());
}

void SharedMiniRemoteManagerImpl::SetMinimumMiniRemoteSize(int width, int height) {
    auto mini_remote_window = GetMiniRemoteWindow();
    if (mini_remote_window) {
        mini_remote_window->SetMinimumSize(width, height);
    }
}

void SharedMiniRemoteManagerImpl::AdjustHeight(int height) {

    auto mini_remote_window = GetMiniRemoteWindow();
    if (mini_remote_window) {
        mini_remote_window->AdjustHeight(height);
    }
}

scoped_refptr<client::RootWindow> SharedMiniRemoteManagerImpl::GetMiniRemoteWindow() {
    auto context = client::MainContext::Get();
    if (not context)
        return nullptr;
    auto window_manager = context->GetRootWindowManager();
    if (not window_manager)
        return nullptr;

    auto mini_remote_window = window_manager->GetWindowForBrowser(mini_remote_browser_id_);

    return mini_remote_window ? mini_remote_window : nullptr;
}

bool SharedMiniRemoteManagerImpl::IsOpen() const{
    return is_open_;
}

void SharedMiniRemoteManagerImpl::OnShowMiniRemote() {

    auto* context = client::MainContext::Get();
  if (not context)
    return;

  if (context->GetFeatures().IsFeatureSupported(mmhmm::feature::WebMiniRemote)) {
    ExecuteJavascriptOnWebApp("gApp.openMiniRemoteWindow();");
  } else {
    auto mini_remote_manager = context->GetMiniRemoteManager();
    if (not mini_remote_manager)
      return;

    if (not mini_remote_manager->IsOpen()) {
      auto launch_popup_message = CefProcessMessage::Create("launch_url");
      auto args = launch_popup_message->GetArgumentList();
      args->SetString(
          0, mmhmm::urls::MiniRemoteUrl +
                 client::ToNarrowString(
                     context->GetApplicationContext()->GetThemeString()));
      args->SetString(1, "width=550,height=278");

      auto web_app_browser = GetWebAppBrowser();
      if (web_app_browser && web_app_browser->GetMainFrame()) {
        web_app_browser->GetMainFrame()->SendProcessMessage(
            PID_RENDERER, launch_popup_message);
      }
    }
  }
}

void SharedMiniRemoteManagerImpl::OnHideMiniRemote() {
  auto mini_remote_window = GetMiniRemoteWindow();
  if (mini_remote_window) {
    mini_remote_window->Close(false);
  }
}