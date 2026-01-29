#include "sdMessage.h"
#include "sdMessageTranslator.h"
#include <math.h>
#include "include/cef_v8.h"
#include <include/base/cef_bind.h>
#include <browser/main_context.h>

int id_counter = 0;

SdMessage::SdMessage(sdPresenterKey key, sdMask mask)
    : key_(key),
      mask_(mask),
      toggle_(-1),
      rotation_(0.0f),
      opacity_(1.0f),
      effectValue_(0.5f),
      scale_(1.0),
      zoom_(1.0),
      enhancement_(0.0f),
      isContextInstantinated_(false){
  auto timestamp =
      std::chrono::high_resolution_clock::now().time_since_epoch().count();
  id_ = std::to_string(timestamp) + std::to_string(id_counter++);

  if (key == sdPresenterKey::sd_toggleRecording)
    customJS_ =
        "if (HybridBridge.isRecording) { HybridBridge.pauseRecording();} else "
        "{HybridBridge.startOrResumeRecording();}";

  if (key == sdPresenterKey::sd_switchRoom)
    customJS_ = "demo_rooms";

  if (key == sdPresenterKey::sd_switchMedia)
    customJS_ = "HybridBridge.toggleMedia";
}

std::string SdMessage::getId() const {
  return id_;
}

sdPresenterKey SdMessage::getKey() const {
  return key_;
}

sdMask SdMessage::getMask() const {
  return mask_;
}

bool SdMessage::getToggle() const {
  if (toggle_ == -1 || toggle_ == 1)
    return false;
  else
    return true;
}

float SdMessage::getRotation() const {
  return rotation_;
}

float SdMessage::getOpacity() const {
  return opacity_;
}

float SdMessage::getScale() const {
  return scale_;
}

float SdMessage::getEffectValue() const {
  return effectValue_;
}

float SdMessage::getZoom() const {
  return zoom_;
}

float SdMessage::getEnhancement() const {
  return enhancement_;
}

bool SdMessage::isContextInstantinated() const {
  return isContextInstantinated_;
}

std::string SdMessage::customJS() const {
  return customJS_;
}

std::string SdMessage::getContext() const {
  return context_;
}

std::string SdMessage::getEffectId() const {
  return effectId_;
}

void SdMessage::setMask(sdMask mask) {
  mask_ = mask;
}

void SdMessage::switchToggle() {
  if (toggle_ == -1 || toggle_ == 1)
    toggle_ = 0;
  else
    toggle_ = 1;
}

void SdMessage::resetToggle(bool to) {
  toggle_ = 0;

  if (to)
    toggle_ = 1;
}

void SdMessage::setRotation(float value, bool isDelta) {
  float adjustedRotation = rotation_;

  if (!isDelta) {
    adjustedRotation = value;
  }
  else {
    adjustedRotation += value;
  }

  while (adjustedRotation > 360.0) {
    adjustedRotation -= 360.0;
  }

  while (adjustedRotation < 0) {
    adjustedRotation += 360.0;
  }

  rotation_ = adjustedRotation;
}

void SdMessage::setOpacity(float value, bool isDelta) {
  float newValue = opacity_;

  if (isDelta)
    newValue += value / 100.0f;
  else
    newValue = value;

  opacity_ = std::min(1.0f, std::max(0.0f, newValue));
}

void SdMessage::setEffectValue(float value, bool isDelta) {
  float newValue = effectValue_;

  if (isDelta)
    newValue += value / 100.0f;
  else
    newValue = value;

  effectValue_ = std::min(1.0f, std::max(0.0f, newValue));
}

void SdMessage::setScale(float value, bool isDelta) {
  float newValue = scale_;

  if (isDelta)
    newValue += value / 100.0f;
  else
    newValue = value;
  scale_ = std::min(1.0f, std::max(0.0f, newValue));
}

void SdMessage::setZoom(float value, bool isDelta) {
  float newValue = zoom_;

  if (isDelta)
    newValue += value / 100.0f;
  else
    newValue = value;
  zoom_ = std::min(1.2f, std::max(1.0f, newValue));
}

void SdMessage::setEnhancement(float value, bool isDelta) {
  float newValue = enhancement_;

  if (isDelta)
    newValue += value / 100.0f;
  else
    newValue = value;
  enhancement_ = std::min(1.0f, std::max(0.0f, newValue));
}

void SdMessage::instantinateContext(bool state) {
  isContextInstantinated_ = state;
}

void SdMessage::setContext(std::string& context) {
  context_ = context;
}

void SdMessage::setEffectId(std::string& effectId) {

  if (effectId.empty()){
    effectId_ = "null";
  } else {
    effectId_ = "'" + effectId + "'";
  }
}

void SdMessage::executeWeb(client::MainContext* context) {

  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(base::BindOnce(&SdMessage::executeWeb,
                                     base::Unretained(this), context));
    return;
  }

  if (!context)
    return;

  auto window =
      context->GetRootWindowManager()->GetWindowByWebAppType(WebAppType::mmhmm);

  if (!window)
    return;

  CefRefPtr<CefBrowser> browser = window->GetBrowser();

  if (!browser || !browser.get()) {
    return;
  }

  std::string jsKey = sdPresenterKeyToJsValue(key_);
  std::string jsMask = sdMaskToJSValue(mask_);

  std::ostringstream jsCodeStream;

  jsCodeStream << "HybridBridge." << jsKey;

  if (!jsMask.empty())
    jsCodeStream << "=" << jsMask;

  if (toggle_ > -1)
  {
    if (toggle_)
      jsCodeStream << "="
                   << "true";
    else
      jsCodeStream << "="
                   << "false";
  }

  if (key_ == sdPresenterKey::sd_presenterRotation) {
    jsCodeStream << "=" << getRotation();
  }

  if (key_ == sdPresenterKey::sd_cameraZoom) {
    jsCodeStream << "=" << getZoom();
  }

  if (key_ == sdPresenterKey::sd_presenterEnhancement) {
    jsCodeStream << "=" << getEnhancement();
  }

  if (key_ == sdPresenterKey::sd_presenterOpacity) {
    jsCodeStream << "=" << getOpacity();
  }

  if (key_ == sdPresenterKey::sd_presenterEffectValue) {
    jsCodeStream << "=" << getEffectValue();
  }

  if (key_ == sdPresenterKey::sd_presenterScale) {
    jsCodeStream << "=" << getScale();
  }

  if (key_ == sdPresenterKey::sd_presenterEffect) {
    jsCodeStream << "=" << getEffectId();
  }

  std::string jsCode = jsCodeStream.str();

  if (!customJS_.empty())
    jsCode = customJS_;

  if (key_ == sdPresenterKey::sd_switchRoom || key_ == sdPresenterKey::sd_switchMedia) {
    if (!isContextInstantinated()) {
      jsCode = createJSAsyncCode(true, false);
    } else {
      if (key_ == sdPresenterKey::sd_switchRoom) {
        jsCodeStream << "='" << getContext() << "'";
      } else {
        jsCodeStream.str("");
        jsCodeStream.clear();
        jsCodeStream << customJS() << "('" << getContext() << "')";
      }

      jsCode = jsCodeStream.str();
    }
  }

  CefRefPtr<CefProcessMessage> msg = CefProcessMessage::Create(SD_CEF_MESSAGE_NAME);
  const CefRefPtr<CefListValue> args = msg->GetArgumentList();
  args->SetString(0, jsCode);

  browser->GetMainFrame()->SendProcessMessage(PID_RENDERER, msg);
}

void SdMessage::updateFromWeb(client::MainContext* context, bool useCustomJS) {

  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(base::BindOnce(&SdMessage::updateFromWeb, base::Unretained(this), context, useCustomJS));
    return;
  }

  if (!context)
    return;

  if (key_ == sdPresenterKey::sd_none ||
      key_ == sdPresenterKey::sd_nextSlide ||
      key_ == sdPresenterKey::sd_previousSlide) {

    return;
  }

  CefRefPtr<CefBrowser> browser = context->GetRootWindowManager()->GetBrowserByWebAppType(WebAppType::mmhmm);

  if (!browser || !browser.get()) {
    return;
  }

  CefRefPtr<CefProcessMessage> msg =
      CefProcessMessage::Create(SD_CEF_MESSAGE_NAME);
  const CefRefPtr<CefListValue> args = msg->GetArgumentList();
  args->SetString(0, createJSAsyncCode(false, useCustomJS));

  browser->GetMainFrame()->SendProcessMessage(PID_RENDERER, msg);
}

std::string SdMessage::createJSAsyncCode(bool useContext, bool useCustomJS) {
  std::string jsKey = sdPresenterKeyToJsValue(key_);

  if (useCustomJS)
    jsKey = customJS();

  std::ostringstream jsCodeStream;

  jsCodeStream << "async function mmhmm_runNative() { function execute() { "
                  "return HybridBridge.";

  jsCodeStream << jsKey;

  jsCodeStream
      << "} var returnValue = await execute();window.mmhmm_nativeCallback(";
  jsCodeStream << "\"";

  if (useContext) {
    jsCodeStream << getContext();
  } else {
    jsCodeStream << getId();
  }

  jsCodeStream << "\", JSON.stringify(returnValue)); } mmhmm_runNative();";

  return jsCodeStream.str();
}

