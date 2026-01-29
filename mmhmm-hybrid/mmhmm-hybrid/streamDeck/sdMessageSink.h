#pragma once

#include <sdLog.h>
#include <unordered_map>
#include "nlohmann/json.hpp"

#include <sdMessage.h>
#include <sdMessageTranslator.h>

namespace client {
class MainContext;
}  // namespace client

class SdMessageSink {
 public:
  SdMessageSink();

  std::shared_ptr<SdMessage> UpdateMessageFromSinkByJson(
      const std::string& jsonString);
  std::shared_ptr<SdMessage> GetMessageFromSinkByKey(sdPresenterKey key);
  std::shared_ptr<SdMessage> GetMessageFromSinkById(std::string& id);
  std::shared_ptr<SdMessage> GetMessageFromSinkByContext(std::string& context);

  void UpdateAllMessages(client::MainContext* context_);

 private:
  void ParseAndUpdateMessage(SdMessage& message, nlohmann::json& jsonData);

  std::unordered_map<sdPresenterKey, std::shared_ptr<SdMessage>> messageSink_;
};
