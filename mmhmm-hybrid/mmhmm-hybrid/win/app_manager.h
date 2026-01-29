#pragma once
#include <browser\client_types.h>
#include <string>

namespace client {
class MainContext;
}  // namespace client

namespace mmhmm {
class AppManager {
 public:
  AppManager(client::MainContext* context);
  ~AppManager();

  void LaunchApp(WebAppType app_type,
                 bool singleton,
                 std::wstring query_params = L"");

 private:
  std::string BuildRedirectScript(const std::string& query_params);

 private:
  client::MainContext* context_;
};
}  // namespace mmhmm
