//
//  StreamDeckConnection.swift
//  mmhmm
//
//  Created by Martin Pilkington on 20/06/2023.
//

import Foundation

import Common

protocol StreamDeckConnectionDelegate: AnyObject {
	func connection(_ connection: StreamDeckConnection, didEncounterError: Error)
}

// TODO: @unchecked Sendable is a temporary fix to silence concurrency warnings.
// Realistically, this should become an `actor`, not a `Sendable`, and lose the `NSObjectProtocol` conformance.
class StreamDeckConnection: NSObject, @unchecked Sendable {
	@Published private(set) var connected: Bool = false

	weak var delegate: StreamDeckConnectionDelegate?

	func start() {
		openConnection()
		startRetryTimer()
	}

	func stop() {
		retryTimer = nil
		closeConnection()
	}

	// MARK: - Messages
	var receivedMessages: AsyncStream<StreamDeckMessage> {
		return AsyncStream(StreamDeckMessage.self) { [weak self] (continuation: AsyncStream<StreamDeckMessage>.Continuation) in
			let id = UUID()
			self?.receivedMessageContinuations[id] = continuation
			continuation.onTermination = { [weak self] _ in
				self?.receivedMessageContinuations[id] = nil
			}
		}
	}

	private var receivedMessageContinuations: [UUID: AsyncStream<StreamDeckMessage>.Continuation] = [:]

	// MARK: - Connection Management
	private static let streamDeckPort: Int = 8876

	private var state: State = .closed

	private func openConnection() {
		guard case .closed = state else {
			return
		}

		var readStream: Unmanaged<CFReadStream>?
		var writeStream: Unmanaged<CFWriteStream>?
		// TODO: Look into NWConnection instead of streams
		CFStreamCreatePairWithSocketToHost(nil, "localhost" as CFString, UInt32(Self.streamDeckPort), &readStream, &writeStream)

		guard let readStream, let writeStream else {
			return
		}

		let input = readStream.takeRetainedValue() as InputStream
		input.delegate = self
		input.schedule(in: .current, forMode: .common)
		input.open()

		let output = writeStream.takeRetainedValue() as OutputStream
		output.delegate = self
		output.schedule(in: .current, forMode: .common)
		output.open()

		state = .starting(input, output)
	}

	private func closeConnection() {
		switch state {
		case .closed:
			return
		case let .open(inputStream, outputStream),
			 let .awaitingHandshake(inputStream, outputStream),
			 let .starting(inputStream, outputStream):
			handshakeTimeoutWorkItem?.cancel()
			handshakeTimeoutWorkItem = nil
			inputStream.close()
			outputStream.close()
			inputStream.remove(from: .current, forMode: .common)
			outputStream.remove(from: .current, forMode: .common)
		}
		state = .closed
		startRetryTimer()
	}

	// MARK: - Handshake
	private let handshakeTimeout: TimeInterval = 5
	private var handshakeTimeoutWorkItem: DispatchWorkItem?

	func sendHandshake() throws {
		guard case let .starting(inputStream, outputStream) = state else {
			throw Error.invalidState(expectedState: "starting", observedState: state.description, logIdentifier: "Sending handshake")
		}

		let handshake: [String: Any] = [
			HandshakeKeys.handshake.rawValue: [
				HandshakeKeys.appVersion.rawValue: Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") ?? "0",
				HandshakeKeys.apiVersion.rawValue: StreamDeckManager.apiVersion,
			],
		]

		let handshakeData = try JSONSerialization.data(withJSONObject: handshake)
		try sendRawMessage(handshakeData, onStream: outputStream)
		state = .awaitingHandshake(inputStream, outputStream)

		let workItem = DispatchWorkItem { [weak self] in
			guard let self else {
				return
			}
			self.handleError(StreamDeckMessage.Error.handshakeTimedOut, message: "Did not receive handshake reply in timeout period")
			self.closeConnection()
		}

		handshakeTimeoutWorkItem = workItem
		DispatchQueue.main.asyncAfter(deadline: .now() + handshakeTimeout, execute: workItem)
	}

	func validateHandshake(from data: Data) throws {
		guard case let .awaitingHandshake(inputStream, outputStream) = state else {
			throw Error.invalidState(expectedState: "awaitingHandshake", observedState: state.description, logIdentifier: "Validating handshake")
		}

		handshakeTimeoutWorkItem?.cancel()
		handshakeTimeoutWorkItem = nil

		guard
			let receivedJSON = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
			let handshake = receivedJSON[HandshakeKeys.handshake.rawValue] as? [String: Any],
			let apiVersion = handshake[HandshakeKeys.apiVersion.rawValue] as? String
		else {
			closeConnection()
			throw StreamDeckMessage.Error.invalidHandshakeReply
		}

		guard apiVersion == StreamDeckManager.apiVersion else {
			closeConnection()
			throw StreamDeckMessage.Error.apiMismatch
		}

		state = .open(inputStream, outputStream)
		connected = true
	}

	// MARK: - Retry
	private static let retryInterval: TimeInterval = 10

	private var retryTimer: Timer? {
		didSet {
			guard oldValue != retryTimer else {
				return
			}
			oldValue?.invalidate()
		}
	}

	private func startRetryTimer() {
		retryTimer = Timer.scheduledTimer(withTimeInterval: Self.retryInterval, repeats: true) { [weak self] timer in
			guard let self, timer.isValid else {
				return
			}

			switch self.state {
			case .closed:
				self.openConnection()
			case let .starting(inputStream, outputStream):
				if inputStream.streamStatus == .open || inputStream.streamStatus == .reading,
				   outputStream.streamStatus == .open || outputStream.streamStatus == .writing {
					self.retryTimer = nil
					return
				}
				self.closeConnection()
				self.openConnection()
			case .awaitingHandshake, .open:
				return
			}
		}
	}

	private func readMessage(fromStream stream: InputStream) throws {
		let bufferSize: Int = 1024
		let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
		let bytesRead: Int = stream.read(buffer, maxLength: bufferSize)

		defer {
			buffer.deallocate()
		}

		guard bytesRead > 0 else {
			Logger.logMessage("No bytes available when reading messages while connection state is \(state.description)", level: .error)
			return
		}

		let data = Data(bytes: buffer, count: bytesRead)

		switch state {
		case .closed, .starting:
			Logger.logMessage("Skipping available messages while connection state is \(state.description)", level: .info)
			return
		case .awaitingHandshake:
			try validateHandshake(from: data)
		case .open:
			let message = try StreamDeckMessage(jsonData: data)

			for continuation: AsyncStream<StreamDeckMessage>.Continuation in receivedMessageContinuations.values {
				continuation.yield(message)
			}
		}
	}

	private var messagesToSend: [StreamDeckMessage] = []
	func sendMessage(_ message: StreamDeckMessage) throws {
		guard case let .open(_, stream) = state else {
			throw Error.invalidState(expectedState: "open", observedState: state.description, logIdentifier: "Send message")
		}

		messagesToSend.append(message)
		if stream.hasSpaceAvailable {
			try sendNextMessage(onStream: stream)
		}
	}

	private static let separator = Data("\n".utf8)

	private func sendNextMessage(onStream stream: OutputStream) throws {
		guard stream.streamStatus == .open else {
			throw Error.invalidState(expectedState: "open", observedState: state.description, logIdentifier: "Send next message")
		}

		guard let message = messagesToSend.popLast() else {
			return
		}

		let data: Data = try message.jsondata
		try sendRawMessage(data, onStream: stream)
	}

	private func sendRawMessage(_ data: Data, onStream stream: OutputStream) throws {
		guard stream.streamStatus == .open else {
			throw Error.invalidState(expectedState: "open", observedState: state.description, logIdentifier: "Send raw message")
		}

		var dataToSend: Data = data

		dataToSend.append(Self.separator)
		try dataToSend.withUnsafeBytes { pointer in
			guard let address: UnsafeRawPointer = pointer.baseAddress else {
				throw Error.failedToSendMessage
			}

			if stream.write(address, maxLength: dataToSend.count) < 0 {
				throw stream.streamError ?? Error.failedToSendMessage
			}
		}
	}

	/// Prevents the same error being spammed (mostly for connection errors)
	private var previousErrorCode: Int?
}

extension StreamDeckConnection {
	enum State {
		case closed
		case starting(InputStream, OutputStream)
		case awaitingHandshake(InputStream, OutputStream)
		case open(InputStream, OutputStream)

		var inputStream: InputStream? {
			switch self {
			case .closed:
				return nil
			case let .starting(inputStream, _), let .awaitingHandshake(inputStream, _), let .open(inputStream, _):
				return inputStream
			}
		}

		var outputStream: OutputStream? {
			switch self {
			case .closed:
				return nil
			case let .starting(_, outputStream), let .awaitingHandshake(_, outputStream), let .open(_, outputStream):
				return outputStream
			}
		}
	}

	enum Error {
		case invalidState(expectedState: String, observedState: String, logIdentifier: String)
		case failedToSendMessage
	}

	enum HandshakeKeys: String {
		case handshake
		case apiVersion
		case appVersion
	}
}

extension StreamDeckConnection.State: CustomStringConvertible {
	var description: String {
		switch self {
		case .closed:
			return "closed"
		case .starting:
			return "starting"
		case .awaitingHandshake:
			return "awaitingHandshake"
		case .open:
			return "open"
		}
	}
}

extension StreamDeckConnection.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Self.self)

	static let allCases: [StreamDeckConnection.Error] = [
		.invalidState(expectedState: "", observedState: "", logIdentifier: ""),
		.failedToSendMessage,
	]

	var errorMessage: String {
		switch self {
		case let .invalidState(expectedState, observedState, logIdentifier): "\(logIdentifier) encountered invalid state: expected \(expectedState), observed \(observedState)."
		case .failedToSendMessage: "Failed to send message."
		}
	}
}

extension StreamDeckConnection: StreamDelegate {
	// swiftlint:disable:next cyclomatic_complexity
	func stream(_ stream: Stream, handle eventCode: Stream.Event) {
		guard
			let inputStream: InputStream = state.inputStream,
			let outputStream: OutputStream = state.outputStream
		else {
			Logger.logMessage("Closing connection with unavailable \(state.inputStream == nil ? "input" : "output").", level: .error)
			closeConnection()
			return
		}

		switch eventCode {
		case .openCompleted:
			retryTimer = nil
			Logger.logMessage("Opened \(stream == inputStream ? "input" : "output").", level: .info)
		case .endEncountered, .errorOccurred:
			connected = false
			closeConnection()
			if let error: Swift.Error = stream.streamError {
				handleError(error, message: "Closed with error")
			} else {
				Logger.logMessage("Closed \(stream == inputStream ? "input" : "output").", level: .info)
			}
		case .hasBytesAvailable:
			guard stream == inputStream else {
				return
			}

			do {
				try readMessage(fromStream: inputStream)
			} catch {
				handleError(error, message: "Error reading message")
			}
		case .hasSpaceAvailable:
			guard stream == outputStream else {
				return
			}

			if case .starting = state {
				do {
					try sendHandshake()
				} catch {
					handleError(error, message: "Failed to send handshake")
				}
				return
			}

			do {
				try sendNextMessage(onStream: outputStream)
			} catch {
				handleError(error, message: "Error writing message")
			}
		default:
			// For some reason the compiler requires a default case here even though we cover every case
			break
		}
	}

	private func handleError(_ error: Swift.Error, message: String = "Encountered error") {
		let nsError = error as NSError
		if nsError.code != previousErrorCode {
			Logger.logMessage("\(message): \(error)", level: .error, targets: .uncheckedAll)
		}
		previousErrorCode = nsError.code
		delegate?.connection(self, didEncounterError: error)
	}
}
