//
// mmhmm Windows
// Copyright � 2020-2022 mmhmm, inc. All rights reserved.
//
#ifndef THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_MMHMM_CAMERA_H_
#define THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_MMHMM_CAMERA_H_

#include <memory>
#include "third_party/blink/renderer/bindings/core/v8/active_script_wrappable.h"
#include "third_party/blink/renderer/core/dom/events/event_target.h"
#include "third_party/blink/renderer/core/execution_context/execution_context_lifecycle_observer.h"
#include "third_party/blink/renderer/modules/event_target_modules.h"
#include "third_party/blink/renderer/modules/mmhmmcamera/mmhmm_camera_handler.h"
#include "third_party/blink/renderer/modules/mediastream/media_stream.h"
#include "third_party/blink/renderer/modules/modules_export.h"
#include "third_party/blink/renderer/platform/mojo/heap_mojo_remote.h"

#include "mojo/public/cpp/bindings/remote.h"
#include "third_party/blink/public/mojom/mappedmemory/mapped_memory.mojom-blink.h"

namespace blink {

class ExceptionState;
class V8CameraState;

class MODULES_EXPORT MmhmmCamera
    : public EventTarget,
      public ActiveScriptWrappable<MmhmmCamera>,
      public ExecutionContextLifecycleObserver {
  DEFINE_WRAPPERTYPEINFO();

 public:
  enum class CameraState { kInactive = 0, kStreaming };

  static MmhmmCamera* Create(ExecutionContext* context,
                               MediaStream* stream,
                               ExceptionState& exception_state);
                               
  MmhmmCamera(ExecutionContext* context,
              MediaStream* stream,
              ExceptionState& exception_state);

  ~MmhmmCamera() override;

  MediaStream* stream() const { return stream_.Get(); }
  V8CameraState state() const;

  DEFINE_ATTRIBUTE_EVENT_LISTENER(start, kStart)
  DEFINE_ATTRIBUTE_EVENT_LISTENER(stop, kStop)
  DEFINE_ATTRIBUTE_EVENT_LISTENER(error, kError)

  void start(ExceptionState& exception_state);
  void stop(ExceptionState& exception_state);

  // EventTarget
  const AtomicString& InterfaceName() const override;
  ExecutionContext* GetExecutionContext() const override;

  // ExecutionContextLifecycleObserver
  void ContextDestroyed() override;

  // ScriptWrappable
  bool HasPendingActivity() const final { return state_ != CameraState::kInactive; }

  virtual void WriteData(const char* data,
                         size_t length,
                         bool last_in_slice,
                         double timecode);

  virtual void OnError(const String& message);

  // Causes streaming to be stopped and onstop to
  // be sent, unless streaming isn't active in which case nothing happens.
  void OnAllStreamsEnded();

  void Trace(Visitor* visitor) const override;

  void InitializeCallback(bool result);

  void WriteFrameCallback(int32_t tracker_id);

  void SendFrame(gfx::GpuMemoryBufferHandle handle);

 private:

  void StopStreaming();
  void ScheduleDispatchEvent(Event* event);
  void DispatchScheduledEvent();

  Member<MediaStream> stream_;

  MmhmmCamera::CameraState state_;
  bool first_write_received_ = false;
  Member<MmhmmCameraHandler> camera_handler_;
  HeapVector<Member<Event>> scheduled_events_;

  blink::HeapMojoRemote<mojom::blink::MappedMemory> mapped_memory_;
};

}  // namespace blink

#endif  // THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_MMHMM_CAMERA_H_
