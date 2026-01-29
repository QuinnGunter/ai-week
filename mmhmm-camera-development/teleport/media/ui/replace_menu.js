//
//  media/replace_menu.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/30/2024.
//  Copyright 2024 mmhmm inc. All rights reserved.
//

class ReplaceMenu extends Menu {
    constructor(media) {
        super();
        this.media = media;
        this.buildUI();
    }

    buildUI() {
        this.container.classList.add("replace-media-sheet");

        const contents = this.newReplaceMediaElement((option, sender, event) => {
            this.dismiss();
            this.invokeReplaceMediaAction(option, sender, event);
        })
        this.addCustomView(contents);
    }

    newReplaceMediaElement(actionInvoker) {
        const element = document.createElement("div");
        element.classList.add("media_replace");

        //
        // Drag & Drop file target
        //
        const dropZone = this._newDropZoneContainer();
        element.appendChild(dropZone);

        //
        // Find the actions to display
        //
        const actionBar = gApp.actionBar;
        let options = actionBar.options;
        if (options == null) {
            actionBar.createOptions();
            options = actionBar.options;
        }

        let mediaLibraryItem = options.find(opt => opt.tag == "media");
        const ignoreTags = ["whiteboard", "media", "watch", "nametag"];
        options = options.filter(opt => ignoreTags.indexOf(opt.tag) == -1);

        // Customize the order and label
        mediaLibraryItem = {
            tag: mediaLibraryItem.tag,
            title: LocalizedString("Media Library"),
            icon: mediaLibraryItem.icon,
            action: mediaLibraryItem.action,
        };
        options.unshift(mediaLibraryItem);

        const buttons = document.createElement("div");
        buttons.classList.add("buttons");
        element.appendChild(buttons);

        // Populate the grid
        options.forEach((option) => {
            const button = document.createElement("button");
            button.classList.add("capsule", "secondary");

            button.title = option.title;
            button.classList.add("capsule", "secondary");

            button.appendChild(option.icon.cloneNode(true));
            button.appendChild(document.createTextNode(option.title));

            button.addEventListener("click", (event) => {
                actionInvoker(option, button, event);
            });

            buttons.appendChild(button);
        });

        return element;
    }

    _newDropZoneContainer() {
        const dropZone = document.createElement("div");
        dropZone.className = "drop_zone";

        // Icon
        dropZone.appendChild(AppIcons.DragAndDropTarget());

        // Message
        const dropZoneLabel = document.createElement("div");
        dropZoneLabel.className = "message";
        dropZoneLabel.innerText = LocalizedString("Drag & Drop a file or click to browse…");
        dropZone.appendChild(dropZoneLabel);

        const dragDropHandler = (event) => {
            event.stopPropagation();
            event.preventDefault();

            switch (event.type) {
            case "drop": {
                const dataTransfer = event.dataTransfer;
                this.invokeReplaceMediaAction({
                    action: () => Media.Files.createMediaWithDataTransfer(dataTransfer),
                }, dropZone, event);
                break;
            }
            case "dragover":
                dropZone.classList.add("dragging");
                break;
            case "dragleave":
                dropZone.classList.remove("dragging");
                break;
            }
        };

        ["drop", "dragover", "dragleave"].forEach((event) => {
            dropZone.addEventListener(event, dragDropHandler);
        })

        // Click handler
        dropZone.addEventListener("click", (event) => {
            this.invokeReplaceMediaAction({
                action: () => Media.Files.requestFiles(event, null, 1),
            }, dropZone, event);
        });

        return dropZone;
    }

    async invokeReplaceMediaAction(option, sender, event) {
        let result = option.action(sender, event);
        if (IsKindOf(result, Promise) == true) {
            result = await result;
        }
        if (IsKindOf(result, Array) == true) {
            result = result[0];
        }
        if (result == null) {
            return;
        }

        const replacer = new Media.Replacer(this.media);
        replacer.replaceMediaWith(result);
    }
}
