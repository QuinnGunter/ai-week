#include "file_version.h"
#include <sstream>

namespace mmhmm
{
	FileVersion::FileVersion() :
		major_(0),
		minor_(0),
		build_(0),
		revision_(0)
	{

	}

	FileVersion::FileVersion(int major, int minor, int build, int revision) :
		major_(major),
		minor_(minor),
		build_(build),
		revision_(revision)
	{

	}

	std::wstring FileVersion::ToWString()
	{
		std::wstringstream versionStream;
		versionStream << major_ << L"." << minor_ << L"." << build_ << "." << revision_;
		return versionStream.str();
	}
}