//
//  AVCaptureDeviceSnapshot.m
//  mmhmm
//
//  Created by Steve White on 8/28/20.
//  Copyright © 2020 mmhmm, inc. All rights reserved.
//

#import "AVCaptureDeviceSnapshot.h"

#import <AppKit/AppKit.h>
#import <AVKit/AVKit.h>
#import <CoreMedia/CoreMedia.h>
#import <CoreVideo/CoreVideo.h>

@interface AVCaptureDeviceSnapshot()
@property (strong, nonatomic) AVCaptureSession *session;
@end

@implementation AVCaptureDeviceSnapshot

@synthesize session;

- (void)createSnapshotFromDevice:(AVCaptureDevice *)device
					  completion:(void(^)(NSImage *__nullable snapshot))completion
{
    NSError *error = nil;
    AVCaptureDeviceInput *deviceInput = [AVCaptureDeviceInput deviceInputWithDevice:device
                                                                              error:&error];
    if (deviceInput == nil) {
        NSLog(@"%s couldn't make input from device: %@ => %@", __PRETTY_FUNCTION__, device, error);
        completion(nil);
        return;
    }
    
    [self createSnapshotFromInput:deviceInput
                       completion:completion];
}

// #1789 - Update to use non deprecated AV Framework APIs
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    
- (void)createSnapshotFromInput:(AVCaptureInput *)deviceInput
					 completion:(void(^)(NSImage *__nullable snapshot))completion
{
    AVCaptureSession *session = [AVCaptureSession new];
    [session setSessionPreset:AVCaptureSessionPresetPhoto];

    if ([session canAddInput:deviceInput] == NO) {
		NSLog(@"%s couldn't add input:%@ to session:%@", __PRETTY_FUNCTION__, deviceInput, session);
        completion(nil);
        return;
    }
    
    [session addInput:deviceInput];

    AVCaptureStillImageOutput *imageOutput = [[AVCaptureStillImageOutput alloc] init];
    if ([session canAddOutput:imageOutput] == NO) {
		NSLog(@"%s couldn't add output:%@ to session:%@", __PRETTY_FUNCTION__, imageOutput, session);
        completion(nil);
        return;
    }
    [session addOutput:imageOutput];
    [session startRunning];
    
    self.session = session;
    
    AVCaptureConnection *connection = [imageOutput connectionWithMediaType:AVMediaTypeVideo];
    [imageOutput captureStillImageAsynchronouslyFromConnection:connection
                                             completionHandler:^(CMSampleBufferRef  _Nullable imageDataSampleBuffer, NSError * _Nullable error) {
        NSImage *result = nil;
        if (imageDataSampleBuffer == nil) {
			NSLog(@"%s capture returned error: %@", __PRETTY_FUNCTION__, error);
        }
        else {
            NSData *imageData = [AVCaptureStillImageOutput jpegStillImageNSDataRepresentation:imageDataSampleBuffer];
            result = [[NSImage alloc] initWithData:imageData];
        }

        dispatch_async(dispatch_get_main_queue(), ^{
            NSLog(@"%s result=%@", __PRETTY_FUNCTION__, result);
            completion(result);
            [session removeOutput:imageOutput];
            [session removeInput:deviceInput];
            [session stopRunning];
        });
    }];
}

#pragma clang diagnostic push

@end
