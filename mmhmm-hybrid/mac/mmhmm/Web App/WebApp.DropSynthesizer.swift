//
//  WebApp.DropSynthesizer.swift
//  mmhmm
//
//  Created by Beni Federer on 28.07.25.
//

import Foundation

import Common
import UniformTypeIdentifiers

@MainActor
protocol FileDropReceiver: AnyObject {
	func drop(urls: [URL]) throws
}

extension FileDropReceiver where Self: WebAppProtocol {
	/// Drops the given URLs into all web apps.
	///
	/// - Parameter urls: The URLs to drop
	/// - Throws: Any error from the JavaScript synthesis or execution.
	func drop(urls: [URL]) throws {
		let javaScript: String = try WebApp.DropEventSynthesizer.synthesizeDropEvent(containing: urls)
		try javaScriptExecutor.execute(javaScript: javaScript)
	}
}

extension WebApp {
	class DropEventSynthesizer {
		/// Synthesizes a JavaScript drop event with a file list.
		///
		/// - Parameters:
		///   - urls: Array of file URLs to drop.
		///   - point: The point where the drop event should occur, defaults to `CGPoint(x: 100, y: 100)`.
		/// - Returns: A JavaScript string that synthesizes the drop event.
		static func synthesizeDropEvent(containing urls: [URL], at point: CGPoint = CGPoint(x: 100, y: 100)) throws -> String {
			try generateDropEvent(urls: urls, xCoordinate: Int(point.x), yCoordinate: Int(point.y))
		}
	}
}

extension WebApp.DropEventSynthesizer {
	// swiftlint:disable:next function_body_length
	private static func generateDropEvent(urls: [URL], xCoordinate: Int, yCoordinate: Int) throws -> String {
		var javaScript: String = """
		(function() {
		  try {
			var files = [];
		"""

		for (index, url) in urls.enumerated() {
			let filename: String = url.lastPathComponent.javaScriptEscaped
			let mimeType: String = url.mimeType ?? "application/octet-stream"
			let path: String = url.path.javaScriptEscaped
			let fileContent: String = try url.base64FileContent.javaScriptEscaped

			javaScript += """
				try {
				  var fileContent;
				  var mimeType = '\(mimeType)';
				  fileContent = Uint8Array.from(atob('\(fileContent)'), c => c.charCodeAt(0));

				  var file\(index) = new File([fileContent], '\(filename)', {
					type: mimeType,
					lastModified: Date.now()
				  });

				  console.log('Synthesized drop file \(index) - name:', file\(index).name, 'size:', file\(index).size, 'type:', file\(index).type);

				  // Add path property
				  Object.defineProperty(file\(index), 'path', {
					value: '\(path)',
					writable: false,
					enumerable: true
				  });

				  files.push(file\(index));
				} catch(e) {
				  console.error('Error creating file \(index):', e);
				}
			"""
		}

		javaScript += """
			console.log('Creating DataTransfer for total drop files synthesized:', files.length);

			var dataTransfer = new DataTransfer();
			for (var i = 0; i < files.length; i++) {
			  console.log('Adding file', i, 'to DataTransfer - size:', files[i].size);
			  dataTransfer.items.add(files[i]);
			}

			var dragEnterEvent = new DragEvent('dragenter', {
			  bubbles: true,
			  cancelable: true,
			  clientX: \(xCoordinate),
			  clientY: \(yCoordinate),
			  dataTransfer: dataTransfer
			});

			var dragOverEvent = new DragEvent('dragover', {
			  bubbles: true,
			  cancelable: true,
			  clientX: \(xCoordinate),
			  clientY: \(yCoordinate),
			  dataTransfer: dataTransfer
			});

			var dropEvent = new DragEvent('drop', {
			  bubbles: true,
			  cancelable: true,
			  clientX: \(xCoordinate),
			  clientY: \(yCoordinate),
			  dataTransfer: dataTransfer
			});

			var targetElement = document.elementFromPoint(\(xCoordinate), \(yCoordinate)) || document.body;
			console.log('Target element:', targetElement.tagName);

			targetElement.dispatchEvent(dragEnterEvent);
			targetElement.dispatchEvent(dragOverEvent);
			targetElement.dispatchEvent(dropEvent);

			console.log('Drop events dispatched.');
		  } catch(error) {
			console.error('Dispatching drop events failed:', error);
			console.error('Stack trace:', error.stack);
		  }
		})();
		"""

		return javaScript
	}
}
