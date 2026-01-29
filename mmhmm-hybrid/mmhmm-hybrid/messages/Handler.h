#pragma once
#include "Message.h"

namespace mmhmm::Messages {
class Handler {
 public:
  virtual bool Execute(std::shared_ptr<Message> message) = 0;

};
}  // namespace mmhmm::Messages
