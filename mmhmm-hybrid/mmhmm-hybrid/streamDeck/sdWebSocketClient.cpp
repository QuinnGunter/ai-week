#include "sdWebSocketClient.h"

#include "../browser/hybrid_bridge_callback_handler.h"
#include <include/cef_parser.h>

#include "../win/app_settings_service.h"

#include "sdEffectIcons.h"
#include <browser/main_context.h>

const std::string kHandshakeKey = "handshake";
const std::string kAPIVersionKey = "apiVersion";
const std::string kAPPVersionKey = "appVersion";
const std::string kPluginVersionKey = "pluginVersion";
const std::string kAPIVersion = "1";

void* propertyCallback = nullptr;
std::atomic<bool> hybridBridgeInitialized = false;

SdWebSocketClient::SdWebSocketClient(asio::io_context& ioContext,
                                     client::MainContext* cefContext)
    : receive_(false),
      isOpen_(false),
      isAuthorized_(false),
      isAuthorizationComplete_(false),
      authorizationStatus_(0),
      resolver_(ioContext),
      socket_(ioContext),
      cefContext_(cefContext) {
  
}

SdWebSocketClient::~SdWebSocketClient() {
  mmhmm::HybridBridgeCallbackHandler::SetPropertyCallback(nullptr);
}

void SdWebSocketClient::onPropertyChanged(CefString& action,
                                          CefRefPtr<CefValue> value, bool maskDisable) {
  nlohmann::json json_obj;
  nlohmann::json json_properties;
  std::string translated_action;
  
  translated_action = action.ToString();

  translated_action = sdWebStringToActionString(translated_action);

  if (translated_action.empty())
    return;

  json_obj["action"] = translated_action;

  switch (value->GetType()) {
    case VTYPE_INVALID:
      sdLog() << "Invalid data type for key: " << action;
      return;
    case VTYPE_NULL:
      json_properties["value"] = nullptr;
      break;
    case VTYPE_BOOL:
      json_properties["enabled"] = value->GetBool();
      break;
    case VTYPE_INT:
      json_properties["value"] = value->GetInt();
      break;
    case VTYPE_DOUBLE:
      json_properties["value"] = value->GetDouble();
      break;
    case VTYPE_STRING: {
      if (sdPresenterKey::sd_switchRoom == stringToPresenterEnum(translated_action))
      {
        nlohmann::json json_options =
            nlohmann::json::parse(value->GetString().ToString());

        json_properties["options"] = json_options;

      } else {
        json_properties["value"] = value->GetString().ToString();
      }
    }
      break;
    case VTYPE_DICTIONARY: {

      nlohmann::json json_options = nlohmann::json::array();
      CefRefPtr<CefDictionaryValue> dictionary = value->GetDictionary();

      std::vector<CefString> keys;
      dictionary->GetKeys(keys);  // Retrieve all the keys

      for (const auto& key : keys) {
        CefRefPtr<CefValue> data = dictionary->GetValue(key);

        nlohmann::json jsonObject;
        jsonObject["name"] = key.ToString();
        jsonObject["value"] =
            data->GetString()
                .ToString();

        json_options.push_back(jsonObject);
      }

      nlohmann::json json_icons;

      for (size_t i = 0; i < sdImageCount; i++) {
        json_icons[sdIconKeys[i]] = sdEncodedImages[i];
      }

      json_properties["icons"] = json_icons;

      json_properties["value"] = nullptr;
      json_properties["options"] = json_options;
      
    }
      break;
    case VTYPE_BINARY:
    case VTYPE_LIST:
      sdLog() << "Unhandled data type for key: " << action;
      return;
  }

  //update message before we will send information to plugin
  sdPresenterKey key = stringToPresenterEnum(translated_action);

  if (key == sdPresenterKey::sd_none) {
    sdLog() << "Key not found for action: " << translated_action;
    return;
  }

  std::shared_ptr<SdMessage> msg = messageSink_.GetMessageFromSinkByKey(key);

  if (msg->getKey() == sdPresenterKey::sd_none) {
    sdLog() << "Message not found by key: " << (int) key;
  }

  if (msg->getKey() == sdPresenterKey::sd_switchRoom ||
      msg->getKey() == sdPresenterKey::sd_switchMedia) {
    json_properties["context"] = msg->getContext();

    auto json_values = nlohmann::json::parse(value->GetString().ToString());
    json_properties["value"] = nullptr;
    json_properties["value"] = json_values;
  }

  json_obj["properties"] = json_properties;

  if (msg->getKey() == sdPresenterKey::sd_presenterOpacity) {
    msg->setOpacity(value->GetDouble(), false);
  }

  if (msg->getKey() == sdPresenterKey::sd_presenterRotation) {
    msg->setRotation(value->GetDouble(), false);
  }

  if (msg->getKey() == sdPresenterKey::sd_presenterEnhancement) {
    msg->setEnhancement(value->GetDouble(), false);
  }

  if (msg->getKey() == sdPresenterKey::sd_presenterScale) {
    msg->setScale(value->GetDouble(), false);
  }

  // it seems that internal slide state is reset after every slide change
  // we need to reset toggle then to be always in default state then
  if (msg->getKey() == sdPresenterKey::sd_toggleSlide) {
    msg->resetToggle(value->GetBool());
  }

  send(json_obj.dump() + "\n");
}

void SdWebSocketClient::OnNativeCallback(CefString& context,
                                         CefString& jsonValues) {

  std::string std_context = context.ToString();

  std::shared_ptr<SdMessage> message = messageSink_.GetMessageFromSinkById(std_context);

  //if we can't match message by id, let's try find it by context
  if (message->getKey() == sdPresenterKey::sd_none) {
    message = messageSink_.GetMessageFromSinkByContext(std_context);
  } 
  
  if (message->getKey() == sdPresenterKey::sd_none) {
    sdLog() << "Unable to find message for context: " << context;
    return;
  }

  if (jsonValues.empty())
    return;

  std::string action = sdPresenterKeyToJsValue(message->getKey());

  nlohmann::json jsonData = nlohmann::json::parse(jsonValues.ToString());

  CefRefPtr<CefValue> value = CefValue::Create();

  if (jsonData.is_object()) {
    value = CefParseJSON(jsonValues, JSON_PARSER_RFC);
  }

  if (jsonData.is_string()) {
    std::string s_val = jsonData;
    value->SetString(s_val);
  }

  if (jsonData.is_number_integer()) {
    value->SetInt(jsonData);
  }

  if (jsonData.is_number_float()) {
    value->SetDouble(jsonData);
  }

  if (jsonData.is_boolean()) {
    value->SetBool(jsonData);
  }

  //don't pass any deserialized values in case of room
  //we are going to pass them directly to plugin
  if (message->getKey() == sdPresenterKey::sd_switchRoom ||
      message->getKey() == sdPresenterKey::sd_switchMedia) {
    value->SetString(jsonValues);
  }

  //we have to make exception here, 
  //presenter opacity is serialized as int sometimes
  //should be float/double
  //let's handle it manualy
  if (message->getKey() == sdPresenterKey::sd_presenterOpacity ||
      message->getKey() == sdPresenterKey::sd_presenterEnhancement ||
      message->getKey() == sdPresenterKey::sd_presenterRotation ||
      message->getKey() == sdPresenterKey::sd_presenterScale )
    value->SetDouble(jsonData);

  CefString cef_action = CefString(action);
  onPropertyChanged(cef_action, value, false);
}

void SdWebSocketClient::open(const std::string& host, const std::string& port) {

  if (!cefContext_)
    return;

  if (authorizationStatus_ > 0) {
    sdLog() << "During authorization process or authorization failed. Refusing "
               "to open channel.";

    return;
  }

  asio::ip::tcp::resolver::results_type endpoints =
      resolver_.resolve(host, port);

  // Using synchronous connect with error_code
  std::error_code ec;
  asio::connect(socket_, endpoints, ec);

  if (ec) {
    onError(ec);
  } else {
    onOpen();

    receive_ = true;

    rcvThread_ = std::thread([this]() {
      while (receive_ && isOpen_) {
        startReading();
      }
    });
  }
}

void SdWebSocketClient::close() {
  
  socket_.close();

  if (receive_ && rcvThread_.joinable()){
    receive_ = false;
    rcvThread_.join();
  }

  onClose();
  
}

void SdWebSocketClient::send(const std::string& message) {

  if (!isOpen())
    return;

  std::error_code ec;

  // Using synchronous write
  size_t sent = asio::write(socket_, asio::buffer(message), ec);

  if (ec || sent < 1) {
    onError(ec);
  }
}

void SdWebSocketClient::startReading() {
  std::error_code ec;
  size_t received = asio::read_until(socket_, receiveBuffer_, '\n', ec);

  if (!ec) {
    if (received > 0) {
      std::string message(asio::buffers_begin(receiveBuffer_.data()),
                          asio::buffers_end(receiveBuffer_.data()));
      receiveBuffer_.consume(receiveBuffer_.size());

      // Remove trailing '\n' character from the message
      if (!message.empty() && message.back() == '\n') {
        message.pop_back();
      }

      onMessageReceived(message);
            
    }

  } else {
    onError(ec);
  }
}

void SdWebSocketClient::onOpen() {
  if (threadAuthorizationSchedule_.joinable()) {
    NotifyAuthorizationComplete();
    threadAuthorizationSchedule_.join();
  }

  isOpen_ = true;
  lastError_ = std::error_code();
  // No need to protect isAuthorizationComplete_ with any mutex,
  // at this stage is guaranteed there are no other threads using this variable.
  isAuthorizationComplete_ = false;
  authorizationStatus_ = (short)AuthorizationStatus::during;

  threadAuthorizationSchedule_ = std::thread([this]() {
    std::unique_lock<std::mutex> lock(authorizationMutex_);
    if (!authorizationConditionVariable_.wait_for(lock, std::chrono::milliseconds(5000),
                     [this]() { return isAuthorizationComplete_.load(); })) {
      authorizationStatus_ = (short)AuthorizationStatus::not_authorized;
    }
  });
  
  sdLog() << "Connection opened. Sending handshake message.";
  std::string appVersion = mmhmm::AppSettingsService::GetShortVersionString();
  nlohmann::json j;
  j[kHandshakeKey][kAPIVersionKey] = kAPIVersion;
  j[kHandshakeKey][kAPPVersionKey] = appVersion;
  send(j.dump() + "\n");
}

void SdWebSocketClient::onClose() {
  mmhmm::HybridBridgeCallbackHandler::SetPropertyCallback(nullptr);
  isOpen_ = false;
  isAuthorized_ = false;
  if (threadAuthorizationSchedule_.joinable()) {
    NotifyAuthorizationComplete();
    threadAuthorizationSchedule_.join();
  }
}

void SdWebSocketClient::onError(const std::error_code& error) {
  mmhmm::HybridBridgeCallbackHandler::SetPropertyCallback(nullptr);
  isOpen_ = false;
  lastError_ = error;
}

HandShakeState SdWebSocketClient::ValidateMessage(const std::string& message) {
  try {
    nlohmann::json jsonData = nlohmann::json::parse(message);

    if (jsonData.contains(kHandshakeKey) && jsonData[kHandshakeKey].contains(kAPIVersionKey)) {
      if (jsonData[kHandshakeKey][kAPIVersionKey] == kAPIVersion) {
        sdLog() << "Received handshake with correct api version.";

        if (jsonData[kHandshakeKey].contains(kPluginVersionKey)) {
          sdLog() << "Stream deck plugin version: "
                  << jsonData[kHandshakeKey][kPluginVersionKey];
        }

        return HandShakeState::valid_handshake;
      } else {
        sdLog() << "Received handshake with incorrect api version.";
        return HandShakeState::invalid_handshake;
      }
    } else {
      return HandShakeState::no_handshake;
    }
  } catch(...) {
    return HandShakeState::no_handshake;
  }

  return HandShakeState::no_handshake;
}

void SdWebSocketClient::NotifyAuthorizationComplete() {
  std::unique_lock<std::mutex> lock(authorizationMutex_);
  isAuthorizationComplete_ = true;
  lock.unlock();

  authorizationConditionVariable_.notify_one();
}

void SdWebSocketClient::onMessageReceived(const std::string& message) {
  //sdLog() << "Received message: " << message;

  if (!isAuthorized_) {
    HandShakeState handShakeState = ValidateMessage(message);

    switch (handShakeState) {
      case no_handshake:
        break;
      case valid_handshake:
        isAuthorized_ = true;
        NotifyAuthorizationComplete();
        break;
      case invalid_handshake:
        NotifyAuthorizationComplete();
        break;
    }

    if (!isAuthorized_) {
      return;
    }
    
    mmhmm::HybridBridgeCallbackHandler::SetPropertyCallback(this);
    messageSink_.UpdateAllMessages(cefContext_);
    return;
  }

  // pay attention to deal with messageSink only here
  // considering we are multithreaded and messageSink is not thread safe
  std::shared_ptr<SdMessage> sdMsg =
      messageSink_.UpdateMessageFromSinkByJson(message);

  if (sdMsg->getKey() == sdPresenterKey::sd_none)
    return;

  sdMsg->executeWeb(cefContext_);
}

bool SdWebSocketClient::isOpen() const {
  return isOpen_.load();
}

AuthorizationStatus SdWebSocketClient::authorizationStatus() const {
  return (AuthorizationStatus) authorizationStatus_.load();
}
std::error_code SdWebSocketClient::GetLastError() const {
  return lastError_;
}

namespace mmhmm::HybridBridgeCallbackHandler {

void OnNativeCallbackRequest(CefRefPtr<CefBrowser> browser,
                             CefString& context,
                             CefString& jsonValues) {
  if (!propertyCallback) {
    return;
  }

  SdWebSocketClient* ws_client =
      reinterpret_cast<SdWebSocketClient*>(propertyCallback);

  if (ws_client) {
    ws_client->OnNativeCallback(context, jsonValues);
  }
}

void OnPropertyChange(CefRefPtr<CefBrowser> browser,
                      CefString& key,
                      CefRefPtr<CefValue> value) {
  if (!propertyCallback) {
    return;
  }

  SdWebSocketClient* ws_client =
      reinterpret_cast<SdWebSocketClient*>(propertyCallback);

  if (ws_client) {
    ws_client->onPropertyChanged(key, value, false);
  }
}

void OnBridgeInitialized(CefRefPtr<CefBrowser> browser, CefString& build, CefString& theme, CefString& releaseTrack) {
  hybridBridgeInitialized = true;
}

void SetPropertyCallback(void* obj) {
  propertyCallback = obj;
}

void OnShowMiniRemote(CefRefPtr<CefBrowser> browser) {

}

void OnHideMiniRemote(CefRefPtr<CefBrowser> browser) {

}
void OnEnterBroadcastMode(CefRefPtr<CefBrowser> browser) {
  //Currently not used on Windows
}

void OnExitBroadcastMode(CefRefPtr<CefBrowser> browser) {
  //Currently not used on Windows
}
void OnStageRenderingStarted(CefRefPtr<CefBrowser> browser) {
  //Currently not used on Windows
}

void OnStageRenderingStopped(CefRefPtr<CefBrowser> browser) {
  //Currently not used on Windows
}
}  // namespace HybridBridgeCallbackHandler

