#pragma once

#define _WEBSOCKETPP_CPP11_INTERNAL_

#include <malloc.h>
#include <asio.hpp>
#include <iostream>
#include <string>
#include <thread>
#include <mutex>
#include <condition_variable>

#include <sdLog.h>
#include <sdMessageSink.h>

#include "nlohmann/json.hpp"

namespace client {
class MainContext;
}  // namespace client

enum AuthorizationStatus : short { no_status = 0, during = 1, not_authorized = 2 };
enum HandShakeState : short {
  no_handshake = 0,
  valid_handshake = 1,
  invalid_handshake = 2
};

class SdWebSocketClient {
 public:
  SdWebSocketClient(asio::io_context& ioContext, client::MainContext* cefContext);
  ~SdWebSocketClient();

  void open(const std::string& host, const std::string& port);

  void close();

  void send(const std::string& message);

  void startReading();

  bool isOpen() const;

  AuthorizationStatus authorizationStatus() const;
  
  void onPropertyChanged(CefString& action,
                         CefRefPtr<CefValue> value,
                         bool mask_disable);

  void OnNativeCallback(CefString& context, CefString& jsonValues);
  std::error_code GetLastError() const;

 private:

  virtual void onMessageReceived(const std::string& message);
  
  // ASIO Callbacks
  virtual void onOpen();

  virtual void onClose();

  virtual void onError(const std::error_code& error);

  HandShakeState ValidateMessage(const std::string& message);

  void NotifyAuthorizationComplete();

  asio::ip::tcp::resolver resolver_;
  asio::ip::tcp::socket socket_;
  asio::streambuf receiveBuffer_;
  std::thread rcvThread_;
  std::atomic<bool> receive_;
  std::atomic<bool> isOpen_;
  std::atomic<bool> isAuthorized_;
  std::atomic<short> authorizationStatus_;
  std::atomic<bool> isAuthorizationComplete_;
  std::error_code lastError_;
  SdMessageSink messageSink_;
  
  client::MainContext* cefContext_;

  std::thread threadAuthorizationSchedule_;
  std::condition_variable authorizationConditionVariable_;
  std::mutex authorizationMutex_;
};
