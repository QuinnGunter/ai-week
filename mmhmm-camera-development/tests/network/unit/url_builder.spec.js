import { test } from "../../fixtures/test_fixture";
import { expect } from "@playwright/test";

test.describe("URLBuilder", () => {
    const testCases = [
        {
            description: "mmhmm.app - production",
            hostname: "ooo.mmhmm.app",
            environment: null,
            isAirtimeTools: false,
            urls: {
                signIn: {
                    args: ["ooo-web-tv", "sign-in", "en-US"],
                    expected: "https://signin.ooo.mmhmm.app/en-US/ooo-web-tv/sign-in?utm_content=camera"
                },
                account: {
                    args: [],
                    expected: "https://ooo.mmhmm.app/account"
                },
                accountWithPath: {
                    args: ["/choose-plan"],
                    expected: "https://ooo.mmhmm.app/account/choose-plan"
                },
                video: {
                    args: ["video-123"],
                    expected: "https://ooo.mmhmm.app/video-123"
                },
                websocket: {
                    args: [],
                    expected: "wss://ws.mmhmm.app/"
                },
                websocketWithToken: {
                    args: [{ token: "abc123" }],
                    expected: "wss://ws.mmhmm.app/?token=abc123"
                },
                api: {
                    args: [],
                    expected: "https://api.mmhmm.app"
                },
                apiV2: {
                    args: [],
                    expected: "https://api.prod.cloud.mmhmm.app"
                },
                origin: {
                    args: [],
                    expected: "https://ooo.mmhmm.app"
                },
                presentationShare: {
                    args: ["d37ca1cd-a80c-4821-bf52-4432425d18a0"],
                    expected: "https://ooo.mmhmm.app/presentation/d37ca1cd-a80c-4821-bf52-4432425d18a0"
                },
                slideShare: {
                    args: ["d37ca1cd-a80c-4821-bf52-4432425d18a0"],
                    expected: "https://ooo.mmhmm.app/look/d37ca1cd-a80c-4821-bf52-4432425d18a0"
                },
                tutorialVideos: {
                    args: [],
                    expected: "https://ooo.mmhmm.app/learn"
                },
                helpCenterBase: {
                    args: [],
                    expected: "https://help.airtime.com/hc/en-us"
                },
                contactSupport: {
                    args: [],
                    expected: "https://help.airtime.com/hc/en-us/requests/new"
                },
                community: {
                    args: [],
                    expected: "https://community.airtime.com/c/start-here"
                },
            }
        },
        {
            description: "mmhmm.app - stage",
            hostname: "ooo-stage.mmhmm.app",
            environment: "stage",
            isAirtimeTools: false,
            urls: {
                signIn: {
                    args: ["mac-hybrid", "sign-in", "en-US"],
                    expected:
                        "https://signin.ooo-stage.mmhmm.app/en-US/mac-hybrid/sign-in?utm_content=camera"
                },
                account: {
                    args: [],
                    expected: "https://ooo-stage.mmhmm.app/account"
                },
                accountWithPath: {
                    args: ["/workgroup/members"],
                    expected: "https://ooo-stage.mmhmm.app/account/workgroup/members"
                },
                video: {
                    args: ["video-123"],
                    expected: "https://ooo-stage.mmhmm.app/video-123"
                },
                websocket: {
                    args: [],
                    expected: "wss://stage-ws.mmhmm.app/"
                },
                websocketWithToken: {
                    args: [{ token: "abc123" }],
                    expected: "wss://stage-ws.mmhmm.app/?token=abc123"
                },
                api: {
                    args: [],
                    expected: "https://stage-api.mmhmm.app"
                },
                apiV2: {
                    args: [],
                    expected: "https://api.stage.cloud.mmhmm.app"
                },
                origin: {
                    args: [],
                    expected: "https://ooo-stage.mmhmm.app"
                },
                presentationShare: {
                    args: ["d37ca1cd-a80c-4821-bf52-4432425d18a0"],
                    expected: "https://ooo-stage.mmhmm.app/presentation/d37ca1cd-a80c-4821-bf52-4432425d18a0"
                },
                slideShare: {
                    args: ["d37ca1cd-a80c-4821-bf52-4432425d18a0"],
                    expected: "https://ooo-stage.mmhmm.app/look/d37ca1cd-a80c-4821-bf52-4432425d18a0"
                },
                tutorialVideos: {
                    args: [],
                    expected: "https://ooo-stage.mmhmm.app/learn"
                },
                helpCenterBase: {
                    args: [],
                    expected: "https://help.airtime.com/hc/en-us"
                },
                contactSupport: {
                    args: [],
                    expected: "https://help.airtime.com/hc/en-us/requests/new"
                },
                community: {
                    args: [],
                    expected: "https://community.airtime.com/c/start-here"
                }
            }
        },
        {
            description: "mmhmm.app - dev",
            hostname: "ooo-dev.mmhmm.app",
            environment: "dev",
            isAirtimeTools: false,
            urls: {
                signIn: {
                    args: ["windows-hybrid", "sign-in", "fr-FR"],
                    expected:
                        "https://signin.ooo-dev.mmhmm.app/fr-FR/windows-hybrid/sign-in?utm_content=camera"
                },
                account: {
                    args: [],
                    expected: "https://ooo-dev.mmhmm.app/account"
                },
                accountWithPath: {
                    args: ["/team/members"],
                    expected: "https://ooo-dev.mmhmm.app/account/team/members"
                },
                video: {
                    args: ["video-123"],
                    expected: "https://ooo-dev.mmhmm.app/video-123"
                },
                websocket: {
                    args: [],
                    expected: "wss://dev-ws.mmhmm.app/"
                },
                websocketWithToken: {
                    args: [{ token: "abc123" }],
                    expected: "wss://dev-ws.mmhmm.app/?token=abc123"
                },
                api: {
                    args: [],
                    expected: "https://dev-api.mmhmm.app"
                },
                apiV2: {
                    args: [],
                    expected: "https://api.dev.cloud.mmhmm.app"
                },
                origin: {
                    args: [],
                    expected: "https://ooo-dev.mmhmm.app"
                },
                presentationShare: {
                    args: ["d37ca1cd-a80c-4821-bf52-4432425d18a0"],
                    expected: "https://ooo-dev.mmhmm.app/presentation/d37ca1cd-a80c-4821-bf52-4432425d18a0"
                },
                slideShare: {
                    args: ["d37ca1cd-a80c-4821-bf52-4432425d18a0"],
                    expected: "https://ooo-dev.mmhmm.app/look/d37ca1cd-a80c-4821-bf52-4432425d18a0"
                },
                tutorialVideos: {
                    args: [],
                    expected: "https://ooo-dev.mmhmm.app/learn"
                },
                helpCenterBase: {
                    args: [],
                    expected: "https://help.airtime.com/hc/en-us"
                },
                contactSupport: {
                    args: [],
                    expected: "https://help.airtime.com/hc/en-us/requests/new"
                },
                community: {
                    args: [],
                    expected: "https://community.airtime.com/c/start-here"
                }
            }
        },
        {
            description: "airtimetools.com - production",
            hostname: "app.airtimetools.com",
            environment: null,
            isAirtimeTools: true,
            urls: {
                signIn: {
                    args: ["ooo-web-tv", "sign-in", "en-US"],
                    expected: "https://signin.app.airtimetools.com/en-US/ooo-web-tv/sign-in?utm_content=camera"
                },
                account: {
                    args: [],
                    expected: "https://app.airtimetools.com/account"
                },
                accountWithPath: {
                    args: ["/choose-plan"],
                    expected: "https://app.airtimetools.com/account/choose-plan"
                },
                video: {
                    args: ["video-123"],
                    expected: "https://app.airtimetools.com/video-123"
                },
                websocket: {
                    args: [],
                    expected: "wss://ws.mmhmm.app/"
                },
                websocketWithToken: {
                    args: [{ token: "abc123" }],
                    expected: "wss://ws.mmhmm.app/?token=abc123"
                },
                api: {
                    args: [],
                    expected: "https://api.mmhmm.app"
                },
                apiV2: {
                    args: [],
                    expected: "https://api.prod.cloud.mmhmm.app"
                },
                origin: {
                    args: [],
                    expected: "https://app.airtimetools.com"
                },
                presentationShare: {
                    args: ["d37ca1cd-a80c-4821-bf52-4432425d18a0"],
                    expected: "https://app.airtimetools.com/presentation/d37ca1cd-a80c-4821-bf52-4432425d18a0"
                },
                slideShare: {
                    args: ["d37ca1cd-a80c-4821-bf52-4432425d18a0"],
                    expected: "https://app.airtimetools.com/look/d37ca1cd-a80c-4821-bf52-4432425d18a0"
                },
                tutorialVideos: {
                    args: [],
                    expected: "https://app.airtimetools.com/learn"
                },
                helpCenterBase: {
                    args: [],
                    expected: "https://help.airtime.com/hc/en-us"
                },
                contactSupport: {
                    args: [],
                    expected: "https://help.airtime.com/hc/en-us/requests/new"
                },
                community: {
                    args: [],
                    expected: "https://community.airtime.com/c/start-here"
                }
            }
        },
        {
            description: "airtimetools.com - stage",
            hostname: "app.stage.airtimetools.com",
            environment: "stage",
            isAirtimeTools: true,
            urls: {
                signIn: {
                    args: ["mac-hybrid", "sign-in", "en-US"],
                    expected:
                        "https://signin.app.stage.airtimetools.com/en-US/mac-hybrid/sign-in?utm_content=camera"
                },
                account: {
                    args: [],
                    expected: "https://app.stage.airtimetools.com/account"
                },
                accountWithPath: {
                    args: ["/workgroup/members"],
                    expected:
                        "https://app.stage.airtimetools.com/account/workgroup/members"
                },
                video: {
                    args: ["video-123"],
                    expected: "https://app.stage.airtimetools.com/video-123"
                },
                websocket: {
                    args: [],
                    expected: "wss://stage-ws.mmhmm.app/"
                },
                websocketWithToken: {
                    args: [{ token: "abc123" }],
                    expected: "wss://stage-ws.mmhmm.app/?token=abc123"
                },
                api: {
                    args: [],
                    expected: "https://stage-api.mmhmm.app"
                },
                apiV2: {
                    args: [],
                    expected: "https://api.stage.cloud.mmhmm.app"
                },
                origin: {
                    args: [],
                    expected: "https://app.stage.airtimetools.com"
                },
                presentationShare: {
                    args: ["d37ca1cd-a80c-4821-bf52-4432425d18a0"],
                    expected: "https://app.stage.airtimetools.com/presentation/d37ca1cd-a80c-4821-bf52-4432425d18a0"
                },
                slideShare: {
                    args: ["d37ca1cd-a80c-4821-bf52-4432425d18a0"],
                    expected: "https://app.stage.airtimetools.com/look/d37ca1cd-a80c-4821-bf52-4432425d18a0"
                },
                tutorialVideos: {
                    args: [],
                    expected: "https://app.stage.airtimetools.com/learn"
                },
                helpCenterBase: {
                    args: [],
                    expected: "https://help.airtime.com/hc/en-us"
                },
                contactSupport: {
                    args: [],
                    expected: "https://help.airtime.com/hc/en-us/requests/new"
                },
                community: {
                    args: [],
                    expected: "https://community.airtime.com/c/start-here"
                }
            }
        },
        {
            description: "airtimetools.com - dev",
            hostname: "app.dev.airtimetools.com",
            environment: "dev",
            isAirtimeTools: true,
            urls: {
                signIn: {
                    args: ["windows-hybrid", "sign-in", "fr-FR"],
                    expected:
                        "https://signin.app.dev.airtimetools.com/fr-FR/windows-hybrid/sign-in?utm_content=camera"
                },
                account: {
                    args: [],
                    expected: "https://app.dev.airtimetools.com/account"
                },
                accountWithPath: {
                    args: ["/team/members"],
                    expected: "https://app.dev.airtimetools.com/account/team/members"
                },
                video: {
                    args: ["video-123"],
                    expected: "https://app.dev.airtimetools.com/video-123"
                },
                websocket: {
                    args: [],
                    expected: "wss://dev-ws.mmhmm.app/"
                },
                websocketWithToken: {
                    args: [{ token: "abc123" }],
                    expected: "wss://dev-ws.mmhmm.app/?token=abc123"
                },
                api: {
                    args: [],
                    expected: "https://dev-api.mmhmm.app"
                },
                apiV2: {
                    args: [],
                    expected: "https://api.dev.cloud.mmhmm.app"
                },
                origin: {
                    args: [],
                    expected: "https://app.dev.airtimetools.com"
                },
                presentationShare: {
                    args: ["d37ca1cd-a80c-4821-bf52-4432425d18a0"],
                    expected: "https://app.dev.airtimetools.com/presentation/d37ca1cd-a80c-4821-bf52-4432425d18a0"
                },
                slideShare: {
                    args: ["d37ca1cd-a80c-4821-bf52-4432425d18a0"],
                    expected: "https://app.dev.airtimetools.com/look/d37ca1cd-a80c-4821-bf52-4432425d18a0"
                },
                tutorialVideos: {
                    args: [],
                    expected: "https://app.dev.airtimetools.com/learn"
                },
                helpCenterBase: {
                    args: [],
                    expected: "https://help.airtime.com/hc/en-us"
                },
                contactSupport: {
                    args: [],
                    expected: "https://help.airtime.com/hc/en-us/requests/new"
                },
                community: {
                    args: [],
                    expected: "https://community.airtime.com/c/start-here"
                }
            }
        }
    ];

    testCases.forEach((testCase) => {
        test.describe(testCase.description, () => {
            let builder;
            test.beforeEach(async ({ page }) => {
                builder = await page.evaluateHandle(
                    ({ environment, isAirtimeTools, hostname }) => {
                        return new URLBuilder(environment, {
                            isAirtime: isAirtimeTools,
                            hostname: hostname
                        });
                    },
                    testCase
                );
            });
            let testCount = 1;
            let testEnvironment = (testCase.environment ? testCase.environment : "production").toUpperCase();
            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should have correct configuration", async () => {
                const { environment, isAirtime } = await builder.evaluate((builder) => {
                    return {
                        environment: builder.environment,
                        isAirtime: builder.isAirtime
                    };
                });
                expect(environment).toBe(testCase.environment);
                expect(isAirtime).toBe(testCase.isAirtimeTools);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ":should generate correct sign-in URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getSignInURL(...args);
                }, testCase.urls.signIn);
                expect(url).toBe(testCase.urls.signIn.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct account URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getAccountURL(...args);
                }, testCase.urls.account);
                expect(url).toBe(testCase.urls.account.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct account URL with path", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getAccountURL(...args);
                }, testCase.urls.accountWithPath);
                expect(url).toBe(testCase.urls.accountWithPath.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct video URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getVideoURL(...args);
                }, testCase.urls.video);
                expect(url).toBe(testCase.urls.video.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct WebSocket URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getWebSocketURL(...args);
                }, testCase.urls.websocket);
                expect(url).toBe(testCase.urls.websocket.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct WebSocket URL with token", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getWebSocketURL(...args);
                }, testCase.urls.websocketWithToken);
                expect(url).toBe(testCase.urls.websocketWithToken.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct API URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getAPIBaseURL(...args);
                }, testCase.urls.api);
                expect(url).toBe(testCase.urls.api.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct API v2 URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getAPIV2BaseURL(...args);
                }, testCase.urls.apiV2);
                expect(url).toBe(testCase.urls.apiV2.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct origin URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getOrigin(...args);
                }, testCase.urls.origin);
                expect(url).toBe(testCase.urls.origin.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct presentation share URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getPresentationShareURL(...args);
                }, testCase.urls.presentationShare);
                expect(url).toBe(testCase.urls.presentationShare.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct slide share URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getSlideShareURL(...args);
                }, testCase.urls.slideShare);
                expect(url).toBe(testCase.urls.slideShare.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct learn URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getTutorialVideosURL(...args);
                }, testCase.urls.tutorialVideos);
                expect(url).toBe(testCase.urls.tutorialVideos.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct help center URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getHelpCenterBaseURL(...args);
                }, testCase.urls.helpCenterBase);
                expect(url).toBe(testCase.urls.helpCenterBase.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct contact support URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getContactSupportURL(...args);
                }, testCase.urls.contactSupport);
                expect(url).toBe(testCase.urls.contactSupport.expected);
            });

            test(`UNIT_URLBUILDER_${testEnvironment}_${testCount++}` + ": should generate correct community URL", async () => {
                const url = await builder.evaluate((builder, { args }) => {
                    return builder.getCommunityBaseURL(...args);
                }, testCase.urls.community);
                expect(url).toBe(testCase.urls.community.expected);
            });

        });
    });

    test("UNIT_URLBUILDER_DOMAIN: should detect hostname for domain determination", async ({ page }) => {
        // Test mmhmm.app detection
        const mmhmmBuilder = await page.evaluateHandle(() => {
            return new URLBuilder("stage", { hostname: "ooo-stage.mmhmm.app" });
        });
        const mmhmmIsAirtime = await mmhmmBuilder.evaluate(
            (builder) => builder.isAirtime
        );
        expect(mmhmmIsAirtime).toBe(false);

        // Test airtimetools.com detection
        const airBuilder = await page.evaluateHandle(() => {
            return new URLBuilder("stage", { hostname: "app.stage.airtimetools.com" });
        });
        const airIsAirtime = await airBuilder.evaluate((builder) => builder.isAirtime);
        expect(airIsAirtime).toBe(true);
    });
});
