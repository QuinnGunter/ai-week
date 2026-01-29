//
//  player_hud.js
//  mmhmm
//
//  Created by Steve White on 11/16/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class NewPlayerHUD {
    constructor(videoElement = null, additionalControls = null, isNew = false, destroyOnRemoval = true) {
        this.videoElement = videoElement;
        this.hud = document.createElement("div");

        this.hud.className = "player_hud";

        this.controls = document.createElement("div");
        this.controls.className = "controls";
        this.hud.appendChild(this.controls);

        this.playPause = document.createElement("button");
        this.playPause.id = "player_playpause";
        isNew && (this.playPause.style.marginBottom = "4px");

        this.controls.appendChild(this.playPause);
        this.playIcon = AppIcons.Play();
        this.playIcon.id = "player_play";
        this.playPause.appendChild(this.playIcon);

        this.pauseIcon = AppIcons.Pause();
        this.pauseIcon.id = "player_pause";
        this.pauseIcon.style.display = "none";
        this.playPause.appendChild(this.pauseIcon);

        this.timeline = document.createElement("div");
        this.timeline.className = "timeline";
        isNew && (this.timeline.style.marginTop = "8px");
        this.controls.appendChild(this.timeline);

        this.labels = document.createElement("div");
        this.labels.className = "labels";
        !isNew && this.timeline.appendChild(this.labels);

        this.elapsed = document.createElement("span");
        this.elapsed.className = "elapsed";
        this.elapsed.innerText = "--:--";
        this.elapsed.id = "player_elapsed";
        this.labels.appendChild(this.elapsed);

        this.title = document.createElement("span");
        this.title.className = "title";
        this.title.id = "player_title";
        this.labels.appendChild(this.title);

        this.remaining = document.createElement("span");
        this.remaining.className = "remaining";
        this.remaining.innerText = "--:--";
        this.remaining.id = "player_remaining";
        this.labels.appendChild(this.remaining);

        this.range = document.createElement("input");
        this.range.type = "range";
        this.range.id = "player_seek";
        this.range.step = 0.03; // a frame @ 30fps
        this.range.min = 0;
        this.range.max = 1;
        this.range.value = 0;
        this.timeMin = 0;
        this.timeline.appendChild(this.range);
        isNew && this.timeline.appendChild(this.labels);

        this.volume = document.createElement("button");
        this.volume.id = "player_volume";
        isNew && (this.volume.style.marginBottom = "5px");
        this.volume.appendChild(AppIcons.Volume());
        this.controls.appendChild(this.volume);

        if (additionalControls != null && additionalControls.length > 0) {
            var container = document.createElement("div");
            container.className = "auxiliary";
            this.hud.appendChild(container);

            additionalControls.forEach(control => {
                container.appendChild(control);
            })
        }

        if (this.videoElement != null) {
            this._updatePlayPauseIcon();
            this._updateTimeLabels();

            this._addEventListenerTo(this.videoElement, "pause", this._updatePlayPauseIcon);
            this._addEventListenerTo(this.videoElement, "play", this._updatePlayPauseIcon);

            this._addEventListenerTo(this.videoElement, "durationchange", this._updateTimeLabels);
            this._addEventListenerTo(this.videoElement, "timeupdate", this._updateTimeLabels);

            this._addEventListenerTo(this.range, "input", this._updateRange);

            this._addEventListenerTo(this.playPause, "click", this.togglePlayPause);

            this.videoElement.volume = SharedUserDefaults.getValueForKey("volume", 0.5);

            this.volume.addEventListener("click", evt => {
                var current = this.videoElement.volume * 100;
                var volumeControl = new ActionSheetSlider(0, 100, current, (sheet, evt) => {
                    this.videoElement.volume = sheet.sliderValue / 100;
                    SharedUserDefaults.setValueForKey(this.videoElement.volume, "volume");
                });

                volumeControl.sheet.style.border = "1px solid rgba(255, 255, 255, 0.12)";
                volumeControl.container.style.backgroundColor = "#151419";
                volumeControl.container.style.color = "#B0B3BF";
                volumeControl.container.style.fill = volumeControl.container.style.color;

                var cleanup = () => {
                    volumeControl.dismiss();
                    if (this.hud != null) {
                        this.hud.volumeControl = null;
                    }
                }

                var videoElement = this.videoElement;
                const observer = OnRemovedFromDocument(videoElement, () => cleanup());
                volumeControl.onDismiss = function () {
                    observer.disconnect();
                };

                volumeControl.displayFrom(this.volume);
                this.hud.volumeControl = volumeControl;
            });

            if (destroyOnRemoval == true) {
                OnRemovedFromDocument(this.videoElement, () => this.destroy());
            }
        }
    }

    get element() {
        return this.hud;
    }

    destroy() {
        this._removeAllEventListeners();
        this.playPauseCallback = null;
        this.updateRangeCallback = null;
        this.videoElement = null;
    }

    _addEventListenerTo(target, event, callback) {
        var listeners = this.listeners;
        if (listeners == null) {
            listeners = [];
            this.listeners = listeners;
        }
        var wrapper = (evt) => callback.call(this, evt);
        target.addEventListener(event, wrapper);
        listeners.push({target, event, callback, wrapper});
    }

    _removeEventListenerFrom(target, event, callback) {
        var listeners = this.listeners;
        if (listeners == null) {
            return;
        }
        var entry = listeners.find(l => l.target == target && l.event == event && l.callback == callback);
        if (entry != null) {
            target.removeEventListener(event, entry.wrapper);
            var index = listeners.indexOf(entry);
            listeners.splice(index, 1);
        }
    }

    _removeAllEventListeners() {
        var listeners = this.listeners;
        if (listeners != null) {
            listeners.forEach(listener => {
                listener.target.removeEventListener(listener.event, listener.wrapper);
            })
            this.listeners = null;
        }
    }

    updateTimeframe(timeMin, updateRangeCallback) {
        this.updateRangeCallback = updateRangeCallback;
        this.timeMin = timeMin;

        this.updateRangeCallback = updateRangeCallback;
        this.timeMin = timeMin;

        this.updateTimeLabelsTrimmedEvent = this._updateTimeLabelsTrimmed.bind(this);
        this.updateRangeTrimmedEvent = this._updateRangeTrimmed.bind(this);

        // Remove listeners from non-updated timeframe
        this._removeEventListenerFrom(this.videoElement, "durationchange", this._updateTimeLabels);
        this._removeEventListenerFrom(this.videoElement, "timeupdate", this._updateTimeLabels);

        this._removeEventListenerFrom(this.range, "input", this._updateRange);

        // Remove listeners from previous updated timeframe
        this._removeEventListenerFrom(this.videoElement, "durationchange", this._updateTimeLabelsTrimmed);
        this._removeEventListenerFrom(this.videoElement, "timeupdate", this._updateTimeLabelsTrimmed);

        this._removeEventListenerFrom(this.range, "input", this._updateRangeTrimmed);

        // Add new listeners
        this._addEventListenerTo(this.videoElement, "durationchange", this._updateTimeLabelsTrimmed);
        this._addEventListenerTo(this.videoElement, "timeupdate", this._updateTimeLabelsTrimmed);

        this._addEventListenerTo(this.range, "input", this._updateRangeTrimmed);
    }

    seek(time) {
        this.videoElement.pause();
        this.playPauseCallback && this.playPauseCallback(false);
        this.range.value = time;
        this.videoElement.currentTime = time + this.timeMin;
    }

    pause() {
        this.videoElement.pause();
        this._updatePlayPauseIcon();
    }

    togglePlayPause() {
        var isPlaying = false;
        if (
            this.timeMin > 0 &&
            (this.range.value == 0 || this.range.max - this.range.value <= this.range.step)
        ) {
            this.videoElement.currentTime = this.timeMin;
        }
        if (this.videoElement.paused == true) {
            this.videoElement.play();
            isPlaying = true;
        }
        else {
            this.videoElement.pause();
        }
        this.playPauseCallback && this.playPauseCallback(isPlaying);

        this.delegate?.playerHudChangedPlayState(this);
    }

    _updatePlayPauseIcon() {
        var isPlaying = false;
        if (this.videoElement.paused == true) {
            this.playIcon.style.display = "";
            this.pauseIcon.style.display = "none";
        }
        else {
            this.playIcon.style.display = "none";
            this.pauseIcon.style.display = "";
            isPlaying = true;
        }
        this.playPauseCallback && this.playPauseCallback(isPlaying);
    }

    _updateTimeLabels() {
        var duration = this.videoElement.duration;
        var current = this.videoElement.currentTime;

        if (current == null || isNaN(current) == true) {
            current = 0;
        }
        if (duration == null || isNaN(duration) == true) {
            duration = 0;
        }

        this.range.max = duration;
        this.range.value = current;
        var fillAmount = ((current / duration) * 100).toPrecision(4);
        this.range.style.setProperty("--fillAmount", fillAmount + "%");

        this.elapsed.innerText = FormatSeconds(Math.round(current));
        if (isFinite(duration) == true) {
            this.remaining.innerText = "-" + FormatSeconds(Math.round(duration - current));
        }
        else {
            this.remaining.innerText = ""
        }
    }

    _updateTimeLabelsTrimmed() {
        var duration = this.videoElement.duration - this.timeMin;
        var current = this.videoElement.currentTime - this.timeMin > 0 ? this.videoElement.currentTime - this.timeMin : 0;

        if (current == null || isNaN(current) == true) {
            current = 0;
        }
        if (duration == null || isNaN(duration) == true) {
            duration = 0;
        }

        this.range.max = duration;
        this.range.value = current;
        var fillAmount = ((current / duration) * 100).toPrecision(4);
        this.range.style.setProperty("--fillAmount", fillAmount + "%");

        this.elapsed.innerText = FormatSeconds(Math.round(current));
        if (isFinite(duration) == true) {
            this.remaining.innerText = "-" + FormatSeconds(Math.round(duration - current));
        }
        else {
            this.remaining.innerText = ""
        }
    }

    _updateRange() {
        this.videoElement.currentTime = this.range.value;

        var current = this.range.value;
        var duration = Math.round(this.videoElement.duration - this.timeMin);
        var fillAmount = ((current / duration) * 100).toPrecision(4);
        this.range.style.setProperty("--fillAmount", fillAmount + "%");

        this.delegate?.playerHudChangedCurrentTime(this);
    }

    _updateRangeTrimmed() {
        var current = Number.parseFloat(this.range.value);
        this.videoElement.currentTime = current + this.timeMin;

        var fillAmount = ((current / (this.videoElement.duration - this.timeMin)) * 100).toPrecision(4);
        this.range.style.setProperty("--fillAmount", fillAmount + "%");

        if (this.updateRangeCallback) {
            this.updateRangeCallback(fillAmount / 100);
        }
    }
}
