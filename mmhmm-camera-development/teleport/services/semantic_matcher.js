//
//  services/semantic_matcher.js
//  mmhmm
//
//  Semantic matching service using Transformers.js embeddings.
//  Matches spoken phrases to reaction categories using cosine similarity.
//

import { ReactionCategories, getAllCategoryKeys, getCategoryByKey } from "./reaction_categories.js";

/**
 * @typedef {Object} SemanticMatch
 * @property {string} category - Category key (e.g., "professional.agreement")
 * @property {number} confidence - Similarity score (0-1)
 * @property {string} emoji - Category emoji
 * @property {string[]} giphyPatterns - GIPHY search patterns
 */

/**
 * SemanticMatcher uses Transformers.js embeddings to match spoken phrases
 * to reaction categories based on semantic similarity.
 *
 * Uses the all-MiniLM-L6-v2 model (~22MB) which is fast and effective
 * for sentence similarity tasks.
 */
class SemanticMatcher {
    // Singleton instance
    static shared = null;

    // Transformers CDN URL (same as Whisper worker)
    static #TRANSFORMERS_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.2";

    // Model for sentence embeddings
    static #MODEL_ID = "Xenova/all-MiniLM-L6-v2";

    // Private fields
    #pipeline = null;
    #env = null;
    #embedder = null;
    #categoryEmbeddings = new Map();  // category key -> { embedding, data }
    #transcriptCache = new Map();     // text -> embedding (LRU cache)
    #isLoaded = false;
    #isLoading = false;
    #loadPromise = null;
    #onProgress = null;

    // Configuration
    #maxCacheSize = 100;
    #defaultThreshold = 0.55;

    /**
     * Check if the matcher is loaded and ready
     * @returns {boolean}
     */
    get isLoaded() {
        return this.#isLoaded;
    }

    /**
     * Check if the matcher is currently loading
     * @returns {boolean}
     */
    get isLoading() {
        return this.#isLoading;
    }

    /**
     * Get/set the default similarity threshold
     */
    get threshold() {
        return this.#defaultThreshold;
    }

    set threshold(value) {
        this.#defaultThreshold = Math.max(0, Math.min(1, value));
    }

    /**
     * Load Transformers.js and build category embeddings
     * @param {Function} [onProgress] - Progress callback (progress: number, status: string)
     * @returns {Promise<void>}
     */
    async load(onProgress = null) {
        if (this.#isLoaded) {
            return;
        }

        // If already loading, return existing promise
        if (this.#loadPromise) {
            return this.#loadPromise;
        }

        this.#onProgress = onProgress;
        this.#isLoading = true;

        this.#loadPromise = this.#doLoad();
        return this.#loadPromise;
    }

    /**
     * Internal load implementation
     */
    async #doLoad() {
        try {
            this.#reportProgress(0, "Loading Transformers.js...");

            // Dynamic import of Transformers.js
            const transformers = await import(SemanticMatcher.#TRANSFORMERS_CDN);
            this.#pipeline = transformers.pipeline;
            this.#env = transformers.env;

            // Configure environment
            this.#env.allowLocalModels = false;
            this.#env.useBrowserCache = true;

            this.#reportProgress(10, "Loading embedding model...");

            // Create the feature extraction pipeline
            this.#embedder = await this.#pipeline(
                "feature-extraction",
                SemanticMatcher.#MODEL_ID,
                {
                    progress_callback: (progress) => {
                        if (progress.status === "progress") {
                            const pct = 10 + Math.round((progress.progress || 0) * 0.6);
                            this.#reportProgress(pct, `Downloading model: ${Math.round(progress.progress || 0)}%`);
                        }
                    }
                }
            );

            this.#reportProgress(70, "Building category embeddings...");

            // Build embeddings for all category anchors
            await this.#buildCategoryEmbeddings();

            this.#isLoaded = true;
            this.#isLoading = false;

            this.#reportProgress(100, "Semantic matcher ready");
            console.log("SemanticMatcher: Loaded successfully");

        } catch (err) {
            this.#isLoading = false;
            this.#loadPromise = null;
            console.error("SemanticMatcher: Failed to load:", err);
            throw err;
        }
    }

    /**
     * Report progress to callback
     */
    #reportProgress(progress, status) {
        if (this.#onProgress) {
            this.#onProgress(progress, status);
        }
    }

    /**
     * Build mean embeddings for each reaction category
     */
    async #buildCategoryEmbeddings() {
        const categoryKeys = getAllCategoryKeys();
        const totalCategories = categoryKeys.length;
        let processed = 0;

        for (const key of categoryKeys) {
            const data = getCategoryByKey(key);
            if (!data) continue;

            // Compute embeddings for all anchors in this category
            const anchorEmbeddings = [];
            for (const anchor of data.anchors) {
                const embedding = await this.#embed(anchor);
                anchorEmbeddings.push(embedding);
            }

            // Compute mean embedding
            const meanEmbedding = this.#meanVector(anchorEmbeddings);

            this.#categoryEmbeddings.set(key, {
                embedding: meanEmbedding,
                data
            });

            processed++;
            const pct = 70 + Math.round((processed / totalCategories) * 25);
            this.#reportProgress(pct, `Building embeddings: ${processed}/${totalCategories}`);
        }

        console.log(`SemanticMatcher: Built embeddings for ${this.#categoryEmbeddings.size} categories`);
    }

    /**
     * Match a transcript against all categories
     * @param {string} transcript - The text to match
     * @param {number} [threshold] - Minimum similarity threshold (default: 0.55)
     * @returns {Promise<SemanticMatch[]>} Matches sorted by confidence (descending)
     */
    async matchTranscript(transcript, threshold = null) {
        if (!this.#isLoaded) {
            return [];
        }

        const minSimilarity = threshold ?? this.#defaultThreshold;

        try {
            // Get embedding for the transcript
            const transcriptEmbedding = await this.#embed(transcript);

            // Compare against all categories
            const matches = [];

            for (const [key, { embedding: catEmb, data }] of this.#categoryEmbeddings) {
                const similarity = this.#cosineSimilarity(transcriptEmbedding, catEmb);

                if (similarity >= minSimilarity) {
                    matches.push({
                        category: key,
                        confidence: similarity,
                        emoji: data.emoji,
                        giphyPatterns: data.giphyPatterns
                    });
                }
            }

            // Sort by confidence (descending)
            return matches.sort((a, b) => b.confidence - a.confidence);

        } catch (err) {
            console.error("SemanticMatcher: Error matching transcript:", err);
            return [];
        }
    }

    /**
     * Get the top match for a transcript
     * @param {string} transcript - The text to match
     * @param {number} [threshold] - Minimum similarity threshold
     * @returns {Promise<SemanticMatch|null>}
     */
    async getTopMatch(transcript, threshold = null) {
        const matches = await this.matchTranscript(transcript, threshold);
        return matches[0] ?? null;
    }

    /**
     * Compute embedding for text (with caching)
     * @param {string} text
     * @returns {Promise<number[]>}
     */
    async #embed(text) {
        const key = text.toLowerCase().trim();

        // Check cache
        if (this.#transcriptCache.has(key)) {
            return this.#transcriptCache.get(key);
        }

        // Compute embedding
        const result = await this.#embedder(text, {
            pooling: "mean",
            normalize: true
        });

        const embedding = Array.from(result.data);

        // Add to cache with LRU eviction
        if (this.#transcriptCache.size >= this.#maxCacheSize) {
            // Delete oldest entry (first key)
            const firstKey = this.#transcriptCache.keys().next().value;
            this.#transcriptCache.delete(firstKey);
        }
        this.#transcriptCache.set(key, embedding);

        return embedding;
    }

    /**
     * Compute cosine similarity between two vectors
     * @param {number[]} a
     * @param {number[]} b
     * @returns {number}
     */
    #cosineSimilarity(a, b) {
        let dot = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Compute mean of multiple vectors
     * @param {number[][]} vectors
     * @returns {number[]}
     */
    #meanVector(vectors) {
        if (vectors.length === 0) return [];

        const dim = vectors[0].length;
        const mean = new Array(dim).fill(0);

        for (const v of vectors) {
            for (let i = 0; i < dim; i++) {
                mean[i] += v[i];
            }
        }

        const n = vectors.length;
        for (let i = 0; i < dim; i++) {
            mean[i] /= n;
        }

        return mean;
    }

    /**
     * Clear the transcript embedding cache
     */
    clearCache() {
        this.#transcriptCache.clear();
    }

    /**
     * Preload the matcher during idle time
     * @param {number} [timeout=10000] - Max wait time in ms
     * @returns {Promise<boolean>} - Whether preload succeeded
     */
    preloadWhenIdle(timeout = 10000) {
        if (this.#isLoaded || this.#isLoading) {
            return Promise.resolve(this.#isLoaded);
        }

        return new Promise((resolve) => {
            const callback = () => {
                this.load()
                    .then(() => resolve(true))
                    .catch(() => resolve(false));
            };

            if (typeof requestIdleCallback === "function") {
                requestIdleCallback(callback, { timeout });
            } else {
                setTimeout(callback, 100);
            }
        });
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.#embedder = null;
        this.#pipeline = null;
        this.#env = null;
        this.#categoryEmbeddings.clear();
        this.#transcriptCache.clear();
        this.#isLoaded = false;
        this.#isLoading = false;
        this.#loadPromise = null;
        console.log("SemanticMatcher: Disposed");
    }
}

export { SemanticMatcher };
