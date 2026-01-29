//
//  message_sheet.js
//  mmhmm
//
//  Created by Seth Hitchings on 4/29/2023.
//  Copyright 2023 mmhmm inc. All rights reserved.
//

// Just a simple dialog showing a message
class MessageSheet extends ActionSheet {
    constructor(titleText, messageText, buttonText, closable = false, width = "min(400px, 90vw)") {
        var container = document.createElement("div");
        container.className = "message_dialog";

        super(titleText, container, width, false, closable);
        this.setAllowAutoDismiss();
        this.populateContainer(container, messageText, buttonText);
    }
    get actionButton() {
        return this._actionButton;
    }
    get messageText() {
        return this._messageElement.innerText;
    }
    set messageText(text) {
        this._messageElement.innerText = text;
    }
    displayAsModal() {
        super.displayAsModal();
        var actionButton = this._actionButton;
        if (actionButton != null) {
            actionButton.focus();
        }
    }
    populateContainer(container, messageText, buttonText) {
        var message = document.createElement("div");
        message.innerText = messageText;
        this._messageElement = message;
        container.appendChild(message);

        var footer = document.createElement("div");
        footer.className = "footer";
        container.appendChild(footer);

        if (buttonText == null) {
            buttonText = LocalizedString("OK");
        }

        var action = document.createElement("button");
        action.innerText = buttonText;
        action.className = "capsule";
        action.onclick = () => {
            this.dismiss();
        }
        this._actionButton = action;
        footer.appendChild(action);
    }
}

function ShowMessageDialog(titleText, messageText, buttonText) {
    var sheet = new MessageSheet(titleText, messageText, buttonText);
    sheet.displayAsModal();
    return sheet;
}
