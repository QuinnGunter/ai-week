#pragma once

#include "include/cef_process_message.h"
#include "include/cef_v8.h"

namespace mmhmm::Messages {
class Message {
 public:
  Message() = default;
  virtual ~Message() = default;
  virtual std::string GetId() const = 0;
  CefRefPtr<CefProcessMessage> ToProcessMessage() const {
    return process_message_ ? process_message_->Copy() : nullptr;
  }

 protected:
  CefRefPtr<CefProcessMessage> process_message_;
};
}  // namespace Messages
