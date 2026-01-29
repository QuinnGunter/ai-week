//
//  start_screen/use_on_call_panel.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/16/2024
//  Copyright 2024 mmhmm inc. All rights reserved.
//

class UseOnCallPanel extends StartScreenPanel {
    constructor(delegate) {
        super(delegate, "use_on_call");
        this.buildUI();
    }

    get title() {
        return LocalizedString("Use on a call");
    }

    /*
     * UI creation
     */

    buildUI() {
        const panel = this.panel;

        // If we're not in the hybrid app, show a full-panel
        // description of why you need to get (or launch) the hybrid app
        // Allow use in the browser for local development only
        if (!App.isHybrid && gLocalDeployment != true) {
            panel.classList.add("centered");
            panel.appendChild(this.buildBrowserPane());
            return;
        }

        panel.appendChild(this.buildBody());
    }

    buildBrowserPane() {
        // If we see the "mmhmm.desktop.installed" cookie or the user
        // has previously explictly set a preference for the desktop app,
        // assume that it is present
        const hasDesktop = HasDesktopInstalledCookie() || SharedUserDefaults.getValueForKey("preferDesktop", false);

        // We'll swap the order of the primary and secondary CTAs based on
        // the presence of the desktop app
        const notInstalled = {
            title: LocalizedString("Get the desktop app"),
            buttonText: LocalizedString("Download now"),
            buttonLink: "https://www.airtime.com/download",
            altTitle: LocalizedString("Already have the desktop app installed?"),
        };
        const installed = {
            title: LocalizedString("Open the desktop app"),
            buttonText: LocalizedString("Launch the desktop app"),
            buttonLink: "mmhmm-hybrid:///",
            altTitle: LocalizedString("Don't have the desktop app installed?"),
        }
        const primaryCTA = hasDesktop ? installed : notInstalled;
        const secondaryCTA = hasDesktop ? notInstalled : installed;

        const container =  document.createElement("div");
        container.classList.add("column", "bouncer");

        const top = document.createElement("div");
        top.classList.add("column", "bouncer_top");
        container.appendChild(top);

        const img = document.createElement("img");
        img.src = "assets/Icon-MacOS-256x256@1x.png";
        top.appendChild(img);

        const message = document.createElement("div");
        message.classList.add("column", "message");
        top.appendChild(message);

        // Primary CTA
        const heading = document.createElement("div");
        heading.classList.add("title");
        heading.innerText = primaryCTA.title;
        message.appendChild(heading);

        const description = document.createElement("div");
        description.classList.add("description");
        description.innerText = LocalizedString("To use Airtime with Zoom, Google Meet, Microsoft Teams and other apps you need the desktop app.");
        message.appendChild(description);

        const button = document.createElement("button");
        button.classList.add("capsule");
        button.innerText = primaryCTA.buttonText;
        button.addEventListener("click", _ => UIUtils.openWindow(primaryCTA.buttonLink, "_self"));
        top.appendChild(button);

        // Secondary CTA
        const bottom = document.createElement("div");
        bottom.classList.add("column", "bouncer_bottom");
        container.appendChild(bottom);

        const secondary = document.createElement("div");
        secondary.classList.add("description");
        secondary.innerText = primaryCTA.altTitle;
        bottom.appendChild(secondary);

        const secondaryAction = document.createElement("a");
        secondaryAction.href = secondaryCTA.buttonLink;
        secondaryAction.innerText = secondaryCTA.buttonText;
        bottom.appendChild(secondaryAction);

        return container;
    }

    buildBody() {
        const top = document.createElement("div");
        top.classList.add("row", "top", "split_panel", "slide_actions");

        top.innerHTML = this.buildInstructionsPanel();

        const actionButton = top.querySelector("button");
        actionButton.addEventListener("click", _ => {
            this.delegate.switchToCameraButtonClicked();
        });

        return top;
    }

    buildInstructionsPanel() {
        // By definition we're in the hybrid app at this point
        // And if a user is seeing this, they're in an Airtime version of hybrid
        // So we can simply encourage you to switch to Camera

        return `
            <div class="column instructions overflow-hidden w-full">
                <div class="column content w-full">

                    <div class="column top">
                        ${AppIcons.AirtimeLogoInCircle().outerHTML}
                        ${AppIcons.AirtimeWordmark().outerHTML}
                    </div>

                    <div class="flex justify-center w-full">
                        <img draggable="false" src="assets/looks.png"/>
                    </div>

                    <div class="text-content-secondary text-center">
                        ${LocalizedString("The best way to use Airtime with Zoom, Google Meet, Microsoft Teams and other apps is with the new Airtime Camera.")}
                    </div>

                </div>

                <div class="column actions">
                    <button class="capsule">Open Airtime Camera</button>
                </div>
            </div>
        `;
    }
}
