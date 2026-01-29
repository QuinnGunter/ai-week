//
//  sidebar/looks_pane/idle/reactions_search.js
//  mmhmm
//
//  Created by Seth Hitchings on 12/1/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Functionality used by to populate search results for
 * reactions / visuals.
 */
class ReactionsSearch {

    #enableEmojiReactions = true;
    #myReactionsSearchTree = null;
    #catalogSearchTree = null;
    #giphyClient = null;

    constructor() {
        this.#giphyClient = new GIPHYClient();
    }

    /**
     * Clean up resources to prevent memory leaks.
     * Call this before discarding the ReactionsSearch instance.
     */
    destroy() {
        this.#giphyClient?.cancelPendingRequests();
        this.#giphyClient = null;
        this.#myReactionsSearchTree = null;
        this.#catalogSearchTree = null;
    }

    /* Search my reactions */

    setMyReactions(slides) {
        this.#rebuildMyReactionsSearchTree(slides);
    }

    searchMyReactions(query) {
        const tokens = SearchTree.tokenizeText(query);
        if (tokens.length == 0) {
            return [];
        }
        const results = this.#myReactionsSearchTree.resultsForSearchTokens(tokens);
        return this.resultsForMyReactions(results);
    }

    resultsForMyReactions(results) {
        return results.map((slide) => {
            return {
                slide,
                identifier: slide.identifier,
                title: slide.title,
            };
        });
    }

    removeTextAndEmojiReactions(results) {
        return results.filter((item) => !this.#isSingleTextMedia(item.slide));
    }

    onlyTextReactions(results) {
        return results.filter((item) => this.#isSingleTextMedia(item.slide) && !this.#isEmojiReaction(item.slide));
    }

    onlyEmojiReactions(results) {
        return results.filter((item) => this.#isSingleTextMedia(item.slide) && this.#isEmojiReaction(item.slide));
    }

    #rebuildMyReactionsSearchTree(slides) {
        const searchTree = new SearchTree();
        slides.forEach((slide) => {
            let tokens = SearchTree.tokenizeText(slide.title);

            // If the reaction has text media, index the text
            const textMedia = slide.objects.filter((obj) => IsKindOf(obj, Media.Text));
            textMedia.forEach((text) => {
                const string = text.attributedString?.toString();
                if (string) {
                    tokens = tokens.concat(SearchTree.tokenizeText(string));
                }
            });

            searchTree.addItemWithTokens(slide, tokens);
        });
        this.#myReactionsSearchTree = searchTree;
    }

    /* Search our server-side catalog of reactions */

    setCatalog(catalog) {
        this.#buildCatalogSearchTree(catalog);
    }

    searchCatalog(query) {
        const tokens = SearchTree.tokenizeText(query);
        if (tokens.length == 0) {
            return [];
        }
        const results = this.#catalogSearchTree.resultsForSearchTokens(tokens);
        return results.filter(item => !item.isAlreadyImported);
    }

    async #buildCatalogSearchTree(catalog) {
        const searchTree = new SearchTree();
        // These are legacy text reactions in the catalog
        const itemsToSkip = [ "Speech", "Thought" ];
        try {
            const reactions = await catalog.listContent(LooksContentType.Reaction);
            if (reactions.successful) {
                reactions.results.forEach((reaction) => {
                    if (!itemsToSkip.includes(reaction.title)) {
                        searchTree.addItemWithTokens(reaction, SearchTree.tokenizeText(reaction.title));
                    }
                });
            }
        } catch(err) {
            console.error("Error fetching reactions catalog", err);
        }
        this.#catalogSearchTree = searchTree;
    }

    /* Search suggestions for text reactions */

    suggestedTextReactions(query, existingReactions, anchor, limit = 2) {
        // Don't suggest a new text reaction if the user already has one with the same text
        const matches = existingReactions.map((item) => {
            if (!this.#isSingleTextMedia(item.slide)) {
                return null;
            }
            if (!this.#sameText(this.#getTextMediaContent(item.slide), query)) {
                return null;
            }
            return item.slide.objects[0];
        }).filter(Boolean);

        const hasStyle = (styleID) => {
            return matches.some((reaction) => reaction.style.themeID === styleID);
        };

        const results = TextReaction.styles.map((style) => {
            if (!hasStyle(style.id)) {
                return {
                    media: TextReaction.createMediaForTextReactionWithStyle(style, query, anchor),
                    identifier: style.id,
                    message: query,
                    title: style.title,
                };
            }
        }).filter((item) => item != null);

        return results.slice(0, limit);
    }

    textSearchResult(text, style, anchor) {
        return {
            media: TextReaction.createMediaForTextReactionWithStyle(style, text, anchor),
            identifier: style.id,
            message: text,
            title: style.title,
        };
    }

    suggestedEmojiReactions(query, existingReactions, limit = 2) {
        if (!this.#enableEmojiReactions) {
            return [];
        }

        // See if any emoji match the query
        const emojis = EmojiSearch.search(query, limit);
        const results = emojis.map((emoji) => this.emojiSearchResult(emoji.emoji, emoji.name));

        // Remove results for which we already have an existing text reaction
        return results.filter((result) => {
            const textReactions = existingReactions.filter(item => this.#isSingleTextMedia(item.slide));
            return !textReactions.some((item) => this.#sameText(this.#getTextMediaContent(item.slide), result.message));
        }).slice(0, limit);
    }

    emojiSearchResult(emoji, name) {
        return {
            media: TextReaction.CreateEmoji(emoji),
            identifier: name,
            message: emoji,
            title: name,
        };
    }

    #isEmojiReaction(slide) {
        return slide?.objects.length === 1 &&
            IsKindOf(slide.objects[0], Media.Text) &&
            slide.objects[0].metadata?.type == LooksMediaType.EmojiReaction;
    }

    #isSingleTextMedia(slide) {
        return slide?.objects.length === 1 && IsKindOf(slide.objects[0], Media.Text);
    }

    #getTextMediaContent(slide) {
        return slide.objects[0].attributedString?.toString();
    }

    #sameText(a, b) {
        return a && b && a.toLowerCase() === b.toLowerCase();
    }

    /* GIPHY search */

    async searchGIPHY(query) {
        try {
            const rawResults = await this.#giphyClient.searchGIFs(query);
            return this.#processGIPHYSearchResults(rawResults);
        } catch(err) {
            console.error("Error searching GIPHY", err);
        }
        return [];
    }

    cancelGIPHYSearch() {
        this.#giphyClient.cancelPendingRequests();
    }

    #processGIPHYSearchResults(items) {
        return items.filter(item => this.#isValidGIPHYItem(item)).map(item => this.#processGIPHYItem(item));
    }

    #processGIPHYItem(item) {
        return {
            ...item,
            identifier: item.id,
            getThumbnailURL: async () => this.#giphyThumbnailURL(item),
        };
    }

    #isValidGIPHYItem(item) {
        const thumbnailUrl = this.#giphyThumbnailURL(item);
        return thumbnailUrl && item.images.original;
    }

    #giphyThumbnailURL(item) {
        // See https://github.com/All-Turtles/mmhmm-web/issues/3645
        let url = item.images.fixed_height_small?.webp;
        if (url == null) {
            url = item.images.preview_gif?.url;
        }
        return url;
    }
}
