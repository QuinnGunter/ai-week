//
//  media/video/sidebar.js
//  mmhmm
//
//  Created by Steve White on 3/6/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

Media.BaseVideo.SidebarPane = class extends Media.SidebarPane {
    populateContents(container) {
        super.populateContents(container);

        const checkboxes = [];

        const media = this.media;
        if (media.isGIPHY == false) {
            checkboxes.push(
                { title: LocalizedString("Loop"), property: "playbackLoops" },
                { title: LocalizedString("Autoplay"), property: "autoplays" },
            );
            if (media.supportsMuting == true) {
                checkboxes.push({ title: LocalizedString("Mute"), property: "muted" })
            }
        }

        checkboxes.forEach((checkbox, index) => {
            const property = checkbox.property;

            const row = document.createElement("div");
            row.classList.add("checkbox");
            container.appendChild(row);

            const input = document.createElement("input");
            input.type = "checkbox";
            input.id = `${this.identifier}-${index}`;
            input.checked = (media[property]);
            input.addEventListener("change", (event) => {
                media[property] = input.checked;
            })
            row.appendChild(input);

            const observer = (obj, key, val) => {
                input.checked = (media[property]);
            };
            media.addObserverForProperty(observer, property);

            this.cleanupFunctions.push(() => {
                media.removeObserverForProperty(observer, property);
            })

            const label = document.createElement("label");
            label.innerText = checkbox.title;
            label.setAttribute("for", input.id);
            row.appendChild(label);
        })

        if (media.supportsMuting == true) {
            const volume = document.createElement("div");
            volume.classList.add("slider", "slider_wrapper");
            container.appendChild(volume);

            const min = document.createElement("button");
            min.title = LocalizedString("Minimum");
            min.appendChild(AppIcons.VolumeMin());
            min.addEventListener("click", (event) => {
                media.playerVolume = 0;
            })
            volume.appendChild(min);

            const slider = document.createElement("input");
            slider.type = "range";
            slider.min = 0;
            slider.max = 100;
            slider.value = media.playerVolume;
            UpdateStyledSliderFillAmount(slider);
            slider.addEventListener("input", (event) => {
                media.playerVolume = slider.value;
            })
            volume.appendChild(slider);

            const max = document.createElement("button");
            max.title = LocalizedString("Maximum");
            max.appendChild(AppIcons.VolumeMax());
            max.addEventListener("click", (event) => {
                media.playerVolume = 100;
            })
            volume.appendChild(max);

            const observer = (obj, key, val) => {
                slider.value = media.playerVolume;
                UpdateStyledSliderFillAmount(slider);
            };
            media.addObserverForProperty(observer, "playerVolume");

            this.cleanupFunctions.push(() => {
                media.removeObserverForProperty(observer, "playerVolume");
            })
        }
    }
}
