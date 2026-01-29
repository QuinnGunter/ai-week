//
//  services/reaction_predictor.js
//  mmhmm
//
//  Predicts likely user reactions based on what others are saying.
//  Enables "pre-loaded" suggestions before the user even speaks.
//

/**
 * ReactionPredictor predicts likely user reactions based on what others say.
 * This enables "negative latency" - having suggestions ready BEFORE the user speaks.
 *
 * Usage:
 * - Listen to SystemAudioService.TranscriptUpdated
 * - Feed other person's speech to predictReactions()
 * - Pre-load suggestions and GIFs for predicted reactions
 */
class ReactionPredictor {

    // Singleton instance
    static shared = null;

    /**
     * Conversation patterns that predict certain reaction types.
     * Maps pattern types to match phrases and predicted reactions.
     */
    static Patterns = Object.freeze({
        // Questions directed at user -> thinking/agreement
        questionPatterns: {
            match: [
                "what do you think", "don't you agree", "right?",
                "isn't it", "sound good?", "wouldn't you say",
                "do you agree", "makes sense?", "you know what i mean"
            ],
            predictedReactions: ["thinking", "agreement", "skeptical"],
            emoji: ["\u{1F914}", "\u{1F44D}", "\u{1F928}"]  // 🤔 👍 🤨
        },

        // Good news -> excitement/congrats
        goodNewsPatterns: {
            match: [
                "got the job", "got promoted", "we won", "it worked",
                "great news", "finally", "i did it", "guess what",
                "amazing news", "incredible", "can't believe it worked"
            ],
            predictedReactions: ["excitement", "joy", "celebration", "congratulations"],
            emoji: ["\u{1F92F}", "\u{1F973}", "\u{1F389}", "\u{1F44F}"]  // 🤯 🥳 🎉 👏
        },

        // Bad news -> empathy/support
        badNewsPatterns: {
            match: [
                "didn't work", "failed", "rejected", "lost",
                "broke up", "passed away", "got fired", "terrible news",
                "awful", "horrible", "disaster", "worst"
            ],
            predictedReactions: ["empathy", "sadness", "support"],
            emoji: ["\u{1F917}", "\u{1F622}", "\u{2764}\u{FE0F}"]  // 🤗 😢 ❤️
        },

        // Jokes/humor -> laughter
        humorPatterns: {
            match: [
                "kidding", "joking", "funny thing", "you'll laugh",
                "plot twist", "hilarious", "ridiculous", "absurd",
                "can you believe", "get this"
            ],
            predictedReactions: ["humor", "laughter", "amusement"],
            emoji: ["\u{1F923}", "\u{1F602}"]  // 🤣 😂
        },

        // Strong opinions -> agreement/disagreement
        opinionPatterns: {
            match: [
                "i think", "i believe", "honestly", "in my opinion",
                "clearly", "obviously", "definitely", "absolutely"
            ],
            predictedReactions: ["agreement", "thinking", "skeptical"],
            emoji: ["\u{1F44D}", "\u{1F914}", "\u{1F928}"]  // 👍 🤔 🤨
        },

        // Complaints/frustration -> empathy/agreement
        frustrationPatterns: {
            match: [
                "so annoying", "can't believe", "ridiculous",
                "frustrating", "unbelievable", "drives me crazy",
                "hate when", "sick of", "fed up"
            ],
            predictedReactions: ["empathy", "frustration", "agreement"],
            emoji: ["\u{1F917}", "\u{1F624}", "\u{1F44D}"]  // 🤗 😤 👍
        },

        // Showing something -> impressed/approval
        showingPatterns: {
            match: [
                "look at this", "check this out", "watch this",
                "look what i", "see this", "take a look"
            ],
            predictedReactions: ["impressed", "excitement", "approval"],
            emoji: ["\u{1F929}", "\u{1F92F}", "\u{1F44D}"]  // 🤩 🤯 👍
        },

        // Awkward/embarrassing -> cringe
        awkwardPatterns: {
            match: [
                "embarrassing", "awkward", "cringy", "so bad",
                "yikes", "oh no", "messed up"
            ],
            predictedReactions: ["cringe", "empathy"],
            emoji: ["\u{1F62C}", "\u{1F917}"]  // 😬 🤗
        },

        // Exciting plans -> anticipation
        plansPatterns: {
            match: [
                "this weekend", "next week", "planning to",
                "going to", "excited about", "looking forward"
            ],
            predictedReactions: ["anticipation", "excitement"],
            emoji: ["\u{1F91E}", "\u{1F929}"]  // 🤞 🤩
        },

        // Cute/adorable content -> love
        cutePatterns: {
            match: [
                "so cute", "adorable", "precious", "baby",
                "puppy", "kitten", "aww"
            ],
            predictedReactions: ["love", "joy"],
            emoji: ["\u{2764}\u{FE0F}", "\u{1F970}"]  // ❤️ 🥰
        }
    });

    /**
     * Predict likely user reactions based on what the other person said
     * @param {string} otherPersonTranscript - What the other person just said
     * @returns {Array<{category: string, confidence: number, emoji: string}>}
     */
    predictReactions(otherPersonTranscript) {
        const text = otherPersonTranscript.toLowerCase();
        const predictions = new Map();  // category -> {confidence, emoji}

        for (const [patternType, config] of Object.entries(ReactionPredictor.Patterns)) {
            const matchCount = config.match.filter(phrase => text.includes(phrase)).length;

            if (matchCount > 0) {
                // Confidence increases with more matches
                const confidence = Math.min(0.9, 0.4 + (matchCount * 0.15));

                // Add each predicted reaction
                config.predictedReactions.forEach((reaction, index) => {
                    const existing = predictions.get(reaction);
                    const emoji = config.emoji[index] || config.emoji[0];

                    if (!existing || existing.confidence < confidence) {
                        predictions.set(reaction, {
                            confidence,
                            emoji,
                            source: patternType
                        });
                    }
                });
            }
        }

        // Sort by confidence and return
        return Array.from(predictions.entries())
            .map(([category, data]) => ({
                category,
                confidence: data.confidence,
                emoji: data.emoji,
                source: data.source
            }))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);  // Top 5 predictions
    }

    /**
     * Get the top predicted reaction
     * @param {string} otherPersonTranscript
     * @returns {{category: string, confidence: number, emoji: string}|null}
     */
    getTopPrediction(otherPersonTranscript) {
        const predictions = this.predictReactions(otherPersonTranscript);
        return predictions[0] || null;
    }

    /**
     * Check if the transcript is likely to elicit a strong reaction
     * @param {string} otherPersonTranscript
     * @returns {boolean}
     */
    isReactionLikely(otherPersonTranscript) {
        const predictions = this.predictReactions(otherPersonTranscript);
        return predictions.length > 0 && predictions[0].confidence >= 0.5;
    }

    /**
     * Get predicted reaction categories (for pre-fetching)
     * @param {string} otherPersonTranscript
     * @returns {string[]} Array of category names
     */
    getPredictedCategories(otherPersonTranscript) {
        const predictions = this.predictReactions(otherPersonTranscript);
        return predictions.map(p => p.category);
    }

    /**
     * Combine predictions from multiple recent transcripts
     * @param {string[]} transcripts - Array of recent transcripts
     * @returns {Array<{category: string, confidence: number, emoji: string}>}
     */
    predictFromHistory(transcripts) {
        const allPredictions = new Map();

        for (const transcript of transcripts) {
            const predictions = this.predictReactions(transcript);

            for (const pred of predictions) {
                const existing = allPredictions.get(pred.category);
                if (!existing || existing.confidence < pred.confidence) {
                    allPredictions.set(pred.category, pred);
                }
            }
        }

        return Array.from(allPredictions.values())
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
    }
}

// Create singleton instance
ReactionPredictor.shared = new ReactionPredictor();
