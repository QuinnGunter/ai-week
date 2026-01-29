//
// mmhmm Windows
// Copyright © 2020-2022 mmhmm, inc. All rights reserved.
//

#ifndef THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_MMHMM_CAMERA_HANDLER_H_
#define THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_MMHMM_CAMERA_HANDLER_H_

#include <memory>

#include "base/task/single_thread_task_runner.h"
#include "base/threading/thread_checker.h"
#include "base/time/time.h"
#include "third_party/abseil-cpp/absl/types/optional.h"
#include "third_party/blink/public/web/modules/mediastream/encoded_video_frame.h"
#include "third_party/blink/renderer/modules/mmhmmcamera/audio_track_camera_stream.h"
#include "third_party/blink/renderer/modules/mmhmmcamera/video_track_camera_stream.h"
#include "third_party/blink/renderer/modules/mmhmmcamera/task_tracker.h"
#include "third_party/blink/renderer/modules/modules_export.h"
#include "third_party/blink/renderer/platform/heap/collection_support/heap_vector.h"
#include "third_party/blink/renderer/platform/wtf/allocator/allocator.h"
#include "third_party/blink/renderer/platform/wtf/text/wtf_string.h"
#include "third_party/blink/renderer/platform/wtf/vector.h"

#include "third_party/blink/public/mojom/mappedmemory/mapped_memory.mojom-blink.h"

namespace media {
class AudioBus;
class AudioParameters;
class VideoFrame;
}  // namespace media

namespace blink {

class MmhmmCamera;
class MediaStreamDescriptor;
struct WebMediaCapabilitiesInfo;
struct WebMediaConfiguration;

static constexpr int MaxTaskCount = 3;

// MmhmmCameraHandler orchestrates the creation, lifetime management and
// mapping between:
// - MediaStreamTrack(s) providing data,
// - {Audio,Video}CameraStreams that forward the data,
// All methods are called on the same thread as construction and destruction,
// i.e. the Main Render thread. (Note that a BindToCurrentLoop is used to
// guarantee this, since VideoTrackRecorder sends back frames on IO thread.)
class MODULES_EXPORT MmhmmCameraHandler final
    : public GarbageCollected<MmhmmCameraHandler> {
 public:
  explicit MmhmmCameraHandler(
      scoped_refptr<base::SingleThreadTaskRunner> task_runner);

  MmhmmCameraHandler(const MmhmmCameraHandler&) = delete;
  MmhmmCameraHandler& operator=(const MmhmmCameraHandler&) = delete;

  ~MmhmmCameraHandler();

  bool Initialize(MmhmmCamera* client,
                  MediaStreamDescriptor* media_stream);

  bool Start();
  void Stop();

  void Trace(Visitor*) const;

 private:
  friend class MmhmmCameraHandlerFixture;

  // Called to indicate there is frame video data available.
  void OnFrameReceived(gfx::GpuMemoryBufferHandle gmb_handle, int taskToken);

  // Updates |video_tracks_|,|audio_tracks_| and returns true if any changed.
  bool UpdateTracksAndCheckIfChanged();

  // Stops recording if all sources are ended
  void OnSourceReadyStateChanged();

  void UpdateTrackLiveAndEnabled(const MediaStreamComponent& track,
                                 bool is_video);

  bool invalidated_ = false;
  bool streaming_;
  // The MediaStream being recorded.
  Member<MediaStreamDescriptor> media_stream_;
  HeapVector<Member<MediaStreamComponent>> video_tracks_;
  HeapVector<Member<MediaStreamComponent>> audio_tracks_;

  scoped_refptr<mmhmm::TaskTracker> taskTracker_;

  Member<MmhmmCamera> camera_;
  
  Vector<std::unique_ptr<VideoTrackCameraStream>> video_streams_;
  Vector<std::unique_ptr<AudioTrackCameraStream>> audio_streams_;

  scoped_refptr<base::SingleThreadTaskRunner> task_runner_;
};

}  // namespace blink
#endif  // THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_MMHMM_CAMERA_HANDLER_H_
