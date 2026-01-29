//
//  services/speech_reactions_controller.js
//  mmhmm
//
//  Controller that connects speech recognition to reaction display
//

/**
 * Display mode for speech-triggered reactions
 */
const SpeechReactionDisplayMode = Object.freeze({
    Auto: "auto",           // Automatically display reactions
    Suggest: "suggest",     // Only show suggestions in the panel
    Both: "both"            // Both auto-display and show suggestions
});

/**
 * SpeechReactionsController connects SpeechService to ReactionMatcher
 * and displays reactions via LooksController.
 */
class SpeechReactionsController extends ObservableObject {

    static Notifications = Object.freeze({
        SuggestionsAvailable: "SpeechReactionsController.SuggestionsAvailable",
        ReactionDisplayed: "SpeechReactionsController.ReactionDisplayed",
        EnabledChanged: "SpeechReactionsController.EnabledChanged"
    });

    static DisplayMode = SpeechReactionDisplayMode;

    // Singleton instance
    static shared = null;

    // Default settings keys
    static #defaultsKeyEnabled = "speechReactionsEnabled";
    static #defaultsKeyDisplayMode = "speechReactionsDisplayMode";
    static #defaultsKeyAutoDisplayDuration = "speechReactionsAutoDisplayDuration";
    static #defaultsKeyCooldownPeriod = "speechReactionsCooldownPeriod";

    // Private fields
    #enabled = false;
    #displayMode = SpeechReactionDisplayMode.Suggest;
    #autoDisplayDurationMs = 3000;
    #cooldownPeriodMs = 5000;

    #looksController = null;
    #reactionsPanel = null;
    #transcriptObserver = null;

    #currentSuggestions = [];
    #displayQueue = [];
    #isDisplayingReaction = false;
    #displayTimeout = null;

    // GIF suggestion fields
    #giphyClient = null;
    #gifCache = new Map();  // query -> {results, timestamp}
    #gifCacheTTLMs = 60000; // 1 minute cache
    #currentGifSuggestions = [];
    #maxGifQueries = 2;     // Max GIPHY queries per transcript
    #maxGifsTotal = 6;      // Max GIFs to display
    #gifsPerQuery = 3;      // GIFs to fetch per query

    // Semantic matcher fields
    #semanticMatcher = null;
    #semanticMatcherLoading = false;
    #semanticMatchTimeoutMs = 50;  // Max time to wait for semantic match

    // Latency optimization fields
    #speculativeCache = null;      // SpeculativeGifCache instance
    #reactionPredictor = null;     // ReactionPredictor instance
    #intensityDetector = null;     // IntensityDetector instance
    #prosodyAnalyzer = null;       // ProsodyAnalyzer instance
    #preferenceTracker = null;     // PreferenceTracker instance
    #partialTranscriptObserver = null;
    #systemAudioObserver = null;
    #predictiveSuggestions = [];   // Pre-loaded suggestions from predictive mode
    #lastPartialTranscript = "";   // Track to avoid duplicate processing

    // Debouncing and rate limiting
    #partialTranscriptDebounceTimer = null;
    #partialTranscriptDebounceMs = 150;  // Debounce partial transcripts
    #pendingGifFetch = null;             // Track pending GIF fetch to cancel
    #lastGifFetchTime = 0;
    #minGifFetchIntervalMs = 500;        // Min time between GIF fetches
    #mainGifFetchId = 0;                 // ID to track/cancel main GIF fetches
    #isMainGifFetchPending = false;      // Prevent concurrent main fetches

    constructor() {
        super();

        // Disable automatic notification for properties we'll manually control
        this.automaticallyNotifiesObserversOfEnabled = false;
        this.automaticallyNotifiesObserversOfDisplayMode = false;

        // Load settings
        this.#loadSettings();

        // Set up speech service observer
        this.#setupSpeechObserver();

        // Preload Whisper model if user previously enabled the feature
        // This eliminates the ~40MB download wait when re-enabling
        this.#preloadModelIfPreviouslyEnabled();
    }

    // Observable properties

    get enabled() {
        return this.#enabled;
    }

    set enabled(value) {
        const previous = this.#enabled;
        if (value === previous) return;

        this.#enabled = value;
        this.didChangeValueForProperty(value, "enabled", previous);

        SharedUserDefaults.setValueForKey(value, SpeechReactionsController.#defaultsKeyEnabled);

        if (value) {
            this.#start();
        } else {
            this.#stop();
        }

        NotificationCenter.default.postNotification(
            SpeechReactionsController.Notifications.EnabledChanged,
            this,
            { enabled: value }
        );
    }

    get displayMode() {
        return this.#displayMode;
    }

    set displayMode(value) {
        const previous = this.#displayMode;
        if (value === previous) return;

        if (!Object.values(SpeechReactionDisplayMode).includes(value)) {
            console.error("Invalid display mode:", value);
            return;
        }

        this.#displayMode = value;
        this.didChangeValueForProperty(value, "displayMode", previous);

        SharedUserDefaults.setValueForKey(value, SpeechReactionsController.#defaultsKeyDisplayMode);
    }

    get autoDisplayDurationMs() {
        return this.#autoDisplayDurationMs;
    }

    set autoDisplayDurationMs(value) {
        this.#autoDisplayDurationMs = Math.max(1000, Math.min(10000, value));
        SharedUserDefaults.setValueForKey(
            this.#autoDisplayDurationMs,
            SpeechReactionsController.#defaultsKeyAutoDisplayDuration
        );
    }

    get cooldownPeriodMs() {
        return this.#cooldownPeriodMs;
    }

    set cooldownPeriodMs(value) {
        this.#cooldownPeriodMs = Math.max(0, value);
        SharedUserDefaults.setValueForKey(
            this.#cooldownPeriodMs,
            SpeechReactionsController.#defaultsKeyCooldownPeriod
        );

        // Update the reaction matcher's cooldown too
        if (ReactionMatcher.shared) {
            ReactionMatcher.shared.cooldownPeriodMs = this.#cooldownPeriodMs;
        }
    }

    get currentSuggestions() {
        return [...this.#currentSuggestions];
    }

    get currentGifSuggestions() {
        return [...this.#currentGifSuggestions];
    }

    get isListening() {
        return SpeechService.shared?.isListening ?? false;
    }

    get isModelLoaded() {
        return SpeechService.shared?.isModelLoaded ?? false;
    }

    /**
     * Set the LooksController instance for displaying reactions
     * @param {LooksController} controller
     */
    setLooksController(controller) {
        this.#looksController = controller;
    }

    /**
     * Set the ReactionsPanel instance for showing suggestions
     * @param {ReactionsPanel} panel
     */
    setReactionsPanel(panel) {
        this.#reactionsPanel = panel;
    }

    /**
     * Enable speech reactions
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable speech reactions
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Toggle enabled state
     */
    toggle() {
        this.enabled = !this.enabled;
    }

    /**
     * Load the Whisper model if not already loaded
     * @param {string} modelSize - 'tiny' or 'base'
     */
    async loadModel(modelSize = SpeechService.ModelSize.Tiny) {
        return SpeechService.shared?.loadModel(modelSize);
    }

    /**
     * Manually trigger a reaction from a suggestion
     * @param {ReactionSuggestion} suggestion
     */
    async displaySuggestion(suggestion) {
        if (!suggestion) return;

        if (suggestion.emoji) {
            await this.#displayEmojiReaction(suggestion.emoji);
        } else if (suggestion.text) {
            await this.#displayTextReaction(suggestion.text, suggestion.style);
        }
    }

    /**
     * Clear current suggestions
     */
    clearSuggestions() {
        this.#currentSuggestions = [];
        this.#currentGifSuggestions = [];
        this.#reactionsPanel?.clearSpeechSuggestions?.();
    }

    /**
     * Get a GIF suggestion by its GIPHY ID
     * @param {string} giphyId - The GIPHY item ID
     * @returns {Object|null} The GIF suggestion object or null
     */
    getGifSuggestionById(giphyId) {
        return this.#currentGifSuggestions.find(gif => gif.id === giphyId) || null;
    }

    /**
     * Display a GIF reaction from a suggestion
     * @param {Object} gifSuggestion - The GIPHY item to display
     */
    async displayGifReaction(gifSuggestion) {
        if (!gifSuggestion || !this.#looksController) {
            console.warn("Cannot display GIF reaction - missing data or controller");
            return;
        }

        try {
            // Create media from the GIPHY item
            const giphyClient = this.#getGiphyClient();
            const media = giphyClient.newMediaForItem(gifSuggestion);

            if (!media) {
                console.error("Failed to create media from GIPHY item");
                return;
            }

            // Display using LooksController's temporary reaction method
            await this.#looksController.displayTemporaryReaction?.(
                media,
                this.#autoDisplayDurationMs
            );

            // Send analytics
            giphyClient.sendAnalytics(gifSuggestion);

            NotificationCenter.default.postNotification(
                SpeechReactionsController.Notifications.ReactionDisplayed,
                this,
                { type: "gif", giphyId: gifSuggestion.id }
            );

        } catch (err) {
            console.error("Error displaying GIF reaction:", err);
        }
    }

    // Private methods

    #loadSettings() {
        this.#enabled = SharedUserDefaults.getValueForKey(
            SpeechReactionsController.#defaultsKeyEnabled,
            false
        );

        this.#displayMode = SharedUserDefaults.getValueForKey(
            SpeechReactionsController.#defaultsKeyDisplayMode,
            SpeechReactionDisplayMode.Suggest
        );

        this.#autoDisplayDurationMs = SharedUserDefaults.getValueForKey(
            SpeechReactionsController.#defaultsKeyAutoDisplayDuration,
            3000
        );

        this.#cooldownPeriodMs = SharedUserDefaults.getValueForKey(
            SpeechReactionsController.#defaultsKeyCooldownPeriod,
            5000
        );

        // Sync cooldown with ReactionMatcher
        if (ReactionMatcher.shared) {
            ReactionMatcher.shared.cooldownPeriodMs = this.#cooldownPeriodMs;
        }
    }

    /**
     * Preload the Whisper model during idle time if the user previously
     * enabled speech reactions. This eliminates the initial wait time
     * when the feature is re-enabled.
     */
    #preloadModelIfPreviouslyEnabled() {
        // Only preload if user previously had the feature enabled
        const wasEnabled = SharedUserDefaults.getValueForKey(
            SpeechReactionsController.#defaultsKeyEnabled,
            false
        );

        if (!wasEnabled) {
            return;
        }

        // Use requestIdleCallback to avoid blocking app startup
        const doPreload = () => {
            // Preload Whisper model
            SpeechService.shared?.preloadModel?.()
                .then((success) => {
                    if (success) {
                        console.log("Speech reactions: Whisper model preloaded during idle time");
                    }
                })
                .catch((err) => {
                    console.warn("Speech reactions: Whisper preload failed:", err);
                });

            // Also preload semantic matcher
            this.#preloadSemanticMatcher();
        };

        if (typeof requestIdleCallback === "function") {
            requestIdleCallback(doPreload, { timeout: 10000 });
        } else {
            // Fallback: delay preload to not block initial rendering
            setTimeout(doPreload, 2000);
        }
    }

    /**
     * Preload the semantic matcher during idle time
     */
    async #preloadSemanticMatcher() {
        if (this.#semanticMatcher?.isLoaded || this.#semanticMatcherLoading) {
            return;
        }

        this.#semanticMatcherLoading = true;

        try {
            // Dynamically import SemanticMatcher
            const { SemanticMatcher } = await import("./semantic_matcher.js");

            this.#semanticMatcher = new SemanticMatcher();
            await this.#semanticMatcher.load((progress, status) => {
                console.log(`SemanticMatcher: ${status} (${progress}%)`);
            });

            console.log("Speech reactions: Semantic matcher preloaded");
        } catch (err) {
            console.warn("Speech reactions: Semantic matcher preload failed:", err);
            this.#semanticMatcher = null;
        } finally {
            this.#semanticMatcherLoading = false;
        }
    }

    #setupSpeechObserver() {
        // Observe transcript changes from SpeechService
        this.#transcriptObserver = (info, name, object) => {
            if (!this.#enabled) return;

            const transcript = info?.transcript;
            if (transcript) {
                this.#handleTranscript(transcript);
            }
        };

        NotificationCenter.default.addObserver(
            SpeechService.Notifications.TranscriptUpdated,
            null,
            this.#transcriptObserver,
            this
        );

        // Observe PARTIAL transcripts for faster reaction suggestions
        this.#partialTranscriptObserver = (info, name, object) => {
            if (!this.#enabled) return;

            const partialTranscript = info?.partialTranscript;
            if (partialTranscript) {
                this.#handlePartialTranscript(partialTranscript);
            }
        };

        NotificationCenter.default.addObserver(
            SpeechService.Notifications.PartialTranscript,
            null,
            this.#partialTranscriptObserver,
            this
        );

        // Observe OTHER person's speech for predictive mode (if SystemAudioService is available)
        if (typeof SystemAudioService !== "undefined" && SystemAudioService.Notifications) {
            this.#systemAudioObserver = (info, name, object) => {
                if (!this.#enabled) return;

                const transcript = info?.transcript;
                if (transcript) {
                    this.#handleOtherPersonSpeech(transcript);
                }
            };

            NotificationCenter.default.addObserver(
                SystemAudioService.Notifications.TranscriptUpdated,
                null,
                this.#systemAudioObserver,
                this
            );
        }
    }

    /**
     * Handle partial transcript for faster reaction matching.
     * Uses only rule-based matching (skip slow semantic) for speed.
     * Debounced to prevent rapid-fire processing.
     * @param {string} partialTranscript
     */
    #handlePartialTranscript(partialTranscript) {
        // Avoid duplicate processing
        if (partialTranscript === this.#lastPartialTranscript) {
            return;
        }
        this.#lastPartialTranscript = partialTranscript;

        // Debounce to prevent rapid-fire processing
        if (this.#partialTranscriptDebounceTimer) {
            clearTimeout(this.#partialTranscriptDebounceTimer);
        }

        this.#partialTranscriptDebounceTimer = setTimeout(() => {
            this.#processPartialTranscript(partialTranscript);
        }, this.#partialTranscriptDebounceMs);
    }

    /**
     * Actually process the partial transcript (called after debounce)
     * @param {string} partialTranscript
     */
    #processPartialTranscript(partialTranscript) {
        // Quick rule-based match only (skip slow semantic matching)
        const quickMatches = ReactionMatcher.shared?.matchTranscript(partialTranscript) ?? [];

        if (quickMatches.length > 0) {
            // Show emoji suggestions immediately
            this.#currentSuggestions = quickMatches;
            this.#showSuggestionsInPanel(quickMatches, [], true);

            // Start GIF fetch speculatively using cached GIFs if available
            const topMatch = quickMatches[0];
            const cachedGifs = this.#speculativeCache?.getFromCache(topMatch.keyword);

            if (cachedGifs && cachedGifs.length > 0) {
                // Use cached GIFs immediately
                this.#currentGifSuggestions = cachedGifs;
                this.#showSuggestionsInPanel(quickMatches, cachedGifs, false);
            } else {
                // Fetch GIFs in background (rate limited)
                this.#speculativeFetchGifs(topMatch);
            }

            // Notify about partial suggestions
            NotificationCenter.default.postNotification(
                SpeechReactionsController.Notifications.SuggestionsAvailable,
                this,
                { suggestions: quickMatches, gifSuggestions: cachedGifs || [], gifsLoading: !cachedGifs }
            );
        }
    }

    /**
     * Handle other person's speech for predictive mode.
     * Predicts what user might react with and pre-loads suggestions.
     * @param {string} transcript - What the other person said
     */
    async #handleOtherPersonSpeech(transcript) {
        // Get predictor instance
        const predictor = this.#getReactionPredictor();
        if (!predictor) {
            return;
        }

        // Predict what user might react with
        const predictions = predictor.predictReactions(transcript);

        if (predictions.length > 0) {
            // Store predictive suggestions (dimmed until user speaks)
            this.#predictiveSuggestions = predictions.map(p => ({
                keyword: p.category,
                emoji: p.emoji,
                confidence: p.confidence,
                source: "predictive",
                timestamp: Date.now()
            }));

            // Pre-fetch GIFs for predicted categories
            const categories = predictions.map(p => p.category);
            const speculativeCache = this.#getSpeculativeCache();
            await speculativeCache?.prefetchCategories(categories);

            // Optionally show "ghost" suggestions (UI can dim these)
            // This is commented out by default - enable for more aggressive predictive mode
            // this.#showPredictiveSuggestions(predictions);

            console.log(`Predictive mode: Prepared ${predictions.length} reactions for likely response`);
        }
    }

    /**
     * Speculatively fetch GIFs for a reaction match.
     * Rate limited and cancels pending requests.
     * @param {Object} match - The reaction match
     */
    async #speculativeFetchGifs(match) {
        if (!match?.keyword) {
            return;
        }

        // Rate limit GIF fetches
        const now = Date.now();
        if (now - this.#lastGifFetchTime < this.#minGifFetchIntervalMs) {
            return;
        }
        this.#lastGifFetchTime = now;

        // Cancel any pending GIF fetch
        if (this.#pendingGifFetch) {
            this.#giphyClient?.cancelPendingRequests?.();
            this.#pendingGifFetch = null;
        }

        try {
            const giphyClient = this.#getGiphyClient();
            const query = match.giphyQuery || `${match.keyword} reaction`;

            // Track this fetch so we can cancel it
            this.#pendingGifFetch = query;

            const gifs = await giphyClient.searchGIFs(query, this.#gifsPerQuery);

            // Only update if this is still the current pending fetch
            if (this.#pendingGifFetch === query && gifs && gifs.length > 0) {
                this.#currentGifSuggestions = gifs;
                this.#showSuggestionsInPanel(this.#currentSuggestions, gifs, false);

                NotificationCenter.default.postNotification(
                    SpeechReactionsController.Notifications.SuggestionsAvailable,
                    this,
                    { suggestions: this.#currentSuggestions, gifSuggestions: gifs, gifsLoading: false }
                );
            }
        } catch (err) {
            // Ignore abort errors (expected when we cancel)
            if (err?.name !== "AbortError") {
                console.error("Error in speculative GIF fetch:", err);
            }
        } finally {
            this.#pendingGifFetch = null;
        }
    }

    /**
     * Get or create the speculative cache instance
     * @returns {SpeculativeGifCache|null}
     */
    #getSpeculativeCache() {
        if (!this.#speculativeCache && typeof SpeculativeGifCache !== "undefined") {
            this.#speculativeCache = SpeculativeGifCache.shared || new SpeculativeGifCache();
            this.#speculativeCache.setGiphyClient(this.#getGiphyClient());
        }
        return this.#speculativeCache;
    }

    /**
     * Get or create the reaction predictor instance
     * @returns {ReactionPredictor|null}
     */
    #getReactionPredictor() {
        if (!this.#reactionPredictor && typeof ReactionPredictor !== "undefined") {
            this.#reactionPredictor = ReactionPredictor.shared || new ReactionPredictor();
        }
        return this.#reactionPredictor;
    }

    #start() {
        // Start the speech service
        SpeechService.shared?.startListening();

        // Ensure semantic matcher is loaded
        if (!this.#semanticMatcher?.isLoaded && !this.#semanticMatcherLoading) {
            this.#preloadSemanticMatcher();
        }
    }

    #stop() {
        // Stop the speech service
        SpeechService.shared?.stopListening();

        // Clear any pending displays
        this.#clearDisplayQueue();
        this.clearSuggestions();
    }

    async #handleTranscript(transcript) {
        // Run semantic and rule-based matching in parallel
        const [semanticMatches, ruleMatches] = await Promise.all([
            this.#getSemanticMatches(transcript),
            Promise.resolve(ReactionMatcher.shared?.matchTranscript(transcript) ?? [])
        ]);

        // Merge suggestions - prefer high-confidence semantic matches
        let suggestions = this.#mergeSuggestions(semanticMatches, ruleMatches, transcript);

        if (suggestions.length === 0) {
            return;
        }

        // Apply user preference-based personalization
        suggestions = this.#applyPersonalization(suggestions);

        this.#currentSuggestions = suggestions;
        this.#currentGifSuggestions = [];

        // Notify about available suggestions (emoji only, GIFs loading)
        NotificationCenter.default.postNotification(
            SpeechReactionsController.Notifications.SuggestionsAvailable,
            this,
            { suggestions, gifSuggestions: [], gifsLoading: true }
        );

        // Handle based on display mode
        const mode = this.#displayMode;

        if (mode === SpeechReactionDisplayMode.Auto || mode === SpeechReactionDisplayMode.Both) {
            // Queue the first suggestion for auto-display
            this.#queueForDisplay(suggestions[0]);
        }

        if (mode === SpeechReactionDisplayMode.Suggest || mode === SpeechReactionDisplayMode.Both) {
            // Show emoji suggestions immediately
            this.#showSuggestionsInPanel(suggestions, [], true);

            // Cancel any pending GIF fetch and start a new one
            this.#giphyClient?.cancelPendingRequests?.();
            this.#mainGifFetchId++;
            const currentFetchId = this.#mainGifFetchId;

            // Skip if already fetching (prevent pile-up)
            if (this.#isMainGifFetchPending) {
                return;
            }
            this.#isMainGifFetchPending = true;

            // KEY CHANGE: Always fetch GIFs using dynamic query generation
            // This ensures GIFs appear for ALL reactions, not just those with predefined giphyQuery
            this.#fetchGifsForSuggestionsWithDynamicQueries(suggestions, semanticMatches?.[0], transcript)
                .then(gifSuggestions => {
                    // Only update if this fetch is still current (not stale)
                    if (currentFetchId !== this.#mainGifFetchId) {
                        return;
                    }

                    this.#currentGifSuggestions = gifSuggestions;

                    // Update panel with GIF suggestions
                    this.#showSuggestionsInPanel(suggestions, gifSuggestions, false);

                    // Notify about GIF suggestions
                    NotificationCenter.default.postNotification(
                        SpeechReactionsController.Notifications.SuggestionsAvailable,
                        this,
                        { suggestions, gifSuggestions, gifsLoading: false }
                    );
                })
                .catch(err => {
                    // Ignore cancellation errors
                    if (currentFetchId === this.#mainGifFetchId) {
                        console.error("Error fetching GIF suggestions:", err);
                        // Update panel to hide loading state
                        this.#showSuggestionsInPanel(suggestions, [], false);
                    }
                })
                .finally(() => {
                    if (currentFetchId === this.#mainGifFetchId) {
                        this.#isMainGifFetchPending = false;
                    }
                });
        }
    }

    /**
     * Get semantic matches with timeout protection
     * @param {string} transcript
     * @returns {Promise<Array|null>}
     */
    async #getSemanticMatches(transcript) {
        // If semantic matcher isn't loaded yet, try to load it
        if (!this.#semanticMatcher?.isLoaded && !this.#semanticMatcherLoading) {
            // Start loading in background but don't wait
            this.#preloadSemanticMatcher();
            return null;
        }

        if (!this.#semanticMatcher?.isLoaded) {
            return null;
        }

        try {
            // Use a timeout to avoid blocking if matching takes too long
            return await Promise.race([
                this.#semanticMatcher.matchTranscript(transcript),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("timeout")), this.#semanticMatchTimeoutMs)
                )
            ]);
        } catch (err) {
            // Timeout or error - silently fall back to rule-based matching
            if (err.message !== "timeout") {
                console.warn("Semantic matching error:", err);
            }
            return null;
        }
    }

    /**
     * Merge semantic and rule-based suggestions
     * @param {Array|null} semanticMatches - Semantic match results
     * @param {Array} ruleMatches - Rule-based match results
     * @param {string} transcript - Original transcript
     * @returns {Array} Merged suggestions
     */
    #mergeSuggestions(semanticMatches, ruleMatches, transcript) {
        const results = [];
        const seenEmojis = new Set();

        // Detect intensity to adjust confidence scores
        const intensityDetector = this.#getIntensityDetector();
        const intensityResult = intensityDetector?.detectIntensity(transcript);
        const adjustConfidence = intensityResult?.adjustedConfidence || ((c) => c);

        // High-confidence semantic match takes priority (threshold: 0.65)
        if (semanticMatches?.[0]?.confidence > 0.65) {
            const match = semanticMatches[0];
            const categoryName = match.category.split(".")[1];
            const adjustedConfidence = adjustConfidence(match.confidence);

            results.push({
                keyword: categoryName,
                emoji: match.emoji,
                giphyQuery: match.giphyPatterns?.[0],
                giphyPatterns: match.giphyPatterns,
                confidence: adjustedConfidence,
                intensityLevel: intensityResult?.level,
                source: "semantic",
                timestamp: Date.now()
            });
            seenEmojis.add(match.emoji);
        }

        // Add rule-based matches (if emoji not already added)
        if (ruleMatches?.length > 0) {
            for (const match of ruleMatches) {
                if (!seenEmojis.has(match.emoji)) {
                    const adjustedConfidence = adjustConfidence(match.confidence);
                    results.push({
                        ...match,
                        confidence: adjustedConfidence,
                        intensityLevel: intensityResult?.level,
                        source: "rule"
                    });
                    seenEmojis.add(match.emoji);
                }
            }
        }

        // If we have semantic matches but they were below threshold, add as lower priority
        if (results.length === 0 && semanticMatches?.length > 0) {
            const match = semanticMatches[0];
            const categoryName = match.category.split(".")[1];
            const adjustedConfidence = adjustConfidence(match.confidence);

            results.push({
                keyword: categoryName,
                emoji: match.emoji,
                giphyQuery: match.giphyPatterns?.[0],
                giphyPatterns: match.giphyPatterns,
                confidence: adjustedConfidence,
                intensityLevel: intensityResult?.level,
                source: "semantic-low",
                timestamp: Date.now()
            });
        }

        // Sort by adjusted confidence and limit to top 3 suggestions
        return results
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3);
    }

    /**
     * Get or create the intensity detector instance
     * @returns {IntensityDetector|null}
     */
    #getIntensityDetector() {
        if (!this.#intensityDetector && typeof IntensityDetector !== "undefined") {
            this.#intensityDetector = IntensityDetector.shared || new IntensityDetector();
        }
        return this.#intensityDetector;
    }

    /**
     * Get or create the prosody analyzer instance
     * @returns {ProsodyAnalyzer|null}
     */
    #getProsodyAnalyzer() {
        if (!this.#prosodyAnalyzer && typeof ProsodyAnalyzer !== "undefined") {
            this.#prosodyAnalyzer = ProsodyAnalyzer.shared || new ProsodyAnalyzer();
        }
        return this.#prosodyAnalyzer;
    }

    /**
     * Get or create the preference tracker instance
     * @returns {PreferenceTracker|null}
     */
    #getPreferenceTracker() {
        if (!this.#preferenceTracker && typeof PreferenceTracker !== "undefined") {
            this.#preferenceTracker = PreferenceTracker.shared || new PreferenceTracker();
        }
        return this.#preferenceTracker;
    }

    /**
     * Apply personalization to suggestions based on user preferences
     * @param {Array} suggestions
     * @returns {Array} Personalized suggestions
     */
    #applyPersonalization(suggestions) {
        const preferenceTracker = this.#getPreferenceTracker();
        if (!preferenceTracker) {
            return suggestions;
        }
        return preferenceTracker.adjustRanking(suggestions);
    }

    /**
     * Log user's reaction selection for personalization
     * @param {Object} suggestion - The selected suggestion
     * @param {string} source - "emoji" or "gif"
     */
    logReactionSelection(suggestion, source = "emoji") {
        const preferenceTracker = this.#getPreferenceTracker();
        if (preferenceTracker) {
            preferenceTracker.logSelection(
                {
                    transcript: this.#lastPartialTranscript,
                    suggestions: this.#currentSuggestions
                },
                suggestion,
                source
            );
        }
    }

    /**
     * Log user's GIF selection for personalization
     * @param {Object} gifSuggestion - The selected GIF
     */
    logGifSelection(gifSuggestion) {
        const preferenceTracker = this.#getPreferenceTracker();
        if (preferenceTracker && gifSuggestion) {
            preferenceTracker.logGifSelection(
                {
                    transcript: this.#lastPartialTranscript,
                    category: this.#currentSuggestions[0]?.keyword
                },
                gifSuggestion
            );
        }
    }

    /**
     * Fetch GIFs using dynamic query generation - ensures GIFs appear for ALL reactions.
     * Now includes conversation context from ConversationBuffer for smarter queries.
     * @param {Array} suggestions - Reaction suggestions
     * @param {Object|null} topSemanticMatch - Top semantic match (if any)
     * @param {string} transcript - Original transcript
     * @returns {Promise<Array>}
     */
    async #fetchGifsForSuggestionsWithDynamicQueries(suggestions, topSemanticMatch, transcript) {
        if (suggestions.length === 0) {
            return [];
        }

        // Get conversation context from ConversationBuffer
        const conversationTopics = this.#getConversationTopics();

        // Generate context-aware queries if we have conversation context
        let queries;
        if (conversationTopics.length > 0) {
            queries = this.#generateContextAwareQueries(
                transcript,
                conversationTopics,
                suggestions[0],
                topSemanticMatch
            );
        } else {
            // Fall back to standard dynamic query generation
            const matchContext = {
                giphyPatterns: topSemanticMatch?.giphyPatterns || suggestions[0]?.giphyPatterns,
                emoji: suggestions[0]?.emoji,
                keyword: suggestions[0]?.keyword,
                giphyQuery: suggestions[0]?.giphyQuery
            };
            queries = ReactionMatcher.shared?.generateDynamicGiphyQueries(transcript, matchContext) ?? [];
        }

        if (queries.length === 0) {
            // Fallback: use the first suggestion's giphyQuery if available
            if (suggestions[0]?.giphyQuery) {
                queries.push(suggestions[0].giphyQuery);
            } else {
                // Last resort fallback
                queries.push("reaction gif");
            }
        }

        // Fetch GIFs for each query
        const allGifs = [];
        const giphyClient = this.#getGiphyClient();

        for (const query of queries.slice(0, this.#maxGifQueries)) {
            try {
                const gifs = await this.#fetchGifsWithCache(query, this.#gifsPerQuery);
                allGifs.push(...gifs);

                // Stop if we have enough
                if (allGifs.length >= this.#maxGifsTotal) {
                    break;
                }
            } catch (err) {
                console.error("Error fetching GIFs for query:", query, err);
            }
        }

        // Deduplicate by ID and limit total
        const seenIds = new Set();
        const uniqueGifs = [];
        for (const gif of allGifs) {
            if (!seenIds.has(gif.id) && uniqueGifs.length < this.#maxGifsTotal) {
                seenIds.add(gif.id);
                uniqueGifs.push(gif);
            }
        }

        return uniqueGifs;
    }

    /**
     * Get conversation topics from other speakers via ConversationBuffer
     * @returns {string[]} Array of topic keywords
     */
    #getConversationTopics() {
        if (typeof ConversationBuffer === "undefined" || !ConversationBuffer.shared) {
            return [];
        }
        return ConversationBuffer.shared.extractOtherSpeakerTopics(15000) ?? [];
    }

    /**
     * Generate context-aware GIPHY queries using conversation context.
     * Combines topics from other speakers with user's reaction sentiment.
     *
     * Example:
     *   Other says: "I just bought a new car"
     *   User says: "that's really cool"
     *   Result: ["car cool", "new car reaction", "excited car"]
     *
     * @param {string} userTranscript - The user's transcript
     * @param {string[]} conversationTopics - Topics from other speakers
     * @param {Object} suggestion - Top reaction suggestion
     * @param {Object|null} semanticMatch - Semantic match result
     * @returns {string[]} Array of context-aware GIPHY queries
     */
    #generateContextAwareQueries(userTranscript, conversationTopics, suggestion, semanticMatch) {
        const queries = [];

        // Get the sentiment/reaction from the user's speech
        const sentiment = semanticMatch?.giphyPatterns?.[0] ||
                          suggestion?.giphyQuery ||
                          suggestion?.keyword ||
                          "reaction";

        // Priority 1: Top conversation topic + reaction sentiment
        // e.g., "car excited" or "new car cool"
        if (conversationTopics.length > 0) {
            const topTopic = conversationTopics[0];
            queries.push(`${topTopic} ${sentiment}`);
        }

        // Priority 2: Multiple topics combined + "reaction"
        // e.g., "new car reaction"
        if (conversationTopics.length >= 2) {
            queries.push(`${conversationTopics.slice(0, 2).join(" ")} reaction`);
        } else if (conversationTopics.length === 1) {
            queries.push(`${conversationTopics[0]} reaction`);
        }

        // Priority 3: Semantic match patterns (if available)
        if (semanticMatch?.giphyPatterns?.length > 0) {
            const randomPattern = semanticMatch.giphyPatterns[
                Math.floor(Math.random() * semanticMatch.giphyPatterns.length)
            ];
            queries.push(randomPattern);
        }

        // Priority 4: Fallback to standard dynamic queries
        const matchContext = {
            giphyPatterns: semanticMatch?.giphyPatterns || suggestion?.giphyPatterns,
            emoji: suggestion?.emoji,
            keyword: suggestion?.keyword,
            giphyQuery: suggestion?.giphyQuery
        };
        const standardQueries = ReactionMatcher.shared?.generateDynamicGiphyQueries(
            userTranscript,
            matchContext
        ) ?? [];
        queries.push(...standardQueries);

        // Deduplicate and limit to 3 queries
        return [...new Set(queries)].slice(0, 3);
    }

    #queueForDisplay(suggestion) {
        // Add to queue
        this.#displayQueue.push(suggestion);

        // Process queue if not already processing
        if (!this.#isDisplayingReaction) {
            this.#processDisplayQueue();
        }
    }

    async #processDisplayQueue() {
        if (this.#displayQueue.length === 0) {
            this.#isDisplayingReaction = false;
            return;
        }

        this.#isDisplayingReaction = true;

        const suggestion = this.#displayQueue.shift();

        try {
            await this.displaySuggestion(suggestion);

            // Wait for display duration before showing next
            await new Promise(resolve => {
                this.#displayTimeout = setTimeout(resolve, this.#autoDisplayDurationMs);
            });

            // Hide the current reaction
            this.#hideCurrentReaction();

        } catch (err) {
            console.error("Error displaying reaction:", err);
        }

        // Process next in queue
        this.#processDisplayQueue();
    }

    #clearDisplayQueue() {
        this.#displayQueue = [];

        if (this.#displayTimeout) {
            clearTimeout(this.#displayTimeout);
            this.#displayTimeout = null;
        }

        this.#isDisplayingReaction = false;
    }

    async #displayEmojiReaction(emoji) {
        if (!this.#looksController) {
            console.warn("LooksController not set. Cannot display reaction.");
            return;
        }

        try {
            // Create emoji media
            const media = TextReaction.CreateEmoji(emoji);

            // Display using LooksController's temporary reaction method
            await this.#looksController.displayTemporaryReaction?.(
                media,
                this.#autoDisplayDurationMs
            );

            NotificationCenter.default.postNotification(
                SpeechReactionsController.Notifications.ReactionDisplayed,
                this,
                { type: "emoji", emoji }
            );

        } catch (err) {
            console.error("Error displaying emoji reaction:", err);
        }
    }

    async #displayTextReaction(text, style = null) {
        if (!this.#looksController) {
            console.warn("LooksController not set. Cannot display reaction.");
            return;
        }

        try {
            // Create text media with optional style
            const styleId = style || "classic-speech";
            const media = TextReaction.createMediaForTextReaction(
                styleId,
                text,
                Stage.Object.Anchor.TopRight
            );

            // Display using LooksController's temporary reaction method
            await this.#looksController.displayTemporaryReaction?.(
                media,
                this.#autoDisplayDurationMs
            );

            NotificationCenter.default.postNotification(
                SpeechReactionsController.Notifications.ReactionDisplayed,
                this,
                { type: "text", text, style: styleId }
            );

        } catch (err) {
            console.error("Error displaying text reaction:", err);
        }
    }

    #hideCurrentReaction() {
        this.#looksController?.hideTemporaryReaction?.();
    }

    #showSuggestionsInPanel(suggestions, gifSuggestions = [], gifsLoading = false) {
        if (!this.#reactionsPanel) {
            return;
        }

        this.#reactionsPanel.showSpeechSuggestions?.(suggestions, gifSuggestions, gifsLoading);
    }

    /**
     * Get or create the GIPHY client
     * @returns {GIPHYClient}
     */
    #getGiphyClient() {
        if (!this.#giphyClient) {
            this.#giphyClient = new GIPHYClient();
        }
        return this.#giphyClient;
    }

    /**
     * Fetch GIFs for suggestions that have giphyQuery
     * @param {ReactionSuggestion[]} suggestions
     * @returns {Promise<Object[]>} Array of GIPHY items
     */
    async #fetchGifsForSuggestions(suggestions) {
        // Get suggestions with giphyQuery, limit to max queries
        const suggestionsWithGiphy = suggestions
            .filter(s => s.giphyQuery)
            .slice(0, this.#maxGifQueries);

        if (suggestionsWithGiphy.length === 0) {
            return [];
        }

        // Fetch GIFs for each query
        const allGifs = [];
        const giphyClient = this.#getGiphyClient();

        for (const suggestion of suggestionsWithGiphy) {
            try {
                const gifs = await this.#fetchGifsWithCache(
                    suggestion.giphyQuery,
                    this.#gifsPerQuery
                );
                allGifs.push(...gifs);

                // Stop if we have enough
                if (allGifs.length >= this.#maxGifsTotal) {
                    break;
                }
            } catch (err) {
                console.error("Error fetching GIFs for query:", suggestion.giphyQuery, err);
            }
        }

        // Limit total GIFs and deduplicate by ID
        const seenIds = new Set();
        const uniqueGifs = [];
        for (const gif of allGifs) {
            if (!seenIds.has(gif.id) && uniqueGifs.length < this.#maxGifsTotal) {
                seenIds.add(gif.id);
                uniqueGifs.push(gif);
            }
        }

        return uniqueGifs;
    }

    /**
     * Fetch GIFs with caching
     * @param {string} query - The GIPHY search query
     * @param {number} limit - Max results to return
     * @returns {Promise<Object[]>} Array of GIPHY items
     */
    async #fetchGifsWithCache(query, limit) {
        const now = Date.now();
        const cached = this.#gifCache.get(query);

        // Return cached results if still valid
        if (cached && (now - cached.timestamp) < this.#gifCacheTTLMs) {
            return cached.results.slice(0, limit);
        }

        // Fetch from GIPHY
        const giphyClient = this.#getGiphyClient();
        const results = await giphyClient.searchGIFs(query, limit);

        if (!results || !Array.isArray(results)) {
            return [];
        }

        // Cache the results
        this.#gifCache.set(query, {
            results,
            timestamp: now
        });

        // Clean up old cache entries periodically
        this.#cleanupGifCache(now);

        return results.slice(0, limit);
    }

    /**
     * Remove expired entries from the GIF cache and limit size
     * @param {number} now - Current timestamp
     */
    #cleanupGifCache(now) {
        const maxCacheSize = 20; // Limit cache to prevent memory buildup

        // Remove expired entries
        for (const [query, entry] of this.#gifCache.entries()) {
            if ((now - entry.timestamp) >= this.#gifCacheTTLMs) {
                this.#gifCache.delete(query);
            }
        }

        // If still too large, remove oldest entries
        if (this.#gifCache.size > maxCacheSize) {
            const entries = Array.from(this.#gifCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);

            const toRemove = entries.slice(0, this.#gifCache.size - maxCacheSize);
            for (const [query] of toRemove) {
                this.#gifCache.delete(query);
            }
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.disable();

        // Remove transcript observer
        if (this.#transcriptObserver) {
            NotificationCenter.default.removeObserver(
                SpeechService.Notifications.TranscriptUpdated,
                null,
                this.#transcriptObserver,
                this
            );
            this.#transcriptObserver = null;
        }

        // Remove partial transcript observer
        if (this.#partialTranscriptObserver) {
            NotificationCenter.default.removeObserver(
                SpeechService.Notifications.PartialTranscript,
                null,
                this.#partialTranscriptObserver,
                this
            );
            this.#partialTranscriptObserver = null;
        }

        // Remove system audio observer
        if (this.#systemAudioObserver && typeof SystemAudioService !== "undefined") {
            NotificationCenter.default.removeObserver(
                SystemAudioService.Notifications.TranscriptUpdated,
                null,
                this.#systemAudioObserver,
                this
            );
            this.#systemAudioObserver = null;
        }

        // Cleanup GIPHY client
        if (this.#giphyClient) {
            this.#giphyClient.cancelPendingRequests();
            this.#giphyClient = null;
        }
        this.#gifCache.clear();
        this.#currentGifSuggestions = [];

        // Cleanup speculative cache
        if (this.#speculativeCache) {
            this.#speculativeCache.clearCache();
            this.#speculativeCache = null;
        }

        // Cleanup semantic matcher
        if (this.#semanticMatcher) {
            this.#semanticMatcher.dispose();
            this.#semanticMatcher = null;
        }

        // Cleanup predictive state
        this.#reactionPredictor = null;
        this.#predictiveSuggestions = [];
        this.#lastPartialTranscript = "";

        // Cleanup debounce timers
        if (this.#partialTranscriptDebounceTimer) {
            clearTimeout(this.#partialTranscriptDebounceTimer);
            this.#partialTranscriptDebounceTimer = null;
        }
        this.#pendingGifFetch = null;

        this.#looksController = null;
        this.#reactionsPanel = null;
    }
}

// Create singleton instance
SpeechReactionsController.shared = new SpeechReactionsController();
