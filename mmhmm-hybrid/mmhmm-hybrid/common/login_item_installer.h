#pragma once

#include <optional>
#include <string>

namespace mmhmm {
  enum class LoginItemInstallerStatus {
    /// The status can't be determined.
    Unavailable,
    /// The login item is not installed.
    NotInstalled,
    /// The login item is installed and enabled.
    Enabled,
    /// The login item is installed but disabled.
    Disabled,
    /// Sentinel value.
    Count,
  };

  std::string ToString(LoginItemInstallerStatus status);
  std::optional<LoginItemInstallerStatus> FromString(const std::string& string);

  struct LoginItemInstallerKeys {
    static const std::string dictionary;
    static const std::string status;
  };

  struct LoginItemInstallerMessageNames {
    static const std::string stateUpdate;
    static const std::string install;
    static const std::string uninstall;
  };
}
