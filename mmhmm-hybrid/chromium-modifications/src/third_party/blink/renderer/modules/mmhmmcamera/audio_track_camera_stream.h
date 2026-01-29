// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_AUDIO_TRACK_CAMERA_STREAM_H_
#define THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_AUDIO_TRACK_CAMERA_STREAM_H_

#include <memory>

#include "base/task/single_thread_task_runner.h"
#include "base/threading/thread_checker.h"
#include "third_party/blink/renderer/modules/mmhmmcamera/track_camera_stream.h"
#include "third_party/blink/public/platform/modules/mediastream/web_media_stream_audio_sink.h"
#include "third_party/blink/renderer/modules/mediarecorder/track_recorder.h"
#include "third_party/blink/renderer/modules/modules_export.h"

namespace media {
class AudioBus;
class AudioParameters;
}  // namespace media

namespace blink {

class AudioTrackEncoder;
class MediaStreamComponent;
class Thread;

// AudioTrackRecorder is a MediaStreamAudioSink that encodes the audio buses
// received from a Stream Audio Track. The class is constructed on a
// single thread (the main Render thread) but can receive MediaStreamAudioSink-
// related calls on a different "live audio" thread (referred to internally as
// the "capture thread"). It owns an internal thread to use for encoding, on
// which lives an AudioTrackEncoder with its own threading subtleties, see the
// implementation file.
class MODULES_EXPORT AudioTrackCameraStream
    : public TrackCameraStream<WebMediaStreamAudioSink> {
 public:

  AudioTrackCameraStream(
                     MediaStreamComponent* track,
                     base::OnceClosure on_track_source_ended_cb);

  AudioTrackCameraStream(const AudioTrackCameraStream&) = delete;
  AudioTrackCameraStream& operator=(const AudioTrackCameraStream&) = delete;

  ~AudioTrackCameraStream() override;

  // Implement MediaStreamAudioSink.
  void OnSetFormat(const media::AudioParameters& params) override;
  void OnData(const media::AudioBus& audio_bus,
              base::TimeTicks capture_time) override;

 private:

  void ConnectToTrack();
  void DisconnectFromTrack();

  void Prefinalize();

  // Used to check that MediaStreamAudioSink's methods are called on the
  // capture audio thread.
  THREAD_CHECKER(capture_thread_checker_);

  // We need to hold on to the Blink track to remove ourselves on destruction.
  Persistent<MediaStreamComponent> track_;

  // Number of frames per chunked buffer passed to the encoder.
  int frames_per_chunk_ = 0;
};

}  // namespace blink

#endif  // THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_AUDIO_TRACK_CAMERA_STREAM_H_
