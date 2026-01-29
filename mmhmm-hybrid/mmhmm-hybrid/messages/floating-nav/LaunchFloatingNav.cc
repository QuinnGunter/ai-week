#include "LaunchFloatingNav.h"
#include "../../browser/main_context.h"
#include "../../browser/root_window_manager.h"
#include "../../browser/root_window.h"
#include "../../common/urls.h"

namespace mmhmm::Messages {

const std::string LaunchFloatingNav::ID = "launchFloatingNav";

std::optional<std::shared_ptr<LaunchFloatingNav>> LaunchFloatingNav::Make(
    CefRefPtr<CefProcessMessage> process_message,
    std::string& error_message) {
  // LaunchFloatingNav doesn't require any arguments
  struct PrivateCtorEnabler : public LaunchFloatingNav {};
  auto launchFloatingNav = std::make_shared<PrivateCtorEnabler>();
  launchFloatingNav->process_message_ = process_message;
  return std::make_optional<std::shared_ptr<LaunchFloatingNav>>(launchFloatingNav);
}

std::optional<std::shared_ptr<LaunchFloatingNav>> LaunchFloatingNav::Make(
    const CefV8ValueList& values,
    std::string& error_message) {
  // LaunchFloatingNav doesn't require any arguments
  struct PrivateCtorEnabler : public LaunchFloatingNav {};
  auto launchFloatingNav = std::make_shared<PrivateCtorEnabler>();
  launchFloatingNav->process_message_ =
      CefProcessMessage::Create(launchFloatingNav->GetId());
  return std::make_optional<std::shared_ptr<LaunchFloatingNav>>(launchFloatingNav);
}

std::string LaunchFloatingNav::GetId() const {
  return LaunchFloatingNav::ID;
}

bool LaunchFloatingNavHandler::Execute(std::shared_ptr<Message> message) {
  if (!message || message->GetId() != LaunchFloatingNav::ID) {
    return false;
  }

  // Check if floating nav window already exists
  auto root_window_manager = client::MainContext::Get()->GetRootWindowManager();
  auto existing_window = root_window_manager->GetWindowByWebAppType(
      WebAppType::floating_camera_nav);

  if (existing_window) {
    // Window already exists - show it
    existing_window->Show(client::RootWindow::ShowNormal);
    return true;
  }

  // Create new floating nav window
  auto config = std::make_unique<client::RootWindowConfig>();
  config->always_on_top = true;
  config->with_controls = false;
  config->initially_hidden = false;
  config->app_type = WebAppType::floating_camera_nav;
  config->url = mmhmm::urls::FloatingCameraNavUrl;

  // Default position: top-left with small offset
  // Size: 50x50 (collapsed state)
  config->bounds = CefRect(50, 50, 50, 50);

  root_window_manager->CreateRootWindow(std::move(config), nullptr);

  return true;
}

}  // namespace mmhmm::Messages
