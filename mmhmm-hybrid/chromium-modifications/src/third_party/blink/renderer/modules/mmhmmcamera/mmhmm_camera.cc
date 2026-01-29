//
// mmhmm Windows
// Copyright © 2020-2022 mmhmm, inc. All rights reserved.
//
#include "third_party/blink/renderer/modules/mmhmmcamera/mmhmm_camera.h"

#include <algorithm>
#include <limits>
#include "third_party/blink/public/common/privacy_budget/identifiability_metric_builder.h"
#include "third_party/blink/public/common/privacy_budget/identifiability_study_settings.h"
#include "third_party/blink/public/common/privacy_budget/identifiable_surface.h"
#include "third_party/blink/public/platform/browser_interface_broker_proxy.h"
#include "third_party/blink/public/platform/platform.h"
#include "third_party/blink/public/platform/task_type.h"
#include "third_party/blink/renderer/bindings/core/v8/dictionary.h"
#include "third_party/blink/renderer/bindings/modules/v8/v8_camera_state.h"
#include "third_party/blink/renderer/core/dom/events/event.h"
#include "third_party/blink/renderer/core/execution_context/execution_context.h"
#include "third_party/blink/renderer/core/inspector/console_message.h"
#include "third_party/blink/renderer/modules/event_target_modules.h"
#include "third_party/blink/renderer/platform/heap/garbage_collected.h"
#include "third_party/blink/renderer/platform/mediastream/media_stream_descriptor.h"
#include "third_party/blink/renderer/platform/network/mime/content_type.h"
#include "third_party/blink/renderer/platform/privacy_budget/identifiability_digest_helpers.h"
#include "third_party/blink/renderer/platform/wtf/functional.h"
#include "third_party/blink/renderer/platform/wtf/text/wtf_string.h"

#include <string>

namespace blink {

namespace {


V8CameraState::Enum StateToV8Enum(MmhmmCamera::CameraState state) {
  switch (state) {
    case MmhmmCamera::CameraState::kInactive:
      return V8CameraState::Enum::kInactive;
    case MmhmmCamera::CameraState::kStreaming:
      return V8CameraState::Enum::kStreaming;
  }

  NOTREACHED();
}

}  // namespace

MmhmmCamera* MmhmmCamera::Create(ExecutionContext* context,
                                     MediaStream* stream,
                                     ExceptionState& exception_state){
  return MakeGarbageCollected<MmhmmCamera>(
      context, stream, exception_state);
}

MmhmmCamera::MmhmmCamera(ExecutionContext* context,
                             MediaStream* stream,
                             ExceptionState& exception_state)
    : ActiveScriptWrappable<MmhmmCamera>({}),
      ExecutionContextLifecycleObserver(context),
      stream_(stream),
      state_(CameraState::kInactive),
      mapped_memory_(context){
  if (context->IsContextDestroyed()) {
    exception_state.ThrowDOMException(DOMExceptionCode::kNotAllowedError,
                                      "Execution context is detached.");
    return;
  }

  camera_handler_ = MakeGarbageCollected<MmhmmCameraHandler>(
      context->GetTaskRunner(TaskType::kInternalMediaRealTime));
  if (!camera_handler_) {
    exception_state.ThrowDOMException(
        DOMExceptionCode::kNotSupportedError,
        "No MmhmmCamera handler can be created.");
    return;
  }

  // create pipe to browser process
  auto task_runner = context->GetTaskRunner(TaskType::kMiscPlatformAPI);
  context->GetBrowserInterfaceBroker().GetInterface(
      mapped_memory_.BindNewPipeAndPassReceiver(task_runner));

  //request the browser process to initialize pipeline
  mapped_memory_->Initialize(WTF::BindOnce(&MmhmmCamera::InitializeCallback,
      WrapPersistent(this)));

  if (!camera_handler_->Initialize(this, stream->Descriptor())) {
    exception_state.ThrowDOMException(
        DOMExceptionCode::kNotSupportedError,
        "Failed to initialize native MmhmmCamera");
  }
}

void MmhmmCamera::InitializeCallback(bool result)
{
    if (result)
    {
        DLOG(INFO) << "bridge initialized";
    }
    else
    {
        DLOG(WARNING) << "failed to initialize bridge";
    }
}

void MmhmmCamera::SendFrame(gfx::GpuMemoryBufferHandle handle) {
    mapped_memory_->SendHandle(std::move(handle));
}

void MmhmmCamera::WriteFrameCallback(int32_t tracker_id)
{
    
}

MmhmmCamera::~MmhmmCamera() = default;

V8CameraState MmhmmCamera::state() const {
  return V8CameraState(StateToV8Enum(state_));
}


void MmhmmCamera::start(ExceptionState& exception_state) {
  if (!GetExecutionContext() || GetExecutionContext()->IsContextDestroyed()) {
    exception_state.ThrowDOMException(DOMExceptionCode::kNotAllowedError,
                                      "Execution context is detached.");
    return;
  }
  if (state_ != CameraState::kInactive) {
    exception_state.ThrowDOMException(
        DOMExceptionCode::kInvalidStateError,
        "The MmhmmCamera's state is '" + state().AsString() + "'.");
    return;
  }

  if (stream_->getTracks().size() == 0) {
    exception_state.ThrowDOMException(DOMExceptionCode::kUnknownError,
                                      "The MmhmmCamera cannot start because"
                                      "there are no audio or video tracks "
                                      "available.");
    return;
  }

  state_ = CameraState::kStreaming;

  if (!camera_handler_->Start()) {
    exception_state.ThrowDOMException(
        DOMExceptionCode::kUnknownError,
        "There was an error starting the MmhmmCamera.");
  }
}

void MmhmmCamera::stop(ExceptionState& exception_state) {
  if (!GetExecutionContext() || GetExecutionContext()->IsContextDestroyed()) {
    exception_state.ThrowDOMException(DOMExceptionCode::kNotAllowedError,
                                      "Execution context is detached.");
    return;
  }
  if (state_ == CameraState::kInactive) {
    exception_state.ThrowDOMException(
        DOMExceptionCode::kInvalidStateError,
        "The MmhmmCamera's state is '" + state().AsString() + "'.");
    return;
  }

  StopStreaming();
}

const AtomicString& MmhmmCamera::InterfaceName() const {
  return event_target_names::kMmhmmCamera;
}

ExecutionContext* MmhmmCamera::GetExecutionContext() const {
  return ExecutionContextLifecycleObserver::GetExecutionContext();
}

void MmhmmCamera::ContextDestroyed() {

  state_ = CameraState::kInactive;
  stream_.Clear();
  camera_handler_->Stop();
  camera_handler_ = nullptr;
}

void MmhmmCamera::WriteData(const char* data,
                              size_t length,
                              bool last_in_slice,
                              double timecode) {
  // Update mime_type_ when "onstart" is sent by the MmhmmCamera. This method
  // is used also from StopRecording, with a zero length. If we never wrote
  // anything we don't want to send start or associated actions (update the mime
  // type in that case).
  if (!first_write_received_ && length) {
    ScheduleDispatchEvent(Event::Create(event_type_names::kStart));
    first_write_received_ = true;
  }

    //TODO RJ: Send to virtual camera
}

void MmhmmCamera::OnError(const String& message) {
  DLOG(ERROR) << message.Ascii();
  StopStreaming();
  ScheduleDispatchEvent(Event::Create(event_type_names::kError));
}

void MmhmmCamera::OnAllStreamsEnded() {
  StopStreaming();
}

void MmhmmCamera::StopStreaming() {
  if (state_ == CameraState::kInactive) {
    // This may happen if all tracks have ended and recording has stopped or
    // never started.
    return;
  }
  if (!camera_handler_) {
    // This may happen when ContextDestroyed has executed, but the
    // MediaRecorderHandler still exists and all tracks
    // have ended leading to a call to OnAllTracksEnded.
    return;
  }
  // Make sure that starting the recorder again yields an onstart event.
  first_write_received_ = false;
  state_ = CameraState::kInactive;

  camera_handler_->Stop();

  ScheduleDispatchEvent(Event::Create(event_type_names::kStop));
}

void MmhmmCamera::ScheduleDispatchEvent(Event* event) {
  scheduled_events_.push_back(event);
  // Only schedule a post if we are placing the first item in the queue.
  if (scheduled_events_.size() == 1) {
    if (auto* context = GetExecutionContext()) {
      // MediaStream recording should use DOM manipulation task source.
      // https://www.w3.org/TR/mediastream-recording/
      context->GetTaskRunner(TaskType::kDOMManipulation)
          ->PostTask(FROM_HERE,
                     WTF::BindOnce(&MmhmmCamera::DispatchScheduledEvent,
                               WrapPersistent(this)));
    }
  }
}

void MmhmmCamera::DispatchScheduledEvent() {
  HeapVector<Member<Event>> events;
  events.swap(scheduled_events_);

  for (const auto& event : events)
    DispatchEvent(*event);
}

void MmhmmCamera::Trace(Visitor* visitor) const {
  visitor->Trace(stream_);
  visitor->Trace(camera_handler_);
  visitor->Trace(scheduled_events_);
  visitor->Trace(mapped_memory_);
  EventTarget::Trace(visitor);
  ExecutionContextLifecycleObserver::Trace(visitor);
}

}  // namespace blink
