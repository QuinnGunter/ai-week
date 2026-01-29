//
//  services/reaction_matcher.js
//  mmhmm
//
//  Maps detected speech keywords to reaction suggestions
//

/**
 * @typedef {Object} ReactionSuggestion
 * @property {string} keyword - The keyword that was matched
 * @property {string} [emoji] - Emoji to display
 * @property {string} [text] - Text to display in a speech bubble
 * @property {string} [style] - Text reaction style ID
 * @property {string} [giphyQuery] - Query for GIPHY search
 * @property {number} confidence - Match confidence (0-1)
 * @property {number} timestamp - When this suggestion was created
 */

/**
 * ReactionMatcher maps spoken keywords to appropriate reactions.
 * Supports exact matches, fuzzy matching, and configurable custom mappings.
 */
class ReactionMatcher {

    static Notifications = Object.freeze({
        MappingsChanged: "ReactionMatcher.MappingsChanged"
    });

    // Singleton instance
    static shared = null;

    // Default keyword mappings
    static DefaultMappings = Object.freeze({
        // Agreement/disagreement
        "agree": { emoji: "\u{1F44D}", text: "Agreed!" },
        "agreed": { emoji: "\u{1F44D}", text: "Agreed!" },
        "yes": { emoji: "\u{2705}", text: "Yes!" },
        "yeah": { emoji: "\u{2705}", text: "Yeah!" },
        "yep": { emoji: "\u{2705}" },
        "no": { emoji: "\u{274C}", text: "Nope" },
        "nope": { emoji: "\u{274C}", text: "Nope" },
        "disagree": { emoji: "\u{1F44E}" },

        // Emotions
        "wow": { emoji: "\u{1F62E}", text: "Wow!", giphyQuery: "wow reaction" },
        "funny": { emoji: "\u{1F602}", giphyQuery: "laughing reaction" },
        "hilarious": { emoji: "\u{1F923}", giphyQuery: "laughing hysterical" },
        "laugh": { emoji: "\u{1F602}", giphyQuery: "laughing" },
        "lol": { emoji: "\u{1F602}", giphyQuery: "lol laughing" },
        "love": { emoji: "\u{2764}\u{FE0F}", giphyQuery: "love heart" },
        "hate": { emoji: "\u{1F620}" },
        "angry": { emoji: "\u{1F621}" },
        "sad": { emoji: "\u{1F622}" },
        "happy": { emoji: "\u{1F60A}", giphyQuery: "happy dance" },
        "excited": { emoji: "\u{1F929}", giphyQuery: "excited celebration" },
        "surprised": { emoji: "\u{1F632}" },
        "shocked": { emoji: "\u{1F631}", giphyQuery: "shocked reaction" },
        "confused": { emoji: "\u{1F615}" },
        "thinking": { emoji: "\u{1F914}" },

        // Actions
        "clap": { emoji: "\u{1F44F}", giphyQuery: "applause clapping" },
        "applause": { emoji: "\u{1F44F}", giphyQuery: "standing ovation" },
        "wave": { emoji: "\u{1F44B}" },
        "hello": { emoji: "\u{1F44B}", text: "Hello!" },
        "hi": { emoji: "\u{1F44B}", text: "Hi!" },
        "bye": { emoji: "\u{1F44B}", text: "Bye!" },
        "goodbye": { emoji: "\u{1F44B}", text: "Goodbye!" },

        // Reactions
        "fire": { emoji: "\u{1F525}", giphyQuery: "fire lit" },
        "amazing": { emoji: "\u{1F525}", text: "Amazing!", giphyQuery: "mind blown" },
        "awesome": { emoji: "\u{1F525}", text: "Awesome!", giphyQuery: "awesome reaction" },
        "cool": { emoji: "\u{1F60E}", text: "Cool!" },
        "nice": { emoji: "\u{1F44D}", text: "Nice!" },
        "great": { emoji: "\u{1F44D}", text: "Great!" },
        "perfect": { emoji: "\u{1F44C}", text: "Perfect!" },
        "excellent": { emoji: "\u{2B50}", text: "Excellent!" },

        // Thanks
        "thanks": { emoji: "\u{1F64F}", text: "Thank you!" },
        "thank you": { emoji: "\u{1F64F}", text: "Thank you!" },
        "appreciate": { emoji: "\u{1F64F}", text: "Thanks!" },

        // Questions
        "question": { emoji: "\u{2753}" },
        "what": { emoji: "\u{1F914}" },
        "why": { emoji: "\u{1F914}" },
        "how": { emoji: "\u{1F914}" },

        // Celebration
        "celebrate": { emoji: "\u{1F389}", giphyQuery: "celebration party" },
        "party": { emoji: "\u{1F389}", giphyQuery: "party celebration" },
        "congratulations": { emoji: "\u{1F389}", text: "Congrats!", giphyQuery: "congratulations" },
        "congrats": { emoji: "\u{1F389}", text: "Congrats!", giphyQuery: "congrats celebration" },
        "cheers": { emoji: "\u{1F37B}" },

        // Work
        "good job": { emoji: "\u{1F44F}", text: "Good job!" },
        "well done": { emoji: "\u{1F44F}", text: "Well done!" },
        "bravo": { emoji: "\u{1F44F}", text: "Bravo!" },

        // Miscellaneous
        "wait": { emoji: "\u{270B}", text: "Wait!" },
        "stop": { emoji: "\u{1F6D1}", text: "Stop!" },
        "go": { emoji: "\u{1F7E2}", text: "Go!" },
        "idea": { emoji: "\u{1F4A1}" },
        "exactly": { emoji: "\u{1F3AF}", text: "Exactly!" },
        "right": { emoji: "\u{2705}", text: "Right!" },
        "wrong": { emoji: "\u{274C}", text: "Wrong!" },
        "true": { emoji: "\u{2705}", text: "True!" },
        "false": { emoji: "\u{274C}", text: "False!" },
        "maybe": { emoji: "\u{1F937}" },
        "okay": { emoji: "\u{1F44C}", text: "OK!" },
        "ok": { emoji: "\u{1F44C}", text: "OK!" }
    });

    // Private fields
    #customMappings = {};
    #cooldowns = new Map(); // keyword -> last trigger timestamp
    #cooldownPeriodMs = 5000; // Default 5 second cooldown
    #minConfidence = 0.5;
    #maxSuggestions = 3;

    // Common word variations and synonyms for fuzzy matching
    #synonyms = {
        "laughing": "laugh",
        "crying": "sad",
        "loving": "love",
        "hating": "hate",
        "questioning": "question",
        "celebrating": "celebrate",
        "waving": "wave",
        "clapping": "clap",
        "thinking about": "thinking",
        "that's": "",  // Strip contractions
        "it's": "",
        "i'm": "",
        "you're": ""
    };

    constructor() {
        this.#loadCustomMappings();
    }

    /**
     * Get the current keyword mappings (built-in + custom)
     * @returns {Object} Combined mappings object
     */
    get keywordMappings() {
        return {
            ...ReactionMatcher.DefaultMappings,
            ...this.#customMappings
        };
    }

    /**
     * Get/set the cooldown period in milliseconds
     */
    get cooldownPeriodMs() {
        return this.#cooldownPeriodMs;
    }

    set cooldownPeriodMs(value) {
        this.#cooldownPeriodMs = Math.max(0, value);
    }

    /**
     * Get/set the minimum confidence threshold for matches
     */
    get minConfidence() {
        return this.#minConfidence;
    }

    set minConfidence(value) {
        this.#minConfidence = Math.max(0, Math.min(1, value));
    }

    /**
     * Get/set max suggestions to return
     */
    get maxSuggestions() {
        return this.#maxSuggestions;
    }

    set maxSuggestions(value) {
        this.#maxSuggestions = Math.max(1, value);
    }

    /**
     * Match a transcript against keyword mappings
     * @param {string} transcript - The transcript text to match
     * @returns {ReactionSuggestion[]} Array of matched suggestions, sorted by confidence
     */
    matchTranscript(transcript) {
        if (!transcript || typeof transcript !== "string") {
            return [];
        }

        const normalizedText = this.#normalizeText(transcript);
        const words = normalizedText.split(/\s+/).filter(w => w.length > 0);
        const suggestions = [];
        const now = Date.now();

        // Check for multi-word phrases first
        const mappings = this.keywordMappings;
        for (const keyword in mappings) {
            if (keyword.includes(" ")) {
                // Multi-word keyword
                if (normalizedText.includes(keyword)) {
                    if (this.#checkCooldown(keyword, now)) {
                        const suggestion = this.#createSuggestion(keyword, mappings[keyword], 1.0, now);
                        suggestions.push(suggestion);
                    }
                }
            }
        }

        // Then check single words
        for (const word of words) {
            // Direct match
            if (mappings[word]) {
                if (this.#checkCooldown(word, now)) {
                    const suggestion = this.#createSuggestion(word, mappings[word], 1.0, now);
                    suggestions.push(suggestion);
                }
                continue;
            }

            // Fuzzy match - check for similar words
            const fuzzyMatch = this.#findFuzzyMatch(word, Object.keys(mappings));
            if (fuzzyMatch && this.#checkCooldown(fuzzyMatch.keyword, now)) {
                const suggestion = this.#createSuggestion(
                    fuzzyMatch.keyword,
                    mappings[fuzzyMatch.keyword],
                    fuzzyMatch.confidence,
                    now
                );
                suggestions.push(suggestion);
            }
        }

        // Sort by confidence and limit results
        return suggestions
            .filter(s => s.confidence >= this.#minConfidence)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, this.#maxSuggestions);
    }

    /**
     * Add a custom keyword mapping
     * @param {string} keyword - The keyword to match
     * @param {Object} reaction - The reaction object {emoji, text, style, giphyQuery}
     */
    addCustomMapping(keyword, reaction) {
        const normalizedKeyword = keyword.toLowerCase().trim();
        this.#customMappings[normalizedKeyword] = reaction;
        this.#saveCustomMappings();

        NotificationCenter.default.postNotification(
            ReactionMatcher.Notifications.MappingsChanged,
            this,
            { keyword: normalizedKeyword, reaction }
        );
    }

    /**
     * Remove a custom keyword mapping
     * @param {string} keyword - The keyword to remove
     */
    removeMapping(keyword) {
        const normalizedKeyword = keyword.toLowerCase().trim();

        // Only remove custom mappings, not built-in ones
        if (this.#customMappings[normalizedKeyword]) {
            delete this.#customMappings[normalizedKeyword];
            this.#saveCustomMappings();

            NotificationCenter.default.postNotification(
                ReactionMatcher.Notifications.MappingsChanged,
                this,
                { keyword: normalizedKeyword, removed: true }
            );
        }
    }

    /**
     * Check if a keyword has a mapping
     * @param {string} keyword
     * @returns {boolean}
     */
    hasMapping(keyword) {
        const normalizedKeyword = keyword.toLowerCase().trim();
        return normalizedKeyword in this.keywordMappings;
    }

    /**
     * Get all custom mappings
     * @returns {Object}
     */
    getCustomMappings() {
        return { ...this.#customMappings };
    }

    /**
     * Clear all custom mappings
     */
    clearCustomMappings() {
        this.#customMappings = {};
        this.#saveCustomMappings();

        NotificationCenter.default.postNotification(
            ReactionMatcher.Notifications.MappingsChanged,
            this,
            { cleared: true }
        );
    }

    /**
     * Reset the cooldown for a specific keyword or all keywords
     * @param {string} [keyword] - Optional keyword to reset, or all if not provided
     */
    resetCooldown(keyword = null) {
        if (keyword) {
            this.#cooldowns.delete(keyword.toLowerCase().trim());
        } else {
            this.#cooldowns.clear();
        }
    }

    /**
     * Modifiers to add variety to GIPHY queries
     */
    static #GIPHY_MODIFIERS = Object.freeze([
        "meme", "funny", "reaction", "mood", "relatable", "cute", "iconic", "perfect"
    ]);

    /**
     * Generate varied GIPHY queries based on semantic match and transcript.
     * ALWAYS returns at least one query - this ensures GIFs appear for all reactions.
     *
     * @param {string} transcript - The original transcript text
     * @param {Object} [semanticMatch] - Semantic match result (optional)
     * @param {string[]} [semanticMatch.giphyPatterns] - GIPHY patterns from semantic match
     * @param {string} [semanticMatch.emoji] - Matched emoji
     * @param {string} [semanticMatch.keyword] - Matched keyword
     * @param {string} [semanticMatch.intensityLevel] - Intensity level (low/neutral/elevated/high)
     * @returns {string[]} Array of 1-3 GIPHY search queries
     */
    generateDynamicGiphyQueries(transcript, semanticMatch = null) {
        const queries = [];

        // 1. Random pattern from semantic category (if available)
        if (semanticMatch?.giphyPatterns?.length > 0) {
            const patterns = semanticMatch.giphyPatterns;
            const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];

            // Optionally add variety modifier (30% chance)
            if (Math.random() < 0.3) {
                const modifier = ReactionMatcher.#GIPHY_MODIFIERS[
                    Math.floor(Math.random() * ReactionMatcher.#GIPHY_MODIFIERS.length)
                ];
                queries.push(`${randomPattern} ${modifier}`);
            } else {
                queries.push(randomPattern);
            }
        }

        // 2. Key phrase from transcript + "reaction"
        const keyPhrase = this.#extractKeyPhrase(transcript);
        if (keyPhrase) {
            queries.push(`${keyPhrase} reaction`);
        }

        // 3. Emoji name variation (if we have an emoji)
        const emoji = semanticMatch?.emoji;
        if (emoji) {
            const emojiName = this.#emojiToName(emoji);
            if (emojiName) {
                // Add intensity modifier for elevated/high intensity
                if (semanticMatch?.intensityLevel === "high" || semanticMatch?.intensityLevel === "elevated") {
                    queries.push(`${emojiName} extreme`);
                } else {
                    queries.push(`${emojiName} gif`);
                }
            }
        }

        // 4. Add a "trending" style query for variety (20% chance)
        if (Math.random() < 0.2 && semanticMatch?.keyword) {
            const trendingStyles = ["viral", "iconic", "classic", "best"];
            const style = trendingStyles[Math.floor(Math.random() * trendingStyles.length)];
            queries.push(`${style} ${semanticMatch.keyword} gif`);
        }

        // 5. Fallback: use keyword directly if we have one
        if (semanticMatch?.keyword && queries.length < 3) {
            queries.push(`${semanticMatch.keyword} reaction`);
        }

        // 6. Add context-based variation (for specific emotional categories)
        if (queries.length < 3 && semanticMatch?.keyword) {
            const contextVariations = this.#getContextVariations(semanticMatch.keyword);
            if (contextVariations.length > 0) {
                const randomVariation = contextVariations[Math.floor(Math.random() * contextVariations.length)];
                queries.push(randomVariation);
            }
        }

        // 7. Last resort: use first 3 words of transcript + "reaction"
        if (queries.length === 0) {
            const words = transcript.toLowerCase()
                .replace(/[^\w\s]/g, "")
                .split(/\s+/)
                .filter(w => w.length > 1)
                .slice(0, 3)
                .join(" ");
            if (words) {
                queries.push(`${words} reaction`);
            } else {
                // Absolute fallback
                queries.push("reaction gif");
            }
        }

        // Deduplicate and limit to 3 queries
        return [...new Set(queries)].slice(0, 3);
    }

    /**
     * Get context-specific variations for common reaction keywords
     * @param {string} keyword
     * @returns {string[]}
     */
    #getContextVariations(keyword) {
        const variations = {
            agreement: ["nodding yes", "preach", "exactly right", "so true"],
            humor: ["dying laughing", "lmao reaction", "can't breathe laughing", "hilarious face"],
            excitement: ["freaking out excited", "losing it happy", "jumping joy", "so hyped"],
            empathy: ["sending hugs", "there there", "comfort pat", "feel better"],
            thinking: ["brain loading", "processing gif", "deep thought", "thinking hard"],
            frustration: ["screaming internally", "stress reaction", "annoyed face", "over it"],
            joy: ["happy tears", "so happy dance", "pure joy", "celebrating victory"],
            sadness: ["crying sad", "heartbroken", "disappointed gif", "feeling blue"],
            pride: ["mic drop", "boss moment", "flex gif", "winning reaction"],
            nostalgia: ["memories feels", "throwback vibes", "miss it", "back in day"]
        };

        return variations[keyword] || [];
    }

    /**
     * Extract key phrase from transcript for GIPHY search
     * @param {string} transcript
     * @returns {string|null}
     */
    #extractKeyPhrase(transcript) {
        // Common stop words to filter out
        const stopWords = new Set([
            "i", "me", "my", "we", "our", "you", "your",
            "the", "a", "an", "is", "are", "was", "were",
            "that", "this", "it", "to", "and", "of", "in",
            "for", "on", "with", "at", "by", "be", "have",
            "has", "had", "do", "does", "did", "will", "would",
            "could", "should", "may", "might", "must", "shall",
            "so", "just", "very", "really", "like", "um", "uh"
        ]);

        const words = transcript.toLowerCase()
            .replace(/[^\w\s]/g, "")
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));

        if (words.length === 0) {
            return null;
        }

        // Return first 2 meaningful words
        return words.slice(0, 2).join(" ") || null;
    }

    /**
     * Convert emoji to a searchable name for GIPHY
     * @param {string} emoji
     * @returns {string|null}
     */
    #emojiToName(emoji) {
        const emojiNames = {
            // Agreement/reactions
            "\u{1F44D}": "thumbs up",
            "\u{1F44E}": "thumbs down",
            "\u{1F44F}": "applause clapping",
            "\u{1F44C}": "ok perfect",
            "\u{1F44B}": "wave hello",

            // Faces - happy
            "\u{1F60A}": "happy smile",
            "\u{1F602}": "laughing tears",
            "\u{1F923}": "rolling laughing",
            "\u{1F929}": "star eyes excited",
            "\u{1F973}": "party celebration",
            "\u{1F970}": "love hearts",

            // Faces - negative
            "\u{1F622}": "crying sad",
            "\u{1F62D}": "crying loudly",
            "\u{1F620}": "angry",
            "\u{1F621}": "rage angry",
            "\u{1F624}": "frustrated huffing",
            "\u{1F612}": "unamused bored",

            // Faces - surprised/confused
            "\u{1F62E}": "surprised wow",
            "\u{1F632}": "astonished",
            "\u{1F631}": "screaming shocked",
            "\u{1F62F}": "hushed surprised",
            "\u{1F615}": "confused",
            "\u{1F914}": "thinking hmm",

            // Faces - other
            "\u{1F92F}": "mind blown exploding",
            "\u{1F644}": "eye roll",
            "\u{1F62C}": "grimace awkward",
            "\u{1F928}": "skeptical raised eyebrow",
            "\u{1F917}": "hugging",
            "\u{1F937}": "shrug",
            "\u{1F62E}\u{200D}\u{1F4A8}": "exhale relief",

            // Objects/symbols
            "\u{2764}\u{FE0F}": "heart love",
            "\u{1F525}": "fire lit",
            "\u{1F389}": "party celebration",
            "\u{2B50}": "star",
            "\u{1F4A1}": "lightbulb idea",
            "\u{1F4DD}": "writing note",
            "\u{1F4AC}": "speech bubble",
            "\u{1F680}": "rocket",
            "\u{1F4AA}": "strong muscle",
            "\u{1F91E}": "fingers crossed",

            // Check/X marks
            "\u{2705}": "check yes",
            "\u{274C}": "x no",
            "\u{1F6D1}": "stop sign",
            "\u{1F7E2}": "green circle go",

            // Question/other
            "\u{2753}": "question",
            "\u{1F3AF}": "bullseye target",
            "\u{1F64F}": "prayer thank you",
            "\u{1F37B}": "cheers drinks",
            "\u{270B}": "raised hand stop",
            "\u{1F4AF}": "hundred percent"
        };

        return emojiNames[emoji] ?? null;
    }

    // Private methods

    #normalizeText(text) {
        let normalized = text.toLowerCase().trim();

        // Apply synonym replacements
        for (const [pattern, replacement] of Object.entries(this.#synonyms)) {
            normalized = normalized.replace(new RegExp(pattern, "gi"), replacement);
        }

        // Remove punctuation except apostrophes
        normalized = normalized.replace(/[^\w\s']/g, " ");

        // Collapse multiple spaces
        normalized = normalized.replace(/\s+/g, " ").trim();

        return normalized;
    }

    #checkCooldown(keyword, now) {
        const lastTrigger = this.#cooldowns.get(keyword);

        if (lastTrigger && (now - lastTrigger) < this.#cooldownPeriodMs) {
            return false; // Still in cooldown
        }

        // Update cooldown
        this.#cooldowns.set(keyword, now);
        return true;
    }

    #createSuggestion(keyword, reaction, confidence, timestamp) {
        return {
            keyword,
            emoji: reaction.emoji,
            text: reaction.text,
            style: reaction.style,
            giphyQuery: reaction.giphyQuery,
            confidence,
            timestamp
        };
    }

    #findFuzzyMatch(word, keywords) {
        // Check for prefix matches (e.g., "laugh" matches "laughing")
        for (const keyword of keywords) {
            if (keyword.startsWith(word) || word.startsWith(keyword)) {
                const confidence = Math.min(word.length, keyword.length) /
                                   Math.max(word.length, keyword.length);
                if (confidence >= 0.7) {
                    return { keyword, confidence };
                }
            }
        }

        // Levenshtein distance for close matches
        for (const keyword of keywords) {
            const distance = this.#levenshteinDistance(word, keyword);
            const maxLen = Math.max(word.length, keyword.length);
            const similarity = 1 - (distance / maxLen);

            if (similarity >= 0.8) {
                return { keyword, confidence: similarity };
            }
        }

        return null;
    }

    #levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    #loadCustomMappings() {
        try {
            const stored = SharedUserDefaults.getValueForKey("speechReactionMappings");
            if (stored) {
                this.#customMappings = JSON.parse(stored);
            }
        } catch (err) {
            console.error("Error loading custom mappings:", err);
            this.#customMappings = {};
        }
    }

    #saveCustomMappings() {
        try {
            SharedUserDefaults.setValueForKey(
                JSON.stringify(this.#customMappings),
                "speechReactionMappings"
            );
        } catch (err) {
            console.error("Error saving custom mappings:", err);
        }
    }
}

// Create singleton instance
ReactionMatcher.shared = new ReactionMatcher();
