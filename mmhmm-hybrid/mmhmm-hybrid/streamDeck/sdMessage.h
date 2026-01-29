#pragma once

#include <sdLog.h>
#include <sdEnums.h>

#include "include/cef_process_message.h"

#define SD_CEF_MESSAGE_NAME "execute_javascript"

namespace client {
class MainContext;
}  // namespace client

class SdMessage {
 public:
  SdMessage(sdPresenterKey key, sdMask mask);

  std::string getId() const;
  sdPresenterKey getKey() const;
  sdMask getMask() const;
  bool getToggle() const;
  float getRotation() const;
  float getOpacity() const;
  float getScale() const;
  float getEffectValue() const;
  float getZoom() const;
  float getEnhancement() const;
  bool isContextInstantinated() const;
  std::string customJS() const;
  std::string getContext() const;
  std::string getEffectId() const;

  void setMask(sdMask mask);
  void switchToggle();
  void resetToggle(bool to);
  void setRotation(float value, bool isDelta);
  void setOpacity(float value, bool isDelta);
  void setEffectValue(float value, bool isDelta);
  void setScale(float value, bool isDelta);
  void setZoom(float value, bool isDelta);
  void setEnhancement(float value, bool isDelta);
  void instantinateContext(bool state);
  void setContext(std::string& context);
  void setEffectId(std::string& effectId);
  
  void executeWeb(client::MainContext* context);

  void updateFromWeb(client::MainContext* contextImpl, bool useCustomJS);

 private:

  std::string createJSAsyncCode(bool useContext, bool useCustomJS);

  sdMask mask_;
  sdPresenterKey key_;
  int toggle_;
  float rotation_;
  float opacity_;
  float effectValue_;
  float scale_;
  float zoom_;
  float enhancement_;
  bool isContextInstantinated_;
  std::string effectId_;
  std::string context_;
  std::string id_;
  std::string customJS_;
};

