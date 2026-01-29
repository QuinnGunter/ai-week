#include "login_item_installer.h"
#include <array>

namespace mmhmm {
  constexpr std::array<const char*, 4> LoginItemInstallerStatusStrings = {
    "unavailable",
    "notInstalled",
    "enabled",
    "disabled"
  };

  static_assert(LoginItemInstallerStatusStrings.size() == static_cast<int>(LoginItemInstallerStatus::Count), "LoginItemInstallerStatusStrings size must match enum count");

  std::string ToString(LoginItemInstallerStatus status) {
    return LoginItemInstallerStatusStrings[static_cast<int>(status)];
  }

  std::optional<LoginItemInstallerStatus> FromString(const std::string& string) {
    auto iter = std::find_if(LoginItemInstallerStatusStrings.begin(), LoginItemInstallerStatusStrings.end(),
        [&string](const char* iterated_string) { return string == iterated_string; });

    if (iter != LoginItemInstallerStatusStrings.end()) {
        int index = static_cast<int>(std::distance(LoginItemInstallerStatusStrings.begin(), iter));
        return static_cast<LoginItemInstallerStatus>(index);
    }
    return std::nullopt;
  }
}

namespace mmhmm {
  const std::string LoginItemInstallerKeys::dictionary = "LoginItemInstaller.Key.State";
  const std::string LoginItemInstallerKeys::status = "LoginItemInstaller.Key.Status";
  const std::string LoginItemInstallerMessageNames::stateUpdate = "LoginItemInstaller.Message.StateUpdate";
  const std::string LoginItemInstallerMessageNames::install = "LoginItemInstaller.Message.Install";
  const std::string LoginItemInstallerMessageNames::uninstall = "LoginItemInstaller.Message.Uninstall";
}
