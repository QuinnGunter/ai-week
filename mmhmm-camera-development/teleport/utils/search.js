//
//  utils/search.js
//  mmhmm
//
//  Created by Seth Hitchings on 3/31/2023.
//  Copyright 2023 mmhmm inc. All rights reserved.
//

class SearchTree {
    constructor() {
        this.searchTree = {};
    }
    static tokenizeText(text) {
        if (text == null) {
            return [];
        }

        let tokens;
        let activeLocale = gCurrentLocale;

        // Intl.Segmenter is not supported firefox, so we can use the generic (english) search.
        if (Intl.Segmenter == undefined) {
            tokens = text
              .split(/\W/)
              .map((token) => token.toLowerCase())
              .filter((token) => token.length > 1);
        } else {
            let segmenter = new Intl.Segmenter(activeLocale, { granularity: "word" });
            let segmentedArray = Array.from(segmenter.segment(text));
            tokens = segmentedArray
            .map((token) => token.segment.toLowerCase())
            .filter((token) => {
                var length = token.length;
                if (length == 0) return false;
                // Checks unicode value of first character see if its within latin range.
                if (token.charCodeAt(0) < 0x2000) return length > 1;
                return true;
            });
        }

        return tokens;
    }
    addItemWithTokens(item, tokens) {
        var searchTree = this.searchTree;
        tokens.forEach(token => {
            var first = token.charAt(0);

            var words = searchTree[first];
            if (words == null) {
                words = {}
                searchTree[first] = words;
            }

            var records = words[token];
            if (records == null) {
                records = [];
                words[token] = records;
            }

            if (records.indexOf(item) == -1) {
                records.push(item);
            }
        })
    }
    resultsForSearchTokens(tokens) {
        var searchTree = this.searchTree;
        var results = null;
        tokens.forEach((token, tokenIdx) => {
            if (tokenIdx > 0 && results.length == 0) {
                // we search AND tokens
                // and if this isn't the first token,
                // and we have no matches, we'll
                // never have any matches
                return;
            }

            var first = token.charAt(0);
            var entries = searchTree[first];
            var matches = [];

            if (entries != null) {
                for (var entry in entries) {
                    if (entry.startsWith(token) == false) {
                        continue;
                    }
                    var items = entries[entry];
                    items.forEach(item => {
                        if (matches.indexOf(item) == -1) {
                            matches.push(item);
                        }
                    })
                }
            }

            if (tokenIdx == 0) {
                results = matches;
            }
            else {
                // Only keep matches that were already in results
                results = matches.filter(item => results.indexOf(item) != -1);
            }
        })
        if (results == null) {
            results = [];
        }
        return results;
    }
}
