#pragma once

#include "../Message.h"
#include "../Handler.h"

namespace mmhmm::Messages {

class LaunchFloatingNav : public Message {
 public:
  static const std::string ID;
  static std::optional<std::shared_ptr<LaunchFloatingNav>> Make(
      CefRefPtr<CefProcessMessage> process_message,
      std::string& errorMessage);
  static std::optional<std::shared_ptr<LaunchFloatingNav>> Make(
      const CefV8ValueList& values,
      std::string& errorMessage);

  std::string GetId() const override;

 private:
  LaunchFloatingNav() = default;
};

class LaunchFloatingNavHandler : public Handler {
 public:
  bool Execute(std::shared_ptr<Message> message) override;
};

}  // namespace mmhmm::Messages
