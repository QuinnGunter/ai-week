#pragma once

#include "../browser/main_context_impl.h"

class sdLog {
 public:
  sdLog() { 
    logStream_ << "[streamdeck] "; 
  }

  template <typename T>
  sdLog& operator<<(const T& value) {
    logStream_ << value;
    return *this;
  }

  ~sdLog() {
    auto context = client::MainContext::Get();

    if (!context) {
      return;
    }

    auto logger = context->GetLogger();

    if (logger) {
      logger->info(logStream_.str());
    }
  }

 private:
  std::stringstream logStream_;
};