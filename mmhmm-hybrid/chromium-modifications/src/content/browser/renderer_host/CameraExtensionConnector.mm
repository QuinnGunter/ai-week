//
//  CameraExtensionConnector.mm
//
// Copyright © 2024 mmhmm, inc. All rights reserved.
//

#include "CameraExtensionConnector.h"

#import <CoreMedia/CoreMedia.h>
#import <CoreMediaIO/CoreMediaIO.h>
#import <Foundation/Foundation.h>

#include <string>
#include "base/logging.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunguarded-availability-new"
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
#pragma clang diagnostic ignored "-Wsign-compare"

static NSString *mmhmmCameraUUID = @"54E37095-DA8C-4CE4-A5A3-3E8BA152F7BD";

typedef NSArray<NSNumber*>* NumberArray;
// ----
void queueAlteredProc(CMIOStreamID streamID, void* token, void* refCon);
OSStatus stopSinkStream(CMIOStreamID stream);
NSString* getStringValue(CMIODeviceID id,
						 CMIOObjectPropertySelector selector);
UInt32 getIntValue(CMIODeviceID id,
				   CMIOObjectPropertySelector selector);
void getPointerValue(CMIODeviceID id,
					 CMIOObjectPropertySelector selector, void** dest);
NSArray<NSNumber*>* getArrayValue(CMIODeviceID id,
								  CMIOObjectPropertySelector selector);
NSArray<NSNumber*>* getDeviceIDs(void);
uint32_t fourCCFromString(NSString *fourCCString);

@interface CameraExtensionConnector:NSObject {
    CMIODeviceID _device;
    CMIOStreamID _streamSink;
    CMIOStreamID _streamSource;
    CMSimpleQueueRef _queue;
    CMFormatDescriptionRef _videoFormat;
}
@property(readwrite) CMSimpleQueueRef queue;
@property(readwrite) BOOL initialized;
@end

@implementation CameraExtensionConnector
@synthesize queue = _queue;
@synthesize initialized = _initialized;

- (instancetype) init {
	if (self = [super init]) {
		_videoFormat = nil;
		_initialized = false;
	}
	return self;
}

- (BOOL)setupIPC {
	
	_initialized = false;
	
	NSUUID *uuid = [[NSUUID alloc] initWithUUIDString: mmhmmCameraUUID];
	_device = [self getCameraIDForUUID: uuid];
	
	// get streamsIDs
	NSDictionary* streams = [self getStreamsID:_device];
	
	NSNumber* nsSink = streams[@"sink"];
	NSNumber* nsSource = streams[@"source"];
	
	_streamSink = nsSink.unsignedIntValue;
	_streamSource = nsSource.unsignedIntValue;
	
	if (_streamSink == 0 || _streamSource == 0){
		LOG(ERROR) << "Invalid streams IDs. Virtual camera will not work correctly. SinkID: " << _streamSink << " SourceID: " << _streamSource;
		return false;
	} else {
		DLOG(ERROR) << "Streams set correctly. SinkID: " << _streamSink << " SourceID: " << _streamSource;
	}
	
	OSStatus result = CMIOStreamCopyBufferQueue(_streamSink, queueAlteredProc, NULL, &_queue);
	if (result != noErr) {
		LOG(ERROR) << "Failed to get queue. OSStatus: " << result;
		return false;
	}
	
	return _initialized = true;
}

- (void)cleanUp {
    if (_device && _streamSink)
        CMIODeviceStopStream(_device, _streamSink);
    
    if (_videoFormat)
        CFRelease(_videoFormat);
    
    if (_queue)
        CMSimpleQueueReset(_queue);
    
    if (_queue != NULL) {
        CFRelease(_queue);
        _queue = NULL;
    }
}

- (void)dealloc {
    LOG(INFO) << "Camera extension connector stopped.";
}

- (CMIODeviceID) getCameraIDForUUID: (NSUUID *) wantedUUID {
	CMIODeviceID cameraID = 0;
	NumberArray devices = getDeviceIDs();
	for (NSNumber* id in devices) {
		NSString *uuid = getStringValue(id.unsignedIntValue,
										kCMIODevicePropertyDeviceUID);
		if (uuid != NULL) {
			// check it here
			if ([uuid isEqualToString: wantedUUID.UUIDString]) {
				cameraID = id.unsignedIntValue;
			}
		}
	}
	return cameraID;
}

-(NSDictionary *) getStreamsID: (CMIODeviceID)device {
	NumberArray streams = getArrayValue(device, kCMIODevicePropertyStreams);
	CMIOStreamID streamSourceID = 0;
    CMIOStreamID streamSinkID = 0;
    
	for (NSNumber* id in streams) {
		UInt32 direction = getIntValue(id.unsignedIntValue, kCMIOStreamPropertyDirection);
		if (direction == 0) { // sink stream
			streamSinkID = id.unsignedIntValue;
        } else if (direction == 1) { // input stream
            streamSourceID = id.unsignedIntValue;
        }
	}
    
    NSDictionary *streamsResult = @{
            @"source": @(streamSourceID),
            @"sink": @(streamSinkID),
        };
    
	return streamsResult;
}

- (OSStatus) startSinkStream {
	return CMIODeviceStartStream(_device, _streamSink);
}

- (OSStatus) sendSampleBuffer:(CVPixelBufferRef)pixelBuffer {
    CMSampleBufferRef sampleBuffer;
    CMTime hostTime = CMClockGetTime(CMClockGetHostTimeClock());
    CMSampleTimingInfo timingInfo = {{0}};
    timingInfo.presentationTimeStamp = hostTime;
    
    if (!_videoFormat) {
        CMVideoFormatDescriptionCreateForImageBuffer(kCFAllocatorDefault, pixelBuffer, &_videoFormat);
    }
    
    OSStatus result = CMSampleBufferCreateReadyWithImageBuffer(kCFAllocatorDefault,
                                                               pixelBuffer,
                                                               _videoFormat,
                                                               &timingInfo,
                                                               &sampleBuffer);
    
    if (result != noErr) {
        char buffer[5] = {0};
        CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
        OSType pixelFormatType = CVPixelBufferGetPixelFormatType(pixelBuffer);
        *(int *)&buffer[0] = CFSwapInt32HostToBig(pixelFormatType);
        LOG(INFO) << "- CVPixelBuffer Pixel Format Type: " << buffer;
        CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
        
        pixelFormatType = kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange;
        *(int *)&buffer[0] = CFSwapInt32HostToBig(pixelFormatType);
        LOG(INFO) << "- Video format Pixel Format Type: " << buffer;

        NSString *errorDescription;
        
        switch (result) {
            case kCMSampleBufferError_AllocationFailed:
                errorDescription = @"Allocation Failed";
                break;
            case kCMSampleBufferError_RequiredParameterMissing:
                errorDescription = @"Required Parameter Missing";
                break;
            case kCMSampleBufferError_AlreadyHasDataBuffer:
                errorDescription = @"Already Has Data Buffer";
                break;
            case kCMSampleBufferError_BufferNotReady:
                errorDescription = @"Buffer Not Ready";
                break;
            case kCMSampleBufferError_SampleIndexOutOfRange:
                errorDescription = @"Sample Index Out Of Range";
                break;
            case kCMSampleBufferError_BufferHasNoSampleSizes:
                errorDescription = @"Buffer Has No Sample Sizes";
                break;
            case kCMSampleBufferError_BufferHasNoSampleTimingInfo:
                errorDescription = @"Buffer Has No Sample Timing Info";
                break;
            case kCMSampleBufferError_ArrayTooSmall:
                errorDescription = @"Array Too Small";
                break;
            case kCMSampleBufferError_InvalidEntryCount:
                errorDescription = @"Invalid Entry Count";
                break;
            case kCMSampleBufferError_CannotSubdivide:
                errorDescription = @"Cannot Subdivide";
                break;
            case kCMSampleBufferError_SampleTimingInfoInvalid:
                errorDescription = @"Sample Timing Info Invalid";
                break;
            case kCMSampleBufferError_InvalidMediaTypeForOperation:
                errorDescription = @"Invalid Media Type For Operation";
                break;
            case kCMSampleBufferError_InvalidSampleData:
                errorDescription = @"Invalid Sample Data";
                break;
            case kCMSampleBufferError_InvalidMediaFormat:
                errorDescription = @"Invalid Media Format";
                break;
            case kCMSampleBufferError_Invalidated:
                errorDescription = @"Invalidated";
                break;
            case kCMSampleBufferError_DataFailed:
                errorDescription = @"Data Failed";
                break;
            case kCMSampleBufferError_DataCanceled:
                errorDescription = @"Data Canceled";
                break;
            default:
                errorDescription = [NSString stringWithFormat:@"Unknown error"];
                break;
        }
        
        LOG(ERROR) << "Unable to create image from buffer: " << (errorDescription ? std::string(errorDescription.UTF8String) : std::string()) << "(" << result << ")";
        return result;
    }
    
    result = CMSimpleQueueEnqueue(_queue, sampleBuffer);
    
    if (result != noErr) {
        CFRelease(sampleBuffer);
        LOG(ERROR) << "Unable to enqueue simpleQueue. OSStatus: " << result;
        return result;
    }
    
    return result;
}

@end

#pragma mark CoreMediaIO utility functions
void queueAlteredProc(CMIOStreamID streamID, void* token, void* refCon) {
    // CMSimpleQueue requires to have live callback to altered procedure.
    // It's a place when we can take action when items are added/removed.
    // However in our logic we don't need it.
    // Due to CMIOStreamCopyBufferQueue signature we need to pass any callback,
    // it can't be null, so we declared empty queueAlteredproc.
}
OSStatus stopSinkStream(CMIOStreamID stream) {
	return 0;
}

uint32_t fourCCFromString(NSString *fourCCString) {
    if (fourCCString.length != 4) {
        LOG(ERROR) << "Error: The FourCC " << (fourCCString ? std::string(fourCCString.UTF8String) : std::string()) << " does not have exactly 4 characters.";
        return 0;
    }

    const char *fourCCChars = [fourCCString UTF8String];
    uint32_t fourCC = (uint8_t)fourCCChars[0] << 24 |
                      (uint8_t)fourCCChars[1] << 16 |
                      (uint8_t)fourCCChars[2] << 8  |
                      (uint8_t)fourCCChars[3];

    return fourCC;
}

NSString* getStringValue(CMIODeviceID id,
						 CMIOObjectPropertySelector selector) {
	CFStringRef name;
	getPointerValue(id, selector, (void**)&name);
	NSString* str;
	if (name != NULL) {
		str = [(NSString*)CFBridgingRelease(name) copy];
	} else {
		str = NULL;
	}
	return str;
}

UInt32 getIntValue(CMIODeviceID id,
				   CMIOObjectPropertySelector selector) {
	UInt32 value;
	UInt32 usedSpace = 0;
	CMIOObjectPropertyScope scope = kCMIOObjectPropertyScopeGlobal;
	CMIOObjectPropertyAddress address = {
		selector,
		scope,
		0 // Element
	};
	if (!CMIOObjectHasProperty(id, &address)) {
		value = 0;
	}
	OSStatus result = CMIOObjectGetPropertyData(id, &address, 0, nil, sizeof(UInt32), &usedSpace, &value);
	if (result != kCMIOHardwareNoError) {
    DLOG(ERROR) << "Failed to get property data for selector " << selector << " OSStatus: " << result;
		value = 0;
	}
	return value;
}


void getPointerValue(CMIODeviceID id,
                      CMIOObjectPropertySelector selector, void** dest) {
    UInt32 usedSpace = 0;
    CMIOObjectPropertyScope scope = kCMIOObjectPropertyScopeGlobal;
    CMIOObjectPropertyAddress address = {
        selector,
        scope,
        0 // Element
    };
    if (!CMIOObjectHasProperty(id, &address)) {
        *dest = NULL;
    }
    OSStatus result = CMIOObjectGetPropertyData(id, &address, 0, nil, sizeof(CFStringRef), &usedSpace, dest);
    if (result != kCMIOHardwareNoError) {
        DLOG(ERROR) << "Failed to get property data for selector " << selector << " OSStatus: " << result;
        *dest = nullptr;
    }
}

NSArray<NSNumber*>* getArrayValue(CMIODeviceID id,
                                  CMIOObjectPropertySelector selector) {
    CMIOObjectPropertyScope scope = kCMIOObjectPropertyScopeGlobal;
    CMIOObjectPropertyAddress address = {
        selector,
        scope,
        0 // Element
    };
    NSMutableArray* devices = [NSMutableArray array];
    if (!CMIOObjectHasProperty(id, &address)) {
        return devices;
    }
    
    UInt32 size = 0;
    UInt32 usedSpace = 0;
    OSStatus result = CMIOObjectGetPropertyDataSize(id, &address, 0, NULL, &size);
    if (result != kCMIOHardwareNoError) {
        LOG(ERROR) << "Failed to get property data size for selector " << selector << " OSStatus: " << result;
        return devices;
    }
    const size_t count = size/sizeof(UInt32);
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wvla-cxx-extension"
    UInt32 buffer[count];
#pragma clang diagnostic pop
    result = CMIOObjectGetPropertyData(id, &address, 0, nil, size, &usedSpace, buffer);
    if (result != kCMIOHardwareNoError) {
        LOG(ERROR) << "Failed to get property data for selector " << selector << " OSStatus: " << result;
        return devices;
    }
    for (int i = 0; i < count; i ++) {
        NSNumber* number = [NSNumber numberWithUnsignedInteger:buffer[i]];
        [devices addObject:number];
    }
    return devices;
}

NSArray<NSNumber*>* getDeviceIDs() {
	return getArrayValue(kCMIOObjectSystemObject, kCMIOObjectPropertyOwnedObjects);
}

#pragma mark C-API
static CameraExtensionConnector* instance = NULL;
int camera_extension_initialize() {
  if (!instance) {
    instance = [[CameraExtensionConnector alloc]init];
  }
  if (![instance setupIPC]){
    LOG(ERROR) << "Failed to set up IPC. Is extension installed?";
    return -1;
  }
	
  OSStatus result = [instance startSinkStream];
  if (result != 0) {
    LOG(ERROR) << "Failed to start camera connector. Error: " << result;
  }
  return result;
}

int camera_extension_send(IOSurfaceRef io_surface) {
    // Check connector status and reinitialize if needed.
    if (![instance initialized]){
      if (camera_extension_initialize() < 0){
        // If reinitialization failed abort sending sample as queue
        // is not created.
        return -1;
      }
    }
    CVPixelBufferRef pxb;
    CVReturn status = CVPixelBufferCreateWithIOSurface(
                                                       NULL,
                                                       io_surface,
                                                       NULL,
                                                       &pxb
                                                       );
    
    if (status == kCVReturnSuccess) {
        [instance sendSampleBuffer: pxb];
        CVPixelBufferRelease(pxb);
    } else {
        LOG(ERROR) << "Unable to wrap IOSurface with CVPixelBuffer. CVReturn: " << status;
    }
    
    return 0;
}

int camera_extension_dispose(void) {
  [instance cleanUp];
  instance = nil;
  LOG(ERROR) << "Removed camera connector.";
  return 0;
}
