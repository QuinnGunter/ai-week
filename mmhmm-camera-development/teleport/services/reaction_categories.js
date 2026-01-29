//
//  services/reaction_categories.js
//  mmhmm
//
//  Category taxonomy for semantic speech reaction matching.
//  Each category has semantic anchors (example phrases) and GIPHY patterns.
//

/**
 * ReactionCategories defines the semantic taxonomy for speech reactions.
 *
 * Structure:
 * - Top-level: context (professional, casual, emotional)
 * - Second-level: specific reaction category
 * - Each category has:
 *   - anchors: Example phrases for semantic matching
 *   - emoji: Default emoji for this category
 *   - giphyPatterns: Search queries for GIPHY (randomly selected)
 */
const ReactionCategories = Object.freeze({
    professional: {
        agreement: {
            anchors: [
                "I agree",
                "that's correct",
                "exactly right",
                "spot on",
                "absolutely",
                "you're right",
                "that's true",
                "precisely",
                "couldn't agree more"
            ],
            emoji: "\u{1F44D}",  // 👍
            giphyPatterns: ["agree nodding", "thumbs up professional", "nod yes", "agreement reaction"]
        },
        appreciation: {
            anchors: [
                "thank you",
                "great work",
                "well done",
                "nice job",
                "good effort",
                "appreciate it",
                "thanks so much",
                "fantastic job",
                "excellent work"
            ],
            emoji: "\u{1F44F}",  // 👏
            giphyPatterns: ["applause professional", "thank you reaction", "great job gif", "well done clap"]
        },
        thinking: {
            anchors: [
                "let me think",
                "good question",
                "interesting point",
                "hmm",
                "that's interesting",
                "I need to consider",
                "give me a moment",
                "let me ponder"
            ],
            emoji: "\u{1F914}",  // 🤔
            giphyPatterns: ["thinking pondering", "hmm thinking", "contemplating", "deep thought"]
        },
        noted: {
            anchors: [
                "noted",
                "got it",
                "understood",
                "makes sense",
                "I see",
                "copy that",
                "roger that",
                "understood completely",
                "I follow"
            ],
            emoji: "\u{1F4DD}",  // 📝
            giphyPatterns: ["noted writing", "got it thumbs up", "understood nod", "taking notes"]
        },
        feedback: {
            anchors: [
                "good point",
                "fair point",
                "I hadn't thought of that",
                "interesting perspective",
                "valid concern",
                "that's a consideration",
                "worth noting"
            ],
            emoji: "\u{1F4AC}",  // 💬
            giphyPatterns: ["good point reaction", "interesting hmm", "feedback nodding"]
        },
        progress: {
            anchors: [
                "we're making progress",
                "moving forward",
                "getting there",
                "on the right track",
                "almost there",
                "good momentum"
            ],
            emoji: "\u{1F680}",  // 🚀
            giphyPatterns: ["progress forward", "moving on", "making progress", "on track"]
        },
        encouragement: {
            anchors: [
                "you got this",
                "keep going",
                "don't give up",
                "you can do it",
                "hang in there",
                "almost there",
                "stay strong",
                "believe in yourself",
                "rooting for you"
            ],
            emoji: "\u{1F4AA}",  // 💪
            giphyPatterns: ["you got this", "encouragement motivation", "keep going strong", "believe in yourself"]
        }
    },

    casual: {
        excitement: {
            anchors: [
                "oh my god",
                "no way",
                "that's crazy",
                "insane",
                "wild",
                "shut up",
                "are you serious",
                "you're kidding",
                "can't believe it",
                "holy cow"
            ],
            emoji: "\u{1F92F}",  // 🤯
            giphyPatterns: ["mind blown", "shocked omg", "no way reaction", "surprised excited"]
        },
        humor: {
            anchors: [
                "that's hilarious",
                "so funny",
                "I'm dying",
                "lmao",
                "cracking up",
                "dead",
                "that's gold",
                "too funny",
                "can't stop laughing"
            ],
            emoji: "\u{1F923}",  // 🤣
            giphyPatterns: ["laughing crying", "hilarious reaction", "can't stop laughing", "lol dying"]
        },
        cringe: {
            anchors: [
                "yikes",
                "awkward",
                "cringe",
                "oof",
                "that's rough",
                "oh no",
                "that's embarrassing",
                "secondhand embarrassment"
            ],
            emoji: "\u{1F62C}",  // 😬
            giphyPatterns: ["cringe awkward", "yikes reaction", "oof cringe", "awkward face"]
        },
        sarcasm: {
            anchors: [
                "sure",
                "right",
                "totally",
                "oh really",
                "wow amazing",
                "obviously",
                "yeah right",
                "of course it is"
            ],
            emoji: "\u{1F644}",  // 🙄
            giphyPatterns: ["eye roll sarcasm", "sure jan", "oh really reaction", "sarcastic wow"]
        },
        impressed: {
            anchors: [
                "whoa",
                "dang",
                "that's sick",
                "legit",
                "lowkey impressed",
                "not bad",
                "pretty cool"
            ],
            emoji: "\u{1F929}",  // 🤩
            giphyPatterns: ["impressed wow", "whoa reaction", "not bad", "cool impressed"]
        },
        bored: {
            anchors: [
                "meh",
                "whatever",
                "I guess",
                "not really",
                "boring",
                "same old",
                "nothing special"
            ],
            emoji: "\u{1F612}",  // 😒
            giphyPatterns: ["bored meh", "whatever shrug", "boring yawn", "unimpressed"]
        },
        agreement_casual: {
            anchors: [
                "facts",
                "true",
                "real talk",
                "for real",
                "honestly",
                "no cap",
                "big facts"
            ],
            emoji: "\u{1F4AF}",  // 💯
            giphyPatterns: ["facts 100", "true that", "real talk", "preach"]
        },
        confusion: {
            anchors: [
                "wait what",
                "i'm lost",
                "doesn't make sense",
                "confused",
                "what do you mean",
                "huh",
                "i don't get it",
                "explain that again",
                "run that by me again"
            ],
            emoji: "\u{1F615}",  // 😕
            giphyPatterns: ["confused reaction", "wait what", "huh confused", "doesn't make sense"]
        },
        approval: {
            anchors: [
                "valid",
                "fair enough",
                "that checks out",
                "sounds reasonable",
                "i can see that",
                "that works",
                "fair point",
                "can't argue with that"
            ],
            emoji: "\u{1F44C}",  // 👌
            giphyPatterns: ["fair enough reaction", "valid point", "makes sense nod", "approved"]
        }
    },

    emotional: {
        joy: {
            anchors: [
                "so happy",
                "I'm thrilled",
                "amazing news",
                "best day ever",
                "finally",
                "I'm so excited",
                "this is wonderful",
                "couldn't be happier"
            ],
            emoji: "\u{1F973}",  // 🥳
            giphyPatterns: ["happy dance", "celebration joy", "excited happy", "thrilled reaction"]
        },
        empathy: {
            anchors: [
                "I understand",
                "that's tough",
                "I'm sorry",
                "hang in there",
                "sending love",
                "thinking of you",
                "that must be hard",
                "I feel for you"
            ],
            emoji: "\u{1F917}",  // 🤗
            giphyPatterns: ["virtual hug", "support comfort", "empathy hug", "sending love"]
        },
        frustration: {
            anchors: [
                "so frustrating",
                "ugh",
                "this is annoying",
                "come on",
                "seriously",
                "give me a break",
                "unbelievable",
                "I can't deal"
            ],
            emoji: "\u{1F624}",  // 😤
            giphyPatterns: ["frustrated facepalm", "annoyed reaction", "ugh frustrated", "seriously annoyed"]
        },
        relief: {
            anchors: [
                "thank god",
                "finally over",
                "phew",
                "that's a relief",
                "dodged a bullet",
                "weight off my shoulders",
                "so relieved"
            ],
            emoji: "\u{1F62E}\u{200D}\u{1F4A8}",  // 😮‍💨
            giphyPatterns: ["relief phew", "finally done", "weight off shoulders", "relieved sigh"]
        },
        skeptical: {
            anchors: [
                "I don't know",
                "not sure about that",
                "seems off",
                "doubtful",
                "really though",
                "are you sure",
                "I have my doubts",
                "questionable"
            ],
            emoji: "\u{1F928}",  // 🤨
            giphyPatterns: ["skeptical look", "doubt reaction", "hmm suspicious", "questioning look"]
        },
        sadness: {
            anchors: [
                "that's sad",
                "heartbreaking",
                "I'm bummed",
                "disappointing",
                "so unfortunate",
                "that sucks",
                "what a shame"
            ],
            emoji: "\u{1F622}",  // 😢
            giphyPatterns: ["sad reaction", "disappointed sad", "bummed out", "that's sad"]
        },
        anticipation: {
            anchors: [
                "can't wait",
                "so excited",
                "looking forward",
                "bring it on",
                "ready for this",
                "pumped",
                "hyped"
            ],
            emoji: "\u{1F91E}",  // 🤞
            giphyPatterns: ["excited anticipation", "can't wait", "hyped up", "bring it on"]
        },
        surprise: {
            anchors: [
                "wait what",
                "hold up",
                "excuse me",
                "say that again",
                "come again",
                "what did you say",
                "did I hear that right"
            ],
            emoji: "\u{1F62F}",  // 😯
            giphyPatterns: ["surprised what", "hold up wait", "excuse me what", "say what"]
        },
        love: {
            anchors: [
                "I love it",
                "so cute",
                "adorable",
                "love this",
                "my heart",
                "aww",
                "precious"
            ],
            emoji: "\u{2764}\u{FE0F}",  // ❤️
            giphyPatterns: ["heart love", "so cute aww", "adorable reaction", "love it"]
        },
        determination: {
            anchors: [
                "let's do this",
                "we got this",
                "bring it",
                "game on",
                "let's go",
                "time to shine",
                "here we go"
            ],
            emoji: "\u{1F4AA}",  // 💪
            giphyPatterns: ["let's do this", "we got this", "determination strong", "game on"]
        },
        pride: {
            anchors: [
                "i did it",
                "nailed it",
                "crushed it",
                "killed it",
                "proud of myself",
                "finally finished",
                "achieved my goal",
                "made it happen",
                "did the thing"
            ],
            emoji: "\u{1F3C6}",  // 🏆
            giphyPatterns: ["proud achievement", "nailed it celebration", "victory dance", "crushed it success"]
        },
        nostalgia: {
            anchors: [
                "remember when",
                "good old days",
                "throwback",
                "back in the day",
                "i miss those times",
                "those were the days",
                "takes me back",
                "blast from the past"
            ],
            emoji: "\u{1F972}",  // 🥲
            giphyPatterns: ["nostalgia memories", "remember when", "good old days", "throwback feels"]
        },
        curiosity: {
            anchors: [
                "tell me more",
                "interesting",
                "go on",
                "i'm intrigued",
                "really",
                "and then what",
                "what happened next",
                "elaborate please",
                "fascinating"
            ],
            emoji: "\u{1F9D0}",  // 🧐
            giphyPatterns: ["interested curious", "tell me more", "intrigued reaction", "go on listening"]
        },
        disappointment: {
            anchors: [
                "bummer",
                "was hoping",
                "that's a letdown",
                "expected more",
                "oh well",
                "could have been better",
                "not what i expected",
                "fell short",
                "missed opportunity"
            ],
            emoji: "\u{1F61E}",  // 😞
            giphyPatterns: ["disappointed reaction", "bummer letdown", "expected more", "oh well shrug"]
        },
        gratitude: {
            anchors: [
                "means a lot",
                "so grateful",
                "bless you",
                "appreciate you",
                "you're the best",
                "can't thank you enough",
                "so thankful",
                "you made my day",
                "i owe you"
            ],
            emoji: "\u{1F64F}",  // 🙏
            giphyPatterns: ["thank you grateful", "appreciation heart", "means a lot", "bless you thanks"]
        }
    }
});

/**
 * Get all category keys as flat array (e.g., "professional.agreement")
 * @returns {string[]}
 */
function getAllCategoryKeys() {
    const keys = [];
    for (const [context, categories] of Object.entries(ReactionCategories)) {
        for (const name of Object.keys(categories)) {
            keys.push(`${context}.${name}`);
        }
    }
    return keys;
}

/**
 * Get category data by key
 * @param {string} key - Category key like "professional.agreement"
 * @returns {Object|null} Category data or null
 */
function getCategoryByKey(key) {
    const [context, name] = key.split(".");
    return ReactionCategories[context]?.[name] ?? null;
}

/**
 * Get all anchors across all categories (for batch embedding)
 * @returns {Array<{key: string, anchor: string}>}
 */
function getAllAnchors() {
    const anchors = [];
    for (const [context, categories] of Object.entries(ReactionCategories)) {
        for (const [name, data] of Object.entries(categories)) {
            const key = `${context}.${name}`;
            for (const anchor of data.anchors) {
                anchors.push({ key, anchor });
            }
        }
    }
    return anchors;
}

export {
    ReactionCategories,
    getAllCategoryKeys,
    getCategoryByKey,
    getAllAnchors
};
