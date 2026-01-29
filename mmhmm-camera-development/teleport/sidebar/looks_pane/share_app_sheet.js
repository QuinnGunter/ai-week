//
//  sidebar/looks_pane/share_app_sheet.js
//  mmhmm
//
//  Created by Seth Hitchings on 4/21/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class ShareAirtimeCameraSheet extends ActionSheet {

    constructor() {
        const container = document.createElement("div");
        super(null, container, null, false, false);

        this.populateContent(container);
    }

    displayAsModal() {
        super.displayAsModal();
        this.logAnalyticsOpen();

        this.addEventListener("dismiss", () => this.logAnalyticsClose());
    }

    populateContent(container) {
        container.classList.add("share_app_sheet", "w-full", "flex", "flex-col");

        container.appendChild(this.createMessage());
        container.appendChild(this.createActions());
    }

    createMessage() {
        const container = document.createElement("div");
        container.classList.add("message", "w-full", "flex", "flex-col", "items-center", "justify-center");

        const body = document.createElement("div");
        body.classList.add("body", "w-full", "flex", "flex-col", "items-center", "justify-center");
        container.appendChild(body);

        body.appendChild(AppIcons.AirtimeLogoInCircle());

        const message = document.createElement("div");
        message.innerText = LocalizedString("Invite someone to Airtime Camera");
        body.appendChild(message);

        return container;
    }

    createActions() {
        const actions = document.createElement("div");
        actions.classList.add("actions", "w-full", "flex", "flex-col");

        const copyButtonContainer = this.newActionButton(LocalizedString("Copy Link"), AppIcons.LinkAlt());
        const copyButton = copyButtonContainer.querySelector("button");
        copyButton.addEventListener("click", _ => this.onCopyLink(copyButton));
        actions.appendChild(copyButtonContainer);

        const doneButtonContainer = this.newActionButton(LocalizedString("Done"));
        const doneButton = doneButtonContainer.querySelector("button");
        doneButton.addEventListener("click", _ => this.dismiss());
        actions.appendChild(doneButtonContainer);

        return actions;
    }

    onCopyLink(button) {
        const url = "https://www.airtime.com/camera";
        navigator.clipboard.writeText(url);

        const oldChildren = Array.from(button.childNodes);

        button.innerText = LocalizedString("Link copied to clipboard");
        button.classList.add("success");
        setTimeout(() => {
            button.replaceChildren(...oldChildren);
            button.classList.remove("success");
        }, 1500);

        this.logAnalyticsAction("copy link");
    }

    newActionButton(title, icon = null) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("action", "w-full");

        const button = document.createElement("button");
        button.classList.add("capsule", "secondary", "w-full", "text-ellipsis");
        wrapper.appendChild(button);

        if (icon) {
            button.appendChild(icon);
            button.appendChild(document.createTextNode(title));
        } else {
            button.innerText = title;
        }

        return wrapper;
    }

    createDivider() {
        const divider = document.createElement("div");
        divider.classList.add("divider", "w-full");
        return divider;
    }

    /* Analytics stuff */

    logAnalyticsAction(action) {
        Analytics.Log("application.share_settings.action", {
            name: action,
            selector_type: "button",
        });
    }

    logAnalyticsOpen() {
        Analytics.Log("application.share_settings.opened");
    }

    logAnalyticsClose() {
        Analytics.Log("application.share_settings.closed");
    }
}
