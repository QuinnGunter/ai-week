//
//  BoolValue.h
//  mmhmm
//
//  Created by Beni Federer on 03.05.24.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Boxes a boolean value in an `NSObject`.
@interface BoolValue : NSObject

@property (nonatomic, assign) BOOL value;

+ (instancetype)boolBoxFromBool:(BOOL)value;

@end

NS_ASSUME_NONNULL_END
