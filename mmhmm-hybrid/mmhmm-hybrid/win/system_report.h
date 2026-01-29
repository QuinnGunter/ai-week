//
// mmhmm Windows
// Copyright © 2020-2024 mmhmm, inc. All rights reserved.
//
#pragma once

#include <string>

namespace mmhmm {

std::wstring GenerateSystemReport(std::wstring user_id,
                                  std::wstring user_email,
                                  std::wstring video_device,
                                  std::wstring audio_device);
}
