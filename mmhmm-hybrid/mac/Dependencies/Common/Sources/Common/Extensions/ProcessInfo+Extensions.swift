//
//  ProcessInfo+Extensions.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 3/3/2023.
//

import Foundation

extension ProcessInfo {
	/// Returns a `String` representing the machine hardware name or "unknown" if there was an error
	/// Possible values include `arm64` for Apple Silicon, `x86_64` for 64 bit Intel.
	/// It's possible to return other values such as `arm` and `i386` however we don't support those so they should never happen.
	/// Return value is the equivalent to running `$ uname -m` in shell.
	public var architecture: String {
		var sysinfo: utsname = utsname()
		let result: Int32 = uname(&sysinfo)

		guard result == EXIT_SUCCESS else {
			return "unknown"
		}

		let data = Data(bytes: &sysinfo.machine, count: Int(_SYS_NAMELEN))
		guard let identifier = String(bytes: data, encoding: .ascii) else {
			return "unknown"
		}
		return identifier.trimmingCharacters(in: .controlCharacters)
	}

	/// Whether the process is running in a macOS sandbox.
	public static var isSandboxed: Bool {
		processInfo.environment["APP_SANDBOX_CONTAINER_ID"] != nil
	}

	/// The time interval since boot time in seconds.
	public static var timeSinceBoot: TimeInterval {
		get throws {
			var uptime = timespec()
			return if clock_gettime(CLOCK_MONOTONIC_RAW, &uptime) == noErr {
				TimeInterval(uptime.tv_sec) + TimeInterval(uptime.tv_nsec) / Double(NSEC_PER_SEC)
			} else {
				throw ErrNo()
			}
		}
	}

	/// The system's boot time as a date.
	public static var bootTime: Date {
		get throws {
			try Date().addingTimeInterval(-timeSinceBoot)
		}
	}
}
