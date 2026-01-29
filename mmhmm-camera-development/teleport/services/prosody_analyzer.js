//
//  services/prosody_analyzer.js
//  mmhmm
//
//  Analyzes audio prosody features (pitch, volume, speed) to detect emotional signals.
//  Combines with text analysis for multimodal emotion detection.
//

/**
 * ProsodyAnalyzer extracts emotional signals from voice characteristics.
 * Uses pitch, volume, speaking speed, and variability to detect emotions.
 *
 * This complements text-based analysis by capturing HOW something is said,
 * not just WHAT is said.
 */
class ProsodyAnalyzer {

    // Singleton instance
    static shared = null;

    /**
     * Emotion signatures based on prosodic features.
     * Each emotion has characteristic patterns in pitch, volume, and speed.
     */
    static EmotionSignatures = Object.freeze({
        excitement: {
            pitch: "high",
            volume: "high",
            speed: "fast",
            variability: "high",
            description: "Fast, loud, high-pitched, variable"
        },
        joy: {
            pitch: "high",
            volume: "medium-high",
            speed: "medium-fast",
            variability: "medium",
            description: "Elevated pitch, moderate speed"
        },
        sadness: {
            pitch: "low",
            volume: "low",
            speed: "slow",
            variability: "low",
            description: "Slow, quiet, low-pitched, flat"
        },
        anger: {
            pitch: "high",
            volume: "high",
            speed: "fast",
            variability: "high",
            description: "Loud, fast, high-pitched, intense"
        },
        frustration: {
            pitch: "medium-high",
            volume: "medium-high",
            speed: "fast",
            variability: "medium",
            description: "Elevated pitch, faster speech"
        },
        calm: {
            pitch: "medium",
            volume: "medium",
            speed: "slow",
            variability: "low",
            description: "Even, measured, steady"
        },
        nervousness: {
            pitch: "high",
            volume: "medium",
            speed: "fast",
            variability: "high",
            description: "Fast, high-pitched, variable"
        },
        confidence: {
            pitch: "medium",
            volume: "medium-high",
            speed: "medium",
            variability: "low",
            description: "Clear, steady, projected"
        },
        surprise: {
            pitch: "high",
            volume: "medium-high",
            speed: "fast",
            variability: "high",
            description: "Sudden pitch jump, gasping"
        },
        boredom: {
            pitch: "low",
            volume: "low",
            speed: "slow",
            variability: "very-low",
            description: "Monotone, slow, quiet"
        },
        empathy: {
            pitch: "medium",
            volume: "medium-low",
            speed: "slow",
            variability: "medium",
            description: "Soft, gentle, measured"
        },
        enthusiasm: {
            pitch: "high",
            volume: "high",
            speed: "fast",
            variability: "high",
            description: "Energetic, loud, fast-paced"
        }
    });

    // User baseline features (calibrated over time)
    #baseline = {
        pitch: 150,       // Hz (average speaking pitch)
        volume: 0.5,      // Normalized RMS
        speed: 3.5,       // Words per second
        calibrated: false
    };

    // Feature history for rolling averages
    #featureHistory = [];
    #maxHistorySize = 20;

    /**
     * Analyze audio features to detect emotional signals
     * @param {Object} audioFeatures - Audio features extracted from audio
     * @param {number} audioFeatures.pitch - Fundamental frequency (Hz)
     * @param {number} audioFeatures.volume - RMS volume (0-1)
     * @param {number} audioFeatures.speed - Speaking rate (words/sec or relative)
     * @param {number} [audioFeatures.variability] - Pitch/volume variability
     * @returns {Object} Analysis result with detected emotions and confidence
     */
    analyzeFeatures(audioFeatures) {
        if (!audioFeatures) {
            return { emotions: [], confidence: 0 };
        }

        // Normalize features relative to baseline
        const normalized = this.#normalizeFeatures(audioFeatures);

        // Categorize each feature
        const pitchLevel = this.#categorizePitch(normalized.pitch);
        const volumeLevel = this.#categorizeVolume(normalized.volume);
        const speedLevel = this.#categorizeSpeed(normalized.speed);
        const variabilityLevel = this.#categorizeVariability(normalized.variability || 0.5);

        // Match against emotion signatures
        const emotions = this.#matchEmotionSignatures(pitchLevel, volumeLevel, speedLevel, variabilityLevel);

        // Update history for baseline calibration
        this.#updateFeatureHistory(audioFeatures);

        return {
            emotions,
            features: {
                pitch: pitchLevel,
                volume: volumeLevel,
                speed: speedLevel,
                variability: variabilityLevel
            },
            normalized
        };
    }

    /**
     * Get emotion hints to boost/adjust text-based matches
     * @param {Object} audioFeatures
     * @returns {string[]} Array of emotion hints
     */
    getEmotionHints(audioFeatures) {
        const result = this.analyzeFeatures(audioFeatures);
        return result.emotions.map(e => e.emotion);
    }

    /**
     * Adjust confidence scores based on prosody alignment
     * @param {Array} suggestions - Reaction suggestions from text analysis
     * @param {Object} audioFeatures - Audio features
     * @returns {Array} Adjusted suggestions
     */
    adjustSuggestionsWithProsody(suggestions, audioFeatures) {
        if (!audioFeatures || suggestions.length === 0) {
            return suggestions;
        }

        const prosodyEmotions = this.getEmotionHints(audioFeatures);

        return suggestions.map(suggestion => {
            let confidenceBoost = 0;

            // Check if the suggestion's emotion matches prosody signals
            const keyword = suggestion.keyword?.toLowerCase();
            if (prosodyEmotions.includes(keyword)) {
                // Strong prosody match - boost confidence
                confidenceBoost = 0.15;
            } else if (this.#isRelatedEmotion(keyword, prosodyEmotions)) {
                // Related emotion - slight boost
                confidenceBoost = 0.08;
            } else if (this.#isContradictoryEmotion(keyword, prosodyEmotions)) {
                // Prosody contradicts text - reduce confidence slightly
                confidenceBoost = -0.05;
            }

            return {
                ...suggestion,
                confidence: Math.max(0, Math.min(1, suggestion.confidence + confidenceBoost)),
                prosodyBoost: confidenceBoost
            };
        });
    }

    /**
     * Normalize features relative to user's baseline
     */
    #normalizeFeatures(features) {
        return {
            pitch: features.pitch / this.#baseline.pitch,
            volume: features.volume / this.#baseline.volume,
            speed: features.speed / this.#baseline.speed,
            variability: features.variability || 0.5
        };
    }

    /**
     * Categorize pitch level
     */
    #categorizePitch(normalizedPitch) {
        if (normalizedPitch > 1.3) return "high";
        if (normalizedPitch > 1.1) return "medium-high";
        if (normalizedPitch < 0.7) return "low";
        if (normalizedPitch < 0.9) return "medium-low";
        return "medium";
    }

    /**
     * Categorize volume level
     */
    #categorizeVolume(normalizedVolume) {
        if (normalizedVolume > 1.4) return "high";
        if (normalizedVolume > 1.15) return "medium-high";
        if (normalizedVolume < 0.6) return "low";
        if (normalizedVolume < 0.85) return "medium-low";
        return "medium";
    }

    /**
     * Categorize speed level
     */
    #categorizeSpeed(normalizedSpeed) {
        if (normalizedSpeed > 1.3) return "fast";
        if (normalizedSpeed > 1.1) return "medium-fast";
        if (normalizedSpeed < 0.7) return "slow";
        if (normalizedSpeed < 0.9) return "medium-slow";
        return "medium";
    }

    /**
     * Categorize variability level
     */
    #categorizeVariability(variability) {
        if (variability > 0.7) return "high";
        if (variability > 0.5) return "medium";
        if (variability < 0.2) return "very-low";
        if (variability < 0.35) return "low";
        return "medium";
    }

    /**
     * Match features against emotion signatures
     */
    #matchEmotionSignatures(pitch, volume, speed, variability) {
        const matches = [];

        for (const [emotion, signature] of Object.entries(ProsodyAnalyzer.EmotionSignatures)) {
            let score = 0;
            let maxScore = 0;

            // Check pitch match
            maxScore += 1;
            if (this.#levelsMatch(pitch, signature.pitch)) {
                score += 1;
            } else if (this.#levelsClose(pitch, signature.pitch)) {
                score += 0.5;
            }

            // Check volume match
            maxScore += 1;
            if (this.#levelsMatch(volume, signature.volume)) {
                score += 1;
            } else if (this.#levelsClose(volume, signature.volume)) {
                score += 0.5;
            }

            // Check speed match
            maxScore += 1;
            if (this.#levelsMatch(speed, signature.speed)) {
                score += 1;
            } else if (this.#levelsClose(speed, signature.speed)) {
                score += 0.5;
            }

            // Check variability match
            maxScore += 1;
            if (this.#levelsMatch(variability, signature.variability)) {
                score += 1;
            } else if (this.#levelsClose(variability, signature.variability)) {
                score += 0.5;
            }

            const confidence = score / maxScore;
            if (confidence >= 0.6) {
                matches.push({ emotion, confidence });
            }
        }

        // Sort by confidence
        return matches.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Check if two levels match exactly
     */
    #levelsMatch(actual, expected) {
        return actual === expected;
    }

    /**
     * Check if two levels are close (adjacent)
     */
    #levelsClose(actual, expected) {
        const levelOrder = ["very-low", "low", "medium-low", "medium", "medium-high", "high"];
        const actualIdx = levelOrder.indexOf(actual);
        const expectedIdx = levelOrder.indexOf(expected);

        // Handle simple levels that don't have medium variants
        if (actualIdx === -1 || expectedIdx === -1) {
            // Simplified check for levels without variants
            const simpleActual = actual.replace("medium-", "").replace("very-", "");
            const simpleExpected = expected.replace("medium-", "").replace("very-", "");
            return simpleActual === simpleExpected;
        }

        return Math.abs(actualIdx - expectedIdx) <= 1;
    }

    /**
     * Check if emotions are related
     */
    #isRelatedEmotion(emotion, prosodyEmotions) {
        const emotionGroups = {
            positive: ["joy", "excitement", "enthusiasm", "confidence", "pride"],
            negative: ["sadness", "frustration", "anger", "disappointment"],
            neutral: ["calm", "thinking", "curiosity"],
            intense: ["excitement", "anger", "surprise", "enthusiasm"]
        };

        for (const group of Object.values(emotionGroups)) {
            if (group.includes(emotion)) {
                return prosodyEmotions.some(pe => group.includes(pe));
            }
        }
        return false;
    }

    /**
     * Check if emotions contradict each other
     */
    #isContradictoryEmotion(emotion, prosodyEmotions) {
        const contradictions = {
            joy: ["sadness", "anger", "frustration"],
            sadness: ["joy", "excitement", "enthusiasm"],
            excitement: ["boredom", "sadness", "calm"],
            calm: ["anger", "excitement", "nervousness"],
            confidence: ["nervousness"]
        };

        const contradicts = contradictions[emotion];
        if (!contradicts) return false;

        return prosodyEmotions.some(pe => contradicts.includes(pe));
    }

    /**
     * Update feature history for baseline calibration
     */
    #updateFeatureHistory(features) {
        this.#featureHistory.push(features);

        if (this.#featureHistory.length > this.#maxHistorySize) {
            this.#featureHistory.shift();
        }

        // Recalibrate baseline after accumulating enough samples
        if (this.#featureHistory.length >= 10 && !this.#baseline.calibrated) {
            this.#calibrateBaseline();
        }
    }

    /**
     * Calibrate baseline from history
     */
    #calibrateBaseline() {
        if (this.#featureHistory.length < 10) return;

        // Calculate median values for robustness
        const pitches = this.#featureHistory.map(f => f.pitch).filter(p => p > 0).sort((a, b) => a - b);
        const volumes = this.#featureHistory.map(f => f.volume).filter(v => v > 0).sort((a, b) => a - b);
        const speeds = this.#featureHistory.map(f => f.speed).filter(s => s > 0).sort((a, b) => a - b);

        if (pitches.length > 0) {
            this.#baseline.pitch = pitches[Math.floor(pitches.length / 2)];
        }
        if (volumes.length > 0) {
            this.#baseline.volume = volumes[Math.floor(volumes.length / 2)];
        }
        if (speeds.length > 0) {
            this.#baseline.speed = speeds[Math.floor(speeds.length / 2)];
        }

        this.#baseline.calibrated = true;
        console.log("ProsodyAnalyzer: Baseline calibrated", this.#baseline);
    }

    /**
     * Manually set baseline values
     * @param {Object} baseline
     */
    setBaseline(baseline) {
        if (baseline.pitch) this.#baseline.pitch = baseline.pitch;
        if (baseline.volume) this.#baseline.volume = baseline.volume;
        if (baseline.speed) this.#baseline.speed = baseline.speed;
        this.#baseline.calibrated = true;
    }

    /**
     * Get current baseline
     * @returns {Object}
     */
    getBaseline() {
        return { ...this.#baseline };
    }

    /**
     * Reset calibration
     */
    resetCalibration() {
        this.#baseline = {
            pitch: 150,
            volume: 0.5,
            speed: 3.5,
            calibrated: false
        };
        this.#featureHistory = [];
    }
}

// Create singleton instance
ProsodyAnalyzer.shared = new ProsodyAnalyzer();
