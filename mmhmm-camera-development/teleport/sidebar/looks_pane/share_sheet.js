//
//  sidebar/looks_pane/share_sheet.js
//  mmhmm
//
//  Created by Seth Hitchings on 3/11/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LooksShareSheet extends ActionSheet {

    /**
     * @type {SharedObject}
     */
    #individualShare;

    /**
     * @type {SharedObject}
     */
    #teamShare;

    #updateExportButton;
    #shareWithTeamButton;
    #stopSharingWithTeamButton;
    #stopSharingLinkButton;

    /**
     *
     * @param {LooksSharing} sharing
     * @param {Slide.Modern} slide
     * @param {LooksContentType} type
     * @param {?Function} updateThumbnailCallback
     */
    constructor(sharing, slide, type, updateThumbnailCallback = null) {
        const container = document.createElement("div");
        super(LooksShareSheet.getSheetTitle(type), container, null, false, false);

        this.container = container;
        this.sharing = sharing;
        this.slide = slide;
        this.type = type;
        this.updateThumbnailCallback = updateThumbnailCallback;

        this.populateContainer(container);
        this.loadContent();
    }

    displayAsModal() {
        super.displayAsModal();
        this.logAnalyticsOpen();

        this.addEventListener("dismiss", () => this.logAnalyticsClose());
    }

    async loadContent() {
        // Perform networking tasks in parallel
        const tasks = [];
        tasks.push(this.slide.prepareForDuplication());
        tasks.push(this.sharing.loadContent());
        await Promise.all(tasks).catch(err => {
            // TODO - handle errors better
            console.error("Error loading share sheet content", err);
            this.showError(LocalizedString("An unexpected error occurred"));
        });

        // These will use data loaded during sharing.loadContent, so although
        // they're async, they won't require additional network requests
        await this.loadTeamShare();
        await this.loadIndividualShare();

        this.loadSlideThumbnail();
        this.populateNameField();
        this.populateDomainField();
        this.updateButtonVisibility();

        this.container.classList.remove("loading");
    }

    async loadTeamShare() {
        if (this.sharing.isInGroup && this.sharing.canShareWithGroup) {

            let promise = this.sharing.findGroupSharedObjectForSlide(this.slide.identifier);
            this.#teamShare = await this.loadSharedObject(promise);

            if (this.#teamShare == null && this.sharing.canPublishBuiltInContent) {
                // If we're publishing to the special "built in content" team,
                // the slide share might be treated as a builtin object, not a group share
                promise = this.sharing.findBuiltinSharedObjectForSlide(this.slide.identifier);
                this.#teamShare = await this.loadSharedObject(promise);
            }
        }
    }

    async loadIndividualShare() {
        const promise = this.sharing.findIndividualSharedObjectForSlide(this.slide.identifier);
        this.#individualShare = await this.loadSharedObject(promise);
    }

    async loadSharedObject(promise) {
        let result = await promise;
        if (!result.successful) {
            this.showError(LocalizedString("An unexpected error occurred loading sharing information"));
            return null;
        }
        return result.results;
    }

    /* UI creation */

    static getSheetTitle(type) {
        switch (type) {
            case LooksContentType.Look:
                return LocalizedString("Share Look");
            case LooksContentType.Reaction:
                return LocalizedString("Share Visual");
            default:
                console.error("Unknown looks object type", type);
                return "";
        }
    }

    populateContainer(container) {
        container.classList.add("looks_share_sheet", "w-full", "flex", "flex-col", "relative", "loading");
        container.appendChild(this.buildThumbnail());
        container.appendChild(this.buildInputs());
        container.appendChild(this.createDivider());
        container.appendChild(this.buildActions());
        container.appendChild(this.buildLoadingOverlay());
    }

    buildLoadingOverlay() {
        const container = document.createElement("div");
        container.classList.add("loading_overlay", "absolute", "flex", "justify-center", "items-center", "h-full", "w-full");

        const spinner = document.createElement("div");
        spinner.classList.add("loader");
        container.appendChild(spinner);

        return container;
    }

    buildThumbnail() {
        const container = document.createElement("div");
        container.classList.add("thumbnail", "w-full", "flex", "flex-col");

        const thumbnail = document.createElement("div");
        thumbnail.classList.add("thumbnail_image");
        container.appendChild(thumbnail);

        const placeholder = document.createElement("img");
        placeholder.src = ThumbnailStorage.AssetMissing;
        placeholder.draggable = false;
        thumbnail.appendChild(placeholder);

        return container;
    }

    async loadSlideThumbnail() {
        // Replace the placeholder with the actual thumbnail
        let image = null;
        if (this.type == LooksContentType.Reaction) {
            image = await this.#thumbnailImageForReaction(this.slide);
        } else {
            image = await this.slide.thumbnail();
        }
        this.replaceThumbnail(image);
    }

    // TODO this is copy/pasted from looks_idle_pane.js
    async #thumbnailImageForReaction(slide) {
        const media = slide.objects;
        if (media.length == 1) {
            // Special case for reactions with a single media item - use it as the thumbnail
            const thumbnail = await ThumbnailStorage.shared.get(media[0]);
            if (IsKindOf(thumbnail, Blob)) {
                return await ThumbnailStorage.shared._imageFromBlob(thumbnail);
            } else if (IsKindOf(thumbnail, HTMLImageElement)) {
                return thumbnail;
            }
        }
        return slide.thumbnail();
    }

    async uploadThumbnailClicked() {
        const files = await Media.Files.showFilePicker(1, Media.Files.imageMimeTypes());
        if (files == null || files.length == 0) {
            return;
        }
        const file = files[0];

        const image = new Image();
        const url = URL.createObjectURL(file);
        image.src = url;
        image.addEventListener("load", () => {
            this.replaceThumbnail(image);
            URL.revokeObjectURL(url);
        });
        this.customThumbnailBlob = file;
    }

    /**
     * Optionally customize thumbnail we upload, same as the logic above for what we display.
     * @returns {?Blob}
     */
    async #thumbnailBlobForUpload() {
        if (this.customThumbnailBlob) {
            return this.customThumbnailBlob;
        } else if (this.type != LooksContentType.Reaction) {
            return null;
        }
        const media = this.slide.objects;
        if (media.length == 1) {
            // Special case for reactions with a single media item - use it as the thumbnail
            const thumbnail = await ThumbnailStorage.shared.get(media[0]);
            if (IsKindOf(thumbnail, Blob)) {
                return thumbnail;
            } else {
                // TODO we have code above to handle images, but I can't recall when that would happen
                console.error("Unexpected reaction media thumbnail type", thumbnail);
            }
        }
        return null;
    }

    /**
     * Replace a media item's thumbnail asset with a blob that was uploaded.
     * We do this for reactions that have a single media item.
     */
    async replaceThumbnailAsset() {
        if (this.type != LooksContentType.Reaction || this.customThumbnailBlob == null) {
            return;
        }

        const slide = this.slide;
        const medias = slide.objects;
        if (medias.length == 1) {
            const media = medias[0];
            media.invalidateThumbnail();
            media.thumbnailAsset = new LocalAsset({blob: this.customThumbnailBlob});
            await media.performPersistence();
            slide.invalidateThumbnail();
        }
    }

    replaceThumbnail(image) {
        image.draggable = false;
        const container = this.container.querySelector("div.thumbnail .thumbnail_image");
        const placeholder = container.querySelector("img");
        container.replaceChild(image, placeholder);
    }

    buildInputs() {
        const container = document.createElement("div");
        container.classList.add("inputs", "w-full", "gap-2", "items-center");

        const updateThumbButton = this.newIconButton(
            AppIcons.Camera(),
            LocalizedString("Retake")
        );
        updateThumbButton.classList.add("self-end");
        updateThumbButton.addEventListener("click", () =>
            this.updateThumbnailClicked(updateThumbButton)
        );

        const useMyImage = document.createElement("div");
        useMyImage.classList.add("flex", "items-center", "gap-2");

        // Allow the user to upload a thumbnail
        const uploadThumbButton = this.newIconButton(
            AppIcons.ShareArrow(),
            LocalizedString("Upload")
        );
        uploadThumbButton.classList.add("self-end");
        uploadThumbButton.addEventListener("click", (evt) =>
            this.uploadThumbnailClicked(evt)
        );

        // default checkbox state is based on user preferences
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "use-my-image";
        checkbox.classList.add("checkbox");
        if (SharedUserDefaults.getValueForKey("looksUseLiveThumbnails", true)) {
            checkbox.checked = true;
            uploadThumbButton.classList.add("hidden");
        } else {
            updateThumbButton.classList.add("hidden");
        }

        checkbox.addEventListener("change", async (evt) => {
            if (evt.target.checked) {
                uploadThumbButton.classList.add("hidden");
                updateThumbButton.classList.remove("hidden");

                const image = await this.updateThumbnailCallback({
                    useLiveThumbnails: true
                });
                this.replaceThumbnail(image);
                this.customThumbnailBlob = null;
            } else {
                uploadThumbButton.classList.remove("hidden");
                updateThumbButton.classList.add("hidden");

                const image = await this.updateThumbnailCallback({
                    useLiveThumbnails: false
                });
                this.replaceThumbnail(image);
                this.customThumbnailBlob = null;
            }
        });

        const label = document.createElement("label");
        label.classList.add("caption1", "text-content-primary");

        if (this.updateThumbnailCallback) {
            label.htmlFor = "use-my-image";
            label.innerText = LocalizedString("Use my image");
            useMyImage.appendChild(checkbox);
            useMyImage.appendChild(label);
            container.appendChild(useMyImage);
            container.appendChild(updateThumbButton);
            container.appendChild(uploadThumbButton);
        } else {
            label.innerText = LocalizedString("Thumbnail");
            container.appendChild(label);
            container.appendChild(uploadThumbButton);
        }


        // Allow the user to update the name of the shared object
        container.append(...this.buildTextInput(LocalizedString("Name"), "name"));

        // Allow internal folks to set the "tags" field
        if (this.sharing.canPublishBuiltInContent) {
            container.append(
                ...this.buildTextInput(LocalizedString("Email domain"), "domain")
            );
        }

        // Allow updating the published object
        /*const publishUpdateButton = this.newIconButton(AppIcons.UploadProgress(), LocalizedString("Publish updates"));
        publishUpdateButton.classList.remove("w-half");
        publishUpdateButton.classList.add("justify-self-end", "w-full");
        publishUpdateButton.style["grid-column"] = 2;
        publishUpdateButton.addEventListener("click", () => this.updateShareClicked());
        container.appendChild(publishUpdateButton);
        this.#updateExportButton = publishUpdateButton;*/

        return container;
    }


    newIconButton(icon, text) {
        const button = document.createElement("button");
        button.classList.add("flex", "text-button", "items-center", "gap-2", "caption1");
        button.appendChild(icon);

        const label = document.createElement("span");
        label.innerText = text;
        button.appendChild(label);

        return button;
    }

    buildTextInput(labelText, className) {
        const label = document.createElement("label");
        label.classList.add("text-content-tertiary", "body4");
        label.innerText = labelText;

        const input = document.createElement("input");
        input.classList.add(className);
        input.type = "text";
        label.for = input.id = "looks_share_sheet_" + className;

        return [label, input];
    }

    getNameInput() {
        return this.container.querySelector("input.name");
    }

    getShareTitle() {
        return this.getNameInput().value;
    }

    getDomainInput() {
        return this.container.querySelector("input.domain");
    }

    getDomain() {
        return this.getDomainInput()?.value ?? "";
    }

    populateNameField() {
        // See if we've previously customized the shared object name
        const existingGroupTitle = this.#teamShare?.title;
        const existingIndividualTitle = this.#individualShare?.title;
        this.getNameInput().value = existingGroupTitle || existingIndividualTitle || this.slide.title || "";
    }

    populateDomainField() {
        const input = this.getDomainInput();
        const teamShare = this.#teamShare;
        if (input && teamShare) {
            input.value = this.#teamShare.tags ?? "";
        }
    }

    buildActions() {
        const container = document.createElement("div");
        container.classList.add("actions", "w-full", "flex", "flex-col");
        container.appendChild(this.buildCopyLinkButton());
        container.appendChild(this.buildStopSharingLinkButton());

        container.appendChild(this.buildShareToGroupButton());
        container.appendChild(this.buildStopSharingToGroupButton());

        container.appendChild(this.createDivider());

        container.appendChild(this.buildPublishUpdatesButton());
        const done = this.newActionButton(LocalizedString("Done"), _ => this.dismiss())
        container.appendChild(done);

        return container;
    }

    createDivider() {
        const divider = document.createElement("div");
        divider.classList.add("divider", "w-full");
        return divider;
    }

    newActionButton(title, action) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("action", "w-full");
        const button = document.createElement("button");
        button.classList.add("secondary-button", "caption1", "w-full", "text-ellipsis");
        button.innerText = title;
        button.addEventListener("click", _ => action(button));
        wrapper.appendChild(button);
        return wrapper;
    }

    buildCopyLinkButton() {
        const button = this.newActionButton(
            LocalizedString("Copy link"),
            button => this.copyLinkClicked(button));
        return button;
    }

    buildPublishUpdatesButton() {
        const button = this.newActionButton(
            LocalizedString("Publish updates"),
            _ => this.updateShareClicked());
        this.#updateExportButton = button;
        return button;
    }

    buildStopSharingLinkButton() {
        const button = this.newActionButton(
            LocalizedString("Stop sharing link"),
            _ => this.stopSharingLinkClicked());
        button.classList.add("destructive");
        this.#stopSharingLinkButton = button;
        return button;
    }

    buildShareToGroupButton() {
        const button = this.newActionButton(
            LocalizedStringFormat("Share with ${group}", { group: this.sharing.groupName }),
            _ => this.shareToGroupClicked());
        this.#shareWithTeamButton = button;
        return button;
    }

    buildStopSharingToGroupButton() {
        const button = this.newActionButton(
            LocalizedStringFormat("Stop sharing with ${group}", { group: this.sharing.groupName }),
            _ => this.stopSharingToGroupClicked());
        button.classList.add("destructive");
        this.#stopSharingWithTeamButton = button;
        return button;
    }

    updateButtonVisibility() {
        const hasGroup = this.sharing.isInGroup;
        const canShareToGroup = hasGroup && this.sharing.canShareWithGroup;

        const hasIndividualShare = this.#individualShare != null;
        const hasTeamShare = hasGroup && this.#teamShare != null;

        this.#stopSharingLinkButton.classList.toggle("hidden", !hasIndividualShare);

        this.#shareWithTeamButton.classList.toggle("hidden", hasTeamShare || !canShareToGroup);
        this.#stopSharingWithTeamButton.classList.toggle("hidden", !hasTeamShare);

        // See if the slide has been updated since either of the shares were created
        const slideUpdated = this.getSlideLastUpdated(this.slide);
        const individualNeedsUpdate = this.#individualShare != null && this.#individualShare.created < slideUpdated;
        const teamNeedsUpdate = this.#teamShare != null && this.#teamShare.created < slideUpdated;
        this.#updateExportButton.classList.toggle("hidden", !individualNeedsUpdate && !teamNeedsUpdate);
    }

    enableButtons() {
        this.setButtonsDisabled(false);
    }

    disableButtons() {
        this.setButtonsDisabled(true);
    }

    setButtonsDisabled(disabled) {
        const buttons = this.container.querySelectorAll("button");
        buttons.forEach(b => b.disabled = disabled);
    }

    /* Action handlers */

    async copyLinkClicked(button) {
        this.disableButtons();
        await this.shareIndividually(button);
        this.updateButtonVisibility();
        this.enableButtons();
    }

    async stopSharingLinkClicked() {
        this.disableButtons();
        const share = this.#individualShare;
        const result = await this.sharing.unshareObject(share.identifier);
        if (!result.successful) {
            this.showError(LocalizedString("An unexpected error occurred attempting to unshare."));
        } else {
            this.#individualShare = null;
            this.updateButtonVisibility();
            this.logAnalyticsAction("stop sharing link");
        }
        this.enableButtons();
    }

    async shareIndividually(button) {
        // See if the object is already shared individually
        let share = this.#individualShare;
        if (!share) {
            // If not, share it
            await this.replaceThumbnailAsset();
            const thumbnail = await this.#thumbnailBlobForUpload();
            const result = await this.sharing.shareObject(this.slide, this.type, false,
                this.getShareTitle(), null, thumbnail);
            if (!result.successful) {
                this.showError(LocalizedString("An unexpected error occurred attempting to share."));
                return;
            } else {
                this.logAnalyticsAction("copy link");
            }
            share = result.results;
            this.#individualShare = share;
        }

        // Copy the link to the clipboard
        let message = LocalizedString("Link copied to clipboard");
        try {
            await navigator.clipboard.writeText(share.shareUrl);
        } catch (err) {
            message = LocalizedString("Error copying link to clipboard");
        }
        const oldText = button.innerText;
        button.innerText = message;
        button.classList.add("success");
        setTimeout(() => {
            button.innerText = oldText;
            button.classList.remove("success");
        }, 1500);
    }

    async shareToGroupClicked() {
        this.disableButtons();

        let tag = this.getDomain();
        if (tag && !tag.startsWith("@") && !tag.startsWith("#")) {
            tag = "@" + tag;
        }

        await this.replaceThumbnailAsset();
        const thumbnail = await this.#thumbnailBlobForUpload();
        const result = await this.sharing.shareObject(this.slide, this.type, true,
            this.getShareTitle(), tag, thumbnail);
        if (!result.successful) {
            this.showError(LocalizedString("An unexpected error occurred attempting to share."));
        } else {
            this.#teamShare = result.results;
            this.updateButtonVisibility();

            this.logAnalyticsAction("share with group");
        }
        this.enableButtons();
    }

    async stopSharingToGroupClicked() {
        this.disableButtons();
        const share = this.#teamShare;
        const result = await this.sharing.unshareObject(share.identifier);
        if (!result.successful) {
            this.showError(LocalizedString("An unexpected error occurred attempting to unshare."));
        } else {
            this.#teamShare = null;
            this.updateButtonVisibility();

            this.logAnalyticsAction("stop sharing with group");
        }
        this.enableButtons();
    }

    async updateThumbnailClicked(button) {
        button.disabled = true;
        try {
            const image = await this.updateThumbnailCallback({
                useLiveThumbnails: true
            });
            this.replaceThumbnail(image);
            this.customThumbnailBlob = null;

            this.logAnalyticsAction("update thumbnail");
        } catch(err) {
            this.showError(LocalizedString("An error occurred attempting to update the thumbnail."));
        } finally {
            button.disabled = false;
        }
    }

    async updateShareClicked() {
        this.disableButtons();

        let showedError = false;

        let tag = this.getDomain();
        if (tag && !tag.startsWith("@") && !tag.startsWith("#")) {
            tag = "@" + tag;
        }

        const thumbnail = await this.#thumbnailBlobForUpload();
        await this.replaceThumbnailAsset();

        // Update each of the shares separately
        // We could optimize this and only update them if they need it, but it's not worth the complexity

        if (this.#individualShare) {
            const result = await this.sharing.updateSharedObject(this.slide, this.#individualShare, false,
                this.getShareTitle(), tag, thumbnail);
            if (!result.successful) {
                this.showError(LocalizedString("An unexpected error occurred updating the share"));
                showedError = true;
            } else {
                this.#individualShare = result.results;

                this.logAnalyticsAction("update shared link");
            }
        }

        if (this.#teamShare) {
            const result = await this.sharing.updateSharedObject(this.slide, this.#teamShare, true,
                this.getShareTitle(), tag, thumbnail);
            if (!result.successful) {
                if (!showedError) {
                    // Don't show two errors...
                    this.showError(LocalizedString("An unexpected error occurred updating the share"));
                }
            } else {
                this.#teamShare = result.results;

                this.logAnalyticsAction("update group share");
            }
        }

        this.updateButtonVisibility();
        this.enableButtons();
    }

    /* Misc */

    /**
     * @param {Slide.Modern} slide
     * @returns {Date}
     */
    getSlideLastUpdated(slide) {
        // A slide is made of multiple CloudyRecord objects - the slide itself (page), the presenter media record,
        // a media record for every media item on stage. We need to find the most recent update date of all of these.
        let dates = [
            slide.updated,                        // The slide record
            new Date(slide.presenter?.updatedAt), // The presenter media record
        ];

        for (const media of slide.objects) {
            dates.push(media.updated);      // The slide's media records
        }

        // Just in case
        dates = dates.filter(date => date != null);

        return new Date(Math.max(...dates));
    }

    showError(message) {
        ShowAlertView(LocalizedString("Sharing error"), message);
    }

    /* Analytics stuff */

    get analyticsPrefix() {
        return this.type == LooksContentType.Look ? "look" : "visual";
    }

    get analyticsProperties() {
        const props = {};
        props[`${this.analyticsPrefix}_id`] = this.slide.identifier;
        return props;
    }

    logAnalyticsOpen() {
        Analytics.Log(`${this.analyticsPrefix}.share_settings.opened`, this.analyticsProperties);
    }

    logAnalyticsClose() {
        Analytics.Log(`${this.analyticsPrefix}.share_settings.closed`, this.analyticsProperties);
    }

    logAnalyticsAction(action) {
        const analyticsPrefix = this.analyticsPrefix;
        const props = this.analyticsProperties;
        props.name = action;
        props.selector_type = "button";
        props.custom_thumbnail = this.customThumbnailBlob != null;
        Analytics.Log(`${analyticsPrefix}.share_settings.element_clicked`, props);
    }
}
