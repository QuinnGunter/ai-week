#pragma once

#include <chrono>
#include <thread>
#include <asio.hpp>

namespace client {
class MainContext;
}  // namespace client

#define SD_PORT "8876"
class SdManager
{
 public:
  explicit SdManager(client::MainContext* context);
   ~SdManager();

  void RunAsync();
  void Stop();

 private:
  std::atomic<bool> run_;
  std::thread worker_;
  asio::io_context ioContext_;
  int lastErrorCode_ = 0;
  
  client::MainContext* cefContext_;
};
