var CurrentState = {};

var mode = 0;
var typingTimer;
var doneTypingInterval = 2000;
var maxFontSize = 50;
var minFontSize = 6;
var inBroadcastMode = false;

const params = new URLSearchParams(window.location.search)
const messageId = parseInt(params.get('id'));
var theme = params.get('theme');
if(!theme) {
    theme = 'light';
}
onThemeChanged(theme);

init();

function diffJson(currentObject, newObject) {

    var result = {};
    var change;
    for (var key in currentObject) {

        if (!newObject.hasOwnProperty(key)) {
            //removal
        }
        else if (typeof newObject[key] == 'object' && typeof currentObject[key] == 'object') {
            change = diffJson(currentObject[key], newObject[key]);
            if (isEmptyObject(change) === false) {
                result[key] = change;
            }
        }
        else if (currentObject[key] != newObject[key]) {
            result[key] = newObject[key];
        }
    }

    for (var key in newObject) {
        if (!currentObject.hasOwnProperty(key)) {
            //added property
            result[key] = "";
        }
    }

    return result;
}

function init() {
    let previousSlideButton = document.getElementById('previous-slide-action-button');
    previousSlideButton.addEventListener('click', previousSlide);

    let nextSlideButton = document.getElementById('next-slide-action-button');
    nextSlideButton.addEventListener('click', nextSlide);

    let increaseFontButton = document.getElementById('increase-font-button');
    increaseFontButton.addEventListener('click', increaseFont);

    let decreaseFontButton = document.getElementById('decrease-font-button');
    decreaseFontButton.addEventListener('click', decreaseFont);

    let speakerNotesTextArea = document.getElementById('speaker-notes-text');
    speakerNotesTextArea.addEventListener('keyup', () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(onTypingTimerExpired, doneTypingInterval);
    });

    speakerNotesTextArea.addEventListener('blur', () => { clearTimeout(typingTimer); onSetSpeakerNotes(); });

    let details = document.getElementById("speaker-notes-details");
    details.ontoggle = onDetailsOpenChange;

    SetPreviewImages();
}

function SetPreviewImages() {

    let hasCurrent = CurrentState && CurrentState.hasOwnProperty("has_current_slide") && CurrentState.has_current_slide;
    let hasNext = CurrentState && CurrentState.hasOwnProperty("has_next_slide") && CurrentState.has_next_slide;

    let currentSlideButton = document.getElementById('current-slide-button');
    let nextSlideButton = document.getElementById('next-slide-button');
    let noSlidesLabel = document.getElementById('no-slides-label');
    if (hasCurrent || hasNext) {
        currentSlideButton.classList.remove("hidden");
        nextSlideButton.classList.remove("hidden");

        noSlidesLabel.classList.add("hidden");

        let currentSlideImage = document.getElementById('current-slide-img');
        let currentSlideContainer = document.getElementById('current-slide-image-container');
        let currentNoSlideLabel = document.getElementById('current-no-slide-label');
        if (hasCurrent) {
            currentSlideImage.src = CurrentState.current_slide_preview;
            currentSlideContainer.classList.remove("hidden");
            currentNoSlideLabel.classList.add("hidden");
        } else {
            currentSlideImage.src = "";
            currentSlideContainer.classList.add("hidden");
            currentNoSlideLabel.classList.remove("hidden");
        }

        let nextSlideImage = document.getElementById('next-slide-img');
        let nextSlideContainer = document.getElementById('next-slide-image-container');
        let nextNoSlideLabel = document.getElementById('next-no-slide-label');
        let endOfPresentationLabel = document.getElementById('end-of-presentation-label');
        if (hasNext) {
            nextSlideImage.src = CurrentState.next_slide_preview;
            nextSlideContainer.classList.remove("hidden");
            nextNoSlideLabel.classList.add("hidden");
            endOfPresentationLabel.classList.add("hidden");
            nextSlideButton.removeAttribute('disabled');
        } else {
            nextSlideImage.src = "";
            nextSlideContainer.classList.add("hidden");
            nextSlideButton.setAttribute('disabled', 'disabled');

            if (hasCurrent) {
                endOfPresentationLabel.classList.remove("hidden");
                nextNoSlideLabel.classList.add("hidden");
            } else {
                endOfPresentationLabel.classList.add("hidden");
                nextNoSlideLabel.classList.remove("hidden");
            }
        }
    }
    else {
        currentSlideButton.classList.add("hidden");
        nextSlideButton.classList.add("hidden");
        noSlidesLabel.classList.remove("hidden");
    }
}

window.addEventListener('load', function () {
    notifyOpen();
});

window.addEventListener("beforeunload", () => {
    notifyClosed();
});

function previousSlide() {
    sendMmhmmControlMessage("HybridBridge.selectPreviousSlide();");
}

function nextSlide() {
    sendMmhmmControlMessage("HybridBridge.selectNextSlide();");
}

function toggleSlide() {
    sendMmhmmControlMessage("HybridBridge.slide_selected = !HybridBridge.slide_selected;");
}

function toggleCamera() {
    sendMmhmmControlMessage("HybridBridge.camera_enabled = !HybridBridge.camera_enabled;");
}

function presenterFullscreen() {
    sendMmhmmControlMessage("HybridBridge.presenter_fullScreen = !HybridBridge.presenter_fullScreen;");
}

function toggleBighands() {
    sendMmhmmControlMessage("HybridBridge.bigHands_enabled = !HybridBridge.bigHands_enabled;");
}

function toggleBroadcastMode() {
    // Debounce button to prevent rapid open and closure
    document.getElementById("toggle-broadcast-button").disabled = true;
    notifyToggleBroadcastMode();
    setTimeout(function(){document.getElementById("toggle-broadcast-button").disabled = false;},2000);
}

function updateProperty(jsonString) {
    const jsonObject = JSON.parse(jsonString);

    let changes;
    if (!CurrentState) {
        changes = jsonObject;
    } else {
        changes = diffJson(CurrentState, jsonObject);
    }

    CurrentState = jsonObject;

    if (changes.hasOwnProperty("current_slide_preview")) {
        SetPreviewImages();
    }

    if (changes.hasOwnProperty("next_slide_preview")) {
        SetPreviewImages();
    }

    if (changes.hasOwnProperty("bigHands_enabled")) {

        let bigHandsButton = document.getElementById('toggle-big-hands-button');
        bigHandsButton.classList.toggle("feature-enabled", CurrentState.bigHands_enabled);
    }

    if (changes.hasOwnProperty("presenter_fullScreen")) {

        let presenterFullscreenButton = document.getElementById('toggle-fullscreen-presenter-button');
        presenterFullscreenButton.classList.toggle("feature-enabled", CurrentState.presenter_fullScreen);
    }

    if (changes.hasOwnProperty("camera_enabled")) {

        let cameraEnabledButton = document.getElementById('toggle-camera-button');
        cameraEnabledButton.classList.toggle("feature-enabled", CurrentState.camera_enabled);
    }

    if (changes.hasOwnProperty("slide_selected")) {
        let slideEnabledButton = document.getElementById('toggle-slide-button');
        slideEnabledButton.classList.toggle("feature-enabled", CurrentState.slide_selected);
    }

    if (changes.hasOwnProperty("slide_status")) {
        document.getElementById("status-label").innerHTML = CurrentState.slide_status;
    }

    if (changes.hasOwnProperty("has_previous_slide")) {
        let previousSlideButton = document.getElementById('previous-slide-action-button');
        if (!CurrentState.has_previous_slide && CurrentState.has_current_slide) {
            previousSlideButton.setAttribute("disabled", "disabled");
        } else {
            previousSlideButton.removeAttribute("disabled");
        }

        SetPreviewImages();
    }

    if (changes.hasOwnProperty("has_next_slide")) {
        let nextSlideButton = document.getElementById('next-slide-action-button');
        if (!CurrentState.has_next_slide && CurrentState.has_current_slide) {
            nextSlideButton.setAttribute("disabled", "disabled");
        } else {
            nextSlideButton.removeAttribute("disabled");
        }

        SetPreviewImages();
    }

    if (changes.hasOwnProperty("slide_identifier")) {
        let speakerNotesText = document.getElementById('speaker-notes-text');
        if (CurrentState.slide_identifier) {
            getSpeakerNotes(CurrentState.slide_identifier);
            speakerNotesText.removeAttribute("disabled");
        } else {
            speakerNotesText.setAttribute("disabled", "disabled");
        }
    }
}

function notifyOpen() {
    miniRemoteOpen();
}

function notifyClosed() {
    let fontSize = getFontSize();
    let notes_expanded = getSpeakerNotesExpandedState();
    miniRemoteSaveState(fontSize, notes_expanded);
    miniRemoteClosed();
}

function stateLoaded(stateObject) {
    CurrentState = stateObject;
}

function stateLoadError(error) {
    console.error("Error loading state: " + error);
}

function onTypingTimerExpired() {
    onSetSpeakerNotes();
}

function onSetSpeakerNotes() {
    if (CurrentState.slide_identifier) {
        let speakerNotesTextArea = document.getElementById('speaker-notes-text');
        let speakerNotes = JSON.stringify(speakerNotesTextArea.value);
        setSpeakerNotes(CurrentState.slide_identifier, speakerNotes);
    }
}

function onNativeResponse(context, values) {
    if (context == "getSpeakerNotes") {
        let speakerNotesText = document.getElementById("speaker-notes-text");
        speakerNotesText.value = values;
    }
}

function increaseFont() {
    var speakerNotesText = document.getElementById('speaker-notes-text');
    var style = window.getComputedStyle(speakerNotesText, null).getPropertyValue('font-size');
    var fontSize = parseFloat(style);

    if (fontSize < maxFontSize) {
        speakerNotesText.style.fontSize = (fontSize + 1) + 'px';
    }
}

function decreaseFont() {
    var speakerNotesText = document.getElementById('speaker-notes-text');
    var style = window.getComputedStyle(speakerNotesText, null).getPropertyValue('font-size');
    var fontSize = parseFloat(style);

    if (fontSize > minFontSize) {
        speakerNotesText.style.fontSize = (fontSize - 1) + 'px';
    }
}

function onDetailsOpenChange() {
    let details = document.getElementById('speaker-notes-details');
    if (details.hasAttribute("open")) {
        document.getElementById("remote").style.gridTemplateRows = "minmax(100px, 160px) 1fr auto";
        setMinimumMiniRemoteSize(550, 528);

    } else {
        document.getElementById("remote").style.gridTemplateRows = "minmax(100px, 1fr) auto auto";
        setMinimumMiniRemoteSize(550, 278);
        adjustHeight(-250);
    }
}

function setState(fontSize, notes_expanded) {
    setFontSize(fontSize);
    setSpeakerNotesExpandedState(notes_expanded);
}

function setSpeakerNotesExpandedState(expanded) {
    let details = document.getElementById("speaker-notes-details");
    details.open = expanded;
}

function getSpeakerNotesExpandedState() {
    let details = document.getElementById("speaker-notes-details");
    return details.open;
}

function setFontSize(fontSize) {
    var speakerNotesText = document.getElementById('speaker-notes-text');
    if (fontSize >= minFontSize && fontSize <= maxFontSize) {
        speakerNotesText.style.fontSize = fontSize + 'px';
    }
}

function getFontSize() {
    var speakerNotesText = document.getElementById('speaker-notes-text');
    var style = window.getComputedStyle(speakerNotesText, null).getPropertyValue('font-size');
    return parseFloat(style);
}

function onThemeChanged(theme) {
    const isLight = theme == "light";
    document.body.classList.toggle("light", isLight);
    document.body.classList.toggle("dark", !isLight);
}