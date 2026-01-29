//
//  InterprocessMessage.h
//  mmhmm
//
//  Created by Beni Federer on 30.04.24.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// An IPC message targeting another CEF process.
///
/// Create specialized subclass instances and send them through ``ProcessMessenger``.
@interface InterprocessMessage: NSObject

@property (nonatomic, assign, readonly, class) NSErrorDomain errorDomain;
@property (nonatomic, strong, readonly) NSString *type;
@property (nonatomic, strong, readonly) NSArray<id> *listValues;

@end

/// Errors that can occur when sending a interprocess message.
typedef NS_ENUM(NSUInteger, InterprocessMessageErrorCode) {
	InterprocessMessageErrorCodeNoWebBrowser,
	InterprocessMessageErrorCodeNoWebBrowserMainFrame,
	InterprocessMessageErrorCodeStringConversionFailed,
	InterprocessMessageErrorCodeMessageCreationFailed,
	InterprocessMessageErrorCodeNoArgumentList,
	InterprocessMessageErrorCodeUnsupportedListValue,
	InterprocessMessageErrorCodeWebBrowserNotReady,
	InterprocessMessageErrorCodeUnknownFailure,
};

/// Informs the delegate about a failure when sending a interprocess message.
@protocol InterprocessMessageDelegate <NSObject>

- (void)interprocessMessage:(InterprocessMessage *)interprocessMessage failedWithError:(NSError *)error;

@end

typedef void (^InterprocessMessageErrorHandler)(InterprocessMessage*, NSError*);

/// Sends interprocess messages and handles potential send failures.
@interface InterprocessMessenger: NSObject <InterprocessMessageDelegate>

/// The shared instance, registers as the ``InterprocessMessageDelegate`` automatically.
@property (class, readonly) InterprocessMessenger *sharedMessenger;

/// Handles all interprocess message send errors on the main thread.
@property (atomic, copy, nullable) InterprocessMessageErrorHandler errorHandler;

/// Indicates to the messenger whether messages can be sent to the receiver process.
/// 
/// If `NO`, messages are queue up. If `YES`, queued up messages and any following
/// messages are sent along to the receiver process.
///
/// For the time being, the only supported receiver process is the render process,
/// which is ready to receive messages once the browser finished loading.
@property (atomic, assign) BOOL receiverProcessIsReady;

/// Sends a interprocess message to another CEF process.
///
/// - Note: The message is queued up for sending while `receiverProcessIsReady` is `NO`.
///         All messages are sent in the order they were queued. As soon as the browser has
///         become available, messages are sent instantly.
/// - Important: Currently only supports sending to the renderer process.
- (void)sendInterprocessMessage:(InterprocessMessage *)interprocessMessage;

@end

// MARK: - Interprocess Message Subclasses

@interface StringInterprocessMessage: InterprocessMessage

+ (instancetype)stringInterprocessMessageWithType:(nonnull NSString *)type
									  stringValue:(nonnull NSString *)value
										isFlagged:(BOOL)isFlagged
									sendAnalytics:(BOOL)sendAnalytics;

@end

typedef NS_ENUM(NSUInteger, ScreenShareMediaInterprocessMessageAction) {
	ScreenShareMediaInterprocessMessageActionShare,
	ScreenShareMediaInterprocessMessageActionCancel,
};

typedef NS_ENUM(NSUInteger, ScreenShareMediaInterprocessMessageContent) {
	ScreenShareMediaInterprocessMessageContentNone,
	ScreenShareMediaInterprocessMessageContentDisplay,
	ScreenShareMediaInterprocessMessageContentWindow,
};

@interface ScreenShareMediaInterprocessMessage: InterprocessMessage

+ (instancetype)screenShareMediaInterprocessMessageWithAction:(ScreenShareMediaInterprocessMessageAction)action
													requestID:(int)requestID
													browserID:(int)browserID
													  content:(ScreenShareMediaInterprocessMessageContent)content
													 argument:(nullable NSString *)argument
														title:(nullable NSString *)title
												  processName:(nullable NSString *)processName
										   streamConfiguration:(nullable NSString *)streamConfiguration;

@end

NS_ASSUME_NONNULL_END
