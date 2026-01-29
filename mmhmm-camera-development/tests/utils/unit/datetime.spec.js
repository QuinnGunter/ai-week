//
//  datetime.spec.js
//  mmhmm
//
// Created by Seth Hitchings on 2/1/2024
// Copyright © 2024 mmhmm, inc. All rights reserved.
//
import { test } from "../../fixtures/test_fixture";
import { expect } from "@playwright/test";

test.describe("DateFormat", () => {
    const tests = [
        {
            input: "2024-01-01",
            locale: "EN-US",
            output: "January 1, 2024"
        },
        {
            input: "2024-01-01",
            locale: "ES-ES",
            output: "1 de enero de 2024"
        },
        {
            input: "2024-12-31",
            locale: null,
            output: "December 31, 2024"
        },
        {
            input: "Monkeys",
            locale: null,
            output: "Monkeys"
        }
    ];

    for (const t of tests) {
        test(`UT_${t.input}_${t.locale}:TEST`, async ({ page }) => {
            const actual = await page.evaluate((testData) => {
                return FormatDate(testData.input, testData.locale);
            }, t);
            expect(actual).toBe(t.output);
        });
    }
});
