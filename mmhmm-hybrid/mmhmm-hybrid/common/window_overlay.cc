#include "window_overlay.h"

#include <array>
#include <sstream>

namespace mmhmm {
  const std::string WindowOverlayKeys::dictionary = "WindowOverlay.Key.State";
  const std::string WindowOverlayKeys::identifier = "identifier";
  const std::string WindowOverlayKeys::name = "name";
  const std::string WindowOverlayKeys::color = "color";
  const std::string WindowOverlayKeys::opacity = "opacity";
  const std::string WindowOverlayKeys::x = "x";
  const std::string WindowOverlayKeys::y = "y";
  const std::string WindowOverlayKeys::debugIsEnabled = "debugIsEnabled";
  const std::string WindowOverlayMessageNames::drawCursors = "WindowOverlay.Message.DrawCursors";
  const std::string WindowOverlayMessageNames::setDebugIsEnabled = "WindowOverlay.Message.SetDebugIsEnabled";
  const std::string WindowOverlayMessageNames::stateUpdate = "WindowOverlay.Message.StateUpdate";
}

namespace mmhmm {
  uint32_t HexToColor(const std::string& hex) {
      std::stringstream ss;
      ss << std::hex << hex;
      uint32_t color;
      ss >> color;
      return color;
  }

  std::string Color::GetSanitizedHexColor() const {
    std::string hexColor = color_hex;
    if (!hexColor.empty() && hexColor[0] == '#') {
        hexColor = hexColor.substr(1);
    }
    return hexColor;
  }

  uint32_t Color::GetColor() const {
    std::string hexColor = GetSanitizedHexColor();
    return HexToColor(hexColor);
  }
}

namespace mmhmm {
  constexpr std::array<const char*, 2> WindowOverlayTargetStrings = {
    "window",
    "screen",
  };

  static_assert(WindowOverlayTargetStrings.size() == static_cast<int>(WindowOverlayTarget::Count), "WindowOverlayTypeStrings size must match enum count");

  std::string ToString(WindowOverlayTarget target) {
    return WindowOverlayTargetStrings[static_cast<int>(target)];
  }

  std::optional<WindowOverlayTarget> WindowOverlayTargetFromString(const std::string& string) {
    if (string == "display") {
      // Backwards compatibility
      return WindowOverlayTarget::Display;
    }

    auto iter = std::find_if(WindowOverlayTargetStrings.begin(), WindowOverlayTargetStrings.end(),
        [&string](const char* iterated_string) { return string == iterated_string; });

    if (iter != WindowOverlayTargetStrings.end()) {
        int index = static_cast<int>(std::distance(WindowOverlayTargetStrings.begin(), iter));
        return static_cast<WindowOverlayTarget>(index);
    }
    return std::nullopt;
  }
}
