//
//  LoggerTrampoline.m
//  mmhmm
//
//  Created by Matthew Tonkin on 13/9/2022.
//

#import "LoggerTrampoline.h"
#import "Airtime-Swift-Wrapper.h"

void NativeLogger::LogMessage(std::string&& message, cef_log_severity_t level, std::string&& location) {
	Airtime::LoggerTrampoline::logMessage(message, level, location);
}
