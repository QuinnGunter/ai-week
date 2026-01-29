#pragma once

#include <optional>
#include <string>
#include <vector>

namespace mmhmm {
  struct Point2D {
    double x;
    double y;
  };

  struct Color {
    std::string color_hex;
    double opacity;

    /// Hex color as integer.
    uint32_t GetColor() const;

    /// Hex color string without leading `#`.
    std::string GetSanitizedHexColor() const;
  };

  struct WindowOverlayParticipant {
    std::string identifier;
    std::string name;
    Color color;
    Point2D coordinate;
  };

  enum class WindowOverlayTarget {
    /// Specifies a window.
    Window,
    /// Specifies a display.
    Display,
    /// Sentinel value.
    Count,
  };

  std::string ToString(WindowOverlayTarget target);
  std::optional<WindowOverlayTarget> WindowOverlayTargetFromString(const std::string& string);

  struct WindowOverlayInfo {
    std::vector<WindowOverlayParticipant> participants;
    int target_id;
    WindowOverlayTarget target;
  };

  struct WindowOverlayKeys {
    static const std::string dictionary;
    static const std::string identifier;
    static const std::string name;
    static const std::string color;
    static const std::string opacity;
    static const std::string x;
    static const std::string y;
    static const std::string debugIsEnabled;
  };

  struct WindowOverlayMessageNames {
    static const std::string drawCursors;
    static const std::string setDebugIsEnabled;
    static const std::string stateUpdate;
  };
}
