//
//  media/missing.js
//  mmhmm
//
//  Created by Steve White on 03/16/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.MissingOverlay = function(media, titleText, messageText, editText, removeText) {
    var box = document.createElement("div");
    box.className = "message_box";

    var thumbnailAsset = media.thumbnailAsset;
    if (thumbnailAsset != null) {
        thumbnailAsset.open().then(url => {
            box.style.backgroundImage = `url(${url})`;
        }).catch(err => {
            console.error("Error opening asset: ", thumbnailAsset, err);
        });
    }

    var background = document.createElement("div");
    background.className = "background";
    box.appendChild(background);

    var title = document.createElement("div");
    title.className = "title";
    title.innerText = titleText;
    background.appendChild(title);

    var message = document.createElement("div");
    message.className = "message";
    message.innerText = messageText;
    background.appendChild(message);

    var reconnect = document.createElement("button");
    reconnect.className = "capsule";
    reconnect.innerText = editText;
    reconnect.addEventListener("click", evt => {
        media.displayContentsEditor();
    })
    background.appendChild(reconnect);

    var removeMedia = document.createElement("button");
    removeMedia.className = "capsule";
    removeMedia.innerText = removeText;
    removeMedia.addEventListener("click", evt => {
        media.closeButtonWasClicked(evt);
    })
    background.appendChild(removeMedia);

    var overlay = media.overlay;
    if (overlay != null) {
        overlay.appendChild(box);
    }

    return box;
}
