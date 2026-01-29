#pragma once

enum class sdMask : int { 
  sd_none = 0, 
  sd_rectangle = 1, 
  sd_circle = 2, 
  sd_silhouette = 3 
};

enum class sdPresenterKey : int {
  sd_none = 0,
  sd_presenterMask = 1,
  sd_presenterOpacity = 2,
  sd_presenterRotation = 3,
  sd_presenterScale = 4,
  sd_presenterEnhancement = 5,
  sd_cameraZoom = 6,
  sd_cameraEnabled = 7,
  sd_microphoneEnabled = 8,
  sd_bigHandsEnabled = 9,
  sd_nextSlide = 10,
  sd_previousSlide = 11,
  sd_toggleSlide = 12,
  sd_switchRoom = 13,
  sd_presenterFullscreen = 14,
  sd_toggleBackground = 15,
  sd_toggleMirrorVideo = 16,
  sd_presenterEffect = 17,
  sd_presenterEffectValue = 18,
  sd_toggleRecording = 19,
  sd_presenterEffects = 20,
  sd_switchMedia = 21,
};
