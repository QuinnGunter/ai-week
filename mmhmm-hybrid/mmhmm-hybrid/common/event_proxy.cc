#include "event_proxy.h"

namespace mmhmm {
  // EventProxyKeys definitions
  const std::string EventProxyKeys::dictionary = "EventProxy.Dictionary";
  const std::string EventProxyKeys::eventName = "name";
  const std::string EventProxyKeys::eventPayload = "payload";

  // EventProxyMessageNames definitions
  const std::string EventProxyMessageNames::emitEvent = "EventProxy.Message.EmitEvent";
  const std::string EventProxyMessageNames::handleEvent = "EventProxy.Message.HandleEvent";
  const std::string EventProxyMessageNames::stateUpdate = "EventProxy.Message.StateUpdate";
}
