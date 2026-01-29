//
//  sentry.js
//  mmhmm
//
//  Created by John Keck on 5/12/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class TeleportSentry {
    constructor() {
        if (gLocalDeployment == true) {
            // I don't want sentry on localhost builds
            return;
        }

        this.sentry = window.Sentry ? Sentry : null;
        if (this.sentry) {
            const releaseTrack = getReleaseTrack();
            const opts = {
                dsn: "https://fba43be3c9be96cffb8b271672496264@o405401.ingest.us.sentry.io/4509929106833408",
                environment: releaseTrack,
                maxValueLength: 1000,

                // Temporarily attach stack traces to messages while debugging
                // https://github.com/All-Turtles/mmhmm-camera/issues/184
                attachStacktrace: true,
            };
            if (typeof gAppBuild != "undefined") {
                opts.release = gAppBuild;
            }
            // if (App.isDemo && releaseTrack == ReleaseTrack.PRODUCTION) {
            //     // We're on the marketing website; see if we have tracking consent
            //     const consent = Cookies.Get("onetrust-consent");
            //     if (consent == "true") {
            //         // In the production Camera demo, turn on session replay so we can
            //         // get a sense of how people are using the product
            //         opts.replaysSessionSampleRate = 0.1;
            //         opts.replaysOnErrorSampleRate = 1.0;
            //         opts.integrations = [
            //             Sentry.replayIntegration({
            //                 maskAllText: true,
            //                 maskAllInputs: true,
            //                 blockAllMedia: true,
            //             }),
            //         ];
            //     }
            // }
            this.sentry.init(opts);
            this.sentry.setTag("is_hybrid", App.isHybrid ? "true" : "false");
            this.sentry.setTag("is_demo", App.isDemo ? "true" : "false");
        }
    }

    message(msg, level) {
        if (this.sentry) {
            if (level) {
                this.sentry.captureMessage(msg, level);
            } else {
                this.sentry.captureMessage(msg);
            }
        }
    }

    messageWithContext(msg, name, value, level) {
        if (this.sentry) {
            this.sentry.withScope((scope) => {
                scope.setContext(name, value);
                if (level) {
                    this.sentry.captureMessage(msg, level);
                } else {
                    this.sentry.captureMessage(msg);
                }
            });
        }
    }

    exception(err) {
        if (this.sentry) {
            this.sentry.captureException(err);
        }
    }

    withScope(cb) {
        if (this.sentry) {
            this.sentry.withScope(cb);
        }
    }
}
