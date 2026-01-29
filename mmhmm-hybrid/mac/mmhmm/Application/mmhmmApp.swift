//
//  mmhmmApp.swift
//  mmhmm
//
//  Created by Beni Federer on 12.07.24.
//

import CxxCEF

// swiftlint:disable:next identifier_name
let Logger = ProductionLogger(withFileURL: URL.nativeAppLogFilePath)

// swiftlint:disable type_name
@main
struct mmhmmApp {
	// swiftlint:enable type_name

	@MainActor
	static var cefContext: CxxBridge.CEFLifetimeContext!

	static func main() throws {
		_ = Application.shared

		cefContext = createLifetimeContext()

		let delegate = AppDelegate()
		_ = NSApplication.shared
		Bundle.main.loadNibNamed("MainMenu", owner: delegate, topLevelObjects: nil)
		NSApp.delegate = delegate

		// Run the message loop. This will block until Quit() is called.
		let result = cefContext.runMessageLoop()
		exit(result)
	}

	private static func createLifetimeContext() -> CxxBridge.CEFLifetimeContext {
		// Load the CEF framework library at runtime instead of linking directly
		// as required by the macOS sandbox implementation.
		guard CEFHelpers.LoadCEFLibrary() == true else {
			fatalError("Failed to load CEF library.")
		}

		guard let shortVersionString: String = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String else {
			fatalError("Failed to retrieve version string.")
		}

		let cefCacheDirectory: String = URL.cefCacheDirectory.path(percentEncoded: false)
		let logFilePath: String = URL.webAppLogFilePath.path(percentEncoded: false)

		let parameters = CxxBridge.CEFLaunchParameters(argc: CommandLine.argc,
													   argv: CommandLine.unsafeArgv,
													   shortVersionNumberString: std.string(shortVersionString),
													   cachePath: std.string(cefCacheDirectory),
													   logFilePath: std.string(logFilePath))
		return CxxBridge.CEFLifetimeContext(parameters)
	}
}
