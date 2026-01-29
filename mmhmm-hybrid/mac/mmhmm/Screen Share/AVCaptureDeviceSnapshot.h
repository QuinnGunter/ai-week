//
//  AVCaptureDeviceSnapshot.h
//  mmhmm
//
//  Created by Steve White on 8/28/20.
//  Copyright © 2020 mmhmm, inc. All rights reserved.
//

#import <Foundation/Foundation.h>

@class AVCaptureDevice;
@class AVCaptureInput;
@class NSImage;

NS_ASSUME_NONNULL_BEGIN

@interface AVCaptureDeviceSnapshot : NSObject

- (void)createSnapshotFromDevice:(AVCaptureDevice *)device
					  completion:(void(^)(NSImage *__nullable snapshot))completion;

- (void)createSnapshotFromInput:(AVCaptureInput *)device
					 completion:(void(^)(NSImage *__nullable snapshot))completion;

@end

NS_ASSUME_NONNULL_END
