// MMHMM: Stream configuration helpers
#ifndef CONTENT_BROWSER_MEDIA_CAPTURE_SCREEN_CAPTURE_KIT_CONFIG_MAC_H_
#define CONTENT_BROWSER_MEDIA_CAPTURE_SCREEN_CAPTURE_KIT_CONFIG_MAC_H_

#import <ScreenCaptureKit/ScreenCaptureKit.h>
#include <string>

namespace content {

// Deserialize and validate JSON configuration
// JSON Schema (max 8KB):
// {
//   "version": 1,
//   "streamConfiguration": {
//     "showsCursor": bool,
//     "sourceRect": {"x": number, "y": number, "width": number, "height": number},
//     "backgroundColor": string,
//     "shouldBeOpaque": bool,
//     "ignoreShadowsDisplay": bool,
//     "ignoreShadowsSingleWindow": bool,
//     "ignoreGlobalClipDisplay": bool,
//     "ignoreGlobalClipSingleWindow": bool
//   },
//   "contentFilter": {
//     "includeMenuBar": bool,
//     "includedApplications": [{"bundleIdentifier": string, "processID": number}],
//     "includedDisplays": [number],
//     "includedWindows": [number],
//     "excludedApplications": [{"bundleIdentifier": string, "processID": number}],
//     "excludedWindows": [number],
//     "exceptingWindows": [number]
//   }
// }
NSDictionary* DeserializeStreamConfiguration(const std::string& json)
    API_AVAILABLE(macos(12.3));

// Apply stream configuration properties to SCStreamConfiguration
void ApplyCustomConfigurationToStreamConfiguration(SCStreamConfiguration* stream_config, 
                                                   NSDictionary* config)
    API_AVAILABLE(macos(12.3));

// Check if configuration has stream config overrides
bool HasStreamConfigOverrides(NSDictionary* config)
    API_AVAILABLE(macos(12.3));

// Validate JSON structure and types
bool ValidateStreamConfigurationStructure(NSDictionary* config)
    API_AVAILABLE(macos(12.3));

// Check if configuration has content filter overrides
bool HasContentFilterOverrides(NSDictionary* config)
    API_AVAILABLE(macos(12.3));

// Create SCContentFilter from JSON configuration
// Returns nullptr if no valid content filter data found
//
// SCContentFilter Initialization Selection Logic:
// The function selects the appropriate SCContentFilter initializer based on
// the combination of properties present in the contentFilter configuration:
//
// 1. Single Window Mode:
//    - If only "includedWindows" is present with a single window:
//      Uses: initWithDesktopIndependentWindow:
//
// 2. Display with Excluded Windows:
//    - If "includedDisplays" is present without "includedWindows" or 
//      "includedApplications", but with "excludedWindows":
//      Uses: initWithDisplay:excludingWindows:
//
// 3. Display with Included Windows:
//    - If both "includedDisplays" and "includedWindows" are present:
//      Uses: initWithDisplay:includingWindows: (windows variant)
//
// 4. Display with Included Applications:
//    - If both "includedDisplays" and "includedApplications" are present:
//      Uses: initWithDisplay:includingApplications:exceptingWindows: (applications variant)
//      Note: "exceptingWindows" can optionally be included
//
// 5. Display with Excluded Applications:
//    - If "includedDisplays" is present with "excludedApplications" 
//      and/or "exceptingWindows":
//      Uses: initWithDisplay:excludingApplications:exceptingWindows:
//
// In all display-based cases, the first display from "includedDisplays" is used.
// The "includeMenuBar" property (macOS 14.2+) is applied when available.
SCContentFilter* CreateContentFilterFromConfig(
    NSDictionary* config,
    SCShareableContent* shareable_content)
    API_AVAILABLE(macos(12.3));

}  // namespace content

#endif  // CONTENT_BROWSER_MEDIA_CAPTURE_SCREEN_CAPTURE_KIT_CONFIG_MAC_H_
