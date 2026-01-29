//
//  LoginItemInstaller+Hybrid.swift
//  mmhmm
//
//  Created by Beni Federer on 03.06.25.
//

/// Bridges `LoginItemInstaller` to cxx-interop.
public struct LoginItemInstallerBridge {
	/// Zero sized value types cannot be exposed to C++ yet.
	public let cxxInteropDummy: String = ""

	public static var status: mmhmm.LoginItemInstallerStatus {
		MainActor.assumeIsolated {
			loginItemInstaller.status.hybridStatus
		}
	}

	public static func install() -> mmhmm.LoginItemInstallerStatus {
		MainActor.assumeIsolated {
			loginItemInstaller.install()
			return loginItemInstaller.status.hybridStatus
		}
	}

	public static func uninstall() -> mmhmm.LoginItemInstallerStatus {
		MainActor.assumeIsolated {
			loginItemInstaller.uninstall()
			return loginItemInstaller.status.hybridStatus
		}
	}
}

extension LoginItemInstallerBridge {
	@MainActor
	private static var loginItemInstaller: LoginItemInstaller {
		Application.cefAppDelegate.loginItemInstaller
	}
}

extension LoginItemInstaller.Status {
	fileprivate var hybridStatus: mmhmm.LoginItemInstallerStatus {
		switch self {
		case .unavailable: mmhmm.LoginItemInstallerStatus.Unavailable
		case .notInstalled: mmhmm.LoginItemInstallerStatus.NotInstalled
		case .enabled: mmhmm.LoginItemInstallerStatus.Enabled
		case .disabled: mmhmm.LoginItemInstallerStatus.Disabled
		}
	}
}
