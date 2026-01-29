//
//  statsig.spec.js
//  mmhmm
//
// Created by Amol Ghode on 4/16/2025
// Copyright © 2025 mmhmm, inc. All rights reserved.
//
import { test } from "../fixtures/test_fixture";
import { expect } from "@playwright/test";
import { setupUserMock } from "./utils"
test.describe("statsig tests", () => {
    test("STATSIG_OVERRIDE_1: Code correctly overrides the featuregate value", async ({ page }) => {
        await setupUserMock(page, {
            overrides: {
                "a": true,
                "b": false,
            }
        });
        let featureGateA = await page.evaluate(async () => {
            await Statsig.default.waitUntilInitialized();
            let featureGateA = Statsig.default.isFeatureGateEnabled("a");
            return featureGateA;
        });
        expect(featureGateA).toBe(true);
    })

    test("STATSIG_OVERRIDE_2: false value is returned when there is no gate or when it is overriden", async ({ page }) => {
        await setupUserMock(page, {
            overrides: {
                "b": false,
            }
        });
        let featureGateA = await page.evaluate(async () => {
            await Statsig.default.waitUntilInitialized();
            let featureGateA = Statsig.default.isFeatureGateEnabled("a");
            return featureGateA;
        });
        expect(featureGateA).toBe(false);
    })

    test("STATSIG_OVERRIDE_3: correct statsig configuration is returned when the flag is not overriden", async ({ page }) => {
        await setupUserMock(page, {
            overrides: {
                "b": false,
            }
        });
        let videoListFeature = await page.evaluate(async () => {
            await Statsig.default.waitUntilInitialized();
            // Flag 4944_video_lists is enabled for the fake user email |fakeemail@mmhmm.fake|
            // Replace this with correct fake address.
            let videoListFeature = Statsig.default.isFeatureGateEnabled("4944_video_lists");
            return videoListFeature;
        });
        expect(videoListFeature).toBe(true);
    })

    test("STATSIG_OVERRIDE_4: 4944_video_lists feature is true", async ({ page }) => {
        await setupUserMock(page);
        let videoListFeature = await page.evaluate(async () => {
            await Statsig.default.waitUntilInitialized();
            // Flag 4944_video_lists is enabled for the fake user email |fakeemail@mmhmm.fake|
            // Replace this with correct fake address.
            let videoListFeature = Statsig.default.isFeatureGateEnabled("4944_video_lists");
            return videoListFeature;
        });
        expect(videoListFeature).toBe(true);
    })

    test("STATSIG_OVERRIDE_5: 4944_video_lists feature is false when overriden", async ({ page }) => {
        await setupUserMock(page, {
            overrides: {
                "4944_video_lists": false,
            }
        });
        let videoListFeature = await page.evaluate(async () => {
            await Statsig.default.waitUntilInitialized();
            // Flag 4944_video_lists is enabled for the fake user email |fakeemail@mmhmm.fake|
            // Replace this with correct fake address.
            let videoListFeature = Statsig.default.isFeatureGateEnabled("4944_video_lists");
            return videoListFeature;
        });
        expect(videoListFeature).toBe(false);
    })

    /**
     * Intention of this test is to
     * 1. check that the overriden values are correctly reflected when the feature is locally overriden.
     * 2. When such override is removed, server value of the feature gate is restored.
     */
    test("STATSIG_OVERRIDE_6: Verify the value when override is active and when the override is removed.", async ({ page }) => {
        let overrides = {
            "4944_video_lists": false,
        }
        await setupUserMock(page, {
            overrides: {
                "4944_video_lists": false,
            }
        });
        let videoListFeature = await page.evaluate(async () => {
            await Statsig.default.waitUntilInitialized();
            // Flag 4944_video_lists is enabled for the fake user email |fakeemail@mmhmm.fake|
            // Replace this with correct fake address.
            let videoListFeature = Statsig.default.isFeatureGateEnabled("4944_video_lists");
            return videoListFeature;
        });
        // Expect the overriden value
        expect(videoListFeature).toBe(false);
        // Now reset the overrides and reinitialize overrides.
        overrides = {};
        videoListFeature = await page.evaluate(async () => {
            // Override localStore.getItem to mock the fact that
            // the overrides are now removed.
            window.localStorage.getItem = (store) => {
                if (store === Statsig.STASIG_OVERRIDE_KEY) {
                    return JSON.stringify({});
                } else {
                    return oldWindow.localStorage.getItem();
                }
            }
            // Retrigger the override inits.
            Statsig.default.initOverrides();
            let videoListFeature = Statsig.default.isFeatureGateEnabled("4944_video_lists");
            return videoListFeature;
        });
        // After no overrides, server value of the flag should be visible.
        expect(videoListFeature).toBe(true);
    })

    test("STATSIG_OVERRIDE_7: Correct flags are received when there is no override", async ({ page }) => {
        await setupUserMock(page, {
            overrides: {
                "b": false,
            }
        });
        let testFlags = await page.evaluate(async () => {
            await Statsig.default.waitUntilInitialized();
            let onFlag = Statsig.default.isFeatureGateEnabled("malk_integration_tests_on");
            let offFlag = Statsig.default.isFeatureGateEnabled("malk_integration_tests_off");
            return {
                on_value: onFlag,
                off_value: offFlag
            }
        });
        expect(testFlags.on_value).toBe(true);
        expect(testFlags.off_value).toBe(false);
    })

    test("STATSIG_OVERRIDE_8: Correct values get overriden", async ({ page }) => {
        await setupUserMock(page, {
            overrides: {
                "malk_integration_tests_on": false,
                "malk_integration_tests_off": true,
            }
        });
        let testFlags = await page.evaluate(async () => {
            await Statsig.default.waitUntilInitialized();
            let onFlag = Statsig.default.isFeatureGateEnabled("malk_integration_tests_on");
            let offFlag = Statsig.default.isFeatureGateEnabled("malk_integration_tests_off");
            return {
                on_value: onFlag,
                off_value: offFlag
            }
        });
        expect(testFlags.on_value).toBe(false);
        expect(testFlags.off_value).toBe(true);
    })

    test("STATSIG_OVERRIDE_9: Correct values are received when override is active and when the override is removed.", async ({ page }) => {
        let overrides = {
            "4944_video_lists": false,
        }
        await setupUserMock(page, {
            overrides: {
                "malk_integration_tests_on": false,
                "malk_integration_tests_off": true,
            }
        });
        let testFlags = await page.evaluate(async () => {
            await Statsig.default.waitUntilInitialized();
            let onFlag = Statsig.default.isFeatureGateEnabled("malk_integration_tests_on");
            let offFlag = Statsig.default.isFeatureGateEnabled("malk_integration_tests_off");
            return {
                on_value: onFlag,
                off_value: offFlag
            }
        });
        expect(testFlags.on_value).toBe(false);
        expect(testFlags.off_value).toBe(true);
        // Now reset the overrides and reinitialize overrides.
        overrides = {};
        testFlags = await page.evaluate(async () => {
            // Override localStore.getItem to mock the fact that
            // the overrides are now removed.
            window.localStorage.getItem = (store) => {
                if (store === Statsig.STASIG_OVERRIDE_KEY) {
                    return JSON.stringify({});
                } else {
                    return oldWindow.localStorage.getItem();
                }
            }
            let onFlag = Statsig.default.isFeatureGateEnabled("malk_integration_tests_on");
            let offFlag = Statsig.default.isFeatureGateEnabled("malk_integration_tests_off");
            return {
                on_value: onFlag,
                off_value: offFlag
            }
        });
        // After no overrides, server value of the flag should be visible.
        expect(testFlags.on_value).toBe(false);
        expect(testFlags.off_value).toBe(true);
    })

});
