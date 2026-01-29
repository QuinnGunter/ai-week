//
//  sidebar/looks_pane/idle/widgets/away_widget.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/23/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * The idle panel widget for updating away status.
 *
 * Start by making this work with the current feature, then we can make decisions
 * about refining the feature. E.g. what does it mean to add a new one? Do these
 * also show up as reactions, or just here?
 *
 * We should add metadata to away message reactions marking them as such.
 */
class AwayWidget {

    #cls = {
        widget: "looks-widget",
        helpCard: "help-card",
    };

    #attr = {
        textInputName: "edit-away-screen-text",
    }

    #dataAttr = {
        widget: "away-widget",
        keyTitle: "titleLabel",
        keySubtitle: "subtitleLabel",
        custom: "custom-away-screen",
        awayScreenOptions: "away-screen-options",
        emptyState: "empty-state",
        helpCard: "help-card",
    };

    #actions = {
        close: "close-widget",
        toggleOn: "toggle-away-on",
        toggleOff: "toggle-away-off",
        selectItem: "select-camera-off-reaction",
        removeCustomAwayScreen: "remove-camera-off-reaction",
        closeHelpCard: "close-help-card",
    };

    #defaultKeyDismissedHelpCard = "dismissedAwayHelpCard";

    // The root DOM element for this widget
    #container;

    /**
     * @type {Slide.Modern|null}
     */
    #selectedAwayScreen = null;

    /**
     * @type {Promise|null}
     */
    #reactionsChangedPromise = null;

    constructor() {
        this.#container = this.#createContainer();
        this.#render();
        this.#addEventListeners();
    }

    get el() {
        return this.#container;
    }

    /* Event handling */

    #addEventListeners() {
        const handlers = {
            [this.#actions.close]: () => this.hide(),
            [this.#actions.closeHelpCard]: () => this.#onCloseHelpCard(),
        };
        const handler = this.#createClickHandler(handlers);
        this.#container.addEventListener("click", handler);
    }

    #createClickHandler(handlers) {
        return (ev) => {
            const item = ev.target.closest("[data-action]");
            if (!item) return;

            const action = item.dataset.action;
            const handler = handlers[action];

            if (handler) {
                ev.stopPropagation();
                handler(item.dataset, ev);
            }
        };
    }

    #onCloseHelpCard() {
        const helpCard = this.#getHelpCard();
        helpCard.remove();

        SharedUserDefaults.setValueForKey(true, this.#defaultKeyDismissedHelpCard);
    }

    #hasDismissedHelpCard() {
        return SharedUserDefaults.getValueForKey(this.#defaultKeyDismissedHelpCard, false) === true;
    }

    /* Public API */

    isVisible() {
        return !this.#container.classList.contains("hidden");
    }

    show() {
        this.#container.classList.remove("hidden");
    }

    hide() {
        this.#container.classList.add("hidden");
    }

    setAwayEnabled(enabled) {
        this.#updateToggleButtonsState(enabled);
        this.#setWidgetActive(enabled);
    }

    async reactionsChanged(slides) {
        // Make sure we serialize multiple requests to rerender the list
        if (this.#reactionsChangedPromise != null) {
            await this.#reactionsChangedPromise;
        }
        const awayReactions = this.#filterAwayScreenReactions(slides);
        this.#reactionsChangedPromise = this.#updateAwayScreenButtons(awayReactions);
        await this.#reactionsChangedPromise;
        this.#reactionsChangedPromise = null;
    }

    setSelectedAwayScreen(reaction) {
        this.#selectedAwayScreen = reaction;
        this.#updateTextInputs(reaction);
        this.#updateAwayScreenSelection(reaction);
    }

    updateReactionThumbnail(reaction) {
        this.#updateReactionThumbnail(reaction);
    }

    // Selecting an item from the list sets it as the camera-off reaction
    // So we need to get notified when the camera off reaction is changed

    /* Data helpers */

    #filterAwayScreenReactions(slides) {
        return slides.filter((slide) => (slide == this.#selectedAwayScreen) || LooksUtils.isAwayScreenReaction(slide));
    }

    async #thumbnailForReaction(slide) {
        const media = slide.objects;
        if (media.length == 1) {
            // Special case for reactions with a single media item - use it as the thumbnail
            return this.#thumbnailForReactionMedia(media[0]);
        }
        return slide.thumbnail();
    }

    async #thumbnailForReactionMedia(media) {
        let thumbnail = await ThumbnailStorage.shared.get(media);
        if (IsKindOf(thumbnail, Blob)) {
            thumbnail = await ThumbnailStorage.shared._imageFromBlob(thumbnail);
        }
        thumbnail.classList.add("object-contain");
        return thumbnail;
    }
    /* UI accessors */

    #getOnButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.toggleOn}"]`);
    }

    #getOffButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.toggleOff}"]`);
    }

    #getAwayScreenButtonsContainer() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.awayScreenOptions}"]`);
    }

    #getHelpCard() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.helpCard}"]`);
    }

    /* UI updates */

    #setWidgetActive(active) {
        this.#container.classList.toggle("active-widget", active);
    }

    #updateToggleButtonsState(enabled) {
        this.#getOnButton().setAttribute("aria-selected", enabled ? "true" : "false");
        this.#getOffButton().setAttribute("aria-selected", !enabled ? "true" : "false");
    }

    #updateAwayScreenButtons(slides) {
        // Re-use buttons that already exist
        // Add those that don't exist yet
        const buttons = Array.from(this.#container.querySelectorAll(`.recent-look-button:not([data-action='${this.#actions.removeCustomAwayScreen}'])`));
        const buttonIds = new Set(buttons.map((button) => button.dataset.id));

        // Remove all buttons. Later we'll re-add the ones we want to keep
        buttons.forEach((button) => button.remove());

        // Make new buttons as needed
        const toAdd = slides.filter((slide) => !buttonIds.has(slide.identifier));
        toAdd.forEach((slide) => {
            const button = this.#renderAwayScreenButton(slide);
            buttons.push(button);
        });

        // Re-add the updated list of buttons
        const container = this.#getAwayScreenButtonsContainer();
        LooksUtils.sortSlidesList(slides).forEach((slide) => {
            const button = buttons.find((btn) => btn.dataset.id === slide.identifier);
            container.appendChild(button);
        });
    }

    #addNewAwayScreenButton(slide) {
        const button = this.#renderAwayScreenButton(slide);
        const container = this.#getAwayScreenButtonsContainer();
        container.appendChild(button);
    }

    async #updateReactionThumbnail(slide) {
        const button = this.#container.querySelector(`.recent-look-button[data-id="${slide.identifier}"]`);
        if (!button) {
            return;
        }
        try {
            const img = await this.#thumbnailForReaction(slide);
            img.draggable = false;
            button.replaceChildren(img);
        } catch (err) {
            console.error("Error loading look thumbnail", err);
            return;
        }
    }

    #updateTextInputs(reaction) {
        const nametag = reaction?.objects.find((obj) => IsKindOf(obj, Media.NameBadge));
        const text = reaction?.objects.filter((obj) => IsKindOf(obj, Media.Text));
        if (nametag) {
            this.#updateLineOneInput(nametag.titleLabel.string);
            if (nametag.subtitleLabel.font.size > 0) {
                this.#enableTextInputs(nametag.identifier);
                this.#updateLineTwoInput(nametag.subtitleLabel.string);
            } else {
                this.#enableTextInput(this.#dataAttr.keyTitle, nametag.identifier);
                this.#disableTextInput(this.#dataAttr.keySubtitle);
                this.#updateLineTwoInput("");
            }
        } else if (text?.length > 0) {
            this.#enableTextInput(this.#dataAttr.keyTitle, text[0].identifier);
            this.#updateLineOneInput(text[0].attributedString.toString());
            if (text.length > 1) {
                this.#enableTextInput(this.#dataAttr.keySubtitle, text[1].identifier);
                this.#updateLineTwoInput(text[1].attributedString.toString());
            } else {
                this.#disableTextInput(this.#dataAttr.keySubtitle);
                this.#updateLineTwoInput("");
            }
        } else {
            this.#updateLineOneInput("");
            this.#updateLineTwoInput("");
            this.#disableTextInputs();
        }
    }

    #updateLineOneInput(value) {
        this.#updateInputValue(this.#dataAttr.keyTitle, value);
    }

    #updateLineTwoInput(value) {
        this.#updateInputValue(this.#dataAttr.keySubtitle, value);
    }

    #updateInputValue(key, value) {
        const input = this.#container.querySelector(`input[data-key="${key}"]`);
        input.value = value;
    }

    #enableTextInputs(id) {
        const keys = [this.#dataAttr.keyTitle, this.#dataAttr.keySubtitle];
        keys.forEach((key) => this.#enableTextInput(key, id));
    }

    #enableTextInput(key, id) {
        const input = this.#container.querySelector(`input[data-key="${key}"]`);
        input.disabled = false;
        input.dataset.id = id;
    }

    #disableTextInputs() {
        const keys = [this.#dataAttr.keyTitle, this.#dataAttr.keySubtitle];
        keys.forEach((key) => this.#disableTextInput(key));
    }

    #disableTextInput(key) {
        const input = this.#container.querySelector(`input[data-key="${key}"]`);
        input.disabled = true;
        delete input.dataset.id;
    }

    /* UI construction */

    #createContainer() {
        const container = document.createElement("div");
        container.classList.add(this.#cls.widget, "hidden", "destructive");
        container.dataset.id = this.#dataAttr.widget;
        return container;
    }

    #render() {
        const container = this.#container;
        container.innerHTML = `
            <div class="w-full h-4-5 flex items-center gap-4 justify-between fill-primary">
                <div class="flex items-center gap-4 overflow-hidden text-content-primary body2">
                    <div class="indicator">
                        <div class="round">${AppIcons.CameraOff().outerHTML}</div>
                    </div>
                    ${LocalizedString("Away")}
                </div>
                ${this.#renderCloseButton()}
            </div>

            ${this.#renderOnOffToggle()}

            <hr class="w-full" />

            <div class="w-full flex flex-col gap-4 overflow-auto-y">
                <span class="w-full text-content-primary">${LocalizedString("Away screen")}</span>
                ${this.#renderAwayOptions()}
                ${this.#renderTextInputs()}
                ${this.#renderHelpCard()}
                ${this.#renderKeyboardShortcutHint()}
            </div>
        `;
    }

    #renderOnOffToggle() {
        return `
            <div class="toggle-button w-full text-content-primary gap-2">
                <button data-action="${this.#actions.toggleOn}" class="">${LocalizedString("Away")}</button>
                <button data-action="${this.#actions.toggleOff}" class="">${LocalizedString("Camera on")}</button>
            </div>
        `;
    }

    #renderCloseButton() {
        return `
            <button
                class="icon-button"
                aria-label="${LocalizedString("Close")}"
                data-action="${this.#actions.close}">
                ${AppIcons.Close().outerHTML}
            </button>`;
    }

    #renderAwayOptions() {
        return `
            <div data-id="${this.#dataAttr.awayScreenOptions}" class="w-full grid grid-cols-4 gap-4 p-1">
                ${this.#renderDefaultAwayScreenButton()}
            </div>
        `;
    }

    #renderDefaultAwayScreenButton() {
        return `
            <button
                class="recent-look-button"
                data-action="${this.#actions.removeCustomAwayScreen}">
                <img src="assets/looks/away/brb-thumb.png"></img>
            </button>
        `;
    }

    #renderAwayScreenButton(slide) {
        const button = document.createElement("button");
        button.classList.add("recent-look-button");
        button.dataset.action = this.#actions.selectItem;
        button.dataset.id = slide.identifier;

        const selected = this.#selectedAwayScreen?.identifier == slide.identifier;
        button.setAttribute("aria-selected", selected);

        this.#thumbnailForReaction(slide).then((img) => {
            // Make sure the button's look didn't change while we were loading the thumbnail
            if (button.dataset.id == slide.identifier) {
                img.draggable = false;
                button.replaceChildren(img);
            }
        }).catch((err) => {
            console.error("Error loading away screen thumbnail", err);
            if (button.dataset.id == slide.identifier) {
                button.replaceChildren();
            }
        });

        return button;
    }

    #renderTextInputs() {
        return `
            <div class="w-full flex flex-col gap-2 relative">
                ${this.#renderTextInput(this.#dataAttr.keyTitle, LocalizedString("First line"))}
                ${this.#renderTextInput(this.#dataAttr.keySubtitle, LocalizedString("Second line"))}

                <div data-id="${this.#dataAttr.emptyState}"
                    class="absolute fill-container flex justify-center items-center text-content-tertiary body-small p4 text-center bordered border-primary border-radius-1-5">
                    ${LocalizedString("This away screen has no customizable text")}
                </div>
            </div>
        `;
    }

    #renderTextInput(key, label) {
        return `
            <input
                type="text"
                name="${this.#attr.textInputName}"
                data-key="${key}"
                aria-label="${label}"
                class="w-full caption1"
                autocomplete="off"
                spellcheck="false" />
        `;
    }

    #renderHelpCard() {
        if (this.#hasDismissedHelpCard()) {
            return "";
        }
        return `
            <div data-id="${this.#dataAttr.helpCard}"
                class="${this.#cls.helpCard} text-content-tertiary body-small">

                <span class="p-1">
                    ${LocalizedString("Away mode turns off your camera and displays a customizable message to let others know why your video is off.")}
                </span>

                <button class="ghost_button" data-action="${this.#actions.closeHelpCard}">
                    ${AppIcons.Close().outerHTML}
                </button>
        </div>
        `;
    }

    #renderKeyboardShortcutHint() {
        return `
            <div class="w-full flex justify-end items-center gap-2 text-content-secondary caption1">
                <span class="keycap">A</span>
                ${LocalizedString("toggle away mode")}
            </div>
        `;
    }

    /* Selection */

    #updateAwayScreenSelection(slide) {
        // This slide might be a custom away screen, and thus not in our list yet
        // TODO we should replace the previous custom away screen button, but
        // we don't really have a strong concept of "custom away screen" yet.
        if (slide && !this.#container.querySelector(`.recent-look-button[data-id="${slide.identifier}"]`)) {
            this.#addNewAwayScreenButton(slide);
        }

        this.#selectAwayScreen(slide ? slide.identifier : null);
    }

    #selectAwayScreen(id) {
        const buttons = this.#container.querySelectorAll(".recent-look-button");
        buttons.forEach((button) => {
            if (!id && button.dataset.action === this.#actions.removeCustomAwayScreen) {
                button.setAttribute("aria-selected", "true");
            } else if (button.dataset.id === id) {
                button.setAttribute("aria-selected", "true");
            } else {
                button.removeAttribute("aria-selected");
            }
        });
    }
}
