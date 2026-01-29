//
// mmhmm Windows
// Copyright � 2020-2024 mmhmm, inc. All rights reserved.
//

#pragma once

#include <future>
#include <functional>
#include <map>
#include <mutex>
#include "include/cef_browser.h"

namespace mmhmm {

class JavascriptTask {
 public:
  std::wstring id_;
  std::future<void> future_;
  std::wstring result_;
  std::function<void(std::wstring)> callback_;
};

class AsyncJavascriptProcessor {
 public:
  AsyncJavascriptProcessor() = default;
  ~AsyncJavascriptProcessor() = default;

  void ExecuteJavascriptAsync(CefRefPtr<CefBrowser> browser,
                              std::wstring javascript,
                              std::function<void(std::wstring)> callback);
  void ReturnTask(std::wstring task_id, std::wstring result);

 private:
  std::wstring ConstructJavascriptCall(std::wstring task_id,
                                       std::wstring javascript_code);

 private:
  std::mutex mutex_;
  std::map<std::wstring, JavascriptTask> tasks_;
  uint64_t task_counter_ = 0;
};
}  // namespace mmhmm
