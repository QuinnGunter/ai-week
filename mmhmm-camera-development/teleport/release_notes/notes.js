//
//  notes.js
//  mmhmm
//
//  Created by Justin Juno on 05/01/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

const ReleaseNotes = {

    // Get the key of the most recent release note that's relevant to the current platform.
    // Notes that aren't relevant (e.g. those for a different OS) are ignored.
    getLatestKey() {
        let releases = this.getFilteredReleases().map(release => release.key).sort();
        return releases[releases.length - 1];
    },

    // Get the list of release notes that are relevant for the current platform.
    // Notes that aren't relevant (e.g. those for a different OS) are ignored.
    getFilteredReleases() {
        return this.releases.filter(release => this.matchPlatform(release));
    },

    // Check whether a release note is relevant for the current platform.
    matchPlatform(release) {
        if (release.browserOnly === true && App.isHybrid == true) {
            return false;
        }
        if (release.creatorOnly === true) {
            return false;
        }
        if (release.hybridOnly === true) {
            // Allow a release note to be specific to the hybrid apps
            if (App.isHybrid == false) {
                return false;
            }

            // Allow a release note to indicate a minimum version of the
            // Mac and/or Windows hybrid app
            var minMacVersion = release.hybridVersionMac;
            if (minMacVersion != null && isMacOS()) {
                if (getHybridAppVersion() < minMacVersion) {
                    return false;
                }
            }
            var minWinVersion = release.hybridVersionWin;
            if (minWinVersion != null && isWindows()) {
                if (getHybridAppVersion() < minWinVersion) {
                    return false;
                }
            }
        }

        // Allow a release note to target a specific OS
        var targetPlatform = release.platform;
        if (targetPlatform != null) {
            if (getPlatform() != targetPlatform) {
                return false;
            }
        }

        return true
    },

    releases: [

        {
            key: "2025-12-18",
            title: LocalizedString("Version 3.0"),
            hero_image: "assets/notes/12-18-2025-hero.png",
            info_array: [
                {
                    heading: LocalizedString("Your camera companion, redesigned"),
                    description: LocalizedString("This release introduces a completely redesigned interface that puts the most important controls right at your fingertips. Quickly find and display a GIF, text message, or an emoji. Control panel buttons give you quick access to looks, name tags, away screens, and filters—and let you toggle each one on or off with a single click. You’ve now got everything you need to present yourself how you want, when you need it."),
                    thumbs: [
                    ],
                },
                {
                    heading: LocalizedString("Quick access to GIFs, emojis, and more"),
                    description: LocalizedString("Sometimes it’s easier to communicate visually. Start typing and instantly get GIFs, emojis, and the option to display your typed text as a message. React in real-time before the moment passes."),
                    thumbs: [
                        "assets/notes/12-18-2025-visuals.png",
                    ],
                },
                {
                    heading: LocalizedString("Find your look and make it yours"),
                    description: LocalizedString("Looks are now easier to discover and personalize. Browse the catalog and try on different looks to see how each will appear on your video. Once you find something you like you can customize it. Every look comes with a thoughtfully designed set of options, so you can make it uniquely yours without getting overwhelmed by choices."),
                    thumbs: [
                        "assets/notes/12-18-2025-looks.png",
                    ],
                },
                {
                    heading: LocalizedString("Away screens"),
                    description: LocalizedString("When you need to turn off your camera  use an away screen with a custom message that tells others exactly why your video is off—no guesswork, no awkward wondering if you're still there."),
                    thumbs: [
                        "assets/notes/12-18-2025-away.png",
                    ],
                },
            ],
        },

    ],
};
