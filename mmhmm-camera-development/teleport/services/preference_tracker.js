//
//  services/preference_tracker.js
//  mmhmm
//
//  Tracks user reaction preferences for personalized suggestions.
//  Privacy-first: stores anonymized preferences locally.
//

/**
 * PreferenceTracker learns user preferences for reaction suggestions.
 * Tracks which reactions users select vs skip to improve future recommendations.
 *
 * Privacy-first design:
 * - All data stored locally in SharedUserDefaults
 * - No raw transcripts stored, only hashed context
 * - Opt-in analytics only
 */
class PreferenceTracker {

    static Notifications = Object.freeze({
        PreferencesUpdated: "PreferenceTracker.PreferencesUpdated"
    });

    // Singleton instance
    static shared = null;

    // Storage key
    static #STORAGE_KEY = "reactionPreferences_v1";

    // Private fields
    #preferences = {
        favoriteEmojis: {},       // emoji -> selection count
        favoriteCategories: {},   // category -> selection count
        favoriteGifStyles: {},    // style tag -> count
        avoidedReactions: {},     // reaction -> skip count
        reactionHistory: [],      // recent selections for pattern detection
        lastUpdated: null
    };

    // Configuration
    #maxHistorySize = 100;
    #significantSelectionCount = 3;  // Min selections to influence ranking

    constructor() {
        this.#loadPreferences();
    }

    /**
     * Log when user selects a reaction from suggestions
     * @param {Object} context - Context of the selection
     * @param {string} context.transcript - User's transcript (will be hashed)
     * @param {Array} context.suggestions - All suggested reactions
     * @param {Object} selected - The selected reaction
     * @param {string} source - "emoji" or "gif"
     */
    logSelection(context, selected, source = "emoji") {
        if (!selected) return;

        const timestamp = Date.now();

        // Update emoji preferences
        if (selected.emoji) {
            this.#preferences.favoriteEmojis[selected.emoji] =
                (this.#preferences.favoriteEmojis[selected.emoji] || 0) + 1;
        }

        // Update category preferences
        if (selected.keyword) {
            this.#preferences.favoriteCategories[selected.keyword] =
                (this.#preferences.favoriteCategories[selected.keyword] || 0) + 1;
        }

        // Track in history
        this.#preferences.reactionHistory.push({
            contextHash: this.#hashContext(context.transcript),
            selectedEmoji: selected.emoji,
            selectedCategory: selected.keyword,
            source,
            timestamp
        });

        // Prune history if needed
        if (this.#preferences.reactionHistory.length > this.#maxHistorySize) {
            this.#preferences.reactionHistory =
                this.#preferences.reactionHistory.slice(-this.#maxHistorySize);
        }

        // Track skipped reactions (those not selected)
        if (context.suggestions) {
            for (const suggestion of context.suggestions) {
                if (suggestion.emoji !== selected.emoji) {
                    // Increment skip count (at lower rate than selection)
                    this.#preferences.avoidedReactions[suggestion.emoji] =
                        (this.#preferences.avoidedReactions[suggestion.emoji] || 0) + 0.3;
                }
            }
        }

        this.#preferences.lastUpdated = timestamp;
        this.#savePreferences();

        NotificationCenter.default.postNotification(
            PreferenceTracker.Notifications.PreferencesUpdated,
            this,
            { selected, source }
        );
    }

    /**
     * Log when user selects a GIF
     * @param {Object} context - Context including transcript and suggested gifs
     * @param {Object} selectedGif - The GIPHY item selected
     */
    logGifSelection(context, selectedGif) {
        if (!selectedGif) return;

        // Track GIF style preferences (if available from GIPHY tags)
        const tags = selectedGif.tags || [];
        for (const tag of tags.slice(0, 3)) {  // Only first 3 tags
            this.#preferences.favoriteGifStyles[tag] =
                (this.#preferences.favoriteGifStyles[tag] || 0) + 1;
        }

        // Log as gif source
        this.logSelection(context, { emoji: null, keyword: context.category }, "gif");
    }

    /**
     * Adjust reaction rankings based on user preferences
     * @param {Array} suggestions - Original suggestions
     * @returns {Array} Re-ranked suggestions
     */
    adjustRanking(suggestions) {
        if (suggestions.length === 0) return suggestions;

        return suggestions.map(suggestion => {
            let boost = 0;

            // Boost frequently selected emojis
            const emojiCount = this.#preferences.favoriteEmojis[suggestion.emoji] || 0;
            if (emojiCount >= this.#significantSelectionCount) {
                boost += Math.min(0.2, emojiCount * 0.02);  // Max 0.2 boost
            }

            // Boost frequently selected categories
            const categoryCount = this.#preferences.favoriteCategories[suggestion.keyword] || 0;
            if (categoryCount >= this.#significantSelectionCount) {
                boost += Math.min(0.15, categoryCount * 0.015);  // Max 0.15 boost
            }

            // Demote frequently skipped reactions
            const skipCount = this.#preferences.avoidedReactions[suggestion.emoji] || 0;
            if (skipCount >= this.#significantSelectionCount * 2) {
                boost -= Math.min(0.15, skipCount * 0.01);  // Max 0.15 reduction
            }

            return {
                ...suggestion,
                confidence: Math.max(0, Math.min(1, suggestion.confidence + boost)),
                preferenceBoost: boost
            };
        }).sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Get user's favorite emojis
     * @param {number} limit - Max number to return
     * @returns {Array<{emoji: string, count: number}>}
     */
    getFavoriteEmojis(limit = 5) {
        return Object.entries(this.#preferences.favoriteEmojis)
            .map(([emoji, count]) => ({ emoji, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Get user's favorite categories
     * @param {number} limit - Max number to return
     * @returns {Array<{category: string, count: number}>}
     */
    getFavoriteCategories(limit = 5) {
        return Object.entries(this.#preferences.favoriteCategories)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Get user's preferred GIF styles
     * @param {number} limit - Max number to return
     * @returns {Array<{style: string, count: number}>}
     */
    getPreferredGifStyles(limit = 5) {
        return Object.entries(this.#preferences.favoriteGifStyles)
            .map(([style, count]) => ({ style, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Check if user has a preference for a specific emoji
     * @param {string} emoji
     * @returns {boolean}
     */
    prefersEmoji(emoji) {
        const count = this.#preferences.favoriteEmojis[emoji] || 0;
        return count >= this.#significantSelectionCount;
    }

    /**
     * Check if user tends to skip a specific emoji
     * @param {string} emoji
     * @returns {boolean}
     */
    avoidsEmoji(emoji) {
        const skipCount = this.#preferences.avoidedReactions[emoji] || 0;
        const selectCount = this.#preferences.favoriteEmojis[emoji] || 0;
        return skipCount > selectCount * 2 && skipCount >= this.#significantSelectionCount;
    }

    /**
     * Get statistics about user preferences
     * @returns {Object}
     */
    getStats() {
        return {
            totalSelections: this.#preferences.reactionHistory.length,
            uniqueEmojisUsed: Object.keys(this.#preferences.favoriteEmojis).length,
            uniqueCategoriesUsed: Object.keys(this.#preferences.favoriteCategories).length,
            topEmoji: this.getFavoriteEmojis(1)[0]?.emoji,
            topCategory: this.getFavoriteCategories(1)[0]?.category,
            lastUpdated: this.#preferences.lastUpdated
        };
    }

    /**
     * Reset all preferences
     */
    resetPreferences() {
        this.#preferences = {
            favoriteEmojis: {},
            favoriteCategories: {},
            favoriteGifStyles: {},
            avoidedReactions: {},
            reactionHistory: [],
            lastUpdated: null
        };
        this.#savePreferences();

        NotificationCenter.default.postNotification(
            PreferenceTracker.Notifications.PreferencesUpdated,
            this,
            { reset: true }
        );
    }

    /**
     * Export preferences (for backup/sync)
     * @returns {Object} Exportable preferences object
     */
    exportPreferences() {
        return {
            ...this.#preferences,
            exportedAt: Date.now(),
            version: 1
        };
    }

    /**
     * Import preferences (from backup/sync)
     * @param {Object} data - Exported preferences
     * @returns {boolean} Success
     */
    importPreferences(data) {
        if (!data || data.version !== 1) {
            return false;
        }

        try {
            this.#preferences = {
                favoriteEmojis: data.favoriteEmojis || {},
                favoriteCategories: data.favoriteCategories || {},
                favoriteGifStyles: data.favoriteGifStyles || {},
                avoidedReactions: data.avoidedReactions || {},
                reactionHistory: data.reactionHistory || [],
                lastUpdated: Date.now()
            };
            this.#savePreferences();
            return true;
        } catch (err) {
            console.error("PreferenceTracker: Import failed:", err);
            return false;
        }
    }

    /**
     * Hash context for privacy (no raw text stored)
     * @param {string} text
     * @returns {string}
     */
    #hashContext(text) {
        if (!text) return "";

        // Simple hash function (not cryptographic, just for deduplication)
        let hash = 0;
        const str = text.toLowerCase().trim();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;  // Convert to 32bit integer
        }
        return hash.toString(16);
    }

    /**
     * Load preferences from storage
     */
    #loadPreferences() {
        try {
            const stored = SharedUserDefaults.getValueForKey(PreferenceTracker.#STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.#preferences = {
                    favoriteEmojis: parsed.favoriteEmojis || {},
                    favoriteCategories: parsed.favoriteCategories || {},
                    favoriteGifStyles: parsed.favoriteGifStyles || {},
                    avoidedReactions: parsed.avoidedReactions || {},
                    reactionHistory: parsed.reactionHistory || [],
                    lastUpdated: parsed.lastUpdated || null
                };
            }
        } catch (err) {
            console.error("PreferenceTracker: Error loading preferences:", err);
        }
    }

    /**
     * Save preferences to storage
     */
    #savePreferences() {
        try {
            SharedUserDefaults.setValueForKey(
                JSON.stringify(this.#preferences),
                PreferenceTracker.#STORAGE_KEY
            );
        } catch (err) {
            console.error("PreferenceTracker: Error saving preferences:", err);
        }
    }
}

// Create singleton instance
PreferenceTracker.shared = new PreferenceTracker();
