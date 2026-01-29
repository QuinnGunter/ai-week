//
//  services/conversation_buffer.js
//  mmhmm
//
//  Rolling buffer of transcripts with speaker labels for context extraction.
//  Used to provide conversation context for smarter GIF suggestions.
//

/**
 * ConversationBuffer maintains a rolling window of speaker-labeled transcripts.
 * Enables context-aware reactions by tracking what all participants say.
 */
class ConversationBuffer {

    static Notifications = Object.freeze({
        EntryAdded: "ConversationBuffer.EntryAdded",
        BufferCleared: "ConversationBuffer.BufferCleared"
    });

    // Singleton instance
    static shared = null;

    // Configuration
    #maxEntries = 20;
    #maxAgeMs = 60000;  // 60 second window

    // Buffer: Array of {speaker, text, timestamp}
    #buffer = [];

    // Stop words for topic extraction
    #stopWords = new Set([
        "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
        "they", "them", "the", "a", "an", "is", "are", "was", "were",
        "that", "this", "to", "and", "of", "in", "for", "on", "with",
        "at", "by", "be", "have", "has", "had", "do", "does", "did",
        "will", "would", "could", "should", "may", "might", "must",
        "shall", "so", "just", "very", "really", "like", "um", "uh",
        "yeah", "yes", "no", "ok", "okay", "well", "got", "get", "go",
        "going", "know", "think", "said", "say", "says", "want", "need",
        "thing", "things", "something", "anything", "nothing", "everything"
    ]);

    /**
     * Add a transcript entry to the buffer
     * @param {string} speaker - "user" or "other"
     * @param {string} text - The transcript text
     */
    addEntry(speaker, text) {
        if (!text || typeof text !== "string" || !text.trim()) {
            return;
        }

        const entry = {
            speaker,
            text: text.trim(),
            timestamp: Date.now()
        };

        this.#buffer.push(entry);

        // Prune old/excess entries
        this.#pruneBuffer();

        NotificationCenter.default.postNotification(
            ConversationBuffer.Notifications.EntryAdded,
            this,
            { entry }
        );
    }

    /**
     * Get recent entries within a time window
     * @param {number} lookbackMs - How far back to look (default: maxAgeMs)
     * @returns {Array} Entries within the time window
     */
    getRecentContext(lookbackMs = this.#maxAgeMs) {
        const cutoff = Date.now() - lookbackMs;
        return this.#buffer.filter(entry => entry.timestamp >= cutoff);
    }

    /**
     * Get all entries from a specific speaker
     * @param {string} speaker - "user" or "other"
     * @param {number} lookbackMs - How far back to look (default: maxAgeMs)
     * @returns {Array} Entries from the specified speaker
     */
    getEntriesBySpeaker(speaker, lookbackMs = this.#maxAgeMs) {
        const cutoff = Date.now() - lookbackMs;
        return this.#buffer.filter(
            entry => entry.speaker === speaker && entry.timestamp >= cutoff
        );
    }

    /**
     * Extract key topics from other speakers' recent speech.
     * Returns phrases/nouns that can be used to generate context-aware queries.
     * @param {number} lookbackMs - How far back to look (default: 15 seconds)
     * @returns {string[]} Array of key topics (max 5)
     */
    extractOtherSpeakerTopics(lookbackMs = 15000) {
        const entries = this.getEntriesBySpeaker("other", lookbackMs);

        if (entries.length === 0) {
            return [];
        }

        // Combine all "other" speaker text
        const combinedText = entries.map(e => e.text).join(" ");

        // Extract meaningful words
        const words = combinedText.toLowerCase()
            .replace(/[^\w\s]/g, " ")
            .split(/\s+/)
            .filter(word =>
                word.length > 2 &&
                !this.#stopWords.has(word)
            );

        // Count word frequency
        const wordCounts = new Map();
        for (const word of words) {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }

        // Sort by frequency and return top 5 unique topics
        const sortedWords = [...wordCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([word]) => word);

        return sortedWords.slice(0, 5);
    }

    /**
     * Build a context string for query generation.
     * Combines recent "other" speaker topics with user's intent.
     * @param {string} userTranscript - The user's current transcript
     * @returns {Object} Context object with topics and combined query hints
     */
    buildContextForQuery(userTranscript) {
        const otherTopics = this.extractOtherSpeakerTopics();
        const recentOther = this.getEntriesBySpeaker("other", 15000);

        return {
            otherSpeakerTopics: otherTopics,
            hasConversationContext: otherTopics.length > 0,
            recentOtherText: recentOther.map(e => e.text).join(" "),
            userTranscript
        };
    }

    /**
     * Get the most recent entry
     * @returns {Object|null} The most recent entry or null
     */
    getLastEntry() {
        return this.#buffer.length > 0
            ? this.#buffer[this.#buffer.length - 1]
            : null;
    }

    /**
     * Get the buffer size
     * @returns {number} Current number of entries
     */
    get size() {
        return this.#buffer.length;
    }

    /**
     * Check if buffer has any entries
     * @returns {boolean}
     */
    get isEmpty() {
        return this.#buffer.length === 0;
    }

    /**
     * Clear all entries from the buffer
     */
    clear() {
        this.#buffer = [];

        NotificationCenter.default.postNotification(
            ConversationBuffer.Notifications.BufferCleared,
            this
        );
    }

    /**
     * Remove old and excess entries
     */
    #pruneBuffer() {
        const now = Date.now();
        const cutoff = now - this.#maxAgeMs;

        // Remove entries older than maxAgeMs
        this.#buffer = this.#buffer.filter(entry => entry.timestamp >= cutoff);

        // Remove excess entries (keep most recent)
        if (this.#buffer.length > this.#maxEntries) {
            this.#buffer = this.#buffer.slice(-this.#maxEntries);
        }
    }
}

// Create singleton instance
ConversationBuffer.shared = new ConversationBuffer();
