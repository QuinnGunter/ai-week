#include "async_javascript_processor.h"

#include <chrono>
#include <sstream>
#include <string>

namespace mmhmm {
void AsyncJavascriptProcessor::ExecuteJavascriptAsync(
    CefRefPtr<CefBrowser> browser,
    std::wstring javascript,
    std::function<void(std::wstring)> callback) {
  std::unique_lock<std::mutex> lock(mutex_);

  std::wstring task_id = std::to_wstring(++task_counter_);
  JavascriptTask task;
  task.id_ = task_id;
  task.callback_ = callback;
  task.future_ = std::async([this, browser, task_id, javascript]() {
    auto script = ConstructJavascriptCall(task_id, javascript);
    if (browser && browser->GetMainFrame())
      browser->GetMainFrame()->ExecuteJavaScript(
          script, browser->GetMainFrame()->GetURL(), 0);
  });

  tasks_[task.id_] = std::move(task);
}

void AsyncJavascriptProcessor::ReturnTask(std::wstring task_id,
                                          std::wstring result) {
  std::unique_lock<std::mutex> lock(mutex_);
  if (tasks_.count(task_id) > 0) {
    auto& task = tasks_[task_id];
    task.result_ = result;
    auto callback = task.callback_;
    tasks_.erase(task_id);

    lock.unlock();
    if (callback) {
      callback(result);
    }
  }
}

std::wstring AsyncJavascriptProcessor::ConstructJavascriptCall(
    std::wstring task_id,
    std::wstring javascript_code) {
  std::wstringstream javascript;
  javascript << "async function mmhmm_runNative() { function execute() { ";
  javascript << javascript_code;
  javascript << " } ";
  javascript << "let returnValue;";
  javascript << "try {";
  javascript << "returnValue = execute();";
  javascript << "} catch (err) {";
  javascript << "console.error('execute() failed:', err);";
  javascript << "returnValue = {};";
  javascript << "}";
  javascript << "window.mmhmm_nativeCallback(";
  javascript << "\"";
  javascript << task_id;
  javascript << "\", JSON.stringify(returnValue)); } mmhmm_runNative();";
  return javascript.str();
}
}  // namespace mmhmm

