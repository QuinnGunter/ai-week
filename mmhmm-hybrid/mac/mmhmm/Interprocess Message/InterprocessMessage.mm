//
//  InterprocessMessage.mm
//  mmhmm
//
//  Created by Beni Federer on 30.04.24.
//

#import "InterprocessMessage.h"

#import "BoolValue.h"

#include "include/cef_app.h"
#include "include/cef_application_mac.h"
#include "browser/main_context_impl.h"
#include "browser/web_app_browser.h"

const int UNKNOWN_BROWSER_ID = -1;

// MARK: - NSError Helper

@interface NSError (InterprocessMessage)

+ (NSError *)errorWithInterprocessMessage:(InterprocessMessage *)interprocessMessage code:(InterprocessMessageErrorCode)code;

@end

@implementation NSError (InterprocessMessage)

+ (NSError *)errorWithInterprocessMessage:(InterprocessMessage *)interprocessMessage code:(InterprocessMessageErrorCode)code {
	switch (code) {
		case InterprocessMessageErrorCodeNoWebBrowser:
			return [NSError errorWithDomain:InterprocessMessage.errorDomain code:code userInfo:@{ NSLocalizedDescriptionKey: [NSString stringWithFormat:@"Browser is unavailable: %@", interprocessMessage.type] }];
		case InterprocessMessageErrorCodeNoWebBrowserMainFrame:
			return [NSError errorWithDomain:InterprocessMessage.errorDomain code:code userInfo:@{ NSLocalizedDescriptionKey: [NSString stringWithFormat:@"Browser frame is unavailable: %@", interprocessMessage.type] }];
		case InterprocessMessageErrorCodeStringConversionFailed:
			return [NSError errorWithDomain:InterprocessMessage.errorDomain code:code userInfo:@{ NSLocalizedDescriptionKey: [NSString stringWithFormat:@"String conversion failed: %@", interprocessMessage.type] }];
		case InterprocessMessageErrorCodeMessageCreationFailed:
			return [NSError errorWithDomain:InterprocessMessage.errorDomain code:code userInfo:@{ NSLocalizedDescriptionKey: [NSString stringWithFormat:@"Message creation failed: %@", interprocessMessage.type] }];
		case InterprocessMessageErrorCodeNoArgumentList:
			return [NSError errorWithDomain:InterprocessMessage.errorDomain code:code userInfo:@{ NSLocalizedDescriptionKey: [NSString stringWithFormat:@"Message has no argument list: %@", interprocessMessage.type] }];
		case InterprocessMessageErrorCodeUnsupportedListValue:
			return [NSError errorWithDomain:InterprocessMessage.errorDomain code:code userInfo:@{ NSLocalizedDescriptionKey: [NSString stringWithFormat:@"List value is unsupported: %@", interprocessMessage.type] }];
		case InterprocessMessageErrorCodeWebBrowserNotReady:
			return [NSError errorWithDomain:InterprocessMessage.errorDomain code:code userInfo:@{ NSLocalizedDescriptionKey: [NSString stringWithFormat:@"Browser is not ready: %@", interprocessMessage.type] }];
		default:
			return [NSError errorWithDomain:InterprocessMessage.errorDomain code:InterprocessMessageErrorCodeUnknownFailure userInfo:@{ NSLocalizedDescriptionKey: [NSString stringWithFormat:@"Unknown error: %@", interprocessMessage.type] }];
	}
}

@end

// MARK: - InterprocessMessage

/// Sends an IPC message to other CEF processes.
///
/// - Note: Currently only supports sending to the renderer process.
@interface InterprocessMessage ()

@property (nonatomic, strong) NSString *type;
@property (nonatomic, strong) NSArray<id> *listValues;
@property (nonatomic, weak) id<InterprocessMessageDelegate> delegate;
@property (nonatomic, assign) cef_process_id_t targetPID;
@property (nonatomic, assign) int browserID;

/// Creates an ``InterprocessMessage``.
///
/// Currently supported types in `values` are strings boxed in an `NSString`,
/// `int` boxed in an `NSNumber`, and `BOOL` boxed in a ``BoolBox``.
///
/// - Parameters:
///   - type: Used as the type of the underlying `CefProcessMessage`.
///   - values: Used as the list values of the underlying `CefProcessMessage`, processed in order.
- (instancetype)initWithType:(nonnull NSString *)type values:(nonnull NSArray<id> *)values;

@end

@implementation InterprocessMessage

@synthesize listValues, type, targetPID, delegate;

+ (NSErrorDomain)errorDomain {
	return [NSString stringWithFormat:@"app.mmhmm.%@", NSStringFromClass(self.class) ];
}

- (instancetype)init
{
	self = [super init];
	if (self) {
		self.browserID = UNKNOWN_BROWSER_ID;
		self.targetPID = PID_RENDERER;
	}
	return self;
}

- (instancetype)initWithType:(nonnull NSString *)type values:(nonnull NSArray<id> *)values {
	self = [self init];
	if (self) {
		self.type = type;
		self.listValues = values;
	}
	return self;
}

- (void)send {
	// The first messages are sent while the browser is still loading.
	// They must be stored and sent in order when the browser has finished loading.
	static dispatch_queue_t sendQueue = dispatch_queue_create("app.mmhmm.sendInterprocessMessage", DISPATCH_QUEUE_SERIAL);
	static dispatch_source_t sendQueueTimer = nullptr;
	static NSMutableArray<InterprocessMessage*>* startupMessageBuffer = [[NSMutableArray alloc] init];

	dispatch_sync(sendQueue, ^{
		if (InterprocessMessenger.sharedMessenger.receiverProcessIsReady == false) {
			// #270: Delay message if browser is still loading
			[startupMessageBuffer addObject:self];

			if (!sendQueueTimer) {
				int64_t repeatIntervalNs = NSEC_PER_MSEC * 250;
				dispatch_time_t startTime = dispatch_time(DISPATCH_TIME_NOW, repeatIntervalNs);
				sendQueueTimer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, sendQueue);
				dispatch_source_set_timer(sendQueueTimer, startTime, (uint64_t)repeatIntervalNs, 0);
				dispatch_source_set_event_handler(sendQueueTimer, ^{
					if (InterprocessMessenger.sharedMessenger.receiverProcessIsReady == false) {
						// Browser is still loading, do nothing yet.
						return;
					}

					// Browser has finished loading, send all collected messages in order.
					for (InterprocessMessage *processMessage in startupMessageBuffer) {
						NSError *error = nil;
						[processMessage sendAsCEFProcessMessageWithError:&error];
						if (error) {
							[processMessage.delegate interprocessMessage:processMessage failedWithError:error];
						}
					}
					[startupMessageBuffer removeAllObjects];

					// Collected messages have been sent, stop timer.
					dispatch_source_cancel(sendQueueTimer);
					sendQueueTimer = nullptr;
				});
				dispatch_activate(sendQueueTimer);
			}
		} else {
			if (startupMessageBuffer.count > 0) {
				// Browser has finished loading, but the initially collected messages have not been sent yet.
				// Enqueue this message and let the timer send it to preserve message ordering.
				[startupMessageBuffer addObject:self];
			} else {
				// Initial messages have been sent in order, all subsequent messages can be sent immediately.
				NSError *error = nil;
				[self sendAsCEFProcessMessageWithError:&error];
				if (error) {
					[delegate interprocessMessage:self failedWithError:error];
				}
			}
		}
	});
}

- (void)sendAsCEFProcessMessageWithError:(NSError **)error {
	const char *typeCString = [type cStringUsingEncoding:NSUTF8StringEncoding];
	if (!typeCString) {
		if (error) {
			*error = [NSError errorWithInterprocessMessage:self code:InterprocessMessageErrorCodeStringConversionFailed];
		}
		return;
	}

	CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create(typeCString);
	if (!message) {
		if (error) {
			*error = [NSError errorWithInterprocessMessage:self code:InterprocessMessageErrorCodeMessageCreationFailed];
		}
		return;
	}

	CefRefPtr<CefListValue> args = message->GetArgumentList();
	if (!args) {
		if (error) {
			*error = [NSError errorWithInterprocessMessage:self code:InterprocessMessageErrorCodeNoArgumentList];
		}
		return;
	}

	[listValues enumerateObjectsUsingBlock:^(id  _Nonnull value, NSUInteger index, BOOL * _Nonnull stop) {
		// Strings must be tested as kindOf, to also match Swift strings.
		if ([value isKindOfClass:NSString.class]) {
			args->SetString(index, [value cStringUsingEncoding:NSUTF8StringEncoding]);
		} else if ([value isMemberOfClass:BoolValue.class]) {
			BoolValue *boolValue = (BoolValue*)value;
			args->SetBool(index, boolValue.value);
		} else if ([value isKindOfClass:NSNumber.class]) {
			args->SetInt(index, ((NSNumber*)value).intValue);
		} else if ([value isMemberOfClass:NSNull.class]) {
			// Indicates a field that exists in a message but was omitted.
			return;
		} else {
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wblock-capture-autoreleasing"
			if (error) {
				*error = [NSError errorWithInterprocessMessage:self code:InterprocessMessageErrorCodeUnsupportedListValue];
			}
#pragma GCC diagnostic pop
			*stop = YES;
		}
	}];
	if (error && *error) {
		// There was an error setting the list values.
		return;
	}

	client::MainContext* context = client::MainContext::Get();
	if (!context) {
		if (error) {
			*error = [NSError errorWithInterprocessMessage:self code:InterprocessMessageErrorCodeNoWebBrowser];
		}
		return;
	}

	if (self.browserID == UNKNOWN_BROWSER_ID) {
		context->SendProcessMessageToRendererProcess(message);
	} else {
		context->SendProcessMessageToBrowser(message, self.browserID);
	}
}

@end

// MARK: - ProcessMessenger

@implementation InterprocessMessenger

@synthesize errorHandler;

+ (InterprocessMessenger *)sharedMessenger {
	static InterprocessMessenger *sharedMessenger = nil;
	static dispatch_once_t onceToken;
	dispatch_once(&onceToken, ^{
		sharedMessenger = [[InterprocessMessenger alloc] init];
		sharedMessenger.receiverProcessIsReady = NO;
	});
	return sharedMessenger;
}

- (void)sendInterprocessMessageWithType:(nonnull NSString *)type values:(nonnull NSArray<id> *)values {
	InterprocessMessage *message = [[InterprocessMessage alloc] initWithType:type values:values];
	[self sendInterprocessMessage:message];
}

- (void)sendInterprocessMessage:(InterprocessMessage *)interprocessMessage {
	interprocessMessage.delegate = self;
	[interprocessMessage send];
}

// MARK: - InterprocessMessageDelegate

- (void)interprocessMessage:(nonnull InterprocessMessage *)interprocessMessage failedWithError:(nonnull NSError *)error {
	if (errorHandler) {
		InterprocessMessageErrorHandler blockErrorHandler = errorHandler;
		dispatch_async(dispatch_get_main_queue(), ^{
			blockErrorHandler(interprocessMessage, error);
		});
	}
}

@end

// MARK: - Process Message Subclasses

@implementation StringInterprocessMessage

- (instancetype)initWithType:(nonnull NSString *)type stringValue:(nonnull NSString *)value isFlagged:(BOOL)isFlagged sendAnalytics:(BOOL)sendAnalytics {
	self = [super init];
	if (self) {
		self.type = type;
		self.listValues = @[
			value,
			[BoolValue boolBoxFromBool:isFlagged],
			[BoolValue boolBoxFromBool:sendAnalytics],
		];
	}
	return self;
}

+ (instancetype)stringInterprocessMessageWithType:(nonnull NSString *)type stringValue:(nonnull NSString *)value isFlagged:(BOOL)isFlagged sendAnalytics:(BOOL)sendAnalytics {
	return [[StringInterprocessMessage alloc] initWithType:type stringValue:value isFlagged:isFlagged sendAnalytics:sendAnalytics];
}

@end

@implementation ScreenShareMediaInterprocessMessage

- (instancetype)initWithAction:(ScreenShareMediaInterprocessMessageAction)action
					 requestID:(int)requestID
					 browserID:(int)browserID
					   content:(ScreenShareMediaInterprocessMessageContent)content
					  argument:(NSString *)argument
						 title:(NSString *)title
				   processName:(NSString *)processName
		   streamConfiguration:(NSString *)streamConfiguration {
	self = [super init];
	if (self) {
		self.type = @"getScreenshareMedia_success";
		self.browserID = browserID;
		BOOL actionBool = (action == ScreenShareMediaInterprocessMessageActionShare ? YES : NO);
		NSString *contentString = [self stringFromContent:content];
		NSString *configToSend = (streamConfiguration != nil && streamConfiguration.length > 0) ? streamConfiguration : @"";
		if (configToSend.length > 0) {
			NSLog(@"[IPC] Sending stream config: %@", [configToSend substringToIndex:MIN(100, configToSend.length)]);
		}
		self.listValues = @[
			[BoolValue boolBoxFromBool:actionBool],
			[NSNumber numberWithInt:requestID],
			contentString == nil ? NSNull.null : contentString,
			argument == nil ? NSNull.null : argument,
			title == nil ? NSNull.null : title,
			processName == nil ? NSNull.null : processName,
			configToSend,
		];
	}
	return self;
}

+ (instancetype)screenShareMediaInterprocessMessageWithAction:(ScreenShareMediaInterprocessMessageAction)action
													requestID:(int)requestID
													browserID:(int)browserID
													  content:(ScreenShareMediaInterprocessMessageContent)content
													 argument:(NSString *)argument
														title:(NSString *)title
												  processName:(NSString *)processName
									   streamConfiguration:(NSString *)streamConfiguration {
	return [[ScreenShareMediaInterprocessMessage alloc] initWithAction:action
															 requestID:requestID
															 browserID:browserID
															   content:content
															  argument:argument
																 title:title
													   processName:processName
									 streamConfiguration:streamConfiguration];
}- (NSString *)stringFromContent:(ScreenShareMediaInterprocessMessageContent)content {
	switch (content) {
		case ScreenShareMediaInterprocessMessageContentDisplay:
			return @"screen";
		case ScreenShareMediaInterprocessMessageContentWindow:
			return @"desktop";
		default:
			return nil;
	}
}

@end
