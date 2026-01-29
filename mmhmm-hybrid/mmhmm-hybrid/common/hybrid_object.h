#pragma once

#include "include/cef_base.h"
#include "common/v8_callback_executor.h"
#include "common/cef_process_message_handler.h"
#include "common/v8_utility.h"

namespace mmhmm {
  /// The native side of a hybrid object.
  ///
  /// A hybrid object is designed to be available in both the
  /// browser and any renderer process.
  class HybridNativeObject:
  public CefProcessMessageHandler,
  public CefBaseRefCounted {
  public:
    /// Adds a CEF dictionary representation of itself to the dictionary.
    ///
    /// The passed in `dictionary` is populated with a child
    /// dictionary with a key known to the hybrid object.
    ///
    /// - Parameters:
    ///   - dictionary: The dictionary to add to.
    /// - Returns: `true` if the operation was successful.
    virtual bool AddToDictionary(CefRefPtr<CefDictionaryValue> dictionary) const = 0;

    /// Notifies the hybrid projection of this object about a state update.
    virtual void ReportStateUpdate() const = 0;
  };

  /// The V8 projection of a hybrid object.
  ///
  /// A hybrid object is designed to be available in both the
  /// browser and any renderer process.
  class HybridProjectionObject:
  public CefProcessMessageHandler,
  public CefBaseRefCounted,
  public V8CallbackExecutor {
  public:
    /// Attaches a V8 object representation of itself to the passed in `value`.
    ///
    /// The passed in `dictionary` is expected to contain a child
    /// dictionary with a key known to the hybrid object, to allow
    /// it to update its state before creating its V8 object
    /// representation.
    ///
    /// The passed in `context` might or might not have been entered.
    /// According to CEF documentation it is safe to enter a context
    /// multiple times, as long as it is also exited the same amount
    /// of times. Therefore, within the function always enter the context
    /// before touching or creating any V8 objects and exit it before
    /// returning from the function.
    ///
    /// The returned object is expected to be stored by the caller
    /// by adding it to another V8 object
    ///
    /// - Parameters:
    ///   - value: The value to attach to.
    ///   - dictionary: The dictionary to extract the current state from.
    ///   - context: The context in which to create any V8 types.
    /// - Returns: The created and attached object.
    virtual CefRefPtr<CefV8Value> AttachToValueFromDictionary(CefRefPtr<CefV8Value> value,
                                                              CefRefPtr<CefDictionaryValue> dictionary,
                                                              CefRefPtr<CefV8Context> context) = 0;

    /// Updates the state of this hybrid object in the passed in dictionary.
    ///
    /// The passed in `dictionary` is expected to contain a child
    /// dictionary with a key known to the hybrid object, which the
    /// hybrid object should update with its current state.
    ///
    /// - Parameters:
    ///   - dictionary: The dictionary to update.
    virtual void UpdateStateInDictionary(CefRefPtr<CefDictionaryValue> dictionary) = 0;
  };
}
