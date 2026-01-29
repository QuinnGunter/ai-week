//
//  sidebar/looks_pane/sharing.js
//  mmhmm
//
//  Created by Seth Hitchings on 3/10/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//
//

/**
 * Wraps the underlying sharing functionality for looks so that consumers
 * don't need to directly exercise the raw API.
 */
class LooksSharing {

    #endpoint;
    #roomsStore;

    #employee = false;
    #emailDomain;
    #isInGroup;
    #groupName;
    #groupId;
    #canShareWithGroup;
    #newUserSharedObjectId = null;
    #demoLookId = null;

    /**
     * @type {[SharedObject]} All of the content that is available for the user to import,
     * either because it was published by us, or because the user is in a group and it was
     * published for the group.
     */
    #publishedContent;

    /**
     * @type {[SharedObject]} The subset of #publishedContent that is available to the user
     * because it was published by us.
     */
    #builtInContent;

    /**
     * @type {[SharedObject]} The subset of #publishedContent that is available to the user
     * because it was published to their group.
     */
    #groupContent;

    /**
     * @type {[SharedObject]} All of the content that the user has shared individually from their account.
     */
    #sharedIndividualContent;

    #looksPresentation;
    #reactionsPresentation;

    /**
     * @param {mmhmmAPI} endpoint
     */
    constructor(endpoint, looksPresentation, reactionsPresentation, roomsStore) {
        this.#endpoint = endpoint;
        this.#looksPresentation = looksPresentation;
        this.#reactionsPresentation = reactionsPresentation;
        this.#roomsStore = roomsStore;

        this.loadUser();
    }

    async loadUser() {
        // The API should already have the user cached, so we can use it immediately
        const user = await this.#endpoint.getMe(false);
        this.#employee = user.employee;
        this.#isInGroup = user.business || user.workgroup;
        this.#emailDomain = user.email.split("@")[1];
        this.#demoLookId = user.unclaimedLookId;
        if (user.workgroup) {
            this.#groupName = user.workgroupName;
            this.#groupId = user.workgroupId;
            this.#canShareWithGroup = true;
        } else if (user.business) {
            this.#groupName = user.businessName;
            this.#groupId = user.businessId;
            this.#canShareWithGroup = user.businessPermissions?.canWriteToCompanionCatalog === true;
        } else {
            this.#canShareWithGroup = false;
        }

        // See if our user created their account as part of a share recipient flow
        const utmContent = user.trackingParameters?.utm_content;
        if (utmContent && utmContent.startsWith("camera-import-")) {
            const uuid = utmContent.substring(14);
            if (isUUID(uuid)) {
                this.#newUserSharedObjectId = uuid;
            }
        }
    }

    async loadContent() {
        return Promise.all([
            this.#getPublishedContent(),
            this.#getSharedIndividualContent(),
            this.loadUser(),
        ]);
    }

    async refreshContent() {
        this.#publishedContent = null;
        this.#builtInContent = null;
        this.#groupContent = null;
        this.#sharedIndividualContent = null;
        return this.loadContent();
    }

    /*
     * Groups functionality
     */

    get isEmployee() {
        return this.#employee === true;
    }

    get canPublishBuiltInContent() {
        // These are the business IDs of the special "group catalog" groups
        // If you're a member of one of these businesses, you can publish
        // I guess...
        const groupIds = [
            "46ccbaf1-f35b-4378-8287-58266e8340a0", // Prod
            "84c908d9-2159-4f58-9462-e6a843d98036", // Stage
            "f1e4f71c-484f-4034-a5e3-2aa195cfa06a", // Dev
        ];
        return groupIds.includes(this.#groupId);
    }

    /**
     * @returns {boolean} whether the user is in a group (business or workgroup)
     */
    get isInGroup() {
        return this.#isInGroup === true;
    }

    /**
     * @returns {?string} the name of the group the user is in, or null if they are not in a group
     */
    get groupName() {
        return this.#groupName;
    }

    /**
     * @returns {?string} the ID of the group the user is in, or null if they are not in a group
     */
    get groupId() {
        return this.#groupId;
    }

    /**
     * @returns {boolean} whether the user can share content with their group
     */
    get canShareWithGroup() {
        return this.#canShareWithGroup === true;
    }

    /**
     * @returns {string} the ID of an object shared with the user that caused them
     * to create their account.
     */
    get newUserSharedObjectId() {
        return this.#newUserSharedObjectId;
    }

    /**
     * @returns {string} the ID of a demo look that was created for the user.
     */
    get demoLookId() {
        return this.#demoLookId;
    }

    removeDemoLook() {
        if (this.demoLookId) {
            this.#endpoint.removeDemoLook().catch((err) => {
                console.error("Error removing demo look", err);
            });
            this.#demoLookId = null;
        }
    }

    /**
     * @param {LooksContentType} type
     * @returns {Object}
     */
    async listGroupContent(type) {
        try {
            const allContent = await this.#getGroupContent();
            const results = allContent.filter(obj => obj.type === type);
            return this.#newSuccessResult(this.#sortSharedObjects(results));
        } catch (e) {
            console.error("Error fetching team shared content", e);
            return this.#newErrorResult("Error fetching team shared content");
        }
    }

    /**
     * See if a given slide has been shared with the user's group.
     * @param {string} slideId
     * @returns {Object} a result object containing the shared object that matches the slide ID
     */
    async findGroupSharedObjectForSlide(slideId) {
        try {
            const sharedContent = await this.#getGroupContent();
            const match = sharedContent.find(obj => obj.originalDocumentId == slideId);
            return this.#newSuccessResult(match);
        } catch (e) {
            console.error("Error checking if object is shared with group", e);
            return this.#newErrorResult("Error checking if object is shared with group");
        }
    }

    /** Built in content functionality */

    async listBuiltinLooks() {
        return this.listBuiltinContent(LooksContentType.Look);
    }

    async listBuiltinReactions() {
        return this.listBuiltinContent(LooksContentType.Reaction);
    }

    /**
     * See if a given slide has been shared as "built in" content.
     * @param {string} slideId
     * @returns {Object} a result object containing the shared object that matches the slide ID
     */
    async findBuiltinSharedObjectForSlide(slideId) {
        try {
            const sharedContent = await this.#getBuiltInContent();
            const match = sharedContent.find(obj => obj.originalDocumentId == slideId);
            return this.#newSuccessResult(match);
        } catch (e) {
            console.error("Error checking if object is built in", e);
            return this.#newErrorResult("Error checking if object is built in");
        }
    }

    /**
     * @param {LooksContentType} type
     * @returns {Object}
     */
    async listBuiltinContent(type) {
        try {
            const allContent = await this.#getBuiltInContent();
            const results = allContent.filter(obj => obj.type === type);
            return this.#newSuccessResult(this.#sortSharedObjects(results));
        } catch (e) {
            console.error("Error fetching built in content", e);
            return this.#newErrorResult("Error fetching built in content");
        }
    }

    /* My content shared individually */

    /**
     * @returns {SharedObject[]} the objects the user has shared individually
     * @throws {Error} if there is an error fetching the shared content
     */
    async #getSharedIndividualContent() {
        if (!this.#sharedIndividualContent) {
            // We fetch this once and store it locally - it's not important to refresh it
            // while the user has the catalog open. We can build refresh later if we need.
            try {
                const records = await this.#endpoint.listExportedObjects();
                if (records == null) {
                    throw new Error("listExportedObjects returned null");
                }
                this.#sharedIndividualContent = records.map(record => new SharedObject(record, this));
            } catch (err) {
                console.error("Error fetching shared individual content", err);
            }
        }
        return this.#sharedIndividualContent || [];
    }

    /**
     * See if a given slide has been shared by link.
     * @param {string} slideId
     * @returns {Object} a result object containing the shared object that matches the slide ID
     */
    async findIndividualSharedObjectForSlide(slideId) {
        try {
            const sharedContent = await this.#getSharedIndividualContent();
            const match = sharedContent.find(obj => obj.originalDocumentId == slideId);
            return this.#newSuccessResult(match);
        } catch (e) {
            console.error("Error checking if object is shared", e);
            return this.#newErrorResult("Error checking if object is shared");
        }
    }

    /*
     * Exporting shared content
     */

    /**
     * @param {Slide.Modern} slide
     * @returns {Object} a result object containing the new SharedObject
     */
    async shareLookWithGroup(slide) {
        return this.shareObject(slide, LooksContentType.Look, true);
    }

    /**
     * @param {Slide.Modern} slide
     * @returns {Object} a result object containing the new SharedObject
     */
    async shareReactionWithGroup(slide) {
        return this.shareObject(slide, LooksContentType.Reaction, true);
    }

    /**
     * @param {Slide.Modern} slide
     * @param {LooksContentType} type
     * @returns {Object} a result object containing the new SharedObject
     */
    async shareObject(slide, type, shareWithTeam, title=null, tag=null, thumbnail=null) {
        try {
            // First make sure the slide is fully persisted
            await slide.prepareForDuplication();

            const record = await this.#endpoint.exportSlide(slide, type, shareWithTeam, title, tag);
            if (!record.id) {
                // TODO update the API to throw an exception in this case
                return this.#newErrorResult("No ID returned from API");
            }

            // Upload the slide's thumbnail
            const thumbnails = thumbnail ? [thumbnail] : null;
            await this.#endpoint.uploadThumbnailsForExport([slide], record.thumbnailUploadUrls, thumbnails);

            // Wrap the object and add it to our local list
            const result = new SharedObject(record, this, tag);
            this.#updateCachedObject(result, shareWithTeam);
            return this.#newSuccessResult(result);
        } catch (e) {
            console.error("Error sharing object", e);
            return this.#newErrorResult("Error sharing object");
        }
    }

    /*
     * Update shared content
     */

    async updateSharedObject(slide, sharedObject, shareWithTeam, title=null, tag=null, thumbnail=null) {
        try {
            // First make sure the slide is fully persisted
            await slide.prepareForDuplication();

            const record = await this.#endpoint.updateExportedObject(sharedObject.identifier,
                sharedObject.type, shareWithTeam, title || sharedObject.title, tag);

            // Upload the thumbnail
            const thumbnails = thumbnail ? [thumbnail] : null;
            await this.#endpoint.uploadThumbnailsForExport([slide], record.thumbnailUploadUrls, thumbnails);

            // Update the object in our local list
            const result = new SharedObject(record, this);
            this.#updateCachedObject(result, shareWithTeam);
            return this.#newSuccessResult(result);
        } catch (e) {
            console.error("Error updating shared object", e);
            return this.#newErrorResult("Error updating shared object");
        }
    }

    #updateCachedObject(sharedObject, shareWithTeam) {
        if (shareWithTeam) {
            // Update the list of published content
            const cached = this.#publishedContent;
            const idx = cached.findIndex(obj => obj.identifier === sharedObject.identifier);
            if (idx != -1) {
                cached.splice(idx, 1);
            }
            cached.push(sharedObject);
            this.#publishedContent = cached;

            // Clear the filtered list of group & builtin content
            // They'll get rebuilt when requested
            this.#groupContent = null;
            this.#builtInContent = null;
        } else {
            // Update the list of shared content
            const cached = this.#sharedIndividualContent;
            const idx = cached.findIndex(obj => obj.identifier === sharedObject.identifier);
            if (idx != -1) {
                cached.splice(idx, 1);
            }
            cached.push(sharedObject);
            this.#sharedIndividualContent = cached;
        }
    }

    /*
     * Unsharing shared content
     */

    /**
     * @param {string} exportID
     * @returns {Object} a result object indicating success or failure
     */
    async unshareLook(exportID) {
        return this.unshareObject(exportID);
    }

    /**
     * @param {string} exportID
     * @returns {Object} a result object indicating success or failure
     */
    async unshareReaction(exportID) {
        return this.unshareObject(exportID);
    }

    /**
     * @param {string} exportID
     * @returns {Object} a result object indicating success or failure
     */
    async unshareObject(exportID) {
        try {
            await this.#endpoint.deleteExportedObject(exportID);

            // Remove the object from our local lists
            if (this.#sharedIndividualContent) {
                this.#sharedIndividualContent = this.#sharedIndividualContent.filter(obj => obj.identifier !== exportID);
            }
            if (this.#publishedContent) {
                this.#publishedContent = this.#publishedContent.filter(obj => obj.identifier !== exportID);
            }
            if (this.#groupContent) {
                this.#groupContent = this.#groupContent.filter(obj => obj.identifier !== exportID);
            }
            if (this.#builtInContent) {
                this.#builtInContent = this.#builtInContent.filter(obj => obj.identifier !== exportID);
            }

            return this.#newSuccessResult();
        } catch (e) {
            console.error("Error unsharing slide", e);
            return this.#newErrorResult("Error unsharing slide");
        }
    }

    /*
     * Importing shared content
     */

    /**
     * @param {string} exportID The SharedObject.identifier of the look to import
     * @returns {Object} a result object containing the cloudy records that were imported
     */
    async importLook(exportID) {
        return this.importSharedSlide(exportID, this.#looksPresentation.identifier);
    }

    /**
     * @param {string} exportID The SharedObject.identifier of the reaction to import
     * @returns {Object} a result object containing the cloudy records that were imported
     */
    async importReaction(exportID) {
        return this.importSharedSlide(exportID, this.#reactionsPresentation.identifier);
    }

    /**
     * Import a shared slide representing a look, name tag, or reaction.
     * @param {string} exportID The SharedObject.identifier of the content to import
     * @param {string} presentationID The presentation to import into
     * @param {?string} insertAfterSlideId The optional ID of the slide to insert after
     * @returns {Object} a result object containing the cloudy records that were imported
     */
    async importSharedSlide(exportID, presentationID, insertAfterSlideId=null) {
        try {
            // The API will return all of the Cloudy records that were imported
            // There should only be one slide; the other records should be media on that slide
            const records = await this.#endpoint.importExportedObject(exportID, presentationID, insertAfterSlideId);
            const record = records.find(record => record.collection == mmhmmAPI.CloudyCollectionTypes.ModernSlide);
            if (!record) {
                return this.#newErrorResult("No slide found in imported records");
            }

            // The import may have created new custom rooms, which we need to get into the store
            const rooms = records.filter(record => record.collection == mmhmmAPI.CloudyCollectionTypes.Room);
            if (rooms.length > 0) {
                this.#roomsStore.addCustomRoomsFromImport(rooms, this.#endpoint);
            }

            console.log("Imported slide", record.id);
            return this.#newSuccessResult(records);
        } catch (e) {
            console.error("Error importing shared slide", e);
            return this.#newErrorResult("Error importing shared slide");
        }
    }

    /**
     * @param {SharedObject} sharedObject
     * @returns {boolean} whether the slide has already been imported
     */
    hasImportedObject(sharedObject) {
        switch (sharedObject.type) {
            case LooksContentType.Look:
                return this.#hasImportedObject(sharedObject, this.#looksPresentation);
            case LooksContentType.Reaction:
                return this.#hasImportedObject(sharedObject, this.#reactionsPresentation);
            default:
                console.error("Unknown looks object type", sharedObject.type);
                return false;
        }
    }

    /**
     * @param {SharedObject} sharedObject
     * @param {Presentation.Modern} presentation
     * @returns {boolean} whether the slide has already been imported
     */
    #hasImportedObject(sharedObject, presentation) {
        // See if we have a slide that was previously imported from this shared object
        // OR if we have a slide that was the source of this export
        const slides = presentation.activeSlides;
        const match = slides.find(slide => {
            if (slide.identifier == sharedObject.originalDocumentId) {
                return true;
            }
            if (slide.exportDocumentId) {
                return slide.exportDocumentId == sharedObject.originalDocumentId;
            }
            return false;
        });
        return match != null;
    }

    /**
     * See if there is a SharedObject that was the source of a given slide - that is,
     * see if the slide was imported from a known SharedObject.
     * @param {Slide.Modern} slide
     * @returns {?SharedObject}
     */
    async findSourceSharedObjectForSlide(slide) {
        if (slide.exportDocumentId == null) {
            return null;
        }
        const publishedContent = await this.#getPublishedContent();
        return publishedContent.find(obj => slide.exportDocumentId == obj.originalDocumentId);
    }

    /* Helper functionality */

    async #getPublishedContent() {
        if (!this.#publishedContent) {
            // We fetch this once and store it locally - it's not important to refresh it
            // while the user has the catalog open. We can build refresh later if we need.
            try {
                let records = await this.#endpoint.listAvailablePublishedObjects();
                if (records == null) {
                    throw new Error("listAvailablePublishedObjects returned null");
                }
                records = records.map(record => new SharedObject(record, this));

                // Filter out items meant for a specific email domain
                this.#publishedContent = await this.#filterContent(records);
            } catch (err) {
                console.error("Error fetching published content", err);
            }
        }
        return this.#publishedContent || [];
    }

    /**
     * @returns {SharedObject[]} the shared content that is available via their membership
     * in a group.
     * @throws {Error} if there is an error fetching the group content
     */
    async #getGroupContent() {
        if (!this.#groupContent) {
            const content = await this.#getPublishedContent();

            // Published content includes both content published by us, and content published
            // to the user's group. Filter out that which is published by us.
            this.#groupContent = content.filter(share => this.isTeamContent(share));
        }
        return this.#groupContent || [];
    }

    async #getBuiltInContent() {
        if (!this.#builtInContent) {
            const content = await this.#getPublishedContent();

            // Published content includes both content published by us, and content published
            // to the user's group. Filter out that which is published to the user's group.
            this.#builtInContent = content.filter(share => !this.isTeamContent(share));
        }
        return this.#builtInContent || [];
    }

    async getExportedObjectMetadata(exportID) {
        try {
            const metadata = await this.#endpoint.getExportedObjectMetadata(exportID);
            return this.#newSuccessResult(metadata);
        } catch (e) {
            console.error("Error fetching metadata for shared object", e);
            return this.#newErrorResult("Error fetching metadata for shared object");
        }
    }

    isTeamContent(record) {
        // It's either tagged for a specific email domain, or it's for the user's group
        return record.isGlobalExport === false || this.isTaggedContent(record);
    }

    isTaggedContent(record) {
        return record.tags && record.tags.startsWith("@") && !record.tags.startsWith("@#");
    }

    /**
     * Filter out items meant for a specific email domain
     * TODO This should be done server-side in the future...
     */
    async #filterContent(records) {
        // Skip this for the special "publish to the catalog" account
        // and for employees
        if (this.#employee || this.canPublishBuiltInContent) {
            return records;
        }

        return records.filter(record => {
            const tag = record.tags;
            if (tag?.startsWith("@")) {
                if (this.#emailDomain != tag.substring(1)) {
                    return false;
                }
            }
            return true;
        });
    }

    #newErrorResult(message) {
        return {
            successful: false,
            status: "error",
            message
        };
    }

    #newSuccessResult(results) {
        return {
            successful: true,
            status: "success",
            results,
        };
    }

    /**
     * Sort an array of shares, newest first.
     * @param {[SharedObject]} objects to sort
     * @returns {[SharedObject]} sorted objects
     */
    #sortSharedObjects(objects) {
        return objects.sort((a, b) => {
            return b.created - a.created;
        });
    }
}

/**
 * Represents a shared object (presentation, look, reaction, name tag) that is available to the user.
 */
class SharedObject {
    #delegate;
    #identifier;
    #originalDocumentId;
    #created;
    #type;
    #title;
    #tags;
    #metadata;
    #isGlobalExport;
    #permissions;

    /**
     *
     * @param {Object} record the raw record returned by the API.
     * @param {LooksSharing} delegate the LooksSharing instance that created this object
     * @param {string} tagOverride TODO the API response to creation requests doesn't include the tag
     */
    constructor(record, delegate, tagOverride) {
        this.#delegate = delegate;
        this.#identifier = record.id;
        this.#originalDocumentId = record.originalDocumentID;
        this.#created = new Date(record.created);
        this.#type = record.type;
        this.#title = record.title;
        this.#tags = record.tags ?? tagOverride;
        this.#isGlobalExport = record.isGlobalExport === true;
        this.#permissions = record.userPermissions ?? {};
    }

    /**
     * @returns {string} the identifier of the shared object
     */
    get identifier() {
        return this.#identifier;
    }

    /**
     * @returns {string} the ID of the object that was shared to create this export
     */
    get originalDocumentId() {
        return this.#originalDocumentId;
    }

    /**
     * @returns {Date} the date the shared object was created
     */
    get created() {
        return this.#created;
    }

    /**
     * @returns {LooksContentType} the type of shared object
     */
    get type() {
        return this.#type;
    }

    /**
     * @returns {string} the title of the shared object
     */
    get title() {
        return this.#title;
    }

    /**
     * @returns {boolean} whether the shared object is a global export - that is,
     * an object published by us to the catalog and available to all users
     */
    get isGlobalExport() {
        return this.#isGlobalExport === true;
    }

    /**
     * @returns {string} the tags associated with the shared object
     */
    get tags() {
        return this.#tags;
    }

    /**
     * @returns {boolean} whether the shared object should be hidden when
     * showing the catalog view
     */
    get isHidden() {
        const tags = this.tags;
        return tags != null && tags == "#hidden";
    }

    /**
     * @returns {string} the URL to share the object
     */
    get shareUrl() {
        return mmhmmAPI.defaultEndpoint().urlBuilder.getSlideShareURL(this.#identifier);
    }

    /**
     * @returns {boolean} whether the shared object has already been imported into
     * the user's account
     */
    get isAlreadyImported() {
        return this.#delegate.hasImportedObject(this);
    }

    /**
     * @returns {boolean} whether the user can delete the shared object
     */
    get canDelete() {
        return this.#permissions.canDelete === true;
    }

    async #getMetadata() {
        if (!this.#metadata) {
            const result = await this.#delegate.getExportedObjectMetadata(this.identifier);
            if (result.successful) {
                this.#metadata = result.results;
            }
        }
        return this.#metadata;
    }

    async getThumbnailURL() {
        const metadata = await this.#getMetadata();
        const urls = metadata?.thumbnailUrls;
        if (urls) {
            // TODO wire this into our centralized caching system
            return urls[0];
        }
        return ThumbnailStorage.AssetMissing;
    }
}
