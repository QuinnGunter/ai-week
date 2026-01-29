//
// mmhmm Windows
// Copyright © 2020-2023 mmhmm, inc. All rights reserved.
//
#pragma once

#include <string>

namespace mmhmm
{
	class FileVersion
	{
	public:
		FileVersion();
		FileVersion(int major, int minor, int build, int revision);
		~FileVersion() {}

		int Major() { return major_; }
		int Minor() { return minor_; }
		int Build() { return build_; }
		int Revision() { return revision_; }

		void SetMajor(int major) { major_ = major; }
		void SetMinor(int minor) { minor_ = minor; }
		void SetBuild(int build) { build_ = build; }
		void SetRevision(int revision) { revision_ = revision; }

		std::wstring ToWString();

		friend bool operator< (const FileVersion& lhs, const FileVersion& rhs)
		{
			if (lhs.major_ < rhs.major_) return true;
			if (lhs.major_ > rhs.major_) return false;

			if (lhs.minor_ < rhs.minor_) return true;
			if (lhs.minor_ > rhs.minor_) return false;

			if (lhs.build_ < rhs.build_) return true;
			if (lhs.build_ > rhs.build_) return false;

			if (lhs.revision_ < rhs.revision_) return true;
			if (lhs.revision_ > rhs.revision_) return false;

			return false;
		}

		friend bool operator> (const FileVersion& lhs, const FileVersion& rhs) { return rhs < lhs; }
		friend bool operator<=(const FileVersion& lhs, const FileVersion& rhs) { return !(lhs > rhs); }
		friend bool operator>=(const FileVersion& lhs, const FileVersion& rhs) { return !(lhs < rhs); }

		friend bool operator==(const FileVersion& lhs, const FileVersion& rhs)
		{
			return lhs.major_ == rhs.major_ &&
				lhs.minor_ == rhs.minor_ &&
				lhs.build_ == rhs.build_ &&
				lhs.revision_ == rhs.revision_;
		}

		friend bool operator!=(const FileVersion& lhs, const FileVersion& rhs) { return !(lhs == rhs); }

	private:
		int major_;
		int minor_;
		int build_;
		int revision_;
	};
}
