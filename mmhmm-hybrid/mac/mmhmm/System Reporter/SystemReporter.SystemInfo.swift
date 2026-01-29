//
//  SystemReporter.SystemInfo.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 18/11/2022.
//

import Metal

extension SystemReporter {
	struct SystemInfo {
		let cpuArch: String
		let cpuCores: String
		let gpuName: String
		let memory: String
		let model: String
		let os: String
		let osVersion: String

		init() {
			let processInfo: ProcessInfo = ProcessInfo.processInfo
			let osVersionInfo: OperatingSystemVersion = processInfo.operatingSystemVersion

			os = "mac"
			osVersion = "\(osVersionInfo.majorVersion).\(osVersionInfo.minorVersion).\(osVersionInfo.patchVersion)"
			cpuCores = String(processInfo.processorCount)
			cpuArch = (try? Sysctl.string(for: [CTL_HW, HW_MACHINE])) ?? "unknown"
			memory = String(processInfo.physicalMemory / (1024 * 1024 * 1024))
			model = (try? Sysctl.string(for: [CTL_HW, HW_PRODUCT])) ?? "unknown"
			gpuName = if let metalDevice = MTLCreateSystemDefaultDevice() {
				metalDevice.name
			} else {
				"unavailable"
			}
		}

		var dictionaryRepresentation: [String: String] {
			[
				"os": os,
				"osVersion": osVersion,
				"cpuCores": cpuCores,
				"cpuArch": cpuArch,
				"memory": memory,
				"model": model,
				"gpuName": gpuName,
			]
		}
	}
}
