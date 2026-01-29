//
//  alpha_mode.spec.js
//  mmhmm
//
// Created for LUT/Tune alpha mode testing
// Copyright 2025 mmhmm inc. All rights reserved.
//
import { test } from "../../fixtures/test_fixture";
import { expect } from "@playwright/test";

test.describe("Alpha Mode", () => {
    test.describe("LUTFilter", () => {
        test("UT_ALPHA_MODE_1: LUTFilter alphaMode default is 0 (All)", async ({ page }) => {
            const result = await page.evaluate(() => {
                const filter = NewFilterWithID(LUTFilter.identifier);
                return filter ? filter.alphaMode : null;
            });

            expect(result).toBe(0);
        });

        test("UT_ALPHA_MODE_2: LUTFilter alphaMode can be set to 1 (Foreground)", async ({ page }) => {
            const result = await page.evaluate(() => {
                const filter = NewFilterWithID(LUTFilter.identifier);
                if (!filter) return null;
                filter.alphaMode = 1;
                return filter.alphaMode;
            });

            expect(result).toBe(1);
        });

        test("UT_ALPHA_MODE_3: LUTFilter alphaMode can be set to 2 (Background)", async ({ page }) => {
            const result = await page.evaluate(() => {
                const filter = NewFilterWithID(LUTFilter.identifier);
                if (!filter) return null;
                filter.alphaMode = 2;
                return filter.alphaMode;
            });

            expect(result).toBe(2);
        });

        test("UT_ALPHA_MODE_4: LUTFilter toJSON includes alphaMode", async ({ page }) => {
            const result = await page.evaluate(() => {
                const filter = NewFilterWithID(LUTFilter.identifier);
                if (!filter) return null;
                filter.alphaMode = 1;
                const json = filter.toJSON();
                return json.alphaMode;
            });

            expect(result).toBe(1);
        });

        test("UT_ALPHA_MODE_5: LUTFilter applyEvent restores alphaMode", async ({ page }) => {
            const result = await page.evaluate(() => {
                const filter = NewFilterWithID(LUTFilter.identifier);
                if (!filter) return null;
                filter.applyEvent({ alphaMode: 2 });
                return filter.alphaMode;
            });

            expect(result).toBe(2);
        });

        test("UT_ALPHA_MODE_6: LUTFilter copy preserves alphaMode", async ({ page }) => {
            const result = await page.evaluate(() => {
                const filter = NewFilterWithID(LUTFilter.identifier);
                if (!filter) return null;
                filter.alphaMode = 2;
                const copy = filter.copy();
                return copy.alphaMode;
            });

            expect(result).toBe(2);
        });
    });

    test.describe("TuneFilter", () => {
        test("UT_ALPHA_MODE_7: TuneFilter alphaMode default is 0 (All)", async ({ page }) => {
            const result = await page.evaluate(() => {
                const filter = NewFilterWithID(TuneFilter.identifier);
                return filter ? filter.alphaMode : null;
            });

            expect(result).toBe(0);
        });

        test("UT_ALPHA_MODE_8: TuneFilter getValues includes alphaMode", async ({ page }) => {
            const result = await page.evaluate(() => {
                const filter = NewFilterWithID(TuneFilter.identifier);
                if (!filter) return null;
                filter.alphaMode = 1;
                const values = filter.getValues();
                return values.alphaMode;
            });

            expect(result).toBe(1);
        });

        test("UT_ALPHA_MODE_9: TuneFilter setValues includes alphaMode", async ({ page }) => {
            const result = await page.evaluate(() => {
                const filter = NewFilterWithID(TuneFilter.identifier);
                if (!filter) return null;
                filter.setValues({ alphaMode: 2 });
                return filter.alphaMode;
            });

            expect(result).toBe(2);
        });

        test("UT_ALPHA_MODE_10: TuneFilter reset clears alphaMode", async ({ page }) => {
            const result = await page.evaluate(() => {
                const filter = NewFilterWithID(TuneFilter.identifier);
                if (!filter) return null;
                filter.alphaMode = 2;
                filter.reset();
                return filter.alphaMode;
            });

            expect(result).toBe(0);
        });

        test("UT_ALPHA_MODE_11: TuneFilter hasAdjustments returns true when alphaMode is non-zero", async ({ page }) => {
            const result = await page.evaluate(() => {
                const filter = NewFilterWithID(TuneFilter.identifier);
                if (!filter) return null;
                filter.alphaMode = 1;
                return filter.hasAdjustments();
            });

            expect(result).toBe(true);
        });

        test("UT_ALPHA_MODE_12: TuneFilter hasAdjustments returns false when all values are default", async ({ page }) => {
            const result = await page.evaluate(() => {
                const filter = NewFilterWithID(TuneFilter.identifier);
                if (!filter) return null;
                return filter.hasAdjustments();
            });

            expect(result).toBe(false);
        });
    });
});
