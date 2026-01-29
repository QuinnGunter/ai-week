#pragma once

#include <string>

namespace mmhmm {
  /// Keys used in CEF dictionaries for EventProxy state and event data.
  struct EventProxyKeys {
    /// Main dictionary key for EventProxy state (empty for stateless EventProxy).
    static const std::string dictionary;
    
    /// Key for event name in event dictionaries.
    ///
    /// Used in both browser → renderer and renderer → browser events.
    /// Visible as JS object property key.
    static const std::string eventName;
    
    /// Key for event payload data in event dictionaries.
    ///
    /// Used in both browser → renderer and renderer → browser events.
    /// Visible as JS object property key.
    static const std::string eventPayload;
  };

  /// Message names for EventProxy process communication.
  struct EventProxyMessageNames {
    /// Message name for browser → renderer events.
    static const std::string emitEvent;
    
    /// Message name for renderer → browser events.
    static const std::string handleEvent;
    
    /// Message name for state updates (minimal implementation since stateless).
    static const std::string stateUpdate;
  };
}
