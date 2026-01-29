#include "content/browser/media/capture/screen_capture_kit_config_mac.h"

#include "base/logging.h"

namespace content {

NSDictionary* DeserializeStreamConfiguration(const std::string& json)
    API_AVAILABLE(macos(12.3)) {
  if (json.empty() || json.size() > 8192) {
    DLOG(ERROR) << "Invalid config size: " << json.size();
    return nil;
  }
  
  NSData* data = [NSData dataWithBytes:json.data() length:json.size()];
  NSError* error = nil;
  NSDictionary* dict = [NSJSONSerialization JSONObjectWithData:data 
                                                       options:0 error:&error];
  if (error) {
    DLOG(ERROR) << "JSON parse error: " << error.description.UTF8String;
    return nil;
  }
  
  // Validate version
  NSNumber* version = dict[@"version"];
  if (!version || version.intValue != 1) {
    DLOG(ERROR) << "Unsupported config version: " 
                << (version ? version.intValue : -1);
    return nil;
  }
  
  // Structure validation
  if (!ValidateStreamConfigurationStructure(dict)) {
    return nil;
  }
  
  return dict;
}

bool ValidateStreamConfigurationStructure(NSDictionary* config)
    API_AVAILABLE(macos(12.3)) {
  NSDictionary* streamCfg = config[@"streamConfiguration"];
  if (!streamCfg) return true;  // Empty is valid
  
  // Validate boolean fields
  NSArray* boolKeys = @[@"showsCursor", @"shouldBeOpaque", 
                        @"ignoreShadowsDisplay", @"ignoreShadowsSingleWindow",
                        @"ignoreGlobalClipDisplay", @"ignoreGlobalClipSingleWindow"];
  for (NSString* key in boolKeys) {
    id value = streamCfg[key];
    if (value && ![value isKindOfClass:[NSNumber class]]) {
      DLOG(ERROR) << "Invalid type for " << key.UTF8String << ", expected boolean";
      return false;
    }
  }
  
  // Validate sourceRect structure
  if (NSDictionary* rect = streamCfg[@"sourceRect"]) {
    NSArray* rectKeys = @[@"x", @"y", @"width", @"height"];
    for (NSString* key in rectKeys) {
      id value = rect[key];
      if (!value || ![value isKindOfClass:[NSNumber class]]) {
        DLOG(ERROR) << "Invalid sourceRect structure, missing or invalid " 
                    << key.UTF8String;
        return false;
      }
    }
  }
  
  // Validate backgroundColor is string
  if (id bgColor = streamCfg[@"backgroundColor"]) {
    if (![bgColor isKindOfClass:[NSString class]]) {
      DLOG(ERROR) << "backgroundColor must be string";
      return false;
    }
  }
  
  return true;
}

void ApplyCustomConfigurationToStreamConfiguration(SCStreamConfiguration* stream_config, 
                                                   NSDictionary* config)
    API_AVAILABLE(macos(12.3)) {
  if (!config) return;
  
  NSDictionary* streamCfg = config[@"streamConfiguration"];
  if (!streamCfg) return;
  
  // Apply boolean properties
  if (NSNumber* showsCursor = streamCfg[@"showsCursor"]) {
    stream_config.showsCursor = showsCursor.boolValue;
    DLOG(INFO) << "Applied showsCursor: " << showsCursor.boolValue;
  }
  
  // shouldBeOpaque is only available on macOS 14.0+
  if (@available(macOS 14.0, *)) {
    if (NSNumber* shouldBeOpaque = streamCfg[@"shouldBeOpaque"]) {
      stream_config.shouldBeOpaque = shouldBeOpaque.boolValue;
      DLOG(INFO) << "Applied shouldBeOpaque: " << shouldBeOpaque.boolValue;
    }
  }
  
  // Apply shadow and clip properties (macOS 14.0+)
  if (@available(macOS 14.0, *)) {
    if (NSNumber* ignoreShadowsDisplay = streamCfg[@"ignoreShadowsDisplay"]) {
      stream_config.ignoreShadowsDisplay = ignoreShadowsDisplay.boolValue;
      DLOG(INFO) << "Applied ignoreShadowsDisplay: " << ignoreShadowsDisplay.boolValue;
    }
    if (NSNumber* ignoreShadowsSingleWindow = streamCfg[@"ignoreShadowsSingleWindow"]) {
      stream_config.ignoreShadowsSingleWindow = ignoreShadowsSingleWindow.boolValue;
    }
    if (NSNumber* ignoreGlobalClipDisplay = streamCfg[@"ignoreGlobalClipDisplay"]) {
      stream_config.ignoreGlobalClipDisplay = ignoreGlobalClipDisplay.boolValue;
    }
    if (NSNumber* ignoreGlobalClipSingleWindow = streamCfg[@"ignoreGlobalClipSingleWindow"]) {
      stream_config.ignoreGlobalClipSingleWindow = ignoreGlobalClipSingleWindow.boolValue;
    }
  } else {
    // Log warnings for unsupported properties
    if (streamCfg[@"ignoreShadowsDisplay"]) {
      DLOG(WARNING) << "ignoreShadowsDisplay requires macOS 14.0+, ignored";
    }
  }
  
  // Apply sourceRect
  if (NSDictionary* sourceRect = streamCfg[@"sourceRect"]) {
    CGFloat x = [sourceRect[@"x"] doubleValue];
    CGFloat y = [sourceRect[@"y"] doubleValue];
    CGFloat width = [sourceRect[@"width"] doubleValue];
    CGFloat height = [sourceRect[@"height"] doubleValue];
    stream_config.sourceRect = CGRectMake(x, y, width, height);
    DLOG(INFO) << "Applied sourceRect: (" << x << "," << y << "," 
               << width << "x" << height << ")";
  }
  
  // Apply backgroundColor
  if (NSString* bgColorHex = streamCfg[@"backgroundColor"]) {
    // Simple hex color parsing (assumes format like "#RRGGBB" or "RRGGBB")
    NSString* hexString = bgColorHex;
    if ([hexString hasPrefix:@"#"]) {
      hexString = [hexString substringFromIndex:1];
    }
    
    if (hexString.length == 6) {
      unsigned int r, g, b;
      [[NSScanner scannerWithString:[hexString substringWithRange:NSMakeRange(0, 2)]] 
          scanHexInt:&r];
      [[NSScanner scannerWithString:[hexString substringWithRange:NSMakeRange(2, 2)]] 
          scanHexInt:&g];
      [[NSScanner scannerWithString:[hexString substringWithRange:NSMakeRange(4, 2)]] 
          scanHexInt:&b];
      
      CGColorRef color = CGColorCreateGenericRGB(r/255.0, g/255.0, b/255.0, 1.0);
      stream_config.backgroundColor = color;
      // Don't release color, because `@property (nonatomic, assign) CGColorRef backgroundColor;` does not auto-retain.
      DLOG(INFO) << "Applied backgroundColor: " << bgColorHex.UTF8String;
    } else {
      DLOG(ERROR) << "Invalid backgroundColor format: " << bgColorHex.UTF8String;
    }
  }
}

bool HasStreamConfigOverrides(NSDictionary* config)
    API_AVAILABLE(macos(12.3)) {
  if (!config) return false;
  NSDictionary* streamCfg = config[@"streamConfiguration"];
  return streamCfg && streamCfg.count > 0;
}

bool HasContentFilterOverrides(NSDictionary* config)
    API_AVAILABLE(macos(12.3)) {
  if (!config) return false;
  NSDictionary* filterCfg = config[@"contentFilter"];
  return filterCfg && filterCfg.count > 0;
}

SCContentFilter* CreateContentFilterFromConfig(
    NSDictionary* config,
    SCShareableContent* shareable_content)
    API_AVAILABLE(macos(12.3)) {
  if (!config || !shareable_content) return nullptr;
  
  NSDictionary* filterCfg = config[@"contentFilter"];
  if (!filterCfg) return nullptr;
  
  // Extract configuration options
  NSNumber* includeMenuBar = filterCfg[@"includeMenuBar"];
  NSArray* includedDisplayIDs = filterCfg[@"includedDisplays"];
  NSArray* includedWindowIDs = filterCfg[@"includedWindows"];
  NSArray* includedApps = filterCfg[@"includedApplications"];
  NSArray* excludedApps = filterCfg[@"excludedApplications"];
  NSArray* excludedWindowIDs = filterCfg[@"excludedWindows"];
  NSArray* exceptingWindowIDs = filterCfg[@"exceptingWindows"];
  
  // Build arrays of actual SC objects
  NSMutableArray<SCDisplay*>* displays = [NSMutableArray array];
  NSMutableArray<SCWindow*>* windows = [NSMutableArray array];
  NSMutableArray<SCRunningApplication*>* includedApplications = [NSMutableArray array];
  NSMutableArray<SCRunningApplication*>* excludedApplications = [NSMutableArray array];
  NSMutableArray<SCWindow*>* excludedWindows = [NSMutableArray array];
  NSMutableArray<SCWindow*>* exceptingWindows = [NSMutableArray array];
  
  // Match displays by ID
  if (includedDisplayIDs && [includedDisplayIDs isKindOfClass:[NSArray class]]) {
    for (id displayIDObj in includedDisplayIDs) {
      if ([displayIDObj isKindOfClass:[NSNumber class]]) {
        CGDirectDisplayID displayID = [displayIDObj unsignedIntValue];
        for (SCDisplay* display in shareable_content.displays) {
          if (display.displayID == displayID) {
            [displays addObject:display];
            break;
          }
        }
      }
    }
  }
  
  // Match windows by ID
  if (includedWindowIDs && [includedWindowIDs isKindOfClass:[NSArray class]]) {
    for (id windowIDObj in includedWindowIDs) {
      if ([windowIDObj isKindOfClass:[NSNumber class]]) {
        CGWindowID windowID = [windowIDObj unsignedIntValue];
        for (SCWindow* window in shareable_content.windows) {
          if (window.windowID == windowID) {
            [windows addObject:window];
            break;
          }
        }
      }
    }
  }
  
  // Match applications by bundle ID or process ID
  if (includedApps && [includedApps isKindOfClass:[NSArray class]]) {
    for (id appObj in includedApps) {
      if ([appObj isKindOfClass:[NSDictionary class]]) {
        NSDictionary* appDict = (NSDictionary*)appObj;
        NSString* bundleID = appDict[@"bundleIdentifier"];
        NSNumber* processID = appDict[@"processID"];
        
        for (SCRunningApplication* app in shareable_content.applications) {
          bool matches = false;
          if (bundleID && [bundleID isKindOfClass:[NSString class]] && [app.bundleIdentifier isEqualToString:bundleID]) {
            matches = true;
          } else if (processID && [processID isKindOfClass:[NSNumber class]] && app.processID == [processID intValue]) {
            matches = true;
          }
          if (matches) {
            [includedApplications addObject:app];
            break;
          }
        }
      }
    }
  }
  
  // Match excluded applications by bundle ID or process ID
  if (excludedApps && [excludedApps isKindOfClass:[NSArray class]]) {
    for (id appObj in excludedApps) {
      if ([appObj isKindOfClass:[NSDictionary class]]) {
        NSDictionary* appDict = (NSDictionary*)appObj;
        NSString* bundleID = appDict[@"bundleIdentifier"];
        NSNumber* processID = appDict[@"processID"];
        
        for (SCRunningApplication* app in shareable_content.applications) {
          bool matches = false;
          if (bundleID && [bundleID isKindOfClass:[NSString class]] && [app.bundleIdentifier isEqualToString:bundleID]) {
            matches = true;
          } else if (processID && [processID isKindOfClass:[NSNumber class]] && app.processID == [processID intValue]) {
            matches = true;
          }
          if (matches) {
            [excludedApplications addObject:app];
            break;
          }
        }
      }
    }
  }
  
  // Match excluded windows by ID
  if (excludedWindowIDs && [excludedWindowIDs isKindOfClass:[NSArray class]]) {
    for (id windowIDObj in excludedWindowIDs) {
      if ([windowIDObj isKindOfClass:[NSNumber class]]) {
        CGWindowID windowID = [windowIDObj unsignedIntValue];
        for (SCWindow* window in shareable_content.windows) {
          if (window.windowID == windowID) {
            [excludedWindows addObject:window];
            break;
          }
        }
      }
    }
  }
  
  // Match excepting windows by ID
  if (exceptingWindowIDs && [exceptingWindowIDs isKindOfClass:[NSArray class]]) {
    for (id windowIDObj in exceptingWindowIDs) {
      if ([windowIDObj isKindOfClass:[NSNumber class]]) {
        CGWindowID windowID = [windowIDObj unsignedIntValue];
        for (SCWindow* window in shareable_content.windows) {
          if (window.windowID == windowID) {
            [exceptingWindows addObject:window];
            break;
          }
        }
      }
    }
  }
  
  // Create the appropriate filter based on what was specified
  // Selection logic follows the priority defined in the header documentation
  SCContentFilter* filter = nullptr;
  
  // 1. Single Window Mode: Only includedWindows with a single window
  if (windows.count == 1 && displays.count == 0 && includedApplications.count == 0 && 
      excludedApplications.count == 0) {
    SCWindow* primaryWindow = windows.firstObject;
    filter = [[SCContentFilter alloc] initWithDesktopIndependentWindow:primaryWindow];
    DLOG(INFO) << "Created single window content filter (desktopIndependentWindow)";
  }
  // 2. Display with Excluded Windows: includedDisplays without includedWindows/includedApplications
  else if (displays.count > 0 && windows.count == 0 && includedApplications.count == 0 && 
           excludedApplications.count == 0 && excludedWindows.count > 0) {
    SCDisplay* primaryDisplay = displays.firstObject;
    filter = [[SCContentFilter alloc] initWithDisplay:primaryDisplay
                                     excludingWindows:excludedWindows];
    DLOG(INFO) << "Created display filter with excluded windows";
  }
  // 3. Display with Included Windows: Both includedDisplays and includedWindows
  else if (displays.count > 0 && windows.count > 0) {
    SCDisplay* primaryDisplay = displays.firstObject;
    filter = [[SCContentFilter alloc] initWithDisplay:primaryDisplay
                                  includingWindows:windows];
    DLOG(INFO) << "Created display filter with included windows";
  }
  // 4. Display with Included Applications: includedDisplays and includedApplications
  else if (displays.count > 0 && includedApplications.count > 0) {
    SCDisplay* primaryDisplay = displays.firstObject;
    filter = [[SCContentFilter alloc] initWithDisplay:primaryDisplay
                                  includingApplications:includedApplications
                                      exceptingWindows:exceptingWindows];
    DLOG(INFO) << "Created display filter with included applications"
               << " (exceptingWindows: " << exceptingWindows.count << ")";
  }
  // 5. Display with Excluded Applications: includedDisplays with excludedApplications/exceptingWindows
  else if (displays.count > 0 && 
           (excludedApplications.count > 0 || exceptingWindows.count > 0)) {
    SCDisplay* primaryDisplay = displays.firstObject;
    filter = [[SCContentFilter alloc] initWithDisplay:primaryDisplay
                                 excludingApplications:excludedApplications
                                      exceptingWindows:exceptingWindows];
    DLOG(INFO) << "Created display filter with excluded applications"
               << " (excludedApps: " << excludedApplications.count 
               << ", exceptingWindows: " << exceptingWindows.count << ")";
  }
  // Fallback: Simple display filter
  else if (displays.count > 0) {
    SCDisplay* primaryDisplay = displays.firstObject;
    filter = [[SCContentFilter alloc] initWithDisplay:primaryDisplay
                                     excludingWindows:@[]];
    DLOG(INFO) << "Created simple display filter";
  }
  // Fallback: Application-based filter requires a display
  else if (includedApplications.count > 0 && shareable_content.displays.count > 0) {
    SCDisplay* mainDisplay = shareable_content.displays.firstObject;
    filter = [[SCContentFilter alloc] initWithDisplay:mainDisplay
                                  includingApplications:includedApplications
                                      exceptingWindows:exceptingWindows];
    DLOG(INFO) << "Created application filter with default display";
  }
  
  // Apply includeMenuBar property if available and specified
  if (filter && includeMenuBar) {
    if (@available(macOS 14.2, *)) {
      filter.includeMenuBar = [includeMenuBar boolValue];
      DLOG(INFO) << "Set includeMenuBar: " << [includeMenuBar boolValue];
    }
  }
  
  if (!filter) {
    DLOG(WARNING) << "Could not create content filter from config";
  }
  
  return filter;
}

}  // namespace content
