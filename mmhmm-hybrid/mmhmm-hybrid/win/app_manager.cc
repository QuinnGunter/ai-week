#include "app_manager.h"
#include "app_settings_service.h"
#include <browser/main_context.h>
#include <browser/root_window_manager.h>
#include <browser/root_window_win.h>
#include <browser/web_app_browser.h>

namespace mmhmm {
AppManager::AppManager(client::MainContext* context): context_(context) {}
AppManager::~AppManager() {}

void AppManager::LaunchApp(WebAppType app_type,
                           bool singleton,
                           std::wstring query_params) {
  if (!context_)
    return;

  auto window_manager = context_->GetRootWindowManager();
  auto existing_window = window_manager->GetWindowByWebAppType(app_type, WindowSearchType::exact);
  if (IsWebAppMalkType(app_type) && !existing_window) {
    auto existing_malk_window =
        window_manager->GetWindowByWebAppType(app_type, WindowSearchType::match_all_malk);
    if (existing_malk_window) {
      existing_malk_window->Show(client::RootWindow::ShowMinimized);
      existing_malk_window->Close(true);
    }
  }

  if (!existing_window || (existing_window && !singleton)) {
    std::wstring app_url =
        AppSettingsService::GetUrlByAppType(app_type) + query_params;
    auto window_config = std::make_unique<RootWindowConfig>();
    window_config->url = CefString(app_url);
    window_config->with_controls = false;
    window_config->app_type = app_type;
    window_manager->CreateRootWindow(std::move(window_config), nullptr);
  }

  if (existing_window && singleton) {
    auto* window = static_cast<client::RootWindowWin*>(existing_window.get());
    window->ActivateWindow();

    if (!query_params.empty()) {
      auto browser = existing_window->GetBrowser();
      if (!browser)
        return;

      auto frame = browser->GetMainFrame();
      if (!frame)
        return;

      frame->ExecuteJavaScript(
          BuildRedirectScript(client::ToNarrowString(query_params)),
          frame->GetURL(), 0);
    }
  }

  auto& settings = AppSettingsService::AppSettings();
  settings.launchApp = WebAppToString(app_type);
  AppSettingsService::SaveSettings();
}

std::string AppManager::BuildRedirectScript(const std::string& query_params) {
  return "window.location.assign(document.location.origin + "
         "document.location.pathname + '" +
         query_params + "');";
}

}  // namespace mmhmm
