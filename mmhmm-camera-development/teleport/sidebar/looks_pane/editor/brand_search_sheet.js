//
//  looks/editor/brand_search_sheet.js
//  mmhmm
//
//  Created by Seth Hitchings on 7/18/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * A modal that allows a user to search for a brand by name or domain.
 */
class BrandSearchSheet extends ActionSheet {

    #cls = {
        searchResult: "search-result",
    }

    #dataAttr = {
        searchField: "brand-search-field",
        searchResults: "brand-search-results"
    };

    #actions = {
        apply: "apply-brand",
        cancel: "cancel-search-brand"
    };

    constructor(title, cancelButtonText, initialDomain = null, showExamples = false) {
        const container = document.createElement("div");
        super(title, container, 320, false, false);

        this.showExamples = showExamples;
        this.initialDomain = initialDomain;

        this.populateContainer(container, cancelButtonText, initialDomain);
        this.setAllowAutoDismiss();
        this.addEventHandlers();

        this.#showDefaultSearchResults();
    }

    displayAsModal() {
        super.displayAsModal();

        // Start with the search field focused and its text selected
        this.getSearchField().focus();
        this.getSearchField().select();
    }

    /* UI rendering */

    populateContainer(container, actionButtonText, initialDomain) {
        // Customize the sheet we're inside of
        this.sheet.style.height = "400px";
        this.sheet.style.display = "flex";
        this.sheet.style.flexDirection = "column";

        this.customizeTitlebar();

        const content = this.sheet.querySelector(".contents");
        content.classList.add("h-full");

        container.classList.add("flex", "flex-col", "gap-2", "p4", "h-full");
        container.innerHTML = `
            ${this.renderSearchField(initialDomain)}
            ${this.renderSearchResultsContainer()}
            ${this.renderFooter(actionButtonText)}
        `;
    }

    customizeTitlebar() {
        // The titlebar is created by the ActionSheet
        const titlebar = this.titlebar;
        titlebar.classList.add("text-center", "flex-col", "gap-2", "pt-4");
        titlebar.style.height = "fit-content";

        const message = document.createElement("div");
        message.classList.add("text-content-tertiary", "caption2");
        if (this.showExamples) {
            message.innerText = LocalizedString("Use the brand's logos and colors in this look. Not sure where to start? Try one of our favorite fictional brands.");
        } else {
            message.innerText = LocalizedString("Use the brand's logos and colors in this look");
        }
        titlebar.appendChild(message);
    }

    renderSearchField(initialDomain) {
        const placeholderText = LocalizedString("Search by brand name or URL");
        return `
            <div>
                <input
                    type="text"
                    class="w-full magnifying-glass"
                    name="${this.#dataAttr.searchField}"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="${placeholderText}"
                    value="${initialDomain ?? ""}">
                </input>
            </div>
        `;
    }

    renderSearchResultsContainer() {
        return `
            <div data-id="${this.#dataAttr.searchResults}" tabindex="-1"
                class="w-full p-1 h-full flex flex-col gap-2 overflow-hide-x overflow-auto-y">
            </div>
        `;
    }

    renderEmptySearchResults() {
        return `
            <div class="flex items-start justify-center pt-4">
                <span class="text-content-tertiary">
                    ${LocalizedString("No results found")}
                </span>
            </div>
        `;
    }

    renderSearchResults(results) {
        return this.sortSearchResults(results).map(result => this.renderSearchResult(result)).join("");
    }

    sortSearchResults(results) {
        // Move airtimetools.com to the top of the list if it's present
        const airtimeTools = results.find(result => result.domain === "airtimetools.com");
        if (airtimeTools) {
            results = [airtimeTools, ...results.filter(result => result !== airtimeTools)];
        }
        return results;
    }

    renderSearchResult(result) {
        return `
            <div data-id="${result.domain}" data-action="${this.#actions.apply}" tabindex="0"
                class="${this.#cls.searchResult} flex items-center gap-4 p-2 border-radius-1-5">

                <div class="flex items-center justify-center w-8 h-8 square">
                    <img class="w-full h-full object-contain border-radius-1-5" src="${result.icon}" />
                </div>

                <div class="flex flex-col justify-center items-start w-full">
                    <span class="flex-no-shrink text-content-primary text-ellipsis">
                        ${result.name}
                    </span>
                    <span class="flex-shrink text-content-tertiary text-ellipsis">
                        ${result.domain}
                    </span>
                </div>

            </div>
        `;
    }

    renderFooter(cancelButtonText) {
        return `
            <div class="w-full pt-4 border-top">
                <button
                    class="w-full secondary-button"
                    data-action="${this.#actions.cancel}">
                    ${cancelButtonText}
                </button>
            </div>
        `;
    }

    getSearchField() {
        return this.container.querySelector(`input[name="${this.#dataAttr.searchField}"]`);
    }

    getSearchResultsContainer() {
        return this.container.querySelector(`[data-id="${this.#dataAttr.searchResults}"]`);
    }

    getCancelButton() {
        return this.container.querySelector(`button[data-action="${this.#actions.cancel}"]`);
    }

    /* Event handling */

    addEventHandlers() {
        const searchField = this.getSearchField();
        searchField.addEventListener("input", (evt) => this.onSearchFieldInput(evt));
        searchField.addEventListener("keyup", (evt) => this.onSearchFieldKeyup(evt));

        const resultsContainer = this.getSearchResultsContainer();
        resultsContainer.addEventListener("click", (evt) => this.onSearchResultsClick(evt));
        resultsContainer.addEventListener("focusin", (evt) => this.onSearchResultsFocusIn(evt));
        resultsContainer.addEventListener("keyup", (evt) => this.onSearchResultsKeyup(evt));

        const cancelButton = this.getCancelButton();
        cancelButton.addEventListener("click", () => this.dismiss());
    }

    onSearchFieldInput(evt) {
        // Fires on every keystroke, so must be debounced
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        this.searchTimeout = setTimeout(() => {
            const query = this.getSearchQuery();
            if (query.length == 0) {
                // Empty query means show the default search results
                this.#showDefaultSearchResults();
            } else {
                this.performSearch(query);
            }
        }, 300);
    }

    onSearchFieldKeyup(evt) {
        // Allow the user to navigate the search results list with the keyboard
        // while focus is still in the search field, so that they don't have to
        // first tab to the list
        if (evt.key == "ArrowDown") {
            this.selectNextSearchResult();
        } else if (evt.key == "ArrowUp") {
            this.selectPreviousSearchResult();
        } else {
            return;
        }

        // We handled the event
        evt.preventDefault();
        evt.stopPropagation();
    }

    onSearchResultsClick(evt) {
        // Clicking on a search result applies it
        const item = evt.target.closest(`.${this.#cls.searchResult}`);
        if (!item) {
            return;
        }

        const action = item.dataset.action;
        if (action === this.#actions.apply) {
            evt.stopPropagation();
            this.applySearchResult(item);
        }
    }

    onSearchResultsKeyup(evt) {
        // Allow the user to use arrow keys to navigate the search results
        if (evt.key == "ArrowDown") {
            this.selectNextSearchResult();
        } else if (evt.key == "ArrowUp") {
            this.selectPreviousSearchResult();
        } else if (evt.key == "Enter") {
            this.applyCurrentSearchResult();
        } else {
            return;
        }

        // We handled the event
        evt.preventDefault();
        evt.stopPropagation();
    }

    /**
     * When a search result receives focus, e.g. via the user tabbing to it,
     * we select it.
     */
    onSearchResultsFocusIn(evt) {
        const item = evt.target.closest(`.${this.#cls.searchResult}`);
        if (item) {
            this.setSelectedSearchResult(item);
        }
    }

    /* Searching for a brand updates the search results list */

    async performSearch(query) {
        this.currentSearchQuery = query;
        try {
            const fakeResults = this.#getFakeSearchResults(query);
            const results = await BrandFetch.searchBrand(query);
            if (query != this.currentSearchQuery) {
                // If the query has changed since we started the search, ignore the results
                return;
            }
            this.updateSearchResults(fakeResults.concat(results));
        } catch (error) {
            console.error("Error searching for brand:", error);
        }
    }

    #getFakeSearchResults(query) {
        const tokens = SearchTree.tokenizeText(query);
        if (tokens.length == 0) {
            return [];
        }
        if (!this.searchTree) {
            this.searchTree = this.#buildSearchTree();
        }
        return this.searchTree.resultsForSearchTokens(tokens);
    }

    #buildSearchTree() {
        const searchTree = new SearchTree();
        const brandData = LookPresets.FictionalBrandData();
        brandData.forEach((item) => {
            searchTree.addItemWithTokens(item, SearchTree.tokenizeText(item.name));
        });
        return searchTree;
    }

    getSearchQuery() {
        return this.getSearchField().value.trim();
    }

    updateSearchResults(results) {
        const container = this.getSearchResultsContainer();
        if (results && results.length > 0) {
            container.innerHTML = this.renderSearchResults(results);
        } else {
            container.innerHTML = this.renderEmptySearchResults();
        }
    }

    #showDefaultSearchResults() {
        if (this.initialDomain) {
            this.performSearch(this.initialDomain).then(() => {
                if (this.showExamples) {
                    this.addDefaultSearchResults(false);
                }
            });
        } else if (this.showExamples) {
            this.addDefaultSearchResults(true);
        }
    }

    addToSearchResults(results) {
        if (!results || results.length === 0) {
            return;
        }

        // Add the given results to the search results container without clearing existing results
        // Save the existing children so we can restore them later
        const container = this.getSearchResultsContainer();
        const children = Array.from(container.children);

        // Render the new results
        container.innerHTML = this.renderSearchResults(results);

        // Put back the existing children
        const first = container.firstElementChild;
        children.forEach(child => first.insertAdjacentElement("beforeBegin", child));
    }

    addDefaultSearchResults(includeAirtime) {
        // Show some built-in search results for the user to try out
        const results = LookPresets.FictionalBrandData();
        if (includeAirtime) {
            results.unshift({
                domain: "airtimetools.com",
                name: "Airtime Tools",
                icon: "assets/looks/brands/airtime.webp"
            });
        }
        this.addToSearchResults(results);
    }


    /* Selection highlights a result but does not apply it. */

    selectNextSearchResult() {
        const resultsContainer = this.getSearchResultsContainer();
        const selectedResult = this.getSelectedSearchResult();

        if (selectedResult) {
            if (selectedResult.nextElementSibling) {
                this.setSelectedSearchResult(selectedResult.nextElementSibling);
            }
        } else if (resultsContainer.children.length > 0) {
            // If no result is focused, select the first one
            this.setSelectedSearchResult(resultsContainer.children[0]);
        }
    }

    selectPreviousSearchResult() {
        const resultsContainer = this.getSearchResultsContainer();
        const selectedResult = this.getSelectedSearchResult();

        if (selectedResult) {
            if (selectedResult.previousElementSibling) {
                this.setSelectedSearchResult(selectedResult.previousElementSibling);
            }
        } else if (resultsContainer.children.length > 0) {
            this.setSelectedSearchResult(resultsContainer.children[resultsContainer.children.length - 1]);
        }
    }

    setSelectedSearchResult(item) {
        const selectedResult = this.getSelectedSearchResult();
        if (selectedResult) {
            selectedResult.removeAttribute("aria-selected");
        }
        item.setAttribute("aria-selected", "true");
        item.focus();
    }

    getSelectedSearchResult() {
        const resultsContainer = this.getSearchResultsContainer();
        return resultsContainer.querySelector(`.${this.#cls.searchResult}[aria-selected="true"]`);
    }

    /* Applying a result chooses that brand and dismisses the dialog */

    applyCurrentSearchResult() {
        const item = this.getSelectedSearchResult();
        if (item) {
            this.applySearchResult(item);
        }
    }

    applySearchResult(item) {
        this.selectedDomain = item.dataset.id;
        this.dismiss();
    }

}
