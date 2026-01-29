//
//  WebApp.JavaScriptExecutor.swift
//  mmhmm
//
//  Created by Beni Federer on 11.10.24.
//

import Foundation

import Common

extension WebApp {
	private static let unknownBrowserID: Int32 = -1

	@MainActor
	final class JavaScriptExecutor {
		/// Executes JavaScript synchronously.
		///
		/// - Parameter javaScript: The JavaScript to execute.
		func execute(javaScript: String) throws {
			guard browserID != WebApp.unknownBrowserID else {
				throw Error.browserUnavailable
			}

			let scopedJavaScript: String = "async function mmhmm_runNative() { \(javaScript) } mmhmm_runNative();"
			guard CxxBridge.executeJavaScript(browserID, std.string(scopedJavaScript)) else {
				throw Error.browserFrameUnavailable
			}
		}

		var browserID: Int32 = WebApp.unknownBrowserID {
			didSet {
				Logger.logMessage("Set browser ID to \(browserID)", level: .debug)
			}
		}

		private typealias ContextHandler = (_ json: String) -> Void
		private var contextMap: [UUID: ContextHandler] = [:]

		/// Resets the executor to its initial state.
		func reset() {
			browserID = WebApp.unknownBrowserID
			contextMap.removeAll()
		}

		/// Executes JavaScript asynchronously, returning a value.
		///
		/// - Parameter javaScript: The JavaScript to execute.
		/// - Returns: The value returned from the JavaScript.
		func execute<T: Sendable>(javaScript: String) async throws -> T {
			let contextIdentifier = UUID()
			let scopedJavaScript: String = constructJavaScript(
				calling: javaScript,
				identifier: contextIdentifier.uuidString
			)

			defer {
				contextMap[contextIdentifier] = nil
			}

			let value: T = try await withCheckedThrowingContinuation { continuation in
				let handler: ContextHandler = { (json: String) in
					do {
						let jsonValues: Any = try JSONSerialization.jsonObject(with: Data(json.utf8), options: .fragmentsAllowed)

						guard let dictionary = jsonValues as? [String: Any], let success = dictionary["success"] as? Bool else {
							continuation.resume(throwing: WebApp.JavaScriptExecutor.Error.missingReturnValueEnvelope)
							return
						}

						guard success else {
							let errorDictionary = dictionary["error"] as? [String: Any]
							let message = (errorDictionary?["message"] as? String) ?? "Unknown error"
							let name = (errorDictionary?["name"] as? String) ?? "Unknown name"
							continuation.resume(throwing: WebApp.JavaScriptExecutor.Error.javaScriptError(message: "\(message) (\(name))"))
							return
						}

						if let typedValue = dictionary["value"] as? T {
							continuation.resume(returning: typedValue)
						} else if dictionary["value"] is NSNull, let nilValue = (nil as Any?) as? T {
							continuation.resume(returning: nilValue)
						} else {
							continuation.resume(throwing: WebApp.JavaScriptExecutor.Error.mismatchedReturnTypes)
						}
					} catch {
						continuation.resume(throwing: error)
					}
				}

				contextMap[contextIdentifier] = handler

				do {
					try execute(javaScript: scopedJavaScript)
				} catch {
					continuation.resume(throwing: error)
				}
			}

			return value
		}

		/// Called with the return value of JavaScript passed into `execute(javaScript:) -> T`.
		///
		/// This method calls a `ContextHandler` in `contextMap`, which waits for continuation
		/// in `execute(javaScript:) -> T`.
		///
		/// - Parameters:
		///   - contextIdentifier: A context identifier associated with a `ContextHandler` in `contextMap`.
		///   - json: The JSON return value to handle.
		func handleNativeCallbackRequest(withContextIdentifier contextIdentifier: String, json: String) {
			guard let contextUUID = UUID(uuidString: contextIdentifier), let handler: ContextHandler = contextMap[contextUUID] else {
				Logger.logMessage("Could not find context handler with identifier \(contextIdentifier)", level: .error)
				return
			}

			handler(json)
		}

		private func constructJavaScript(calling javascriptCode: String, identifier: String) -> String {
			"""
			function execute() { \(javascriptCode) }
			let envelope;
			function safeNormalize(value) {
				if (typeof value === 'undefined') {
					return "";
				}
				if (typeof value === 'number' && (!Number.isFinite(value) || Number.isNaN(value))) {
					return "";
				}
				if (typeof value === 'function' || typeof value === 'symbol') {
					return "";
				}
				return value;
			}
			try {
				const returnValue = await execute();
				const normalized = safeNormalize(returnValue);
				envelope = { success: true, value: normalized };
				let jsonPayload = JSON.stringify(envelope, function(key, val) { return safeNormalize(val); });
				window.mmhmm_nativeCallback("\(identifier)", jsonPayload);
			} catch (err) {
				const errorInfo = {
					message: (err && err.message) ? String(err.message) : "Unknown error",
					name: (err && err.name) ? String(err.name) : "Error",
					stack: (err && err.stack) ? String(err.stack) : undefined
				};
				envelope = { success: false, error: errorInfo };
				let jsonPayload;
				try {
					jsonPayload = JSON.stringify(envelope);
				} catch (_) {
					jsonPayload = "{\\\"success\\\":false,\\\"error\\\":{\\\"message\\\":\\\"Failed to serialize error\\\"}}";
				}
				console.error('execute() failed:', err);
				window.mmhmm_nativeCallback("\(identifier)", jsonPayload);
			}
			"""
		}
	}
}

extension WebApp.JavaScriptExecutor {
	enum Error {
		case browserUnavailable
		case browserFrameUnavailable
		case javaScriptError(message: String)
		case mismatchedReturnTypes
		case missingReturnValueEnvelope
	}
}

extension WebApp.JavaScriptExecutor.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Self.self)

	static let allCases: [WebApp.JavaScriptExecutor.Error] = [
		.browserUnavailable,
		.browserFrameUnavailable,
		.javaScriptError(message: "Example error"),
		.mismatchedReturnTypes,
		.missingReturnValueEnvelope,
	]

	var errorMessage: String {
		switch self {
		case .browserUnavailable: return "The browser is unavailable."
		case .browserFrameUnavailable: return "The browser frame is unavailable."
		case let .javaScriptError(message): return "JavaScript error: \(message)"
		case .mismatchedReturnTypes: return "The return types do not match."
		case .missingReturnValueEnvelope: return "The return value envelope is missing."
		}
	}
}
