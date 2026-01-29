#include "system_report.h"
#include "app_settings_service.h"
#include "app_track.h"
#include "system_info.h"

#include <windows.h>
#include <sstream>

namespace mmhmm {

constexpr inline std::wstring_view Divider =
    L"------------------------------------------------";
constexpr inline double Gigabyte = 1073741824;

std::wstring GenerateSystemReport(std::wstring user_id,
                                  std::wstring user_email,
                                  std::wstring video_device,
                                  std::wstring audio_device) {
  std::wstringstream stream;
  stream << "APPLICATION:" << std::endl;
  stream << "Version: "
         << mmhmm::AppSettingsService::GetFileVersion().ToWString()
         << std::endl;
  stream << "Track: " << mmhmm::AppTrackService::get_app_track_label()
         << std::endl;
  stream << std::endl;
  stream << Divider.data() << std::endl;
  stream << std::endl;
  stream << "SYSTEM:" << std::endl;
  stream << "OS: " << GetOS() << " " << std::endl;
  stream << "Architecture: x64" << std::endl;
  stream << "Processor: " << GetProcessor() << std::endl;
  stream << "Processor Cores: " << GetNumCores() << std::endl;
  stream << "Model: " << GetManufacturerName() << " " << GetModelName()
         << std::endl;
  stream << "GPU: " << GetPrimaryGfxCardName() << std::endl;
  auto memory_usage = GetFreeRAM();
  auto total =
      std::to_wstring((int)round((double)memory_usage.Total / Gigabyte));
  auto available =
      std::to_wstring((int)round((double)memory_usage.Available / Gigabyte));
  stream << "Memory: " << available << " GB \\ " << total << " GB" << std::endl;

  auto disk_usage = GetCurrentDiskSpace();
  auto used_bytes = disk_usage.Total - disk_usage.Available;
  stream << "Storage: "
         << std::to_wstring((int)round((double)used_bytes / Gigabyte))
         << " GB \\ "
         << std::to_wstring((int)round((double)disk_usage.Total / Gigabyte))
         << " GB" << std::endl;

  stream << "Up Time: " << GetFormattedUpTime() << std::endl;
  stream << std::endl;
  stream << Divider.data() << std::endl;
  stream << std::endl;
  stream << "DEVICES: " << std::endl;
  stream << "Active Camera: " << video_device << std::endl;
  stream << "Active Microphone: " << audio_device << std::endl;
  stream << std::endl;
  stream << Divider.data() << std::endl;
  stream << std::endl;
  stream << "ACCOUNT:" << std::endl;
  stream << "Id: " << user_id << std::endl;
  stream << "Email: " << user_email << std::endl;

  auto system_report = stream.str();
  return system_report;
}
}  // namespace mmhmm
