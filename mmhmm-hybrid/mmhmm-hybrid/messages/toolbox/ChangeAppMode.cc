#include "ChangeAppMode.h"
#include "../../browser/main_context.h"

namespace mmhmm::Messages {
const std::string ChangeAppMode::ID = "changeAppMode";

std::optional<std::shared_ptr<ChangeAppMode>> ChangeAppMode::Make(
    CefRefPtr<CefProcessMessage> process_message,
    std::string& error_message) {
  if (!process_message || !process_message->GetArgumentList() ||
      process_message->GetArgumentList()->GetSize() == 0 ||
      process_message->GetArgumentList()->GetType(0) != VTYPE_INT) {
    error_message = "Invalid arguments";
    return std::nullopt;
  }

  // Create a temp derived class to allow make_shared to access private ctor.
  struct PrivateCtorEnabler : public ChangeAppMode {};
  auto changeAppMode = std::make_shared<PrivateCtorEnabler>();
  changeAppMode->process_message_ = process_message;
  return std::make_optional<std::shared_ptr<ChangeAppMode>>(changeAppMode);
}

std::optional<std::shared_ptr<ChangeAppMode>> ChangeAppMode::Make(
    const CefV8ValueList& values, std::string& error_message) {
  if (values.size() == 0 || !values[0].get()->IsString()) {
    error_message = "String expected as only parameter";
    return std::nullopt;
            
  }
  auto appModeString = values[0].get()->GetStringValue();
  auto maybeMode = mmhmm::AppModeFromString(appModeString);
  if (!maybeMode.has_value()) {
    error_message = "Invalid app mode string";
    return std::nullopt;
  }

  // Create a temp derived class to allow make_shared to access private ctor.
  struct PrivateCtorEnabler : public ChangeAppMode {};
  auto changeAppMode = std::make_shared<PrivateCtorEnabler>();
  changeAppMode->process_message_ =
      CefProcessMessage::Create(changeAppMode->GetId());

  auto args = changeAppMode->process_message_->GetArgumentList();
  args->SetInt(0, static_cast<int>(maybeMode.value()));

  
  return std::make_optional<std::shared_ptr<ChangeAppMode>>(changeAppMode);
}

std::string ChangeAppMode::GetId() const {
  return ChangeAppMode::ID;
}

AppMode ChangeAppMode::GetAppMode() {
    auto modeInt = process_message_->GetArgumentList()->GetInt(0);
    return AppMode{modeInt};
}

bool ChangeAppModeHandler::Execute(std::shared_ptr<Message> message) {
  if (!message || message->GetId() != ChangeAppMode::ID) {
    return false;
  }

  std::shared_ptr<ChangeAppMode> change_app_mode_message =
      std::static_pointer_cast<ChangeAppMode>(message);

  client::MainContext::Get()->RequestAppModeChange(
      change_app_mode_message->GetAppMode());
  return true;
}
}
