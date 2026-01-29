//
//  loading_sheet.js
//  mmhmm
//
//  Created by Seth Hitchings on 4/29/2023.
//  Copyright 2023 mmhmm inc. All rights reserved.
//

// A dialog that shows a loading spinner and a message
class LoadingSheet extends MessageSheet {

    constructor(titleText, messageText, buttonText, width) {
        super(titleText, messageText, buttonText, false, width);
    }

    populateContainer(container, messageText, buttonText) {
        // Add a spinner at the beginning of the container
        var loader = document.createElement("span");
        loader.classList.add("loader");
        loader.style.width = "48px";
        loader.style.height = "48px";

        var wrapper = document.createElement("div");
        wrapper.classList.add("loading");
        wrapper.appendChild(loader);
        container.appendChild(wrapper);

        super.populateContainer(container, messageText, buttonText);
    }

}
