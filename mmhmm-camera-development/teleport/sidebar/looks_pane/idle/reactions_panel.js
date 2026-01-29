//
//  sidebar/looks_pane/idle/reactions_panel.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/21/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * The UI for the user's list of reactions, shown as the primary
 * content of the idle panel.
 */
class ReactionsPanel {

    #cls = {
        loading: "loading",
        loader: "loader",
        loaderContainer: "loader-container",

        itemTitle: "looks-item__title",
        floatButton: "float-button",
        pinButton: "pin-button",
        contextMenuButton: "context-menu-button",
        overlayButton: "overlay-button",

        focused: "focused",
        emojiGrid: "emoji-grid",
        helpCard: "help-card",
    };

    #dataAttr = {
        header: "header",
        panels: "tab-panels",
        layoutSelector: "layout-selector",
        visibilitySearch: "search",
        visibilitySearchHidden: "search-hidden",
        reactionsList: "reactions-list",
        noSearchResults: "no-search-results",
        giphyAttribution: "giphy-attribution",
        helpCard: "help-card",
        speechSuggestions: "speech-suggestions",
    };

    #attr = {
        reactionSearch: "reaction-search",
    };

    #actions = {
        close: "cancel-reaction-search",
        selectItem: "select-item",
        pinItem: "pin-item",
        unpinItem: "unpin-item",
        showContextMenu: "show-context-menu",
        showLayoutSelector: "show-reaction-style-selector",
        selectSearchCategory: "select-search-category",
        closeHelpCard: "close-help-card",
        selectSpeechSuggestion: "select-speech-suggestion",
        dismissSpeechSuggestions: "dismiss-speech-suggestions",
        selectGifSuggestion: "select-gif-suggestion",
    };

    #dataTypes = {
        reaction: "reaction",
        textReaction: "text-reaction",
        emojiReaction: "emoji-reaction",
        thumbnail: "thumbnail",
        giphy: "giphy",
        catalogItem: "catalog"
    };

    #searchCategories = {
        all: "all",
        media: "media",
        text: "text",
        emoji: "emoji"
    };

    #defaultKeyDismissedHelpCard = "dismissedVisualsHelpCard";

    /**
     * @type {HTMLDivElement} The root DOM element for this panel
     */
    #container;

    /**
     * @type {Promise<void>|null}
     */
    #reactionsChangedPromise = null;

    /**
     * @type {Array<Slide.Modern>} The user's list of reactions.
     */
    #reactions = [];

    /**
     * @type {Boolean}
     */
    #isFirstUse = false;

    #debouncedSearch = null;
    #searchHelper = null;
    #cachedGiphyResults = null;

    #selectedReactionId = null;
    #reactionsDragDropHandler = null;
    #defaultReactionAnchor = null;

    // Event handler references for cleanup
    #clickHandler = null;
    #keydownHandler = null;
    #focusinHandler = null;

    constructor(isFirstUse) {
        this.#isFirstUse = isFirstUse;
        this.#container = this.#createContainer();
        this.#render();
        this.#addEventListeners();

        this.#searchHelper = new ReactionsSearch();
        this.#debouncedSearch = debounce(this.#searchTextChanged, 300);
    }

    get el() {
        return this.#container;
    }

    /**
     * Clean up all resources to prevent memory leaks.
     * Call this before discarding the ReactionsPanel instance.
     */
    destroy() {
        // Cancel debounced search timer
        this.#debouncedSearch?.cancel?.();

        // Remove event listeners
        this.#removeEventListeners();

        // Destroy tippy instances
        this.#container.querySelectorAll("[data-tippy-content]").forEach(el => {
            el._tippy?.destroy();
        });

        // Clear callbacks to break reference chains
        this.#speechSuggestionCallback = null;
        this.#gifSuggestionCallback = null;

        // Cleanup search helper
        this.#searchHelper?.destroy?.();
        this.#searchHelper = null;

        // Clear cached data
        this.#cachedGiphyResults = null;
        this.#reactions = [];

        // Cleanup drag-drop handler
        this.#reactionsDragDropHandler?.disable();
        this.#reactionsDragDropHandler = null;

        // Clear handler references
        this.#clickHandler = null;
        this.#keydownHandler = null;
        this.#focusinHandler = null;
    }

    /* Public API */

    setSharing(sharing) {
        this.#searchHelper.setCatalog(new LooksCatalogStore(sharing));
    }

    async reactionsChanged(slides) {
        // Make sure we serialize multiple requests to rerender the list
        if (this.#reactionsChangedPromise != null) {
            await this.#reactionsChangedPromise;
        }

        slides = this.#filterReactions(slides);
        this.#reactions = LooksUtils.sortSlidesList(slides);

        if (this.#isInSearchMode()) {
            this.#searchTextChanged();
            return;
        }

        this.#reactionsChangedPromise = this.#showMyReactions();
        this.#searchHelper.setMyReactions(slides);
        await this.#reactionsChangedPromise;
        this.#reactionsChangedPromise = null;
    }

    selectReaction(id) {
        this.#selectedReactionId = id;
        this.#selectItem(id);
    }

    unselectReaction() {
        this.#selectedReactionId = null;
        this.#clearSelection();
    }

    updateReactionThumbnail(slide) {
        this.#updateReactionThumbnail(slide);
    }

    updateTitle(slide) {
        this.#updateItemTitle(slide);
    }

    updateDefaultReactionLayout(icon, anchor) {
        this.#updateLayoutSelectorButton(icon);

        if (anchor != this.#defaultReactionAnchor) {
            this.#defaultReactionAnchor = anchor;

            // Recreate the search results to use the new anchor
            // This only affects the tail on speech bubbles, but it's a nice touch
            if (this.#isInSearchMode()) {
                this.#searchTextChanged();
            }
        }
    }

    focusSearchInput() {
        this.#getSearchInput().focus();
    }

    blurSearchInput() {
        this.#getSearchInput().blur();
    }

    clearSearch() {
        const input = this.#getSearchInput();
        input.value = "";
        if (this.#isInSearchMode()) {
            this.#exitSearchMode();
            this.#hideGIPHYAttribution();
            this.#hideHelpCard();
            this.#showMyReactions();
            this.blurSearchInput();
        }
    }

    setSearchQuery(text) {
        const input = this.#getSearchInput();
        input.value = text;
        this.#searchTextChanged();
        this.focusSearchInput();
    }

    cachedSearchResultForId(id) {
        return this.#cachedGiphyResults?.find((item) => item.identifier === id);
    }

    /* Speech Suggestions API */

    /**
     * Show speech-triggered reaction suggestions
     * @param {ReactionSuggestion[]} suggestions - Array of suggestions from ReactionMatcher
     * @param {Object[]} gifSuggestions - Array of GIPHY items
     * @param {boolean} gifsLoading - Whether GIFs are still loading
     */
    showSpeechSuggestions(suggestions, gifSuggestions = [], gifsLoading = false) {
        if (!suggestions || suggestions.length === 0) {
            this.clearSpeechSuggestions();
            return;
        }

        const container = this.#getSpeechSuggestionsContainer();
        if (!container) return;

        // Render emoji suggestions
        const suggestionsGrid = container.querySelector("[data-suggestions-grid]");
        if (suggestionsGrid) {
            suggestionsGrid.innerHTML = suggestions.map(suggestion =>
                this.#renderSpeechSuggestionItem(suggestion)
            ).join("");
        }

        // Render GIF section
        const gifSection = container.querySelector("[data-gif-suggestions]");
        if (gifSection) {
            if (gifsLoading) {
                // Show loading state
                gifSection.innerHTML = this.#renderGifLoadingState();
                gifSection.classList.remove("hidden");
            } else if (gifSuggestions.length > 0) {
                // Show GIF suggestions
                gifSection.innerHTML = this.#renderGifSuggestions(gifSuggestions);
                gifSection.classList.remove("hidden");
            } else {
                // Hide GIF section if no GIFs
                gifSection.classList.add("hidden");
                gifSection.innerHTML = "";
            }
        }

        // Show the container with animation
        container.classList.remove("hidden");
        container.classList.add("speech-suggestions-visible");

        // Auto-scroll to show suggestions
        container.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    /**
     * Clear speech suggestions from the panel
     */
    clearSpeechSuggestions() {
        const container = this.#getSpeechSuggestionsContainer();
        if (container) {
            container.classList.add("hidden");
            container.classList.remove("speech-suggestions-visible");

            const suggestionsGrid = container.querySelector("[data-suggestions-grid]");
            if (suggestionsGrid) {
                suggestionsGrid.innerHTML = "";
            }

            const gifSection = container.querySelector("[data-gif-suggestions]");
            if (gifSection) {
                gifSection.classList.add("hidden");
                gifSection.innerHTML = "";
            }
        }
    }

    /**
     * Set callback for when a speech suggestion is selected
     * @param {Function} callback - Called with (suggestion) when user clicks a suggestion
     */
    setSpeechSuggestionCallback(callback) {
        this.#speechSuggestionCallback = callback;
    }

    /**
     * Set callback for when a GIF suggestion is selected
     * @param {Function} callback - Called with (gifData) when user clicks a GIF
     */
    setGifSuggestionCallback(callback) {
        this.#gifSuggestionCallback = callback;
    }

    #speechSuggestionCallback = null;
    #gifSuggestionCallback = null;

    #getSpeechSuggestionsContainer() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.speechSuggestions}"]`);
    }

    #renderSpeechSuggestionItem(suggestion) {
        const emoji = suggestion.emoji || "";
        const text = suggestion.text || suggestion.keyword || "";
        const displayText = emoji || text;

        return `
            <button
                class="speech-suggestion-item"
                data-action="${this.#actions.selectSpeechSuggestion}"
                data-keyword="${suggestion.keyword}"
                data-emoji="${suggestion.emoji || ''}"
                data-text="${suggestion.text || ''}"
                data-style="${suggestion.style || ''}"
                title="${suggestion.keyword}">
                <span class="speech-suggestion-content">${displayText}</span>
            </button>
        `;
    }

    #onSpeechSuggestionSelected(dataset) {
        const suggestion = {
            keyword: dataset.keyword,
            emoji: dataset.emoji || null,
            text: dataset.text || null,
            style: dataset.style || null,
        };

        if (this.#speechSuggestionCallback) {
            this.#speechSuggestionCallback(suggestion);
        }

        // Keep suggestions tray visible after selection so user can select again
    }

    #onDismissSpeechSuggestions() {
        this.clearSpeechSuggestions();
    }

    #onGifSuggestionSelected(dataset) {
        const gifData = {
            giphyId: dataset.giphyId,
        };

        if (this.#gifSuggestionCallback) {
            this.#gifSuggestionCallback(gifData);
        }

        // Keep suggestions visible after selection
    }

    #renderGifSuggestions(gifSuggestions) {
        return `
            <div class="gif-suggestions-grid">
                ${gifSuggestions.map(gif => this.#renderGifSuggestionItem(gif)).join("")}
            </div>
        `;
    }

    #renderGifSuggestionItem(gif) {
        // Use fixed_height_small for thumbnails (fast loading)
        const thumbnailUrl = gif.images?.fixed_height_small?.webp
            || gif.images?.fixed_height_small?.url
            || gif.images?.fixed_height?.webp
            || gif.images?.fixed_height?.url
            || "";

        return `
            <button
                class="gif-suggestion-item"
                data-action="${this.#actions.selectGifSuggestion}"
                data-giphy-id="${gif.id}"
                title="${gif.title || 'GIF'}">
                <img
                    src="${thumbnailUrl}"
                    alt="${gif.title || 'GIF'}"
                    loading="lazy"
                    draggable="false"
                />
            </button>
        `;
    }

    #renderGifLoadingState() {
        return `
            <div class="gif-loading-container">
                <span class="gif-loading-spinner"></span>
                <span class="gif-loading-text">${LocalizedString("Loading GIFs...")}</span>
            </div>
        `;
    }

    /* Event handling */

    #addEventListeners() {
        const handlers = {
            [this.#actions.selectSearchCategory]: ({category}) => this.#onSearchCategorySelected(category),
            [this.#actions.closeHelpCard]: () => this.#onCloseHelpCard(),
            [this.#actions.selectSpeechSuggestion]: (dataset) => this.#onSpeechSuggestionSelected(dataset),
            [this.#actions.dismissSpeechSuggestions]: () => this.#onDismissSpeechSuggestions(),
            [this.#actions.selectGifSuggestion]: (dataset) => this.#onGifSuggestionSelected(dataset),
        };

        const input = this.#getSearchInput();

        // Store handler references for cleanup
        this.#clickHandler = this.#createClickHandler(handlers);
        this.#keydownHandler = (evt) => this.#onKeyDown(input, evt);
        this.#focusinHandler = () => this.#onSearchInputFocused();

        this.#container.addEventListener("click", this.#clickHandler);
        this.#container.addEventListener("input", this.#handleOnInputChange);
        this.#container.addEventListener("keydown", this.#keydownHandler);
        input.addEventListener("focusin", this.#focusinHandler);
    }

    #removeEventListeners() {
        this.#container.removeEventListener("click", this.#clickHandler);
        this.#container.removeEventListener("input", this.#handleOnInputChange);
        this.#container.removeEventListener("keydown", this.#keydownHandler);

        const input = this.#getSearchInput();
        input?.removeEventListener("focusin", this.#focusinHandler);
    }

    #onCloseHelpCard() {
        const helpCard = this.#getHelpCard();
        helpCard.remove();

        SharedUserDefaults.setValueForKey(true, this.#defaultKeyDismissedHelpCard);
    }

    #hasDismissedHelpCard() {
        return SharedUserDefaults.getValueForKey(this.#defaultKeyDismissedHelpCard, false) === true;
    }

    #onSearchInputFocused() {
        if (!this.#isInSearchMode()) {
            this.#enterSearchMode();
            this.#showHelpCard();
            this.#searchTextChanged();
        }
    }

    #isInSearchMode() {
        const searchInput = this.#getSearchInput();
        return searchInput.classList.contains(this.#cls.focused);
    }

    #enterSearchMode() {
        const searchInput = this.#getSearchInput();
        searchInput.classList.add(this.#cls.focused);

        searchInput.placeholder = "";
    }

    #exitSearchMode() {
        const searchInput = this.#getSearchInput();
        searchInput.classList.remove(this.#cls.focused);

        searchInput.placeholder = LocalizedString("Type / to search");

        this.#setEmojiGrid(false);
        this.#hideNoSearchResults();
    }

    #onKeyDown(searchInput, evt) {
        const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

        // In a search input, typing escape when the value is non-empty
        // clears the value. That happens automatically. If the value is empty,
        // we want to blur the input to exit search mode.
        if (evt.key === "Escape") {
            const focusedElement = document.activeElement;
            if (searchInput == focusedElement && searchInput.value == "") {
                this.clearSearch();
                evt.stopPropagation();
            }
        } else if (arrowKeys.includes(evt.key)) {
            if (this.#handleArrowKeyEvent(evt)) {
                evt.preventDefault();
            }
        }
    }

    #handleOnInputChange = async (ev) => {
        ev.stopPropagation();
        const { name } = ev.target;

        if (name === this.#attr.reactionSearch) {
            this.#debouncedSearch();
        }
    };

    #createClickHandler(handlers) {
        return (ev) => {
            const item = ev.target.closest("[data-action]");
            if (!item) {
                return;
            }

            const action = item.dataset.action;
            const handler = handlers[action];

            if (handler) {
                ev.stopPropagation();
                handler(item.dataset, ev);
            } else if (action === this.#actions.selectItem) {
                // Prevent double-clicks from registering as two single clicks
                if (!item.disabled) {
                    item.disabled = true;
                    setTimeout(() => {
                        item.disabled = false;
                    }, 400);
                }
            }
        };
    }

    #handleArrowKeyEvent(evt) {
        // Ignore the event if any modifier keys are held
        if (evt.altKey || evt.metaKey || evt.ctrlKey || evt.shiftKey) {
            return false;
        }

        // Ignore the event if the user is using right/left in the search input
        const searchInput = this.#getSearchInput();
        if (document.activeElement == searchInput && (evt.key != "ArrowDown")) {
            return false;
        }

        const list = this.#getReactionsList();
        const items = Array.from(list.querySelectorAll(`[data-action="${this.#actions.selectItem}"]`));
        if (items.length == 0) {
            return false;
        }

        const style = window.getComputedStyle(list);
        const columnCount = style.getPropertyValue("grid-template-columns").split(" ").length;

        let delta = 0;
        switch (evt.key) {
            case "ArrowUp":
                delta = -columnCount
                break;
            case "ArrowDown":
                delta = columnCount;
                break;
            case "ArrowLeft":
                delta = -1;
                break;
            case "ArrowRight":
                delta = 1;
                break;
        }

        const activeElement = document.activeElement;
        const current = items.findIndex((item) => activeElement == item);

        if (current == -1) {
            // Select the first item
            items[0].focus();
            return true;
        }

        const newIndex = current + delta;
        if (newIndex < 0) {
            this.#getSearchInput().focus();
        } else if (newIndex >= 0 && newIndex < items.length) {
            items[newIndex].focus();
        }

        return true;
    }

    /* Drag and drop */

    setReactionsDragDropCallback(callback) {
        if (this.#reactionsDragDropHandler) {
            this.#reactionsDragDropHandler.disable();
        }
        const target = this.#container;
        const label = LocalizedString("Add a new visual");
        this.#reactionsDragDropHandler = new LooksDragDropHandler(target, callback, label);
    }

    addDragAndDropHandlers() {
        this.#reactionsDragDropHandler.enable();
    }

    removeDragAndDropHandlers() {
        this.#reactionsDragDropHandler?.disable();
    }

    /* Search */

    #getSearchQuery() {
        return this.#getSearchInput().value.trim();
    }

    #searchTextChanged() {
        const query = this.#getSearchQuery();
        const category = this.#getSelectedSearchCategory();
        this.#showSearchResults(query, category);
    }

    #onSearchCategorySelected(category) {
        const currentCategory = this.#getSelectedSearchCategory();
        if (category === currentCategory) {
            return;
        }

        this.#updateSelectedSearchCategory(category);
        this.#setEmojiGrid(category == this.#searchCategories.emoji);

        const query = this.#getSearchQuery();
        this.#showSearchResults(query, category);
    }

    #setEmojiGrid(enabled) {
        const list = this.#getReactionsList();
        if (enabled) {
            list.classList.add(this.#cls.emojiGrid);
        } else {
            list.classList.remove(this.#cls.emojiGrid);
        }
    }

    #showSearchResults(query, category) {
        this.#hideNoSearchResults();
        this.#hideGIPHYAttribution();
        this.#hideHelpCard();

        switch (category) {
            case this.#searchCategories.media:
                this.#showMediaSearchResults(query);
                break;
            case this.#searchCategories.text:
                this.#showTextSearchResults(query);
                break;
            case this.#searchCategories.emoji:
                this.#showEmojiSearchResults(query);
                break;
            default:
                this.#showGeneralSearchResults(query);
                break;
        }
    }

    #showGeneralSearchResults(query) {
        this.#searchHelper.cancelGIPHYSearch();
        this.#cachedGiphyResults = null;

        // An empty query simply filters the user's reactions by category
        if (query == "") {
            this.#showHelpCard();
            this.#showMyReactions();
            this.#selectItem(this.#selectedReactionId);
            return;
        }

        // These all happen locally, without requiring network requests,
        // so render them immediately
        this.#clearSearchResults();
        this.#showGIPHYAttribution();

        const myReactions = this.#searchHelper.searchMyReactions(query);
        const textReactions = this.#searchHelper.suggestedTextReactions(query, myReactions, this.#defaultReactionAnchor);
        const emojiReactions = this.#searchHelper.suggestedEmojiReactions(query, myReactions);

        this.#appendSearchResults(emojiReactions, this.#dataTypes.emojiReaction);
        this.#appendSearchResults(textReactions, this.#dataTypes.textReaction);
        this.#appendSearchResults(myReactions, this.#dataTypes.reaction);

        // If the currently selected item in the search results, show it as selected
        this.#selectItem(this.#selectedReactionId);

        // Then search our catalog...
        const catalogReactions = this.#searchHelper.searchCatalog(query);
        this.#appendSearchResults(catalogReactions, this.#dataTypes.catalogItem);

        // Then start the GIPHY search and add to the results
        this.#searchHelper.searchGIPHY(query).then((results) => {
            this.#appendSearchResults(results, this.#dataTypes.giphy);
            this.#cachedGiphyResults = results;
        }).catch((err) => {
            console.error("Error searching GIPHY", err);
        });
    }

    #showMediaSearchResults(query) {
        this.#searchHelper.cancelGIPHYSearch();
        this.#cachedGiphyResults = null;

        this.#clearSearchResults();

        // Find all matching reactions already in the user's account,
        // omitting those that are text/emoji reactions
        let myReactions = this.#searchMyReactions(query);
        myReactions = this.#searchHelper.removeTextAndEmojiReactions(myReactions);
        this.#appendSearchResults(myReactions, this.#dataTypes.reaction);

        // If the currently selected item in the search results, show it as selected
        this.#selectItem(this.#selectedReactionId);

        // An empty query simply filters the user's reactions by category
        if (query == "") {
            return;
        }

        this.#showGIPHYAttribution();

        // Then search our catalog...
        const catalogReactions = this.#searchHelper.searchCatalog(query);
        this.#appendSearchResults(catalogReactions, this.#dataTypes.catalogItem);

        // Then start the GIPHY search and add to the results
        this.#searchHelper.searchGIPHY(query).then((results) => {
            this.#appendSearchResults(results, this.#dataTypes.giphy);
            this.#cachedGiphyResults = results;

            if (myReactions.length == 0 && results.length == 0) {
                this.#showNoSearchResults(this.#searchCategories.media);
            }
        }).catch((err) => {
            console.error("Error searching GIPHY", err);
        });
    }

    #showTextSearchResults(query) {
        // These all happen locally, without requiring network requests,
        // so render them immediately
        this.#clearSearchResults();

        // Find all matching text reactions already in the user's account,
        // then suggest other text styles
        let myReactions = this.#searchMyReactions(query);
        myReactions = this.#searchHelper.onlyTextReactions(myReactions);
        this.#appendSearchResults(myReactions, this.#dataTypes.reaction);

        let suggestedTextReactions = [];
        if (query != "") {
            suggestedTextReactions = this.#searchHelper.suggestedTextReactions(query, myReactions, this.#defaultReactionAnchor, 12);
        } else if (myReactions.length == 0) {
            // Suggest some text reactions if the user has none and hasn't typed query
            suggestedTextReactions = this.#getSuggestedTextReactions(this.#defaultReactionAnchor);
        }

        if (suggestedTextReactions.length > 0) {
            this.#appendSearchResults(suggestedTextReactions, this.#dataTypes.textReaction);
        }

        // If the currently selected item in the search results, show it as selected
        this.#selectItem(this.#selectedReactionId);
    }

    #showEmojiSearchResults(query) {
        // These all happen locally, without requiring network requests,
        // so render them immediately
        this.#clearSearchResults();


        let results = null;
        let type = null;

        if (query == "") {
            // No query, so just filter my existing emoji reactions
            // TODO do something if the result set is empty - curated list of suggestions
            const myReactions = this.#searchMyReactions(query);
            results = this.#searchHelper.onlyEmojiReactions(myReactions);
            if (results.length > 0) {
                type = this.#dataTypes.reaction;
            } else {
                // TODO maybe add these to the results above so they don't go away?
                results = this.#getSuggestedEmojiReactions();
                type = this.#dataTypes.emojiReaction;
            }
        } else {
            // Suggest new emoji reactions based on the query
            results = this.#searchHelper.suggestedEmojiReactions(query, [], 72);
            type = this.#dataTypes.emojiReaction;
        }

        if (results.length == 0) {
            this.#showNoSearchResults(this.#searchCategories.emoji);
            return;
        }

        this.#appendSearchResults(results, type);

        // If the currently selected item in the search results, show it as selected
        this.#selectItem(this.#selectedReactionId);
    }

    #showNoSearchResults(category) {
        this.#hideNoSearchResults();

        const list = this.#getReactionsList();
        const container = list.parentElement;
        container.appendChild(this.#renderNoSearchResults(category));
    }

    #hideNoSearchResults() {
        const list = this.#getReactionsList();
        const container = list.parentElement;
        const element = container.querySelector(`[data-id="${this.#dataAttr.noSearchResults}"]`);
        element?.remove();
    }

    async #showMyReactions() {
        // Replace the contents of our list with the user's reaction slides
        const slides = this.#reactions;
        const oldList = this.#getReactionsList();

        const newList = document.createElement("ul");
        newList.dataset.list = "";
        newList.className = oldList.className;
        newList.classList.remove(this.#cls.emojiGrid);

        newList.innerHTML = slides
            .map((item) => this.#renderThumbnailItem(item, this.#dataTypes.reaction))
            .join("");

        await this.#renderThumbnailImages(this.#dataTypes.reaction, slides, newList);

        oldList.replaceWith(newList);
        this.#removeLoadingSpinner(newList.closest(`.${this.#cls.loading}`));

        // user has removed the last slide
        if (slides.length === 0) {
            // this.#onLastSlideRemoved(dataType);
            return;
        }

        // Re-apply the selection state if we still have slides
        const selected = this.#selectedReactionId;
        if (selected && slides.some((s) => s.identifier === selected)) {
            this.#selectItem(selected);
        }
    }

    #getSuggestedTextReactions(anchor) {
        const suggestions = [
            {
                text: LocalizedString("Agreed!"),
                style: TextReaction.styleWithID("classic-speech"),
            },
            {
                text: LocalizedString("Yes!"),
                style: TextReaction.styleWithID("cutout-fire"),
            },
            {
                text: LocalizedString("Nope"),
                style: TextReaction.styleWithID("classic-thought")
            },
            {
                text: LocalizedString("Wow!"),
                style: TextReaction.styleWithID("funky-angry"),
            }
        ];
        return suggestions.map((suggestion) =>
            this.#searchHelper.textSearchResult(suggestion.text, suggestion.style, anchor));
    }

    #getSuggestedEmojiReactions() {
        const emoji = [
            { emoji: "😀", label: "grinning face" },
            { emoji: "😂", label: "face with tears of joy" },
            { emoji: "❤️", label: "red heart" },
            { emoji: "🎉", label: "party popper" },
            { emoji: "👏", label: "clapping hands" },
            { emoji: "✋️", label: "raised hand" },
            { emoji: "👍️", label: "thumbs up" },
            { emoji: "👎️", label: "thumbs down" },
        ];
        return emoji.map((e) => this.#searchHelper.emojiSearchResult(e.emoji, e.label));
    }

    /* Data helpers */

    #slideHasTextMedia(slide) {
        if (!slide || !slide.objects) {
            return false;
        }
        for (const obj of slide.objects) {
            if (IsKindOf(obj, Media.Text) || IsKindOf(obj, Media.NameBadge)) {
                return true;
            }
        }
        return false;
    }

    #itemIsPinned(slide) {
        return slide?.metadata?.pinned != null;
    }

    #filterReactions(slides) {
        // Filter out slides that have no media - these are likely
        // broken slides for which we failed to upload the media,
        // and there's no reason to show them in the grid.
        let filtered = slides.filter((slide) => {
            if (slide.objects.length === 0) {
                // In the longer term we should probably delete these slides
                console.log("Reaction slide has no media", slide);
                return false;
            }
            return true;
        });

        // Filter out built-in away screens, which are a type of reaction
        return filtered.filter((reaction) => {
            return reaction.type != LooksContentType.AwayScreen;
        });
    }

    #searchMyReactions(query) {
        if (query == "") {
            return this.#searchHelper.resultsForMyReactions(this.#reactions);
        } else {
            return this.#searchHelper.searchMyReactions(query);
        }
    }

    async #thumbnailForItem(slide, dataType) {
        if (dataType == this.#dataTypes.reaction) {
            const thumb = await this.#thumbnailForReaction(slide);
            thumb.dataset.type = this.#dataTypes.reaction;
            return thumb;
        }
        return slide.thumbnail();
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
        const thumbnail = await ThumbnailStorage.shared.get(media);
        if (IsKindOf(thumbnail, Blob)) {
            return await ThumbnailStorage.shared._imageFromBlob(thumbnail);
        } else if (IsKindOf(thumbnail, HTMLImageElement)) {
            return thumbnail;
        }
    }

    /* UI accessors */

    #getReactionsList() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.reactionsList}"] [data-list]`);
    }

    /**
     * @param {String} id
     * @returns {HTMLButtonElement} the button element for the item with the given id
     */
    #getItem(id) {
        return this.#container.querySelector(`[data-action="${this.#actions.selectItem}"][data-id="${id}"]`);
    }

    /**
     * @returns {HTMLButtonElement|null} the button element for the currently selected grid item
     */
    #getSelectedItem() {
        const list = this.#getReactionsList();
        return list.querySelector(`button[aria-selected="true"]`);
    }

    /**
     * @returns {HTMLInputElement} the search input element for reactions
     */
    #getSearchInput() {
        return this.#container.querySelector(`[name="${this.#attr.reactionSearch}"]`);
    }

    /**
     * @returns {HTMLButtonElement} the layout selector button
     */
    #getLayoutSelectorButton() {
        return this.#container.querySelector(`[data-action="${this.#actions.showLayoutSelector}"]`);
    }

    /**
     * @returns {HTMLButtonElement} the currently selected search category button
     */
    #getSelectedSearchCategory() {
        const button = this.#container.querySelector(`[data-action="${this.#actions.selectSearchCategory}"][aria-selected="true"]`);
        return button ? button.dataset.category : this.#searchCategories.all;
    }

    #getGIPHYAttribution() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.giphyAttribution}"]`);
    }

    #getHelpCard() {
        return this.#container.querySelector(`[data-id="${this.#dataAttr.helpCard}"]`);
    }

    /* UI updates */

    async #updateReactionThumbnail(slide) {
        const button = this.#container.querySelector(`button[data-id="${slide.identifier}"]`);
        if (!button) {
            return;
        }

        const li = button.closest("li");
        const dataType = button.dataset.type;

        try {
            const newImg = await this.#thumbnailForItem(slide, dataType);
            newImg.draggable = false;

            const oldImg = li.querySelector(`.${GridCard.cls.thumbnail} img`);
            if (oldImg) {
                oldImg.parentElement?.replaceChild(newImg, oldImg);
            } else {
                li.querySelector(`.${GridCard.cls.thumbnail}`).appendChild(newImg);
            }
        } catch (err) {
            console.error("Error thumbnailing item", err);
        }
    }

    #updateItemTitle(slide) {
        const item = this.#getItem(slide.identifier);
        const li = item?.closest("li");
        if (!li) {
            return;
        }

        const titleEl = li.querySelector(`.${this.#cls.itemTitle}`);
        if (titleEl) {
            titleEl.innerText = slide.title || String.fromCharCode(160);
        }
    }

    #updateLayoutSelectorButton(icon) {
        const button = this.#getLayoutSelectorButton();
        const iconEl = button.querySelector("svg");
        iconEl.replaceWith(icon);
    }

    #updateSelectedSearchCategory(category) {
        const buttons = this.#container.querySelectorAll(`[data-action="${this.#actions.selectSearchCategory}"]`);
        buttons.forEach((button) => {
            if (button.dataset.category === category) {
                button.setAttribute("aria-selected", "true");
            } else {
                button.removeAttribute("aria-selected");
            }
        });
    }

    #showGIPHYAttribution() {
        const attribution = this.#getGIPHYAttribution();
        attribution.classList.remove("hidden");
    }

    #hideGIPHYAttribution() {
        const attribution = this.#getGIPHYAttribution();
        attribution.classList.add("hidden");
    }

    #showHelpCard() {
        const helpCard = this.#getHelpCard();
        helpCard?.classList.remove("hidden");
    }

    #hideHelpCard() {
        const helpCard = this.#getHelpCard();
        helpCard?.classList.add("hidden");
    }

    /* UI construction */

    #createContainer() {
        const container = document.createElement("div");
        container.dataset.id = this.#dataAttr.panels;
        container.classList.add("flex", "flex-col", "p5", "h-full", "bg-secondary");
        return container;
    }

    #render() {
        const container = this.#container;
        container.innerHTML = `
            <div data-visibility="${this.#dataAttr.visibilitySearch}" data-id="${this.#dataAttr.header}"
                class="flex justify-between items-center pb-4 text-content-primary body4">
                ${LocalizedString("New visual")}
                ${this.#renderCloseButton()}
            </div>
            ${this.#renderSearchBar()}
            ${this.#renderSearchCategories()}
            ${this.#renderReactionsList()}
        `;
        tippy(container.querySelectorAll("[data-tippy-content]"));
        this.#addLoadingSpinner(container);
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

    #renderSearchBar() {
        return `
            <div class="flex gap-4 items-center">
                <div class="search w-full pb-1">
                    <input
                        aria-label="${LocalizedString("Search visuals")}"
                        placeholder="${LocalizedString("Type / to search visuals")}"
                        name="${this.#attr.reactionSearch}"
                        class="magnifying-glass"
                        type="search"
                        autocomplete="off"
                        spellcheck="false"
                    />
                </div>
                ${this.#renderLayoutSelector()}
            </div>
        `;
    }

    #renderSearchCategories() {
        const categories = [
            { title: LocalizedString("All"), icon: AppIcons.SearchGrid(), value: this.#searchCategories.all, selected: true },
            { title: LocalizedString("Media"), icon: AppIcons.SearchMedia(), value: this.#searchCategories.media },
            { title: LocalizedString("Text"), icon: AppIcons.SearchText(), value: this.#searchCategories.text },
            { title: LocalizedString("Emoji"), icon: AppIcons.SearchEmoji(), value: this.#searchCategories.emoji },
        ];
        return `
            <div class="w-full pt-4"
                data-visibility="${this.#dataAttr.visibilitySearch}">
                <div class="grid grid-cols-4 gap-1 p-1 bg-primary border-radius-1-5">
                    ${categories.map(category =>
                        this.#renderSearchCategoryButton(category.title, category.icon, category.value, category.selected)).join("")}
                </div>
            </div>
        `;
    }

    #renderSearchCategoryButton(title, icon, value, selected = false) {
        return `
            <button
                class="segmented-button px-5"
                data-action="${this.#actions.selectSearchCategory}"
                data-category="${value}"
                data-tippy-content="${title}"
                ${selected ? 'aria-selected="true"' : ''}>
                ${icon.outerHTML}
            </button>
        `;
    }

    #renderLayoutSelector() {
        return `
            <div data-visibility="${this.#dataAttr.visibilitySearchHidden}">
                <button
                    class="ghost_button p-3 gap-4 text-content-primary fill-secondary caption2"
                    data-tippy-content="${LocalizedString("Default layout for new visuals")}"
                    data-action="${this.#actions.showLayoutSelector}">
                    ${AppIcons.LayoutFullScreen().outerHTML}
                    ${AppIcons.CaretDown().outerHTML}
                </button>
            </div>
        `;
    }

    #renderReactionsList() {
        return `
            <div class="scroll-container h-full fill-primary" data-id="${this.#dataAttr.reactionsList}">
                ${this.#renderSpeechSuggestions()}
                ${this.#renderGIPHYAttribution()}
                ${this.#renderHelpCard()}
                <ul data-list class="grid gap-4 px-6 pb-6 ${GridCard.cls.list}">
                </ul>
            </div>
        `;
    }

    #renderSpeechSuggestions() {
        return `
            <div data-id="${this.#dataAttr.speechSuggestions}" class="speech-suggestions-container hidden">
                <div class="speech-suggestions-header">
                    <div class="speech-suggestions-label">
                        <span class="speech-indicator"></span>
                        ${LocalizedString("Suggested reactions")}
                    </div>
                    <button
                        class="icon-button speech-suggestions-dismiss"
                        aria-label="${LocalizedString("Dismiss")}"
                        data-action="${this.#actions.dismissSpeechSuggestions}">
                        ${AppIcons.Close().outerHTML}
                    </button>
                </div>
                <div data-suggestions-grid class="speech-suggestions-grid">
                </div>
                <div data-gif-suggestions class="gif-suggestions-section hidden">
                </div>
            </div>
        `;
    }

    #renderGIPHYAttribution() {
        return `
            <div class="w-full flex justify-end py-4 hidden" data-id="${this.#dataAttr.giphyAttribution}">
                ${AppIcons.GIPHYAttribution().outerHTML}
            </div>
        `;
    }

    #renderHelpCard() {
        if (this.#hasDismissedHelpCard()) {
            return "";
        }
        return `
            <div data-id="${this.#dataAttr.helpCard}" class="py-2 hidden">
                <div class="${this.#cls.helpCard} bg-tertiary text-content-tertiary body-small">

                    <span class="p-1">
                        ${LocalizedString("Use the search box to find GIFs and emojis or create a text reaction. Drag images and videos on to this window to add your own.")}
                    </span>

                    <button class="ghost_button" data-action="${this.#actions.closeHelpCard}">
                        ${AppIcons.Close().outerHTML}
                    </button>
                </div>
            </div>
        `;
    }

    #renderThumbnailItem(item, dataType) {
        // TODO figure out how this used to work
        const showEditText = dataType === this.#dataTypes.reaction && this.#slideHasTextMedia(item);
        const pinned = this.#itemIsPinned(item);

        return `
        <li class="${GridCard.cls.listItem}">
            <div
                data-type="${this.#dataTypes.thumbnail}"
                data-id="${item.identifier}"
                class="${GridCard.cls.thumbnail}">
                <img draggable="false" src="${ThumbnailStorage.AssetMissing}" />
            </div>

            <button class="${this.#cls.overlayButton}"
                ${showEditText ? ' data-media="text"' : ""}
                data-pinned="${pinned}"
                data-action="${this.#actions.selectItem}"
                data-type="${dataType}"
                data-id="${item.identifier}">
            </button>

            <div data-title class="${this.#cls.itemTitle} w-full">
                ${item.title || String.fromCharCode(160)}
            </div>


            ${this.#renderItemPinButton(item, dataType).outerHTML}

            ${this.#renderContextMenuButton(item, dataType)}

        </li>`;
    }

    // TODO this is reused between looks and reactions, should be moved to a shared helper
    async #renderThumbnailImages(dataType, slides, el) {
        const results = await Promise.allSettled(
            slides.map((item) => {
                return new Promise((resolve, reject) => {
                    this.#thumbnailForItem(item, dataType)
                        .then((img) => {
                            resolve({
                                id: item.identifier,
                                img
                            });
                        })
                        .catch((err) => {
                            console.error("Error thumbnailing item", err);
                            reject(err);
                        });
                });
            })
        );

        results.forEach((result) => {
            if (result.value == null) {
                return;
            }
            const { id, img } = result.value;

            const thumbnail = el.querySelector(
                `[data-type="${this.#dataTypes.thumbnail}"][data-id="${id}"]`
            );

            if (!thumbnail) {
                return;
            }

            const li = thumbnail.closest("li");

            img.style.opacity = "0";
            img.style.transform = "scale(0.5)";
            img.style.transition =
                "transform 0.2s cubic-bezier(0.25, 1.5, 0.5, 1), opacity 0.2s ease-in-out";

            thumbnail.replaceChildren(img);
            setTimeout(() => {
                img.style.opacity = "1";
                img.style.transform = "scale(1)";
                li.classList.remove(this.#cls.loading);
            }, 10);
        });
    }

    // TODO this is reused between looks and reactions, should be moved to a shared helper
    #renderItemPinButton(item, dataType) {
        const pinned = this.#itemIsPinned(item);

        const button = document.createElement("button");
        button.className = `icon-button ${this.#cls.pinButton}`;
        button.tabIndex = -1;

        button.dataset.id = item.identifier;
        button.dataset.type = dataType;
        button.dataset.action = pinned ? this.#actions.unpinItem : this.#actions.pinItem;

        button.ariaLabel = pinned ? LocalizedString("Unpin") : LocalizedString("Pin");

        if (pinned) {
            button.appendChild(AppIcons.FilledPin());
            button.appendChild(AppIcons.CrossedOutPin());
        } else {
            button.appendChild(AppIcons.EmptyPin());
        }

        return button;
    }

    // TODO this is reused between looks and reactions, should be moved to a shared helper
    #renderContextMenuButton(item, type) {
        return `
            <button
                data-action="${this.#actions.showContextMenu}"
                data-id="${item.identifier}"
                data-type="${type}"
                tabIndex="-1"
                aria-label="show context menu"
                class="icon-button ${this.#cls.floatButton} ${this.#cls.contextMenuButton}">
            ${AppIcons.Ellipsis().outerHTML}
            </button>
        `;
    }

    #clearSearchResults() {
        const list = this.#getReactionsList();
        list.replaceChildren();
    }

    #appendSearchResults(results, type) {
        const list = this.#getReactionsList();
        list.append(...results.map(item => this.#renderSearchResult(item, type)));
    }

    #renderSearchResult(item, type) {
        const li = document.createElement("li");
        li.className = GridCard.cls.listItem;
        li.tabIndex = 0;
        li.innerHTML = `
            <button
                data-action="${this.#actions.selectItem}"
                data-type="${type}"
                data-id="${item.identifier}"
                ${item.message ? `data-message="${item.message}"` : ""}
                class="${GridCard.cls.thumbnail} w-full">
                <img draggable="false" src="${ThumbnailStorage.AssetMissing}"/>
            </button>

            <div data-title class="${this.#cls.itemTitle} w-full">
                ${item.title || String.fromCharCode(160)}
            </div>
        `;

        let promise = null;
        if (item.media) {
            promise = this.#thumbnailForReactionMedia(item.media);
        } else if (item.slide) {
            promise = this.#thumbnailForItem(item.slide, type);
        } else {
            promise = item.getThumbnailURL();
        }

        const thumbnail = li.querySelector(`.${GridCard.cls.thumbnail} img`);
        promise.then(result => {
            if (IsKindOf(result, HTMLImageElement)) {
                result.draggable = false;
                thumbnail?.replaceWith(result);
            } else {
                thumbnail.src = result;
            }
        })

        return li;
    }

    #renderNoSearchResults(category) {
        let heading = "";
        let message = "";

        switch (category) {
            case this.#searchCategories.emoji:
                heading = LocalizedString("No emoji found");
                message = LocalizedString("No emoji match your search.");
                break;
            default:
                heading = LocalizedString("No visuals found");
                message = LocalizedString("No visuals match your search.");
                break;
        }

        const div = document.createElement("div");
        div.classList.add("w-full", "h-full", "flex", "flex-col", "items-center", "justify-center", "gap-4", "p-6");
        div.dataset.id = this.#dataAttr.noSearchResults;
        div.innerHTML = `
            <div class="text-content-primary heading-medium">
                ${heading}
            </div>
            <div class="body-small">
                ${message}
            </div>
        `;
        return div;
    }

    /* Loading state */

    #addLoadingSpinner(parent) {
        parent.classList.add(this.#cls.loading);

        const container = document.createElement("div");
        container.classList.add(
            this.#cls.loaderContainer,
            "flex",
            "flex-col",
            "gap-8",
            "items-center",
            "justify-center"
        );
        parent.appendChild(container);

        const spinner = document.createElement("span");
        spinner.classList.add(this.#cls.loader);
        container.appendChild(spinner);

        const message = document.createElement("span");
        message.classList.add("text-content-primary", "body2");
        message.innerText = this.#getLoadingMessage();

        container.appendChild(message);
    }

    #getLoadingMessage() {
        const message =
            this.#isFirstUse === true
                ? LocalizedString("Setting up your account")
                : LocalizedString("Loading...");
        this.#isFirstUse = false;
        return message;
    }

    #removeLoadingSpinner(container) {
        container?.classList.remove(this.#cls.loading);
        container?.querySelector(`.${this.#cls.loaderContainer}`)?.remove();
    }

    /* Selection */

    #clearSelection() {
        const selected = this.#getSelectedItem();
        selected?.removeAttribute("aria-selected");
    }

    #selectItem(id) {
        this.#clearSelection();

        const button = this.#getItem(id);
        button?.setAttribute("aria-selected", "true");
    }
}
