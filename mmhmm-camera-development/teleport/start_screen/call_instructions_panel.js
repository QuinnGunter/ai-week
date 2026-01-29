//
//  start_screen/call_instructions_panel.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/16/2024
//  Copyright 2024 mmhmm inc. All rights reserved.
//

class CallInstructionsPanel {

    /**
     *
     * @param {VirtualCameraInterface} virtualCamera the app's virtual camera interface instance.
     * @param {State} stage the app's stage instance.
     * @param {Element} container the DOM element to attach ourselves to.
     */
    constructor(virtualCamera, stage, container) {
        this.virtualCamera = virtualCamera;
        this.container = container;
        this.stage = stage;
        this.populateContainer(container);

        this.updateVisiblePanel();

        this.stage.addObserverForProperty(this, "isVirtualCameraActive");

        NotificationCenter.default.addObserver(
            App.Notifications.VirtualCameraClientsChanged,
            null,
            this.virtualCameraClientsChanged,
            this
        );

        NotificationCenter.default.addObserver(
            App.Notifications.VirtualCameraStateChanged,
            null,
            this.virtualCameraStateChanged,
            this
        );

        this.selectDefaultPlatform();
    }

    destroy() {
        if (this.cameraStatusPanel) {
            this.cameraStatusPanel.destroy();
            this.cameraStatusPanel = null;
        }
        if (this.stage) {
            this.stage.removeObserverForProperty(this, "isVirtualCameraActive");
            this.stage = null;
        }
        NotificationCenter.default.removeObserver(
            App.Notifications.VirtualCameraClientsChanged,
            null,
            this.virtualCameraClientsChanged,
            this
        );
        NotificationCenter.default.removeObserver(
            App.Notifications.VirtualCameraStateChanged,
            null,
            this.virtualCameraStateChanged,
            this
        );
    }

    virtualCameraStateChanged() {
        this.updateVisiblePanel();
    }

    populateContainer(container) {
        // We always show the camera status indicator
        container.appendChild(this.buildCameraStatusIndicator());

        // Below that, we show one of our panels depending on the camera state
        this.notAvailablePanel = this.buildCameraNotAvailablePanel();
        this.connectionInstructionsPanel = this.buildConnectionInstructionsPanel();
        this.faqPanel = this.buildFAQPanel();
        this.needsRestartPanel = this.buildNeedsRestartPanel();
        this.infoPanel = this.buildInfoPanel();

        this.panels = [this.notAvailablePanel, this.connectionInstructionsPanel, this.faqPanel, this.infoPanel, this.needsRestartPanel];
        this.panels.forEach(panel => container.appendChild(panel));
    }

    /**
     * Update the visible panel based on the current virtual camera state.
     */
    updateVisiblePanel() {
        const virtualCamera = this.virtualCamera;
        let panel = null;

        // See if we need to show a special panel for the current camera state
        const state = virtualCamera.virtualCameraState;
        switch(state) {
            case VirtualCameraState.installed:
                panel = virtualCamera.isVirtualCameraActive() ? this.faqPanel : this.connectionInstructionsPanel;
                break;
            case VirtualCameraState.notInstalled:
            case VirtualCameraState.awaitingUserApproval:
            case VirtualCameraState.uninstalling:
                // In the uninstalling state you can still reinstall, so show the not available panel
                panel = this.notAvailablePanel;
                break;
            case VirtualCameraState.needsUpdate:
            case VirtualCameraState.notInstallable:
            case VirtualCameraState.installing:
            case VirtualCameraState.error:
                this.updateInfoPanel(state);
                panel = this.infoPanel;
                break;
            case VirtualCameraState.needsReboot:
                panel = this.needsRestartPanel;
                break;
            default:
                console.error("Unhandled virtual camera state", state);
                break;
        }

        this.setActivePanel(panel);
    }

    setActivePanel(panel) {
        this.panels.forEach(p => p.classList.toggle("hidden", p != panel));
    }

    get activePanelAnalyticsKey() {
        return this.faqPanel.classList.contains("hidden") ? "not connected" : "faq";
    }

    /* Video calling platform selection */

    get defaultPlatformKey() {
        const platforms = Object.keys(CallInstructionsPanel.platforms);
        return platforms[0];
    }

    buildPlatformSelector() {
        const platforms = Object.keys(CallInstructionsPanel.platforms);
        const defaultPlatformKey = this.defaultPlatformKey;

        const selector = document.createElement("select");
        platforms.forEach(key => {
            const platform = CallInstructionsPanel.platforms[key];
            const option = document.createElement("option");
            option.value = key;
            option.innerText = platform.name;
            if (key == defaultPlatformKey) {
                option.selected = true;
            }
            selector.appendChild(option);
        });
        selector.addEventListener("change", _ => {
            if (selector.checkVisibility()) {
                // Ignore this event if it comes from a selector that's not currently visible -
                // it was fired programmatically by us
                const selected = selector.options[selector.selectedIndex].value;
                const platform = CallInstructionsPanel.platforms[selected];
                this.selectedPlatformChanged(platform, selector);
                Analytics.Log("start.screen.click", {
                    button: "camera platform select",
                    platform: selected,
                    panel: this.activePanelAnalyticsKey
                });
            }
        });
        return selector;
    }

    virtualCameraClientsChanged() {
        this.updateVisiblePanel();
        const platform = this.getConnectedPlatform();
        if (platform) {
            this.selectedPlatformChanged(platform, null);
        }
    }

    getConnectedPlatform() {
        if (!App.isHybrid || typeof gHybrid == "undefined") {
            return;
        }

        // If there's exactly one client connected, see if we can preselect
        // the correct platform for the user
        const clients = gHybrid.virtualCamera?.clients || [];
        if (clients.length == 1) {
            return CallInstructionsPanel.platforms[clients[0]];
        }
        return null;
    }

    selectDefaultPlatform() {
        // If there's a client connected to the virtual camera, try to use that
        const platform = this.getConnectedPlatform() || CallInstructionsPanel.platforms[this.defaultPlatformKey];
        this.selectedPlatformChanged(platform, null);
    }

    selectedPlatformChanged(platform, selector) {
        if (this.selectedPlatform?.key == platform.key) {
            return;
        }

        this.selectedPlatform = platform;

        // There are two selectors, one on each panel
        // Allow them to control each other so that the user's selection
        // is preserved when switching between panels
        this.updateConnectionInstructionsPanel(platform, selector);
        this.updateFAQPanel(platform, selector);
    }

    /* Camera not available panel */

    buildCameraNotAvailablePanel() {
        const container = document.createElement("div");
        container.classList.add("column", "message_panel");
        this.populateCameraNotAvailablePanel(container);
        return container;
    }

    populateCameraNotAvailablePanel(container) {
        const mac = isMacOS();

        if (mac) {
            const image = document.createElement("img");
            image.draggable = false;
            image.src = this.virtualCamera.isMacOSSequoiaOrLater() ?
                "assets/faq/install-camera-mac-sequoia.png":
                "assets/faq/install-camera-mac.png";
            container.appendChild(image);
        }

        const instructions = document.createElement("div");
        instructions.classList.add("column", "instructions");
        container.appendChild(instructions);

        const body = document.createElement("div");
        body.classList.add("description");
        body.innerText = mac ?
            LocalizedString("To use Airtime with Zoom, Google Meet, and other video conferencing apps, you’ll need to enable the Airtime virtual camera.") :
            LocalizedString("To use Airtime with Zoom and other apps you will need to install the Airtime virtual camera. Click the button below to go to install the camera.");
        instructions.appendChild(body);

        if (mac) {
            const body2 = document.createElement("div");
            body2.classList.add("description");
            body2.innerText = this.virtualCamera.isMacOSSequoiaOrLater() ?
                LocalizedString("Open System Settings to enable Airtime as a Camera Extension."):
                LocalizedString("Click the button below to go to Privacy & Security in System Settings, then click “Allow”.");
            instructions.appendChild(body2);
        }

        const button = document.createElement("button");
        button.classList.add("capsule");
        button.innerText = mac ? LocalizedString("Open System Settings") : LocalizedString("Install");
        button.addEventListener("click", _ => this.installCameraButtonClicked());
        instructions.appendChild(button);

        const learnMore = document.createElement("div");
        learnMore.classList.add("learn_more", "description");
        const message = BetterEnumerateLinkifiedString(
            LocalizedString("Need more help? Visit the <0>Help Center</0>."),
            ["https://help.airtime.com/hc/en-us/articles/14337147742871"]
        );
        learnMore.appendChild(message);
        instructions.appendChild(learnMore);
    }

    installCameraButtonClicked() {
        const virtualCamera = this.virtualCamera;
        const state = virtualCamera.virtualCameraState;
        virtualCamera.installVirtualCamera();
        Analytics.Log("start.screen.click", {
            button: "install camera",
            state,
        });

        // if (this.virtualCamera.requiresInstallationInstructions()) {
        //     ShowAlertView(LocalizedString("Instructions"), "Instructions", {buttonTitle: "OK"});
        // }
    }

    /* Camera status indicator */

    buildCameraStatusIndicator() {
        const container = document.createElement("div");
        container.classList.add("column", "camera_status");

        this.cameraStatusPanel = new VirtualCameraStatusPanel(this.virtualCamera, this.stage, container);

        return container;
    }

    setActiveLayout(foregroundSrc, background) {
        this.cameraStatusPanel.setActiveLayout(foregroundSrc, background);
    }

    setActiveSlide(slide) {
        this.cameraStatusPanel.setActiveSlide(slide);
    }

    /* How to connect the virtual camera panel */

    buildConnectionInstructionsPanel() {
        const container = document.createElement("div");
        container.classList.add("column", "collapsible", "connection_instructions");

        const instructions = document.createElement("div");
        instructions.classList.add("column", "instructions");
        container.appendChild(instructions);

        const title = document.createElement("div");
        title.classList.add("title");
        title.innerText = LocalizedString("How to connect to");
        instructions.appendChild(title);

        const selector = this.buildPlatformSelector();
        instructions.appendChild(selector);

        const image = document.createElement("img");
        image.draggable = false;
        instructions.appendChild(image);

        const steps = document.createElement("div");
        steps.classList.add("column", "steps");
        instructions.appendChild(steps);

        return container;
    }

    buildStep(index, step) {
        const container = document.createElement("div");
        container.classList.add("row", "step");

        const number = document.createElement("div");
        number.classList.add("index");
        number.innerText = `${index + 1}`;
        container.appendChild(number);

        container.appendChild(this.buildStepContent(step));

        return container;
    }

    buildStepContent(step) {
        const text = document.createElement("div");
        text.classList.add("column", "text");

        const title = document.createElement("div");
        title.classList.add("title");
        title.appendChild(this.contentToElement(step.title));
        text.appendChild(title);

        const description = document.createElement("div");
        description.classList.add("description");
        description.appendChild(this.contentToElement(step.description));
        text.appendChild(description);

        return text;
    }

    updateConnectionInstructionsPanel(platform, selector) {
        // If the selector on the FAQ panel was changed, update ours to match
        const connectionInstructionsSelector = this.connectionInstructionsPanel.querySelector("select");
        if (selector && connectionInstructionsSelector != selector) {
            connectionInstructionsSelector.selectedIndex = selector.selectedIndex;
        }

        const steps = platform.connecting.steps;

        const image = this.connectionInstructionsPanel.querySelector("img");
        image.src = steps[steps.length - 1].image.replace("PLATFORM", platform.key);

        const stepsContainer = this.connectionInstructionsPanel.querySelector(".steps");
        stepsContainer.replaceChildren();

        // Special case for single-step instructions
        if (steps.length == 1) {
            const container = document.createElement("div");
            container.classList.add("row", "step");
            container.appendChild(this.buildStepContent(steps[0]));
            stepsContainer.appendChild(container);
            return;
        }

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepElement = this.buildStep(i, step);
            stepElement.addEventListener("click", _ => {
                if (!stepElement.classList.contains("selected")) {
                    stepsContainer.childNodes.forEach(child => child.classList.remove("selected"));
                    stepElement.classList.add("selected");
                    image.src = step.image.replace("PLATFORM", platform.key);
                }
            });
            if (i == 0) {
                stepElement.classList.add("selected");
            }
            stepsContainer.appendChild(stepElement);
        }
    }

    /* FAQ panel */

    buildFAQPanel() {
        const container = document.createElement("div");
        container.classList.add("column", "collapsible", "faq");

        container.appendChild(this.buildGettingStartedSection());
        container.appendChild(this.buildTroubleshootingSection());

        const learnMore = document.createElement("div");
        learnMore.classList.add("learn_more");
        const message = BetterEnumerateLinkifiedString(
            LocalizedString("Need more help? Visit the <0>Help Center</0> for more guides and articles."),
            ["https://help.airtime.com"]
        );
        learnMore.appendChild(message);
        container.appendChild(learnMore);

        return container;
    }

    faqPanelHeadingClicked(container, analyticsKey) {
        const sections = this.faqPanel.querySelectorAll(".expandable");
        sections.forEach(section => section.classList.toggle("expanded"));

        Analytics.Log("start.screen.click", {
            button: analyticsKey,
            action: container.classList.contains("expanded") ? "expand" : "collapse",
        });
    }

    buildGettingStartedSection() {
        const container = document.createElement("div");
        container.classList.add("column", "expandable", "general", "expanded");

        /* Section header */

        const header =  document.createElement("div");
        header.classList.add("row", "heading");
        header.addEventListener("click", _ => this.faqPanelHeadingClicked(container, "getting started"));
        container.appendChild(header);

        const caret = AppIcons.CaretDown();
        caret.setAttributeNS(null, "class", "disclosure");
        header.appendChild(caret);

        const title = document.createElement("div");
        title.classList.add("title");
        title.innerText = LocalizedString("Getting started");
        header.appendChild(title);

        /* Content */

        const content = document.createElement("div");
        content.classList.add("column", "content");
        container.appendChild(content);

        const paragraphs = [
            LocalizedString("When you select Airtime as your video input in another app, what you see in Airtime is what others will see on the call."),
            LocalizedString("To get the best results, do the following in the other app:"),
        ];

        paragraphs.forEach(text => {
            const p = document.createElement("p");
            p.innerText = text;
            content.appendChild(p);
        })

        const list = document.createElement("ul");
        content.appendChild(list);

        const listItems = [
            LocalizedString("Turn off background blur, virtual backgrounds, filters and other effects."),
            LocalizedString("Set your video resolution to the highest available."),
        ];

        listItems.forEach(item => {
            const li = document.createElement("li");
            li.innerText = item;
            list.appendChild(li);
        });

        return container;
    }

    buildTroubleshootingSection() {
        const container = document.createElement("div");
        container.classList.add("column", "expandable", "troubleshooting");

        const header = document.createElement("div");
        header.classList.add("row", "heading");
        header.addEventListener("click", _ => this.faqPanelHeadingClicked(container, "troubleshooting"));
        container.appendChild(header);

        const caret = AppIcons.CaretDown();
        caret.setAttributeNS(null, "class", "disclosure");
        header.appendChild(caret);

        const title = document.createElement("div");
        title.classList.add("title");
        title.innerText = LocalizedString("Troubleshooting");
        header.appendChild(title);

        /* Content */

        const content = document.createElement("div");
        content.classList.add("column", "content");
        container.appendChild(content);

        // Add a platform selector
        const selector = this.buildPlatformSelector();
        content.appendChild(selector);

        const sectionContainer = document.createElement("div");
        sectionContainer.classList.add("column", "sections");
        content.appendChild(sectionContainer);

        return container;
    }

    buildFAQSection(title, questions) {
        const container = document.createElement("div");
        container.classList.add("column", "section");

        const heading = document.createElement("div");
        heading.classList.add("heading");
        heading.innerText = title;
        container.appendChild(heading);

        questions.forEach(q => container.appendChild(this.buildFAQQuestion(q)));

        return container;
    }

    buildFAQQuestion(question) {
        const container = document.createElement("div");
        container.classList.add("row", "question");
        container.addEventListener("click", _ => {
            if (container.classList.toggle("expanded")) {
                Analytics.Log("start.screen.click", {
                    button: "faq question",
                    question: question.key,
                    platform: this.selectedPlatform.key,
                });
            }
        });

        const content = document.createElement("div");
        content.classList.add("column", "content");
        container.appendChild(content);

        const heading = document.createElement("div");
        heading.classList.add("heading");
        heading.innerText = this.getPlatformSpecificContent(question.question);
        content.appendChild(heading);

        const body = document.createElement("div");
        body.classList.add("column", "answer");
        content.appendChild(body);
        this.buildFAQAnswer(body, question.answer);

        const icon = document.createElement("div");
        icon.classList.add("column", "icon");
        container.appendChild(icon);

        const openIcon = AppIcons.FAQPlus();
        openIcon.setAttributeNS(null, "class", "open");
        icon.appendChild(openIcon);

        const closeIcon = AppIcons.FAQMinus();
        closeIcon.setAttributeNS(null, "class", "close");
        icon.appendChild(closeIcon);

        return container;
    }

    buildFAQAnswer(container, content) {
        // Answer is either a simple string or an array of content objects
        if (!Array.isArray(content)) {
            content = [{string: content}];
        }

        content = content.map(item => {
            if (item.string) {
                return this.buildFAQAnswerText(item);
            } else if (item.image) {
                return this.buildFAQAnswerImage(item.image);
            } else if (item.list) {
                return this.buildFAQAnswerList(item.list);
            } else {
                console.error("Unknown content type in FAQ answer", item);
                return null;
            }
        }).filter(item => item != null);

        content.forEach(item => container.appendChild(item));
    }

    buildFAQAnswerText(item) {
        let answer = this.contentToElement(item);
        answer.classList.add("text");
        return answer;
    }

    buildFAQAnswerImage(url) {
        const answer = document.createElement("img");
        answer.draggable = false;
        answer.src = this.getOSSpecificContent(url);
        return answer;
    }

    buildFAQAnswerList(list) {
        const answer = document.createElement("ol");
        list.forEach(item => {
            const li = document.createElement("li");
            li.appendChild(this.contentToElement(item));
            answer.appendChild(li);
        });
        return answer;
    }

    updateFAQPanel(platform, selector) {
        // If the selector on the FAQ panel was changed, update ours to match
        const faqSelector = this.faqPanel.querySelector("select");
        if (selector && faqSelector != selector) {
            faqSelector.selectedIndex = selector.selectedIndex;
        }

        const panel = this.faqPanel;
        const sectionContainer = panel.querySelector(".sections");
        sectionContainer.replaceChildren();

        const sections = platform.faq.sections;
        sections.forEach(section => sectionContainer.appendChild(this.buildFAQSection(section.title, section.questions)));
    }

    contentToElement(content) {
        let text = content.string || content;
        text = this.getOSSpecificContent(text);
        text = this.getPlatformSpecificContent(text);

        if (IsKindOf(content, String) || !content.link) {
            return newElementForBoldTagsInString(text);
        } else {
            let element = BetterEnumerateLinkifiedString(text, [content.link]);
            const link = element.querySelector("a");
            link.addEventListener("click", evt => evt.stopPropagation());
            element.classList.add("text");
            return element;
            }
    }

    getOSSpecificContent(content) {
        return IsKindOf(content, String) ? content : isMacOS() ? content.mac : content.win;
    }

    getPlatformSpecificContent(content) {
        return content.replace("PLATFORM", this.selectedPlatform.name);
    }

    /* Info panel */

    buildInfoPanel() {
        const container = document.createElement("div");
        container.classList.add("column", "message_panel");

        const instructions = document.createElement("div");
        instructions.classList.add("column", "instructions");
        container.appendChild(instructions);

        const title = document.createElement("div");
        title.classList.add("title");
        instructions.appendChild(title);
        this.infoPanelTitleElement = title;

        const body = document.createElement("div");
        body.classList.add("description");
        instructions.appendChild(body);
        this.infoPanelBodyElement = body;

        const learnMore = document.createElement("div");
        learnMore.classList.add("learn_more", "description");
        const message = BetterEnumerateLinkifiedString(
            LocalizedString("Need more help? Visit the <0>Help Center</0>."),
            ["https://help.airtime.com"]
        );
        learnMore.appendChild(message);
        instructions.appendChild(learnMore);

        return container;
    }

    updateInfoPanel(state) {
        let title = null;
        switch(state) {
            case VirtualCameraState.needsUpdate:
                // This isn't normal, and there's no action the user needs to take,
                // but let's make sure we handle it in some way
                title = LocalizedString("Update required");
                break;
            case VirtualCameraState.notInstallable:
                title = LocalizedString("Airtime virtual camera cannot be installed");
                break;
            case VirtualCameraState.installing:
                title = LocalizedString("Installation in progress");
                break;
            case VirtualCameraState.error:
                title = LocalizedString("Installation error");
                break;
            default:
                return;
        }

        this.infoPanelTitleElement.innerText = title;
        this.infoPanelBodyElement.innerText = this.virtualCamera.descriptionForState(state);
    }

    /* Needs restart panel */

    buildNeedsRestartPanel() {
        const container = document.createElement("div");
        container.classList.add("column", "message_panel");

        const instructions = document.createElement("div");
        instructions.classList.add("column", "instructions");
        container.appendChild(instructions);

        const title = document.createElement("div");
        title.classList.add("title");
        title.innerText = LocalizedString("Reboot required");
        instructions.appendChild(title);

        const body = document.createElement("div");
        body.classList.add("description");
        instructions.appendChild(body);
        body.innerText = this.virtualCamera.descriptionForState(VirtualCameraState.needsReboot);

        const button = document.createElement("button");
        button.classList.add("capsule");
        button.innerText = LocalizedString("Reboot now");
        button.addEventListener("click", _ => this.restartButtonClicked());
        instructions.appendChild(button);

        return container;
    }

    /**
     * Handles requests to restart the computer or relaunch the app.
     */
    restartButtonClicked() {
        this.virtualCamera.requestReboot();
        Analytics.Log("start.screen.click", {
            button: "reboot computer",
            state: this.virtualCamera.virtualCameraState,
        });
    }

    /*
     * KVO
     */
    observePropertyChanged(obj, key, val) {
        if (key == "isVirtualCameraActive") {
            this.updateVisiblePanel();
        }
    }

    /*
     * Shared instructional content
     */

    static connectionSteps = {
        steps: [
            {
                title: LocalizedString("Open PLATFORM"),
                description: LocalizedString("Connect to a PLATFORM meeting"),
                image: "assets/tour/virtual/PLATFORM/02.gif",
            },
            {
                title: LocalizedString("Choose <0>Airtime</0> in settings"),
                description: LocalizedString("Change the video input in PLATFORM"),
                image: "assets/tour/virtual/PLATFORM/03.gif",
            }
        ],
    };

    static moreBlurryHelp = {
        string: LocalizedString("If your video still looks blurry, read <0>this article</0> for more troubleshooting tips."),
        link: "https://help.airtime.com/hc/en-us/articles/360055727233",
    };

    static sectionNames = {
        appearance: LocalizedString("Appearance"),
        presenting: LocalizedString("Presenting"),
    };

    static platformStrings = {
        mirrorQuestion: LocalizedString("My Airtime virtual camera is flipped in PLATFORM"),
        mirrorExplanation: LocalizedString("PLATFORM flips your camera to make it feel like looking into a mirror. Others on the call will see you normally and not see you or your content mirrored."),
        mirrorInstruction: LocalizedString("If you don’t want to see your video mirrored in PLATFORM:"),

        blurryQuestion: LocalizedString("My Airtime video looks blurry in PLATFORM"),
        blurryExplanation: LocalizedString("You may have background blur turned on in PLATFORM."),

        externalBackgroundQuestion: LocalizedString("My Airtime content is not showing in PLATFORM"),
        externalBackgroundExplanation: LocalizedString("You may have a virtual background applied in PLATFORM."),

        externalEffectQuestion: LocalizedString("I look different in Airtime and PLATFORM"),

        blurryTextQuestion: LocalizedString("People on the call can’t read my slides or say it looks blurry"),
        blurryTextExplanationResolution: LocalizedString("For the highest video quality, check if HD is enabled in PLATFORM."),
    };


    /*
     * Per-platform instructional content
     */

    static platforms = {
        zoom: {
            key: "zoom",
            name: "Zoom",
            connecting: CallInstructionsPanel.connectionSteps,
            faq: {
                sections: [
                    {
                        title: CallInstructionsPanel.sectionNames.appearance,
                        questions: [
                            {
                                key: "mirror",
                                question: CallInstructionsPanel.platformStrings.mirrorQuestion,
                                answer: [
                                    {
                                        image: "assets/faq/zoom/mirror.png"
                                    },
                                    {
                                        string: CallInstructionsPanel.platformStrings.mirrorExplanation,
                                    },
                                    {
                                        string: CallInstructionsPanel.platformStrings.mirrorInstruction,
                                    },
                                    {
                                        list: [
                                            LocalizedString("In Zoom, click the ^ icon above <0>Video</0>."),
                                            LocalizedString("Select <0>Video Settings</0>."),
                                            LocalizedString("In the <0>Camera</0> section, turn off <0>Mirror my video</0>.")
                                        ]
                                    },
                                ],
                            },
                            {
                                key: "blurry",
                                question: CallInstructionsPanel.platformStrings.blurryQuestion,
                                answer: [
                                    {
                                        image: "assets/faq/zoom/blurry.png"
                                    },
                                    {
                                        string: CallInstructionsPanel.platformStrings.blurryExplanation,
                                    },
                                    {
                                        list: [
                                            LocalizedString("In Zoom, click the ^ icon above <0>Video</0>."),
                                            LocalizedString("Make sure <0>Blur my background</0> is not checked."),
                                        ]
                                    },
                                    CallInstructionsPanel.moreBlurryHelp,
                                ],
                            },
                            {
                                key: "external-background",
                                question: CallInstructionsPanel.platformStrings.externalBackgroundQuestion,
                                answer: [
                                    {
                                        image: "assets/faq/zoom/external-background.png",
                                    },
                                    {
                                        string: CallInstructionsPanel.platformStrings.externalBackgroundExplanation,
                                    },
                                    {
                                        list: [
                                            LocalizedString("In Zoom, click the ^ icon above <0>Video</0>."),
                                            LocalizedString("Select <0>Adjust background & effects</0>."),
                                            LocalizedString("Click <0>None</0> to turn off any virtual backgrounds."),
                                        ]
                                    },
                                ]
                            },
                            {
                                key: "external-effect",
                                question: CallInstructionsPanel.platformStrings.externalEffectQuestion,
                                answer: [
                                    {
                                        image: "assets/faq/zoom/external-effect.png",
                                    },
                                    {
                                        string: LocalizedString("You may have a video filter or avatar applied in Zoom."),
                                    },
                                    {
                                        list: [
                                            LocalizedString("In Zoom, click the ^ icon above <0>Video</0>."),
                                            LocalizedString("Select <0>Choose video filter</0> or <0>Choose avatar</0>."),
                                            LocalizedString("Click <0>None</0> to turn off any video filters or avatars.")
                                        ]
                                    },
                                ]
                            }
                        ]
                    },
                ],
            }
        },

        meet: {
            key: "meet",
            name: "Google Meet",
            connecting: CallInstructionsPanel.connectionSteps,
            faq: {
                sections: [
                    {
                        title: CallInstructionsPanel.sectionNames.appearance,
                        questions: [
                            {
                                key: "mirror",
                                question: CallInstructionsPanel.platformStrings.mirrorQuestion,
                                answer: [
                                    {
                                        string: CallInstructionsPanel.platformStrings.mirrorExplanation,
                                    },
                                    {
                                        string: LocalizedString("At this time, Google Meet does not allow the mirror effect to be turned off.")
                                    },
                                ],
                            },
                            {
                                key: "blurry",
                                question: CallInstructionsPanel.platformStrings.blurryQuestion,
                                answer: [
                                    {
                                        image: "assets/faq/meet/blurry.png"
                                    },
                                    {
                                        string: CallInstructionsPanel.platformStrings.blurryExplanation,
                                    },
                                    {
                                        list: [
                                            LocalizedString("In Google Meet, click the <0>More options ⋮</0> icon at the bottom of the call screen."),
                                            LocalizedString("Select <0>Apply visual effects</0>."),
                                            LocalizedString("In the <0>Blur and personal backgrounds</0> section, make sure none of the options are selected."),
                                        ]
                                    },
                                    CallInstructionsPanel.moreBlurryHelp,
                                ],
                            },
                            {
                                key: "external-background",
                                question: CallInstructionsPanel.platformStrings.externalBackgroundQuestion,
                                answer: [
                                    {
                                        image: "assets/faq/meet/external-background.png",
                                    },
                                    {
                                        string: CallInstructionsPanel.platformStrings.externalBackgroundExplanation
                                    },
                                    {
                                        list: [
                                            LocalizedString("In Google Meet, click the <0>More options ⋮</0> icon at the bottom of the call screen."),
                                            LocalizedString("Select <0>Apply visual effects</0>."),
                                            LocalizedString("In the <0>Backgrounds</0> tab, make sure none of the options are selected."),
                                        ]
                                    },
                                ]
                            },
                            {
                                key: "external-effect",
                                question: CallInstructionsPanel.platformStrings.externalEffectQuestion,
                                answer: [
                                    {
                                        image: "assets/faq/meet/external-effect.png",
                                    },
                                    {
                                        string: LocalizedString("You may have a filter applied in Google Meet."),
                                    },
                                    {
                                        list: [
                                            LocalizedString("In Google Meet, click the <0>More options ⋮</0> icon at the bottom of the call screen."),
                                            LocalizedString("Select <0>Apply visual effects</0>."),
                                            LocalizedString("In the <0>Filters</0> or <0>Appearance</0> tab, make sure none of the options are selected.")
                                        ]
                                    },
                                ]
                            }
                        ]
                    },
                    {
                        title: CallInstructionsPanel.sectionNames.presenting,
                        questions: [
                            {
                                key: "external-crop",
                                question: LocalizedString("My Airtime video is cropped in Google Meet"),
                                answer: [
                                    {
                                        image: "assets/faq/meet/external-crop.png",
                                    },
                                    {
                                        string: LocalizedString("You may have framing enabled in Google Meet, which puts you in the center of the screen."),
                                    },
                                    {
                                        list: [
                                            LocalizedString("In Google Meet, click the <0>More options ⋮</0> icon at the bottom of the call screen."),
                                            LocalizedString("Select <0>Apply visual effects</0>."),
                                            LocalizedString("In the <0>Appearance</0> tab, make sure <0>Framing</0> is turned off."),
                                        ]
                                    },
                                    {
                                        string: LocalizedString("If your video still looks cropped, it may be because Google Meet changed the size of your video with the number of people in your call."),
                                    },
                                    {
                                        string: LocalizedString("If you’re the host, you can <0>pin your video tile</0> for everyone which will maintain the 16:9 aspect ratio."),
                                        link: "https://support.google.com/meet/answer/7501121",
                                    }
                                ]
                            },
                        ]
                    },
                ],
            },
        },

        teams: {
            key: "teams",
            name: "Microsoft Teams",
            connecting: CallInstructionsPanel.connectionSteps,
            faq: {
                sections: [
                    {
                        title: CallInstructionsPanel.sectionNames.appearance,
                        questions: [
                            {
                                key: "mirror",
                                question: CallInstructionsPanel.platformStrings.mirrorQuestion,
                                answer: [
                                    {
                                        image: "assets/faq/teams/mirror.png"
                                    },
                                    {
                                        string: CallInstructionsPanel.platformStrings.mirrorExplanation,
                                    },
                                    {
                                        string: CallInstructionsPanel.platformStrings.mirrorInstruction,
                                    },
                                    {
                                        list: [
                                            LocalizedString("In Microsoft Teams, click the <0>v</0> icon next to <0>Camera</0>."),
                                            LocalizedString("Select <0>More video effects and settings</0>."),
                                            LocalizedString("Click the <0>Settings</0> tab."),
                                            LocalizedString("Turn off <0>Mirror my video</0>.")
                                        ]
                                    },
                                ],
                            },
                            {
                                key: "blurry",
                                question: CallInstructionsPanel.platformStrings.blurryQuestion,
                                answer: [
                                    {
                                        image: "assets/faq/teams/blurry.png"
                                    },
                                    {
                                        string: CallInstructionsPanel.platformStrings.blurryExplanation,
                                    },
                                    {
                                        list: [
                                            LocalizedString("In Microsoft Teams, click the <0>v</0> icon next to <0>Camera</0>."),
                                            LocalizedString("In the <0>Backgrounds</0> section, select <0>none</0>."),
                                        ]
                                    },
                                    CallInstructionsPanel.moreBlurryHelp,
                                ],
                            },
                            {
                                key: "external-background",
                                question: CallInstructionsPanel.platformStrings.externalBackgroundQuestion,
                                answer: [
                                    {
                                        image: "assets/faq/teams/blurry.png",
                                    },
                                    {
                                        string: CallInstructionsPanel.platformStrings.externalBackgroundExplanation,
                                    },
                                    {
                                        list: [
                                            LocalizedString("In Microsoft Teams, click the <0>v</0> icon next to <0>Camera</0>."),
                                            LocalizedString("In the <0>Backgrounds</0> section, select <0>none</0>."),
                                        ]
                                    },
                                ]
                            },
                        ]
                    },
                ]
            },
        },

        other: {
            key: "other",
            name: "Other video apps",
            connecting: {
                steps: [
                    {
                        title: "",
                        description: LocalizedString("Airtime is compatible with just about any video app you can think of. Although the setup is slightly different for each app, they follow similar steps: simply open the app and select Airtime” as the video or camera input."),
                        image: "assets/tour/virtual/other/01.gif",
                    }
                ]
            },
            faq: {
                sections: []
            },
        }
    }
}
