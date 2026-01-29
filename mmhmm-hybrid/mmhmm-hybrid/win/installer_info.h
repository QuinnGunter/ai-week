//
// mmhmm Windows
// Copyright © 2020-2023 mmhmm, inc. All rights reserved.
//
#pragma once

#include <string>
#include "file_version.h"

namespace mmhmm
{
	class InstallerInfo
	{
	public:
		InstallerInfo() {}
		~InstallerInfo() {}

    FileVersion MarketingVersion;
		FileVersion FileVersion;
		std::wstring InstallerName;
		std::wstring DownloadPath;
	};
}
