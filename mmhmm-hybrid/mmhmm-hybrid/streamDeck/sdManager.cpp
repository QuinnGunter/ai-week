#include "sdManager.h"
#include "../browser/util_win.h"
#include "../browser/resource.h"
#include <browser/main_context.h>
#include <sdWebSocketClient.h>

SdManager::SdManager(client::MainContext* context) :
	run_(false), cefContext_(context) {

}

SdManager::~SdManager() {
  Stop();
}

void SdManager::RunAsync() {
  Stop();

  run_ = true;

  worker_ = std::thread([this]() {
    sdLog() << "streamDeck worker started...";

    SdWebSocketClient* ws_client = nullptr;
    bool showPluginUpdateMessage = false;

    while (run_) {

      try {
        if (!ws_client) {
          ws_client = new SdWebSocketClient(ioContext_, cefContext_);

          ws_client->open("localhost", SD_PORT);
        } else {
          if (ws_client->authorizationStatus() == AuthorizationStatus::not_authorized) {
            sdLog() << "Stream deck authorization failed. Closing sdManager, "
                       "there will be no more attempts to connect with device.";
            showPluginUpdateMessage = true;
            break;
          }
          if (!ws_client->isOpen()) {
            auto lastError = ws_client->GetLastError();
            if (lastError.value() > 0 && lastErrorCode_ != lastError.value()) {
              lastErrorCode_ = lastError.value();
              sdLog() << "Error: " << lastError.message();
            }
            ws_client->close();
            delete ws_client;
            ws_client = nullptr;
          }
        }
      } catch (const std::exception& e) {
        sdLog() << "Unexpected exception in thread loop: " << e.what();
        break;
      }

      if (run_) {
        std::this_thread::sleep_for(std::chrono::seconds(1));
      }
    }

    if (ws_client) {
      ws_client->close();
      delete ws_client;
      ws_client = nullptr;
      lastErrorCode_ = 0;
      sdLog() << "Connection closed.";
    }

    if (showPluginUpdateMessage) {
      MessageBox(NULL, GetResourceString(IDS_MESSAGE_STREAM_DECK_DESC).c_str(),
                 GetResourceString(IDS_MESSAGE_STREAM_DECK_CAPTION).c_str(),
                 MB_OK | MB_ICONEXCLAMATION);
    }
  });
}

void SdManager::Stop() {
  run_ = false;

  if (worker_.joinable()) {
    worker_.join();

    sdLog() << "streamDeck manager stopped.";
  }
}
