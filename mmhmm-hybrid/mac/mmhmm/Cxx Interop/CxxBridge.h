//
//  CxxBridge.hpp
//  mmhmm
//
//  Created by Beni Federer on 09.07.24.
//

#ifndef CxxBridge_hpp
#define CxxBridge_hpp

#include <optional>
#include <memory>
#include <string>
#include <swift/bridging>

#include "browser/main_context_impl.h"
#include "browser/resource.h"
#include <CoreGraphics/CGGeometry.h>

/// This is the bridging layer connecting the Cocoa world to the CEF world.
///
/// So far, Swift does not allow calling API of the abstract C++ classes
/// passed around with CEF API. These slumber in concrete subclasses like
/// `<AbstractClass>CToCpp`, which Swift refuses to recognize as valid
/// overloads of the abstract classes' virtual members. Swift is simply not
/// as gullible as a C++ compiler has to be. It's also very possible this
/// author just hasn't fully wrapped his head around the matter at hand.
///
/// This bridge does the needful in C++ and exposes it to become usable in Swift.
/// When in doubt, consult the documentation at https://www.swift.org/documentation/cxx-interop
namespace CxxBridge {
	using VectorOfStrings = std::vector<std::string>;

	struct CEFLaunchParameters {
		const int argc;
		char** argv;
		const std::string shortVersionNumberString;
		const std::string cachePath;
		const std::string logFilePath;
	};

	struct CEFLifetimeContextImpl;
	
	/// A wrapper that manages and holds CEF's message loop and main context.
	class CEFLifetimeContext {
	public:
		CEFLifetimeContext(CEFLaunchParameters parameters);
		
		/// Starts the message loop and blocks until `quit()` is called.
		///
		/// - Note: This function is `const` because of Swift,
		///         but manipulates the contents of `pimpl_`.
		int runMessageLoop() const;

		/// Ends the message loop asynchronously.
		int quit() const;
	private:
		/// A pointer to the wrapped implementation.
		///
		/// - Note: Swift does not (yet) support `unique_ptr`,
		///         therefore divert to a `shared_ptr` to an opaque impl.
		std::shared_ptr<CEFLifetimeContextImpl> pimpl_;
	};

	class CEFState {
	public:
		// Swift doesn't seem to support computed class properties, at least yet.
		// Leaving the `get` prefix and the `SWIFT_COMPUTED_PROPERTY` macro for future improvements to cxx-interop.

		/// Determines whether the web app supports the (new) web remote control.
		///
		/// - Returns: `true` if the remote control is supported, `false` otherwise. Also `false` if any instance being queried is `null`.
		static bool getSupportsRemoteControl() SWIFT_COMPUTED_PROPERTY;

		/// The default main app URL.
		static std::string getDefaultMainAppURL() SWIFT_COMPUTED_PROPERTY;
	};

	/// A wrapper for the options of `RootWindowConfig` that are being used by mmhmm.
	///
	/// This wrapper is only necessary, because contrary to Xcode 16, Xcode 15.4 is unable
	/// to see `client::RootWindowConfig`, even when importing `browser/root_window.h` directly.
	struct CEFRootWindowConfig {
		CGRect bounds;
		std::string url;
		bool initiallyHidden;
		bool withControls;
		WebAppType webAppType;
	};

	/// Creates a new root window.
	///
	/// - Parameters:
	///   - windowConfig: The window config to use.
	/// - Returns: `true` if root window was successfully created, `false` otherwise.
	bool createRootWindow(CEFRootWindowConfig windowConfig);
	void closeAllWindows(bool force);

	/// Retrieves the web app passed as a command line flag, if any.
	///
	/// The app mode to launch into can be request with the `--web-app`
	/// command line flag, e.g.:
	///
	/// ```
	/// --web-app=Camera
	/// --web-app=Stacks
	/// ```
	std::optional<WebAppType> getStartupRequestWebApp();

	// MARK: - Update gHybrid State

	void updateAppCapabilities(mmhmm::AppCapabilities appCapabilities);
	void updateAppWindows(mmhmm::AppWindows appWindows);
	void updateVirtualCamera(mmhmm::VirtualCamera virtualCamera);
	void notifyHybridOfTitlebarButtonClicked();
	void notifyHybridOfTitlebarToolboxButtonClicked();
	void notifyHybridOfLoginItemStatusChange();
	void notifyHybridOfPowerMonitorChange(mmhmm::PowerMonitor powerMonitor);
	void notifyHybridOfWebAppCallbackData(WebAppType webAppType, std::string dataString, std::string fragmentString);
	void notifyHybridOfSystemVideoEffectsStatusChange(mmhmm::SystemVideoEffectsStatus status);

	// MARK: - Browser Communication

	client::RootWindowManager* getRootWindowManager();
	scoped_refptr<client::RootWindow> getWindowForBrowser(int browserID);
	CefRefPtr<CefBrowser> getBrowser(int browserID);

	enum class ReloadStrategy {
		Soft,
		HardIgnoringCache,
	};

	bool reloadBrowser(int browserID, ReloadStrategy strategy);
	bool setBalancedMode(int browserID, bool isEnabled);
	bool undoInBrowser(int browserID);
	bool redoInBrowser(int browserID);

	/// Enables or disables the accessibility state for the given browser.
	bool setAccessibilityState(int browserID, bool enable);

	/// Executes the given JavaScript on the the main web app's main frame.
	/// 
	/// - Parameter javaScript: The script to execute.
	/// - Returns: `false` if the main web app or its main frame are unavailable, `true` otherwise.
	bool executeJavaScript(int browserID, std::string javaScript);

	void emitEvent(int browserID, std::string eventName, std::string jsonPayload);

	/// Opens the internal hybrid API tester web page.
	void openHybridAPITester(int browserID);

	/// Opens the internal hybrid segmentation settings panel.
	void openSegmentationPanel(int browserID);

	/// Opens the toolbox web page, which is used to switch between app modes.
	void openToolbox(int browserID);

	/// Shows the Chromium Dev Tools.
	void showDevTools(int browserID);
}

#endif /* CxxBridge_hpp */
