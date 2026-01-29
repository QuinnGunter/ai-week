# Calendar Menu Bar App Implementation Plan

## Overview

Extend the existing **Airtime Menu** app (`mac/Airtime Menu/`) to add a Raycast-style calendar menu bar feature that:
- Shows next meeting in the menu bar with countdown timer
- Displays agenda grouped by day (Today + 3 days)
- Detects and offers to join video conference links (Zoom, Meet, Teams)
- Integrates with macOS system calendars via EventKit

## Requirements
- Extend existing Airtime Menu (not a separate app)
- Include "Join" button for detected conference links
- Show Today + 3 days of events
- Do not change existing functionality

## Reference
- Screenshot of Raycast calendar for UI inspiration: `/Users/quinn/Desktop/Screenshot 2025-12-15 at 9.14.25 AM.png`

---

## Architecture

The existing Airtime Menu app uses:
- SwiftUI `MenuBarExtra` for the menu bar item
- `@MainActor` isolated `ObservableObject` models
- `@AppStorage` for persistent preferences
- XPC for communication with main app (not needed for calendar)

Key existing files to reference for patterns:
- `mac/Airtime Menu/Application/AirtimeMenuBarApp.swift` - Main app structure with MenuBarExtra
- `mac/Airtime Menu/Application/AirtimeMenuBarApp.Model.swift` - Model pattern with @Published properties
- `mac/Airtime Menu/Views/MainMenuContentView.swift` - Menu content structure
- `mac/Airtime Menu/Views/Settings/SettingsView.swift` - Settings UI pattern

---

## Implementation Steps

### Step 1: Add EventKit Framework & Entitlements

**Files to modify:**
- `mac/mmhmm.xcodeproj/project.pbxproj` - Add EventKit framework to Airtime Menu target
- `mac/Airtime Menu/Airtime Menu.entitlements` - Add calendar entitlement

**Add to entitlements:**
```xml
<key>com.apple.security.personal-information.calendars</key>
<true/>
```

**Add to Info.plist:**
```xml
<key>NSCalendarsUsageDescription</key>
<string>Display your upcoming meetings in the menu bar</string>
```

---

### Step 2: Create CalendarManager (EventKit Integration)

**New file:** `mac/Airtime Menu/Calendar/CalendarManager.swift`

```swift
import EventKit
import Combine

@MainActor
final class CalendarManager: ObservableObject {
    private let eventStore = EKEventStore()

    @Published private(set) var authorizationStatus: EKAuthorizationStatus
    @Published private(set) var events: [EKEvent] = []
    @Published private(set) var calendars: [EKCalendar] = []

    // Request calendar access
    func requestAccess() async -> Bool

    // Fetch events for next 3 days
    func refreshEvents()

    // Get enabled calendars from user preferences
    func enabledCalendars() -> [EKCalendar]

    // Start watching for calendar changes
    func startMonitoring()
}
```

**Key functionality:**
- Request `EKAuthorizationStatus.fullAccess` (macOS 14+) or `.authorized` (older)
- Fetch events using `EKEventStore.events(matching:)`
- Listen for `EKEventStoreChangedNotification` to refresh
- Filter by user-selected calendars stored in `@AppStorage`

---

### Step 3: Create MeetingLinkDetector (Conference URL Parsing)

**New file:** `mac/Airtime Menu/Calendar/MeetingLinkDetector.swift`

```swift
struct MeetingLinkDetector {
    enum MeetingType {
        case zoom
        case googleMeet
        case teams
        case webex
        case unknown(URL)
    }

    struct DetectedMeeting {
        let type: MeetingType
        let url: URL
        let displayName: String  // "Zoom", "Google Meet", etc.
    }

    // Extract meeting link from event notes, URL field, or location
    static func detectMeetingLink(in event: EKEvent) -> DetectedMeeting?
}
```

**Detection patterns:**
- Zoom: `zoom.us/j/`, `zoom.us/my/`
- Google Meet: `meet.google.com/`
- Teams: `teams.microsoft.com/l/meetup-join`
- WebEx: `webex.com/meet/`

---

### Step 4: Create CalendarEvent Model

**New file:** `mac/Airtime Menu/Calendar/CalendarEvent.swift`

```swift
struct CalendarEvent: Identifiable {
    let id: String
    let title: String
    let startDate: Date
    let endDate: Date
    let isAllDay: Bool
    let calendarColor: Color
    let calendarName: String
    let meetingLink: MeetingLinkDetector.DetectedMeeting?
    let location: String?

    init(from ekEvent: EKEvent)

    var timeUntilStart: TimeInterval
    var isHappeningSoon: Bool  // < 15 minutes
    var isHappeningNow: Bool
    var formattedTimeRange: String  // "10:00 AM - 11:00 AM"
    var formattedCountdown: String  // "in 46m"
}
```

---

### Step 5: Create CalendarModel (State Management)

**New file:** `mac/Airtime Menu/Calendar/CalendarModel.swift`

```swift
@MainActor
final class CalendarModel: ObservableObject {
    @Published private(set) var nextEvent: CalendarEvent?
    @Published private(set) var eventsByDay: [DaySection] = []
    @Published private(set) var isLoading = false

    private let calendarManager: CalendarManager
    private var refreshTimer: Timer?

    struct DaySection: Identifiable {
        let id: Date
        let title: String  // "Today, Dec 15", "Tomorrow, Dec 16"
        let events: [CalendarEvent]
    }

    // Refresh events and update state
    func refresh()

    // Start 1-minute timer for countdown updates
    func startCountdownTimer()

    // Join meeting URL
    func joinMeeting(_ event: CalendarEvent)

    // Open event in Calendar app
    func openInCalendar(_ event: CalendarEvent)

    // Dismiss/hide event temporarily
    func dismissEvent(_ event: CalendarEvent)
}
```

---

### Step 6: Create SwiftUI Views

**New files in `mac/Airtime Menu/Views/Calendar/`:**

#### CalendarMenuBarLabel.swift
```swift
struct CalendarMenuBarLabel: View {
    @ObservedObject var model: CalendarModel

    var body: some View {
        if let event = model.nextEvent {
            // Show: "Meeting Name • in 46m"
            Text("\(event.title) • \(event.formattedCountdown)")
        } else {
            Image(systemName: "calendar")
        }
    }
}
```

#### CalendarMenuContentView.swift
```swift
struct CalendarMenuContentView: View {
    @ObservedObject var model: CalendarModel

    var body: some View {
        // Current event actions (if any)
        if let nextEvent = model.nextEvent, nextEvent.isHappeningSoon {
            CurrentEventActionsView(event: nextEvent, model: model)
            Divider()
        }

        // Events grouped by day
        ForEach(model.eventsByDay) { section in
            DaySectionView(section: section, model: model)
        }

        Divider()

        // Settings & Calendar app link
        Button("Open Calendar") {
            NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:")!)
        }
        .keyboardShortcut("o")
    }
}
```

#### CurrentEventActionsView.swift
```swift
struct CurrentEventActionsView: View {
    let event: CalendarEvent
    @ObservedObject var model: CalendarModel

    var body: some View {
        if let meeting = event.meetingLink {
            Button("Join \(meeting.displayName)") {
                model.joinMeeting(event)
            }
            .keyboardShortcut(.return)
        }

        Button("Open in Calendar") {
            model.openInCalendar(event)
        }

        Button("Dismiss Event") {
            model.dismissEvent(event)
        }
    }
}
```

#### EventRowView.swift
```swift
struct EventRowView: View {
    let event: CalendarEvent
    @ObservedObject var model: CalendarModel

    var body: some View {
        HStack {
            Circle()
                .fill(event.calendarColor)
                .frame(width: 8, height: 8)

            VStack(alignment: .leading) {
                Text(event.formattedTimeRange)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(event.title)
            }

            Spacer()

            if event.meetingLink != nil {
                Image(systemName: "video")
                    .foregroundColor(.secondary)
            }
        }
    }
}
```

#### DaySectionView.swift
```swift
struct DaySectionView: View {
    let section: CalendarModel.DaySection
    @ObservedObject var model: CalendarModel

    var body: some View {
        Section(section.title) {
            // All-day events first
            ForEach(section.events.filter(\.isAllDay)) { event in
                AllDayEventRowView(event: event)
            }

            // Timed events
            ForEach(section.events.filter { !$0.isAllDay }) { event in
                Button {
                    if event.meetingLink != nil {
                        model.joinMeeting(event)
                    } else {
                        model.openInCalendar(event)
                    }
                } label: {
                    EventRowView(event: event, model: model)
                }
            }
        }
    }
}
```

#### AllDayEventRowView.swift
```swift
struct AllDayEventRowView: View {
    let event: CalendarEvent

    var body: some View {
        HStack {
            Circle()
                .stroke(event.calendarColor, lineWidth: 2)
                .frame(width: 8, height: 8)

            Text("All day:")
                .font(.caption)
                .foregroundColor(.secondary)

            Text(event.title)
        }
    }
}
```

---

### Step 7: Integrate into AirtimeMenuBarApp

**File to modify:** `mac/Airtime Menu/Application/AirtimeMenuBarApp.swift`

```swift
@main
struct AirtimeMenuBarApp: App {
    @ObservedObject private var model = Model()
    @StateObject private var calendarModel = CalendarModel()  // NEW

    var body: some Scene {
        // Existing Airtime menu bar item
        MenuBarExtra {
            MainMenuContentView(model: model)
        } label: {
            // ... existing label
        }

        // NEW: Calendar menu bar item
        MenuBarExtra {
            CalendarMenuContentView(model: calendarModel)
        } label: {
            CalendarMenuBarLabel(model: calendarModel)
        }
        .menuBarExtraStyle(.window)  // Allows richer SwiftUI content

        // Existing settings window
        Window("Airtime Settings", id: WindowIdentifiers.settings.rawValue) {
            SettingsView(model: model)
        }
        // ...
    }
}
```

---

### Step 8: Add Calendar Settings Section

**File to modify:** `mac/Airtime Menu/Views/Settings/SettingsView.swift`

Add a new section for calendar preferences:
- Toggle calendars on/off
- Configure refresh interval
- Toggle meeting link detection

---

## File Summary

| Action | File Path |
|--------|-----------|
| Modify | `mac/Airtime Menu/Airtime Menu.entitlements` |
| Modify | `mac/Airtime Menu/Info.plist` |
| Modify | `mac/mmhmm.xcodeproj/project.pbxproj` |
| Modify | `mac/Airtime Menu/Application/AirtimeMenuBarApp.swift` |
| Modify | `mac/Airtime Menu/Views/Settings/SettingsView.swift` |
| Create | `mac/Airtime Menu/Calendar/CalendarManager.swift` |
| Create | `mac/Airtime Menu/Calendar/CalendarModel.swift` |
| Create | `mac/Airtime Menu/Calendar/CalendarEvent.swift` |
| Create | `mac/Airtime Menu/Calendar/MeetingLinkDetector.swift` |
| Create | `mac/Airtime Menu/Views/Calendar/CalendarMenuContentView.swift` |
| Create | `mac/Airtime Menu/Views/Calendar/CalendarMenuBarLabel.swift` |
| Create | `mac/Airtime Menu/Views/Calendar/CurrentEventActionsView.swift` |
| Create | `mac/Airtime Menu/Views/Calendar/EventRowView.swift` |
| Create | `mac/Airtime Menu/Views/Calendar/DaySectionView.swift` |
| Create | `mac/Airtime Menu/Views/Calendar/AllDayEventRowView.swift` |

---

## Testing Checklist

- [ ] Calendar permission prompt appears on first launch
- [ ] Events load from all connected calendar accounts
- [ ] Menu bar shows next event with countdown
- [ ] Countdown updates every minute
- [ ] Events grouped correctly by day
- [ ] All-day events shown separately
- [ ] Zoom/Meet/Teams links detected and "Join" button works
- [ ] "Open in Calendar" opens macOS Calendar app
- [ ] Settings allow toggling calendars
- [ ] No changes to existing Airtime Menu functionality
