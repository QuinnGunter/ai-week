//
//  sidebar/looks_pane/catalog_store.js
//  mmhmm
//
//  Created by Seth Hitchings on 3/11/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//
//

class LooksCatalogStore {
    static GroupAll = "builtin";

    #sharing;

    constructor(sharing) {
        this.#sharing = sharing;
    }

    isInGroup() {
        return this.#sharing.isInGroup;
    }

    getGroupName() {
        return this.#sharing.groupName;
    }

    listGroups() {
        const groups = [
            {
                id: LooksCatalogStore.GroupAll,
                name: LocalizedString("All")
            }
        ];

        if (this.#sharing.isInGroup) {
            groups.push({
                id: this.#sharing.groupId,
                name: this.#sharing.groupName
            });
        }

        return groups;
    }

    /**
     * @param {string} exportID The SharedObject.identifier of the reaction to import
     * @returns {Object} a result object containing the ID of the imported reaction slide
     */
    async importReaction(id) {
        return this.#sharing.importReaction(id);
    }

    /**
     * @param {string} id The SharedObject.identifier of the look to import
     * @returns {Object} a result object containing the ID of the imported look slide
     */
    async importLook(id) {
        return this.#sharing.importLook(id);
    }

    /**
     * @param {LooksContentType} type
     * @param {string=} groupId
     */
    async listContent(type, groupId) {
        if (!groupId) {
            return this.#listAllContent(type);
        } else if (groupId == LooksCatalogStore.GroupAll) {
            return this.listBuiltInContent(type);
        } else if (groupId == this.#sharing.groupId) {
            return this.listGroupContent(type);
        } else {
            return this.#newErrorResult("Invalid group ID");
        }
    }

    async #listAllContent(type) {
        // Get both built-in and team content, de-dupe the lists, and return them
        const builtIn = await this.listBuiltInContent(type);
        const shared = await this.listGroupContent(type);
        if (builtIn.successful && shared.successful) {
            // Deduplication shouldn't be necessary, but we had a bug on the service once, so let's just do it
            return this.#newSuccessResult(this.#deduplicate([
                ...shared.results,
                ...builtIn.results,
            ]));
        }
        return this.#newErrorResult(builtIn.message ?? shared.message);
    }

    async listBuiltInContent(type) {
        return this.#sharing.listBuiltinContent(type);
    }

    async listGroupContent(type) {
        return this.#sharing.listGroupContent(type);
    }

    async unpublishItem(id) {
        return this.#sharing.unshareObject(id);
    }

    /**
     * @param {[SharedObject]} data
     */
    #deduplicate(data) {
        const deduped = [];
        const ids = [];
        data.forEach((item) => {
            if (!ids.includes(item.identifier)) {
                ids.push(item.identifier);
                deduped.push(item);
            }
        });
        return deduped;
    }

    #newSuccessResult(results) {
        return {
            successful: true,
            status: "success",
            results
        };
    }

    #newErrorResult(message) {
        return {
            successful: false,
            status: "error",
            message: message
        };
    }
}
