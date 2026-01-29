//
// mmhmm Windows
// Copyright © 2020-2022 mmhmm, inc. All rights reserved.
//
#ifndef THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_TRACK_CAMERA_STREAM_H_
#define THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_TRACK_CAMERA_STREAM_H_

#include "third_party/blink/public/platform/modules/mediastream/web_media_stream_sink.h"
#include "third_party/blink/renderer/modules/modules_export.h"
#include "third_party/blink/renderer/platform/heap/garbage_collected.h"

namespace blink {

template <class MediaStreamSink>
class TrackCameraStream : public MediaStreamSink {
 public:
  explicit TrackCameraStream(base::OnceClosure track_ended_cb);
  ~TrackCameraStream() override = default;

  void OnReadyStateChanged(WebMediaStreamSource::ReadyState state) override;

 private:
  base::OnceClosure track_ended_cb_;
};

template <class MediaStreamSink>
TrackCameraStream<MediaStreamSink>::TrackCameraStream(base::OnceClosure track_ended_cb)
    : track_ended_cb_(std::move(track_ended_cb)) {}

template <class MediaStreamSink>
void TrackCameraStream<MediaStreamSink>::OnReadyStateChanged(
    WebMediaStreamSource::ReadyState state) {
  if (state == WebMediaStreamSource::kReadyStateEnded)
    std::move(track_ended_cb_).Run();
}

}  // namespace blink

#endif  // THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_TRACK_CAMERA_STREAM_H_
