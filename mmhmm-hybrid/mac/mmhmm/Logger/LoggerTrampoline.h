//
//  LoggerTrampoline.h
//  mmhmm
//
//  Created by Beni Federer on 17.01.24.
//

#pragma once

#include <string>
#import "include/internal/cef_types.h"

namespace NativeLogger {
	void LogMessage(std::string&& message, cef_log_severity_t level, std::string&& location);
}
