#include "sdMessageSink.h"
#include <browser/main_context.h>

SdMessageSink::SdMessageSink() {
  auto presenterMask = std::make_shared<SdMessage>(
      sdPresenterKey::sd_presenterMask, sdMask::sd_none);

  messageSink_[presenterMask->getKey()] = presenterMask;

  auto nextSlide = std::make_shared<SdMessage>(sdPresenterKey::sd_nextSlide,
                                               sdMask::sd_none);

  messageSink_[nextSlide->getKey()] = nextSlide;

  auto previousSlide = std::make_shared<SdMessage>(
      sdPresenterKey::sd_previousSlide, sdMask::sd_none);

  messageSink_[previousSlide->getKey()] = previousSlide;

  auto toggleCamera = std::make_shared<SdMessage>(
      sdPresenterKey::sd_cameraEnabled, sdMask::sd_none);

  messageSink_[toggleCamera->getKey()] = toggleCamera;

  auto toggleMic = std::make_shared<SdMessage>(
      sdPresenterKey::sd_microphoneEnabled, sdMask::sd_none);

  messageSink_[toggleMic->getKey()] = toggleMic;

  auto toggleBigHands = std::make_shared<SdMessage>(
      sdPresenterKey::sd_bigHandsEnabled, sdMask::sd_none);

  messageSink_[toggleBigHands->getKey()] = toggleBigHands;

  auto presenterRotation = std::make_shared<SdMessage>(
      sdPresenterKey::sd_presenterRotation, sdMask::sd_none);

  messageSink_[presenterRotation->getKey()] = presenterRotation;

  auto presenterScale = std::make_shared<SdMessage>(
      sdPresenterKey::sd_presenterScale, sdMask::sd_none);

  messageSink_[presenterScale->getKey()] = presenterScale;

  auto presenterEnhancement = std::make_shared<SdMessage>(
      sdPresenterKey::sd_presenterEnhancement, sdMask::sd_none);

  messageSink_[presenterEnhancement->getKey()] = presenterEnhancement;

  auto cameraZoom = std::make_shared<SdMessage>(sdPresenterKey::sd_cameraZoom,
                                                sdMask::sd_none);

  messageSink_[cameraZoom->getKey()] = cameraZoom;

  auto cameraOpacity = std::make_shared<SdMessage>(
      sdPresenterKey::sd_presenterOpacity, sdMask::sd_none);

  messageSink_[cameraOpacity->getKey()] = cameraOpacity;

  auto toggleSlide = std::make_shared<SdMessage>(sdPresenterKey::sd_toggleSlide,
                                                 sdMask::sd_none);

  messageSink_[toggleSlide->getKey()] = toggleSlide;

  auto switchRoom = std::make_shared<SdMessage>(sdPresenterKey::sd_switchRoom,
                                                sdMask::sd_none);

  messageSink_[switchRoom->getKey()] = switchRoom;

  auto presenterFullscreen = std::make_shared<SdMessage>(
      sdPresenterKey::sd_presenterFullscreen, sdMask::sd_none);
  messageSink_[presenterFullscreen->getKey()] = presenterFullscreen;

  auto toggleBackground = std::make_shared<SdMessage>(
      sdPresenterKey::sd_toggleBackground, sdMask::sd_none);
  messageSink_[toggleBackground->getKey()] = toggleBackground;

  auto toggleMirrorVideo = std::make_shared<SdMessage>(
      sdPresenterKey::sd_toggleMirrorVideo, sdMask::sd_none);
  messageSink_[toggleMirrorVideo->getKey()] = toggleMirrorVideo;

  auto presenterEffectValue = std::make_shared<SdMessage>(
      sdPresenterKey::sd_presenterEffectValue, sdMask::sd_none);
  messageSink_[presenterEffectValue->getKey()] = presenterEffectValue;

  auto presenterEffect = std::make_shared<SdMessage>(
      sdPresenterKey::sd_presenterEffect, sdMask::sd_none);
  messageSink_[presenterEffect->getKey()] = presenterEffect;

  auto toggleRecording = std::make_shared<SdMessage>(
      sdPresenterKey::sd_toggleRecording, sdMask::sd_none);
  messageSink_[toggleRecording->getKey()] = toggleRecording;

  auto presenterEffects = std::make_shared<SdMessage>(
      sdPresenterKey::sd_presenterEffects, sdMask::sd_none);
  messageSink_[presenterEffects->getKey()] = presenterEffects;

  auto switchMedia = std::make_shared<SdMessage>(
      sdPresenterKey::sd_switchMedia, sdMask::sd_none);
  messageSink_[switchMedia->getKey()] = switchMedia;
}

std::shared_ptr<SdMessage> SdMessageSink::UpdateMessageFromSinkByJson(
   const std::string& jsonString) {
  
  std::shared_ptr<SdMessage> message;

  try {
    nlohmann::json jsonData = nlohmann::json::parse(jsonString);
    
    if (!jsonData.contains("action")) {
      sdLog() << "JSON doesn't contain required fields.";
      return std::make_shared<SdMessage>(sdPresenterKey::sd_none,
                                         sdMask::sd_none);
    }

    //support case when we are reparsing action to another internal action
    if (jsonData["action"] == "app.mmhmm.gotoslide") {
      if (jsonData.contains("properties")) {
        if (jsonData["properties"]["value"] == "previous")
          jsonData["action"] = "app.mmhmm.previousslide";

        if (jsonData["properties"]["value"] == "next")
          jsonData["action"] = "app.mmhmm.nextslide";
      }
    }

    sdPresenterKey key = stringToPresenterEnum(jsonData["action"]);

    message = GetMessageFromSinkByKey(key);

    if (message->getKey() == sdPresenterKey::sd_none)
      return message;

    ParseAndUpdateMessage(*message, jsonData);
    
  } catch (const nlohmann::json::parse_error& e) {
    sdLog() << "JSON parsing failed: " << e.what();
    return std::make_shared<SdMessage>(sdPresenterKey::sd_none,
                                       sdMask::sd_none);
  }

  return message;
}

std::shared_ptr<SdMessage> SdMessageSink::GetMessageFromSinkById(
    std::string& id) {
  auto emptyMessage =
      std::make_shared<SdMessage>(sdPresenterKey::sd_none, sdMask::sd_none);

  for (const auto& pair : messageSink_) {
    if (pair.second->getId() == id) {
      return pair.second;
    }
  }

  return emptyMessage;
}

std::shared_ptr<SdMessage> SdMessageSink::GetMessageFromSinkByContext(
    std::string& context) {
  auto emptyMessage =
      std::make_shared<SdMessage>(sdPresenterKey::sd_none, sdMask::sd_none);

  for (const auto& pair : messageSink_) {
    if (pair.second->getContext() == context) {
      return pair.second;
    }
  }

  return emptyMessage;
}

void SdMessageSink::UpdateAllMessages(client::MainContext* context_) {
  for (const auto& pair : messageSink_) {
    if (pair.second->getKey() == sdPresenterKey::sd_switchRoom)
      pair.second->updateFromWeb(context_, true);
    else
      pair.second->updateFromWeb(context_, false);
  }
}

std::shared_ptr<SdMessage> SdMessageSink::GetMessageFromSinkByKey(
    sdPresenterKey key) {
  auto emptyMessage = std::make_shared<SdMessage>(sdPresenterKey::sd_none, sdMask::sd_none);
  auto it = messageSink_.find(key);
  if (it != messageSink_.end()) {
    return it->second;
  } else {
    sdLog() << "Unable to find sdMessage by key: " << (int)key;
    return emptyMessage;
  }

  return emptyMessage;
}

void SdMessageSink::ParseAndUpdateMessage(SdMessage& message,
                                          nlohmann::json& jsonData) {
  if (message.getKey() == sdPresenterKey::sd_nextSlide ||
      message.getKey() == sdPresenterKey::sd_previousSlide) {
    return;
  }
  if (message.getKey() == sdPresenterKey::sd_presenterMask) {
    if (jsonData["properties"].contains("value")) {
      sdMask mask = stringMaskToEnum(jsonData["properties"]["value"]);
      message.setMask(mask);
      return;
    }
  }

  if (message.getKey() == sdPresenterKey::sd_cameraEnabled ||
      message.getKey() == sdPresenterKey::sd_microphoneEnabled ||
      message.getKey() == sdPresenterKey::sd_bigHandsEnabled ||
      message.getKey() == sdPresenterKey::sd_toggleSlide ||
      message.getKey() == sdPresenterKey::sd_presenterFullscreen ||
      message.getKey() == sdPresenterKey::sd_toggleBackground ||
      message.getKey() == sdPresenterKey::sd_toggleMirrorVideo) {
    message.switchToggle();
  }

  bool hasDelta = false;
  bool hasReset = false;
  float fValue = 0.0f;
  std::string sValue;

  if (jsonData["properties"].contains("reset")) {
    hasReset = true;
  }

  if (jsonData["properties"].contains("delta")) {
    hasDelta = true;
    fValue = jsonData["properties"]["delta"];
  }

  if (jsonData["properties"].contains("value")) {
    if (jsonData["properties"]["value"].is_number()) {
      fValue = jsonData["properties"]["value"];
      fValue = fValue / 100.0;
    } else if (jsonData["properties"]["value"].is_string()) {
      sValue = jsonData["properties"]["value"];
    }
  }

  if (message.getKey() == sdPresenterKey::sd_presenterRotation) {
    if (hasReset)
      fValue = 0.0f;

    fValue = -fValue;
    message.setRotation(fValue, hasDelta);
  }

  if (message.getKey() == sdPresenterKey::sd_presenterScale) {
    if (hasReset)
      fValue = 1.0f;

    message.setScale(fValue, hasDelta);
  }

  if (message.getKey() == sdPresenterKey::sd_cameraZoom) {
    if (hasReset)
      fValue = 1.0f;
    message.setZoom(fValue, hasDelta);
  }

  if (message.getKey() == sdPresenterKey::sd_presenterOpacity) {
    if (hasReset)
      fValue = 1.0f;
    message.setOpacity(fValue, hasDelta);
  }

  if (message.getKey() == sdPresenterKey::sd_presenterEffectValue) {
    if (hasReset)
      fValue = 0.5f;
    message.setEffectValue(fValue, hasDelta);
  }

  if (message.getKey() == sdPresenterKey::sd_presenterEnhancement) {
    if (hasReset)
      fValue = 0.0f;
    message.setEnhancement(fValue, hasDelta);
  }

  if (message.getKey() == sdPresenterKey::sd_presenterEffect) {
    message.setEffectId(sValue);
  }

  if (message.getKey() == sdPresenterKey::sd_switchRoom || message.getKey() == sdPresenterKey::sd_switchMedia) {
    if (jsonData["properties"].contains("context")) {
      std::string context = jsonData["properties"]["context"];
      message.setContext(context);
      message.instantinateContext(false);
    }

    if (jsonData["properties"].contains("value")) {
      message.instantinateContext(true);
      std::string context = jsonData["properties"]["value"];
      message.setContext(context);
    }
  }
}
