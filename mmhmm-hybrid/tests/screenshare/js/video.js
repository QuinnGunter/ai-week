
'use strict';

var currentStream;

function handleSuccess(stream) {
  //startButton.disabled = true;
  const video = document.querySelector('video');
  video.srcObject = stream;
  currentStream = stream;

  stream.getVideoTracks()[0].addEventListener('ended', () => {
    errorMsg('The user has ended sharing the screen');
    startButton.disabled = false;
  });
}

function handleError(error) {
  errorMsg(`getUserMedia error: ${error.name}`, error);
}

function errorMsg(msg, error) {
  const errorElement = document.querySelector('#errorMsg');
  errorElement.innerHTML += `<p>${msg}</p>`;
  if (typeof error !== 'undefined') {
    console.error(error);
  }
}

function handleScreenShareSuccess(type, id) {
  alert("handleScreenShareSuccess");

  var conf = {
    mandatory: {
        chromeMediaSource: type,
        chromeMediaSourceId: id,
        maxWidth: 1280,
        maxHeight: 720
    },
    optional: []
};

//document.getElementById('previewimage').src=screenShareOptions[4].preview;

navigator.mediaDevices.getUserMedia({audio: false, video: conf})
.then(handleSuccess, handleError);

}

function handleScreenShareError(error) {
  alert(error);
}

const startButton = document.getElementById('startButton');
startButton.addEventListener('click', () => {
  
  if(currentStream != null)
  {
    currentStream.getTracks().forEach(function(track) {
      track.stop();
    });
  }

  // request the chosen window/screen from the hybrid app
  getScreenshareMedia(true, true, handleScreenShareSuccess, handleScreenShareError);
});

if ((navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices)) {
  startButton.disabled = false;
} else {
  errorMsg('getUserMedia is not supported');
}