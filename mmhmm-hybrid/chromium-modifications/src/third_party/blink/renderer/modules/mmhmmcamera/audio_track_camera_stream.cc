#include "third_party/blink/renderer/modules/mmhmmcamera/audio_track_camera_stream.h"

#include "base/time/time.h"
#include "media/base/audio_bus.h"
#include "media/base/audio_parameters.h"
#include "third_party/blink/renderer/platform/mediastream/media_stream_audio_track.h"
#include "third_party/blink/renderer/platform/mediastream/media_stream_component.h"
#include "third_party/blink/renderer/platform/mediastream/media_stream_source.h"
#include "third_party/blink/renderer/platform/scheduler/public/post_cross_thread_task.h"
#include "third_party/blink/renderer/platform/scheduler/public/thread.h"
#include "third_party/blink/renderer/platform/wtf/cross_thread_copier_base.h"
#include "third_party/blink/renderer/platform/wtf/cross_thread_copier_std.h"
#include "third_party/blink/renderer/platform/wtf/cross_thread_functional.h"
#include "third_party/blink/renderer/platform/wtf/functional.h"
#include "third_party/blink/renderer/platform/wtf/wtf.h"

// Note that this code follows the Chrome media convention of defining a "frame"
// as "one multi-channel sample" as opposed to another common definition meaning
// "a chunk of samples". Here this second definition of "frame" is called a
// "buffer"; so what might be called "frame duration" is instead "buffer
// duration", and so on.

namespace blink {

template <>
struct CrossThreadCopier<media::AudioParameters> {
  STATIC_ONLY(CrossThreadCopier);
  using Type = media::AudioParameters;
  static Type Copy(Type pointer) { return pointer; }
};

}  // namespace blink

namespace blink {

// Max size of buffers passed on to encoders.
//const int kMaxChunkedBufferDurationMs = 60;


AudioTrackCameraStream::AudioTrackCameraStream(
    MediaStreamComponent* track,
    base::OnceClosure on_track_source_ended_cb)
    : TrackCameraStream(std::move(on_track_source_ended_cb))
       {
		   
		   track_ = track;
  DCHECK(IsMainThread());
  DCHECK(track_);
  DCHECK(track_->Source()->GetType() == MediaStreamSource::kTypeAudio);

  // Connect the source provider to the track as a sink.
  ConnectToTrack();
}

AudioTrackCameraStream::~AudioTrackCameraStream() {
  DCHECK(IsMainThread());
  DisconnectFromTrack();
}


void AudioTrackCameraStream::OnSetFormat(const media::AudioParameters& params) {

}

void AudioTrackCameraStream::OnData(const media::AudioBus& audio_bus,
                                base::TimeTicks capture_time) {
}


void AudioTrackCameraStream::ConnectToTrack() {
  auto* audio_track =
      static_cast<MediaStreamAudioTrack*>(track_->GetPlatformTrack());
  DCHECK(audio_track);
  audio_track->AddSink(this);
}

void AudioTrackCameraStream::DisconnectFromTrack() {
  auto* audio_track =
      static_cast<MediaStreamAudioTrack*>(track_->GetPlatformTrack());
  DCHECK(audio_track);
  audio_track->RemoveSink(this);
}

}  // namespace blink
