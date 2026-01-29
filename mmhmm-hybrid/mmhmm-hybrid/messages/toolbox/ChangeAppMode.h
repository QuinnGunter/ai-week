#pragma once

#include "../Message.h"
#include "../Handler.h"
#include "../../common/titlebar_button.h"

namespace mmhmm::Messages {

class ChangeAppMode : public Message {
 public:
  static const std::string ID;
  static std::optional<std::shared_ptr<ChangeAppMode>> Make(
                         CefRefPtr<CefProcessMessage> process_message, std::string& errorMessage);
  static std::optional<std::shared_ptr<ChangeAppMode>> Make(
      const CefV8ValueList& values, std::string& errorMessage);

  std::string GetId() const override;
  AppMode GetAppMode();

 private:
  ChangeAppMode() = default;
};

class ChangeAppModeHandler : public Handler {
 public:
  bool Execute(std::shared_ptr<Message> message) override;
};
}  // namespace mmhmm::Messages
