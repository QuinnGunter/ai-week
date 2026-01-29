//
// mmhmm Windows
// Copyright © 2020-2022 mmhmm, inc. All rights reserved.
//
#ifndef THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_VIDEO_TRACK_CAMERA_STREAM_H_
#define THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_VIDEO_TRACK_CAMERA_STREAM_H_

#include <atomic>
#include <memory>
#include <vector>
#include <queue>

#include "base/memory/weak_ptr.h"
#include "base/sequence_checker.h"
#include "base/task/sequenced_task_runner.h"
#include "base/threading/thread_checker.h"
#include "base/time/time.h"
#include "build/build_config.h"
#include "media/base/video_frame_pool.h"
#include "media/video/video_encode_accelerator.h"
#include "third_party/blink/public/platform/media/video_capture.h"
#include "third_party/blink/public/web/modules/mediastream/encoded_video_frame.h"
#include "third_party/blink/public/web/modules/mediastream/media_stream_video_sink.h"
#include "third_party/blink/renderer/modules/mmhmmcamera/track_camera_stream.h"
#include "third_party/blink/renderer/modules/mmhmmcamera/task_tracker.h"
#include "third_party/blink/renderer/modules/modules_export.h"
#include "third_party/blink/renderer/platform/wtf/cross_thread_copier.h"
#include "third_party/blink/renderer/platform/wtf/functional.h"
#include "third_party/blink/renderer/platform/wtf/hash_map.h"
#include "third_party/blink/renderer/platform/wtf/thread_safe_ref_counted.h"
#include "third_party/skia/include/core/SkBitmap.h"


#include "third_party/blink/public/mojom/mappedmemory/mapped_memory.mojom-blink.h"

namespace cc {
    class PaintCanvas;
}  // namespace cc

namespace media {
    class PaintCanvasVideoRenderer;
    class VideoFrame;
}  // namespace media

namespace blink {

class MediaStreamVideoTrack;
class NonMainThread;
class WebGraphicsContext3DProvider;

// Base class serving as interface for eventually saving encoded frames stemming
// from media from a source.
class VideoTrackCameraStream : public TrackCameraStream<MediaStreamVideoSink> {
 public:

  using OnFrameReceivedCB = base::RepeatingCallback<void(
      gfx::GpuMemoryBufferHandle gmb_handle, int taskToken)>;
  using OnErrorCB = base::RepeatingClosure;

  explicit VideoTrackCameraStream(base::OnceClosure on_track_source_ended_cb);
};

class MODULES_EXPORT VideoFrameHandler : public blink::ThreadSafeRefCounted<VideoFrameHandler> {
public:
    VideoFrameHandler( scoped_refptr<base::SequencedTaskRunner> main_task_runner,
        VideoTrackCameraStream::OnFrameReceivedCB on_frame_received_cb,
        scoped_refptr<mmhmm::TaskTracker> taskTracker,
        scoped_refptr<base::SequencedTaskRunner> ipc_task_runner = nullptr);

    VideoFrameHandler(const VideoFrameHandler&) = delete;
    VideoFrameHandler& operator=(const VideoFrameHandler&) = delete;

    void VideoFrameReceived(scoped_refptr<media::VideoFrame> video_frame,
        base::TimeTicks capture_timestamp);

protected:
    friend class blink::ThreadSafeRefCounted<VideoFrameHandler>;

    // This destructor may run on either |main_task_runner|,
    // |encoding_task_runner|, or |origin_task_runner_|. Main ownership lies
    // with VideoTrackRecorder. Shared ownership is handed out to
    // asynchronous tasks running on |encoding_task_runner| for encoding. Shared
    // ownership is also handed out to a MediaStreamVideoTrack which pushes
    // frames on |origin_task_runner_|. Each of these may end up being the last
    // reference.
    virtual ~VideoFrameHandler();

    // Used to shutdown properly on the same thread we were created.
    const scoped_refptr<base::SequencedTaskRunner> main_task_runner_;

    // Task runner where frames to encode and reply callbacks must happen.
    scoped_refptr<base::SequencedTaskRunner> origin_task_runner_;
    SEQUENCE_CHECKER(origin_sequence_checker_);

    // Task runner where ipc interactions happen.
    scoped_refptr<base::SequencedTaskRunner> ipc_task_runner_;
    SEQUENCE_CHECKER(ipc_sequence_checker_);

    // Optional thread for ipc ops
    std::unique_ptr<NonMainThread> ipc_thread_;

    const VideoTrackCameraStream::OnFrameReceivedCB on_frame_received_cb_;

    void ProcessVideoFrame(scoped_refptr<media::VideoFrame> video_frame,
        base::TimeTicks capture_timestamp, int taskToken);

    // Used to retrieve incoming opaque VideoFrames (i.e. VideoFrames backed by
  // textures). Created on-demand on |main_task_runner_|.
    std::unique_ptr<media::PaintCanvasVideoRenderer> video_renderer_;
    SkBitmap bitmap_;
    std::unique_ptr<cc::PaintCanvas> canvas_;

    media::VideoFramePool frame_pool_;
    std::unique_ptr<WebGraphicsContext3DProvider> ipc_thread_context_;
    scoped_refptr<mmhmm::TaskTracker> taskTracker_;
};

// VideoTrackCameraStreamImpl uses the inherited WebMediaStreamSink and encodes the
// video frames received from a Stream Video Track. This class is constructed
// and used on a single thread, namely the main Render thread. This mirrors the
// other MediaStreamVideo* classes that are constructed/configured on Main
// Render thread but that pass frames on Render IO thread.
class MODULES_EXPORT VideoTrackCameraStreamImpl : public VideoTrackCameraStream {
 public:

  VideoTrackCameraStreamImpl(
      MediaStreamComponent* track,
      OnFrameReceivedCB on_frame_received_cb,
      scoped_refptr<mmhmm::TaskTracker> taskTracker,
      base::OnceClosure on_track_source_ended_cb,
      scoped_refptr<base::SequencedTaskRunner> main_task_runner);

  VideoTrackCameraStreamImpl(const VideoTrackCameraStreamImpl&) = delete;
  VideoTrackCameraStreamImpl& operator=(const VideoTrackCameraStreamImpl&) = delete;

  ~VideoTrackCameraStreamImpl() override;

  void VideoFrameReceived(scoped_refptr<media::VideoFrame> video_frame,
      base::TimeTicks capture_timestamp);

 private:
  void OnError();

  void ConnectToTrack(const VideoCaptureDeliverFrameCB& callback);
  void DisconnectFromTrack();

  // Used to check that we are destroyed on the same sequence we were created.
  SEQUENCE_CHECKER(main_sequence_checker_);

  // We need to hold on to the Blink track to remove ourselves on dtor.
  Persistent<MediaStreamComponent> track_;

  scoped_refptr<mmhmm::TaskTracker> taskTracker_;

  scoped_refptr<base::SequencedTaskRunner> main_task_runner_;

  scoped_refptr<VideoFrameHandler> frameHandler_;


};

}  // namespace blink

#endif  // THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_VIDEO_TRACK_CAMERA_STREAM_H_
