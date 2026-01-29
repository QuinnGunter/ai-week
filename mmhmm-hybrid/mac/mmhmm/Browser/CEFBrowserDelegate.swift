//
//  CEFBrowserDelegate.swift
//  mmhmm
//
//  Created by Beni Federer on 09.09.24.
//

import AppKit

@MainActor
protocol CEFBrowserDelegate: AnyObject {
	/// Called on the delegate when a new CEF browser
	/// was created.
	///
	/// On browser creation, a native window containing
	/// the rendered browser content becomes available.
	/// The represented web app type is also deduced from
	/// the URL the browser is currently loading. Both
	/// values are provided to the delegate as part of
	/// the `result` parameter.
	///
	/// If CEF fails to provide a handle to the native
	/// window, or the loaded URL does not represent a
	/// known web app type, the result will contain an
	/// error.
	///
	/// - Parameter result: The creation info or an error.
	func browserWasCreated(withResult result: Result<CEFBrowser.CreationInfo, CEFBrowser.Error>)

	/// Called on the delegate when a CEF browser started
	/// browsing to a URL representing the specified web app.
	///
	/// If the browsed to URL does not represent a known
	/// web app type, the result will contain an error.
	///
	/// - Parameter result: The browsing info or and error.
	func browserDidStartBrowsing(withResult result: Result<CEFBrowser.BrowsingInfo, CEFBrowser.Error>)

	/// Called on the delegate when a CEF browser successfully
	/// finished loading a URL.
	///
	/// The browser's represented web app type is deduced
	/// from the URL the browser successfully loaded. This
	/// value and the associated HTTP status code are provided
	/// to the delegate as part of the `result` parameter.
	///
	/// - Parameter result: The load info or an error.
	func browserDidFinishLoading(withResult result: Result<CEFBrowser.LoadInfo, CEFBrowser.Error>)

	/// Called on the delegate when a CEF browser receives
	/// an URL, which should be loaded by the system's default
	/// browser.
	///
	/// - Parameter url: The URL to navigate to.
	func navigateToExternalURL(_ url: URL)

	/// Called on the delegate to determine whether a given
	/// window can be closed.
	///
	/// - Parameter window: The window to check.
	/// - Returns: `true` if the window can be closed, `false` otherwise
	func canCloseWindow(_ window: NSWindow) -> Bool

	/// Called on the delegate when a window was closed.
	///
	/// - Parameter webApp: The web app type the closed window belonged to.
	func windowDidClose(forWebApp webApp: WebApp.WebAppType)
}
