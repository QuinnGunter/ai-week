//
//  services/speculative_cache.js
//  mmhmm
//
//  Speculative GIF cache for pre-fetching likely reactions.
//  Pre-loads GIFs before the user speaks to achieve near-instant suggestions.
//

/**
 * SpeculativeGifCache pre-fetches GIFs for likely reactions based on
 * conversation context. This achieves near-zero latency when displaying
 * reaction suggestions.
 *
 * Strategy:
 * 1. When OTHER person speaks, predict what user might react with
 * 2. Pre-fetch GIFs for top predicted categories
 * 3. Serve from cache when user actually speaks
 */
class SpeculativeGifCache {

    // Singleton instance
    static shared = null;

    // Categories most commonly needed as reactions
    static #DEFAULT_PREFETCH_CATEGORIES = [
        "agreement", "humor", "excitement", "empathy", "thinking"
    ];

    // Private fields
    #cache = new Map();           // category -> {gifs: [], timestamp: number}
    #pendingFetches = new Set();  // Currently fetching categories
    #giphyClient = null;
    #maxCacheSize = 15;           // Max categories to cache
    #cacheTTLMs = 120000;         // 2 minute cache TTL
    #gifsPerCategory = 4;         // GIFs to fetch per category

    constructor() {
        // Pre-fetch default categories on construction
        this.#schedulePrefetch(SpeculativeGifCache.#DEFAULT_PREFETCH_CATEGORIES);
    }

    /**
     * Set the GIPHY client to use for fetching
     * @param {GIPHYClient} client
     */
    setGiphyClient(client) {
        this.#giphyClient = client;
    }

    /**
     * Get GIFs for a category from cache
     * @param {string} category - Category name (e.g., "agreement", "humor")
     * @returns {Array|null} Array of GIPHY items or null if not cached
     */
    getFromCache(category) {
        const entry = this.#cache.get(category);
        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() - entry.timestamp > this.#cacheTTLMs) {
            this.#cache.delete(category);
            return null;
        }

        return entry.gifs;
    }

    /**
     * Check if a category is cached and valid
     * @param {string} category
     * @returns {boolean}
     */
    isCached(category) {
        return this.getFromCache(category) !== null;
    }

    /**
     * Pre-fetch GIFs for predicted reaction categories
     * @param {string[]} categories - Categories to pre-fetch
     */
    async prefetchCategories(categories) {
        if (!this.#giphyClient) {
            console.warn("SpeculativeGifCache: No GIPHY client set");
            return;
        }

        const toFetch = categories.filter(cat =>
            !this.isCached(cat) && !this.#pendingFetches.has(cat)
        );

        if (toFetch.length === 0) {
            return;
        }

        // Fetch in parallel
        const fetchPromises = toFetch.map(category => this.#fetchCategory(category));
        await Promise.allSettled(fetchPromises);
    }

    /**
     * Called when other person speaks - predict and pre-fetch likely reactions
     * @param {string} otherPersonTranscript - What the other person said
     */
    async prefetchLikelyReactions(otherPersonTranscript) {
        const predictions = this.#predictResponseCategories(otherPersonTranscript);

        if (predictions.length > 0) {
            // Pre-fetch top 3 predicted categories
            await this.prefetchCategories(predictions.slice(0, 3));
        }
    }

    /**
     * Predict likely user response categories based on what other person said
     * @param {string} transcript
     * @returns {string[]} Array of predicted category names
     */
    #predictResponseCategories(transcript) {
        const text = transcript.toLowerCase();
        const predictions = [];

        // Pattern-based prediction
        const predictors = {
            // Questions directed at user -> thinking/agreement
            agreement: [
                "what do you think", "don't you agree", "right?",
                "isn't it", "sound good?", "makes sense?"
            ],
            // Good news -> excitement/joy
            excitement: [
                "got the job", "got promoted", "we won", "it worked",
                "great news", "finally", "amazing", "awesome", "incredible"
            ],
            // Jokes/humor -> laughter
            humor: [
                "kidding", "joking", "funny thing", "you'll laugh",
                "plot twist", "guess what", "hilarious"
            ],
            // Bad news -> empathy
            empathy: [
                "didn't work", "failed", "rejected", "lost",
                "struggling", "hard time", "difficult", "frustrated"
            ],
            // Strong opinions -> agreement/skeptical
            thinking: [
                "i think", "i believe", "honestly", "in my opinion",
                "clearly", "obviously"
            ],
            // Complaints -> empathy/agreement
            frustration: [
                "so annoying", "can't believe", "ridiculous",
                "frustrating", "unbelievable"
            ],
            // Asking for opinion
            skeptical: [
                "seems weird", "not sure", "questionable",
                "what if", "but"
            ]
        };

        for (const [category, patterns] of Object.entries(predictors)) {
            const matchCount = patterns.filter(p => text.includes(p)).length;
            if (matchCount > 0) {
                predictions.push({ category, score: matchCount });
            }
        }

        // Sort by score and return category names
        return predictions
            .sort((a, b) => b.score - a.score)
            .map(p => p.category);
    }

    /**
     * Fetch GIFs for a single category
     * @param {string} category
     */
    async #fetchCategory(category) {
        if (this.#pendingFetches.has(category)) {
            return;
        }

        this.#pendingFetches.add(category);

        try {
            // Map category to GIPHY search query
            const query = this.#categoryToQuery(category);

            const gifs = await this.#giphyClient.searchGIFs(query, this.#gifsPerCategory);

            if (gifs && gifs.length > 0) {
                // Manage cache size
                if (this.#cache.size >= this.#maxCacheSize) {
                    this.#evictOldest();
                }

                this.#cache.set(category, {
                    gifs,
                    timestamp: Date.now()
                });

                console.log(`SpeculativeGifCache: Pre-fetched ${gifs.length} GIFs for "${category}"`);
            }
        } catch (err) {
            console.error(`SpeculativeGifCache: Error fetching "${category}":`, err);
        } finally {
            this.#pendingFetches.delete(category);
        }
    }

    /**
     * Map category name to GIPHY search query
     * @param {string} category
     * @returns {string}
     */
    #categoryToQuery(category) {
        const queryMap = {
            agreement: "agree nodding thumbs up",
            humor: "laughing funny reaction",
            excitement: "excited celebration wow",
            empathy: "virtual hug support",
            thinking: "thinking hmm pondering",
            joy: "happy dance celebration",
            frustration: "frustrated facepalm annoyed",
            skeptical: "skeptical doubt hmm",
            surprise: "surprised shocked wow",
            appreciation: "thank you applause",
            cringe: "cringe awkward yikes",
            sarcasm: "eye roll sarcastic sure",
            sadness: "sad disappointed",
            relief: "relief phew finally",
            love: "heart love adorable"
        };

        return queryMap[category] || `${category} reaction`;
    }

    /**
     * Schedule pre-fetch for categories during idle time
     * @param {string[]} categories
     */
    #schedulePrefetch(categories) {
        const doFetch = () => {
            if (this.#giphyClient) {
                this.prefetchCategories(categories);
            } else {
                // Retry when client is available
                setTimeout(() => this.#schedulePrefetch(categories), 2000);
            }
        };

        if (typeof requestIdleCallback === "function") {
            requestIdleCallback(doFetch, { timeout: 5000 });
        } else {
            setTimeout(doFetch, 1000);
        }
    }

    /**
     * Evict the oldest cache entry
     */
    #evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.#cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.#cache.delete(oldestKey);
        }
    }

    /**
     * Clear the entire cache
     */
    clearCache() {
        this.#cache.clear();
        this.#pendingFetches.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    getStats() {
        return {
            cachedCategories: this.#cache.size,
            pendingFetches: this.#pendingFetches.size,
            categories: Array.from(this.#cache.keys())
        };
    }
}

// Create singleton instance
SpeculativeGifCache.shared = new SpeculativeGifCache();
