//
// mmhmm Windows
// Copyright © 2020-2022 mmhmm, inc. All rights reserved.
//
#include "third_party/blink/renderer/modules/mmhmmcamera/mmhmm_camera_handler.h"

#include <memory>
#include <utility>

#include "base/logging.h"
#include "base/system/sys_info.h"
#include "media/base/audio_bus.h"
#include "media/base/audio_codecs.h"
#include "media/base/audio_parameters.h"
#include "media/base/mime_util.h"
#include "media/base/video_codecs.h"
#include "third_party/blink/renderer/modules/mmhmmcamera/mmhmm_camera.h"
#include "third_party/blink/renderer/modules/mediastream/media_stream_video_track.h"
#include "third_party/blink/renderer/platform/heap/garbage_collected.h"
#include "third_party/blink/renderer/platform/media_capabilities/web_media_capabilities_info.h"
#include "third_party/blink/renderer/platform/media_capabilities/web_media_configuration.h"
#include "third_party/blink/renderer/platform/mediastream/media_stream_component.h"
#include "third_party/blink/renderer/platform/mediastream/media_stream_descriptor.h"
#include "third_party/blink/renderer/platform/mediastream/media_stream_source.h"
#include "third_party/blink/renderer/platform/mediastream/webrtc_uma_histograms.h"
#include "third_party/blink/renderer/platform/wtf/functional.h"
#include "third_party/blink/renderer/platform/wtf/text/string_builder.h"

using base::TimeTicks;

namespace blink {

MmhmmCameraHandler::MmhmmCameraHandler(
    scoped_refptr<base::SingleThreadTaskRunner> task_runner)
    : 
      streaming_(false),
      camera_(nullptr),
      task_runner_(std::move(task_runner))
{}

MmhmmCameraHandler::~MmhmmCameraHandler() = default;

bool MmhmmCameraHandler::Initialize(
    MmhmmCamera* camera,
    MediaStreamDescriptor* media_stream) {
  DCHECK(IsMainThread());

  media_stream_ = media_stream;
  taskTracker_ = base::MakeRefCounted<mmhmm::TaskTracker>(MaxTaskCount);
  DCHECK(camera);
  camera_ = camera;
  return true;
}

bool MmhmmCameraHandler::Start() {
  DCHECK(IsMainThread());
  DCHECK(!streaming_);
  DCHECK(media_stream_);

  invalidated_ = false;

  video_tracks_ = media_stream_->VideoComponents();
  audio_tracks_ = media_stream_->AudioComponents();

  if (video_tracks_.empty() && audio_tracks_.empty()) {
    LOG(WARNING) << __func__ << ": no media tracks.";
    return false;
  }

  const bool use_video_tracks =
      !video_tracks_.empty() && video_tracks_[0]->Source()->GetReadyState() !=
                                      MediaStreamSource::kReadyStateEnded;
  const bool use_audio_tracks = !audio_tracks_.empty() &&
                                audio_tracks_[0]->GetPlatformTrack() &&
                                audio_tracks_[0]->Source()->GetReadyState() !=
                                    MediaStreamSource::kReadyStateEnded;

  if (!use_video_tracks && !use_audio_tracks) {
    LOG(WARNING) << __func__ << ": no tracks to be recorded.";
    return false;
  }

  if (use_video_tracks) {
    LOG_IF(WARNING, video_tracks_.size() > 1u)
        << "Recording multiple video tracks is not implemented. "
        << "Only recording first video track.";
    if (!video_tracks_[0])
      return false;
    UpdateTrackLiveAndEnabled(*video_tracks_[0], /*is_video=*/true);

    //MediaStreamVideoTrack* const video_track =
    //   static_cast<MediaStreamVideoTrack*>(
    //        video_tracks_[0]->GetPlatformTrack());

    base::OnceClosure on_track_source_changed_cb = base::BindPostTaskToCurrentDefault(
        WTF::BindOnce(&MmhmmCameraHandler::OnSourceReadyStateChanged,
                  WrapWeakPersistent(this)));
        
    const VideoTrackCameraStream::OnFrameReceivedCB on_frame_received_cb =
        base::BindPostTaskToCurrentDefault(WTF::BindRepeating(&MmhmmCameraHandler::OnFrameReceived, WrapWeakPersistent(this)));
      
    video_streams_.emplace_back(std::make_unique<VideoTrackCameraStreamImpl>(video_tracks_[0],
          std::move(on_frame_received_cb), taskTracker_, std::move(on_track_source_changed_cb), task_runner_));
  }

  streaming_ = true;
  return true;
}

void MmhmmCameraHandler::Stop() {
  DCHECK(IsMainThread());

  invalidated_ = true;

  streaming_ = false;
  video_streams_.clear();
  audio_streams_.clear();
}

void MmhmmCameraHandler::OnFrameReceived(
    gfx::GpuMemoryBufferHandle gmb_handle, int taskToken) {
    camera_->SendFrame(std::move(gmb_handle));

    if(taskTracker_)
        taskTracker_->ReturnTaskToken(taskToken);
    
}

bool MmhmmCameraHandler::UpdateTracksAndCheckIfChanged() {
  DCHECK(IsMainThread());

  const auto video_tracks = media_stream_->VideoComponents();
  const auto audio_tracks = media_stream_->AudioComponents();

  bool video_tracks_changed = video_tracks_.size() != video_tracks.size();
  bool audio_tracks_changed = audio_tracks_.size() != audio_tracks.size();

  if (!video_tracks_changed) {
    for (wtf_size_t i = 0; i < video_tracks.size(); ++i) {
      if (video_tracks_[i]->Id() != video_tracks[i]->Id()) {
        video_tracks_changed = true;
        break;
      }
    }
  }
  if (!video_tracks_changed && !audio_tracks_changed) {
    for (wtf_size_t i = 0; i < audio_tracks.size(); ++i) {
      if (audio_tracks_[i]->Id() != audio_tracks[i]->Id()) {
        audio_tracks_changed = true;
        break;
      }
    }
  }

  if (video_tracks_changed)
    video_tracks_ = video_tracks;
  if (audio_tracks_changed)
    audio_tracks_ = audio_tracks;

  if (video_tracks_.size())
    UpdateTrackLiveAndEnabled(*video_tracks_[0], /*is_video=*/true);
  if (audio_tracks_.size())
    UpdateTrackLiveAndEnabled(*audio_tracks_[0], /*is_video=*/false);

  return video_tracks_changed || audio_tracks_changed;
}

void MmhmmCameraHandler::UpdateTrackLiveAndEnabled(
    const MediaStreamComponent& track,
    bool is_video) {
  //const bool stream_live_and_enabled =
   //   track.Source()->GetReadyState() == MediaStreamSource::kReadyStateLive &&
   //   track.Enabled();
}

void MmhmmCameraHandler::OnSourceReadyStateChanged() {
  for (const auto& track : video_tracks_) {
    DCHECK(track->Source());
    if (track->Source()->GetReadyState() != MediaStreamSource::kReadyStateEnded)
      return;
  }
  for (const auto& track : audio_tracks_) {
    DCHECK(track->Source());
    if (track->Source()->GetReadyState() != MediaStreamSource::kReadyStateEnded)
      return;
  }
  // All tracks are ended, so stop
  camera_->OnAllStreamsEnded();
}

void MmhmmCameraHandler::Trace(Visitor* visitor) const {

  visitor->Trace(media_stream_);
  visitor->Trace(video_tracks_);
  visitor->Trace(audio_tracks_);
  visitor->Trace(camera_);
}
}  // namespace blink
