//
//  BoolBox.m
//  mmhmm
//
//  Created by Beni Federer on 03.05.24.
//

#import "BoolValue.h"

@implementation BoolValue

@synthesize value;

+ (instancetype)boolBoxFromBool:(BOOL)value {
	BoolValue *result = [[BoolValue alloc] init];
	result.value = value;
	return result;
}

- (NSString *)description {
	return value ? @"true" : @"false";
}

@end
