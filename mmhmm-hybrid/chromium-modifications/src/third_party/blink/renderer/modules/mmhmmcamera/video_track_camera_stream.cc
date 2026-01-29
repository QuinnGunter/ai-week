//
// mmhmm Windows
// Copyright © 2020-2022 mmhmm, inc. All rights reserved.
//
#include "third_party/blink/renderer/modules/mmhmmcamera/video_track_camera_stream.h"

#include <memory>
#include "base/logging.h"
#include "base/metrics/histogram_macros.h"
#include "build/build_config.h"
#include "cc/paint/skia_paint_canvas.h"
#include "media/base/video_frame.h"
#include "media/base/video_util.h"
#include "media/muxers/webm_muxer.h"
#include "media/renderers/paint_canvas_video_renderer.h"
#include "media/video/gpu_video_accelerator_factories.h"
#include "skia/ext/platform_canvas.h"
#include "third_party/blink/public/platform/platform.h"
#include "third_party/blink/public/platform/web_graphics_context_3d_provider.h"
#include "third_party/blink/renderer/modules/mediastream/media_stream_video_track.h"
#include "third_party/blink/renderer/platform/graphics/web_graphics_context_3d_provider_util.h"
#include "third_party/blink/renderer/platform/mediastream/media_stream_component.h"
#include "third_party/blink/renderer/platform/mediastream/media_stream_source.h"
#include "third_party/blink/renderer/platform/scheduler/public/post_cross_thread_task.h"
#include "third_party/blink/renderer/platform/scheduler/public/non_main_thread.h"
#include "third_party/blink/renderer/platform/wtf/cross_thread_copier_base.h"
#include "third_party/blink/renderer/platform/wtf/cross_thread_functional.h"
#include "third_party/libyuv/include/libyuv.h"
#include "ui/gfx/geometry/size.h"

#include "skia/ext/legacy_display_globals.h"
#include "skia/ext/platform_canvas.h"
#include "third_party/skia/include/core/SkImage.h"
#include "third_party/skia/include/core/SkSurface.h"


namespace blink
{
    libyuv::RotationMode ConvertMediaVideoRotationToRotationMode(
        media::VideoRotation rotation) {
        switch (rotation) {
        case media::VIDEO_ROTATION_0:
            return libyuv::kRotate0;
        case media::VIDEO_ROTATION_90:
            return libyuv::kRotate90;
        case media::VIDEO_ROTATION_180:
            return libyuv::kRotate180;
        case media::VIDEO_ROTATION_270:
            return libyuv::kRotate270;
        }
        NOTREACHED() << rotation;
    }

    VideoTrackCameraStream::VideoTrackCameraStream(
        base::OnceClosure on_track_source_ended_cb)
        : TrackCameraStream(std::move(on_track_source_ended_cb)) {}


    VideoTrackCameraStreamImpl::VideoTrackCameraStreamImpl(
        MediaStreamComponent* track,
        OnFrameReceivedCB on_frame_received_cb,
        scoped_refptr<mmhmm::TaskTracker> taskTracker,
        base::OnceClosure on_track_source_ended_cb,
        scoped_refptr<base::SequencedTaskRunner> main_task_runner)
        : VideoTrackCameraStream(std::move(on_track_source_ended_cb)),
        track_(track),
        taskTracker_(taskTracker),
        main_task_runner_(std::move(main_task_runner)) {
        DCHECK_CALLED_ON_VALID_SEQUENCE(main_sequence_checker_);
        DCHECK(track_);
        DCHECK(track_->Source()->GetType() == MediaStreamSource::kTypeVideo);

        frameHandler_ = base::MakeRefCounted<VideoFrameHandler>(main_task_runner_, std::move(on_frame_received_cb), taskTracker_);

        //callback to the owning camera handler when a frame has been processed.
        ConnectToTrack(ConvertToBaseRepeatingCallback(CrossThreadBindRepeating(
            &VideoFrameHandler::VideoFrameReceived, frameHandler_)));
    }

    VideoTrackCameraStreamImpl::~VideoTrackCameraStreamImpl() {
        DCHECK_CALLED_ON_VALID_SEQUENCE(main_sequence_checker_);
        DisconnectFromTrack();
    }

    void VideoTrackCameraStreamImpl::VideoFrameReceived(scoped_refptr<media::VideoFrame> video_frame,
        base::TimeTicks capture_timestamp)
    {
        frameHandler_->VideoFrameReceived(video_frame, capture_timestamp);
    }

    void VideoTrackCameraStreamImpl::OnError() {
        DVLOG(3) << __func__;
        DCHECK_CALLED_ON_VALID_SEQUENCE(main_sequence_checker_);

        DisconnectFromTrack();

        //TODO RJ : Re-init?
    }

    void VideoTrackCameraStreamImpl::ConnectToTrack(
        const VideoCaptureDeliverFrameCB& callback) {
        auto* video_track =
            static_cast<MediaStreamVideoTrack*>(track_->GetPlatformTrack());
        video_track->AddSink(this, callback, MediaStreamVideoSink::IsSecure::kNo,
            MediaStreamVideoSink::UsesAlpha::kDefault);
    }


    VideoFrameHandler::VideoFrameHandler(
        scoped_refptr<base::SequencedTaskRunner> main_task_runner,
        VideoTrackCameraStream::OnFrameReceivedCB on_frame_received_cb,
        scoped_refptr<mmhmm::TaskTracker> taskTracker,
        scoped_refptr<base::SequencedTaskRunner> ipc_task_runner)
        : main_task_runner_(std::move(main_task_runner)),
        ipc_task_runner_(ipc_task_runner),
        on_frame_received_cb_(std::move(on_frame_received_cb)) {
        DETACH_FROM_SEQUENCE(ipc_sequence_checker_);
        DETACH_FROM_SEQUENCE(origin_sequence_checker_);

        if (ipc_task_runner_)
            return;

        taskTracker_ = taskTracker;

        // dedicated worker thread for processing the frames
        ipc_thread_ = NonMainThread::CreateThread(
            ThreadCreationParams(ThreadType::kDedicatedWorkerThread));

        ipc_task_runner_ = ipc_thread_->GetTaskRunner();
    }


    // callback from the MediaStream when it has new data
    void VideoFrameHandler::VideoFrameReceived(scoped_refptr<media::VideoFrame> video_frame,
        base::TimeTicks capture_timestamp)
    {
        int taskToken = -1;
        if(taskTracker_->ReserveTaskToken(taskToken)) {
            // post the frame to the dedicated frame processing thread
            PostCrossThreadTask(
                *ipc_task_runner_.get(), FROM_HERE,
                CrossThreadBindOnce(&VideoFrameHandler::ProcessVideoFrame,
                                    WrapRefCounted(this), std::move(video_frame), capture_timestamp, taskToken));
        }
        else {
            DLOG(WARNING)
                << "Too many frame tasks in flight, dropping frame";
        }
    }

    // Process video frame, do color convert, created shared memory and push it back up the stack
    void VideoFrameHandler::ProcessVideoFrame(scoped_refptr<media::VideoFrame> video_frame,
        base::TimeTicks capture_timestamp, int taskToken)
    {
        if (video_frame->storage_type() ==
            media::VideoFrame::STORAGE_GPU_MEMORY_BUFFER) {
            // NV12 is the only supported GMB pixel format at the moment, and
            // there is no corresponding PP_VideoFrame_Format. Convert the video
            // frame to I420.
            DCHECK_EQ(video_frame->format(), media::PIXEL_FORMAT_NV12);
            auto gmb_handle = video_frame->GetGpuMemoryBufferHandle();
            
            if (gmb_handle.is_null()) {
              DLOG(ERROR) << "No valid gpu handle.";
              return;
            }
			
            on_frame_received_cb_.Run(std::move(gmb_handle), taskToken);
        } else {
            DLOG(WARNING)
                << "Unsupported pixel format, no buffer sent.";
        }
    }

    VideoFrameHandler::~VideoFrameHandler()
    {
        if (!ipc_task_runner_->RunsTasksInCurrentSequence()) {
            if (ipc_thread_context_) {
                ipc_task_runner_->DeleteSoon(FROM_HERE,
                    std::move(ipc_thread_context_));
            }
        }
    }

    void VideoTrackCameraStreamImpl::DisconnectFromTrack() {
        auto* video_track =
            static_cast<MediaStreamVideoTrack*>(track_->GetPlatformTrack());
        video_track->RemoveSink(this);
    }

}  // namespace blink
