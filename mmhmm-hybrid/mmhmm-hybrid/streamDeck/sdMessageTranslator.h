#pragma once

#include <map>
#include <string>
#include <sdEnums.h>

inline std::map<sdMask, std::string> sdMaskToJSString = {
    {sdMask::sd_none, ""},
    {sdMask::sd_rectangle, "'rectangle'"},
    {sdMask::sd_circle, "'circle'"},
    {sdMask::sd_silhouette, "'silhouette'"},
};

inline std::map<std::string, sdPresenterKey> stringToSdPresenterKey = {
    {"", sdPresenterKey::sd_none},
    {"app.mmhmm.presentermask", sdPresenterKey::sd_presenterMask},
    {"app.mmhmm.presenteropacity", sdPresenterKey::sd_presenterOpacity},
    {"app.mmhmm.presenterrotation", sdPresenterKey::sd_presenterRotation},
    {"app.mmhmm.presenterscale", sdPresenterKey::sd_presenterScale},
    {"app.mmhmm.presenterenhancement", sdPresenterKey::sd_presenterEnhancement},
    {"app.mmhmm.camerazoom", sdPresenterKey::sd_cameraZoom},
    {"app.mmhmm.nextslide", sdPresenterKey::sd_nextSlide},
    {"app.mmhmm.previousslide", sdPresenterKey::sd_previousSlide},
    {"app.mmhmm.togglecamera", sdPresenterKey::sd_cameraEnabled},
    {"app.mmhmm.togglemic", sdPresenterKey::sd_microphoneEnabled},
    {"app.mmhmm.togglebighands", sdPresenterKey::sd_bigHandsEnabled},
    {"app.mmhmm.toggleslide", sdPresenterKey::sd_toggleSlide},
    {"app.mmhmm.switchroom", sdPresenterKey::sd_switchRoom},
	  {"app.mmhmm.presenterfullscreen", sdPresenterKey::sd_presenterFullscreen},
	  {"app.mmhmm.togglebackground", sdPresenterKey::sd_toggleBackground},
	  {"app.mmhmm.togglemirrorvideo", sdPresenterKey::sd_toggleMirrorVideo},
    {"app.mmhmm.presentereffectvalue", sdPresenterKey::sd_presenterEffectValue},
    {"app.mmhmm.presentereffect", sdPresenterKey::sd_presenterEffect},
    {"app.mmhmm.togglerecording", sdPresenterKey::sd_toggleRecording},
    {"app.mmhmm.presentereffects", sdPresenterKey::sd_presenterEffects},
    {"app.mmhmm.switchmedia", sdPresenterKey::sd_switchMedia},
};

inline std::map<std::string, std::string> stringActionToSdStringKey = {
    {"", ""},
    {"presenter_mask", "app.mmhmm.presentermask"},
    {"presenter_opacity", "app.mmhmm.presenteropacity"},
    {"presenter_rotation", "app.mmhmm.presenterrotation"},
    {"presenter_scale", "app.mmhmm.presenterscale"},
    {"presenter_enhancement", "app.mmhmm.presenterenhancement"},
    {"camera_zoom", "app.mmhmm.camerazoom"},
    {"camera_enabled", "app.mmhmm.togglecamera"},
    {"microphone_enabled", "app.mmhmm.togglemic"},
    {"bigHands_enabled", "app.mmhmm.togglebighands"},
    {"slide_selected", "app.mmhmm.toggleslide"},
    {"room", "app.mmhmm.switchroom"},
	  {"presenter_fullScreen", "app.mmhmm.presenterfullscreen"},
	  {"room_hidden", "app.mmhmm.togglebackground"},
	  {"presenter_mirrorVideo", "app.mmhmm.togglemirrorvideo"},
    {"presenter_effect_value", "app.mmhmm.presentereffectvalue"},
    {"presenter_effect", "app.mmhmm.presentereffect"},
    {"presenter_effects", "app.mmhmm.presentereffect"}, //-->this is not a mistake. we are mapping web effects into sd effect
    {"isRecording", "app.mmhmm.togglerecording"},
    {"media", "app.mmhmm.switchmedia"},
};

inline std::map<std::string, sdMask> stringToSdMask = {
    {"", sdMask::sd_none},
    {"rectangle", sdMask::sd_rectangle},
    {"circle", sdMask::sd_circle},
    {"silhouette", sdMask::sd_silhouette},
};

inline std::map<sdPresenterKey, std::string> sdPresenterKeyToJsKey = {
    {sdPresenterKey::sd_none, ""},
    {sdPresenterKey::sd_presenterMask, "presenter_mask"},
    {sdPresenterKey::sd_presenterOpacity, "presenter_opacity"},
    {sdPresenterKey::sd_presenterRotation, "presenter_rotation"},
    {sdPresenterKey::sd_presenterScale, "presenter_scale"},
    {sdPresenterKey::sd_presenterEnhancement, "presenter_enhancement"},
    {sdPresenterKey::sd_cameraZoom, "camera_zoom"},
    {sdPresenterKey::sd_nextSlide, "selectNextSlide()"},
    {sdPresenterKey::sd_previousSlide, "selectPreviousSlide()"},
    {sdPresenterKey::sd_cameraEnabled, "camera_enabled"},
    {sdPresenterKey::sd_microphoneEnabled, "microphone_enabled"},
    {sdPresenterKey::sd_bigHandsEnabled, "bigHands_enabled"},
    {sdPresenterKey::sd_toggleSlide, "slide_selected"},
    {sdPresenterKey::sd_switchRoom, "room"},
	  {sdPresenterKey::sd_presenterFullscreen, "presenter_fullScreen"},
	  {sdPresenterKey::sd_toggleBackground, "room_hidden"},
	  {sdPresenterKey::sd_toggleMirrorVideo, "presenter_mirrorVideo"},
    {sdPresenterKey::sd_presenterEffectValue, "presenter_effect_value"},
    {sdPresenterKey::sd_presenterEffect, "presenter_effect"},
    {sdPresenterKey::sd_presenterEffects, "presenter_effects"},
    {sdPresenterKey::sd_toggleRecording, "isRecording"},
    {sdPresenterKey::sd_switchMedia, "media"}};

inline std::string sdMaskToJSValue(sdMask value) {
  return sdMaskToJSString[value];
}

inline sdMask stringMaskToEnum(const std::string& str) {
  return stringToSdMask[str];
}

inline sdPresenterKey stringToPresenterEnum(const std::string& str) {
  return stringToSdPresenterKey[str];
}

inline std::string sdPresenterKeyToJsValue(sdPresenterKey key) {
  return sdPresenterKeyToJsKey[key];
}

inline std::string sdWebStringToActionString(std::string& webString) {
  return stringActionToSdStringKey[webString];
}

