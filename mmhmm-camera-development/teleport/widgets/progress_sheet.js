//
//  progress_sheet.js
//  mmhmm
//
//  Created by Steve White on 4/29/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class ProgressSheet extends ActionSheet {
    constructor(title, closable) {
        var container = document.createElement("div");
        super(title, container, "260px", false, closable);

        this.populateContainer(container);
        this.container = container;
    }
    populateContainer(container) {
        container.classList.add("textfield_dialog", "progress_sheet");

        var message = document.createElement("div");
        container.appendChild(message);
        this._messageLabel = message;

        var indicator = document.createElement("progress");
        indicator.max = "100";
        indicator.value = "0";
        indicator.style.width = "100%";
        container.appendChild(indicator);
        this._progressIndicator = indicator;

        // Safari has a browser issue with progress bars.
        if (getBrowser() === Browser.SAFARI) {
            indicator.style.display = "none";
            let loadingWrapper = document.createElement("div");
            loadingWrapper.classList.add("loading");
            let loader = document.createElement("span");
            loader.classList.add("loader");
            loadingWrapper.appendChild(loader);
            container.appendChild(loadingWrapper);
        }
    }
    addButton(title, style, clickHandler) {
        var buttonContainer = this._buttonContainer;
        if (buttonContainer == null) {
            buttonContainer = document.createElement("div");
            buttonContainer.className = "buttons";
            this._buttonContainer = buttonContainer;
            this.container.appendChild(buttonContainer);
        }

        var button = document.createElement("button");
        button.innerText = title;
        button.className = "capsule";
        if (style != null) {
            AddClassNameToElement(style, button);
        }
        button.addEventListener("click", evt => {
            clickHandler(evt);
        })
        buttonContainer.appendChild(button);
        return button;
    }
    get progressIndicator() {
        return this._progressIndicator;
    }
    get messageLabel() {
        return this._messageLabel;
    }
}
