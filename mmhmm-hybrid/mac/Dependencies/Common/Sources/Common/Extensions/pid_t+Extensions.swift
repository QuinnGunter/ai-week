//
//  pid_t+Extensions.swift
//  Common
//
//  Created by Beni Federer on 10.06.24.
//

import Darwin

extension pid_t {
	public var processName: String {
		get throws {
			let processPath: String = try processPath
			guard processPath.isEmpty == false else {
				throw Error.emptyProcessPath
			}
			let components: [String] = processPath.components(separatedBy: "/")
			guard let lastPathComponent: String = components.last, lastPathComponent.isEmpty == false else {
				// Process path ended in '/', which is unexpected and probably result of a system-incurred
				// race condition, but nothing can't happen when it comes to processes.
				throw Error.unexpectedProcessPath(path: processPath)
			}
			return lastPathComponent
		}
	}

	public var processPath: String {
		get throws {
			let maxPathLength = Int(MAXPATHLEN)
			return try String(unsafeUninitializedCapacity: maxPathLength) { buffer in
				let result: Int32 = proc_pidpath(self, buffer.baseAddress, UInt32(maxPathLength))
				guard result >= 0 else {
					let errno: Int32 = errno
					let message = String(cString: strerror(errno))
					throw Error.errno(code: errno, message: message)
				}
				return Int(result)
			}
		}
	}
}

extension pid_t {
	public enum Error: Swift.Error {
		case emptyProcessPath
		case errno(code: Int32, message: String)
		case unexpectedProcessPath(path: String)
	}
}
