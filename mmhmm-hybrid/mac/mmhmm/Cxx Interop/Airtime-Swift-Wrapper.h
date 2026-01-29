// This wrapper includes the build artifact `Airtime-Swift.h` and forward-declares all cxx types re-exported by it.
//
// In order to export Swift functions to cxx, they must have `public` access control level. If these Swift
// functions use cxx types as arguments in their signature, they also are exported as part of `Airtime-Swift.h`
// back to cxx. If a cxx source file includes `Airtime-Swift.h`, but not the re-exported cxx types, this will
// cause a compiler error.

#pragma once

namespace mmhmm {
  struct Color;
  struct Point2D;
  struct Titlebar;
  struct WindowOverlayInfo;

  enum class LockState;
  enum class LoginItemInstallerStatus;
  enum class PowerMethod;
  enum class PowerState;
}
enum class WebAppType;

// For some reason forward declaring `mmhmm::SystemVideoEffectsStatus` does not work,
// although it is a simple struct and there a no differences in header includes or
// architectural use to similar structs that can be successfully forward declared.
#include "system_video_effects_monitor.h"

#include "Airtime-Swift.h"
