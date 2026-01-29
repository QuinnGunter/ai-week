//
//  services/intensity_detector.js
//  mmhmm
//
//  Detects sentiment intensity from text.
//  Distinguishes between "I'm happy" and "I'M SO INCREDIBLY HAPPY".
//

/**
 * IntensityDetector analyzes text for emotional intensity markers.
 * Used to boost/reduce reaction confidence based on how strongly
 * the user expresses an emotion.
 *
 * Examples:
 * - "I'm happy" -> neutral intensity (0.5)
 * - "I'm SO happy" -> elevated intensity (0.65)
 * - "I'M SO INCREDIBLY HAPPY" -> high intensity (0.9)
 * - "I'm kinda happy" -> reduced intensity (0.35)
 */
class IntensityDetector {

    // Singleton instance
    static shared = null;

    /**
     * Words that intensify emotion (increase confidence)
     */
    static #INTENSIFIERS = Object.freeze([
        "so", "very", "really", "incredibly", "extremely", "absolutely",
        "totally", "completely", "definitely", "seriously", "super",
        "literally", "genuinely", "truly", "insanely", "ridiculously",
        "unbelievably", "massively", "hugely", "enormously"
    ]);

    /**
     * Words that diminish emotion (decrease confidence)
     */
    static #DIMINISHERS = Object.freeze([
        "kinda", "kind of", "sort of", "a bit", "slightly", "somewhat",
        "maybe", "possibly", "a little", "not that", "not very",
        "barely", "hardly", "mildly", "partially"
    ]);

    /**
     * Emphatic markers that indicate high intensity
     */
    static #EMPHATICS = Object.freeze([
        "!", "!!", "!!!", "omg", "oh my god", "wow", "holy",
        "damn", "dude", "bro", "whoa", "jesus", "yooo"
    ]);

    /**
     * Strong emotion words that inherently carry intensity
     */
    static #STRONG_EMOTION_WORDS = Object.freeze([
        "love", "hate", "amazing", "terrible", "incredible", "awful",
        "fantastic", "horrible", "perfect", "worst", "best", "obsessed",
        "dying", "screaming", "crying", "losing my mind"
    ]);

    /**
     * Detect the intensity of emotion in a transcript.
     *
     * @param {string} transcript - The text to analyze
     * @returns {Object} Intensity analysis result
     *   - score: number (0-1) where 0.5 is neutral
     *   - level: string ("low", "neutral", "elevated", "high")
     *   - adjustedConfidence: function(baseConfidence) -> adjusted confidence
     */
    detectIntensity(transcript) {
        const text = transcript.toLowerCase();
        let score = 0.5; // Start neutral

        // Check for intensifiers
        let intensifierCount = 0;
        for (const intensifier of IntensityDetector.#INTENSIFIERS) {
            if (text.includes(intensifier)) {
                intensifierCount++;
            }
        }
        score += intensifierCount * 0.08;

        // Check for diminishers
        let diminisherCount = 0;
        for (const diminisher of IntensityDetector.#DIMINISHERS) {
            if (text.includes(diminisher)) {
                diminisherCount++;
            }
        }
        score -= diminisherCount * 0.1;

        // Check for emphatic markers
        let emphaticCount = 0;
        for (const emphatic of IntensityDetector.#EMPHATICS) {
            if (text.includes(emphatic)) {
                emphaticCount++;
            }
        }
        score += emphaticCount * 0.12;

        // Check for strong emotion words
        for (const word of IntensityDetector.#STRONG_EMOTION_WORDS) {
            if (text.includes(word)) {
                score += 0.1;
            }
        }

        // Check for ALL CAPS (indicates shouting/emphasis)
        const capsRatio = this.#calculateCapsRatio(transcript);
        if (capsRatio > 0.5 && transcript.length > 5) {
            score += 0.2;
        } else if (capsRatio > 0.3 && transcript.length > 5) {
            score += 0.1;
        }

        // Check for repeated punctuation (!!!, ???, etc.)
        const repeatedPunctuation = /[!?]{2,}/.test(transcript);
        if (repeatedPunctuation) {
            score += 0.15;
        }

        // Check for word elongation (soooo, yesss, etc.)
        const hasElongation = /(.)\1{2,}/.test(text);
        if (hasElongation) {
            score += 0.1;
        }

        // Clamp score to 0-1 range
        score = Math.max(0, Math.min(1, score));

        // Determine level
        let level;
        if (score < 0.35) {
            level = "low";
        } else if (score < 0.55) {
            level = "neutral";
        } else if (score < 0.75) {
            level = "elevated";
        } else {
            level = "high";
        }

        return {
            score,
            level,
            adjustedConfidence: (baseConfidence) => this.adjustConfidence(baseConfidence, score)
        };
    }

    /**
     * Adjust a confidence score based on intensity
     * @param {number} baseConfidence - Original confidence (0-1)
     * @param {number} intensityScore - Intensity score (0-1)
     * @returns {number} Adjusted confidence (0-1)
     */
    adjustConfidence(baseConfidence, intensityScore) {
        // Intensity score of 0.5 is neutral (no change)
        // Higher intensity boosts confidence
        // Lower intensity reduces confidence

        const adjustment = (intensityScore - 0.5) * 0.3; // Max ±0.15 adjustment
        const adjusted = baseConfidence + adjustment;

        return Math.max(0, Math.min(1, adjusted));
    }

    /**
     * Get a descriptive label for the intensity level
     * @param {string} level - Intensity level
     * @returns {string} Descriptive label
     */
    getLevelDescription(level) {
        const descriptions = {
            low: "mild/understated",
            neutral: "normal",
            elevated: "strong",
            high: "very strong/emphatic"
        };
        return descriptions[level] || "normal";
    }

    /**
     * Calculate the ratio of uppercase letters in text
     * @param {string} text
     * @returns {number} Ratio (0-1)
     */
    #calculateCapsRatio(text) {
        const letters = text.replace(/[^a-zA-Z]/g, "");
        if (letters.length === 0) {
            return 0;
        }
        const uppercase = letters.replace(/[^A-Z]/g, "");
        return uppercase.length / letters.length;
    }

    /**
     * Quick check if text has elevated intensity
     * @param {string} transcript
     * @returns {boolean}
     */
    hasElevatedIntensity(transcript) {
        const { level } = this.detectIntensity(transcript);
        return level === "elevated" || level === "high";
    }

    /**
     * Quick check if text has reduced intensity
     * @param {string} transcript
     * @returns {boolean}
     */
    hasReducedIntensity(transcript) {
        const { level } = this.detectIntensity(transcript);
        return level === "low";
    }
}

// Create singleton instance
IntensityDetector.shared = new IntensityDetector();
